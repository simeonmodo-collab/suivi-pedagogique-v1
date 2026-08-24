'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireManager } from '@/lib/auth/require-manager'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function asInt(formData: FormData, key: string, fallback = 0) {
  const n = Number.parseInt(text(formData, key), 10)
  return Number.isFinite(n) ? n : fallback
}

function go(type: 'success' | 'error', message: string) {
  redirect(`/admin/schedule?${type}=${encodeURIComponent(message)}`)
}

export async function linkTeacher(formData: FormData) {
  const { supabase } = await requireManager()
  const profileId = text(formData, 'profile_id')
  const employeeCode = text(formData, 'employee_code') || null
  const specialty = text(formData, 'specialty') || null
  const phone = text(formData, 'phone') || null

  if (!profileId) go('error', 'Sélectionne un utilisateur.')

  const { error } = await supabase.from('teachers').insert({
    profile_id: profileId,
    employee_code: employeeCode,
    specialty,
    phone,
  })

  if (error) go('error', `Enseignant non ajouté : ${error.message}`)
  revalidatePath('/admin/schedule')
  go('success', 'Enseignant ajouté au département.')
}

export async function createAssignment(formData: FormData) {
  const { supabase } = await requireManager()
  const schoolYearId = text(formData, 'school_year_id')
  const teacherId = text(formData, 'teacher_id')
  const classId = text(formData, 'class_id')
  const subjectId = text(formData, 'subject_id')
  const weeklyHours = Number.parseFloat(text(formData, 'weekly_hours').replace(',', '.'))

  if (!schoolYearId || !teacherId || !classId || !subjectId) go('error', 'Tous les champs de l’affectation sont obligatoires.')
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0) go('error', 'Le volume horaire hebdomadaire doit être supérieur à zéro.')

  const { error } = await supabase.from('teacher_assignments').insert({
    school_year_id: schoolYearId,
    teacher_id: teacherId,
    class_id: classId,
    subject_id: subjectId,
    planned_weekly_minutes: Math.round(weeklyHours * 60),
  })

  if (error) go('error', `Affectation non créée : ${error.message}`)
  revalidatePath('/admin/schedule')
  go('success', 'Affectation pédagogique créée.')
}

export async function createTimetableSlot(formData: FormData) {
  const { supabase } = await requireManager()
  const assignmentId = text(formData, 'assignment_id')
  const weekday = asInt(formData, 'weekday')
  const startTime = text(formData, 'start_time')
  const endTime = text(formData, 'end_time')
  const room = text(formData, 'room') || null
  const effectiveFrom = text(formData, 'effective_from') || null
  const effectiveTo = text(formData, 'effective_to') || null

  if (!assignmentId || weekday < 1 || weekday > 7 || !startTime || !endTime) go('error', 'Jour, affectation et heures sont obligatoires.')
  if (endTime <= startTime) go('error', 'L’heure de fin doit être postérieure à l’heure de début.')
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) go('error', 'La période de validité de la séance est incorrecte.')

  const { error } = await supabase.from('timetable_slots').insert({
    assignment_id: assignmentId,
    weekday,
    start_time: startTime,
    end_time: endTime,
    room,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    active: true,
  })

  if (error) go('error', `Créneau non créé : ${error.message}`)
  revalidatePath('/admin/schedule')
  go('success', 'Créneau ajouté à l’emploi du temps.')
}

export async function generateExpectedSessions(formData: FormData) {
  const { supabase } = await requireManager()
  const from = text(formData, 'from')
  const to = text(formData, 'to')

  if (!from || !to) go('error', 'Renseigne la période à générer.')
  if (to < from) go('error', 'La date de fin doit être postérieure à la date de début.')

  const { data, error } = await supabase.rpc('generate_sessions', { p_from: from, p_to: to })
  if (error) go('error', `Génération impossible : ${error.message}`)

  revalidatePath('/dashboard')
  revalidatePath('/admin/schedule')
  go('success', `${data ?? 0} séance(s) attendue(s) générée(s).`)
}
