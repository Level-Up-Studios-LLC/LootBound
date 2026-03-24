/**
 * Firestore storage adapter for LootBound.
 *
 * Replaces the localStorage adapter (storage.ts) with Firestore-backed
 * operations organized by domain. All functions accept a familyId to
 * scope data to the authenticated family (multi-tenant).
 *
 * Collection structure:
 *   /families/{familyId}                        — family config
 *   /families/{familyId}/children/{childId}      — child profiles
 *   /families/{familyId}/tasks/{taskId}          — task definitions
 *   /families/{familyId}/rewards/{rewardId}      — reward definitions
 *   /families/{familyId}/childData/{childId}     — child runtime data
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  onSnapshot,
  orderBy,
  limit,
  DocumentData,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import * as Sentry from '@sentry/react';
import { db } from './firebase.ts';
import type { UserData } from '../types.ts';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatar: string;
  color: string;
  pin: string | null;
}

export interface TaskDef {
  id: string;
  childId?: string;
  name: string;
  tier: string;
  windowStart: string;
  windowEnd: string;
  daily: boolean;
  dueDay: number | null;
}

export interface RewardDef {
  id: string;
  name: string;
  cost: number;
  icon: string;
  active: boolean;
  limitType: string;
  limitMax: number;
  requireApproval: boolean;
}

export interface FamilyConfig {
  parentPin: string;
  tierConfig: Record<string, { coins: number; xp: number }>;
  approvalThreshold: number;
  lastWeeklyReset: string;
  tierPoints?: Record<number, number>;
  parentName?: string;
  referralSource?: string;
  familyCode?: string;
  bedtime?: number;
  weeklyResetDay?: number;
  cooldown?: number;
  notificationPrefs?: import('../types.ts').NotificationPrefs;
}

export interface TaskLogEntry {
  completedAt: number | null;
  status: string;
  points: number;
  xp: number;
  photo: string | null;
  rejected: boolean;
  autoCutoff?: boolean;
}

export interface Redemption {
  rewardId: string;
  name: string;
  cost: number;
  date: string;
}

export interface PendingRedemption {
  rewardId: string;
  name: string;
  cost: number;
  icon: string;
  date: string;
  requestedAt: number;
}

export interface ChildData {
  points: number;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  missedDaysThisWeek: number;
  lastPerfectDate: string | null;
  lastTaskTime: number;
  taskLog: Record<string, Record<string, TaskLogEntry | boolean>>;
  redemptions: Redemption[];
  pendingRedemptions: PendingRedemption[];
}

// ---------------------------------------------------------------------------
// Per-parent data (parentMembers/{uid})
// ---------------------------------------------------------------------------

export interface ParentMember {
  familyId: string;
  parentPin?: string;
  parentName?: string;
  parentPhotoURL?: string;
}

export async function getParentMember(
  uid: string
): Promise<ParentMember | null> {
  const snap = await getDoc(doc(db, 'parentMembers', uid));
  return snap.exists() ? (snap.data() as ParentMember) : null;
}

export async function saveParentMember(
  uid: string,
  data: Partial<ParentMember>
): Promise<void> {
  // Only pass known fields — merge: true preserves existing familyId
  const clean: Record<string, any> = {};
  if (data.parentPin != null) clean.parentPin = data.parentPin;
  if (data.parentName != null) clean.parentName = data.parentName;
  if (data.familyId != null) clean.familyId = data.familyId;
  if (data.parentPhotoURL != null) clean.parentPhotoURL = data.parentPhotoURL;
  try {
    await setDoc(doc(db, 'parentMembers', uid), clean, { merge: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'save-parent-member' } });
    throw err;
  }
}

export async function deleteParentMember(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'parentMembers', uid));
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'delete-parent-member' } });
    throw err;
  }
}

export function onParentMemberSnapshot(
  uid: string,
  callback: (data: ParentMember | null) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(doc(db, 'parentMembers', uid), snap => {
    callback(snap.exists() ? (snap.data() as ParentMember) : null);
  }, err => {
    Sentry.captureException(err, { tags: { action: 'snapshot-parent-member' } });
    onError?.(err);
  });
}

// ---------------------------------------------------------------------------
// Family config
// ---------------------------------------------------------------------------

export async function getConfig(
  familyId: string
): Promise<FamilyConfig | null> {
  const snap = await getDoc(doc(db, 'families', familyId));
  return snap.exists() ? (snap.data() as FamilyConfig) : null;
}

export async function saveConfig(
  familyId: string,
  data: Partial<FamilyConfig>
): Promise<void> {
  try {
    await setDoc(doc(db, 'families', familyId), data, { merge: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'save-config' } });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

export async function getChildren(familyId: string): Promise<ChildProfile[]> {
  const snap = await getDocs(collection(db, 'families', familyId, 'children'));
  const list: ChildProfile[] = [];
  snap.forEach(d => {
    list.push({ id: d.id, ...d.data() } as ChildProfile);
  });
  return list;
}

export async function saveChild(
  familyId: string,
  childId: string,
  data: Partial<ChildProfile>
): Promise<void> {
  const clean: DocumentData = { ...data };
  delete clean.id;
  try {
    await setDoc(doc(db, 'families', familyId, 'children', childId), clean, {
      merge: true,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'save-child' } });
    throw err;
  }
}

export async function deleteChild(
  familyId: string,
  childId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'families', familyId, 'children', childId));
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'delete-child' } });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function getTasks(familyId: string): Promise<TaskDef[]> {
  const snap = await getDocs(collection(db, 'families', familyId, 'tasks'));
  const list: TaskDef[] = [];
  snap.forEach(d => {
    list.push({ id: d.id, ...d.data() } as TaskDef);
  });
  return list;
}

export async function getTasksForChild(
  familyId: string,
  childId: string
): Promise<TaskDef[]> {
  const q = query(
    collection(db, 'families', familyId, 'tasks'),
    where('childId', '==', childId)
  );
  const snap = await getDocs(q);
  const list: TaskDef[] = [];
  snap.forEach(d => {
    list.push({ id: d.id, ...d.data() } as TaskDef);
  });
  return list;
}

export async function saveTask(
  familyId: string,
  taskId: string,
  data: Partial<TaskDef>
): Promise<void> {
  const clean: DocumentData = { ...data };
  delete clean.id;
  try {
    await setDoc(doc(db, 'families', familyId, 'tasks', taskId), clean, {
      merge: true,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'save-task' } });
    throw err;
  }
}

export async function deleteTask(
  familyId: string,
  taskId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'families', familyId, 'tasks', taskId));
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'delete-task' } });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export async function getRewards(familyId: string): Promise<RewardDef[]> {
  const snap = await getDocs(collection(db, 'families', familyId, 'rewards'));
  const list: RewardDef[] = [];
  snap.forEach(d => {
    list.push({ id: d.id, ...d.data() } as RewardDef);
  });
  return list;
}

export async function saveReward(
  familyId: string,
  rewardId: string,
  data: Partial<RewardDef>
): Promise<void> {
  const clean: DocumentData = { ...data };
  delete clean.id;
  try {
    await setDoc(doc(db, 'families', familyId, 'rewards', rewardId), clean, {
      merge: true,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'save-reward' } });
    throw err;
  }
}

export async function deleteReward(
  familyId: string,
  rewardId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'families', familyId, 'rewards', rewardId));
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'delete-reward' } });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Child data (points, streaks, logs, redemptions)
// ---------------------------------------------------------------------------

export async function getChildData(
  familyId: string,
  childId: string
): Promise<ChildData | null> {
  const snap = await getDoc(
    doc(db, 'families', familyId, 'childData', childId)
  );
  return snap.exists() ? (snap.data() as ChildData) : null;
}

export async function saveChildData(
  familyId: string,
  childId: string,
  data: Partial<ChildData>
): Promise<void> {
  try {
    await setDoc(doc(db, 'families', familyId, 'childData', childId), data, {
      merge: true,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'save-child-data' } });
    throw err;
  }
}

/**
 * Fully replace child data (no merge). Used by resetAll to ensure
 * old taskLog entries are wiped cleanly.
 */
