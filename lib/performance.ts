import { localDateISO, localTimeHHMMSS } from '@/lib/date'

export type PerformanceRow = {
  teacherId: string
  teacherName: string
  plannedMinutes: number
  actualMinutes: number
  sessionsExpected: number
  sessionsTaught: number
  sessionsMissed: number
  absences: number
  lessonsTotal: number
  lessonsCompleted: number
  lessonsPlannedPeriod: number
  lessonsDonePeriod: number
  hourlyCoverage: number
  attendance: number
  programCoverage: number
}

function pct(a:number,b:number){return b>0?Math.round((a/b*100)*10)/10:0}

export async function getPerformanceData({supabase,profileId,canViewAll,schoolYearId,from,to}:{supabase:any;profileId:string;canViewAll:boolean;schoolYearId?:string;from:string;to:string}){
  let teacherId:string|undefined
  if(!canViewAll){
    const {data:t}=await supabase.from('teachers').select('id').eq('profile_id',profileId).maybeSingle()
    teacherId=t?.id
    if(!teacherId)return {rows:[] as PerformanceRow[],department:null}
  }

  let aq=supabase.from('teacher_assignments').select('id,teacher_id,teachers(profiles(full_name))')
  if(schoolYearId)aq=aq.eq('school_year_id',schoolYearId)
  if(teacherId)aq=aq.eq('teacher_id',teacherId)
  const {data:assignments}=await aq
  const list=assignments??[]
  const assignmentIds=list.map((a:any)=>a.id)
  const teacherIds=[...new Set(list.map((a:any)=>a.teacher_id))] as string[]
  if(!assignmentIds.length)return {rows:[] as PerformanceRow[],department:null}

  const [{data:sessions},{data:absences},{data:coverage},{data:plannedLessons},{data:completedLessons}]=await Promise.all([
    supabase.from('v_session_details').select('assignment_id,teacher_id,status,planned_minutes,actual_minutes,scheduled_date,planned_end').in('assignment_id',assignmentIds).gte('scheduled_date',from).lte('scheduled_date',to),
    supabase.from('absences').select('teacher_id,absence_date').in('teacher_id',teacherIds).gte('absence_date',from).lte('absence_date',to),
    supabase.from('v_assignment_program_coverage').select('assignment_id,teacher_id,lessons_total,lessons_completed').in('assignment_id',assignmentIds),
    supabase.from('v_assignment_program_lessons').select('assignment_id,teacher_id,lesson_id,expected_date').in('assignment_id',assignmentIds).gte('expected_date',from).lte('expected_date',to),
    supabase.from('lesson_progress').select('assignment_id,lesson_id,completed_on,status').in('assignment_id',assignmentIds).eq('status','completed').gte('completed_on',from).lte('completed_on',to),
  ])

  const assignmentTeacher=new Map<string, string>(list.map((a:any)=>[String(a.id),String(a.teacher_id)]))
  const rowsMap=new Map<string,PerformanceRow>()
  for(const a of list){
    if(!rowsMap.has(a.teacher_id))rowsMap.set(a.teacher_id,{teacherId:a.teacher_id,teacherName:a.teachers?.profiles?.full_name||'Enseignant',plannedMinutes:0,actualMinutes:0,sessionsExpected:0,sessionsTaught:0,sessionsMissed:0,absences:0,lessonsTotal:0,lessonsCompleted:0,lessonsPlannedPeriod:0,lessonsDonePeriod:0,hourlyCoverage:0,attendance:0,programCoverage:0})
  }
  const nowDate=localDateISO();const nowTime=localTimeHHMMSS()
  for(const s of sessions??[]){
    const r=rowsMap.get(s.teacher_id); if(!r)continue
    const notYetDue=s.scheduled_date===nowDate && String(s.planned_end??'')>nowTime && ['planned','in_progress'].includes(s.status)
    if(notYetDue)continue
    if(!['cancelled_school','postponed'].includes(s.status)){r.plannedMinutes+=s.planned_minutes??0;r.sessionsExpected++}
    r.actualMinutes+=s.actual_minutes??0
    if(['done','partial'].includes(s.status))r.sessionsTaught++
    if(s.status==='missed')r.sessionsMissed++
  }
  for(const a of absences??[]){const r=rowsMap.get(a.teacher_id);if(r)r.absences++}
  for(const c of coverage??[]){const r=rowsMap.get(c.teacher_id);if(r){r.lessonsTotal+=c.lessons_total??0;r.lessonsCompleted+=c.lessons_completed??0}}
  for(const l of plannedLessons??[]){const r=rowsMap.get(l.teacher_id);if(r)r.lessonsPlannedPeriod++}
  for(const l of completedLessons??[]){const tid=assignmentTeacher.get(l.assignment_id);const r=tid?rowsMap.get(tid):undefined;if(r)r.lessonsDonePeriod++}
  const rows=[...rowsMap.values()].map(r=>({...r,hourlyCoverage:pct(r.actualMinutes,r.plannedMinutes),attendance:pct(r.sessionsTaught,r.sessionsExpected),programCoverage:pct(r.lessonsCompleted,r.lessonsTotal)})).sort((a,b)=>a.teacherName.localeCompare(b.teacherName,'fr'))
  const d=rows.reduce((a,r)=>({plannedMinutes:a.plannedMinutes+r.plannedMinutes,actualMinutes:a.actualMinutes+r.actualMinutes,sessionsExpected:a.sessionsExpected+r.sessionsExpected,sessionsTaught:a.sessionsTaught+r.sessionsTaught,sessionsMissed:a.sessionsMissed+r.sessionsMissed,absences:a.absences+r.absences,lessonsTotal:a.lessonsTotal+r.lessonsTotal,lessonsCompleted:a.lessonsCompleted+r.lessonsCompleted,lessonsPlannedPeriod:a.lessonsPlannedPeriod+r.lessonsPlannedPeriod,lessonsDonePeriod:a.lessonsDonePeriod+r.lessonsDonePeriod}),{plannedMinutes:0,actualMinutes:0,sessionsExpected:0,sessionsTaught:0,sessionsMissed:0,absences:0,lessonsTotal:0,lessonsCompleted:0,lessonsPlannedPeriod:0,lessonsDonePeriod:0})
  const department={...d,hourlyCoverage:pct(d.actualMinutes,d.plannedMinutes),attendance:pct(d.sessionsTaught,d.sessionsExpected),programCoverage:pct(d.lessonsCompleted,d.lessonsTotal)}
  return {rows,department}
}
