import React from 'react';
import './PageLoader.css';
import logo from '../images/logo.png';

/**
 * Animated loader for full pages and data-fetch states.
 * @param {boolean} fullPage - Full viewport (page auth + initial load)
 * @param {string} message - Optional status text
 * @param {boolean} showLogo - Show Mamuya logo above spinner
 * @param {'sm'|'md'|'lg'} size - Spinner size
 */
function PageLoader({
  message = 'Loading...',
  fullPage = true,
  showLogo = true,
  size = 'md'
}) {
  return (
    <div
      className={`mamuya-loader ${fullPage ? 'mamuya-loader--page' : 'mamuya-loader--inline'}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mamuya-loader__card">
        {showLogo && (
          <img src={logo} alt="" className="mamuya-loader__logo" aria-hidden="true" />
        )}
        <div className={`mamuya-loader__ring mamuya-loader__ring--${size}`}>
          <span />
          <span />
          <span />
        </div>
        <div className="mamuya-loader__bar">
          <span className="mamuya-loader__bar-fill" />
        </div>
        {message ? <p className="mamuya-loader__message">{message}</p> : null}
      </div>
    </div>
  );
}

/** Table row loader while fetching database records */
export function TableDataLoader({ message = 'Loading data...', colSpan = 1 }) {
  return (
    <tr className="mamuya-loader-table-row">
      <td colSpan={colSpan} className="mamuya-loader-table-cell">
        <PageLoader message={message} fullPage={false} showLogo={false} size="sm" />
      </td>
    </tr>
  );
}

/** Inline block loader inside page content (e.g. form sections) */
export function InlineDataLoader({ message = 'Loading data...' }) {
  return (
    <div className="mamuya-loader-inline-wrap">
      <PageLoader message={message} fullPage={false} showLogo={false} size="sm" />
    </div>
  );
}

/** Small spinner for buttons / compact areas */
export function MiniLoader({ label }) {
  return (
    <span className="mamuya-mini-loader" role="status" aria-live="polite">
      <span className="mamuya-mini-loader__ring" aria-hidden="true" />
      {label ? <span className="mamuya-mini-loader__label">{label}</span> : null}
    </span>
  );
}

export default PageLoader;
