import React, { useState } from 'react';
import { Globe, Menu, Settings, User, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext.tsx';
import { NeedleMark } from './AtelierMarks.tsx';

interface NavbarProps {
  brandName: string;
  enabledLanguages?: Array<'en' | 'bn'>;
  onNavigate: (path: string) => void;
  onSectionJump?: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  brandName,
  enabledLanguages = ['en', 'bn'],
  onNavigate,
  onSectionJump,
}) => {
  const { t } = useTranslation();
  const { preferences, setLanguage, setSettingsOpen, user } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { id: 'top', label: t('nav.home') },
    { id: 'about', label: t('nav.about') },
    { id: 'services', label: t('nav.services') },
    { id: 'skills', label: t('nav.skills') },
    { id: 'portfolio', label: t('nav.portfolio') },
    { id: 'experience', label: t('nav.experience') },
    { id: 'contact', label: t('nav.contact') },
  ];

  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (onSectionJump) {
      onSectionJump(id);
    } else {
      onNavigate('/');
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  };

  const toggleLanguage = () => {
    if (enabledLanguages.length < 2) return;
    setLanguage(preferences.language === 'en' ? 'bn' : 'en');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#F4F7FB]/90 backdrop-blur-md dark:border-cyan-500/15 dark:bg-[#060D1E]/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
        {/* 1. Brand / Logo */}
        <a
          href="#top"
          onClick={(e) => handleNavClick(e, 'top')}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300">
            <NeedleMark className="h-4 w-4" />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {brandName || t('brand.short')}
          </span>
        </a>

        {/* 2. Primary Navigation */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-5 text-xs font-medium text-slate-600 xl:gap-6 lg:flex dark:text-slate-300"
        >
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => handleNavClick(e, link.id)}
              className="shrink-0 whitespace-nowrap transition-colors hover:text-cyan-700 dark:hover:text-cyan-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* 3. Right Utility Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Language Selector (EN / বাংলা) */}
          {enabledLanguages.length > 0 && (
            <div
              className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-semibold dark:border-cyan-500/25 dark:bg-[#0B172E]"
              role="group"
              aria-label={t('settings.languageLabel')}
            >
              {enabledLanguages.includes('en') && (
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-md px-2 py-1.5 transition-colors ${
                    preferences.language === 'en'
                      ? 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-[#060D1E]'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  EN
                </button>
              )}
              {enabledLanguages.includes('bn') && (
                <button
                  type="button"
                  onClick={() => setLanguage('bn')}
                  className={`rounded-md px-2 py-1.5 transition-colors ${
                    preferences.language === 'bn'
                      ? 'bg-cyan-600 text-white dark:bg-cyan-400 dark:text-[#060D1E]'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  বাংলা
                </button>
              )}
            </div>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:border-cyan-500 hover:text-cyan-700 dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* User Profile / Login Button */}
          {user ? (
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="hidden items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-cyan-500 sm:inline-flex dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-slate-100 dark:hover:border-cyan-400"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  referrerPolicy="no-referrer"
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <User className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
              )}
              <span className="max-w-[96px] truncate">
                {preferences.privacy.showProfileInNav ? user.fullName.split(' ')[0] : t('nav.dashboard')}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="hidden items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-cyan-500 hover:text-cyan-700 sm:inline-flex dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300"
            >
              <User className="h-3.5 w-3.5" />
              <span>{t('nav.login')}</span>
            </button>
          )}

          {/* Hire Me CTA */}
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, 'contact')}
            className="hidden shrink-0 whitespace-nowrap rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 md:inline-flex dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
          >
            {t('nav.hireMe')}
          </a>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 lg:hidden dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-slate-200"
            aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Panel */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden dark:border-cyan-500/15 dark:bg-[#0B172E]">
          <nav className="grid grid-cols-2 gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleNavClick(e, link.id)}
                className="rounded-lg border border-slate-200 px-3 py-2 hover:border-cyan-500 dark:border-cyan-500/15 dark:hover:border-cyan-400"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-200 pt-4 dark:border-cyan-500/15">
            {enabledLanguages.length > 1 && (
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-cyan-500/25"
              >
                <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                <span>{preferences.language === 'en' ? 'বাংলা' : 'EN'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate(user ? '/dashboard' : '/login');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-cyan-500/25"
            >
              <User className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
              <span>{user ? t('nav.dashboard') : t('nav.login')}</span>
            </button>
            <a
              href="#contact"
              onClick={(e) => handleNavClick(e, 'contact')}
              className="ml-auto rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white dark:bg-cyan-400 dark:text-[#060D1E]"
            >
              {t('nav.hireMe')}
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
