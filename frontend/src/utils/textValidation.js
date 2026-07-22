const SOMALI_LATIN_LETTER_PATTERN = /[A-Za-z]/;

export const TEXT_CONTENT_ERROR =
  'Enter Somali text containing at least one letter. Numbers, symbols, and emojis are allowed only when included with text.';

export const validatePredictionText = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Please enter Somali text before running analysis.';
  }

  if (!SOMALI_LATIN_LETTER_PATTERN.test(value)) {
    return TEXT_CONTENT_ERROR;
  }

  return '';
};

