export const isOffensivePrediction = (prediction) => {
  const value = String(prediction || '').toLowerCase();
  return value.includes('offensive') && !value.includes('non');
};

export const isNonOffensivePrediction = (prediction) => {
  return String(prediction || '').toLowerCase().includes('non');
};

export const isReviewPrediction = (prediction) => {
  return ['no_text_detected', 'too_much_text_detected', 'no_somali_text_detected', 'unknown', 'needs_review']
    .includes(String(prediction || '').toLowerCase());
};

export const formatPredictionLabel = (prediction) => {
  const value = String(prediction || '').toLowerCase();
  if (value === 'no_text_detected') return 'NO TEXT';
  if (value === 'too_much_text_detected') return 'TOO MUCH TEXT';
  if (value === 'no_somali_text_detected') return 'NO SOMALI TEXT';
  if (value === 'unknown' || value === 'needs_review') return 'NEEDS REVIEW';
  if (isOffensivePrediction(prediction)) return 'OFFENSIVE';
  if (isNonOffensivePrediction(prediction)) return 'NON-OFFENSIVE';
  return String(prediction || 'UNKNOWN').toUpperCase();
};

export const confidencePercent = (confidence) => {
  const value = Number(confidence || 0);
  return Math.round(value <= 1 ? value * 100 : value);
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
  const needsReview = history.filter((row) => isReviewPrediction(row.prediction)).length;
  const image = history.filter((row) => row.input_type === 'image').length;
  const text = history.filter((row) => row.input_type === 'text').length;

  return {
    total,
    offensive,
    nonOffensive,
    needsReview,
    image,
    text,
    offensivePercent: total ? Math.round((offensive / total) * 100) : 0,
    nonOffensivePercent: total ? Math.round((nonOffensive / total) * 100) : 0,
  };
};
