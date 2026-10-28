import { Component, useEffect, useState, type ReactNode } from 'react';

import { db } from '../db';

/** What went wrong opening the app, in words a person can act on. */
export function describeStartupError(error: unknown): { title: string; message: string } {
  const name = (error as { name?: string })?.name ?? '';
  const inner = (error as { inner?: { name?: string } })?.inner?.name ?? '';
  const kind = `${name} ${inner}`;
  if (/Version/i.test(kind)) {
    return { title: 'Paisa was updated', message: 'A newer version is open somewhere else. Reload to use it; your data is safe.' };
  }
  if (/Quota/i.test(kind)) {
    return { title: 'Storage is full', message: 'Free up some space on this device, then try again. Your data hasn’t been touched.' };
  }
  if (/MissingAPI|InvalidState|Security|UnknownError|Open/i.test(kind)) {
    return {
      title: 'Paisa can’t open its storage here',
      message:
        'This usually means a Private Browsing tab, or storage turned off for this site. Open Paisa in a normal tab or from your Home Screen. Your saved data hasn’t been touched.',
    };
  }
  return { title: 'Something went wrong', message: 'Paisa couldn’t start. Your data hasn’t been touched. Try again in a moment.' };
}

function RecoveryScreen({ error }: { error: unknown }) {
  const { title, message } = describeStartupError(error);
  return (
    <main role="alert" className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center px-8 text-center">
      <span className="text-5xl" aria-hidden>
        🛟
      </span>
      <h1 className="mt-4 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-zinc-500">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 h-12 w-full rounded-2xl bg-emerald-500 font-semibold text-white"
      >
        Try again
      </button>
    </main>
  );
}

/** Catches a render-time failure (e.g. a database read that throws) and shows a way out instead of a blank screen. */
class Boundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error ? <RecoveryScreen error={this.state.error} /> : this.props.children;
  }
}

/** Opens the database first, so a blocked or full storage gets a clear screen instead of a broken app. */
export function StartupGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'opening' | 'ready' | { error: unknown }>('opening');
  useEffect(() => {
    db.open().then(
      () => setState('ready'),
      (error: unknown) => setState({ error }),
    );
  }, []);
  if (state === 'opening') return null;
  if (state !== 'ready') return <RecoveryScreen error={state.error} />;
  return <Boundary>{children}</Boundary>;
}
