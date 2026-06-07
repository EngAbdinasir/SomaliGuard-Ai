import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Database,
  Eye,
  FileImage,
  FileText,
  ScanText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const About = () => {
  return (
    <main className="page" style={{ padding: '32px 20px', maxWidth: '1500px', margin: '0 auto' }}>
      <section className="dashboard-hero" style={{ minHeight: '230px', marginBottom: '22px' }}>
        <div>
          <span className="eyebrow"><Sparkles size={15} /> About the System</span>
          <h1>SomaliGuard AI</h1>
          <p>
            A Somali offensive text detection system that analyzes typed text and social media images with a simple,
            user-friendly workflow.
          </p>
        </div>
        <div className="dashboard-actions">
          <Link to="/predict-text" className="dash-action primary-action">
            Analyze Text <ArrowRight size={17} />
          </Link>
          <Link to="/analyze" className="dash-action">
            Analyze Image <FileImage size={17} />
          </Link>
        </div>
      </section>

      <section className="responsive-grid three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '22px' }}>
        <ValueCard
          icon={<ShieldCheck size={25} />}
          title="Mission"
          text="Help Somali-speaking communities identify offensive language in text and image-based content more quickly."
          color="#3b82f6"
        />
        <ValueCard
          icon={<Eye size={25} />}
          title="Vision"
          text="Support safer digital spaces with a practical tool built around Somali language moderation workflows."
          color="#10b981"
        />
        <ValueCard
          icon={<Users size={25} />}
          title="Users"
          text="Designed for students, admins, moderators, and researchers who need clear prediction records."
          color="#8b5cf6"
        />
      </section>

      <section className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '22px', alignItems: 'stretch', marginBottom: '22px' }}>
        <div className="card" style={{ padding: '26px', borderRadius: '18px', border: '1px solid var(--line)' }}>
          <h2 style={{ margin: '0 0 10px' }}>How It Works</h2>
          <p style={{ margin: '0 0 22px', color: 'var(--muted)', lineHeight: 1.7 }}>
            The system accepts either direct Somali text or an uploaded image. Image text is read first,
            then the content is prepared and reviewed.
          </p>

          <div style={{ display: 'grid', gap: '14px' }}>
            <ProcessStep number="1" icon={<FileText size={20} />} title="Input" text="Users type Somali text or upload an image containing Somali text." />
            <ProcessStep number="2" icon={<ScanText size={20} />} title="Read and Prepare" text="Image text is read and prepared for analysis." />
            <ProcessStep number="3" icon={<Brain size={20} />} title="Review" text="The system returns a clear result with a confidence score." />
            <ProcessStep number="4" icon={<Database size={20} />} title="History" text="Results are saved to each user's private history." />
          </div>
        </div>

        <div className="card" style={{ padding: '26px', borderRadius: '18px', border: '1px solid var(--line)', display: 'grid', alignContent: 'space-between', gap: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 10px' }}>What You Can Do</h2>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              SomaliGuard AI gives users a focused workspace for checking text, reviewing image content,
              saving results, and managing safer moderation workflows.
            </p>
          </div>

          <div className="responsive-grid two-cols tight-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <TechBadge label="Text" value="Direct analysis" />
            <TechBadge label="Images" value="Text extraction" />
            <TechBadge label="Results" value="Clear labels" />
            <TechBadge label="History" value="Saved records" />
            <TechBadge label="Accounts" value="Verified access" />
            <TechBadge label="Review" value="Admin tools" />
          </div>
        </div>
      </section>

      <section className="responsive-grid four-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '22px' }}>
        <FeatureCard icon={<CheckCircle2 size={22} />} title="Text Analysis" text="Classify direct Somali text input." />
        <FeatureCard icon={<FileImage size={22} />} title="Image Analysis" text="Extract text from images before prediction." />
        <FeatureCard icon={<Database size={22} />} title="Saved Records" text="Keep analysis history for each user." />
        <FeatureCard icon={<ShieldCheck size={22} />} title="Review Tools" text="Manage users and review activity when needed." />
      </section>

      <section className="card" style={{ padding: '26px', borderRadius: '18px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '22px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px' }}>Ready to test it?</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Run a text or image prediction and review the saved result in your history.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/predict-text" className="btn primary">Analyze Text</Link>
          <Link to="/analyze" className="btn light">Analyze Image</Link>
        </div>
      </section>
    </main>
  );
};

const ValueCard = ({ icon, title, text, color }) => (
  <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--line)' }}>
    <div style={{ width: '52px', height: '52px', borderRadius: '15px', background: `${color}18`, color, display: 'grid', placeItems: 'center', marginBottom: '16px' }}>
      {icon}
    </div>
    <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
    <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>{text}</p>
  </div>
);

const ProcessStep = ({ number, icon, title, text }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: '14px', alignItems: 'start', padding: '14px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--bg)' }}>
    <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: '#6366f1', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
      {number}
    </div>
    <div>
      <h4 style={{ margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon} {title}</h4>
      <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.55 }}>{text}</p>
    </div>
  </div>
);

const TechBadge = ({ label, value }) => (
  <div style={{ border: '1px solid var(--line)', background: 'var(--bg)', borderRadius: '12px', padding: '14px' }}>
    <div style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 900, marginBottom: '5px' }}>{label}</div>
    <div style={{ color: 'var(--text)', fontWeight: 900 }}>{value}</div>
  </div>
);

const FeatureCard = ({ icon, title, text }) => (
  <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--line)' }}>
    <div style={{ color: '#6366f1', marginBottom: '12px' }}>{icon}</div>
    <h3 style={{ margin: '0 0 7px', fontSize: '17px' }}>{title}</h3>
    <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.55 }}>{text}</p>
  </div>
);

export default About;
