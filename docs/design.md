# 点字六点入力練習アプリ 設計書

更新日: 2026-09-06  
ステータス: 六点入力・結果表示MVP実装中

## 1. 目的

日本語点字の六点入力を、一般的なキーボードだけで練習できるWebアプリを作る。
F・D・S・J・K・Lキーを同時押しすることで点字1マスを入力し、対応するかなや数字を画面へ表示する。問題文や点の正方形ボタンは置かず、入力結果の確認に集中できる構成とする。

最終的にはGitでソースを管理し、GitHub Actionsから静的Webサイトとしてデプロイする。

## 2. 今回確認した参照プロジェクト

### 2.1 ローカル先

参照したローカルプロジェクト:

`/Users/yutako/Downloads/braille-learning`

確認時点のブランチとコミット:

- ブランチ: `main`
- HEAD: `3ab327d7c30593f94b997b03fa17cd12a17538b0`
- ローカル作業ツリーには既存の変更・未追跡ファイルがあるため、本設計確認では変更していない

### 2.2 Gitリモート

```text
origin  https://github.com/yt1970/braille-learning.git
```

GitHubリポジトリ:

<https://github.com/yt1970/braille-learning>

### 2.3 参照したファイルと確認内容

| ファイル | 確認内容 |
|---|---|
| `docs/braille_data.js` | 優先参照元。点番号、3行2列グリッド、日本語点字パターン、濁音・半濁音・拗音・数字などのデータ |
| `static/braille_data.js` | サーバー配信用データ。`docs/braille_data.js` との同期状態を確認する |
| `static/app.js` | 点字グリッドの描画、既存のクリック式「打つモード」、採点処理 |
| `README.md` | 既存アプリの目的、データソース、技術スタック |
| `.github/workflows/deploy.yml` | 現行のAWS ECSデプロイ構成 |

既存プロジェクトは、現在はHTML/CSS/Vanilla JavaScriptとFastAPIを使った学習アプリである。現行のGitHub ActionsはAWS ECR/ECSへデプロイする構成であり、GitHub Pages用ではない。今回作る練習アプリはサーバー処理を必要としないため、MVPでは静的サイトとしてGitHub Pagesへデプロイする。

## 3. AGENTS.mdの扱い

現在のChatGPTプロジェクトミラーにある `AGENTS.md` の内容は次のとおりである。

```markdown
# ChatGPT project context

This directory is a local mirror of the ChatGPT project “点字六点入力練習アプリ”.

- Treat every file under `sources/` as read-only reference material.
- Do not edit, rename, move, or delete synced project files.
- These files may be replaced the next time a task is created from this ChatGPT project.


## Project instructions

This project has no custom instructions.
```

本設計・実装時のルール:

- `sources/` 配下は参照専用とし、編集・移動・削除・改名をしない。
- 参照プロジェクト `/Users/yutako/Downloads/braille-learning` は今回の確認対象であり、確認のために変更しない。
- `braille-learning` の未コミット変更は既存作業として保持する。
- 新アプリの実装ファイルは `sources/` の外に置く。

## 4. MVPの対象範囲

### 4.1 対象に含めるもの

- 六点入力のキー練習
- 清音46字（あ〜わ行、を、ん）の変換
- 濁音・半濁音・拗音の変換
- 数符に続く数字の変換
- FDSJKLキーの押下中の点番号表示
- キーを離した時点で1マスを確定
- 入力結果と入力履歴の表示
- クリアボタン、Backspace、Escapeによるリセット操作
- GitHub ActionsによるGitHub Pagesデプロイ

### 4.2 MVPでは対象外とするもの

- 点字から日本語への自動翻訳
- IMEを利用したかな入力
- 点字ディスプレイや専用点字キーボードとの接続
- ユーザーアカウント、サーバー保存、ランキング
- 数式・楽譜・専門記号の完全対応
- スマートフォンだけでの六点同時入力

## 5. 点字の基本仕様

### 5.1 点番号と表示グリッド

参照プロジェクトの `braille_data.js` に合わせ、点字1マスを次の3行2列で表現する。

```text
┌─────┬─────┐
│  1  │  4  │  上
├─────┼─────┤
│  2  │  5  │  中
├─────┼─────┤
│  3  │  6  │  下
└─────┴─────┘
 左列    右列
```

内部データは、左上から行優先で次の形にする。

```js
// [[左上,右上],[左中,右中],[左下,右下]]
const cell = [
  [dot1, dot4],
  [dot2, dot5],
  [dot3, dot6],
];
```

### 5.2 六点打ちのキーマッピング

今回の練習アプリでは、読み画面に表示される点の位置と、キーボードのキーの対応を同じにする。
左右を反転しない。

