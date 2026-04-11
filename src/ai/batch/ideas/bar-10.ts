/**
 * ideas/bar-10.ts
 * バー向けミニゲームネタ帳 091〜100
 */

export const bar10Ideas = [
  {
    id: 'bar-091',
    title: 'あいうえお作文',
    duration: 15,
    concept: '2〜4文字のお題（例：「さけ」「のみかい」）が表示される。各文字を頭文字にした言葉でポエムを作る。タップでランダムにお題を変えられる。みんなで考えて発表する楽しみ方。',
    objects: [
      { shape: 'rect', role: 'お題テキスト（大きく）', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題を全画面表示',
  },
  {
    id: 'bar-092',
    title: '逆さ読み（回文）チェック',
    duration: 12,
    concept: '「たけやぶやけた」などの回文が表示されて逆から読んでみる体験。次に普通の文章を表示して「逆から読むと？」のチャレンジ。回文を自分で作るためのヒントも表示。',
    objects: [
      { shape: 'rect', role: '回文テキスト（大きく）', note: '' },
      { shape: 'button', role: '逆読みを見るボタン', note: '' },
    ],
    counters: [],
    winTrigger: '逆読みを見るボタンをタップ',
    resultTrigger: '逆から読んだ文字を表示',
  },
  {
    id: 'bar-093',
    title: '頭の中の数字を当てる（マジック風）',
    duration: 20,
    concept: '「1〜100の数字を思い浮かべてください」→「偶数ですか？奇数ですか？」など5問で絞り込む。最後に「あなたの数字は○○です！」と宣言。シンプルな二分探索の仕組みをマジック演出に。',
    objects: [
      { shape: 'rect', role: '質問テキスト', note: '' },
      { shape: 'button', role: '「YES」「NO」ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '5問回答した',
    resultTrigger: '絞り込んだ数字を大きく「ドン！」と表示',
  },
  {
    id: 'bar-094',
    title: '感情当て（表情診断）',
    duration: 12,
    concept: '「今の自分の気分を色で表すなら？」「動物に例えるなら？」など5問の連想クイズ。回答パターンから「今あなたは○○な気持ち」と診断。共感や笑いが生まれる盛り上がり系。',
    objects: [
      { shape: 'button', role: '色選択ボタン×8', note: '' },
      { shape: 'button', role: '動物選択ボタン×6', note: '' },
    ],
    counters: [],
    winTrigger: '5問回答した',
    resultTrigger: '感情・気持ちの診断結果を表示',
  },
  {
    id: 'bar-095',
    title: '体内時計テスト（60秒）',
    duration: 75,
    concept: 'スタートをタップして目をつぶり、ちょうど60秒経ったと思ったらタップ。実際の経過時間を表示。1分という長い時間の感覚のズレが面白い。「60秒ってこんなに長いんだ！」体験。',
    objects: [
      { shape: 'button', role: 'スタート/ストップボタン', note: '' },
    ],
    counters: [],
    winTrigger: '60秒経ったと思ってタップ',
    resultTrigger: '実際の経過秒数と誤差を表示',
  },
  {
    id: 'bar-096',
    title: 'ラップお題',
    duration: 10,
    concept: '「今夜のラップのお題は……」という演出の後にランダムなお題が表示される。「居酒屋」「月曜日」「残業」など30種以上。30秒間で即興ラップを披露する用のお題決め機能。',
    objects: [
      { shape: 'rect', role: 'ラップお題テキスト（大きく）', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
      { shape: 'rect', role: '30秒タイマー（ラップ用）', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題を全画面表示して30秒カウント開始',
  },
  {
    id: 'bar-097',
    title: '今夜の開運ワード',
    duration: 6,
    concept: '画面をタップすると今夜の「開運ワード」がランダムで表示される。「縁」「笑」「勝」などの漢字1文字や「なるようになる」などの短いフレーズ。フォントを書道風にして雰囲気を出す。',
    objects: [
      { shape: 'rect', role: '開運ワード（書道フォント・全画面）', note: '' },
    ],
    counters: [],
    winTrigger: '画面をタップ',
    resultTrigger: '開運ワードを全画面表示',
  },
  {
    id: 'bar-098',
    title: '動物占い（シンプル版）',
    duration: 10,
    concept: '生年月日の年と月だけを入力してタップ。「あなたの動物は○○です」と表示。12種類の動物キャラと短い性格説明、「今夜の一言」が出る。ドラゴンや虎など印象的なキャラが多め。',
    objects: [
      { shape: 'rect', role: '生年月日入力（年・月のみ）', note: '' },
      { shape: 'face', role: '動物キャラのイメージ（シルエット）', note: '' },
    ],
    counters: [],
    winTrigger: '年・月を入力してタップ',
    resultTrigger: '動物名・性格・今夜の一言を表示',
  },
  {
    id: 'bar-099',
    title: 'サイコロ神経衰弱',
    duration: 20,
    concept: '4×4のマスにサイコロの目が裏向きで並んでいる（16個）。2個を選んでひっくり返し、同じ目が出たらペア成立。全8ペアを揃えるか60秒以内に何ペア揃えるかを競う。',
    objects: [
      { shape: 'rect', role: 'サイコロ×16（裏向き）', note: 'めくると目が見える' },
    ],
    counters: [
      { id: 'pairs', name: '揃えたペア数', target: 8, note: '全8ペア' },
    ],
    winTrigger: '全8ペア揃えるか時間切れ',
    resultTrigger: '揃えたペア数と残り時間を表示',
  },
  {
    id: 'bar-100',
    title: '「今夜の締め」ルーレット',
    duration: 8,
    concept: '「そろそろお開きにしましょうか」のタイミングで回す特別ルーレット。「もう1軒！」「電車で帰る」「タクシーで帰る」「2次会は明日！」など6種類が書かれたルーレットが回る。',
    objects: [
      { shape: 'circle', role: '締めルーレット（6分割）', note: '' },
    ],
    counters: [],
    winTrigger: 'ルーレットが止まった',
    resultTrigger: '止まった選択肢を全画面で大きく表示',
  },
] as const;
