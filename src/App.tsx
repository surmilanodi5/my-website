import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import './i18n/index.ts';
import { AdminLogin } from './components/AdminLogin.tsx';
import { PublicPortfolio } from './components/PublicPortfolio.tsx';
import { UserAuthPages } from './components/UserAuthPages.tsx';
import { UserDashboard } from './components/UserDashboard.tsx';
import { SettingsProvider } from './context/SettingsContext.tsx';

const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx'));

function AppRoutes() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setPathname(nextPath);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  if (pathname === '/studio-login') {
    return <AdminLogin onNavigate={navigate} />;
  }

  if (pathname === '/studio-admin') {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#060D1E] text-sm text-cyan-300">
            Loading Studio Admin...
          </div>
        }
      >
        <AdminDashboard onNavigate={navigate} />
      </Suspense>
    );
  }

  if (pathname === '/login') {
    return <UserAuthPages mode="login" onNavigate={navigate} />;
  }

  if (pathname === '/register') {
    return <UserAuthPages mode="register" onNavigate={navigate} />;
  }

  if (pathname === '/forgot-password') {
    return <UserAuthPages mode="forgot" onNavigate={navigate} />;
  }

  if (pathname === '/dashboard') {
    return <UserDashboard onNavigate={navigate} />;
  }

  return <PublicPortfolio onNavigate={navigate} />;
}

export default function App() {
  return (
    <SettingsProvider>
      <AppRoutes />
    </SettingsProvider>
  );
}
