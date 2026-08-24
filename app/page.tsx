import { redirect } from 'next/navigation'

export default function Home() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
  redirect(configured ? '/dashboard' : '/demo')
}
