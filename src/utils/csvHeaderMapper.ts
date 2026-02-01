/**
 * Normaliza strings para comparação (remove acentos, caracteres especiais, etc)
 */
export function normalizeHeader(header: string): string {
  if (!header) return '';
  
  return header
    .toLowerCase()
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Mapeia headers do CSV para campos de produtos
 */
export function mapProductHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeHeader(h) }));


  // Aliases para cada campo (incluindo o nome exato do campo)
  const aliases = {
    name: ['name', 'nome', 'produto', 'descricao', 'item', 'modelo', 'titulo', 'mercadoria', 'artigo'],
    quantity: ['quantity', 'qtd', 'quantidade', 'estoque', 'saldo', 'unidades', 'qtd.', 'qtd '],
    cost_price: ['cost_price', 'custo', 'compra', 'pago', 'valor unitario', 'vlr custo', 'preco custo', 'preco de custo', 'quanto paguei', 'valor compra'],
    selling_price: ['selling_price', 'venda', 'preco', 'valor venda', 'saida', 'preco final', 'preco de venda', 'valor de venda', 'preco venda', 'vlr venda'],
    category: ['category', 'categoria', 'grupo', 'tipo', 'departamento', 'setor'],
    color: ['color', 'cor', 'cores', 'variacao', 'variante'],
  };

  // Mapeia cada campo
  for (const [field, fieldAliases] of Object.entries(aliases)) {
    // Primeiro verifica match exato com o nome do campo original (case-insensitive)
    let found = normalizedHeaders.find(h => {
      const hLower = h.original.toLowerCase().trim();
      return hLower === field.toLowerCase() || hLower === field.replace('_', ' ').toLowerCase();
    });

    // Se não encontrou, verifica match exato normalizado
    if (!found) {
      const normalizedField = normalizeHeader(field);
      found = normalizedHeaders.find(h => h.normalized === normalizedField);
    }

    // Se não encontrou, procura por match exato com aliases
    if (!found) {
      found = normalizedHeaders.find(h => 
        fieldAliases.some(alias => {
          const normalizedAlias = normalizeHeader(alias);
          return h.normalized === normalizedAlias || h.original.toLowerCase() === alias.toLowerCase();
        })
      );
    }

    // Se não encontrou, procura por palavras-chave dentro do header
    if (!found) {
      for (const alias of fieldAliases) {
        const normalizedAlias = normalizeHeader(alias);
        found = normalizedHeaders.find(h => {
          const words = h.normalized.split(' ');
          return words.some(word => word === normalizedAlias || word.includes(normalizedAlias) || normalizedAlias.includes(word));
        });
        if (found) break;
      }
    }

    if (found) {
      mapping[field] = found.original;
    }
  }

  // Resolve conflitos: se "Preço Custo" e "Preço Venda" ambos têm "preco"
  // Prioriza palavras específicas
  if (mapping.cost_price && mapping.selling_price) {
    const costHeader = normalizedHeaders.find(h => h.original === mapping.cost_price);
    const sellHeader = normalizedHeaders.find(h => h.original === mapping.selling_price);
    
    if (costHeader && sellHeader) {
      const costNormalized = costHeader.normalized;
      const sellNormalized = sellHeader.normalized;
      
      // Se ambos contêm "preco", verifica palavras específicas
      if (costNormalized.includes('preco') && sellNormalized.includes('preco')) {
        // Prioriza "custo" vs "venda"
        if (costNormalized.includes('custo') || costNormalized.includes('compra') || costNormalized.includes('pago')) {
          // OK, já está mapeado corretamente
        } else if (sellNormalized.includes('custo') || sellNormalized.includes('compra')) {
          // Trocou! Corrige
          [mapping.cost_price, mapping.selling_price] = [mapping.selling_price, mapping.cost_price];
        }
      }
    }
  }

  return mapping;
}

/**
 * Mapeia headers do CSV para campos de clientes
 */
