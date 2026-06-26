// 464-word-chain.js
// しりとり連鎖 — 表示された文字で始まる単語の最後の文字をタップ
// 操作: 3択から正しい「次に続く文字」をタップ
// 成功: 20回正解  失敗: 5ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#080420',
    card:   '#1a1040',
    cardHi: '#2d1a60',
    opt0:   '#7c3aed',
    opt1:   '#0891b2',
    opt2:   '#059669',
    optHi:  '#e2e8f0',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    kana:   '#a78bfa'
  };

  // Simple shiritori chain data: word → last kana → choices [correct, wrong1, wrong2]
  var ROUNDS = [
    { word: 'りんご', last: 'ご', choices: ['ご', 'り', 'ん'], answer: 0 },
    { word: 'ごりら', last: 'ら', choices: ['ら', 'ご', 'り'], answer: 0 },
    { word: 'らいおん', last: 'ん', choices: ['ん', 'ら', 'い'], answer: 0 },
    { word: 'とまと', last: 'と', choices: ['と', 'ま', 'ら'], answer: 0 },
    { word: 'てれび', last: 'び', choices: ['び', 'て', 'れ'], answer: 0 },
    { word: 'びよういん', last: 'ん', choices: ['ん', 'び', 'い'], answer: 0 },
    { word: 'くすり', last: 'り', choices: ['り', 'く', 'す'], answer: 0 },
    { word: 'りす', last: 'す', choices: ['す', 'り', 'し'], answer: 0 },
    { word: 'すいか', last: 'か', choices: ['か', 'す', 'い'], answer: 0 },
    { word: 'かえる', last: 'る', choices: ['る', 'か', 'え'], answer: 0 },
    { word: 'るびー', last: 'びー', choices: ['びー', 'る', 'び'], answer: 0 },
    { word: 'えんぴつ', last: 'つ', choices: ['つ', 'え', 'ん'], answer: 0 },
    { word: 'つき', last: 'き', choices: ['き', 'つ', 'く'], answer: 0 },
    { word: 'きのこ', last: 'こ', choices: ['こ', 'き', 'の'], answer: 0 },
    { word: 'こあら', last: 'ら', choices: ['ら', 'こ', 'あ'], answer: 0 },
    { word: 'らーめん', last: 'ん', choices: ['ん', 'ら', 'め'], answer: 0 },
    { word: 'ねこ', last: 'こ', choices: ['こ', 'ね', 'に'], answer: 0 },
    { word: 'こおり', last: 'り', choices: ['り', 'こ', 'お'], answer: 0 },
    { word: 'りぼん', last: 'ん', choices: ['ん', 'り', 'ぼ'], answer: 0 },
    { word: 'あいす', last: 'す', choices: ['す', 'あ', 'い'], answer: 0 }
  ];

  var roundIdx = 0;
  var correct = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var resultAnim = 0;
  var lastResult = '';
  var lastResultCol = C.correct;

  var OPTION_COLS = [C.opt0, C.opt1, C.opt2];
  var OPT_Y = H * 0.68;
  var OPT_W = W * 0.28;
  var OPT_H = 140;

  function getOX(i) { return W * 0.06 + i * (OPT_W + W * 0.04); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function getCurrentRound() {
    return ROUNDS[roundIdx % ROUNDS.length];
  }

  function shuffledChoices() {
    var r = getCurrentRound();
    // Shuffle order: track which is correct
    var indices = [0, 1, 2];
    var shuffled = shuffle(indices);
    return { choices: shuffled.map(function(i) { return r.choices[i]; }), correctShuffledIdx: shuffled.indexOf(0) };
  }

  var currentChoices = null;
  var correctIdx = 0;

  function nextRound() {
    roundIdx++;
    var sc = shuffledChoices();
    currentChoices = sc.choices;
    correctIdx = sc.correctShuffledIdx;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check which option tapped
    for (var i = 0; i < 3; i++) {
      var ox = getOX(i);
      if (tx >= ox && tx <= ox + OPT_W && ty >= OPT_Y && ty <= OPT_Y + OPT_H) {
        if (i === correctIdx) {
          correct++;
          lastResult = '正解！';
          lastResultCol = C.correct;
          flashCol = C.correct;
          flashAnim = 0.5;
          game.audio.play('se_tap', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: ox + OPT_W/2, y: OPT_Y + OPT_H/2, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.5, col: OPTION_COLS[i] });
          }
          if (correct >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.8);
            setTimeout(function() { game.end.success(correct * 200 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
          nextRound();
        } else {
          misses++;
          lastResult = 'ちがう！';
          lastResultCol = C.wrong;
          flashCol = C.wrong;
          flashAnim = 0.5;
          game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
            return;
          }
        }
        resultAnim = 0.6;
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultAnim > 0) resultAnim -= dt * 2;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    var r = getCurrentRound();

    // Word card
    game.draw.rect(80, H*0.22, W - 160, 200, C.card, 0.9);
    game.draw.rect(80, H*0.22, W - 160, 8, C.cardHi, 0.7);
    game.draw.text(r.word, W/2, H*0.22 + 120, { size: 84, color: C.text, bold: true });

    // Prompt
    game.draw.text('最後の文字はどれ？', W/2, H * 0.54, { size: 44, color: C.kana });

    // Options
    for (var i2 = 0; i2 < 3; i2++) {
      var ox2 = getOX(i2);
      var oc = OPTION_COLS[i2];
      game.draw.rect(ox2, OPT_Y, OPT_W, OPT_H, oc, 0.2);
      game.draw.rect(ox2, OPT_Y, OPT_W, 6, oc, 0.7);
      game.draw.rect(ox2, OPT_Y + OPT_H - 6, OPT_W, 6, oc, 0.5);
      game.draw.text(currentChoices[i2], ox2 + OPT_W/2, OPT_Y + OPT_H*0.6, { size: 72, color: oc, bold: true });
    }

    // Result feedback
    if (resultAnim > 0) {
      game.draw.text(lastResult, W/2, H * 0.87, { size: 52, color: lastResultCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.kana : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    var sc = shuffledChoices();
    currentChoices = sc.choices;
    correctIdx = sc.correctShuffledIdx;
  });
})(game);
