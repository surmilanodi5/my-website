import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  Briefcase,
  Check,
  ExternalLink,
  Eye,
  FolderKanban,
  Globe,
  GraduationCap,
  Home,
  Languages,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquareQuote,
  Plus,
  Scissors,
  Search,
  Settings,
  Share2,
  Trash2,
  Upload,
  User,
  Users,
  Utensils,
  Wrench,
} from 'lucide-react';
import {
  adminDeleteUser,
  adminLogout,
  adminUpdateUser,
  changeAdminPassword,
  createFashionDesign,
  createKitchenGardenPost,
  createProject,
  createTeachingItem,
  deleteFashionDesign,
  deleteKitchenGardenPost,
  deleteMessage,
  deleteProject,
  deleteTeachingItem,
  fetchAdminOverview,
  fetchAdminSession,
  markMessageRead,
  updateFashionDesign,
  updateKitchenGardenPost,
  updateProject,
  updateSiteSection,
  updateTeachingItem,
  uploadMediaFile,
} from '../lib/api.ts';
import type {
  AdminOverviewPayload,
  FashionDesignItem,
  KitchenGardenPost,
  ProjectItem,
  SiteContent,
  TeachingClassItem,
} from '../types/portfolio.ts';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
}

type AdminSection =
  | 'overview'
  | 'homepage'
  | 'about'
  | 'services'
  | 'projects'
  | 'fashion'
  | 'teaching'
  | 'kitchenGarden'
  | 'skills'
  | 'experience'
  | 'education'
  | 'certificates'
  | 'testimonials'
  | 'messages'
  | 'socialContact'
  | 'siteSettings'
  | 'users'
  | 'languages'
  | 'seo';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [section, setSection] = useState<AdminSection>('overview');
  const [data, setData] = useState<AdminOverviewPayload | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Collection editing states
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [projectDraft, setProjectDraft] = useState({
    title: '',
    category: 'Graphic Design',
    summary: '',
    description: '',
    toolsText: 'Adobe Illustrator, Adobe Photoshop',
    images: [] as string[],
    externalUrl: '',
    featured: true,
    published: true,
    sortOrder: 0,
  });

  const [editingFashionId, setEditingFashionId] = useState<number | null>(null);
  const [fashionDraft, setFashionDraft] = useState({
    title: '',
    category: 'Everyday Tailoring',
    fabric: '100% Cotton',
    summary: '',
    description: '',
    images: [] as string[],
    featured: true,
    published: true,
    sortOrder: 0,
  });

  const [editingTeachingId, setEditingTeachingId] = useState<number | null>(null);
  const [teachingDraft, setTeachingDraft] = useState({
    title: '',
    category: 'Art Class',
    studentLevel: 'Primary & Middle School',
    summary: '',
    description: '',
    images: [] as string[],
    videoUrl: '',
    featured: false,
    published: true,
    sortOrder: 0,
  });

  const [editingKgId, setEditingKgId] = useState<number | null>(null);
  const [kgDraft, setKgDraft] = useState({
    title: '',
    category: 'Recipe',
    summary: '',
    note: '',
    ingredientsText: '',
    stepsText: '',
    images: [] as string[],
    featured: false,
    published: true,
    sortOrder: 0,
  });

  // Language override editor helper
  const [overrideLang, setOverrideLang] = useState<'en' | 'bn'>('en');
  const [overrideKey, setOverrideKey] = useState('hero.eyebrow');
  const [overrideValue, setOverrideValue] = useState('');

  // Admin password change
  const [adminPwForm, setAdminPwForm] = useState({ current: '', next: '' });

  const notify = useCallback((type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const sess = await fetchAdminSession();
      if (!sess.authenticated) {
        onNavigate('/studio-login');
        return;
      }
      const overview = await fetchAdminOverview();
      setData(overview);
      setContent(overview.content);
    } catch {
      onNavigate('/studio-login');
    } finally {
      setLoading(false);
    }
  }, [onNavigate]);

  useEffect(() => {
    document.title = 'Studio Admin — Management';
    loadOverview();
  }, [loadOverview]);

  const publishSection = async <K extends keyof SiteContent>(key: K, payload: SiteContent[K]) => {
    setSaving(true);
    try {
      const res = await updateSiteSection(key, payload);
      setContent((prev) => (prev ? { ...prev, [key]: res.data } : prev));
      notify('ok', `Published ${key} changes.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to publish changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (
    file: File,
    onDone: (url: string, mediaType: 'image' | 'video') => void,
  ) => {
    try {
      const res = await uploadMediaFile(file);
      onDone(res.url, res.mediaType);
      notify('ok', 'Media uploaded successfully.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Media upload failed.');
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: projectDraft.title,
        category: projectDraft.category,
        summary: projectDraft.summary,
        description: projectDraft.description,
        tools: projectDraft.toolsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        images: projectDraft.images,
        externalUrl: projectDraft.externalUrl,
        featured: projectDraft.featured,
        published: projectDraft.published,
        sortOrder: projectDraft.sortOrder,
      };
      if (editingProjectId) {
        await updateProject(editingProjectId, payload);
      } else {
        await createProject(payload);
      }
      setEditingProjectId(null);
      setProjectDraft({
        title: '',
        category: 'Graphic Design',
        summary: '',
        description: '',
        toolsText: 'Adobe Illustrator, Adobe Photoshop',
        images: [],
        externalUrl: '',
        featured: true,
        published: true,
        sortOrder: 0,
      });
      await loadOverview();
      notify('ok', 'Project saved.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Project save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFashion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingFashionId) {
        await updateFashionDesign(editingFashionId, fashionDraft);
      } else {
        await createFashionDesign(fashionDraft);
      }
      setEditingFashionId(null);
      setFashionDraft({
        title: '',
        category: 'Everyday Tailoring',
        fabric: '100% Cotton',
        summary: '',
        description: '',
        images: [],
        featured: true,
        published: true,
        sortOrder: 0,
      });
      await loadOverview();
      notify('ok', 'Fashion item saved.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Fashion save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTeaching = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTeachingId) {
        await updateTeachingItem(editingTeachingId, teachingDraft);
      } else {
        await createTeachingItem(teachingDraft);
      }
      setEditingTeachingId(null);
      setTeachingDraft({
        title: '',
        category: 'Art Class',
        studentLevel: 'Primary & Middle School',
        summary: '',
        description: '',
        images: [],
        videoUrl: '',
        featured: false,
        published: true,
        sortOrder: 0,
      });
      await loadOverview();
      notify('ok', 'Teaching item saved.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Teaching save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: kgDraft.title,
        category: kgDraft.category,
        summary: kgDraft.summary,
        note: kgDraft.note,
        ingredients: kgDraft.ingredientsText.split('\n').map((s) => s.trim()).filter(Boolean),
        steps: kgDraft.stepsText.split('\n').map((s) => s.trim()).filter(Boolean),
        images: kgDraft.images,
        featured: kgDraft.featured,
        published: kgDraft.published,
        sortOrder: kgDraft.sortOrder,
      };
      if (editingKgId) {
        await updateKitchenGardenPost(editingKgId, payload);
      } else {
        await createKitchenGardenPost(payload);
      }
      setEditingKgId(null);
      setKgDraft({
        title: '',
        category: 'Recipe',
        summary: '',
        note: '',
        ingredientsText: '',
        stepsText: '',
        images: [],
        featured: false,
        published: true,
        sortOrder: 0,
      });
      await loadOverview();
      notify('ok', 'Post saved.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    onNavigate('/studio-login');
  };

  if (loading || !data || !content) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060D1E] text-sm text-cyan-300">
        Loading Studio Admin...
      </div>
    );
  }

  const sidebarItems: Array<{
    id: AdminSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'homepage', label: 'Edit Homepage', icon: Home },
    { id: 'about', label: 'About Me', icon: User },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'projects', label: 'Projects (CRUD)', icon: FolderKanban },
    { id: 'fashion', label: 'Fashion Lookbook', icon: Scissors },
    { id: 'teaching', label: 'Teaching & Videos', icon: BookOpen },
    { id: 'kitchenGarden', label: 'Kitchen & Garden', icon: Utensils },
    { id: 'skills', label: 'Skills', icon: Wrench },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
    { id: 'messages', label: 'Contact Messages', icon: Mail, badge: data.unreadCount },
    { id: 'socialContact', label: 'Social & Contact', icon: Share2 },
    { id: 'siteSettings', label: 'Website Settings', icon: Settings },
    { id: 'users', label: 'Manage Users', icon: Users, badge: data.users.length },
    { id: 'languages', label: 'Languages', icon: Languages },
    { id: 'seo', label: 'SEO Settings', icon: Search },
  ];

  const inputCls =
    'mt-1.5 w-full rounded-xl border border-cyan-500/20 bg-[#060D1E] px-3.5 py-2.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none';
  const cardCls = 'rounded-2xl border border-cyan-500/20 bg-[#0B172E] p-6';

  return (
    <div className="flex min-h-screen flex-col bg-[#060D1E] text-slate-100 lg:flex-row">
      {/* Dedicated Admin Sidebar */}
      <aside className="w-full shrink-0 border-b border-cyan-500/20 bg-[#0B172E] p-4 lg:w-72 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-2 pb-4 border-b border-cyan-500/15">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-cyan-400 uppercase">
              Control Center
            </p>
            <h1 className="font-serif text-xl font-semibold text-white">Studio Admin</h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            title="View Live Site"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/25 text-cyan-300 hover:bg-cyan-400/10"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                  active
                    ? 'bg-cyan-400 text-[#060D1E] font-semibold'
                    : 'text-slate-300 hover:bg-[#112240] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active ? 'bg-[#060D1E]/20 text-[#060D1E]' : 'bg-cyan-400/15 text-cyan-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-cyan-500/15 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-3 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Secure Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        {toast && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
              toast.type === 'ok'
                ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{toast.text}</span>
          </div>
        )}

        {/* OVERVIEW */}
        {section === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-3xl font-semibold">Dashboard Overview</h2>
              <p className="mt-1 text-sm text-slate-400">
                Live portfolio analytics, registered users, and recent workspace events.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: 'Total Visitors', val: data.metrics.totalVisitors, icon: Eye },
                { label: 'Registered Users', val: data.metrics.totalUsers, icon: Users },
                { label: 'Total Projects', val: data.metrics.totalProjects, icon: FolderKanban },
                { label: 'Total Services', val: data.metrics.totalServices, icon: Layers },
                { label: 'Contact Messages', val: data.metrics.totalMessages, icon: Mail },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={cardCls}>
                    <div className="flex items-center justify-between text-cyan-400">
                      <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-3 font-mono text-3xl font-semibold text-white tabular-nums">
                      {stat.val}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className={cardCls}>
              <div className="flex items-center gap-2 text-cyan-300">
                <Activity className="h-4 w-4" />
                <h3 className="font-serif text-xl font-semibold text-white">Recent Activities</h3>
              </div>
              <div className="mt-4 divide-y divide-cyan-500/10">
                {data.recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-cyan-300">{act.actorName}</span>{' '}
                      <span className="text-slate-300">{act.action}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HOMEPAGE EDITOR */}
        {section === 'homepage' && (
          <div className={`${cardCls} max-w-3xl space-y-5`}>
            <h2 className="font-serif text-2xl font-semibold">Edit Homepage Hero</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">Display Name</label>
                <input
                  type="text"
                  value={content.hero.name}
                  onChange={(e) =>
                    setContent({ ...content, hero: { ...content.hero, name: e.target.value } })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Brand Name</label>
                <input
                  type="text"
                  value={content.hero.brandName}
                  onChange={(e) =>
                    setContent({ ...content, hero: { ...content.hero, brandName: e.target.value } })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">
                Rotating Roles (comma separated)
              </label>
              <input
                type="text"
                value={content.hero.roles.join(', ')}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: {
                      ...content.hero,
                      roles: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Hero Intro</label>
              <textarea
                rows={3}
                value={content.hero.intro}
                onChange={(e) =>
                  setContent({ ...content, hero: { ...content.hero, intro: e.target.value } })
                }
                className={inputCls}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">Primary CTA Label</label>
                <input
                  type="text"
                  value={content.hero.primaryCtaLabel}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, primaryCtaLabel: e.target.value },
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Secondary CTA Label</label>
                <input
                  type="text"
                  value={content.hero.secondaryCtaLabel}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, secondaryCtaLabel: e.target.value },
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('hero', content.hero)}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E] hover:bg-cyan-300"
            >
              Publish Homepage
            </button>
          </div>
        )}

        {/* ABOUT ME */}
        {section === 'about' && (
          <div className={`${cardCls} max-w-3xl space-y-5`}>
            <h2 className="font-serif text-2xl font-semibold">Update About Me</h2>
            <div>
              <label className="text-xs font-semibold text-slate-300">Section Heading</label>
              <input
                type="text"
                value={content.about.heading}
                onChange={(e) =>
                  setContent({ ...content, about: { ...content.about, heading: e.target.value } })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">
                Paragraphs (separated by blank line)
              </label>
              <textarea
                rows={6}
                value={content.about.paragraphs.join('\n\n')}
                onChange={(e) =>
                  setContent({
                    ...content,
                    about: {
                      ...content.about,
                      paragraphs: e.target.value
                        .split(/\n\s*\n/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
                className={inputCls}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">Location Label</label>
                <input
                  type="text"
                  value={content.about.locationLabel}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      about: { ...content.about, locationLabel: e.target.value },
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Portrait Image</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="text"
                    value={content.about.portraitUrl}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        about: { ...content.about, portraitUrl: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-cyan-500/20 bg-[#060D1E] px-3 py-2 text-xs"
                  />
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-300">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleUploadImage(f, (url) =>
                            setContent({
                              ...content,
                              about: { ...content.about, portraitUrl: url },
                            }),
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('about', content.about)}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish About Me
            </button>
          </div>
        )}

        {/* SERVICES */}
        {section === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold">Manage Services</h2>
              <button
                type="button"
                onClick={() =>
                  setContent({
                    ...content,
                    services: [
                      ...content.services,
                      {
                        id: `srv-${Date.now()}`,
                        number: `0${content.services.length + 1}`,
                        title: 'New Service',
                        summary: 'Describe deliverables and value.',
                        deliverables: ['Consultation', 'Delivery'],
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 px-3.5 py-2 text-xs font-semibold text-cyan-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add Service</span>
              </button>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {content.services.map((srv, idx) => (
                <div key={srv.id} className={`${cardCls} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={srv.number}
                      onChange={(e) => {
                        const next = [...content.services];
                        next[idx] = { ...srv, number: e.target.value };
                        setContent({ ...content, services: next });
                      }}
                      className="w-16 rounded-lg border border-cyan-500/20 bg-[#060D1E] px-2.5 py-1 font-mono text-xs text-cyan-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setContent({
                          ...content,
                          services: content.services.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-xs text-rose-300 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={srv.title}
                    onChange={(e) => {
                      const next = [...content.services];
                      next[idx] = { ...srv, title: e.target.value };
                      setContent({ ...content, services: next });
                    }}
                    className={inputCls}
                  />
                  <textarea
                    rows={2}
                    value={srv.summary}
                    onChange={(e) => {
                      const next = [...content.services];
                      next[idx] = { ...srv, summary: e.target.value };
                      setContent({ ...content, services: next });
                    }}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={srv.deliverables.join(', ')}
                    onChange={(e) => {
                      const next = [...content.services];
                      next[idx] = {
                        ...srv,
                        deliverables: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      };
                      setContent({ ...content, services: next });
                    }}
                    className={inputCls}
                    placeholder="Deliverables (comma separated)"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('services', content.services)}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish Services
            </button>
          </div>
        )}

        {/* PROJECTS CRUD */}
        {section === 'projects' && (
          <div className="grid gap-8 lg:grid-cols-12">
            <form onSubmit={handleSaveProject} className={`${cardCls} space-y-4 lg:col-span-5`}>
              <h2 className="font-serif text-2xl font-semibold">
                {editingProjectId ? 'Edit Project' : 'Add New Project'}
              </h2>
              <input
                type="text"
                required
                placeholder="Project title"
                value={projectDraft.title}
                onChange={(e) => setProjectDraft({ ...projectDraft, title: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                required
                placeholder="Category (e.g., Graphic Design, AI Automation)"
                value={projectDraft.category}
                onChange={(e) => setProjectDraft({ ...projectDraft, category: e.target.value })}
                className={inputCls}
              />
              <textarea
                rows={2}
                required
                placeholder="Short summary"
                value={projectDraft.summary}
                onChange={(e) => setProjectDraft({ ...projectDraft, summary: e.target.value })}
                className={inputCls}
              />
              <textarea
                rows={3}
                required
                placeholder="Full project description"
                value={projectDraft.description}
                onChange={(e) => setProjectDraft({ ...projectDraft, description: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Tools (comma separated)"
                value={projectDraft.toolsText}
                onChange={(e) => setProjectDraft({ ...projectDraft, toolsText: e.target.value })}
                className={inputCls}
              />
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-300">
                  <Upload className="h-4 w-4" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleUploadImage(f, (url) =>
                          setProjectDraft((prev) => ({ ...prev, images: [...prev.images, url] })),
                        );
                      }
                    }}
                  />
                </label>
                {projectDraft.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {projectDraft.images.map((img, i) => (
                      <div key={i} className="relative">
                        <img
                          src={img}
                          alt="preview"
                          className="h-14 w-20 rounded-lg border border-cyan-500/20 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProjectDraft((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, idx) => idx !== i),
                            }))
                          }
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-500 px-1.5 text-[10px] text-white"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={projectDraft.featured}
                    onChange={(e) => setProjectDraft({ ...projectDraft, featured: e.target.checked })}
                  />
                  <span>Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={projectDraft.published}
                    onChange={(e) =>
                      setProjectDraft({ ...projectDraft, published: e.target.checked })
                    }
                  />
                  <span>Published</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
                >
                  {editingProjectId ? 'Update Project' : 'Create Project'}
                </button>
                {editingProjectId && (
                  <button
                    type="button"
                    onClick={() => setEditingProjectId(null)}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-4 lg:col-span-7">
              {data.projects.map((p: ProjectItem) => (
                <div
                  key={p.id}
                  className={`${cardCls} flex items-center justify-between gap-4`}
                >
                  <div>
                    <span className="text-xs font-semibold text-cyan-400">{p.category}</span>
                    <h3 className="font-serif text-lg font-semibold">{p.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{p.summary}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProjectId(p.id);
                        setProjectDraft({
                          title: p.title,
                          category: p.category,
                          summary: p.summary,
                          description: p.description,
                          toolsText: p.tools.join(', '),
                          images: p.images,
                          externalUrl: p.externalUrl,
                          featured: p.featured,
                          published: p.published,
                          sortOrder: p.sortOrder,
                        });
                      }}
                      className="rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteProject(p.id);
                        await loadOverview();
                        notify('ok', 'Project deleted.');
                      }}
                      className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FASHION LOOKBOOK CRUD */}
        {section === 'fashion' && (
          <div className="grid gap-8 lg:grid-cols-12">
            <form onSubmit={handleSaveFashion} className={`${cardCls} space-y-4 lg:col-span-5`}>
              <h2 className="font-serif text-2xl font-semibold">
                {editingFashionId ? 'Edit Fashion Piece' : 'Add Fashion Piece'}
              </h2>
              <input
                type="text"
                required
                placeholder="Piece title"
                value={fashionDraft.title}
                onChange={(e) => setFashionDraft({ ...fashionDraft, title: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                required
                placeholder="Category"
                value={fashionDraft.category}
                onChange={(e) => setFashionDraft({ ...fashionDraft, category: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                required
                placeholder="Fabric"
                value={fashionDraft.fabric}
                onChange={(e) => setFashionDraft({ ...fashionDraft, fabric: e.target.value })}
                className={inputCls}
              />
              <textarea
                rows={2}
                required
                placeholder="Summary"
                value={fashionDraft.summary}
                onChange={(e) => setFashionDraft({ ...fashionDraft, summary: e.target.value })}
                className={inputCls}
              />
              <textarea
                rows={3}
                required
                placeholder="Description"
                value={fashionDraft.description}
                onChange={(e) => setFashionDraft({ ...fashionDraft, description: e.target.value })}
                className={inputCls}
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-300">
                <Upload className="h-4 w-4" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleUploadImage(f, (url) =>
                        setFashionDraft((prev) => ({ ...prev, images: [...prev.images, url] })),
                      );
                    }
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
              >
                {editingFashionId ? 'Update Piece' : 'Save Fashion Piece'}
              </button>
            </form>
            <div className="space-y-4 lg:col-span-7">
              {data.fashionDesigns.map((item: FashionDesignItem) => (
                <div key={item.id} className={`${cardCls} flex items-center justify-between gap-4`}>
                  <div>
                    <span className="text-xs font-semibold text-cyan-400">
                      {item.category} · {item.fabric}
                    </span>
                    <h3 className="font-serif text-lg font-semibold">{item.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFashionId(item.id);
                        setFashionDraft({
                          title: item.title,
                          category: item.category,
                          fabric: item.fabric,
                          summary: item.summary,
                          description: item.description,
                          images: item.images,
                          featured: item.featured,
                          published: item.published,
                          sortOrder: item.sortOrder,
                        });
                      }}
                      className="rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteFashionDesign(item.id);
                        await loadOverview();
                      }}
                      className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEACHING CRUD */}
        {section === 'teaching' && (
          <div className="grid gap-8 lg:grid-cols-12">
            <form onSubmit={handleSaveTeaching} className={`${cardCls} space-y-4 lg:col-span-5`}>
              <h2 className="font-serif text-2xl font-semibold">
                {editingTeachingId ? 'Edit Teaching Item' : 'Add Teaching Item'}
              </h2>
              <input
                type="text"
                required
                placeholder="Class or lesson title"
                value={teachingDraft.title}
                onChange={(e) => setTeachingDraft({ ...teachingDraft, title: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                required
                placeholder="Category (Art Class, Dance Class, Home Tutoring)"
                value={teachingDraft.category}
                onChange={(e) => setTeachingDraft({ ...teachingDraft, category: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                required
                placeholder="Student level"
                value={teachingDraft.studentLevel}
                onChange={(e) =>
                  setTeachingDraft({ ...teachingDraft, studentLevel: e.target.value })
                }
                className={inputCls}
              />
              <textarea
                rows={2}
                required
                placeholder="Summary"
                value={teachingDraft.summary}
                onChange={(e) => setTeachingDraft({ ...teachingDraft, summary: e.target.value })}
                className={inputCls}
              />
              <textarea
                rows={3}
                required
                placeholder="Description"
                value={teachingDraft.description}
                onChange={(e) =>
                  setTeachingDraft({ ...teachingDraft, description: e.target.value })
                }
                className={inputCls}
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-300">
                <Upload className="h-4 w-4" />
                <span>Upload Photo or Video Clip</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleUploadImage(f, (url, mediaType) => {
                        if (mediaType === 'video') {
                          setTeachingDraft((prev) => ({ ...prev, videoUrl: url }));
                        } else {
                          setTeachingDraft((prev) => ({ ...prev, images: [...prev.images, url] }));
                        }
                      });
                    }
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
              >
                {editingTeachingId ? 'Update Class' : 'Save Class'}
              </button>
            </form>
            <div className="space-y-4 lg:col-span-7">
              {data.teachingItems.map((item: TeachingClassItem) => (
                <div key={item.id} className={`${cardCls} flex items-center justify-between gap-4`}>
                  <div>
                    <span className="text-xs font-semibold text-cyan-400">{item.category}</span>
                    <h3 className="font-serif text-lg font-semibold">{item.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeachingId(item.id);
                        setTeachingDraft({
                          title: item.title,
                          category: item.category,
                          studentLevel: item.studentLevel,
                          summary: item.summary,
                          description: item.description,
                          images: item.images,
                          videoUrl: item.videoUrl,
                          featured: item.featured,
                          published: item.published,
                          sortOrder: item.sortOrder,
                        });
                      }}
                      className="rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteTeachingItem(item.id);
                        await loadOverview();
                      }}
                      className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KITCHEN & GARDEN */}
        {section === 'kitchenGarden' && (
          <div className="grid gap-8 lg:grid-cols-12">
            <form onSubmit={handleSaveKg} className={`${cardCls} space-y-4 lg:col-span-5`}>
              <h2 className="font-serif text-2xl font-semibold">
                {editingKgId ? 'Edit Recipe / Garden Note' : 'Add Recipe / Garden Note'}
              </h2>
              <input
                type="text"
                required
                placeholder="Title"
                value={kgDraft.title}
                onChange={(e) => setKgDraft({ ...kgDraft, title: e.target.value })}
                className={inputCls}
              />
              <select
                value={kgDraft.category}
                onChange={(e) => setKgDraft({ ...kgDraft, category: e.target.value })}
                className={inputCls}
              >
                <option value="Recipe">Recipe</option>
                <option value="Garden">Garden</option>
              </select>
              <textarea
                rows={2}
                required
                placeholder="Summary"
                value={kgDraft.summary}
                onChange={(e) => setKgDraft({ ...kgDraft, summary: e.target.value })}
                className={inputCls}
              />
              <textarea
                rows={3}
                placeholder="Ingredients / Supplies (one per line)"
                value={kgDraft.ingredientsText}
                onChange={(e) => setKgDraft({ ...kgDraft, ingredientsText: e.target.value })}
                className={inputCls}
              />
              <textarea
                rows={3}
                placeholder="Steps (one per line)"
                value={kgDraft.stepsText}
                onChange={(e) => setKgDraft({ ...kgDraft, stepsText: e.target.value })}
                className={inputCls}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
              >
                Save Post
              </button>
            </form>
            <div className="space-y-4 lg:col-span-7">
              {data.kitchenGardenPosts.map((post: KitchenGardenPost) => (
                <div key={post.id} className={`${cardCls} flex items-center justify-between gap-4`}>
                  <div>
                    <span className="text-xs font-semibold text-cyan-400">{post.category}</span>
                    <h3 className="font-serif text-lg font-semibold">{post.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKgId(post.id);
                        setKgDraft({
                          title: post.title,
                          category: post.category,
                          summary: post.summary,
                          note: post.note,
                          ingredientsText: post.ingredients.join('\n'),
                          stepsText: post.steps.join('\n'),
                          images: post.images,
                          featured: post.featured,
                          published: post.published,
                          sortOrder: post.sortOrder,
                        });
                      }}
                      className="rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteKitchenGardenPost(post.id);
                        await loadOverview();
                      }}
                      className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SKILLS */}
        {section === 'skills' && (
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold">Manage Skills</h2>
              <button
                type="button"
                onClick={() =>
                  setContent({
                    ...content,
                    skills: [
                      ...content.skills,
                      { id: `sk-${Date.now()}`, name: 'New Skill', category: 'Design & Video', level: 85 },
                    ],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 px-3.5 py-2 text-xs font-semibold text-cyan-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add Skill</span>
              </button>
            </div>
            <div className="space-y-3">
              {content.skills.map((sk, idx) => (
                <div key={sk.id} className={`${cardCls} grid gap-3 sm:grid-cols-12 items-center`}>
                  <input
                    type="text"
                    value={sk.name}
                    onChange={(e) => {
                      const next = [...content.skills];
                      next[idx] = { ...sk, name: e.target.value };
                      setContent({ ...content, skills: next });
                    }}
                    className="sm:col-span-5 rounded-xl border border-cyan-500/20 bg-[#060D1E] px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={sk.category}
                    onChange={(e) => {
                      const next = [...content.skills];
                      next[idx] = { ...sk, category: e.target.value };
                      setContent({ ...content, skills: next });
                    }}
                    className="sm:col-span-4 rounded-xl border border-cyan-500/20 bg-[#060D1E] px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={sk.level ?? 90}
                    onChange={(e) => {
                      const next = [...content.skills];
                      next[idx] = { ...sk, level: Number(e.target.value) };
                      setContent({ ...content, skills: next });
                    }}
                    className="sm:col-span-2 rounded-xl border border-cyan-500/20 bg-[#060D1E] px-3 py-2 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContent({ ...content, skills: content.skills.filter((_, i) => i !== idx) })
                    }
                    className="text-xs text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('skills', content.skills)}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish Skills
            </button>
          </div>
        )}

        {/* EXPERIENCE */}
        {section === 'experience' && (
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold">Manage Experience</h2>
              <button
                type="button"
                onClick={() =>
                  setContent({
                    ...content,
                    experience: [
                      {
                        id: `exp-${Date.now()}`,
                        period: '2025',
                        title: 'Role Title',
                        organization: 'Organization',
                        detail: 'Key responsibilities and achievements.',
                      },
                      ...content.experience,
                    ],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 px-3.5 py-2 text-xs font-semibold text-cyan-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add Role</span>
              </button>
            </div>
            {content.experience.map((exp, idx) => (
              <div key={exp.id} className={`${cardCls} space-y-3`}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    value={exp.period}
                    onChange={(e) => {
                      const next = [...content.experience];
                      next[idx] = { ...exp, period: e.target.value };
                      setContent({ ...content, experience: next });
                    }}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={exp.title}
                    onChange={(e) => {
                      const next = [...content.experience];
                      next[idx] = { ...exp, title: e.target.value };
                      setContent({ ...content, experience: next });
                    }}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={exp.organization}
                    onChange={(e) => {
                      const next = [...content.experience];
                      next[idx] = { ...exp, organization: e.target.value };
                      setContent({ ...content, experience: next });
                    }}
                    className={inputCls}
                  />
                </div>
                <textarea
                  rows={2}
                  value={exp.detail}
                  onChange={(e) => {
                    const next = [...content.experience];
                    next[idx] = { ...exp, detail: e.target.value };
                    setContent({ ...content, experience: next });
                  }}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    setContent({
                      ...content,
                      experience: content.experience.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-xs text-rose-300"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('experience', content.experience)}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish Experience
            </button>
          </div>
        )}

        {/* EDUCATION */}
        {section === 'education' && (
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold">Manage Education</h2>
              <button
                type="button"
                onClick={() =>
                  setContent({
                    ...content,
                    education: [
                      ...(content.education || []),
                      {
                        id: `edu-${Date.now()}`,
                        period: '2024',
                        degree: 'Certificate or Course',
                        institution: 'Institution Name',
                        detail: 'Course details.',
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 px-3.5 py-2 text-xs font-semibold text-cyan-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add Education</span>
              </button>
            </div>
            {(content.education || []).map((edu, idx) => (
              <div key={edu.id} className={`${cardCls} space-y-3`}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    value={edu.period}
                    onChange={(e) => {
                      const next = [...content.education];
                      next[idx] = { ...edu, period: e.target.value };
                      setContent({ ...content, education: next });
                    }}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => {
                      const next = [...content.education];
                      next[idx] = { ...edu, degree: e.target.value };
                      setContent({ ...content, education: next });
                    }}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => {
                      const next = [...content.education];
                      next[idx] = { ...edu, institution: e.target.value };
                      setContent({ ...content, education: next });
                    }}
                    className={inputCls}
                  />
                </div>
                <textarea
                  rows={2}
                  value={edu.detail}
                  onChange={(e) => {
                    const next = [...content.education];
                    next[idx] = { ...edu, detail: e.target.value };
                    setContent({ ...content, education: next });
                  }}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    setContent({
                      ...content,
                      education: content.education.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-xs text-rose-300"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('education', content.education || [])}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish Education
            </button>
          </div>
        )}

        {/* CERTIFICATES */}
        {section === 'certificates' && (
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold">Manage Certificates</h2>
              <button
                type="button"
                onClick={() =>
                  setContent({
                    ...content,
                    certificates: [
                      ...(content.certificates || []),
                      {
                        id: `cert-${Date.now()}`,
                        year: '2025',
                        title: 'Certificate Title',
                        issuer: 'Issuing Authority',
                        credentialCode: 'CERT-ID',
                        detail: 'Verification summary.',
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 px-3.5 py-2 text-xs font-semibold text-cyan-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add Certificate</span>
              </button>
            </div>
            {(content.certificates || []).map((cert, idx) => (
              <div key={cert.id} className={`${cardCls} space-y-3`}>
                <div className="grid gap-3 sm:grid-cols-4">
                  <input
                    type="text"
                    value={cert.year}
                    onChange={(e) => {
                      const next = [...content.certificates];
                      next[idx] = { ...cert, year: e.target.value };
                      setContent({ ...content, certificates: next });
                    }}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={cert.title}
                    onChange={(e) => {
                      const next = [...content.certificates];
                      next[idx] = { ...cert, title: e.target.value };
                      setContent({ ...content, certificates: next });
                    }}
                    className={`${inputCls} sm:col-span-2`}
                  />
                  <input
                    type="text"
                    value={cert.credentialCode}
                    onChange={(e) => {
                      const next = [...content.certificates];
                      next[idx] = { ...cert, credentialCode: e.target.value };
                      setContent({ ...content, certificates: next });
                    }}
                    className={inputCls}
                  />
                </div>
                <input
                  type="text"
                  value={cert.issuer}
                  onChange={(e) => {
                    const next = [...content.certificates];
                    next[idx] = { ...cert, issuer: e.target.value };
                    setContent({ ...content, certificates: next });
                  }}
                  className={inputCls}
                />
                <textarea
                  rows={2}
                  value={cert.detail}
                  onChange={(e) => {
                    const next = [...content.certificates];
                    next[idx] = { ...cert, detail: e.target.value };
                    setContent({ ...content, certificates: next });
                  }}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    setContent({
                      ...content,
                      certificates: content.certificates.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-xs text-rose-300"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('certificates', content.certificates || [])}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish Certificates
            </button>
          </div>
        )}

        {/* TESTIMONIALS */}
        {section === 'testimonials' && (
          <div className="max-w-4xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold">Manage Testimonials</h2>
              <button
                type="button"
                onClick={() =>
                  setContent({
                    ...content,
                    testimonials: [
                      ...(content.testimonials || []),
                      {
                        id: `test-${Date.now()}`,
                        name: 'Client or Parent Name',
                        role: 'Role / Organization',
                        quote: 'Thoughtful recommendation...',
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 px-3.5 py-2 text-xs font-semibold text-cyan-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add Testimonial</span>
              </button>
            </div>
            {(content.testimonials || []).map((item, idx) => (
              <div key={item.id} className={`${cardCls} space-y-3`}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const next = [...content.testimonials];
                      next[idx] = { ...item, name: e.target.value };
                      setContent({ ...content, testimonials: next });
                    }}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={item.role}
                    onChange={(e) => {
                      const next = [...content.testimonials];
                      next[idx] = { ...item, role: e.target.value };
                      setContent({ ...content, testimonials: next });
                    }}
                    className={inputCls}
                  />
                </div>
                <textarea
                  rows={2}
                  value={item.quote}
                  onChange={(e) => {
                    const next = [...content.testimonials];
                    next[idx] = { ...item, quote: e.target.value };
                    setContent({ ...content, testimonials: next });
                  }}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    setContent({
                      ...content,
                      testimonials: content.testimonials.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-xs text-rose-300"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('testimonials', content.testimonials || [])}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish Testimonials
            </button>
          </div>
        )}

        {/* CONTACT MESSAGES */}
        {section === 'messages' && (
          <div className="max-w-4xl space-y-4">
            <h2 className="font-serif text-2xl font-semibold">Contact Messages</h2>
            {data.messages.length === 0 ? (
              <div className={cardCls}>No contact messages received yet.</div>
            ) : (
              data.messages.map((m) => (
                <div
                  key={m.id}
                  className={`${cardCls} ${!m.isRead ? 'border-cyan-400/60' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white">{m.name}</span>{' '}
                      <span className="text-xs text-cyan-300">({m.email})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-slate-400">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await markMessageRead(m.id, !m.isRead);
                          await loadOverview();
                        }}
                        className="rounded-lg border border-cyan-500/30 px-2.5 py-1 text-cyan-300"
                      >
                        {m.isRead ? 'Mark Unread' : 'Mark Read'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteMessage(m.id);
                          await loadOverview();
                        }}
                        className="text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-cyan-200">{m.subject}</p>
                  <p className="mt-1 text-sm text-slate-300">{m.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* SOCIAL MEDIA LINKS & CONTACT */}
        {section === 'socialContact' && (
          <div className={`${cardCls} max-w-3xl space-y-5`}>
            <h2 className="font-serif text-2xl font-semibold">Contact & Social Media Links</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">Email</label>
                <input
                  type="email"
                  value={content.contact.email}
                  onChange={(e) =>
                    setContent({ ...content, contact: { ...content.contact, email: e.target.value } })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Phone</label>
                <input
                  type="text"
                  value={content.contact.phone}
                  onChange={(e) =>
                    setContent({ ...content, contact: { ...content.contact, phone: e.target.value } })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Location</label>
              <input
                type="text"
                value={content.contact.location}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, location: e.target.value },
                  })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Availability Note</label>
              <textarea
                rows={2}
                value={content.contact.availabilityNote}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, availabilityNote: e.target.value },
                  })
                }
                className={inputCls}
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Social Links
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setContent({
                      ...content,
                      contact: {
                        ...content.contact,
                        socialLinks: [
                          ...content.contact.socialLinks,
                          { id: `soc-${Date.now()}`, label: 'Platform', url: 'https://' },
                        ],
                      },
                    })
                  }
                  className="text-xs font-semibold text-cyan-300 hover:underline"
                >
                  + Add Link
                </button>
              </div>
              {content.contact.socialLinks.map((soc, idx) => (
                <div key={soc.id} className="grid gap-2 sm:grid-cols-12">
                  <input
                    type="text"
                    value={soc.label}
                    onChange={(e) => {
                      const next = [...content.contact.socialLinks];
                      next[idx] = { ...soc, label: e.target.value };
                      setContent({ ...content, contact: { ...content.contact, socialLinks: next } });
                    }}
                    className="sm:col-span-4 rounded-xl border border-cyan-500/20 bg-[#060D1E] px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={soc.url}
                    onChange={(e) => {
                      const next = [...content.contact.socialLinks];
                      next[idx] = { ...soc, url: e.target.value };
                      setContent({ ...content, contact: { ...content.contact, socialLinks: next } });
                    }}
                    className="sm:col-span-7 rounded-xl border border-cyan-500/20 bg-[#060D1E] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContent({
                        ...content,
                        contact: {
                          ...content.contact,
                          socialLinks: content.contact.socialLinks.filter((_, i) => i !== idx),
                        },
                      })
                    }
                    className="text-xs text-rose-300"
                  >
                    Del
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('contact', content.contact)}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish Contact & Socials
            </button>
          </div>
        )}

        {/* WEBSITE SETTINGS & ADMIN PASSWORD */}
        {section === 'siteSettings' && (
          <div className="max-w-3xl space-y-6">
            <div className={`${cardCls} space-y-4`}>
              <h2 className="font-serif text-2xl font-semibold">Website Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold">Brand Title</label>
                  <input
                    type="text"
                    value={content.siteSettings.brandTitle}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        siteSettings: { ...content.siteSettings, brandTitle: e.target.value },
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Default Theme</label>
                  <select
                    value={content.siteSettings.defaultTheme}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        siteSettings: {
                          ...content.siteSettings,
                          defaultTheme: e.target.value as 'dark' | 'light',
                        },
                      })
                    }
                    className={inputCls}
                  >
                    <option value="dark">Dark (Navy & Cyan)</option>
                    <option value="light">Light (Daylight)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold">Footer Note</label>
                <input
                  type="text"
                  value={content.siteSettings.footerNote}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      siteSettings: { ...content.siteSettings, footerNote: e.target.value },
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div className="flex flex-wrap gap-6 pt-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={content.siteSettings.allowRegistration}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        siteSettings: {
                          ...content.siteSettings,
                          allowRegistration: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>Allow new user registration</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={content.siteSettings.showVisitorCounter}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        siteSettings: {
                          ...content.siteSettings,
                          showVisitorCounter: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>Show public visitor counter</span>
                </label>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => publishSection('siteSettings', content.siteSettings)}
                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
              >
                Publish Website Settings
              </button>
            </div>

            <div className={`${cardCls} space-y-4`}>
              <h3 className="font-serif text-xl font-semibold">Change Admin Password</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await changeAdminPassword(adminPwForm.current, adminPwForm.next);
                    notify('ok', res.message);
                    setAdminPwForm({ current: '', next: '' });
                  } catch (err) {
                    notify('err', err instanceof Error ? err.message : 'Password change failed.');
                  }
                }}
                className="grid gap-4 sm:grid-cols-2"
              >
                <input
                  type="password"
                  required
                  placeholder="Current password"
                  value={adminPwForm.current}
                  onChange={(e) => setAdminPwForm({ ...adminPwForm, current: e.target.value })}
                  className={inputCls}
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="New password (min 8 chars)"
                  value={adminPwForm.next}
                  onChange={(e) => setAdminPwForm({ ...adminPwForm, next: e.target.value })}
                  className={inputCls}
                />
                <button
                  type="submit"
                  className="sm:col-span-2 rounded-xl border border-cyan-400/40 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10"
                >
                  Update Admin Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MANAGE USERS */}
        {section === 'users' && (
          <div className="max-w-5xl space-y-5">
            <h2 className="font-serif text-2xl font-semibold">Manage Registered Users</h2>
            {data.users.length === 0 ? (
              <div className={cardCls}>No registered users yet.</div>
            ) : (
              <div className="space-y-3">
                {data.users.map((u) => (
                  <div
                    key={u.id}
                    className={`${cardCls} flex flex-wrap items-center justify-between gap-4`}
                  >
                    <div>
                      <p className="font-semibold text-white">{u.fullName}</p>
                      <p className="text-xs text-cyan-300">{u.email}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Role: {u.role} · Status: {u.isActive ? 'Active' : 'Suspended'} · Joined{' '}
                        {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={async () => {
                          await adminUpdateUser(u.id, { isActive: !u.isActive });
                          await loadOverview();
                          notify('ok', `Updated status for ${u.fullName}.`);
                        }}
                        className="rounded-lg border border-cyan-500/30 px-3 py-1.5 text-cyan-300"
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminDeleteUser(u.id);
                          await loadOverview();
                          notify('ok', 'User deleted.');
                        }}
                        className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WEBSITE LANGUAGES */}
        {section === 'languages' && (
          <div className={`${cardCls} max-w-3xl space-y-6`}>
            <div className="flex items-center gap-2 text-cyan-300">
              <Globe className="h-5 w-5" />
              <h2 className="font-serif text-2xl font-semibold text-white">
                Manage Website Languages
              </h2>
            </div>

            <div className="flex gap-6 text-sm">
              {(['en', 'bn'] as const).map((lng) => {
                const enabled = content.siteSettings.enabledLanguages.includes(lng);
                return (
                  <label key={lng} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...content.siteSettings.enabledLanguages, lng]))
                          : content.siteSettings.enabledLanguages.filter((x) => x !== lng);
                        if (next.length > 0) {
                          setContent({
                            ...content,
                            siteSettings: { ...content.siteSettings, enabledLanguages: next },
                          });
                        }
                      }}
                    />
                    <span>{lng === 'en' ? 'English (EN)' : 'বাংলা (BN)'}</span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('siteSettings', content.siteSettings)}
              className="rounded-xl border border-cyan-400/40 px-4 py-2 text-xs font-semibold text-cyan-300"
            >
              Save Enabled Languages
            </button>

            <div className="border-t border-cyan-500/15 pt-5 space-y-4">
              <h3 className="text-sm font-semibold text-cyan-200">
                Custom Translation Overrides
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={overrideLang}
                  onChange={(e) => setOverrideLang(e.target.value as 'en' | 'bn')}
                  className={inputCls}
                >
                  <option value="en">English (en)</option>
                  <option value="bn">বাংলা (bn)</option>
                </select>
                <input
                  type="text"
                  placeholder="Key path (e.g. hero.eyebrow)"
                  value={overrideKey}
                  onChange={(e) => setOverrideKey(e.target.value)}
                  className={inputCls}
                />
                <input
                  type="text"
                  placeholder="Custom text"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!overrideKey.trim() || !overrideValue.trim()) return;
                  const currentOverrides = content.languageOverrides || { en: {}, bn: {} };
                  const next = {
                    ...currentOverrides,
                    [overrideLang]: {
                      ...(currentOverrides[overrideLang] || {}),
                      [overrideKey.trim()]: overrideValue.trim(),
                    },
                  };
                  setContent({ ...content, languageOverrides: next });
                  setOverrideValue('');
                }}
                className="rounded-xl border border-cyan-400/40 px-4 py-2 text-xs font-semibold text-cyan-300"
              >
                Add Override
              </button>

              <div className="space-y-2 text-xs">
                {(['en', 'bn'] as const).map((lng) =>
                  Object.entries((content.languageOverrides?.[lng] || {}) as Record<string, string>).map(
                    ([k, v]) => (
                      <div
                        key={`${lng}-${k}`}
                        className="flex items-center justify-between rounded-lg bg-[#060D1E] px-3 py-2"
                      >
                        <span>
                          <strong className="text-cyan-300">[{lng}]</strong> {k}: {v}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...(content.languageOverrides?.[lng] || {}) };
                            delete copy[k];
                            setContent({
                              ...content,
                              languageOverrides: {
                                ...(content.languageOverrides || { en: {}, bn: {} }),
                                [lng]: copy,
                              },
                            });
                          }}
                          className="text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    ),
                  ),
                )}
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  publishSection('languageOverrides', content.languageOverrides || { en: {}, bn: {} })
                }
                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
              >
                Publish Language Overrides
              </button>
            </div>
          </div>
        )}

        {/* SEO SETTINGS */}
        {section === 'seo' && (
          <div className={`${cardCls} max-w-3xl space-y-4`}>
            <h2 className="font-serif text-2xl font-semibold">Manage SEO Settings</h2>
            <div>
              <label className="text-xs font-semibold">Meta Title</label>
              <input
                type="text"
                value={content.seo.title}
                onChange={(e) =>
                  setContent({ ...content, seo: { ...content.seo, title: e.target.value } })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Meta Description</label>
              <textarea
                rows={3}
                value={content.seo.description}
                onChange={(e) =>
                  setContent({ ...content, seo: { ...content.seo, description: e.target.value } })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Keywords</label>
              <input
                type="text"
                value={content.seo.keywords || ''}
                onChange={(e) =>
                  setContent({ ...content, seo: { ...content.seo, keywords: e.target.value } })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold">OpenGraph Image URL</label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="text"
                  value={content.seo.ogImage || ''}
                  onChange={(e) =>
                    setContent({ ...content, seo: { ...content.seo, ogImage: e.target.value } })
                  }
                  className="w-full rounded-xl border border-cyan-500/20 bg-[#060D1E] px-3 py-2 text-xs"
                />
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-300">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleUploadImage(f, (url) =>
                          setContent({ ...content, seo: { ...content.seo, ogImage: url } }),
                        );
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => publishSection('seo', content.seo)}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#060D1E]"
            >
              Publish SEO Settings
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
export default AdminDashboard;
