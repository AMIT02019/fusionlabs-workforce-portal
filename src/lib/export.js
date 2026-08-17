// Utility for exporting data to CSV format and triggering browser download

export function exportToCSV(filename, headers, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.')
    return
  }

  // Escape fields that contain commas, double quotes, or newlines
  const escapeCell = (cell) => {
    if (cell == null) return '""'
    const str = String(cell)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return `"${str}"`
  }

  const headerLine = headers.map(escapeCell).join(',')
  const rowLines = rows.map((row) => row.map(escapeCell).join(','))
  const csvContent = [headerLine, ...rowLines].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
