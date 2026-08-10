from app.services.text_normalizer import normalize_text


def test_normalizes_code_urls_and_whitespace():
    source = "見出し\r\n\r\n```python\nprint('secret')\n```\n\nhttps://example.com\n\n本文　　です。\x00"
    result = normalize_text(source)
    assert "print" not in result
    assert "コード部分は省略します。" in result
    assert "https://" not in result
    assert "本文 です。" in result
    assert "\x00" not in result
