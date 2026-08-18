# WP65: 拠点（設置台）計測基盤

**目的**: 「どの拠点でどのゲームが当たるか」「1拠点あたり月いくらか」を数字で出す。
実験①（ゲーム800本 → 利益と傾向と対策 → 飲食店の受注を取る）の証拠づくりの土台であり、
1拠点あたり月次売上のユニットエコノミクスを検証する唯一の計測経路。

## 着手理由（なぜ最初にこれか）

着手前の状態では、台を店舗に置いても数字が拠点単位で取れなかった。

- `nfc_spots` は「1スポット = 1ゲーム」のリダイレクト先でしかない
- `/nfc/:spotId` は `/play/:gameId` に飛ばすだけで**計測イベントを出していない**
- `analytics_events` に拠点の次元がない（`game_id` のみ）
- 売上（`purchase`）も拠点に紐づかない

つまり「Barで外国人が1万円入れた」類の事実を、再現可能なデータとして残す手段がなかった。
データは貯まるのに時間がかかるので、量産・営業より先に計測を通す。

## 実装（2026-08）

### 1. スキーマ: `supabase/migrations/20260818_venue_analytics.sql`

| 追加物 | 内容 |
|---|---|
| `nfc_spots.venue_type / audience / area / active / notes` | 拠点メタ。業態(izakaya/bar/shokudo/…)と客層(local/inbound/mixed)が分析の主軸 |
| `nfc_spot_games` | 拠点ごとのラインナップ（複数ゲーム + 並び順 + 有効フラグ）。既存の `nfc_spots.game_id` は移送済みで、以後はラインナップが空のときだけのフォールバック |
| `analytics_events.spot_id` | 全イベントへの拠点帰属（+ 単独/複合index） |
| `admin_spot_stats(days)` | 拠点別サマリ。`revenue_per_30d` = 期間を30日に正規化した月次換算 |
| `admin_spot_game_stats(spot, days, min_plays)` | **拠点×ゲーム**。当たり判定の本体 |
| `admin_spot_daily(spot, days)` | 拠点の日次時系列（傾き） |
| `admin_spot_audience_stats(days)` | 客層×業態の1拠点あたり月次 |

RPC は全て `SECURITY DEFINER` + 先頭で `is_admin()` チェック（既存 WP60 RPC と同じ作法）。

### 2. 帰属の流れ

```
NFCタップ /nfc/:spotId
  → setSpotContext(spotId)          … sessionStorage（そのタブ = その場の1回）
  → track('spot_enter', …)           … 遊ばなかったタップも母数に残す
  → ラインナップから巡回出題 → /play/:gameId
  → 以後の play_start / play_end / like / share に spot_id が自動で付く
  → 決済は Payment Link に client_reference_id=<spot_id> を載せ、
     stripe-webhook 側で spot_id 付きの purchase イベントとして記録
```

決済だけサーバー経由なのは、webhook がブラウザの spot コンテキストを見られないため。
`purchase` はサーバー側が唯一の発火源（クライアントから二重に出さない）。
`client_reference_id` は外部入力なので webhook 側で `spot_` + 英数字の形式検証を通す。

### 3. 出題ローテーション（`src/pages/nfc/lineupRotation.ts`）

端末ごとにランダムな開始位置を1度決め、以後タップのたびに +1 で巡回する。

- 一見客（1端末1タップ）が多い店舗でも先頭ゲームに露出が偏らない
- 常連（同一端末で複数回）には毎回違うゲームが出る

同一拠点内の各ゲームが比較可能な露出量を得ることが、「その拠点でどれが当たるか」の前提。

### 4. UI

- `src/pages/admin/NfcSpotManagerPage.tsx` — 拠点メタ編集 / ラインナップ編集（追加・並べ替え・有効切替）/ その拠点の30日実績（拠点×ゲーム表）
- `src/pages/admin/AdminDashboardPage.tsx` — 「1拠点あたり月次売上（中央値）」カード、拠点別サマリ、客層×業態

中央値を採っているのは、少数の当たり台に引っ張られる平均では計画値との比較にならないため。

## 運用手順（最初の実証台）

1. 管理画面で拠点を作成し、**業態と客層を必ず入れる**（未入力だと客層別の比較ができない）
2. ラインナップに 5〜10 本入れる。インバウンド拠点は第1階層カジュアル＋ジェネリックアーケード（許諾済みIP）を優先
3. NFCタグ／QRを設置して回す
4. 2週間ごとに `admin_spot_game_stats` を見て、下位を外し新しいゲームを入れる（入替ログは `notes` へ）

## 読む数字と判断基準

| 数字 | 意味 | 対応 |
|---|---|---|
| `spot_enter` → `play_start` の率 | 筐体まわりの導線。低ければゲームでなく置き方の問題 | POP・高さ・声かけを変える |
| `plays_per_session` | 1客あたり何回遊ぶか。連続性の指標 | 低ければ次ゲームへの繋ぎ（Bridge）を見直す |
| `completion_pct` | ゲーム単体の出来。低すぎ＝難度、高すぎ＝手応え不足 | 該当ゲームを台帳に戻して調整 |
| `revenue_per_30d` | 1拠点あたり月次。計画 ¥24,000 / 実証 ¥6,000 | 客層別に差が出るかを先に見る |

## 未実装（次に効くもの）

- 拠点別の時間帯分析（何時に回るか＝営業時の設置提案に使う）
- ラインナップ入替の履歴テーブル（現在は `notes` へ手記録）
- 拠点オーナー向けの読み取り専用ダッシュボード（受注時の説明材料）
