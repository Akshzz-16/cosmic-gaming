import { useEffect, useState } from 'react';
import { isConfigured } from './lib/firebase';
import { AuthProvider, useAuth } from './lib/auth';
import { useActiveSession, useCafes } from './hooks/useData';
import Layout, { type Tab } from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Sessions from './pages/Sessions';
import SettingsPage from './pages/Settings';

function Spinner({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
        <div className="text-sm">{label}</div>
      </div>
    </div>
  );
}

function Shell() {
  const { user, loading, logOut } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const signedIn = user != null;

  const { cafes } = useCafes(signedIn);
  const [activeCafeId, setActiveCafeId] = useState<string | null>(null);

  useEffect(() => {
    if (cafes.length === 0) {
      setActiveCafeId(null);
      return;
    }
    setActiveCafeId((prev) => (prev && cafes.some((c) => c.id === prev) ? prev : cafes[0].id));
  }, [cafes]);

  const cafe = cafes.find((c) => c.id === activeCafeId) ?? null;
  const active = useActiveSession(signedIn, activeCafeId);

  if (!isConfigured) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-lg rounded-2xl border border-amber-400/30 bg-amber-400/10 p-8">
          <h1 className="text-lg font-bold text-amber-200">Firebase not configured</h1>
          <p className="mt-3 text-sm text-amber-100/80">
            Copy <code>dashboard/.env.example</code> to <code>dashboard/.env</code>, fill in your
            Firebase web app config, then restart the dev server / rebuild.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <Spinner label="Checking session…" />;
  if (!user) return <Login />;

  return (
    <Layout
      cafes={cafes}
      activeCafeId={activeCafeId}
      onCafeChange={setActiveCafeId}
      tab={tab}
      onTabChange={setTab}
      userEmail={user.email ?? user.uid}
      onLogout={() => void logOut()}
    >
      {tab === 'overview' && (
        <Overview enabled={signedIn} cafeId={activeCafeId} cafe={cafe} active={active.session} />
      )}
      {tab === 'sessions' && <Sessions enabled={signedIn} cafeId={activeCafeId} />}
      {tab === 'settings' && <SettingsPage cafe={cafe} cafes={cafes} />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
