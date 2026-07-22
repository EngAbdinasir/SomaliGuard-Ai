import pytest

from language_detection import detect_somali_language


@pytest.mark.parametrize(
    "text",
    [
        "Mahadsanid walaal maanta waa maalin wanaagsan",
        "Qoraalkan waa af Soomaali waxaana lagu tijaabinayaa nidaamka",
        "Waan ku necbahay",
        "Subax wanaagsan",
        "nacas",
        "xun",
        "berri",
        "aamus",
        "iska tag",
        "iga tag",
        "af xun",
        "iga aamus",
        "berri imow",
    ],
)
def test_accepts_somali_text(text):
    result = detect_somali_language(text)

    assert result["is_somali"] is True
    assert result["language"] == "so"


@pytest.mark.parametrize(
    "text",
    [
        "Hello my friend, today is a beautiful day",
        "Asante sana rafiki yangu",
        "Bonjour mon ami",
        "Merhaba arkadasim",
        "Hola amigo",
        "Good job",
        "stupid",
        "idiot",
        "12345 !!! 😂",
        "",
    ],
)
def test_rejects_non_somali_text(text):
    result = detect_somali_language(text)

    assert result["is_somali"] is False
    assert result["language"] != "so"
