import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Download, FileImage, LoaderCircle, RotateCcw, ShieldAlert, UploadCloud, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { predictImage } from '../services/api';
import { Alert, Card, PageHeader } from '../components/ui/Primitives';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

const STEP_DEFS = [
  { key: 'upload', label: 'Upload image', description: 'Select or drop an image file' },
  { key: 'ocr', label: 'OCR extraction', description: 'Reading Somali text from the image' },
  { key: 'preprocessing', label: 'Preprocessing', description: 'Cleaning & normalizing extracted text' },
  { key: 'predicting', label: 'Model prediction', description: 'SomBERTa classifies the content' },
];

const diffWords = (before, after) => {
  const a = (before || '').split(/\s+/).filter(Boolean);
  const b = (after || '').split(/\s+/).filter(Boolean);
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const segments = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { segments.push({ type: 'same', text: a[i] }); i += 1; j += 1; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { segments.push({ type: 'removed', text: a[i] }); i += 1; }
    else { segments.push({ type: 'added', text: b[j] }); j += 1; }
  }
  while (i < n) { segments.push({ type: 'removed', text: a[i] }); i += 1; }
  while (j < m) { segments.push({ type: 'added', text: b[j] }); j += 1; }
  return segments;
};

const Analyze = () => {
  const fileInput = useRef(null);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [apiState, setApiState] = useState('idle'); // idle | loading | ready | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const prediction = useMemo(() => normalizeResult(result), [result]);
  const noText = result ? (!result.extracted_text?.trim() || ['no_text_detected', 'no_somali_text_detected'].includes(String(result.prediction || '').toLowerCase())) : false;

  const chooseFile = (selected) => {
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) { setError('Unsupported file type. Choose a JPG, JPEG, PNG, or WEBP image.'); return; }
    if (selected.size > MAX_SIZE) { setError('The image is larger than 10 MB. Choose a smaller file.'); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError('');
    setCopyStatus('idle');
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(''); setResult(null); setError(''); setCopyStatus('idle'); setApiState('idle'); setStep(1);
    if (fileInput.current) fileInput.current.value = '';
  };

  const runPrediction = async () => {
    setApiState('loading');
    setError('');
    try {
      const response = await predictImage(file);
      setResult(response);
      setApiState('ready');
    } catch (requestError) {
      setError(requestError.message);
      setApiState('error');
    }
  };

  const goToStep2 = () => {
    if (!file) { setError('Choose an image before starting analysis.'); return; }
    setResult(null); setCopyStatus('idle');
    setStep(2);
    runPrediction();
  };
  const goToStep3 = () => { if (apiState === 'ready') setStep(3); };
  const goToStep4 = () => { if (apiState === 'ready') setStep(4); };
  const backToStep = (target) => setStep(target);
  const jumpToStep = (target) => { if (target < step) setStep(target); };

  const copyText = async () => {
    if (!result?.extracted_text) { setCopyStatus('empty'); return; }
    try { await navigator.clipboard.writeText(result.extracted_text); setCopyStatus('copied'); }
    catch { setCopyStatus('failed'); }
    setTimeout(() => setCopyStatus('idle'), 1800);
  };

  const download = () => {
    if (!result || !prediction) return;
    const report = ['SomaliGuard AI Image Prediction Report', `File: ${file?.name || 'Image'}`, `Prediction: ${prediction.label}`, `Model Confidence: ${formatConfidence(result.confidence)}`, `Saved to History: ${result.history_id ? 'Yes' : 'No'}`, '', 'Extracted OCR Text:', result.extracted_text || 'No readable text detected', '', 'Preprocessed Text:', result.cleaned_text || 'Not available'].join('\n');
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `somaliguard-image-report-${result.history_id || Date.now()}.txt`; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="page sg-image-page">
      <PageHeader eyebrow="OCR image classification" title="Analyze an image" description="Move through each step at your own pace: upload an image, review the OCR extraction, check preprocessing, then reveal the model prediction." />

      <Card className="sg-steps-card" title="Analysis pipeline" description="Tap Next to move to the next step." style={{ marginBottom: 20 }}>
        <AnalysisSteps currentStep={step} onStepClick={jumpToStep} />
      </Card>

      {step === 1 && (
        <div className="sg-image-input-column">
          <Card title="Step 1 · Upload image" description="JPG, JPEG, PNG, or WEBP · maximum 10 MB">
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
            <div
              className={`sg-upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}
            >
              {preview ? <img src={preview} alt="Selected upload preview" /> : <span className="sg-upload-icon"><UploadCloud size={28} /></span>}
              <strong>{file ? file.name : 'Drop an image here'}</strong>
              <p>{file ? `${formatSize(file.size)} · Ready for analysis` : 'or browse your device to choose a file'}</p>
              <button className="sg-button sg-button-outline" type="button" onClick={() => fileInput.current?.click()}>{file ? <RotateCcw size={16} /> : <FileImage size={16} />}{file ? 'Replace image' : 'Browse files'}</button>
            </div>
            {file && <button className="sg-remove-file" type="button" onClick={reset}><X size={15} /> Remove selected image</button>}
            {error && <Alert type="error">{error}</Alert>}
            <div className="sg-form-actions"><button className="sg-button sg-button-primary" type="button" onClick={goToStep2} disabled={!file}>Next: Extract text <ArrowRight size={17} /></button></div>
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card title="Step 2 · OCR extraction" description="Text read from your image using EasyOCR.">
          <OcrPanel apiState={apiState} preview={preview} result={result} error={error} noText={noText} />
          <div className="sg-form-actions" style={{ marginTop: 18 }}>
            <button className="sg-button sg-button-outline" type="button" onClick={() => backToStep(1)}><ArrowLeft size={17} /> Back</button>
            {apiState === 'error' ? (
              <button className="sg-button sg-button-primary" type="button" onClick={runPrediction}>Try again</button>
            ) : (
              <button className="sg-button sg-button-primary" type="button" onClick={goToStep3} disabled={apiState !== 'ready'}>
                {apiState === 'loading' ? <span className="sg-button-spinner" /> : null}
                {apiState === 'loading' ? 'Reading image…' : <>Next: Preprocess <ArrowRight size={17} /></>}
              </button>
            )}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Step 3 · Preprocessing" description="This is exactly what changed before the model sees the extracted text.">
          <PreprocessingDiff original={result?.extracted_text || ''} cleaned={result?.cleaned_text} noText={noText} />
          <div className="sg-form-actions" style={{ marginTop: 18 }}>
            <button className="sg-button sg-button-outline" type="button" onClick={() => backToStep(2)}><ArrowLeft size={17} /> Back</button>
            <button className="sg-button sg-button-primary" type="button" onClick={goToStep4}>Next: View prediction <ArrowRight size={17} /></button>
          </div>
        </Card>
      )}

      {step === 4 && result && prediction && (
        <ImageResult
          result={result}
          prediction={prediction}
          preview={preview}
          noText={noText}
          copyStatus={copyStatus}
          onCopy={copyText}
          onDownload={download}
          onBack={() => backToStep(3)}
          onReset={reset}
        />
      )}
    </main>
  );
};

const AnalysisSteps = ({ currentStep, onStepClick }) => (
  <div className="sg-steps" role="list" aria-label="Analysis pipeline steps">
    {STEP_DEFS.map((step, index) => {
      const stepNumber = index + 1;
      const status = stepNumber < currentStep ? 'complete' : stepNumber === currentStep ? 'active' : 'pending';
      const clickable = status === 'complete';
      return (
        <div className="sg-steps-item" key={step.key}>
          <div
            className={`sg-step ${status} ${clickable ? 'clickable' : ''}`}
            role={clickable ? 'button' : 'listitem'}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onStepClick(stepNumber) : undefined}
            onKeyDown={clickable ? (event) => { if (event.key === 'Enter') onStepClick(stepNumber); } : undefined}
          >
            <span className="sg-step-badge">{status === 'complete' ? <Check size={18} /> : stepNumber}</span>
            <span className="sg-step-copy"><strong>{step.label}</strong><small>{step.description}</small></span>
          </div>
          {index < STEP_DEFS.length - 1 && <span className={`sg-step-connector ${stepNumber < currentStep ? 'filled' : ''}`} />}
        </div>
      );
    })}
  </div>
);

const OcrPanel = ({ apiState, preview, result, error, noText }) => (
  <div className="sg-diff-panel" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
    <div className="sg-diff-panel-header">
      <span>Extracted OCR text</span>
      {apiState === 'loading' && <span className="sg-diff-status"><LoaderCircle size={13} className="sg-spin" /> Reading image…</span>}
    </div>
    {preview && <img className="sg-result-image" src={preview} alt="Uploaded" style={{ marginBottom: 14 }} />}
    {apiState === 'loading' && <p className="sg-diff-original">Running OCR on your image…</p>}
    {apiState === 'error' && <Alert type="error">{error || 'Text extraction failed.'}</Alert>}
    {apiState === 'ready' && (noText
      ? <Alert type="error">No readable Somali text was detected. Try a clearer image or crop closer to the text.</Alert>
      : <p className="sg-diff-original" style={{ color: 'var(--sg-text)' }}>{result?.extracted_text}</p>)}
  </div>
);

const PreprocessingDiff = ({ original, cleaned, noText }) => {
  const cleanedReady = cleaned !== undefined && cleaned !== null;
  const changed = cleanedReady && cleaned.trim() && cleaned.trim() !== original.trim();

  return (
    <div className="sg-diff-panel" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
      <div className="sg-diff-panel-header"><span>Preprocessing result</span></div>
      {noText || !cleanedReady ? (
        <p className="sg-diff-unchanged">No extracted text was available to preprocess.</p>
      ) : changed ? (
        <>
          <DiffText before={original} after={cleaned} />
          <div className="sg-diff-legend">
            <span className="removed"><i /> Removed during preprocessing</span>
            <span className="added"><i /> Kept or normalized</span>
          </div>
        </>
      ) : (
        <p className="sg-diff-unchanged">No changes were needed — the extracted text was already clean.</p>
      )}
    </div>
  );
};

const DiffText = ({ before, after }) => {
  const segments = useMemo(() => diffWords(before, after), [before, after]);
  return (
    <p className="sg-diff-text">
      {segments.map((segment, index) => (
        <span key={`${segment.type}-${index}`} className={`sg-diff-${segment.type}`}>{segment.text}</span>
      ))}
    </p>
  );
};

const ImageResult = ({ result, prediction, preview, noText, copyStatus, onCopy, onDownload, onBack, onReset }) => (
  <Card className="sg-result-card" title="Step 4 · Model prediction" description={result.history_id ? 'Prediction saved to your history.' : 'The processing result is shown below.'}>
    {preview && <img className="sg-result-image" src={preview} alt="Analyzed upload" />}
    {noText ? <Alert type="error">No readable Somali text was detected. Try a clearer image or crop closer to the text.</Alert> : <div className={`sg-result-summary ${prediction.tone}`}><span className="sg-result-icon">{prediction.offensive ? <ShieldAlert size={26} /> : <CheckCircle2 size={26} />}</span><div><span>Model classification</span><strong>{prediction.label}</strong></div><div className="sg-confidence"><span>Model confidence</span><strong>{formatConfidence(result.confidence)}</strong></div></div>}
    {!noText && <div className="sg-result-note">Model confidence is calculated dynamically from this SomBERTa prediction. OCR extraction confidence, when used internally, is separate from model confidence.</div>}
    <StatusLine label="OCR processing" value={noText ? 'No readable text' : 'Text extracted'} tone={noText ? 'warning' : 'success'} />
    <StatusLine label="Prediction processing" value={noText ? 'Not classified' : 'Complete'} tone={noText ? 'warning' : 'success'} />
    {result.extracted_text && <TextBlock title="Extracted OCR text" value={result.extracted_text} />}
    {result.cleaned_text && <TextBlock title="Preprocessed text" value={result.cleaned_text} />}
    <div className="sg-form-actions">
      <button className="sg-button sg-button-outline" type="button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <button className="sg-button sg-button-outline" type="button" onClick={onCopy} disabled={!result.extracted_text}>{copyStatus === 'copied' ? <Check size={16} /> : <Copy size={16} />}{copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Copy failed' : 'Copy extracted text'}</button>
      <button className="sg-button sg-button-outline" type="button" onClick={onDownload}><Download size={16} /> Download report</button>
      <button className="sg-button sg-button-primary" type="button" onClick={onReset}><RotateCcw size={16} /> Analyze another image</button>
      <Link className="sg-button sg-button-ghost" to="/history">View history</Link>
    </div>
  </Card>
);

const StatusLine = ({ label, value, tone }) => <div className="sg-status-line"><span>{label}</span><strong className={tone}>{tone === 'success' && <CheckCircle2 size={14} />}{value}</strong></div>;
const TextBlock = ({ title, value }) => <section className="sg-result-text"><h3>{title}</h3><p>{value}</p></section>;
const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const formatConfidence = (value) => { const number = Number(value); return value !== null && value !== '' && Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : 'Not available'; };
const normalizeResult = (result) => { if (!result) return null; const value = String(result.prediction || '').toLowerCase(); const offensive = value.includes('offensive') && !value.includes('non'); const safe = value.includes('non'); return { offensive, label: offensive ? 'Offensive' : safe ? 'Non-offensive' : 'Unclassified', tone: offensive ? 'offensive' : safe ? 'safe' : 'unknown' }; };

export default Analyze;
