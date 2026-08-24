import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Suivi pédagogique — Informatique',
  description: 'Plateforme de suivi et d’évaluation pédagogique du département d’informatique',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
