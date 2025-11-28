import {
    db,
    collection,
    doc,
    getDoc,
    setDoc,
    getDocs,
    query,
    where,
    Timestamp,
    serverTimestamp
} from '@/lib/firebase';
import type { RivalState } from '@/types/firestore';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { getActiveGoal } from './goals';
import { getTodaySessionMinutes } from './sessions';

/**
 * Get rival state for a specific date
 */
export async function getRivalState(userId: string, date: string): Promise<RivalState | null> {
    const rivalStateId = `${userId}__${date}`; // Composite key
    const rivalStateRef = doc(db, 'rival_states', rivalStateId);
    const rivalStateSnap = await getDoc(rivalStateRef);

    if (!rivalStateSnap.exists()) {
        return null;
    }

    return rivalStateSnap.data() as RivalState;
}

/**
 * Get today's rival XP
 */
export async function getTodayRivalXp(userId: string): Promise<number> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const rivalState = await getRivalState(userId, today);
    return rivalState?.xpAccum || 0;
}

/**
 * Update rival XP for today
 */
export async function updateRivalXp(
    userId: string,
    xpToAdd: number
): Promise<void> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const rivalStateId = `${userId}__${today}`;
    const rivalStateRef = doc(db, 'rival_states', rivalStateId);

    // Check if state already exists
    const existingState = await getRivalState(userId, today);

    if (existingState) {
        // Add to existing XP
        await setDoc(rivalStateRef, {
            userId,
            date: today,
            xpAccum: existingState.xpAccum + xpToAdd,
            updatedAt: Timestamp.now(),
        });
    } else {
        // Create new state
        await setDoc(rivalStateRef, {
            userId,
            date: today,
            xpAccum: xpToAdd,
            updatedAt: Timestamp.now(),
        });
    }
}

/**
 * Check if user missed yesterday's goal and award rival XP accordingly
 * Called once per day on dashboard load
 */
export async function checkAndAwardRivalXp(userId: string): Promise<{ xpAwarded: number; reason: string }> {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Check if we've already processed today
    const existingState = await getRivalState(userId, today);
    if (existingState) {
        return { xpAwarded: 0, reason: 'Already processed for today' };
    }

    // Get user's active goal
    const activeGoal = await getActiveGoal(userId);
    const dailyGoalMin = activeGoal?.dailyMinutes || 10;

    // Get yesterday's session minutes
    const yesterday = subDays(new Date(), 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    // We need to get yesterday's total minutes
    // Since getTodaySessionMinutes only works for "today", we need to query directly
    const yesterdayStart = Timestamp.fromDate(startOfDay(yesterday));
    const yesterdayEnd = Timestamp.fromDate(endOfDay(yesterday));

    const sessionsRef = collection(db, 'sessions');
    const q = query(
        sessionsRef,
        where('userId', '==', userId),
        where('startedAt', '>=', yesterdayStart),
        where('startedAt', '<=', yesterdayEnd)
    );

    const querySnapshot = await getDocs(q);

    let totalMinutesYesterday = 0;
    querySnapshot.forEach(doc => {
        const data = doc.data();
        totalMinutesYesterday += data.durationMin || 0;
    });

    // Determine XP to award
    const baseXp = 50;
    let xpToAward = baseXp;
    let reason = 'Base daily XP';

    if (totalMinutesYesterday < dailyGoalMin) {
        xpToAward += 50; // Bonus for user missing goal
        reason = `User missed goal (${totalMinutesYesterday}/${dailyGoalMin} min)`;
    } else {
        reason = `User met goal (${totalMinutesYesterday}/${dailyGoalMin} min)`;
    }

    // Award XP to rival
    await updateRivalXp(userId, xpToAward);

    return { xpAwarded: xpToAward, reason };
}
