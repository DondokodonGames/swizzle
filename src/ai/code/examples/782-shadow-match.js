// 782-shadow-match.js
// シャドウマッチ — シルエットが示す形を、4択から選んでタップせよ
// 操作: タップ — 4択から正しいシルエットの正体を選ぶ
// 成功: 10問 正解  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、形色は保持） ──
  var C = { bg:'#050508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SHADOW = '#0c0c1a', PANEL = '#0d1117', REVEAL = '#ffe600';

  // ── 形の定義（色は保持、描画はピクセル） ──
  var SHAPES = [
    { name: 'CIRCLE',   color: '#00cfff', draw: function(cx, cy, r, col, al) { pc(cx, cy, r, col, al); } },
    { name: 'TRIANGLE', color: '#ff6600', draw: function(cx, cy, r, col, al) { for (var t = 0; t < 10; t++) { var w = r * 1.6 * (t / 10), yy = cy - r * 0.8 + t * r * 0.16; game.draw.rect(snap(cx - w / 2), snap(yy), snap(w), snap(r * 0.18), col, al); } } },
    { name: 'SQUARE',   color: '#a066ff', draw: function(cx, cy, r, col, al) { game.draw.rect(snap(cx - r), snap(cy - r), snap(r * 2), snap(r * 2), col, al); } },
    { name: 'STAR',     color: '#ffe600', draw: function(cx, cy, r, col, al) { for (var si = 0; si < 5; si++) { var sa = si * Math.PI * 2 / 5 - Math.PI / 2; pc(cx + Math.cos(sa) * r * 0.9, cy + Math.sin(sa) * r * 0.9, r * 0.38, col, al); } pc(cx, cy, r * 0.5, col, al); } },
    { name: 'DIAMOND',  color: '#00ff9f', draw: function(cx, cy, r, col, al) { for (var di = 0; di < 12; di++) { var dp = di / 12, dw = r * Math.sin(dp * Math.PI), dy = cy - r + di * r * 2 / 12; game.draw.rect(snap(cx - dw), snap(dy), snap(dw * 2), snap(r * 0.2), col, al); } } },
    { name: 'CROSS',    color: '#ff2fa0', draw: function(cx, cy, r, col, al) { game.draw.rect(snap(cx - r * 0.24), snap(cy - r), snap(r * 0.48), snap(r * 2), col, al); game.draw.rect(snap(cx - r), snap(cy - r * 0.24), snap(r * 2), snap(r * 0.48), col, al); } },
    { name: 'ARROW',    color: '#ff9933', draw: function(cx, cy, r, col, al) { for (var i = 0; i < r * 1.4; i += 12) { var w = r * 1.4 - i; game.draw.rect(snap(cx - w / 2), snap(cy - r * 0.7 + i), 12, 12, col, al); game.draw.rect(snap(cx + w / 2 - 12), snap(cy - r * 0.7 + i), 12, 12, col, al); } game.draw.rect(snap(cx - r * 0.18), snap(cy - r * 0.1), snap(r * 0.36), snap(r), col, al); } },
    { name: 'DROP',     color: '#7788ff', draw: function(cx, cy, r, col, al) { pc(cx, cy + r * 0.3, r * 0.7, col, al); for (var di = 0; di < 5; di++) { var dt2 = di / 4, dr = r * 0.6 * (1 - dt2); pc(cx, cy - r * 0.5 * dt2, dr * 0.6, col, al); } } }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW MATCH';
  var HOW_TO_PLAY = 'A SILHOUETTE IS SHOWN · TAP THE MATCHING SHAPE FROM THE FOUR CHOICES';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var WAIT_DUR = 0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentShapeIdx, choices, waitTimer, showReveal, revealTimer, answered, score, errors, done, timeLeft, elapsed, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080810');
  }

  function background() { game.draw.clear(C.bg); }

  function newQuestion() {
    currentShapeIdx = Math.floor(Math.random() * SHAPES.length); choices = [currentShapeIdx];
    while (choices.length < 4) { var r = Math.floor(Math.random() * SHAPES.length); if (choices.indexOf(r) < 0) choices.push(r); }
    for (var i = choices.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = choices[i]; choices[i] = choices[j]; choices[j] = tmp; }
    showReveal = false; revealTimer = 0; answered = false;
  }

  function getChoiceRect(idx) { var col = idx % 2, row = Math.floor(idx / 2); return { x: col * W / 2, y: H * 0.57 + row * H * 0.19, w: W / 2, h: H * 0.19 }; }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; waitTimer = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newQuestion(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(snap(W * 0.1), snap(H * 0.14), snap(W * 0.8), snap(H * 0.38), SHADOW, 0.95);
    var shapeR = 130, sh = SHAPES[currentShapeIdx];
    if (showReveal && revealTimer > 0) { sh.draw(W / 2, H * 0.32, shapeR, sh.color, 0.95); txt(sh.name, W / 2, snap(H * 0.49), 44, REVEAL); }
    else { sh.draw(W / 2, H * 0.32, shapeR, '#000000', 0.9); if (state === S.PLAYING && !answered) txt('WHAT IS IT?', W / 2, snap(H * 0.50), 40, C.g); }
    for (var ci = 0; ci < 4; ci++) {
      var rect = getChoiceRect(ci), isCorrect = choices[ci] === currentShapeIdx, bgCol = (answered && isCorrect) ? '#0a2e14' : PANEL;
      game.draw.rect(snap(rect.x + 8), snap(rect.y + 8), snap(rect.w - 16), snap(rect.h - 16), bgCol, 0.95);
      var csx = rect.x + rect.w / 2, csy = rect.y + rect.h * 0.42;
      SHAPES[choices[ci]].draw(csx, csy, 52, SHAPES[choices[ci]].color, 0.9);
      txt(SHAPES[choices[ci]].name, csx, rect.y + rect.h * 0.85, 30, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0) return;
    for (var i = 0; i < 4; i++) {
      var r = getChoiceRect(i);
      if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h) {
        answered = true;
        if (choices[i] === currentShapeIdx) { score++; flash = 0.22; flashCol = C.b; resultText = 'CORRECT!'; resultTimer = 0.4; game.audio.play('se_success', 0.65); if (score >= NEEDED) { finish(true); return; } }
        else { errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3); if (errors >= MAX_ERR) { finish(false); return; } }
        showReveal = true; revealTimer = 0.35; waitTimer = WAIT_DUR; break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!choices) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.06, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.10, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 38, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYES!' : 'FOOLED', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newQuestion(); }
      if (revealTimer > 0) revealTimer -= dt; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.545), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#080810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
