import AppShell from '@/components/AppShell'
import ProgressBar from '@/components/ProgressBar'
import { requireMember, roleLabels } from '@/lib/auth/require-member'
import { localDateISO, formatDate } from '@/lib/date'
import { updateLessonProgress } from './actions'

type SP = Promise<{success?:string;error?:string;teacher?:string}>

export default async function ProgressPage({searchParams}:{searchParams:SP}){
  const {supabase,profile,isManager,canViewAll}=await requireMember()
  const canEdit = profile.role !== 'management_viewer'
  const params=await searchParams
  const today=localDateISO()
  const {data:year}=await supabase.from('school_years').select('id,name').eq('is_active',true).maybeSingle()
  let teacherId:string|undefined=params.teacher
  if(!canViewAll){
    const {data:teacher}=await supabase.from('teachers').select('id').eq('profile_id',profile.id).maybeSingle()
    teacherId=teacher?.id
  }

  let assignmentQuery=supabase.from('teacher_assignments').select('id,teacher_id,class_id,subject_id,school_year_id,teachers(profiles(full_name)),classes(name),subjects(name,code)')
  if(year) assignmentQuery=assignmentQuery.eq('school_year_id',year.id)
  if(teacherId) assignmentQuery=assignmentQuery.eq('teacher_id',teacherId)
  const {data:assignments}=await assignmentQuery.order('id')

  const programs=year ? (await supabase.from('programs').select('id,class_id,subject_id,title,program_chapters(id,title,sequence_no,program_lessons(id,title,sequence_no,expected_date,planned_minutes))').eq('school_year_id',year.id)).data??[] : []
  const assignmentIds=(assignments??[]).map((a:any)=>a.id)
  const progress=assignmentIds.length ? (await supabase.from('lesson_progress').select('assignment_id,lesson_id,status,started_on,completed_on,notes').in('assignment_id',assignmentIds)).data??[] : []
  const {data:teachers}=canViewAll ? await supabase.from('teachers').select('id,profiles(full_name)').order('created_at') : {data:[] as any[]}

  return <AppShell name={profile.full_name||'Collègue'} roleLabel={roleLabels[profile.role]} active="/progress" isManager={isManager}>
    <header className="page-header"><div><p className="eyebrow">Programme</p><h1>Progression pédagogique</h1><p className="muted">Compare les leçons prévues aux leçons réellement achevées.</p></div>{canViewAll&&<form method="get" className="date-filter"><label>Enseignant<select name="teacher" defaultValue={teacherId??''}><option value="">Tous</option>{(teachers??[]).map((t:any)=><option key={t.id} value={t.id}>{t.profiles?.full_name||'Enseignant'}</option>)}</select></label><button className="secondary-button">Filtrer</button></form>}</header>
    {params.success&&<div className="notice success">{params.success}</div>}{params.error&&<div className="notice error">{params.error}</div>}
    {!year&&<div className="notice warning">Aucune année scolaire active.</div>}

    <section className="progress-assignment-list">{(assignments??[]).map((a:any)=>{
      const program:any=programs.find((p:any)=>p.class_id===a.class_id&&p.subject_id===a.subject_id)
      const chapters:any[]=(program?.program_chapters??[]).sort((x:any,y:any)=>x.sequence_no-y.sequence_no)
      const lessons:any[]=chapters.flatMap((c:any)=>(c.program_lessons??[]).map((l:any)=>({...l,chapterTitle:c.title,chapterNo:c.sequence_no}))).sort((x:any,y:any)=>(x.chapterNo-y.chapterNo)||(x.sequence_no-y.sequence_no))
      const pmap=new Map<string, any>(progress.filter((p:any)=>p.assignment_id===a.id).map((p:any)=>[p.lesson_id,p]))
      const completed=lessons.filter((l:any)=>pmap.get(l.id)?.status==='completed').length
      const expected=lessons.filter((l:any)=>l.expected_date&&l.expected_date<=today).length
      const pct=lessons.length?completed/lessons.length*100:0
      const expectedPct=lessons.length?expected/lessons.length*100:0
      return <article className="card progress-assignment" key={a.id}>
        <div className="section-title"><div><p className="eyebrow">{a.teachers?.profiles?.full_name}</p><h2>{a.classes?.name} · {a.subjects?.name}</h2><p className="muted">{program?.title||'Programme non configuré'}</p></div><span className={`status ${pct>=expectedPct?'done':'pending'}`}>{completed}/{lessons.length} leçons</span></div>
        <div className="two-progress"><ProgressBar label="Couverture réelle" value={pct}/><ProgressBar label="Couverture attendue à ce jour" value={expectedPct}/></div>
        {lessons.length>0&&<div className="lesson-list">{lessons.map((l:any)=>{const lp:any=pmap.get(l.id); const status=lp?.status??'not_started'; return canEdit ? <form action={updateLessonProgress} className="lesson-row" key={l.id}><input type="hidden" name="assignment_id" value={a.id}/><input type="hidden" name="lesson_id" value={l.id}/><div className="lesson-index">{l.chapterNo}.{l.sequence_no}</div><div className="lesson-title"><strong>{l.title}</strong><span>{l.chapterTitle}{l.expected_date?` · prévu ${formatDate(l.expected_date)}`:''}</span></div><select name="status" defaultValue={status}><option value="not_started">Non commencée</option><option value="in_progress">En cours</option><option value="completed">Terminée</option></select><input className="lesson-note" name="notes" defaultValue={lp?.notes??''} placeholder="Observation"/><button className="small-button">✓</button></form> : <div className="lesson-row lesson-row-readonly" key={l.id}><div className="lesson-index">{l.chapterNo}.{l.sequence_no}</div><div className="lesson-title"><strong>{l.title}</strong><span>{l.chapterTitle}{l.expected_date?` · prévu ${formatDate(l.expected_date)}`:''}</span></div><span className={`status ${status==='completed'?'done':status==='in_progress'?'pending':'upcoming'}`}>{status==='completed'?'Terminée':status==='in_progress'?'En cours':'Non commencée'}</span></div>})}</div>}
        {!lessons.length&&<p className="empty-state">Aucune leçon n’est définie pour ce programme. Un responsable peut les ajouter dans Administration → Programmes.</p>}
      </article>
    })}{!assignments?.length&&<div className="card empty-state">Aucune affectation pédagogique disponible pour ce filtre.</div>}</section>
  </AppShell>
}
