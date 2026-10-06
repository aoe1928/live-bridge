# Live Bridge

**English** | [日本語](README.ja.md)

Control Ableton Live from MCP clients such as Codex and Antigravity using a Max for Live device and an optional Remote Script.

![Live Bridge mascot](assets/bridge-mascot.png)

The MCP server and Max devices are **v0.13**, with **62 MCP tools**. JavaScript and the mascot image are bundled inside each `.amxd`. The browser Remote Script is **v0.4.0**.

## Arrangement recording and curve generation in v0.13 (experimental)

Record a bounded parameter gesture directly into the open Arrangement, including master tempo: prepare, start, poll status, and cancel. Tracks must be disarmed; playback, Session clips, loop, punch, count-in and Link must be off. The run is limited to 64 beats / 120 seconds and stops on detected conflicts. **Recording starts playback and can overwrite automation.** Save a backup first. Completion confirms transport cleanup, not exact breakpoints; scheduler timing and the end value are approximate.

Live 11.3.43 / Windows validation saved new volume and tempo automation events from real recording runs. A read-only capability tool reports the running API and blocking recording conditions. An offline cubic Bezier generator produces sampled points for Session, recording and saved-Set workflows; it does not author native Live Bezier handles. See the [bilingual recording guide](docs/recording.md).

## Saved-Set automation in v0.12 (experimental, offline)

Read exact stored Arrangement breakpoints and curve attributes across normal/group/Return/master tracks, edit or create continuous envelopes (including tempo), and restore the original saved Set byte-for-byte. Four new MCP tools work on **saved Live 11 `.als` files**, without connecting to Live. Edits create a new file beside the source; they never change the open Set. Snapshot restoration refuses unrelated non-envelope changes. Original curved segments retain their stored metadata; new points use default interpolation. Live 12 files are rejected pending schema verification.

Verified on **Live 11.3.43 / Windows** in a separate empty validation Set: generated tempo/volume envelopes load, tempo follows during silent playback, volume automation is displayed, saved points survive Live serialization, and a byte-exact restored Set loads with original values. This is focused coverage, not verification of every parameter or curve type. See the [bilingual saved-Set guide](docs/set-automation.md). Existing Session tools still require the Remote Script.


## Automation in v0.11 (experimental)

Four new tools discover Session clip/parameter targets, sample envelopes, write steps or approximated linear ramps, and clear a selected envelope. Requires Remote Script v0.3.0. Live 11.3.43 / Windows checks cover volume ramps, pan/send/device-On steps, selected-envelope clearing, save/reload persistence and stale-token/session/playback guards. These Session/Remote Script tools do not provide original breakpoint editing, exact backup/restore, Arrangement/master/tempo envelopes or automation recording. Use the separate v0.12 saved-Set tools for offline Arrangement/tempo editing and exact restoration. See the [bilingual automation guide](docs/automation.md) for limits and reload instructions.


## Tested environment and compatibility

**Tested on Ableton Live 11 / Windows.** This describes the environment used for the existing Live checks, not verification of every feature in the current release.

- Verified in Live: the previously tested MIDI editing workflow, L2 insertion with existing-chain preservation, and track-reordering shortcuts; plus the focused automation checks above and empty Session MIDI clip creation. [Validation record](docs/validation-2026-10-06.md).
- Automated tests only: track appearance, other new clip/track creation paths, and the production tools added in v0.10. These still need verification in Live.
- **Ableton Live 12: not tested.** Compatibility is not confirmed, especially for Remote Script browser integration.
- **macOS: not tested on hardware.** Key definitions and shared logic have automated coverage only.

## What's new in v0.10

- Plugin insertion without an L2-only product allowlist.
- Batch mixer, track name, and color changes.
- Input/output routing.
- Track duplication and deletion.
- MIDI note attribute updates, additions, and deletions.
- Clip names, colors, loop boundaries, and markers.
- Scene and Arrangement locator management.
- Mix snapshot saving, comparison, and restoration, including Live-exposed plugin parameters.

See the [production tool guide and supported scope (Japanese)](docs/production.md). These additions have not yet been verified in Live or on macOS.

## Earlier additions

- **v0.9:** `live_create_track` appends an empty MIDI, audio, or Return track and returns its verified ID. It checks playback/recording, the bridge session, and track order before and after creation. No desktop control or Remote Script is required. This release had 27 tools. [Track creation (Japanese)](docs/create-track.md) · [Roadmap (Japanese)](docs/roadmap.md).
- **v0.8:** A [track-reordering workflow (Japanese)](docs/track-reorder.md) for Windows (Ctrl) and Mac (Command). MCP reads and prepares the order, a desktop-capable agent on the same computer sends one key action, and MCP verifies the resulting order and group membership. The MCP server itself does not send keys. Other normal editing operations do not require desktop control.
- **v0.7:** Track renaming and palette-based color changes. These do not recolor existing clips or reorder tracks. [Usage and checks (Japanese)](docs/track-appearance.md).

