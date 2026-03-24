import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faKey, faUserPlus, faTrashCan, faChildren, faPenToSquare } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { getCurrentUid } from '../../services/auth.ts';
import { AVATARS, COLORS, altBg } from '../../constants.ts';
import Modal from '../../components/ui/Modal.tsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx';
import AddChildForm from '../../components/forms/AddChildForm.tsx';
import EmptyState from '../../components/ui/EmptyState.tsx';
import PurchasesToggle from '../../components/ui/PurchasesToggle.tsx';
import PasswordInput from '../../components/ui/PasswordInput.tsx';
import type { UserData, Child, AddChildFormData, KidPinEditState } from '../../types.ts';

function getSkipKey() {
  return `lb-skip-delete-child:${getCurrentUid() || 'anon'}`;
}

export default function ChildrenTab(): React.ReactElement {
  const [kidPinEdit, setKidPinEdit] = useState<KidPinEditState>({ uid: null, val: '' });
  const [addChildForm, setAddChildForm] = useState<AddChildFormData | null>(null);
  const [editChild, setEditChild] = useState<Child | null>(null);
  const [editChildForm, setEditChildForm] = useState<AddChildFormData | null>(null);
  const [removeChild, setRemoveChild] = useState<Child | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ctx = useAppContext();
  const children = ctx.children;
  const allU = ctx.allU;
  const cfg = ctx.cfg;

  return (
    <div>
      <div className='text-[13px] text-qmuted mb-4 leading-relaxed'>
        Add children to your family. Each child gets their own profile, missions,
        and coin balance. Set a PIN per child to prevent siblings from
        accessing each other's profiles.
      </div>
      <div className='flex justify-between items-center mb-4'>
        <span className='font-bold text-qslate'>Manage Children</span>
        <button
          onClick={() => {
            setAddChildForm({
              name: '',
              age: '',
              avatar: AVATARS[0],
              color: COLORS[0],
            });
          }}
          className='bg-qmint text-qslate rounded-badge px-4 py-2 text-[13px] font-bold border-none cursor-pointer font-body flex items-center gap-1.5'
        >
          <FontAwesomeIcon icon={faUserPlus} />
          Add Child
        </button>
      </div>
      {children.map((c, ci) => {
        return (
          <div key={c.id} className={altBg(ci) + ' rounded-btn p-4 mb-4'}>
            <div className='flex justify-between items-center'>
              <div className='flex items-center gap-2.5'>
                <div className='text-[32px]'>{c.avatar}</div>
                <div>
                  <div className='font-bold text-base text-qslate'>
                    {c.name}
                  </div>
                  <div className='text-xs text-qmuted'>
                    Age {c.age} |{' '}
                    {(allU[c.id] || ({} as UserData)).points || 0} coins |{' '}
                    {c.pin ? 'PIN set' : 'No PIN'}
                  </div>
                </div>
              </div>
              <div className='flex gap-1.5'>
                {kidPinEdit.uid === c.id ? (
                  <div className='flex gap-1'>
                    <PasswordInput
                      maxLength={4}
                      placeholder='PIN'
                      value={kidPinEdit.val}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setKidPinEdit({ uid: c.id, val: e.target.value });
                      }}
                      className='quest-input w-[60px]! text-center py-1! px-1.5! text-xs!'
                    />
                    <button
                      onClick={() => {
                        if (kidPinEdit.val.length === 4) {
                          const nc = cfg!.children.map((x) => {
                            return x.id === c.id
                              ? { ...x, pin: kidPinEdit.val }
                              : x;
                          });
                          ctx.saveCfg({ ...cfg!, children: nc });
                          setKidPinEdit({ uid: null, val: '' });
                          ctx.notify('PIN saved');
                        }
                      }}
                      className='bg-qteal text-white rounded-badge px-2 py-[3px] text-[11px] font-bold border-none cursor-pointer font-body'
                    >
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setKidPinEdit({ uid: null, val: '' });
                      }}
                      className='bg-qslate-dim text-qslate rounded-badge px-1.5 py-[3px] text-[11px] font-semibold border-none cursor-pointer font-body'
                    >
                      <FontAwesomeIcon icon={faXmark} />
                      <span className='sr-only'>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <div className='flex gap-1'>
                    <button
                      onClick={() => {
                        setKidPinEdit({ uid: c.id, val: '' });
                      }}
                      className='bg-qblue-dim text-qblue rounded-[6px] px-2 py-[3px] text-[11px] font-semibold border-none cursor-pointer font-body flex items-center gap-1'
                    >
                      <FontAwesomeIcon icon={faKey} />
                      {c.pin ? 'PIN' : 'Set PIN'}
                    </button>
                    {c.pin && (
                      <button
                        onClick={() => {
                          const nc = cfg!.children.map((x) => {
                            return x.id === c.id
                              ? { ...x, pin: null }
                              : x;
                          });
                          ctx.saveCfg({ ...cfg!, children: nc });
                          ctx.notify('PIN removed');
                        }}
                        className='bg-qred-dim text-qred rounded-[6px] px-2 py-[3px] text-[11px] font-bold border-none cursor-pointer font-body'
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setEditChild(c);
                    setEditChildForm({
                      name: c.name,
                      age: String(c.age),
                      avatar: c.avatar,
                      color: c.color,
                    });
                  }}
                  className='bg-qblue-dim text-qblue rounded-[6px] px-2 py-[3px] text-[11px] font-semibold border-none cursor-pointer font-body flex items-center gap-1'
                >
                  <FontAwesomeIcon icon={faPenToSquare} />
                  <span className='sr-only'>Edit</span>
                </button>
                <button
                  onClick={() => {
                    try {
                      if (localStorage.getItem(getSkipKey()) === '1') {
                        ctx.doRemoveChild(c.id);
                        return;
                      }
                    } catch (_e) {}
                    setRemoveChild(c);
                  }}
                  className='bg-qred-dim text-qred rounded-[6px] px-2 py-[3px] text-[11px] font-bold border-none cursor-pointer font-body flex items-center gap-1'
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                  <span className='sr-only'>Delete</span>
                </button>
              </div>
            </div>
            <PurchasesToggle
              id={c.id}
              redeems={(allU[c.id] || ({} as UserData)).redemptions || []}
              isOpen={expanded[c.id] || false}
              onToggle={(id) => {
                const next = { ...expanded };
                next[id] = !next[id];
                setExpanded(next);
              }}
            />
          </div>
        );
      })}
      {children.length === 0 && (
        <EmptyState
          icon={faChildren}
          title='No children yet'
          description='Add your first child to get started with missions and loot!'
        />
      )}

      {addChildForm && (
        <Modal title='Add Child'>
          <AddChildForm
            form={addChildForm}
            onChange={(f) => {
              setAddChildForm(f);
            }}
            onSave={() => {
              ctx.doAddChild(addChildForm!);
              setAddChildForm(null);
            }}
            onCancel={() => {
              setAddChildForm(null);
            }}
          />
        </Modal>
      )}

      {editChild && editChildForm && (
        <Modal title='Edit Child'>
          <AddChildForm
            form={editChildForm}
            onChange={(f) => {
              setEditChildForm(f);
            }}
            onSave={() => {
              if (!editChildForm || !editChild || !cfg) return;
              const updated = cfg.children.map(c => {
                if (c.id !== editChild.id) return c;
                return {
                  ...c,
                  name: editChildForm.name,
                  age: Number(editChildForm.age) || c.age,
                  avatar: editChildForm.avatar,
                  color: editChildForm.color,
                };
              });
              ctx.saveCfg({ ...cfg, children: updated });
              ctx.notify(`${editChildForm.name} updated!`);
              setEditChild(null);
              setEditChildForm(null);
            }}
            onCancel={() => {
              setEditChild(null);
              setEditChildForm(null);
            }}
            saveLabel='Save'
          />
        </Modal>
      )}

      {removeChild && (
        <ConfirmDialog
          title={`Remove ${removeChild.name}?`}
          message={`This permanently removes ${removeChild.name} from LootBound, including all their coins, missions, streaks, and history.`}
          warning='This action cannot be undone.'
          confirmLabel='Remove'
          dontAskAgainKey={getSkipKey()}
          onConfirm={() => {
            ctx.doRemoveChild(removeChild!.id);
            setRemoveChild(null);
          }}
          onCancel={() => {
            setRemoveChild(null);
          }}
        />
      )}
    </div>
  );
}
