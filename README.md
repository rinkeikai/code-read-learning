# code-read-learning

コード読解学習用の教材を Git 差分から生成する MCP サーバーです。

この MCP はコードの解説を行いません。Git 差分の取得・変更箇所の抽出・読解順の推定に責務を限定し、実際の学習は Cursor AI 側が担当します。

## 機能

### `get_learning_material`

入力なしで、以下の優先順位で教材を取得します。

1. `git diff --staged`（ステージ済み変更）
2. `git show HEAD`（最新コミット）

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
    "workingDirectory": "/path/to/repo"
  }
}
```

- `files`: 変更されたファイル一覧
- `functions`: 変更対象となった関数・メソッド一覧
- `diff`: 生の diff 文字列
- `recommendedOrder`: 読解順（呼び出し関係を推定、推定できない場合は変更順）
- `learningPrompt`: AI 用の学習プロンプト

## セットアップ

### 1. 依存関係のインストール

```bash
cd code-read-learning
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. Cursor への登録

Cursor の MCP 設定（`~/.cursor/mcp.json` またはプロジェクトの `.cursor/mcp.json`）に追加します。

```json
{
  "mcpServers": {
    "code-read-learning": {
      "command": "node",
      "args": ["C:/Users/kh000576/MCP/code-read-learning/dist/index.js"],
      "cwd": "C:/path/to/your/project"
    }
  }
}
```

**重要**: `cwd` を学習対象の Git リポジトリルートに設定してください。

環境変数 `CODE_READ_LEARNING_CWD` を指定した場合は、そちらが `cwd` より優先されます。

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
4. MCP が教材を生成
5. AI が Code Reading Learning モードで 1 構文ずつ読解を進める

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
