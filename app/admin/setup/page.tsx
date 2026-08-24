import Link from 'next/link'
import { requireManager } from '@/lib/auth/require-manager'
import {
  activateSchoolYear,
  createClass,
  createClosure,
  createPeriod,
  createSchoolYear,
  createSubject,
} from './actions'

type SearchParams = Promise<{ success?: string; error?: string }>

function Field({ label, name, type = 'text', placeholder, required = true, defaultValue }: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  defaultValue?: string | number
}) {
  return (
    <label className="setup-field">
      <span>{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} />
    </label>
  )
}

export default async function SetupPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, profile } = await requireManager()
  const params = await searchParams

  const [yearsResult, subjectsResult] = await Promise.all([
    supabase.from('school_years').select('id,name,starts_on,ends_on,is_active').order('starts_on', { ascending: false }),
    supabase.from('subjects').select('id,name,code,active').order('name'),
  ])

  const years = yearsResult.data ?? []
  const activeYear = years.find((year: any) => year.is_active) ?? years[0] ?? null

  const [{ data: periods }, { data: classes }, { data: closures }] = activeYear
    ? await Promise.all([
        supabase.from('periods').select('id,name,starts_on,ends_on,sequence_no').eq('school_year_id', activeYear.id).order('sequence_no'),
        supabase.from('classes').select('id,name,level,active').eq('school_year_id', activeYear.id).order('name'),
        supabase.from('school_closures').select('id,starts_on,ends_on,reason').eq('school_year_id', activeYear.id).order('starts_on'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  return (
    <main className="setup-shell">
      <header className="setup-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Paramétrage pédagogique</h1>
          <p className="muted">Configure l’année scolaire avant d’ajouter les emplois du temps et les progressions.</p>
        </div>
        <div className="setup-header-actions">
          <span className="role-pill">{profile.role === 'admin' ? 'Administrateur' : 'Animateur pédagogique'}</span>
          <Link className="secondary-button" href="/dashboard">← Tableau de bord</Link>
        </div>
      </header>

      {params.success && <div className="notice success">{params.success}</div>}
      {params.error && <div className="notice error">{params.error}</div>}

      <section className="setup-summary">
        <div className="metric-card"><span>Année active</span><strong className="setup-metric-text">{activeYear?.name ?? 'Non définie'}</strong></div>
        <div className="metric-card"><span>Périodes</span><strong>{periods?.length ?? 0}</strong></div>
        <div className="metric-card"><span>Classes</span><strong>{classes?.length ?? 0}</strong></div>
        <div className="metric-card"><span>Matières</span><strong>{subjectsResult.data?.length ?? 0}</strong></div>
      </section>

      <section className="setup-grid">
        <article className="card setup-card">
          <div className="setup-card-head"><span className="step-number">1</span><div><h2>Année scolaire</h2><p>Crée puis active l’année de travail.</p></div></div>
          <form action={createSchoolYear} className="setup-form">
            <Field label="Libellé" name="name" placeholder="2026–2027" />
            <div className="field-row">
              <Field label="Début" name="starts_on" type="date" />
              <Field label="Fin" name="ends_on" type="date" />
            </div>
            <button className="primary-button" type="submit">Créer l’année</button>
          </form>

          {years.length > 0 && <div className="compact-list">
            {years.map((year: any) => <div className="compact-list-row" key={year.id}>
              <div><strong>{year.name}</strong><span>{year.starts_on} → {year.ends_on}</span></div>
              {year.is_active ? <span className="status done">Active</span> : <form action={activateSchoolYear}><input type="hidden" name="school_year_id" value={year.id} /><button className="small-button">Activer</button></form>}
            </div>)}
          </div>}
        </article>

        <article className="card setup-card">
          <div className="setup-card-head"><span className="step-number">2</span><div><h2>Périodes</h2><p>Trimestres, séquences ou autres périodes.</p></div></div>
          {!activeYear ? <p className="empty-state">Crée d’abord une année scolaire.</p> : <>
            <form action={createPeriod} className="setup-form">
              <input type="hidden" name="school_year_id" value={activeYear.id} />
              <Field label="Nom de la période" name="name" placeholder="1er trimestre" />
              <div className="field-row">
                <Field label="Début" name="starts_on" type="date" />
                <Field label="Fin" name="ends_on" type="date" />
              </div>
              <Field label="Ordre" name="sequence_no" type="number" defaultValue={(periods?.length ?? 0) + 1} />
              <button className="primary-button" type="submit">Ajouter la période</button>
            </form>
            <div className="compact-list">
              {(periods ?? []).map((period: any) => <div className="compact-list-row" key={period.id}><div><strong>{period.sequence_no}. {period.name}</strong><span>{period.starts_on} → {period.ends_on}</span></div></div>)}
            </div>
          </>}
        </article>

        <article className="card setup-card">
          <div className="setup-card-head"><span className="step-number">3</span><div><h2>Classes</h2><p>Classes suivies par le département.</p></div></div>
          {!activeYear ? <p className="empty-state">Crée d’abord une année scolaire.</p> : <>
            <form action={createClass} className="setup-form">
              <input type="hidden" name="school_year_id" value={activeYear.id} />
              <Field label="Classe" name="name" placeholder="3e A" />
              <Field label="Niveau" name="level" placeholder="3e" required={false} />
              <button className="primary-button" type="submit">Ajouter la classe</button>
            </form>
            <div className="tag-list">{(classes ?? []).map((item: any) => <span className="data-tag" key={item.id}>{item.name}</span>)}</div>
          </>}
        </article>

        <article className="card setup-card">
          <div className="setup-card-head"><span className="step-number">4</span><div><h2>Matières</h2><p>Référentiel commun à toutes les années.</p></div></div>
          <form action={createSubject} className="setup-form">
            <Field label="Matière" name="name" placeholder="Informatique" />
            <Field label="Code" name="code" placeholder="INFO" required={false} />
            <button className="primary-button" type="submit">Ajouter la matière</button>
          </form>
          <div className="tag-list">{(subjectsResult.data ?? []).map((subject: any) => <span className="data-tag" key={subject.id}>{subject.code ? `${subject.code} · ` : ''}{subject.name}</span>)}</div>
        </article>

        <article className="card setup-card setup-card-wide">
          <div className="setup-card-head"><span className="step-number">5</span><div><h2>Calendrier des interruptions</h2><p>Jours fériés, examens ou suspension officielle des cours. Ces jours seront exclus de la génération des séances.</p></div></div>
          {!activeYear ? <p className="empty-state">Crée d’abord une année scolaire.</p> : <>
            <form action={createClosure} className="setup-form setup-form-inline">
              <input type="hidden" name="school_year_id" value={activeYear.id} />
              <Field label="Début" name="starts_on" type="date" />
              <Field label="Fin" name="ends_on" type="date" />
              <Field label="Motif" name="reason" placeholder="Fête nationale / examens / congés…" />
              <button className="primary-button" type="submit">Ajouter</button>
            </form>
            <div className="compact-list">
              {(closures ?? []).map((closure: any) => <div className="compact-list-row" key={closure.id}><div><strong>{closure.reason}</strong><span>{closure.starts_on}{closure.ends_on !== closure.starts_on ? ` → ${closure.ends_on}` : ''}</span></div></div>)}
            </div>
          </>}
        </article>
      </section>

      <section className="card next-step-card">
        <div><p className="eyebrow">Étape suivante</p><h2>Affectations et emplois du temps</h2><p className="muted">Une fois le référentiel créé, nous relierons chaque enseignant à ses classes et matières, puis nous générerons automatiquement les séances attendues.</p></div>
        <Link className="primary-button" href="/admin/schedule">Ouvrir les affectations</Link>
      </section>
    </main>
  )
}
