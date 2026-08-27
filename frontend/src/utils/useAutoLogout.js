import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

/**
 * Auto logout after inactivity.
 * @param {Object} params
 * @param {boolean} params.enabled
 * @param {number} params.inactivityMs
 * @param {number} [params.warningMs] - Show warning this many ms before logout
 * @param {() => void} params.onLogout
 */
export default function useAutoLogout({ enabled, inactivityMs, warningMs = 30000, onLogout }) {
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  useEffect(() => {
    if (!enabled) return;

    let timerId = null;
    let warningTimerId = null;
    const hasWarnedRef = { current: false };

    const resetTimer = () => {
      if (timerId) window.clearTimeout(timerId);
      if (warningTimerId) window.clearTimeout(warningTimerId);

      hasWarnedRef.current = false;

      // Schedule warning and logout
      const safeInactivityMs = Math.max(0, Number(inactivityMs) || 0);
      const safeWarningMs = Math.max(0, Number(warningMs) || 0);

      if (safeInactivityMs > 0) {
        if (safeWarningMs > 0 && safeWarningMs < safeInactivityMs) {
          warningTimerId = window.setTimeout(() => {
            if (hasWarnedRef.current) return;
            hasWarnedRef.current = true;
            Swal.fire({
              icon: 'warning',
              title: 'Logging out soon',
              text: 'You will be logged out due to inactivity.',
              timer: 3000,
              timerProgressBar: true,
              showConfirmButton: false,
              allowOutsideClick: false,
              allowEscapeKey: false,
              didOpen: () => {},
            });
          }, safeInactivityMs - safeWarningMs);
        }

        timerId = window.setTimeout(() => {
          if (warningTimerId) window.clearTimeout(warningTimerId);
          warningTimerId = null;
          logoutRef.current?.();
        }, safeInactivityMs);
      }
    };

    // Reset timer only on meaningful interaction.
    // (Avoid mousemove/scroll so "inactivity" isn't broken by small movements.)
    const events = ['mousedown', 'keydown', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timerId) window.clearTimeout(timerId);
      if (warningTimerId) window.clearTimeout(warningTimerId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [enabled, inactivityMs]);
}

