// 542-mud-stomp.js
// マッドストンプ — 穴から飛び出すモグラを、引っ込む前に素早くタップで叩く
// 操作: 顔を出したモグラをタップ（星付きの紫モグラは2点）
// 成功: 8匹 撃破  失敗: 3匹 逃がす or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、泥場） ──
  var C = { bg:'#1a0e06', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MUD STOMP';
  var HOW_TO_PLAY = 'TAP THE MOLES BEFORE THEY DUCK BACK · STAR MOLE = 2PT';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_ESCAPE = 3;        // 修正2: 10 → 3
  var COLS = 3, ROWS = 4, HOLE_R = 100;
  var CELL_W = W / COLS, CELL_H = (H * 0.60) / ROWS, OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var holes, smacked, escaped, timeLeft, done, particles, pops, flash, flashCol, nextSpawn;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color) { cx = snap(cx); cy = snap(cy); for (var a = 0; a < 5; a++) { var ang = -Math.PI / 2 + a * Math.PI * 2 / 5; pc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, r * 0.32, color, 0.95); } pc(cx, cy, r * 0.4, color, 0.95); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2d1a08');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, OY - 20, W, H, '#2d1a08', 0.7); }

  function makeHoles() { holes = []; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) holes.push({ x: CELL_W * c + CELL_W / 2, y: OY + CELL_H * r + CELL_H / 2 + 40, mole: null }); }

  function spawnMole() {
    var empties = holes.filter(function(h) { return h.mole === null; }); if (empties.length === 0) return;
    var hole = empties[Math.floor(Math.random() * empties.length)];
    hole.mole = { phase: 'rising', t: 0, riseTime: 0.25, holdTime: 0.9 + Math.random() * 1.2 - Math.min(smacked * 0.03, 0.5), fallTime: 0.2, rise: 0, special: Math.random() < 0.18 };
  }

  function initGame() { makeHoles(); smacked = 0; escaped = 0; timeLeft = MAX_TIME; done = false; particles = []; pops = []; flash = 0; flashCol = C.b; nextSpawn = 0.5; spawnMole(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (smacked * 500 + Math.ceil(timeLeft) * 100) : smacked * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i]; pc(h.x, h.y, HOLE_R, '#0a0604', 1); pc(h.x, h.y, HOLE_R - 8, '#0c0805', 0.8);
      if (h.mole) {
        var m = h.mole, my = h.y - m.rise * 80, R = 68, col = m.special ? C.d : '#8b5e3c', hi = m.special ? C.g : '#c4874a';
        pc(h.x, my + R * 0.5, R * 0.7, '#2d1a08', 0.9);
        pc(h.x, my, R, col, 0.95);
        game.draw.rect(snap(h.x) - 26, snap(my) - 22, 12, 12, '#111111', 0.9); game.draw.rect(snap(h.x) + 14, snap(my) - 22, 12, 12, '#111111', 0.9);
        pc(h.x, my + 12, 16, '#5a2a00', 0.7); pc(h.x - 24, my - 28, 12, hi, 0.4);
        if (m.special) star(h.x, my - R - 24, 28, C.c);
      }
    }
    for (var pi = 0; pi < pops.length; pi++) txt(pops[pi].pts, pops[pi].x, pops[pi].y, 52, C.c);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i]; if (!h.mole || h.mole.phase === 'falling') continue;
      var my = h.y - h.mole.rise * 80;
      if (Math.hypot(tx - h.x, ty - my) < HOLE_R) {
        var pts = h.mole.special ? 2 : 1; smacked += pts; flash = 0.2; flashCol = C.b; game.audio.play('se_success', h.mole.special ? 0.9 : 0.6);
        for (var pi = 0; pi < (h.mole.special ? 12 : 6); pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: h.x, y: my, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220 - 60, life: 0.4, col: h.mole.special ? C.g : C.f }); }
        pops.push({ x: h.x, y: my - 80, t: 0.8, pts: '+' + pts }); h.mole = null;
        if (smacked >= NEEDED) { finish(true); return; }
        return;
      }
    }
    game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!holes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STOMPED ALL!' : 'TOO SLOW', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnMole(); nextSpawn = Math.max(0.3, 0.6 - smacked * 0.01); }
      for (var i = 0; i < holes.length; i++) {
        var h = holes[i]; if (!h.mole) continue; var m = h.mole; m.t += dt;
        if (m.phase === 'rising') { m.rise = Math.min(1, m.t / m.riseTime); if (m.t >= m.riseTime) { m.phase = 'hold'; m.t = 0; m.rise = 1; } }
        else if (m.phase === 'hold') { if (m.t >= m.holdTime) { m.phase = 'falling'; m.t = 0; } }
        else if (m.phase === 'falling') { m.rise = Math.max(0, 1 - m.t / m.fallTime); if (m.t >= m.fallTime) { escaped++; flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.3); h.mole = null; if (escaped >= MAX_ESCAPE) { finish(false); return; } } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
      for (var ss = pops.length - 1; ss >= 0; ss--) { pops[ss].t -= dt * 1.5; pops[ss].y -= 40 * dt; if (pops[ss].t <= 0) pops.splice(ss, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(smacked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#2d1a08');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
