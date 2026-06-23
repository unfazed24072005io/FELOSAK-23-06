// hooks/useRegionCurrency.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REGION_STORAGE_KEY = "user_selected_region";

const CURRENCY_MAP: Record<string, { code: string; symbol: string; name: string }> = {
  EG: { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  AE: { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  SA: { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  KW: { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar" },
  QA: { code: "QAR", symbol: "﷼", name: "Qatari Riyal" },
  OM: { code: "OMR", symbol: "﷼", name: "Omani Rial" },
  BH: { code: "BHD", symbol: ".د.ب", name: "Bahraini Dirham" },
};

export function useRegionCurrency() {
  const [currency, setCurrency] = useState(CURRENCY_MAP.EG);
  const [region, setRegion] = useState("EG");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRegion = async () => {
      try {
        const savedRegion = await AsyncStorage.getItem(REGION_STORAGE_KEY);
        const regionCode = savedRegion || "EG";
        setRegion(regionCode);
        setCurrency(CURRENCY_MAP[regionCode] || CURRENCY_MAP.EG);
      } catch (error) {
        console.error("Error loading region:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadRegion();
    
    // Listen for region changes
    const interval = setInterval(async () => {
      const savedRegion = await AsyncStorage.getItem(REGION_STORAGE_KEY);
      if (savedRegion && savedRegion !== region) {
        setRegion(savedRegion);
        setCurrency(CURRENCY_MAP[savedRegion] || CURRENCY_MAP.EG);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [region]);

  return { currency, region, loading };
}