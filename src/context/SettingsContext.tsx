import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setAppLanguage } from '../i18n/index.ts';
import type { SupportedLanguage } from '../i18n/index.ts';
import {
  fetchUserSession,
  logoutUserAccount,
  updateUserPreferences,
} from '../lib/api.ts';
import type { UserPreferences, UserProfile } from '../types/portfolio.ts';

const PREFS_STORAGE_KEY = 'surmila_preferences_v2';

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  themeMode: 'dark',
  accent: 'cyan',
  fontSize: 'md',
  reducedMotion: false,
  highContrast: false,
  enhancedFocus: false,
  compactCards: false,
  rememberLanguage: true,
  notifications: {
    emailReplies: true,
    newProjects: true,
    securityAlerts: true,
  },
  privacy: {
    showProfileInNav: true,
    allowAnalytics: true,
  },
};

function loadInitialPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...(parsed.notifications || {}),
      },
      privacy: {
        ...DEFAULT_PREFERENCES.privacy,
        ...(parsed.privacy || {}),
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function applyPreferencesToDom(prefs: UserPreferences): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.classList.toggle('dark', prefs.themeMode === 'dark');
  html.setAttribute('data-accent', prefs.accent);
  html.setAttribute('data-font-scale', prefs.fontSize);
  html.setAttribute('data-contrast', prefs.highContrast ? 'high' : 'normal');
  html.setAttribute('data-reduced-motion', prefs.reducedMotion ? 'true' : 'false');
  html.setAttribute('data-focus-ring', prefs.enhancedFocus ? 'enhanced' : 'normal');
}

interface SettingsContextValue {
  preferences: UserPreferences;
  user: UserProfile | null;
  authChecked: boolean;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  resetToDefaults: () => void;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshUserSession: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadInitialPreferences);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Apply initial DOM state & i18n language immediately
  useEffect(() => {
    applyPreferencesToDom(preferences);
    setAppLanguage(preferences.language);
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // ignore storage errors
    }
  }, [preferences]);

  const refreshUserSession = useCallback(async () => {
    try {
      const res = await fetchUserSession();
      if (res.authenticated && res.user) {
        setUser(res.user);
        if (res.user.preferences) {
          setPreferences((prev) => ({
            ...prev,
            ...res.user!.preferences,
            notifications: {
              ...prev.notifications,
              ...(res.user!.preferences.notifications || {}),
            },
            privacy: {
              ...prev.privacy,
              ...(res.user!.preferences.privacy || {}),
            },
          }));
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    refreshUserSession();
  }, [refreshUserSession]);

  const updatePreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const next: UserPreferences = {
          ...prev,
          ...patch,
          notifications: patch.notifications
            ? { ...prev.notifications, ...patch.notifications }
            : prev.notifications,
          privacy: patch.privacy ? { ...prev.privacy, ...patch.privacy } : prev.privacy,
        };
        if (user) {
          updateUserPreferences(next).catch(() => {
            // silent background sync
          });
        }
        return next;
      });
    },
    [user],
  );

  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      setAppLanguage(lang);
      updatePreferences({ language: lang });
    },
    [updatePreferences],
  );

  const resetToDefaults = useCallback(() => {
    setAppLanguage(DEFAULT_PREFERENCES.language);
    setPreferences(DEFAULT_PREFERENCES);
    if (user) {
      updateUserPreferences(DEFAULT_PREFERENCES).catch(() => {
        // silent
      });
    }
  }, [user]);

  const logoutUser = useCallback(async () => {
    await logoutUserAccount();
    setUser(null);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        preferences,
        user,
        authChecked,
        settingsOpen,
        setSettingsOpen,
        updatePreferences,
        setLanguage,
        resetToDefaults,
        setUser,
        refreshUserSession,
        logoutUser,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }
  return ctx;
}
