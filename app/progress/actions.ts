'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/require-member'
import { localDateISO } from '@/lib/date'

export async function updateLessonProgress(formData: FormData) {
  const { supabase } = await requireMember()
  const assignmentId = String(formData.get('assignment_id') ?? '')
  const lessonId = String(formData.get('lesson_id') ?? '')
  const status = String(formData.get('status') ?? '')
  const notes = String(formData.get('notes') ?? '').trim() || null
  if (!assignmentId || !lessonId || !['not_started','in_progress','completed'].includes(status)) {
    redirect('/progress?error=Progression+invalide')
  }
  const today = localDateISO()
  const payload = {
    assignment_id: assignmentId,
    lesson_id: lessonId,
    status,
    started_on: status === 'not_started' ? null : today,
    completed_on: status === 'completed' ? today : null,
    notes,
  }
  const { error } = await supabase.from('lesson_progress').upsert(payload, { onConflict: 'assignment_id,lesson_id' })
  if (error) redirect(`/progress?error=${encodeURIComponent(`Mise à jour impossible : ${error.message}`)}`)
  revalidatePath('/progress')
  revalidatePath('/dashboard')
  revalidatePath('/statistics')
  revalidatePath('/reports')
  redirect('/progress?success=Progression+mise+à+jour')
}
