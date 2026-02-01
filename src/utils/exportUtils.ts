/**
 * Utilitários para exportação de dados em CSV
 */

/**
 * Exporta array de objetos para CSV
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
): void {
  if (data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  // Se não forneceu headers, usa as chaves do primeiro objeto
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Cria linhas do CSV
  const csvRows: string[] = [];
  
  // Adiciona header
  csvRows.push(csvHeaders.join(','));
  
  // Adiciona dados
  data.forEach(item => {
    const row = csvHeaders.map(header => {
      const value = item[header];
      // Se contém vírgula, aspas ou quebra de linha, envolve em aspas
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(row.join(','));
  });
  
  // Cria blob e download
  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formata valor monetário para CSV (formato brasileiro)
 */
export function formatCurrencyForCSV(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/**
 * Formata data para CSV (formato brasileiro DD/MM/YYYY)
 */
export function formatDateForCSV(date: string): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return date;
  }
}
