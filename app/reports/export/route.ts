import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { localDateISO } from '@/lib/date'
import { getPerformanceData } from '@/lib/performance'

function csvCell(value:unknown){return `"${String(value??'').replaceAll('"','""')}"`}
export async function GET(){
  const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;if(!userId)return new NextResponse('Non autorisé',{status:401});const {data:profile}=await supabase.from('profiles').select('id,role,active').eq('id',userId).single();if(!profile?.active)return new NextResponse('Compte désactivé',{status:403});const canViewAll=['admin','pedagogical_lead','management_viewer'].includes(profile.role);const today=localDateISO();const {data:year}=await supabase.from('school_years').select('id,starts_on,ends_on').eq('is_active',true).maybeSingle();const from=year?.starts_on??`${today.slice(0,4)}-01-01`;const to=year&&today>year.ends_on?year.ends_on:today;const {rows}=await getPerformanceData({supabase,profileId:profile.id,canViewAll,schoolYearId:year?.id,from,to});const header=['Enseignant','Heures prévues','Heures faites','Couverture horaire %','Couverture programme %','Assiduité %','Leçons prévues période','Leçons terminées période','Absences'];const lines=[header,...rows.map(r=>[r.teacherName,(r.plannedMinutes/60).toFixed(2),(r.actualMinutes/60).toFixed(2),r.hourlyCoverage,r.programCoverage,r.attendance,r.lessonsPlannedPeriod,r.lessonsDonePeriod,r.absences])];const csv='\uFEFF'+lines.map(row=>row.map(csvCell).join(';')).join('\r\n');return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="rapport-suivi-pedagogique-${today}.csv"`}})
}
