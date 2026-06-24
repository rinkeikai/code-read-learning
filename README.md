# code-read-learning

コード読解学習用の教材を Git 差分から生成する MCP サーバーです。

この MCP はコードの解説を行いません。Git 差分の取得・変更箇所の抽出・読解順の推定に責務を限定し、実際の学習は Cursor AI 側が担当します。

## 機能

### `list_modules`

プロジェクト内の学習対象モジュール一覧を返します。`projectRoot` に開発リポジトリを指定してください。

- `root` — 親リポジトリ（サブモジュール配下を除く）
- サブモジュール — `.gitmodules` から検出（例: `luna`, `tokuto`）

### `get_learning_material`

以下の優先順位で教材を取得します。

1. `git diff --staged`（ステージ済み変更）
2. `git show HEAD`（最新コミット）

#### 入力

| パラメータ | 必須 | 説明 |
|---|---|---|
| `projectRoot` | 推奨 | 学習対象の開発リポジトリルート。MCP のインストール先とは別パスを指定 |
| `module` | 任意 | 学習対象モジュール（`root`, `luna` など）。サブモジュールがある場合に指定 |

**リポジトリの特定ルール**（`projectRoot` 省略時）:

1. 環境変数 `CODE_READ_LEARNING_CWD`（Git リポジトリの場合）
2. MCP 起動時の `cwd`（Git リポジトリの場合）
3. いずれも Git リポジトリでなければ **探索せず** 選択を要求

```json
{
  "requiresProjectSelection": true,
  "message": "学習対象の Git リポジトリが特定できません...",
  "hint": "projectRoot パラメータで開発リポジトリのパスを指定してください。例: /home/gs/gsmcu-livekit",
  "detectedCwd": "/home/gs",
  "envProjectRoot": null
}
```

サブモジュールが存在し `module` が省略された場合は、教材の代わりにモジュール選択を要求します。

```json
{
  "requiresModuleSelection": true,
  "availableModules": [
    { "id": "root", "name": "ルート（親リポジトリ）", "path": ".", "type": "root" },
    { "id": "luna", "name": "luna", "path": "luna", "type": "submodule" }
  ],
  "message": "複数のモジュールが見つかりました..."
}
```

#### 出力

```json
{
  "files": ["src/example.ts"],
  "functions": ["#pickLayoutForRender", "renderLayout"],
  "diff": "...",
  "recommendedOrder": ["#pickLayoutForRender", "renderLayout"],
  "learningPrompt": "Code Reading Learning Mode\n...",
  "meta": {
    "source": "staged",
    "projectRoot": "/path/to/repo",
    "module": { "id": "luna", "name": "luna", "path": "luna", "type": "submodule" },
    "availableModules": []
  }
}
```

- `files`: 変更されたファイル一覧
- `functions`: 変更対象となった関数・メソッド一覧
- `diff`: 生の diff 文字列
- `recommendedOrder`: 読解順（呼び出し関係を推定、推定できない場合は変更順）
- `learningPrompt`: AI 用の学習プロンプト

## セットアップ

### 前提条件

- **Node.js**（v18 以上推奨）
- **Git**（PATH に通されていること）
- **Cursor**（MCP 対応版）

> **注意**: `node_modules/` はリポジトリに含まれません。  
> **`git clone` だけでは使えません。** クローン後に `npm install` と Cursor 設定が必要です。  
> `dist/`（ビルド済み JS）はリポジトリに含まれるため、リモート環境での TypeScript ビルドは不要です。

### リモート SSH 環境（review-bridge-mcp と同じ使い方）

[review-bridge-mcp](../review-bridge-mcp) と同様、開発プロジェクトの `claude-knowledge/` 配下に置いて使う構成を推奨します。

```bash
# 例: loopgate_dev を clone 済みの場合
cd ~/loopgate_dev/claude-knowledge
git clone https://github.com/rinkeikai/code-read-learning.git
cd code-read-learning
npm install
```

