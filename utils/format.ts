// utils/format.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedCurrency = "EGP";
let cachedSymbol = "E£";
let listeners: Array<() => void> = [];

const currencyMap: Record<string, { code: string; symbol: string }> = {
  EG: { code: "EGP", symbol: "E£" },
  AE: { code: "AED", symbol: "د.إ" },
  SA: { code: "SAR", symbol: "﷼" },
  KW: { code: "KWD", symbol: "KD" },
  QA: { code: "QAR", symbol: "﷼" },
  OM: { code: "OMR", symbol: "﷼" },
  BH: { code: "BHD", symbol: ".د.ب" },
};

export async function loadCurrency() {
  try {
    const region = await AsyncStorage.getItem("user_selected_region");
    const currencyData = currencyMap[region || "EG"] || currencyMap.EG;
    
    const changed = cachedCurrency !== currencyData.code || cachedSymbol !== currencyData.symbol;
    
    cachedCurrency = currencyData.code;
    cachedSymbol = currencyData.symbol;
    
    if (changed) {
      console.log(`Currency updated to: ${cachedCurrency} (${cachedSymbol})`);
      listeners.forEach(listener => listener());
    }
  } catch (error) {
    console.error("Error loading currency:", error);
  }
}
export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function isValidDateStr(dateStr: string): boolean {
  if (!dateStr || dateStr.length !== 10) return false;
  const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (!regex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
const currencyListeners: Array<() => void> = [];

export function subscribeToCurrencyChanges(listener: () => void): () => void {
  currencyListeners.push(listener);
  return () => {
    const index = currencyListeners.indexOf(listener);
    if (index > -1) currencyListeners.splice(index, 1);
  };
}

export function notifyCurrencyChange() {
  currencyListeners.forEach(listener => listener());
}
export function today(): string {
  return new Date().toISOString().split('T')[0];
}
// Call this from SettingsScreen when region changes
export async function updateCurrencyFromRegion(regionCode: string) {
  const currencyData = currencyMap[regionCode] || currencyMap.EG;
  cachedCurrency = currencyData.code;
  cachedSymbol = currencyData.symbol;
  
  console.log(`Currency manually updated to: ${cachedCurrency} (${cachedSymbol})`);
  
  // Notify all components to re-render
  listeners.forEach(listener => listener());
  
  // Also ensure AsyncStorage is updated
  await AsyncStorage.setItem("user_selected_region", regionCode);
}


export function getCurrencySymbol() {
  return cachedSymbol;
}

export function getCurrencyCode() {
  return cachedCurrency;
}

export function formatEGP(amount: number): string {
  return `${cachedSymbol} ${amount.toLocaleString('en-EG')}`;
}

export function formatEGPShort(amount: number): string {
  if (amount >= 1000000) {
    return `${cachedSymbol} ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${cachedSymbol} ${(amount / 1000).toFixed(0)}K`;
  }
  return `${cachedSymbol} ${amount.toLocaleString('en-EG')}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Initial load
loadCurrency();