## Features

- Read tracks, clips, and MIDI notes; edit note pitches with conditional restoration.
- Play, stop, preview a bounded section, and change the current tempo or time signature.
- Control volume, pan, sends, mute, solo, and device parameters exposed to Live.
- Search installed plugins and append compatible audio effects through the Remote Script, without a product-name allowlist.
- Use the device's SETUP and HELP buttons. One MIDI or Audio bridge controls the entire Set.

## Setup

You need **Node.js 20 or later** and an Ableton Live installation with Max for Live. Plugins you want to load must already be installed and appropriately licensed.

Clone the repository, then use the User Library location shown in Live's preferences:

```sh
git clone https://github.com/aoe1928/live-bridge.git
cd live-bridge
npm run setup -- --user-library "C:/path/to/Ableton/User Library" --configure-clients
```

Replace the example with your actual absolute User Library path, including on macOS.

Setup performs the following steps:

1. Generates a machine-specific token and MCP server files in `dist`, preserving the token on updates.
2. Builds **self-contained `.amxd` devices with JavaScript and the image included**, and installs them in the User Library's Max Audio Effect / Max MIDI Effect folders.
3. Installs `LiveBridgeBrowser` in the User Library's Remote Scripts folder.
4. Configures the `ableton_live` MCP entry in Codex / Antigravity to use the same `dist/server.cjs`. Existing settings are backed up, and unrelated MCP entries are preserved.

After the initial installation, restart Live and select **LiveBridgeBrowser** in an unused Control Surface slot under **Preferences → Link/Tempo/MIDI**. Set **Input and Output to None**, and preserve existing controller entries such as KeyLab. Reconnect MCP in your AI client.

From Live's browser, place **Live Bridge Audio** on the Master or another compatible track, or **Live Bridge MIDI** before an instrument. Keep **exactly one bridge device in each Set**. You do not need to place JavaScript or image files beside the device.

Keep the `dist` folder: the AI client still needs the local MCP server. The `.amxd` alone does not replace that server. Generated devices contain a machine-specific token and should not be publicly redistributed. Run setup on each additional computer to generate a matching device/server pair.

To configure clients manually, omit `--configure-clients` and use `dist/mcp-settings.json` or the device's SETUP prompt. `npm run build` generates files without installing them; `npm test` runs the JavaScript tests. There are no additional npm dependencies.

For updates, run setup again and reload the device in Live. Restart Live whenever the Remote Script changes. See [browser integration and registration (Japanese)](docs/ブラウザー連携.md).

## Create MIDI clips

`live_create_clip` creates a Session clip from a note array and can copy it to a specified Arrangement beat position. See [arguments, examples, and limitations (Japanese)](docs/create-clip.md).

## Architecture

```text
MCP client → STDIO MCP server
              ├ UDP/OSC → Max for Live → MIDI, mixer, and song settings
              └ UDP     → Remote Script → plugin search and insertion
```

The Max bridge uses ports 17831/17832, and the Remote Script listens on `127.0.0.1:17833`. Router port forwarding is unnecessary. The Max receiver is not restricted to loopback. Requests use a shared token but are not encrypted; do not expose the bridge to external networks.

## Limitations

- One Live instance and one bridge device per Set. Multiple clients must share the same server folder so writes are serialized.
- Value changes and plugin insertion require stopped playback. Session identities and previous values or device chains are checked before editing.
- Parameter values use native API units. A volume value between 0 and 1 is not a dB value.
- Plugin-internal UI and unexposed parameters are not accessible through these tools. Editing a note in a MIDI loop affects every repetition.
- Instrument insertion on empty MIDI tracks, insertion inside Racks, automatic Set saving, and automatic reversal of plugin insertion are not supported.
- Remote Script behavior depends on the Live version. Recognition inside the Antigravity application has not been verified.

## Development and distribution

`src` contains the implementation, `device` contains editable Max patches, and `scripts/build.cjs` generates local artifacts. Rebuild and reload the device after implementation changes. Reinstall the Remote Script and restart Live after changes to that script.

Settings, tokens, generated `.amxd` devices, Live Sets, and operation histories are excluded from Git. Earlier Live tests covered appending L2, preserving the existing chain and MIDI edits, and the duplicate rejection implemented at that time. v0.10 permits multiple instances of the same product.

CI does not launch Live. It checks generated files, MCP schemas, and writes, conflicts, and partial failures against simulated Live APIs. Run Python tests with:

```sh
python -m unittest discover -s test -p "test_*.py"
```

Keep this English README and [README.ja.md](README.ja.md) synchronized when changing features, setup, limitations, or verification status.

## License

Project-authored code and documentation are licensed under the [MIT License](LICENSE).

**Images and character artwork are excluded from MIT**, including `assets/bridge-mascot.png` and its copies embedded in generated devices. See the [artwork licensing notice](assets/LICENSE.md). Obtain separate permission or use replacement artwork you have rights to distribute. Third-party code and assets retain their own license terms.
