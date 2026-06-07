import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import {
  AuthBrand,
  AuthCard,
  AuthField,
  AuthFooter,
  AuthInput,
  AuthNotice,
  AuthPage,
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
    <AuthPage maxWidth={430}>
      <AuthBrand />
      <AuthCard
        title="Forgot password"
        subtitle="Enter your email address and we will send a reset link if the account exists."
      >
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
            {submitting ? 'Sending reset link...' : 'Send reset link'}
          </AuthPrimaryButton>
        </form>

        <AuthSwitchLink>
          <Link to="/login">Back to login</Link>
        </AuthSwitchLink>
      </AuthCard>
      <AuthFooter />
    </AuthPage>
  );
};

export default ForgotPassword;
