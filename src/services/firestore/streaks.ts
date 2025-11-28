import {
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    Timestamp
} from '@/lib/firebase';
import type { Streak } from '@/types/firestore';
import { format } from 'date-fns';

/**
 * Get streak for user
 */
export async function getStreak(userId: string): Promise<Streak | null> {
    const streakRef = doc(db, 'streaks', userId);
    const streakSnap = await getDoc(streakRef);

    if (!streakSnap.exists()) {
        return null;
    }

    return streakSnap.data() as Streak;
}

/**
 * Update streak count
 * Increments if today follows yesterday, resets if gap
 */
export async function updateStreak(userId: string, goalMet: boolean): Promise<number> {
    const streakRef = doc(db, 'streaks', userId);
    const streakSnap = await getDoc(streakRef);

    const today = format(new Date(), 'yyyy-MM-dd');

    if (!streakSnap.exists()) {
        // First time - initialize streak
        const newStreak: Streak = {
            count: goalMet ? 1 : 0,
            lastCompletedDate: goalMet ? today : '',
            updatedAt: Timestamp.now(),
        };

        await setDoc(streakRef, newStreak);
        return newStreak.count;
    }

    const currentStreak = streakSnap.data() as Streak;

    if (!goalMet) {
        // Goal not met today, don't update
        return currentStreak.count;
    }

    // Check if we already counted today
    if (currentStreak.lastCompletedDate === today) {
        return currentStreak.count; // Already counted for today
    }

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    let newCount: number;

    if (currentStreak.lastCompletedDate === yesterdayStr) {
        // Consecutive day - increment
        newCount = currentStreak.count + 1;
    } else {
        // Gap in days - reset to 1
        newCount = 1;
    }

    await updateDoc(streakRef, {
        count: newCount,
        lastCompletedDate: today,
        updatedAt: serverTimestamp(),
    });

    return newCount;
}
