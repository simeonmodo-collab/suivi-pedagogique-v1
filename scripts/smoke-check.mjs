import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const required=[
  'app/login/page.tsx','app/dashboard/page.tsx','app/today/page.tsx','app/progress/page.tsx',
  'app/absences/page.tsx','app/wall/page.tsx','app/statistics/page.tsx','app/teachers/page.tsx',
  'app/timetable/page.tsx','app/reports/page.tsx','app/admin/setup/page.tsx','app/admin/schedule/page.tsx',
  'app/admin/programs/page.tsx','app/admin/users/page.tsx','lib/performance.ts','components/AppShell.tsx',
  'supabase/migrations/001_initial_schema.sql','supabase/migrations/002_setup_hardening.sql','supabase/migrations/003_v1_completion.sql'
]
let failed=false
for(const f of required){if(!fs.existsSync(path.join(root,f))){console.error(`MANQUANT: ${f}`);failed=true}}
const schema=fs.readFileSync(path.join(root,'supabase/migrations/001_initial_schema.sql'),'utf8')+fs.readFileSync(path.join(root,'supabase/migrations/003_v1_completion.sql'),'utf8')
for(const token of ['create table public.sessions','create table public.absences','create table public.wall_posts','view public.v_assignment_program_coverage','create or replace view public.v_session_details','enable row level security']){
  if(!schema.toLowerCase().includes(token.toLowerCase())){console.error(`SQL attendu absent: ${token}`);failed=true}
}
const shell=fs.readFileSync(path.join(root,'components/AppShell.tsx'),'utf8')
for(const route of ['/dashboard','/today','/progress','/absences','/wall','/statistics','/reports']){
  if(!shell.includes(route)){console.error(`Navigation absente: ${route}`);failed=true}
}
if(failed){process.exit(1)}
console.log(`Smoke check OK — ${required.length} fichiers clés présents, navigation et schéma V1 détectés.`)
