import React, { useEffect, useState } from 'react';
import {
  Accessibility,
  Bell,
  Check,
  Globe,
  KeyRound,
  Moon,
  Palette,
  RotateCcw,
  Shield,
  Sliders,
  Sun,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext.tsx';
import { changeUserPassword } from '../lib/api.ts';
import type { AccentPreset } from '../types/portfolio.ts';

interface SettingsDrawerProps {
  onNavigate: (path: string) => void;
  enabledLanguages?: Array<'en' | 'bn'>;
}

type SettingsTab = 'appearance' | 'account' | 'preferences' | 'accessibility';

const ACCENT_OPTIONS: Array<{ id: AccentPreset; swatch: string }> = [
  { id: 'cyan', swatch: '#22D3EE' },
  { id: 'sky', swatch: '#38BDF8' },
  { id: 'emerald', swatch: '#34D399' },
  { id: 'teal', swatch: '#2DD4BF' },
];

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  onNavigate,
  enabledLanguages = ['en', 'bn'],
}) => {
  const { t } = useTranslation();
  const {
    preferences,
    user,
    settingsOpen,
    setSettingsOpen,
    updatePreferences,
    setLanguage,
    resetToDefaults,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pwForm, setPwForm] = useState({ current: '', next: '' });
  const [pwState, setPwState] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, setSettingsOpen]);

  const handleReset = () => {
    resetToDefaults();
    setStatusMsg(t('settings.resetConfirm'));
    window.setTimeout(() => setStatusMsg(null), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwState(null);
    setPwSaving(true);
    try {
      const res = await changeUserPassword(pwForm.current, pwForm.next);
      setPwState({ type: 'ok', text: res.message });
      setPwForm({ current: '', next: '' });
    } catch (err) {
      setPwState({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to update password.',
      });
    } finally {
      setPwSaving(false);
    }
  };

  const ToggleRow: React.FC<{
    label: string;
    checked: boolean;
    onChange: (val: boolean) => void;
  }> = ({ label, checked, onChange }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 transition-colors hover:border-cyan-500/40 dark:border-cyan-500/15 dark:bg-[#0B172E]/80">
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-cyan-500 dark:bg-cyan-400' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform dark:bg-[#060D1E] ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );

  return (
    <AnimatePresence>
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={t('settings.title')}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 bg-[#020612]/70 backdrop-blur-xs"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-[#F4F7FB] text-slate-900 shadow-2xl dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-slate-100"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-cyan-500/15 dark:bg-[#0B172E]">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                  <Sliders className="h-3.5 w-3.5" />
                  <span>{user ? t('settings.syncedAccount') : t('settings.savedLocally')}</span>
                </div>
                <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight">
                  {t('settings.title')}
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {t('settings.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:border-cyan-500 hover:text-cyan-700 dark:border-cyan-500/20 dark:bg-[#112240] dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1.5 border-b border-slate-200 bg-white/70 p-2.5 dark:border-cyan-500/15 dark:bg-[#0B172E]/60">
              {[
                { id: 'appearance' as const, icon: Palette, label: t('settings.tabs.appearance') },
                { id: 'account' as const, icon: User, label: t('settings.tabs.account') },
                { id: 'preferences' as const, icon: Bell, label: t('settings.tabs.preferences') },
                { id: 'accessibility' as const, icon: Accessibility, label: t('settings.tabs.accessibility') },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-[#060D1E]'
                        : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-[#112240]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate w-full text-center">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {statusMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-xs font-medium text-cyan-800 dark:text-cyan-300">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              {activeTab === 'appearance' && (
                <>
                  {/* 1. Language Preferences */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                      <Globe className="h-3.5 w-3.5" />
                      <span>{t('settings.languageLabel')}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('settings.languageDesc')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {enabledLanguages.includes('en') && (
                        <button
                          type="button"
                          onClick={() => setLanguage('en')}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            preferences.language === 'en'
                              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-400/15 dark:text-cyan-200'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-400/50 dark:border-cyan-500/15 dark:bg-[#0B172E] dark:text-slate-300'
                          }`}
                        >
                          <span>English (EN)</span>
                          {preferences.language === 'en' && <Check className="h-4 w-4" />}
                        </button>
                      )}
                      {enabledLanguages.includes('bn') && (
                        <button
                          type="button"
                          onClick={() => setLanguage('bn')}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            preferences.language === 'bn'
                              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-400/15 dark:text-cyan-200'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-400/50 dark:border-cyan-500/15 dark:bg-[#0B172E] dark:text-slate-300'
                          }`}
                        >
                          <span>বাংলা (BN)</span>
                          {preferences.language === 'bn' && <Check className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </section>

                  {/* 2. Dark / Light Mode */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                      <Moon className="h-3.5 w-3.5" />
                      <span>{t('settings.modeLabel')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => updatePreferences({ themeMode: 'dark' })}
                        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          preferences.themeMode === 'dark'
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-400/15 dark:text-cyan-200'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-cyan-500/15 dark:bg-[#0B172E] dark:text-slate-300'
                        }`}
                      >
                        <Moon className="h-4 w-4" />
                        <span>{t('settings.modeDark')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePreferences({ themeMode: 'light' })}
                        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          preferences.themeMode === 'light'
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-400/15 dark:text-cyan-200'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-cyan-500/15 dark:bg-[#0B172E] dark:text-slate-300'
                        }`}
                      >
                        <Sun className="h-4 w-4" />
                        <span>{t('settings.modeLight')}</span>
                      </button>
                    </div>
                  </section>

                  {/* 3. Theme Customization */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                      <Palette className="h-3.5 w-3.5" />
                      <span>{t('settings.accentLabel')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {ACCENT_OPTIONS.map((opt) => {
                        const active = preferences.accent === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updatePreferences({ accent: opt.id })}
                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                              active
                                ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:border-cyan-400 dark:bg-cyan-400/15 dark:text-white'
                                : 'border-slate-200 bg-white text-slate-700 dark:border-cyan-500/15 dark:bg-[#0B172E] dark:text-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                className="h-4 w-4 rounded-full border border-white/30"
                                style={{ backgroundColor: opt.swatch }}
                              />
                              <span>{t(`settings.accents.${opt.id}`)}</span>
                            </span>
                            {active && <Check className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />}
                          </button>
                        );
                      })}
                    </div>

                    <ToggleRow
                      label={t('settings.compactCards')}
                      checked={preferences.compactCards}
                      onChange={(val) => updatePreferences({ compactCards: val })}
                    />
                  </section>
                </>
              )}

              {activeTab === 'account' && (
                <>
                  {/* 4. Profile Settings */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                      <User className="h-3.5 w-3.5" />
                      <span>{t('settings.profileSection')}</span>
                    </div>
                    {user ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-cyan-500/20 dark:bg-[#0B172E]">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.fullName}
                              referrerPolicy="no-referrer"
                              className="h-12 w-12 rounded-full border border-cyan-400/40 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                              {user.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{user.fullName}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                          {t('settings.profileHint')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsOpen(false);
                            onNavigate('/dashboard');
                          }}
                          className="mt-4 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
                        >
                          {t('settings.openDashboard')}
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-cyan-500/20 dark:bg-[#0B172E]">
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {t('settings.signInPrompt')}
                        </p>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSettingsOpen(false);
                              onNavigate('/login');
                            }}
                            className="flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
                          >
                            {t('settings.signInBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSettingsOpen(false);
                              onNavigate('/register');
                            }}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-500 dark:border-cyan-500/30 dark:text-cyan-300"
                          >
                            {t('settings.registerBtn')}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* 8. Change Password */}
                  {user && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>{t('settings.passwordLabel')}</span>
                      </div>
                      <form onSubmit={handlePasswordChange} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-cyan-500/20 dark:bg-[#0B172E]">
                        <input
                          type="password"
                          required
                          placeholder={t('settings.currentPassword')}
                          value={pwForm.current}
                          onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-slate-100"
                        />
                        <input
                          type="password"
                          required
                          minLength={8}
                          placeholder={t('settings.newPassword')}
                          value={pwForm.next}
                          onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-cyan-500/20 dark:bg-[#060D1E] dark:text-slate-100"
                        />
                        {pwState && (
                          <p
                            className={`text-xs font-medium ${
                              pwState.type === 'ok'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {pwState.text}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={pwSaving}
                          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-[#112240] dark:text-cyan-300 dark:hover:bg-cyan-400/20"
                        >
                          {t('settings.updatePasswordBtn')}
                        </button>
                      </form>
                    </section>
                  )}

                  {/* 9. Account Preferences */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                      <Sliders className="h-3.5 w-3.5" />
                      <span>{t('settings.accountPrefsLabel')}</span>
                    </div>
                    <ToggleRow
                      label={t('settings.rememberLanguage')}
                      checked={preferences.rememberLanguage}
                      onChange={(val) => updatePreferences({ rememberLanguage: val })}
                    />
                  </section>
                </>
              )}

              {activeTab === 'preferences' && (
                <>
                  {/* 5. Notification Preferences */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                      <Bell className="h-3.5 w-3.5" />
                      <span>{t('settings.notificationsLabel')}</span>
                    </div>
                    <div className="space-y-2.5">
                      <ToggleRow
                        label={t('settings.notifyEmailReplies')}
                        checked={preferences.notifications.emailReplies}
                        onChange={(val) =>
                          updatePreferences({
                            notifications: { ...preferences.notifications, emailReplies: val },
                          })
                        }
                      />
                      <ToggleRow
                        label={t('settings.notifyNewProjects')}
                        checked={preferences.notifications.newProjects}
                        onChange={(val) =>
                          updatePreferences({
                            notifications: { ...preferences.notifications, newProjects: val },
                          })
                        }
                      />
                      <ToggleRow
                        label={t('settings.notifySecurityAlerts')}
                        checked={preferences.notifications.securityAlerts}
                        onChange={(val) =>
                          updatePreferences({
                            notifications: { ...preferences.notifications, securityAlerts: val },
                          })
                        }
                      />
                    </div>
                  </section>

                  {/* 6. Privacy Settings */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                      <Shield className="h-3.5 w-3.5" />
                      <span>{t('settings.privacyLabel')}</span>
                    </div>
                    <div className="space-y-2.5">
                      <ToggleRow
                        label={t('settings.privacyShowProfile')}
                        checked={preferences.privacy.showProfileInNav}
                        onChange={(val) =>
                          updatePreferences({
                            privacy: { ...preferences.privacy, showProfileInNav: val },
                          })
                        }
                      />
                      <ToggleRow
                        label={t('settings.privacyAnalytics')}
                        checked={preferences.privacy.allowAnalytics}
                        onChange={(val) =>
                          updatePreferences({
                            privacy: { ...preferences.privacy, allowAnalytics: val },
                          })
                        }
                      />
                    </div>
                  </section>
                </>
              )}

              {activeTab === 'accessibility' && (
                /* 7. Accessibility Settings */
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-cyan-300/80">
                    <Accessibility className="h-3.5 w-3.5" />
                    <span>{t('settings.accessibilityLabel')}</span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t('settings.fontSizeLabel')}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['sm', 'md', 'lg'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => updatePreferences({ fontSize: sz })}
                          className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                            preferences.fontSize === sz
                              ? 'border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:border-cyan-400 dark:text-cyan-200'
                              : 'border-slate-200 bg-white text-slate-700 dark:border-cyan-500/15 dark:bg-[#0B172E] dark:text-slate-300'
                          }`}
                        >
                          {t(`settings.fontSizes.${sz}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <ToggleRow
                      label={t('settings.reducedMotion')}
                      checked={preferences.reducedMotion}
                      onChange={(val) => updatePreferences({ reducedMotion: val })}
                    />
                    <ToggleRow
                      label={t('settings.highContrast')}
                      checked={preferences.highContrast}
                      onChange={(val) => updatePreferences({ highContrast: val })}
                    />
                    <ToggleRow
                      label={t('settings.enhancedFocus')}
                      checked={preferences.enhancedFocus}
                      onChange={(val) => updatePreferences({ enhancedFocus: val })}
                    />
                  </div>
                </section>
              )}
            </div>

            {/* Footer with Reset to Default */}
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4 dark:border-cyan-500/15 dark:bg-[#0B172E]">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-cyan-500 hover:text-cyan-700 dark:border-cyan-500/25 dark:text-cyan-300 dark:hover:bg-cyan-400/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t('settings.resetDefault')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
              >
                {t('common.close')}
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
