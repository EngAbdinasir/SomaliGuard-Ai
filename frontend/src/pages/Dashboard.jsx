import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cloud,
  Cpu,
  Database,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Type,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAdminDashboard, getHealth } from '../services/api';
import { useThemeMode } from '../hooks/useThemeMode';
import { formatDateTime, formatPredictionLabel, isOffensivePrediction, isReviewPrediction, rowText } from '../utils/predictions';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const MODEL_RESULTS = [
  { model: 'SomBERTa', type: 'Transformer', accuracy: 0.967514, precision: 0.970175, recall: 0.950172, f1: 0.960069 },
  { model: 'AfriBERTa', type: 'Transformer', accuracy: 0.963277, precision: 0.964912, recall: 0.945017, f1: 0.954861 },
  { model: 'AfroXLMR-large', type: 'Transformer', accuracy: 0.956215, precision: 0.962633, recall: 0.929553, f1: 0.945804 },
  { model: 'mBERT', type: 'Transformer', accuracy: 0.943503, precision: 0.953069, recall: 0.907216, f1: 0.929577 },
  { model: 'BiLSTM', type: 'Deep Learning', accuracy: 0.935028, precision: 0.939068, recall: 0.900344, f1: 0.919298 },
  { model: 'CNN', type: 'Deep Learning', accuracy: 0.931497, precision: 0.953271, recall: 0.876289, f1: 0.91316 },
];

const ACADEMIC_CHARTS = [
  {
    src: '/academic-charts/all_models_metrics_comparison.png',
    title: 'All Model Metrics',
    text: 'Compares accuracy, precision, recall, and F1-score across all trained models.',
  },
  {
    src: '/academic-charts/all_models_f1_ranking.png',
    title: 'F1-score Ranking',
    text: 'Ranks the trained models by F1-score for balanced evaluation.',
  },
  {
    src: '/academic-charts/average_f1_by_model_type.png',
    title: 'Average F1 by Model Type',
    text: 'Shows the performance difference between transformer and deep learning models.',
  },
  {
    src: '/academic-charts/label_distribution_after_preprocessing.png',
    title: 'Dataset Label Distribution',
    text: 'Summarizes the offensive and non-offensive labels after preprocessing.',
  },
];

const percent = (value) => `${(value * 100).toFixed(2)}%`;

