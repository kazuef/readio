# 記事音声化アプリ 詳細設計書

| 項目       | 内容                                                    |
| ---------- | ------------------------------------------------------- |
| 文書版     | 1.0                                                     |
| 作成日     | 2026-08-05                                              |
| 対象       | MVP                                                     |
| 関連文書   | `requirements-definition.md` 1.1、`basic-design.md` 1.1 |
| ステータス | 確定                                                    |

## 目次

1. [目的](#1-目的)
2. [確定スコープ](#2-確定スコープ)
3. [技術スタック](#3-技術スタック)
4. [リポジトリ構成](#4-リポジトリ構成)
5. [モバイルアプリ詳細設計](#5-モバイルアプリ詳細設計)
6. [API詳細設計](#6-api詳細設計)
7. [バックエンドモジュール詳細](#7-バックエンドモジュール詳細)
8. [永続データ設計](#8-永続データ設計)
9. [エラー詳細](#9-エラー詳細)
10. [レート制限](#10-レート制限)
11. [セキュリティ実装](#11-セキュリティ実装)
12. [ログ設計](#12-ログ設計)
13. [監視・費用制御](#13-監視費用制御)
14. [環境変数](#14-環境変数)
15. [ビルド設定](#15-ビルド設定)
16. [テスト詳細](#16-テスト詳細)
17. [デプロイ手順](#17-デプロイ手順)
18. [完了条件](#18-完了条件)
19. [参照資料](#19-参照資料)

## 1. 目的

本書は、要件定義書および基本設計書で確定したMVPを実装・単体テストできる粒度に分解する。対象は、Android 10以降およびiOS 15以降で動作するExpoアプリと、Railway上で動作するFastAPIである。

## 2. 確定スコープ

### 2.1 提供機能

- 日本語の一般公開記事URLを1件入力する。
- 記事本文を抽出し、日本語音声のMP3へ変換する。
- 変換状態を表示する。
- MP3を再生・一時停止する。
- Android/iOSでバックグラウンドおよび画面ロック中も再生する。
- 失敗理由を表示し、再試行できる。

### 2.2 対象外

- 複数記事の履歴、プレイリスト
- 再生位置の永続保存
- シーク、15秒送り戻し、倍速
- オフライン保存
- 会員登録、端末間同期
- 要約、会話形式、複数話者
- App Store / Google Playでの一般公開

## 3. 技術スタック

| 区分     | 技術                                           |
| -------- | ---------------------------------------------- |
| モバイル | React Native、Expo、TypeScript                 |
| 音声再生 | `expo-audio`                                   |
| API通信  | 標準 `fetch` + 共通ラッパー                    |
| API      | Python、FastAPI、Pydantic                      |
| HTTP取得 | `httpx`                                        |
| 本文抽出 | `trafilatura`                                  |
| TTS      | Google Cloud Text-to-Speech、`ja-JP-Wavenet-A` |
| 音声連結 | FFmpeg                                         |
| 永続化   | Railway Volume上のJSONとMP3                    |
| 配布     | Android Preview APK、iOS TestFlight            |

## 4. リポジトリ構成

単一リポジトリ内でモバイルとAPIを分離する。

```text
article-audio-app/
├── mobile/
│   ├── app/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── jobs.ts
│   │   │   └── types.ts
│   │   ├── audio/
│   │   │   ├── audioMode.ts
│   │   │   └── useArticlePlayer.ts
│   │   ├── components/
│   │   │   ├── UrlForm.tsx
│   │   │   ├── GenerationStatus.tsx
│   │   │   ├── PlayerPanel.tsx
│   │   │   └── ErrorPanel.tsx
│   │   ├── hooks/
│   │   │   └── useGenerationJob.ts
│   │   ├── state/
│   │   │   ├── appState.ts
│   │   │   └── reducer.ts
│   │   └── utils/
│   │       ├── url.ts
│   │       └── errors.ts
│   ├── app.config.ts
│   ├── eas.json
│   ├── package.json
│   └── tsconfig.json
├── api/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── dependencies.py
│   │   ├── routers/
│   │   │   ├── generate.py
│   │   │   ├── jobs.py
│   │   │   ├── audio.py
│   │   │   └── health.py
│   │   ├── schemas/
│   │   │   ├── requests.py
│   │   │   ├── responses.py
│   │   │   └── metadata.py
│   │   ├── services/
│   │   │   ├── url_validator.py
│   │   │   ├── article_fetcher.py
│   │   │   ├── article_extractor.py
│   │   │   ├── text_normalizer.py
│   │   │   ├── text_chunker.py
│   │   │   ├── tts_service.py
│   │   │   ├── audio_assembler.py
│   │   │   ├── job_service.py
│   │   │   ├── quota_service.py
│   │   │   └── cleanup_service.py
│   │   ├── repositories/
│   │   │   ├── metadata_repository.py
│   │   │   └── audio_repository.py
│   │   ├── middleware/
│   │   │   ├── request_id.py
│   │   │   ├── access_key.py
│   │   │   └── rate_limit.py
│   │   └── errors.py
│   ├── tests/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.lock
└── README.md
```

## 5. モバイルアプリ詳細設計

### 5.1 画面構成

画面は `app/index.tsx` の1画面とし、アプリ状態に応じて子コンポーネントを切り替える。

| 状態         | 表示                                         |
| ------------ | -------------------------------------------- |
| `idle`       | URL入力、生成ボタン                          |
| `submitting` | 入力内容、送信中インジケーター               |
| `processing` | タイトルまたはURL、処理段階、インジケーター  |
| `ready`      | タイトル、元記事リンク、再生・一時停止ボタン |
| `failed`     | エラー文言、再試行、URL修正ボタン            |

### 5.2 レイアウト

```text
SafeAreaView
└── ScrollView
    ├── Header
    │   ├── アプリ名
    │   └── 説明「記事を音声で聴く」
    ├── UrlForm
    │   ├── TextInput
    │   └── 生成ボタン
    ├── GenerationStatus   ※処理中のみ
    ├── PlayerPanel        ※完了後のみ
    └── ErrorPanel         ※失敗時のみ
```

### 5.3 画面項目

| ID    | 項目           | 型/制約                   | 動作                               |
| ----- | -------------- | ------------------------- | ---------------------------------- |
| UI-01 | URL入力        | 文字列、最大2,048文字     | 前後空白を除去して保持             |
| UI-02 | 生成ボタン     | ボタン                    | 有効URLかつ非処理中の場合のみ活性  |
| UI-03 | 処理表示       | テキスト + インジケーター | API状態を日本語へ変換              |
| UI-04 | 記事タイトル   | 最大2行                   | 超過時は末尾省略                   |
| UI-05 | 元記事リンク   | URL                       | OSの外部ブラウザで開く             |
| UI-06 | 再生ボタン     | ボタン                    | `player.play()` を実行             |
| UI-07 | 一時停止ボタン | ボタン                    | `player.pause()` を実行            |
| UI-08 | エラー         | テキスト                  | 内部情報を含めずユーザー文言を表示 |
| UI-09 | 再試行         | ボタン                    | 同じURLで新しいジョブを作成        |
| UI-10 | URL修正        | ボタン                    | `idle` に戻して入力へフォーカス    |

### 5.4 URL入力検証

`validateArticleUrl(value)` は次を満たす場合のみ成功とする。

1. 前後空白除去後に空でない。
2. 2,048文字以下である。
3. `URL` コンストラクタで解析できる。
4. スキームが `http:` または `https:` である。
5. hostnameが空でない。

クライアント検証は操作支援であり、セキュリティ判断は必ずサーバーで再実行する。

### 5.5 アプリ状態

```ts
type AppPhase = "idle" | "submitting" | "processing" | "ready" | "failed";

type ProcessingStage =
  | "queued"
  | "fetching"
  | "extracting"
  | "generating_audio";

type AppState = {
  phase: AppPhase;
  inputUrl: string;
  jobId: string | null;
  stage: ProcessingStage | null;
  title: string | null;
  sourceUrl: string | null;
  audioUrl: string | null;
  error: UserFacingError | null;
};
```

状態はメモリ上だけに保持し、AsyncStorageやSQLiteへ保存しない。

### 5.6 状態遷移

| 現在         | イベント      | 次           | 主処理                        |
| ------------ | ------------- | ------------ | ----------------------------- |
| `idle`       | `SUBMIT`      | `submitting` | 入力固定、生成API呼出         |
| `submitting` | `ACCEPTED`    | `processing` | job ID保持、ポーリング開始    |
| `submitting` | `REJECTED`    | `failed`     | エラー変換                    |
| `processing` | `JOB_UPDATED` | `processing` | stage/title更新               |
| `processing` | `JOB_READY`   | `ready`      | audio URL設定、ポーリング停止 |
| `processing` | `JOB_FAILED`  | `failed`     | ポーリング停止、エラー表示    |
| `processing` | `TIMEOUT`     | `failed`     | 5分でクライアント監視終了     |
| `ready`      | `NEW_URL`     | `idle`       | プレイヤー解放、入力初期化    |
| `failed`     | `RETRY`       | `submitting` | 同じURLで新規ジョブ           |
| `failed`     | `EDIT`        | `idle`       | エラー解除、入力維持          |

### 5.7 APIクライアント

全リクエストに次を設定する。

```text
Accept: application/json
X-MVP-Key: {EXPO_PUBLIC_MVP_ACCESS_KEY}
X-Request-ID: {UUIDv4}
```

`POST` は追加で `Content-Type: application/json` を設定する。API基底URLは末尾スラッシュを除去して保持する。

```ts
type ApiClientConfig = {
  baseUrl: string;
  accessKey: string;
  timeoutMs: number;
};
```

- 生成開始リクエストのタイムアウト: 15秒
- 状態取得のタイムアウト: 10秒
- 音声取得: `expo-audio` にURLを渡し、OSプレイヤーへ委譲
- JSONとして解析できない応答は `UNEXPECTED_RESPONSE` とする
- 401/403は再試行せず設定エラーとして表示する
- 429は `Retry-After` があれば従う

### 5.8 ジョブポーリング

`useGenerationJob(jobId)` の仕様:

1. `jobId` 設定直後に状態を取得する。
2. 未完了なら2秒後に次回取得する。
3. アプリがバックグラウンド中でも生成処理自体はサーバーで継続する。
4. アプリがフォアグラウンドへ戻った時点で即時取得する。
5. `ready` / `failed` で停止する。
6. 生成開始から5分で停止し、タイムアウトを表示する。
7. コンポーネント破棄時はタイマーと通信を `AbortController` で中止する。
8. 通信失敗は最大3回まで継続し、その間隔を2秒、4秒、8秒とする。

### 5.9 音声初期設定

`app.config.ts` に `expo-audio` Config Pluginを設定する。

```ts
plugins: [
  [
    "expo-audio",
    {
      enableBackgroundPlayback: true,
      enableBackgroundRecording: false,
      recordAudioAndroid: false,
      microphonePermission: false,
    },
  ],
];
```

アプリ起動時に一度だけ音声モードを設定する。

```ts
await setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: "doNotMix",
});
```

この設定により、Androidではメディア再生用Foreground Service、iOSでは `UIBackgroundModes` の `audio` を有効にする。録音権限は要求しない。

### 5.10 プレイヤー

`useArticlePlayer` は次を担当する。

- `audioUrl` 変更時に現在のプレイヤーを解放して新しいURLへ差し替える。
- 再生開始前にロック画面用メタデータを設定する。
- Androidでは持続的なバックグラウンド再生に必要なため、ロック画面制御を必ず有効化する。
- iOSでもロック画面とControl Centerで再生・一時停止できるよう有効化する。
- MVPではロック画面のシーク送り戻しを表示しない。
- 再生完了時は再生状態を停止へ戻すが、再生位置は保存しない。
- イヤホン/Bluetooth切断時はOS/ライブラリの既定動作に従い一時停止する。

```ts
player.setActiveForLockScreen(
  true,
  {
    title: articleTitle,
    artist: "記事音声化アプリ",
  },
  {
    showSeekBackward: false,
    showSeekForward: false,
  },
);
```

### 5.11 アクセシビリティ

- URL入力に「記事URL」のラベルを付ける。
- ボタンに状態に応じた「音声を生成」「再生」「一時停止」ラベルを付ける。
- 処理段階の変化をライブリージョン相当で通知する。
- タップ領域は44×44pt以上を確保する。
- 色だけで状態を区別しない。
- Dynamic Type / Androidフォント倍率で主要操作が欠落しないことを確認する。

## 6. API詳細設計

### 6.1 共通仕様

- Base URL: 環境変数で設定
- 通信: HTTPSのみ
- JSON文字コード: UTF-8
- 日時: UTC、ISO 8601、末尾 `Z`
- ID: ULID 26文字
- エラー応答: 共通形式

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "正しい記事URLを入力してください。",
    "request_id": "7e889a90-3dc4-4ed0-9813-d6cf40ec9276"
  }
}
```

### 6.2 認証・簡易アクセス制御

- `/health` を除く全APIで `X-MVP-Key` を必須とする。
- サーバー設定値との比較は定時間比較を使用する。
- 欠落または不一致は `401 ACCESS_DENIED` とする。
- 共通キーは強いユーザー認証ではないため、IPレート制限と費用上限を併用する。

### 6.3 POST `/generate`

Request:

```json
{
  "url": "https://example.com/article"
}
```

Pydantic:

```python
class GenerateRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
```

Response `202`:

```json
{
  "id": "01JEXAMPLE0000000000000000",
  "status": "queued",
  "status_url": "/jobs/01JEXAMPLE0000000000000000"
}
```

処理順:

1. アクセスキー検証
2. IPレート制限
3. JSON形式・文字数検証
4. URL正規化と安全性の事前検証
5. 同時実行枠・月間上限の確認
6. ULID採番
7. `queued` メタデータの原子保存
8. バックグラウンド処理登録
9. `202` 応答

同じURLでも毎回別ジョブを作成する。MVPでは重複キャッシュを行わない。

### 6.4 GET `/jobs/{id}`

- IDがULID形式でなければ `400 INVALID_JOB_ID`
- 存在しなければ `404 JOB_NOT_FOUND`
- 期限切れ・削除済みも `404 JOB_NOT_FOUND`
- `source_url` は `ready` の場合のみ返す
- 内部ファイルパス、文字数、外部API情報は返さない

Response schema:

```ts
type JobResponse = {
  id: string;
  status:
    | "queued"
    | "fetching"
    | "extracting"
    | "generating_audio"
    | "ready"
    | "failed";
  title: string | null;
  source_url?: string;
  audio_url?: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
  error?: {
    code: string;
    message: string;
  };
};
```

### 6.5 GET `/audio/{id}`

- `ready` 状態のみ配信する。
- Content-Type: `audio/mpeg`
- `Accept-Ranges: bytes`
- `Content-Length`, `ETag`, `Last-Modified` を返す。
- Rangeなしは `200`、有効な単一Rangeは `206`。
- 複数Rangeは `416`。
- `ETag` はファイル内容のSHA-256またはサイズ・更新時刻から生成する。
- パスはIDから組み立て、ユーザー入力を使わない。
- 期限切れは `404` とし、次回削除処理を待たず配信しない。

### 6.6 GET `/health`

Response `200`:

```json
{
  "status": "ok"
}
```

Volume書込可否やGoogle認証状態は外部へ詳細を返さない。必要な深い診断はログまたは内部運用コマンドで行う。

## 7. バックエンドモジュール詳細

### 7.1 `config.py`

起動時に環境変数を読み、欠落・不正値があれば起動を失敗させる。

```python
class Settings(BaseSettings):
    google_cloud_credentials_json: SecretStr
    mvp_access_key: SecretStr
    tts_language_code: str = "ja-JP"
    tts_voice_name: str = "ja-JP-Wavenet-A"
    tts_speaking_rate: float = 1.0
    tts_max_chunk_bytes: int = 4500
    max_fetch_bytes: int = 5_242_880
    max_article_characters: int = 30_000
    fetch_timeout_seconds: int = 30
    job_timeout_seconds: int = 300
    max_redirects: int = 3
    max_concurrent_jobs: int = 2
    monthly_tts_character_limit: int = 5_000_000
    retention_hours: int = 24
```

### 7.2 `url_validator.py`

公開HTTP(S) URLだけを許可する。

拒否条件:

- `http` / `https` 以外
- URL内のユーザー名・パスワード
- hostname欠落
- IPリテラル
- `localhost` および `.localhost`
- 標準外ポート
- DNS解決結果に非グローバルIPが1つでも含まれる
- ループバック、プライベート、リンクローカル、マルチキャスト、予約済みIP

```python
@dataclass(frozen=True)
class ValidatedUrl:
    normalized_url: str
    hostname: str
    port: int
    resolved_ips: tuple[str, ...]
```

正規化ではschemeとhostnameを小文字化し、fragmentを削除する。パスとqueryは保持する。

### 7.3 `article_fetcher.py`

- `httpx.AsyncClient(follow_redirects=False)` を使用する。
- User-Agentはアプリ名と連絡先を識別できる固定値とする。
- 接続先は検証済みIPへ固定するか、同等のDNS rebinding対策を行う。
- 各リダイレクト先を再検証する。
- 最大3リダイレクト。
- 全体30秒。
- `Content-Type` はHTML/XHTMLのみ。
- Content-Lengthが5MB超なら読込前に拒否する。
- ストリーミング中も展開後5MBで打ち切る。
- HTTP 200のみ抽出へ進める。

戻り値:

```python
@dataclass(frozen=True)
class FetchedArticlePage:
    final_url: str
    html: str
    content_type: str
```

### 7.4 `article_extractor.py`

`trafilatura` で本文とメタデータを抽出する。

```python
@dataclass(frozen=True)
class ExtractedArticle:
    title: str
    text: str
```

規則:

- 本文が空または200文字未満なら抽出失敗。
- タイトルが空ならHTMLの `<title>`、それも空ならhostnameを使用する。
- タイトルは制御文字除去後200文字に切り詰める。
- 本文が3万文字超ならTTS前に `ARTICLE_TOO_LARGE` とする。
- ログへ本文を出力しない。

### 7.5 `text_normalizer.py`

処理順:

1. UnicodeをNFKC正規化する。
2. NULおよび不要な制御文字を除去する。
3. 改行をLFへ統一する。
4. 連続空白を1つへ縮約する。
5. 連続改行を最大2つへ縮約する。
6. URLだけの行を除去する。
7. コードブロックは「コード部分は省略します。」へ置換する。
8. 前後空白を除去する。

記事内容の要約、言い換え、事実追加は行わない。

### 7.6 `text_chunker.py`

Google Cloud TTSは1リクエスト5,000バイトが上限のため、安全余裕を取り4,500 UTF-8バイト以下にする。

疑似コード:

```text
split(text, max_bytes=4500):
  paragraphs = 空行境界で分割
  chunks = []
  current = ""

  for paragraph in paragraphs:
    if paragraph単体がmax_bytes以下:
      current + paragraphがmax_bytes以下なら追加
      そうでなければcurrentを確定しparagraphをcurrentへ
    else:
      currentを確定
      paragraphを句点「。！？\n」境界で分割
      それでも長い文はUnicodeコードポイント境界で分割

  currentが空でなければ確定
  全chunkが空でないこと、結合時に本文順を保つことを検査
```

バイト数は `len(value.encode("utf-8"))` で判定し、マルチバイト文字の途中で分割しない。

### 7.7 `quota_service.py`

月次カウンター:

```json
{
  "month": "2026-08",
  "reserved_characters": 120000,
  "updated_at": "2026-08-05T11:00:00Z"
}
```

- `/data/usage/yyyy-mm.json` に保存する。
- TTS開始前に記事文字数を予約する。
- ファイルロック内で現在値を読取・加算・原子保存する。
- 加算後に500万文字を超える場合は保存せず `MONTHLY_LIMIT_REACHED`。
- TTS呼出後は失敗しても予約を戻さない。課金されている可能性を考慮する。
- 月が変われば新しいファイルを使用する。

### 7.8 `tts_service.py`

各チャンクを順番に合成する。

Google設定:

```text
language_code = ja-JP
name = ja-JP-Wavenet-A
audio_encoding = MP3
speaking_rate = 1.0
```

再試行:

| エラー       | 最大回数 | 間隔                   |
| ------------ | -------: | ---------------------- |
| 429          |        3 | 1秒、2秒、4秒 + jitter |
| 5xx          |        3 | 1秒、2秒、4秒 + jitter |
| タイムアウト |        3 | 1秒、2秒、4秒 + jitter |
| 400/401/403  |        0 | 即時失敗               |

各チャンクは `/data/tmp/{id}/chunk-{index:04}.mp3` へ保存する。0バイトまたはMP3として解析不能な応答は失敗とする。

### 7.9 `audio_assembler.py`

1. チャンク数と連番を検証する。
2. FFmpeg concat用リストを一時生成する。
3. 単一MP3 `/data/tmp/{id}/final.mp3` を生成する。
4. FFprobeで音声ストリーム、再生時間、読込可否を検査する。
5. `/data/audio/{id}.mp3.tmp` へ移動する。
6. fsync後、`/data/audio/{id}.mp3` へ原子的renameする。
7. 失敗時は最終ファイルを公開しない。

### 7.10 `job_service.py`

同時実行は `asyncio.Semaphore(2)` で制限する。

```text
queued
  -> fetching
  -> extracting
  -> generating_audio
  -> ready

任意の処理中状態
  -> failed
```

各遷移時に `updated_at` と状態を原子的に保存する。処理全体は300秒でタイムアウトさせる。

実行手順:

1. semaphore取得
2. `fetching` 更新
3. URL再検証・HTML取得
4. `extracting` 更新
5. 本文抽出・正規化・上限検証
6. 月間文字数予約
7. `generating_audio` 更新
8. 分割・TTS・連結
9. duration取得
10. `ready` 更新
11. 一時ファイル削除
12. semaphore解放

例外時は内部例外を公開エラーコードへ変換して `failed` を保存し、一時ファイルを削除する。

### 7.11 `cleanup_service.py`

- アプリ起動時と1時間ごとに実行する。
- 現在時刻が `expires_at` 以降のメタデータ、MP3、一時ディレクトリを削除する。
- メタデータを確認してからMP3、最後にメタデータの順で削除する。
- メタデータのない孤立MP3と24時間超のtmpも削除する。
- 削除失敗はログに残し、次回再試行する。
- 同じIDを処理中のジョブは削除対象から除外する。

## 8. 永続データ設計

### 8.1 ディレクトリ

```text
/data/
├── audio/{id}.mp3
├── metadata/{id}.json
├── usage/{yyyy-mm}.json
└── tmp/{id}/
```

### 8.2 メタデータJSON

```json
{
  "schema_version": 1,
  "id": "01JEXAMPLE0000000000000000",
  "source_url": "https://example.com/article",
  "title": "記事タイトル",
  "status": "ready",
  "audio_filename": "01JEXAMPLE0000000000000000.mp3",
  "duration_seconds": 742.31,
  "character_count": 8200,
  "created_at": "2026-08-05T11:00:00Z",
  "updated_at": "2026-08-05T11:00:24Z",
  "expires_at": "2026-08-06T11:00:00Z",
  "error_code": null
}
```

制約:

- `source_url` 最大2,048文字
- `title` 最大200文字
- `character_count` 0〜30,000
- `duration_seconds` は `ready` 以外null
- `audio_filename` は `ready` 以外null
- `error_code` は `failed` 以外null
- 記事本文は保存しない

### 8.3 原子更新

```text
1. {id}.json.tmpへ書込み
2. flush
3. fsync
4. {id}.jsonへrename
```

同一ID更新と月次カウンター更新にはプロセス内ロックとファイルロックを併用する。

## 9. エラー詳細

| コード                      | HTTP | ユーザー文言                                             | 再試行   |
| --------------------------- | ---: | -------------------------------------------------------- | -------- |
| `INVALID_URL`               |  400 | 正しい記事URLを入力してください。                        | 修正後可 |
| `URL_NOT_ALLOWED`           |  403 | このURLは利用できません。                                | 不可     |
| `ACCESS_DENIED`             |  401 | アプリの利用設定を確認してください。                     | 不可     |
| `RATE_LIMITED`              |  429 | 利用が集中しています。しばらく待ってお試しください。     | 可       |
| `MONTHLY_LIMIT_REACHED`     |  429 | 今月の利用上限に達しました。                             | 翌月可   |
| `ARTICLE_FETCH_FAILED`      |  422 | 記事を取得できませんでした。                             | 可       |
| `ARTICLE_EXTRACTION_FAILED` |  422 | この記事から本文を取得できませんでした。                 | 原則不可 |
| `ARTICLE_TOO_LARGE`         |  413 | この記事は長すぎるため変換できません。                   | 不可     |
| `TTS_TEMPORARY_ERROR`       |  503 | 音声を生成できませんでした。時間をおいてお試しください。 | 可       |
| `JOB_TIMEOUT`               |  504 | 音声生成に時間がかかりすぎました。                       | 可       |
| `JOB_NOT_FOUND`             |  404 | 変換情報が見つかりません。再生成してください。           | 可       |
| `AUDIO_NOT_FOUND`           |  404 | 音声が見つかりません。再生成してください。               | 可       |
| `INTERNAL_ERROR`            |  500 | エラーが発生しました。時間をおいてお試しください。       | 可       |

外部サービスの生メッセージ、スタックトレース、内部パス、認証情報は応答に含めない。

## 10. レート制限

MVPではプロセス内トークンバケットを使用する。

| 対象              | 上限                                 |
| ----------------- | ------------------------------------ |
| `POST /generate`  | 1 IPあたり10回/時                    |
| `GET /jobs/{id}`  | 1 IPあたり60回/分                    |
| `GET /audio/{id}` | 1 IPあたり30回/分。Range再取得を考慮 |
| 同時生成          | サービス全体で2件                    |

Railwayが複数プロセス構成になった時点でRedis等の共有レート制限へ移行する。信頼するProxy数を固定し、任意の `X-Forwarded-For` をそのまま信用しない。

## 11. セキュリティ実装

- Google Cloud認証JSONはRailwayの秘密環境変数だけに保存する。
- ログ、例外、API応答へ秘密値を含めない。
- URLアクセスはDNS解決結果と全リダイレクト先を検証する。
- ファイルパスはULIDからだけ生成する。
- 外部HTMLを画面へ描画しない。
- 記事本文を永続保存しない。
- 音声・メタデータは24時間で削除する。
- CORSはネイティブアプリには防御にならないが、不要なWeb Originを許可しない。
- FastAPIの対話ドキュメント `/docs`, `/redoc`, `/openapi.json` は配布環境で無効化する。
- 依存関係はlockファイルで固定し、定期的に脆弱性確認する。

## 12. ログ設計

JSON Lines形式で標準出力へ出す。

```json
{
  "timestamp": "2026-08-05T11:00:24.531Z",
  "level": "INFO",
  "event": "job_completed",
  "request_id": "7e889a90-3dc4-4ed0-9813-d6cf40ec9276",
  "job_id": "01JEXAMPLE0000000000000000",
  "stage": "ready",
  "duration_ms": 24531,
  "character_count": 8200
}
```

禁止項目:

- 記事本文
- Google認証情報
- MVPアクセスキー
- URLのqueryとfragment
- TTS応答本文

URLは必要な場合のみhostnameを記録する。

## 13. 監視・費用制御

### 13.1 指標

- APIリクエスト数と5xx率
- ジョブ成功率、失敗コード別件数
- ジョブ総時間、取得・抽出・TTS各段階の時間
- 月間TTS予約文字数
- Volume使用量
- 起動失敗、cleanup失敗

### 13.2 費用

- TTSは月500万文字をサーバーで強制上限とする。
- Google CloudとRailwayに請求アラートを設定する。
- EASを含む月額見込み8,000円で警告する。
- 警告後は管理者が `GENERATION_ENABLED=false` にして新規生成を停止できるようにする。
- 月額1万円を超えないため、2,000円を変動・遅延請求の余裕として残す。

## 14. 環境変数

### 14.1 モバイル

```text
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_MVP_ACCESS_KEY
```

### 14.2 API

```text
GOOGLE_CLOUD_CREDENTIALS_JSON
MVP_ACCESS_KEY
GENERATION_ENABLED=true
TTS_LANGUAGE_CODE=ja-JP
TTS_VOICE_NAME=ja-JP-Wavenet-A
TTS_SPEAKING_RATE=1.0
TTS_MAX_CHUNK_BYTES=4500
AUDIO_DIR=/data/audio
METADATA_DIR=/data/metadata
USAGE_DIR=/data/usage
TMP_DIR=/data/tmp
MAX_FETCH_BYTES=5242880
MAX_ARTICLE_CHARACTERS=30000
FETCH_TIMEOUT_SECONDS=30
JOB_TIMEOUT_SECONDS=300
MAX_REDIRECTS=3
MAX_CONCURRENT_JOBS=2
MONTHLY_TTS_CHARACTER_LIMIT=5000000
RETENTION_HOURS=24
LOG_LEVEL=INFO
```

## 15. ビルド設定

### 15.1 Expo

- Android minimum SDKはAPI Level 29（Android 10）とする。
- iOS deployment targetは15.0とする。
- `expo-audio` の `enableBackgroundPlayback` を有効にする。
- 録音機能・マイク権限は無効にする。
- アプリ識別子はAndroid packageとiOS bundle identifierを環境ごとに固定する。

### 15.2 EASプロファイル

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "testflight": {
      "ios": {}
    },
    "production": {}
  }
}
```

- Androidは `preview` からAPKを作る。
- iOSは `testflight` プロファイルからApp Store配布形式でビルドし、EAS SubmitでApp Store Connectへ送る。
- MVPではOTA更新を必須としない。ネイティブ設定変更時は必ず再ビルドする。

## 16. テスト詳細

### 16.1 モバイル単体テスト

| ID    | 対象    | ケース       | 期待結果                 |
| ----- | ------- | ------------ | ------------------------ |
| MT-01 | URL検証 | 空文字       | 無効                     |
| MT-02 | URL検証 | `ftp://...`  | 無効                     |
| MT-03 | URL検証 | 正常HTTPS    | 有効                     |
| MT-04 | reducer | submit成功   | `processing`             |
| MT-05 | reducer | job ready    | `ready`、audio URL保持   |
| MT-06 | reducer | job failed   | `failed`、エラー保持     |
| MT-07 | polling | ready応答    | タイマー停止             |
| MT-08 | polling | 連続通信失敗 | 2/4/8秒後に失敗終了      |
| MT-09 | player  | play         | ロック画面有効化後に再生 |
| MT-10 | player  | URL変更      | 旧player解放、新URL読込  |

### 16.2 API単体テスト

| ID    | 対象      | ケース                 | 期待結果                     |
| ----- | --------- | ---------------------- | ---------------------------- |
| AT-01 | URL検証   | localhost              | 拒否                         |
| AT-02 | URL検証   | private IPへDNS解決    | 拒否                         |
| AT-03 | URL検証   | 公開HTTPS              | 許可                         |
| AT-04 | redirect  | 公開先からprivate IP   | 拒否                         |
| AT-05 | fetch     | 5MB超                  | `ARTICLE_TOO_LARGE`          |
| AT-06 | extract   | 本文200文字未満        | 抽出失敗                     |
| AT-07 | normalize | コードブロック         | 省略文へ置換                 |
| AT-08 | chunk     | 日本語長文             | 全chunk 4,500バイト以下      |
| AT-09 | chunk     | 絵文字・サロゲート相当 | 文字破損なし                 |
| AT-10 | quota     | 500万文字超過          | 予約拒否                     |
| AT-11 | metadata  | 更新途中               | 読取側に壊れたJSONを見せない |
| AT-12 | cleanup   | 24時間超               | MP3/JSON削除                 |
| AT-13 | cleanup   | 実行中job              | 削除しない                   |
| AT-14 | audio     | 単一Range              | `206` と正しい範囲           |
| AT-15 | auth      | キー不一致             | `401`                        |

### 16.3 API結合テスト

1. テストHTML取得から `ready` までの状態遷移。
2. TTSをmockし、複数チャンクの順序と連結を確認。
3. Google TTS Sandbox/実APIで短文MP3生成を確認。
4. 再起動時に処理中ジョブが `failed` へ回収されることを確認。
5. FastAPI再デプロイ後も24時間以内のMP3を取得できることを確認。
6. 月次カウンターの並行予約で上限を超えないことを確認。

### 16.4 実機受入テスト

Android 10以降とiOS 15以降で次を行う。

| ID    | 操作                         | 期待結果                     |
| ----- | ---------------------------- | ---------------------------- |
| DT-01 | URL入力から生成              | 5分以内に再生可能になる      |
| DT-02 | 再生・一時停止               | 表示と実音声が一致する       |
| DT-03 | ホーム画面へ移動             | 再生継続                     |
| DT-04 | 画面ロック                   | 再生継続                     |
| DT-05 | ロック画面で一時停止・再生   | アプリ状態と同期             |
| DT-06 | イヤホン切断                 | 一時停止                     |
| DT-07 | 着信・他アプリ音声割込み     | OS標準に従い安全に中断・復帰 |
| DT-08 | Wi-Fiからモバイル回線        | 再生が継続または回復可能     |
| DT-09 | 生成中のバックグラウンド移動 | 復帰後に最新状態取得         |
| DT-10 | 24時間経過後の音声           | 配信されず再生成を促す       |

### 16.5 対象記事群

- 短い日本語記事
- 3万文字に近い日本語記事
- 見出しと箇条書きを含む記事
- コードブロックを含む技術記事
- 1〜3回リダイレクトする記事
- JavaScript描画が必須のページ
- ログイン・ペイウォールページ
- private IP、localhost、リンクローカル向けURL

## 17. デプロイ手順

### 17.1 API

1. RailwayサービスをGitHubリポジトリの `api/` へ接続する。
2. `/data` に永続Volumeをマウントする。
3. Google Cloudで専用サービスアカウントを作り、Text-to-Speech利用に必要な最小権限だけを付与する。
4. 環境変数をRailwayへ登録する。
5. DockerfileでPython依存とFFmpegを導入する。
6. `/health` をヘルスチェックへ設定する。
7. デプロイ後に短い日本語記事でスモークテストする。

### 17.2 Android

1. Development Buildで固定MP3のバックグラウンド再生を確認する。
2. Preview環境変数をEASへ設定する。
3. Preview APKをビルドする。
4. Android 10以降の複数端末へ直接配布する。

### 17.3 iOS

1. Apple Developer Program、App Store Connectのアプリを準備する。
2. Development BuildでBackground Audioとロック画面操作を確認する。
3. EASでiOS配布ビルドを作成する。
4. EAS SubmitでApp Store Connectへ送信する。
5. TestFlightで内部テスターへ配布する。

## 18. 完了条件

- 本書記載のモジュール責務とAPI契約が実装されている。
- 要件定義書のAC-01〜AC-10を満たす。
- Android 10以降とiOS 15以降の実機でバックグラウンド・ロック画面再生が成功する。
- SSRF、入力上限、月間上限、24時間削除のテストが成功する。
- Google Cloud認証情報が配布アプリ、ログ、API応答に含まれない。
- 月額費用の警告と生成停止手段が設定されている。

## 19. 参照資料

- [Expo Audio公式ドキュメント](https://docs.expo.dev/versions/latest/sdk/audio/)
- [EAS Build公式ドキュメント](https://docs.expo.dev/build/introduction/)
- [Google Cloud Text-to-Speech料金](https://cloud.google.com/text-to-speech/pricing?hl=ja)
- [Google Cloud Text-to-Speech割り当てと上限](https://docs.cloud.google.com/text-to-speech/quotas)
- [Google Cloud Text-to-Speech日本語音声一覧](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types?hl=ja)
