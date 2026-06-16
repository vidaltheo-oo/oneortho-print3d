"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LANG_KEY,
  isLang,
  translate,
  type Lang,
  type TFunc,
} from "./messages";

type I18nValue = { lang: Lang; setLang: (l: Lang) => void; t: TFunc };

const I18nContext = createContext<I18nValue | null>(null);

// Provider monte une fois dans le layout racine. La langue par defaut est "fr"
// (rendu serveur = premier rendu client, pas de mismatch d'hydratation) ; la
// preference stockee est appliquee apres montage. Cle partagee oneprint_lang
// (re-sync inter-onglets via l'evenement 'storage').
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_KEY);
      if (isLang(stored)) setLangState(stored);
    } catch {
      /* storage indisponible */
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_KEY && isLang(e.newValue)) setLangState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {
      /* sans effet */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Hors provider : fallback FR pour ne jamais casser le rendu.
    return { lang: "fr", setLang: () => {}, t: (key, vars) => translate("fr", key, vars) };
  }
  return ctx;
}

export function useT(): TFunc {
  return useI18n().t;
}
