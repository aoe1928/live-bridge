# Live validation — 2026-10-06

**English** | [日本語](#日本語)

Environment: Ableton Live **11.3.43 Suite / Windows**, Live Bridge **0.12.0**, Remote Script **0.3.0**. A separate empty `Bridge Validation` Set was used. The user's original production Set was not edited or saved. Tests used an empty MIDI clip and no audible material.

## Verified

- Master-hosted frozen Audio device connects and reports 0.12.0; an empty 16-beat Session MIDI clip is created on another track.
- Session volume automation: 16 generated steps forming two ramps, midpoint readback verified. Pan, Send A and device-On steps also verified.
- Clearing the pan envelope leaves volume unchanged. Consumed tokens, wrong sessions and writes during playback are rejected.
- Session volume samples retain the same fingerprint after saving and loading another copy of the Set.
- Saved-Set tools create tempo and audio-track volume envelopes in new files without overwriting the source. Exact restore produces the original compressed file SHA-256.
- Generated Arrangement Set opens successfully. At beats 0, 8, 16, 24 and 32, tempo reads 80, 120, 160, 130 and 100 BPM. Short silent playback also follows the tempo ramp.
- Stored Volume points 0.25, 1 and 0.5 at beats 0, 16 and 32 produce approximately -12.041, 0 and -6.021 dB. At the intermediate beats 8 and 24, Live reports approximately -6.021 and -3.008 dB. Volume automation is visible in Arrangement View.
- Live reserializes the edited Set after a reversible mute toggle; all three tempo and volume points retain their times and values.
- The byte-exact restored Set opens successfully: tempo remains 120 BPM at beats 0, 16 and 32; the tested audio track is 0 dB with no active Arrangement volume automation.

## Fixes found through Live testing

1. Reading master-only `crossfader` on a regular track raises a runtime error. Discovery now limits master-only properties to the master track.
2. Remote Script Clip in Live 11 has no `is_session_clip` property. Membership in the selected track's Session clip slots establishes ownership instead.
3. Saved-file values must not be confused with API-normalized parameters. Read results and tool instructions now explicitly identify the saved-file value domain.

`value_at_time` at an exact step edge can report the preceding value; Session writes verify midpoints. The final supplied point is an end boundary, not a separately written terminal value.

## Limits

This is focused integration coverage, not a claim that all devices or curves work. macOS, Live 12, warped audio clip envelopes, arbitrary plugin parameters and audible behavior remain untested. New Bezier handle authoring and real-time Arrangement envelope editing remain unsupported. Original curve metadata has automated preservation coverage; this run used default-interpolation points.

Offline tools still never apply to the open Set. Their `verified` result covers file/XML checks only. Live can modify unrelated XML when saving; exact restoration deliberately refuses non-envelope differences. Preserve snapshots and the original source.

Private evidence is stored locally under `work/live-validation-20261006` in the development workspace (`session-evidence.json`, `offline-evidence.json`, and validation Sets). Sets, snapshots and connection tokens are excluded from Git.

## 日本語

**Live 11.3.43 / Windows** の専用検証Setで確認。元の制作Setは編集・保存していません。

- Sessionの音量・パン・センド・デバイスONの書込／読戻し、対象だけの削除、保存後の保持、再生中・古い操作情報の拒否を確認。
- 保存済みSetのテンポ／音量カーブを別名ファイルへ作成。Liveで読み込み、途中の拍での値・無音再生中のテンポ追従・音量カーブ表示・再保存後の点の保持を確認。
- 元ファイルへのバイト完全復元と、復元したSetのLive読み込みを確認。120 BPM・0 dB・追加Arrangement音量カーブなしに戻った。
- 実機で判明した2件（通常トラックのマスター専用項目参照、存在しないSession判定）を修正し、回帰テストを追加。
- ファイルの音量値は線形ゲイン、APIの音量値は正規化フェーダー値。1 = 0 dBというファイル値と、約0.85 = 0 dBというAPI値を混同しない。
- Mac／Live 12／音声クリップ／全プラグイン・全曲線・聴感は未検証。新しいBezierハンドル指定や開いたままのArrangement曲線編集は未対応。

## v0.13 recording follow-up / 自動記録の追加検証

Live 11.3.43 / Windows, separate `V013 Validation.als` on 2026-10-06:

- Initial preparation correctly refused a one-bar count-in. After disabling it, preparation succeeded without modifying transport.
- Audio-track volume: 0–4 beats, native fader 0.6–0.85; 18 scheduler writes, stopped automatically with no cleanup errors. Live save contained 19 FloatEvents including sentinel/boundary events. Last sampled beat was 3.8957; saved last value was linear gain 0.97066 at beat 3.904, not the requested exact endpoint.
- Master tempo: 8–12 beats, 100–140 BPM, executed through the Node server; returned remote operation ID worked with the status tool. 18 scheduler writes, stopped automatically with no cleanup errors. Live save contained tempo events from 100 to 137.553 BPM plus a return to 120 near beat 12.023. This confirms real recording, not precise endpoint reproduction.
- Both saved envelopes were parsed independently from gzip/XML. Evidence is local under `work/live-validation-20261006/recording-volume.json`, `recording-tempo.json`, and `recorded-events.json`; Sets and machine-specific evidence are not distributed.
- Automated tests: 60 Node tests and 21 Python tests at this checkpoint. Python recording cases cover blocked preflight, stale/expired/session guards, completion, timeout, arming changes, playhead jumps, cancellation, cleanup failure, consumed tokens and startup failure. These are not all hardware fault tests.
- Original production Set was not edited. macOS / Live 12, native Bezier-handle authoring and exact runtime breakpoint enumeration remain unverified/unsupported.

日本語: 専用Setで音量・テンポの自動記録とLive保存後の折れ点を確認。カウントイン有効時は開始前に拒否しました。記録結果は約0.1秒間隔の近似で、指定した最終値・終端位置とは一致しません。精密編集には保存済みSetのツールを使用します。元の制作Setは変更していません。

Final install check: Live reports bridge 0.13.0 and Remote Script 0.4.0 after restart; playback is stopped. The device UI displays v0.13. MCP advertises 62 tools.
