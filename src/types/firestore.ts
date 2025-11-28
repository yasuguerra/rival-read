import { Timestamp } from 'firebase/firestore';

// User Profile
export interface UserProfile {
    displayName: string;
    email: string;
    avatar?: string; // URL or emoji
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Daily Goal Configuration
export interface Goal {
    userId: string;
    dailyMinutes: number; // 5, 10, 15, 30, 45, 60
    focusAreas: ('speed' | 'comprehension')[];
    active: boolean;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

// XP Transaction Ledger
export interface XpTransaction {
    userId: string;
    source: 'game' | 'streak' | 'rival' | 'bonus';
    delta: number; // XP amount (can be positive or negative)
    meta?: Record<string, any>; // Game details, streak info, etc.
    createdAt: Timestamp;
}

// Game Run Result
export interface GameRun {
    userId: string;
    gameCode: string;
    level: number;
    score: number;
    accuracy?: number; // 0-100
    wpm?: number; // For reading games
    durationSeconds?: number;
    xpEarned: number;
    sessionId?: string;
    completedAt: Timestamp;
}

// Reading Test Result
export interface ReadingTest {
    userId: string;
    textId?: string; // Reference to uploaded text
    wpm: number;
    comprehensionPercent: number; // 0-100
    questionsAsked: number;
    questionsCorrect: number;
    completedAt: Timestamp;
}

// Rival State (daily)
export interface RivalState {
    userId: string;
    date: string; // YYYY-MM-DD format
    xpAccum: number; // Rival XP accumulated for this day
    updatedAt: Timestamp;
}

// Streak Tracking
export interface Streak {
    count: number;
    lastCompletedDate: string; // YYYY-MM-DD format
    updatedAt: Timestamp;
}

// Training Session
export interface Session {
    userId: string;
    durationMin: number;
    gamesPlayed: string[]; // Array of game codes
    xpEarned: number;
    goalMet: boolean;
    startedAt: Timestamp;
    endedAt?: Timestamp;
}

// Uploaded Text
export interface UploadedText {
    userId: string;
    title: string;
    content: string;
    storageUrl?: string; // Firebase Storage URL
    wordCount: number;
    uploadedAt: Timestamp;
}

// Analytics Event
export interface AnalyticsEvent {
    userId: string;
    eventName: string;
    eventData: Record<string, any>;
    timestamp: Timestamp;
}

// Helper type for creating documents (without Timestamp fields)
export type CreateUserProfile = Omit<UserProfile, 'createdAt' | 'updatedAt'>;
export type CreateGoal = Omit<Goal, 'createdAt' | 'updatedAt'>;
export type CreateXpTransaction = Omit<XpTransaction, 'createdAt'>;
export type CreateGameRun = Omit<GameRun, 'completedAt'>;
export type CreateReadingTest = Omit<ReadingTest, 'completedAt'>;
export type CreateSession = Omit<Session, 'startedAt' | 'endedAt'>;
export type CreateUploadedText = Omit<UploadedText, 'uploadedAt'>;
export type CreateAnalyticsEvent = Omit<AnalyticsEvent, 'timestamp'>;
