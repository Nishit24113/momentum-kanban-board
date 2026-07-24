# Technical Steering

Stack:
- React 18
- TypeScript
- Vite
- Supabase Auth and Postgres
- dnd-kit
- Custom CSS

Commands:
- `npm install`
- `npm run dev`
- `npm run build`

Architecture:
- `src/lib/supabase.ts`: client configuration
- `src/lib/tasks.ts`: database operations
- `src/types/task.ts`: task domain model
- `src/components`: reusable UI
- `supabase/schema.sql`: schema, indexes, trigger, grants, and RLS policies
