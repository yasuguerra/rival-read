import { db, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@/lib/firebase';
import type { UserProfile, CreateUserProfile } from '@/types/firestore';

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return null;
    }

    return userSnap.data() as UserProfile;
}

/**
 * Create user profile in Firestore (called on signup)
 */
export async function createUserProfile(
    userId: string,
    profileData: CreateUserProfile
): Promise<void> {
    const userRef = doc(db, 'users', userId);

    await setDoc(userRef, {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    userId: string,
    updates: Partial<CreateUserProfile>
): Promise<void> {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}
