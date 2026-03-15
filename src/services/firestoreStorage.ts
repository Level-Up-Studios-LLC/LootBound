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
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase.ts';

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
// Family config
// ---------------------------------------------------------------------------

export async function getConfig(
  familyId: string
): Promise<FamilyConfig | null> {
  var snap = await getDoc(doc(db, 'families', familyId));
  return snap.exists() ? (snap.data() as FamilyConfig) : null;
}

export async function saveConfig(
  familyId: string,
  data: Partial<FamilyConfig>
): Promise<void> {
  await setDoc(doc(db, 'families', familyId), data, { merge: true });
}

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

export async function getChildren(familyId: string): Promise<ChildProfile[]> {
  var snap = await getDocs(collection(db, 'families', familyId, 'children'));
  var list: ChildProfile[] = [];
  snap.forEach(function (d) {
    list.push(Object.assign({ id: d.id }, d.data()) as ChildProfile);
  });
  return list;
}

export async function saveChild(
  familyId: string,
  childId: string,
  data: Partial<ChildProfile>
): Promise<void> {
  var clean: DocumentData = Object.assign({}, data);
  delete clean.id;
  await setDoc(doc(db, 'families', familyId, 'children', childId), clean, {
    merge: true,
  });
}

export async function deleteChild(
  familyId: string,
  childId: string
): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId, 'children', childId));
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function getTasks(familyId: string): Promise<TaskDef[]> {
  var snap = await getDocs(collection(db, 'families', familyId, 'tasks'));
  var list: TaskDef[] = [];
  snap.forEach(function (d) {
    list.push(Object.assign({ id: d.id }, d.data()) as TaskDef);
  });
  return list;
}

export async function getTasksForChild(
  familyId: string,
  childId: string
): Promise<TaskDef[]> {
  var q = query(
    collection(db, 'families', familyId, 'tasks'),
    where('childId', '==', childId)
  );
  var snap = await getDocs(q);
  var list: TaskDef[] = [];
  snap.forEach(function (d) {
    list.push(Object.assign({ id: d.id }, d.data()) as TaskDef);
  });
  return list;
}

export async function saveTask(
  familyId: string,
  taskId: string,
  data: Partial<TaskDef>
): Promise<void> {
  var clean: DocumentData = Object.assign({}, data);
  delete clean.id;
  await setDoc(doc(db, 'families', familyId, 'tasks', taskId), clean, {
    merge: true,
  });
}

export async function deleteTask(
  familyId: string,
  taskId: string
): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId, 'tasks', taskId));
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export async function getRewards(familyId: string): Promise<RewardDef[]> {
  var snap = await getDocs(collection(db, 'families', familyId, 'rewards'));
  var list: RewardDef[] = [];
  snap.forEach(function (d) {
    list.push(Object.assign({ id: d.id }, d.data()) as RewardDef);
  });
  return list;
}

export async function saveReward(
  familyId: string,
  rewardId: string,
  data: Partial<RewardDef>
): Promise<void> {
  var clean: DocumentData = Object.assign({}, data);
  delete clean.id;
  await setDoc(doc(db, 'families', familyId, 'rewards', rewardId), clean, {
    merge: true,
  });
}

export async function deleteReward(
  familyId: string,
  rewardId: string
): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId, 'rewards', rewardId));
}

// ---------------------------------------------------------------------------
// Child data (points, streaks, logs, redemptions)
// ---------------------------------------------------------------------------

export async function getChildData(
  familyId: string,
  childId: string
): Promise<ChildData | null> {
  var snap = await getDoc(doc(db, 'families', familyId, 'childData', childId));
  return snap.exists() ? (snap.data() as ChildData) : null;
}

export async function saveChildData(
  familyId: string,
  childId: string,
  data: Partial<ChildData>
): Promise<void> {
  await setDoc(doc(db, 'families', familyId, 'childData', childId), data, {
    merge: true,
  });
}

export async function deleteChildData(
  familyId: string,
  childId: string
): Promise<void> {
  await deleteDoc(doc(db, 'families', familyId, 'childData', childId));
}

