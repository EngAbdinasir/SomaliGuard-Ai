import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, IdCard, Lock, MailCheck, ScanSearch, ShieldCheck, UserPlus } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';
import {
  AuthDivider,
  AuthField,
  AuthInput,
  AuthNotice,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthSwitchLink,
} from '../components/AuthUI';
import { useAuth } from '../context/AuthContext';
import { sendVerificationCode } from '../services/api';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [password, setPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
    };
  }, [profilePreview]);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleProfilePictureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file for your profile picture.');
      return;
    }

    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePicture(file);
    setProfilePreview(URL.createObjectURL(file));
    setError('');
  };

  const validateSignupDetails = () => {
    if (!name.trim() || !email.trim() || !password) {
      return 'Please fill in all fields.';
    }

    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
    if (!/[\d\W_]/.test(password)) return 'Password must include at least one number or symbol.';

    return '';
  };

  const handleSendCode = async () => {
    setError('');
    setVerificationMessage('');

    const validationError = validateSignupDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSendingCode(true);
    try {
      const data = await sendVerificationCode(email);
      setVerificationMessage(data.message);
      setAwaitingVerification(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleChangeEmail = () => {
    setAwaitingVerification(false);
    setVerificationCode('');
    setVerificationMessage('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const validationError = validateSignupDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!awaitingVerification) {
      await handleSendCode();
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    const result = await register(name, email, password, profilePicture, verificationCode);
    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setGoogleSubmitting(true);
    setError('');
    const result = await loginWithGoogle(credential);
    setGoogleSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <main className="login-redesign-page signup-redesign-page">
      <section className="login-redesign-shell signup-redesign-shell">
        <aside className="login-redesign-panel signup-redesign-panel">
          <div className="login-redesign-brand">
            <span>🧠</span>
            <div>
              <strong>SomaliGuard AI</strong>
              <small>Verified access</small>
            </div>
          </div>

          <div className="login-redesign-copy">
            <span className="login-redesign-kicker"><UserPlus size={15} /> New account</span>
            <h1>Create a secure moderation workspace.</h1>
            <p>Fill in your details first. We send a one-time email code before creating your account.</p>
          </div>

          <div className="login-redesign-signals">
            <div>
              <MailCheck size={20} />
              <span>Email verified</span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <span>Protected login</span>
            </div>
            <div>
              <ScanSearch size={20} />
              <span>Analysis history</span>
            </div>
          </div>
        </aside>

        <section className="login-redesign-card signup-redesign-card">
          <div className="login-redesign-card-header signup-redesign-card-header">
            <span className="login-redesign-lock"><IdCard size={22} /></span>
            <h2>Create an account</h2>
            <p>We will verify your email before creating the account.</p>
          </div>

          <AuthNotice text={error} />
          <AuthNotice type="success" text={verificationMessage} />

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="profile-picker signup-profile-picker">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
              />
              <button
                className={`profile-picker-preview${profilePreview ? ' has-image' : ''}`}
                type="button"
                onClick={openFilePicker}
                aria-label="Choose profile picture"
              >
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile preview" />
                ) : (
                  <Camera size={28} />
                )}
              </button>
              <button className="profile-picker-action" type="button" onClick={openFilePicker}>
                {profilePreview ? 'Change profile picture' : 'Add profile picture'}
              </button>
              <small>Optional. JPG, PNG, JPEG, or WEBP.</small>
            </div>

            <AuthField label="Full name">
              <AuthInput
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </AuthField>

            <AuthField label="Email address">
              <AuthInput
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setVerificationCode('');
                  setVerificationMessage('');
                  setAwaitingVerification(false);
                }}
                placeholder="name@gmail.com"
                autoComplete="email"
                disabled={awaitingVerification}
              />
            </AuthField>

            <AuthField label="Password" icon={<Lock size={18} />}>
              <AuthPasswordInput
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
              />
              <small className="auth-help-text">Use at least 8 characters with uppercase, lowercase, and a number or symbol.</small>
            </AuthField>

            {awaitingVerification && (
              <div className="verification-panel signup-verification-panel">
                <div>
                  <h3>Verify your email</h3>
                  <p>Enter the 6-digit code sent to {email}. If it does not arrive, check Spam, resend the code, or change the email.</p>
                </div>
                <AuthField label="Verification code">
                  <AuthInput
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    autoComplete="one-time-code"
                  />
                </AuthField>
                <div className="verification-actions">
                  <button className="verification-resend-button" type="button" onClick={handleSendCode} disabled={sendingCode}>
                    <MailCheck size={16} />
                    {sendingCode ? 'Sending...' : 'Resend code'}
                  </button>
                  <button className="verification-change-button" type="button" onClick={handleChangeEmail}>
                    Change email
                  </button>
                </div>
              </div>
            )}

            <AuthPrimaryButton loading={submitting || sendingCode}>
              {sendingCode
                ? 'Sending verification code...'
                : submitting
                  ? 'Creating account...'
                  : awaitingVerification
                    ? 'Verify and create account'
                    : 'Sign up'} <ArrowRight size={16} />
            </AuthPrimaryButton>
          </form>

          <AuthDivider />
          <GoogleAuthButton onCredential={handleGoogleCredential} disabled={googleSubmitting} text="signup_with" />

          <AuthSwitchLink>
            Already have an account? <Link to="/login">Log in</Link>
          </AuthSwitchLink>
        </section>
      </section>
    </main>
  );
};

export default Register;
