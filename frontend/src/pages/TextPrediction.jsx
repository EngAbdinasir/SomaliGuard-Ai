import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
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
import { predictText, preprocessText } from '../services/api';

const sampleText = 'Mahadsanid walaal, qoraalkaan waa tijaabo lagu hubinayo nidaamka.';

const TextPrediction = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle');
  const [step, setStep] = useState(1);
  const [preprocessed, setPreprocessed] = useState(null);

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
    return {
      label,
      offensive,
      needsReview,
      color: needsReview ? '#64748b' : offensive ? '#ef4444' : '#10b981',
      soft: needsReview ? 'rgba(100, 116, 139, 0.08)' : offensive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
      border: needsReview ? 'rgba(100, 116, 139, 0.2)' : offensive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
    };
  }, [result]);

  const goToPreprocessing = async () => {
    setError('');
    setResult(null);
    setPreprocessed(null);
    setCopyStatus('idle');

    if (!text.trim()) {
      setError('Please enter Somali text before running analysis.');
      return;
    }

    setLoading(true);
    setLoadingPhase('preprocessing');
    try {
      const data = await preprocessText(text);
      setPreprocessed(data);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (step === 1) {
      await goToPreprocessing();
      return;
    }

    setError('');
    setResult(null);
    setCopyStatus('idle');

    if (!text.trim()) {
      setError('Please enter Somali text before running analysis.');
      setStep(1);
      return;
    }

    setLoading(true);
    setLoadingPhase('prediction');
    try {
      const data = await predictText(text);
      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  const clearText = () => {
    setText('');
    setResult(null);
    setError('');
    setCopyStatus('idle');
    setStep(1);
    setPreprocessed(null);
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
          <p>Text Input → Next → Preprocessing → Next → Prediction.</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" onClick={() => { setText(sampleText); setStep(1); setResult(null); setPreprocessed(null); setError(''); }} className="dash-action">
            <Clipboard size={17} /> Use Sample
          </button>
          <button type="button" onClick={clearText} className="dash-refresh" aria-label="Clear text">
            <X size={18} />
          </button>
        </div>
      </section>

      <StepProgress
        current={step}
        steps={[
          { title: 'Text Input', text: 'Type or paste Somali text.' },
          { title: 'Preprocessing', text: 'Clean and prepare the text.' },
          { title: 'Prediction', text: 'Model classifies the text.' },
        ]}
      />

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
              setResult(null);
              setPreprocessed(null);
              setStep(1);
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
            {step === 1 && (
              <button type="button" onClick={goToPreprocessing} disabled={loading} className="btn primary" style={{ flex: 1, minWidth: '180px', gap: '8px' }}>
                {loading && loadingPhase === 'preprocessing' ? <RefreshCw size={17} className="spin" /> : null}
                {loading && loadingPhase === 'preprocessing' ? 'Preprocessing...' : 'Next: Preprocess Text'} <ArrowRight size={17} />
              </button>
            )}
            {step === 2 && (
              <>
                <button type="button" onClick={() => setStep(1)} disabled={loading} className="btn light" style={{ gap: '8px' }}>
                  <ArrowLeft size={17} /> Back
                </button>
                <button type="submit" disabled={loading} className="btn primary" style={{ flex: 1, minWidth: '200px', gap: '8px', opacity: loading ? 0.75 : 1 }}>
                  {loading ? <RefreshCw size={17} className="spin" /> : <Brain size={17} />}
                  {loading ? 'Running Model...' : 'Next: Run Prediction'}
                </button>
              </>
            )}
            {step === 3 && (
              <button type="button" onClick={() => { setResult(null); setStep(1); }} className="btn primary" style={{ flex: 1, minWidth: '180px', gap: '8px' }}>
                Analyze Another Text <Send size={17} />
              </button>
            )}
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
                <h3 style={{ margin: '0 0 8px' }}>{loadingPhase === 'preprocessing' ? 'Step 2: Preprocessing text...' : 'Step 3: Running the model...'}</h3>
                <p style={{ margin: 0 }}>{loadingPhase === 'preprocessing' ? 'SomaliGuard AI is cleaning and preparing the entered Somali text.' : 'The trained model is classifying the prepared text as offensive or non-offensive.'}</p>
              </div>
            </div>
          )}

          {!loading && step === 1 && !result && (
            <div style={{ minHeight: '430px', display: 'grid', placeItems: 'center', color: 'var(--muted)', textAlign: 'center' }}>
              <div>
                <FileText size={62} style={{ marginBottom: '16px', color: '#6366f1' }} />
                <h3 style={{ margin: '0 0 8px' }}>Step 1: Enter Somali text</h3>
                <p style={{ margin: 0, maxWidth: '420px' }}>Write the sentence first, then click Next so the system can preprocess it.</p>
              </div>
            </div>
          )}

          {!loading && step === 2 && !result && preprocessed && (
            <div style={{ display: 'grid', gap: '18px' }}>
              <ProcessNotice
                icon={<ScanText size={24} />}
                title="Step 2: Preprocessing completed"
                text="The entered text has been cleaned and prepared. Click Next to send the prepared text to the trained model."
              />
              <div className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <DetailBox icon={<FileText size={17} />} label="Original Text" value={preprocessed.original_text || text.trim()} />
                <DetailBox
                  icon={<ScanText size={17} />}
                  label="Preprocessed Text"
                  value={preprocessed.cleaned_text || 'No cleaned text available'}
                />
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                <InfoRow icon={<FileText size={16} />} label="Original Words" value={preprocessed.original_stats?.words ?? stats.words} />
                <InfoRow icon={<Type size={16} />} label="Cleaned Words" value={preprocessed.cleaned_stats?.words ?? 0} />
                <InfoRow icon={<Brain size={16} />} label="Next Step" value="Prediction by trained model" />
              </div>
            </div>
          )}

          {!loading && step === 3 && result && normalizedResult && (
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
                </div>
              </div>

              <div className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <DetailBox icon={<FileText size={17} />} label="Original Text" value={result.original_text || text || 'No original text'} />
                <DetailBox icon={<ScanText size={17} />} label="Cleaned Text" value={result.cleaned_text || 'No cleaned text'} />
              </div>

              <div style={{ border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                <InfoRow icon={<ShieldAlert size={16} />} label="Label" value={normalizedResult.label} color={normalizedResult.color} />
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

const StepProgress = ({ current, steps }) => (
  <section className="card" style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--line)', marginBottom: '22px' }}>
    <div className="responsive-grid three-cols" style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: '12px' }}>
      {steps.map((item, index) => {
        const number = index + 1;
        const active = current === number;
        const done = current > number;
        return (
          <div
            key={item.title}
            style={{
              border: `1px solid ${active ? '#6366f1' : done ? 'rgba(16, 185, 129, 0.35)' : 'var(--line)'}`,
              background: active ? 'rgba(99, 102, 241, 0.08)' : done ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? '#10b981' : active ? '#6366f1' : 'var(--card)', color: done || active ? '#fff' : 'var(--muted)', fontWeight: 900 }}>
              {done ? <Check size={18} /> : number}
            </span>
            <div>
              <strong style={{ display: 'block', color: active ? '#6366f1' : 'var(--text)' }}>{item.title}</strong>
              <small style={{ color: 'var(--muted)', fontWeight: 700 }}>{item.text}</small>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

const ProcessNotice = ({ icon, title, text }) => (
  <div style={{ border: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '14px', padding: '18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
    <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#6366f1', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
      {icon}
    </div>
    <div>
      <h3 style={{ margin: '0 0 6px' }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6, fontWeight: 600 }}>{text}</p>
    </div>
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