export async function replaceChildData(
  familyId: string,
  childId: string,
  data: ChildData | UserData
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'families', familyId, 'childData', childId),
      data as DocumentData
    );
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'replace-child-data' } });
    throw err;
  }
}

export async function deleteChildData(
  familyId: string,
  childId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'families', familyId, 'childData', childId));
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'delete-child-data' } });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Delete entire family — all subcollections and related docs
// ---------------------------------------------------------------------------

export async function deleteFamily(
  familyId: string,
  _currentUid: string
): Promise<void> {
  try {
  // Read family code — check config doc first, then query familyCodes collection
  const configSnap = await getDoc(doc(db, 'families', familyId));
  let familyCode =
    configSnap.exists() && configSnap.data().familyCode
      ? configSnap.data().familyCode
      : null;

  if (!familyCode) {
    const codeQuery = query(
      collection(db, 'familyCodes'),
      where('familyId', '==', familyId)
    );
    const codeSnap = await getDocs(codeQuery);
    if (!codeSnap.empty) {
      familyCode = codeSnap.docs[0].id;
    }
  }

  // Collect all document refs to delete
  const refs: import('firebase/firestore').DocumentReference[] = [];

  // Subcollection docs
  const subs = ['children', 'tasks', 'rewards', 'childData', 'notifications'];
  for (let i = 0; i < subs.length; i++) {
    const snap = await getDocs(collection(db, 'families', familyId, subs[i]));
    snap.forEach(d => {
      refs.push(d.ref);
    });
  }

  // Family config doc
  refs.push(doc(db, 'families', familyId));

  // Delete all parent member mappings for this family.
  // The family owner (uid == familyId) has permission to delete
  // other members' docs via security rules.
  const memberQuery = query(
    collection(db, 'parentMembers'),
    where('familyId', '==', familyId)
  );
  const memberSnap = await getDocs(memberQuery);
  memberSnap.forEach(d => {
    refs.push(d.ref);
  });
  // Also include the current user's doc in case the query missed it
  if (_currentUid && !memberSnap.docs.some(d => d.id === _currentUid)) {
    refs.push(doc(db, 'parentMembers', _currentUid));
  }

  // Family code mapping
  if (familyCode) {
    refs.push(doc(db, 'familyCodes', familyCode));
  }

  // Commit in chunks of 500 (Firestore batch limit)
  const BATCH_LIMIT = 500;
  for (let start = 0; start < refs.length; start += BATCH_LIMIT) {
    const chunk = refs.slice(start, start + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (let j = 0; j < chunk.length; j++) {
      batch.delete(chunk[j]);
    }
    await batch.commit();
  }
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'delete-family' } });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Batch write helper — useful for initial data seeding and migrations
// ---------------------------------------------------------------------------

