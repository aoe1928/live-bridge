# live_create_clip

指定したMIDIトラックの最初の空きSessionスロットにクリップを作成し、ノートをまとめて書き込みます。`destinationBeat`を指定すると、同じトラックのArrangementへ複製します。Sessionの作成元は残します。

最初に`live_status`の`session`と`live_list_tracks`のトラックIDを読み取ります。Remote Scriptの`targetId`は使いません。

```json
{
  "trackId": 123,
  "length": 4,
  "destinationBeat": 296,
  "expectedSession": "live_statusから取得したsession",
  "notes": [
    {"pitch": 36, "start_time": 0, "duration": 0.25, "velocity": 100},
    {"pitch": 38, "start_time": 1, "duration": 0.25, "velocity": 90}
  ]
}
```

`destinationBeat`は曲頭を0とする四分音符単位の拍数です。一定の4/4なら75小節目の先頭は296。小節番号を直接渡す値ではありません。拍子変更がある曲は区間ごとに換算してください。ノートの`start_time`はクリップ内の拍位置です。ピッチと奏法の対応は音源のキーマップに依存します。

| 引数 | 条件 |
|---|---|
| trackId | 現在のSet内のMIDIトラックID、必須 |
| length | 0より大きく256以下の拍数、必須 |
| destinationBeat | 0以上。省略するとSessionのみ。終了位置は1576800拍以下 |
| notes | 0〜128個、必須。pitch・start_time・durationを指定 |
| expectedSession | 現在の接続のsession、必須 |

ノートの`pitch`は整数0〜127、`duration`は正数、ノート終端はクリップの長さ以内です。任意項目はvelocity（0〜127）、mute（0/1）、probability（0〜1）、velocity_deviation（−127〜127）、release_velocity（0〜127）。未指定の任意項目はLiveの既定値を使用します。

## 安全チェックと結果

- 再生・録音停止、expectedSession一致、フリーズされていないMIDIトラックを確認します。
- 空きスロットがない場合は失敗します。Sceneの追加や既存クリップの削除はしません。
- Arrangementの配置範囲に既存クリップがある場合は拒否します。複製直前にも再確認します。
- ノート書き込み後とArrangement複製後にノート数を照合し、Arrangementの開始位置・終了位置も確認します。
- 応答はcreatedClip、sessionSlot、arrangementClip（省略時null）、noteCount、verifiedを返します。再生・Set保存は行いません。

処理は複数段階です。途中失敗時にはSessionクリップやArrangementコピーが残る可能性があります。エラーに含まれるトラック・スロット・クリップを確認し、`live_list_clips`と`live_read_notes`で読み直してください。自動ロールバックやタイムアウト時の自動再送はしません。

## 更新

`npm run build`で両方の.amxdと対応するlive-api.jsを生成します。生成版にはJSと画像が同梱されています。デバイスは.amxdだけで配置できます。MCPサーバー用のdistは保持してください。Liveでデバイスを読み込み直し、MCPも更新したdist/server.cjsへ接続し直します。既存環境のbridge-config.jsonをdistへコピーしてからビルドするとトークンを維持できます。新規生成トークンを使う場合、Remote Scriptも再インストールが必要です。

API参照：[ClipSlot](https://docs.cycling74.com/apiref/lom/clipslot/)、[Clip.add_new_notes](https://docs.cycling74.com/apiref/lom/clip/#add_new_notes)、[Track.duplicate_clip_to_arrangement](https://docs.cycling74.com/apiref/lom/track/#duplicate_clip_to_arrangement)。

自動テストはLive APIの模擬環境で処理順序と失敗時の動作を検証しています。この新機能のLive実機試験は未実施です。
