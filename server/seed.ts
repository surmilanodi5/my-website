import bcrypt from 'bcryptjs';
import { db } from './db.ts';
import type {
  FashionDesignItem,
  KitchenGardenPost,
  ProjectItem,
  SiteContent,
  TeachingClassItem,
  UserPreferences,
} from '../src/types/portfolio.ts';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
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

export const DEFAULT_SITE_CONTENT: SiteContent = {
  seo: {
    title: 'Surmila Nodi — Most. Surmila Akter | Creative Portfolio',
    description:
      'Portfolio of Most. Surmila Akter (Surmila Nodi) from Gaibandha, Bangladesh. Fashion design, art and dance teaching, home tutoring, graphic design, YouTube editing, and n8n AI automation.',
    keywords:
      'Surmila Nodi, Most. Surmila Akter, Fashion Designer Gaibandha, Art and Dance Teacher, Graphic Designer Bangladesh, n8n Automation, Telegram AI Bot',
    ogImage: '/seed-assets/surmila_portrait_1794637916648.jpg',
  },
  hero: {
    name: 'Most. Surmila Akter',
    brandName: 'Surmila Nodi',
    roles: [
      'Fashion Designer',
      'Art and Dance Teacher',
      'Graphic & Logo Designer',
      'n8n & AI Automation Creator',
    ],
    intro:
      'Weaving together industrial tailoring precision, expressive art and dance education, graphic design, and calm AI automation from Gaibandha, Bangladesh.',
    primaryCtaLabel: 'Explore Portfolio',
    secondaryCtaLabel: 'Hire Me',
  },
  about: {
    heading: 'One continuous thread across fabric, classroom, and screen.',
    paragraphs: [
      'My creative practice begins with physical craft. Trained in industrial sewing through the Bangladesh Technical Education Board (National Skill Certificate, NTVQF Level-II, 2022) alongside RMG production processes and workplace safety, I learned how every garment relies on patience, clean seam lines, and steady attention.',
      'Beyond the atelier, I work as an Art and Dance Teacher at Zoom Bangladesh School—guiding students through structured drawing lessons and expressive choreography—and as a one-to-one Home Tutor helping young learners build academic confidence. Digitally, I pair Adobe Photoshop and Illustrator with YouTube video editing, n8n workflows, Google AI Studio, and Telegram AI chatbots.',
    ],
    portraitUrl: '/seed-assets/surmila_portrait_1794637916648.jpg',
    portraitAlt: 'Editorial studio portrait of Most. Surmila Akter in natural light',
    locationLabel: 'Gaibandha, Bangladesh',
  },
  services: [
    {
      id: 'srv-fashion',
      number: '01',
      title: 'Fashion Design & Tailoring',
      summary:
        'Custom cotton, linen, and traditional silhouettes drafted with NTVQF Level-II industrial sewing precision and clean hand-stitched finishes.',
      deliverables: ['Custom Garments', 'Pattern Drafting', 'Quality Stitching'],
    },
    {
      id: 'srv-teaching',
      number: '02',
      title: 'Art, Dance & Home Tutoring',
      summary:
        'Structured drawing and dance instruction for school groups, plus patient one-to-one academic tutoring tailored to each student.',
      deliverables: ['Drawing & Color', 'Cultural Dance', 'One-to-One Tutoring'],
    },
    {
      id: 'srv-graphic',
      number: '03',
      title: 'Graphic, Logo & YouTube Editing',
      summary:
        'Editorial brand marks, print layouts, and retention-focused YouTube video editing backed by SEO research and visual storytelling.',
      deliverables: ['Logo & Brand Systems', 'Adobe Suite', 'YouTube SEO & Cuts'],
    },
    {
      id: 'srv-ai',
      number: '04',
      title: 'n8n Automation & Telegram Bots',
      summary:
        'Practical workflow automations built with n8n, Google AI Studio, and Telegram Bot API to simplify daily communication and publishing.',
      deliverables: ['n8n Pipelines', 'Google AI Studio', 'Telegram Chatbots'],
    },
  ],
  teaching: {
    heading: 'Art & Dance Instruction and Home Tutoring',
    summary:
      'At Zoom Bangladesh School, I teach drawing and dance through structured lesson plans and hands-on studio activities. Alongside classroom teaching, I provide one-to-one Home Tutoring to help students strengthen core subjects and build steady study habits.',
    approach:
      'Every lesson begins with curiosity and structure—breaking complex shapes, rhythms, or school topics into calm, repeatable steps so learners gain real confidence through practice.',
    institutions: [
      {
        id: 'inst-zoom',
        institution: 'Zoom Bangladesh School',
        role: 'Art and Dance Teacher',
        levels: 'Primary to Middle School',
        subjects: 'Drawing, Sketching, Color Harmony, Folk & Classical Dance',
        scheduleNote: 'Structured lessons & practical stage activities',
      },
      {
        id: 'inst-tutor',
        institution: 'Private Home Tutoring',
        role: 'Home Tutor',
        levels: 'School Learners (One-to-One)',
        subjects: 'General Academic Support, Homework Guidance & Exam Readiness',
        scheduleNote: 'Personalized at-home sessions in Gaibandha',
      },
    ],
  },
  skills: [
    { id: 'sk-sew', name: 'Industrial Sewing & Garment Assembly (NTVQF II)', category: 'Fashion & Craft', level: 95 },
    { id: 'sk-rmg', name: 'RMG Production Processes & Workplace Safety', category: 'Fashion & Craft', level: 92 },
    { id: 'sk-art', name: 'Drawing, Painting & Art Pedagogy', category: 'Teaching & Arts', level: 94 },
    { id: 'sk-dance', name: 'Choreography & Youth Dance Instruction', category: 'Teaching & Arts', level: 90 },
    { id: 'sk-tutor', name: 'One-to-One Academic Home Tutoring', category: 'Teaching & Arts', level: 95 },
    { id: 'sk-ps', name: 'Adobe Photoshop', category: 'Design & Video', level: 90 },
    { id: 'sk-ai', name: 'Adobe Illustrator', category: 'Design & Video', level: 88 },
    { id: 'sk-yt', name: 'YouTube Video Editing, Automation & SEO', category: 'Design & Video', level: 88 },
    { id: 'sk-n8n', name: 'n8n Workflow Automation', category: 'AI & Office Tools', level: 89 },
    { id: 'sk-gas', name: 'Google AI Studio', category: 'AI & Office Tools', level: 90 },
    { id: 'sk-tg', name: 'Telegram Bot API', category: 'AI & Office Tools', level: 86 },
    { id: 'sk-ms', name: 'Microsoft Office Suite', category: 'AI & Office Tools', level: 94 },
  ],
  experience: [
    {
      id: 'exp-zoom',
      period: 'Present',
      title: 'Art and Dance Teacher',
      organization: 'Zoom Bangladesh School',
      detail:
        'Teaching structured drawing, color studies, and dance choreography through practical classroom activities and student showcases.',
    },
    {
      id: 'exp-tutor',
      period: 'Present',
      title: 'Private Home Tutor',
      organization: 'Gaibandha, Bangladesh',
      detail:
        'Delivering individualized one-to-one academic support at students’ homes, strengthening comprehension and measurable school outcomes.',
    },
    {
      id: 'exp-yt',
      period: '2024',
      title: 'YouTube Automation, SEO & AI Workflow Training',
      organization: 'Freelance Digital Training',
      detail:
        'Completed training in YouTube automation and SEO alongside ongoing applied AI workflow development using n8n, Google AI Studio, and Telegram Bot API.',
    },
    {
      id: 'exp-wisp',
      period: '2023',
      title: 'Women IT Service Provider Training',
      organization: 'ICT Skill Development Program',
      detail:
        'Trained in Adobe Photoshop, Adobe Illustrator, MS Office, and digital freelancing workflows.',
    },
    {
      id: 'exp-ntvqf',
      period: '2022',
      title: 'National Skill Certificate — Sewing Machine Operation (NTVQF Level-II)',
      organization: 'Bangladesh Technical Education Board (BTEB)',
      detail:
        'Certified in industrial sewing machine operation, RMG production processes, stitch quality, and workplace safety.',
    },
  ],
  education: [
    {
      id: 'edu-1',
      period: 'Ongoing',
      degree: 'Applied AI & Digital Automation Studies',
      institution: 'Continuous Self-Directed & ICT Workshops',
      detail:
        'Focused on workflow orchestration with n8n, prompt engineering in Google AI Studio, and Telegram Bot API integration.',
    },
    {
      id: 'edu-2',
      period: '2022',
      degree: 'Basic Computer & Graphic Design Trade Course',
      institution: 'Gaibandha Govt. Technical School & College',
      detail:
        'Foundational computer literacy, office productivity tools, vector illustration, and image editing fundamentals.',
    },
    {
      id: 'edu-3',
      period: '2022',
      degree: 'Vocational Industrial Sewing & Garment Trade',
      institution: 'BTEB Accredited Technical Center',
      detail:
        'Structured practical assessment covering pattern handling, machine calibration, seam strength, and garment finishing.',
    },
  ],
  certificates: [
    {
      id: 'cert-ntvqf',
      year: '2022',
      title: 'National Skill Certificate in Sewing Machine Operation (NTVQF Level-II)',
      issuer: 'Bangladesh Technical Education Board (BTEB)',
      credentialCode: 'NTVQF-L2-2022',
      detail: 'Verified national competency in industrial garment assembly, seam quality, and workplace safety.',
    },
    {
      id: 'cert-wisp',
      year: '2023',
      title: 'Women IT Service Provider Program',
      issuer: 'ICT Freelancing & Digital Empowerment Program',
      credentialCode: 'WISP-2023',
      detail: 'Completed specialized training in graphic design (Photoshop & Illustrator), MS Office, and client readiness.',
    },
    {
      id: 'cert-yt',
      year: '2024',
      title: 'YouTube Automation & Search Engine Optimization',
      issuer: 'Digital Media & Freelancing Institute',
      credentialCode: 'YT-SEO-2024',
      detail: 'Certified in video pacing, visual packaging, thumbnail hierarchy, and YouTube SEO growth workflows.',
    },
    {
      id: 'cert-firstaid',
      year: 'Active',
      title: 'Community First Aid & Emergency Response',
      issuer: 'Bangladesh Red Crescent Society',
      credentialCode: 'BDRCS-FA',
      detail: 'Trained in community first aid preparedness, emergency care, and humanitarian field coordination.',
    },
  ],
  testimonials: [
    {
      id: 'test-1',
      name: 'School Coordinator',
      role: 'Zoom Bangladesh School',
      quote:
        'Surmila brings remarkable patience and creativity to every art and dance period. Students look forward to her structured drawing activities and stage rehearsals.',
    },
    {
      id: 'test-2',
      name: 'Parent Guardian',
      role: 'Gaibandha Home Tutoring',
      quote:
        'Through calm one-to-one tutoring, she helped our child gain consistent study habits and stronger confidence across daily schoolwork.',
    },
    {
      id: 'test-3',
      name: 'Digital Freelance Client',
      role: 'Brand & n8n Automation Project',
      quote:
        'Clean graphic assets paired with an automated Telegram enquiry pipeline—delivered on schedule with thoughtful communication.',
    },
  ],
  volunteer: [
    {
      id: 'vol-rc',
      organization: 'Bangladesh Red Crescent Society',
      role: 'First Aid Trained Volunteer',
      description:
        'Completed certified first aid training and supported community preparedness and humanitarian relief activities.',
      year: 'Active',
    },
    {
      id: 'vol-socheton',
      organization: 'Socheton Gaibandha',
      role: 'Community Volunteer',
      description:
        'Participating in local civic awareness, youth encouragement, and neighborhood support initiatives across Gaibandha.',
      year: 'Active',
    },
    {
      id: 'vol-zoom',
      organization: 'Zoom Bangladesh',
      role: 'Volunteer Educator & Mentor',
      description:
        'Contributing creative arts activities and supportive mentorship for underserved students.',
      year: 'Active',
    },
    {
      id: 'vol-rover',
      organization: 'Rover Scout',
      role: 'Scout Member',
      description:
        'Practicing disciplined community service, teamwork, outdoor leadership, and civic responsibility.',
      year: 'Member',
    },
  ],
  contact: {
    email: 'surmilanodi5@gmail.com',
    phone: '01731803024',
    location: 'Gaibandha, Bangladesh',
    availabilityNote:
      'Open to custom tailoring enquiries, art & dance classes, home tutoring, graphic design, video editing, and n8n automation projects.',
    socialLinks: [
      { id: 'soc-email', label: 'Email', url: 'mailto:surmilanodi5@gmail.com' },
      { id: 'soc-behance', label: 'Behance', url: 'https://www.behance.net' },
      { id: 'soc-linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com' },
      { id: 'soc-telegram', label: 'Telegram', url: 'https://t.me' },
    ],
  },
  siteSettings: {
    brandTitle: 'Surmila Nodi',
    defaultTheme: 'dark',
    defaultAccent: 'cyan',
    defaultLanguage: 'en',
    enabledLanguages: ['en', 'bn'],
    allowRegistration: true,
    showVisitorCounter: true,
    footerNote: 'Portfolio & Studio — Gaibandha, Bangladesh',
  },
  languageOverrides: {
    en: {},
    bn: {},
  },
};

