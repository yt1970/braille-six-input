# 点字六点入力練習アプリ

日本語点字の六点入力を、F・D・S・J・K・Lのキーボードで練習するWebアプリです。

## いまの構成

- `index.html`: 画面の入口
- `src/app.js`: FDSJKLの同時押し判定と結果表示
- `src/braille-map.js`: 清音46字、濁音・半濁音・拗音、数字の点字マッピング
- `src/style.css`: 見た目
- `docs/design.md`: 設計書

## 起動

```bash
npm run start
```

ブラウザで `http://localhost:4173` を開きます。

## 現在できること

- 清音46字をかなへ変換
- 濁音・半濁音・拗音を符号付きで変換
- 数符の後の点字を数字へ変換
- クリアボタン、Backspace、Escapeで入力を消去

## 今後やること

- GitHub Actionsによる静的デプロイ
- 問題文・正誤表示・スコア管理
