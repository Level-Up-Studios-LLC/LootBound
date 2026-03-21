/**
 * Photo storage module for LootBound.
 *
 * Handles uploading task completion photos to Firebase Storage
 * and returning download URLs to store in Firestore task logs.
 *
 * Storage path: families/{familyId}/photos/{childId}/{date}/{taskId}.jpg
 */

import {
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import * as Sentry from '@sentry/react';
import { storage } from './firebase.ts';
import { signInAnonymousKid } from './auth.ts';

export async function uploadTaskPhoto(
  familyId: string,
  childId: string,
  date: string,
  taskId: string,
  base64Data: string
): Promise<string> {
  // Ensure anonymous auth is active before uploading
  await signInAnonymousKid();
  const path = `families/${familyId}/photos/${childId}/${date}/${taskId}.jpg`;
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64Data, 'data_url');
  return getDownloadURL(storageRef);
}

/**
 * Delete all photos for a specific child under a family.
 * Used during weekly reset and child removal.
 */
export async function deleteAllChildPhotos(
  familyId: string,
  childId: string
): Promise<void> {
  await signInAnonymousKid();
  const folderRef = ref(
    storage,
    `families/${familyId}/photos/${childId}`
  );
  try {
    const result = await listAll(folderRef);
    // List date subfolders
    const promises: Promise<void>[] = [];
    result.prefixes.forEach((dateFolder) => {
      promises.push(
        listAll(dateFolder).then((dateResult) => {
          const deletes: Promise<void>[] = [];
          dateResult.items.forEach((item) => {
            deletes.push(
              deleteObject(item).catch(() => {
                /* ignore missing */
              })
            );
          });
          return Promise.all(deletes).then(() => {});
        })
      );
    });
    // Also delete any files directly in the child folder
    result.items.forEach((item) => {
      promises.push(
        deleteObject(item).catch(() => {
          /* ignore missing */
        })
      );
    });
    await Promise.all(promises);
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      (e as Error & { code?: string }).code !== 'storage/object-not-found'
    ) {
      console.warn('Failed to delete child photos:', e);
      Sentry.captureException(e, { level: 'warning', tags: { action: 'delete-child-photos' } });
    }
  }
}

/**
 * Delete all photos for an entire family.
 * Used during full data reset.
 */
export async function deleteAllFamilyPhotos(
  familyId: string
): Promise<void> {
  await signInAnonymousKid();
  const folderRef = ref(storage, `families/${familyId}/photos`);
  try {
    const result = await listAll(folderRef);
    const promises: Promise<void>[] = [];
    result.prefixes.forEach((childFolder) => {
      promises.push(
        listAll(childFolder).then((childResult) => {
          const subPromises: Promise<void>[] = [];
          // Date subfolders
          childResult.prefixes.forEach((dateFolder) => {
            subPromises.push(
              listAll(dateFolder).then((dateResult) => {
                const deletes: Promise<void>[] = [];
                dateResult.items.forEach((item) => {
                  deletes.push(
                    deleteObject(item).catch(() => {
                      /* ignore */
                    })
                  );
                });
                return Promise.all(deletes).then(() => {});
              })
            );
          });
          // Direct files
          childResult.items.forEach((item) => {
            subPromises.push(
              deleteObject(item).catch(() => {
                /* ignore */
              })
            );
          });
          return Promise.all(subPromises).then(() => {});
        })
      );
    });
    await Promise.all(promises);
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      (e as Error & { code?: string }).code !== 'storage/object-not-found'
    ) {
      console.warn('Failed to delete family photos:', e);
      Sentry.captureException(e, { level: 'warning', tags: { action: 'delete-family-photos' } });
    }
  }
}

export async function deleteTaskPhoto(
  familyId: string,
  childId: string,
  date: string,
  taskId: string
): Promise<void> {
  await signInAnonymousKid();
  const path = `families/${familyId}/photos/${childId}/${date}/${taskId}.jpg`;
  const storageRef = ref(storage, path);
  try {
    await deleteObject(storageRef);
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      (e as Error & { code?: string }).code !== 'storage/object-not-found'
    ) {
      throw e;
    }
  }
}