const SEED_FASHION: Array<Omit<FashionDesignItem, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    slug: 'forest-linen-topstitch-ensemble',
    title: 'Botanical Linen Topstitch Ensemble',
    category: 'Everyday Tailoring',
    fabric: '100% Breathable Handloom Linen',
    summary:
      'Relaxed mandarin-collar tunic and straight trouser finished with contrast ivory topstitching.',
    description:
      'Drafted and sewn using clean industrial flat-felled seams and contrast ivory thread detailing along the placket, cuffs, and hem. Designed for warm-weather comfort with an understated, structured drape.',
    images: ['/seed-assets/fashion_lookbook_1_1794638908208.jpg'],
    featured: true,
    published: true,
    sortOrder: 1,
  },
  {
    slug: 'muslin-sage-capsule-study',
    title: 'Unbleached Muslin & Sage Capsule',
    category: 'Bespoke Craft',
    fabric: 'Handloom Muslin & Fine Cotton',
    summary:
      'Layered natural-fiber silhouettes exploring balanced sleeve volume and clean bias-bound necklines.',
    description:
      'An exploration of natural cotton weights and calm earthy dye tones. Pattern blocks prioritize movement, durable French seams, and breathable comfort suited for daily studio wear.',
    images: ['/seed-assets/fashion_lookbook_2_1794638907787.jpg'],
    featured: true,
    published: true,
    sortOrder: 2,
  },
];

