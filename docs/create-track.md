# トラック作成（v0.9）

`live_create_track` は空の MIDI / Audio / Return を1本、対応する一覧の末尾に作成します。Max for Live の Song API を使うので、画面操作・Remote Script・OS固有のショートカットは不要です。グループ作成やグループ内への挿入、挿入位置指定は今回の対象外です。

1. `live_status` を読み、`session`、順序付き `trackIds`、`returnTrackIds` を取得。
2. 再生と録音を停止し、取得した値をそのまま次の引数へ渡す。

```json
{
  "type": "return",
  "expectedSession": "live_statusのsession",
  "expectedTrackIds": [4, 5, 6],
  "expectedReturnTrackIds": [36, 37, 38]
}
```

IDは例です。実際に読み取った配列を使ってください。`type` は `midi` / `audio` / `return`。

3. `verified: true` と `trackId` を確認。必要なら既存の `live_rename_track` / `live_set_track_color` に新IDと返された名前・色を渡す。
4. リターンへのセンドは送り元の `live_read_mixer` を読み直し、最新のセンドパラメーターを `live_set_parameter` で変更。値はネイティブAPI単位で、dBとは異なります。

作成前の一覧が変わっていた場合は拒否します。作成後も件数・順序・既存グループ所属・新トラックの種類と所属を照合します。失敗やタイムアウト時には作成済みの可能性があるので、一覧を再読して確認し、同じ操作を無条件で再実行しないでください。部分作成の自動削除・Undoは行いません。

履歴はローカル `dist/track-history` に保存されます。履歴は現在の状態の代わりにはなりません。作成だけでプラグイン挿入・命名・色・センド変更・再生・Set保存は行いません。Liveのエディションやトラック数上限に達した場合はLive側のエラーを返します。

更新後はLive側のデバイスを読み込み直し、AI側のMCPを再接続します。`live_status.bridge` が `0.9.0`、ツール数が27であることを確認してください。Windows / macOS 共通コードですが、Mac実機での検証は未実施です。

公式仕様: [Song — create_audio_track / create_midi_track / create_return_track](https://docs.cycling74.com/apiref/lom/song/)

検証状況：自動テスト28件合格（既存機能を含む）。新機能はLiveAPIの模擬環境で3種類の作成、再送、競合、録音／再生時の拒否と読み戻し不一致を検証しています。Live実機への試験挿入は未実施です。
