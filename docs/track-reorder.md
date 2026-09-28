# v0.8：Windows / macOSの並び替えワークフロー

これは画面操作ができるAI向けのMCPワークフローです。MCPサーバー自体はキーを送信しません。利用するAIのComputer Use等が、Liveと同じPCで操作できる必要があります。MCP接続だけのクライアントでは並び替えを完了できません。

| 項目 | Windows | macOS |
| --- | --- | --- |
| アレンジメントで上／下に移動 | Ctrl＋↑／↓ | Command＋↑／↓ |
| OS判定 | MCPサーバーの実行OS | MCPサーバーの実行OS |
| 画面操作 | AI側のデスクトップ操作機能 | AI側のデスクトップ操作機能 |
| 実機検証 | Live 11で通常トラック・グループ移動確認 | 未実施。キー定義・共通ロジックのみ自動テスト |

Macで必要になる画面収録・アクセシビリティ等の権限は、利用するデスクトップ操作機能の案内に従って設定します。Live BridgeはOSの権限やセキュリティ設定を変更しません。固定座標・Windows専用パス・キー送信プログラムには依存しません。

## AIからの手順

1. `live_read_track_order`でsession、orderFingerprint、対象ID・親グループ・順番を取得。
2. `live_prepare_track_move`にtrackId、direction（up/down）、expectedSession、expectedOrderFingerprintを渡す。戻り値はpreparedであり、移動完了ではありません。
3. 同じPCのLiveをアレンジメント表示にし、最新画面を見て対象の**トラック見出しだけを単独クリック**。名前が重複していたら位置や周囲のトラックで特定。確認できなければ中止。
4. `live_arm_track_move`へmoveIdを渡す。現在のAPI上の選択・再生停止・順序を確認し、OS別のキー操作を返します。
5. 画面上でもトラック見出しへのフォーカス、単独選択、再生／録音停止、ダイアログや文字入力の不在を確認し、有効期限15秒以内に指定キーを**1回だけ**送信。
6. `live_verify_track_move`へmoveIdを渡す。全通常トラックのID順と親グループが予定どおりならverified:true。複数段の移動は毎回、新しい読み取り・準備から繰り返します。

準備は2分間有効。期限切れ・キー送信エラー・タイムアウト・変化なし・予想外の結果ではキーを再送せず、先にverifyで実際の状態を確認します。中止するときもverifyを呼ぶと未移動として記録できます。Undoの自動実行はありません。verifyの同じIDでの再呼び出しは履歴を返すため、新しい現状確認にはreadを使ってください。

## 初版の範囲

- 最上位の通常トラック、または一段のグループを、隣の最上位の通常トラックと入れ替える。
- グループ移動では子トラックの順序と所属を維持する計画を作る。
- Return/Master、グループ内の個別移動、隣もグループの移動、ネストしたグループ、凍結トラックの移動は拒否。
- 自動番号付きのトラック名は移動により変わるため、IDと所属関係で検証する。
- 音源・クリップ・ルーティング内容全体の同一性を検証する機能ではない。画面操作とAPI確認の間の他の手動操作を完全には排除できないため、操作中はLiveを触らない。

実装：`src/track-move.cjs`が共通計画・OS別キー定義・期限付き履歴を担当し、Maxデバイスが現在の並びとグループ情報を返します。Remote Scriptはこの機能には不要です。履歴はローカルのdist/move-historyに保存します。

2026-09-29のWindows実機検証では、v0.8のMCPツールをSTDIO経由で呼び、空の通常トラックのprepare→arm→キー操作→verifyでverified:trueを確認。取り消し後の全通常トラック情報（ID・名前・順序・親グループ・凍結状態）が検証前と一致しました。グループのショートカット移動は先行検証で確認しており、v0.8のグループ移動計画は自動テストで確認しています。

## 更新・導入

Windows例：`npm run setup -- --user-library "C:/Users/ユーザー名/Documents/Ableton/User Library" --configure-clients`

Mac例：`npm run setup -- --user-library "/Users/ユーザー名/Music/Ableton/User Library" --configure-clients`

実際のUser LibraryはLive環境設定で確認してください。JS・画像同梱のAudio/MIDIデバイスを更新してMCPを再接続すると26ツールになります。Mac側のクライアント設定ファイルの場所も使用環境で確認してください。Macへの自動セットアップは実機未検証です。

参考：[Ableton Live 11の公式ショートカット](https://www.ableton.com/en/live-manual/11/live-keyboard-shortcuts/)、[Trackのgroup_track](https://docs.cycling74.com/apiref/lom/track/#group_track)。
