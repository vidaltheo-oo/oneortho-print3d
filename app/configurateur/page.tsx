import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Configurateur — ONE PRINT',
}

// Le configurateur reprend l'index.html existant tel quel (importmap three.js,
// modules ES, jsPDF via CDN). Il est servi comme document statique depuis
// /public/configurateur-app.html et embarque ici en pleine page.
// Integration transitoire : sera converti en composants React page par page.
export default function ConfigurateurPage() {
  return (
    <iframe
      src="/configurateur-app.html"
      title="Configurateur ONE PRINT"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  )
}