const SEED_TEACHING: Array<Omit<TeachingClassItem, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    slug: 'botanical-sketching-and-color-study',
    title: 'Foundational Drawing & Botanical Watercolor',
    category: 'Art Class',
    studentLevel: 'Ages 7 – 14 · Zoom Bangladesh School',
    summary:
      'Guided observational sketching, pencil shading, and gentle watercolor wash exercises.',
    description:
      'Students practice breaking natural leaves, flowers, and everyday objects into simple geometric lines before adding layered watercolor tones. Encourages focus, hand control, and creative confidence.',
    images: ['/seed-assets/teaching_art_dance_1794638908901.jpg'],
    videoUrl: '',
    featured: true,
    published: true,
    sortOrder: 1,
  },
  {
    slug: 'rhythm-and-cultural-dance-workshop',
    title: 'Rhythm, Posture & Cultural Dance Practice',
    category: 'Dance Class',
    studentLevel: 'Beginner & Intermediate · Zoom Bangladesh School',
    summary:
      'Warm-up coordination, rhythmic footwork, and expressive group choreography for school programs.',
    description:
      'Structured movement sessions combining rhythm counting, expressive hand gestures (mudras), posture alignment, and collaborative stage choreography for school celebrations.',
    images: ['/seed-assets/teaching_art_dance_1794638908901.jpg'],
    videoUrl: '',
    featured: true,
    published: true,
    sortOrder: 2,
  },
  {
    slug: 'one-to-one-home-tutoring-support',
    title: 'One-to-One Academic Home Tutoring',
    category: 'Home Tutoring',
    studentLevel: 'Primary & Secondary Students · Gaibandha',
    summary:
      'Calm, individualized home lessons focused on core subject clarity, daily practice, and exam readiness.',
    description:
      'Tailored one-to-one sessions at the student’s home. Each plan adapts to the learner’s pace with regular revision notes, structured homework guidance, and steady progress checks.',
    images: ['/seed-assets/teaching_art_dance_1794638908901.jpg'],
    videoUrl: '',
    featured: false,
    published: true,
    sortOrder: 3,
  },
];

