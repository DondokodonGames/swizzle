# WP71: ゲームのアップロード方法と確認方法(引き継ぎメモ)

棚バリエーション制作(WP70: I/J/K の v2・v3)で作ったコードゲームを、
**遊べる状態にする(Supabase へアップロードする)手順**と、**ちゃんと動くかを確かめる手順**をまとめたもの。
あわせて、残りの制作を再開するときの手順も書いておく。

> 大前提: デプロイ済みのアプリは **Supabase の `user_games` テーブル**からゲームを読む。
> git に `.js` を入れて push しただけでは本番では遊べない。アップロード(§2)が必要。
> 一方、エンジン(`src/services/code-game/iframeTemplate.ts`)の変更はアプリ本体と一緒に配信されるので、再アップロードは要らない。

---

## 1. 現状(このメモを書いた時点)

| 棚 | 目標 | 本数 | 残り |
|---|---|---|---|
| I(プチゲーム集風) | 400 | 400 | なし(完了) |
| J(ボードパーティのミニゲーム集風) | 350 | 316 | `J-var.tsv` の34行(未着手) |
| K(リズムゲーム集風) | 400 | 302(+第8波24本を制作中) | `K-var.tsv` の status が `built` でない行 |

- 作業ブランチ: `claude/dreamy-einstein-dmr3y8`(main にはまだ入っていない)
- `src/ai/code/games/` 配下のゲーム総数: `npm run ai:upload:games:dry` の最後に出る「合計」で確認できる
- 進み具合の数え方:
  ```bash
  for s in I J K; do echo "$s: $(ls src/ai/code/games/*/$s-*.js | wc -l)"; done
  awk -F'\t' 'NR>1 && $3!="built"' docs/work-plans/ledger/sources/plays/K-var.tsv | wc -l   # K の残り行
  awk -F'\t' 'NR>1 && $3!="built"' docs/work-plans/ledger/sources/plays/J-var.tsv | wc -l   # J の残り行
  ```

---

## 2. アップロード方法(人間が手元のPCで行う)

アップロードは本番データベースへの書き込みなので、**人間が手元で実行する**(AI は実行しない)。

### 2-1. 準備(初回だけ)

1. リポジトリを手元に用意し、アップロードしたいブランチを checkout する。
   - main にマージ済みなら `main`、まだなら `claude/dreamy-einstein-dmr3y8`。
   ```bash
   git fetch origin
   git checkout main && git pull          # または: git checkout claude/dreamy-einstein-dmr3y8 && git pull
   npm ci
   ```
2. リポジトリ直下に `.env.local` を作り、次の3つを書く(**このファイルは絶対に commit しない**。`.gitignore` 済み)。
   ```
   VITE_SUPABASE_URL=<Supabase プロジェクトの URL>
   SUPABASE_SERVICE_KEY=<Supabase の service_role キー>
   MASTER_USER_ID=<ゲームの作成者として登録するユーザーの UUID>
   ```
   - URL と service_role キー: Supabase ダッシュボード → Project Settings → API。
   - `MASTER_USER_ID`: これまでのアップロードと同じ運営アカウントの UUID(Supabase → Authentication → Users、または `profiles` テーブル)。
   - service_role キーは全権限を持つので、チャットやスクリーンショットに貼らない。

### 2-2. 実行

```bash
# ① まず試運転(Supabase に接続しない。対象ファイルの一覧と件数だけ出る)
npm run ai:upload:games:dry

# ② 本番アップロード(まだ登録されていないゲームだけを追加する)
npm run ai:upload:games
```

- **途中で止まっても、もう一度同じコマンドを実行すれば続きから再開できる。**
  同じ `template_id`(`game:<ファイル名>`)が既にあるゲームは自動でスキップされる。
- 最後に `✅ 成功 / ⏭️ スキップ / ❌ 失敗` の件数が出る。失敗が0件ならOK。
  失敗があれば、表示されたエラー(多くは通信エラー)を確認してもう一度実行する。
- 実行後、`src/ai/v2/upload-games-progress.json`(手元の進捗メモ)ができる。commit は不要(`.gitignore` 済み)。

### 2-3. 使い分け

| やりたいこと | コマンド |
|---|---|
| 新しいゲームだけ追加(通常はこれ) | `npm run ai:upload:games` |
| 既に登録済みのゲームのコードを直したので、上書きしたい | `OVERWRITE=true npm run ai:upload:games` |
| 何がアップロード対象か見るだけ | `npm run ai:upload:games:dry` |

- `OVERWRITE=true` は**全件**を上書きする(プレイ数・いいね数・ID・作成日時は保持される)。
  コードを直したときだけ使う。新規追加には使わなくてよい。
- `PRICE_SYNC=true` はヘッダーに `// @tier:` があるゲームの価格を同期する設定。今回の棚のゲームには `@tier` が無いので、付けても何も起きない。
- 破棄済みの旧 `src/ai/code/examples/` は既定では対象外(`LEGACY_EXAMPLES=true` を付けない限り触らない)。

---

## 3. 確認方法

### 3-1. アップロード前: 手元やプレビューで実際に遊んでみる

`/admin/local-games` という管理者用の画面があり、`src/ai/code/games/` のゲームを **Supabase を使わずに**そのまま遊べる。

