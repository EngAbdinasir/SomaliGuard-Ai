import { useState } from 'react';
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendContactMessage } from '../services/api';
import { Alert, Card, FormField, PageHeader } from '../components/ui/Primitives';

const contact = { phone: '+252 618104792', phoneHref: 'tel:+252618104792', whatsappHref: 'https://wa.me/252618104792', email: 'fiaa89013292@gmail.com', emailHref: 'mailto:fiaa89013292@gmail.com', location: 'Mogadishu, Somalia' };

const Contact = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return {
      name: currentUser?.full_name || currentUser?.name || '',
      email: currentUser?.email || '',
      subject: params.get('subject') || '',
      message: params.get('message') || '',
    };
  });
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState(null);

  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setFeedback(null); };
  const submit = async (event) => {
    event.preventDefault(); setStatus('loading'); setFeedback(null);
    try {
      const data = await sendContactMessage(form);
      setFeedback({ type: 'success', message: data.message || 'Your message was sent successfully.' });
      setForm((current) => ({ ...current, subject: '', message: '' }));
    } catch (error) { setFeedback({ type: 'error', message: error.message }); }
    finally { setStatus('idle'); }
  };

  return <main className="page sg-contact-page">
    <PageHeader eyebrow="Support and feedback" title="Contact" description="Send a question, report a system issue, or provide academic feedback about SomaliGuard AI." />
    <div className="sg-contact-grid">
      <div className="sg-contact-methods">
        <ContactMethod icon={<Mail size={20} />} label="Email" value={contact.email} href={contact.emailHref} />
        <ContactMethod icon={<Phone size={20} />} label="Phone" value={contact.phone} href={contact.phoneHref} />
        <ContactMethod icon={<MessageCircle size={20} />} label="WhatsApp" value={contact.phone} href={contact.whatsappHref} />
        <ContactMethod icon={<MapPin size={20} />} label="Location" value={contact.location} />
      </div>
      <Card title="Send a message" description="All fields are required. The form uses the existing contact API.">
        {feedback && <Alert type={feedback.type}>{feedback.message}</Alert>}
        <form className="sg-contact-form" onSubmit={submit}>
          <div className="sg-form-row">
            <FormField label="Name" htmlFor="contact-name"><input id="contact-name" className="sg-input" value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" required /></FormField>
            <FormField label="Email" htmlFor="contact-email"><input id="contact-email" className="sg-input" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" required /></FormField>
          </div>
          <FormField label="Subject" htmlFor="contact-subject"><input id="contact-subject" className="sg-input" value={form.subject} onChange={(event) => update('subject', event.target.value)} required /></FormField>
          <FormField label="Message" htmlFor="contact-message" help={`${form.message.length} characters`}><textarea id="contact-message" className="sg-input" value={form.message} onChange={(event) => update('message', event.target.value)} required /></FormField>
          <button className="sg-button sg-button-primary" type="submit" disabled={status === 'loading'}>{status === 'loading' ? <span className="sg-button-spinner" /> : feedback?.type === 'success' ? <CheckCircle2 size={17} /> : <Send size={17} />}{status === 'loading' ? 'Sending message…' : 'Send message'}</button>
        </form>
      </Card>
    </div>
  </main>;
};

const ContactMethod = ({ icon, label, value, href }) => <article className="sg-contact-method"><span>{icon}</span><div><small>{label}</small>{href ? <a href={href}>{value}</a> : <strong>{value}</strong>}</div></article>;
export default Contact;
