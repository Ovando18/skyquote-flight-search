'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiConfig } from './types';

const STORAGE_KEY = 'skyquote.apiConfig.v1';

export const DEFAULT_CONFIG: ApiConfig = {
  mode: 'simulation',
  seatsAeroKey: '',
  serpApiKey: '',
  amadeusClientId: '',
  amadeusClientSecret: '',
  amadeusEnv: 'test',
  duffelToken: '',
  milheiroValue: 20,
};

function read(): ApiConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useApiConfig() {
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConfig(read());
    setLoaded(true);
  }, []);

  const save = useCallback((next: ApiConfig) => {
    setConfig(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível: mantém apenas em memória */
    }
  }, []);

  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  return { config, save, reset, loaded };
}
