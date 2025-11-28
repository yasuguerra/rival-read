import { checkAndAwardRivalXp } from '@/services/firestore/rivalStates';

/**
 * Update rival state - checks if user missed yesterday's goal and awards rival XP
 * Called once per day on dashboard load
 */
export async function updateRivalState(userId: string) {
    if (!userId) return;

    try {
        const result = await checkAndAwardRivalXp(userId);
        console.log('Rival XP update:', result);
    } catch (error) {
        console.error('Error updating rival state:', error);
    }
}