const SEED_PROJECTS: Array<Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    slug: 'hart-and-seam-atelier-identity',
    title: 'Hart & Seam Textile Brand Identity',
    category: 'Logo & Branding',
    summary:
      'Bespoke monogram, cotton stationery suite, and packaging direction inspired by stitched linen craft.',
    description:
      'A calm visual identity created in Adobe Illustrator and Photoshop. Pairs an engraved-style serif monogram with deep cotton stationery and clear print specifications.',
    tools: ['Adobe Illustrator', 'Adobe Photoshop', 'Print Guidelines'],
    images: ['/seed-assets/project_brand_identity_1794637917583.jpg'],
    externalUrl: '',
    featured: true,
    published: true,
    sortOrder: 1,
  },
  {
    slug: 'rural-harvest-documentary-cut',
    title: 'YouTube Documentary Edit & SEO Packaging',
    category: 'YouTube Editing',
    summary:
      'Narrative assembly, warm color balance, and search-aligned metadata strategy for YouTube growth.',
    description:
      'Complete YouTube post-production including rough-to-final story cut, audio leveling, title cards, thumbnail design, and keyword optimization learned through YouTube Automation & SEO training.',
    tools: ['YouTube Studio', 'Adobe Photoshop', 'SEO Research'],
    images: ['/seed-assets/project_youtube_editorial_1794637917682.jpg'],
    externalUrl: '',
    featured: true,
    published: true,
    sortOrder: 2,
  },
  {
    slug: 'n8n-telegram-client-intake-pipeline',
    title: 'n8n Lead Router & Telegram AI Assistant',
    category: 'AI Automation',
    summary:
      'Automated n8n workflow linking form submissions to Google AI Studio summaries and Telegram Bot alerts.',
    description:
      'End-to-end automation built with n8n webhooks, Google AI Studio structured prompts, and the Telegram Bot API to summarize client enquiries and deliver organized notifications in real time.',
    tools: ['n8n', 'Google AI Studio', 'Telegram Bot API'],
    images: ['/seed-assets/project_ai_workflow_1794637918806.jpg'],
    externalUrl: '',
    featured: true,
    published: true,
    sortOrder: 3,
  },
  {
    slug: 'gaibandha-civic-poster-series',
    title: 'Community Workshop & Event Posters',
    category: 'Graphic Design',
    summary:
      'High-clarity bilingual print and social layouts for local youth training and volunteer campaigns.',
    description:
      'Modular poster and social graphic templates produced in Adobe Illustrator and Photoshop with balanced whitespace and clean typographic hierarchy.',
    tools: ['Adobe Illustrator', 'Adobe Photoshop', 'MS Office'],
    images: ['/seed-assets/project_brand_identity_1794637917583.jpg'],
    externalUrl: '',
    featured: false,
    published: true,
    sortOrder: 4,
  },
];

