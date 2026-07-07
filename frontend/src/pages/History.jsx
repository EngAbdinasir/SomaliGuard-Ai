import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ArcElement,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileImage,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getHistory } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const History = () => {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHistory();
      setHistory(data.history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const stats = useMemo(() => {
    const offensive = history.filter((row) => isOffensive(row.prediction)).length;
    const safe = history.filter((row) => isSafe(row.prediction)).length;
    const image = history.filter((row) => row.input_type === 'image').length;
    const text = history.filter((row) => row.input_type === 'text').length;
    return {
      total: history.length,
      offensive,
      safe,
      image,
      text,
    };
  }, [history]);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((row) => {
      const prediction = String(row.prediction || '').toLowerCase();
      const haystack = [
        row.original_text,
        row.extracted_text,
        row.cleaned_text,
        row.input_type,
        row.created_at,
      ].join(' ').toLowerCase();

      const matchesFilter =
        filter === 'all' ||
        (filter === 'offensive' && isOffensive(prediction)) ||
        (filter === 'safe' && isSafe(prediction)) ||
        row.input_type === filter;
      const matchesSearch = !query || haystack.includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [history, filter, search]);

  const chartSummary = useMemo(() => buildChartSummary(filteredData), [filteredData]);

  const activityChartData = useMemo(() => ({
    labels: chartSummary.dailyLabels,
    datasets: [
      {
        label: 'Text',
        data: chartSummary.dailyText,
        backgroundColor: '#6366f1',
        borderRadius: 8,
        maxBarThickness: 34,
      },
      {
        label: 'Images',
        data: chartSummary.dailyImage,
        backgroundColor: '#0ea5e9',
        borderRadius: 8,
        maxBarThickness: 34,
      },
    ],
  }), [chartSummary]);

  const resultChartData = useMemo(() => ({
    labels: ['Offensive', 'Non-offensive', 'Needs Review'],
    datasets: [
      {
        data: [chartSummary.offensive, chartSummary.safe, chartSummary.unknown],
        backgroundColor: ['#ef4444', '#10b981', '#f59e0b'],
        borderColor: 'rgba(255,255,255,0.9)',
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  }), [chartSummary]);

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 8, color: '#64748b', font: { weight: 700 } },
      },
      tooltip: {
        callbacks: {
          title: (items) => `${items[0]?.label || ''}`,
          label: (item) => `${item.dataset.label}: ${item.raw} analyses`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: '#64748b', font: { weight: 700 } },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { precision: 0, color: '#64748b', font: { weight: 700 } },
        grid: { color: 'rgba(100, 116, 139, 0.12)' },
      },
    },
  }), []);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 8, color: '#64748b', font: { weight: 700 } },
      },
      tooltip: {
        callbacks: {
          label: (item) => `${item.label}: ${item.raw} records`,
        },
      },
    },
  }), []);

  return (
    <main className="page" style={{ padding: '32px 20px', maxWidth: '1500px', margin: '0 auto' }}>
      <section className="dashboard-hero" style={{ minHeight: '170px', marginBottom: '22px' }}>
        <div>
          <span className="eyebrow"><Sparkles size={15} /> Personal Records</span>
          <h1>Prediction History</h1>
          <p>Your saved text and image analysis records. Search, filter, and review previous predictions.</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={loadHistory} className="dash-action primary-action" type="button">
            <RefreshCw size={17} /> Refresh
          </button>
        </div>
      </section>

      <section className="responsive-grid history-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <Metric title="Total" value={stats.total} color="#3b82f6" />
        <Metric title="Text" value={stats.text} color="#6366f1" />
        <Metric title="Images" value={stats.image} color="#0ea5e9" />
        <Metric title="Offensive" value={stats.offensive} color="#ef4444" />
        <Metric title="Safe" value={stats.safe} color="#10b981" />
      </section>

      <section className="card history-filter-card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid var(--line)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <Search size={17} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search text, date, or type"
              style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', margin: 0 }}
            />
          </div>

          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--line)', padding: '4px', flexWrap: 'wrap' }}>
            <FilterButton label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterButton label="Text" active={filter === 'text'} onClick={() => setFilter('text')} />
            <FilterButton label="Image" active={filter === 'image'} onClick={() => setFilter('image')} />
            <FilterButton label="Offensive" active={filter === 'offensive'} onClick={() => setFilter('offensive')} />
            <FilterButton label="Safe" active={filter === 'safe'} onClick={() => setFilter('safe')} />
          </div>
        </div>
      </section>

      {!loading && !error && (
        <section className="history-charts-grid responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.45fr 0.9fr', gap: '18px', marginBottom: '20px' }}>
          <ChartPanel
            title="Analysis Activity"
            subtitle="Text and image checks during the last 7 days"
            footer={`${chartSummary.totalVisible} visible records`}
          >
            {chartSummary.totalVisible > 0 ? (
              <Bar data={activityChartData} options={barOptions} />
            ) : (
              <EmptyChart message="No activity to chart for this filter." />
            )}
          </ChartPanel>

          <ChartPanel
            title="Result Breakdown"
            subtitle="Offensive, non-offensive, and uncertain results"
            footer={`${chartSummary.reviewRate}% marked for review`}
          >
            {chartSummary.totalVisible > 0 ? (
              <>
                <Doughnut data={resultChartData} options={doughnutOptions} />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                  <div style={{ textAlign: 'center', marginTop: '-28px' }}>
                    <strong style={{ display: 'block', fontSize: '28px', color: 'var(--text)' }}>{chartSummary.totalVisible}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 900 }}>Records</span>
                  </div>
                </div>
              </>
            ) : (
              <EmptyChart message="No result data for this filter." />
            )}
          </ChartPanel>
        </section>
      )}

      {error && (
        <div className="alert-error" style={{ marginBottom: '18px', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
          <AlertCircle size={16} />
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <section className="card" style={{ minHeight: '360px', display: 'grid', placeItems: 'center', color: 'var(--muted)', textAlign: 'center' }}>
          <div>
            <RefreshCw className="spin" size={42} style={{ color: '#6366f1', marginBottom: '14px' }} />
            <h3 style={{ margin: '0 0 8px' }}>Loading history...</h3>
            <p style={{ margin: 0 }}>Fetching your saved predictions.</p>
          </div>
        </section>
      ) : filteredData.length === 0 ? (
        <section className="card" style={{ minHeight: '360px', display: 'grid', placeItems: 'center', color: 'var(--muted)', textAlign: 'center' }}>
          <div>
            <Clock size={54} style={{ color: '#6366f1', marginBottom: '14px' }} />
            <h3 style={{ margin: '0 0 8px' }}>No records found</h3>
            <p style={{ margin: 0 }}>Try a different filter or run a new analysis.</p>
          </div>
        </section>
      ) : (
        <section style={{ display: 'grid', gap: '14px' }}>
          {filteredData.map((row) => (
            <HistoryCard key={row.id} row={row} />
          ))}
        </section>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </main>
  );
};

const HistoryCard = ({ row }) => {
  const offensive = isOffensive(row.prediction);
  const color = offensive ? '#ef4444' : '#10b981';
  const displayText = row.extracted_text || row.original_text || row.cleaned_text || 'No text detected';

  return (
    <article className="card" style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--line)' }}>
      <div className="responsive-record-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 0.75fr) minmax(280px, 2fr) minmax(220px, 0.9fr)', gap: '18px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: row.input_type === 'image' ? 'rgba(14, 165, 233, 0.12)' : 'rgba(99, 102, 241, 0.12)', color: row.input_type === 'image' ? '#0ea5e9' : '#6366f1', display: 'grid', placeItems: 'center' }}>
            {row.input_type === 'image' ? <FileImage size={22} /> : <FileText size={22} />}
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', textTransform: 'capitalize' }}>{row.input_type} Analysis</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>{formatDate(row.created_at)}</p>
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 8px', color: 'var(--text)', lineHeight: 1.55, fontWeight: 600 }}>{displayText}</p>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>Saved analysis · {formatDate(row.created_at)}</p>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: offensive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', color, padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 900 }}>
              {offensive ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />}
              {formatPrediction(row.prediction)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

const Metric = ({ title, value, color }) => (
  <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--line)', borderLeft: `4px solid ${color}` }}>
    <p style={{ color: 'var(--muted)', margin: '0 0 6px', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}>{title}</p>
    <h2 style={{ margin: 0, fontSize: '30px', color }}>{value}</h2>
  </div>
);

const FilterButton = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{ padding: '8px 12px', border: 'none', background: active ? 'var(--card)' : 'transparent', color: active ? 'var(--text)' : 'var(--muted)', borderRadius: '8px', fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}
  >
    {label}
  </button>
);

const ChartPanel = ({ title, subtitle, footer, children }) => (
  <section className="card" style={{ padding: '22px', borderRadius: '16px', border: '1px solid var(--line)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: '0 0 5px', fontSize: '20px' }}>{title}</h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{subtitle}</p>
      </div>
      <span style={{ border: '1px solid var(--line)', color: 'var(--muted)', background: 'var(--bg)', borderRadius: '999px', padding: '7px 10px', fontSize: '12px', fontWeight: 900 }}>
        {footer}
      </span>
    </div>
    <div style={{ position: 'relative', height: '290px' }}>
      {children}
    </div>
  </section>
);

const EmptyChart = ({ message }) => (
  <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--line)', borderRadius: '14px', background: 'var(--bg)' }}>
    <div>
      <Clock size={38} style={{ color: '#6366f1', marginBottom: '10px' }} />
      <p style={{ margin: 0, fontWeight: 800 }}>{message}</p>
    </div>
  </div>
);

const isOffensive = (prediction) => {
  const lower = String(prediction || '').toLowerCase();
  return lower.includes('offensive') && !lower.includes('non');
};

const isSafe = (prediction) => String(prediction || '').toLowerCase().includes('non');

const formatPrediction = (prediction) => {
  if (isOffensive(prediction)) return 'OFFENSIVE';
  if (isSafe(prediction)) return 'NON-OFFENSIVE';
  return String(prediction || 'UNKNOWN').toUpperCase();
};

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

const buildChartSummary = (rows) => {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });
  const dayKeys = days.map((date) => toDateKey(date));
  const daily = dayKeys.reduce((acc, key) => {
    acc[key] = { text: 0, image: 0 };
    return acc;
  }, {});

  let offensive = 0;
  let safe = 0;
  let unknown = 0;

  rows.forEach((row) => {
    if (isOffensive(row.prediction)) {
      offensive += 1;
    } else if (isSafe(row.prediction)) {
      safe += 1;
    } else {
      unknown += 1;
    }

    const key = toDateKey(row.created_at);
    if (!daily[key]) return;
    if (row.input_type === 'image') {
      daily[key].image += 1;
    } else {
      daily[key].text += 1;
    }
  });

  const totalVisible = rows.length;

  return {
    dailyLabels: days.map((date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    dailyText: dayKeys.map((key) => daily[key].text),
    dailyImage: dayKeys.map((key) => daily[key].image),
    offensive,
    safe,
    unknown,
    totalVisible,
    reviewRate: totalVisible ? Math.round((unknown / totalVisible) * 100) : 0,
  };
};

const toDateKey = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default History;
