# live_ears_list / live_ears_capture

[Ears](https://github.com/o0509daiki-jpg/live-ears)（別リポジトリの M4L オーディオエフェクト。手元は `~/dev/projects/live-ears`）を Set の各トラックに置くと、エージェントがそのトラックの実音を N 小節だけ WAV に書き出せます。Live Bridge デバイスとは別物で、同じトークンを使い、UDP 17840〜17849（要求）と 17838（返答）で話します。`src/ears-client.cjs` が担当し、ブリッジのロックは取りません。

## live_ears_list

引数なし。10 ポートに ping を送り、応答した Ears を返します。

```json
[{"version":"0.1.0","port":17840,"trackId":5,"trackName":"3-Bass A","setName":"","sampleRate":44100,"state":"idle","tempo":140,"playing":1,"signatureNumerator":4,"signatureDenominator":4,"currentBeat":16}]
```

`setName` は保存していない Set では空です。`state` は idle / armed / recording。

## live_ears_capture

| 引数 | 条件 |
|---|---|
| bars | 1〜64、必須 |
| port | 17840〜17849。`trackName` と排他。Ears が 1 台だけなら両方省略可 |
| trackName | 一覧の trackName と一致（大文字小文字は無視） |
| filename | 任意。`^[A-Za-z0-9_.-]{1,80}\.wav$`。省略時は `<トラック>_<bars>bars_<日時>.wav` |

- **再生中であることが前提**です。止まっていれば「Transport is stopped」で拒否します。`live_transport` の play かクリップの発火で先に再生を始めてください。Ears は再生を開始・停止しません。
- 録音は次の小節頭から始まり、`bars × 1 小節の拍数`（現在のテンポ・拍子）で止まります。サーバーはその長さ＋20 秒まで待ちます。
- 保存先は `~/media/dtm/<Set 名 または untitled>/captures/`。同名ファイルがあれば拒否します。
- 応答は `path`, `bars`, `startBeat`（実際に録音が始まった拍）, `beatsPerBar`, `tempo`, `durationMs`, `sampleRate`, `trackName`, `port`, `bytes`, `verified`, `analyze`（edm-audio の解析コマンド）。
- 収録中に再生が止まると、録音を閉じてエラーを返します。途中までのファイルが残ることがあります。

## 制限

- 開始はコントロールレートの監視（5 ms）なので、先頭が数 ms 欠けることがあります。解析用です。
- Rack の中に置いた Ears は見つかりません（トラック直下に置く）。
- 同じトラックに 2 台置いても動きます（別ポートになる）が、意味はありません。
- Live 12.1.5 / macOS で実機確認。Windows 未確認。

## 更新

Ears 本体の .amxd は live-ears リポジトリで `node scripts/build.cjs --install`。サーバー側は `npm run build` と MCP の再接続。
