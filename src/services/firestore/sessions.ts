import {
    db,
    collection,
    addDoc,
    doc,
    updateDoc,
    getDocs,
    query,
    where,
    Timestamp
} from '@/lib/firebase';
import type { Session, CreateSession } from '@/types/firestore';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Create new training session
 */
export async function createSession(userId: string): Promise<string> {
    const sessionsRef = collection(db, 'sessions');

    const session: CreateSession = {
        userId,
        durationMin: 0,
        gamesPlayed: [],
        xpEarned: 0,
        goalMet: false,
    };

    const docRef = await addDoc(sessionsRef, {
        ...session,
        startedAt: Timestamp.now(),
    });

    return docRef.id;
}

/**
 * Update session with progress
 */
export async function updateSession(
    sessionId: string,
    updates: {
        durationMin?: number;
        gamesPlayed?: string[];
        xpEarned?: number;
        goalMet?: boolean;
    }
): Promise<void> {
    const sessionRef = doc(db, 'sessions', sessionId);

    const updateData: any = { ...updates };

    // Set endedAt if this is the final update
    if (updates.goalMet !== undefined) {
        updateData.endedAt = Timestamp.now();
    }

    await updateDoc(sessionRef, updateData);
}

/**
 * Get total minutes trained today
 */
export async function getTodaySessionMinutes(userId: string): Promise<number> {
    const today = new Date();
    const startTimestamp = Timestamp.fromDate(startOfDay(today));
    const endTimestamp = Timestamp.fromDate(endOfDay(today));

    const sessionsRef = collection(db, 'sessions');
    const q = query(
        sessionsRef,
        where('userId', '==', userId),
        where('startedAt', '>=', startTimestamp),
        where('startedAt', '<=', endTimestamp)
    );

    const querySnapshot = await getDocs(q);

    let totalMinutes = 0;
    querySnapshot.forEach(doc => {
        const data = doc.data() as Session;
        totalMinutes += data.durationMin || 0;
    });

    return totalMinutes;
}
