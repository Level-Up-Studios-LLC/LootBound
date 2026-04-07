import * as Sentry from '@sentry/react';
import type {
  Config,
  UserData,
  Child,
  AddChildFormData,
  ResetOptions,
} from '../types.ts';
import type { ChildData } from '../services/firestoreStorage.ts';
import { freshUser, getToday, slugify } from '../utils.ts';
import { MIN_COINS } from '../constants.ts';
import {
  deleteChildData as fsDeleteChildData,
  replaceChildData,
  saveChildData as fsSaveChildData,
} from '../services/firestoreStorage.ts';
import {
  deleteAllChildPhotos,
  deleteAllFamilyPhotos,
} from '../services/photoStorage.ts';

interface ChildActionsDeps {
  cfg: Config | null;
  allU: Record<string, UserData>;
  familyId: string;
  saveCfg: (c: Config) => Promise<void>;
  saveUsr: (uid: string, data: UserData) => Promise<void>;
  setAllU: (
    fn: (p: Record<string, UserData>) => Record<string, UserData>
  ) => void;
  notify: (msg: string, type?: string) => void;
  getChild: (id: string) => Child | null;
}

export function useChildActions(deps: ChildActionsDeps) {
  const doAddChild = async (form: AddChildFormData) => {
    if (!deps.cfg) return;
    const id = slugify(form.name);
    const newChild: Child = {
      id,
      name: form.name,
      age: Number(form.age) || 1,
      avatar: form.avatar,
      color: form.color,
      pin: null,
    };
    const newCfg = Object.assign({}, deps.cfg) as Config;
    newCfg.children = (newCfg.children || []).concat([newChild]);
    if (!newCfg.tasks) newCfg.tasks = {};
    newCfg.tasks[id] = [];
    await deps.saveCfg(newCfg);
    await deps.saveUsr(id, freshUser());
    deps.notify(`${form.name} added!`);
  };

  const doRemoveChild = async (id: string) => {
    if (!deps.cfg) return;
    const newCfg = Object.assign({}, deps.cfg) as Config;
    newCfg.children = (newCfg.children || []).filter(c => c.id !== id);
    const newTasks = Object.assign({}, newCfg.tasks);
    delete newTasks[id];
    newCfg.tasks = newTasks;
    await deps.saveCfg(newCfg);
    let childDataDeleted = true;
    try {
      await fsDeleteChildData(deps.familyId, id);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { action: 'delete-child-data', childId: id },
      });
      childDataDeleted = false;
    }
    deleteAllChildPhotos(deps.familyId, id).catch(err => {
      Sentry.captureException(err, {
        tags: { action: 'delete-child-photos', childId: id },
      });
    });
    deps.setAllU(p => {
      const o: Record<string, UserData> = { ...p };
      delete o[id];
      return o;
    });
    if (childDataDeleted) {
      deps.notify('Child removed');
    } else {
      deps.notify('Child removed, but some data cleanup failed');
    }
  };

  const addBonus = async (uid: string, pts: number, reason?: string) => {
    const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
    const prevPoints = ud.points || 0;
    const nextPoints = Math.max(MIN_COINS, prevPoints + pts);
    const appliedDelta = nextPoints - prevPoints;
    ud.points = nextPoints;
    // Store adjustment in history
    if (!ud.adjustments) ud.adjustments = [];
    ud.adjustments.push({
      amount: appliedDelta,
      reason: reason || '',
      date: getToday(),
    });
    try {
      await deps.saveUsr(uid, ud);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { action: 'add-bonus-save-user', childId: uid },
      });
      deps.notify('Could not update coins — please try again', 'error');
      return;
    }
    const childName = deps.getChild(uid)?.name ?? 'this child';
    deps.notify(
      `${appliedDelta > 0 ? '+' : ''}${appliedDelta} coins for ${childName}`
    );
  };

  const resetAll = async () => {
    if (!deps.cfg) {
      deps.notify('Data reset failed — please try again', 'error');
      throw new Error('Cannot reset data before config has loaded');
    }
    const children = deps.cfg.children || [];
    // Use replaceChildData (no merge) so old taskLog entries are fully wiped.
    // Build reset state and fire Firestore writes in parallel.
    const resetUsers: Record<string, UserData> = {};
    const promises: Promise<void>[] = [];
    for (let i = 0; i < children.length; i++) {
      const fresh = freshUser();
      resetUsers[children[i].id] = fresh;
      promises.push(replaceChildData(deps.familyId, children[i].id, fresh));
    }
    try {
      await Promise.all(promises);
      // Delete photos only after Firestore writes succeed
      let photoCleanupFailed = false;
      try {
        await deleteAllFamilyPhotos(deps.familyId);
      } catch (err) {
        photoCleanupFailed = true;
        console.warn('Photo cleanup failed during reset:', err);
        Sentry.captureException(err, {
          tags: { action: 'reset-all-photo-cleanup' },
        });
        deps.notify(
          'All data reset, but some photos could not be deleted',
          'error'
        );
      }
      deps.setAllU(() => resetUsers);
      if (!photoCleanupFailed) deps.notify('All data reset');
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'reset-child-data' } });
      deps.notify('Data reset failed — please try again', 'error');
      throw err;
    }
  };

  const resetData = async (opts: ResetOptions) => {
    if (!deps.cfg) {
      deps.notify('Data reset failed — please try again', 'error');
      throw new Error('Cannot reset data before config has loaded');
    }
    const children = deps.cfg.children || [];
    const allSelected =
      opts.coins &&
      opts.xpLevels &&
      opts.streaks &&
      opts.taskHistory &&
      opts.redemptions;

    // If everything selected, delegate to full reset (uses replaceChildData)
    if (allSelected) return resetAll();

    // Build partial update based on selected options
    const update: Partial<ChildData> = {};
    if (opts.coins) update.points = 0;
    if (opts.xpLevels) {
      update.xp = 0;
      update.level = 1;
    }
    if (opts.streaks) {
      update.streak = 0;
      update.bestStreak = 0;
      update.missedDaysThisWeek = 0;
      update.lastPerfectDate = null;
    }
    if (opts.taskHistory) {
      update.taskLog = {};
      update.lastTaskTime = 0;
    }
    if (opts.redemptions) {
      update.redemptions = [];
      update.pendingRedemptions = [];
    }

    const promises: Promise<void>[] = [];
    for (let i = 0; i < children.length; i++) {
      promises.push(fsSaveChildData(deps.familyId, children[i].id, update));
    }

    try {
      await Promise.all(promises);
      // Delete photos only after Firestore writes succeed
      let photoCleanupFailed = false;
      if (opts.taskHistory) {
        try {
          await deleteAllFamilyPhotos(deps.familyId);
        } catch (err) {
          photoCleanupFailed = true;
          console.warn('Photo cleanup failed during selective reset:', err);
          Sentry.captureException(err, {
            tags: { action: 'reset-data-photo-cleanup' },
          });
          deps.notify(
            'Task history reset, but some photos could not be deleted',
            'error'
          );
        }
      }
      deps.setAllU(prev => {
        const next = { ...prev };
        for (let i = 0; i < children.length; i++) {
          const id = children[i].id;
          if (!next[id]) continue;
          // Clone per child to avoid shared object/array references
          const perChild: Partial<ChildData> = { ...update };
          if (update.taskLog !== undefined) perChild.taskLog = {};
          if (update.redemptions !== undefined) perChild.redemptions = [];
          if (update.pendingRedemptions !== undefined)
            perChild.pendingRedemptions = [];
          next[id] = { ...next[id], ...perChild };
        }
        return next;
      });
      if (!photoCleanupFailed) deps.notify('Selected data reset');
    } catch (err) {
      Sentry.captureException(err, {
        tags: { action: 'reset-data-selective' },
      });
      deps.notify('Data reset failed — please try again', 'error');
      throw err;
    }
  };

  return {
    doAddChild,
    doRemoveChild,
    addBonus,
    resetAll,
    resetData,
  };
}
