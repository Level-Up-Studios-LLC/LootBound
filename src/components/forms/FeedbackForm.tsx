import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faSpinner,
  faBug,
  faLightbulb,
  faComments,
} from '../../fa.ts';
import { FA_ICON_STYLE } from '../../constants.ts';
import { submitFeedback } from '../../services/feedback.ts';
import Modal from '../ui/Modal.tsx';

interface FeedbackFormProps {
  familyId: string;
  userRole: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

var CATEGORIES = [
  { id: 'bug', label: 'Bug', icon: faBug },
  { id: 'feature', label: 'Feature', icon: faLightbulb },
  { id: 'general', label: 'General', icon: faComments },
];

export default function FeedbackForm(
  props: FeedbackFormProps
): React.ReactElement {
  var _category = useState('general'),
    category = _category[0],
    setCategory = _category[1];
  var _message = useState(''),
    message = _message[0],
    setMessage = _message[1];
  var _submitting = useState(false),
    submitting = _submitting[0],
    setSubmitting = _submitting[1];
  var _error = useState<string | null>(null),
    error = _error[0],
    setError = _error[1];

  async function handleSubmit() {
    if (message.trim().length < 10) {
      setError('Please write at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback({
        familyId: props.familyId,
        userRole: props.userRole,
        userName: props.userName,
        category: category,
        message: message.trim(),
      });
      props.onSuccess();
    } catch (err) {
      setError('Failed to send feedback. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Modal title='Send Feedback'>
      <div className='mb-4'>
        <div className='text-qslate font-semibold mb-1'>Category</div>
        <div className='flex gap-2'>
          {CATEGORIES.map(function (cat) {
            var isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                aria-pressed={isActive}
                onClick={function () {
                  setCategory(cat.id);
                }}
                className={
                  (isActive
                    ? 'bg-qteal text-white'
                    : 'bg-qmint-dim text-qslate') +
                  ' rounded-badge px-4 py-2 font-semibold text-sm border-none cursor-pointer font-body flex items-center gap-1.5 transition-colors'
                }
              >
                <FontAwesomeIcon
                  icon={cat.icon}
                  style={isActive ? undefined : FA_ICON_STYLE}
                />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className='mb-4'>
        <label htmlFor='fb-message' className='text-qslate font-semibold mb-1 block'>Message</label>
        <textarea
          id='fb-message'
          value={message}
          onChange={function (e: React.ChangeEvent<HTMLTextAreaElement>) {
            setMessage(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Tell us what's on your mind..."
          rows={4}
          maxLength={1000}
          className='quest-input w-full resize-none'
        />
        <div className='text-[11px] text-qmuted text-right mt-1'>
          {message.length}/1000
        </div>
      </div>
      {error && <div className='text-qcoral text-[13px] mb-3'>{error}</div>}
      <div className='flex gap-3 justify-end'>
        <button
          onClick={props.onClose}
          disabled={submitting}
          className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || message.trim().length < 10}
          className='bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body flex items-center gap-1.5 disabled:opacity-60'
        >
          <FontAwesomeIcon
            icon={submitting ? faSpinner : faPaperPlane}
            spin={submitting}
          />
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </div>
    </Modal>
  );
}
