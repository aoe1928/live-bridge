# v0.7：トラック名・色の変更

追加ツールは `live_rename_track` と `live_set_track_color`。通常・グループ・リターン・マスターに対応します。Computer UseやRemote Scriptは不要です。

1. `live_status` で現在のsession、`live_list_tracks` で対象のid・name・colorIndexを読みます。
2. 再生・録音を停止し、対象トラックIDと変更前の値を渡します。
3. 書き込み後の読み取りが一致するとverifiedと変更前後の値を返します。

```json
{
  "trackId": 12,
  "name": "Drums",
  "expectedName": "旧トラック名",
  "expectedSession": "live_statusのsession"
}
```

```json
{
  "trackId": 12,
  "colorIndex": 3,
  "expectedColorIndex": 0,
  "expectedSession": "live_statusのsession"
}
```

上の数値は例です。実際のIDと色は読み直してください。色はLiveパレットの0〜69番を指定します。`live_list_tracks`と変更結果の`color`は実際のRGB整数、`colorIndex`はパレット番号です。色名との対応を推測せず、既存トラックの色を参照すれば「Kickと同じ色にする」などを確実に指定できます。

名前は1〜128文字。日本語・絵文字に対応し、空白のみ・改行・制御文字を拒否します。変更前の名前・色が一致しない場合も拒否します。

複数トラックには1本ずつ適用します。既存クリップやグループ内の子トラックは自動変更しません。トラックの並び替えも対象外です。

変更記録はローカルの`track-history`へ保存します。自動復元ツールはありませんが、返されたbeforeを使い、現在値を読み直して同じツールで戻せます。タイムアウトや検証エラー後は実際に変更されている可能性があるため、再送前に読み直してください。

## 更新

セットアップを再実行して.amxdを配置し直し、Liveで古いデバイスをv0.8へ置き換えます。MCPを再接続すると26ツールになります。JS・画像はデバイス内蔵です。今回の機能追加だけならRemote Scriptの再起動は不要です。
