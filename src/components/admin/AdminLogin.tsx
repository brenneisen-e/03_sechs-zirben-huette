'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Anmeldemaske des Admin Centers (Passwort). Prüfung serverseitig in
// /api/admin/auth; alle anderen Admin-APIs verlangen danach die Session.

export default function AdminLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((r) => r.json() as Promise<{ setupRequired?: boolean }>)
      .then((data) => setSetupRequired(!!data.setupRequired))
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password: password.trim() }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        onAuthenticated();
      } else {
        setError(data.error || 'Anmeldung fehlgeschlagen');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <p className="text-[10px] font-bold uppercase text-gray-500">
          Sechszirbenhütte · Admin Center
        </p>
        <h1 className="mt-2 mb-6 text-3xl font-bold text-gray-900">Anmelden</h1>

        {setupRequired && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
            <p className="text-sm font-semibold mb-1">Noch kein Admin-Passwort hinterlegt</p>
            <p className="text-xs leading-relaxed">
              Entweder als Cloudflare-Secret{' '}
              <code className="bg-white/70 rounded px-1 font-mono">ADMIN_PASSWORD</code> anlegen
              (greift ab dem nächsten Deployment) — oder ohne Deployment direkt in die Datenbank:
              <code className="block mt-1 bg-white/70 rounded px-2 py-1 font-mono text-[11px]">
                npm run set-admin-password
              </code>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
