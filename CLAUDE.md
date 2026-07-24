# Project Instructions

## Goal
Maintain a polished, secure, responsive Kanban board built with React, TypeScript, Vite, Supabase, and dnd-kit.

## Non-negotiable requirements
- Preserve anonymous Supabase authentication.
- Preserve RLS-compatible `user_id` ownership for every task.
- Never add or expose a Supabase service-role key.
- Keep the four statuses: `todo`, `in_progress`, `in_review`, `done`.
- Keep loading, empty, validation, and error states.
- Maintain responsive behavior and keyboard-accessible controls.
- Do not add a separate backend unless clearly necessary.

## Coding standards
- Use strict TypeScript and small focused components.
- Avoid `any` and avoid silent error swallowing.
- Prefer clear state transitions and optimistic updates with rollback.
- Keep database operations in `src/lib/tasks.ts`.
- Keep shared domain types in `src/types/task.ts`.
- Run `npm run build` before declaring work complete.

## Review checklist
- Create, edit, delete, and drag tasks.
- Refresh and confirm persistence.
- Test a fresh incognito session for data isolation.
- Confirm no secrets are committed.
- Test mobile layout at 390px width.
- Confirm live deployment has correct environment variables.
