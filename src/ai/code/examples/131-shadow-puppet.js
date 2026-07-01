// 131-shadow-puppet.js
// 影絵当て — シルエットが何かを当てて正しい選択肢をタップする直感推理ゲーム
// 操作: タップで答えを選ぶ
// 成功: 1問正解  失敗: 3回間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影絵ステージ） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SH = '#0d0018';           // シルエット色

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW QUIZ';
  var HOW_TO_PLAY = 'GUESS THE SILHOUETTE · TAP THE ANSWER';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 3;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var SCR_X = snap(W / 2), SCR_Y = snap(H * 0.38), SCR_R = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
      }
    }
  }

  function pr(x, y, w, h, color, alpha) { game.draw.rect(snap(x), snap(y), snap(w), snap(h), color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18);
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  // ── パズル定義（ピクセルシルエット） ──
  var puzzles = [
    { choices: ['CAT', 'DOG', 'RABBIT', 'BEAR'], answer: 0, draw: function(x, y, s) {
        pc(x, y + s * 0.1, s * 0.5, SH, 1);
        pr(x - s * 0.28, y - s * 0.55, s * 0.18, s * 0.28, SH);   // 耳
        pr(x + s * 0.1,  y - s * 0.55, s * 0.18, s * 0.28, SH);
        pc(x + s * 0.55, y + s * 0.1, s * 0.14, SH, 1);           // 尻尾
      } },
    { choices: ['FLOWER', 'TREE', 'MUSHROOM', 'CLOUD'], answer: 0, draw: function(x, y, s) {
        for (var p = 0; p < 6; p++) {
          var a = p / 6 * Math.PI * 2;
          pc(x + Math.cos(a) * s * 0.32, y - s * 0.12 + Math.sin(a) * s * 0.32, s * 0.16, SH, 1);
        }
        pc(x, y - s * 0.12, s * 0.16, SH, 1);
        pr(x - s * 0.05, y + s * 0.1, s * 0.1, s * 0.5, SH);       // 茎
      } },
    { choices: ['HOUSE', 'MOUNTAIN', 'BIRD', 'BOAT'], answer: 0, draw: function(x, y, s) {
        pr(x - s * 0.35, y - s * 0.05, s * 0.7, s * 0.5, SH);      // 本体
        for (var r = 0; r <= s * 0.4; r += 8) pr(x - r * 0.9, y - s * 0.05 - r, r * 1.8, 8, SH); // 屋根
        pr(x - s * 0.1, y + s * 0.15, s * 0.2, s * 0.3, C.c, 0.9); // 窓（光）
      } },
    { choices: ['STAR', 'MOON', 'SUN', 'BOLT'], answer: 0, draw: function(x, y, s) {
        for (var p = 0; p < 5; p++) {
          var a = p / 5 * Math.PI * 2 - Math.PI / 2;
          pc(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42, s * 0.13, SH, 1);
        }
        pc(x, y, s * 0.26, SH, 1);
      } },
    { choices: ['FISH', 'SHRIMP', 'TURTLE', 'OCTOPUS'], answer: 0, draw: function(x, y, s) {
        pc(x - s * 0.05, y, s * 0.36, SH, 1);
        pr(x + s * 0.28, y - s * 0.22, s * 0.22, s * 0.44, SH);    // 尾
        pc(x - s * 0.18, y - s * 0.08, s * 0.06, C.c, 1);         // 目（光）
      } }
  ];

  // ── ゲーム変数 ──
  var order, choiceOrder, currentQ, score, misses, timeLeft, done, feedback, feedbackOk;
  var CHOICE_W = snap((W - 120) / 2), CHOICE_H = 140, CHOICES_Y = snap(H * 0.62);
  var layout = [
    { x: snap(40), y: CHOICES_Y },
    { x: snap(W / 2 + 20), y: CHOICES_Y },
    { x: snap(40), y: CHOICES_Y + CHOICE_H + 24 },
    { x: snap(W / 2 + 20), y: CHOICES_Y + CHOICE_H + 24 }
  ];

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function nextQuestion() {
    choiceOrder = shuffle([0, 1, 2, 3]);
  }

  function initGame() {
    order = shuffle(puzzles.map(function(_, i) { return i; }));
    currentQ = 0; score = 0; misses = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0;
    nextQuestion();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 20) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScreen(puzzle) {
    // バックライトのスクリーン
    pr(SCR_X - SCR_R - 24, SCR_Y - SCR_R - 24, (SCR_R + 24) * 2, (SCR_R + 24) * 2, C.d, 0.5);
    pc(SCR_X, SCR_Y, SCR_R, C.g, 0.12);
    pr(SCR_X - SCR_R - 24, SCR_Y - SCR_R - 24, (SCR_R + 24) * 2, 8, C.a);
    puzzle.draw(SCR_X, SCR_Y, SCR_R);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || feedback > 0) return;
    var puzzle = puzzles[order[currentQ % puzzles.length]];
    for (var i = 0; i < 4; i++) {
      var cl = layout[i];
      if (x >= cl.x && x < cl.x + CHOICE_W && y >= cl.y && y < cl.y + CHOICE_H) {
        if (choiceOrder[i] === puzzle.answer) {
          score++; feedbackOk = true; feedback = 0.5;
          game.audio.play('se_success');
          if (score >= NEEDED) { finish(true); return; }
        } else {
          misses++; feedbackOk = false; feedback = 0.5;
          game.audio.play('se_failure');
          if (misses >= MAX_MISS) { finish(false); return; }
        }
        currentQ++;
        nextQuestion();
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      game.draw.clear(C.bg);
      drawScreen(puzzles[Math.floor(game.time.elapsed / 1.2) % puzzles.length]);
      txt(GAME_TITLE,  W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.72, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      game.draw.clear(C.bg);
      txt(resultSuccess ? 'CORRECT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    if (feedback > 0) feedback -= dt;

    game.draw.clear(C.bg);
    var puzzle = puzzles[order[currentQ % puzzles.length]];
    drawScreen(puzzle);
    txt('WHAT IS IT?', W / 2, H * 0.55, 44, C.c);

    for (var i = 0; i < 4; i++) {
      var cl = layout[i];
      pr(cl.x, cl.y, CHOICE_W, CHOICE_H, C.d);
      pr(cl.x, cl.y, CHOICE_W, 8, C.e);
      txt(puzzle.choices[choiceOrder[i]], cl.x + CHOICE_W / 2, cl.y + CHOICE_H / 2 - 8, 44, C.g);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.2);
      txt(feedbackOk ? 'CORRECT!' : 'WRONG', W / 2, H * 0.5, 72, feedbackOk ? C.b : C.a);
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
