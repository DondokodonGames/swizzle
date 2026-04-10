/**
 * ideas/bar-15.ts
 * バー向けミニゲームネタ帳 141〜150
 */

export const bar15Ideas = [
  {
    id: 'bar-141',
    title: '落ち葉踏み',
    duration: 10,
    concept: '画面いっぱいに落ち葉が散らばっている。タップするたびに「サクッ」という踏む音と共に葉っぱが潰れる。全部踏みきるのが目標。秋のリラックス系アプリとして癒やし効果を演出。',
    objects: [
      { shape: 'star', role: '落ち葉×複数（踏めば潰れる）', note: '' },
    ],
    counters: [
      { id: 'leaves', name: '踏んだ落ち葉数', target: 0, note: '全部踏むとクリア' },
    ],
    winTrigger: '全部踏みきった',
    resultTrigger: '全部踏み切るのにかかった時間を表示',
  },
  {
    id: 'bar-142',
    title: '性格診断（血液型なし）',
    duration: 15,
    concept: '「あなたは何型か」ではなく「今夜のあなたは何型の気分？」というユニークな問いかけ。4択の行動パターンを3問選ぶと「今夜はO型の気分・A型の気分」など結果と一言が出る。',
    objects: [
      { shape: 'button', role: '行動パターン4択ボタン', note: '' },
    ],
    counters: [
      { id: 'questions', name: '回答数', target: 3, note: '3問で結果' },
    ],
    winTrigger: '3問回答した',
    resultTrigger: '今夜の「血液型気分」と解説を表示',
  },
  {
    id: 'bar-143',
    title: '都道府県形クイズ',
    duration: 10,
    concept: '都道府県の形だけ（塗りつぶしのシルエット）が表示される。「この形はどこ？」を3択で答える。マニアックな問題も含み、地図好きの人が活躍できる。正解すると実際の地図上の位置も表示。',
    objects: [
      { shape: 'rect', role: '都道府県シルエット（全画面）', note: '' },
      { shape: 'button', role: '都道府県名の3択ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解と地図上の位置を表示',
  },
  {
    id: 'bar-144',
    title: '今夜のBGM選び',
    duration: 8,
    concept: '「今夜の雰囲気に合うBGMは？」というお題でランダムに音楽ジャンルとアーティスト名を表示。「ジャズ×マイルス・デイヴィス」「昭和歌謡×都はるみ」など場の話題になるマッチングを提案。',
    objects: [
      { shape: 'rect', role: 'BGM提案テキスト（全画面）', note: '' },
      { shape: 'button', role: '次の提案ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'BGM提案が表示された',
    resultTrigger: 'ジャンル×アーティスト名を全画面表示',
  },
  {
    id: 'bar-145',
    title: '「この子に似てる有名人」',
    duration: 8,
    concept: '「あなたが似ていると思う有名人を選んでください」という入力から「○○さんは実は○○に似ています！」というネタ診断。入力した名前に似ているとされる別の有名人をランダムに出す笑い系。',
    objects: [
      { shape: 'rect', role: '名前入力エリア', note: '' },
      { shape: 'rect', role: '似ている有名人名（ランダム）', note: '' },
    ],
    counters: [],
    winTrigger: '名前を入力してタップ',
    resultTrigger: 'ランダムで「似ている有名人」を表示',
  },
  {
    id: 'bar-146',
    title: 'ドリンクのカロリー計算',
    duration: 12,
    concept: '「今夜飲んだドリンクを入力してください」というUI。ビール・ワイン・日本酒・ウイスキー・カクテルなどを杯数と共に選択。合計カロリーを自動計算して「走って消費するには○分！」とコメント。',
    objects: [
      { shape: 'button', role: 'ドリンク選択ボタン（種類×数量）', note: '' },
      { shape: 'rect', role: '合計カロリー表示', note: '' },
    ],
    counters: [],
    winTrigger: '計算ボタンをタップ',
    resultTrigger: '合計カロリーと消費するための運動量を表示',
  },
  {
    id: 'bar-147',
    title: '「タイプは？」マッチング占い',
    duration: 12,
    concept: '5問の「どちらが好き？」の二択に答えると「あなたのタイプは○○な人」という診断結果が出る。診断結果を見せ合うことで会話のきっかけになる。',
    objects: [
      { shape: 'button', role: '二択ボタン×2（各問）', note: '' },
    ],
    counters: [
      { id: 'questions', name: '回答数', target: 5, note: '5問で診断' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: '「あなたのタイプ」診断結果を表示',
  },
  {
    id: 'bar-148',
    title: '「何杯目？」正直度テスト',
    duration: 10,
    concept: '「本当は今夜何杯飲みましたか？」という問いに1〜10以上の選択肢で回答。回答に応じて「正直者！」「少し誤魔化してる？」「もう帰った方がいい…」など段階的なコメント。笑える演出。',
    objects: [
      { shape: 'button', role: '杯数選択ボタン（1〜10以上）', note: '' },
    ],
    counters: [],
    winTrigger: '杯数を選択してタップ',
    resultTrigger: '杯数に応じたコメントを表示',
  },
  {
    id: 'bar-149',
    title: 'バーチャルスロット（3×1）',
    duration: 8,
    concept: '横一列3マスのシンプルなスロット。タップすると3マスが一斉に回転し始めて次々に止まる。揃ったら当たり演出。揃わなくても「惜しい！」「ドンマイ！」の演出がある。',
    objects: [
      { shape: 'rect', role: 'スロットリール×3（横一列）', note: '絵柄が揃うと当たり' },
    ],
    counters: [],
    winTrigger: 'スロットが止まった',
    resultTrigger: '揃った・揃わなかった演出を表示',
  },
  {
    id: 'bar-150',
    title: '「今夜の格言」生成',
    duration: 6,
    concept: '「○○と○○が出会ったとき、○○が生まれる」という穴埋め式格言テンプレートにランダムな言葉が入って「今夜の格言」として表示される。意味のなさが笑えるシュール系コンテンツ。',
    objects: [
      { shape: 'rect', role: '格言テキスト（全画面）', note: 'ランダムな言葉が入る' },
      { shape: 'button', role: '次の格言ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '格言が生成された',
    resultTrigger: 'シュールな格言を全画面表示',
  },
] as const;
