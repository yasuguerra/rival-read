import {
    db,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    Timestamp
} from '@/lib/firebase';
import type { GameRun, CreateGameRun } from '@/types/firestore';

/**
 * Save game run result to Firestore
 */
export async function saveGameRun(
    userId: string,
    gameData: {
        gameCode: string;
        level: number;
        score: number;
        accuracy?: number;
        wpm?: number;
        durationSeconds?: number;
        xpEarned: number;
        sessionId?: string;
    }
): Promise<string> {
    const gameRunsRef = collection(db, 'game_runs');

    const gameRun: CreateGameRun = {
        userId,
        gameCode: gameData.gameCode,
        level: gameData.level,
        score: gameData.score,
        accuracy: gameData.accuracy,
        wpm: gameData.wpm,
        durationSeconds: gameData.durationSeconds,
        xpEarned: gameData.xpEarned,
        sessionId: gameData.sessionId,
    };

    const docRef = await addDoc(gameRunsRef, {
        ...gameRun,
        completedAt: Timestamp.now(),
    });

    return docRef.id;
}

/**
 * Get recent game runs for a user
 */
export async function getRecentGameRuns(
    userId: string,
    limitCount: number = 10
): Promise<GameRun[]> {
    const gameRunsRef = collection(db, 'game_runs');
    const q = query(
        gameRunsRef,
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
        firestoreLimit(limitCount)
    );

    const querySnapshot = await getDocs(q);

    const gameRuns: GameRun[] = [];
    querySnapshot.forEach(doc => {
        gameRuns.push(doc.data() as GameRun);
    });

    return gameRuns;
}

/**
 * Get game runs for a specific game
 */
export async function getGameRunsByCode(
    userId: string,
    gameCode: string,
    limitCount: number = 10
): Promise<GameRun[]> {
    const gameRunsRef = collection(db, 'game_runs');
    const q = query(
        gameRunsRef,
        where('userId', '==', userId),
        where('gameCode', '==', gameCode),
        orderBy('completedAt', 'desc'),
        firestoreLimit(limitCount)
    );

    const querySnapshot = await getDocs(q);

    const gameRuns: GameRun[] = [];
    querySnapshot.forEach(doc => {
        gameRuns.push(doc.data() as GameRun);
    });

    return gameRuns;
}
