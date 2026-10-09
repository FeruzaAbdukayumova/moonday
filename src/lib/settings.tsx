import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { loadSettings, saveSettings, type Settings } from '@/lib/db';

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Loads settings once and renders nothing until they're in, so no screen sees defaults first. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadSettings(db).then(setSettings);
  }, [db]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      await saveSettings(db, patch);
      setSettings((current) => (current ? { ...current, ...patch } : current));
    },
    [db]
  );

  if (!settings) return null;
  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings outside SettingsProvider');
  return value;
}