const Dashboard = () => {
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({});
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const { isDark } = useThemeMode();

  const textColor = isDark ? '#cbd5e1' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)';

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [health, dashboardData] = await Promise.all([getHealth(), getAdminDashboard()]);
      setApiOnline(Boolean(health?.message));
      setHistory(dashboardData.history || []);
      setUsers(dashboardData.users || []);
      setSummary(dashboardData || {});
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setApiOnline(false);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDashboard({ silent: true });
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  const stats = useMemo(() => {
    const total = history.length;
    const offensiveRows = history.filter((row) => isOffensivePrediction(row.prediction));
    const neutralRows = history.filter((row) => isReviewPrediction(row.prediction));
    const nonOffensiveRows = history.filter((row) => {
      const value = String(row.prediction || '').toLowerCase();
      return value.includes('non') && !neutralRows.includes(row);
    });
    const imageRows = history.filter((row) => row.input_type === 'image');
    const textRows = history.filter((row) => row.input_type === 'text');
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayRows = history.filter((row) => String(row.created_at || '').slice(0, 10) === todayKey);
    return {
      total,
      offensive: offensiveRows.length,
      nonOffensive: nonOffensiveRows.length,
      neutral: neutralRows.length,
      image: imageRows.length,
      text: textRows.length,
      today: todayRows.length,
      offensivePercent: total ? Math.round((offensiveRows.length / total) * 100) : 0,
      nonOffensivePercent: total ? Math.round((nonOffensiveRows.length / total) * 100) : 0,
      neutralPercent: total ? Math.round((neutralRows.length / total) * 100) : 0,
    };
  }, [history]);

  const userStats = useMemo(() => {
    const total = summary.users_count ?? users.length;
    const active = summary.active_users_count ?? users.filter((user) => user.is_active).length;
    const inactive = summary.inactive_users_count ?? Math.max(total - active, 0);
    const admins = summary.admin_users_count ?? users.filter((user) => user.role === 'admin').length;
    const regular = summary.regular_users_count ?? Math.max(total - admins, 0);
    return { total, active, inactive, admins, regular };
  }, [summary, users]);

  const dailyData = useMemo(() => {
    const labels = [];
    const offensive = [];
    const safe = [];
    const neutral = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const rows = history.filter((row) => String(row.created_at || '').slice(0, 10) === key);
      const offensiveRows = rows.filter((row) => isOffensivePrediction(row.prediction));
      const neutralRows = rows.filter((row) => isReviewPrediction(row.prediction));
      labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      offensive.push(offensiveRows.length);
      neutral.push(neutralRows.length);
      safe.push(Math.max(rows.length - offensiveRows.length - neutralRows.length, 0));
    }

    return { labels, offensive, safe, neutral };
  }, [history]);

  const distributionData = {
    labels: ['Offensive', 'Non-Offensive', 'Needs Review'],
    datasets: [{
      data: [stats.offensive, stats.nonOffensive, stats.neutral],
      backgroundColor: ['#ef4444', '#10b981', '#64748b'],
      borderWidth: 0,
      hoverOffset: 5,
      cutout: '72%',
    }],
  };

  const dailyChartData = {
    labels: dailyData.labels,
    datasets: [
      { label: 'Offensive', data: dailyData.offensive, backgroundColor: '#ef4444', borderRadius: 4 },
      { label: 'Non-Offensive', data: dailyData.safe, backgroundColor: '#10b981', borderRadius: 4 },
      { label: 'Needs Review', data: dailyData.neutral, backgroundColor: '#64748b', borderRadius: 4 },
    ],
  };

  const barOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor, boxWidth: 10, usePointStyle: true } },
      tooltip: {
        backgroundColor: isDark ? '#0f172a' : '#fff',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: textColor,
        borderColor: gridColor,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: textColor } },
      y: { stacked: true, beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, precision: 0 } },
    },
  };

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA || Number(b.id || 0) - Number(a.id || 0);
    });
  }, [history]);

  const recentPredictions = sortedHistory.slice(0, 6);
  const riskyPredictions = sortedHistory.filter((row) => isOffensivePrediction(row.prediction)).slice(0, 5);
  const bestModel = MODEL_RESULTS.reduce((best, model) => (model.f1 > best.f1 ? model : best), MODEL_RESULTS[0]);

  const modelPerformanceData = {
    labels: MODEL_RESULTS.map((item) => item.model),
    datasets: [
      {
        label: 'Accuracy',
        data: MODEL_RESULTS.map((item) => Number((item.accuracy * 100).toFixed(2))),
        backgroundColor: '#2563eb',
        borderRadius: 8,
      },
      {
        label: 'F1-score',
        data: MODEL_RESULTS.map((item) => Number((item.f1 * 100).toFixed(2))),
        backgroundColor: '#0f766e',
        borderRadius: 8,
      },
    ],
  };

  const modelPerformanceOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor, boxWidth: 10, usePointStyle: true } },
      tooltip: {
        backgroundColor: isDark ? '#0f172a' : '#fff',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: textColor,
        borderColor: gridColor,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: {
        min: 85,
        max: 100,
        grid: { color: gridColor },
        ticks: { color: textColor, callback: (value) => `${value}%` },
      },
    },
  };

  return (
    <main className="page dashboard-page" style={{ padding: '30px', maxWidth: '1540px', margin: '0 auto' }}>
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow"><Sparkles size={15} /> Academic Monitoring Dashboard</span>
          <h1>SomaliGuard AI Research Dashboard</h1>
          <p>Review the research evidence, model performance, prediction records, and system activity for the Somali offensive language detection system.</p>
        </div>
        <div className="dashboard-actions">
          <a href="#review-queue" className="dash-action primary-action"><ShieldAlert size={17} /> Review Queue</a>
          <Link to="/history" className="dash-action"><Clock size={17} /> View History</Link>
          <button onClick={() => loadDashboard()} className="dash-refresh" aria-label="Refresh dashboard" disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </section>

      {error && <div className="alert-error" style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px' }}>{error}</div>}

      <section className="dashboard-research-overview">
        <AcademicOverviewCard
          icon={<FileText size={22} />}
          title="Research Scope"
          text="The system evaluates Somali text entered directly by users or extracted from uploaded images."
          detail={`${stats.total} saved analysis records`}
          color="#2563eb"
        />
        <AcademicOverviewCard
          icon={<Brain size={22} />}
          title="AI Processing"
          text="Each request passes through preparation before the trained model produces the final classification."
          detail={`${stats.text} text checks, ${stats.image} image checks`}
          color="#0f766e"
        />
        <AcademicOverviewCard
          icon={<Database size={22} />}
          title="Research Evidence"
          text="Predictions are stored in MySQL to support review, reporting, and project evaluation."
          detail={`${userStats.total} registered users`}
          color="#7c3aed"
        />
      </section>

      <section className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '18px', marginBottom: '20px' }}>
        <MetricCard icon={<Database size={25} />} color="#6366f1" title="Total Records" value={stats.total} subtitle={`${stats.text} text, ${stats.image} image`} />
        <MetricCard icon={<Users size={25} />} color="#0ea5e9" title="Users" value={userStats.total} subtitle={`${userStats.active} active, ${userStats.admins} admins`} />
        <MetricCard icon={<ShieldAlert size={25} />} color="#ef4444" title="Offensive" value={stats.offensive} subtitle={`${stats.offensivePercent}% of predictions`} />
        <MetricCard icon={<CheckCircle2 size={25} />} color="#10b981" title="Non-Offensive" value={stats.nonOffensive} subtitle={`${stats.nonOffensivePercent}% of predictions`} />
      </section>

      <SectionIntro
        title="Model Evaluation Evidence"
        text="This section presents the comparative performance of the trained models used during the research phase."
      />
      <section className="model-evaluation-grid">
        <Panel title="Model Performance Evaluation" icon={<Brain size={18} />}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <div className="model-summary-banner">
              <div>
                <span>Best model by F1-score</span>
                <h2>{bestModel.model}</h2>
                <p>{bestModel.type} model with {percent(bestModel.accuracy)} accuracy and {percent(bestModel.f1)} F1-score.</p>
              </div>
              <div className="model-score-pill">{percent(bestModel.f1)}</div>
            </div>
            <div style={{ height: '310px' }}>
              <Bar data={modelPerformanceData} options={modelPerformanceOptions} />
            </div>
          </div>
        </Panel>

        <Panel title="Trained Model Ranking" icon={<BarChart2 size={18} />}>
          <ModelRankingTable results={MODEL_RESULTS} />
        </Panel>
      </section>

      <section className="academic-chart-gallery">
        {ACADEMIC_CHARTS.map((chart) => (
          <ResearchChartCard key={chart.src} chart={chart} />
        ))}
      </section>

      <SectionIntro
        title="System Monitoring"
        text="This section summarizes prediction distribution, recent system activity, and the current backend service state."
      />
      <section className="dashboard-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.8fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Panel title="Prediction Labels" icon={<BarChart2 size={18} />}>
          <div className="responsive-grid dashboard-label-grid" style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '20px', alignItems: 'center' }}>
            <div style={{ width: '170px', height: '170px' }}>
              {stats.total ? <Doughnut data={distributionData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /> : <EmptyState text="No labels yet" />}
            </div>
            <div style={{ display: 'grid', gap: '13px' }}>
              <LegendRow color="#ef4444" label="Offensive" value={`${stats.offensive} (${stats.offensivePercent}%)`} />
              <LegendRow color="#10b981" label="Non-Offensive" value={`${stats.nonOffensive} (${stats.nonOffensivePercent}%)`} />
              <LegendRow color="#64748b" label="Needs Review" value={`${stats.neutral} (${stats.neutralPercent}%)`} />
            </div>
          </div>
        </Panel>

        <Panel title="Last 7 Days Activity" icon={<TrendingUp size={18} />}>
          <div style={{ height: '250px' }}>
            <Bar data={dailyChartData} options={barOptions} />
          </div>
        </Panel>

        <Panel title="System Health" icon={<Cpu size={18} />}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <HealthRow icon={<Cloud size={17} />} label="Service" value={apiOnline ? 'Online' : 'Offline'} color={apiOnline ? '#10b981' : '#ef4444'} />
            <HealthRow icon={<Database size={17} />} label="Storage" value={summary.database_status || (error ? 'Check connection' : 'Connected')} color={error ? '#ef4444' : '#10b981'} />
            <HealthRow icon={<Brain size={17} />} label="AI Review" value={summary.model_name ? 'Ready' : 'Ready'} color="#6366f1" />
            <HealthRow icon={<Activity size={17} />} label="Today" value={`${stats.today} checks`} color="#0ea5e9" />
          </div>
        </Panel>
      </section>

      <SectionIntro
        title="Review Records"
        text="Recent predictions and flagged content are shown here for academic review and moderation follow-up."
      />
      <section className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Panel
          title="Recent Prediction History"
          icon={<Clock size={18} />}
          action={<RecentHistoryAction lastUpdated={lastUpdated} loading={loading} onRefresh={() => loadDashboard()} />}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead>
                <tr>
                  <th style={th}>Type</th>
                  <th style={th}>Text</th>
                  <th style={{ ...th, textAlign: 'center' }}>Label</th>
                  <th style={{ ...th, textAlign: 'right' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentPredictions.map((item) => (
                  <PredictionRow key={item.id} item={item} />
                ))}
                {!recentPredictions.length && (
                  <tr><td colSpan="4" style={{ padding: '22px', textAlign: 'center', color: 'var(--muted)' }}>No prediction history yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="High Risk Queue" icon={<ShieldAlert size={18} />} action={<Link to="/history">Review <ChevronRight size={14} /></Link>}>
          <div id="review-queue" />
          <div style={{ display: 'grid', gap: '12px' }}>
            {riskyPredictions.map((item) => (
              <div key={item.id} style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.06)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                  <strong style={{ color: '#ef4444' }}>{formatPredictionLabel(item.prediction)}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 900, textTransform: 'capitalize' }}>{item.input_type || 'text'}</span>
                </div>
                <p style={{ margin: '0 0 8px', color: 'var(--text)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rowText(item)}</p>
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{formatDateTime(item.created_at)}</span>
              </div>
            ))}
            {!riskyPredictions.length && <EmptyState text="No offensive records in the queue" />}
          </div>
        </Panel>
      </section>

      <SectionIntro
        title="Administrative Management"
        text="Account administration is available as a dedicated page, while this dashboard remains focused on system evidence and operational summaries."
      />
      <section className="dashboard-admin-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Panel title="User Access Summary" icon={<UserCog size={18} />} action={<Link to="/users">Open Users <ChevronRight size={14} /></Link>}>
          <div className="responsive-grid dashboard-mini-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <MiniStat icon={<UserCheck size={18} />} label="Active Users" value={userStats.active} color="#10b981" />
            <MiniStat icon={<AlertTriangle size={18} />} label="Inactive Users" value={userStats.inactive} color="#f59e0b" />
            <MiniStat icon={<UserCog size={18} />} label="Admins" value={userStats.admins} color="#6366f1" />
            <MiniStat icon={<Users size={18} />} label="Normal Users" value={userStats.regular} color="#0ea5e9" />
          </div>
        </Panel>

        <Panel title="Input Sources" icon={<FileText size={18} />}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <ProgressRow icon={<Type size={18} />} label="Text Analysis" value={stats.text} total={stats.total} color="#6366f1" />
            <ProgressRow icon={<ImageIcon size={18} />} label="Image Analysis" value={stats.image} total={stats.total} color="#10b981" />
          </div>
        </Panel>

        <Panel title="Management Workspace" icon={<Users size={18} />} action={<Link to="/users">Manage <ChevronRight size={14} /></Link>}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
              User records, role updates, account activation, and administrative actions are handled on a separate user management page.
            </p>
            <Link to="/users" className="btn primary" style={{ width: 'fit-content', gap: '8px' }}>
              Open User Management <ChevronRight size={16} />
            </Link>
          </div>
        </Panel>
      </section>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @media(max-width: 1200px) {
          .dashboard-overview-grid,
          .dashboard-admin-grid,
          .dashboard-main-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media(max-width: 900px) {
          .dashboard-overview-grid,
          .dashboard-admin-grid,
          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
};

const MetricCard = ({ icon, color, title, value, subtitle }) => (
  <div className="card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: `${color}18`, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: '0 0 5px', color: 'var(--muted)', fontSize: '13px', fontWeight: 800 }}>{title}</p>
      <h2 style={{ margin: '0 0 4px', color: 'var(--text)', fontSize: '28px', lineHeight: 1 }}>{value}</h2>
      <p style={{ margin: 0, color, fontSize: '13px', fontWeight: 800 }}>{subtitle}</p>
    </div>
  </div>
);

const Panel = ({ title, icon, action, children }) => (
  <section className="card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid var(--line)', minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
      <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)' }}>
        <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'grid', placeItems: 'center' }}>{icon}</span>
        {title}
      </h3>
      {action && <div style={{ fontSize: '13px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>{action}</div>}
    </div>
    {children}
  </section>
);

const SectionIntro = ({ title, text }) => (
  <div className="dashboard-section-intro">
    <div>
      <span>Research section</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  </div>
);

const AcademicOverviewCard = ({ icon, title, text, detail, color }) => (
  <article className="card academic-overview-card">
    <div className="academic-overview-icon" style={{ color, background: `${color}14` }}>{icon}</div>
    <div>
      <span>{title}</span>
      <p>{text}</p>
      <strong style={{ color }}>{detail}</strong>
    </div>
  </article>
);

const LegendRow = ({ color, label, value }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: color }} />
      <span style={{ color: 'var(--text)', fontWeight: 900, fontSize: '14px' }}>{label}</span>
    </div>
    <div style={{ color: 'var(--muted)', fontSize: '13px', marginLeft: '17px' }}>{value}</div>
  </div>
);

const HealthRow = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: '9px', color: 'var(--muted)', fontWeight: 800, fontSize: '13px' }}>{icon}{label}</span>
    <strong style={{ color, textAlign: 'right' }}>{value}</strong>
  </div>
);