export async function batchSeedFamily(
  familyId: string,
  config: FamilyConfig,
  children: ChildProfile[],
  tasks: Record<string, TaskDef[]>,
  rewards: RewardDef[],
  childDataMap?: Record<string, ChildData>
): Promise<void> {
  const batch = writeBatch(db);

  batch.set(doc(db, 'families', familyId), config);

  children.forEach(child => {
    const clean: DocumentData = { ...child };
    const cid = child.id;
    delete clean.id;
    batch.set(doc(db, 'families', familyId, 'children', cid), clean);
  });

  Object.keys(tasks).forEach(childId => {
    tasks[childId].forEach(task => {
      const clean: DocumentData = { childId, ...task };
      const tid = task.id;
      delete clean.id;
      batch.set(doc(db, 'families', familyId, 'tasks', tid), clean);
    });
  });

  rewards.forEach(reward => {
    const clean: DocumentData = { ...reward };
    const rid = reward.id;
    delete clean.id;
    batch.set(doc(db, 'families', familyId, 'rewards', rid), clean);
  });

  if (childDataMap) {
    Object.keys(childDataMap).forEach(childId => {
      batch.set(
        doc(db, 'families', familyId, 'childData', childId),
        childDataMap[childId] as DocumentData
      );
    });
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// Real-time listeners
// ---------------------------------------------------------------------------

export function onConfigSnapshot(
  familyId: string,
  callback: (data: FamilyConfig | null) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(doc(db, 'families', familyId), snap => {
    callback(snap.exists() ? (snap.data() as FamilyConfig) : null);
  }, err => {
    Sentry.captureException(err, { tags: { action: 'snapshot-config' } });
    onError?.(err);
  });
}

export function onChildrenSnapshot(
  familyId: string,
  callback: (list: ChildProfile[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(collection(db, 'families', familyId, 'children'), snap => {
    const list: ChildProfile[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as ChildProfile);
    });
    callback(list);
  }, err => {
    Sentry.captureException(err, { tags: { action: 'snapshot-children' } });
    onError?.(err);
  });
}

export function onTasksSnapshot(
  familyId: string,
  callback: (list: TaskDef[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(collection(db, 'families', familyId, 'tasks'), snap => {
    const list: TaskDef[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as TaskDef);
    });
    callback(list);
  }, err => {
    Sentry.captureException(err, { tags: { action: 'snapshot-tasks' } });
    onError?.(err);
  });
}

export function onRewardsSnapshot(
  familyId: string,
  callback: (list: RewardDef[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(collection(db, 'families', familyId, 'rewards'), snap => {
    const list: RewardDef[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as RewardDef);
    });
    callback(list);
  }, err => {
    Sentry.captureException(err, { tags: { action: 'snapshot-rewards' } });
    onError?.(err);
  });
}

export function onChildDataSnapshot(
  familyId: string,
  childId: string,
  callback: (data: ChildData | null) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    doc(db, 'families', familyId, 'childData', childId),
    snap => {
      callback(snap.exists() ? (snap.data() as ChildData) : null);
    },
    err => {
      Sentry.captureException(err, { tags: { action: 'snapshot-child-data', childId } });
      onError?.(err);
    }
  );
}

// ---------------------------------------------------------------------------
// In-app notifications
// ---------------------------------------------------------------------------

export interface InAppNotificationDoc {
  type: string;
  title: string;
  body: string;
  childId?: string;
  childName?: string;
  targetRole: string;
  read: boolean;
  createdAt: Timestamp | null;
}

export async function saveNotification(
  familyId: string,
  notifId: string,
  data: Record<string, any>
): Promise<void> {
  try {
    await setDoc(doc(db, 'families', familyId, 'notifications', notifId), data, {
      merge: true,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'save-notification' } });
    throw err;
  }
}

