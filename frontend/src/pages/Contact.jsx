import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Copy, Mail, MapPin, MessageCircle, Phone, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendContactMessage } from '../services/api';

const contact = {
  phone: '+252 618104792',
  phoneHref: 'tel:+252618104792',
  whatsappHref: 'https://wa.me/252618104792',
  email: 'fiaa89013292@gmail.com',
  emailHref: 'mailto:fiaa89013292@gmail.com',
  location: 'Mogadishu, Somalia',
};

const Contact = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState('idle');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    setForm((current) => ({
      ...current,
      name: current.name || currentUser.full_name || '',
      email: current.email || currentUser.email || '',
    }));
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subject = params.get('subject');
    const message = params.get('message');

    if (!subject && !message) return;

    setForm((current) => ({
      ...current,
      subject: subject || current.subject,
      message: message || current.message,
    }));
  }, [location.search]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus('idle');
    setSuccessMessage('');
    setError('');
  };

  const copyToClipboard = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      setCopied('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('sending');
    setSuccessMessage('');
    setError('');

    try {
      const data = await sendContactMessage(form);
      setStatus('sent');
      setSuccessMessage(data.message || 'Thanks, your message has been sent. We will reply soon.');
      setForm((current) => ({ ...current, subject: '', message: '' }));
    } catch (err) {
      setStatus('idle');
      setError(err.message);
    }
  };

  return (
    <main className="page" style={{ padding: '32px 20px', maxWidth: '1500px', margin: '0 auto' }}>
      <section className="dashboard-hero" style={{ minHeight: '170px', marginBottom: '22px' }}>
        <div>
          <span className="eyebrow"><Sparkles size={15} /> Direct Support</span>
          <h1>Contact SomaliGuard AI</h1>
          <p>Reach out for help, user access, system setup, or questions about Somali offensive text detection.</p>
        </div>
        <div className="dashboard-actions">
          <a href={contact.phoneHref} className="dash-action">
            <Phone size={17} /> Call
          </a>
          <a href={contact.emailHref} className="dash-action primary-action">
            <Mail size={17} /> Email
          </a>
        </div>
      </section>

      <section className="responsive-grid contact-responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 0.9fr) minmax(430px, 1.35fr)', gap: '22px', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <ContactCard
            icon={<Phone size={22} />}
            title="Phone"
            value={contact.phone}
            actionLabel="Call now"
            href={contact.phoneHref}
            copied={copied === 'phone'}
            onCopy={() => copyToClipboard('phone', contact.phone)}
          />
          <ContactCard
            icon={<Mail size={22} />}
            title="Email"
            value={contact.email}
            actionLabel="Send email"
            href={contact.emailHref}
            copied={copied === 'email'}
            onCopy={() => copyToClipboard('email', contact.email)}
          />
          <ContactCard
            icon={<MessageCircle size={22} />}
            title="WhatsApp"
            value={contact.phone}
            actionLabel="Open chat"
            href={contact.whatsappHref}
            copied={copied === 'whatsapp'}
            onCopy={() => copyToClipboard('whatsapp', contact.phone)}
          />
          <div className="card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={iconBox}><MapPin size={22} /></div>
              <div>
                <h3 style={{ margin: '0 0 4px' }}>Location</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontWeight: 700 }}>{contact.location}</p>
              </div>
            </div>
          </div>
        </div>

        <section className="card" style={{ padding: '26px', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '22px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 6px' }}>Send a Message</h2>
              <p style={{ margin: 0, color: 'var(--muted)' }}>Send your request and the support team will reply as soon as possible.</p>
            </div>
            {status === 'sent' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800 }}>
                <CheckCircle2 size={18} /> Message sent
              </span>
            )}
          </div>

          {successMessage && (
            <div style={{ marginBottom: '18px', padding: '12px', borderRadius: '8px', fontSize: '14px', background: 'rgba(16, 185, 129, 0.08)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.22)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="alert-error" style={{ marginBottom: '18px', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
              <AlertCircle size={16} />
              <span style={{ fontWeight: 600 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField label="Your name">
                <input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Your full name"
                  required
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Your email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="name@example.com"
                  required
                  style={inputStyle}
                />
              </FormField>
            </div>

            <FormField label="Subject">
              <input
                value={form.subject}
                onChange={(event) => updateField('subject', event.target.value)}
                placeholder="What do you need help with?"
                required
                style={inputStyle}
              />
            </FormField>

            <FormField label="Message">
              <textarea
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                placeholder="Write your message..."
                required
                rows={7}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '180px', lineHeight: 1.6 }}
              />
            </FormField>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button type="submit" className="btn primary" style={{ flex: 1, minWidth: '190px', gap: '8px', opacity: status === 'sending' ? 0.75 : 1 }} disabled={status === 'sending'}>
                <Send size={18} /> {status === 'sending' ? 'Sending...' : 'Send Message'}
              </button>
              <a href={contact.whatsappHref} className="btn light" style={{ flex: 1, minWidth: '170px', gap: '8px' }}>
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
};

const ContactCard = ({ icon, title, value, actionLabel, href, copied, onCopy }) => (
  <div className="card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid var(--line)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
      <div style={iconBox}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 5px' }}>{title}</h3>
        <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontWeight: 800, wordBreak: 'break-word' }}>{value}</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href={href} className="btn primary" style={{ padding: '9px 12px', fontSize: '13px' }}>{actionLabel}</a>
          <button type="button" onClick={onCopy} className="btn light" style={{ padding: '9px 12px', fontSize: '13px', gap: '6px', color: copied ? '#10b981' : undefined }}>
            {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const FormField = ({ label, children }) => (
  <label style={{ display: 'grid', gap: '8px', fontWeight: 800, color: 'var(--text)', fontSize: '14px' }}>
    {label}
    {children}
  </label>
);

const iconBox = {
  width: '48px',
  height: '48px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, #3f63f5, #00a7a7)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  flex: '0 0 auto',
};

const inputStyle = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: '10px',
  background: 'var(--bg)',
  color: 'var(--text)',
  padding: '13px 14px',
  fontSize: '14px',
  margin: 0,
};

export default Contact;
