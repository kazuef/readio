# YOMIMIMI

公開されている日本語記事のURLを音声へ変換し、スマートフォンで聴くためのMVPです。UIは `lp/lp.html` のラベンダー、紫、ミントを基調にしたデザインをモバイル向けに展開しています。

## 構成

- `mobile/`: Expo / React Native アプリ。URL入力、進捗表示、再生・一時停止、バックグラウンド再生を担当します。
- `api/`: FastAPI。URL安全性検証、記事抽出、Google Cloud TTS、MP3保存・Range配信、24時間削除を担当します。
- `docs/`: 要件定義・基本設計・詳細設計。

## ローカル起動

### API

Python 3.12とFFmpegが必要です。

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -e '.[test]'
cp .env.example .env
# .env の認証情報・MVPアクセスキー・保存先を設定
uvicorn app.main:app --reload
```

テストは `pytest` で実行できます。

### モバイル

```bash
cd mobile
npm install
cp .env.example .env
# API URLと同じMVPアクセスキーを設定
npx expo start
```

バックグラウンド再生はネイティブ設定を使うため、Expo GoではなくDevelopment BuildまたはEAS Buildで確認してください。Expo SDK 55はNode.js 20.19.4以上が必要です。

## 本番配置

Railwayでは `api/` をサービスルートにし、`/data` へ永続Volumeをマウントします。Google Cloud Text-to-SpeechのサービスアカウントJSONとMVPアクセスキーはサーバー環境変数にだけ保存してください。AndroidはEASの `preview`、iOSは `testflight` プロファイルを使用します。

生成音声とメタデータは24時間で削除されます。記事本文は永続保存しません。
