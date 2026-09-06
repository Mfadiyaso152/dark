import {
  db,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc
} from '../lib/firebase';
import { storeLargeFile, getLargeFile, deleteLargeFile } from './fileStorage';

const CHUNK_SIZE = 400 * 1024; // 400,000 characters per chunk (safe within Firestore 1MB doc limit)

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
  // 1. Immediately cache locally in IndexedDB
  await storeLargeFile(fileId, dataUrl);

  const totalLength = dataUrl.length;
  const chunks: string[] = [];

  for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
    chunks.push(dataUrl.slice(i, i + CHUNK_SIZE));
  }

  const totalChunks = chunks.length;

  // 2. Upload chunks to Firestore collection 'file_chunks'
  // Upload in parallel batches of 4
  const BATCH_SIZE = 4;
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
        });
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
 * Downloads a file by retrieving all chunks from Firestore,
 * reconstructing the dataUrl, and caching it in local IndexedDB.
 */
export async function downloadFileFromCloud(
  fileId: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  // 1. First check if it is already cached in IndexedDB
  try {
    const cached = await getLargeFile(fileId);
    if (cached && cached.length > 50) {
      if (onProgress) onProgress(100);
      return cached;
    }
  } catch (err) {
    console.warn('[CloudStorage] Local cache check note:', err);
  }

  // 2. If not cached locally, fetch all chunks from Firestore collection 'file_chunks'
  try {
    const q = query(collection(db, 'file_chunks'), where('fileId', '==', fileId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn(`[CloudStorage] No cloud chunks found for file: ${fileId}`);
      return null;
    }

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

    // Sort chunks by index ascending
    chunkDocs.sort((a, b) => a.index - b.index);

    // Assemble the complete dataURL
    const assembledDataUrl = chunkDocs.map((c) => c.data).join('');

    // Cache locally in student's IndexedDB so subsequent opens are instant
    await storeLargeFile(fileId, assembledDataUrl);

    if (onProgress) onProgress(100);
    return assembledDataUrl;
  } catch (err) {
    console.error('[CloudStorage] Failed to download cloud file chunks:', err);
    return null;
  }
}

/**
 * Deletes all chunks of a file from Firestore and removes from IndexedDB.
 */
export async function deleteFileFromCloud(fileId: string): Promise<void> {
  // Delete from local IndexedDB
  await deleteLargeFile(fileId);

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
