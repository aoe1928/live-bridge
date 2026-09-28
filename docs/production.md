# v0.10 制作ツール

指定された8項目を追加。MCPは48ツール（旧live_insert_l2互換名を含む）、Remote Scriptは0.2.0です。Windows / Mac共通APIを使用します。新機能はAPIを模した環境で自動テスト済みですが、Live実機・Mac実機での検証は未実施です。

## 更新

セットアップを再実行し、作業中のSetを保存してからLiveを再起動します。デバイスが古い表示ならユーザーライブラリの更新版を読み込み直してください。Setには1個だけ配置します。Codex / AntigravityのMCPも再接続します。

確認値：`live_status.bridge` = `0.10.0`、`live_browser_status.version` = `0.2.0`、ツール数48。編集前に対象を読み取り、返されたID・session・fingerprintを使います。再起動前のIDやsessionは再利用しません。

Remote Scriptの更新はプラグイン挿入に必要です。他の7項目はMax for Live経由。8項目ともComputer Use不要です。以前からあるトラック並び替えは引き続き画面操作を使います。

## 1. L2以外のプラグイン挿入

`live_browser_status` → `live_search_plugins` → `live_insert_plugin`。

例：「D-Guitar Delayの末尾にTR5 Space Delayを挿して」

検索結果の製品・形式・パスを確認し、itemIdを選びます。Remote Script用targetIdとトラックの名前・fingerprint・Remote sessionを指定します。製品名の許可リストはありません。既存L2があることも挿入拒否の理由にはなりません。

現在の挿入先は音声出力のある通常・グループ・Return・Masterの最上位チェーン末尾です。TR5のようなオーディオエフェクトを指定してください。空のMIDIトラックへの音源挿入・Rack内部への挿入・プラグイン独自プリセットは今回の対象外。既存チェーン、新規デバイス1個、検索項目とデバイスの表示名を照合します。製品による表示名の違いで照合に失敗した場合も挿入済みの可能性があるので、再実行せず一覧を確認します。

## 2. センド・音量・色などの一括設定

`live_batch_set` のchangesに最大128件を渡します。

```json
{
  "expectedSession": "live_statusのsession",
  "changes": [
    {"trackId": 10, "property": "send", "returnTrackId": 20, "expectedValue": 0, "value": 0.2},
    {"trackId": 11, "property": "colorIndex", "expectedValue": 3, "value": 8}
  ]
}
```

IDと値は例です。live_read_mixer / live_list_tracksから実値を読み取ってください。volume・pan・send・mute・solo・name・colorIndexに対応。センドは番号でなくReturn IDを指定します。値はAPIのネイティブ単位で、dBではありません。

全件事前確認後に書き込みますが、トランザクションではありません。途中失敗では一部変更済みになり得ます。エラーには完了した書き込みが記録されます。自動Undoや無条件の再実行は行いません。

## 3. 入出力ルーティング

`live_read_routing(trackId)` で現在値と候補を取得。`live_set_routing` にproperty・identifier・expectedIdentifier・expectedSessionを渡します。propertyはinput_routing_type / input_routing_channel / output_routing_type / output_routing_channel。

機器やOSで候補が違うので識別子を固定しません。typeを変えるとchannel候補も変わるため、返された最新状態からchannelを選びます。Masterのルーティングは対象外です。

## 4. トラック複製・削除

`live_duplicate_track` / `live_delete_track`。live_statusのsession・trackIds・returnTrackIdsと、live_list_tracksの対象名をexpectedSession・expectedTrackIds・expectedReturnTrackIds・expectedNameに渡します。

通常トラックは元の直後に複製。削除は通常／Returnに対応し、内容も削除します。Master・グループ・Live Bridgeホスト・最後の通常トラックの削除は対象外。Return複製はSong APIにありません。ユーザーが削除対象として指定したものだけを扱います。

## 5. MIDI編集拡張

`live_read_notes` → `live_update_notes` / `live_add_notes` / `live_delete_notes`。clipId・expectedSession・expectedFingerprintを指定。

更新例：`changes: [{noteId: 1, velocity: 80, start_time: 1.02, duration: 0.25}]`。変更する属性だけを指定します。ピッチ・強弱・開始時刻・長さ・ミュート・確率・ベロシティ変動・リリースベロシティに対応。追加はnotes配列、削除はnoteIds配列。各操作最大128件です。

クオンタイズ／ヒューマナイズはAIが時刻と強弱を計算し、この更新ツールへ渡します。時刻はクリップ内の拍。更新時はノートIDを保持し、指定外ノートと読み戻した値も照合。同音高の重なりは拒否。ループ内ノートの変更は繰り返し全体に反映されます。

## 6. クリップ名・色・ループ編集

`live_read_clip_settings` → `live_set_clip_settings`。settingsにはname・colorIndex・loopStart・loopEnd・looping・startMarker・endMarker・mutedから必要な項目だけ指定。clipId・expectedSession・expectedFingerprintで照合します。

MIDIとWarp済み音声は拍、未Warp音声は秒。未Warp音声のループ有効化は不可。Arrangement上の移動・クリップ削除は行いません。

## 7. シーン・ロケーター管理

- `live_list_scenes` → `live_manage_scene`：create（末尾）、duplicate、delete、update（名前・色）。create以外はsceneIdを指定。シーン削除はそのSessionクリップも削除します。シーン起動や録音は行いません。
- `live_list_locators` → `live_manage_locator`：create（beat・name）、rename（locatorId・name）、delete（locatorId）。既存位置へのcreateを拒否して、トグルによる誤削除を防ぎます。作成・削除では停止中の再生位置を一時移動し、その後変更されていなければ元へ戻します。位置はAPIで読み取り専用なので、移動は新規作成を確認してから旧位置を削除します。

両方とも一覧のfingerprintとsessionを渡します。

## 8. ミックス設定の保存・復元

`live_save_mix_snapshot(name, trackIds)` で指定トラック（最大64本）の音量・パン・センド・ミュート・ソロと、Liveに公開されたデバイスパラメーターを保存。ローカルdist/mix-snapshotsに保存し、Gitには含めません。

- live_list_mix_snapshots：保存済み一覧。
- live_read_mix_snapshot(snapshotId)：保存時の値。
- live_compare_mix_snapshot(snapshotId)：現在との差分とcurrentFingerprint。
- live_restore_mix_snapshot(snapshotId, expectedSession, expectedFingerprint)：比較結果のcurrentFingerprintを渡して復元。

同じBridgeセッションで、対象トラック・デバイス・パラメーター・センド先の対応が維持されている場合に復元します。Set変更やBridge再読み込み後は拒否。変更対象の値が自動化中／無効の場合も拒否。プラグイン非公開状態やLive Set全体の保存ではありません。大きすぎる復元リクエストは書き込み前に拒否するので、保存対象を少数トラックごとに分けてください。

## 履歴

編集履歴はdist/production-history、プラグイン挿入はdist/device-historyに保存します。失敗時は現在の状態を読み直し、履歴と合わせて確認してください。これらの履歴だけでSet全体を復元することはできません。

公開API：[Song](https://docs.cycling74.com/apiref/lom/song/)・[Track](https://docs.cycling74.com/apiref/lom/track/)・[Clip](https://docs.cycling74.com/apiref/lom/clip/)・[Scene](https://docs.cycling74.com/apiref/lom/scene/)・[CuePoint](https://docs.cycling74.com/apiref/lom/cuepoint/)。
