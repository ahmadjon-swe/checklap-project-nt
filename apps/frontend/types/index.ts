export type UserRole = 'student' | 'teacher' | 'admin' | 'moderator' | 'support';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  telegramId?: string | null;
  telegramUsername?: string | null;
  createdAt?: string;
}

export interface Group {
  id: string;
  teacherId: string;
  name: string;
  description: string | null;
  inviteCode: string;
  isActive?: boolean;
  membersCount?: number;
  createdAt?: string;
}

export interface Test {
  id: string;
  teacherId: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  passingThreshold?: number | null;
  resultVisibility?: 'hidden' | 'percentage_only' | 'with_answers' | 'full_review';
  randomizeQuestions?: boolean;
  shuffleOptions?: boolean;
  isPublished: boolean;
  startAt: string | null;
  endAt: string | null;
  questionsCount?: number;
  createdAt?: string;
}

export interface Option {
  id: string;
  body: string;
  imageUrl?: string | null;
  isCorrect?: boolean;
  orderIndex?: number;
}

export interface Question {
  id: string;
  testId?: string;
  body: string;
  imageUrl?: string | null;
  explanation?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string | null;
  score?: number;
  orderIndex?: number;
  options: Option[];
}

export interface Session {
  id: string;
  testId?: string;
  status?: 'in_progress' | 'submitted' | 'expired';
  startedAt?: string;
  submittedAt?: string | null;
  expiresAt?: string | null;
  remainingSeconds?: number | null;
}

export interface Result {
  id: string;
  sessionId: string;
  studentId?: string;
  testId?: string;
  testTitle?: string;
  rawScore?: number;
  maxPossibleScore?: number;
  percentage: number;
  passed: boolean | null;
  totalQuestions?: number;
  computedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  maxTestsPerDay: number | null;
  maxQuestionsPerTest: number | null;
  maxGroups: number | null;
  canExport: boolean;
  canUseAnalytics: boolean;
  canImport: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