| 点 | 読み画面上の位置 | キー表示 | `KeyboardEvent.code` | 備考 |
|---:|---|---|---|---|
| 1 | 左・上 | F | `KeyF` | 左手人差し指 |
| 2 | 左・中 | D | `KeyD` | 左手中指 |
| 3 | 左・下 | S | `KeyS` | 左手薬指 |
| 4 | 右・上 | J | `KeyJ` | 右手人差し指 |
| 5 | 右・中 | K | `KeyK` | 右手中指 |
| 6 | 右・下 | L | `KeyL` | 右手薬指 |

この対応は一般的なパーキンス式の6点入力、すなわち `F,D,S` が1〜3の点、`J,K,L` が4〜6の点という配置に合わせる。

重要な注意:

- `KeyboardEvent.key` ではなく `KeyboardEvent.code` を使用する。日本語IMEの状態により `key` の値が「あ」などへ変化しても、物理キーの対応を変えないためである。
- 読み画面の点1〜6と入力中の点1〜6を同じ位置に描画する。
- このキーボード入力モードでは、既存コードの `mirrorGrid()` による左右反転を使わない。
- 参照プロジェクトの既存「打つモード」はクリックで点を選ぶ方式であり、FDSJKLのキー入力マッピング自体は実装されていない。

### 5.3 マスク表現

点の組み合わせは、比較しやすいように6ビットの整数で扱う。

```js
// dot n は bit (n - 1) を立てる
const dotToBit = dot => 1 << (dot - 1);
```

代表例:

| 読み | 点 | 入力キー | マスク |
|---|---|---|---:|
| ア | 1 | F | 1 |
| イ | 1・2 | F+D | 3 |
| ウ | 1・4 | F+J | 9 |
| メ | 1・2・3・4・5・6 | F+D+S+J+K+L | 63 |

### 5.4 参照プロジェクトから引き継ぐデータ

既存の `docs/braille_data.js` のパターンを新アプリのデータ作成時の基準にする。`static/braille_data.js` にも同系統のデータがあるが、両ファイルは完全一致しないため、実装開始時にどちらを正本とするかをリポジトリ内で確定する。本設計では、ユーザーが指定した `docs/braille_data.js` を正本候補とする。

- 清音: `SEION`
- 濁音符: 5点
- 半濁音符: 6点
- 拗音符: 4点
- 数符: 3・4・5・6点
- 外字符(アルファベット符): 5・6点
- 特殊符号、数字、句読点、アルファベット、拗音

`docs/braille_data.js` と `static/braille_data.js` の確認時点の差分には、少なくとも次がある。

- `docs/braille_data.js` には `ヂャ`・`ヂュ`・`ヂョ` の拗音定義があるが、`static/braille_data.js` にはない
- 一部の単語・四字熟語の読み表記が異なる

したがって、データをコピーする前に差分をレビューし、採用する読みと点字パターンを決める。差分を自動的に片方へ上書きしない。

現在のMVPでは、`src/braille-map.js` に `docs/braille_data.js` の清音46字を反映している。濁音・半濁音・拗音は符号と清音を続けて入力し、数字は数符の後の数字パターンを数字として解釈する。

数符(点3・4・5・6)は数列の先頭に1回入力すればよく、数字以外のマスが入力されるまで数字モードを継続する(例: 数符→1→2→3→わ、で「123わ」となり、桁ごとに数符を打ち直す必要はない)。

長音符(ー、点2・5)は独立した1マスとして「ー」を出力する。濁音符等と異なり、後続マスの入力を必要としない。

外字符(点5・6)は、数符と同様にアルファベットの先頭に1回入力すればよく、アルファベット以外のマスが入力されるまでモードを継続する(例: 外字符→c→a→t→わ、で「catわ」となる)。アルファベット自体は国際点字と共通のパターン(a=点1、b=点1・2、c=点1・4…)を採用し、小文字として出力する。大文字符(点6単独)は今回のMVPでは未対応。

## 6. 入力動作仕様

### 6.1 1マスの確定

六点入力は複数キーをほぼ同時に押すコード入力とする。実装では、キーが完全に同時に届くことを要求せず、キー押下が重なっている間を同じ1マスとして扱う。

1. FDSJKLのいずれかが押されたら、現在のコード入力を開始する。
2. 押されたキーの点を `pressedDots` に追加する。
3. 他の点字キーが押されている間は、同じ `pressedDots` に追加する。
4. 点字キーがすべて離されたら、その組み合わせを1マスとして確定する。
5. 正解配列の次のマスへ進む。

```js
const DOT_KEY_CODES = {
  KeyF: 1,
  KeyD: 2,
  KeyS: 3,
  KeyJ: 4,
  KeyK: 5,
  KeyL: 6,
};
```

`keyup` の順番に依存せず、最後の点字キーが離されたときに確定する。

### 6.2 入力結果

