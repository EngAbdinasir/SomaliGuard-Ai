import { useEffect, useMemo, useRef, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Copy, Download, Eye, FileImage, FileText, RefreshCw, Search, X } from 'lucide-react';
import { getHistory } from '../services/api';
import { Alert, Card, EmptyState, LoadingState, PageHeader } from '../components/ui/Primitives';

ChartJS.register(ArcElement, Tooltip, Legend);
const PAGE_SIZE = 10;

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [classification, setClassification] = useState('all');
  const [inputType, setInputType] = useState('all');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [reportType, setReportType] = useState('all');
  const [reportMessage, setReportMessage] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHistory();
      setHistory(data.history || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getHistory()
      .then((data) => { if (active) setHistory(data.history || []); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => ({
    total: history.length,
    offensive: history.filter((row) => isOffensive(row.prediction)).length,
    safe: history.filter((row) => isSafe(row.prediction)).length,
    text: history.filter((row) => row.input_type === 'text').length,
    image: history.filter((row) => row.input_type === 'image').length,
  }), [history]);

  const filtered = useMemo(() => history.filter((row) => {
    const content = [row.original_text, row.extracted_text, row.cleaned_text, row.model_name].join(' ').toLowerCase();
    const matchesSearch = !search.trim() || content.includes(search.trim().toLowerCase());
    const matchesClass = classification === 'all'
      || (classification === 'offensive' && isOffensive(row.prediction))
      || (classification === 'safe' && isSafe(row.prediction));
    const matchesType = inputType === 'all' || row.input_type === inputType;
    const matchesDate = !date || toDateKey(row.created_at) === date;
    return matchesSearch && matchesClass && matchesType && matchesDate;
  }), [history, search, classification, inputType, date]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const downloadReport = () => {
    const rows = history.filter((row) => {
      if (reportType === 'text' || reportType === 'image') return row.input_type === reportType;
      if (reportType === 'offensive') return isOffensive(row.prediction);
      if (reportType === 'safe') return isSafe(row.prediction);
      return true;
    });
    if (!rows.length) {
      setReportMessage('No saved records match that report type.');
      return;
    }
    const values = [
      ['Record ID', 'Input Type', 'Prediction', 'Model Confidence', 'Original Text', 'Extracted Text', 'Cleaned Text', 'Model', 'Created At'],
      ...rows.map((row) => [row.id, row.input_type, label(row.prediction), confidence(row.confidence), row.original_text || '', row.extracted_text || '', row.cleaned_text || '', row.model_name || '', formatDate(row.created_at)]),
    ];
    const csv = values.map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `somaliguard-${reportType}-history-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setReportMessage(`${rows.length} record${rows.length === 1 ? '' : 's'} downloaded.`);
  };

  const chartData = {
    labels: ['Offensive', 'Non-offensive'],
    datasets: [{ data: [stats.offensive, stats.safe], backgroundColor: ['#dc2626', '#059669'], borderWidth: 0 }],
  };

  return (
    <main className="page sg-history-page">
      <PageHeader
        eyebrow="Research records"
        title="Prediction history"
        description="Search and review the text and image predictions saved to your account. Confidence values are the model scores stored with each prediction."
        actions={<button className="sg-button sg-button-outline" type="button" onClick={loadHistory} disabled={loading}><RefreshCw size={16} className={loading ? 'sg-spin' : ''} /> Refresh</button>}
      />

      {error && <Alert type="error">{error}</Alert>}

      <section className="sg-history-summary" aria-label="Prediction totals">
        <Summary title="Total predictions" value={stats.total} emphasis />
        <Summary title="Offensive" value={stats.offensive} tone="offensive" />
        <Summary title="Non-offensive" value={stats.safe} tone="safe" />
        <Summary title="Text / Image" value={`${stats.text} / ${stats.image}`} />
      </section>

      <div className="sg-history-insights">
        <Card title="Result distribution" description="Calculated from your saved classified records.">
          <div className="sg-history-chart">
            {stats.offensive + stats.safe > 0
              ? <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } }} />
              : <EmptyState title="No chart data" description="Run an analysis to create your first saved result." />}
          </div>
        </Card>
        <Card title="Download report" description="Export your own records as an editable CSV file.">
          <div className="sg-report-controls">
            <label htmlFor="report-type">Records to include</label>
            <select id="report-type" className="sg-input" value={reportType} onChange={(event) => { setReportType(event.target.value); setReportMessage(''); }}>
              <option value="all">All predictions</option>
              <option value="text">Text only</option>
              <option value="image">Image only</option>
              <option value="offensive">Offensive only</option>
              <option value="safe">Non-offensive only</option>
            </select>
            <button className="sg-button sg-button-primary" type="button" onClick={downloadReport} disabled={loading || !history.length}><Download size={17} /> Download CSV</button>
            {reportMessage && <p role="status">{reportMessage}</p>}
          </div>
        </Card>
      </div>

      <Card title="All predictions" description={`${filtered.length} matching record${filtered.length === 1 ? '' : 's'}`}>
        <div className="sg-table-toolbar">
          <label className="sg-search-field"><Search size={17} /><span className="sr-only">Search history</span><input className="sg-input" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search prediction content" /></label>
          <select className="sg-input" aria-label="Filter by classification" value={classification} onChange={(event) => { setClassification(event.target.value); setPage(1); }}><option value="all">All results</option><option value="offensive">Offensive</option><option value="safe">Non-offensive</option></select>
          <select className="sg-input" aria-label="Filter by input type" value={inputType} onChange={(event) => { setInputType(event.target.value); setPage(1); }}><option value="all">All input types</option><option value="text">Text</option><option value="image">Image</option></select>
          <input className="sg-input" type="date" aria-label="Filter by date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} />
        </div>

        {loading ? <LoadingState message="Loading prediction history…" /> : !visibleRows.length ? (
          <EmptyState title="No predictions found" description="Adjust the filters or run a new text or image analysis." />
        ) : (
          <div className="sg-table-wrap">
            <table className="sg-table">
              <thead><tr><th>Date</th><th>Input type</th><th>Content preview</th><th>Classification</th><th>Confidence</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{visibleRows.map((row) => <HistoryRow key={row.id} row={row} onView={() => setSelected(row)} />)}</tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > PAGE_SIZE && (
          <nav className="sg-pagination" aria-label="History pagination">
            <span>Page {page} of {totalPages}</span>
            <div><button className="sg-button sg-button-outline" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="sg-button sg-button-outline" type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
          </nav>
        )}
      </Card>

      {selected && <PredictionDialog row={selected} onClose={() => setSelected(null)} />}
    </main>
  );
};

const Summary = ({ title, value, tone = '', emphasis = false }) => <article className={`sg-summary ${tone} ${emphasis ? 'emphasis' : ''}`}><span>{title}</span><strong>{value}</strong></article>;

const HistoryRow = ({ row, onView }) => {
  const text = row.extracted_text || row.original_text || row.cleaned_text || 'No readable text';
  return <tr><td data-label="Date">{formatDate(row.created_at)}</td><td data-label="Input type"><span className="sg-type-cell">{row.input_type === 'image' ? <FileImage size={16} /> : <FileText size={16} />}{row.input_type || 'text'}</span></td><td data-label="Content"><span className="sg-content-preview" title={text}>{text}</span></td><td data-label="Classification"><ResultBadge prediction={row.prediction} /></td><td data-label="Confidence"><strong>{confidence(row.confidence)}</strong></td><td><button className="sg-button sg-button-ghost sg-icon-action" type="button" onClick={onView} aria-label={`View prediction ${row.id}`}><Eye size={17} /> View</button></td></tr>;
};

const PredictionDialog = ({ row, onClose }) => {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const focusable = () => [...dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
    focusable()[0]?.focus();
    const handleKeyboard = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => { document.removeEventListener('keydown', handleKeyboard); previousFocus?.focus(); };
  }, [onClose]);
  const copyText = () => navigator.clipboard?.writeText(row.extracted_text || row.original_text || row.cleaned_text || '');
  return <div className="sg-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="sg-modal" role="dialog" aria-modal="true" aria-labelledby="prediction-dialog-title"><header><div><span className="sg-eyebrow">Prediction #{row.id}</span><h2 id="prediction-dialog-title">Prediction details</h2></div><button className="sg-icon-button" type="button" onClick={onClose} aria-label="Close prediction details"><X size={18} /></button></header><div className="sg-modal-body"><dl className="sg-detail-grid"><div><dt>Input type</dt><dd>{row.input_type || 'text'}</dd></div><div><dt>Classification</dt><dd><ResultBadge prediction={row.prediction} /></dd></div><div><dt>Model confidence</dt><dd>{confidence(row.confidence)}</dd></div><div><dt>Date and time</dt><dd>{formatDate(row.created_at)}</dd></div><div><dt>Model</dt><dd>{row.model_name || 'Not provided'}</dd></div><div><dt>Saved record</dt><dd>Yes</dd></div></dl><DetailText title="Original text" value={row.original_text} /><DetailText title="Extracted OCR text" value={row.extracted_text} /><DetailText title="Preprocessed text" value={row.cleaned_text} /></div><footer><button className="sg-button sg-button-outline" type="button" onClick={copyText}><Copy size={16} /> Copy available text</button><button className="sg-button sg-button-primary" type="button" onClick={onClose}>Close</button></footer></section></div>;
};

const DetailText = ({ title, value }) => value ? <section className="sg-detail-text"><h3>{title}</h3><p>{value}</p></section> : null;
const ResultBadge = ({ prediction }) => <span className={`sg-badge ${isOffensive(prediction) ? 'sg-badge-offensive' : isSafe(prediction) ? 'sg-badge-safe' : 'sg-badge-warning'}`}>{label(prediction)}</span>;
const isOffensive = (value) => { const text = String(value || '').toLowerCase(); return text.includes('offensive') && !text.includes('non'); };
const isSafe = (value) => String(value || '').toLowerCase().includes('non');
const label = (value) => isOffensive(value) ? 'Offensive' : isSafe(value) ? 'Non-offensive' : 'Unclassified';
const confidence = (value) => { const number = Number(value); return value !== null && value !== '' && Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : 'Not available'; };
const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not available';
const toDateKey = (value) => { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const csvCell = (value) => { let text = String(value ?? ''); if (/^[=+\-@]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };

export default History;
