'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/require-member'
import { createAdminClient } from '@/lib/supabase/admin'

function t(fd: FormData, key: string) { return String(fd.get(key) ?? '').trim() }
function go(type: 'success'|'error', message: string) { redirect(`/admin/users?${type}=${encodeURIComponent(message)}`) }

async function requireAdmin() {
  const ctx = await requireMember()
  if (ctx.profile.role !== 'admin') redirect('/dashboard')
  return ctx
}

export async function createUser(fd: FormData) {
  const { supabase } = await requireAdmin()
  const admin = createAdminClient()
  if (!admin) go('error', 'SUPABASE_SERVICE_ROLE_KEY manque dans .env.local.')
  const fullName = t(fd, 'full_name')
  const email = t(fd, 'email').toLowerCase()
  const password = t(fd, 'password')
  const role = t(fd, 'role')
  if (!fullName || !email || password.length < 8) go('error', 'Nom, e-mail et mot de passe (8 caractères minimum) obligatoires.')
  if (!['admin','pedagogical_lead','teacher','management_viewer'].includes(role)) go('error', 'Rôle invalide.')

  const { data, error } = await admin!.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } })
 if (error || !data.user) {
  go('error', `Compte non créé : ${error?.message ?? 'erreur inconnue'}`)
  return
}

const { error: profileError } = await supabase
  .from('profiles')
  .update({ full_name: fullName, role, active: true })
  .eq('id', data.user.id)
  if (profileError) go('error', `Compte créé mais profil non configuré : ${profileError.message}`)
  revalidatePath('/admin/users')
  go('success', 'Utilisateur créé.')
}

export async function updateUser(fd: FormData) {
  const { supabase, userId } = await requireAdmin()
  const id = t(fd, 'id')
  const role = t(fd, 'role')
  const active = t(fd, 'active') === 'true'
  if (!id || !['admin','pedagogical_lead','teacher','management_viewer'].includes(role)) go('error', 'Utilisateur ou rôle invalide.')
  if (id === userId && (!active || role !== 'admin')) go('error', 'Tu ne peux pas retirer tes propres droits administrateur depuis cette page.')
  const { error } = await supabase.from('profiles').update({ role, active }).eq('id', id)
  if (error) go('error', `Modification impossible : ${error.message}`)
  revalidatePath('/admin/users')
  go('success', 'Utilisateur mis à jour.')
}