const SEED_KITCHEN_GARDEN: Array<Omit<KitchenGardenPost, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    slug: 'quick-homemade-burger-and-fries',
    title: 'Quick Homemade Burger & Crispy Fries',
    category: 'Recipe',
    summary:
      'Juicy pan-seared spiced patty on toasted buns paired with crisp, double-fried hand-cut potatoes.',
    note: 'A favorite weekend comfort meal made from simple pantry spices—best served immediately while the fries are crisp.',
    ingredients: [
      '2 soft burger buns, lightly toasted with butter',
      '250g minced chicken or beef with garlic, black pepper & paprika',
      '2 medium potatoes, cut into thin even strips',
      'Fresh lettuce leaves, sliced tomato & onion rings',
      '2 tbsp mayonnaise mixed with chili sauce & pinch of salt',
    ],
    steps: [
      'Soak cut potato strips in cold water for 15 minutes, then pat completely dry.',
      'Season minced meat with crushed garlic, pepper, salt, and a touch of soy sauce; shape into two flat patties.',
      'Sear patties on a medium-hot skillet for 3–4 minutes per side until cooked through.',
      'Fry potatoes until pale gold, rest 3 minutes, then flash-fry a second time for extra crunch.',
      'Layer toasted buns with sauce, crisp greens, warm patty, and serve alongside hot fries.',
    ],
    images: ['/seed-assets/kitchen_homemade_burger_1794638909338.jpg'],
    featured: true,
    published: true,
    sortOrder: 1,
  },
  {
    slug: 'steamed-homemade-momos-and-sandwiches',
    title: 'Steamed Garden-Herb Momos',
    category: 'Recipe',
    summary:
      'Delicate hand-pleated dumplings filled with finely chopped vegetables, ginger, and fresh herbs.',
    note: 'Pleating momos feels remarkably close to gathering fabric pleats—steady rhythm makes every fold neat.',
    ingredients: [
      '1.5 cups all-purpose flour & warm water for smooth dough',
      '1 cup finely shredded cabbage, carrot & spring onion',
      '1 tsp grated fresh ginger & minced garlic',
      '1 tbsp soy sauce, black pepper & fresh coriander leaves',
    ],
    steps: [
      'Knead flour with warm water and a pinch of salt into a firm, smooth dough; rest 20 minutes.',
      'Combine finely chopped vegetables, ginger, garlic, soy sauce, and fresh herbs in a bowl.',
      'Roll small dough balls into thin circles, place a spoonful of filling in the center, and pleat edges closed.',
      'Steam over simmering water for 10–12 minutes until wrappers turn translucent and glossy.',
    ],
    images: ['/seed-assets/kitchen_homemade_burger_1794638909338.jpg'],
    featured: false,
    published: true,
    sortOrder: 2,
  },
  {
    slug: 'morning-terracotta-herb-garden',
    title: 'Terracotta Herbs & Morning Marigolds',
    category: 'Garden',
    summary:
      'Growing culinary mint, coriander, chilies, and seasonal marigolds in clay pots at home.',
    note: 'Tending plants each morning brings quiet focus before starting pattern drafting or classroom prep.',
    ingredients: [
      'Breathable clay terracotta pots with drainage holes',
      'Loamy garden soil blended with organic compost & coco peat',
      'Cuttings & seeds: mint, basil, green chili, marigold',
    ],
    steps: [
      'Layer small broken clay shards at the bottom of each pot for clean drainage.',
      'Fill with loose, compost-rich soil and plant herb cuttings or seeds at shallow depth.',
      'Place in morning sunlight and water gently at the soil base whenever the top inch feels dry.',
      'Pinch back growing tips regularly to encourage fuller, healthier leaves.',
    ],
    images: ['/seed-assets/garden_terrace_greens_1794638909311.jpg'],
    featured: true,
    published: true,
    sortOrder: 3,
  },
];

