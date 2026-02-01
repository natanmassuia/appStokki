
import { read, utils } from 'xlsx';
import { mapProductHeaders, mapExpenseHeaders, mapSalesHeaders, mapCustomerHeaders, mapSupplierHeaders } from '@/utils/csvHeaderMapper';
import { IMPORT_TYPES } from '@/constants/app';

export interface ImportData {
  products: any[];
  sales: any[];
  expenses: any[];
  customers: any[];
  suppliers: any[];
}

export type SheetType = 'products' | 'sales' | 'expenses' | 'customers' | 'suppliers' | 'unknown';

/**
 * Helper to parse date values
 */
const parseDate = (value: any): string => {
  if (!value) return new Date().toISOString();
  
  // Excel serial number
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString();
  }
  
  // String formats
  if (typeof value === 'string') {
    if (value.includes('/')) {
      const parts = value.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) return date.toISOString();
      }
    }
  }

  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.toISOString();
  } catch {}
  
  return new Date().toISOString();
};

/**
 * Helper to parse currency values
 */
const parseCurrency = (value: any): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  
  // Remove R$, spaces, etc
  const cleanStr = str.replace(/[^\d.,-]/g, '');
  
  // Check if empty
  if (!cleanStr) return 0;

  // Detect format
  const hasComma = cleanStr.includes(',');
  const hasDot = cleanStr.includes('.');

  if (hasComma && hasDot) {
    const lastDot = cleanStr.lastIndexOf('.');
    const lastComma = cleanStr.lastIndexOf(',');
    
    // If dot comes last, assume US format (1,200.00) -> remove commas
    if (lastDot > lastComma) {
      return Number(cleanStr.replace(/,/g, ''));
    } else {
      // Assume BR format (1.200,00) -> remove dots, replace comma with dot
      return Number(cleanStr.replace(/\./g, '').replace(',', '.'));
    }
  }
  
  if (hasComma) {
    // If only comma, likely BR decimal (1200,00) or thousands separator?
    // Usually if there is one comma and it's near the end (2 chars), it's decimal.
    // Safe bet for BR inputs: replace comma with dot.
    return Number(cleanStr.replace(',', '.'));
  }
  
  // Only dots or plain number
  return Number(cleanStr);
};

