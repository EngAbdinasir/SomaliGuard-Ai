import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) {
    resolve();
    return;
  }

  const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
  if (existingScript) {
    existingScript.addEventListener('load', resolve, { once: true });
    existingScript.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = GOOGLE_SCRIPT_URL;
  script.async = true;
  script.defer = true;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

const GoogleAuthButton = ({ onCredential, text = 'signin_with', disabled = false }) => {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || disabled) return;

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              onCredential(response.credential);
            }
          },
        });
        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 384,
          text,
          shape: 'rectangular',
        });
        setReady(true);
      })
      .catch(() => setLoadError('Google sign-in could not be loaded.'));

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onCredential, text]);

  if (!clientId) {
    return (
      <button type="button" disabled style={fallbackButton}>
        Google sign-in not configured
      </button>
    );
  }

  if (loadError) {
    return (
      <button type="button" disabled style={fallbackButton}>
        {loadError}
      </button>
    );
  }

  return (
    <div style={{ minHeight: '44px', opacity: disabled ? 0.65 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {!ready && <button type="button" disabled style={fallbackButton}>Loading Google sign-in...</button>}
      <div ref={buttonRef} style={{ display: ready ? 'flex' : 'none', justifyContent: 'center' }} />
    </div>
  );
};

const fallbackButton = {
  width: '100%',
  padding: '12px',
  background: 'transparent',
  color: 'var(--muted)',
  border: '1px solid var(--line)',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 700,
};

export default GoogleAuthButton;
