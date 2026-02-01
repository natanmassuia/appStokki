import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Humaniza mensagens de erro do Supabase e outras APIs
 * Remove termos técnicos e traduz para mensagens amigáveis
 */
export function humanizeError(error: any): string {
  if (!error) return 'Ocorreu um erro inesperado. Tente novamente.';
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  
  // Erros do Supabase relacionados a autenticação e banco de dados
  // Trata erros 500 e problemas de trigger/banco de dados
  if (errorMessage.includes('Database error finding user') ||
      errorMessage.includes('Database error saving new user') || 
      (errorMessage.includes('database error') && errorMessage.includes('user')) ||
      (errorMessage.includes('Internal Server Error') && errorMessage.includes('Database'))) {
    return 'Erro no servidor ao processar sua conta. Isso pode ser um problema temporário. Por favor, tente novamente em alguns instantes ou entre em contato com o suporte.';
  }
  
  // Erro 500 genérico
  if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
    return 'Erro no servidor. Por favor, tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.';
  }
  
  // Erros do Supabase
  if (errorCode === '23505' || errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
    return 'Este item já está cadastrado.';
  }
  
  if (errorCode === '23503' || errorMessage.includes('foreign key constraint') || errorMessage.includes('violates foreign key')) {
    return 'Não é possível excluir este item pois ele possui registros vinculados (ex: vendas ou histórico).';
  }
  
  if (errorMessage.includes('permission denied') || errorMessage.includes('RLS') || errorMessage.includes('row-level security')) {
    return 'Você não tem permissão para realizar esta ação.';
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
    return 'Falha na conexão. Verifique sua internet.';
  }
  
  // NOTA: "User not found" só é erro em LOGIN, não em CADASTRO!
  // Esta função é genérica, então mantemos o tratamento, mas as páginas específicas
  // devem sobrescrever essa mensagem conforme o contexto (login vs cadastro)
  // Na página de CADASTRO, "user not found" deve ser IGNORADO (não é erro)
  
  // Trata "not found" mas evita mensagem genérica "Item não encontrado" para erros de autenticação
  // Se for erro relacionado a usuário/autenticação, retorna mensagem mais específica
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    // Se for erro de autenticação/usuário, não usa mensagem genérica
    if (errorMessage.includes('user') || errorMessage.includes('auth') || errorMessage.includes('account')) {
      // Retorna mensagem genérica amigável para autenticação
      return 'Não foi possível processar sua solicitação. Por favor, tente novamente.';
    }
    // Para outros casos (produtos, lojas, etc), usa mensagem genérica
    return 'Item não encontrado.';
  }
  
  if (errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('403')) {
    return 'Não autorizado. Verifique suas credenciais.';
  }
  
  // Trata mensagens em inglês que precisam ser traduzidas
  // NOTA: "User not found" em contexto de LOGIN é diferente de CADASTRO
  // Esta função genérica retorna mensagem neutra, mas as páginas específicas devem sobrescrever
  if (errorMessage.includes('User not found') || errorMessage.includes('user not found')) {
    // Mensagem genérica - páginas específicas devem sobrescrever conforme contexto
    return 'Não foi possível processar sua solicitação. Por favor, tente novamente.';
  }
  
  if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.';
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e confirme seu e-mail antes de fazer login.';
  }
  
  // Se a mensagem já está em português e não contém termos técnicos, retorna como está
  if (errorMessage && 
      !errorMessage.includes('Error') && 
      !errorMessage.includes('TypeError') && 
      !errorMessage.includes('ReferenceError') &&
      !errorMessage.includes('User not found') &&
      !errorMessage.includes('user not found')) {
    return errorMessage;
  }
  
  // Fallback genérico amigável
  return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
}
