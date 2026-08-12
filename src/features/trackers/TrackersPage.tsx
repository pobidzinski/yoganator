import { Link } from 'react-router-dom';

const TRACKERS = [
  { to: '/retention', label: 'Retencja', description: 'Licznik dni i faza cyklu', icon: '🔥' },
  { to: '/calendar', label: 'Kalendarz', description: 'Historia i podsumowanie treningów', icon: '📅' },
  { to: '/kegel', label: 'Kegel', description: 'Trening mięśni dna miednicy', icon: '💪' },
] as const;

export default function TrackersPage() {
  return (
    <div className="flex flex-col gap-5 p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-heading font-semibold text-ink tracking-tight pt-2">Trackery</h1>

      <div className="grid grid-cols-2 gap-3">
        {TRACKERS.map(({ to, label, description, icon }) => (
          <Link
            key={to}
            to={to}
            className="bg-surface border border-border rounded-2xl px-4 py-5 flex flex-col items-start gap-2 hover:bg-surface-hover transition-colors"
          >
            <span className="text-3xl">{icon}</span>
            <span className="text-base font-heading font-semibold text-ink">{label}</span>
            <span className="text-xs text-ink-muted leading-relaxed">{description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
