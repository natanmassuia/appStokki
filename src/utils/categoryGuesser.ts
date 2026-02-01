/**
 * Função de categorização inteligente baseada em palavras-chave
 * Analisa o nome do produto e retorna uma categoria sugerida
 */
export function guessCategory(productName: string): string {
  if (!productName) return 'Outros';
  
  const name = productName.toLowerCase().trim();
  
  // Áudio
  if (
    name.includes('fone') ||
    name.includes('airpod') ||
    name.includes('headset') ||
    name.includes('headphone') ||
    name.includes('earphone') ||
    name.includes('caixa de som') ||
    name.includes('speaker') ||
    name.includes('microfone') ||
    name.includes('mic')
  ) {
    return 'Áudio';
  }
  
  // Smartwatches
  if (
    name.includes('relogio') ||
    name.includes('relógio') ||
    name.includes('smartwatch') ||
    name.includes('watch') ||
    name.includes('pulseira')
  ) {
    return 'Smartwatches';
  }
  
  // Acessórios
  if (
    name.includes('carregador') ||
    name.includes('cabo') ||
    name.includes('fonte') ||
    name.includes('capa') ||
    name.includes('case') ||
    name.includes('pelicula') ||
    name.includes('película') ||
    name.includes('suporte') ||
    name.includes('stand') ||
    name.includes('protetor')
  ) {
    return 'Acessórios';
  }
  
  // Periféricos
  if (
    name.includes('mouse') ||
    name.includes('teclado') ||
    name.includes('keyboard') ||
    name.includes('gamepad') ||
    name.includes('joystick') ||
    name.includes('webcam') ||
    name.includes('câmera') ||
    name.includes('camera')
  ) {
    return 'Periféricos';
  }
  
  // Celulares/Smartphones
  if (
    name.includes('celular') ||
    name.includes('smartphone') ||
    name.includes('iphone') ||
    name.includes('samsung') ||
    name.includes('xiaomi') ||
    name.includes('motorola')
  ) {
    return 'Celulares';
  }
  
  // Tablets
  if (
    name.includes('tablet') ||
    name.includes('ipad')
  ) {
    return 'Tablets';
  }
  
  // Notebooks/Computadores
  if (
    name.includes('notebook') ||
    name.includes('laptop') ||
    name.includes('computador') ||
    name.includes('pc')
  ) {
    return 'Computadores';
  }
  
  // Padrão: Outros
  return 'Outros';
}
