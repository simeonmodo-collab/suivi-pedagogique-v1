import Link from 'next/link'
import { requireManager } from '@/lib/auth/require-manager'
import { createAssignment, createTimetableSlot, generateExpectedSessions, linkTeacher } from './actions'

type SearchParams = Promise<{ success?: string; error?: string }>

const weekdays = [
  [1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi'], [7, 'Dimanche'],
] as const

function Select({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return <label className="setup-field"><span>{label}</span><select name={name} required>{children}</select></label>
}

function Input({ label, name, type = 'text', placeholder, required = true, step }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; step?: string
}) {
  return <label className="setup-field"><span>{label}</span><input name={name} type={type} placeholder={placeholder} required={required} step={step} /></label>
}

function teacherName(item: any) {
  return item?.profiles?.full_name || 'Enseignant sans nom'
}

export default async function ScheduleAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireManager()
  const params = await searchParams

  const { data: activeYear } = await supabase
    .from('school_years')
    .select('id,name,starts_on,ends_on')
    .eq('is_active', true)
    .maybeSingle()

  const [{ data: profiles }, { data: teachers }, { data: subjects }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,email,role,active').eq('active', true).order('full_name'),
    supabase.from('teachers').select('id,profile_id,employee_code,specialty,profiles(full_name,email)').order('created_at'),
    supabase.from('subjects').select('id,name,code').eq('active', true).order('name'),
  ])

  const classes = activeYear
    ? (await supabase.from('classes').select('id,name,level').eq('school_year_id', activeYear.id).eq('active', true).order('name')).data ?? []
    : []

  const assignments = activeYear
    ? (await supabase
        .from('teacher_assignments')
        .select('id,planned_weekly_minutes,teachers(id,profiles(full_name)),classes(name),subjects(name,code)')
        .eq('school_year_id', activeYear.id)
        .order('id')).data ?? []
    : []

  const assignmentIds = assignments.map((a: any) => a.id)
  const slots = assignmentIds.length
    ? (await supabase
        .from('timetable_slots')
        .select('id,assignment_id,weekday,start_time,end_time,room,effective_from,effective_to')
        .in('assignment_id', assignmentIds)
        .order('weekday')
        .order('start_time')).data ?? []
    : []

  const linkedProfileIds = new Set((teachers ?? []).map((teacher: any) => teacher.profile_id))
  const availableProfiles = (profiles ?? []).filter((profile: any) => !linkedProfileIds.has(profile.id) && ['teacher', 'pedagogical_lead', 'admin'].includes(profile.role))
  const assignmentById = new Map(assignments.map((item: any) => [item.id, item]))

  return <main className="setup-shell">
    <header className="setup-header">
      <div><p className="eyebrow">Administration</p><h1>Affectations & emploi du temps</h1><p className="muted">Relie les enseignants aux classes, puis transforme l’emploi du temps en séances attendues.</p></div>
      <div className="setup-header-actions"><Link className="secondary-button" href="/admin/setup">Paramétrage</Link><Link className="secondary-button" href="/dashboard">← Tableau de bord</Link></div>
    </header>

    {params.success && <div className="notice success">{params.success}</div>}
    {params.error && <div className="notice error">{params.error}</div>}
    {!activeYear && <div className="notice warning">Aucune année scolaire active. Commence par le paramétrage.</div>}

    <section className="setup-summary">
      <div className="metric-card"><span>Année active</span><strong className="setup-metric-text">{activeYear?.name ?? '—'}</strong></div>
      <div className="metric-card"><span>Enseignants</span><strong>{teachers?.length ?? 0}</strong></div>
      <div className="metric-card"><span>Affectations</span><strong>{assignments.length}</strong></div>
      <div className="metric-card"><span>Créneaux hebdo.</span><strong>{slots.length}</strong></div>
    </section>

    <section className="setup-grid">
      <article className="card setup-card">
        <div className="setup-card-head"><span className="step-number">1</span><div><h2>Enseignants du département</h2><p>Associe un compte utilisateur existant à une fiche enseignant.</p></div></div>
        {availableProfiles.length === 0 ? <p className="empty-state">Aucun nouveau compte disponible. Les comptes sont d’abord créés dans Supabase Auth.</p> : <form action={linkTeacher} className="setup-form">
          <Select label="Utilisateur" name="profile_id"><option value="">Sélectionner…</option>{availableProfiles.map((profile: any) => <option key={profile.id} value={profile.id}>{profile.full_name || profile.email}</option>)}</Select>
          <div className="field-row"><Input label="Matricule" name="employee_code" required={false} /><Input label="Téléphone" name="phone" required={false} /></div>
          <Input label="Spécialité" name="specialty" placeholder="Informatique" required={false} />
          <button className="primary-button">Ajouter l’enseignant</button>
        </form>}
        <div className="compact-list">{(teachers ?? []).map((teacher: any) => <div className="compact-list-row" key={teacher.id}><div><strong>{teacherName(teacher)}</strong><span>{teacher.specialty || 'Spécialité non renseignée'}{teacher.employee_code ? ` · ${teacher.employee_code}` : ''}</span></div></div>)}</div>
      </article>

      <article className="card setup-card">
        <div className="setup-card-head"><span className="step-number">2</span><div><h2>Affectations pédagogiques</h2><p>Qui enseigne quoi, dans quelle classe et avec quel volume hebdomadaire ?</p></div></div>
        {!activeYear || !teachers?.length || !classes.length || !subjects?.length ? <p className="empty-state">Il faut une année active, au moins un enseignant, une classe et une matière.</p> : <form action={createAssignment} className="setup-form">
          <input type="hidden" name="school_year_id" value={activeYear.id} />
          <Select label="Enseignant" name="teacher_id"><option value="">Sélectionner…</option>{teachers.map((teacher: any) => <option key={teacher.id} value={teacher.id}>{teacherName(teacher)}</option>)}</Select>
          <div className="field-row">
            <Select label="Classe" name="class_id"><option value="">Sélectionner…</option>{classes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
            <Select label="Matière" name="subject_id"><option value="">Sélectionner…</option>{subjects.map((item: any) => <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ''}{item.name}</option>)}</Select>
          </div>
          <Input label="Heures prévues par semaine" name="weekly_hours" type="number" step="0.5" placeholder="2" />
          <button className="primary-button">Créer l’affectation</button>
        </form>}
        <div className="compact-list">{assignments.map((item: any) => <div className="compact-list-row" key={item.id}><div><strong>{item.teachers?.profiles?.full_name || 'Enseignant'} · {item.classes?.name}</strong><span>{item.subjects?.name} · {(item.planned_weekly_minutes / 60).toLocaleString('fr-FR')} h/semaine</span></div></div>)}</div>
      </article>

      <article className="card setup-card setup-card-wide">
        <div className="setup-card-head"><span className="step-number">3</span><div><h2>Créneaux de l’emploi du temps</h2><p>Chaque créneau hebdomadaire servira de modèle pour générer les séances du calendrier.</p></div></div>
        {assignments.length === 0 ? <p className="empty-state">Crée d’abord une affectation pédagogique.</p> : <form action={createTimetableSlot} className="schedule-form-grid">
          <Select label="Affectation" name="assignment_id"><option value="">Sélectionner…</option>{assignments.map((item: any) => <option key={item.id} value={item.id}>{item.teachers?.profiles?.full_name} · {item.classes?.name} · {item.subjects?.name}</option>)}</Select>
          <Select label="Jour" name="weekday"><option value="">Jour…</option>{weekdays.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select>
          <Input label="Début" name="start_time" type="time" />
          <Input label="Fin" name="end_time" type="time" />
          <Input label="Salle" name="room" placeholder="Salle info 1" required={false} />
          <Input label="Valide à partir du" name="effective_from" type="date" required={false} />
          <Input label="Valide jusqu’au" name="effective_to" type="date" required={false} />
          <button className="primary-button schedule-submit">Ajouter le créneau</button>
        </form>}

        <div className="schedule-table-wrap"><table className="data-table"><thead><tr><th>Jour</th><th>Heure</th><th>Enseignant</th><th>Classe</th><th>Matière</th><th>Salle</th></tr></thead><tbody>
          {slots.map((slot: any) => { const assignment: any = assignmentById.get(slot.assignment_id); return <tr key={slot.id}><td>{weekdays.find(([day]) => day === slot.weekday)?.[1]}</td><td>{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</td><td>{assignment?.teachers?.profiles?.full_name || '—'}</td><td>{assignment?.classes?.name || '—'}</td><td>{assignment?.subjects?.name || '—'}</td><td>{slot.room || '—'}</td></tr> })}
          {slots.length === 0 && <tr><td colSpan={6} className="empty-cell">Aucun créneau enregistré.</td></tr>}
        </tbody></table></div>
      </article>

      <article className="card setup-card setup-card-wide generator-card">
        <div><p className="eyebrow">Automatisation</p><h2>Générer les séances attendues</h2><p className="muted">La génération utilise l’emploi du temps et ignore les interruptions officielles déjà enregistrées. Une seconde génération de la même période ne crée pas de doublons.</p></div>
        {activeYear && <form action={generateExpectedSessions} className="generator-form"><Input label="Du" name="from" type="date" /><Input label="Au" name="to" type="date" /><button className="primary-button">Générer les séances</button></form>}
      </article>
    </section>
  </main>
}
