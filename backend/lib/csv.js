function csvCell(value) {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
function csv(rows) { return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
module.exports = { csvCell, csv };
