import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaGlobe } from 'react-icons/fa';
import { getCurrentLanguage } from '../utils/translations';
import { getSectionFromPath } from '../utils/settingsSection';
import './LanguageSelector.css';

const LanguageSelector = () => {
  const location = useLocation();
  const section = getSectionFromPath(location.pathname);
  const langKey = section ? `systemLanguage_${section}` : 'systemLanguage';

  const [currentLang, setCurrentLang] = useState(() => getCurrentLanguage(section));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCurrentLang(getCurrentLanguage(section));
  }, [section, location.pathname]);

  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(getCurrentLanguage(section));
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    const handleStorage = (e) => {
      if (e.key === langKey || e.key === 'systemLanguage') handleLanguageChange();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [section, langKey]);

  const handleLanguageChange = (lang) => {
    localStorage.setItem(langKey, lang);
    setCurrentLang(lang);
    setIsOpen(false);
    window.dispatchEvent(new Event('languageChanged'));
  };

  const languages = {
    en: 'English',
    sw: 'Swahili'
  };

  return (
    <div className="language-selector">
      <button
        type="button"
        className="language-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FaGlobe />
        <span>{languages[currentLang] || 'English'}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="language-selector-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998
            }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="language-selector-dropdown">
            {Object.entries(languages).map(([code, name]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleLanguageChange(code)}
                data-active={currentLang === code}
              >
                {name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
