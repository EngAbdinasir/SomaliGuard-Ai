from functools import lru_cache
import re

from lingua import Language, LanguageDetectorBuilder


# Build both detectors once. Longer text has enough evidence for broad language
# comparison. Very short Somali input needs a smaller comparison set because a
# valid word such as "nacas" or "berri" can otherwise resemble an unrelated
# language by coincidence.
SOMALI_LANGUAGE_DETECTOR = (
    LanguageDetectorBuilder
    .from_all_spoken_languages()
    .build()
)
SHORT_TEXT_LANGUAGE_DETECTOR = (
    LanguageDetectorBuilder
    .from_languages(
        Language.SOMALI,
        Language.ENGLISH,
        Language.SWAHILI,
        Language.ARABIC,
        Language.ITALIAN,
    )
    .build()
)

SHORT_TEXT_MAX_WORDS = 4
SHORT_TEXT_MAX_SOMALI_RANK = 4
CLEAR_FOREIGN_PHRASE_CONFIDENCE = 0.30


def _language_code(language):
    return language.iso_code_639_1.name.lower()


@lru_cache(maxsize=1024)
def detect_somali_language(text):
    normalized_text = str(text or "").strip().lower()
    words = re.findall(r"[^\W\d_]+", normalized_text, flags=re.UNICODE)
    if not words:
        return {
            "is_somali": False,
            "language": "unknown",
            "confidence": 0.0,
        }

    detected_language = SOMALI_LANGUAGE_DETECTOR.detect_language_of(normalized_text)
    if detected_language is None:
        return {
            "is_somali": False,
            "language": "unknown",
            "confidence": 0.0,
        }

    confidence_values = SOMALI_LANGUAGE_DETECTOR.compute_language_confidence_values(
        normalized_text
    )
    confidence = next(
        value.value
        for value in confidence_values
        if value.language == detected_language
    )

    if detected_language == Language.SOMALI:
        return {
            "is_somali": True,
            "language": "so",
            "confidence": round(float(confidence), 4),
        }

    # Language identification is statistically unreliable for a few words.
    # Rescue short Somali text only when Somali is already one of the broad
    # detector's strongest candidates and wins against the languages most
    # likely to appear in this application's input. A clearly detected foreign
    # multi-word phrase is still rejected.
    if len(words) <= SHORT_TEXT_MAX_WORDS:
        somali_rank = next(
            (
                index + 1
                for index, value in enumerate(confidence_values)
                if value.language == Language.SOMALI
            ),
            len(confidence_values) + 1,
        )
        short_values = (
            SHORT_TEXT_LANGUAGE_DETECTOR.compute_language_confidence_values(
                normalized_text
            )
        )
        short_winner = short_values[0]
        clearly_foreign_phrase = (
            len(words) > 1
            and confidence >= CLEAR_FOREIGN_PHRASE_CONFIDENCE
        )

        if (
            short_winner.language == Language.SOMALI
            and somali_rank <= SHORT_TEXT_MAX_SOMALI_RANK
            and not clearly_foreign_phrase
        ):
            return {
                "is_somali": True,
                "language": "so",
                "confidence": round(float(short_winner.value), 4),
            }

    return {
        "is_somali": False,
        "language": _language_code(detected_language),
        "confidence": round(float(confidence), 4),
    }
