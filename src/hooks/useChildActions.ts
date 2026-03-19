import * as Sentry from '@sentry/react';
import type { Config, UserData, Child, AddChildFormData } from '../types.ts';
import type { ChildData } from '../services/firestoreStorage.ts';
import { freshUser, slugify } from '../utils.ts';
import { deleteChildData as fsDeleteChildData, replaceChildData } from '../services/firestoreStorage.ts';
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
  async function doAddChild(form: AddChildFormData) {
    var id = slugify(form.name);
    var newChild: Child = {
      id: id,
      name: form.name,
      age: Number(form.age) || 1,
      avatar: form.avatar,
      color: form.color,
      pin: null,
    };
    var newCfg = Object.assign({}, deps.cfg!) as Config;
    newCfg.children = (newCfg.children || []).concat([newChild]);
    if (!newCfg.tasks) newCfg.tasks = {};
    newCfg.tasks[id] = [];
    await deps.saveCfg(newCfg);
    await deps.saveUsr(id, freshUser());
    deps.notify(form.name + ' added!');
  }

  async function doRemoveChild(id: string) {
    var newCfg = Object.assign({}, deps.cfg!) as Config;
    newCfg.children = (newCfg.children || []).filter(function (c) {
      return c.id !== id;
    });
    var newTasks = Object.assign({}, newCfg.tasks);
    delete newTasks[id];
    newCfg.tasks = newTasks;
    await deps.saveCfg(newCfg);
    var childDataDeleted = true;
    try {
      await fsDeleteChildData(deps.familyId, id);
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'delete-child-data', childId: id } });
      childDataDeleted = false;
    }
    deleteAllChildPhotos(deps.familyId, id).catch(function (err) {
      Sentry.captureException(err, { tags: { action: 'delete-child-photos', childId: id } });
    });
    deps.setAllU(function (p) {
      var o: Record<string, UserData> = Object.assign({}, p);
      delete o[id];
      return o;
    });
    if (childDataDeleted) {
      deps.notify('Child removed');
    } else {
      deps.notify('Child removed, but some data cleanup failed');
    }
  }

  async function addBonus(uid: string, pts: number) {
    var ud = JSON.parse(
      JSON.stringify(deps.allU[uid] || freshUser())
    ) as UserData;
    ud.points = (ud.points || 0) + pts;
    await deps.saveUsr(uid, ud);
    deps.notify(
      (pts > 0 ? '+' : '') +
        pts +
        ' coins for' +
        (deps.getChild(uid) || ({} as any)).name
    );
  }

  async function resetAll() {
    var children = deps.cfg ? deps.cfg.children : [];
    // Delete all photos from Storage
    deleteAllFamilyPhotos(deps.familyId).catch(function (err) {
      console.warn('Photo cleanup failed during reset:', err);
      Sentry.captureException(err, { tags: { action: 'reset-all-photo-cleanup' } });
    });
    // Use replaceChildData (no merge) so old taskLog entries are fully wiped.
    // Build reset state and fire Firestore writes in parallel.
    var resetUsers: Record<string, UserData> = {};
    var promises: Promise<void>[] = [];
    for (var i = 0; i < children.length; i++) {
      var fresh = freshUser();
      resetUsers[children[i].id] = fresh;
      promises.push(
        replaceChildData(deps.familyId, children[i].id, fresh as unknown as ChildData)
      );
    }
    try {
      await Promise.all(promises);
      deps.setAllU(function () {
        return resetUsers;
      });
      deps.notify('All data reset');
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'reset-child-data' } });
      deps.notify('Data reset failed — please try again', 'error');
    }
  }

  return {
    doAddChild: doAddChild,
    doRemoveChild: doRemoveChild,
    addBonus: addBonus,
    resetAll: resetAll,
  };
}
