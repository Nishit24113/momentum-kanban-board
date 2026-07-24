# Momentum Board

A polished personal Kanban board built with React, TypeScript, Supabase Auth, Postgres, and Row Level Security.

## Highlights

- Automatic anonymous guest sessions
- Per-user task isolation enforced with Supabase RLS
- Drag-and-drop across To Do, In Progress, In Review, and Done
- Create, edit, delete, prioritize, and schedule tasks
- Search and priority filtering
- Due-date indicators and board summary statistics
- Responsive desktop and mobile layouts
- Optimistic drag updates with rollback on failure
- Loading, empty, validation, and error states

## Stack

- React + TypeScript + Vite
- Supabase Auth + Postgres
- `@dnd-kit` for accessible drag-and-drop
- Custom CSS design system
- Vercel-ready deployment

## Local setup

1. Create a Supabase project.
2. Enable anonymous sign-ins in Supabase Auth settings.
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Copy `.env.example` to `.env.local`.
5. Add your Supabase project URL and public anon/publishable key.
6. Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Production build

```bash
npm run build
npm run preview
```

## Security

- The frontend uses only the public Supabase anon/publishable key.
- The service-role key is never required and must never be committed.
- RLS policies restrict every CRUD operation to `auth.uid() = user_id`.
- Anonymous sessions use Supabase's authenticated database role.

## Deployment

Import the GitHub repository into Vercel and configure these project environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Redeploy after adding or changing environment variables.