- 1マスの入力確定ごとに、対応するかな・数字を結果へ追加する。
- 不明な点の組み合わせは `？` と表示する。
- 入力中は押下中の点番号を表示する。
- 問題文、点の正方形ボタン、点字グリッドは表示しない。
- キーボード六点入力では、1マス内の点の左右を反転しない。

### 6.3 取り消しとリセット

- `Backspace`: 最後に確定した1マスを削除する。
- `Escape`: 入力結果をすべて消去する。
- 画面の「入力をクリア」ボタン: 入力結果、保留中の符号、数字モードをすべて消去する。
- 点字キー以外の通常キーは、練習画面の入力フォーカス中でも無視する。
- `keydown` の `event.repeat` は無視する。
- `window.blur` または `visibilitychange` 時に `pressedDots` を空にして、押下状態が残らないようにする。

### 6.4 入力中の表示

入力中は、押下されている点番号をテキストで表示する。

- 押下中: `点 1・2 ... を入力中`
- 濁音・半濁音・拗音の符号入力後: 次に必要な入力を案内
- 数符入力後: 数字モードを表示(数字以外のマスが入力されるまで継続)
- 外字符入力後: アルファベットモードを表示(アルファベット以外のマスが入力されるまで継続)
- 長音符は単独で確定し、モード表示は発生しない

## 7. 画面仕様

### 7.1 現在の画面

- アプリ名
- F・D・S・J・K・Lの操作案内
- 現在入力中の点番号
- 変換結果
- 入力履歴
- 入力をクリアするボタン

### 7.2 練習画面

将来拡張。問題文、出題レベル、正誤判定、スコアなどを追加する。

### 7.3 結果画面

将来拡張。練習モード追加時に設計する。

## 8. データ設計

```ts
type BrailleCellMask = number; // 0〜63

type Question = {
  id: string;
  level: 'seion' | 'dakuon' | 'handakuon' | 'youon' | 'word' | 'number' | 'kigo';
  display: string;
  meaning?: string;
  answer: BrailleCellMask[];
};

type QuizState = {
  questions: Question[];
  questionIndex: number;
  enteredCells: BrailleCellMask[];
  pressedDots: Set<number>;
  correct: number;
  incorrect: number;
  answered: boolean;
};
```

点字の原データは、画面描画用の2次元配列と採点用のマスクを相互変換できる形にする。出題データに同じ点字パターンを重複記述せず、点番号配列から生成する。

```js
const dots = [1, 2, 4];
const mask = dots.reduce((value, dot) => value | (1 << (dot - 1)), 0);
```

## 9. 推奨フォルダー構成

現在のMVPは次の最小構成で実装している。`src/braille-map.js` は参照データから整理した変換表、`src/app.js` は入力状態と表示を担当する。

```text
braille-six-input/
├── docs/
│   └── design.md
├── src/
│   ├── app.js
│   ├── braille-map.js
│   └── style.css
├── index.html
├── package.json
├── README.md
└── .gitignore
```

ビルドツールを使わないVanilla JavaScript構成とし、ブラウザのES Modulesで読み込む。問題・採点機能を追加する段階で `tests/`、デプロイ時に `.github/workflows/` を追加する。

## 10. アーキテクチャ

```text
KeyboardEvent
    │
    ▼
app.js
    │  KeyF/KeyD/KeyS/KeyJ/KeyK/KeyL
    │  pressedDots → cell mask → braille-map.js
    ▼
表示状態
    │
    ├── compositionText  入力中の点・符号・数字モード
    ├── outputText       変換結果
    └── historyText      入力履歴
```

点字データと入力処理を分離し、将来問題・採点を追加してもマッピングを変更せずに済むようにする。

## 11. 採点仕様

### 11.1 1マス問題

将来の問題モードで使用する。入力されたマスクと正解マスクが一致したら正解とする。

### 11.2 複数マス問題

次のすべてを満たす場合に正解とする。

- 入力マス数と正解マス数が一致
- 各マスのマスクが左から順に一致

余分なマスを入力した場合も不正解とし、正解との差分を表示する。

### 11.3 誤答表示

- 誤ったマスを不正解色で表示
- 正解の点番号を表示
- 正解の点字グリッドを表示
- 「もう一度」または「次へ」を選択できる

## 12. テスト仕様

### 12.1 マッピング単体テスト

- `KeyF` が点1になる
- `KeyD` が点2になる
- `KeyS` が点3になる
- `KeyJ` が点4になる
- `KeyK` が点5になる
- `KeyL` が点6になる
- 日本語IMEの影響を受けず `code` で判定できる
- 未対応キーが点字マスクへ入らない

### 12.2 入力状態テスト

- Fの押下・解放で点1の1マスが確定する
- Fを押したままJを押し、すべて解放すると点1・4が確定する
- 6キーを重ねて押すと点1〜6が確定する
- `event.repeat` で同じ点が重複しない
- フォーカス喪失後に押下状態が残らない
- Backspaceで最後のマスを削除できる
- Escapeで現在の入力を消去できる

