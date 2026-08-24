'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireManager } from '@/lib/auth/require-manager'

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()
const integer = (fd: FormData, key: string, fallback = 1) => {
  const n = Number.parseInt(text(fd, key), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function go(type: 'success' | 'error', message: string) {
  redirect(`/admin/programs?${type}=${encodeURIComponent(message)}`)
}

export async function createProgram(fd: FormData) {
  const { supabase } = await requireManager()
  const schoolYearId = text(fd, 'school_year_id')
  const classId = text(fd, 'class_id')
  const subjectId = text(fd, 'subject_id')
  const title = text(fd, 'title')
  if (!schoolYearId || !classId || !subjectId || !title) go('error', 'Tous les champs du programme sont obligatoires.')

  const { error } = await supabase.from('programs').insert({
    school_year_id: schoolYearId,
    class_id: classId,
    subject_id: subjectId,
    title,
  })
  if (error) go('error', `Programme non créé : ${error.message}`)
  revalidatePath('/admin/programs')
  go('success', 'Programme créé.')
}

export async function createChapter(fd: FormData) {
  const { supabase } = await requireManager()
  const programId = text(fd, 'program_id')
  const title = text(fd, 'title')
  const sequenceNo = integer(fd, 'sequence_no')
  if (!programId || !title) go('error', 'Programme et titre du chapitre obligatoires.')

  const { error } = await supabase.from('program_chapters').insert({ program_id: programId, title, sequence_no: sequenceNo })
  if (error) go('error', `Chapitre non créé : ${error.message}`)
  revalidatePath('/admin/programs')
  go('success', 'Chapitre ajouté.')
}

export async function createLesson(fd: FormData) {
  const { supabase } = await requireManager()
  const chapterId = text(fd, 'chapter_id')
  const title = text(fd, 'title')
  const sequenceNo = integer(fd, 'sequence_no')
  const expectedDate = text(fd, 'expected_date') || null
  const plannedMinutesRaw = text(fd, 'planned_minutes')
  const plannedMinutes = plannedMinutesRaw ? Math.max(0, Number.parseInt(plannedMinutesRaw, 10) || 0) : null
  if (!chapterId || !title) go('error', 'Chapitre et titre de la leçon obligatoires.')

  const { error } = await supabase.from('program_lessons').insert({
    chapter_id: chapterId,
    title,
    sequence_no: sequenceNo,
    expected_date: expectedDate,
    planned_minutes: plannedMinutes,
  })
  if (error) go('error', `Leçon non créée : ${error.message}`)
  revalidatePath('/admin/programs')
  revalidatePath('/progress')
  go('success', 'Leçon ajoutée.')
}
