# code-read-learning

コード読解学習用の教材を Git 差分から生成する MCP サーバーです。

この MCP はコードの解説を行いません。Git 差分の取得・変更箇所の抽出・読解順の推定に責務を限定し、実際の学習は Cursor AI 側が担当します。

## 機能

### `list_modules`

プロジェクト内の学習対象モジュール一覧を返します。

- `root` — 親リポジトリ（サブモジュール配下を除く）
- サブモジュール — `.gitmodules` から検出（例: `luna`, `tokuto`）

### `get_learning_material`

以下の優先順位で教材を取得します。

1. `git diff --staged`（ステージ済み変更）
2. `git show HEAD`（最新コミット）

#### 入力

| パラメータ | 必須 | 説明 |
|---|---|---|
| `module` | 任意 | 学習対象モジュール（`root`, `luna` など）。サブモジュールがある場合に指定 |

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
    "workingDirectory": "/path/to/repo",
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
- **Git**（PATH に通っていること）
- **Cursor**（MCP 対応版）

> **注意**: このリポジトリには `dist/` と `node_modules/` は含まれていません（`.gitignore` 対象）。  
> **`git clone` だけでは使えません。** クローン後に `npm install` と Cursor 設定が必要です。

### 他の環境で初めて使う場合

```bash
git clone https://github.com/rinkeikai/code-read-learning.git
cd code-read-learning
npm install
```

`npm install` 実行時に `prepare` スクリプトが走り、自動で `npm run build`（TypeScript コンパイル）が行われ、`dist/index.js` が生成されます。

続いて Cursor の MCP 設定（`~/.cursor/mcp.json`）に追加します。パスは clone 先に合わせて変更してください。

```json
{
  "mcpServers": {
    "code-read-learning": {
      "command": "node",
      "args": ["/path/to/code-read-learning/dist/index.js"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

| 手順 | 必須 | 説明 |
|---|---|---|
| `git clone` | ✅ | ソースを取得 |
| `npm install` | ✅ | 依存関係のインストール + ビルド（`prepare` 経由） |
| `mcp.json` 設定 | ✅ | MCP サーバーの登録 |
| Cursor 再起動 | ✅ | MCP 設定の反映 |
| `~/.cursor/commands/code-read.md` | 任意 | `/code-read` スラッシュコマンドを使う場合 |

**重要**: `cwd` を学習対象の Git リポジトリルートに設定してください。

環境変数 `CODE_READ_LEARNING_CWD` を指定した場合は、そちらが `cwd` より優先されます。

### 依存関係のインストール（既に clone 済みの場合）

```bash
cd code-read-learning
npm install
```

### ビルド（ソース変更後など）

```bash
npm run build
```

`npm install` 済みであれば、通常は `prepare` によりビルド済みです。`src/` を編集した場合のみ再ビルドしてください。

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
list_modules → luna, tokuto, root を確認
get_learning_material({ module: "luna" }) → luna サブモジュールの差分で学習
get_learning_material({ module: "root" }) → 親リポジトリ直下のみ
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
