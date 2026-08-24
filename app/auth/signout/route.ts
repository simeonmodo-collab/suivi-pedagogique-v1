import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return NextResponse.redirect(new URL('/login', req.url), { status: 302 })
}
