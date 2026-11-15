import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bell,
  Bookmark,
  Check,
  Heart,
  KeyRound,
  LogOut,
  Mail,
  Settings,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext.tsx';
import {
  changeUserPassword,
  fetchUserDashboard,
  markAllNotificationsRead,
  markNotificationRead,
  removeProjectBookmark,
  unfavoriteServiceItem,
  updateUserProfile,
  uploadUserAvatar,
} from '../lib/api.ts';
import type { UserDashboardPayload } from '../types/portfolio.ts';
import { SettingsDrawer } from './SettingsDrawer.tsx';

interface UserDashboardProps {
  onNavigate: (path: string) => void;
}

type DashTab =
  | 'overview'
  | 'editProfile'
  | 'savedProjects'
  | 'favoriteServices'
  | 'contactHistory'
  | 'notifications'
  | 'security'
  | 'activity';

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { setSettingsOpen, logoutUser, setUser, authChecked, user } = useSettings();

  const [tab, setTab] = useState<DashTab>('overview');
  const [data, setData] = useState<UserDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    location: '',
    bio: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchUserDashboard();
      setData(payload);
      setUser(payload.user);
      setProfileForm({
        fullName: payload.user.fullName,
        phone: payload.user.phone,
        location: payload.user.location,
        bio: payload.user.bio,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      onNavigate('/login');
      return;
    }
    loadDashboard();
  }, [authChecked, user, onNavigate, loadDashboard]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await updateUserProfile(profileForm);
      setUser(res.user);
      setData((prev) => (prev ? { ...prev, user: res.user } : prev));
      setProfileMsg('Profile saved.');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadUserAvatar(file);
      setData((prev) =>
        prev ? { ...prev, user: { ...prev.user, avatarUrl: res.avatarUrl } } : prev,
      );
      setUser((prev) => (prev ? { ...prev, avatarUrl: res.avatarUrl } : prev));
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    try {
      const res = await changeUserPassword(pwForm.current, pwForm.next);
      setPwMsg({ type: 'ok', text: res.message });
      setPwForm({ current: '', next: '' });
    } catch (err) {
      setPwMsg({ type: 'err', text: err instanceof Error ? err.message : 'Update failed.' });
    }
  };

  const handleRemoveSaved = async (projectId: number) => {
    await removeProjectBookmark(projectId);
    setData((prev) =>
      prev
        ? {
            ...prev,
            savedProjectIds: prev.savedProjectIds.filter((id) => id !== projectId),
            savedProjects: prev.savedProjects.filter((p) => p.id !== projectId),
          }
        : prev,
    );
  };

  const handleRemoveFav = async (serviceId: string) => {
    await unfavoriteServiceItem(serviceId);
    setData((prev) =>
      prev
        ? {
            ...prev,
            favoriteServiceIds: prev.favoriteServiceIds.filter((id) => id !== serviceId),
            favoriteServices: prev.favoriteServices.filter((s) => s.id !== serviceId),
          }
        : prev,
    );
  };

  const handleMarkNotifRead = async (id: number) => {
    await markNotificationRead(id);
    setData((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n,
            ),
          }
        : prev,
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setData((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
          }
        : prev,
    );
  };

  const handleLogout = async () => {
    await logoutUser();
    onNavigate('/');
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] text-sm text-slate-600 dark:bg-[#060D1E] dark:text-cyan-300">
        {error || t('common.loading')}
      </div>
    );
  }

  const unreadNotifs = data.notifications.filter((n) => !n.isRead).length;

  const navItems: Array<{ id: DashTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }> = [
    { id: 'overview', label: t('userDash.nav.overview'), icon: User },
    { id: 'editProfile', label: t('userDash.nav.editProfile'), icon: User },
    { id: 'savedProjects', label: t('userDash.nav.savedProjects'), icon: Bookmark, badge: data.savedProjects.length },
    { id: 'favoriteServices', label: t('userDash.nav.favoriteServices'), icon: Heart, badge: data.favoriteServices.length },
    { id: 'contactHistory', label: t('userDash.nav.contactHistory'), icon: Mail, badge: data.contactHistory.length },
    { id: 'notifications', label: t('userDash.nav.notifications'), icon: Bell, badge: unreadNotifs },
    { id: 'security', label: t('userDash.nav.security'), icon: KeyRound },
    { id: 'activity', label: t('userDash.nav.activity'), icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 dark:bg-[#060D1E] dark:text-slate-100">
      <SettingsDrawer onNavigate={onNavigate} />

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Responsive Navy Sidebar */}
        <aside className="w-full shrink-0 border-b border-slate-200 bg-white p-5 lg:min-h-screen lg:w-72 lg:border-r lg:border-b-0 dark:border-cyan-500/20 dark:bg-[#0B172E]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                {t('userDash.subtitle')}
              </p>
              <h1 className="font-serif text-2xl font-semibold">{t('userDash.title')}</h1>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t('nav.settings')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:border-cyan-500 dark:border-cyan-500/25 dark:text-cyan-300"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-[#F4F7FB] p-4 dark:border-cyan-500/20 dark:bg-[#060D1E]">
            <div className="flex items-center gap-3">
              {data.user.avatarUrl ? (
                <img
                  src={data.user.avatarUrl}
                  alt={data.user.fullName}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-full border border-cyan-400/50 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-700 dark:text-cyan-300">
                  {data.user.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{data.user.fullName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {data.user.email}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-[#060D1E]'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#112240]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                        active
                          ? 'bg-white/20 text-white dark:bg-[#060D1E]/20 dark:text-[#060D1E]'
                          : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-cyan-500/15">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-500 dark:border-cyan-500/25 dark:text-cyan-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('auth.backToPortfolio')}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-rose-500/30 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('userDash.logout')}</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 p-6 lg:p-10">
          {tab === 'overview' && (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: t('userDash.nav.savedProjects'), val: data.savedProjects.length },
                  { label: t('userDash.nav.favoriteServices'), val: data.favoriteServices.length },
                  { label: t('userDash.nav.contactHistory'), val: data.contactHistory.length },
                  { label: t('userDash.nav.notifications'), val: unreadNotifs },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </p>
                    <p className="mt-2 font-mono text-2xl font-semibold text-cyan-700 tabular-nums dark:text-cyan-300">
                      {stat.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-cyan-500/20 dark:bg-[#0B172E]">
                <h2 className="font-serif text-2xl font-semibold">{data.user.fullName}</h2>
                <p className="mt-1 text-sm text-cyan-700 dark:text-cyan-400">{data.user.email}</p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {data.user.bio || 'No bio added yet. Update your personal details anytime.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                  {data.user.phone && <span>Phone: {data.user.phone}</span>}
                  {data.user.location && <span>Location: {data.user.location}</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-cyan-500/20 dark:bg-[#0B172E]">
                <h3 className="font-serif text-xl font-semibold">{t('userDash.nav.activity')}</h3>
                <div className="mt-4 space-y-2.5">
                  {data.activities.slice(0, 5).map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs dark:border-cyan-500/10"
                    >
                      <span>{act.action}</span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'editProfile' && (
            <div className="max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-cyan-500/20 dark:bg-[#0B172E]">
              <h2 className="font-serif text-2xl font-semibold">{t('userDash.nav.editProfile')}</h2>

              <div className="flex items-center gap-4">
                {data.user.avatarUrl ? (
                  <img
                    src={data.user.avatarUrl}
                    alt={data.user.fullName}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 rounded-full border border-cyan-400/50 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-700 dark:text-cyan-300">
                    {data.user.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingAvatar ? 'Uploading...' : t('userDash.uploadAvatar')}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold">{t('auth.fullName')}</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm dark:border-cyan-500/20 dark:bg-[#060D1E]"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold">{t('userDash.phone')}</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm dark:border-cyan-500/20 dark:bg-[#060D1E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">{t('userDash.location')}</label>
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm dark:border-cyan-500/20 dark:bg-[#060D1E]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold">{t('userDash.bio')}</label>
                  <textarea
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm dark:border-cyan-500/20 dark:bg-[#060D1E]"
                  />
                </div>
                {profileMsg && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                    <Check className="h-4 w-4" />
                    {profileMsg}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-[#060D1E]"
                >
                  {t('userDash.saveProfile')}
                </button>
              </form>
            </div>
          )}

          {tab === 'savedProjects' && (
            <div className="space-y-5">
              <h2 className="font-serif text-2xl font-semibold">{t('userDash.nav.savedProjects')}</h2>
              {data.savedProjects.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-cyan-500/20 dark:bg-[#0B172E]">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('userDash.noSaved')}</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('/')}
                    className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white dark:bg-cyan-400 dark:text-[#060D1E]"
                  >
                    {t('userDash.browsePortfolio')}
                  </button>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {data.savedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                    >
                      <div>
                        <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                          {proj.category}
                        </span>
                        <h3 className="mt-1 font-serif text-xl font-semibold">{proj.title}</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{proj.summary}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(proj.id)}
                        className="mt-4 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'favoriteServices' && (
            <div className="space-y-5">
              <h2 className="font-serif text-2xl font-semibold">{t('userDash.nav.favoriteServices')}</h2>
              {data.favoriteServices.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-cyan-500/20 dark:bg-[#0B172E]">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('userDash.noFavorites')}</p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {data.favoriteServices.map((srv) => (
                    <div
                      key={srv.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                    >
                      <span className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                        {srv.number}
                      </span>
                      <h3 className="mt-1 font-serif text-xl font-semibold">{srv.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{srv.summary}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveFav(srv.id)}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'contactHistory' && (
            <div className="space-y-5">
              <h2 className="font-serif text-2xl font-semibold">{t('userDash.nav.contactHistory')}</h2>
              {data.contactHistory.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-cyan-500/20 dark:bg-[#0B172E]">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('userDash.noMessages')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.contactHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                          {msg.subject}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-semibold">{t('userDash.nav.notifications')}</h2>
                {unreadNotifs > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300"
                  >
                    {t('userDash.markAllRead')}
                  </button>
                )}
              </div>
              {data.notifications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-cyan-500/20 dark:bg-[#0B172E]">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('userDash.noNotifications')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${
                        n.isRead
                          ? 'border-slate-200 bg-white/70 dark:border-cyan-500/15 dark:bg-[#0B172E]/60'
                          : 'border-cyan-500/50 bg-white dark:border-cyan-400/50 dark:bg-[#0B172E]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{n.title}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.body}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkNotifRead(n.id)}
                          className="shrink-0 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'security' && (
            <div className="max-w-xl space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-cyan-500/20 dark:bg-[#0B172E]">
                <h2 className="font-serif text-2xl font-semibold">{t('settings.passwordLabel')}</h2>
                <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold">{t('settings.currentPassword')}</label>
                    <input
                      type="password"
                      required
                      value={pwForm.current}
                      onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm dark:border-cyan-500/20 dark:bg-[#060D1E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold">{t('settings.newPassword')}</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={pwForm.next}
                      onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm dark:border-cyan-500/20 dark:bg-[#060D1E]"
                    />
                  </div>
                  {pwMsg && (
                    <p
                      className={`text-xs font-semibold ${
                        pwMsg.type === 'ok'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {pwMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white dark:bg-cyan-400 dark:text-[#060D1E]"
                  >
                    {t('settings.updatePasswordBtn')}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-cyan-500/20 dark:bg-[#0B172E]">
                <h3 className="font-serif text-xl font-semibold">{t('settings.accountPrefsLabel')}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Manage theme, language, privacy, and accessibility settings anytime.
                </p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 px-4 py-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300"
                >
                  <Settings className="h-4 w-4" />
                  <span>{t('nav.settings')}</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold">{t('userDash.nav.activity')}</h2>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-cyan-500/20 dark:bg-[#0B172E]">
                <div className="space-y-3">
                  {data.activities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm dark:border-cyan-500/10"
                    >
                      <span>{act.action}</span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
