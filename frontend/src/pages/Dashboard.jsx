import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import {
  Activity,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cloud,
  Database,
  Download,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Type,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAdminDashboard, getHealth } from '../services/api';
import { useThemeMode } from '../hooks/useThemeMode';
import { formatDateTime, formatPredictionLabel, isNonOffensivePrediction, isOffensivePrediction, isUnclassifiedPrediction, rowText } from '../utils/predictions';
import { Alert, Card, IconChip, SectionHeading, StatCard } from '../components/ui/Primitives';

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
  const [summary, setSummary] = useState({});
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const { isDark } = useThemeMode();

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [health, dashboardData] = await Promise.all([getHealth(), getAdminDashboard()]);
      setApiOnline(Boolean(health?.message));
      setHistory(dashboardData.history || []);
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
    // Initial API synchronization is intentionally triggered when the dashboard mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const nonOffensiveRows = history.filter((row) => isNonOffensivePrediction(row.prediction));
    const classifiedTotal = offensiveRows.length + nonOffensiveRows.length;
    const imageRows = history.filter((row) => row.input_type === 'image');
    const textRows = history.filter((row) => row.input_type === 'text');
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayRows = history.filter((row) => String(row.created_at || '').slice(0, 10) === todayKey);
    return {
      total,
      offensive: offensiveRows.length,
      nonOffensive: nonOffensiveRows.length,
      image: imageRows.length,
      text: textRows.length,
      today: todayRows.length,
      offensivePercent: classifiedTotal ? Math.round((offensiveRows.length / classifiedTotal) * 100) : 0,
      nonOffensivePercent: classifiedTotal ? Math.round((nonOffensiveRows.length / classifiedTotal) * 100) : 0,
    };
  }, [history]);

  const dailyData = useMemo(() => {
    const labels = [];
    const offensive = [];
    const safe = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const rows = history.filter((row) => String(row.created_at || '').slice(0, 10) === key);
      const offensiveRows = rows.filter((row) => isOffensivePrediction(row.prediction));
      labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      offensive.push(offensiveRows.length);
      safe.push(rows.filter((row) => isNonOffensivePrediction(row.prediction)).length);
    }

    return { labels, offensive, safe };
  }, [history]);

  const distributionData = {
    labels: ['Offensive', 'Non-Offensive'],
    datasets: [{
      data: [stats.offensive, stats.nonOffensive],
      backgroundColor: ['#dc2626', '#059669'],
      borderWidth: 0,
      hoverOffset: 5,
      cutout: '72%',
    }],
  };

  const dailyChartData = {
    labels: dailyData.labels,
    datasets: [
      { label: 'Offensive', data: dailyData.offensive, backgroundColor: '#dc2626', borderRadius: 4 },
      { label: 'Non-Offensive', data: dailyData.safe, backgroundColor: '#059669', borderRadius: 4 },
    ],
  };

  const barOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor, boxWidth: 10, usePointStyle: true } },
      tooltip: {
        backgroundColor: isDark ? '#121a2e' : '#fff',
        titleColor: isDark ? '#f1f5f9' : '#0f1424',
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
  const exportableHistory = useMemo(() => history.filter((row) => (
    (isOffensivePrediction(row.prediction) || isNonOffensivePrediction(row.prediction))
    && String(row.cleaned_text || row.extracted_text || row.original_text || '').trim()
  )), [history]);

  const downloadDataset = () => {
    if (!exportableHistory.length) return;

    const rows = [
      ['record_id', 'input_type', 'source_text', 'cleaned_text', 'label', 'label_id', 'confidence', 'model_name', 'created_at', 'label_source'],
      ...exportableHistory.map((row) => {
        const offensive = isOffensivePrediction(row.prediction);
        return [
          row.id,
          row.input_type || 'text',
          row.extracted_text || row.original_text || row.cleaned_text || '',
          row.cleaned_text || '',
          offensive ? 'offensive' : 'non-offensive',
          offensive ? 1 : 0,
          row.confidence ?? '',
          row.model_name || 'SomBERTa',
          row.created_at || '',
          'SomBERTa prediction - human verification required',
        ];
      }),
    ];
    const csv = rows.map((row) => row.map(toCsvCell).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `somaliguard-admin-dataset-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const modelPerformanceData = {
    labels: MODEL_RESULTS.map((item) => item.model),
    datasets: [
      {
        label: 'Accuracy',
        data: MODEL_RESULTS.map((item) => Number((item.accuracy * 100).toFixed(2))),
        backgroundColor: '#4f46e5',
        borderRadius: 8,
      },
      {
        label: 'F1-score',
        data: MODEL_RESULTS.map((item) => Number((item.f1 * 100).toFixed(2))),
        backgroundColor: '#0d9488',
        borderRadius: 8,
      },
    ],
  };

  const modelPerformanceOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor, boxWidth: 10, usePointStyle: true } },
      tooltip: {
        backgroundColor: isDark ? '#121a2e' : '#fff',
        titleColor: isDark ? '#f1f5f9' : '#0f1424',
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
    <main className="page sg-dashboard-page">
      <section className="sg-hero">
        <div className="sg-hero-copy">
          <span className="sg-eyebrow"><Sparkles size={14} /> Administrative Research Monitoring</span>
          <h1>Research Administration Dashboard</h1>
          <p>Review the research evidence, model performance, prediction records, and system activity for the Somali offensive language detection system.</p>
        </div>
        <div className="sg-hero-actions">
          <a href="#review-queue" className="sg-button sg-button-primary"><ShieldAlert size={16} /> Offensive Records</a>
          <button type="button" onClick={downloadDataset} disabled={!exportableHistory.length} className="sg-button sg-button-outline">
            <Download size={16} /> Export Dataset ({exportableHistory.length})
          </button>
          <Link to="/history" className="sg-button sg-button-outline"><Clock size={16} /> View History</Link>
          <button type="button" onClick={() => loadDashboard()} className="sg-icon-button" aria-label="Refresh dashboard" disabled={loading} style={{ background: 'rgba(255,255,255,.14)', borderColor: 'rgba(255,255,255,.3)', color: '#fff' }}>
            <RefreshCw size={18} className={loading ? 'sg-spin' : ''} />
          </button>
        </div>
      </section>

      {error && <Alert type="error">{error}</Alert>}

      <Alert type="warning">
        <strong>Admin dataset export.</strong>{' '}
        Export valid offensive and non-offensive records from all users without account details. SomBERTa-generated labels must be reviewed by a human before model retraining.
      </Alert>

      <section className="sg-grid-3" style={{ margin: '20px 0' }}>
        <OverviewCard
          icon={FileText}
          tone="blue"
          title="Research Scope"
          text="The system evaluates Somali text entered directly by users or extracted from uploaded images."
          detail={`${stats.total} saved analysis records`}
        />
        <OverviewCard
          icon={Brain}
          tone="teal"
          title="AI Processing"
          text="Each request passes through preparation before the trained model produces the final classification."
          detail={`${stats.text} text checks, ${stats.image} image checks`}
        />
        <OverviewCard
          icon={Database}
          tone="violet"
          title="Research Evidence"
          text="Predictions are stored in MySQL to support review, reporting, and project evaluation."
          detail={`${stats.total} stored prediction records`}
        />
      </section>

      <section className="sg-grid-3" style={{ marginBottom: 20 }}>
        <StatCard icon={Database} tone="violet" label="Total Records" value={stats.total} hint={`${stats.text} text, ${stats.image} image`} />
        <StatCard icon={ShieldAlert} tone="red" label="Offensive" value={stats.offensive} hint={`${stats.offensivePercent}% of predictions`} />
        <StatCard icon={CheckCircle2} tone="teal" label="Non-Offensive" value={stats.nonOffensive} hint={`${stats.nonOffensivePercent}% of predictions`} />
      </section>

      <SectionHeading eyebrow="Research section" title="Model Evaluation Evidence" description="This section presents the comparative performance of the trained models used during the research phase." />
      <section className="sg-grid-2" style={{ marginBottom: 20 }}>
        <Card title="Model Performance Evaluation">
          <div style={{ display: 'grid', gap: 18 }}>
            <div className="sg-highlight-banner">
              <div>
                <span className="sg-highlight-label">Best model by F1-score</span>
                <h3>{bestModel.model}</h3>
                <p>{bestModel.type} model with {percent(bestModel.accuracy)} accuracy and {percent(bestModel.f1)} F1-score.</p>
              </div>
              <div className="sg-highlight-pill">{percent(bestModel.f1)}</div>
            </div>
            <div className="sg-chart-wrap" style={{ height: 300 }}>
              <Bar data={modelPerformanceData} options={modelPerformanceOptions} />
            </div>
          </div>
        </Card>

        <Card title="Trained Model Ranking">
          <ModelRankingTable results={MODEL_RESULTS} />
        </Card>
      </section>

      <section className="sg-chart-gallery" style={{ marginBottom: 20 }}>
        {ACADEMIC_CHARTS.map((chart) => (
          <figure key={chart.src}>
            <img src={chart.src} alt={chart.title} loading="lazy" />
            <figcaption><strong style={{ display: 'block', color: 'var(--sg-text)', marginBottom: 4 }}>{chart.title}</strong>{chart.text}</figcaption>
          </figure>
        ))}
      </section>

      <SectionHeading eyebrow="Research section" title="System Monitoring" description="This section summarizes prediction distribution, recent system activity, and the current backend service state." />
      <section className="sg-grid-3" style={{ marginBottom: 20 }}>
        <Card title="Prediction Labels">
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 18, alignItems: 'center' }}>
            <div style={{ width: 140, height: 140 }}>
              {stats.total ? <Doughnut data={distributionData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /> : <div className="sg-state"><p>No labels yet</p></div>}
            </div>
            <div className="sg-chart-legend" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: '#dc2626' }}><i /> Offensive — {stats.offensive} ({stats.offensivePercent}%)</span>
              <span style={{ color: '#059669' }}><i /> Non-Offensive — {stats.nonOffensive} ({stats.nonOffensivePercent}%)</span>
            </div>
          </div>
        </Card>

        <Card title="Last 7 Days Activity">
          <div className="sg-chart-wrap compact">
            <Bar data={dailyChartData} options={barOptions} />
          </div>
        </Card>

        <Card title="System Health">
          <div className="sg-info-list">
            <div className="sg-info-item"><span><Cloud size={15} style={{ verticalAlign: -3, marginRight: 6 }} />Service</span><span className={apiOnline ? 'sg-text-positive' : 'sg-text-negative'}>{apiOnline ? 'Online' : 'Offline'}</span></div>
            <div className="sg-info-item"><span><Database size={15} style={{ verticalAlign: -3, marginRight: 6 }} />Storage</span><span className={error ? 'sg-text-negative' : 'sg-text-positive'}>{summary.database_status || (error ? 'Check connection' : 'Connected')}</span></div>
            <div className="sg-info-item"><span><Brain size={15} style={{ verticalAlign: -3, marginRight: 6 }} />AI Review</span><span>Ready</span></div>
            <div className="sg-info-item"><span><Activity size={15} style={{ verticalAlign: -3, marginRight: 6 }} />Today</span><span>{stats.today} checks</span></div>
          </div>
        </Card>
      </section>

      <SectionHeading eyebrow="Research section" title="Review Records" description="Recent predictions and flagged content are shown here for academic review and moderation follow-up." />
      <section className="sg-grid-split">
        <Card
          title="Recent Prediction History"
          action={<RecentHistoryAction lastUpdated={lastUpdated} loading={loading} onRefresh={() => loadDashboard()} />}
        >
          <div className="sg-table-wrap">
            <table className="sg-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Text</th>
                  <th style={{ textAlign: 'center' }}>Label</th>
                  <th style={{ textAlign: 'right' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentPredictions.map((item) => (
                  <PredictionRow key={item.id} item={item} />
                ))}
                {!recentPredictions.length && (
                  <tr><td colSpan="4" style={{ padding: 22, textAlign: 'center', color: 'var(--sg-text-muted)' }}>No prediction history yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="High Risk Queue" action={<Link to="/history" className="sg-button sg-button-ghost">Review <ChevronRight size={14} /></Link>}>
          <div id="review-queue" />
          <div className="sg-record-list">
            {riskyPredictions.map((item) => (
              <div key={item.id} className="sg-record-row risk">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <strong style={{ color: 'var(--sg-red)' }}>{formatPredictionLabel(item.prediction)}</strong>
                    <span style={{ color: 'var(--sg-text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'capitalize' }}>{item.input_type || 'text'}</span>
                  </div>
                  <p className="sg-clamp-2" style={{ margin: '0 0 6px', color: 'var(--sg-text)', fontSize: 13, lineHeight: 1.45 }}>{rowText(item)}</p>
                  <small style={{ color: 'var(--sg-text-muted)' }}>{formatDateTime(item.created_at)}</small>
                </div>
              </div>
            ))}
            {!riskyPredictions.length && <div className="sg-state"><p>No offensive records in the queue</p></div>}
          </div>
        </Card>
      </section>
    </main>
  );
};

const OverviewCard = ({ icon, tone, title, text, detail }) => (
  <article className={`sg-card sg-card-body`} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
    <IconChip icon={icon} className={tone} size={22} />
    <div style={{ minWidth: 0 }}>
      <span style={{ display: 'block', marginBottom: 4, color: 'var(--sg-text)', fontSize: 13.5, fontWeight: 750 }}>{title}</span>
      <p style={{ margin: '0 0 8px', color: 'var(--sg-text-muted)', fontSize: 12.5, lineHeight: 1.55 }}>{text}</p>
      <strong style={{ color: 'var(--sg-primary)', fontSize: 12.5 }}>{detail}</strong>
    </div>
  </article>
);

const RecentHistoryAction = ({ lastUpdated, loading, onRefresh }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
    <span style={{ color: 'var(--sg-text-muted)', fontSize: 11.5, fontWeight: 700 }}>
      {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Updating...'}
    </span>
    <button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh recent prediction history" className="sg-icon-button" style={{ width: 32, height: 32 }}>
      <RefreshCw size={14} className={loading ? 'sg-spin' : ''} />
    </button>
    <Link to="/history" className="sg-button sg-button-ghost" style={{ minHeight: 32, padding: '0 10px' }}>View All <ChevronRight size={14} /></Link>
  </div>
);

const PredictionRow = ({ item }) => {
  const offensive = isOffensivePrediction(item.prediction);
  const unclassified = isUnclassifiedPrediction(item.prediction);
  const badgeClass = unclassified ? 'sg-badge-warning' : offensive ? 'sg-badge-offensive' : 'sg-badge-safe';

  return (
    <tr>
      <td>
        <span className="sg-type-cell">
          {item.input_type === 'image' ? <ImageIcon size={15} /> : <Type size={15} />}
          {item.input_type || 'text'}
        </span>
      </td>
      <td style={{ maxWidth: 260 }}>
        <span className="sg-content-preview">{rowText(item)}</span>
      </td>
      <td style={{ textAlign: 'center' }}>
        <span className={`sg-badge ${badgeClass}`}>{formatPredictionLabel(item.prediction)}</span>
      </td>
      <td style={{ textAlign: 'right', color: 'var(--sg-text-muted)', fontSize: 12 }}>{formatDateTime(item.created_at)}</td>
    </tr>
  );
};

const ModelRankingTable = ({ results }) => (
  <div className="sg-table-wrap">
    <table className="sg-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Type</th>
          <th>Accuracy</th>
          <th>Precision</th>
          <th>Recall</th>
          <th>F1-score</th>
        </tr>
      </thead>
      <tbody>
        {results.map((item, index) => (
          <tr key={item.model}>
            <td style={{ color: 'var(--sg-text)', fontWeight: 700 }}>#{index + 1} {item.model}</td>
            <td>{item.type}</td>
            <td>{percent(item.accuracy)}</td>
            <td>{percent(item.precision)}</td>
            <td>{percent(item.recall)}</td>
            <td style={{ color: 'var(--sg-teal)', fontWeight: 750 }}>{percent(item.f1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const toCsvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export default Dashboard;
