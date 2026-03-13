import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  bgColor?: string;
}

export default function Modal(props: ModalProps): React.ReactElement {
  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-5'>
      <div
        className={
          (props.bgColor || 'bg-qyellow') +
          ' rounded-card p-6 w-full max-w-[380px] max-h-[85vh] overflow-y-auto shadow-lg'
        }
      >
        <div className='font-display text-xl font-bold mb-4 text-qslate'>
          {props.title}
        </div>
        {props.children}
      </div>
    </div>
  );
}
