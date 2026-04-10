/**
 * ideas/bar-07.ts
 * バー向けミニゲームネタ帳 061〜070
 */

export const bar07Ideas = [
  {
    id: 'bar-061',
    title: '流れ星タップ',
    duration: 15,
    concept: '夜空の画面に流れ星がランダムなタイミングで流れる。「流れ星が見えたらタップして願いを！」という演出。タップした時に星が最も明るければ「願いが届きました」のメッセージ。',
    objects: [
      { shape: 'star', role: '流れ星（ランダムに流れる）', note: '最大輝度で光る' },
      { shape: 'rect', role: '夜空の背景', note: '' },
    ],
    counters: [],
    winTrigger: '流れ星が見えた瞬間にタップ',
    resultTrigger: '「願いが届いた」または「もっとしっかり見て！」を表示',
  },
  {
    id: 'bar-062',
    title: 'バーチャル焚き火',
    duration: 30,
    concept: '篝火の炎が揺れ続ける。炎の揺れ方がランダムで時に大きく、時に小さく。タップするとパチパチっと音が鳴る。BGMとして流れ続けられる「癒やし系」アプリ的ゲーム。',
    objects: [
      { shape: 'triangle', role: '炎（揺れ続ける）', note: '' },
      { shape: 'rect', role: '薪のシルエット', note: '' },
    ],
    counters: [],
    winTrigger: '30秒眺め続ける',
    resultTrigger: '「今夜はゆっくり休めそうです」とメッセージ',
  },
  {
    id: 'bar-063',
    title: 'ストレス発散ボタン',
    duration: 10,
    concept: '大きな赤ボタンを連打する。タップするたびに「ドーン！」「バーン！」などの効果音と爆発エフェクト。10秒間のタップ数に応じて「ストレス解消度」をパーセンテージで表示。',
    objects: [
      { shape: 'button', role: '大きな赤ボタン（連打用）', note: 'タップで爆発エフェクト' },
    ],
    counters: [
      { id: 'taps', name: 'タップ数', target: 0, note: '記録として保存' },
    ],
    winTrigger: '10秒経過',
    resultTrigger: 'ストレス解消度%と「スッキリ！」コメントを表示',
  },
  {
    id: 'bar-064',
    title: '二択地獄',
    duration: 20,
    concept: '「寿司vs焼肉」「海vs山」などの究極の二択が連続で出題される。直感でどちらかをタップするたびに次の問いへ。10問終わったら「あなたはこういう人」という性格診断が表示。',
    objects: [
      { shape: 'button', role: '選択肢Aボタン（左半分）', note: '' },
      { shape: 'button', role: '選択肢Bボタン（右半分）', note: '' },
    ],
    counters: [
      { id: 'questions', name: '回答数', target: 10, note: '10問で結果' },
    ],
    winTrigger: '10問回答した',
    resultTrigger: '回答パターンから性格キャラを表示',
  },
  {
    id: 'bar-065',
    title: 'なぞなぞ',
    duration: 15,
    concept: '「カニは横に歩くのに、どうして縦書きにするの？」など面白いなぞなぞが表示される。「分かった！」ボタンで答えを表示。正解を知ってから「引っかかった〜」という体験を楽しむ。',
    objects: [
      { shape: 'rect', role: 'なぞなぞテキスト（全画面）', note: '' },
      { shape: 'button', role: '答え見るボタン', note: '' },
    ],
    counters: [],
    winTrigger: '答え見るボタンをタップ',
    resultTrigger: 'なぞなぞの答えを表示',
  },
  {
    id: 'bar-066',
    title: '今夜のMVP投票',
    duration: 20,
    concept: '最大6人の名前を入力して「今夜のMVP」を投票で決める。みんなで各自スマホから投票してもいいし、1人が代表して全員分を選んでもOK。結果を発表してコメント付き。',
    objects: [
      { shape: 'rect', role: '名前入力欄×6', note: '' },
      { shape: 'button', role: '投票ボタン（1人ずつ選ぶ）', note: '' },
    ],
    counters: [],
    winTrigger: '全員が投票した',
    resultTrigger: '最多票のMVPを発表',
  },
  {
    id: 'bar-067',
    title: '座席決めルーレット',
    duration: 10,
    concept: '4〜8の席番号が入ったルーレットを回す。または名前を入力して席をランダムに割り当て。「あなたは○番テーブルのA席！」と表示して席決めをゲーム感覚に。',
    objects: [
      { shape: 'rect', role: '名前入力欄×最大8', note: '' },
      { shape: 'circle', role: '席決めルーレット', note: '' },
    ],
    counters: [],
    winTrigger: 'ルーレット完了',
    resultTrigger: '全員の席割り当てを表示',
  },
  {
    id: 'bar-068',
    title: 'ものまねお題',
    duration: 8,
    concept: '「○○のものまねをしてください！」というお題がランダムで表示される。芸能人・政治家・アニメキャラ・動物など30種以上のお題。リクエストボタンで次々に変えられる。',
    objects: [
      { shape: 'rect', role: 'お題テキスト（大きく全画面）', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題を全画面で表示',
  },
  {
    id: 'bar-069',
    title: 'プロポーズ文句生成',
    duration: 10,
    concept: '名前を入力してタップすると「○○さん、あなたが○○で○○なところが大好きです。一緒に○○してください」というランダム生成のプロポーズ文句が表示。笑える組み合わせになることも。',
    objects: [
      { shape: 'rect', role: '名前入力エリア', note: '' },
      { shape: 'rect', role: 'プロポーズ文句（全画面）', note: '' },
    ],
    counters: [],
    winTrigger: '名前を入力してタップ',
    resultTrigger: 'ランダム生成されたプロポーズ文句を表示',
  },
  {
    id: 'bar-070',
    title: '今日の一言（名言）',
    duration: 6,
    concept: '画面をタップするたびに有名な名言・格言が表示される。偉人の言葉から「バー向けユーモア格言」まで混在している。50種以上のバリエーション。',
    objects: [
      { shape: 'rect', role: '名言テキスト（全画面）', note: '' },
      { shape: 'rect', role: '出典・人名テキスト（小さく）', note: '' },
      { shape: 'button', role: '次の言葉ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '名言が表示された',
    resultTrigger: '名言と出典を全画面表示',
  },
] as const;
