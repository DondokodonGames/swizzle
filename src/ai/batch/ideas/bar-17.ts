/**
 * ideas/bar-17.ts
 * バー向けミニゲームネタ帳 161〜170
 */

export const bar17Ideas = [
  {
    id: 'bar-161',
    title: 'バルーンシュート',
    duration: 12,
    concept: '色とりどりの風船が画面を漂っている。タップで割れる。5秒間で何個割れるかを競う。割ると「パン！」という音が鳴る。金色の風船だけ「ラッキーバルーン」で2点のボーナス。',
    objects: [
      { shape: 'balloon', role: '風船×複数（ふわふわ漂う）', note: '金色のみ2点' },
    ],
    counters: [
      { id: 'pops', name: '割った数', target: 0, note: '5秒間の記録' },
    ],
    winTrigger: '5秒経過',
    resultTrigger: '割った数・得点・金バルーン数を表示',
  },
  {
    id: 'bar-162',
    title: 'カップ焼きそばタイマー',
    duration: 180,
    concept: '3分計のシンプルなタイマーだが、カップ麺や焼きそばを待つ間の「暇つぶし」機能として設計。カウントダウン中にミニゲーム（反射神経テストや一問クイズ）をワンタップで遊べる。',
    objects: [
      { shape: 'circle', role: 'カウントダウンタイマー（3分）', note: '' },
    ],
    counters: [],
    winTrigger: '3分経過',
    resultTrigger: '「できあがりました！」演出表示',
  },
  {
    id: 'bar-163',
    title: '「共通点いくつ？」診断',
    duration: 15,
    concept: '2人（または複数人）が同じアプリを同時に開いて同じアンケートに答える。「好きな季節は？」「朝型？夜型？」など5問の回答を照合して「あなたたちの共通点は○個！」と発表。',
    objects: [
      { shape: 'button', role: '設問の二択・四択ボタン', note: '' },
    ],
    counters: [
      { id: 'common', name: '共通点数', target: 5, note: '5問で照合' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: '共通点の数と共通した回答を表示',
  },
  {
    id: 'bar-164',
    title: 'けん玉',
    duration: 12,
    concept: 'けん玉の玉が上下に揺れている。玉が最高点（けんの先端と同じ高さ）に達した瞬間にタップして刺す。タイミングが合うと「成功！」外れると「惜しい！」3回成功でクリア。',
    objects: [
      { shape: 'circle', role: 'けん玉の玉（上下に揺れる）', note: '最高点で光る' },
      { shape: 'rect', role: 'けんの棒', note: '' },
    ],
    counters: [
      { id: 'success', name: '成功数', target: 3, note: '3回でクリア' },
    ],
    winTrigger: '3回成功した',
    resultTrigger: '成功数と「けん玉達人度」を表示',
  },
  {
    id: 'bar-165',
    title: '「誰がタクシー呼ぶ？」',
    duration: 6,
    concept: '複数人の名前を入力してタップ。「この中でタクシーを呼ぶ担当は…」という演出の後にランダムで1人が選ばれる。「担当者は○○さんです！（逃げられません）」という笑える演出付き。',
    objects: [
      { shape: 'rect', role: '名前入力欄×最大8', note: '' },
      { shape: 'button', role: '決定ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '決定ボタンをタップ',
    resultTrigger: 'ランダムで選ばれた名前を大きく表示',
  },
  {
    id: 'bar-166',
    title: 'バーチャル書き初め',
    duration: 15,
    concept: '今年の抱負や一言を書き込める。書道風のフォントでランダムなお題が表示されて、それを見て「今年の一文字」を1文字タップで選ぶ。選んだ文字を大きな筆書き風フォントで全画面表示。',
    objects: [
      { shape: 'rect', role: '文字選択UI（ひらがな・漢字）', note: '' },
      { shape: 'rect', role: '書道風フォントで表示した文字', note: '' },
    ],
    counters: [],
    winTrigger: '文字を選んで「決定」をタップ',
    resultTrigger: '書道風の今年の一文字を全画面表示',
  },
  {
    id: 'bar-167',
    title: '「この形は何に見える？」',
    duration: 12,
    concept: 'インクのシミ（ロールシャッハ風）がランダムで表示される。「何に見える？」という問いに対して選択肢を選ぶか自由回答。選んだ答えから「深層心理では○○を求めています」というエンタメ解説。',
    objects: [
      { shape: 'ellipse', role: 'インクのシミ（左右対称のランダム形）', note: '' },
      { shape: 'button', role: '見えるもの選択肢ボタン×5', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '「深層心理」のエンタメ解説を表示',
  },
  {
    id: 'bar-168',
    title: 'ピタリ賞（価格当て）',
    duration: 15,
    concept: 'デパートや高級店の商品（バッグ・時計・食べ物等）の説明が表示されて値段を当てる。スライダーで予想金額を入力してタップ。誤差が少ないほど「センスがある！」評価。',
    objects: [
      { shape: 'rect', role: '商品説明テキスト', note: '' },
      { shape: 'rect', role: '価格予想スライダー', note: '' },
    ],
    counters: [],
    winTrigger: '予想金額を入力してタップ',
    resultTrigger: '実際の価格と誤差・評価コメントを表示',
  },
  {
    id: 'bar-169',
    title: 'お酒年表クイズ',
    duration: 12,
    concept: '「このお酒はいつ生まれた？」（ビール・ワイン・日本酒・焼酎など）を年代から当てるクイズ。「ビールの歴史は○○年前から始まった」など意外な雑学が正解後に表示される。',
    objects: [
      { shape: 'rect', role: 'お酒の種類テキスト', note: '' },
      { shape: 'button', role: '年代の選択肢ボタン×4', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解と歴史の豆知識を表示',
  },
  {
    id: 'bar-170',
    title: 'コルク抜きシミュレーター',
    duration: 8,
    concept: 'ワインボトルのコルクを抜く演出。画面をスワイプしてコルクを少しずつ引き上げ、飛び出す瞬間に「ポン！」という音と演出。抜けるタイミングをコントロールして盛り上がる。',
    objects: [
      { shape: 'rect', role: 'ワインボトル（上部）', note: '' },
      { shape: 'rect', role: 'コルク（徐々に出てくる）', note: '飛び出す瞬間に演出' },
    ],
    counters: [],
    winTrigger: 'コルクが飛び出した',
    resultTrigger: '「乾杯！」という演出メッセージを表示',
  },
] as const;