- **手元で:** `npm run dev` → ブラウザで `http://localhost:3000/admin/local-games`
- **Vercel のプレビューで:** そのブランチのプレビュー URL の末尾に `/admin/local-games` を付けて開く
- どちらも **`profiles.is_admin = true` のアカウントでログイン**している必要がある(違うと「🔒 Admin only」と出る)。
- 系統(撃つ・音に乗る…)ごとに並ぶので、気になるゲームを選んで遊ぶ。
  - 見るポイント: タイトル画面で手のアイコンが遊び方を実演しているか / READY?→GO! で始まるか / 30秒以内に結果画面まで行くか / 音が鳴るか。

### 3-2. アップロード前: 自動チェック(コマンド)

制作時に全ゲームで通している検査。手で再確認したいときに使う。

```bash
# 1本ずつの品質チェック(valid: true かつ score 80以上なら合格)
npx tsx scripts/check-game.ts src/ai/code/games/rhythm/<ファイル名>.js

# 実際にブラウザで起動して動くか(複数指定可。結果とスクリーンショットが --out に出る)
npx tsx scripts/smoke-code-games.ts --files <ファイル1> <ファイル2> --out /tmp/smoke-check
npm run games:smoke:all        # 全ゲーム(時間がかかる)

# 権利チェック(実在の作品名・商標などが混ざっていないか)。error 0 本ならOK
npm run games:ip

# 遊びの重複チェック(似すぎたゲームの組を探す)
npx tsx scripts/dup-plays.ts --games
```

### 3-3. アップロード後: 本当に登録されたか

**Supabase ダッシュボード → SQL Editor** で次を実行する。

```sql
-- 棚ごとの登録数(I は 400、K は作った本数と一致すればOK)
select split_part(template_id, '-', 1) as shelf, count(*)
from user_games
where template_id like 'game:%'
group by 1 order by 1;

-- 公開状態の確認(is_published = true、review_status = 'approved' になっているはず)
select template_id, title, is_published, review_status, ai_quality_score, created_at
from user_games
where template_id like 'game:K-DS-0042%'
order by template_id;
```

- `shelf` の列は `game:I` / `game:J` / `game:K` のように出る。
- 件数が手元のファイル数より少なければ、§2-2 のアップロードをもう一度実行する(足りない分だけ追加される)。

### 3-4. アップロード後: 本番アプリで遊べるか

1. 本番(またはプレビュー)の Swizzle を開き、ログインする。
2. ゲーム一覧(フィード)に新しいゲームが出てくるか、いくつか選んで最後まで遊べるかを見る。
3. 1本ずつ狙って確かめたいときは、§3-3 の SQL で `id` を調べてからアプリで開く。

---

## 4. main に入れる手順

main は Ruleset「Protect main」とガードフックで守られていて、**AI はマージできない**(意図どおり)。

1. AI が作業ブランチ `claude/dreamy-einstein-dmr3y8` → `main` の PR を作る(依頼すれば作る)。
2. CI が通っているか、競合が無いかを確認する。
3. 人間が PR を承認してマージする。
4. マージ後に §2 のアップロードを実行する(ブランチのままアップロードしても動作は同じ)。

---

## 5. 残りの制作を再開する手順(K の残り行 → J の34行)

制作の指示書は WP70(`docs/work-plans/70-shelf-variation-batch-brief.md`)。
これを実装担当に丸ごと読ませ、4行ずつ渡して作らせる。1回の「波」は 6組 × 4本 = 24本。

1. 次の行を選ぶ:
   ```bash
   awk -F'\t' 'NR>1 && $3!="built"' docs/work-plans/ledger/sources/plays/K-var.tsv | head -24 | cut -f1,2,4,5,6
   ```
   (J は `J-var.tsv`。J の TSV には beat 列が無い。)
2. スタイルパックは、その棚で使用回数が少ないものから割り当てる:
   ```bash
   grep -h "^// スタイル:" src/ai/code/games/*/K-*.js | sed 's#// スタイル: *##' | sort | uniq -c | sort -n
   ```
3. 実装担当に渡す内容: WP70 を読むこと / 4行の id・mechanic・beat・play・world / スタイルパック4つ /
   元ゲームと同じ @mechanic の既存作を読んで操作・画面・デモを変えること / 世界観の重複チェック /
   禁止事項(git 操作・アップロード・`dup-plays.ts` の実行・担当外ファイルの編集)。
   行の内容が実在作品に近いとき(例: 「地下の配管工」「太鼓の大小の音符」)や、賭け・武器・危害に触れそうなときは、渡す前に注意書きを足す。
4. できた4本ごとに検査(§3-2 の4つ)。合格条件:
   - check-game: 4本とも `valid: true` かつ score ≥ 80、`@mechanic` が TSV どおり、`game.onUpdate(` がちょうど1回
   - smoke: 2回とも全本 PASS
   - games:ip: error 0 本
   - dup-plays: `code_sim ≥ 0.6` かつ `text_sim ≥ 0.35` の組が増えていない(既存の GH-PS-0051/0062 の1組だけ)
5. 合格したら TSV の該当行の status(3列目)を `built` に書き換え、ゲーム4本と TSV を commit。
   波の終わりに `npm run games:ledger` で台帳を作り直して commit し、作業ブランチへ push。
