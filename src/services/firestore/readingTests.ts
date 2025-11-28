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
import type { ReadingTest, CreateReadingTest } from '@/types/firestore';

/**
 * Save reading test result
 */
export async function saveReadingTest(
    userId: string,
    testData: {
        textId?: string;
        wpm: number;
        comprehensionPercent: number;
        questionsAsked: number;
        questionsCorrect: number;
    }
): Promise<string> {
    const readingTestsRef = collection(db, 'reading_tests');

    const test: CreateReadingTest = {
        userId,
        textId: testData.textId,
        wpm: testData.wpm,
        comprehensionPercent: testData.comprehensionPercent,
        questionsAsked: testData.questionsAsked,
        questionsCorrect: testData.questionsCorrect,
    };

    const docRef = await addDoc(readingTestsRef, {
        ...test,
        completedAt: Timestamp.now(),
    });

    return docRef.id;
}

/**
 * Get latest reading test for user
 */
export async function getLatestReadingTest(userId: string): Promise<ReadingTest | null> {
    const readingTestsRef = collection(db, 'reading_tests');
    const q = query(
        readingTestsRef,
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
        firestoreLimit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    return querySnapshot.docs[0].data() as ReadingTest;
}

/**
 * Get recent reading tests
 */
export async function getRecentReadingTests(
    userId: string,
    limitCount: number = 10
): Promise<ReadingTest[]> {
    const readingTestsRef = collection(db, 'reading_tests');
    const q = query(
        readingTestsRef,
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
        firestoreLimit(limitCount)
    );

    const querySnapshot = await getDocs(q);

    const tests: ReadingTest[] = [];
    querySnapshot.forEach(doc => {
        tests.push(doc.data() as ReadingTest);
    });

    return tests;
}