動作確認:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  | node dist/index.js
```

`serverInfo` を含む JSON が返れば OK です。

#### リモートの `~/.cursor/mcp.json`

**SSH 接続先（Linux）の** `~/.cursor/mcp.json` に設定します。Windows 側のパスは使えません。

`mcp.json.example` を参照し、パスを環境に合わせて変更してください。

```json
{
  "mcpServers": {
    "code-read-learning": {
      "command": "node",
      "args": [
        "/home/gs/loopgate_dev/claude-knowledge/code-read-learning/dist/index.js"
      ],
      "env": {
        "CODE_READ_LEARNING_CWD": "/home/gs/loopgate_dev"
      }
    }
  }
}
```

| 設定項目 | 説明 |
|---|---|
| `args` | clone 先の `dist/index.js` の**リモート絶対パス** |
| `CODE_READ_LEARNING_CWD` | （任意）デフォルトの学習対象リポジトリ。省略時はツールの `projectRoot` で指定 |

`cwd` は MCP 起動ディレクトリです。学習対象は **`projectRoot` パラメータ** または `CODE_READ_LEARNING_CWD` で指定してください。MCP のインストール先を自動探索しません。

設定後、Cursor を再起動してください。

#### review-bridge-mcp との比較

| 項目 | review-bridge-mcp | code-read-learning |
|---|---|---|
| 配置場所 | `claude-knowledge/review-bridge-mcp` | `claude-knowledge/code-read-learning` |
| clone 後の作業 | `npm install` → `npm run build` | `npm install` のみ（`dist/` 同梱） |
| 学習対象の指定 | 不要 | `CODE_READ_LEARNING_CWD` で指定 |

#### リモートで Connection closed になる場合

```bash
cd ~/code-read-learning   # または claude-knowledge/code-read-learning
npm install
ls -la dist/index.js
ls node_modules/@modelcontextprotocol/sdk/package.json
```

`node_modules` が無いと起動直後に落ち、`Connection closed` になります。

### 他の環境で初めて使う場合

```bash
git clone https://github.com/rinkeikai/code-read-learning.git
cd code-read-learning
npm install
```

続いて Cursor の MCP 設定（`~/.cursor/mcp.json`）に追加します。パスは clone 先に合わせて変更してください。

```json
{
  "mcpServers": {
    "code-read-learning": {
      "command": "node",
      "args": ["/path/to/code-read-learning/dist/index.js"],
      "env": {
        "CODE_READ_LEARNING_CWD": "/path/to/your/project"
      }
    }
  }
}
```

| 手順 | 必須 | 説明 |
|---|---|---|
| `git clone` | ✅ | ソース + `dist/` を取得 |
| `npm install` | ✅ | 依存関係のインストール |
| `mcp.json` 設定 | ✅ | MCP サーバーの登録 |
| Cursor 再起動 | ✅ | MCP 設定の反映 |
| `~/.cursor/commands/code-read.md` | 任意 | `/code-read` スラッシュコマンドを使う場合 |

**重要**: 学習対象リポジトリは `CODE_READ_LEARNING_CWD` で指定してください。

### 依存関係のインストール（既に clone 済みの場合）

```bash
cd code-read-learning
npm install
```

### ビルド（開発者向け・src 変更後）

```bash
npm run build
git add dist/
git commit -m "build: update dist"
```

利用者はビルド不要です。`src/` を変更した開発者が `dist/` を更新して push してください。

## ローカル実行

```bash
npm run build
npm start
```

stdio トランスポートで起動します。通常は Cursor から利用します。

## 想定利用フロー

1. 開発チャットで Agent が実装を行う
2. 実装完了後にコミット（または `git add` でステージ）
3. 学習用の固定チャットで `/code-read` を実行
4. サブモジュールがある場合はモジュールを選択
5. MCP が教材を生成
6. AI が Code Reading Learning モードで 1 構文ずつ読解を進める

### モジュール選択の例

```
list_modules({ projectRoot: "/home/gs/gsmcu-livekit" })
get_learning_material({ projectRoot: "/home/gs/gsmcu-livekit", module: "luna" })
```

## エラー時の挙動

- Git リポジトリでない場合
- ステージ済み変更も最新コミットもない場合
- `git` コマンドが見つからない場合

いずれも分かりやすい日本語メッセージを返します。

## 将来拡張（未実装）

- `get_learning_material_staged` — `git diff --staged` 専用
- `get_learning_material_commit` — 指定コミット
- `get_learning_material_file` — 指定ファイル
- `get_learning_material_function` — 指定関数

## ライセンス

ISC
