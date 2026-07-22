import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, IdCard, Lock, MailCheck, ScanSearch, ShieldCheck, Sparkles } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';
import {
  AuthCardTopline,
  AuthDivider,
  AuthField,
  AuthInput,
  AuthNotice,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthSwitchLink,
  AuthVisualPanel,
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
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

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
    if (!normalizedName || !normalizedEmail || !password) {
      return 'Please fill in all fields.';
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) return 'Please enter a valid email address.';

    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
    if (!/[\d\W_]/.test(password)) return 'Password must include at least one number or symbol.';

    return '';
  };

  const handleSendCode = async () => {
    setError('');
    setVerificationMessage('');
    if (sendingCode || submitting) return;

    const validationError = validateSignupDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSendingCode(true);
    try {
      const data = await sendVerificationCode(normalizedEmail);
      if (data.dev_verification_code) {
        setVerificationCode(data.dev_verification_code);
      }

      const localCodeText = data.dev_verification_code
        ? ` Local verification code: ${data.dev_verification_code}`
        : '';

      setVerificationMessage(`${data.message || 'Verification code created.'}${localCodeText}`);
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
    if (submitting || sendingCode) return;

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
    const result = await register(normalizedName, normalizedEmail, password, profilePicture, verificationCode);
    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (googleSubmitting) return;
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
        <AuthVisualPanel
          className="signup-redesign-panel"
          subtitle="Academic research workspace"
          kickerIcon={<Sparkles size={15} />}
          kicker="Create your workspace"
          title="One verified account for every analysis."
          description="Create your profile, confirm your email address, and keep text and image results connected to your research history."
          signals={[
            { icon: <MailCheck size={20} />, label: 'Email verified' },
            { icon: <ShieldCheck size={20} />, label: 'Protected access' },
            { icon: <ScanSearch size={20} />, label: 'Saved history' },
          ]}
        />

        <section className="login-redesign-card signup-redesign-card">
          <AuthCardTopline status={awaitingVerification ? 'Step 2 of 2' : 'Step 1 of 2'} />
          <div className="login-redesign-card-header signup-redesign-card-header">
            <span className="login-redesign-lock"><IdCard size={22} /></span>
            <h2>Create an account</h2>
            <p>We will verify your email before creating the account.</p>
          </div>

          <div className="signup-progress" aria-label={`Registration step ${awaitingVerification ? 2 : 1} of 2`}>
            <div className="active">
              <span>{awaitingVerification ? '✓' : '1'}</span>
              <strong>Account details</strong>
            </div>
            <i className={awaitingVerification ? 'active' : ''} />
            <div className={awaitingVerification ? 'active' : ''}>
              <span>2</span>
              <strong>Email verification</strong>
            </div>
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
                  <p>Enter the 6-digit code sent to {normalizedEmail}. If it does not arrive, check Spam, resend the code, or change the email.</p>
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
