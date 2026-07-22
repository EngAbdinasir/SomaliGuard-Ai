import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clipboard, Copy, Download, LoaderCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import { predictText } from '../services/api';
import { validatePredictionText } from '../utils/textValidation';
import { Alert, Card, PageHeader } from '../components/ui/Primitives';

const sampleText = 'Mahadsanid walaal, qoraalkaan waa tijaabo lagu hubinayo nidaamka.';

const STEP_DEFS = [
  { key: 'input', label: 'Enter text', description: 'Type or paste Somali content' },
  { key: 'preprocessing', label: 'Preprocessing', description: 'Cleaning & normalizing text' },
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

const TextPrediction = () => {
  const [step, setStep] = useState(1);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [apiState, setApiState] = useState('idle'); // idle | loading | ready | error
  const [copyStatus, setCopyStatus] = useState('idle');

  const stats = useMemo(() => {
    const trimmed = text.trim();
    return { characters: text.length, words: trimmed ? trimmed.split(/\s+/).length : 0 };
  }, [text]);
  const validationError = useMemo(() => text.trim() ? validatePredictionText(text) : '', [text]);
  const prediction = normalizeResult(result);

  const runPrediction = async () => {
    setApiState('loading');
    setError('');
    try {
      const response = await predictText(text);
      setResult(response);
      setApiState('ready');
    } catch (requestError) {
      setError(requestError.message);
      setApiState('error');
    }
  };

  const goToStep2 = (event) => {
    event.preventDefault();
    const message = validatePredictionText(text);
    if (message) { setError(message); return; }
    setResult(null);
    setCopyStatus('idle');
    setStep(2);
    runPrediction();
  };

  const goToStep3 = () => { if (apiState === 'ready') setStep(3); };
  const backToStep1 = () => { setStep(1); setApiState('idle'); setError(''); };
  const backToStep2 = () => setStep(2);
  const jumpToStep = (target) => { if (target < step) setStep(target); };

  const startOver = () => {
    setText(''); setResult(null); setError(''); setCopyStatus('idle'); setApiState('idle'); setStep(1);
  };

  const useExample = () => {
    setText(sampleText); setResult(null); setError(''); setCopyStatus('idle'); setApiState('idle'); setStep(1);
  };

  const copyText = async () => {
    const value = result?.cleaned_text || result?.original_text || text;
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    setTimeout(() => setCopyStatus('idle'), 1800);
  };
  const download = () => {
    if (!result || !prediction) return;
    const report = ['SomaliGuard AI Text Prediction Report', `Prediction: ${prediction.label}`, `Model Confidence: ${formatConfidence(result.confidence)}`, `Saved to History: ${result.history_id ? 'Yes' : 'No'}`, '', 'Submitted Text:', result.original_text || text, '', 'Preprocessed Text:', result.cleaned_text || 'Not returned'].join('\n');
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `somaliguard-text-report-${result.history_id || Date.now()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page sg-text-page">
      <PageHeader
        eyebrow="Direct-text classification"
        title="Analyze Somali text"
        description="Move through each step at your own pace: enter text, review preprocessing, then reveal the model prediction."
        actions={<button className="sg-button sg-button-outline" type="button" onClick={useExample}><Clipboard size={16} /> Use example</button>}
      />

      <Card className="sg-steps-card" title="Analysis pipeline" description="Tap Next to move to the next step." style={{ marginBottom: 20 }}>
        <AnalysisSteps currentStep={step} onStepClick={jumpToStep} />
      </Card>

      {step === 1 && (
        <Card title="Step 1 · Enter text" description="There is no artificial character or word limit in this form.">
          <form className="sg-text-form" onSubmit={goToStep2}>
            <label htmlFor="somali-text">Somali content</label>
            <textarea
              id="somali-text"
              className="sg-input sg-textarea-large"
              value={text}
              onChange={(event) => { setText(event.target.value); setError(''); }}
              placeholder="Geli ama ku dheji qoraalka Soomaaliga ah…"
              aria-describedby="text-help text-count"
              aria-invalid={Boolean(validationError)}
            />
            <div className="sg-field-meta"><span id="text-help">Somali letters, punctuation, numbers, and emojis may be included.</span><span id="text-count">{stats.words} words · {stats.characters} characters</span></div>
            {validationError && <Alert type="error">{validationError}</Alert>}
            {error && error !== validationError && <Alert type="error">{error}</Alert>}
            <div className="sg-form-actions">
              <button className="sg-button sg-button-primary" type="submit" disabled={!text.trim()}>Next: Preprocess <ArrowRight size={17} /></button>
              <button className="sg-button sg-button-outline" type="button" onClick={startOver} disabled={!text && !result}><RotateCcw size={17} /> Clear</button>
            </div>
          </form>
        </Card>
      )}

      {step === 2 && (
        <Card title="Step 2 · Preprocessing" description="This is exactly what changed before the model sees your text.">
          <PreprocessingDiff apiState={apiState} original={result?.original_text || text} cleaned={result?.cleaned_text} error={error} />
          <div className="sg-form-actions" style={{ marginTop: 18 }}>
            <button className="sg-button sg-button-outline" type="button" onClick={backToStep1}><ArrowLeft size={17} /> Back</button>
            {apiState === 'error' ? (
              <button className="sg-button sg-button-primary" type="button" onClick={runPrediction}>Try again</button>
            ) : (
              <button className="sg-button sg-button-primary" type="button" onClick={goToStep3} disabled={apiState !== 'ready'}>
                {apiState === 'loading' ? <span className="sg-button-spinner" /> : null}
                {apiState === 'loading' ? 'Waiting for backend…' : <>Next: View prediction <ArrowRight size={17} /></>}
              </button>
            )}
          </div>
        </Card>
      )}

      {step === 3 && result && prediction && (
        <ResultPanel
          result={result}
          prediction={prediction}
          text={text}
          copyStatus={copyStatus}
          onCopy={copyText}
          onDownload={download}
          onBack={backToStep2}
          onStartOver={startOver}
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

const PreprocessingDiff = ({ apiState, original, cleaned, error }) => {
  const cleanedReady = apiState === 'ready' && cleaned !== undefined && cleaned !== null;
  const changed = cleanedReady && cleaned.trim() && cleaned.trim() !== original.trim();

  return (
    <div className="sg-diff-panel" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
      <div className="sg-diff-panel-header">
        <span>Preprocessing result</span>
        {apiState === 'loading' && <span className="sg-diff-status"><LoaderCircle size={13} className="sg-spin" /> Cleaning original text…</span>}
      </div>

      {apiState === 'error' && <Alert type="error">{error || 'Preprocessing failed.'}</Alert>}

      {apiState !== 'error' && !cleanedReady && <p className="sg-diff-original">{original}</p>}

      {cleanedReady && (changed ? (
        <>
          <DiffText before={original} after={cleaned} />
          <div className="sg-diff-legend">
            <span className="removed"><i /> Removed during preprocessing</span>
            <span className="added"><i /> Kept or normalized</span>
          </div>
        </>
      ) : (
        <p className="sg-diff-unchanged">No changes were needed — the submitted text was already clean.</p>
      ))}
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

const ResultPanel = ({ result, prediction, text, copyStatus, onCopy, onDownload, onBack, onStartOver }) => (
  <Card className="sg-result-card" title="Step 3 · Model prediction" description={result.history_id ? 'Prediction saved to your history.' : 'Prediction completed; history status was not confirmed.'}>
    <div className={`sg-result-summary ${prediction.tone}`}>
      <span className="sg-result-icon">{prediction.offensive ? <ShieldAlert size={26} /> : <CheckCircle2 size={26} />}</span>
      <div><span>Model classification</span><strong>{prediction.label}</strong></div>
      <div className="sg-confidence"><span>Model confidence</span><strong>{formatConfidence(result.confidence)}</strong></div>
    </div>
    <div className="sg-result-note">This percentage is calculated from this prediction’s SomBERTa output. It is not a manual or fixed value.</div>
    <TextBlock title="Submitted text" value={result.original_text || text} />
    {result.cleaned_text && <TextBlock title="Preprocessed text" value={result.cleaned_text} />}
    <dl className="sg-result-metadata"><div><dt>Model</dt><dd>{result.model_name || 'SomBERTa'}</dd></div><div><dt>History</dt><dd>{result.history_id ? `Saved · #${result.history_id}` : 'Not confirmed'}</dd></div></dl>
    <div className="sg-form-actions">
      <button className="sg-button sg-button-outline" type="button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <button className="sg-button sg-button-outline" type="button" onClick={onCopy}>{copyStatus === 'copied' ? <Check size={16} /> : <Copy size={16} />}{copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Copy failed' : 'Copy text'}</button>
      <button className="sg-button sg-button-outline" type="button" onClick={onDownload}><Download size={16} /> Download report</button>
      <button className="sg-button sg-button-primary" type="button" onClick={onStartOver}><RotateCcw size={16} /> New analysis</button>
    </div>
  </Card>
);

const TextBlock = ({ title, value }) => <section className="sg-result-text"><h3>{title}</h3><p>{value}</p></section>;
const formatConfidence = (value) => { const number = Number(value); return value !== null && value !== '' && Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : 'Not available'; };
const normalizeResult = (result) => {
  if (!result) return null;
  const value = String(result.prediction || '').toLowerCase();
  const offensive = value.includes('offensive') && !value.includes('non');
  const safe = value.includes('non');
  return { offensive, label: offensive ? 'Offensive' : safe ? 'Non-offensive' : 'Unclassified', tone: offensive ? 'offensive' : safe ? 'safe' : 'unknown' };
};

export default TextPrediction;
