interface SplashProps {
  label: string;
}

export function Splash({ label }: SplashProps) {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
        <div className="text-sm">{label}</div>
      </div>
    </div>
  );
}

export function SetupScreen() {
  return (
    <div className="grid h-full place-items-center px-8">
      <div className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-xl font-bold text-white">Firebase not configured</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Copy <code className="rounded bg-black/40 px-1.5 py-0.5">desktop/.env.example</code> to{' '}
          <code className="rounded bg-black/40 px-1.5 py-0.5">desktop/.env</code> and fill in your
          Firebase project config (Firebase console → Project settings → Your apps → Web app), then
          restart the app.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-400">
          <li>Enable Anonymous sign-in (Authentication → Sign-in method)</li>
          <li>Create Firestore (Firestore Database → Create database)</li>
          <li>Deploy the security rules from firestore.rules</li>
        </ul>
      </div>
    </div>
  );
}

interface AuthErrorProps {
  message: string | null;
  onRetry: () => void;
}

export function AuthErrorScreen({ message, onRetry }: AuthErrorProps) {
  return (
    <div className="grid h-full place-items-center px-8">
      <div className="max-w-xl rounded-2xl border border-amber-400/30 bg-amber-400/10 p-8 text-center">
        <h1 className="text-xl font-bold text-amber-200">Cannot reach the cloud</h1>
        <p className="mt-3 text-sm text-amber-100/80">
          {message ?? 'Check the internet connection on this machine and try again.'}
        </p>
        <button
          onClick={onRetry}
          className="mt-5 rounded-xl bg-amber-400 px-6 py-2.5 font-semibold text-amber-950 transition hover:bg-amber-300"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
