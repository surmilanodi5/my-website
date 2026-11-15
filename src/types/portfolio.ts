export interface SeoConfig {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
}

export interface HeroContent {
  name: string;
  brandName: string;
  roles: string[];
  intro: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

export interface AboutContent {
  heading: string;
  paragraphs: string[];
  portraitUrl: string;
  portraitAlt: string;
  locationLabel: string;
}

export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  summary: string;
  deliverables: string[];
}

export interface TeachingInstitution {
  id: string;
  institution: string;
  role: string;
  levels: string;
  subjects: string;
  scheduleNote: string;
}

export interface TeachingContent {
  heading: string;
  summary: string;
  approach: string;
  institutions: TeachingInstitution[];
}

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  level?: number;
}

export interface ExperienceItem {
  id: string;
  period: string;
  title: string;
  organization: string;
  detail: string;
}

export interface EducationItem {
  id: string;
  period: string;
  degree: string;
  institution: string;
  detail: string;
}

export interface CertificateItem {
  id: string;
  year: string;
  title: string;
  issuer: string;
  credentialCode: string;
  detail: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  quote: string;
}

export interface VolunteerItem {
  id: string;
  organization: string;
  role: string;
  description: string;
  year: string;
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

export interface ContactContent {
  email: string;
  phone: string;
  location: string;
  availabilityNote: string;
  socialLinks: SocialLink[];
}

export type AccentPreset = 'cyan' | 'sky' | 'emerald' | 'teal';

export interface SiteSettingsConfig {
  brandTitle: string;
  defaultTheme: 'dark' | 'light';
  defaultAccent: AccentPreset;
  defaultLanguage: 'en' | 'bn';
  enabledLanguages: Array<'en' | 'bn'>;
  allowRegistration: boolean;
  showVisitorCounter: boolean;
  footerNote: string;
}

export interface LanguageOverrides {
  en: Record<string, string>;
  bn: Record<string, string>;
}

export interface SiteContent {
  seo: SeoConfig;
  hero: HeroContent;
  about: AboutContent;
  services: ServiceItem[];
  teaching: TeachingContent;
  skills: SkillItem[];
  experience: ExperienceItem[];
  education: EducationItem[];
  certificates: CertificateItem[];
  testimonials: TestimonialItem[];
  volunteer: VolunteerItem[];
  contact: ContactContent;
  siteSettings: SiteSettingsConfig;
  languageOverrides: LanguageOverrides;
}

export interface FashionDesignItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  fabric: string;
  summary: string;
  description: string;
  images: string[];
  featured: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  tools: string[];
  images: string[];
  externalUrl: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingClassItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  studentLevel: string;
  summary: string;
  description: string;
  images: string[];
  videoUrl: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenGardenPost {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  note: string;
  ingredients: string[];
  steps: string[];
  images: string[];
  featured: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: number;
  userId?: number | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserPreferences {
  language: 'en' | 'bn';
  themeMode: 'dark' | 'light';
  accent: AccentPreset;
  fontSize: 'sm' | 'md' | 'lg';
  reducedMotion: boolean;
  highContrast: boolean;
  enhancedFocus: boolean;
  compactCards: boolean;
  rememberLanguage: boolean;
  notifications: {
    emailReplies: boolean;
    newProjects: boolean;
    securityAlerts: boolean;
  };
  privacy: {
    showProfileInNav: boolean;
    allowAnalytics: boolean;
  };
}

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  role: 'user' | 'admin';
  avatarUrl: string;
  phone: string;
  location: string;
  bio: string;
  preferences: UserPreferences;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotification {
  id: number;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLogItem {
  id: number;
  actorType: string;
  actorName: string;
  action: string;
  createdAt: string;
}

export interface UserDashboardPayload {
  user: UserProfile;
  savedProjectIds: number[];
  savedProjects: ProjectItem[];
  favoriteServiceIds: string[];
  favoriteServices: ServiceItem[];
  contactHistory: ContactMessage[];
  notifications: UserNotification[];
  activities: ActivityLogItem[];
}

export interface AdminUserSummary {
  id: number;
  fullName: string;
  email: string;
  role: 'user' | 'admin';
  avatarUrl: string;
  phone: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminMetrics {
  totalVisitors: number;
  totalUsers: number;
  totalProjects: number;
  totalServices: number;
  totalMessages: number;
  unreadMessages: number;
}

export interface AdminOverviewPayload {
  metrics: AdminMetrics;
  recentActivities: ActivityLogItem[];
  content: SiteContent;
  fashionDesigns: FashionDesignItem[];
  projects: ProjectItem[];
  teachingItems: TeachingClassItem[];
  kitchenGardenPosts: KitchenGardenPost[];
  messages: ContactMessage[];
  users: AdminUserSummary[];
  unreadCount: number;
}

export interface PublicPortfolioPayload {
  content: SiteContent;
  fashionDesigns: FashionDesignItem[];
  projects: ProjectItem[];
  teachingItems: TeachingClassItem[];
  kitchenGardenPosts: KitchenGardenPost[];
  visitorCount?: number;
}