export function seedDatabase(): void {
  const now = new Date().toISOString();

  const insertIfMissing = db.prepare(`
    INSERT OR IGNORE INTO site_content (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  const entries = Object.entries(DEFAULT_SITE_CONTENT) as Array<[keyof SiteContent, unknown]>;
  for (const [key, value] of entries) {
    insertIfMissing.run(key, JSON.stringify(value), now);
  }

  // Ensure default visitor counter metric exists
  db.prepare(
    `INSERT OR IGNORE INTO site_metrics (key, count, updated_at) VALUES ('total_visitors', 148, ?)`,
  ).run(now);

  const fashionCount = (db.prepare('SELECT COUNT(*) as c FROM fashion_designs').get() as { c: number }).c;
  if (fashionCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO fashion_designs (
        slug, title, category, fabric, summary, description, images,
        featured, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of SEED_FASHION) {
      stmt.run(
        item.slug,
        item.title,
        item.category,
        item.fabric,
        item.summary,
        item.description,
        JSON.stringify(item.images),
        item.featured ? 1 : 0,
        item.published ? 1 : 0,
        item.sortOrder,
        now,
        now,
      );
    }
  }

  const teachingCount = (db.prepare('SELECT COUNT(*) as c FROM teaching_items').get() as { c: number }).c;
  if (teachingCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO teaching_items (
        slug, title, category, student_level, summary, description, images,
        video_url, featured, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of SEED_TEACHING) {
      stmt.run(
        item.slug,
        item.title,
        item.category,
        item.studentLevel,
        item.summary,
        item.description,
        JSON.stringify(item.images),
        item.videoUrl,
        item.featured ? 1 : 0,
        item.published ? 1 : 0,
        item.sortOrder,
        now,
        now,
      );
    }
  }

  const projectCount = (db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number }).c;
  if (projectCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO projects (
        slug, title, category, summary, description, tools, images,
        external_url, featured, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of SEED_PROJECTS) {
      stmt.run(
        p.slug,
        p.title,
        p.category,
        p.summary,
        p.description,
        JSON.stringify(p.tools),
        JSON.stringify(p.images),
        p.externalUrl,
        p.featured ? 1 : 0,
        p.published ? 1 : 0,
        p.sortOrder,
        now,
        now,
      );
    }
  }

  const kgCount = (db.prepare('SELECT COUNT(*) as c FROM kitchen_garden_posts').get() as { c: number }).c;
  if (kgCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO kitchen_garden_posts (
        slug, title, category, summary, note, ingredients, steps, images,
        featured, published, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const post of SEED_KITCHEN_GARDEN) {
      stmt.run(
        post.slug,
        post.title,
        post.category,
        post.summary,
        post.note,
        JSON.stringify(post.ingredients),
        JSON.stringify(post.steps),
        JSON.stringify(post.images),
        post.featured ? 1 : 0,
        post.published ? 1 : 0,
        post.sortOrder,
        now,
        now,
      );
    }
  }

  // Bootstrap admin credentials strictly from server environment variables.
  const envUser = process.env.ADMIN_USERNAME?.trim();
  const envEmail = process.env.ADMIN_EMAIL?.trim() || (envUser && envUser.includes('@') ? envUser : 'surmilanodi5@gmail.com');
  const envPass = process.env.ADMIN_PASSWORD;

  if (envUser && envPass) {
    const existing = db
      .prepare('SELECT id, username, email, password_overridden FROM admin_users LIMIT 1')
      .get() as { id: number; username: string; email: string; password_overridden: number } | undefined;

    if (!existing) {
      const hash = bcrypt.hashSync(envPass, 12);
      db.prepare(
        `INSERT INTO admin_users (username, email, password_hash, password_overridden, failed_attempts, locked_until, updated_at)
         VALUES (?, ?, ?, 0, 0, NULL, ?)`,
      ).run(envUser, envEmail.toLowerCase(), hash, now);
    } else {
      if (!existing.email && envEmail) {
        db.prepare('UPDATE admin_users SET email = ? WHERE id = ?').run(envEmail.toLowerCase(), existing.id);
      }
      if (existing.password_overridden === 0 && existing.username !== envUser) {
        const hash = bcrypt.hashSync(envPass, 12);
        db.prepare(
          `UPDATE admin_users SET username = ?, email = ?, password_hash = ?, updated_at = ? WHERE id = ?`,
        ).run(envUser, envEmail.toLowerCase(), hash, now, existing.id);
      }
    }
  }
}
