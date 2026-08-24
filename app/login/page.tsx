import Link from 'next/link'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">SP</div>
        <p className="eyebrow">Département d’informatique</p>
        <h1>Suivi pédagogique</h1>
        <p className="muted">Connectez-vous avec votre compte professionnel.</p>

        {!configured && (
          <div className="notice warning">
            Supabase n’est pas encore configuré. Utilisez la démonstration ou renseignez le fichier .env.local.
          </div>
        )}
        {error && <div className="notice error">{error}</div>}

        <form className="auth-form" action={login}>
          <label>
            Adresse e-mail
            <input name="email" type="email" placeholder="enseignant@lycee.cm" required disabled={!configured} />
          </label>
          <label>
            Mot de passe
            <input name="password" type="password" required disabled={!configured} />
          </label>
          <button className="primary-button" type="submit" disabled={!configured}>
            Se connecter
          </button>
        </form>

        <Link className="text-link" href="/demo">Voir la maquette V1</Link>
      </section>
    </main>
  )
}
