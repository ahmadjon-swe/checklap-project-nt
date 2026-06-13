'use client';
import { create } from 'zustand';
import { Question, Session } from '../types';

interface ExamState {
  session: Session | null;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string[]>;
  timeLeft: number | null;
  setSession: (session: Session, questions: Question[]) => void;
  setAnswer: (questionId: string, optionIds: string[]) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setTimeLeft: (seconds: number) => void;
  reset: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  session: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  timeLeft: null,

  setSession: (session, questions) => set({ session, questions, currentIndex: 0, answers: {}, timeLeft: session.remainingSeconds ?? null }),

  setAnswer: (questionId, optionIds) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: optionIds } })),

  nextQuestion: () =>
    set((state) => ({ currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1) })),

  prevQuestion: () =>
    set((state) => ({ currentIndex: Math.max(state.currentIndex - 1, 0) })),

  setTimeLeft: (seconds) => set({ timeLeft: seconds }),

  reset: () => set({ session: null, questions: [], currentIndex: 0, answers: {}, timeLeft: null }),
}));
