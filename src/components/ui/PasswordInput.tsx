import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '../../fa';

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

export default function PasswordInput(props: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const { className, ...rest } = props;

  return (
    <div className='relative'>
      <input
        type={show ? 'text' : 'password'}
        className={`${className ?? ''} pr-10`}
        {...rest}
      />
      <button
        type='button'
        onClick={() => setShow(v => !v)}
        className='absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-qdim p-0'
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <FontAwesomeIcon icon={show ? faEyeSlash : faEye} className='text-sm' />
      </button>
    </div>
  );
}
