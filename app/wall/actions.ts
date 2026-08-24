'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMember } from '@/lib/auth/require-member'
import { requireManager } from '@/lib/auth/require-manager'

function back(type:'success'|'error',message:string){redirect(`/wall?${type}=${encodeURIComponent(message)}`)}

export async function createPost(formData:FormData){
  const {supabase,profile}=await requireMember()
  const content=String(formData.get('content')??'').trim()
  const category=String(formData.get('category')??'information')
  const allowed=['announcement','resource','question','pedagogy','meeting','information']
  if(!content||!allowed.includes(category))back('error','Publication invalide.')
  const {error}=await supabase.from('wall_posts').insert({author_id:profile.id,content,category})
  if(error)back('error',`Publication impossible : ${error.message}`)
  revalidatePath('/wall');back('success','Publication ajoutée.')
}

export async function createComment(formData:FormData){
  const {supabase,profile}=await requireMember()
  const postId=String(formData.get('post_id')??'')
  const content=String(formData.get('content')??'').trim()
  if(!postId||!content)back('error','Commentaire vide.')
  const {error}=await supabase.from('wall_comments').insert({post_id:postId,author_id:profile.id,content})
  if(error)back('error',`Commentaire impossible : ${error.message}`)
  revalidatePath('/wall');back('success','Commentaire ajouté.')
}

export async function deletePost(formData:FormData){
  const {supabase}=await requireMember(); const id=String(formData.get('post_id')??'')
  if(!id)back('error','Publication introuvable.')
  const {error}=await supabase.from('wall_posts').delete().eq('id',id)
  if(error)back('error',`Suppression refusée : ${error.message}`)
  revalidatePath('/wall');back('success','Publication supprimée.')
}

export async function togglePin(formData:FormData){
  const {supabase}=await requireManager(); const id=String(formData.get('post_id')??''); const pinned=String(formData.get('pinned')??'false')==='true'
  if(!id)back('error','Publication introuvable.')
  const {error}=await supabase.from('wall_posts').update({pinned:!pinned}).eq('id',id)
  if(error)back('error',`Modification impossible : ${error.message}`)
  revalidatePath('/wall');back('success',!pinned?'Publication épinglée.':'Publication désépinglée.')
}
