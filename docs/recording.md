# Arrangement recording and curve generation / 自動記録・曲線生成

## English

v0.13, experimental. Requires Remote Script **0.4.0**; rerun setup and restart Live. The Max device is not needed for the recording tools themselves. Use exactly one Live instance. Tested on Live 11.3.43 / Windows, not macOS or Live 12.

1. Save a backup of the Set. Read `live_browser_status` and `live_automation_targets` for Remote track/parameter IDs, ranges and native units. These IDs are different from Max IDs and saved-file IDs.
2. Read `live_automation_capabilities`. `recordingEnvironment` identifies blocking conditions. Stop playback and Session clips, disarm all tracks, return to Arrangement and disable loop, punch, count-in and Link. The tool rejects these conditions instead of silently changing them.
3. Call `live_prepare_automation_recording` with `targetId`, `parameterId`, `points: [{beat:0,value:0.6},{beat:4,value:0.85}]`, `maxSeconds:10`, `overwriteAutomation:0`. Points are absolute quarter-note beats and native API values. The example is a volume fader, NOT linear amplitude or dB. For tempo, select the master's `mixer/song_tempo` parameter and use BPM. Existing automation requires `overwriteAutomation:1`; the tool does not make or verify a backup for you.
4. Call `live_start_automation_recording` with the returned `prepareToken` and `expectedSession`. The plan expires in 60 seconds and checks state again. This **starts playback and Arrangement recording**. It is not a preview.
5. Poll `live_automation_recording_status` using the returned `operationId` and remote session. `journalId` identifies a separate private local start/stop journal. Do not confuse these IDs.
6. `live_stop_automation_recording` cancels the active run. Partial automation remains. It is not undo. A lost response must be investigated; never repeat a start blindly.
7. Save in Live, then use `live_read_set_automation` to inspect durable events. `completed` and `verified:false` mean the run stopped, not that exact points were verified.

Limits: one continuous parameter per run, 2–128 increasing points, at most 64 beats and 120 seconds. Linear interpolation is applied on the Remote Script scheduler (roughly 0.1 seconds in the validation run). The last recorded value can precede the requested endpoint, Live may simplify points or add boundary/sentinel events, and recording may alter interpolation outside the requested range. A delayed Live scheduler can delay stop detection too. For precise saved breakpoint positions, use the offline Set editor instead.

Cleanup attempts recording off, playback stop, gesture end, restoration of automation arm, lane re-enable and playhead restoration, even after an individual cleanup error. Changed transport/arming/topology, disabled or frozen targets, backward/large playhead jumps and timeouts stop the run. Script disconnection also attempts cleanup. This cannot protect against Live/process crashes, hardware failure, another controller editing a lane, or all manual actions. The global Re-enable Automation indicator may remain lit for other overridden lanes. Inspect the Set after any failure.

`live_generate_automation_curve` works without Live. Supply `startBeat`, `endBeat`, `startValue`, `endValue`, normalized `x1,y1,x2,y2` in 0..1 with x1 <= x2, and `sampleCount` (2..128). It returns `points` (beat/value) and `setPoints` (time/value). These represent a sampled cubic Bezier polyline, not Live-native handle metadata. Higher sample counts improve geometric approximation but cannot improve recording scheduler accuracy. Choose units for the destination: file volume values are linear gain, while runtime volume values are normalized fader positions.

## 日本語

v0.13の実験的機能です。セットアップを再実行し、Liveを再起動してRemote Script **0.4.0**を読み込みます。録音ツール自体はMaxデバイスを必要としません。Live 11.3.43 / Windowsで検証、Mac／Live 12は未検証です。

1. Setのバックアップを保存します。`live_browser_status` → `live_automation_targets` でRemote側のID・値の範囲を確認します。Max側・保存ファイル側のIDとは別です。
2. `live_automation_capabilities` の `recordingEnvironment` を確認。停止、全トラックの録音待機解除、Sessionクリップ停止、Arrangement復帰、ループ／パンチ／カウントイン／Linkオフが必要です。自動では設定を変えません。
3. `live_prepare_automation_recording` に対象ID、拍位置と値の `points`、最大秒数、上書き指定を渡します。拍は曲頭から0始まりの四分音符単位。音量はフェーダーのAPI値で、dBやファイル内の線形ゲインではありません。テンポはMasterの `mixer/song_tempo` を選びBPM指定。既存オートメーションへの上書きは `overwriteAutomation:1` が必要です。バックアップの自動作成・存在確認はしません。
4. 60秒以内に `live_start_automation_recording` へ準備トークンとセッションを渡すと、**再生とArrangement録音を開始**します。
5. 返された `operationId` で状態確認。`journalId` はローカル記録用の別IDです。中断は `live_stop_automation_recording`。途中までの録音は残り、自動で取り消しません。
6. Liveで保存後、`live_read_set_automation` で実際の折れ点を確認してください。`completed` は停止処理完了、`verified:false` は曲線の完全一致を確認していないことを示します。

1回につき連続値パラメーター1つ、2～128点、最大64拍／120秒。今回の記録間隔は約0.1秒で、最終値が終点へ届かない場合があります。Liveによる点の簡略化や境界点の追加、範囲外の補間への影響もあります。正確な位置へ折れ点を置く場合は保存済みSet編集を使います。

停止時は録音解除・再生停止・ジェスチャー終了・元のオートメーションアーム／再生位置への復帰を試みます。途中で録音待機・トラック構成・再生位置などが変わると停止します。Live自体のクラッシュや他のコントローラーの操作までは防げません。ほかのレーンの上書きにより、全体のオートメーション再有効化ランプが残ることもあります。失敗後は必ずSetを確認してください。

`live_generate_automation_curve` はLive不要。始点・終点、0～1のBezier制御点 `x1,y1,x2,y2`（x1 <= x2）、点数を指定し、`points`／`setPoints` を生成します。Live固有のBezierハンドルではなく点列近似です。Session・録音・保存ファイルの用途に合う値の単位を選んでください。
