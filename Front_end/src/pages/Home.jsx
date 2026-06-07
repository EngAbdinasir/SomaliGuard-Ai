import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Database,
  FileImage,
  FileText,
  ScanText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getHistory } from '../services/api';
import { useThemeMode } from '../hooks/useThemeMode';
import { buildHistoryStats, confidencePercent, formatDateTime, formatPredictionLabel, isOffensivePrediction, rowText } from '../utils/predictions';

ChartJS.register(ArcElement, Tooltip, Legend);

const Home = () => {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const { isDark } = useThemeMode();
  const textColor = isDark ? '#cbd5e1' : '#64748b';
  const stats = buildHistoryStats(history);
  const recent = history.slice(0, 4);

  useEffect(() => {
    const load = async () => {
      try {
        const historyData = await getHistory();
        setHistory(historyData.history || []);
      } catch (err) {
        setError('We could not load your recent activity right now.');
      }
    };

    load();
  }, []);

  const chartData = {
    labels: ['Offensive', 'Non-Offensive'],
    datasets: [{
      data: [stats.offensive, stats.nonOffensive],
      backgroundColor: ['#ef4444', '#10b981'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: textColor, padding: 18, font: { family: 'Inter', size: 13 } },
      },
    },
    cutout: '74%',
  };

  return (
    <main className="page" style={{ padding: '32px 20px', maxWidth: '1500px', margin: '0 auto' }}>
      <section className="dashboard-hero" style={{ minHeight: '260px', marginBottom: '22px' }}>
        <div>
          <span className="eyebrow"><Sparkles size={15} /> AI Powered Somali Moderation</span>
          <h1>Somali Offensive Text Detection</h1>
          <p>
            Analyze typed Somali text or image-based social media content and keep a private record of your results.
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

      <section className="responsive-grid four-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '22px' }}>
        <MetricCard icon={<Database size={24} />} title="Saved Analyses" value={stats.total} detail={`${stats.image} image, ${stats.text} text`} color="#3b82f6" />
        <MetricCard icon={<ShieldAlert size={24} />} title="Flagged" value={stats.offensive} detail={`${stats.offensivePercent}% of your records`} color="#ef4444" />
        <MetricCard icon={<CheckCircle2 size={24} />} title="Clear" value={stats.nonOffensive} detail={`${stats.nonOffensivePercent}% of your records`} color="#10b981" />
        <MetricCard icon={<FileText size={24} />} title="Text Checks" value={stats.text} detail="Typed Somali text" color="#6366f1" />
      </section>

      <section className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '22px', marginBottom: '22px' }}>
        <div className="card" style={{ padding: '26px', borderRadius: '18px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 6px' }}>How It Works</h2>
              <p style={{ margin: 0, color: 'var(--muted)' }}>A simple flow from content to review result.</p>
            </div>
            <Link to="/about" className="btn light" style={{ gap: '8px' }}>Learn More <ArrowRight size={16} /></Link>
          </div>

          <div style={{ display: 'grid', gap: '13px' }}>
            <Step number="1" icon={<FileText size={20} />} title="Submit Text or Image" text="Type Somali text directly or upload an image with visible text." />
            <Step number="2" icon={<ScanText size={20} />} title="Read the Content" text="Image text is extracted and prepared for analysis." />
            <Step number="3" icon={<Brain size={20} />} title="Review the Language" text="The system checks the content and returns a clear result." />
            <Step number="4" icon={<Database size={20} />} title="Save Your History" text="Your analyses are saved privately in your account." />
          </div>
        </div>

        <div className="card" style={{ padding: '26px', borderRadius: '18px', border: '1px solid var(--line)' }}>
          <h2 style={{ margin: '0 0 6px' }}>Analysis Summary</h2>
          <p style={{ margin: '0 0 18px', color: 'var(--muted)' }}>Your flagged vs clear saved analyses.</p>
          <div style={{ height: '300px', display: 'grid', placeItems: 'center' }}>
            {stats.total ? <Doughnut data={chartData} options={chartOptions} /> : <EmptyState text="Run a prediction to populate this chart." />}
          </div>
        </div>
      </section>

      <section className="responsive-grid four-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '22px' }}>
        <TechCard icon={<ScanText size={22} />} title="Image Reading" text="Upload screenshots or images that contain visible text." color="#0ea5e9" />
        <TechCard icon={<Brain size={22} />} title="Somali Review" text="Check Somali content and receive a clear label." color="#8b5cf6" />
        <TechCard icon={<FileText size={22} />} title="Text Analysis" text="Paste or type Somali text directly into the analyzer." color="#3b82f6" />
        <TechCard icon={<Database size={22} />} title="Private History" text="Review your previous analyses from your own account." color="#10b981" />
      </section>

      <section className="card" style={{ padding: '26px', borderRadius: '18px', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 6px' }}>Recent Analyses</h2>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Latest saved predictions from your account.</p>
          </div>
          <Link className="btn light" to="/history" style={{ gap: '8px' }}>View History <ArrowRight size={16} /></Link>
        </div>

        {recent.length ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {recent.map((row) => (
              <RecentCard key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <EmptyState text="No predictions yet. Analyze text or an image to create history." />
        )}
      </section>
    </main>
  );
};

const MetricCard = ({ icon, title, value, detail, color }) => (
  <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--line)', borderLeft: `4px solid ${color}` }}>
    <div style={{ color, marginBottom: '12px' }}>{icon}</div>
    <p style={{ color: 'var(--muted)', margin: '0 0 4px', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}>{title}</p>
    <h2 style={{ margin: '0 0 4px', color, fontSize: '30px' }}>{value}</h2>
    <small style={{ color: 'var(--muted)', fontWeight: 700 }}>{detail}</small>
  </div>
);

const Step = ({ number, icon, title, text }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: '14px', alignItems: 'start', padding: '14px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--bg)' }}>
    <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: '#6366f1', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{number}</div>
    <div>
      <h3 style={{ margin: '0 0 5px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon} {title}</h3>
      <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.55 }}>{text}</p>
    </div>
  </div>
);

