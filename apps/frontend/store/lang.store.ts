import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Lang = 'en' | 'uz' | 'ru';

interface LangStore {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({
      lang: 'uz',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'quiz-lang' }
  )
);
