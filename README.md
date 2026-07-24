# Momentum Board

A polished, full-featured Kanban task board built with React, TypeScript, Supabase, and dnd-kit. Designed to feel like tools teams actually use — inspired by Linear, Asana, and Notion.

## Live Demo

[View live app →](https://momentum-kanban-board.vercel.app)

## Features

### Core
- Drag-and-drop across To Do, In Progress, In Review, and Done columns
- Automatic anonymous guest sessions (no sign-up required)
- Per-user data isolation via Supabase Row Level Security
- Task creation, editing, and deletion with validation
- Optimistic drag updates with rollback on failure

### Advanced
- **Team Members & Assignees** — Create members with colors, assign to tasks, display avatars on cards
- **Task Comments** — Chronological comments with timestamps in a detail panel
- **Activity Log** — Full history of status changes, edits, and assignments
- **Labels / Tags** — Custom color-coded labels, multi-assign, and board-level filtering
- **Due Date Indicators** — Visual urgency badges (overdue, due today, due soon)
- **Search & Filtering** — Search by title/description, filter by priority, label, or assignee
- **Board Summary / Stats** — Live counters for total, active, completed, and overdue tasks

### Design
- Clean, modern interface with Inter font and cohesive color system
- Clear visual hierarchy between columns and task cards
- Smooth drag interactions with rotation overlay
- Thoughtful empty states, loading states, error handling, and toast notifications
- Fully responsive layout — mobile horizontal scroll with snap points

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Database & Auth:** Supabase (Postgres + Auth + RLS)
- **Drag & Drop:** @dnd-kit (accessible, keyboard-friendly)
- **Icons:** Lucide React
- **Hosting:** Vercel
- **Styling:** Custom CSS design system (no framework dependencies)

## Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Nishit24113/momentum-kanban-board.git
cd momentum-kanban-board

# 2. Install dependencies
npm install

# 3. Create a Supabase project and enable anonymous sign-ins
# 4. Run supabase/schema.sql in the Supabase SQL Editor

# 5. Configure environment
cp .env.example .env.local
# Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 6. Start development server
npm run dev

# 7. Production build
npm run build
npm run preview
```

## Database Schema

See [`supabase/schema.sql`](./supabase/schema.sql) for the complete schema including:
- `tasks` — Core task data with status, priority, position, assignee
- `team_members` — Team roster with name and color
- `labels` — Custom tags with color coding
- `task_labels` — Many-to-many task/label associations
- `comments` — Chronological task discussions
- `activity_log` — Full audit trail of all task changes

All tables have Row Level Security enabled with policies restricting access to the authenticated user's own data.

## Security

- Only the public Supabase anon key is used (safe for frontend)
- No service-role key is committed or required
- RLS enforces `auth.uid() = user_id` on all CRUD operations
- Anonymous sessions use Supabase's `authenticated` database role
- Environment files are excluded from version control

## Deployment

Import the GitHub repository into Vercel and set:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Framework detection: Vite. Build command: `npm run build`. Output: `dist`.