### 12.3 代表的な受け入れテスト

| 操作 | 期待結果 |
|---|---|
| 「ア」でFだけを押して離す | 点1のマスとして正解 |
| 「イ」でF+Dを重ねて押して離す | 点1・2のマスとして正解 |
| 「ウ」でF+Jを重ねて押して離す | 点1・4のマスとして正解 |
| 読み画面の左上点と入力画面の左上点を比較 | どちらも点1、左右反転なし |
| 日本語IMEをオンにしてFを押す | `KeyF` として点1を入力 |
| 複数マスの読みを順番に入力 | 表示順どおりにマスが追加される |

## 13. Git管理とGitHub Actions

### 13.1 ブランチ運用

- `main`: デプロイ対象
- `feature/*`: 機能開発
- 変更はPull Request経由で `main` に取り込む
- `main`へのpush時にCIとデプロイを実行する

### 13.2 CI

CIでは次を確認する。

- JavaScriptの構文チェック
- 単体テスト
- ビルドまたは静的ファイル生成
- `index.html` が存在すること

### 13.3 GitHub Pagesデプロイ

静的サイトとして、GitHub公式のPages用Actionsを使用する。

想定フロー:

1. `actions/checkout` でソース取得
2. 必要ならNode.jsをセットアップ
3. 依存関係をインストール
4. テストとビルドを実行
5. `dist/` またはリポジトリ直下の静的ファイルをPages artifactとしてアップロード
6. `actions/deploy-pages` でデプロイ

GitHubリポジトリ設定で、Pagesの公開元を「GitHub Actions」に設定する。

既存 `braille-learning` のAWS ECS用 `deploy.yml` は、AWS認証情報・ECR・ECSクラスターを前提とするため、このアプリのGitHub Pagesデプロイにはそのまま使用しない。

## 14. 実装フェーズ

### Phase 1: 土台

- フォルダーとHTML/CSS/JavaScriptを作成（完了）
- 点番号とFDSJKLマッピングを定数化（完了）
- 結果表示画面を作成（完了）

### Phase 2: 六点入力エンジン

- `keydown` / `keyup` を実装（完了）
- 押下中の点番号を表示（完了）
- 全キー解放時にマスクを確定（完了）
- クリアボタン、Backspace、Escape、フォーカス喪失処理を追加（完了）

### Phase 3: 練習機能

- 清音46字、濁音・半濁音・拗音、数字データを登録（完了）
- 出題、採点、結果画面を実装
- 不正解問題の再挑戦を実装

### Phase 4: 拡張データ

- 記号
- 単語
- 問題モード

### Phase 5: 品質と公開

- 単体テストと受け入れテスト
- キーボード操作・スクリーンリーダー向け確認
- GitHub Actions CI
- GitHub Pagesデプロイ

## 15. 未決定事項

- 問題数と出題順を固定するか、毎回シャッフルするか
- 1回の練習セットの問題数
- 正誤判定を自動にするか、判定ボタンを残すか
- 点字キー以外のショートカットキー
- 日本語の句読点・長音・数符を含む短文データの確定
- 将来、パーキンス式以外のキー配列を選択可能にするか

ただし、次の2点は確定仕様とする。

1. `F=D?` のような文字列キーではなく、F・D・S・J・K・Lをそれぞれ点1〜6へ割り当てる。
2. 六点入力時の点の位置は、読み画面と同じであり、左右反転しない。

## 16. 参考資料

### ローカル参照

- `/Users/yutako/Downloads/braille-learning/README.md`
- `/Users/yutako/Downloads/braille-learning/docs/braille_data.js`（優先参照元候補）
- `/Users/yutako/Downloads/braille-learning/static/braille_data.js`（比較対象）
- `/Users/yutako/Downloads/braille-learning/static/app.js`
- `/Users/yutako/Downloads/braille-learning/.github/workflows/deploy.yml`

### 外部資料

- [EXTRA for Windows Version 6 マニュアル](https://extra-web-data.s3.ap-northeast-1.amazonaws.com/extra/6.0/EXTRA6_Manual.pdf) — 6点凸(FDSJKL)の点番号対応と、押下開始から最後のキーを離すまでを1点字とする入力仕様
- [BMスマート USBキーボードからの6点入力操作](https://www.kgs-jpn.co.jp/wp/wp-content/uploads/2025/06/bms16_manual.3.0_html/usage/Usb6DotsInput.html) — パーキンス式のF・D・S／J・K・L対応とマス確定操作
- [CyberLibrarian 点字表](https://www.asahi-net.or.jp/~ax2s-kmtn/ref/braille_jsyll.html) — 参照プロジェクトREADMEに記載された日本語点字データの資料
