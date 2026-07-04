// 673-wire-cut.js
// ワイヤーカット — 上に示された順番どおりに、爆弾の対応する色のワイヤーをタップで切る
// 操作: 指示された切断順(色)に従い、下のワイヤーをタップで切断。順番を間違えると爆発
// 成功: 3個 解除  失敗: 3回 誤切断 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆弾処理／配線色は保持） ──
  var C = { bg:'#030a03', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WIRE_COLORS = ['#ff2079', '#3355ff', '#ffe600', '#00ff41', '#e2e8f0'];
  var WIRE_NAMES = ['RED', 'BLUE', 'YELLOW', 'GREEN', 'WHITE'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIRE CUT';
  var HOW_TO_PLAY = 'CUT THE WIRES IN THE ORDER SHOWN AT THE TOP · WRONG ORDER = BOOM';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_ERR  = 3;
  var NUM_WIRES = 4, WIRE_W = 12, WIRE_TOP_Y = snap(H * 0.40), WIRE_BOT_Y = snap(H * 0.70);
  var WIRE_X = []; for (var i = 0; i < NUM_WIRES; i++) WIRE_X.push(W * 0.15 + i * (W * 0.7 / (NUM_WIRES - 1)));

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, wireColors, cutIdx, cutWires, defused, errors, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, lock;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, color) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < size; i += 8) { var w = size - i; game.draw.rect(cx - w / 2, cy + i, w, 8, color); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#050e05');
  }

  function background() { game.draw.clear(C.bg); }

  function shuffle(arr) { for (var j = arr.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = arr[j]; arr[j] = arr[k]; arr[k] = t; } return arr; }

  function newBomb() {
    wireColors = shuffle([0, 1, 2, 3, 4]).slice(0, NUM_WIRES);
    var seqLen = 2 + Math.floor(Math.random() * 2);
    sequence = shuffle([0, 1, 2, 3]).slice(0, seqLen);
    cutIdx = 0; cutWires = []; lock = false;
  }

  function initGame() { defused = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newBomb(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (defused * 800 + Math.ceil(timeLeft) * 100) : defused * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(W * 0.08, H * 0.30, W * 0.84, H * 0.52, '#1c1c1c', 0.9); game.draw.rect(W * 0.08, H * 0.30, W * 0.84, 14, '#2a2a2a', 0.5);
    txt('CUT ORDER', W / 2, snap(H * 0.35), 34, '#ffffff66');
    for (var si = 0; si < sequence.length; si++) {
      var wc = wireColors[sequence[si]], isCut = si < cutIdx, sx = W / 2 - (sequence.length - 1) * 80 + si * 160;
      pc(sx, snap(H * 0.41), 32, WIRE_COLORS[wc], isCut ? 0.3 : 0.9);
      txt(WIRE_NAMES[wc].charAt(0), sx, snap(H * 0.41) + 10, 30, isCut ? '#444' : '#001008');
      if (isCut) game.draw.line(sx - 30, H * 0.41, sx + 30, H * 0.41, C.g, 3);
      if (si === cutIdx) arrow(sx, snap(H * 0.41) + 44, 24, C.g);
    }
    for (var wi = 0; wi < NUM_WIRES; wi++) {
      var cx = WIRE_X[wi], isCutWire = cutWires.indexOf(wi) >= 0, wcol = WIRE_COLORS[wireColors[wi]];
      if (isCutWire) { var cpy = WIRE_TOP_Y + (WIRE_BOT_Y - WIRE_TOP_Y) * 0.45; game.draw.line(cx, WIRE_TOP_Y, cx, cpy - 20, wcol, WIRE_W); game.draw.line(cx, cpy + 20, cx, WIRE_BOT_Y, wcol, WIRE_W); pc(cx, cpy, 12, C.c, 0.8); }
      else { game.draw.line(cx, WIRE_TOP_Y, cx, WIRE_BOT_Y, wcol, WIRE_W); pc(cx, WIRE_TOP_Y, 14, wcol, 0.8); pc(cx, WIRE_BOT_Y, 14, wcol, 0.8); txt(WIRE_NAMES[wireColors[wi]].charAt(0), cx, WIRE_TOP_Y - 32, 30, wcol); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lock) return;
    var hitWire = -1;
    for (var i = 0; i < NUM_WIRES; i++) { if (cutWires.indexOf(i) >= 0) continue; if (Math.abs(tx - WIRE_X[i]) < 40 && ty >= WIRE_TOP_Y - 20 && ty <= WIRE_BOT_Y + 20) { hitWire = i; break; } }
    if (hitWire < 0) return;
    if (hitWire === sequence[cutIdx]) {
      cutWires.push(hitWire); cutIdx++; game.audio.play('se_tap', 0.2);
      if (cutIdx >= sequence.length) {
        defused++; flash = 0.35; flashCol = C.b; resultText = 'DEFUSED!'; resultTimer = 0.6; game.audio.play('se_success', 0.7);
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.54, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.b }); }
        if (defused >= NEEDED) { finish(true); return; }
        lock = true; setTimeout(function() { if (!done) newBomb(); }, 800);
      }
    } else { errors++; flash = 0.4; flashCol = C.a; resultText = 'BOOM!'; resultTimer = 0.6; game.audio.play('se_failure', 0.5); if (errors >= MAX_ERR) { finish(false); return; } lock = true; setTimeout(function() { if (!done) newBomb(); }, 800); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BOMB DEFUSED!' : 'KABOOM', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.83), 68, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(defused + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#050e05');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
