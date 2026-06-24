# code-read-learning

コード読解学習用の教材を Git 差分から生成する MCP サーバーです。

この MCP はコードの解説を行いません。Git 差分の取得・変更箇所の抽出・読解順の推定に責務を限定し、実際の学習は Cursor AI 側が担当します。

## 機能

### `list_modules`

学習対象プロジェクト内のモジュール一覧を返します。`projectRoot` に開発リポジトリを指定してください。

- `root` — 親リポジトリ（サブモジュール配下を除く）
- サブモジュール — `.gitmodules` から自動検出

### `get_learning_material`

指定した開発リポジトリの Git 差分から、コード読解学習用の教材を生成します。

差分の取得優先順位:

1. `git diff --staged`（ステージ済み変更）
2. `git show HEAD`（最新コミット）

#### 入力

| パラメータ | 必須 | 説明 |
|---|---|---|
| `projectRoot` | 推奨 | 学習対象の開発リポジトリルート（`.git` があるディレクトリ）。MCP のインストール先とは別パスを指定 |
| `module` | 任意 | 学習対象モジュール（`root` またはサブモジュール名）。複数モジュールがある場合に指定 |

`list_modules` も同様に `projectRoot` を受け取ります。

**リポジトリの特定ルール**（`projectRoot` 省略時）:

1. 環境変数 `CODE_READ_LEARNING_CWD`（Git リポジトリの場合）
2. `mcp.json` の `cwd`（Git リポジトリの場合）
3. いずれも Git リポジトリでなければ **探索せず** 選択を要求

> **補足**: 上記の `cwd` は MCP 本体のインストール先ではなく、Cursor が MCP プロセスを起動するときに設定する作業ディレクトリです。開発リポジトリを指すように設定できます。

`projectRoot` が特定できない場合の応答例:

```json
{
  "requiresProjectSelection": true,
  "message": "学習対象の Git リポジトリが特定できません...",
  "hint": "projectRoot パラメータで開発リポジトリのパスを指定してください。",
  "detectedCwd": "/path/to/current/working/directory",
  "envProjectRoot": null
}
```

サブモジュールが存在し `module` が省略された場合:

```json
{
  "requiresModuleSelection": true,
  "availableModules": [
    { "id": "root", "name": "ルート（親リポジトリ）", "path": ".", "type": "root" },
    { "id": "api", "name": "api", "path": "api", "type": "submodule" }
  ],
  "message": "複数のモジュールが見つかりました..."
}
```

#### 出力

```json
{
  "files": ["src/example.ts"],
  "functions": ["renderLayout", "pickLayout"],
  "diff": "...",
  "recommendedOrder": ["pickLayout", "renderLayout"],
  "learningPrompt": "Code Reading Learning Mode\n...",
  "meta": {
    "source": "staged",
    "projectRoot": "/path/to/your-dev-project",
    "module": { "id": "root", "name": "ルート（親リポジトリ）", "path": ".", "type": "root" },
    "availableModules": []
  }
}
```

| フィールド | 説明 |
|---|---|
| `files` | 変更されたファイル一覧 |
| `functions` | 変更対象となった関数・メソッド一覧 |
| `diff` | 生の diff 文字列 |
| `recommendedOrder` | 読解順（呼び出し関係を推定、推定できない場合は変更順） |
| `learningPrompt` | AI 用の学習プロンプト |
| `meta.projectRoot` | 教材を取得した開発リポジトリ |

## セットアップ

### 前提条件

- **Node.js**（v18 以上推奨）
- **Git**（PATH に通されていること）
- **Cursor**（MCP 対応版）

> **注意**: `node_modules/` はリポジトリに含まれません。  
> **`git clone` だけでは使えません。** クローン後に `npm install` と Cursor 設定が必要です。  
> `dist/`（ビルド済み JS）はリポジトリに含まれるため、利用者側での TypeScript ビルドは不要です。

### インストール

```bash
git clone https://github.com/rinkeikai/code-read-learning.git
cd code-read-learning
npm install
```

任意のディレクトリに clone できます。開発中のプロジェクト配下（例: `your-project/tools/code-read-learning`）に置いても構いません。

### Cursor への登録

グローバル設定（`~/.cursor/mcp.json`）またはプロジェクト設定（`.cursor/mcp.json`）に追加します。

`mcp.json.example` をコピーし、パスを自身の環境に合わせて変更してください。

```json
{
  "mcpServers": {
    "code-read-learning": {
      "command": "node",
      "args": ["/path/to/code-read-learning/dist/index.js"],
      "env": {
        "CODE_READ_LEARNING_CWD": "/path/to/your-dev-project"
      }
    }
  }
}
```

| 設定項目 | 説明 |
|---|---|
| `args` | `code-read-learning` を clone した場所の `dist/index.js`（絶対パス） |
| `env.CODE_READ_LEARNING_CWD` | （任意）デフォルトの学習対象リポジトリ。省略時はツールの `projectRoot` で都度指定 |
| `cwd` | （任意）MCP 起動時の作業ディレクトリ。Git リポジトリを指定すれば `projectRoot` 省略時の候補になる |

学習対象は **MCP のインストール先ではなく、開発リポジトリ** です。`projectRoot` パラメータ、`CODE_READ_LEARNING_CWD`、または `cwd` のいずれかで指定してください。

設定後、Cursor を再起動してください。

### ローカル（Windows / macOS）とリモート（SSH）の違い

| 環境 | `mcp.json` の場所 | パスの形式 |
|---|---|---|
| ローカル | `~/.cursor/mcp.json` | OS に応じた絶対パス（例: `C:/...`, `/Users/...`） |
| Remote SSH | **接続先**の `~/.cursor/mcp.json` | リモート OS の絶対パス（例: `/home/user/...`） |

Remote SSH 利用時、ローカル PC 側のパスを `args` に書いても動作しません。

### 動作確認

```bash
cd /path/to/code-read-learning
npm install
ls dist/index.js node_modules/@modelcontextprotocol/sdk/package.json

echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  | node dist/index.js
```

`serverInfo` を含む JSON が返れば MCP サーバーは正常です。

`node_modules` がないと起動直後にプロセスが終了し、Cursor では `Connection closed` と表示されます。

### セットアップ手順まとめ

| 手順 | 必須 | 説明 |
|---|---|---|
| `git clone` | ✅ | ソース + `dist/` を取得 |
| `npm install` | ✅ | 依存関係のインストール |
| `mcp.json` 設定 | ✅ | MCP サーバーの登録 |
| Cursor 再起動 | ✅ | MCP 設定の反映 |
| `~/.cursor/commands/code-read.md` | 任意 | `/code-read` スラッシュコマンドを使う場合 |

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
3. 学習用チャットで `/code-read` を実行、または MCP ツールを直接呼び出す
4. 学習対象リポジトリ（`projectRoot`）を指定
5. サブモジュールがある場合はモジュールを選択
6. MCP が教材を生成
7. AI が Code Reading Learning モードで 1 構文ずつ読解を進める

### 呼び出し例

```
list_modules({ projectRoot: "/path/to/your-dev-project" })

get_learning_material({
  projectRoot: "/path/to/your-dev-project",
  module: "root"
})
```

## エラー時の挙動

- 学習対象リポジトリが特定できない場合 → `requiresProjectSelection`
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
