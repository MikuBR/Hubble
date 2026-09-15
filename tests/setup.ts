/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase clients
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockReturnThis(),
    })),
  }),
  getUser: vi.fn().mockResolvedValue(null),
}));

// Mock toast
vi.mock('@/shared/ui/Toast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    toasts: [],
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Suppress console.error in tests
const originalError = console.error;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).beforeAll(() => {
  console.error = ((...args: (unknown | undefined)[]) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes?.('Warning: ReactDOM.render is no longer supported')) return;
    originalError.call(console, ...args);
  }) as typeof console.error;
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).afterAll(() => {
  console.error = originalError;
});