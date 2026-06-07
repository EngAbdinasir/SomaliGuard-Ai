import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clipboard,
  Clock,
  Copy,
  Download,
  FileText,
  RefreshCw,
  ScanText,
  Send,
  ShieldAlert,
  Sparkles,
  Type,
  X,
} from 'lucide-react';
import { predictText } from '../services/api';

const sampleText = 'Mahadsanid walaal, qoraalkaan waa tijaabo lagu hubinayo nidaamka.';

const TextPrediction = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState('idle');

  const stats = useMemo(() => {
    const trimmed = text.trim();
    return {
      characters: text.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      lines: text ? text.split(/\n/).length : 0,
    };
  }, [text]);

  const normalizedResult = useMemo(() => {
    if (!result) return null;
    const lower = String(result.prediction || '').toLowerCase();
    const needsReview = ['unknown', 'needs_review'].includes(lower);
    const offensive = lower.includes('offensive') && !lower.includes('non');
    const label = needsReview ? 'NEEDS REVIEW' : offensive ? 'OFFENSIVE' : lower.includes('non') ? 'NON-OFFENSIVE' : String(result.prediction || 'UNKNOWN').toUpperCase();
    const confidence = Math.round(Number(result.confidence || 0) * 100);
    return {
      label,
      offensive,
      needsReview,
      confidence,
      color: needsReview ? '#64748b' : offensive ? '#ef4444' : '#10b981',
      soft: needsReview ? 'rgba(100, 116, 139, 0.08)' : offensive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
      border: needsReview ? 'rgba(100, 116, 139, 0.2)' : offensive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
    };
  }, [result]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setCopyStatus('idle');

    if (!text.trim()) {
      setError('Please enter Somali text before running analysis.');
      return;
    }

    setLoading(true);
    try {
      const data = await predictText(text);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearText = () => {
    setText('');
    setResult(null);
    setError('');
    setCopyStatus('idle');
  };

  const copyWithFallback = (value) => {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const copyResult = async () => {
    const value = result?.cleaned_text || result?.original_text || text;
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else if (!copyWithFallback(value)) {
        throw new Error('Copy failed.');
      }
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    setTimeout(() => setCopyStatus('idle'), 1800);
  };

  const downloadReport = () => {
    if (!result || !normalizedResult) return;
    const lines = [
      'SomaliGuard AI Text Prediction Report',
      `Prediction: ${normalizedResult.label}`,
      `Confidence: ${normalizedResult.confidence}%`,
      `Saved: ${result.history_id ? 'Yes' : 'No'}`,
      '',
      'Original Text:',
      result.original_text || text,
      '',
      'Cleaned Text:',
      result.cleaned_text || 'No cleaned text',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `somaliguard-text-report-${result.history_id || Date.now()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page" style={{ padding: '32px 20px', maxWidth: '1500px', margin: '0 auto' }}>
      <section className="dashboard-hero" style={{ minHeight: '170px', marginBottom: '22px' }}>
        <div>
          <span className="eyebrow"><Sparkles size={15} /> Text Safety Check</span>
          <h1>Analyze Somali Text</h1>
          <p>Paste or type Somali content and review the result, confidence score, and prepared text.</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" onClick={() => setText(sampleText)} className="dash-action">
            <Clipboard size={17} /> Use Sample
          </button>
          <button type="button" onClick={clearText} className="dash-refresh" aria-label="Clear text">
            <X size={18} />
          </button>
        </div>
      </section>

      <section className="responsive-grid analyzer-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 0.95fr) minmax(420px, 1.45fr)', gap: '22px', alignItems: 'start' }}>
        <form onSubmit={handleSubmit} className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--line)', display: 'grid', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Type size={20} /> Text Input
              </h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>Somali text review</p>
            </div>
            <span style={{ color: text.trim() ? '#10b981' : 'var(--muted)', fontWeight: 800, fontSize: '13px' }}>
              {text.trim() ? 'Ready' : 'Empty'}
            </span>
          </div>

          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError('');
            }}
            rows={13}
            placeholder="Geli qoraalka Soomaaliga ah..."
            style={{
              width: '100%',
              minHeight: '300px',
              resize: 'vertical',
              border: '1px solid var(--line)',
              background: 'var(--bg)',
              color: 'var(--text)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              lineHeight: 1.7,
              margin: 0,
            }}
          />

          <div className="responsive-grid three-cols compact-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <StatCard label="Words" value={stats.words} />
            <StatCard label="Characters" value={stats.characters} />
            <StatCard label="Lines" value={stats.lines} />
          </div>

          {error && (
            <div className="alert-error" style={{ padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
              <AlertCircle size={16} />
              <span style={{ fontWeight: 600 }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="submit" disabled={loading} className="btn primary" style={{ flex: 1, minWidth: '180px', gap: '8px', opacity: loading ? 0.75 : 1 }}>
              {loading ? <RefreshCw size={17} className="spin" /> : <Send size={17} />}
              {loading ? 'Analyzing...' : 'Analyze Text'}
            </button>
            <button type="button" onClick={clearText} className="btn light" style={{ gap: '8px' }}>
              <X size={17} /> Clear
            </button>
          </div>
        </form>

        <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--line)', minHeight: '560px' }}>
          <h3 style={{ margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ScanText size={20} /> Analysis Result
          </h3>

          {loading && (
            <div style={{ minHeight: '430px', display: 'grid', placeItems: 'center', color: 'var(--muted)', textAlign: 'center' }}>
              <div>
                <RefreshCw className="spin" size={44} style={{ marginBottom: '16px', color: '#6366f1' }} />
                <h3 style={{ margin: '0 0 8px' }}>Checking text...</h3>
                <p style={{ margin: 0 }}>SomaliGuard AI is preparing the result.</p>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div style={{ minHeight: '430px', display: 'grid', placeItems: 'center', color: 'var(--muted)', textAlign: 'center' }}>
              <div>
                <FileText size={62} style={{ marginBottom: '16px', color: '#6366f1' }} />
                <h3 style={{ margin: '0 0 8px' }}>Result will appear here</h3>
                <p style={{ margin: 0, maxWidth: '420px' }}>Enter text and run analysis to see the result, confidence score, and prepared text.</p>
              </div>
            </div>
          )}

          {!loading && result && normalizedResult && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ background: normalizedResult.soft, border: `1px solid ${normalizedResult.border}`, borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '18px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: normalizedResult.color, color: '#fff', display: 'grid', placeItems: 'center' }}>
                      {normalizedResult.needsReview ? <ScanText size={31} /> : normalizedResult.offensive ? <ShieldAlert size={31} /> : <CheckCircle2 size={31} />}
                    </div>
                    <div>
                      <h2 style={{ margin: '0 0 4px', color: normalizedResult.color, fontSize: '26px' }}>{normalizedResult.label}</h2>
                      <p style={{ margin: 0, color: 'var(--text)', fontWeight: 600 }}>
                        {normalizedResult.needsReview
                          ? 'This text needs review because the result is uncertain.'
                          : normalizedResult.offensive
                            ? 'This text is classified as offensive.'
                            : 'This text is classified as non-offensive.'}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, color: normalizedResult.color, fontSize: '30px' }}>{normalizedResult.confidence}%</h2>
                    <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 800 }}>Confidence</span>
                  </div>
                </div>
                <div style={{ height: '12px', borderRadius: '999px', overflow: 'hidden', background: 'var(--card)' }}>
                  <div style={{ width: `${normalizedResult.confidence}%`, height: '100%', background: normalizedResult.color, borderRadius: '999px' }} />
                </div>
              </div>

              <div className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <DetailBox icon={<FileText size={17} />} label="Original Text" value={result.original_text || text || 'No original text'} />
                <DetailBox icon={<ScanText size={17} />} label="Cleaned Text" value={result.cleaned_text || 'No cleaned text'} />
              </div>

              <div style={{ border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                <InfoRow icon={<ShieldAlert size={16} />} label="Label" value={normalizedResult.label} color={normalizedResult.color} />
                <InfoRow icon={<CheckCircle2 size={16} />} label="Confidence Score" value={`${normalizedResult.confidence}%`} />
                <InfoRow icon={<Sparkles size={16} />} label="Saved" value={result.history_id ? 'Yes' : 'No'} />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" onClick={copyResult} className="btn light" style={{ flex: 1, minWidth: '160px', gap: '8px', color: copyStatus === 'copied' ? '#10b981' : copyStatus === 'failed' ? '#ef4444' : undefined }}>
                  {copyStatus === 'copied' ? <Check size={17} /> : <Copy size={17} />}
                  {copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Copy Failed' : 'Copy Text'}
                </button>
                <button type="button" onClick={downloadReport} className="btn light" style={{ flex: 1, minWidth: '180px', gap: '8px' }}>
                  <Download size={17} /> Download Report
                </button>
              </div>
            </div>
          )}
        </section>
      </section>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </main>
  );
};

const StatCard = ({ label, value }) => (
  <div style={{ border: '1px solid var(--line)', background: 'var(--bg)', borderRadius: '10px', padding: '12px' }}>
    <div style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>{label}</div>
    <div style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 900 }}>{value}</div>
  </div>
);

const DetailBox = ({ icon, label, value }) => (
  <div style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '16px', background: 'var(--bg)', minHeight: '150px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>
      {icon}
      <span>{label}</span>
    </div>
    <p style={{ margin: 0, color: 'var(--text)', lineHeight: 1.65, fontWeight: 600, whiteSpace: 'pre-wrap' }}>{value}</p>
  </div>
);

const InfoRow = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '15px 18px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)', fontSize: '14px', fontWeight: 700 }}>
      {icon}
      <span>{label}</span>
    </div>
    <span style={{ color: color || 'var(--text)', fontWeight: 900 }}>{value}</span>
  </div>
);

export default TextPrediction;