export async function writeNotification(
  familyId: string,
  data: Omit<InAppNotificationDoc, 'read' | 'createdAt'>
): Promise<string> {
  try {
    const ref = await addDoc(
      collection(db, 'families', familyId, 'notifications'),
      { ...data, read: false, createdAt: serverTimestamp() }
    );
    return ref.id;
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'write-notification' } });
    throw err;
  }
}

export async function markNotificationRead(
  familyId: string,
  notifId: string
): Promise<void> {
  await saveNotification(familyId, notifId, { read: true });
}

export function onNotificationsSnapshot(
  familyId: string,
  callback: (list: (InAppNotificationDoc & { id: string })[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, 'families', familyId, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, snap => {
    const list: (InAppNotificationDoc & { id: string })[] = [];
    snap.forEach(d => {
      if (d.data().createdAt == null) return;
      list.push({ id: d.id, ...d.data() } as InAppNotificationDoc & {
        id: string;
      });
    });
    callback(list);
  }, err => {
    Sentry.captureException(err, { tags: { action: 'snapshot-notifications' } });
    onError?.(err);
  });
}

export async function cleanupOldNotifications(familyId: string): Promise<void> {
  try {
    const BATCH_LIMIT = 500;
    const cutoffTs = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'families', familyId, 'notifications'),
      where('createdAt', '<', cutoffTs)
    );
    const snap = await getDocs(q);
    const refs: import('firebase/firestore').DocumentReference[] = [];
    snap.forEach(d => {
      refs.push(d.ref);
    });
    for (let start = 0; start < refs.length; start += BATCH_LIMIT) {
      const chunk = refs.slice(start, start + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (let j = 0; j < chunk.length; j++) {
        batch.delete(chunk[j]);
      }
      await batch.commit();
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'cleanup-old-notifications' } });
    throw err;
  }
}
