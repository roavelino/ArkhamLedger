import { bootstrapSession } from './auth/login.js';

async function initializeApp() {
  try {
    await bootstrapSession();
  } catch (error) {
    console.error('Failed to bootstrap Supabase session:', error);
  }
}

void initializeApp();
