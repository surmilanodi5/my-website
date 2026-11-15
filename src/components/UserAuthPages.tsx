import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, KeyRound, Lock, Mail, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext.tsx';
import {
  confirmUserPasswordReset,
  loginUserAccount,
  registerUserAccount,
  requestUserPasswordReset,
} from '../lib/api.ts';
import { NeedleMark } from './AtelierMarks.tsx';

interface UserAuthPagesProps {
  mode: 'login' | 'register' | 'forgot';
  onNavigate: (path: string) => void;
}

export const UserAuthPages: React.FC<UserAuthPagesProps> = ({ mode, onNavigate }) => {
  const { t } = useTranslation();
  const { user, setUser, refreshUserSession } = useSettings();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && (mode === 'login' || mode === 'register')) {
      onNavigate('/dashboard');
    }
  }, [user, mode, onNavigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginUserAccount({ email, password, rememberMe });
      setUser(res.user);
      await refreshUserSession();
      onNavigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch'));
      return;
    }
    setLoading(true);
    try {
      const res = await registerUserAccount({ fullName, email, password, confirmPassword });
      setUser(res.user);
      await refreshUserSession();
      onNavigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
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
      const res = await requestUserPasswordReset(email);
      setInfoMsg(res.message);
      setResetStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request reset code.');
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
      const res = await confirmUserPasswordReset({ email, code: resetCode, newPassword });
      setInfoMsg(res.message);
      window.setTimeout(() => onNavigate('/login'), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F7FB] px-5 py-12 text-slate-900 dark:bg-[#060D1E] dark:text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-cyan-500/20 dark:bg-[#0B172E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
            <NeedleMark className="h-5 w-5" />
            <span className="font-serif text-lg font-semibold">{t('brand.short')}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t('auth.backToPortfolio')}</span>
          </button>
        </div>

        <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tight">
          {mode === 'login'
            ? t('auth.loginTitle')
            : mode === 'register'
              ? t('auth.registerTitle')
              : t('auth.forgotTitle')}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {mode === 'login'
            ? t('auth.loginSubtitle')
            : mode === 'register'
              ? t('auth.registerSubtitle')
              : t('auth.forgotSubtitle')}
        </p>

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="user-email" className="block text-xs font-semibold">
                {t('auth.email')}
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="user-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="user-password" className="block text-xs font-semibold">
                {t('auth.password')}
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="user-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-cyan-500"
                />
                <span>{t('auth.rememberMe')}</span>
              </label>
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
              >
                {t('auth.forgotLink')}
              </button>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-60 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
            >
              <span>{loading ? t('auth.signingIn') : t('auth.signIn')}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            <p className="pt-2 text-center text-xs text-slate-600 dark:text-slate-400">
              {t('auth.noAccount')}{' '}
              <button
                type="button"
                onClick={() => onNavigate('/register')}
                className="font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
              >
                {t('auth.signUp')}
              </button>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold">
                {t('auth.fullName')}
              </label>
              <input
                id="reg-name"
                type="text"
                required
                minLength={2}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold">
                {t('auth.email')}
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold">
                {t('auth.password')}
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-semibold">
                {t('auth.confirmPassword')}
              </label>
              <input
                id="reg-confirm"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-60 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
            >
              <UserPlus className="h-4 w-4" />
              <span>{loading ? t('auth.creatingAccount') : t('auth.signUp')}</span>
            </button>

            <p className="pt-2 text-center text-xs text-slate-600 dark:text-slate-400">
              {t('auth.haveAccount')}{' '}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
              >
                {t('auth.signIn')}
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <div className="mt-6 space-y-4">
            {resetStep === 'request' ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold">
                    {t('auth.email')}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-300">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-[#060D1E]"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{t('auth.sendResetCode')}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotConfirm} className="space-y-4">
                {infoMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-800 dark:text-cyan-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{infoMsg}</span>
                  </div>
                )}
                <div>
                  <label htmlFor="reset-code" className="block text-xs font-semibold">
                    {t('auth.resetTokenLabel')}
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 font-mono text-sm uppercase focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="reset-new-pw" className="block text-xs font-semibold">
                    {t('auth.newPasswordLabel')}
                  </label>
                  <input
                    id="reset-new-pw"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-white"
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-600 dark:text-rose-300">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-[#060D1E]"
                >
                  <span>{t('auth.confirmResetBtn')}</span>
                </button>
              </form>
            )}

            <p className="pt-2 text-center text-xs">
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
              >
                {t('auth.signIn')}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