const MiniStat = ({ icon, label, value, color }) => (
  <div style={{ border: `1px solid ${color}30`, background: `${color}0d`, borderRadius: '12px', padding: '14px' }}>
    <div style={{ color, marginBottom: '10px' }}>{icon}</div>
    <div style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 950 }}>{value}</div>
    <div style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 800 }}>{label}</div>
  </div>
);

const ProgressRow = ({ icon, label, value, total, color }) => {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '9px', color: 'var(--text)', fontWeight: 900 }}>{icon}{label}</span>
        <strong style={{ color }}>{value}</strong>
      </div>
      <div style={{ height: '10px', borderRadius: '999px', background: 'var(--bg)', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '999px' }} />
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '5px', fontWeight: 700 }}>{percent}% of saved predictions</div>
    </div>
  );
};

const RecentHistoryAction = ({ lastUpdated, loading, onRefresh }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
    <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 800 }}>
      {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Updating...'}
    </span>
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      aria-label="Refresh recent prediction history"
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: '1px solid var(--line)',
        background: 'var(--bg)',
        color: 'var(--text)',
        display: 'grid',
        placeItems: 'center',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.65 : 1,
      }}
    >
      <RefreshCw size={15} className={loading ? 'spin' : ''} />
    </button>
    <Link to="/history" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      View All <ChevronRight size={14} />
    </Link>
  </div>
);

