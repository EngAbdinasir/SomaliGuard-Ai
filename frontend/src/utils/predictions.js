export const isOffensivePrediction = (prediction) => {
  const value = String(prediction || '').toLowerCase();
  return value.includes('offensive') && !value.includes('non');
};

export const isNonOffensivePrediction = (prediction) => {
  return String(prediction || '').toLowerCase().includes('non');
};

export const isUnclassifiedPrediction = (prediction) => {
  return ['no_text_detected', 'no_somali_text_detected', 'unknown']
    .includes(String(prediction || '').toLowerCase());
};

export const formatPredictionLabel = (prediction) => {
  const value = String(prediction || '').toLowerCase();
  if (value === 'no_text_detected') return 'NO TEXT';
  if (value === 'no_somali_text_detected') return 'NO SOMALI TEXT';
  if (value === 'unknown') return 'UNCLASSIFIED';
  if (isOffensivePrediction(prediction)) return 'OFFENSIVE';
  if (isNonOffensivePrediction(prediction)) return 'NON-OFFENSIVE';
  return String(prediction || 'UNKNOWN').toUpperCase();
};

export const rowText = (row) => {
  return row?.extracted_text || row?.original_text || row?.cleaned_text || 'No text detected';
};

export const formatDateTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

export const buildHistoryStats = (history = []) => {
  const total = history.length;
  const offensive = history.filter((row) => isOffensivePrediction(row.prediction)).length;
  const nonOffensive = history.filter((row) => isNonOffensivePrediction(row.prediction)).length;
  const unclassified = history.filter((row) => isUnclassifiedPrediction(row.prediction)).length;
  const classified = offensive + nonOffensive;
  const image = history.filter((row) => row.input_type === 'image').length;
  const text = history.filter((row) => row.input_type === 'text').length;

  return {
    total,
    offensive,
    nonOffensive,
    unclassified,
    classified,
    image,
    text,
    offensivePercent: classified ? Math.round((offensive / classified) * 100) : 0,
    nonOffensivePercent: classified ? Math.round((nonOffensive / classified) * 100) : 0,
  };
};
