import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, MailCheck, ScanSearch, ShieldCheck } from 'lucide-react';
import {
  AuthField,
  AuthInput,
  AuthNotice,
  AuthPrimaryButton,
  AuthSwitchLink,
} from '../components/AuthUI';
import { forgotPassword } from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    setSubmitting(true);
    try {
      const data = await forgotPassword(email);
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-redesign-page recovery-redesign-page">
      <section className="login-redesign-shell recovery-redesign-shell">
        <aside className="login-redesign-panel recovery-redesign-panel">
          <div className="login-redesign-brand">
            <span>🧠</span>
            <div>
              <strong>SomaliGuard AI</strong>
              <small>Account recovery</small>
            </div>
          </div>

          <div className="login-redesign-copy">
            <span className="login-redesign-kicker"><KeyRound size={15} /> Secure recovery</span>
            <h1>Recover access to your research workspace.</h1>
            <p>Enter your email address and SomaliGuard AI will send a password reset link if the account exists.</p>
          </div>

          <div className="login-redesign-signals">
            <div>
              <MailCheck size={20} />
              <span>Email reset link</span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <span>Protected account</span>
            </div>
            <div>
              <ScanSearch size={20} />
              <span>Return to analysis</span>
            </div>
          </div>
        </aside>

        <section className="login-redesign-card recovery-redesign-card">
          <div className="login-redesign-card-header">
            <span className="login-redesign-lock"><Mail size={22} /></span>
            <h2>Forgot password</h2>
            <p>We will send instructions to help you create a new password.</p>
          </div>

          <AuthNotice text={error} />
          <AuthNotice type="success" text={message} />

          <form className="auth-form" onSubmit={handleSubmit}>
            <AuthField label="Email address" icon={<Mail size={18} />}>
              <AuthInput
                icon
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </AuthField>

            <AuthPrimaryButton loading={submitting}>
              {submitting ? 'Sending reset link...' : 'Send reset link'} <ArrowRight size={16} />
            </AuthPrimaryButton>
          </form>

          <AuthSwitchLink>
            <Link to="/login">Back to login</Link>
          </AuthSwitchLink>
        </section>
      </section>
    </main>
  );
};

export default ForgotPassword;
