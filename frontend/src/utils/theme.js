/**
 * Theme Utility Functions
 * Handles theme switching and persistence.
 * Optionally scoped by section (admin, sales, finance, manager) so settings in one area do not affect others.
 */

/**
 * Get current theme from localStorage (optionally scoped by section)
 * @param {string|null} section - 'admin' | 'sales' | 'finance' | 'manager' | null for global
 * @returns {string} Theme ('light', 'dark', or 'auto')
 */
export const getTheme = (section = null) => {
  const key = section ? `systemTheme_${section}` : 'systemTheme';
  return localStorage.getItem(key) || 'light';
};

/**
 * Apply theme to document and optionally save for a section
 * @param {string} theme - Theme to apply ('light', 'dark', or 'auto')
 * @param {string|null} section - If provided, save to systemTheme_${section}; otherwise systemTheme
 */
export const applyTheme = (theme, section = null) => {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('dark-theme', 'light-theme');

  let actualTheme = theme;

  // Handle 'auto' theme - detect system preference
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    actualTheme = prefersDark ? 'dark' : 'light';
  }

  // Apply theme class
  if (actualTheme === 'dark') {
    root.classList.add('dark-theme');
  } else {
    root.classList.add('light-theme');
  }

  // Save to localStorage (section-scoped or global)
  const key = section ? `systemTheme_${section}` : 'systemTheme';
  localStorage.setItem(key, theme);

  // Dispatch event for components to react to theme changes
  window.dispatchEvent(new Event('themeChanged'));
};

/**
 * Initialize theme on app load (uses global key when no section)
 */
export const initializeTheme = () => {
  const savedTheme = getTheme(null);
  applyTheme(savedTheme, null);

  // Listen for system theme changes if using 'auto'
  const handleSystemThemeChange = () => {
    const currentTheme = getTheme(null);
    if (currentTheme === 'auto') {
      applyTheme('auto', null);
    }
  };

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', handleSystemThemeChange);

  window._themeMediaQuery = mediaQuery;
  window._themeChangeHandler = handleSystemThemeChange;
};

/**
 * Toggle between light and dark theme (optionally scoped by section)
 * @param {string|null} section - If provided, read/write systemTheme_${section}
 * @returns {string} New theme
 */
export const toggleTheme = (section = null) => {
  const currentTheme = getTheme(section);
  let newTheme;

  if (currentTheme === 'light') {
    newTheme = 'dark';
  } else if (currentTheme === 'dark') {
    newTheme = 'light';
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    newTheme = prefersDark ? 'light' : 'dark';
  }

  applyTheme(newTheme, section);
  return newTheme;
};
