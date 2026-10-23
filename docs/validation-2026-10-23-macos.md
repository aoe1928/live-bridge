# Live validation — 2026-10-23 (macOS, Live 12)

**English** | [日本語](#日本語)

Environment: Ableton Live **12.1.5 Suite / macOS 26 (Apple Silicon, M2)**, Max 8 (bundled), Node 24.14.1, Live Bridge **0.13.0**, Remote Script **0.4.0**. A throwaway empty Set (Live's default template: 2 MIDI + 2 Audio tracks) was used and discarded afterwards. No production Set was opened.

Automated: `npm test` 60/60, Python Remote Script tests 23/23 (`uv run --with pytest python -m pytest test`).

## Verified in Live

- `Live Bridge MIDI.amxd` hosted on a MIDI track reports 0.13.0; `live_status`, `live_list_tracks`, `live_list_devices`, `live_read_parameters`, `live_read_mixer` return the expected Set state (4 tracks, 2 returns, master, Reverb/Delay on returns).
- `live_create_clip` (4 beats, 2 notes) creates a Session clip; `live_read_notes` reads both notes back with IDs.
- `live_set_parameter` (Reverb Predelay 0.259 → 0.35 → 0.259) and `live_set_track` (mute 0 → 1 → 0) both return `verified:true` with matching before/after values.
- Remote Script (LiveBridgeBrowser in Control Surface slot 2): `live_browser_status` 0.4.0, `live_automation_capabilities`, `live_search_plugins` over AUv2/VST3 (Waves), `live_insert_plugin` of a VST3 plugin onto an audio track (`verified:true`; the device-side `live_list_devices` lists it afterwards).
- Insertion onto an empty MIDI track is refused with "Target must have audio output" as documented.

## Fixes found through Live testing

1. **macOS UDP datagram limit (EMSGSIZE).** macOS caps a UDP datagram at `net.inet.udp.maxdgram` = 9216 bytes. Any Remote Script reply above that (for example `live_search_plugins` for "Reverb", ~9.5 KB) failed with `[Errno 40] Message too long`, although the script allowed up to 60 KB. Replies larger than 7000 bytes are now split into ordered `{id, frame, frames, part}` frames and reassembled in `browser-client.cjs`. Smaller replies are unchanged. Covered by `test/test_browser.py` (framing) and `test/browser-client-frames.test.cjs` (reassembly over real loopback UDP, out-of-order delivery).
   Not changed: requests from the server to the Remote Script are still limited to 14 KB; on macOS a request above 9216 bytes will fail the same way (large automation point lists). Reduce the point count or split the request.

## Limits observed

- Re-selecting a Control Surface entry does not reload an already-imported Remote Script module in Live 12.1.5; restart Live after reinstalling the script.
- `live_search_plugins` walks `browser.plugins` only. Live's built-in devices (Utility, EQ Eight, Saturator …) are not searched and cannot be inserted through `live_insert_plugin`.
- Session automation writes, Arrangement recording and the offline saved-Set tools were not exercised in this run (they are covered by the 2026-10-06 Windows run).
- Not an upstream issue, noted for operators: enumerating the `max_for_live` browser category through a different Remote Script (ahujasid/ableton-mcp) crashed Live 12.1.5 (SIGABRT on a worker thread). Keep that query out of the workflow while Live Bridge is in use.

## 日本語

**Live 12.1.5 Suite / macOS 26 (Apple Silicon)** で、既定テンプレートの空 Set を使って確認。制作中の Set は開いていません。

- M4L デバイス側: 状態・トラック・デバイス・パラメーター・ミキサーの読み取り、Session クリップの作成とノート読み戻し、パラメーターとミュートの書き込み（before/after 検証付き）を確認。
- Remote Script 側: 状態取得、プラグイン検索（AUv2 / VST3）、オーディオトラックへの VST3 挿入を確認。空の MIDI トラックへの挿入は仕様どおり拒否。
- **修正**: macOS は UDP データグラムが 9216 バイトまで。Remote Script の返答がそれを超えると `[Errno 40] Message too long` で失敗していたため、7000 バイト超の返答を分割して送り、クライアント側で組み立てるようにした。Python / Node 両方にテストを追加。サーバー→Remote Script 方向の要求（上限 14 KB）は未対応で、9216 バイト超はやはり失敗する。
- **制約**: Control Surface の選び直しでは Remote Script が再読み込みされない（Live の再起動が要る）。検索は `browser.plugins` だけを走査し、Live 標準デバイスは対象外。
