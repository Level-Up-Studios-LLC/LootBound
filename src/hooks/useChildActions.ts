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
    try {
      await fsDeleteChildData(deps.familyId, id);
    } catch (_e) {
      /* ignore */
    }
    deleteAllChildPhotos(deps.familyId, id).catch(function () {
      /* ignore */
    });
    deps.setAllU(function (p) {
      var o: Record<string, UserData> = {};
      for (var k in p) if (k !== id) o[k] = p[k];
      return o;
    });
    deps.notify('Child removed');
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
        ' pts for ' +
        (deps.getChild(uid) || ({} as any)).name
    );
  }

  async function resetAll() {
    var children = deps.cfg ? deps.cfg.children : [];
    // Delete all photos from Storage
    deleteAllFamilyPhotos(deps.familyId).catch(function (err) {
      console.warn('Photo cleanup failed during reset:', err);
    });
    for (var i = 0; i < children.length; i++) {
      await deps.saveUsr(children[i].id, freshUser());
    }
    deps.notify('All data reset');
  }

  return {
    doAddChild: doAddChild,
    doRemoveChild: doRemoveChild,
    addBonus: addBonus,
    resetAll: resetAll,
  };
}
