import { useEffect, useState } from 'react';

const getMode = () => (document.body.classList.contains('dark') ? 'dark' : 'light');

export const useThemeMode = () => {
  const [mode, setMode] = useState(getMode);

  useEffect(() => {
    const updateMode = () => setMode(getMode());
    const observer = new MutationObserver(updateMode);

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    window.addEventListener('themechange', updateMode);
    return () => {
      observer.disconnect();
      window.removeEventListener('themechange', updateMode);
    };
  }, []);

  return {
    mode,
    isDark: mode === 'dark',
  };
};
