// utils/currency.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const REGION_STORAGE_KEY = "user_selected_region";

// Region to currency mapping
const REGION_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  EG: { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  AE: { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  SA: { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  KW: { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar" },
  QA: { code: "QAR", symbol: "﷼", name: "Qatari Riyal" },
  OM: { code: "OMR", symbol: "﷼", name: "Omani Rial" },
  BH: { code: "BHD", symbol: ".د.ب", name: "Bahraini Dinar" },
};

const REGION_MAP: Record<string, string> = {
  "Egypt": "EG",
  "UAE": "AE",
  "Saudi Arabia": "SA",
  "Kuwait": "KW",
  "Qatar": "QA",
  "Oman": "OM",
  "Bahrain": "BH",
};

export async function getCurrentRegion(): Promise<string> {
  try {
    const savedRegionCode = await AsyncStorage.getItem(REGION_STORAGE_KEY);
    if (savedRegionCode && REGION_CURRENCY[savedRegionCode]) {
      return savedRegionCode;
    }
    return "EG"; // Default to Egypt
  } catch {
    return "EG";
  }
}

export async function getCurrentCurrency(): Promise<{ code: string; symbol: string; name: string }> {
  const region = await getCurrentRegion();
  return REGION_CURRENCY[region] || REGION_CURRENCY.EG;
}

export function getCurrencySync(regionCode?: string): { code: string; symbol: string; name: string } {
  return REGION_CURRENCY[regionCode || "EG"] || REGION_CURRENCY.EG;
}

export function getRegionCodeFromName(regionName: string): string {
  return REGION_MAP[regionName] || "EG";
}