import * as Sentry from '@sentry/react';
import type { Config, UserData, Child, AddChildFormData, ResetOptions } from '../types.ts';
import { freshUser, slugify } from '../utils.ts';
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

  const addBonus = async (uid: string, pts: number) => {
    const ud = structuredClone(deps.allU[uid] || freshUser()) as UserData;
    ud.points = (ud.points || 0) + pts;
    await deps.saveUsr(uid, ud);
    deps.notify(
      `${pts > 0 ? '+' : ''}${pts} coins for${(deps.getChild(uid) || ({} as any)).name}`
    );
  };

  const resetAll = async () => {
    const children = deps.cfg ? deps.cfg.children : [];
    // Delete all photos from Storage
    deleteAllFamilyPhotos(deps.familyId).catch(err => {
      console.warn('Photo cleanup failed during reset:', err);
      Sentry.captureException(err, {
        tags: { action: 'reset-all-photo-cleanup' },
      });
    });
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
      deps.setAllU(() => resetUsers);
      deps.notify('All data reset');
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'reset-child-data' } });
      deps.notify('Data reset failed — please try again', 'error');
    }
  };

  const resetData = async (opts: ResetOptions) => {
    const children = deps.cfg?.children || [];
    const allSelected = opts.coins && opts.xpLevels && opts.streaks && opts.taskHistory && opts.redemptions;

    // If everything selected, delegate to full reset (uses replaceChildData)
    if (allSelected) return resetAll();

    // Delete photos only if clearing task history
    if (opts.taskHistory) {
      deleteAllFamilyPhotos(deps.familyId).catch(err => {
        console.warn('Photo cleanup failed during selective reset:', err);
        Sentry.captureException(err, { tags: { action: 'reset-data-photo-cleanup' } });
      });
    }

    // Build partial update based on selected options
    const update: Partial<UserData> = {};
    if (opts.coins) update.points = 0;
    if (opts.xpLevels) { update.xp = 0; update.level = 1; }
    if (opts.streaks) {
      update.streak = 0;
      update.bestStreak = 0;
      update.missedDaysThisWeek = 0;
      update.lastPerfectDate = null;
    }
    if (opts.taskHistory) { update.taskLog = {}; update.lastTaskTime = 0; }
    if (opts.redemptions) { update.redemptions = []; update.pendingRedemptions = []; }

    const promises: Promise<void>[] = [];
    for (let i = 0; i < children.length; i++) {
      promises.push(fsSaveChildData(deps.familyId, children[i].id, update));
    }

    try {
      await Promise.all(promises);
      deps.setAllU(prev => {
        const next = { ...prev };
        for (let i = 0; i < children.length; i++) {
          next[children[i].id] = { ...next[children[i].id], ...update } as UserData;
        }
        return next;
      });
      deps.notify('Selected data reset');
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'reset-data-selective' } });
      deps.notify('Data reset failed — please try again', 'error');
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
