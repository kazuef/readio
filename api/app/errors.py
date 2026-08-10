from __future__ import annotations

from dataclasses import dataclass

MESSAGES = {
    "INVALID_URL": "正しい記事URLを入力してください。",
    "INVALID_JOB_ID": "変換情報の形式が正しくありません。",
    "URL_NOT_ALLOWED": "このURLは利用できません。",
    "ACCESS_DENIED": "アプリの利用設定を確認してください。",
    "RATE_LIMITED": "利用が集中しています。しばらく待ってお試しください。",
    "MONTHLY_LIMIT_REACHED": "今月の利用上限に達しました。",
    "GENERATION_DISABLED": "現在、音声生成を停止しています。",
    "ARTICLE_FETCH_FAILED": "記事を取得できませんでした。",
    "ARTICLE_EXTRACTION_FAILED": "この記事から本文を取得できませんでした。",
    "ARTICLE_TOO_LARGE": "この記事は長すぎるため変換できません。",
    "TTS_TEMPORARY_ERROR": "音声を生成できませんでした。時間をおいてお試しください。",
    "JOB_TIMEOUT": "音声生成に時間がかかりすぎました。",
    "JOB_NOT_FOUND": "変換情報が見つかりません。再生成してください。",
    "AUDIO_NOT_FOUND": "音声が見つかりません。再生成してください。",
    "INTERNAL_ERROR": "エラーが発生しました。時間をおいてお試しください。",
}


@dataclass
class AppError(Exception):
    code: str
    status_code: int
    message: str | None = None

    def __post_init__(self) -> None:
        self.message = self.message or MESSAGES.get(self.code, MESSAGES["INTERNAL_ERROR"])
        super().__init__(self.message)
