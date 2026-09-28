# Live Bridge

Ableton LiveをCodex / AntigravityなどのMCPクライアントから操作するための、Max for LiveデバイスとRemote Scriptです。

![Live Bridge mascot](assets/bridge-mascot.png)

MCPサーバー・Maxデバイスともv0.8。JSと画像は.amxdへ同梱されます。Windows・Live 11で並び替えショートカットを確認済み。Macはキー定義・共通ロジックの自動テストのみで、実機未検証です。トラック名・色・新しいクリップ作成の書き込み確認は自動テストのみです。

## v0.8の追加機能

Windows（Ctrl）／Mac（Command）に対応した[トラック並び替えワークフロー](docs/track-reorder.md)を追加。MCPで順序を取得・準備し、**同じPCの画面操作ができるAI**が1回キー操作した後、MCPで全トラックの順序と所属を検証します。MCPサーバー単体ではキーを送信しません。通常の名前・色・MIDI編集などは引き続き画面操作不要です。

## v0.7の追加機能

トラック名変更・パレットによる色変更を追加しました。[使用例と安全チェック](docs/track-appearance.md)。既存クリップの色やトラックの並び順は変更しません。

## できること

- トラック・クリップ・MIDIノートの読み取り、ノートのピッチ変更と条件付き復元
- 再生・停止、区間試聴、テンポ・拍子の現在値変更
- 音量・パン・センド、ミュート・ソロ、Liveに公開されたデバイスパラメーターの操作
- Remote Scriptによるプラグイン検索、Waves L2 Mono / Stereoの末尾挿入
- デバイス内のSETUP・HELP。MIDI版とAudio版のどちらか1個でSet全体を操作

## セットアップ

Node.js 20以上とMax for Liveを利用できるLive環境が必要です。L2を使う場合はWaves L2のインストールとライセンスも必要です。

リポジトリを取得したら、Liveの環境設定にあるユーザーライブラリの場所を指定して実行します。

```sh
git clone https://github.com/aoe1928/live-bridge.git
cd live-bridge
npm run setup -- --user-library "C:/path/to/Ableton/User Library" --configure-clients
```

セットアップは次をまとめて行います。

1. PC専用トークンとMCPサーバーをdistへ生成。更新時はトークンを維持。
2. **JS・画像を内蔵した.amxd**を生成し、ユーザーライブラリのMax Audio Effect / Max MIDI Effectへ配置。
3. LiveBridgeBrowserをユーザーライブラリのRemote Scriptsへ配置。
4. Codex / Antigravityのableton_liveを同じdist/server.cjsへ設定。既存設定はバックアップし、他のMCP登録を維持。

その後、初回だけLiveを再起動し、環境設定 → Link/Tempo/MIDIの空きコントロールサーフェス欄で **LiveBridgeBrowser** を選択します。**入力・出力はNone**、KeyLabなど既存設定は維持します。AI側のMCPも再接続してください。

あとはLiveのブラウザーから **Live Bridge Audio** をマスター等へ、または **Live Bridge MIDI** を音源の前へ配置します。Set内にどちらか1個だけ置きます。**デバイスの隣にJSや画像を置く必要はありません。**

AIとの接続にはPC側のMCPサーバーが必要なので、distフォルダーは保持してください。.amxdだけではAI側のサーバーを置き換えられません。デバイスにはPC専用トークンが含まれるため、生成物を公開配布しないでください。別PCではセットアップを実行して対応する組を生成します。

既存設定を自動変更したくない場合は --configure-clients を省略します。dist/mcp-settings.jsonとデバイスのSETUPプロンプトを使って登録できます。生成だけ行う場合は npm run build、検証は npm test です。追加のnpm依存パッケージはありません。

更新時も同じセットアップを再実行してデバイスを読み込み直します。Remote Scriptを更新した場合はLiveを再起動します。登録・制限の詳細は[ブラウザー連携](docs/ブラウザー連携.md)を参照してください。

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
