import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = ['/login','/demo']
export async function updateSession(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const path=request.nextUrl.pathname
    export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
  await supabase.auth.getClaims()
  return response
}
    return NextResponse.next({ request })
  }
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll(){return request.cookies.getAll()},setAll(cookiesToSet: Array<{name:string;value:string;options?:any}>){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}})
  const {data}=await supabase.auth.getClaims();const signedIn=Boolean(data?.claims);const path=request.nextUrl.pathname;const isPublic=publicPaths.some(p=>path===p||path.startsWith(`${p}/`))||path.startsWith('/auth/')
  if(!signedIn&&!isPublic&&path!=='/'){const url=request.nextUrl.clone();url.pathname='/login';return NextResponse.redirect(url)}
  if(signedIn&&path==='/login'){const url=request.nextUrl.clone();url.pathname='/dashboard';return NextResponse.redirect(url)}
  return response
}
