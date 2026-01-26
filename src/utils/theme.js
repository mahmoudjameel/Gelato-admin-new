/**
 * Theme utility for Gelato House Admin
 * Manages light/dark mode across the entire application
 */

const THEME_STORAGE_KEY = 'gelato-admin-theme';

export const getStoredTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
};

export const setStoredTheme = (theme) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  setStoredTheme(theme);
};

export const toggleTheme = () => {
  const current = getStoredTheme();
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
};

// Initialize theme on load
if (typeof window !== 'undefined') {
  applyTheme(getStoredTheme());
}
