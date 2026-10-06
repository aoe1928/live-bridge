# Saved-Set Arrangement automation / 保存済みSetのオートメーション

v0.12 experimental. **No Live connection required.** These tools operate on saved Live 11 `.als` files. They do not save, reload or modify the running Live Set. Unsaved edits are not included. New file tools run in the Node server on Windows and macOS without Python or Remote Script dependencies. Live 12 schema support is deliberately disabled; macOS remains unverified. Focused loading, silent playback and restore checks passed on Live 11.3.43 / Windows; see [validation](validation-2026-10-06.md).

## Workflow

1. `live_read_set_automation({sourcePath})` lists file trackKey, targetId, parameterPath and the compressed file's SHA-256. Paths must be absolute. Follow nextOffset until null. File IDs are separate from both Max and Remote Script IDs.
2. Call the same tool with trackKey/targetId (and expectedFileSha256) to read exact stored events: IDs, string-valued attributes, original XML, curve metadata and initial sentinel events. Page size defaults to 100, maximum 200. These are saved breakpoints, not sampled approximations. No interpolation evaluation or screen coordinates are inferred.
3. `live_snapshot_set_automation` saves the whole original compressed Set privately under `dist/set-automation-snapshots`. Keep snapshotId AND snapshotSha256. Snapshots contain the full Set, possibly embedded tokens and paths; they are excluded from Git and must not be published.
4. `live_edit_set_automation` takes sourcePath, expectedFileSha256, outputPath, trackKey, targetId, minValue, maxValue, plus one or more of:
   - `updates: [{eventId, time?, value?}]` changes existing points, retaining every other attribute (including curve shape metadata).
   - `points: [{time, value}]` inserts default-interpolation points. Two points describe a ramp; no substep approximation is used in the file. Interpretation depends on the parameter; tempo was linear in BPM, while tested mixer Volume interpolated in its fader/dB domain.
   - `deleteEventIds: [id]` removes selected points, except the initial negative-time sentinel. Deleting a point changes the interpolation across its neighbors.
   An absent envelope is created for an existing parameter target with its saved Manual value as the initial sentinel. Existing envelopes and opaque plugin data are preserved. Only FloatEvent envelopes are editable; enum/bool and other events can be read and restored. Time is Arrangement quarter-note beats from zero. minValue/maxValue are caller-supplied **verified saved-file parameter limits**, not inferred from MIDI controller range, API-normalized limits, or observed values; tempo is BPM and constrained to 20..999. File values can differ from the API: mixer Volume stores linear gain (1 = 0 dB; 0.5 approximately -6.021 dB), whereas the API fader at 0 dB is approximately 0.85. Do not copy API volume values directly into file events.
5. Editing automatically saves a pre-edit snapshot and returns outputPath, fileSha256, snapshotId, snapshotSha256, and `liveApplied:false`. Output MUST be a new `.als` beside the source, keeping relative media paths meaningful. Existing files are never overwritten. The tool does not copy audio media or validate their availability.
6. `live_restore_set_automation` takes the edited sourcePath and its expectedFileSha256, snapshotId/snapshotSha256 and a new outputPath. It restores **all** Arrangement envelope containers to that snapshot. Every byte outside these containers must still match; otherwise it refuses to roll back unrelated edits. A successful restore writes the exact original compressed Set bytes, including every original point, curve attribute and unknown field. This is whole-snapshot restoration, not merging one lane into another edited Set.

## Example: tempo

Discover the master Tempo target rather than assuming targetId `8`. Read the source hash and points. For a discovered target, add `{time:32,value:100}` and `{time:64,value:120}`, using minValue 20 and maxValue 999 and a new output name. If points already occupy these times, update their event IDs instead. Existing curves outside the modified points retain their XML; changing a point can also change its neighboring interpolation. This example does not start playback or open the output.

## Verification boundaries

- Tests cover extraction, curve-attribute preservation, tempo/track/Return creation and updates, deletions, stale hashes, collisions, overwrite refusal, unrelated-edit refusal and byte-identical restoration.
- A local saved Live 11.3.43 Set is also copied into a test directory, edited and restored, with independent XML parsing and SHA-256 equality. No original Set is overwritten. Focused Live 11.3.43 / Windows checks also confirm tempo/volume loading, intermediate values, tempo following during silent playback, volume curve display, point retention after Live saves the output, and restored-Set loading.
- `verified:true` means file readback/XML checks, **not Live loading or audible behavior**. Live Set XML is not a supported public editing API. Malformed/unsupported layouts fail closed.
- No real-time Arrangement automation, unsaved-state recovery, arbitrary Bezier handle authoring, automation recording, or automatic reopening of a Set is provided. Original Bezier metadata is retained and restored as stored.
- A write error can leave a newly created output or snapshot; inspect it before retrying. The source remains untouched. Read full point pages and retain snapshots for recoverability.

## 日本語

### 使い方

1. `live_read_set_automation` に保存済みLive 11の `.als` の絶対パスを渡す。trackKey・targetId・パラメーターのパス・ファイルSHA-256を取得する。
2. 対象trackKey／targetIdを指定して再度読む。元の折れ点のID・時刻・値・曲線属性を文字列とXMLのまま取得できる。全点を読むにはnextOffsetがnullになるまでページを進める。
3. `live_snapshot_set_automation` で元ファイルを丸ごと保存できる。スナップショットIDとハッシュを保持する。
4. `live_edit_set_automation` で点を更新・追加・削除する。テンポはBPM、それ以外は確認済みの保存ファイル上の値の上下限を渡す。既存の点の曲線属性は保持、新しい点は標準補間。別パラメーターの曲線や音源状態は変更しない。変更対象の隣接区間の補間は変わり得る。
5. 出力先は**元Setと同じフォルダーの未使用の名前**。既存ファイルは上書きしない。変更前のスナップショットも自動保存される。ファイル内IDはMax／Remote ScriptのIDと異なる。
6. `live_restore_set_automation` はスナップショット時点のArrangement全曲線を含む元ファイルをバイト単位で完全復元する。曲線コンテナー以外の内容が変わっていたら拒否するため、他の編集を勝手に巻き戻さない。出力は別名ファイル。

### 制限・現在地

開いているLiveへ直接反映する機能ではない。未保存の編集も対象外。Live 11.3.43 / Windowsの専用Setでテンポ・音量の反映、無音再生中のテンポ追従、音量曲線表示、再保存後の点の保持と復元ファイルの読込を確認した。全種類のパラメーター／曲線の検証ではない。Live 12のファイルは未検証のため拒否する。Windows／Mac共通のNode実装だがMac実機は未検証。

連続値のFloatEventのみ作成・編集可能。列挙値／真偽値は読み取り・完全復元に限る。元の曲線属性は保持できるが、新しいBezierハンドルの指定や録音機能はない。スナップショットにはSet全体と埋め込みトークン・ローカルパスが含まれ得るため、Gitや配布物へ含めない。

保存ファイルとLive APIでは値の尺度が異なる場合があります。Mixer Volumeはファイルでは線形ゲイン（1 = 0 dB、0.5 ≈ -6.021 dB）、APIでは0 dBが約0.85です。APIの音量値や上下限をそのままファイル編集へ渡さないでください。元のSetをLiveで再保存すると他のXMLも変わり得るため、完全復元の照合が拒否される場合があります。その場合も元のスナップショットは保持され、他の編集を無視した強制復元は行いません。

The offline limitations above describe these four file tools. Separate v0.13 [recording tools](recording.md) write approximate curves into the open Arrangement. 上記はファイル用ツールの制限です。v0.13の別ツールで開いているArrangementへの近似記録に対応しています。