const PredictionRow = ({ item }) => {
  const offensive = isOffensivePrediction(item.prediction);
  const neutral = isReviewPrediction(item.prediction);
  const color = neutral ? '#64748b' : offensive ? '#ef4444' : '#10b981';

  return (
    <tr>
      <td style={td}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 800 }}>
          {item.input_type === 'image' ? <ImageIcon size={16} color="#10b981" /> : <Type size={16} color="#6366f1" />}
          {item.input_type || 'text'}
        </span>
      </td>
      <td style={{ ...td, maxWidth: '260px' }}>
        <span style={{ color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rowText(item)}</span>
      </td>
      <td style={{ ...td, textAlign: 'center' }}>
        <span style={{ background: `${color}18`, color, padding: '5px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 900 }}>
          {formatPredictionLabel(item.prediction)}
        </span>
      </td>
      <td style={{ ...td, textAlign: 'right', color: 'var(--muted)', fontSize: '13px' }}>{formatDateTime(item.created_at)}</td>
    </tr>
  );
};

const ModelRankingTable = ({ results }) => (
  <div className="model-ranking-table">
    <div className="model-ranking-head">
      <span>Model</span>
      <span>Type</span>
      <span>Accuracy</span>
      <span>Precision</span>
      <span>Recall</span>
      <span>F1-score</span>
    </div>
    {results.map((item, index) => (
      <div className="model-ranking-row" key={item.model}>
        <strong>
          <small>#{index + 1}</small>
          {item.model}
        </strong>
        <span>{item.type}</span>
        <span>{percent(item.accuracy)}</span>
        <span>{percent(item.precision)}</span>
        <span>{percent(item.recall)}</span>
        <span className="f1-value">{percent(item.f1)}</span>
      </div>
    ))}
  </div>
);

const ResearchChartCard = ({ chart }) => (
  <article className="card research-chart-card">
    <div>
      <h3>{chart.title}</h3>
      <p>{chart.text}</p>
    </div>
    <img src={chart.src} alt={chart.title} loading="lazy" />
  </article>
);

const EmptyState = ({ text }) => (
  <div style={{ minHeight: '120px', display: 'grid', placeItems: 'center', color: 'var(--muted)', textAlign: 'center', fontWeight: 800 }}>{text}</div>
);

const th = { textAlign: 'left', padding: '10px 0', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '12px', fontWeight: 900 };
const td = { padding: '14px 10px 14px 0', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' };

export default Dashboard;
