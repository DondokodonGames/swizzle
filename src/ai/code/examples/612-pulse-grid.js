// 612-pulse-grid.js
// パルスグリッド — 各ノードから広がる光輪がスイートスポットに来た瞬間をタップで叩く
// 操作: 光輪が中間の輝く帯に重なった時にノードをタップ。連続成功でコンボ加点
// 成功: 150点 到達  失敗: 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、共鳴盤） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RING_COLS = [C.e, C.d, C.a];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PULSE GRID';
  var HOW_TO_PLAY = 'TAP A NODE WHEN ITS RING HITS THE BRIGHT SWEET SPOT · CHAIN FOR COMBOS';
  var MAX_TIME = 22;
  var NEEDED   = 150;        // 修正2: 400 → 150
  var GRID_COLS = 3, GRID_ROWS = 4, CELL_W = W / 3, CELL_H = snap(H * 0.56 / 4), GRID_OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var nodes, score, combo, comboTimer, timeLeft, done, particles, flash, flashCol, comboText, comboTextTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() {
    nodes = [];
    for (var r = 0; r < GRID_ROWS; r++) for (var c = 0; c < GRID_COLS; c++) nodes.push({ x: CELL_W * c + CELL_W / 2, y: GRID_OY + CELL_H * r + CELL_H / 2, col: RING_COLS[(r + c) % RING_COLS.length], rings: [], pulseTimer: 1 + Math.random() * 2, pulseInterval: 1.5 + Math.random() * 1.5 });
    score = 0; combo = 0; comboTimer = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; comboText = ''; comboTextTimer = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + Math.ceil(timeLeft) * 40) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ni = 0; ni < nodes.length; ni++) {
      var n = nodes[ni];
      for (var ri = 0; ri < n.rings.length; ri++) {
        var rg = n.rings[ri], al = rg.life / rg.maxLife, prog = rg.r / rg.maxR, sweet = prog >= 0.45 && prog <= 0.75;
        ring(n.x, n.y, rg.r, n.col, al * (sweet ? 0.9 : 0.4));
        if (sweet) ring(n.x, n.y, rg.r, C.g, al * 0.3);
      }
      pc(n.x, n.y, 18, n.col, 0.85); pc(n.x, n.y, 8, C.g, 0.5);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bestD = 130;
    for (var i = 0; i < nodes.length; i++) { var n = nodes[i], dx = tx - n.x, dy = ty - n.y, d = Math.sqrt(dx * dx + dy * dy); if (d < bestD) { bestD = d; best = i; } }
    if (best < 0) { combo = 0; return; }
    var node = nodes[best], hit = false;
    for (var ri = node.rings.length - 1; ri >= 0; ri--) {
      var rg = node.rings[ri], prog = rg.r / rg.maxR;
      if (prog >= 0.45 && prog <= 0.75) {
        hit = true; combo++; comboTimer = 1.5; var pts = 10 * Math.min(combo, 5); score += pts;
        node.rings.splice(ri, 1); node.rings.push({ r: 20, maxR: rg.maxR * 0.8, life: 0.8, maxLife: 0.8 });
        game.audio.play('se_success', 0.4 + Math.min(combo * 0.05, 0.4));
        if (combo >= 3) { comboText = combo + 'x  +' + pts; comboTextTimer = 0.8; }
        flash = 0.15; flashCol = C.b;
        for (var p = 0; p < 6; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: node.x, y: node.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: node.col }); }
        break;
      }
    }
    if (!hit) { combo = 0; flash = 0.1; flashCol = C.a; game.audio.play('se_failure', 0.15); }
    if (score >= NEEDED) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!nodes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN RESONANCE!' : 'TIME UP', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (comboTimer > 0) comboTimer -= dt; else combo = 0; if (comboTextTimer > 0) comboTextTimer -= dt;
      for (var ni = 0; ni < nodes.length; ni++) {
        var n = nodes[ni]; n.pulseTimer -= dt;
        if (n.pulseTimer <= 0) { n.pulseTimer = n.pulseInterval; n.rings.push({ r: 10, maxR: 90 + Math.random() * 40, life: 1.2, maxLife: 1.2 }); game.audio.play('se_tap', 0.05); }
        for (var ri = n.rings.length - 1; ri >= 0; ri--) { var rg = n.rings[ri]; rg.r += (rg.maxR / rg.maxLife) * dt; rg.life -= dt; if (rg.life <= 0) n.rings.splice(ri, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (comboTextTimer > 0) txt(comboText, W / 2, snap(H * 0.86), 52, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
