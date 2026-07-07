import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  FileImage,
  FileText,
  ScanText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getHealth, getHistory } from '../services/api';
import { buildHistoryStats, formatDateTime, formatPredictionLabel, isOffensivePrediction, rowText } from '../utils/predictions';

const Home = () => {
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const stats = buildHistoryStats(history);
  const recent = history.slice(0, 3);

  useEffect(() => {
    const load = async () => {
      try {
        const [historyData, healthData] = await Promise.all([getHistory(), getHealth()]);
        setHistory(historyData.history || []);
        setHealth(healthData);
      } catch (err) {
        setError('Recent activity is not available right now. You can still start a new analysis.');
      }
    };

    load();
  }, []);

  return (
    <main className="page home-page" style={{ padding: '32px 20px', maxWidth: '1460px', margin: '0 auto' }}>
      <section className="dashboard-hero home-hero" style={{ marginBottom: '22px' }}>
        <div>
          <span className="eyebrow"><Sparkles size={15} /> SomaliGuard AI</span>
          <h1>Check Somali text or image content in clear guided steps.</h1>
          <p>
            Choose a workflow, follow the steps, and review whether the content is offensive or non-offensive.
            The system keeps your analysis history for later review.
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

      {error && (
        <section className="alert-error" style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </section>
      )}

      <section className="responsive-grid three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '22px' }}>
        <StatusCard icon={<Activity size={22} />} title="System Status" value={health?.message ? 'Online' : 'Ready'} text={`${health?.model || 'Model'} with ${health?.ocr || 'OCR'} support`} color="#2563eb" />
        <StatusCard icon={<Database size={22} />} title="Saved Analyses" value={stats.total} text={`${stats.text} text records and ${stats.image} image records`} color="#0f766e" />
        <StatusCard icon={<ShieldAlert size={22} />} title="Flagged Content" value={stats.offensive} text={`${stats.nonOffensive} records were classified as non-offensive`} color="#dc2626" />
      </section>

      <section className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', marginBottom: '22px' }}>
        <WorkflowChoice
          icon={<FileText size={25} />}
          title="Analyze Somali Text"
          text="Use this when you already have text. The system will prepare the text, then classify it."
          steps={['Enter text', 'Review preprocessing', 'View prediction']}
          action="/predict-text"
          actionText="Start Text Workflow"
          color="#2563eb"
        />
        <WorkflowChoice
          icon={<FileImage size={25} />}
          title="Analyze Text From Image"
          text="Use this when the content is inside an image or screenshot. OCR extracts the text first."
          steps={['Upload image', 'Extract text with OCR', 'View prediction']}
          action="/analyze"
          actionText="Start Image Workflow"
          color="#0f766e"
        />
      </section>

      <section className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: '22px', marginBottom: '22px' }}>
        <section className="card academic-panel" style={{ padding: '26px', borderRadius: '18px', border: '1px solid var(--line)' }}>
          <div className="section-heading">
            <span><Brain size={18} /> Process</span>
            <h2>What happens during analysis?</h2>
            <p>The system shows the important stages before the final result.</p>
          </div>
          <div className="home-process-list">
            <ProcessStep number="01" title="Input" text="Type Somali text or upload an image containing Somali writing." />
            <ProcessStep number="02" title="Preparation" text="The text is extracted if needed, cleaned, and prepared for the model." />
            <ProcessStep number="03" title="Prediction" text="The trained model classifies the content as offensive or non-offensive." />
          </div>
        </section>

        <section className="card academic-panel" style={{ padding: '26px', borderRadius: '18px', border: '1px solid var(--line)' }}>
          <div className="section-heading">
            <span><Clock size={18} /> Activity</span>
            <h2>Recent Analyses</h2>
            <p>Your latest saved results appear here for quick review.</p>
          </div>
          {recent.length ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {recent.map((row) => (
                <RecentCard key={row.id} row={row} />
              ))}
            </div>
          ) : (
            <EmptyState text="No saved analyses yet. Start with text or image analysis." />
          )}
          <Link className="btn light" to="/history" style={{ gap: '8px', marginTop: '16px' }}>
            Open Full History <ArrowRight size={16} />
          </Link>
        </section>
      </section>

      <section className="responsive-grid three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <FeatureCard icon={<ScanText size={22} />} title="OCR for Images" text="Extracts readable text from uploaded images before classification." />
        <FeatureCard icon={<Brain size={22} />} title="Trained Model" text="Uses the connected transformer model for Somali language classification." />
        <FeatureCard icon={<CheckCircle2 size={22} />} title="Stored Results" text="Saves predictions so users can review previous checks." />
      </section>
    </main>
  );
};

const StatusCard = ({ icon, title, value, text, color }) => (
  <div className="card home-status-card" style={{ borderTop: `4px solid ${color}` }}>
    <div style={{ color }}>{icon}</div>
    <span>{title}</span>
    <strong>{value}</strong>
    <p>{text}</p>
  </div>
);

const WorkflowChoice = ({ icon, title, text, steps, action, actionText, color }) => (
  <section className="card workflow-choice" style={{ border: '1px solid var(--line)' }}>
    <div className="workflow-choice-icon" style={{ color, background: `${color}14` }}>{icon}</div>
    <h2>{title}</h2>
    <p>{text}</p>
    <div className="workflow-step-list">
      {steps.map((step, index) => (
        <span key={step}>
          <b>{index + 1}</b>
          {step}
        </span>
      ))}
    </div>
    <Link to={action} className="btn primary" style={{ gap: '8px', width: 'fit-content' }}>
      {actionText} <ArrowRight size={16} />
    </Link>
  </section>
);

const ProcessStep = ({ number, title, text }) => (
  <article className="home-process-step">
    <strong>{number}</strong>
    <div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  </article>
);

const FeatureCard = ({ icon, title, text }) => (
  <article className="card feature-card-clean">
    <div>{icon}</div>
    <h3>{title}</h3>
    <p>{text}</p>
  </article>
);

const RecentCard = ({ row }) => {
  const offensive = isOffensivePrediction(row.prediction);
  const color = offensive ? '#dc2626' : '#0f766e';

  return (
    <article className="home-recent-card">
      <div>
        <span>{row.input_type === 'image' ? <FileImage size={18} /> : <FileText size={18} />}</span>
        <div>
          <strong>{formatPredictionLabel(row.prediction)}</strong>
          <p>{formatDateTime(row.created_at)}</p>
        </div>
      </div>
      <p>{rowText(row)}</p>
      <b style={{ color }}>{offensive ? 'Flagged' : 'Clear'}</b>
    </article>
  );
};

const EmptyState = ({ text }) => (
  <div style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)', minHeight: '160px', textAlign: 'center', padding: '20px', fontWeight: 800 }}>{text}</div>
);

export default Home;
