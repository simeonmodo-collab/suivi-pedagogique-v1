'use server'

import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/require-member'

export async function changePassword(formData:FormData){
  const {supabase}=await requireMember()
  const password=String(formData.get('password')??'')
  const confirm=String(formData.get('confirm')??'')
  if(password.length<8)redirect('/account?error=Le+mot+de+passe+doit+contenir+au+moins+8+caractères')
  if(password!==confirm)redirect('/account?error=Les+mots+de+passe+ne+correspondent+pas')
  const {error}=await supabase.auth.updateUser({password})
  if(error)redirect(`/account?error=${encodeURIComponent(`Modification impossible : ${error.message}`)}`)
  redirect('/account?success=Mot+de+passe+modifié')
}
