import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Legend, LinearScale, Tooltip } from 'chart.js';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  FileImage,
  FileText,
  History as HistoryIcon,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getHealth, getHistory } from '../services/api';
import {
  buildHistoryStats,
  formatDateTime,
  formatPredictionLabel,
  isOffensivePrediction,
  isUnclassifiedPrediction,
  rowText,
} from '../utils/predictions';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../hooks/useThemeMode';
import { Alert, Card, StatCard } from '../components/ui/Primitives';

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LinearScale, Tooltip);

const formatConfidence = (value) => {
  if (value === null || value === undefined || value === '') return 'Not available';
  const confidence = Number(value);
  return Number.isFinite(confidence) ? `${(confidence * 100).toFixed(2)}%` : 'Not available';
};

const UserDashboard = () => {
  const { currentUser } = useAuth();
  const { isDark } = useThemeMode();
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [historyResult, healthResult] = await Promise.allSettled([getHistory(), getHealth()]);

      if (historyResult.status === 'fulfilled') setHistory(historyResult.value.history || []);
      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);

      if (historyResult.status === 'rejected' && healthResult.status === 'rejected') {
        setError('Dashboard activity and system status are unavailable. You can still start a new analysis.');
      } else if (historyResult.status === 'rejected') {
        setError('Your prediction activity could not be loaded. System status is still available.');
      } else if (healthResult.status === 'rejected') {
        setError('Live system status could not be loaded. Your prediction activity is still available.');
      }

      setLoading(false);
    };

    load();
  }, []);

  const stats = useMemo(() => buildHistoryStats(history), [history]);
  const sortedHistory = useMemo(() => [...history].sort((a, b) => {
    const dateDifference = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return dateDifference || Number(b.id || 0) - Number(a.id || 0);
  }), [history]);
  const recent = sortedHistory.slice(0, 5);
  const displayName = currentUser?.full_name || currentUser?.name || 'User';

  const todayActivity = useMemo(() => {
    const today = new Date().toDateString();
    return history.filter((row) => row.created_at && new Date(row.created_at).toDateString() === today).length;
  }, [history]);

  const averageConfidence = useMemo(() => {
    const values = history
      .filter((row) => row.confidence !== null && row.confidence !== undefined && row.confidence !== '')
      .map((row) => Number(row.confidence))
      .filter((value) => Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }, [history]);

  const activityDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const dayRows = history.filter((row) => {
      if (!row.created_at) return false;
      const rowDate = new Date(row.created_at);
      rowDate.setHours(0, 0, 0, 0);
      return rowDate.getTime() === date.getTime();
    });
    return {
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      text: dayRows.filter((row) => row.input_type === 'text').length,
      image: dayRows.filter((row) => row.input_type === 'image').length,
    };
  }), [history]);

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.18)';
  const resultChartData = {
    labels: ['Offensive', 'Non-offensive'],
    datasets: [{
      data: [stats.offensive, stats.nonOffensive],
      backgroundColor: ['#dc2626', '#059669'],
      borderWidth: 0,
      hoverOffset: 5,
    }],
  };
  const activityChartData = {
    labels: activityDays.map((day) => day.label),
    datasets: [
      { label: 'Text', data: activityDays.map((day) => day.text), backgroundColor: '#4f46e5', borderRadius: 7 },
      { label: 'Image', data: activityDays.map((day) => day.image), backgroundColor: '#0d9488', borderRadius: 7 },
    ],
  };
  const legendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: textColor, boxWidth: 10, usePointStyle: true, padding: 18 } },
    },
  };
  const activityOptions = {
    ...legendOptions,
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: { beginAtZero: true, ticks: { color: textColor, precision: 0 }, grid: { color: gridColor } },
    },
  };

  return (
    <main className="page sg-home-page">
      <section className="sg-hero">
        <div className="sg-hero-copy">
          <span className="sg-eyebrow"><Sparkles size={14} /> Research Activity</span>
          <h1>User Analysis Dashboard</h1>
          <p>{displayName}, review your recorded Somali text and image classifications or begin a new analysis.</p>
          <div className="sg-hero-actions">
            <Link to="/predict-text" className="sg-button sg-button-primary"><FileText size={16} /> Analyze Text</Link>
            <Link to="/analyze" className="sg-button sg-button-outline"><FileImage size={16} /> Analyze Image</Link>
            <Link to="/history" className="sg-button sg-button-outline"><HistoryIcon size={16} /> Full History</Link>
          </div>
        </div>
        <div className="sg-live-status">
          <span className={health?.message ? 'online' : 'offline'} />
          <div>
            <small>System status</small>
            <strong>{loading ? 'Checking…' : health?.message ? 'Online and ready' : 'Status unavailable'}</strong>
            <p>{health?.model || 'SomBERTa'} · {health?.ocr || 'EasyOCR'}</p>
          </div>
        </div>
      </section>

      {error && <Alert type="error">{error}</Alert>}

      <section className="sg-stat-grid" aria-label="Prediction summary" style={{ margin: '20px 0' }}>
        <StatCard icon={Database} tone="blue" label="Total analyses" value={loading ? '—' : stats.total} hint={`${stats.text} text · ${stats.image} image`} />
        <StatCard icon={ShieldAlert} tone="red" label="Offensive" value={loading ? '—' : stats.offensive} hint={`${stats.offensivePercent}% of your results`} />
        <StatCard icon={CheckCircle2} tone="teal" label="Non-offensive" value={loading ? '—' : stats.nonOffensive} hint={`${stats.nonOffensivePercent}% of your results`} />
        <StatCard icon={FileImage} tone="amber" label="Image analyses" value={loading ? '—' : stats.image} hint="Classified after OCR extraction" />
      </section>

      <section className="sg-activity-strip" aria-label="Current activity summary" style={{ marginBottom: 20 }}>
        <ActivityItem icon={<CalendarDays size={18} />} label="Today" value={loading ? 'Loading…' : `${todayActivity} analyses`} />
        <ActivityItem icon={<Activity size={18} />} label="Average confidence" value={loading ? 'Loading…' : formatConfidence(averageConfidence)} />
        <ActivityItem icon={<Clock size={18} />} label="Latest activity" value={loading ? 'Loading…' : recent[0]?.created_at ? formatDateTime(recent[0].created_at) : 'No activity yet'} />
      </section>

      <section className="sg-grid-2" style={{ marginBottom: 20 }}>
        <Card className="sg-chart-card" title="Activity over the last seven days" description="Daily text and image analyses">
          <div className="sg-chart-wrap">
            {loading ? <DashboardEmpty text="Loading activity chart…" /> : stats.total
              ? <Bar data={activityChartData} options={activityOptions} />
              : <DashboardEmpty text="Your activity chart will appear after your first analysis." />}
          </div>
        </Card>

        <Card className="sg-chart-card" title="Result distribution" description="Your saved classification results">
          <div className="sg-chart-wrap compact">
            {loading ? <DashboardEmpty text="Loading result chart…" /> : stats.total
              ? <Doughnut data={resultChartData} options={legendOptions} />
              : <DashboardEmpty text="Your result chart will appear after your first analysis." />}
          </div>
        </Card>
      </section>

      <section className="sg-grid-split">
        <Card title="Recent predictions" description="Your five latest saved analyses" action={<Link to="/history" className="sg-button sg-button-ghost">View all <ArrowRight size={15} /></Link>}>
          <div className="sg-record-list">
            {loading ? <DashboardEmpty text="Loading recent predictions…" /> : recent.length
              ? recent.map((row) => <RecentPrediction key={row.id} row={row} />)
              : <DashboardEmpty text="No predictions yet. Start with text or image analysis." />}
          </div>
        </Card>

        <div className="sg-stack">
          <Card title="Account" description="Your signed-in profile">
            <div className="sg-info-list">
              <InfoItem label="Name" value={displayName} />
              <InfoItem label="Email" value={currentUser?.email || 'Not available'} />
              <InfoItem label="Role" value={currentUser?.role || 'user'} />
              <InfoItem label="Member since" value={currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Not available'} />
              <InfoItem label="Account" value={currentUser?.is_active === false ? 'Inactive' : 'Active'} />
            </div>
          </Card>

          <Card title="AI services" description="Live processing components">
            <div className="sg-info-list">
              <InfoItem label="Flask API" value={loading ? 'Checking…' : health?.message ? 'Online' : 'Unavailable'} />
              <InfoItem label="Model" value={health?.model || 'SomBERTa'} />
              <InfoItem label="OCR" value={health?.ocr || 'EasyOCR'} />
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
};

const ActivityItem = ({ icon, label, value }) => (
  <article>
    <span>{icon}</span>
    <div><small>{label}</small><strong>{value}</strong></div>
  </article>
);

const RecentPrediction = ({ row }) => {
  const offensive = isOffensivePrediction(row.prediction);
  const unclassified = isUnclassifiedPrediction(row.prediction);
  const tone = unclassified ? 'unclassified' : offensive ? 'offensive' : 'safe';
  return (
    <article className="sg-record-row">
      <div className={`sg-record-type ${row.input_type === 'image' ? 'image' : ''}`}>
        {row.input_type === 'image' ? <FileImage size={18} /> : <FileText size={18} />}
      </div>
      <div className="sg-record-content">
        <strong>{rowText(row)}</strong>
        <small>{row.input_type === 'image' ? 'Image analysis' : 'Text analysis'} · {formatDateTime(row.created_at)}</small>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className={`sg-record-result ${tone}`}>{formatPredictionLabel(row.prediction)}</div>
        <small style={{ color: 'var(--sg-text-muted)' }}>Confidence: {formatConfidence(row.confidence)}</small>
      </div>
    </article>
  );
};

const InfoItem = ({ label, value }) => (
  <div className="sg-info-item">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const DashboardEmpty = ({ text }) => (
  <div className="sg-state"><Database size={26} /><p>{text}</p></div>
);

export default UserDashboard;
