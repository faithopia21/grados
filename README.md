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

## Contributing

This project is currently in private beta. Contribution guidelines will be published when the project opens for external contributions.

---

## License

Private — All rights reserved.
GradOS © 2026 Faith Olaniyi
