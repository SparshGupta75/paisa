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

export function Empty({ emoji, title, message }: { emoji: string; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <span className="text-5xl" aria-hidden>
        {emoji}
      </span>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{message}</p>
    </div>
  );
}
