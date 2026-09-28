# Live Bridge

Ableton LiveをCodex / AntigravityなどのMCPクライアントから操作するための、Max for LiveデバイスとRemote Scriptです。

![Live Bridge mascot](assets/bridge-mascot.png)

MCPサーバー v0.6 / Maxデバイス v0.5。Windows・Live 11.3.43で既存実装を検証しています。このリポジトリの生成版デバイスは構造検証済みですが、Liveへの読み込みは別途確認が必要です。

## できること

- トラック・クリップ・MIDIノートの読み取り、ノートのピッチ変更と条件付き復元
- 再生・停止、区間試聴、テンポ・拍子の現在値変更
- 音量・パン・センド、ミュート・ソロ、Liveに公開されたデバイスパラメーターの操作
- Remote Scriptによるプラグイン検索、Waves L2 Mono / Stereoの末尾挿入
- デバイス内のSETUP・HELP。MIDI版とAudio版のどちらか1個でSet全体を操作

## セットアップ

Node.js 20以上、Max for Liveを利用できるLive環境が必要です。L2を使う場合はWaves L2のインストールとライセンスも必要です。製品本体は含みません。

```sh
git clone https://github.com/aoe1928/live-bridge.git
cd live-bridge
npm run build
npm test
```

追加のnpm依存パッケージはありません。`dist`にPC専用のトークンと実行ファイルが生成されます。再ビルドは既存のトークンを維持します。

1. `dist/Live Bridge MIDI.amxd`を音源より前、または`dist/Live Bridge Audio.amxd`を音源より後・オーディオ・リターン・マスターに挿します。Set内に1個だけ配置してください。
2. 生成版はFreezeしていません。`.amxd`、`live-api.js`、`bridge-mascot.png`を同じフォルダーに保ちます。単一ファイルで使う場合はMaxで依存ファイルを確認してFreezeしてください。生成物にはトークンが含まれるため公開しないでください。
3. デバイスのSETUPから接続プロンプトをAIへ渡すか、以下のSTDIO MCPを登録します。実際の絶対パスに置き換えてください。

```json
{
  "mcpServers": {
    "ableton_live": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/live-bridge/dist/server.cjs"]
    }
  }
}
```

4. MCPを再接続し、`live_status`と`live_list_tracks`で確認します。L2挿入を使う場合は[ブラウザー連携](docs/ブラウザー連携.md)も設定します。

WindowsではJSON内のパスを`C:/...`形式にすると記述しやすくなります。SETUPはプロンプトを表示するだけで、設定を自動変更しません。現在の会話でツールが更新されない場合はクライアント側の再接続が必要です。

## 新しいMIDIクリップの作成

live_create_clipでノート配列からSessionクリップを作成し、任意の拍位置にArrangementへ配置できます。[引数・例・制限](docs/create-clip.md)を参照してください。

## 構成

```text
MCPクライアント → STDIO MCPサーバー
                  ├ UDP/OSC → Max for Live → MIDI・ミキサー・曲設定
                  └ UDP     → Remote Script → プラグイン検索・L2挿入
```

Max側は17831/17832、Remote Scriptは127.0.0.1:17833を使います。ルーターのポート開放は不要です。Max側の受信はloopback専用ではありません。共有トークンによる認証を行いますが暗号化通信ではないため、外部ネットワークへ公開しないでください。

## 制限

- Live 1台・Set内のMaxデバイス1個を前提とします。複数クライアントは同じサーバーフォルダーを使用し、変更を順番に実行します。
- 値の変更とL2挿入は停止中のみ。セッションや変更前の値・チェーンを照合します。
- パラメーターの値はAPIの単位です。音量0〜1をdBとみなさないでください。
- プラグインの内部UIや非公開パラメーターは操作できません。MIDIループのノート変更は繰り返し全体に反映されます。
- L2以外の挿入、Rack内部への挿入、Set自動保存、プラグイン挿入の自動復元は未対応です。
- Remote ScriptはLiveのバージョンに依存します。Antigravityアプリ内での認識は未検証です。

## 開発と公開物

`src`が実装、`device`が編集可能なMaxパッチ、`scripts/build.cjs`がローカル生成処理です。変更後はビルドし直してLiveでデバイスを再読み込みします。Remote Script更新後は再インストールとLive再起動が必要です。

設定、トークン、生成した.amxd、Live Set、作業履歴はGitに含めません。実機試験ではトラック末尾へのL2挿入・既存チェーン維持・重複拒否・MIDI編集結果の維持を確認しました。CIはLiveを起動せず、生成物とMCPのツール定義を検証します。

現時点では再利用ライセンスを設定していません。キャラクター画像を含め、公開されていること自体は再配布許諾を意味しません。
