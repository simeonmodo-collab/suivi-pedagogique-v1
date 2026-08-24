'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireManager } from '@/lib/auth/require-manager'

export async function recordAbsence(formData: FormData){
  const {supabase,profile}=await requireManager()
  const teacherId=String(formData.get('teacher_id')??'')
  const absenceDate=String(formData.get('absence_date')??'')
  const type=String(formData.get('type')??'other')
  const reason=String(formData.get('reason')??'').trim()||null
  const justified=String(formData.get('justified')??'false')==='true'
  const allowed=['unjustified','justified','medical','mission','leave','school_activity','other']
  if(!teacherId||!/^\d{4}-\d{2}-\d{2}$/.test(absenceDate)||!allowed.includes(type)) redirect('/absences?error=Données+d’absence+invalides')
  const {error}=await supabase.from('absences').insert({teacher_id:teacherId,absence_date:absenceDate,type,reason,justified,recorded_by:profile.id})
  if(error) redirect(`/absences?error=${encodeURIComponent(`Enregistrement impossible : ${error.message}`)}`)
  revalidatePath('/absences');revalidatePath('/dashboard');revalidatePath('/statistics');revalidatePath('/reports')
  redirect('/absences?success=Absence+enregistrée')
}
