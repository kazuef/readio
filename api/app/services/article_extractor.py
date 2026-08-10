from __future__ import annotations

import re
from dataclasses import dataclass
from html import unescape
from urllib.parse import urlsplit

import trafilatura

from app.errors import AppError
from app.services.article_fetcher import FetchedArticlePage


@dataclass(frozen=True)
class ExtractedArticle:
    title: str
    text: str


def extract_article(page: FetchedArticlePage) -> ExtractedArticle:
    document = trafilatura.bare_extraction(
        page.html,
        url=page.final_url,
        include_comments=False,
        include_tables=True,
        favor_precision=True,
    )
    if not document:
        raise AppError("ARTICLE_EXTRACTION_FAILED", 422)
    text = document.text or ""
    if len(text.strip()) < 200:
        raise AppError("ARTICLE_EXTRACTION_FAILED", 422)
    title = document.title or _html_title(page.html) or urlsplit(page.final_url).hostname or "記事"
    title = re.sub(r"[\x00-\x1f\x7f]", "", unescape(title)).strip()[:200]
    return ExtractedArticle(title=title or "記事", text=text)


def _html_title(html: str) -> str | None:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return re.sub(r"<[^>]+>", "", match.group(1)).strip() if match else None
