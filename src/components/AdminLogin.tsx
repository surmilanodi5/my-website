import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, KeyRound, Lock, Mail } from 'lucide-react';
import {
  adminLogin,
  confirmAdminPasswordReset,
  fetchAdminSession,
  requestAdminPasswordReset,
} from '../lib/api.ts';
import { NeedleMark } from './AtelierMarks.tsx';

interface AdminLoginProps {
  onNavigate: (path: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<'login' | 'forgot-req' | 'forgot-confirm'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Studio Admin Access';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    fetchAdminSession()
      .then((res) => {
        if (res.authenticated) {
          onNavigate('/studio-admin');
        }
      })
      .catch(() => {
        // stay on login
      });

    return () => {
      document.head.removeChild(meta);
    };
  }, [onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminLogin(username, password);
      onNavigate('/studio-admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await requestAdminPasswordReset(resetEmail);
      setInfoMsg(res.message);
      setMode('forgot-confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await confirmAdminPasswordReset({
        email: resetEmail,
        code: resetCode,
        newPassword,
      });
      setInfoMsg(res.message);
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F7FB] px-6 py-12 text-slate-900 dark:bg-[#060D1E] dark:text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10 dark:border-cyan-500/20 dark:bg-[#0B172E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-cyan-700 dark:text-cyan-300">
            <NeedleMark className="h-5 w-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">Studio Admin</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Public site</span>
          </button>
        </div>

        {mode === 'login' && (
          <>
            <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight">
              Administrator Sign In
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Sign in with your server-configured admin email or username.
            </p>

            {infoMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="studio-username" className="block text-xs font-semibold">
                  Admin Email or Username
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="studio-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="studio-password" className="block text-xs font-semibold">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoMsg(null);
                      setMode('forgot-req');
                    }}
                    className="text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="studio-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-60 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
              >
                <span>{loading ? 'Signing in...' : 'Secure Login'}</span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </>
        )}

        {mode === 'forgot-req' && (
          <>
            <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight">
              Admin Recovery
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Enter your configured admin email to issue a temporary reset verification code.
            </p>
            <form onSubmit={handleForgotRequest} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold">Admin Email</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                />
              </div>
              {error && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-[#060D1E]"
              >
                <KeyRound className="h-4 w-4" />
                <span>Send Reset Code</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400"
              >
                Back to sign in
              </button>
            </form>
          </>
        )}

        {mode === 'forgot-confirm' && (
          <>
            <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight">
              Set New Password
            </h1>
            {infoMsg && (
              <p className="mt-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-800 dark:text-cyan-200">
                {infoMsg}
              </p>
            )}
            <form onSubmit={handleForgotConfirm} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold">Verification Code</label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 font-mono text-sm uppercase dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                />
              </div>
              {error && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-[#060D1E]"
              >
                <span>Update Password</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400"
              >
                Back to sign in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
