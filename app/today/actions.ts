'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/require-member'

const allowed = ['done','partial','missed','postponed','cancelled_school'] as const

export async function validateSession(formData: FormData) {
  const { supabase } = await requireMember()
  const id = String(formData.get('session_id') ?? '')
  const date = String(formData.get('date') ?? '')
  const status = String(formData.get('status') ?? '')
  const lessonId = String(formData.get('lesson_id') ?? '') || null
  const notes = String(formData.get('notes') ?? '').trim() || null
  let actualStart = String(formData.get('actual_start') ?? '') || null
  let actualEnd = String(formData.get('actual_end') ?? '') || null

  if (!id || !allowed.includes(status as (typeof allowed)[number])) {
    redirect(`/today?date=${encodeURIComponent(date)}&error=${encodeURIComponent('Statut de séance invalide.')}`)
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id,assignment_id,planned_start,planned_end')
    .eq('id', id)
    .single()

  if (sessionError || !session) {
    redirect(`/today?date=${encodeURIComponent(date)}&error=${encodeURIComponent('Séance introuvable ou accès refusé.')}`)
  }

  if (status === 'done' || status === 'partial') {
    actualStart = actualStart || session.planned_start
    actualEnd = actualEnd || session.planned_end
    if (!actualStart || !actualEnd || actualEnd <= actualStart) {
      redirect(`/today?date=${encodeURIComponent(date)}&error=${encodeURIComponent('Les heures réelles sont invalides.')}`)
    }
  } else {
    actualStart = null
    actualEnd = null
  }

  const { error } = await supabase.from('sessions').update({
    status,
    actual_start: actualStart,
    actual_end: actualEnd,
    actual_lesson_id: status === 'done' || status === 'partial' ? lessonId : null,
    notes,
  }).eq('id', id)

  if (error) {
    redirect(`/today?date=${encodeURIComponent(date)}&error=${encodeURIComponent(`Validation impossible : ${error.message}`)}`)
  }

  if (lessonId && (status === 'done' || status === 'partial')) {
    const progressStatus = status === 'done' ? 'completed' : 'in_progress'
    const today = date || new Date().toISOString().slice(0, 10)
    const payload: Record<string, unknown> = {
      assignment_id: session.assignment_id,
      lesson_id: lessonId,
      status: progressStatus,
      started_on: today,
    }
    if (progressStatus === 'completed') payload.completed_on = today

    const { error: progressError } = await supabase
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'assignment_id,lesson_id' })

    if (progressError) {
      redirect(`/today?date=${encodeURIComponent(date)}&error=${encodeURIComponent(`Séance enregistrée, mais progression non mise à jour : ${progressError.message}`)}`)
    }
  }

  revalidatePath('/today')
  revalidatePath('/dashboard')
  revalidatePath('/progress')
  revalidatePath('/statistics')
  revalidatePath('/reports')
  redirect(`/today?date=${encodeURIComponent(date)}&success=${encodeURIComponent('Séance enregistrée.')}`)
}
