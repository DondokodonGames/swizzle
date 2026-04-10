/**
 * ideas/bar-14.ts
 * バー向けミニゲームネタ帳 131〜140
 */

export const bar14Ideas = [
  {
    id: 'bar-131',
    title: '水面波紋',
    duration: 15,
    concept: 'タップするたびに水面に波紋が広がる。複数タップすると波紋が干渉して複雑な模様になる。ただそれだけのシンプルなリラックス系アプリ。酔った頭で眺めるのに最適。',
    objects: [
      { shape: 'circle', role: '水面波紋（タップで広がる）', note: '' },
    ],
    counters: [],
    winTrigger: 'タップするだけ（いつでも終了可）',
    resultTrigger: '波紋が広がる演出のみ',
  },
  {
    id: 'bar-132',
    title: '砂の城崩し',
    duration: 10,
    concept: '砂で作られた城が積み上がっている。タップすると砂が崩れ始める演出。崩れるスピードが段階的に加速する。「崩しきるまで何タップかかるか」を記録。スカッと感のある演出。',
    objects: [
      { shape: 'rect', role: '砂の城（崩れていく）', note: 'タップで崩れる' },
    ],
    counters: [
      { id: 'taps', name: '崩すのに必要なタップ数', target: 0, note: '記録' },
    ],
    winTrigger: '城が完全に崩れた',
    resultTrigger: '崩すのにかかったタップ数を表示',
  },
  {
    id: 'bar-133',
    title: '方言クイズ',
    duration: 12,
    concept: '「ほやほや・かいらしい・ずんべらぼん」など全国の方言が表示されて、標準語の意味を3択で当てる。正解すると方言の出身地と使用例が表示。地域の違いで盛り上がる。',
    objects: [
      { shape: 'rect', role: '方言テキスト（大きく）', note: '' },
      { shape: 'button', role: '意味の3択ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解・不正解と方言の出身地・使用例を表示',
  },
  {
    id: 'bar-134',
    title: '筆順クイズ',
    concept: '漢字の書き順（筆順）を当てるクイズ。「「必」の第4画目はどこから書く？」という問いに3択で答える。意外と知らない筆順の雑学で盛り上がる。',
    duration: 12,
    objects: [
      { shape: 'rect', role: '漢字の書き順アニメーション', note: '' },
      { shape: 'button', role: '3択ボタン（書き順の画像）', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解の筆順アニメと解説を表示',
  },
  {
    id: 'bar-135',
    title: '「何秒で連絡来る？」賭け',
    duration: 20,
    concept: '「Aさんにメッセージを送ったら何秒で返信が来るか？」を全員で予想してタップ。スライダーで予想秒数を設定。実際にメッセージを送ってタイマーで計測、最も近い予想をした人が勝者。',
    objects: [
      { shape: 'rect', role: '予想秒数スライダー', note: '' },
      { shape: 'rect', role: 'ストップウォッチ（実測用）', note: '' },
    ],
    counters: [],
    winTrigger: 'ストップウォッチを止めた',
    resultTrigger: '実際の秒数と最も近かった予想者を表示',
  },
  {
    id: 'bar-136',
    title: '「この顔は誰?」お題',
    duration: 10,
    concept: '「有名人の○○さんのものまねをしてください」「○○さんの顔をスマホで作ってください」などお題が出る。似顔絵チャレンジや変顔チャレンジのお題生成ツールとして使う。',
    objects: [
      { shape: 'rect', role: '有名人名のお題テキスト', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題テキストを全画面表示',
  },
  {
    id: 'bar-137',
    title: 'パーフェクト停止',
    duration: 15,
    concept: '数字が0〜100まで高速でカウントアップし続けている。「50」ぴったりで止めるチャレンジ。タップした瞬間の数字を表示。50に近いほど「パーフェクトに近い」評価。',
    objects: [
      { shape: 'rect', role: '高速カウンター（0〜100ループ）', note: '' },
      { shape: 'button', role: 'ストップボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'ストップボタンをタップ',
    resultTrigger: '止まった数字と50との誤差を表示',
  },
  {
    id: 'bar-138',
    title: 'ランダムウォーク',
    duration: 10,
    concept: '「今夜の帰り道は？」という設定で矢印が左右にランダムに向きを変える。「GO!」をタップした瞬間の矢印の向きで「右の店へ」「左の店へ」「まっすぐ帰れ」などの行先が決まる。',
    objects: [
      { shape: 'triangle', role: '方向矢印（ランダムに回転）', note: '' },
      { shape: 'button', role: 'GOボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'GOボタンをタップ',
    resultTrigger: '止まった方向と行先テキストを表示',
  },
  {
    id: 'bar-139',
    title: '英語の発音チャレンジ',
    duration: 15,
    concept: '日本人が苦手な英語の発音（「world」「rural」「thorough」など）が表示される。実際に発音してみた後に「難しい！」「意外と言える！」ボタンで自己評価。笑える体験ゲーム。',
    objects: [
      { shape: 'rect', role: '英語テキスト（大きく）', note: '' },
      { shape: 'button', role: '「言えた！」「言えなかった…」自己申告ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '自己申告ボタンをタップ',
    resultTrigger: '発音のコツと「上達のヒント」を表示',
  },
  {
    id: 'bar-140',
    title: '「次の会社はどこ？」転職占い',
    duration: 10,
    concept: '「転職するなら次はどんな会社？」というネタ占い。生年月日か今の業種を入力してタップ。「IT系スタートアップ」「老舗和菓子屋」「南国のリゾートホテル」などユニークな転職先を提案。笑い系。',
    objects: [
      { shape: 'button', role: '業種選択ボタン×6', note: '' },
      { shape: 'rect', role: 'ランダム転職先テキスト', note: '' },
    ],
    counters: [],
    winTrigger: '業種を選んでタップ',
    resultTrigger: 'ランダムな転職先候補を表示',
  },
] as const;