export function mapCustomerHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeHeader(h) }));

  const aliases = {
    name: ['name', 'nome', 'cliente', 'nome do cliente', 'nome completo', 'razao social'],
    phone: ['phone', 'telefone', 'celular', 'whatsapp', 'whats', 'tel', 'contato'],
    email: ['email', 'e-mail', 'correio eletronico', 'mail'],
    document: ['document', 'cpf', 'cnpj', 'cpf/cnpj', 'documento', 'doc'],
  };

  for (const [field, fieldAliases] of Object.entries(aliases)) {
    let found = normalizedHeaders.find(h => {
      const hLower = h.original.toLowerCase().trim();
      return hLower === field.toLowerCase() || hLower === field.replace('_', ' ').toLowerCase();
    });

    if (!found) {
      const normalizedField = normalizeHeader(field);
      found = normalizedHeaders.find(h => h.normalized === normalizedField);
    }

    if (!found) {
      found = normalizedHeaders.find(h => 
        fieldAliases.some(alias => {
          const normalizedAlias = normalizeHeader(alias);
          return h.normalized === normalizedAlias || h.original.toLowerCase() === alias.toLowerCase();
        })
      );
    }

    if (!found) {
      const sortedAliases = [...fieldAliases].sort((a, b) => b.length - a.length);
      for (const alias of sortedAliases) {
        const normalizedAlias = normalizeHeader(alias);
        found = normalizedHeaders.find(h => {
          if (h.normalized.includes(normalizedAlias) || normalizedAlias.includes(h.normalized)) {
            return true;
          }
          const words = h.normalized.split(' ');
          return words.some(word => word === normalizedAlias || word.includes(normalizedAlias) || normalizedAlias.includes(word));
        });
        if (found) break;
      }
    }

    if (found) {
      mapping[field] = found.original;
    }
  }

  return mapping;
}

/**
 * Mapeia headers do CSV para campos de fornecedores
 */
export function mapSupplierHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeHeader(h) }));

  const aliases = {
    name: ['name', 'nome', 'fornecedor', 'empresa', 'razao social', 'nome fantasia'],
    category: ['category', 'categoria', 'tipo', 'ramo', 'segmento'],
    phone: ['phone', 'telefone', 'celular', 'whatsapp', 'whats', 'tel', 'contato'],
    email: ['email', 'e-mail', 'correio eletronico', 'mail'],
    document: ['document', 'cpf', 'cnpj', 'cpf/cnpj', 'documento', 'doc'],
  };

  for (const [field, fieldAliases] of Object.entries(aliases)) {
    let found = normalizedHeaders.find(h => {
      const hLower = h.original.toLowerCase().trim();
      return hLower === field.toLowerCase() || hLower === field.replace('_', ' ').toLowerCase();
    });

    if (!found) {
      const normalizedField = normalizeHeader(field);
      found = normalizedHeaders.find(h => h.normalized === normalizedField);
    }

    if (!found) {
      found = normalizedHeaders.find(h => 
        fieldAliases.some(alias => {
          const normalizedAlias = normalizeHeader(alias);
          return h.normalized === normalizedAlias || h.original.toLowerCase() === alias.toLowerCase();
        })
      );
    }

    if (!found) {
      const sortedAliases = [...fieldAliases].sort((a, b) => b.length - a.length);
      for (const alias of sortedAliases) {
        const normalizedAlias = normalizeHeader(alias);
        found = normalizedHeaders.find(h => {
          if (h.normalized.includes(normalizedAlias) || normalizedAlias.includes(h.normalized)) {
            return true;
          }
          const words = h.normalized.split(' ');
          return words.some(word => word === normalizedAlias || word.includes(normalizedAlias) || normalizedAlias.includes(word));
        });
        if (found) break;
      }
    }

    if (found) {
      mapping[field] = found.original;
    }
  }

  return mapping;
}

/**
 * Mapeia headers do CSV para campos de gastos
 */
