import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  Briefcase,
  Check,
  ExternalLink,
  GraduationCap,
  Heart,
  Mail,
  MapPin,
  Phone,
  Quote,
  Scissors,
  Sparkles,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext.tsx';
import { applyLanguageOverrides } from '../i18n/index.ts';
import {
  favoriteServiceItem,
  fetchPublicPortfolio,
  fetchUserDashboard,
  removeProjectBookmark,
  saveProjectBookmark,
  submitContactForm,
  unfavoriteServiceItem,
} from '../lib/api.ts';
import type {
  FashionDesignItem,
  KitchenGardenPost,
  ProjectItem,
  SiteContent,
  TeachingClassItem,
} from '../types/portfolio.ts';
import { ContinuousThread } from './ContinuousThread.tsx';
import { CustomCursor } from './CustomCursor.tsx';
import { DetailModal } from './DetailModal.tsx';
import type { DetailModalEntry } from './DetailModal.tsx';
import { Navbar } from './Navbar.tsx';
import { SettingsDrawer } from './SettingsDrawer.tsx';

gsap.registerPlugin(ScrollTrigger);

const HeroThreeScene = lazy(() => import('./HeroThreeScene.tsx'));

interface PublicPortfolioProps {
  onNavigate: (path: string) => void;
}

export const PublicPortfolio: React.FC<PublicPortfolioProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { preferences, user } = useSettings();

  const [content, setContent] = useState<SiteContent | null>(null);
  const [fashionDesigns, setFashionDesigns] = useState<FashionDesignItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teachingItems, setTeachingItems] = useState<TeachingClassItem[]>([]);
  const [kitchenGardenPosts, setKitchenGardenPosts] = useState<KitchenGardenPost[]>([]);
  const [visitorCount, setVisitorCount] = useState<number | undefined>(undefined);

  const [savedProjectIds, setSavedProjectIds] = useState<number[]>([]);
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>([]);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [roleIndex, setRoleIndex] = useState(0);
  const [activeDigitalCategory, setActiveDigitalCategory] = useState<string>('All');
  const [activeFashionCategory, setActiveFashionCategory] = useState<string>('All');
  const [modalEntry, setModalEntry] = useState<DetailModalEntry | null>(null);

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',
  });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactStatus, setContactStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetchPublicPortfolio()
      .then((data) => {
        if (!active) return;
        setContent(data.content);
        setFashionDesigns(data.fashionDesigns || []);
        setProjects(data.projects || []);
        setTeachingItems(data.teachingItems || []);
        setKitchenGardenPosts(data.kitchenGardenPosts || []);
        setVisitorCount(data.visitorCount);
        setLoading(false);

        if (data.content?.languageOverrides) {
          applyLanguageOverrides(data.content.languageOverrides);
        }

        if (data.content?.seo?.title) {
          document.title = data.content.seo.title;
        }
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && data.content?.seo?.description) {
          metaDesc.setAttribute('content', data.content.seo.description);
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load portfolio.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Load user's saved projects and favorite services when signed in
  useEffect(() => {
    if (!user) {
      setSavedProjectIds([]);
      setFavoriteServiceIds([]);
      return;
    }
    setContactForm((prev) => ({
      ...prev,
      name: prev.name || user.fullName,
      email: prev.email || user.email,
    }));
    fetchUserDashboard()
      .then((d) => {
        setSavedProjectIds(d.savedProjectIds || []);
        setFavoriteServiceIds(d.favoriteServiceIds || []);
      })
      .catch(() => {
        // silent
      });
  }, [user]);

  // Rotating hero role line
  useEffect(() => {
    const roles = content?.hero?.roles || [];
    if (roles.length <= 1 || preferences.reducedMotion) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % roles.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [content?.hero?.roles, preferences.reducedMotion]);

  // Lenis smooth scroll + GSAP ScrollTrigger reveals
  useEffect(() => {
    if (!content || preferences.reducedMotion) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.0,
      easing: (x) => Math.min(1, 1.001 - Math.pow(2, -10 * x)),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      const blocks = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      blocks.forEach((el) => {
        gsap.from(el, {
          y: 20,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        });
      });
    }, rootRef);

    return () => {
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [content, preferences.reducedMotion]);

  const showToast = useCallback((msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => setActionToast(null), 2600);
  }, []);

  const handleToggleSaveProject = useCallback(
    async (projectId: number) => {
      if (!user) {
        showToast(t('portfolio.loginToSave'));
        onNavigate('/login');
        return;
      }
      const alreadySaved = savedProjectIds.includes(projectId);
      try {
        if (alreadySaved) {
          await removeProjectBookmark(projectId);
          setSavedProjectIds((prev) => prev.filter((id) => id !== projectId));
        } else {
          await saveProjectBookmark(projectId);
          setSavedProjectIds((prev) => [...prev, projectId]);
        }
      } catch {
        // ignore
      }
    },
    [user, savedProjectIds, onNavigate, showToast, t],
  );

  const handleToggleFavoriteService = useCallback(
    async (serviceId: string) => {
      if (!user) {
        showToast(t('services.loginToSave'));
        onNavigate('/login');
        return;
      }
      const alreadyFav = favoriteServiceIds.includes(serviceId);
      try {
        if (alreadyFav) {
          await unfavoriteServiceItem(serviceId);
          setFavoriteServiceIds((prev) => prev.filter((id) => id !== serviceId));
        } else {
          await favoriteServiceItem(serviceId);
          setFavoriteServiceIds((prev) => [...prev, serviceId]);
        }
      } catch {
        // ignore
      }
    },
    [user, favoriteServiceIds, onNavigate, showToast, t],
  );

  const handleSectionJump = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handlePrefillEnquiry = useCallback((prefillSubject: string) => {
    setContactForm((prev) => ({ ...prev, subject: prefillSubject }));
    const contactEl = document.getElementById('contact');
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: 'smooth' });
      window.setTimeout(() => {
        subjectInputRef.current?.focus();
      }, 450);
    }
  }, []);

  const fashionCategories = useMemo(
    () => ['All', ...Array.from(new Set(fashionDesigns.map((d) => d.category)))],
    [fashionDesigns],
  );
  const filteredFashion = useMemo(() => {
    if (activeFashionCategory === 'All') return fashionDesigns;
    return fashionDesigns.filter((d) => d.category === activeFashionCategory);
  }, [fashionDesigns, activeFashionCategory]);

  const digitalCategories = useMemo(
    () => ['All', ...Array.from(new Set(projects.map((p) => p.category)))],
    [projects],
  );
  const filteredProjects = useMemo(() => {
    if (activeDigitalCategory === 'All') return projects;
    return projects.filter((p) => p.category === activeDigitalCategory);
  }, [projects, activeDigitalCategory]);

  const groupedSkills = useMemo(() => {
    if (!content) return [];
    const map = new Map<string, SiteContent['skills']>();
    content.skills.forEach((skill) => {
      const list = map.get(skill.category) || [];
      list.push(skill);
      map.set(skill.category, list);
    });
    return Array.from(map.entries());
  }, [content]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus(null);
    setSubmittingContact(true);
    try {
      const res = await submitContactForm(contactForm);
      setContactStatus({ type: 'success', text: res.message });
      setContactForm((prev) => ({ ...prev, subject: '', message: '', website: '' }));
    } catch (err) {
      setContactStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not send message. Please try again.',
      });
    } finally {
      setSubmittingContact(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-6 text-slate-900 dark:bg-[#060D1E] dark:text-slate-100">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-cyan-300">
          <Sparkles className="h-5 w-5 animate-pulse" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (loadError || !content) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-6 text-slate-900 dark:bg-[#060D1E] dark:text-slate-100">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-cyan-500/20 dark:bg-[#0B172E]">
          <h1 className="font-serif text-2xl font-semibold">Unable to open portfolio</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {loadError || 'Please refresh the page.'}
          </p>
        </div>
      </div>
    );
  }

  const rolesList =
    content.hero.roles && content.hero.roles.length > 0
      ? content.hero.roles
      : ['Fashion Designer', 'Art and Dance Teacher', 'Creative Freelancer'];
  const currentRole = rolesList[roleIndex % rolesList.length];
  const cardPad = preferences.compactCards ? 'p-5' : 'p-6 sm:p-7';

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen bg-[#F4F7FB] text-slate-900 transition-colors dark:bg-[#060D1E] dark:text-slate-100"
    >
      <CustomCursor />
      <ContinuousThread />

      <Navbar
        brandName={content.siteSettings?.brandTitle || content.hero.brandName || t('brand.short')}
        enabledLanguages={content.siteSettings?.enabledLanguages || ['en', 'bn']}
        onNavigate={onNavigate}
        onSectionJump={handleSectionJump}
      />

      <SettingsDrawer
        onNavigate={onNavigate}
        enabledLanguages={content.siteSettings?.enabledLanguages || ['en', 'bn']}
      />

      {actionToast && (
        <div className="fixed right-5 bottom-5 z-40 rounded-xl border border-cyan-500/40 bg-[#0B172E] px-4 py-3 text-xs font-semibold text-cyan-200 shadow-lg">
          {actionToast}
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section id="top" className="relative overflow-hidden border-b border-slate-200 dark:border-cyan-500/15">
        <div className="pointer-events-none absolute -top-28 right-0 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/10" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-12 lg:px-10 lg:py-24">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-600/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-500 dark:bg-cyan-300" />
              <span>{t('hero.eyebrow')}</span>
            </div>

            <h1 className="mt-6 font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              {content.hero.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('hero.rolesLabel')}:
              </span>
              <span className="rounded-md border border-cyan-500/30 bg-white px-3 py-1 dark:bg-[#0B172E]">
                {currentRole}
              </span>
            </div>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              {content.hero.intro}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#portfolio"
                onClick={(e) => {
                  e.preventDefault();
                  handleSectionJump('portfolio');
                }}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
              >
                <span>{content.hero.primaryCtaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  handleSectionJump('contact');
                }}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-cyan-500 hover:text-cyan-700 dark:border-cyan-500/30 dark:bg-[#0B172E] dark:text-cyan-200 dark:hover:border-cyan-400"
              >
                <span>{content.hero.secondaryCtaLabel}</span>
              </a>
            </div>

            <p className="mt-8 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('hero.scrollPrompt')}
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="h-[360px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 sm:h-[430px] dark:border-cyan-500/20 dark:from-[#0B172E] dark:to-[#060D1E]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-slate-500 dark:text-cyan-300">
                    Loading 3D studio scene...
                  </div>
                }
              >
                <HeroThreeScene />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ABOUT SECTION */}
      <section id="about" className="border-b border-slate-200 py-20 dark:border-cyan-500/15">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12 lg:px-10">
          <div data-reveal className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 dark:border-cyan-500/20 dark:bg-[#0B172E]">
              <img
                src={content.about.portraitUrl}
                alt={content.about.portraitAlt}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full rounded-xl object-cover"
              />
              <div className="flex items-center justify-between px-3 py-3 text-xs text-slate-600 dark:text-slate-300">
                <span>{t('about.portraitCaption')}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-cyan-700 dark:text-cyan-300">
                  <MapPin className="h-3.5 w-3.5" />
                  {content.about.locationLabel}
                </span>
              </div>
            </div>
          </div>

          <div data-reveal className="lg:col-span-7">
            <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
              {t('about.eyebrow')}
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              {content.about.heading}
            </h2>

            <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {content.about.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t('about.highlightsTitle')}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Scissors, label: t('about.pillarCraft') },
                  { icon: BookOpen, label: t('about.pillarTeach') },
                  { icon: Sparkles, label: t('about.pillarDigital') },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-800 dark:border-cyan-500/20 dark:bg-[#0B172E] dark:text-cyan-100"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SERVICES SECTION */}
      <section id="services" className="border-b border-slate-200 bg-white/50 py-20 dark:border-cyan-500/15 dark:bg-[#0B172E]/35">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div data-reveal className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
              {t('services.eyebrow')}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('services.title')}
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('services.subtitle')}</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {content.services.map((srv) => {
              const isFav = favoriteServiceIds.includes(srv.id);
              return (
                <article
                  key={srv.id}
                  data-reveal
                  className={`flex flex-col justify-between rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-cyan-500/50 dark:border-cyan-500/20 dark:bg-[#0B172E] ${cardPad}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                        {srv.number}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleFavoriteService(srv.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          isFav
                            ? 'border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:border-cyan-400 dark:text-cyan-300'
                            : 'border-slate-200 text-slate-500 hover:border-cyan-500 hover:text-cyan-700 dark:border-cyan-500/20 dark:text-slate-400 dark:hover:text-cyan-300'
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                        <span>{isFav ? t('services.favorited') : t('services.favorite')}</span>
                      </button>
                    </div>
                    <h3 className="mt-3 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                      {srv.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {srv.summary}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-cyan-500/15">
                    {srv.deliverables.map((del) => (
                      <span
                        key={del}
                        className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-[#112240] dark:text-cyan-200"
                      >
                        {del}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. FASHION LOOKBOOK */}
      <section id="fashion" className="border-b border-slate-200 py-20 dark:border-cyan-500/15">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                {t('fashion.eyebrow')}
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('fashion.title')}
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {t('fashion.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {fashionCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveFashionCategory(cat)}
                  className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    activeFashionCategory === cat
                      ? 'border-cyan-500 bg-cyan-600 text-white dark:bg-cyan-400 dark:text-[#060D1E]'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-500 dark:border-cyan-500/20 dark:bg-[#0B172E] dark:text-slate-300'
                  }`}
                >
                  {cat === 'All' ? t('fashion.all') : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {filteredFashion.map((item) => (
              <article
                key={item.id}
                data-reveal
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-1 hover:border-cyan-500/50 dark:border-cyan-500/20 dark:bg-[#0B172E]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-[#112240]">
                  {item.images[0] && (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className={cardPad}>
                  <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                    {item.category} · {item.fabric}
                  </p>
                  <h3 className="mt-1.5 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalEntry({ kind: 'fashion', item })}
                    className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                  >
                    <span>{t('fashion.inspect')}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TEACHING & MENTORSHIP */}
      <section id="teaching" className="border-b border-slate-200 bg-white/50 py-20 dark:border-cyan-500/15 dark:bg-[#0B172E]/35">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div data-reveal className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                {t('teaching.eyebrow')}
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {content.teaching.heading}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {content.teaching.summary}
              </p>
              <div className="mt-6 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-4">
                <p className="text-xs font-semibold tracking-wider text-cyan-800 uppercase dark:text-cyan-300">
                  {t('teaching.approachLabel')}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {content.teaching.approach}
                </p>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-7">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t('teaching.institutionsTitle')}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {content.teaching.institutions.map((inst) => (
                  <div
                    key={inst.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                  >
                    <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                      {inst.role}
                    </span>
                    <h3 className="mt-1 font-serif text-xl font-semibold">{inst.institution}</h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{inst.levels}</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{inst.subjects}</p>
                    <p className="mt-3 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                      {inst.scheduleNote}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {teachingItems.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t('teaching.classesTitle')}
              </h3>
              <div className="mt-4 grid gap-6 md:grid-cols-3">
                {teachingItems.map((item) => (
                  <article
                    key={item.id}
                    data-reveal
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-cyan-500/50 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                  >
                    <div>
                      <div className="aspect-video overflow-hidden rounded-xl bg-slate-100 dark:bg-[#112240]">
                        {item.images[0] && (
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <p className="mt-4 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                        {item.category}
                      </p>
                      <h4 className="mt-1 font-serif text-xl font-semibold">{item.title}</h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.studentLevel}
                      </p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalEntry({ kind: 'teaching', item })}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                    >
                      <span>{t('teaching.inspect')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. PORTFOLIO — DESIGN, VIDEO & AI WORKFLOWS */}
      <section id="portfolio" className="border-b border-slate-200 py-20 dark:border-cyan-500/15">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                {t('portfolio.eyebrow')}
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('portfolio.title')}
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {t('portfolio.subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {digitalCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveDigitalCategory(cat)}
                  className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    activeDigitalCategory === cat
                      ? 'border-cyan-500 bg-cyan-600 text-white dark:bg-cyan-400 dark:text-[#060D1E]'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-500 dark:border-cyan-500/20 dark:bg-[#0B172E] dark:text-slate-300'
                  }`}
                >
                  {cat === 'All' ? t('portfolio.all') : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {filteredProjects.map((project) => {
              const isSaved = savedProjectIds.includes(project.id);
              return (
                <article
                  key={project.id}
                  data-reveal
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-1 hover:border-cyan-500/50 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-[#112240]">
                    {project.images[0] && (
                      <img
                        src={project.images[0]}
                        alt={project.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className={`flex flex-1 flex-col justify-between ${cardPad}`}>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                          {project.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleSaveProject(project.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                            isSaved
                              ? 'border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:border-cyan-400 dark:text-cyan-300'
                              : 'border-slate-200 text-slate-500 hover:border-cyan-500 hover:text-cyan-700 dark:border-cyan-500/20 dark:text-slate-400 dark:hover:text-cyan-300'
                          }`}
                        >
                          <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                          <span>{isSaved ? t('portfolio.saved') : t('portfolio.save')}</span>
                        </button>
                      </div>
                      <h3 className="mt-2 font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                        {project.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {project.summary}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {project.tools.map((tool) => (
                          <span
                            key={tool}
                            className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-[#112240] dark:text-cyan-200"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-cyan-500/15">
                      <button
                        type="button"
                        onClick={() => setModalEntry({ kind: 'project', item: project })}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                      >
                        <span>{t('portfolio.inspect')}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      {project.externalUrl && (
                        <a
                          href={project.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. SKILLS & TOOLS */}
      <section id="skills" className="border-b border-slate-200 bg-white/50 py-20 dark:border-cyan-500/15 dark:bg-[#0B172E]/35">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div data-reveal className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
              {t('skills.eyebrow')}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('skills.title')}
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('skills.subtitle')}</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {groupedSkills.map(([category, items]) => (
              <div
                key={category}
                data-reveal
                className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-cyan-500/20 dark:bg-[#0B172E]"
              >
                <h3 className="font-serif text-xl font-semibold text-cyan-700 dark:text-cyan-300">
                  {category}
                </h3>
                <div className="mt-4 space-y-3.5">
                  {items.map((sk) => {
                    const pct = sk.level ?? 90;
                    return (
                      <div key={sk.id}>
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-800 dark:text-slate-200">{sk.name}</span>
                          <span className="font-mono text-cyan-700 tabular-nums dark:text-cyan-400">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-[#112240]">
                          <div
                            className="h-full rounded-full bg-cyan-600 dark:bg-cyan-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. EXPERIENCE & 9. EDUCATION */}
      <section id="experience" className="border-b border-slate-200 py-20 dark:border-cyan-500/15">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:px-10">
          <div data-reveal className="lg:col-span-7">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
              <Briefcase className="h-3.5 w-3.5" />
              <span>{t('experience.eyebrow')}</span>
            </div>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('experience.title')}
            </h2>

            <div className="mt-8 space-y-5 border-l border-cyan-500/30 pl-6">
              {content.experience.map((exp) => (
                <div
                  key={exp.id}
                  className="relative rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                >
                  <span className="absolute -left-[31px] top-6 h-3 w-3 rounded-full border-2 border-cyan-500 bg-[#F4F7FB] dark:bg-[#060D1E]" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                      {exp.period}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {exp.organization}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-serif text-xl font-semibold">{exp.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {exp.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal className="lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
              <GraduationCap className="h-4 w-4" />
              <span>{t('education.eyebrow')}</span>
            </div>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('education.title')}
            </h2>

            <div className="mt-8 space-y-4">
              {(content.education || []).map((edu) => (
                <div
                  key={edu.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                >
                  <span className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                    {edu.period}
                  </span>
                  <h3 className="mt-1 font-serif text-xl font-semibold">{edu.degree}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {edu.institution}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{edu.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10. CERTIFICATES & 11. TESTIMONIALS */}
      <section className="border-b border-slate-200 bg-white/50 py-20 dark:border-cyan-500/15 dark:bg-[#0B172E]/35">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div data-reveal>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
              <Award className="h-4 w-4" />
              <span>{t('certificates.eyebrow')}</span>
            </div>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('certificates.title')}
            </h2>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {(content.certificates || []).map((cert) => (
                <div
                  key={cert.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                        {cert.year}
                      </span>
                      {cert.credentialCode && (
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {cert.credentialCode}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-serif text-lg font-semibold leading-snug">
                      {cert.title}
                    </h3>
                    <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t('certificates.issuedBy')}: {cert.issuer}
                    </p>
                  </div>
                  <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600 dark:border-cyan-500/15 dark:text-slate-300">
                    {cert.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {(content.testimonials || []).length > 0 && (
            <div data-reveal className="mt-16">
              <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                {t('testimonials.eyebrow')}
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('testimonials.title')}
              </h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {content.testimonials.map((item) => (
                  <blockquote
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                  >
                    <div>
                      <Quote className="h-5 w-5 text-cyan-600/60 dark:text-cyan-400/60" />
                      <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        “{item.quote}”
                      </p>
                    </div>
                    <footer className="mt-5 border-t border-slate-200 pt-3 dark:border-cyan-500/15">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.role}</p>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 12. KITCHEN & GARDEN + 13. VOLUNTEER */}
      <section className="border-b border-slate-200 py-20 dark:border-cyan-500/15">
        <div className="mx-auto max-w-7xl space-y-16 px-6 lg:px-10">
          {kitchenGardenPosts.length > 0 && (
            <div data-reveal>
              <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                {t('kitchenGarden.eyebrow')}
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('kitchenGarden.title')}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {t('kitchenGarden.subtitle')}
              </p>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {kitchenGardenPosts.map((post) => (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-cyan-500/20 dark:bg-[#0B172E]"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-[#112240]">
                      {post.images[0] && (
                        <img
                          src={post.images[0]}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-5">
                      <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                        {post.category}
                      </span>
                      <h3 className="mt-1 font-serif text-xl font-semibold">{post.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{post.summary}</p>
                      <button
                        type="button"
                        onClick={() => setModalEntry({ kind: 'kitchenGarden', item: post })}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                      >
                        <span>{t('kitchenGarden.inspect')}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div data-reveal>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
              <Users className="h-4 w-4" />
              <span>{t('volunteer.eyebrow')}</span>
            </div>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('volunteer.title')}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {content.volunteer.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-cyan-500/20 dark:bg-[#0B172E]"
                >
                  <span className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                    {v.year}
                  </span>
                  <h3 className="mt-1.5 font-serif text-lg font-semibold">{v.organization}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {v.role}
                  </p>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {v.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 14. CONTACT SECTION */}
      <section id="contact" className="bg-white/60 py-20 dark:bg-[#0B172E]/50">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:px-10">
          <div data-reveal className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
              {t('contact.eyebrow')}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('contact.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {content.contact.availabilityNote || t('contact.subtitle')}
            </p>

            <div className="mt-8 space-y-4">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t('contact.directTitle')}
              </p>
              <a
                href={`mailto:${content.contact.email}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition-colors hover:border-cyan-500 dark:border-cyan-500/20 dark:bg-[#060D1E]"
              >
                <Mail className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                <span>{content.contact.email}</span>
              </a>
              <a
                href={`tel:${content.contact.phone}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition-colors hover:border-cyan-500 dark:border-cyan-500/20 dark:bg-[#060D1E]"
              >
                <Phone className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                <span className="tabular-nums">{content.contact.phone}</span>
              </a>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium dark:border-cyan-500/20 dark:bg-[#060D1E]">
                <MapPin className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                <span>{content.contact.location}</span>
              </div>
            </div>

            {content.contact.socialLinks.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t('contact.socialTitle')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {content.contact.socialLinks.map((soc) => (
                    <a
                      key={soc.id}
                      href={soc.url}
                      target={soc.url.startsWith('mailto:') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-cyan-500 hover:text-cyan-700 dark:border-cyan-500/25 dark:bg-[#060D1E] dark:text-cyan-200 dark:hover:border-cyan-400"
                    >
                      {soc.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div data-reveal className="lg:col-span-7">
            <form
              onSubmit={handleContactSubmit}
              className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-cyan-500/20 dark:bg-[#060D1E]"
            >
              <div className="hidden" aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={contactForm.website}
                  onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('contact.nameLabel')}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder={t('contact.namePlaceholder')}
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('contact.emailLabel')}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    placeholder={t('contact.emailPlaceholder')}
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('contact.subjectLabel')}
                </label>
                <input
                  ref={subjectInputRef}
                  id="contact-subject"
                  type="text"
                  required
                  placeholder={t('contact.subjectPlaceholder')}
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('contact.messageLabel')}
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  required
                  minLength={10}
                  placeholder={t('contact.messagePlaceholder')}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-cyan-500/25 dark:bg-[#0B172E] dark:text-white"
                />
              </div>

              {contactStatus && (
                <div
                  role="status"
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
                    contactStatus.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {contactStatus.type === 'success' && <Check className="h-4 w-4 shrink-0" />}
                  <span>{contactStatus.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingContact}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-60 dark:bg-cyan-400 dark:text-[#060D1E] dark:hover:bg-cyan-300"
              >
                <span>{submittingContact ? t('contact.sendingBtn') : t('contact.sendBtn')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER (zero admin links) */}
      <footer className="border-t border-slate-200 py-8 dark:border-cyan-500/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-slate-500 lg:px-10 dark:text-slate-400">
          <p>
            © {new Date().getFullYear()} {content.hero.name}. {t('footer.rights')}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <span>{content.siteSettings?.footerNote || t('footer.builtWith')}</span>
            {typeof visitorCount === 'number' && preferences.privacy.allowAnalytics && (
              <span className="font-mono text-[11px] text-cyan-700 tabular-nums dark:text-cyan-400">
                Visitors: {visitorCount}
              </span>
            )}
          </div>
        </div>
      </footer>

      <DetailModal
        entry={modalEntry}
        onClose={() => setModalEntry(null)}
        onEnquire={handlePrefillEnquiry}
        isSavedProject={
          modalEntry?.kind === 'project' ? savedProjectIds.includes(modalEntry.item.id) : false
        }
        onToggleSaveProject={handleToggleSaveProject}
      />
    </div>
  );
};
