// Brazilian Real currency formatter
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Format percentage
export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

// Format date in Brazilian format
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};

// Format date with time
export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Calculate margin percentage
export const calculateMargin = (costPrice: number, sellingPrice: number): number => {
  if (costPrice === 0) return 0;
  return ((sellingPrice - costPrice) / costPrice) * 100;
};

// Calculate selling price with margin
export const calculateSellingPrice = (costPrice: number, marginPercent: number = 45): number => {
  return costPrice * (1 + marginPercent / 100);
};

// Calculate profit
export const calculateProfit = (costPrice: number, sellingPrice: number, quantity: number = 1): number => {
  return (sellingPrice - costPrice) * quantity;
};
