import { create } from 'zustand';

// Roles available in the app shell
export const ROLES = ['manager', 'waiter', 'kitchen', 'bar'];

// Persist role in localStorage so reloads keep the same view
const ROLE_KEY = 'patron.role';
const initialRole = (() => {
  try {
    const r = localStorage.getItem(ROLE_KEY);
    return ROLES.includes(r) ? r : 'manager';
  } catch {
    return 'manager';
  }
})();

export const useStore = create((set) => ({
  role: initialRole,
  setRole: (role) => {
    if (!ROLES.includes(role)) return;
    try { localStorage.setItem(ROLE_KEY, role); } catch {}
    set({ role });
  },
}));