// ---------------------------------------------------------------------------
// Delete entire family — all subcollections and related docs
// ---------------------------------------------------------------------------

export async function deleteFamily(familyId: string, currentUid: string): Promise<void> {
  // Read family code — check config doc first, then query familyCodes collection
  var configSnap = await getDoc(doc(db, 'families', familyId));
  var familyCode = configSnap.exists() && configSnap.data().familyCode
    ? configSnap.data().familyCode
    : null;

  if (!familyCode) {
    // Family code may not be on the config doc — query the familyCodes collection
    var codeQuery = query(
      collection(db, 'familyCodes'),
      where('familyId', '==', familyId)
    );
    var codeSnap = await getDocs(codeQuery);
    if (!codeSnap.empty) {
      familyCode = codeSnap.docs[0].id;
    }
  }

  var batch = writeBatch(db);

  // Delete subcollections
  var subs = ['children', 'tasks', 'rewards', 'childData'];
  for (var i = 0; i < subs.length; i++) {
    var snap = await getDocs(collection(db, 'families', familyId, subs[i]));
    snap.forEach(function (d) {
      batch.delete(d.ref);
    });
  }

  // Delete family config doc
  batch.delete(doc(db, 'families', familyId));

  // Delete current user's parent member mapping
  batch.delete(doc(db, 'parentMembers', currentUid));

  // Delete family code mapping
  if (familyCode) {
    batch.delete(doc(db, 'familyCodes', familyCode));
  }

  await batch.commit();
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
  var batch = writeBatch(db);

  batch.set(doc(db, 'families', familyId), config);

  children.forEach(function (child) {
    var clean: DocumentData = Object.assign({}, child);
    var cid = child.id;
    delete clean.id;
    batch.set(doc(db, 'families', familyId, 'children', cid), clean);
  });

  Object.keys(tasks).forEach(function (childId) {
    tasks[childId].forEach(function (task) {
      var clean: DocumentData = Object.assign({ childId: childId }, task);
      var tid = task.id;
      delete clean.id;
      batch.set(doc(db, 'families', familyId, 'tasks', tid), clean);
    });
  });

  rewards.forEach(function (reward) {
    var clean: DocumentData = Object.assign({}, reward);
    var rid = reward.id;
    delete clean.id;
    batch.set(doc(db, 'families', familyId, 'rewards', rid), clean);
  });

  if (childDataMap) {
    Object.keys(childDataMap).forEach(function (childId) {
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
  callback: (data: FamilyConfig | null) => void
): () => void {
  return onSnapshot(doc(db, 'families', familyId), function (snap) {
    callback(snap.exists() ? (snap.data() as FamilyConfig) : null);
  });
}

export function onChildrenSnapshot(
  familyId: string,
  callback: (list: ChildProfile[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'families', familyId, 'children'),
    function (snap) {
      var list: ChildProfile[] = [];
      snap.forEach(function (d) {
        list.push(Object.assign({ id: d.id }, d.data()) as ChildProfile);
      });
      callback(list);
    }
  );
}

export function onTasksSnapshot(
  familyId: string,
  callback: (list: TaskDef[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'families', familyId, 'tasks'),
    function (snap) {
      var list: TaskDef[] = [];
      snap.forEach(function (d) {
        list.push(Object.assign({ id: d.id }, d.data()) as TaskDef);
      });
      callback(list);
    }
  );
}

export function onRewardsSnapshot(
  familyId: string,
  callback: (list: RewardDef[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'families', familyId, 'rewards'),
    function (snap) {
      var list: RewardDef[] = [];
      snap.forEach(function (d) {
        list.push(Object.assign({ id: d.id }, d.data()) as RewardDef);
      });
      callback(list);
    }
  );
}

export function onChildDataSnapshot(
  familyId: string,
  childId: string,
  callback: (data: ChildData | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'families', familyId, 'childData', childId),
    function (snap) {
      callback(snap.exists() ? (snap.data() as ChildData) : null);
    }
  );
}
