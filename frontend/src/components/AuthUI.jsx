import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';

export const AuthVisualPanel = ({
  className = '',
  subtitle,
  kickerIcon,
  kicker,
  title,
  description,
  signals = [],
}) => (
  <aside className={`login-redesign-panel ${className}`}>
    <div className="auth-visual-grid" aria-hidden="true" />

    <div className="login-redesign-brand">
      <span><ShieldCheck size={24} /></span>
      <div>
        <strong>SomaliGuard AI</strong>
        <small>{subtitle}</small>
      </div>
    </div>

    <div className="login-redesign-copy">
      <span className="login-redesign-kicker">{kickerIcon}{kicker}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>

    <div className="login-redesign-signals">
      {signals.map(({ icon, label }) => (
        <div key={label}>
          <span>{icon}</span>
          <strong>{label}</strong>
        </div>
      ))}
    </div>

    <div className="auth-visual-footer">
      <span><i /> Secure workspace</span>
      <span>Somali NLP research</span>
    </div>
  </aside>
);

export const AuthCardTopline = ({ status }) => (
  <div className="auth-card-topline">
    <span className="auth-card-mini-brand"><ShieldCheck size={17} /> SomaliGuard AI</span>
    <span className="auth-card-security"><LockKeyhole size={15} /> {status}</span>
  </div>
);

export const AuthNotice = ({ type = 'error', text }) => {
  if (!text) return null;
  const success = type === 'success';

  return (
    <div className={success ? 'auth-notice auth-notice-success' : 'auth-notice auth-notice-error'} role={success ? 'status' : 'alert'}>
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
    <div className="auth-input-wrap" role="group" aria-label={label}>
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
  disabled = false,
}) => (
  <>
    <input
      className="auth-input auth-input-with-icon auth-input-with-action"
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
    />
    <button
      className="auth-icon-button"
      type="button"
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      disabled={disabled}
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
