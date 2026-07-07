import React from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export const AuthPage = ({ children, maxWidth = 420 }) => (
  <main className="auth-page">
    <div className="auth-page-bg" />
    <div className="auth-page-grid" />
    <div className="auth-panel" style={{ maxWidth }}>
      {children}
    </div>
  </main>
);

export const AuthBrand = () => (
  <div className="auth-brand">
    <span className="auth-brand-mark">🧠</span>
    <h1>SomaliGuard AI</h1>
  </div>
);

export const AuthCard = ({ title, subtitle, children }) => (
  <section className="card auth-card-modern">
    <h2>{title}</h2>
    <p>{subtitle}</p>
    {children}
  </section>
);

export const AuthNotice = ({ type = 'error', text }) => {
  if (!text) return null;
  const success = type === 'success';

  return (
    <div className={success ? 'auth-notice auth-notice-success' : 'auth-notice auth-notice-error'}>
      {success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{text}</span>
    </div>
  );
};

export const AuthField = ({
  label,
  icon,
  rightLabel,
  children,
  className = '',
}) => (
  <div className={`auth-field ${className}`}>
    <div className="auth-label-row">
      <label>{label}</label>
      {rightLabel}
    </div>
    <div className="auth-input-wrap">
      {icon && <span className="auth-input-icon">{icon}</span>}
      {children}
    </div>
  </div>
);

export const AuthInput = ({ icon, ...props }) => (
  <input className={icon ? 'auth-input auth-input-with-icon' : 'auth-input'} {...props} />
);

export const AuthPasswordInput = ({
  value,
  onChange,
  visible,
  onToggle,
  placeholder = '••••••••',
  autoComplete,
}) => (
  <>
    <input
      className="auth-input auth-input-with-icon auth-input-with-action"
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
    <button
      className="auth-icon-button"
      type="button"
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </>
);

export const AuthPrimaryButton = ({ children, loading, disabled }) => (
  <button className="auth-primary-button" type="submit" disabled={disabled || loading}>
    {children}
  </button>
);

export const AuthDivider = () => (
  <div className="auth-divider">
    <span />
    <b>or</b>
    <span />
  </div>
);

export const AuthSwitchLink = ({ children }) => (
  <div className="auth-switch-link">{children}</div>
);

export const AuthFooter = () => (
  <footer className="auth-footer">
    <span>© 2025 SomaliGuard AI. All rights reserved.</span>
    <a href="#">Terms</a>
    <a href="#">Privacy</a>
  </footer>
);
