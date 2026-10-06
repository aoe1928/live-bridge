# Session automation / Sessionオートメーション (introduced in v0.11, experimental)

For exact Arrangement/tempo editing and saved-Set restoration, use the separate [offline tools](set-automation.md) added in v0.12. 以下の制限はSession用のリアルタイム接続ツールに対するものです。Arrangement・テンポ・保存済みデータの完全復元は[v0.12のオフラインツール](set-automation.md)を参照。

Requires Remote Script v0.3.0. Install the updated script and reload it in Live; reconnect your MCP client to discover 56 tools. The implementation is shared by Windows and macOS, with focused Live 11.3.43 / Windows verification on 2026-10-06: volume ramps, pan/send/device-On steps, clearing one envelope without clearing another, saved persistence and write guards. Live 12/macOS and warped audio clips remain unverified. See [validation](validation-2026-10-06.md).

1. `live_browser_status`: choose a remote `targetId`.
2. `live_automation_targets`: discover Session clips and Live-exposed mixer/device parameters, native ranges and remote IDs. These are NOT Max API IDs.
3. `live_read_automation`: supply targetId, clipId, parameterId, startBeat, endBeat, sampleCount (2..256). Beats are absolute clip quarter-note positions, not song bars. Read creates nothing.
4. Within 60 seconds use the returned remote session and readToken with `live_write_automation`. Provide increasing `{beat,value}` points, shape `step` or `linear`, and resolution (subdivisions per segment). Maximum 512 generated steps. Values use native units, not dB. The last point marks the end of the write range: step holds each starting value until the next point; linear approximates a ramp with left-sampled steps and does not write beyond the final point.
5. Read again to inspect. `live_clear_automation` removes the ENTIRE selected parameter envelope, not just the read range. It requires a fresh token.

No playback, saving, recording or UI automation is performed. Edits require stopped transport, no recording, a non-frozen track and an enabled parameter. Loop edits affect every repetition. One undo group is used, but failed writes can be partial; inspect before retry. Operation receipts are saved in local `dist/automation-history`.

## Limits

- Session clip envelopes only. No Arrangement track/master/tempo envelope editor, original breakpoint enumeration, Bezier editing, exact envelope snapshot restore, or automation recording.
- Reads sample values, not original breakpoints. The change check detects changes in sampled values and clip bounds only; edits between samples can escape detection. Samples are NOT lossless backups.
- Native `insert_step` can change interpolation at range boundaries. The implementation does not clear other ranges but does not promise exact preservation outside the write range. Verification checks each written step midpoint, not every possible time.
- Quantized parameters require integer step values; unwarped audio is rejected because its time base is seconds. Live may reject unsupported parameters/envelope types. API availability is checked before writes where possible; creation can still fail.
- Remote Script APIs are separate from Max's public Live Object Model. Capability flags advertise the implementation, not proof of compatibility with a particular Live installation.

## 日本語

Remote Script v0.3.0の再読み込みとMCPの再接続が必要です。新しい4ツールでSessionクリップの値のサンプリング、ステップ作成、直線フェードのステップ近似、対象パラメーターのエンベロープ全削除ができます。音量・パン・センド・Liveに公開されたプラグインパラメーターを対象にできます。Live 11.3.43 / Windowsで音量・パン・センド・デバイスON、対象だけの削除、保存後の保持と書き込みガードを確認しました。Live 12／Mac／ワープ済み音声クリップは未検証です。

`live_browser_status` → `live_automation_targets` → `live_read_automation` → 60秒以内に `live_write_automation` の順です。IDはRemote Script側のものを使い、時間は曲の小節番号ではなくクリップ内の拍位置、値はdBではなくAPIのネイティブ単位です。ループ全周に反映されます。再生・録音中、フリーズ中は変更できません。

最終ポイントは書き込み区間の終端です。stepでは直前の値を保持し、linearでは左端の値を使う階段状近似になるため、終端の値そのものを書き込む仕様ではありません。境界の補間には影響する場合があります。

読み取りは元の折れ点一覧や完全なバックアップではありません。サンプル間の変更を完全には検出できません。削除は読み取り区間だけでなく対象パラメーターのクリップ内エンベロープ全体です。アレンジメント全体、マスターテンポ、元の曲線の完全復元、Bezier編集、録音には未対応です。途中エラーでは変更が残る可能性があるため、再実行前に確認してください。

At an exact step boundary, Live 11 `value_at_time` may report the value immediately before the step; verification samples step midpoints. The final point sets the end boundary and is not a separately inserted terminal value.

ステップ境界ちょうどの読取値は直前の値になる場合があるため、書き込み照合は各ステップの中点で行います。最後の点は範囲終端であり、終端値そのものを別途書き込む仕様ではありません。

## v0.13 / 新しい記録機能

The Session limitations above apply to these four Session tools. Separate v0.13 tools provide approximate real-time Arrangement/tempo recording and sampled Bezier generation; see [recording](recording.md). 上記はSession用4ツールの制限です。別途v0.13に近似的なArrangement／テンポ自動記録・Bezier点列生成を追加しました。
