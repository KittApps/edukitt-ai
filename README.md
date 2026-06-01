# EduKitt AI — Free Edition

**EduKitt AI** is a self-hosted, AI-powered learning platform. Turn any topic, document, or syllabus into structured courses, lessons, quizzes, and quick-learn cards — using the AI provider of your choice.

This repository contains the **Free Edition** source code. A full-featured **Pro Edition** is also available at [edukittai.com](https://edukittai.com).

**Live demo:** [https://edukittai.com/](https://edukittai.com/)

---

## What is EduKitt AI?

EduKitt AI is a complete learning platform you install on your own server. After setup, you control users, subscription plans, AI credits, branding, themes, and content. Connect your own AI API keys and run your own AI learning product — from a personal project to a full SaaS.

Built for learners, educators, and operators who want a production-ready foundation without building everything from scratch.

---

## Free vs Pro

EduKitt AI is available in two editions:

| | **Free Edition** (this repo) | **Pro Edition** |
|---|---|---|
| AI Courses | ✓ | ✓ |
| Quick Learn | ✓ | ✓ |
| Quizzes | ✓ | ✓ |
| Content Library | ✓ | ✓ |
| Course Certificates | ✓ | ✓ |
| Admin Console | ✓ | ✓ |
| Subscription & Credits (Stripe) | ✓ | ✓ |
| Multi-language & Themes | ✓ | ✓ |
| AI Providers (OpenAI, Anthropic, Gemini, etc.) | ✓ | ✓ |
| **Exam Papers** (MCQ, structured, essay + AI grading) | — | ✓ |
| **Notebooks** (organize content + AI chat) | — | ✓ |
| **In-lesson AI Tutor** | — | ✓ |
| **PayPal & Razorpay** payment gateways | — | ✓ |

**[Upgrade to Pro →](https://edukittai.com)**

---

## Features

### Learning app

- **AI-generated content** — courses, quick learns, and quizzes powered by your connected AI providers
- **Structured courses** — modules and lessons with rich content (math, diagrams, tables, code highlighting)
- **Quick Learn** — instant single-topic lessons from a prompt
- **Quizzes** — generate quizzes and track attempts
- **Library** — browse and search all your content in one place
- **Certificates** — verifiable PDF certificates on course completion
- **Personalization** — multiple themes and localization support

### Admin & operations

- **User management** — accounts, plans, and credits
- **AI Providers** — connect OpenAI, Anthropic, Google Gemini, DeepSeek, xAI, OpenRouter, or Ollama
- **AI Content settings** — assign models and edit prompts per AI task
- **Plans & credit packs** — subscription tiers and one-off top-ups
- **Analytics** — revenue, AI token usage, cost, and failure dashboards
- **CMS pages** — terms, privacy, about, and custom pages
- **Localization** — translation manager with import/export

### Public website

- Landing page, pricing page, contact form, and legal pages — ready out of the box

---

## Tech stack

| Layer | Stack |
|---|---|
| Back-end | PHP 8.3+, Laravel 13, Inertia Laravel 2 |
| Front-end | React 18, TypeScript, Tailwind CSS 4, Vite 8 |
| Payments | Laravel Cashier (Stripe) |
| Queue | Database driver (default) or Redis + Horizon |
| AI | Laravel AI (provider-agnostic) |
| Database | MySQL, MariaDB, PostgreSQL, or SQLite |

---

## Requirements

| Requirement | Minimum |
|---|---|
| PHP | 8.3+ |
| PHP extensions | `pdo`, `openssl`, `mbstring`, `tokenizer`, `ctype`, `json`, `fileinfo`, `curl`, `xml`, `bcmath` |
| Database | MySQL 8 / MariaDB 10.4+ / PostgreSQL 13+ / SQLite 3.35+ |
| Web server | Apache or Nginx — **document root must point to `/public`** |
| Writable paths | `storage/` (recursive) and project root (for `.env` creation) |

**Optional (recommended for production):**

- Redis — for cache, sessions, and queue workers
- SMTP — for transactional email
- Stripe account — for subscriptions and credit purchases
- AI provider API key — required for AI generation features

**Only needed if you modify front-end assets:**

- Composer
- Node.js 18+

---

## Installation

EduKitt AI ships with a browser-based installer. Most setups take under five minutes.

1. Clone or download this repository to your server.
2. Point your domain's document root to the `public/` directory.
3. Ensure `storage/` and the project root are writable (`chmod -R 775 storage` on Linux).
4. Open `https://yourdomain.com/install` in your browser and follow the wizard.
5. After installation, **delete the `public/install/` directory** for security.

For server requirements, manual installation, post-install setup, and production configuration, see the **[online documentation](https://edukittai.com/documentation)**.

---

## Local development

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed

npm install
composer dev
```

The `composer dev` script runs the PHP server, queue listener, log tail, and Vite dev server concurrently.

Run tests:

```bash
composer test
```

---

## Documentation

This repository contains application source code only. Full installation, configuration, and operator guides are hosted online:

**[https://edukittai.com/documentation](https://edukittai.com/documentation)**

Topics covered include installation, AI providers, prompt tuning, the credits system, queue setup, application settings, and more.

---

## Project structure

```
app/                  AI agents, controllers, models, services
config/               Framework and app configuration
database/             Migrations and seeders
public/               Web root (point Apache/Nginx here)
public/install/       Browser installer (remove after setup)
resources/js/         React + TypeScript front-end (Inertia pages)
resources/css/        Themes and design tokens
routes/               Web, admin, and API routes
storage/              Logs, uploads, and generated files
```

---

## Support

Questions, install help, or feedback — use our contact form:

**[https://kittapps.com/contact](https://kittapps.com/contact)**

---

## License

This project is licensed under the [EduKitt AI Free Edition License](LICENSE).

You may use, modify, and self-host this software for personal or commercial learning platforms. Redistribution or resale of the software as a standalone product or template is not permitted without written permission.

The **Pro Edition** (Exam Papers, Notebooks, AI Tutor, PayPal/Razorpay) is separate proprietary software — available at **[edukittai.com](https://edukittai.com)**.

---

<p align="center">
  <a href="https://edukittai.com">Website</a> ·
  <a href="https://edukittai.com/">Live Demo</a> ·
  <a href="https://kittapps.com/contact">Contact</a>
</p>
