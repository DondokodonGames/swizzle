// 701-shadow-match.js
// シャドウマッチ — 上の影と同じ形のシルエットを選択肢からタップする
// 操作: 影の形を見て、下の4択から同じ形をタップ
// 成功: 8問 正解  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、シルエット） ──
  var C = { bg:'#07050f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'arrow'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW MATCH';
  var HOW_TO_PLAY = 'LOOK AT THE SHADOW · TAP THE MATCHING SHAPE FROM THE FOUR OPTIONS';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 6 → 3
  var OPTION_COUNT = 4, OPTIONS_PER_ROW = 2, OPT_W = 360, OPT_H = 280, OPT_GAP = 40;
  var OPT_X0 = snap((W - OPTIONS_PER_ROW * OPT_W - OPT_GAP) / 2), OPT_Y0 = snap(H * 0.52);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var correctShape, options, selectedIdx, score, errors, timeLeft, done, elapsed, flash, flashCol, particles, roundWait, picking;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0814');
  }

  function background() { game.draw.clear(C.bg); }

  function drawShape(shape, cx, cy, size, col, alpha) {
    if (shape === 'circle') pc(cx, cy, size, col, alpha);
    else if (shape === 'square') game.draw.rect(snap(cx - size), snap(cy - size), snap(size * 2), snap(size * 2), col, alpha);
    else if (shape === 'triangle') { var ht = size * 1.1; for (var li = 0; li < 8; li++) { var ly = cy - ht + li * ht * 0.24, lw = (li / 8) * size; game.draw.rect(snap(cx - lw), snap(ly), snap(lw * 2), snap(size * 0.28), col, alpha * 0.9); } }
    else if (shape === 'diamond') { for (var di = 0; di < 10; di++) { var dp = di / 10, dw = size * 0.8 * Math.sin(dp * Math.PI), dy2 = cy - size * 1.1 + di * size * 0.22; game.draw.rect(snap(cx - dw), snap(dy2), snap(dw * 2), snap(size * 0.24), col, alpha * 0.85); } }
    else if (shape === 'cross') { game.draw.rect(snap(cx - size), snap(cy - size * 0.28), snap(size * 2), snap(size * 0.56), col, alpha); game.draw.rect(snap(cx - size * 0.28), snap(cy - size), snap(size * 0.56), snap(size * 2), col, alpha); }
    else if (shape === 'arrow') { game.draw.rect(snap(cx - size * 0.8), snap(cy - size * 0.22), snap(size * 1.2), snap(size * 0.44), col, alpha); var st = 8; for (var i = 0; i < size; i += st) { var w = size - i; game.draw.rect(snap(cx + size * 0.4 + i) - st, snap(cy - w / 2), st, snap(w), col, alpha); } }
  }

  function newRound() {
    correctShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    options = [correctShape]; var pool = SHAPES.filter(function(s) { return s !== correctShape; });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    for (var k = 0; k < OPTION_COUNT - 1; k++) options.push(pool[k]);
    for (var m = options.length - 1; m > 0; m--) { var n = Math.floor(Math.random() * (m + 1)); var tmp2 = options[m]; options[m] = options[n]; options[n] = tmp2; }
    selectedIdx = -1; picking = true; roundWait = 0;
  }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; flashCol = C.b; particles = []; newRound(); }

  function optX(idx) { return OPT_X0 + (idx % OPTIONS_PER_ROW) * (OPT_W + OPT_GAP); }
  function optY(idx) { return OPT_Y0 + Math.floor(idx / OPTIONS_PER_ROW) * (OPT_H + OPT_GAP); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    txt('WHICH SHAPE?', W / 2, H * 0.10, 44, '#ffffff44');
    pc(W / 2, snap(H * 0.30), 150, '#0a0a14', 0.8);
    drawShape(correctShape, W / 2, snap(H * 0.30), 120, '#000000', 1.0);
    drawShape(correctShape, W / 2, snap(H * 0.30), 126, C.d, 0.1);
    for (var oi = 0; oi < options.length; oi++) {
      var ox2 = optX(oi), oy2 = optY(oi), isSelected = selectedIdx === oi, isCorrectOpt = options[oi] === correctShape;
      var bgCol = isSelected ? (isCorrectOpt ? C.b : C.a) : '#1e1b4b', bgAlpha = isSelected ? 0.5 : 0.7;
      game.draw.rect(ox2, oy2, OPT_W, OPT_H, bgCol, bgAlpha);
      drawShape(options[oi], ox2 + OPT_W / 2, oy2 + OPT_H / 2, 70, isSelected ? (isCorrectOpt ? C.b : C.a) : C.e, 0.9);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !picking) return;
    for (var i = 0; i < options.length; i++) {
      var ox = optX(i), oy = optY(i);
      if (tx >= ox && tx <= ox + OPT_W && ty >= oy && ty <= oy + OPT_H) {
        selectedIdx = i; picking = false;
        if (options[i] === correctShape) {
          score++; flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.5);
          for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: ox + OPT_W / 2, y: oy + OPT_H / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.b }); }
          if (score >= NEEDED) { finish(true); return; }
          roundWait = 0.55;
        } else {
          errors++; flash = 0.35; flashCol = C.a; game.audio.play('se_failure', 0.4);
          if (errors >= MAX_ERR) { finish(false); return; }
          roundWait = 0.7;
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!options) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.045, 74, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'MISMATCHED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      if (roundWait > 0) { roundWait -= dt; if (roundWait <= 0) newRound(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0a0814');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