export function mapExpenseHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeHeader(h) }));


  // Aliases para cada campo (incluindo o nome exato do campo)
  // ORDEM IMPORTA: aliases mais específicos primeiro
  const aliases = {
    description: ['description', 'descricao', 'descrição', 'motivo', 'motivo da despesa', 'nome', 'despesa', 'historico', 'referencia', 'observacao', 'obs'],
    amount: ['amount', 'valor', 'valor pago', 'total', 'pago', 'quantia', 'custo', 'vlr', 'preco'],
    date: ['date', 'data', 'data do gasto', 'data do pagamento', 'data da despesa', 'dia', 'vencimento', 'pagamento', 'criado em', 'criado', 'dt'],
  };

  // Mapeia cada campo
  for (const [field, fieldAliases] of Object.entries(aliases)) {
    // Primeiro verifica match exato com o nome do campo original (case-insensitive)
    let found = normalizedHeaders.find(h => {
      const hLower = h.original.toLowerCase().trim();
      return hLower === field.toLowerCase() || hLower === field.replace('_', ' ').toLowerCase();
    });

    // Se não encontrou, verifica match exato normalizado
    if (!found) {
      const normalizedField = normalizeHeader(field);
      found = normalizedHeaders.find(h => h.normalized === normalizedField);
    }

    // Se não encontrou, procura por match exato com aliases
    if (!found) {
      found = normalizedHeaders.find(h => 
        fieldAliases.some(alias => {
          const normalizedAlias = normalizeHeader(alias);
          return h.normalized === normalizedAlias || h.original.toLowerCase() === alias.toLowerCase();
        })
      );
    }

    // Se não encontrou, procura por palavras-chave dentro do header
    // Prioriza aliases mais longos/específicos primeiro
    if (!found) {
      // Ordena aliases por comprimento (mais longos primeiro) para priorizar matches específicos
      const sortedAliases = [...fieldAliases].sort((a, b) => b.length - a.length);
      for (const alias of sortedAliases) {
        const normalizedAlias = normalizeHeader(alias);
        found = normalizedHeaders.find(h => {
          // Verifica se o header contém o alias completo (match mais específico)
          if (h.normalized.includes(normalizedAlias) || normalizedAlias.includes(h.normalized)) {
            return true;
          }
          // Verifica palavras individuais
          const words = h.normalized.split(' ');
          return words.some(word => word === normalizedAlias || word.includes(normalizedAlias) || normalizedAlias.includes(word));
        });
        if (found) break;
      }
    }

    if (found) {
      mapping[field] = found.original;
    }
  }

  return mapping;
}

/**
 * Mapeia headers do CSV para campos de vendas (transações)
 */
export function mapSalesHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeHeader(h) }));
  const usedHeaders = new Set<string>();

  // Aliases para cada campo (incluindo o nome exato do campo)
  // ORDEM IMPORTA: aliases mais específicos primeiro
  const aliases = {
    date: ['data', 'date', 'dia', 'criado em', 'criado', 'data da venda', 'data venda', 'dt'],
    product: ['produto', 'item', 'mercadoria', 'nome do produto', 'produto vendido', 'nome'],
    quantity: ['quantidade', 'qtd', 'unidades', 'qtd.', 'qtd '],
    total: ['valor total', 'total', 'valor', 'preco', 'preço', 'venda', 'total venda'],
    customer: ['cliente', 'comprador', 'nome cliente', 'cliente nome'],
  };

  for (const [field, fieldAliases] of Object.entries(aliases)) {
    // Primeiro verifica match exato com o nome do campo original (case-insensitive)
    let found = normalizedHeaders.find(h => {
      const hLower = h.original.toLowerCase().trim();
      if (usedHeaders.has(h.original)) return false;
      return hLower === field.toLowerCase() || hLower === field.replace('_', ' ').toLowerCase();
    });

    // Se não encontrou, verifica match exato normalizado
    if (!found) {
      const normalizedField = normalizeHeader(field);
      found = normalizedHeaders.find(h => h.normalized === normalizedField && !usedHeaders.has(h.original));
    }

    // Se não encontrou, procura por match exato com aliases
    if (!found) {
      found = normalizedHeaders.find(h =>
        fieldAliases.some(alias => {
          const normalizedAlias = normalizeHeader(alias);
          if (usedHeaders.has(h.original)) return false;
          if (field === 'product' && normalizedAlias === 'nome' && h.normalized.includes('cliente')) {
            return false;
          }
          return h.normalized === normalizedAlias || h.original.toLowerCase() === alias.toLowerCase();
        })
      );
    }

    // Se não encontrou, procura por palavras-chave dentro do header
    if (!found) {
      const sortedAliases = [...fieldAliases].sort((a, b) => b.length - a.length);
      for (const alias of sortedAliases) {
        const normalizedAlias = normalizeHeader(alias);
        found = normalizedHeaders.find(h => {
          if (usedHeaders.has(h.original)) return false;
          if (field === 'product' && normalizedAlias === 'nome' && h.normalized.includes('cliente')) {
            return false;
          }
          if (h.normalized.includes(normalizedAlias) || normalizedAlias.includes(h.normalized)) {
            return true;
          }
          const words = h.normalized.split(' ');
          return words.some(word => word === normalizedAlias || word.includes(normalizedAlias) || normalizedAlias.includes(word));
        });
        if (found) break;
      }
    }

    if (found) {
      mapping[field] = found.original;
      usedHeaders.add(found.original);
    }
  }

  return mapping;
}
