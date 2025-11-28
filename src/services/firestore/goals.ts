import {
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    Timestamp
} from '@/lib/firebase';
import type { Goal, CreateGoal } from '@/types/firestore';

/**
 * Get active goal for user
 */
export async function getActiveGoal(userId: string): Promise<Goal | null> {
    const goalsRef = collection(db, 'goals');
    const q = query(
        goalsRef,
        where('userId', '==', userId),
        where('active', '==', true)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    // Return the first active goal
    const goalDoc = querySnapshot.docs[0];
    return { ...goalDoc.data(), id: goalDoc.id } as Goal;
}

/**
 * Create or update daily goal for user
 * Deactivates any existing active goals first
 */
export async function createOrUpdateGoal(
    userId: string,
    goalData: { dailyMinutes: number; focusAreas: ('speed' | 'comprehension')[] }
): Promise<string> {
    // First, deactivate any existing active goals
    const goalsRef = collection(db, 'goals');
    const activeGoalsQuery = query(
        goalsRef,
        where('userId', '==', userId),
        where('active', '==', true)
    );

    const activeGoalsSnapshot = await getDocs(activeGoalsQuery);
    const deactivatePromises = activeGoalsSnapshot.docs.map(doc =>
        updateDoc(doc.ref, { active: false, updatedAt: serverTimestamp() })
    );

    await Promise.all(deactivatePromises);

    // Create new active goal
    const newGoalRef = doc(collection(db, 'goals'));

    const newGoal: Omit<Goal, 'id'> = {
        userId,
        dailyMinutes: goalData.dailyMinutes,
        focusAreas: goalData.focusAreas,
        active: true,
        createdAt: Timestamp.now(),
    };

    await setDoc(newGoalRef, newGoal);

    return newGoalRef.id;
}

/**
 * Deactivate a specific goal
 */
export async function deactivateGoal(goalId: string): Promise<void> {
    const goalRef = doc(db, 'goals', goalId);
    await updateDoc(goalRef, {
        active: false,
        updatedAt: serverTimestamp(),
    });
}
