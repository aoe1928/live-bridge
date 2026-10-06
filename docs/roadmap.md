# 追加機能の実装状況

v0.10で、指定された8項目の制作ツールを追加しました。[現在の実装範囲・使用方法・制限](production.md)を参照してください。以下はv0.9時点の企画メモです。音源・独自プリセット挿入、クリップ複製／削除、音声編集、シーン起動、録音準備など、8項目の今回の実装範囲を超える候補も含まれます。今回の追加機能は自動テスト済み、Live実機・Mac実機での検証は未実施です。

## 最初にまとめると便利な機能

| 優先 | 追加候補 | できるようになる指示例 | 実装方針 |
|---|---|---|---|
| 1 | L2以外のエフェクト・音源・プリセット挿入 | 「新しいReturnにValhallaを挿して」 | 既存Remote Scriptを拡張。検索結果から種類と挿入先を照合。インストール済み製品が対象。未検証の拡張候補 |
| 2 | 複数トラックのセンド・音量・パン・名前・色の一括設定 | 「ギター6本をこのリバーブに送って」 | 現在の1件ずつの操作をまとめる。送信先Return IDで指定し、件別に結果を返す。途中失敗を全成功と扱わない |
| 3 | 入出力ルーティング | 「この音源の出力をこのオーディオトラックで受けて」 | Trackのavailable routing候補を列挙し、実在する接続先を選ぶ。デバイス・OSで候補が異なる |
| 4 | トラック複製・削除 | 「この音色のトラックを複製して」 | Song API。対象ID・内容の確認と削除前プレビュー。Bridge本体を含むトラックの複製・削除は拒否 |

1と2を組み合わせると、Return作成 → 名前・色 → リバーブ挿入 → ギターのセンド設定まで1つの依頼で進められます。プラグインの内部画面や非公開パラメーターは別問題です。

## 制作向けの追加候補

| 機能 | 例・範囲 |
|---|---|
| MIDI編集の拡張 | ベロシティ、長さ、タイミング、ノートの追加・削除、クオンタイズ、範囲指定のヒューマナイズ。現在のピッチ編集・クリップ作成に追加 |
| クリップ整理 | クリップ名・色、ループ開始／終了、複製・削除、ミュート。Arrangement位置の変更は個別のAPI制約を確認 |
| オーディオクリップ調整 | ゲイン、ピッチ、Warpの有効化／方式。編集対象が音声クリップか照合。Warpマーカーは対応Live版を確認 |
| シーン管理 | Sessionのシーン作成・複製・削除・名前付け・起動。制作編集と再生操作を分離 |
| ロケーター管理 | Intro、Verse、Chorusなどの位置・名前を管理。SongのキューポイントAPIを使用 |
| 録音準備 | 録音待機、モニター設定、メトロノーム、ループ区間・パンチ範囲。録音開始は別の明示操作 |
| ミックス設定の保存・比較 | 音量・パン・センド・公開パラメーターをローカルJSONに保存し、同じSet・対象IDと照合して復元。Live Set全体やプラグイン完全状態の保存とは異なる |

音量・センドのdB指定は、ネイティブAPI値を単純にdBと見なさず、パラメーターごとの表示と変換の検証が必要です。

## 別途調査・画面操作が必要なもの

- グループ作成／解除、任意のトラック並び替え：現在の並び替えは画面操作を伴う制限付きワークフロー。Windows / Macで入力方式と許可が異なる。
- フリーズ／フラット化、書き出し、Setの保存ダイアログ：今回確認したMax APIだけでの汎用対応は約束しない。Remote Scriptの可用性とOS別画面操作を個別検証。
- プラグイン独自画面・非公開設定：Liveに公開されたパラメーター以外は画面操作等が必要。
- 任意のArrangementオートメーション描画：現在値変更とは異なる。対象Live版と公開APIの書き込み範囲を調査してから設計。

仕様の根拠：[Song](https://docs.cycling74.com/apiref/lom/song/)、[Track](https://docs.cycling74.com/apiref/lom/track/)、[Clip](https://docs.cycling74.com/apiref/lom/clip/)。上の「実装方針」はこれらと既存コードを基にした提案です。

## v0.11 オートメーション

Sessionクリップのサンプリング・ステップ／直線近似・全エンベロープ削除を追加。詳細と未対応範囲は[automation.md](automation.md)。Arrangement・テンポの曲線、元の折れ点取得と完全復元は引き続き未実装。

## v0.12 保存済みSetのオートメーション

Live 11の保存済みSetに対するArrangement・テンポの点編集／新規エンベロープ作成、元の属性付き折れ点取得、元Setのバイト完全復元を追加。[オフラインツール](set-automation.md)。ツール自体は開いているLiveへ反映しない。2026-10-06にLive 11.3.43 / Windowsの専用Setで読み込み・無音再生中のテンポ追従・保存・復元を確認。[検証記録](validation-2026-10-06.md)。v0.11の未実装記録は当時の状態。

## v0.13 follow-up / 追加対応

Bounded real-time Arrangement recording (including master tempo), runtime capability diagnostics and an offline sampled Bezier generator are implemented. See [recording guide](recording.md) and [validation](validation-2026-10-06.md). Native handle authoring, exact breakpoint enumeration in the running Set, and macOS / Live 12 verification remain open.

Arrangementへの時間制限付き自動記録、実行環境の確認、Bezier点列生成を追加。ネイティブのハンドル作成、開いているSetからの折れ点完全取得、Mac／Live 12実機検証は残っています。
