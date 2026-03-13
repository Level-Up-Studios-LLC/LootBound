import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAppContext } from '../context/AppContext.tsx';

interface NavTab {
  id: string;
  icon: string;
  label: string;
}

interface BNavProps {
  tabs: NavTab[];
}

export default function BNav(p: BNavProps) {
  var ctx = useAppContext();
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex justify-around bg-white py-2 pb-3 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      {p.tabs.map(function (t) {
        var isActive = ctx.screen === t.id;
        return (
          <button
            key={t.id}
            onClick={function () {
              ctx.setScreen(t.id);
            }}
            className={
              'flex flex-col items-center gap-1 bg-transparent px-3 py-2 rounded-badge border-none cursor-pointer font-body transition-colors ' +
              (isActive ? 'text-qteal' : 'text-qslate hover:text-qteal')
            }
          >
            <FontAwesomeIcon icon={['fas', t.icon] as any} className="text-lg" />
            <span className="text-[11px] font-semibold">{t.label}</span>
          </button>
        );
      })}
      <button
        onClick={function () {
          if (ctx.onLogout) {
            ctx.onLogout();
          } else {
            ctx.setCurUser(null);
            ctx.setScreen('login');
          }
        }}
        className="flex flex-col items-center gap-1 bg-transparent text-qslate hover:text-qteal px-3 py-2 rounded-badge border-none cursor-pointer font-body transition-colors"
      >
        <FontAwesomeIcon icon={['fas', 'door-open'] as any} className="text-lg" />
        <span className="text-[11px] font-semibold">Logout</span>
      </button>
    </div>
  );
}
