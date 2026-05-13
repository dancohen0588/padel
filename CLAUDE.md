# Padel Tournament — CLAUDE.md

## Project Overview

Web application for managing padel tournaments: registration, team management, pools, brackets, rankings, and results.

- **URL**: https://padel-two-theta.vercel.app
- **Stack**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Vercel Blob (images)
- **Deployment**: Vercel

## Architecture

```
src/
  app/
    (home)/         # Public home page
    admin/          # Admin dashboard (tournament management)
    inscription/    # Player registration flow
    tournoi/        # Tournament public display (brackets, pools)
    ranking/        # Player rankings
    tournaments/    # Tournament list
    api/            # API routes (Next.js Route Handlers)
    actions/        # Server Actions
database/
  migrations/       # SQL migration files
  schema.sql        # Full DB schema
  seed.sql          # Seed data
```

## Key Features

- **Player registration**: Individual or with a partner, waitlist, payment tracking
- **Team management**: Seeding, pairing, status (approved / pending / waitlist)
- **Tournament formats**: Pools + playoff bracket, consolation bracket
- **Admin panel**: Manage players, teams, scores, tournament config
- **Real-time display**: Live brackets and pool standings

## Database (Supabase / PostgreSQL)

Main tables: `players`, `teams`, `tournaments`, `pools`, `matches`, `registrations`, `payments`

Connection via the `postgres` package (not the Supabase JS client for server queries).

## Development

```bash
npm run dev       # Start local dev server (port 3000)
npm run build     # Production build
npx tsc --noEmit  # Type check
```

Environment variables in `.env.local`:
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token

## Coding Guidelines

- **Server Components by default**: use `"use client"` only when necessary (interactivity, hooks)
- **Server Actions** for mutations (`src/app/actions/`)
- **API routes** for external integrations or complex logic
- **TypeScript strict**: type all props, DB results and API responses
- **Tailwind** for all styling — no inline styles
- **Minimal changes**: prefer targeted edits over large rewrites
- **Verify before completing**: always check for TypeScript errors after edits

## Agents Available

Use these specialized sub-agents for focused tasks:
- `@planner` — feature planning and architecture
- `@front-builder` — React/Next.js UI implementation
- `@back-builder` — API routes and server actions
- `@debugger` — systematic bug resolution
- `@reviewer` — code review
- `@ui-ux-designer` — UX/UI recommendations
- `@security-auditor` — security review
- `@documenter` — documentation
- `@seo` — SEO and GEO optimization
