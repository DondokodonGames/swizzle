// 166-code-crack.js
// 金庫破り — 回るダイヤルを止めて正しい数字に合わせる緊張感
// 操作: タップでダイヤルを止める
// 成功: 2桁のコードを合わせる  失敗: 1桁でも外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、金庫室） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CODE CRACK';
  var HOW_TO_PLAY = 'TAP TO STOP EACH DIAL ON ITS NUMBER';
  var MAX_TIME = 15;             // 修正2: 30 → 15
  var DIGITS  = 2;               // 修正2: 4 → 2
  var DIAL_R = 150, DIAL_Y = snap(H * 0.44);
  var DIAL_X = [snap(W * 0.30), snap(W * 0.70)];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, current, speeds, stopped, results, currentDigit, gameState, revealTimer, timeLeft, done, shakeX;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(60, H * 0.24, W - 120, H * 0.42, C.d, 0.4);
    game.draw.rect(60, H * 0.24, W - 120, 8, C.a);
  }

  function drawDial(i, ox) {
    var dx = DIAL_X[i] + ox, dy = DIAL_Y, val = Math.floor(current[i]) % 10;
    var active = i === currentDigit && !stopped[i];
    var col = stopped[i] ? (results[i] ? C.b : C.a) : C.d;
    pc(dx, dy, DIAL_R, col, 0.9);
    pc(dx, dy, DIAL_R - 12, C.bg, 0.6);
    // 目盛り（フレーム点滅で回転感）
    for (var t = 0; t < 10; t++) {
      var ta = -Math.PI / 2 + ((current[i] + t) / 10) * Math.PI * 2;
      game.draw.rect(snap(dx + Math.cos(ta) * (DIAL_R - 20)) - 4, snap(dy + Math.sin(ta) * (DIAL_R - 20)) - 4, 8, 8, t === 0 ? C.c : C.e, t === 0 ? 1 : 0.4);
    }
    // 窓
    game.draw.rect(dx - 48, dy - 56, 96, 104, '#0a0018', 0.9);
    txt(val + '', dx, dy - 8, 80, stopped[i] ? (results[i] ? C.b : C.a) : C.g);
    // 矢印
    game.draw.rect(dx - 10, dy - DIAL_R - 28, 20, 28, C.c, active ? 1 : 0.3);
    if (stopped[i]) txt(results[i] ? 'OK' : 'NG', dx, dy + DIAL_R + 20, 44, results[i] ? C.b : C.a);
    else if (active) txt('TAP', dx, dy + DIAL_R + 20, 34, C.c);
  }

  function initGame() {
    target = []; current = []; speeds = []; stopped = []; results = [];
    for (var i = 0; i < DIGITS; i++) {
      target.push(Math.floor(Math.random() * 10));
      current.push(Math.random() * 10);
      speeds.push((1.6 + Math.random() * 1.4) * (Math.random() < 0.5 ? 1 : -1)); // 修正2: ゆっくり
      stopped.push(false); results.push(false);
    }
    currentDigit = 0; gameState = 'playing'; revealTimer = 0;
    timeLeft = MAX_TIME; done = false; shakeX = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (DIGITS * 300 + Math.ceil(timeLeft) * 40) : currentDigit * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || gameState !== 'playing' || currentDigit >= DIGITS) return;
    var val = Math.floor(current[currentDigit]) % 10;
    stopped[currentDigit] = true;
    results[currentDigit] = (val === target[currentDigit]);
    game.audio.play('se_tap', 0.7);
    if (!results[currentDigit]) { shakeX = 20; finish(false); return; }
    game.audio.play('se_success', 0.6);
    currentDigit++;
    if (currentDigit >= DIGITS) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      current = current || [3, 7]; stopped = [false, false]; results = [false, false]; currentDigit = 0;
      current[0] = (current[0] + dt * 2) % 10; current[1] = (current[1] + dt * 3) % 10;
      drawDial(0, 0); drawDial(1, 0);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.72, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRACKED!' : 'LOCKED OUT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < DIGITS; i++) if (!stopped[i]) { current[i] += speeds[i] * dt; if (current[i] < 0) current[i] += 10; if (current[i] >= 10) current[i] -= 10; }
    }
    if (shakeX > 0) shakeX *= 0.7;
    var ox = (Math.random() - 0.5) * shakeX * 2;

    // ---- 描画 ----
    background();
    for (var d = 0; d < DIGITS; d++) drawDial(d, ox);
    // コード表示
    for (var ti = 0; ti < DIGITS; ti++) {
      var shown = stopped[ti] && results[ti] ? target[ti] : '?';
      var bx = snap(W / 2 + (ti - (DIGITS - 1) / 2) * 100);
      game.draw.rect(bx - 32, H - 130, 64, 64, stopped[ti] && results[ti] ? C.b : C.d, 0.8);
      txt(shown + '', bx, H - 106, 44, C.g);
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('DIAL ' + Math.min(currentDigit + 1, DIGITS) + '/' + DIGITS, W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
