import { AlertCircle, CheckCircle2, Inbox, LoaderCircle } from 'lucide-react';

export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <header className="sg-hero">
    <div className="sg-hero-copy">
      {eyebrow && <span className="sg-eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="sg-hero-actions">{actions}</div>}
  </header>
);

export const Card = ({ title, description, action, children, className = '', ...rest }) => (
  <section className={`sg-card ${className}`.trim()} {...rest}>
    {(title || description || action) && (
      <div className="sg-card-header">
        <div>
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="sg-card-body">{children}</div>
  </section>
);

export const Alert = ({ type = 'info', children }) => {
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`sg-alert sg-alert-${type}`} role={type === 'error' ? 'alert' : 'status'}><Icon size={18} aria-hidden="true" /><span>{children}</span></div>;
};

export const LoadingState = ({ message = 'Loading…' }) => (
  <div className="sg-state" role="status"><LoaderCircle className="sg-spin" size={24} aria-hidden="true" /><strong>{message}</strong></div>
);

export const EmptyState = ({ title, description, action }) => (
  <div className="sg-state sg-empty-state">
    <Inbox size={28} aria-hidden="true" />
    <strong>{title}</strong>
    {description && <p>{description}</p>}
    {action}
  </div>
);

export const FormField = ({ label, htmlFor, help, error, children }) => (
  <div className="sg-form-field">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {error ? <span className="sg-field-error" id={`${htmlFor}-error`}>{error}</span> : help ? <span className="sg-help">{help}</span> : null}
  </div>
);

export const IconChip = ({ icon: Icon, solid = false, size = 20, className = '' }) => (
  <span className={`sg-icon-chip ${solid ? 'solid' : ''} ${className}`.trim()}>
    <Icon size={size} aria-hidden="true" />
  </span>
);

export const StatCard = ({ icon: Icon, tone = '', label, value, hint, className = '' }) => (
  <article className={`sg-stat-card ${tone} ${className}`.trim()}>
    <IconChip icon={Icon} size={22} />
    <div>
      <span className="sg-stat-label">{label}</span>
      <strong>{value}</strong>
      {hint && <p>{hint}</p>}
    </div>
  </article>
);

export const SectionHeading = ({ eyebrow, title, description, actions }) => (
  <div className="sg-section-heading" style={actions ? { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' } : undefined}>
    <div>
      {eyebrow && <span className="sg-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="sg-page-header-actions">{actions}</div>}
  </div>
);
