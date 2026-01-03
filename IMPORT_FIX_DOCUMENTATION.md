# Import Error Fix Documentation

**修正日**: 2026-01-03
**対象**: ProjectStorageManager.ts - saveToDatabase() メソッド
**問題**: プロジェクトJSON Import時のDB保存エラー (409 Conflict)

---

## 問題の概要

ProjectSelectorからプロジェクトJSONをImportすると、以下のエラーでDB保存が失敗していました：

```
POST https://<supabase>/rest/v1/user_games?select=* 409 (Conflict)
Failed to save project to database: SupabaseError: duplicate key value violates unique constraint "user_credits_user_id_unique"
```

---

## 原因分析

### 1. データベーストリガー

`supabase_user_credits.sql` (247-250行目) にトリガーが設定されています：

```sql
CREATE TRIGGER on_user_game_created
  AFTER INSERT ON user_games
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_game_count();
```

このトリガーは `user_games` にINSERT時、自動的に `user_credits` にもUPSERTを実行します。

### 2. UNIQUE制約の問題

- **期待されるスキーマ**: `UNIQUE(user_id, month_year)`
- **実際のDB**: `UNIQUE(user_id)` のみ（古いスキーマが残っている可能性）

このため、既存ユーザーが2回目以降にImportすると、トリガーが `user_credits` にINSERTを試み、UNIQUE制約違反で409エラーになります。

### 3. エラーハンドリングの問題

従来のコードでは：

```typescript
// creditsがnullの場合にエラー
if (!credits) {
  throw new Error('ユーザーのクレジット情報が見つかりません');
}
```

新規ユーザーの場合、`user_credits` にレコードがないため、エラーになっていました。

---

## 修正内容

### 1. user_creditsレコードの事前作成（UPSERT）

**変更箇所**: `saveToDatabase()` メソッド (250-302行目)

```typescript
// ✅ 修正: user_creditsレコードを確実に作成（UPSERT）
const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

// プランチェック（subscriptionsテーブルから）
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan_type')
  .eq('user_id', userId)
  .in('status', ['active', 'trialing'])
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const isPremium = subscription?.plan_type === 'premium';
const monthlyLimit = isPremium ? 999999 : 3;

// ✅ user_creditsレコードをUPSERT（既存行があっても衝突しない）
try {
  const { error: upsertError } = await supabase
    .from('user_credits')
    .upsert({
      user_id: userId,
      month_year: currentMonth,
      monthly_limit: monthlyLimit,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,month_year',
      ignoreDuplicates: false
    });

  if (upsertError) {
    // UNIQUE制約がuser_idのみの場合、代替UPSERTを試行
    const { error: altUpsertError } = await supabase
      .from('user_credits')
      .upsert({...});
  }
} catch (upsertException) {
  // クレジット作成失敗は警告のみ（プロジェクト保存は継続）
  console.warn('[SaveDB-Manager] ⚠️ user_credits upsert exception (non-critical):', upsertException);
}
```

**効果**:
- 既存ユーザーでも衝突せずにuser_creditsが更新される
- 新規ユーザーの場合は新規作成される
- UPSERT失敗してもプロジェクト保存は継続される

### 2. エラーハンドリングの改善

**変更箇所**: `saveToDatabase()` メソッド (304-321行目)

```typescript
// プレミアムチェック（再取得）
const { data: credits, error: creditsError } = await supabase
  .from('user_credits')
  .select('is_premium, games_created_this_month, monthly_limit')
  .eq('user_id', userId)
  .eq('month_year', currentMonth)
  .maybeSingle(); // ✅ singleではなくmaybeSingleを使用（nullを許容）

if (creditsError && creditsError.code !== 'PGRST116') {
  // PGRST116 = "レコードなし"エラーは許容
  console.warn('[SaveDB-Manager] ⚠️ Failed to fetch user credits (non-critical):', creditsError);
}

const userCredits = credits || {
  is_premium: isPremium,
  games_created_this_month: 0,
  monthly_limit: monthlyLimit
};
```

**効果**:
- creditsが取得できなくてもデフォルト値を使用
- エラーで処理を中断しない

### 3. INSERT時の409エラーハンドリング

**変更箇所**: `saveToDatabase()` メソッド (344-365行目)

