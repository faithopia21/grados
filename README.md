# GradOS — Graduate Application OS

> Every application. One place.

GradOS is a web application that helps graduate school applicants manage multiple university applications in one organised workspace. Track deadlines, manage documents, draft recommendation letters, and monitor your progress across all your applications.

---

## Features

- **Dashboard** — Overview of all applications with upcoming deadlines and recent activity
- **Application Workspace** — Per-school workspace with tabs for requirements, documents, notes, recommendations, and portal access
- **Deadline Tracker** — Colour-coded urgency view of all deadlines across applications
- **Document Hub** — Centralised library for SOPs, CVs, transcripts, and other documents
- **Universal Profile** — Fill your academic profile once and reuse it across applications
- **Recommendations Manager** — Draft briefing notes for recommenders and track their status
- **Dark mode** — Full light and dark theme support with persistent preference

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| Backend/Auth | Supabase |
| File Storage | Supabase Storage |
| PDF Export | jsPDF |
| Routing | React Router v7 |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js v20 or higher
- npm v10 or higher
- A Supabase project (free tier works)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/faithopia21/grados.git
cd grados
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file at the project root:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npx vite --force
```

5. Open http://localhost:5173 in your browser.

### Database Setup

Run the SQL schema in your Supabase SQL Editor.
The schema file is located at:
`supabase/GradOS Schema.sql`

---

## Project Structure

```
src/
├── app/
│   ├── components/      # Reusable UI components
│   │   └── layout/      # Sidebar, nav, header
│   └── pages/           # One file per route
│       └── auth/        # Sign in, sign up, onboarding
├── components/          # shadcn/ui components
├── data/                # Static data (universities, 
│                        # countries, research interests)
├── hooks/               # Custom React hooks
├── lib/                 # Supabase client, utilities
└── styles/              # Global CSS
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| VITE_SUPABASE_URL | Your Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Your Supabase anonymous key |

---

## Deployment

This project is deployed on Vercel. Every push to the main branch triggers an automatic deployment.

To deploy your own instance:
1. Fork the repository
2. Connect to Vercel
3. Add the environment variables in Vercel → Settings → Environment Variables
4. Deploy

---

## Roadmap

### MVP v1.0 (Current)
- [x] User authentication
- [x] Application workspace per school
- [x] Deadline tracker
- [x] Document hub with file upload
- [x] Universal applicant profile
- [x] Recommendations manager
- [x] Dark mode
- [x] Mobile responsive

### V2 (Planned)
- [ ] Email deadline reminders
- [ ] Match score based on profile
- [ ] Funding likelihood prediction
- [ ] Supervisor/professor matching
- [ ] Advisor collaboration
- [ ] Programme discovery

---

## Contributing

This project is currently in private beta. Contribution guidelines will be published when the project opens for external contributions.

---

## License

Private — All rights reserved.
GradOS © 2026 Faith Olaniyi