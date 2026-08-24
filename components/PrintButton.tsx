'use client'

export default function PrintButton() {
  return <button className="secondary-button no-print" type="button" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
}
