// Temporary augmentation until regenerated types include analytics_events
import type { Database } from '@/integrations/supabase/types';

declare module '@/integrations/supabase/types' {
  interface Database {
    public: Database['public'] & {
      Tables: Database['public']['Tables'] & {
        analytics_events: {
          Row: { id: string; user_id: string; event_type: string; event_ts: string; meta: any };
          Insert: { id?: string; user_id: string; event_type: string; event_ts?: string; meta?: any };
          Update: { id?: string; user_id?: string; event_type?: string; event_ts?: string; meta?: any };
          Relationships: [];
        }
      }
    }
  }
}
