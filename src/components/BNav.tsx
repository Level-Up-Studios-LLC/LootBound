import { useAppContext } from '../context/AppContext.tsx';
import IconBadge from './IconBadge.tsx';

interface NavTab {
  id: string;
  icon: string;
  label: string;
}

interface BNavProps {
  tabs: NavTab[];
}

export default function BNav(p: BNavProps) {
  const ctx = useAppContext();

  // Count incomplete + redo missions for the current kid
  let missionBadge = 0;
  if (ctx.curUser && ctx.curUser !== 'parent') {
    const total = ctx.activeTasks.length;
    let done = 0;
    ctx.activeTasks.forEach(t => {
      const entry = ctx.tLog[t.id];
      if (entry && !entry.rejected) done++;
    });
    missionBadge = total - done;
  }

  return (
    <div className='fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex justify-around bg-white py-2 pb-[calc(12px+env(safe-area-inset-bottom))] z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]'>
      {p.tabs.map(t => {
        const isActive = ctx.screen === t.id;
        const badge = t.id === 'tasks' ? missionBadge : 0;
        return (
          <button
            key={t.id}
            onClick={() => {
              ctx.navigate(t.id);
            }}
            aria-current={isActive ? 'page' : undefined}
            className={
              'flex flex-col items-center gap-1 bg-transparent px-3 py-2 rounded-badge border-none cursor-pointer font-body transition-colors ' +
              (isActive ? 'text-qteal' : 'text-qslate hover:text-qteal')
            }
          >
            <IconBadge icon={t.icon} badge={badge} />
            <span className='text-xs font-semibold'>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
