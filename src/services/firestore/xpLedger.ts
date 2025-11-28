import {
    db,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    Timestamp,
    orderBy
} from '@/lib/firebase';
import type { XpTransaction, CreateXpTransaction } from '@/types/firestore';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Add XP transaction to ledger
 */
export async function addXpTransaction(
    userId: string,
    delta: number,
    source: 'game' | 'streak' | 'rival' | 'bonus' = 'game',
    meta: Record<string, any> = {}
): Promise<string> {
    const xpLedgerRef = collection(db, 'xp_ledger');

    const transaction: CreateXpTransaction = {
        userId,
        source,
        delta,
        meta,
    };

    const docRef = await addDoc(xpLedgerRef, {
        ...transaction,
        createdAt: Timestamp.now(),
    });

    return docRef.id;
}

/**
 * Get total XP for a user (all time)
 */
export async function getTotalXp(userId: string): Promise<number> {
    const xpLedgerRef = collection(db, 'xp_ledger');
    const q = query(
        xpLedgerRef,
        where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);

    let total = 0;
    querySnapshot.forEach(doc => {
        const data = doc.data() as XpTransaction;
        total += data.delta || 0;
    });

    return total;
}

/**
 * Get XP earned today
 */
export async function getTodayXp(userId: string): Promise<number> {
    const today = new Date();
    const startTimestamp = Timestamp.fromDate(startOfDay(today));
    const endTimestamp = Timestamp.fromDate(endOfDay(today));

    const xpLedgerRef = collection(db, 'xp_ledger');
    const q = query(
        xpLedgerRef,
        where('userId', '==', userId),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
    );

    const querySnapshot = await getDocs(q);

    let total = 0;
    querySnapshot.forEach(doc => {
        const data = doc.data() as XpTransaction;
        total += data.delta || 0;
    });

    return total;
}

/**
 * Get recent XP transactions
 */
export async function getRecentXpTransactions(
    userId: string,
    limit: number = 10
): Promise<XpTransaction[]> {
    const xpLedgerRef = collection(db, 'xp_ledger');
    const q = query(
        xpLedgerRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);

    const transactions: XpTransaction[] = [];
    let count = 0;

    querySnapshot.forEach(doc => {
        if (count < limit) {
            transactions.push(doc.data() as XpTransaction);
            count++;
        }
    });

    return transactions;
}
