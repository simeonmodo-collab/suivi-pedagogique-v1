import AppShell from '@/components/AppShell'
import { requireMember, roleLabels } from '@/lib/auth/require-member'
import { localDateISO, formatDate, shortTime } from '@/lib/date'
import { validateSession } from './actions'

type SP = Promise<{ date?: string; success?: string; error?: string }>

const statusLabels: Record<string,string> = {
  planned:'À confirmer', in_progress:'En cours', done:'Effectué', partial:'Partiel', missed:'Non effectué', postponed:'Reporté', cancelled_school:'Annulé établissement'
}
const statusClass: Record<string,string> = {done:'done',partial:'pending',missed:'missed',postponed:'upcoming',cancelled_school:'upcoming',planned:'pending',in_progress:'pending'}

export default async function TodayPage({searchParams}:{searchParams:SP}) {
  const { supabase, profile, isManager } = await requireMember()
  const canValidate = profile.role !== 'management_viewer'
  const params = await searchParams
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date! : localDateISO()

  const { data: sessions } = await supabase
    .from('v_session_details')
    .select('*')
    .eq('scheduled_date', date)
    .order('planned_start')

  const assignmentIds = [...new Set((sessions ?? []).map((s:any)=>s.assignment_id))]
  const assignments = assignmentIds.length ? (await supabase.from('teacher_assignments').select('id,school_year_id,class_id,subject_id').in('id', assignmentIds)).data ?? [] : []
  const years = [...new Set(assignments.map((a:any)=>a.school_year_id))]
  const programs = years.length ? (await supabase.from('programs').select('id,school_year_id,class_id,subject_id,program_chapters(id,title,sequence_no,program_lessons(id,title,sequence_no,expected_date))').in('school_year_id', years)).data ?? [] : []

  function lessonsFor(session:any) {
    const program:any = programs.find((p:any)=>p.school_year_id===session.school_year_id && p.class_id===session.class_id && p.subject_id===session.subject_id)
    const lessons:any[] = (program?.program_chapters ?? []).flatMap((c:any)=>(c.program_lessons??[]).map((l:any)=>({...l,chapter:c.title,chapterNo:c.sequence_no})))
    return lessons.sort((a,b)=>(a.chapterNo-b.chapterNo)||(a.sequence_no-b.sequence_no))
  }

  return <AppShell name={profile.full_name||'Collègue'} roleLabel={roleLabels[profile.role]} active="/today" isManager={isManager}>
    <header className="page-header"><div><p className="eyebrow">Suivi quotidien</p><h1>Aujourd’hui / séances</h1><p className="muted">Consulte les cours prévus et confirme ce qui a réellement été effectué.</p></div><form className="date-filter" method="get"><label>Date<input name="date" type="date" defaultValue={date}/></label><button className="secondary-button">Afficher</button></form></header>
    {params.success && <div className="notice success">{params.success}</div>}{params.error && <div className="notice error">{params.error}</div>}
    <div className="summary-strip"><strong>{formatDate(date)}</strong><span>{sessions?.length ?? 0} séance(s) visible(s)</span></div>

    <section className="session-cards">{(sessions??[]).map((s:any)=>{
      const lessons=lessonsFor(s)
      const expected=lessons.find((l:any)=>l.expected_date===date)
      return <article className="card session-card" key={s.id}>
        <div className="session-card-head"><div><span className="session-clock">{shortTime(s.planned_start)}–{shortTime(s.planned_end)}</span><h2>{s.class_name} · {s.subject_name}</h2><p className="muted">{s.teacher_name}</p></div><span className={`status ${statusClass[s.status]||'upcoming'}`}>{statusLabels[s.status]||s.status}</span></div>
        <div className="planned-lesson"><span>Leçon prévue</span><strong>{expected?.title || 'Non associée à cette date'}</strong>{expected?.chapter && <small>{expected.chapter}</small>}</div>
        {canValidate ? <form action={validateSession} className="session-validation-form">
          <input type="hidden" name="session_id" value={s.id}/><input type="hidden" name="date" value={date}/>
          <div className="field-row"><label className="setup-field"><span>Statut</span><select name="status" defaultValue={['planned','in_progress'].includes(s.status)?'done':s.status}><option value="done">Effectué</option><option value="partial">Partiellement effectué</option><option value="missed">Non effectué</option><option value="postponed">Reporté</option>{isManager&&<option value="cancelled_school">Annulé par l’établissement</option>}</select></label><label className="setup-field"><span>Leçon réellement faite</span><select name="lesson_id" defaultValue={s.actual_lesson_id??expected?.id??''}><option value="">Non précisée</option>{lessons.map((l:any)=><option key={l.id} value={l.id}>{l.chapterNo}.{l.sequence_no} · {l.title}</option>)}</select></label></div>
          <div className="field-row"><label className="setup-field"><span>Début réel</span><input name="actual_start" type="time" defaultValue={shortTime(s.actual_start) !== '—' ? shortTime(s.actual_start) : shortTime(s.planned_start)}/></label><label className="setup-field"><span>Fin réelle</span><input name="actual_end" type="time" defaultValue={shortTime(s.actual_end) !== '—' ? shortTime(s.actual_end) : shortTime(s.planned_end)}/></label></div>
          <label className="setup-field"><span>Observation</span><textarea name="notes" rows={2} defaultValue={s.notes??''} placeholder="Optionnel"/></label>
          <button className="primary-button">Enregistrer la séance</button>
        </form> : <div className="notice info">Consultation uniquement. La Direction ne modifie pas les séances.</div>}
      </article>
    })}{!sessions?.length && <div className="card empty-state">Aucune séance n’est planifiée à cette date pour ton périmètre d’accès.</div>}</section>
  </AppShell>
}
