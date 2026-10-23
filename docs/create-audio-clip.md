# live_create_audio_clip

ディスク上のオーディオファイル（絶対パス）を参照するオーディオクリップを、指定したオーディオトラックの Session スロットか Arrangement の拍位置に作成します。Live の `ClipSlot.create_audio_clip(path)` と `Track.create_audio_clip(file_path, position)` を呼びます。ファイルはコピーされず参照されるだけなので、先に User Library など Set が収集できる場所へ置いてから呼びます。

最初に `live_status` の `session` と `live_list_tracks` のトラック ID を読み取ります。Remote Script の `targetId` は使いません。Remote Script も不要で、Live Bridge デバイスだけで動きます。

```json
{
  "trackId": 5,
  "filePath": "/Users/me/Music/Ableton/User Library/Samples/Song A/FSS_140_bass_loop_G.wav",
  "slotIndex": 0,
  "name": "Bass loop",
  "expectedSession": "live_statusから取得したsession"
}
```

Arrangement に置くときは `slotIndex` の代わりに `position`（曲頭を 0 とする四分音符単位の拍数）を渡します。一定の 4/4 なら 75 小節目の先頭は 296 です。

| 引数 | 条件 |
|---|---|
| trackId | 現在の Set 内のオーディオトラック ID、必須 |
| filePath | 絶対パス、必須。拡張子は wav / aif / aiff / aifc / flac / mp3 / m4a / ogg。サーバー側でファイルの存在を確認してから Live に送ります |
| slotIndex | 0 以上の Session スロット番号（シーンの添字）。空きスロットのみ。`position` と排他 |
| position | 0〜1576800 の拍。`slotIndex` と排他 |
| name | 任意。作成後にクリップ名を設定 |
| expectedSession | 現在の接続の session、必須 |

## 安全チェックと結果

- 再生・録音停止、expectedSession 一致、フリーズされていないオーディオトラックを確認します。MIDI トラックは「Not an audio track」で拒否します。
- Session: 使用中のスロットは拒否します。シーンの追加はしません。
- Arrangement: 作成後に新しいクリップが 1 個だけ増え、その開始位置が `position` と一致することを確認します。既存クリップと重なる場合の挙動は Live に従います（Live は重なった区間を上書きします）。重ねたくない位置は `live_read_arrangement_range` で先に確認してください。
- Live がファイルを読めない場合（未対応形式、壊れたファイル）はクリップが作られないため、読み戻しで「Clip not created」を返します。
- 応答は `trackId`、`placement`（session / arrangement）、`clip`（id・name・filePath・length・warping・startTime・endTime・loopStart・loopEnd）、`verified` を返します。再生・Set 保存は行いません。
- Warp の有無や長さは Live の設定（Preferences の「Auto-Warp Long Samples」など）に従います。変更は `live_read_clip_settings` → `live_set_clip_settings` で行います。

## 置き場の作法

Splice などから落とした素材は `~/Music/Ableton/User Library/Samples/<曲名>/` へコピーしてから絶対パスを渡すと、Live のブラウザからも見え、Collect All and Save でも拾えます。macOS のファイル名は NFD で保存されるため、日本語フォルダ名は Finder に見えるとおりのパスをそのまま渡します（正規化し直さない）。

## 更新

`npm run build` で両方の .amxd と live-api.js を生成し、Live でデバイスを読み込み直します。Remote Script の再インストールは不要です。

API 参照：[ClipSlot.create_audio_clip](https://docs.cycling74.com/apiref/lom/clipslot/)、[Track.create_audio_clip](https://docs.cycling74.com/apiref/lom/track/)。

自動テストは Live API の模擬環境で呼び出し内容・拒否条件・失敗時の応答を検証しています。Live 実機（12.1.5 / macOS）での確認結果は [macOS 検証記録](validation-2026-10-23-macos.md) を参照してください。
