/**
 * Photo storage module for Quest Board.
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
import { storage } from './firebase.ts';

export async function uploadTaskPhoto(
  familyId: string,
  childId: string,
  date: string,
  taskId: string,
  base64Data: string
): Promise<string> {
  var path =
    'families/' +
    familyId +
    '/photos/' +
    childId +
    '/' +
    date +
    '/' +
    taskId +
    '.jpg';
  var storageRef = ref(storage, path);
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
  var folderRef = ref(
    storage,
    'families/' + familyId + '/photos/' + childId
  );
  try {
    var result = await listAll(folderRef);
    // List date subfolders
    var promises: Promise<void>[] = [];
    result.prefixes.forEach(function (dateFolder) {
      promises.push(
        listAll(dateFolder).then(function (dateResult) {
          var deletes: Promise<void>[] = [];
          dateResult.items.forEach(function (item) {
            deletes.push(
              deleteObject(item).catch(function () {
                /* ignore missing */
              })
            );
          });
          return Promise.all(deletes).then(function () {});
        })
      );
    });
    // Also delete any files directly in the child folder
    result.items.forEach(function (item) {
      promises.push(
        deleteObject(item).catch(function () {
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
  var folderRef = ref(storage, 'families/' + familyId + '/photos');
  try {
    var result = await listAll(folderRef);
    var promises: Promise<void>[] = [];
    result.prefixes.forEach(function (childFolder) {
      promises.push(
        listAll(childFolder).then(function (childResult) {
          var subPromises: Promise<void>[] = [];
          // Date subfolders
          childResult.prefixes.forEach(function (dateFolder) {
            subPromises.push(
              listAll(dateFolder).then(function (dateResult) {
                var deletes: Promise<void>[] = [];
                dateResult.items.forEach(function (item) {
                  deletes.push(
                    deleteObject(item).catch(function () {
                      /* ignore */
                    })
                  );
                });
                return Promise.all(deletes).then(function () {});
              })
            );
          });
          // Direct files
          childResult.items.forEach(function (item) {
            subPromises.push(
              deleteObject(item).catch(function () {
                /* ignore */
              })
            );
          });
          return Promise.all(subPromises).then(function () {});
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
    }
  }
}

export async function deleteTaskPhoto(
  familyId: string,
  childId: string,
  date: string,
  taskId: string
): Promise<void> {
  var path =
    'families/' +
    familyId +
    '/photos/' +
    childId +
    '/' +
    date +
    '/' +
    taskId +
    '.jpg';
  var storageRef = ref(storage, path);
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
