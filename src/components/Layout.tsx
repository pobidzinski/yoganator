import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTrainingStore } from '../features/training/trainingStore';

const NAV_ITEMS = [
  { to: '/poses',    label: 'Ćwiczenia', icon: '🧘' },
  { to: '/plans',    label: 'Plany',     icon: '📋' },
  { to: '/training', label: 'Trening',   icon: '▶️' },
  { to: '/trackers', label: 'Trackery',  icon: '📊' },
] as const;

const TRACKER_PATHS = ['/trackers', '/retention', '/calendar', '/kegel', '/weight'];

export default function Layout() {
  const phase = useTrainingStore((s) => s.phase);
  const isTrainingActive = phase === 'prep' || phase === 'hold';
  const location = useLocation();

  return (
    <div className="flex h-svh bg-bg text-ink">

      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-surface border-r border-border">
        <div className="px-5 py-5 border-b border-border">
          <span className="text-lg font-heading font-semibold tracking-tight text-accent">Yoganator</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {NAV_ITEMS.map(({ to, label, icon }) => {
            const isActive = to === '/trackers'
              ? TRACKER_PATHS.includes(location.pathname)
              : location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-hover text-accent'
                    : 'text-ink-muted hover:bg-surface-hover/60 hover:text-ink',
                  to === '/training' && isTrainingActive ? 'ring-1 ring-danger/70' : '',
                ].join(' ')}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Bottom navigation — mobile only */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur border-t border-border flex justify-around items-center h-16 px-2 z-40">
          {NAV_ITEMS.map(({ to, label, icon }) => {
            const isActive = to === '/trackers'
              ? TRACKER_PATHS.includes(location.pathname)
              : location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={[
                  'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 transition-colors',
                  isActive
                    ? 'bg-surface-hover text-accent'
                    : 'text-ink-muted hover:text-ink',
                  to === '/training' && isTrainingActive ? 'ring-1 ring-danger/70' : '',
                ].join(' ')}
              >
                <span className="text-lg leading-none">{icon}</span>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
