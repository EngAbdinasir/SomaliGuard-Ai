import React from 'react';
import { AlertCircle, CheckCircle2, Clock, FileText, Scan } from 'lucide-react';

const normalizePrediction = (prediction) => {
  const lower = String(prediction || '').toLowerCase();
  if (lower.includes('offensive') && !lower.includes('non')) return 'OFFENSIVE';
  if (lower.includes('non')) return 'NON-OFFENSIVE';
  return String(prediction || 'UNKNOWN').toUpperCase();
};

const PredictionResult = ({ result }) => {
  if (!result) return null;

  const label = normalizePrediction(result.prediction);
  const isOffensive = label === 'OFFENSIVE';
  const color = isOffensive ? '#ef4444' : '#10b981';
  const confidence = Math.round(Number(result.confidence || 0) * 100);
  const text = result.extracted_text || result.original_text || '';

  return (
    <div className="card" style={{ padding: '25px', display: 'grid', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', padding: '20px', border: `1px solid ${isOffensive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`, borderRadius: '12px', background: isOffensive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: color, color: 'white', display: 'grid', placeItems: 'center' }}>
            {isOffensive ? <AlertCircle size={28} /> : <CheckCircle2 size={28} />}
          </div>
          <div>
            <h2 style={{ margin: 0, color, fontSize: '24px' }}>{label}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>Confidence: {confidence}%</p>
          </div>
        </div>
        <strong style={{ color, fontSize: '28px' }}>{confidence}%</strong>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <Detail icon={<FileText size={16} />} label={result.extracted_text ? 'Extracted text' : 'Original text'} value={text || 'No text detected'} />
        <Detail icon={<Scan size={16} />} label="Cleaned text" value={result.cleaned_text || 'No cleaned text'} />
        <Detail icon={<Scan size={16} />} label="Saved" value={result.history_id ? 'Yes' : 'No'} />
      </div>
    </div>
  );
};

const Detail = ({ icon, label, value }) => (
  <div style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '14px', background: 'var(--bg)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
      {icon}
      <span>{label}</span>
    </div>
    <div style={{ color: 'var(--text)', lineHeight: 1.5 }}>{value}</div>
  </div>
);

export default PredictionResult;
