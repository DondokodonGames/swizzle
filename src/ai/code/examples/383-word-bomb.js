// 383-word-bomb.js
// ワードボム — 出題に合う文字を4択から素早く選び、爆弾の導火線が尽きる前に解除する
// 操作: 正しい選択肢をタップ
// 成功: 4問 正解  失敗: 3問 間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、解体現場） ──
  var C = { bg:'#0a0812', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WORD BOMB';
  var HOW_TO_PLAY = 'TAP THE MATCHING CHOICE BEFORE THE FUSE BURNS OUT';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 8 → 4
  var MAX_WRONG = 3;

  var QUESTIONS = [
    { q: 'WHICH IS A NUMBER?', ch: ['A','7','X','P'], ans: 1 },
    { q: 'WHICH IS UPPERCASE?', ch: ['a','b','C','d'], ans: 2 },
    { q: 'WHICH IS EVEN?', ch: ['3','7','5','8'], ans: 3 },
    { q: 'WHICH IS A SYMBOL?', ch: ['1','2','#','4'], ans: 2 },
    { q: 'WHICH IS LARGEST?', ch: ['12','9','18','7'], ans: 2 },
    { q: 'WHICH IS A VOWEL?', ch: ['B','C','D','E'], ans: 3 },
    { q: 'WHICH IS ODD?', ch: ['2','4','7','6'], ans: 2 },
    { q: 'WHICH IS SMALLEST?', ch: ['15','3','22','8'], ans: 1 },
    { q: 'WHICH IS A SQUARE?', ch: ['7','9','11','13'], ans: 1 },
    { q: 'WHICH HAS A DIGIT?', ch: ['AB','BB','C3','EE'], ans: 2 }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var qOrder, qIdx, correct, wrong, timeLeft, done, particles, flash, flashCol, ansState, fuse, lockTimer;

  var BW = snap(W * 0.7), BH = 130, BGAP = 24, BSX = snap(W / 2 - BW / 2), BSY = snap(H * 0.52);

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function shuffle() { qOrder = []; for (var i = 0; i < QUESTIONS.length; i++) qOrder.push(i); for (var j = qOrder.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = qOrder[j]; qOrder[j] = qOrder[k]; qOrder[k] = t; } }

  function curQ() { return QUESTIONS[qOrder[qIdx % qOrder.length]]; }

  function initGame() { shuffle(); qIdx = 0; correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; ansState = [0, 0, 0, 0]; fuse = 1.0; lockTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 100) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBomb() {
    var bx = W / 2, by = snap(H * 0.30);
    pc(bx, by, 96, '#181828', 0.95); pc(bx - 28, by - 28, 20, C.d, 0.5);
    // 導火線
    var fx = bx + 60, fy = by - 70, ex = fx + 60 * fuse, ey = fy - 50 * fuse;
    pline(fx, fy, ex, ey, C.f, 0.9, 8); pc(ex, ey, 12 + 4 * (Math.floor(game.time.elapsed * 10) % 2), C.c, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lockTimer > 0) return;
    for (var i = 0; i < 4; i++) {
      var by = BSY + i * (BH + BGAP);
      if (x >= BSX && x < BSX + BW && y >= by && y < by + BH) {
        var q = curQ(); ansState = [0, 0, 0, 0];
        if (i === q.ans) { correct++; ansState[i] = 1; flashCol = C.b; flash = 0.5; fuse = Math.max(0, fuse - 0.12); game.audio.play('se_success', 0.5); for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: BSX + BW / 2, y: by + BH / 2, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: C.b }); } if (correct >= NEEDED) { finish(true); return; } }
        else { wrong++; ansState[i] = -1; flashCol = C.a; flash = 0.5; fuse = Math.min(1, fuse + 0.18); game.audio.play('se_failure', 0.4); if (wrong >= MAX_WRONG) { finish(false); return; } }
        lockTimer = 0.45;
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawBomb();
      txt(GAME_TITLE, W / 2, H * 0.52, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.58, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEFUSED!' : 'BOOM!', W / 2, H * 0.35, 84, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      if (lockTimer > 0) { lockTimer -= dt; if (lockTimer <= 0) { ansState = [0, 0, 0, 0]; qIdx++; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBomb();
    var q2 = curQ();
    txt(q2.q, W / 2, snap(H * 0.46), 46, C.g);
    for (var bi = 0; bi < 4; bi++) {
      var by = BSY + bi * (BH + BGAP), st = ansState[bi], col = st === 1 ? C.b : st === -1 ? C.a : C.d;
      game.draw.rect(BSX, by, BW, BH, col, 0.75); game.draw.rect(BSX, by, BW, 8, C.g, 0.4);
      txt(q2.ch[bi], BSX + BW / 2, by + BH / 2 + 16, 54, C.g);
    }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
