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

const CHUNK_SIZE = 400 * 1024; // 400,000 characters per chunk (safe within Firestore 1MB doc limit)

// In-memory hot cache for instant re-access during the session
const memoryFileCache = new Map<string, string>();

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
  memoryFileCache.set(fileId, normalized);
  await storeLargeFile(fileId, normalized);

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

  // 3. Upload chunks to Firestore collection 'file_chunks' in parallel batches
  const BATCH_SIZE = 5;
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

  // 2. Direct probe for chunk 0 (`${targetId}_0` or `${targetId}`)
  // This avoids query index requirements and is ultra-fast
  try {
    const chunk0Snap = await getDoc(doc(db, 'file_chunks', `${targetId}_0`));
    if (chunk0Snap.exists()) {
      const c0Data = chunk0Snap.data();
      const totalChunks = c0Data?.totalChunks || 1;
      if (totalChunks === 1) {
        return c0Data?.data || null;
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
      const allFound = otherResults.every((c) => c !== null && typeof c?.data === 'string');
      if (allFound) {
        const allChunks = [
          { index: 0, data: c0Data?.data as string },
          ...otherResults.map((r) => r!)
        ];
        allChunks.sort((a, b) => a.index - b.index);
        return allChunks.map((c) => c.data).join('');
      }
    }

    // Also probe doc `${targetId}` directly (if stored as single document)
    const singleDocSnap = await getDoc(doc(db, 'file_chunks', targetId));
    if (singleDocSnap.exists()) {
      const d = singleDocSnap.data();
      if (typeof d?.data === 'string' && d.data.length > 0) {
        return d.data;
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

      chunkDocs.sort((a, b) => a.index - b.index);
      return chunkDocs.map((c) => c.data).join('');
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
  onProgress?: (progress: number) => void
): Promise<string | null> {
  if (!fileId) return null;

  // Build candidate fileIds to handle variations, prefixes, or legacy formats
  const candidateIds: string[] = [
    fileId,
    fileId.replace(/^sub-sol-/, ''),
    fileId.replace(/^hw-sol-/, ''),
    fileId.replace(/^booklet-/, ''),
    `sub-sol-${fileId}`,
    `hw-sol-${fileId}`,
    `${fileId}-0`,
    fileId.replace(/-\d+$/, '')
  ].filter((v, idx, arr) => !!v && arr.indexOf(v) === idx);

  // 1. Check memory cache for any candidate ID
  for (const cid of candidateIds) {
    if (memoryFileCache.has(cid)) {
      if (onProgress) onProgress(100);
      return memoryFileCache.get(cid)!;
    }
  }

  // 2. Check local IndexedDB for any candidate ID (<5ms)
  for (const cid of candidateIds) {
    try {
      const cached = await getLargeFile(cid);
      if (cached && cached.length > 50) {
        const normalized = normalizeFileDataUrl(cached);
        memoryFileCache.set(fileId, normalized);
        memoryFileCache.set(cid, normalized);
        if (onProgress) onProgress(100);
        return normalized;
      }
    } catch (err) {
      console.warn('[CloudStorage] Local cache check note:', err);
    }
  }

  // 3. Search cloud using candidate IDs
  for (const cid of candidateIds) {
    try {
      const rawData = await fetchChunksForId(cid, onProgress);
      if (rawData && rawData.length > 20) {
        const normalized = normalizeFileDataUrl(rawData);
        memoryFileCache.set(fileId, normalized);
        memoryFileCache.set(cid, normalized);
        await storeLargeFile(fileId, normalized);
        await storeLargeFile(cid, normalized);
        if (onProgress) onProgress(100);
        return normalized;
      }
    } catch (err) {
      console.warn(`[CloudStorage] Error trying candidate ${cid}:`, err);
    }
  }

  console.warn(`[CloudStorage] No cloud chunks found for file: ${fileId}`);
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
