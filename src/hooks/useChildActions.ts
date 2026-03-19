import * as Sentry from '@sentry/react';
import type { Config, UserData, Child, AddChildFormData } from '../types.ts';
import { freshUser, slugify } from '../utils.ts';
import { deleteChildData as fsDeleteChildData } from '../services/firestoreStorage.ts';
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
  setAllU: (fn: (p: Record<string, UserData>) => Record<string, UserData>) => void;
  notify: (msg: string, type?: string) => void;
  getChild: (id: string) => Child | null;
}

export function useChildActions(deps: ChildActionsDeps) {
  const doAddChild = async (form: AddChildFormData) => {
    const id = slugify(form.name);
    const newChild: Child = {
      id,
      name: form.name,
      age: Number(form.age) || 1,
      avatar: form.avatar,
      color: form.color,
      pin: null,
    };
    const newCfg = { ...deps.cfg! } as Config;
    newCfg.children = (newCfg.children || []).concat([newChild]);
    if (!newCfg.tasks) newCfg.tasks = {};
    newCfg.tasks[id] = [];
    await deps.saveCfg(newCfg);
    await deps.saveUsr(id, freshUser());
    deps.notify(`${form.name} added!`);
  };

  const doRemoveChild = async (id: string) => {
    const newCfg = { ...deps.cfg! } as Config;
    newCfg.children = (newCfg.children || []).filter((c) => c.id !== id);
    const newTasks = { ...newCfg.tasks };
    delete newTasks[id];
    newCfg.tasks = newTasks;
    await deps.saveCfg(newCfg);
    let childDataDeleted = true;
    try {
      await fsDeleteChildData(deps.familyId, id);
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'delete-child-data', childId: id } });
      childDataDeleted = false;
    }
    deleteAllChildPhotos(deps.familyId, id).catch((err) => {
      Sentry.captureException(err, { tags: { action: 'delete-child-photos', childId: id } });
    });
    deps.setAllU((p) => {
      const o: Record<string, UserData> = {};
      for (const k in p) if (k !== id) o[k] = p[k];
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
    deleteAllFamilyPhotos(deps.familyId).catch((err) => {
      console.warn('Photo cleanup failed during reset:', err);
      Sentry.captureException(err, { tags: { action: 'reset-all-photo-cleanup' } });
    });
    for (let i = 0; i < children.length; i++) {
      await deps.saveUsr(children[i].id, freshUser());
    }
    deps.notify('All data reset');
  };

  return {
    doAddChild,
    doRemoveChild,
    addBonus,
    resetAll,
  };
}
