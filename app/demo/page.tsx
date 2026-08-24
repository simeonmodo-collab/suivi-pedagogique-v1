import DashboardShell from '@/components/DashboardShell'

export default function DemoPage() {
  return <DashboardShell
    demo
    name="M. Animateur"
    roleLabel="Animateur pédagogique"
    dateLabel="Mardi 18 août 2026"
    metrics={{ plannedToday: 18, doneToday: 14, absencesToday: 2, pendingToday: 2, hourlyCoverage: 87, programCoverage: 78, attendance: 94 }}
    sessions={[
      { time: '08h–10h', teacher: 'M. Talla', className: '3e A', lesson: 'Fonctions du tableur', status: 'Fait' },
      { time: '08h–10h', teacher: 'Mme Ndom', className: '4e B', lesson: 'Internet et services', status: 'Non fait' },
      { time: '10h–12h', teacher: 'M. Fopa', className: '1ère C', lesson: 'Structures répétitives', status: 'À confirmer' },
      { time: '14h–16h', teacher: 'Mme Ngo’o', className: 'Tle', lesson: 'Bases de données', status: 'À venir' },
    ]}
  />
}
