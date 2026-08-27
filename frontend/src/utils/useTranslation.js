import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentLanguage, getTranslations } from './translations';
import { getSectionFromPath } from './settingsSection';

// Custom hook for translations; language is scoped per section (admin, sales, finance, manager)
export const useTranslation = () => {
  const location = useLocation();
  const section = getSectionFromPath(location.pathname);

  const [lang, setLang] = useState(() => getCurrentLanguage(section));
  const [t, setT] = useState(() => getTranslations(section));

  // When route/section changes, use that section's language
  useEffect(() => {
    const newLang = getCurrentLanguage(section);
    setLang(newLang);
    setT(getTranslations(section));
  }, [section, location.pathname]);

  useEffect(() => {
    const updateTranslations = () => {
      const currentLang = getCurrentLanguage(section);
      setLang(currentLang);
      setT(getTranslations(section));
    };

    const handleStorageChange = (e) => {
      const sectionKey = section ? `systemLanguage_${section}` : 'systemLanguage';
      if (e.key === sectionKey || e.key === 'systemLanguage') {
        updateTranslations();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('languageChanged', updateTranslations);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChanged', updateTranslations);
    };
  }, [section]);

  return { t, lang };
};
