import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'sb-auth-token',
  },
  global: {
    headers: {
      'X-Client-Info': '@supabase/supabase-js',
    },
  },
  db: {
    schema: 'public',
  },
});

export interface SLATicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface DevelopmentHour {
  id: string;
  ticket_id: string;
  developer_name: string;
  hours: number;
  work_date: string;
  notes: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface TicketAssignment {
  id: string;
  ticket_id: string;
  user_id: string;
  created_at: string;
}
