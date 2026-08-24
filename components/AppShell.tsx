import Link from 'next/link'
import type { ReactNode } from 'react'

const items = [
  ['/dashboard', '⌂', 'Accueil'],
  ['/today', '◷', 'Aujourd’hui'],
  ['/progress', '▤', 'Progression'],
  ['/teachers', '◉', 'Enseignants'],
  ['/timetable', '▦', 'Emploi du temps'],
  ['/absences', '!', 'Absences'],
  ['/wall', '✦', 'Mur pédagogique'],
  ['/statistics', '▥', 'Statistiques'],
  ['/reports', '▧', 'Rapports'],
] as const

export default function AppShell({
  children,
  name,
  roleLabel,
  active,
  isManager = false,
}: {
  children: ReactNode
  name: string
  roleLabel: string
  active: string
  isManager?: boolean
}) {
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-row"><div className="brand-mark small">SP</div><div><strong>Suivi pédagogique</strong><span>Département Informatique</span></div></div>
      <nav>
        {items.map(([href, icon, label]) => <Link key={href} className={active === href ? 'nav-active' : ''} href={href}>{icon} <span>{label}</span></Link>)}
        {isManager && <>
          <div className="nav-divider" />
          <Link className={active === '/admin/setup' ? 'nav-active' : ''} href="/admin/setup">⚙ <span>Paramétrage</span></Link>
          <Link className={active === '/admin/schedule' ? 'nav-active' : ''} href="/admin/schedule">⌗ <span>Affectations</span></Link>
          <Link className={active === '/admin/programs' ? 'nav-active' : ''} href="/admin/programs">≡ <span>Programmes</span></Link>
          <Link className={active === '/admin/users' ? 'nav-active' : ''} href="/admin/users">♙ <span>Utilisateurs</span></Link>
        </>}
      </nav>
      <div className="sidebar-footer"><strong>{name}</strong><span>{roleLabel}</span><a href="/account">Mon compte</a><form action="/auth/signout" method="post"><button>Déconnexion</button></form></div>
    </aside>
    <section className="main-panel">{children}</section>
    <nav className="mobile-nav">
      <Link className={active === '/dashboard' ? 'active' : ''} href="/dashboard">⌂<span>Accueil</span></Link>
      <Link className={active === '/today' ? 'active' : ''} href="/today">◷<span>Aujourd’hui</span></Link>
      <Link className={active === '/progress' ? 'active' : ''} href="/progress">▤<span>Progression</span></Link>
      <Link className={active === '/wall' ? 'active' : ''} href="/wall">✦<span>Mur</span></Link>
      <Link className={['/more','/teachers','/timetable','/absences','/statistics','/reports'].includes(active) ? 'active' : ''} href="/more">☰<span>Plus</span></Link>
    </nav>
  </main>
}
