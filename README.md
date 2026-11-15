# Most. Surmila Akter — Portfolio & Studio CMS

Personal portfolio and private studio management system for **Most. Surmila Akter** — Fashion Designer, Art and Dance Teacher, Home Tutor, and Creative Freelancer from Gaibandha, Bangladesh.

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Three.js (scroll-morphing and color-shifting flowing fabric & needlework scene), GSAP ScrollTrigger, Lenis smooth scrolling.
- **Backend**: Express (`server.ts`) with SQLite (`better-sqlite3`), bcrypt password hashing, JWT `httpOnly` cookie sessions, double-submit CSRF protection, rate limiting, Helmet security headers, and validated image/video uploads (`multer` + magic-byte checks).
- **Database Schema** (`server/db.ts`):
  - `site_content`: JSON blocks for `seo`, `hero`, `about`, `services`, `teaching`, `skills`, `experience`, `volunteer`, and `contact`.
  - `fashion_designs`: Tailored lookbook entries with fabric, category, multi-image gallery, featured/published/sort order.
  - `projects`: Design and digital work (graphic design, logos, YouTube editing, n8n workflows, Telegram AI chatbots).
  - `teaching_items`: Art, dance, and home tutoring highlights with optional short MP4/WebM video clips.
  - `kitchen_garden_posts`: Homemade recipe cards and garden notes with ingredients, steps, and photos.
  - `messages`: Contact form submissions with read/unread state and timestamp.
  - `admin_users`: Bcrypt-hashed admin credentials and failed-attempt lockout tracking.

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set your private server credentials and secret in `.env` (or in your hosting platform's environment variables / secrets manager):
   - `ADMIN_USERNAME`: Your private admin username
   - `ADMIN_PASSWORD`: Your strong admin password
   - `JWT_SECRET`: A long random string (at least 32 characters)
   - `PORT`: `3000`
   - `DB_PATH`: `./data/portfolio.db`

3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```
   For production:
   ```bash
   npm run build
   npm start
   ```

## How to Log In & Edit Content

1. Navigate directly to `/studio-login` (this route is unlinked from the public portfolio and blocked from search indexing via `robots.txt` and `noindex` headers).
2. Sign in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` configured in your server environment.
3. Inside `/studio-admin`:
   - **Inbox**: Read incoming contact submissions, toggle read/unread status, or delete messages.
   - **Collections & Posts**: Add, edit, delete, reorder, mark featured, upload multiple images or short MP4/WebM clips, and publish or save drafts for **Fashion Designs**, **Design & Digital**, **Teaching & Videos**, and **Kitchen & Garden**.
   - **Site Content**: Edit Hero (including rotating roles), About (including portrait photo upload), Teaching details & institutions, Services, Skills, Experience, Volunteer work, Contact & Social Links, and SEO title/description.
   - **Settings**: Change your admin password at any time (stored as a bcrypt hash on the server).
