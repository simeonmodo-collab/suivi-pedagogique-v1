import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  pedagogical_lead: 'Animateur pédagogique',
  teacher: 'Enseignant',
  management_viewer: 'Direction',
}

export async function requireMember() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,active')
    .eq('id', userId)
    .single()

  if (!profile?.active) {
    await supabase.auth.signOut()
    redirect('/login?error=Votre+compte+est+désactivé')
  }

  return {
    supabase,
    profile,
    userId,
    isManager: ['admin', 'pedagogical_lead'].includes(profile.role),
    canViewAll: ['admin', 'pedagogical_lead', 'management_viewer'].includes(profile.role),
  }
}
