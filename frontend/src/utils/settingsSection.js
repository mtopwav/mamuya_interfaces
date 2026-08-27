/**
 * Derives the "section" (area of the app) from the current path.
 * Used to scope language and theme per section (admin, sales, finance, manager)
 * so settings in one area do not affect others.
 * @param {string} pathname - e.g. '/admin/dashboard', '/sales/payments'
 * @returns {string|null} - 'admin' | 'sales' | 'finance' | 'manager' | null (null = use global keys)
 */
export const getSectionFromPath = (pathname) => {
  if (!pathname || pathname === '/') return null;
  const segment = pathname.split('/').filter(Boolean)[0];
  if (['admin', 'sales', 'finance', 'manager'].includes(segment)) return segment;
  return null;
};