const TechCard = ({ icon, title, text, color }) => (
  <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--line)' }}>
    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${color}18`, color, display: 'grid', placeItems: 'center', marginBottom: '14px' }}>{icon}</div>
    <h3 style={{ margin: '0 0 6px' }}>{title}</h3>
    <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.55 }}>{text}</p>
  </div>
);

const RecentCard = ({ row }) => {
  const offensive = isOffensivePrediction(row.prediction);
  const color = offensive ? '#ef4444' : '#10b981';
  return (
    <article className="responsive-record-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 0.7fr) minmax(260px, 2fr) minmax(180px, 0.7fr)', gap: '14px', alignItems: 'center', padding: '14px', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: row.input_type === 'image' ? 'rgba(14, 165, 233, 0.12)' : 'rgba(99, 102, 241, 0.12)', color: row.input_type === 'image' ? '#0ea5e9' : '#6366f1', display: 'grid', placeItems: 'center' }}>
          {row.input_type === 'image' ? <FileImage size={20} /> : <FileText size={20} />}
        </div>
        <div>
          <strong style={{ textTransform: 'capitalize' }}>{row.input_type}</strong>
          <p style={{ margin: '3px 0 0', color: 'var(--muted)', fontSize: '12px' }}>{formatDateTime(row.created_at)}</p>
        </div>
      </div>
      <p style={{ margin: 0, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{rowText(row)}</p>
      <div className="responsive-record-status" style={{ textAlign: 'right' }}>
        <span style={{ display: 'inline-block', background: offensive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', color, padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 900 }}>
          {formatPredictionLabel(row.prediction)}
        </span>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '12px', fontWeight: 800 }}>{confidencePercent(row.confidence)}% confidence</p>
      </div>
    </article>
  );
};

const EmptyState = ({ text }) => (
  <div style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)', minHeight: '220px', textAlign: 'center', padding: '20px' }}>{text}</div>
);

export default Home;
