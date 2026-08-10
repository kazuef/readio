from app.services.text_chunker import split_text


def test_japanese_chunks_stay_under_byte_limit():
    text = ("これは日本語の記事です。読み上げるための文章です。" * 500) + "😊"
    chunks = split_text(text, 4500)
    assert len(chunks) > 1
    assert all(chunk and len(chunk.encode("utf-8")) <= 4500 for chunk in chunks)
    assert "".join(chunks) == text


def test_paragraph_order_is_preserved():
    chunks = split_text("最初の段落。\n\n次の段落。", 100)
    assert chunks == ["最初の段落。\n\n次の段落。"]
