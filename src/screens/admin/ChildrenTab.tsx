import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faKey, faUserPlus, faTrashCan } from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { AVATARS, COLORS, altBg } from '../../constants.ts';
import Modal from '../../components/ui/Modal.tsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx';
import AddChildForm from '../../components/forms/AddChildForm.tsx';
import type { UserData, Child, AddChildFormData, KidPinEditState } from '../../types.ts';

export default function ChildrenTab(): React.ReactElement {
  var _kidPinEdit = useState<KidPinEditState>({ uid: null, val: '' }),
    kidPinEdit = _kidPinEdit[0],
    setKidPinEdit = _kidPinEdit[1];
  var _addChildForm = useState<AddChildFormData | null>(null),
    addChildForm = _addChildForm[0],
    setAddChildForm = _addChildForm[1];
  var _removeChild = useState<Child | null>(null),
    removeChild = _removeChild[0],
    setRemoveChild = _removeChild[1];

  var ctx = useAppContext();
  var children = ctx.children;
  var allU = ctx.allU;
  var cfg = ctx.cfg;

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
          onClick={function () {
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
      {children.map(function (c, ci) {
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
                    <input
                      type='password'
                      maxLength={4}
                      placeholder='PIN'
                      value={kidPinEdit.val}
                      onChange={function (
                        e: React.ChangeEvent<HTMLInputElement>
                      ) {
                        setKidPinEdit({ uid: c.id, val: e.target.value });
                      }}
                      className='quest-input !w-[60px] text-center !py-1 !px-1.5 !text-xs'
                    />
                    <button
                      onClick={function () {
                        if (kidPinEdit.val.length === 4) {
                          var nc = cfg!.children.map(function (x) {
                            return x.id === c.id
                              ? Object.assign({}, x, {
                                  pin: kidPinEdit.val,
                                })
                              : x;
                          });
                          ctx.saveCfg(
                            Object.assign({}, cfg!, { children: nc })
                          );
                          setKidPinEdit({ uid: null, val: '' });
                          ctx.notify('PIN saved');
                        }
                      }}
                      className='bg-qteal text-white rounded-badge px-2 py-[3px] text-[11px] font-bold border-none cursor-pointer font-body'
                    >
                      OK
                    </button>
                    <button
                      onClick={function () {
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
                      onClick={function () {
                        setKidPinEdit({ uid: c.id, val: '' });
                      }}
                      className='bg-qblue-dim text-qblue rounded-[6px] px-2 py-[3px] text-[11px] font-semibold border-none cursor-pointer font-body flex items-center gap-1'
                    >
                      <FontAwesomeIcon icon={faKey} />
                      {c.pin ? 'PIN' : 'Set PIN'}
                    </button>
                    {c.pin && (
                      <button
                        onClick={function () {
                          var nc = cfg!.children.map(function (x) {
                            return x.id === c.id
                              ? Object.assign({}, x, { pin: null })
                              : x;
                          });
                          ctx.saveCfg(
                            Object.assign({}, cfg!, { children: nc })
                          );
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
                  onClick={function () {
                    setRemoveChild(c);
                  }}
                  className='bg-qred-dim text-qred rounded-[6px] px-2 py-[3px] text-[11px] font-bold border-none cursor-pointer font-body flex items-center gap-1'
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                  <span className='sr-only'>Delete</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {children.length === 0 && (
        <div className='text-center p-5 text-qmuted'>
          No children. Add one to get started.
        </div>
      )}

      {addChildForm && (
        <Modal title='Add Child'>
          <AddChildForm
            form={addChildForm}
            onChange={function (f) {
              setAddChildForm(f);
            }}
            onSave={function () {
              ctx.doAddChild(addChildForm!);
              setAddChildForm(null);
            }}
            onCancel={function () {
              setAddChildForm(null);
            }}
          />
        </Modal>
      )}

      {removeChild && (
        <ConfirmDialog
          title={'Remove ' + removeChild.name + '?'}
          message={
            'This permanently removes ' +
            removeChild.name +
            ' from LootBound, including all their coins, missions, streaks, and history.'
          }
          warning='This action cannot be undone.'
          confirmLabel='Remove'
          onConfirm={function () {
            ctx.doRemoveChild(removeChild!.id);
            setRemoveChild(null);
          }}
          onCancel={function () {
            setRemoveChild(null);
          }}
        />
      )}
    </div>
  );
}
