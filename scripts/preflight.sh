#!/usr/bin/env bash
set -euo pipefail

printf '\n[1/4] Production build\n'
npm run build

printf '\n[2/4] Secret scan\n'
if grep -RInE 'service[_-]?role|SUPABASE_SERVICE|eyJ[a-zA-Z0-9_-]{40,}' . \
  --exclude-dir=.git --exclude-dir=node_modules --exclude='*.md' --exclude='.env.example'; then
  echo 'Potential secret-like content found. Review before pushing.'
  exit 1
else
  echo 'No obvious service-role or JWT-like secrets found.'
fi

printf '\n[3/4] Forbidden private files\n'
if git ls-files | grep -E 'assessment-private|Internship Assessment|NP SDE Assessment|\.env($|\.)'; then
  echo 'A private assessment or environment file is tracked. Remove it before pushing.'
  exit 1
else
  echo 'No private assessment or environment files are tracked.'
fi

printf '\n[4/4] Git status\n'
git status --short
printf '\nPreflight completed. Manual Supabase, incognito, mobile, and live deployment tests are still required.\n'
