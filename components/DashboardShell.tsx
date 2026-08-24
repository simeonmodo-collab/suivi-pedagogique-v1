type SessionItem = {
  time: string
  teacher: string
  className: string
  lesson: string
  status: 'Fait' | 'Non fait' | 'À confirmer' | 'À venir'
}

type Props = {
  name: string
  roleLabel: string
  dateLabel: string
  metrics: {
    plannedToday: number
    doneToday: number
    absencesToday: number
    pendingToday: number
    hourlyCoverage: number
    programCoverage: number
    attendance: number
  }
  sessions: SessionItem[]
  demo?: boolean
}

const statusClass: Record<SessionItem['status'], string> = {
  Fait: 'status done',
  'Non fait': 'status missed',
  'À confirmer': 'status pending',
  'À venir': 'status upcoming',
}

function Metric({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}{suffix}</strong>
    </div>
  )
}

function Progress({ label, value }: { label: string; value: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="progress-block">
      <div className="progress-head"><span>{label}</span><strong>{safe}%</strong></div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${safe}%` }} /></div>
    </div>
  )
}

export default function DashboardShell({ name, roleLabel, dateLabel, metrics, sessions, demo }: Props) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row"><div className="brand-mark small">SP</div><div><strong>Suivi pédagogique</strong><span>Département Informatique</span></div></div>
        <nav>
          <a className="nav-active" href="/dashboard">⌂ <span>Tableau de bord</span></a>
          <a href="#today">◷ <span>Aujourd’hui</span></a>
          <a href="/progress">▤ <span>Progression</span></a>
          <a href="/teachers">◉ <span>Enseignants</span></a>
          <a href="/admin/schedule">▦ <span>Emplois du temps</span></a>
          <a href="/admin/setup">⚙ <span>Paramétrage</span></a>
          <a href="/absences">! <span>Absences</span></a>
          <a href="/wall">✦ <span>Mur pédagogique</span></a>
          <a href="/statistics">▥ <span>Statistiques</span></a>
        </nav>
        <div className="sidebar-footer">V1 • Architecture modulaire</div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">{roleLabel}</p>
            <h1>Bonjour, {name}</h1>
            <p className="muted">{dateLabel}</p>
          </div>
          <div className="top-actions">
            {demo && <span className="demo-badge">MODE DÉMO</span>}
            {!demo && <form action="/auth/signout" method="post"><button className="secondary-button">Déconnexion</button></form>}
          </div>
        </header>

        {demo && <div className="notice info">Cette maquette montre l’expérience cible. Les données affichées sont fictives.</div>}

        <section className="metric-grid">
          <Metric label="Cours prévus aujourd’hui" value={metrics.plannedToday} />
          <Metric label="Cours réalisés" value={metrics.doneToday} />
          <Metric label="Absences du jour" value={metrics.absencesToday} />
          <Metric label="À confirmer" value={metrics.pendingToday} />
        </section>

        <section className="dashboard-grid">
          <div className="card">
            <div className="section-title"><div><p className="eyebrow">Performance</p><h2>Indicateurs pédagogiques</h2></div><select aria-label="Période"><option>Ce mois</option><option>Cette semaine</option><option>Cette année</option></select></div>
            <Progress label="Taux de couverture horaire" value={metrics.hourlyCoverage} />
            <Progress label="Taux de couverture des programmes" value={metrics.programCoverage} />
            <Progress label="Taux d’assiduité" value={metrics.attendance} />
          </div>

          <div className="card compact-card">
            <p className="eyebrow">Action rapide</p>
            <h2>Validation de séance</h2>
            <p className="muted">L’enseignant confirme son cours en quelques secondes. La validation alimente automatiquement les indicateurs.</p>
            <button className="primary-button">Voir mes séances</button>
          </div>
        </section>

        <section className="card" id="today">
          <div className="section-title"><div><p className="eyebrow">Planning</p><h2>Cours du jour</h2></div><button className="secondary-button">Voir tout</button></div>
          <div className="sessions-list">
            {sessions.length === 0 ? <p className="empty-state">Aucune séance trouvée pour aujourd’hui.</p> : sessions.map((s, i) => (
              <article className="session-row" key={`${s.time}-${s.teacher}-${i}`}>
                <div className="session-time">{s.time}</div>
                <div className="session-main"><strong>{s.teacher}</strong><span>{s.className} • {s.lesson}</span></div>
                <span className={statusClass[s.status]}>{s.status}</span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <nav className="mobile-nav">
        <a className="active" href="/dashboard">⌂<span>Accueil</span></a>
        <a href="#today">◷<span>Aujourd’hui</span></a>
        <a href="/progress">▤<span>Progression</span></a>
        <a href="/wall">✦<span>Mur</span></a>
        <a href="/statistics">☰<span>Plus</span></a>
      </nav>
    </main>
  )
}
