import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileImage,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Scan,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { predictImage } from '../services/api';

const Analyze = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const imageMeta = useMemo(() => {
    if (!file) return null;
    return {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type || 'image',
    };
  }, [file]);

  const textStats = useMemo(() => {
    const value = result?.text || '';
    const trimmed = value.trim();
    return {
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      characters: value.length,
    };
  }, [result]);

  const chooseFile = (selected) => {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setStatus('idle');
    setResult(null);
    setError('');
    setCopyStatus('idle');
  };

  const handleFileChange = (event) => {
    chooseFile(event.target.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#6366f1';
    event.currentTarget.style.background = 'rgba(99, 102, 241, 0.07)';
  };

  const handleDragLeave = (event) => {
    event.currentTarget.style.borderColor = 'var(--line)';
    event.currentTarget.style.background = 'var(--bg)';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.currentTarget.style.borderColor = 'var(--line)';
    event.currentTarget.style.background = 'var(--bg)';
    chooseFile(event.dataTransfer.files[0]);
  };

  const normalizePrediction = (value) => {
    const lower = String(value || '').toLowerCase();
    if (lower.includes('offensive') && !lower.includes('non')) return 'OFFENSIVE';
    if (lower.includes('non')) return 'NON-OFFENSIVE';
    return String(value || 'UNKNOWN').toUpperCase();
  };

  const startAnalysis = async () => {
    if (!file) {
      setError('Please upload an image before running analysis.');
      return;
    }

    setStatus('analyzing');
    setError('');
    setResult(null);
    setCopyStatus('idle');

    try {
      const data = await predictImage(file);
      const prediction = normalizePrediction(data.prediction);
      const predictionValue = String(data.prediction || '').toLowerCase();
      const noText = predictionValue === 'no_text_detected';
      const tooMuchText = predictionValue === 'too_much_text_detected';
      const noSomaliText = predictionValue === 'no_somali_text_detected';
      const needsReview = predictionValue === 'needs_review';
      const neutral = noText || noSomaliText || tooMuchText || needsReview;
      const isOffensive = prediction === 'OFFENSIVE';
      setResult({
        text: data.extracted_text || '',
        cleanedText: data.cleaned_text || '',
        prediction: noText ? 'NO TEXT DETECTED' : tooMuchText ? 'TOO MUCH TEXT DETECTED' : noSomaliText || needsReview ? 'TEXT NEEDS REVIEW' : prediction,
        noText,
        tooMuchText,
        noSomaliText,
        needsReview,
        neutral,
        confidence: Math.round(Number(data.confidence || 0) * 100),
        model: data.model_name || '',
        historyId: data.history_id,
        imageId: data.image_id,
        classificationId: data.classification_result_id,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        color: neutral ? '#64748b' : isOffensive ? '#ef4444' : '#10b981',
        soft: neutral ? 'rgba(100, 116, 139, 0.08)' : isOffensive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
        border: neutral ? 'rgba(100, 116, 139, 0.2)' : isOffensive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      });
      setStatus('complete');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setResult(null);
    setError('');
    setCopyStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const copyText = async () => {
    const value = result?.text || '';
    if (!value) {
      setCopyStatus('empty');
      setTimeout(() => setCopyStatus('idle'), 1800);
      return;
    }

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
    if (!result) return;
    const lines = [
      'SomaliGuard AI Image Prediction Report',
      `Prediction: ${result.prediction}`,
      `Confidence: ${result.confidence}%`,
      `Saved: ${result.historyId ? 'Yes' : 'No'}`,
      `Processed At: ${result.date}`,
      '',
      'Extracted Text:',
      result.text || 'No text detected',
      '',
      'Cleaned Text:',
      result.cleanedText || 'No cleaned text',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `somaliguard-image-report-${result.historyId || Date.now()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page" style={{ padding: '32px 20px', maxWidth: '1500px', margin: '0 auto' }}>
      <section className="dashboard-hero" style={{ minHeight: '170px', marginBottom: '22px' }}>
        <div>
          <span className="eyebrow"><Sparkles size={15} /> Image Safety Check</span>
          <h1>Analyze Somali Images</h1>
          <p>Upload an image, read Somali text from it, and review the content result.</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="dash-action">
            <UploadCloud size={17} /> Browse Image
          </button>
          <button type="button" onClick={reset} className="dash-refresh" aria-label="Clear image">
            <X size={18} />
          </button>
        </div>
      </section>

      <section className="responsive-grid analyzer-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 0.95fr) minmax(430px, 1.45fr)', gap: '22px', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: '22px' }}>
          <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UploadCloud size={20} /> Upload Image
                </h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>JPG, PNG, JPEG, or WEBP up to 10MB</p>
              </div>
              <span style={{ color: file ? '#10b981' : 'var(--muted)', fontWeight: 800, fontSize: '13px' }}>{file ? 'Ready' : 'Empty'}</span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                minHeight: '250px',
                border: '2px dashed var(--line)',
                borderRadius: '14px',
                background: 'var(--bg)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                padding: '26px',
                textAlign: 'center',
                transition: 'all 180ms ease',
              }}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              <div>
                <UploadCloud size={46} color="#6366f1" style={{ marginBottom: '16px' }} />
                <h4 style={{ margin: '0 0 8px', fontSize: '17px' }}>Drop an image here</h4>
                <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: '14px' }}>or choose one from your device</p>
                <button type="button" className="btn primary" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }} style={{ gap: '8px' }}>
                  <FileImage size={17} /> Browse Files
                </button>
              </div>
            </div>

            {imageMeta && (
              <div className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <MetaCard label="File" value={imageMeta.name} />
                <MetaCard label="Size" value={imageMeta.size} />
              </div>
            )}

            {error && (
              <div className="alert-error" style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                <AlertCircle size={16} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <button type="button" onClick={startAnalysis} disabled={!file || status === 'analyzing'} className="btn primary" style={{ width: '100%', marginTop: '16px', gap: '8px', opacity: !file || status === 'analyzing' ? 0.72 : 1 }}>
              {status === 'analyzing' ? <RefreshCw size={17} className="spin" /> : <Scan size={17} />}
              {status === 'analyzing' ? 'Processing Image...' : 'Run Image Analysis'}
            </button>
          </section>

          <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--line)' }}>
            <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ImageIcon size={20} /> Image Preview
            </h3>
            <div style={{ minHeight: '310px', border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--bg)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              {preview ? (
                <img src={preview} alt="Upload preview" style={{ width: '100%', maxHeight: '430px', objectFit: 'contain', display: 'block' }} />
              ) : (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px' }}>
                  <ImageIcon size={58} style={{ marginBottom: '14px', color: '#6366f1' }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>No image selected</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--line)', minHeight: '720px' }}>
          <h3 style={{ margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Scan size={20} /> Image Analysis Result
          </h3>

          {status === 'analyzing' && (
            <div style={{ minHeight: '560px', display: 'grid', placeItems: 'center', color: 'var(--muted)', textAlign: 'center' }}>
              <div>
                <RefreshCw className="spin" size={46} style={{ marginBottom: '16px', color: '#6366f1' }} />
                <h3 style={{ margin: '0 0 8px' }}>Reading image text...</h3>
                <p style={{ margin: 0 }}>SomaliGuard AI is reading the image and preparing the result.</p>
              </div>
            </div>
          )}

          {status !== 'analyzing' && !result && (
            <div style={{ minHeight: '560px', display: 'grid', placeItems: 'center', color: 'var(--muted)', textAlign: 'center' }}>
              <div>
                <Scan size={64} style={{ marginBottom: '16px', color: '#6366f1' }} />
                <h3 style={{ margin: '0 0 8px' }}>Result will appear here</h3>
                <p style={{ margin: 0, maxWidth: '430px' }}>Upload an image and run analysis to see extracted text, confidence, and saved result details.</p>
              </div>
            </div>
          )}

          {status === 'complete' && result && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ background: result.soft, border: `1px solid ${result.border}`, borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '18px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: result.color, color: '#fff', display: 'grid', placeItems: 'center' }}>
                      {result.neutral ? <Scan size={31} /> : result.prediction === 'OFFENSIVE' ? <ShieldAlert size={31} /> : <CheckCircle2 size={31} />}
                    </div>
                    <div>
                      <h2 style={{ margin: '0 0 4px', color: result.color, fontSize: '26px' }}>{result.prediction}</h2>
                      <p style={{ margin: 0, color: 'var(--text)', fontWeight: 600 }}>
                        {result.noText
                          ? 'No readable text was found in this image.'
                          : result.tooMuchText
                            ? 'The image contains a large block of text, so it was not classified.'
                          : result.noSomaliText
                            ? 'Text was found, but this result needs review before classification.'
                          : result.needsReview
                            ? 'The image text needs review because the result is uncertain.'
                            : result.prediction === 'OFFENSIVE'
                              ? 'The image text is classified as offensive.'
                              : 'The image text is classified as non-offensive.'}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, color: result.color, fontSize: '30px' }}>{result.confidence}%</h2>
                    <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 800 }}>Confidence</span>
                  </div>
                </div>
                <div style={{ height: '12px', borderRadius: '999px', overflow: 'hidden', background: 'var(--card)' }}>
                  <div style={{ width: `${result.confidence}%`, height: '100%', background: result.color, borderRadius: '999px' }} />
                </div>
              </div>

              {result.neutral && (
                <div style={{ border: '1px solid rgba(100, 116, 139, 0.2)', background: 'rgba(100, 116, 139, 0.08)', color: 'var(--text)', borderRadius: '12px', padding: '16px', lineHeight: 1.6 }}>
                  <strong>Try another image:</strong> {result.noSomaliText
                    ? 'crop closer to the exact text area, or use Analyze Text for typed Somali text.'
                    : result.tooMuchText
                      ? 'crop the image to only the sentence you want to classify, or paste the text into Analyze Text.'
                    : 'use a clearer screenshot, crop closer to the text area, or upload a higher-resolution image.'}
                </div>
              )}

              <div className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <MetaCard label="Words Found" value={textStats.words} />
                <MetaCard label="Characters" value={textStats.characters} />
              </div>

              <div className="responsive-grid two-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <TextBox title="Extracted Text" icon={<FileText size={17} />} value={result.text || 'No readable text found'} />
                <TextBox title="Cleaned Text" icon={<Scan size={17} />} value={result.cleanedText || 'No cleaned text available'} />
              </div>

              <div style={{ border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
                <InfoRow icon={<ShieldAlert size={16} />} label="Label" value={result.prediction} color={result.color} />
                <InfoRow icon={<CheckCircle2 size={16} />} label="Confidence Score" value={`${result.confidence}%`} />
                <InfoRow icon={<Sparkles size={16} />} label="Saved" value={result.historyId ? 'Yes' : 'No'} />
                <InfoRow icon={<Clock size={16} />} label="Processed At" value={result.date} />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" onClick={copyText} className="btn light" style={{ flex: 1, minWidth: '150px', gap: '8px', color: copyStatus === 'copied' ? '#10b981' : copyStatus === 'failed' || copyStatus === 'empty' ? '#ef4444' : undefined }}>
                  {copyStatus === 'copied' ? <Check size={17} /> : <Copy size={17} />}
                  {copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Copy Failed' : copyStatus === 'empty' ? 'No Text' : 'Copy Text'}
                </button>
                <button type="button" onClick={downloadReport} className="btn light" style={{ flex: 1, minWidth: '170px', gap: '8px' }}>
                  <Download size={17} /> Download Report
                </button>
                <button type="button" onClick={() => navigate('/history')} className="btn light" style={{ flex: 1, minWidth: '150px', gap: '8px' }}>
                  <Clock size={17} /> View History
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

const MetaCard = ({ label, value }) => (
  <div style={{ border: '1px solid var(--line)', background: 'var(--bg)', borderRadius: '10px', padding: '12px', minWidth: 0 }}>
    <div style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>{label}</div>
    <div style={{ color: 'var(--text)', fontSize: '15px', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
  </div>
);

const TextBox = ({ icon, title, value }) => (
  <div style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '16px', background: 'var(--bg)', minHeight: '150px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>
      {icon}
      <span>{title}</span>
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
    <span style={{ color: color || 'var(--text)', fontWeight: 900, textAlign: 'right' }}>{value}</span>
  </div>
);

export default Analyze;
