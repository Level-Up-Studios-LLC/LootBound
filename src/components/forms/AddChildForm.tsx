import React from 'react';
import { AVATARS, COLORS } from '../../constants.ts';
import type { AddChildFormData } from '../../types.ts';

interface AddChildFormProps {
  form: AddChildFormData;
  onChange: (form: AddChildFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function AddChildForm(
  props: AddChildFormProps
): React.ReactElement {
  const f = props.form;
  return (
    <div className='flex flex-col gap-4'>
      <div>
        <label className='text-qslate font-semibold mb-1 block'>Name</label>
        <input
          value={f.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            props.onChange({ ...f, name: e.target.value });
          }}
          className='quest-input'
          placeholder="Child's name"
        />
      </div>
      <div>
        <label className='text-qslate font-semibold mb-1 block'>Age</label>
        <input
          type='number'
          value={f.age}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            props.onChange({ ...f, age: e.target.value });
          }}
          className='quest-input'
          placeholder='Age'
          min={1}
          max={18}
        />
      </div>
      <div>
        <label className='text-qslate font-semibold mb-1 block'>Avatar</label>
        <div className='flex gap-1 flex-wrap'>
          {AVATARS.map(a => {
            return (
              <button
                key={a}
                onClick={() => {
                  props.onChange({ ...f, avatar: a });
                }}
                className={
                  'text-2xl rounded-badge px-1.5 py-1 cursor-pointer border-none ' +
                  (f.avatar === a ? 'bg-qmint' : 'bg-transparent')
                }
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className='text-qslate font-semibold mb-2 block'>Color</label>
        <div className='flex gap-2 flex-wrap'>
          {COLORS.map(cl => {
            return (
              <button
                key={cl}
                onClick={() => {
                  props.onChange({ ...f, color: cl });
                }}
                className='w-7 h-7 rounded-full cursor-pointer border-none'
                style={{
                  background: cl,
                  boxShadow:
                    f.color === cl ? `0 0 0 3px #fff, 0 0 0 5px ${cl}` : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
      <div className='flex gap-3 justify-end mt-3'>
        <button
          onClick={props.onCancel}
          className='bg-qslate-dim text-qslate rounded-badge px-5 py-2.5 font-semibold border-none cursor-pointer font-body'
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (f.name && f.age) props.onSave();
          }}
          className='bg-qteal text-white rounded-badge px-5 py-2.5 font-bold border-none cursor-pointer font-body'
        >
          Add
        </button>
      </div>
    </div>
  );
}
