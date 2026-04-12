export const supabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
  })),
};