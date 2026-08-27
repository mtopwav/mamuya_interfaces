import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaMoon, FaSun } from 'react-icons/fa';
import { toggleTheme, getTheme } from '../utils/theme';
import { getSectionFromPath } from '../utils/settingsSection';

const ThemeToggle = () => {
  const location = useLocation();
  const section = getSectionFromPath(location.pathname);

  const [currentTheme, setCurrentTheme] = useState(() => getTheme(section));

  useEffect(() => {
    setCurrentTheme(getTheme(section));
  }, [section, location.pathname]);

  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getTheme(section));
    };
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [section]);

  const handleToggle = () => {
    const newTheme = toggleTheme(section);
    setCurrentTheme(newTheme);
  };

  // Determine if currently in dark mode (considering 'auto' theme)
  const isDarkMode = () => {
    if (currentTheme === 'dark') return true;
    if (currentTheme === 'light') return false;
    // For 'auto', check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  return (
    <button 
      className="theme-toggle-btn" 
      onClick={handleToggle}
      title={isDarkMode() ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      style={{
        padding: '8px 12px',
        background: 'transparent',
        border: '1px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        color: '#666',
        transition: 'all 0.3s',
        fontSize: '14px'
      }}
    >
      {isDarkMode() ? <FaSun /> : <FaMoon />}
    </button>
  );
};

export default ThemeToggle;
