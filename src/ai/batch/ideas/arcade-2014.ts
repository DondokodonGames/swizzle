/**
 * ideas/arcade-2014.ts
 * Arcade Archives 2014年配信タイトル — Swizzleゲームネタ帳
 *
 * 各エントリは GameConfig の骨格仕様。
 * title        : Arcade Archives での表記
 * brand        : 当時のブランド
 * year         : 原作発売年
 * duration     : 想定プレイ時間（秒）
 * difficulty   : easy / normal / hard
 * concept      : Swizzle上でのゲームコンセプト（1〜2文）
 * objects      : 必要なオブジェクト（SVG種別 + 役割）
 * counters     : 必要なカウンター
 * winTrigger   : クリア条件
 * failTrigger  : 失敗条件（あれば）
 */

export const arcade2014Ideas = [
  {
    id: 'arcade-001',
    title: 'クレイジー・クライマー',
    brand: 'ニチブツ',
    year: 1980,
    duration: 25,
    difficulty: 'normal',
    concept: 'ビルの左右の窓が交互に開閉する。左窓と右窓が同時に開いた0.5秒の間だけ掴める。左右交互タップのリズムを崩さずに頂上まで登り切れ。',
    objects: [
      { shape: 'rect', role: '左窓', note: '開閉アニメ（visible/hidden切替）' },
      { shape: 'rect', role: '右窓', note: '開閉アニメ（visible/hidden切替）' },
      { shape: 'face', role: 'クライマー', note: '進捗インジケーター' },
    ],
    counters: [
      { id: 'grabs', name: '掴み数', target: 10, note: '10回成功で頂上到達' },
    ],
    winTrigger: 'counter grabs >= 10',
    failTrigger: '制限時間切れ',
  },
  {
    id: 'arcade-002',
    title: '忍者くん 魔城の冒険',
    brand: 'UPL',
    year: 1984,
    duration: 20,
    difficulty: 'normal',
    concept: '3段の足場に妖怪が並ぶ。忍者の手裏剣が届く高さ（忍者と同じ段）の妖怪だけタップして倒せる。高さが違う妖怪をタップすると外れ。',
    objects: [
      { shape: 'star', role: '妖怪（上段）', note: '' },
      { shape: 'star', role: '妖怪（中段）', note: 'タップ有効' },
      { shape: 'star', role: '妖怪（下段）', note: '' },
      { shape: 'triangle', role: '忍者', note: '中段固定' },
    ],
    counters: [
      { id: 'killed', name: '撃退数', target: 5, note: '中段妖怪を5体倒す' },
    ],
    winTrigger: 'counter killed >= 5',
    failTrigger: '中段以外タップで miss カウント3回',
  },
  {
    id: 'arcade-003',
    title: 'アルゴスの戦士',
    brand: 'テクモ',
    year: 1986,
    duration: 20,
    difficulty: 'normal',
    concept: 'ディスクアーマーが糸で弧を描いて伸びる。最大伸長した瞬間だけ攻撃判定が発生する。敵がその延長線上に来た0.5秒にタップ。',
    objects: [
      { shape: 'diamond', role: 'ディスクアーマー', note: '左右スイング' },
      { shape: 'circle', role: '敵（移動）', note: '横移動' },
    ],
    counters: [
      { id: 'hits', name: 'ヒット数', target: 3, note: '3体撃破でクリア' },
    ],
    winTrigger: 'counter hits >= 3',
    failTrigger: '制限時間切れ',
  },
  {
    id: 'arcade-004',
    title: 'エキサイティングアワー',
    brand: 'テクノスジャパン',
    year: 1985,
    duration: 30,
    difficulty: 'hard',
    concept: '対戦相手をフォールで3カウント取る。相手を押さえ込む（連打タップ）と相手が起き上がろうとする。起き上がる直前に次の押さえ込みタップを入れて3カウント。',
    objects: [
      { shape: 'face', role: 'レスラー（自分）', note: '' },
      { shape: 'face', role: 'レスラー（相手）', note: '押さえ込まれると点滅' },
      { shape: 'button', role: '押さえ込みボタン', note: '' },
    ],
    counters: [
      { id: 'count', name: 'カウント', target: 3, note: '3カウントでフォール勝ち' },
      { id: 'taps', name: '連打', target: 5, note: '5連打で押さえ込み成立' },
    ],
    winTrigger: 'counter count >= 3',
    failTrigger: '相手が起き上がったら count リセット、3回リセットで失敗',
  },
  {
    id: 'arcade-005',
    title: 'ボンジャック',
    brand: 'テーカン',
    year: 1984,
    duration: 25,
    difficulty: 'normal',
    concept: '5個の爆弾が画面に浮かぶ。火のついていない爆弾（白）を先に全てタップし、次に点火済み（橙）をタップしてボーナス最大化。順番を守れ。',
    objects: [
      { shape: 'bomb', role: '未点火爆弾×3', note: '白色' },
      { shape: 'bomb', role: '点火済み爆弾×2', note: '橙色' },
    ],
    counters: [
      { id: 'white', name: '未点火収集', target: 3, note: '' },
      { id: 'lit', name: '点火収集', target: 2, note: 'white>=3 の後に有効' },
    ],
    winTrigger: 'counter white >= 3 AND counter lit >= 2',
    failTrigger: '点火済みを先にタップすると失敗',
  },
  {
    id: 'arcade-006',
    title: 'ワンダーボーイ',
    brand: 'エスケープ',
    year: 1986,
    duration: 20,
    difficulty: 'easy',
    concept: 'スケートボードで右へ走りながら斧を投げる。右から来る敵が斧の水平軌道と重なった瞬間にタップして命中させよ。',
    objects: [
      { shape: 'triangle', role: 'ワンダーボーイ（左固定）', note: '' },
      { shape: 'circle', role: '敵（右から左へ移動）', note: '' },
      { shape: 'button', role: '投げボタン', note: '' },
    ],
    counters: [
      { id: 'hits', name: '命中数', target: 5, note: '5体撃破でクリア' },
    ],
    winTrigger: 'counter hits >= 5',
    failTrigger: '制限時間切れ',
  },
  {
    id: 'arcade-007',
    title: '熱血硬派くにおくん',
    brand: 'テクノスジャパン',
    year: 1986,
    duration: 20,
    difficulty: 'normal',
    concept: '3人の不良が迫る。拳を振り上げたモーション（腕が上がった0.3秒）の敵だけカウンタータップが通じる。それ以外の時にタップすると逆にダメージ。',
    objects: [
      { shape: 'face', role: '不良A', note: '攻撃モーション中のみタップ有効' },
      { shape: 'face', role: '不良B', note: '同上' },
      { shape: 'face', role: '不良C', note: '同上' },
    ],
    counters: [
      { id: 'beaten', name: '撃退数', target: 3, note: '3人全員撃退でクリア' },
    ],
    winTrigger: 'counter beaten >= 3',
    failTrigger: 'モーション外タップ3回で失敗',
  },
  {
    id: 'arcade-008',
    title: 'ムーンクレスタ',
    brand: 'ニチブツ',
    year: 1980,
    duration: 20,
    difficulty: 'normal',
    concept: '3機の宇宙船が順番にドッキングする。1機目+2機目のドッキングポートが重なった瞬間にタップ→成功したら2機目+3機目のポートが重なる瞬間にタップ。2回連続成功でクリア。',
    objects: [
      { shape: 'triangle', role: '1号機（固定）', note: '' },
      { shape: 'triangle', role: '2号機（上下移動）', note: '' },
      { shape: 'triangle', role: '3号機（上下移動）', note: '2号機ドッキング後に出現' },
    ],
    counters: [
      { id: 'docked', name: 'ドッキング数', target: 2, note: '2回でクリア' },
    ],
    winTrigger: 'counter docked >= 2',
    failTrigger: '位置がずれた状態でタップすると失敗',
  },
  {
    id: 'arcade-009',
    title: 'ソロモンの鍵',
    brand: 'テクモ',
    year: 1986,
    duration: 25,
    difficulty: 'hard',
    concept: '5個の鍵がブロックの裏に隠れている。ゲーム開始時に1秒間だけ全ての鍵の位置が光って見える。記憶して全ての鍵のブロックをタップして破壊。記憶ゲーム要素。',
    objects: [
      { shape: 'rect', role: 'ブロック×5（鍵を隠す）', note: 'ゲーム開始1秒後にkey位置が光る' },
      { shape: 'star', role: '鍵（ブロック内に隠れる）', note: '' },
    ],
    counters: [
      { id: 'keys', name: '鍵取得数', target: 5, note: '全5個でクリア' },
    ],
    winTrigger: 'counter keys >= 5',
    failTrigger: '鍵のないブロックをタップするとミス、3ミスで失敗',
  },
  {
    id: 'arcade-010',
    title: 'NOVA2001',
    brand: 'UPL',
    year: 1983,
    duration: 20,
    difficulty: 'normal',
    concept: '4体の敵が3秒ごとに隊列を変えながら移動する。全員が横一列に揃った0.5秒だけ一斉射撃が全員に当たる。その瞬間にタップ。',
    objects: [
      { shape: 'circle', role: '敵A', note: '移動中' },
      { shape: 'circle', role: '敵B', note: '移動中' },
      { shape: 'circle', role: '敵C', note: '移動中' },
      { shape: 'circle', role: '敵D', note: '移動中' },
    ],
    counters: [
      { id: 'volleys', name: '一斉射撃数', target: 3, note: '3回成功でクリア' },
    ],
    winTrigger: 'counter volleys >= 3',
    failTrigger: 'バラバラの時にタップするとミス、3ミスで失敗',
  },
  {
    id: 'arcade-011',
    title: 'シティコネクション',
    brand: 'ジャレコ',
    year: 1985,
    duration: 20,
    difficulty: 'easy',
    concept: 'パトカーが追跡中、道路上に猫がいる。車が猫の上を通過する瞬間にタップして車をバウンドさせ、パトカーを飛び越す。3回成功で振り切りクリア。',
    objects: [
      { shape: 'rect', role: '自動車（左右移動）', note: '' },
      { shape: 'face', role: '猫（固定）', note: 'バウンドトリガー' },
      { shape: 'rect', role: 'パトカー（追跡）', note: '' },
    ],
    counters: [
      { id: 'jumps', name: 'ジャンプ成功', target: 3, note: '3回でクリア' },
    ],
    winTrigger: 'counter jumps >= 3',
    failTrigger: 'パトカーに追いつかれたら失敗',
  },
  {
    id: 'arcade-012',
    title: '空手道',
    brand: 'データイースト',
    year: 1984,
    duration: 20,
    difficulty: 'normal',
    concept: '相手が上段/中段/下段の3種の構えを順番に変える。中段構えになった瞬間だけ正拳突きが決まる。他の構えでタップすると弾かれる。5本先取でクリア。',
    objects: [
      { shape: 'face', role: '自キャラ', note: '固定' },
      { shape: 'face', role: '対戦相手', note: '構えが3パターンで変化' },
      { shape: 'button', role: '攻撃ボタン', note: '' },
    ],
    counters: [
      { id: 'ippon', name: '一本数', target: 5, note: '5本でクリア' },
    ],
    winTrigger: 'counter ippon >= 5',
    failTrigger: '弾かれた回数3回で失敗',
  },
  {
    id: 'arcade-013',
    title: 'エクセリオン',
    brand: 'ジャレコ',
    year: 1983,
    duration: 20,
    difficulty: 'hard',
    concept: '自機が慣性で動き続け、弾も慣性を受けて曲がる。敵が弾の予測着弾点と重なった瞬間にタップして慣性砲撃を成功させよ。',
    objects: [
      { shape: 'triangle', role: '自機', note: '慣性移動（自動）' },
      { shape: 'circle', role: '敵（移動パターン）', note: '' },
      { shape: 'button', role: '射撃ボタン', note: '' },
    ],
    counters: [
      { id: 'hits', name: '命中数', target: 4, note: '4体撃破でクリア' },
    ],
    winTrigger: 'counter hits >= 4',
    failTrigger: '制限時間切れ',
  },
  {
    id: 'arcade-014',
    title: 'テラクレスタ',
    brand: 'ニチブツ',
    year: 1985,
    duration: 25,
    difficulty: 'normal',
    concept: '5機のパーツが画面各所に散らばる。番号（1→2→3→4→5）通りの順序でタップして収集すると正しく合体。順番を間違えるとパーツが再度散らばる。',
    objects: [
      { shape: 'triangle', role: 'パーツ1', note: '番号表示' },
      { shape: 'triangle', role: 'パーツ2', note: '' },
      { shape: 'triangle', role: 'パーツ3', note: '' },
      { shape: 'triangle', role: 'パーツ4', note: '' },
      { shape: 'triangle', role: 'パーツ5', note: '' },
    ],
    counters: [
      { id: 'parts', name: '収集数', target: 5, note: '順番通りに5個でクリア' },
    ],
    winTrigger: 'counter parts >= 5（順序正解時のみ加算）',
    failTrigger: '順番間違いでカウンターリセット（3回で完全失敗）',
  },
  {
    id: 'arcade-015',
    title: 'ダブルドラゴン',
    brand: 'テクノスジャパン',
    year: 1987,
    duration: 20,
    difficulty: 'normal',
    concept: 'ビリーが4人の敵に囲まれている。スピンキックの回転円が4人全員を同時に覆った瞬間にタップして一掃。敵が散らばっていると当たらない。',
    objects: [
      { shape: 'face', role: 'ビリー（中央）', note: '' },
      { shape: 'circle', role: '敵×4（周囲を移動）', note: 'ランダム位置' },
      { shape: 'button', role: 'スピンキックボタン', note: '' },
    ],
    counters: [
      { id: 'sweeps', name: '全員一掃数', target: 1, note: '1回成功でクリア' },
    ],
    winTrigger: 'タップ時に全4体が円内にいる',
    failTrigger: '制限時間切れ',
  },
  {
    id: 'arcade-016',
    title: 'レイダース5',
    brand: 'UPL',
    year: 1985,
    duration: 20,
    difficulty: 'normal',
    concept: '5機のレイダー機が陣形を組みながら接近する。5機全員が所定の陣形を完成させた（最後の1機が定位置に入った）瞬間にタップして中心爆破。',
    objects: [
      { shape: 'diamond', role: 'レイダー×5', note: '各自が移動して陣形を作る' },
      { shape: 'button', role: '爆破ボタン', note: '' },
    ],
    counters: [
      { id: 'blasts', name: '陣形爆破数', target: 3, note: '3回成功でクリア' },
    ],
    winTrigger: '全5機が陣形完成状態でタップ',
    failTrigger: '陣形未完成でタップするとミス、3ミスで失敗',
  },
  {
    id: 'arcade-017',
    title: 'スクランブル',
    brand: 'KONAMI',
    year: 1981,
    duration: 25,
    difficulty: 'normal',
    concept: '地上の燃料タンクが点在する。爆弾は真下にしか落ちないため、タンクが機体の真下に来た瞬間にタップして投下。かつ残燃料が0になる前に3基破壊。',
    objects: [
      { shape: 'triangle', role: '自機（右へ自動移動）', note: '' },
      { shape: 'rect', role: '燃料タンク×3', note: '地上に固定' },
      { shape: 'button', role: '投下ボタン', note: '' },
    ],
    counters: [
      { id: 'tanks', name: '破壊数', target: 3, note: '3基でクリア' },
      { id: 'fuel', name: '燃料', target: 0, note: '0になったら失敗（時間経過で減少）' },
    ],
    winTrigger: 'counter tanks >= 3',
    failTrigger: 'counter fuel <= 0',
  },
  {
    id: 'arcade-018',
    title: 'Mr.五右衛門',
    brand: 'KONAMI',
    year: 1986,
    duration: 20,
    difficulty: 'normal',
    concept: '五右衛門が煙管（きせる）を放物線で投げる。煙管の放物線の頂点が敵の位置と重なった瞬間にタップして命中。頂点のタイミングは敵の高さで変わる。',
    objects: [
      { shape: 'face', role: '五右衛門（左端）', note: '' },
      { shape: 'circle', role: '敵（上下移動）', note: '' },
      { shape: 'button', role: '投げボタン', note: '' },
    ],
    counters: [
      { id: 'hits', name: '命中数', target: 4, note: '4体撃破でクリア' },
    ],
    winTrigger: 'counter hits >= 4',
    failTrigger: '制限時間切れ',
  },
] as const;
