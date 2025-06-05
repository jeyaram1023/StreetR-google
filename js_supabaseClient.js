// js/supabaseClient.js
const SUPABASE_URL = 'https://rnjvqxdrvplgilqzwnpl.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuanZxeGRydnBsZ2lscXp3bnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NDU4NjYsImV4cCI6MjA2NDUyMTg2Nn0.IOAxp8ULZgccX8hKtlDQzwdrW7xp1CcXVSdJ59UEruA'; // Replace with your Supabase Anon Key

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase URL or Anon Key is missing. Please check your supabaseClient.js file.");
    alert("Application is not configured correctly. Supabase credentials missing.");
}

const supabase = self.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expose supabase client globally or export it if using modules
window.supabase = supabase;
