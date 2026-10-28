import type { ReactNode } from 'react';

export function Screen({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-32">
      <header className="mb-4 flex items-end justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {action}
      </header>
      {children}
    </main>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 ${className}`}>{children}</section>;
}

/** An empty state that says what to do next, with buttons for it when there are any. */
export function Empty({
  emoji,
  title,
  message,
  actions = [],
}: {
  emoji: string;
  title: string;
  message: string;
  actions?: { label: string; onPress: () => void; primary?: boolean }[];
}) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <span className="text-5xl" aria-hidden>
        {emoji}
      </span>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{message}</p>
      {actions.length ? (
        <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onPress}
              className={`h-11 rounded-xl font-semibold ${
                action.primary ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
