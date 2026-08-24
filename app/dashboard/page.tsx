import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ProgressBar from '@/components/ProgressBar'
import { requireMember, roleLabels } from '@/lib/auth/require-member'
import { localDateISO, localDateLabel, shortTime } from '@/lib/date'
import { getPerformanceData } from '@/lib/performance'

const labels:Record<string,string>={planned:'À confirmer',in_progress:'En cours',done:'Effectué',partial:'Partiel',missed:'Non effectué',postponed:'Reporté',cancelled_school:'Annulé'}
const classes:Record<string,string>={done:'done',partial:'pending',missed:'missed',planned:'pending',in_progress:'pending',postponed:'upcoming',cancelled_school:'upcoming'}

export default async function DashboardPage(){
  const {supabase,profile,isManager,canViewAll}=await requireMember();const today=localDateISO();const {data:year}=await supabase.from('school_years').select('id,name,starts_on,ends_on').eq('is_active',true).maybeSingle();const from=year&&today>=year.starts_on?year.starts_on:today;const to=year&&today>year.ends_on?year.ends_on:today
  const [{data:sessions},{count:absenceCount}]=await Promise.all([
    supabase.from('v_session_details').select('*').eq('scheduled_date',today).order('planned_start'),
    supabase.from('absences').select('id',{count:'exact',head:true}).eq('absence_date',today),
  ])
  const {department}=await getPerformanceData({supabase,profileId:profile.id,canViewAll,schoolYearId:year?.id,from,to})
  const list=sessions??[];const done=list.filter((s:any)=>['done','partial'].includes(s.status)).length;const pending=list.filter((s:any)=>['planned','in_progress'].includes(s.status)).length
  return <AppShell name={profile.full_name||'Collègue'} roleLabel={roleLabels[profile.role]} active="/dashboard" isManager={isManager}>
    <header className="topbar"><div><p className="eyebrow">{roleLabels[profile.role]}</p><h1>Bonjour, {profile.full_name||'collègue'}</h1><p className="muted">{localDateLabel()} {year?.name?`• Année ${year.name}`:''}</p></div><div className="top-actions"><Link className="secondary-button" href="/today">Voir les séances</Link></div></header>
    <section className="metric-grid"><div className="metric-card"><span>Cours prévus aujourd’hui</span><strong>{list.length}</strong></div><div className="metric-card"><span>Cours réalisés</span><strong>{done}</strong></div><div className="metric-card"><span>Absences du jour</span><strong>{absenceCount??0}</strong></div><div className="metric-card"><span>À confirmer</span><strong>{pending}</strong></div></section>
    <section className="dashboard-grid"><article className="card"><div className="section-title"><div><p className="eyebrow">Depuis le début de l’année</p><h2>Indicateurs pédagogiques</h2></div><Link className="text-link" href="/statistics">Détails</Link></div><ProgressBar label="Taux de couverture horaire" value={department?.hourlyCoverage??0}/><ProgressBar label="Taux de couverture des programmes" value={department?.programCoverage??0}/><ProgressBar label="Taux d’assiduité" value={department?.attendance??0}/></article><article className="card compact-card"><p className="eyebrow">Action rapide</p><h2>Suivi du jour</h2><p className="muted">Consulte ce qui était prévu et valide les séances effectuées. Les indicateurs se mettent ensuite à jour automatiquement.</p><Link className="primary-button" href="/today">Ouvrir les séances</Link></article></section>
    <section className="card"><div className="section-title"><div><p className="eyebrow">Planning</p><h2>Cours du jour</h2></div><Link className="secondary-button" href="/today">Voir tout</Link></div><div className="sessions-list">{list.slice(0,8).map((s:any)=><article className="session-row" key={s.id}><div className="session-time">{shortTime(s.planned_start)}–{shortTime(s.planned_end)}</div><div className="session-main"><strong>{s.teacher_name}</strong><span>{s.class_name} • {s.subject_name}</span></div><span className={`status ${classes[s.status]||'upcoming'}`}>{labels[s.status]||s.status}</span></article>)}{!list.length&&<p className="empty-state">Aucune séance planifiée aujourd’hui.</p>}</div></section>
  </AppShell>
}
