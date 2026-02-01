/**
 * Formata número de telefone para o formato do WhatsApp (Evolution API)
 * Remove todos os caracteres não numéricos
 * Se começar com código de área brasileiro (11-99) e tiver 10 ou 11 dígitos, adiciona '55'
 * @param phone Número de telefone em qualquer formato
 * @returns Número formatado (ex: 5511999999999)
 */
export function formatPhoneForWhatsapp(phone: string): string {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Se está vazio após limpeza, retorna vazio
  if (!cleanPhone) return '';
  
  // Verifica se começa com código de área brasileiro (11 a 99)
  const brazilAreaCode = /^(1[1-9]|[2-9][0-9])/;
  
  // Se tem 10 ou 11 dígitos e começa com código de área brasileiro, adiciona '55'
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && brazilAreaCode.test(cleanPhone)) {
    // Se já começa com 55, não adiciona novamente
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
  }
  
  return cleanPhone;
}
