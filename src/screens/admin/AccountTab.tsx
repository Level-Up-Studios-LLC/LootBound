import React, { useState, useEffect } from 'react';
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
  faSpinner,
} from '../../fa.ts';
import { useAppContext } from '../../context/AppContext.tsx';
import { useAuthContext } from '../../context/AuthContext.tsx';
import { FA_ICON_STYLE } from '../../constants.ts';
import {
  changePassword,
  changeEmail,
  setPassword,
  deleteAuthAccount,
  reauthenticate,
  getCurrentUid,
  hasPasswordProvider,
} from '../../services/auth.ts';
import {
  deleteFamily,
  saveParentMember,
  deleteParentMember,
  onParentMemberSnapshot,
} from '../../services/firestoreStorage.ts';
import { deleteAllFamilyPhotos } from '../../services/photoStorage.ts';
import { copyToClipboard } from '../../services/platform.ts';
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx';
import { faPenToSquare } from '../../fa.ts';

const getInitials = (name: string | undefined, email: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : '?';
};

export default function AccountTab(): React.ReactElement | null {
  const ctx = useAppContext();
  const auth = useAuthContext();
  const cfg = ctx.cfg;
  const currentUid = getCurrentUid();

  const [myName, setMyName] = useState<string | undefined>(undefined);
  const [myPin, setMyPin] = useState('');

  useEffect(() => {
    if (!currentUid) return;
    return onParentMemberSnapshot(currentUid, member => {
      setMyName(member && member.parentName ? member.parentName : undefined);
      setMyPin(member && member.parentPin ? member.parentPin : '');
    });
  }, [currentUid]);

  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [editErr, setEditErr] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passErr, setPassErr] = useState('');
  const [passBusy, setPassBusy] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deletionInProgress, setDeletionInProgress] = useState(false);
  const [deletePass, setDeletePass] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  if (!cfg) return null;

  const handleChangePassword = async () => {
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
      const code = err.code || err.message || '';
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        setPassErr('Current password is incorrect');
      } else if (code === 'auth/weak-password') {
        setPassErr('New password is too weak');
      } else {
        setPassErr('Failed to update password. Please try again.');
        Sentry.captureException(err, { tags: { action: 'change-password' } });
      }
    }
    setPassBusy(false);
  };

  const handleSetPassword = async () => {
    setPassErr('');
    setPassSuccess(false);
    if (newPass.length < 6) {
      setPassErr('Password must be at least 6 characters');
      return;
    }
    if (newPass !== confirmPass) {
      setPassErr('Passwords do not match');
      return;
    }
    setPassBusy(true);
    try {
      await setPassword(newPass);
      setNewPass('');
      setConfirmPass('');
      setPassSuccess(true);
      ctx.notify('Password set! You can now sign in with email and password.');
    } catch (err: any) {
      const code = err.code || err.message || '';
      if (code === 'auth/weak-password') {
        setPassErr('Password is too weak');
      } else if (code === 'auth/requires-recent-login') {
        setPassErr(
          'Please sign out and sign back in with Google, then try again.'
        );
      } else {
        setPassErr('Failed to set password. Please try again.');
        Sentry.captureException(err, { tags: { action: 'set-password' } });
      }
    }
    setPassBusy(false);
  };

  const handleSaveProfile = async () => {
    setEditErr('');
    const trimmedName = nameVal.trim();
    const trimmedEmail = emailVal.trim();
    const currentEmail = auth.authUser ? auth.authUser.email : '';
    const emailChanged = trimmedEmail && trimmedEmail !== currentEmail;

    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEditErr('Enter a valid email address');
      return;
    }

    setEditBusy(true);
    const nameChanged = trimmedName !== (myName || '');
    try {
      // Save name to per-parent doc (including clearing)
      if (nameChanged && currentUid) {
        await saveParentMember(currentUid, { parentName: trimmedName });
        setMyName(trimmedName || undefined);
      }

      // Update email — sends verification to the new address
      if (emailChanged) {
        await changeEmail(trimmedEmail);
        ctx.notify(`Verification sent to ${trimmedEmail}`);
      } else if (nameChanged) {
        ctx.notify('Profile updated');
      }

      setEditing(false);
    } catch (err: any) {
      const code = err.code || err.message || '';
      if (code === 'auth/email-already-in-use') {
        setEditErr('That email is already in use');
      } else if (code === 'auth/invalid-email') {
        setEditErr('Invalid email address');
      } else {
        setEditErr('Failed to update. Please try again.');
        Sentry.captureException(err, { tags: { action: 'save-profile' } });
      }
    }
    setEditBusy(false);
  };

  const isOwner = currentUid === ctx.familyId;

  const handleDeleteFamily = async () => {
    setDeleteErr('');
    const uid = currentUid;
    if (!uid) {
      setDeleteErr('Not signed in');
      return;
    }
    if (!hasPasswordProvider()) {
      setDeleteErr('Please set a password on your account before deleting.');
      return;
    }
    if (!deletePass) {
      setDeleteErr('Enter your password to confirm deletion');
      return;
    }
    setDeleteBusy(true);

    // Reauthenticate before showing overlay so password errors show in the dialog
    try {
      await reauthenticate(deletePass);
    } catch (err: any) {
      const code = err.code || err.message || '';
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        setDeleteErr('Incorrect password');
      } else {
        setDeleteErr('Failed to verify password. Please try again.');
        Sentry.captureException(err, { tags: { action: 'delete-family-reauth' } });
      }
      setDeleteBusy(false);
      return;
    }

    // Close dialog, show full-screen deletion overlay
    setShowDeleteConfirm(false);
    setDeletionInProgress(true);

    // Best-effort photo cleanup (parent is still authenticated)
    try {
      await deleteAllFamilyPhotos(ctx.familyId, true);
    } catch (photoErr) {
      console.warn('Photo cleanup failed (proceeding):', photoErr);
      Sentry.captureException(photoErr, {
        tags: { action: 'delete-family-photos' },
      });
    }

    try {
      // Delete Firestore data, then auth account
      // Auth must come last because Firestore security rules require an active session.
      await deleteFamily(ctx.familyId, uid);

      try {
        await deleteAuthAccount(deletePass);
      } catch (authErr: any) {
        console.error(
          'Family data deleted but auth account removal failed:',
          authErr
        );
        Sentry.captureException(authErr, {
          tags: { action: 'delete-family-auth' },
        });
        setDeletionInProgress(false);
        ctx.notify('Family data deleted, but we couldn\u2019t remove your login. Please sign out and contact support.', 'error');
        setDeleteBusy(false);
        return;
      }
      // Success: auth state listener fires, redirects to sign-in
    } catch (err: any) {
      console.error('Failed to delete family:', err);
      Sentry.captureException(err, { tags: { action: 'delete-family' } });
      setDeletionInProgress(false);
      ctx.notify('Failed to delete account. Please try again.', 'error');
      setDeleteBusy(false);
    }
  };

  const handleLeaveFamily = async () => {
    setDeleteErr('');
    const uid = currentUid;
    if (!uid) {
      setDeleteErr('Not signed in');
      return;
    }
    if (!hasPasswordProvider()) {
      setDeleteErr('Please set a password on your account before leaving.');
      return;
    }
    if (!deletePass) {
      setDeleteErr('Enter your password to confirm');
      return;
    }
    setDeleteBusy(true);

    try {
      await reauthenticate(deletePass);

      // Close dialog, show full-screen overlay
      setShowDeleteConfirm(false);
      setDeletionInProgress(true);

      // Remove own parentMembers doc, then auth account
      // Auth must come last because Firestore security rules require an active session.
      await deleteParentMember(uid);

      try {
        await deleteAuthAccount(deletePass);
      } catch (authErr: any) {
        console.error(
          'Parent member deleted but auth account removal failed:',
          authErr
        );
        Sentry.captureException(authErr, {
          tags: { action: 'leave-family-auth' },
        });
        ctx.notify('Your membership was removed, but we couldn\u2019t delete your login. Please sign out and contact support.', 'error');
        setDeletionInProgress(false);
        setDeleteBusy(false);
        return;
      }
    } catch (err: any) {
      console.error('Failed to leave family:', err);
      Sentry.captureException(err, { tags: { action: 'leave-family' } });
      const code = err.code || err.message || '';
      const errorMsg =
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Incorrect password'
          : 'Failed to leave family. Please try again.';
      if (!showDeleteConfirm) {
        ctx.notify(errorMsg, 'error');
      } else {
        setDeleteErr(errorMsg);
      }
      setDeletionInProgress(false);
      setDeleteBusy(false);
      return;
    }
  };

  return (
    <div>
      {/* Profile Info */}
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-3 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faCircleUser} style={FA_ICON_STYLE} />
          Account
        </div>
        <div className='flex items-center gap-3 mb-3'>
          <div
            className='w-[44px] h-[44px] rounded-full flex items-center justify-center font-display font-bold text-white text-base shrink-0'
            style={{ backgroundColor: '#4AC7A8' }}
          >
            {getInitials(myName, auth.authUser ? auth.authUser.email : '')}
          </div>
          <div className='flex-1 min-w-0'>
            {editing ? (
              <div className='flex flex-col gap-2'>
                <input
                  type='text'
                  placeholder='Your name'
                  value={nameVal}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNameVal(e.target.value);
                    setEditErr('');
                  }}
                  className='quest-input py-1.5! px-2.5! text-sm!'
                  autoFocus
                />
                <input
                  type='email'
                  placeholder='Email address'
                  value={emailVal}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmailVal(e.target.value);
                    setEditErr('');
                  }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' && !editBusy) handleSaveProfile();
                  }}
                  className='quest-input py-1.5! px-2.5! text-sm!'
                />
                {editErr && (
                  <div className='text-qcoral text-[12px]'>{editErr}</div>
                )}
                <div className='flex gap-1.5'>
                  <button
                    onClick={handleSaveProfile}
                    disabled={editBusy}
                    className='bg-qteal text-white rounded-badge px-3 py-1.5 text-[12px] font-bold border-none cursor-pointer font-body disabled:opacity-60'
                  >
                    {editBusy ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditErr('');
                    }}
                    className='bg-qslate-dim text-qslate rounded-badge px-3 py-1.5 text-[12px] font-semibold border-none cursor-pointer font-body'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className='flex items-center gap-1.5'>
                  <span className='text-sm font-bold text-qslate'>
                    {myName || 'Parent'}
                  </span>
                  <span
                    className={
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-badge ' +
                      (currentUid === ctx.familyId
                        ? 'bg-qteal/15 text-qteal'
                        : 'bg-qslate/10 text-qmuted')
                    }
                  >
                    {currentUid === ctx.familyId ? 'Owner' : 'Member'}
                  </span>
                  <button
                    onClick={() => {
                      setNameVal(myName || '');
                      setEmailVal(auth.authUser ? auth.authUser.email : '');
                      setEditErr('');
                      setEditing(true);
                    }}
                    className='bg-transparent border-none cursor-pointer p-0 text-qmuted hover:text-qteal transition-colors'
                    aria-label='Edit profile'
                  >
                    <FontAwesomeIcon
                      icon={faPenToSquare}
                      className='text-[11px]'
                    />
                  </button>
                </div>
                <div className='text-[12px] text-qmuted'>
                  {auth.authUser ? auth.authUser.email : '—'}
                  {auth.authUser && auth.authUser.emailVerified && (
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      className='text-qteal text-[9px] ml-1'
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className='flex justify-between items-center'>
          <span className='text-[13px] text-qmuted'>Family Code</span>
          <button
            onClick={() => {
              if (!cfg || !cfg.familyCode) return;
              copyToClipboard(cfg.familyCode).then(ok => {
                if (ok) {
                  ctx.notify('Copied!');
                } else {
                  ctx.notify('Long-press to copy', 'error');
                }
              });
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

      {/* Email Verification Banner */}
      {auth.authUser && !auth.authUser.emailVerified && (
        <div className='bg-qcoral-dim rounded-card p-4 mb-4'>
          <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
            <FontAwesomeIcon icon={faEnvelope} style={FA_ICON_STYLE} />
            Verify Your Email
          </div>
          <div className='text-[13px] text-qmuted mb-3'>
            Please verify your email address to secure your account. Check your
            inbox for a verification link.
          </div>
          <div className='flex gap-2'>
            <button
              onClick={async () => {
                setVerifyBusy(true);
                const ok = await auth.doSendVerification();
                setVerifyBusy(false);
                if (ok) setVerifySent(true);
              }}
              disabled={verifyBusy || verifySent}
              className='bg-qteal text-white rounded-badge px-4 py-2 font-semibold border-none cursor-pointer font-body text-[13px] disabled:opacity-60'
            >
              {verifySent
                ? 'Email Sent!'
                : verifyBusy
                  ? 'Sending...'
                  : 'Resend Verification'}
            </button>
            <button
              onClick={() => {
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
        {!myPin && (
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
            placeholder={myPin ? 'New PIN' : 'Create PIN'}
            value={newPin}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNewPin(e.target.value);
            }}
            className='quest-input w-[120px]! text-center'
          />
          <button
            onClick={async () => {
              if (newPin.length >= 4) {
                const uid = currentUid;
                if (uid) {
                  try {
                    await saveParentMember(uid, { parentPin: newPin });
                    setMyPin(newPin);
                    setNewPin('');
                    ctx.notify('PIN updated');
                  } catch (_e) {
                    ctx.notify('Failed to save PIN', 'error');
                  }
                }
              }
            }}
            className='bg-qteal text-white rounded-badge px-4 py-2 font-semibold border-none cursor-pointer font-body flex items-center gap-1.5'
          >
            <FontAwesomeIcon icon={faFloppyDisk} />
            Save
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div className='bg-qmint rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
          <FontAwesomeIcon icon={faLock} style={FA_ICON_STYLE} />
          {hasPasswordProvider() ? 'Change Password' : 'Set Password'}
        </div>
        {!hasPasswordProvider() && (
          <div className='text-[13px] text-qmuted mb-2'>
            You signed in with Google. Set a password to also sign in with email
            and password.
          </div>
        )}
        <div className='flex flex-col gap-3'>
          {hasPasswordProvider() && (
            <input
              type='password'
              placeholder='Current password'
              value={curPass}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCurPass(e.target.value);
                setPassErr('');
                setPassSuccess(false);
              }}
              className='quest-input'
            />
          )}
          <input
            type='password'
            placeholder={
              hasPasswordProvider()
                ? 'New password (6+ characters)'
                : 'Password (6+ characters)'
            }
            value={newPass}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNewPass(e.target.value);
              setPassErr('');
              setPassSuccess(false);
            }}
            className='quest-input'
          />
          <input
            type='password'
            placeholder='Confirm password'
            value={confirmPass}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setConfirmPass(e.target.value);
              setPassErr('');
              setPassSuccess(false);
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && !passBusy) {
                if (hasPasswordProvider()) {
                  handleChangePassword();
                } else {
                  handleSetPassword();
                }
              }
            }}
            className='quest-input'
          />
          {passErr && <div className='text-qcoral text-[13px]'>{passErr}</div>}
          {passSuccess && (
            <div className='text-qteal text-[13px]'>
              {hasPasswordProvider()
                ? 'Password updated successfully.'
                : 'Password set! You can now sign in with email and password.'}
            </div>
          )}
          <button
            onClick={() => {
              if (hasPasswordProvider()) {
                handleChangePassword();
              } else {
                handleSetPassword();
              }
            }}
            disabled={passBusy}
            className='bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body disabled:opacity-60'
          >
            {passBusy
              ? 'Updating...'
              : hasPasswordProvider()
                ? 'Update Password'
                : 'Set Password'}
          </button>
        </div>
      </div>

      {/* Reset All Data — owner only */}
      {isOwner && (
        <div className='bg-qyellow rounded-card p-4 mb-4'>
          <div className='font-bold mb-2 text-qslate flex items-center gap-2'>
            <FontAwesomeIcon icon={faRotate} style={FA_ICON_STYLE} />
            Reset All Data
          </div>
          <div className='text-[13px] text-qmuted mb-2'>
            Clears all coins, streaks, and history for all children. Tasks,
            rewards, and children profiles will remain.
          </div>
          <button
            onClick={() => {
              setShowResetConfirm(true);
            }}
            className='bg-qcoral text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
          >
            Reset Everything
          </button>
        </div>
      )}
      {showResetConfirm && (
        <ConfirmDialog
          title='Reset All Data?'
          message='This will permanently erase all coins, streaks, mission history, redemption logs, and uploaded photos for every child. Tasks, rewards, and children profiles will remain.'
          warning='This action cannot be undone.'
          requiredText='RESET'
          confirmLabel='Reset'
          confirmColor='bg-qcoral'
          onConfirm={() => {
            setShowResetConfirm(false);
            ctx.resetAll();
          }}
          onCancel={() => {
            setShowResetConfirm(false);
          }}
        />
      )}

      {/* Delete / Leave Family */}
      <div className='bg-qcoral-dim rounded-card p-4 mb-4'>
        <div className='font-bold mb-2 text-qcoral flex items-center gap-2'>
          <FontAwesomeIcon
            icon={faTrashCan}
            style={
              {
                '--fa-primary-color': '#e05a5a',
                '--fa-secondary-color': '#FF8C94',
                '--fa-secondary-opacity': '1',
              } as any
            }
          />
          {isOwner ? 'Delete Family Account' : 'Leave Family'}
        </div>
        <div className='text-[13px] text-qmuted mb-2'>
          {isOwner
            ? 'Permanently delete your family account, all children, missions, loot, and data. This cannot be undone.'
            : 'Remove yourself from this family. Your login will be deleted. The family and its data will remain for other members.'}
        </div>
        <button
          onClick={() => {
            setShowDeleteConfirm(true);
          }}
          className='bg-qcoral text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          {isOwner ? 'Delete My Family Account' : 'Leave Family'}
        </button>
      </div>
      {showDeleteConfirm && (
        <ConfirmDialog
          title={isOwner ? 'Delete Family Account?' : 'Leave Family?'}
          message={
            isOwner
              ? 'This will permanently delete your entire family account including all children, missions, loot, coins, and data. Your login will be removed and you will not be able to recover any data.'
              : "This will remove your account from this family. You will no longer be able to access this family's data. The family will remain for other members."
          }
          warning={isOwner ? 'THIS ACTION CANNOT BE UNDONE.' : undefined}
          confirmLabel={
            deleteBusy
              ? isOwner
                ? 'Deleting...'
                : 'Leaving...'
              : isOwner
                ? 'Delete'
                : 'Leave'
          }
          confirmColor='bg-qcoral'
          onConfirm={() => {
            if (!deleteBusy) {
              if (isOwner) {
                handleDeleteFamily();
              } else {
                handleLeaveFamily();
              }
            }
          }}
          onCancel={() => {
            if (!deleteBusy) {
              setShowDeleteConfirm(false);
              setDeletePass('');
              setDeleteErr('');
            }
          }}
        >
          {hasPasswordProvider() && (
            <div className='mt-3'>
              <label
                htmlFor='delete-pass'
                className='text-[13px] text-qmuted mb-1.5 block'
              >
                Enter your password to confirm:
              </label>
              <input
                id='delete-pass'
                type='password'
                placeholder='Password'
                value={deletePass}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setDeletePass(e.target.value);
                  setDeleteErr('');
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && !deleteBusy) {
                    if (isOwner) {
                      handleDeleteFamily();
                    } else {
                      handleLeaveFamily();
                    }
                  }
                }}
                className='quest-input'
                autoFocus
              />
            </div>
          )}
          {deleteErr && (
            <div className='text-qcoral text-[13px] mt-2'>{deleteErr}</div>
          )}
        </ConfirmDialog>
      )}
      {deletionInProgress && (
        <div className='fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[600]' role='alert' aria-live='polite' aria-busy='true'>
          <FontAwesomeIcon icon={faSpinner} spin className='text-4xl text-qteal mb-4' />
          <div className='font-display text-xl text-white mb-2'>
            Deleting account...
          </div>
          <div className='text-sm text-white/70'>
            Please don't close the app or switch tabs.
          </div>
        </div>
      )}
    </div>
  );
}
