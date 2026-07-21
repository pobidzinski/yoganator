import { NavLink, Outlet } from 'react-router-dom';
import { useTrainingStore } from '../features/training/trainingStore';

const NAV_ITEMS = [
  { to: '/poses',    label: 'Ćwiczenia', icon: '🧘' },
  { to: '/plans',    label: 'Plany',     icon: '📋' },
  { to: '/training', label: 'Trening',   icon: '▶️' },
] as const;

export default function Layout() {
  const phase = useTrainingStore((s) => s.phase);
  const isTrainingActive = phase === 'prep' || phase === 'hold';

  return (
    <div className="flex h-svh bg-zinc-950 text-white">

      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-zinc-900 border-r border-zinc-800">
        <div className="px-5 py-5 border-b border-zinc-800">
          <span className="text-lg font-black tracking-tight text-lime-400">Yoganator</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-lime-400'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
                  to === '/training' && isTrainingActive ? 'ring-1 ring-red-500/70' : '',
                ].join(' ')
              }
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Bottom navigation — mobile only */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex justify-around items-center h-16 px-2 z-40">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-lime-400'
                    : 'text-zinc-500 hover:text-zinc-300',
                  to === '/training' && isTrainingActive ? 'ring-1 ring-red-500/70' : '',
                ].join(' ')
              }
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

    </div>
  );
}
