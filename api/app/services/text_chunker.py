import re


def _split_by_codepoint(value: str, max_bytes: int) -> list[str]:
    chunks: list[str] = []
    current = ""
    for char in value:
        if current and len((current + char).encode("utf-8")) > max_bytes:
            chunks.append(current)
            current = char
        else:
            current += char
    if current:
        chunks.append(current)
    return chunks


def _split_long_paragraph(paragraph: str, max_bytes: int) -> list[str]:
    sentences = [part for part in re.split(r"(?<=[。！？\n])", paragraph) if part]
    result: list[str] = []
    current = ""
    for sentence in sentences:
        for piece in _split_by_codepoint(sentence, max_bytes):
            if current and len((current + piece).encode("utf-8")) > max_bytes:
                result.append(current)
                current = piece
            else:
                current += piece
    if current:
        result.append(current)
    return result


def split_text(value: str, max_bytes: int = 4500) -> list[str]:
    chunks: list[str] = []
    current = ""
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", value) if part.strip()]
    for paragraph in paragraphs:
        pieces = (
            [paragraph] if len(paragraph.encode("utf-8")) <= max_bytes else _split_long_paragraph(paragraph, max_bytes)
        )
        for piece in pieces:
            candidate = f"{current}\n\n{piece}" if current else piece
            if current and len(candidate.encode("utf-8")) > max_bytes:
                chunks.append(current)
                current = piece
            else:
                current = candidate
    if current:
        chunks.append(current)
    return chunks
