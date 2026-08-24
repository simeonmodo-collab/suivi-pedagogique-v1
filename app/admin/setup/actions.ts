'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireManager } from '@/lib/auth/require-manager'

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function positiveInt(formData: FormData, key: string, fallback = 1) {
  const parsed = Number.parseInt(value(formData, key), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function setupRedirect(type: 'success' | 'error', message: string) {
  redirect(`/admin/setup?${type}=${encodeURIComponent(message)}`)
}

export async function createSchoolYear(formData: FormData) {
  const { supabase } = await requireManager()
  const name = value(formData, 'name')
  const startsOn = value(formData, 'starts_on')
  const endsOn = value(formData, 'ends_on')

  if (!name || !startsOn || !endsOn) setupRedirect('error', 'Tous les champs de l’année scolaire sont obligatoires.')
  if (endsOn < startsOn) setupRedirect('error', 'La date de fin doit être postérieure à la date de début.')

  const { data, error } = await supabase
    .from('school_years')
    .insert({ name, starts_on: startsOn, ends_on: endsOn, is_active: false })
    .select('id')
    .single()

  if (error) setupRedirect('error', `Impossible de créer l’année scolaire : ${error.message}`)

  const { count } = await supabase
    .from('school_years')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if ((count ?? 0) === 0 && data?.id) {
    await supabase.from('school_years').update({ is_active: true }).eq('id', data.id)
  }

  revalidatePath('/admin/setup')
  revalidatePath('/dashboard')
  setupRedirect('success', 'Année scolaire créée.')
}

export async function activateSchoolYear(formData: FormData) {
  const { supabase } = await requireManager()
  const schoolYearId = value(formData, 'school_year_id')
  if (!schoolYearId) setupRedirect('error', 'Année scolaire introuvable.')

  const { error: deactivateError } = await supabase
    .from('school_years')
    .update({ is_active: false })
    .eq('is_active', true)

  if (deactivateError) setupRedirect('error', `Activation impossible : ${deactivateError.message}`)

  const { error } = await supabase
    .from('school_years')
    .update({ is_active: true })
    .eq('id', schoolYearId)

  if (error) setupRedirect('error', `Activation impossible : ${error.message}`)

  revalidatePath('/admin/setup')
  revalidatePath('/dashboard')
  setupRedirect('success', 'Année scolaire activée.')
}

export async function createPeriod(formData: FormData) {
  const { supabase } = await requireManager()
  const schoolYearId = value(formData, 'school_year_id')
  const name = value(formData, 'name')
  const startsOn = value(formData, 'starts_on')
  const endsOn = value(formData, 'ends_on')
  const sequenceNo = positiveInt(formData, 'sequence_no')

  if (!schoolYearId || !name || !startsOn || !endsOn) setupRedirect('error', 'Renseigne le nom et les dates de la période.')

  const { data: year } = await supabase
    .from('school_years')
    .select('starts_on, ends_on')
    .eq('id', schoolYearId)
    .single()

  if (!year || startsOn < year.starts_on || endsOn > year.ends_on || endsOn < startsOn) {
    setupRedirect('error', 'La période doit être entièrement comprise dans l’année scolaire.')
  }

  const { error } = await supabase.from('periods').insert({
    school_year_id: schoolYearId,
    name,
    starts_on: startsOn,
    ends_on: endsOn,
    sequence_no: sequenceNo,
  })

  if (error) setupRedirect('error', `Période non créée : ${error.message}`)
  revalidatePath('/admin/setup')
  setupRedirect('success', 'Période ajoutée.')
}

export async function createClass(formData: FormData) {
  const { supabase } = await requireManager()
  const schoolYearId = value(formData, 'school_year_id')
  const name = value(formData, 'name')
  const level = value(formData, 'level') || null

  if (!schoolYearId || !name) setupRedirect('error', 'Le nom de la classe est obligatoire.')

  const { error } = await supabase.from('classes').insert({
    school_year_id: schoolYearId,
    name,
    level,
    active: true,
  })

  if (error) setupRedirect('error', `Classe non créée : ${error.message}`)
  revalidatePath('/admin/setup')
  setupRedirect('success', 'Classe ajoutée.')
}

export async function createSubject(formData: FormData) {
  const { supabase } = await requireManager()
  const name = value(formData, 'name')
  const code = value(formData, 'code') || null

  if (!name) setupRedirect('error', 'Le nom de la matière est obligatoire.')

  const { error } = await supabase.from('subjects').insert({ name, code, active: true })
  if (error) setupRedirect('error', `Matière non créée : ${error.message}`)
  revalidatePath('/admin/setup')
  setupRedirect('success', 'Matière ajoutée.')
}

export async function createClosure(formData: FormData) {
  const { supabase } = await requireManager()
  const schoolYearId = value(formData, 'school_year_id')
  const startsOn = value(formData, 'starts_on')
  const endsOn = value(formData, 'ends_on')
  const reason = value(formData, 'reason')

  if (!schoolYearId || !startsOn || !endsOn || !reason) setupRedirect('error', 'Renseigne les dates et le motif de fermeture.')
  if (endsOn < startsOn) setupRedirect('error', 'La date de fin doit être postérieure à la date de début.')

  const { error } = await supabase.from('school_closures').insert({
    school_year_id: schoolYearId,
    starts_on: startsOn,
    ends_on: endsOn,
    reason,
  })

  if (error) setupRedirect('error', `Fermeture non créée : ${error.message}`)
  revalidatePath('/admin/setup')
  setupRedirect('success', 'Fermeture ajoutée au calendrier.')
}
