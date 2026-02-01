
export const APP_NAME = 'Gestor Lucrativo';

export const TABLES = {
  STORES: 'stores',
  PROFILES: 'profiles',
  STORE_MEMBERS: 'store_members',
  PRODUCTS: 'products',
  EXPENSES: 'expenses',
  TRANSACTIONS: 'transactions',
  CUSTOMERS: 'customers',
  CATEGORIES: 'categories',
} as const;

export const STORAGE_KEYS = {
  STORE_ID: 'onboarding_store_id',
  STEP: 'onboarding_step',
  METHOD: 'onboarding_method',
} as const;

export const IMPORT_TYPES = {
  PRODUCTS: 'products',
  SALES: 'sales',
  EXPENSES: 'expenses',
} as const;

export const WHATSAPP_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CHECKING: 'checking',
} as const;

export const THEME = {
  PRIMARY_COLOR: '#10b981',
} as const;
