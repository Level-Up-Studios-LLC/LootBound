import React, { useState } from 'react';
import * as Sentry from '@sentry/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleUser,
  faKey,
  faLock,
  faFloppyDisk,
  faRotate,
  faTrashCan,
  faTriangleExclamation,
  faEnvelope,
  faCircleCheck,
  faCopy,
} from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { useAuthContext } from '../../context/AuthContext.tsx';
import { FA_ICON_STYLE } from '../../constants.ts';
import { changePassword, deleteAuthAccount, reauthenticate, getCurrentUid } from '../../services/auth.ts';
import { deleteFamily } from '../../services/firestoreStorage.ts';
import { deleteAllFamilyPhotos } from '../../services/photoStorage.ts';
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx';

export default function AccountTab(): React.ReactElement | null {
  var ctx = useAppContext();
  var auth = useAuthContext();
  var cfg = ctx.cfg;

  var _newPin = useState(''),
    newPin = _newPin[0],
    setNewPin = _newPin[1];
  var _curPass = useState(''),
    curPass = _curPass[0],
    setCurPass = _curPass[1];
  var _newPass = useState(''),
    newPass = _newPass[0],
    setNewPass = _newPass[1];
  var _confirmPass = useState(''),
    confirmPass = _confirmPass[0],
    setConfirmPass = _confirmPass[1];
  var _passErr = useState(''),
    passErr = _passErr[0],
    setPassErr = _passErr[1];
  var _passBusy = useState(false),
    passBusy = _passBusy[0],
    setPassBusy = _passBusy[1];
  var _passSuccess = useState(false),
    passSuccess = _passSuccess[0],
    setPassSuccess = _passSuccess[1];
  var _showResetConfirm = useState(false),
    showResetConfirm = _showResetConfirm[0],
    setShowResetConfirm = _showResetConfirm[1];
  var _showDeleteConfirm = useState(false),
    showDeleteConfirm = _showDeleteConfirm[0],
    setShowDeleteConfirm = _showDeleteConfirm[1];
  var _deleteBusy = useState(false),
    deleteBusy = _deleteBusy[0],
    setDeleteBusy = _deleteBusy[1];
  var _deletePass = useState(''),
    deletePass = _deletePass[0],
    setDeletePass = _deletePass[1];
  var _deleteErr = useState(''),
    deleteErr = _deleteErr[0],
    setDeleteErr = _deleteErr[1];
  var _verifyBusy = useState(false),
    verifyBusy = _verifyBusy[0],
    setVerifyBusy = _verifyBusy[1];
  var _verifySent = useState(false),
    verifySent = _verifySent[0],
    setVerifySent = _verifySent[1];

  if (!cfg) return null;

  async function handleChangePassword() {
    setPassErr('');
    setPassSuccess(false);
    if (!curPass) {
      setPassErr('Current password is required');
      return;
    }
    if (newPass.length < 6) {
      setPassErr('New password must be at least 6 characters');
      return;
    }
    if (newPass !== confirmPass) {
      setPassErr('New passwords do not match');
      return;
    }
    setPassBusy(true);
    try {
      await changePassword(curPass, newPass);
      setCurPass('');
      setNewPass('');
      setConfirmPass('');
      setPassSuccess(true);
      ctx.notify('Password updated');
    } catch (err: any) {
      var code = err.code || err.message || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPassErr('Current password is incorrect');
      } else if (code === 'auth/weak-password') {
        setPassErr('New password is too weak');
      } else {
        setPassErr('Failed to update password. Please try again.');
      }
    }
    setPassBusy(false);
  }

  async function handleDeleteFamily() {
    setDeleteErr('');
    if (!deletePass) {
      setDeleteErr('Enter your password to confirm deletion');
      return;
    }
    setDeleteBusy(true);
    try {
      // Re-authenticate up front to ensure the session is fresh
      // before any destructive operations
      await reauthenticate(deletePass);

      // Delete all photos from Storage
      try {
        await deleteAllFamilyPhotos(ctx.familyId);
      } catch (photoErr) {
        console.warn('Photo cleanup failed:', photoErr);
        Sentry.captureException(photoErr, { tags: { action: 'delete-family-photos' } });
        ctx.notify('Some photos could not be deleted', 'error');
      }
      // Delete all Firestore data
      var uid = getCurrentUid();
      if (!uid) throw new Error('Not signed in');
      await deleteFamily(ctx.familyId, uid);
      // Delete the Firebase Auth account (session is already fresh)
      // Note: other parent member auth accounts require Admin SDK to remove
      await deleteAuthAccount(deletePass);
    } catch (err: any) {
      console.error('Failed to delete family:', err);
      Sentry.captureException(err, { tags: { action: 'delete-family' } });
      var code = err.code || err.message || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteErr('Incorrect password');
      } else {
        setDeleteErr('Failed to delete account. Please try again.');
      }
      setDeleteBusy(false);
      return;
    }
    // Auth state change will redirect to role selection
  }

  return (
    <div>
      {/* Profile Info */}
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-3 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCircleUser} style={FA_ICON_STYLE} />
          Account
        </div>
        <div className='flex flex-col gap-2'>
          <div className='flex justify-between items-center'>
            <span className='text-[13px] text-qmuted'>Email</span>
            <span className='text-[13px] text-qslate font-semibold flex items-center gap-1.5'>
              {auth.authUser ? auth.authUser.email : '—'}
              {auth.authUser && auth.authUser.emailVerified && (
                <FontAwesomeIcon icon={faCircleCheck} className='text-qteal text-xs' />
              )}
            </span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-[13px] text-qmuted'>Family Code</span>
            <button
              onClick={function () {
                if (!cfg || !cfg.familyCode) return;
                var text = cfg.familyCode;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(text).then(function () {
                    ctx.notify('Copied!');
                  }).catch(function () {
                    ctx.notify('Long-press to copy', 'error');
                  });
                } else {
                  var ta = document.createElement('textarea');
                  ta.value = text;
                  ta.style.position = 'fixed';
                  ta.style.left = '-9999px';
                  ta.style.opacity = '0';
                  document.body.appendChild(ta);
                  ta.focus();
                  ta.select();
                  try {
                    if (document.execCommand('copy')) {
                      ctx.notify('Copied!');
                    } else {
                      ctx.notify('Long-press to copy');
                    }
                  } catch (_e) { /* ignore */ }
                  document.body.removeChild(ta);
                }
              }}
              className='text-[13px] text-qslate font-semibold tracking-[2px] bg-transparent border-none cursor-pointer p-0 flex items-center gap-1.5 hover:opacity-80 transition-opacity'
            >
              {cfg && cfg.familyCode ? cfg.familyCode : '—'}
              {cfg && cfg.familyCode && (
                <FontAwesomeIcon icon={faCopy} className='text-xs text-qmuted' />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Email Verification Banner */}
      {auth.authUser && !auth.authUser.emailVerified && (
        <div className='bg-qcoral-dim rounded-card p-4 mb-4'>
          <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
            <FontAwesomeIcon icon={faEnvelope} style={FA_ICON_STYLE} />
            Verify Your Email
          </div>
          <div className='text-[13px] text-qmuted mb-3'>
            Please verify your email address to secure your account. Check your inbox for a verification link.
          </div>
          <div className='flex gap-2'>
            <button
              onClick={async function () {
                setVerifyBusy(true);
                var ok = await auth.doSendVerification();
                setVerifyBusy(false);
                if (ok) setVerifySent(true);
              }}
              disabled={verifyBusy || verifySent}
              className='bg-qteal text-white rounded-badge px-4 py-2 font-semibold border-none cursor-pointer font-body text-[13px] disabled:opacity-60'
            >
              {verifySent ? 'Email Sent!' : verifyBusy ? 'Sending...' : 'Resend Verification'}
            </button>
            <button
              onClick={function () {
                auth.doRefreshVerification();
              }}
              className='bg-qslate-dim text-qslate rounded-badge px-4 py-2 font-semibold border-none cursor-pointer font-body text-[13px]'
            >
              I've Verified
            </button>
          </div>
        </div>
      )}

      {/* Parent PIN */}
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faKey} style={FA_ICON_STYLE} />
          Parent PIN
        </div>
        {!cfg.parentPin && (
          <div className='text-[13px] text-qslate mb-2 px-4 py-3 bg-qcoral-dim rounded-badge leading-relaxed'>
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className='mr-1.5'
              style={FA_ICON_STYLE}
            />
            No PIN set. You'll need your password each time you open the app.
          </div>
        )}
        <div className='flex gap-3'>
          <input
            type='password'
            maxLength={6}
            placeholder={cfg.parentPin ? 'New PIN' : 'Create PIN'}
            value={newPin}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setNewPin(e.target.value);
            }}
            className='quest-input !w-[120px] text-center'
          />
          <button
            onClick={function () {
              if (newPin.length >= 4) {
                ctx.saveCfg(Object.assign({}, cfg, { parentPin: newPin }));
                setNewPin('');
                ctx.notify('PIN updated');
              }
            }}
            className='bg-qteal text-white rounded-badge px-4 py-2 font-semibold border-none cursor-pointer font-body flex items-center gap-1.5'
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            Save
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faLock} style={FA_ICON_STYLE} />
          Change Password
        </div>
        <div className='flex flex-col gap-3'>
          <input
            type='password'
            placeholder='Current password'
            value={curPass}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setCurPass(e.target.value);
              setPassErr('');
              setPassSuccess(false);
            }}
            className='quest-input'
          />
          <input
            type='password'
            placeholder='New password (6+ characters)'
            value={newPass}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setNewPass(e.target.value);
              setPassErr('');
              setPassSuccess(false);
            }}
            className='quest-input'
          />
          <input
            type='password'
            placeholder='Confirm new password'
            value={confirmPass}
            onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
              setConfirmPass(e.target.value);
              setPassErr('');
              setPassSuccess(false);
            }}
            onKeyDown={function (e: React.KeyboardEvent) {
              if (e.key === 'Enter' && !passBusy) handleChangePassword();
            }}
            className='quest-input'
          />
          {passErr && (
            <div className='text-qcoral text-[13px]'>{passErr}</div>
          )}
          {passSuccess && (
            <div className='text-qteal text-[13px]'>Password updated successfully.</div>
          )}
          <button
            onClick={handleChangePassword}
            disabled={passBusy}
            className='bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body disabled:opacity-60'
          >
            {passBusy ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Reset All Data */}
      <div className='bg-qyellow rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faRotate} style={FA_ICON_STYLE} />
          Reset All Data
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Clears all coins, streaks, and history for all children.
          Tasks, rewards, and children profiles will remain.
        </div>
        <button
          onClick={function () {
            setShowResetConfirm(true);
          }}
          className='bg-qcoral text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          Reset Everything
        </button>
      </div>
      {showResetConfirm && (
        <ConfirmDialog
          title='Reset All Data?'
          message='This will permanently erase all coins, streaks, mission history, redemption logs, and uploaded photos for every child. Tasks, rewards, and children profiles will remain.'
          warning='This action cannot be undone.'
          confirmLabel='Yes, Reset Everything'
          confirmColor='bg-qcoral'
          onConfirm={function () {
            setShowResetConfirm(false);
            ctx.resetAll();
          }}
          onCancel={function () {
            setShowResetConfirm(false);
          }}
        />
      )}

      {/* Delete Family Account */}
      <div className='bg-qcoral-dim rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qcoral flex items-center gap-2'>
          <FontAwesomeIcon icon={faTrashCan} style={{ '--fa-primary-color': '#e05a5a', '--fa-secondary-color': '#FF8C94', '--fa-secondary-opacity': '1' } as any} />
          Delete Family Account
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          Permanently delete your family account, all children, missions, loot, photos, and data. This cannot be undone.
        </div>
        <button
          onClick={function () {
            setShowDeleteConfirm(true);
          }}
          className='bg-qcoral text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          Delete My Family Account
        </button>
      </div>
      {showDeleteConfirm && (
        <ConfirmDialog
          title='Delete Family Account?'
          message='This will permanently delete your entire family account including all children, missions, loot, coins, photos, and data. Your login will be removed and you will not be able to recover any data.'
          warning='THIS ACTION CANNOT BE UNDONE.'
          confirmLabel={deleteBusy ? 'Deleting...' : 'Yes, Delete Everything'}
          confirmColor='bg-qcoral'
          onConfirm={function () {
            if (!deleteBusy) handleDeleteFamily();
          }}
          onCancel={function () {
            if (!deleteBusy) {
              setShowDeleteConfirm(false);
              setDeletePass('');
              setDeleteErr('');
            }
          }}
        >
          <div className='flex flex-col gap-2 mt-2'>
            <input
              type='password'
              placeholder='Enter your password to confirm'
              value={deletePass}
              onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                setDeletePass(e.target.value);
                setDeleteErr('');
              }}
              onKeyDown={function (e: React.KeyboardEvent) {
                if (e.key === 'Enter' && !deleteBusy) handleDeleteFamily();
              }}
              className='quest-input'
              autoFocus
            />
            {deleteErr && (
              <div className='text-qcoral text-[13px]'>{deleteErr}</div>
            )}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
