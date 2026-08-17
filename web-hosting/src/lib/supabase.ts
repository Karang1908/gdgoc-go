import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oijrhshrhccsbntpcnpq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9panJoc2hyaGNjc2JudHBjbnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjE3MDcsImV4cCI6MjEwMjQzNzcwN30.yPaYKZIJhLQCp5RMXkT9CPnX6vL3XxXdpnbxQtq6BzM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
