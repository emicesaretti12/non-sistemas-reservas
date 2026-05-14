/**
 * DATA EXPORT UTILITIES — Export reports, clients, and bookings to CSV/PDF.
 */

/**
 * Exports data to CSV and triggers download.
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - File name without extension
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 */
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) return

  const header = columns.map(c => `"${c.label}"`).join(',')
  const rows = data.map(row =>
    columns.map(c => {
      let val = typeof c.key === 'function' ? c.key(row) : row[c.key]
      if (val === null || val === undefined) val = ''
      // Escape quotes in CSV
      val = String(val).replace(/"/g, '""')
      return `"${val}"`
    }).join(',')
  )

  const csvContent = [header, ...rows].join('\n')
  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Generates a print-friendly HTML report and opens print dialog.
 * @param {Object} options - Report config
 */
export function exportReportPDF({
  title = 'Reporte',
  subtitle = '',
  negocioNombre = '',
  date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
  sections = [],  // { title, type: 'table'|'kpi'|'text', data, columns }
}) {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title} — ${negocioNombre}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #0f172a; padding: 40px; background: white; }
    .header { margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .header h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 4px; }
    .header .subtitle { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
    .header .meta { font-size: 11px; color: #94a3b8; margin-top: 8px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 12px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; }
    .kpi-value { font-size: 24px; font-weight: 900; letter-spacing: -0.03em; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 500; }
    tbody tr:hover { background: #fafafa; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
    <p class="meta">${negocioNombre} • ${date} • Generado por Non Sistemas</p>
  </div>`

  sections.forEach(section => {
    html += `<div class="section">`
    if (section.title) html += `<p class="section-title">${section.title}</p>`

    if (section.type === 'kpi' && section.data) {
      html += `<div class="kpi-grid">`
      section.data.forEach(kpi => {
        html += `<div class="kpi-card"><p class="kpi-label">${kpi.label}</p><p class="kpi-value">${kpi.value}</p></div>`
      })
      html += `</div>`
    }

    if (section.type === 'table' && section.data && section.columns) {
      html += `<table><thead><tr>`
      section.columns.forEach(c => { html += `<th>${c.label}</th>` })
      html += `</tr></thead><tbody>`
      section.data.forEach(row => {
        html += `<tr>`
        section.columns.forEach(c => {
          const val = typeof c.key === 'function' ? c.key(row) : row[c.key]
          html += `<td>${val ?? ''}</td>`
        })
        html += `</tr>`
      })
      html += `</tbody></table>`
    }

    if (section.type === 'text') {
      html += `<p style="font-size: 13px; color: #475569; line-height: 1.6;">${section.data}</p>`
    }

    html += `</div>`
  })

  html += `
  <div class="footer">
    <span>Non Sistemas — Plataforma de Gestión</span>
    <span>${date}</span>
  </div>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
  setTimeout(() => printWindow.print(), 500)
}

// --- INTERNAL ---
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
