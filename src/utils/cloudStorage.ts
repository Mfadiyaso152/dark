import {
  db,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc
} from '../lib/firebase';
import { storeLargeFile, getLargeFile, deleteLargeFile } from './fileStorage';
import { normalizeFileDataUrl } from './pdfGenerator';

const CHUNK_SIZE = 450 * 1024; // 450,000 characters per chunk (safe within Firestore 1MB doc limit)

// In-memory hot cache for instant re-access during the session (LRU protected)
const memoryFileCache = new Map<string, string>();
const MAX_MEMORY_CACHE_ITEMS = 25;

function setMemoryCache(key: string, value: string) {
  if (memoryFileCache.size >= MAX_MEMORY_CACHE_ITEMS) {
    const firstKey = memoryFileCache.keys().next().value;
    if (firstKey) memoryFileCache.delete(firstKey);
  }
  memoryFileCache.set(key, value);
}

export interface CloudFileMeta {
  fileId: string;
  totalChunks: number;
  size: number;
}

/**
 * Uploads a large dataURL (PDF, image, etc.) to Firestore in safe chunks.
 * Also stores in local IndexedDB for instant local access.
 */
export async function uploadFileToCloud(
  fileId: string,
  dataUrl: string,
  onProgress?: (progress: number) => void
): Promise<CloudFileMeta> {
  const normalized = normalizeFileDataUrl(dataUrl);

  // 1. Immediately cache in memory & IndexedDB
  setMemoryCache(fileId, normalized);
  await storeLargeFile(fileId, normalized);

  // Also cache under stripped ID if applicable
  const strippedId = fileId.replace(/^(sub-sol-|hw-sol-|booklet-|lesson-file-)/, '');
  if (strippedId !== fileId) {
    setMemoryCache(strippedId, normalized);
    try {
      await storeLargeFile(strippedId, normalized);
    } catch {
      // ignore
    }
  }

  const totalLength = normalized.length;
  const chunks: string[] = [];

  for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
    chunks.push(normalized.slice(i, i + CHUNK_SIZE));
  }

  const totalChunks = chunks.length;

  // 2. Save metadata document first for direct parallel retrieval
  try {
    await setDoc(doc(db, 'file_meta', fileId), {
      fileId,
      totalChunks,
      size: totalLength,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (metaErr) {
    console.warn('[CloudStorage] Note on file_meta write:', metaErr);
  }

  // If only 1 chunk, also save direct doc for instant 1-query fetch
  if (totalChunks === 1) {
    try {
      await setDoc(doc(db, 'file_chunks', fileId), {
        fileId,
        index: 0,
        totalChunks: 1,
        data: chunks[0],
        updatedAt: Date.now()
      }, { merge: true });
    } catch {
      // ignore
    }
  }

  // 3. Upload chunks to Firestore collection 'file_chunks' in high-speed parallel batches
  const BATCH_SIZE = 12;
  let completed = 0;

  for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
    const batch = chunks.slice(b, b + BATCH_SIZE);
    await Promise.all(
      batch.map(async (chunkData, idx) => {
        const chunkIndex = b + idx;
        const chunkDocId = `${fileId}_${chunkIndex}`;
        await setDoc(doc(db, 'file_chunks', chunkDocId), {
          fileId,
          index: chunkIndex,
          totalChunks,
          data: chunkData,
          updatedAt: Date.now()
        }, { merge: true });
        completed++;
        if (onProgress) {
          onProgress(Math.round((completed / totalChunks) * 100));
        }
      })
    );
  }

  return { fileId, totalChunks, size: totalLength };
}

/**
 * Searches local browser persistence (localStorage) for any backup of the file dataURL.
 * This ensures that if the file was created or submitted locally, it can never be lost.
 */
function searchLocalStorageForFile(targetId: string, fileName?: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const cleanId = targetId.replace(/^(sub-sol-|hw-sol-|booklet-|lesson-file-)/, '');

  const keys = [
    'thanaweya_homework_submissions_v1',
    'thanaweya_homeworks_v2',
    'thanaweya_subject_booklets_v4',
    'thanaweya_custom_lessons_v4'
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const items = JSON.parse(raw);
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        if (!item) continue;

        // 1. Check attachedFiles array
        if (Array.isArray(item.attachedFiles)) {
          for (const f of item.attachedFiles) {
            if (f && typeof f.dataUrl === 'string' && f.dataUrl.length > 50) {
              if (
                f.fileId === targetId ||
                f.fileId === cleanId ||
                (fileName && f.name === fileName) ||
                (item.id && (targetId.includes(item.id) || cleanId === item.id))
              ) {
                return f.dataUrl;
              }
            }
          }
        }

        // 2. Check attachedFile single object
        if (item.attachedFile && typeof item.attachedFile.dataUrl === 'string' && item.attachedFile.dataUrl.length > 50) {
          const f = item.attachedFile;
          if (
            f.fileId === targetId ||
            f.fileId === cleanId ||
            (fileName && f.name === fileName) ||
            (item.id && (targetId.includes(item.id) || cleanId === item.id))
          ) {
            return f.dataUrl;
          }
        }

        // 3. Check solutionFile
        if (item.solutionFile && typeof item.solutionFile.dataUrl === 'string' && item.solutionFile.dataUrl.length > 50) {
          const f = item.solutionFile;
          if (
            f.fileId === targetId ||
            f.fileId === cleanId ||
            (fileName && f.name === fileName) ||
            (item.id && (targetId.includes(item.id) || cleanId === item.id))
          ) {
            return f.dataUrl;
          }
        }

        // 4. Check fileDataUrl directly (e.g. booklets or lessons)
        if (typeof item.fileDataUrl === 'string' && item.fileDataUrl.length > 50) {
          if (
            item.id === targetId ||
            item.id === cleanId ||
            (item.id && (targetId.includes(item.id) || cleanId === item.id))
          ) {
            return item.fileDataUrl;
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

/**
 * Helper to fetch and assemble chunks for a specific fileId directly or via query.
 */
async function fetchChunksForId(
  targetId: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  // 1. Direct fetch using 'file_meta'
  try {
    const metaSnap = await getDoc(doc(db, 'file_meta', targetId));
    if (metaSnap.exists()) {
      const metaData = metaSnap.data();
      const totalChunks = metaData?.totalChunks || 1;

      const chunkPromises = Array.from({ length: totalChunks }, async (_, i) => {
        const chunkDocId = `${targetId}_${i}`;
        const chunkSnap = await getDoc(doc(db, 'file_chunks', chunkDocId));
        if (chunkSnap.exists()) {
          return { index: i, data: chunkSnap.data()?.data as string };
        }
        return null;
      });

      const chunkResults = await Promise.all(chunkPromises);
      if (chunkResults.every((c) => c !== null && typeof c?.data === 'string')) {
        chunkResults.sort((a, b) => a!.index - b!.index);
        return chunkResults.map((c) => c!.data).join('');
      }
    }
  } catch (err) {
    console.warn(`[CloudStorage] file_meta check note for ${targetId}:`, err);
  }

  // 2. Direct probe for chunk 0 (`${targetId}_0`, `${targetId}-0`, or `${targetId}`) in parallel
  try {
    const [c0UnderscoreSnap, c0DashSnap, singleDocSnap] = await Promise.all([
      getDoc(doc(db, 'file_chunks', `${targetId}_0`)),
      getDoc(doc(db, 'file_chunks', `${targetId}-0`)),
      getDoc(doc(db, 'file_chunks', targetId))
    ]);

    // Direct single document match
    if (singleDocSnap.exists()) {
      const d = singleDocSnap.data();
      if (typeof d?.data === 'string' && d.data.length > 0) {
        return d.data;
      }
    }

    // Direct underscore pattern (_0, _1...)
    if (c0UnderscoreSnap.exists()) {
      const c0Data = c0UnderscoreSnap.data();
      const totalChunks = c0Data?.totalChunks || 1;
      if (totalChunks === 1) {
        return (c0Data?.data as string) || null;
      }

      const otherChunkPromises = Array.from({ length: totalChunks - 1 }, async (_, i) => {
        const idx = i + 1;
        const snap = await getDoc(doc(db, 'file_chunks', `${targetId}_${idx}`));
        if (snap.exists()) {
          return { index: idx, data: snap.data()?.data as string };
        }
        return null;
      });

      const otherResults = await Promise.all(otherChunkPromises);
      if (otherResults.every((c) => c !== null && typeof c?.data === 'string')) {
        const allChunks = [
          { index: 0, data: c0Data?.data as string },
          ...otherResults.map((r) => r!)
        ];
        allChunks.sort((a, b) => a.index - b.index);
        return allChunks.map((c) => c.data).join('');
      }
    }

    // Direct dash pattern (-0, -1...)
    if (c0DashSnap.exists()) {
      const c0Data = c0DashSnap.data();
      const totalChunks = c0Data?.totalChunks || 1;
      if (totalChunks === 1) {
        return (c0Data?.data as string) || null;
      }

      const otherChunkPromises = Array.from({ length: totalChunks - 1 }, async (_, i) => {
        const idx = i + 1;
        const snap = await getDoc(doc(db, 'file_chunks', `${targetId}-${idx}`));
        if (snap.exists()) {
          return { index: idx, data: snap.data()?.data as string };
        }
        return null;
      });

      const otherResults = await Promise.all(otherChunkPromises);
      if (otherResults.every((c) => c !== null && typeof c?.data === 'string')) {
        const allChunks = [
          { index: 0, data: c0Data?.data as string },
          ...otherResults.map((r) => r!)
        ];
        allChunks.sort((a, b) => a.index - b.index);
        return allChunks.map((c) => c.data).join('');
      }
    }
  } catch (err) {
    console.warn(`[CloudStorage] Direct chunk probe note for ${targetId}:`, err);
  }

  // 3. Fallback: Query collection 'file_chunks' by fileId
  try {
    const q = query(collection(db, 'file_chunks'), where('fileId', '==', targetId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      interface ChunkDoc {
        index: number;
        totalChunks: number;
        data: string;
      }

      const chunkDocs: ChunkDoc[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (typeof data.index === 'number' && typeof data.data === 'string') {
          chunkDocs.push({
            index: data.index,
            totalChunks: data.totalChunks || 1,
            data: data.data
          });
        }
      });

      if (chunkDocs.length > 0) {
        chunkDocs.sort((a, b) => a.index - b.index);
        return chunkDocs.map((c) => c.data).join('');
      }
    }
  } catch (err) {
    console.warn(`[CloudStorage] Collection query note for ${targetId}:`, err);
  }

  return null;
}

/**
 * Downloads a file by retrieving all chunks from Firestore,
 * reconstructing the dataUrl, and caching it in local IndexedDB.
 * High-speed parallel chunk fetching using metadata and candidate IDs.
 */
export async function downloadFileFromCloud(
  fileId: string,
  onProgress?: (progress: number) => void,
  fileName?: string
): Promise<string | null> {
  if (!fileId) return null;

  // Build intelligently ordered candidate fileIds:
  // Place the most probable ID first so direct gets succeed on attempt #1!
  const rawClean = fileId.replace(/^(sub-sol-|hw-sol-|booklet-|lesson-file-|sub-|hw-)/g, '');
  const primaryPrefixed = fileId.startsWith('sub-') && !fileId.startsWith('sub-sol-')
    ? `sub-sol-${fileId}`
    : fileId.startsWith('hw-') && !fileId.startsWith('hw-sol-')
    ? `hw-sol-${fileId}`
    : fileId;

  const candidateIds: string[] = [
    primaryPrefixed,
    fileId,
    `sub-sol-${fileId}`,
    `sub-sol-${rawClean}`,
    `sub-${rawClean}`,
    `hw-sol-${rawClean}`,
    rawClean
  ].filter((v, idx, arr) => !!v && arr.indexOf(v) === idx);

  // If ID has multi-file suffix (e.g. -0, -1, -2), also generate dash-underscore variations
  if (/-\d+$/.test(fileId)) {
    const dashSuffix = fileId.match(/-(\d+)$/)?.[1];
    if (dashSuffix) {
      const baseWithoutIndex = fileId.replace(/-\d+$/, '');
      candidateIds.push(`${baseWithoutIndex}_${dashSuffix}`);
      candidateIds.push(`${baseWithoutIndex}-${dashSuffix}`);
    }
  }

  // 1. Check in-memory LRU cache (0ms)
  for (const cid of candidateIds) {
    if (memoryFileCache.has(cid)) {
      if (onProgress) onProgress(100);
      return memoryFileCache.get(cid)!;
    }
  }

  // 2. Check local IndexedDB in parallel (<3ms)
  try {
    const localResults = await Promise.all(candidateIds.map((cid) => getLargeFile(cid)));
    for (let i = 0; i < localResults.length; i++) {
      const cached = localResults[i];
      if (cached && cached.length > 50) {
        const normalized = normalizeFileDataUrl(cached, fileName);
        setMemoryCache(fileId, normalized);
        setMemoryCache(candidateIds[i], normalized);
        if (onProgress) onProgress(100);
        return normalized;
      }
    }
  } catch (err) {
    console.warn('[CloudStorage] Local IndexedDB check note:', err);
  }

  // 3. Ultra-fast parallel Firestore candidate probe (direct getDoc on chunk 0 & single doc)
  try {
    const probePromises = candidateIds.map(async (cid) => {
      try {
        const [c0Snap, singleSnap] = await Promise.all([
          getDoc(doc(db, 'file_chunks', `${cid}_0`)),
          getDoc(doc(db, 'file_chunks', cid))
        ]);

        if (singleSnap.exists()) {
          const singleData = singleSnap.data()?.data;
          if (typeof singleData === 'string' && singleData.length > 20) {
            return { cid, fullData: singleData };
          }
        }

        if (c0Snap.exists()) {
          return { cid, c0Data: c0Snap.data() };
        }
      } catch {
        // ignore probe error for this candidate
      }
      return null;
    });

    const probeResults = await Promise.all(probePromises);
    const matchedProbe = probeResults.find((p) => p !== null);

    if (matchedProbe) {
      // Direct single document match
      if (matchedProbe.fullData) {
        const normalized = normalizeFileDataUrl(matchedProbe.fullData, fileName);
        setMemoryCache(fileId, normalized);
        setMemoryCache(matchedProbe.cid, normalized);
        storeLargeFile(fileId, normalized);
        if (onProgress) onProgress(100);
        return normalized;
      }

      // Chunked document match: fetch remaining chunks in parallel
      if (matchedProbe.c0Data) {
        const totalChunks = matchedProbe.c0Data.totalChunks || 1;
        const firstChunk = (matchedProbe.c0Data.data as string) || '';

        if (totalChunks === 1) {
          const normalized = normalizeFileDataUrl(firstChunk, fileName);
          setMemoryCache(fileId, normalized);
          setMemoryCache(matchedProbe.cid, normalized);
          storeLargeFile(fileId, normalized);
          if (onProgress) onProgress(100);
          return normalized;
        }

        // Parallel fetch for chunks 1 to totalChunks - 1
        const restPromises = Array.from({ length: totalChunks - 1 }, async (_, i) => {
          const idx = i + 1;
          const chunkSnap = await getDoc(doc(db, 'file_chunks', `${matchedProbe.cid}_${idx}`));
          return { index: idx, data: (chunkSnap.data()?.data as string) || '' };
        });

        const restResults = await Promise.all(restPromises);
        const allChunks = [{ index: 0, data: firstChunk }, ...restResults];
        allChunks.sort((a, b) => a.index - b.index);
        const reconstructed = allChunks.map((c) => c.data).join('');

        if (reconstructed.length > 20) {
          const normalized = normalizeFileDataUrl(reconstructed, fileName);
          setMemoryCache(fileId, normalized);
          setMemoryCache(matchedProbe.cid, normalized);
          storeLargeFile(fileId, normalized);
          if (onProgress) onProgress(100);
          return normalized;
        }
      }
    }
  } catch (probeErr) {
    console.warn('[CloudStorage] Parallel probe note:', probeErr);
  }

  // 4. Secondary search: Query file_chunks collection by fileId field for all candidate IDs
  try {
    const validCids = candidateIds.slice(0, 10);
    if (validCids.length > 0) {
      const q = query(collection(db, 'file_chunks'), where('fileId', 'in', validCids));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        // Group by fileId
        const chunksByFileId = new Map<string, Array<{ index: number; data: string }>>();
        querySnap.forEach((docSnap) => {
          const d = docSnap.data();
          const fid = (d.fileId as string) || docSnap.id;
          const chunkData = (d.data as string) || '';
          const idx = typeof d.index === 'number' ? d.index : 0;
          if (!chunksByFileId.has(fid)) {
            chunksByFileId.set(fid, []);
          }
          chunksByFileId.get(fid)!.push({ index: idx, data: chunkData });
        });

        for (const cid of candidateIds) {
          const group = chunksByFileId.get(cid);
          if (group && group.length > 0) {
            group.sort((a, b) => a.index - b.index);
            const joined = group.map((c) => c.data).join('');
            if (joined.length > 20) {
              const normalized = normalizeFileDataUrl(joined, fileName);
              setMemoryCache(fileId, normalized);
              setMemoryCache(cid, normalized);
              storeLargeFile(fileId, normalized);
              if (onProgress) onProgress(100);
              return normalized;
            }
          }
        }
      }
    }
  } catch (queryErr) {
    console.warn('[CloudStorage] Query by fileId note:', queryErr);
  }

  // 5. Tertiary search using fetchChunksForId (if legacy dash format or collection query needed)
  for (const cid of candidateIds) {
    try {
      const rawData = await fetchChunksForId(cid, onProgress);
      if (rawData && rawData.length > 20) {
        const normalized = normalizeFileDataUrl(rawData, fileName);
        setMemoryCache(fileId, normalized);
        setMemoryCache(cid, normalized);
        storeLargeFile(fileId, normalized);
        if (onProgress) onProgress(100);
        return normalized;
      }
    } catch {
      // ignore
    }
  }

  // 5. Ultimate safety fallback: inspect localStorage backups
  const localBackup = searchLocalStorageForFile(fileId, fileName);
  if (localBackup && localBackup.length > 50) {
    const normalized = normalizeFileDataUrl(localBackup, fileName);
    setMemoryCache(fileId, normalized);
    try {
      await storeLargeFile(fileId, normalized);
    } catch {
      // ignore
    }
    if (onProgress) onProgress(100);
    return normalized;
  }

  console.warn(`[CloudStorage] No chunks or local cache found for file: ${fileId}`);
  return null;
}

/**
 * Deletes all chunks of a file from Firestore and removes from IndexedDB.
 */
export async function deleteFileFromCloud(fileId: string): Promise<void> {
  memoryFileCache.delete(fileId);

  // Delete from local IndexedDB
  await deleteLargeFile(fileId);

  // Delete metadata
  try {
    await deleteDoc(doc(db, 'file_meta', fileId));
  } catch (e) {
    // ignore
  }

  // Delete all chunks from Firestore
  try {
    const q = query(collection(db, 'file_chunks'), where('fileId', '==', fileId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('[CloudStorage] Failed to delete file chunks from cloud:', err);
  }
}
