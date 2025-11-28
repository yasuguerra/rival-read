import { db, collection, addDoc, Timestamp } from '@/lib/firebase';
import type { CreateAnalyticsEvent } from '@/types/firestore';

export async function trackEvent(userId: string, eventName: string, eventData: Record<string, any> = {}) {
  if (!userId) return;

  const analyticsEventsRef = collection(db, 'analytics_events');

  const event: CreateAnalyticsEvent = {
    userId,
    eventName,
    eventData,
  };

  await addDoc(analyticsEventsRef, {
    ...event,
    timestamp: Timestamp.now(),
  });
}