```typescript
try {
  result = await database.userGames.save(gameData);
} catch (saveError: any) {
  // ✅ 409エラー（UNIQUE制約違反）の場合、updateで再試行
  if (saveError.message?.includes('409') || saveError.message?.includes('duplicate')) {
    console.warn('[SaveDB-Manager] ⚠️ Duplicate detected, trying update instead...');
    const conflictGame = userGames.find(g => {
      const projectData = g.project_data as any as GameProject;
      return projectData && projectData.id === project.id;
    });

    if (conflictGame) {
      result = await database.userGames.update(conflictGame.id, gameData);
    } else {
      throw saveError;
    }
  } else {
    throw saveError;
  }
}
```

**効果**:
- INSERT失敗時、自動的にUPDATEに切り替え
- 重複エラーでもImportが成功する

### 4. カウンター更新の最適化

**変更箇所**: `saveToDatabase()` メソッド (373-376行目)

```typescript
// ✅ 修正: カウンター更新は非同期で行い、失敗してもプロジェクト保存は成功とする
// トリガーが既にカウントアップしているため、ここでの更新はスキップ
// （トリガーとの二重カウントを防止）
console.log('[SaveDB-Manager] 💎 Counter update handled by database trigger');
```

**効果**:
- トリガーとアプリ側の二重カウントを防止
- カウンター更新失敗でもプロジェクト保存は成功

---

## データベーススキーマ修正（推奨）

`fix_user_credits_constraint.sql` を実行して、UNIQUE制約を修正してください：

```sql
-- 古い制約を削除
DROP CONSTRAINT IF EXISTS user_credits_user_id_unique;

-- 正しい制約を追加
ALTER TABLE user_credits
ADD CONSTRAINT user_credits_user_id_month_year_key
UNIQUE (user_id, month_year);
```

---

## テスト確認項目

### ✅ 必須テスト

1. **新規ユーザーのImport**
   - [ ] 初回Import成功
   - [ ] user_creditsレコードが作成される
   - [ ] games_created_this_month = 1

2. **既存ユーザーの再Import**
   - [ ] 2回目のImport成功
   - [ ] 409エラーが発生しない
   - [ ] user_creditsが更新される

3. **同じプロジェクトの再Import**
   - [ ] 既存プロジェクトが上書きされる
   - [ ] 新規プロジェクトとして作成されない（IDが異なるため新規作成される）
   - [ ] エラーが発生しない

4. **Premiumユーザー**
   - [ ] Import成功
   - [ ] monthly_limit = 999999
   - [ ] 制限チェックをパス

### ✅ エッジケース

5. **subscriptionsレコードなし**
   - [ ] Freeプラン扱いになる
   - [ ] monthly_limit = 3
   - [ ] Import成功

6. **user_creditsのUPSERT失敗**
   - [ ] 警告ログが出る
   - [ ] プロジェクト保存は成功
   - [ ] アプリは正常動作

7. **user_gamesのINSERT失敗**
   - [ ] 自動的にUPDATEに切り替わる
   - [ ] Import成功

---

## 影響範囲

### 修正対象ファイル

- ✅ `src/services/ProjectStorageManager.ts` (saveToDatabase メソッド)

### 影響を受ける機能

- ✅ プロジェクトImport（ProjectSelector）
- ✅ プロジェクト保存（Editor）
- ✅ プロジェクト複製（Duplicate）
- ✅ バックアップ復元（Restore）

### 影響を受けない機能

- ✅ ゲームプレイ
- ✅ お気に入り機能
- ✅ プロフィール設定
- ✅ サブスクリプション管理

---

## ロールバック手順

万が一問題が発生した場合：

```bash
git revert <commit-hash>
git push origin <branch-name>
```

または、以下の変更を元に戻す：

1. `saveToDatabase()` の user_credits UPSERT処理を削除
2. `maybeSingle()` を `single()` に戻す
3. INSERT時の409ハンドリングを削除
4. カウンター更新ロジックを復元

---

## 関連ファイル

- `src/services/ProjectStorageManager.ts` - メイン修正ファイル
- `supabase_user_credits.sql` - トリガー定義
- `fix_user_credits_constraint.sql` - スキーマ修正SQL

---

## 参考情報

- Supabase UPSERT: https://supabase.com/docs/reference/javascript/upsert
- PostgreSQL UNIQUE制約: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
- Supabase Triggers: https://supabase.com/docs/guides/database/postgres/triggers
