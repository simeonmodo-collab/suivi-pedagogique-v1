import Link from 'next/link'
import AppShell from '@/components/AppShell'
import {requireMember,roleLabels} from '@/lib/auth/require-member'
import {localDateISO,formatDate} from '@/lib/date'
import {recordAbsence} from './actions'

type SP=Promise<{range?:string;success?:string;error?:string}>

function rangeDates(range:string, today:string, year:any){
  const [y,m,d]=today.split('-').map(Number)
  if(range==='year'&&year)return [year.starts_on,year.ends_on]
  if(range==='month')return [`${today.slice(0,7)}-01`,today]
  if(range==='week'){
    const dt=new Date(Date.UTC(y,m-1,d)); const dow=dt.getUTCDay()||7; dt.setUTCDate(dt.getUTCDate()-(dow-1));
    return [dt.toISOString().slice(0,10),today]
  }
  return [today,today]
}
const typeLabels:Record<string,string>={unjustified:'Non justifiée',justified:'Justifiée',medical:'Maladie',mission:'Mission',leave:'Congé',school_activity:'Activité scolaire',other:'Autre'}

export default async function AbsencesPage({searchParams}:{searchParams:SP}){
  const {supabase,profile,isManager}=await requireMember(); const params=await searchParams; const today=localDateISO(); const range=['day','week','month','year'].includes(params.range??'')?params.range!:'day'
  const {data:year}=await supabase.from('school_years').select('id,name,starts_on,ends_on').eq('is_active',true).maybeSingle(); const [from,to]=rangeDates(range,today,year)
  const {data:absences}=await supabase.from('absences').select('id,teacher_id,absence_date,type,reason,justified,created_at,teachers(profiles(full_name))').gte('absence_date',from).lte('absence_date',to).order('absence_date',{ascending:false})
  const {data:teachers}=isManager?await supabase.from('teachers').select('id,profiles(full_name)').order('created_at'):{data:[] as any[]}
  const distinctTeachers=new Set((absences??[]).map((a:any)=>a.teacher_id)).size
  return <AppShell name={profile.full_name||'Collègue'} roleLabel={roleLabels[profile.role]} active="/absences" isManager={isManager}>
    <header className="page-header"><div><p className="eyebrow">Présence</p><h1>Absences</h1><p className="muted">Consultation du jour, de la semaine, du mois ou de l’année scolaire.</p></div></header>
    {params.success&&<div className="notice success">{params.success}</div>}{params.error&&<div className="notice error">{params.error}</div>}
    <div className="range-tabs">{[['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']].map(([v,l])=><Link key={v} className={range===v?'active':''} href={`/absences?range=${v}`}>{l}</Link>)}</div>
    <section className="metric-grid compact-metrics"><div className="metric-card"><span>Période</span><strong className="setup-metric-text">{formatDate(from)} → {formatDate(to)}</strong></div><div className="metric-card"><span>Absences enregistrées</span><strong>{absences?.length??0}</strong></div><div className="metric-card"><span>Enseignants concernés</span><strong>{distinctTeachers}</strong></div><div className="metric-card"><span>Justifiées</span><strong>{(absences??[]).filter((a:any)=>a.justified).length}</strong></div></section>
    <section className={isManager?'content-grid':'content-grid single'}>
      {isManager&&<article className="card"><p className="eyebrow">Nouvelle absence</p><h2>Enregistrer</h2><form action={recordAbsence} className="setup-form top-gap"><label className="setup-field"><span>Enseignant</span><select name="teacher_id" required><option value="">Sélectionner…</option>{(teachers??[]).map((t:any)=><option value={t.id} key={t.id}>{t.profiles?.full_name||'Enseignant'}</option>)}</select></label><div className="field-row"><label className="setup-field"><span>Date</span><input name="absence_date" type="date" defaultValue={today} required/></label><label className="setup-field"><span>Type</span><select name="type" defaultValue="other">{Object.entries(typeLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label></div><label className="setup-field"><span>Justification</span><select name="justified" defaultValue="false"><option value="false">Non justifiée / à vérifier</option><option value="true">Justifiée</option></select></label><label className="setup-field"><span>Motif / observation</span><textarea name="reason" rows={3}/></label><button className="primary-button">Enregistrer l’absence</button></form></article>}
      <article className="card"><div className="section-title"><div><p className="eyebrow">Historique</p><h2>Absences de la période</h2></div></div><div className="absence-list">{(absences??[]).map((a:any)=><div className="absence-row" key={a.id}><div><strong>{a.teachers?.profiles?.full_name||'Enseignant'}</strong><span>{formatDate(a.absence_date)} · {typeLabels[a.type]||a.type}</span>{a.reason&&<small>{a.reason}</small>}</div><span className={`status ${a.justified?'done':'pending'}`}>{a.justified?'Justifiée':'À vérifier'}</span></div>)}{!absences?.length&&<p className="empty-state">Aucune absence pour cette période.</p>}</div></article>
    </section>
  </AppShell>
}
