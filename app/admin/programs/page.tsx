import Link from 'next/link'
import { requireManager } from '@/lib/auth/require-manager'
import { createChapter, createLesson, createProgram } from './actions'

type SearchParams = Promise<{ success?: string; error?: string }>

function Field({ label, name, type = 'text', required = true }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="setup-field"><span>{label}</span><input name={name} type={type} required={required} /></label>
}
function Select({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return <label className="setup-field"><span>{label}</span><select name={name} required>{children}</select></label>
}

export default async function ProgramsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireManager()
  const params = await searchParams
  const { data: year } = await supabase.from('school_years').select('id,name').eq('is_active', true).maybeSingle()
  const classes = year ? (await supabase.from('classes').select('id,name').eq('school_year_id', year.id).eq('active', true).order('name')).data ?? [] : []
  const { data: subjects } = await supabase.from('subjects').select('id,name,code').eq('active', true).order('name')
  const programs = year ? (await supabase.from('programs').select('id,title,class_id,subject_id,classes(name),subjects(name,code)').eq('school_year_id', year.id).order('title')).data ?? [] : []
  const programIds = programs.map((p: any) => p.id)
  const chapters = programIds.length ? (await supabase.from('program_chapters').select('id,program_id,title,sequence_no').in('program_id', programIds).order('program_id').order('sequence_no')).data ?? [] : []
  const chapterIds = chapters.map((c: any) => c.id)
  const lessons = chapterIds.length ? (await supabase.from('program_lessons').select('id,chapter_id,title,sequence_no,expected_date,planned_minutes').in('chapter_id', chapterIds).order('chapter_id').order('sequence_no')).data ?? [] : []

  return <main className="setup-shell">
    <header className="setup-header"><div><p className="eyebrow">Administration</p><h1>Programmes & progression</h1><p className="muted">Définis les chapitres et leçons qui serviront au calcul de couverture du programme.</p></div><div className="setup-header-actions"><Link className="secondary-button" href="/admin/schedule">Affectations</Link><Link className="secondary-button" href="/dashboard">← Tableau de bord</Link></div></header>
    {params.success && <div className="notice success">{params.success}</div>}
    {params.error && <div className="notice error">{params.error}</div>}
    {!year && <div className="notice warning">Active d’abord une année scolaire.</div>}

    <section className="setup-grid">
      <article className="card setup-card"><div className="setup-card-head"><span className="step-number">1</span><div><h2>Créer un programme</h2><p>Un programme correspond à une classe et une matière.</p></div></div>
        {year && <form action={createProgram} className="setup-form"><input type="hidden" name="school_year_id" value={year.id}/><div className="field-row"><Select label="Classe" name="class_id"><option value="">Sélectionner…</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</Select><Select label="Matière" name="subject_id"><option value="">Sélectionner…</option>{(subjects??[]).map((s:any)=><option key={s.id} value={s.id}>{s.code ? `${s.code} · ` : ''}{s.name}</option>)}</Select></div><Field label="Intitulé" name="title"/><button className="primary-button">Créer</button></form>}
      </article>

      <article className="card setup-card"><div className="setup-card-head"><span className="step-number">2</span><div><h2>Ajouter un chapitre</h2><p>Les chapitres structurent les leçons dans l’ordre pédagogique.</p></div></div>
        <form action={createChapter} className="setup-form"><Select label="Programme" name="program_id"><option value="">Sélectionner…</option>{programs.map((p:any)=><option key={p.id} value={p.id}>{p.classes?.name} · {p.subjects?.name}</option>)}</Select><div className="field-row"><Field label="Ordre" name="sequence_no" type="number"/><Field label="Titre du chapitre" name="title"/></div><button className="primary-button" disabled={!programs.length}>Ajouter</button></form>
      </article>

      <article className="card setup-card setup-card-wide"><div className="setup-card-head"><span className="step-number">3</span><div><h2>Ajouter une leçon</h2><p>La date prévue permet de comparer la progression attendue et la progression réelle.</p></div></div>
        <form action={createLesson} className="schedule-form-grid lesson-form"><Select label="Chapitre" name="chapter_id"><option value="">Sélectionner…</option>{chapters.map((c:any)=>{ const p:any=programs.find((x:any)=>x.id===c.program_id); return <option key={c.id} value={c.id}>{p?.classes?.name} · {p?.subjects?.name} · {c.sequence_no}. {c.title}</option> })}</Select><Field label="Ordre" name="sequence_no" type="number"/><Field label="Date prévue" name="expected_date" type="date" required={false}/><Field label="Durée (min)" name="planned_minutes" type="number" required={false}/><Field label="Titre de la leçon" name="title"/><button className="primary-button schedule-submit" disabled={!chapters.length}>Ajouter la leçon</button></form>
      </article>

      <article className="card setup-card setup-card-wide"><div className="section-title"><div><p className="eyebrow">Référentiel</p><h2>Programmes enregistrés</h2></div><span className="status upcoming">{lessons.length} leçon(s)</span></div>
        <div className="program-admin-list">{programs.map((p:any)=><section key={p.id} className="program-admin-item"><h3>{p.classes?.name} · {p.subjects?.name}</h3><p className="muted">{p.title}</p>{chapters.filter((c:any)=>c.program_id===p.id).map((c:any)=><div key={c.id} className="chapter-admin"><strong>{c.sequence_no}. {c.title}</strong><ul>{lessons.filter((l:any)=>l.chapter_id===c.id).map((l:any)=><li key={l.id}>{l.sequence_no}. {l.title}{l.expected_date ? ` · prévu le ${l.expected_date}` : ''}</li>)}</ul></div>)}</section>)}{!programs.length && <p className="empty-state">Aucun programme enregistré.</p>}</div>
      </article>
    </section>
  </main>
}
