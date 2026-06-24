# セットアップ

code-read-learning を Cursor で使い始めるための手順です。

## 前提条件

- **Node.js**（v18 以上推奨）
- **Git**（PATH に通されていること）
- **Cursor**（MCP 対応版）

> **注意**
>
> - `node_modules/` はリポジトリに含まれません
> - **`git clone` だけでは使えません** — クローン後に `npm install` が必要です
> - `dist/`（ビルド済み JS）は同梱されているため、利用者側での TypeScript ビルドは不要です

## インストール

```bash
git clone https://github.com/rinkeikai/code-read-learning.git
cd code-read-learning
npm install
```

任意のディレクトリに clone できます。開発プロジェクト配下（例: `your-project/tools/code-read-learning`）に置いても構いません。

## Cursor への登録

グローバル設定（`~/.cursor/mcp.json`）またはプロジェクト設定（`.cursor/mcp.json`）に追加します。

リポジトリ付属の [`mcp.json.example`](./mcp.json.example) を参考に、パスを自身の環境に合わせて変更してください。

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
| `env.CODE_READ_LEARNING_CWD` | （任意）実装を行った開発リポジトリ。省略時はツールの `projectRoot` で都度指定 |
| `cwd` | （任意）MCP 起動時の作業ディレクトリ。Git リポジトリを指定すれば `projectRoot` 省略時の候補になる |

読解対象は **MCP のインストール先ではなく、自分が実装した開発リポジトリ** です。

設定後、**Cursor を再起動**してください。

## ローカルと Remote SSH

| 環境 | `mcp.json` の場所 | パスの形式 |
|---|---|---|
| ローカル | `~/.cursor/mcp.json` | OS に応じた絶対パス（例: `C:/...`, `/Users/...`） |
| Remote SSH | **接続先**の `~/.cursor/mcp.json` | リモート OS の絶対パス（例: `/home/user/...`） |

Remote SSH 利用時、ローカル PC 側のパスを `args` に書いても動作しません。

## 動作確認

```bash
cd /path/to/code-read-learning
npm install
ls dist/index.js node_modules/@modelcontextprotocol/sdk/package.json

echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  | node dist/index.js
```

`serverInfo` を含む JSON が返れば MCP サーバーは正常です。

## `/code-read` スラッシュコマンド（任意）

学習チャットで `/code-read` を使う場合は、Cursor のコマンドディレクトリにプロンプトを配置します。

- グローバル: `~/.cursor/commands/code-read.md`
- プロジェクト: `.cursor/commands/code-read.md`

## MCP ツール

### `list_modules`

実装した変更があるプロジェクト内のモジュール一覧を返します。

| パラメータ | 必須 | 説明 |
|---|---|---|
| `projectRoot` | 推奨 | 実装を行った開発リポジトリルート |

### `get_learning_material`

自分の実装差分から、読解セッションを開始するための情報を返します。

| パラメータ | 必須 | 説明 |
|---|---|---|
| `projectRoot` | 推奨 | 実装を行った開発リポジトリルート |
| `module` | 任意 | 読解対象モジュール（`root` またはサブモジュール名） |

**差分の取得優先順位**

1. `git diff --staged`（ステージ済みの自分の変更）
2. `git show HEAD`（直近コミットの自分の変更）

**`projectRoot` 省略時の特定ルール**

1. 環境変数 `CODE_READ_LEARNING_CWD`（Git リポジトリの場合）
2. `mcp.json` の `cwd`（Git リポジトリの場合）
3. いずれも Git リポジトリでなければ探索せず `requiresProjectSelection` を返す

### 呼び出し例

実装・コミット（または `git add`）後に:

```
list_modules({ projectRoot: "/path/to/your-dev-project" })

get_learning_material({
  projectRoot: "/path/to/your-dev-project",
  module: "root"
})
```

## トラブルシューティング

### `Connection closed` になる

起動直後にプロセスが終了している可能性があります。

```bash
cd /path/to/code-read-learning
npm install
ls -la dist/index.js
ls node_modules/@modelcontextprotocol/sdk/package.json
```

よくある原因:

- `npm install` 未実行（`node_modules` がない）
- `args` のパスが実際の clone 先と一致しない
- Remote SSH でローカル側のパスを指定している

### `Cannot find module '.../dist/index.js'`

`mcp.json` の `args` を、実際に clone したディレクトリの絶対パスに修正してください。

### `requiresProjectSelection` が返る

`projectRoot` に、実装を行った開発リポジトリのパスを指定してください。MCP のインストール先ではありません。

### 読解する差分がない

対象リポジトリで変更をステージするか、コミットを作成してください。

```bash
git add .
# または
git commit -m "your message"
```

## 開発者向け（src 変更後）

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

---

[README に戻る](./README.md)
