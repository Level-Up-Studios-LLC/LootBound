import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
}

interface HamburgerMenuProps {
  items: MenuItem[];
}

export default function HamburgerMenu(p: HamburgerMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex flex-col items-center justify-center w-10 h-10 bg-transparent border-none cursor-pointer p-0"
        aria-label="Menu"
      >
        <FontAwesomeIcon icon={['fas', 'ellipsis-vertical'] as any} className="text-qslate text-xl" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[200]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-card shadow-lg z-[201] min-w-[180px] py-2 animate-fade-in">
            {p.items.map((item) => {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-none cursor-pointer font-body text-sm text-qslate hover:bg-qmint transition-colors"
                >
                  <FontAwesomeIcon icon={['fas', item.icon] as any} className="text-base w-5 text-center" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