export const importService = {
  /**
   * Detects the type of data in a sheet based on its name and content
   */
  detectSheetType(sheetName: string, data: any[] = []): SheetType {
    const lower = sheetName.toLowerCase();
    
    // 1. Name-based detection (Strong signals)
    if (lower.includes('vend') || lower.includes('sale') || lower.includes('saída') || lower.includes('faturamento')) return 'sales';
    if (lower.includes('desp') || lower.includes('gast') || lower.includes('expens') || lower.includes('custo')) return 'expenses';
    if (lower.includes('client') || lower.includes('consumidor') || lower.includes('customer')) return 'customers';
    if (lower.includes('fornecedor') || lower.includes('supplier') || lower.includes('parceiro')) return 'suppliers';
    if (lower.includes('prod') || lower.includes('estoque') || lower.includes('item') || lower.includes('inv')) return 'products';

    // 2. Content-based detection (Fallback)
    if (data.length > 0) {
      const firstRow = data[0];
      const keys = Object.keys(firstRow).map(k => k.toLowerCase());
      
      // Keywords
      const hasDesc = keys.some(k => k.includes('descri') || k.includes('gasto') || k.includes('motivo'));
      const hasAmount = keys.some(k => k.includes('valor') || k.includes('total') || k.includes('custo') || k.includes('preço'));
      const hasDate = keys.some(k => k.includes('data') || k.includes('dia') || k.includes('vencimento'));
      
      const hasProduct = keys.some(k => k.includes('produto') || k.includes('nome') || k.includes('sku') || k.includes('item'));
      const hasQty = keys.some(k => k.includes('qtd') || k.includes('quantidade') || k.includes('estoque'));

      const hasPhone = keys.some(k => k.includes('telefone') || k.includes('celular') || k.includes('whatsapp') || k.includes('fone'));
      const hasEmail = keys.some(k => k.includes('email') || k.includes('e-mail'));
      const hasDoc = keys.some(k => k.includes('cpf') || k.includes('cnpj') || k.includes('documento'));

      // Expense signature: Description/Gasto + Amount (and usually Date, but no Product/Qty)
      if ((hasDesc || keys.includes('gasto')) && hasAmount && !hasProduct && !hasQty) return 'expenses';
      
      // Fallback for specific user columns "Motivo da Despesa", "Valor Pago", "Data do Gasto"
      if (keys.some(k => k.includes('motivo') || k.includes('valor pago') || k.includes('data do gasto'))) return 'expenses';

      // Sales signature: Product + Qty + Total/Value + Date
      if (hasProduct && (hasQty || hasAmount) && hasDate) return 'sales';
      
      // Customers/Suppliers signature: Name + Phone/Email/Doc
      if (hasProduct /* Name */ && (hasPhone || hasEmail || hasDoc) && !hasQty && !hasAmount) {
        // If it looks like a person/company, but ambiguous, check sheet name again or default to customers
        // Usually suppliers have "Category" or "Ramo"
        if (keys.some(k => k.includes('categoria') || k.includes('ramo'))) return 'suppliers';
        return 'customers';
      }

      // Product signature: Product + Price + Qty
      if (hasProduct && (hasQty || hasAmount)) return 'products';
    }

    return 'unknown';
  },

  /**
   * Parses an Excel file and returns categorized data
   */
  async parseExcelFile(file: File): Promise<ImportData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = read(bstr, { type: 'binary' });
          
          const result: ImportData = {
            products: [],
            sales: [],
            expenses: [],
            customers: [],
            suppliers: []
          };

          if (wb.SheetNames.length === 1) {
            const sheetName = wb.SheetNames[0];
            const ws = wb.Sheets[sheetName];
            const data = utils.sheet_to_json(ws);
            
            let type = this.detectSheetType(sheetName, data);
            
            // Default to products if unknown
            if (type === 'unknown') type = 'products';

            if (type === 'sales') result.sales = data;
            else if (type === 'expenses') result.expenses = data;
            else if (type === 'customers') result.customers = data;
            else if (type === 'suppliers') result.suppliers = data;
            else result.products = data;
          } else {
            // Multiple sheets
            wb.SheetNames.forEach(sheetName => {
              const ws = wb.Sheets[sheetName];
              const data = utils.sheet_to_json(ws);
              let type = this.detectSheetType(sheetName, data);
              
              if (type === 'unknown') type = 'products';
              
              if (type === 'products') result.products.push(...data);
              else if (type === 'sales') result.sales.push(...data);
              else if (type === 'expenses') result.expenses.push(...data);
              else if (type === 'customers') result.customers.push(...data);
              else if (type === 'suppliers') result.suppliers.push(...data);
            });
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  },

  // Expose helpers if needed externally, but internal usage should use consts
  parseDate,
  parseCurrency,

  /**
   * Normalizes expense data using header mappers
   */
  normalizeExpenses(rawData: any[], storeId: string) {
    if (rawData.length === 0) return [];
    
    // Get headers from first row
    const headers = Object.keys(rawData[0]);
    const mapping = mapExpenseHeaders(headers);
    
    return rawData.map(row => {
      const getValue = (field: string) => {
        if (mapping[field] && row[mapping[field]] !== undefined) {
          return row[mapping[field]];
        }
        return undefined;
      };

      const findValueByKeys = (keys: string[]) => {
        for (const key of keys) {
           if (row[key] !== undefined) return row[key];
           const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
           if (foundKey && row[foundKey] !== undefined) return row[foundKey];
        }
        return undefined;
      };
      
      const description = getValue('description') || findValueByKeys(['descrição', 'descricao', 'description', 'gasto', 'motivo da despesa', 'motivo']) || 'Despesa sem nome';
      const amountVal = findValueByKeys(['valor pago', 'valor do gasto']) || getValue('amount') || findValueByKeys(['valor', 'amount', 'preço', 'custo']) || 0;
      const dateVal = findValueByKeys(['data do gasto', 'data da despesa']) || getValue('date') || findValueByKeys(['data', 'date']) || new Date();

      return {
        store_id: storeId,
        description: String(description),
        amount: parseCurrency(amountVal),
        date: parseDate(dateVal),
      };
    });
  },

  /**
   * Normalizes product data
   */
  normalizeProducts(rawData: any[], storeId: string) {
    return rawData.map(row => {
      // Basic normalization (case insensitive keys search)
      const lowerRow = Object.keys(row).reduce((acc, key) => {
        acc[key.toLowerCase()] = row[key];
        return acc;
      }, {} as any);
  
      const minStockRaw = lowerRow['estoque mínimo'] || lowerRow['estoque minimo'] || lowerRow['min stock'] || lowerRow['min_stock'];
      const categoryRaw = lowerRow['categoria'] || lowerRow['category'] || lowerRow['departamento'];

      return {
        store_id: storeId, 
        name: lowerRow['nome'] || lowerRow['name'] || lowerRow['produto'] || 'Produto Sem Nome',
        quantity: parseCurrency(lowerRow['quantidade'] || lowerRow['qtd'] || lowerRow['quantity'] || lowerRow['estoque'] || 1),
        selling_price: parseCurrency(lowerRow['preço'] || lowerRow['preco'] || lowerRow['valor'] || lowerRow['price'] || lowerRow['venda'] || 0),
        cost_price: parseCurrency(lowerRow['custo'] || lowerRow['cost'] || 0),
        // min_stock: minStockRaw ? parseCurrency(minStockRaw) : 5, // Disabled: column missing in DB
        // Temporary field for processing in UI - must be removed before insert if not in DB
        _category_name: categoryRaw ? String(categoryRaw).trim() : null
      };
    });
  },

  /**
   * Normalizes sales data
   */
  normalizeSales(rawData: any[], storeId: string) {
    return rawData.map(row => {
      const lowerRow = Object.keys(row).reduce((acc, key) => {
        acc[key.toLowerCase()] = row[key];
        return acc;
      }, {} as any);

      const clientName = lowerRow['cliente'] || lowerRow['client'] || lowerRow['nome'] || lowerRow['comprador'] || lowerRow['customer'] || null;
      const productName = lowerRow['produto'] || lowerRow['product'] || lowerRow['nome do produto'] || lowerRow['item'];
      
      let description = 'Venda Avulsa';
      if (clientName) {
        description = `Venda - ${clientName}`;
      } else if (productName) {
        description = `Venda - ${productName}`;
      }

      return {
        store_id: storeId,
        type: 'sale',
        product_name: productName || 'Venda importada', // Mantém fallback para coluna no banco
        quantity: parseCurrency(lowerRow['quantidade'] || lowerRow['qtd'] || lowerRow['quantity'] || 1),
        unit_price: parseCurrency(lowerRow['valor unitário'] || lowerRow['unit price'] || lowerRow['preço'] || 0),
        total_amount: parseCurrency(lowerRow['total'] || lowerRow['valor total'] || lowerRow['amount'] || lowerRow['valor'] || 0),
        created_at: parseDate(lowerRow['data'] || lowerRow['date']),
        // O campo 'description' não existe na tabela transactions, mas podemos usar 'product_name' 
        // ou adaptar a lógica de exibição no Dashboard. 
        // Como o pedido é para alterar a lógica de importação para gerar descrições dinâmicas, 
        // e o Dashboard usa product_name como descrição principal para vendas, vamos enriquecer o product_name se ele for genérico.
        // MAS, product_name deveria ser o nome do produto.
        // Se a intenção é mostrar "Venda - Cliente", talvez devêssemos salvar isso em algum lugar ou ajustar a exibição.
        // O código atual do Dashboard usa: description: productName, (linha 301 do useDashboard.ts)
        // Então se mudarmos product_name aqui, muda lá.
        // Porém, misturar nome de cliente no nome do produto pode não ser ideal para relatórios de produtos.
        // A melhor abordagem (Action 2) é ajustar a exibição no Dashboard.
        // Mas o usuário pediu "Change the Description Logic" na importação.
        // Se não temos coluna de descrição na venda, vamos manter o product_name como o nome do produto mesmo.
        // Vamos focar em garantir que pegamos o nome do cliente se houver, para que o dashboard possa usar.
        // O dashboard busca customers(name). Precisaríamos vincular o customer_id.
        // Como isso é complexo na importação (criar/buscar cliente on the fly), 
        // vamos seguir a instrução de "Change the Description Logic" para o Dashboard no Action 2.
      };
    });
  },

  /**
   * Normalizes customer data
   */
  normalizeCustomers(rawData: any[], storeId: string) {
    if (rawData.length === 0) return [];
    const headers = Object.keys(rawData[0]);
    const mapping = mapCustomerHeaders(headers);

    return rawData.map(row => {
      const getValue = (field: string) => {
        if (mapping[field] && row[mapping[field]] !== undefined) {
          return row[mapping[field]];
        }
        return undefined;
      };

      const name = getValue('name') || row['nome'] || row['Nome'] || 'Cliente Sem Nome';
      const phone = getValue('phone') || row['telefone'] || row['celular'] || row['whatsapp'] || '';
      const email = getValue('email') || row['email'] || '';
      const document = getValue('document') || row['cpf'] || row['cnpj'] || '';

      return {
        store_id: storeId,
        name: String(name),
        phone: String(phone),
        // Additional fields if available in your DB schema
        // email: String(email),
        // document: String(document),
      };
    });
  },

  /**
   * Normalizes supplier data
   */
  normalizeSuppliers(rawData: any[], storeId: string) {
    if (rawData.length === 0) return [];
    const headers = Object.keys(rawData[0]);
    const mapping = mapSupplierHeaders(headers);

    return rawData.map(row => {
      const getValue = (field: string) => {
        if (mapping[field] && row[mapping[field]] !== undefined) {
          return row[mapping[field]];
        }
        return undefined;
      };

      const name = getValue('name') || row['nome'] || row['fornecedor'] || 'Fornecedor Sem Nome';
      const category = getValue('category') || row['categoria'] || row['ramo'] || '';
      const phone = getValue('phone') || row['telefone'] || row['celular'] || '';
      const email = getValue('email') || row['email'] || '';

      return {
        store_id: storeId,
        name: String(name),
        category: String(category),
        phone: String(phone),
        email: String(email),
      };
    });
  }
};
