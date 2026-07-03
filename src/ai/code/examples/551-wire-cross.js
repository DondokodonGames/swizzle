// 551-wire-cross.js
// ワイヤークロス — 交差点に迫るショートを、指示（ON/OFF）通りに交差点をタップ切替して防ぐ
// 操作: 光る交差点をタップして接点を ON/OFF 切替。指示と一致した状態でタイマー0にすれば防止
// 成功: 6回 ショート防止  失敗: 3回 ショート or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、配電盤） ──
  var C = { bg:'#010a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WIRE_COLS = [C.a, C.c, C.e];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIRE CROSS';
  var HOW_TO_PLAY = 'TAP JUNCTIONS TO MATCH ON/OFF · STOP THE SHORT BEFORE TIME RUNS OUT';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_SHORT = 3;         // 修正2: 8 → 3
  var GRID_COLS = 5, GRID_ROWS = 6, CELL = 176;
  var OX = snap((W - GRID_COLS * CELL) / 2), OY = snap(H * 0.22);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var crosses, shortEvents, shorted, prevented, timeLeft, done, nextEvent, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#021408');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(OX - 20, OY - 20, GRID_COLS * CELL + 40, GRID_ROWS * CELL + 40, '#0a1a0a', 0.7);
    for (var gi = 0; gi <= GRID_COLS; gi++) game.draw.rect(OX + gi * CELL, OY, 2, GRID_ROWS * CELL, '#021408', 0.9);
    for (var gj = 0; gj <= GRID_ROWS; gj++) game.draw.rect(OX, OY + gj * CELL, GRID_COLS * CELL, 2, '#021408', 0.9);
    var pos = [0.8, 2.3, 3.8];
    for (var wi = 0; wi < 3; wi++) { game.draw.rect(OX, OY + pos[wi] * CELL - 3, GRID_COLS * CELL, 6, WIRE_COLS[wi], 0.6); game.draw.rect(OX + pos[wi] * CELL - 3, OY, 6, GRID_ROWS * CELL, WIRE_COLS[wi], 0.6); }
  }

  function findCross(col, row) { for (var i = 0; i < crosses.length; i++) if (Math.abs(crosses[i].col - col) < 0.1 && Math.abs(crosses[i].row - row) < 0.1) return crosses[i]; return null; }

  function spawnEvent() { var ci = Math.floor(Math.random() * 4), ri = Math.floor(Math.random() * 4), t = 2.5 - Math.min(prevented * 0.08, 1.0); shortEvents.push({ col: ci + 0.5, row: ri + 0.5, needsEnabled: Math.random() < 0.5, timer: t, maxTimer: t }); }

  function initGame() { crosses = []; for (var ci = 0; ci < 4; ci++) for (var ri = 0; ri < 4; ri++) crosses.push({ col: ci + 0.5, row: ri + 0.5, enabled: Math.random() < 0.5 }); shortEvents = []; shorted = 0; prevented = 0; timeLeft = MAX_TIME; done = false; nextEvent = 1.2; particles = []; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (prevented * 600 + Math.ceil(timeLeft) * 100) : prevented * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ci = 0; ci < crosses.length; ci++) { var cr = crosses[ci], cx = OX + cr.col * CELL, cy = OY + cr.row * CELL; pc(cx, cy, 34, cr.enabled ? C.b : '#224422', 0.9); pc(cx, cy, cr.enabled ? 16 : 26, cr.enabled ? '#001a00' : '#000800', 0.9); }
    for (var ei = 0; ei < shortEvents.length; ei++) {
      var ev = shortEvents[ei], evx = OX + ev.col * CELL, evy = OY + ev.row * CELL, frac = ev.timer / ev.maxTimer, urg = 1 - frac, pulse = 1 + Math.sin(game.time.elapsed * (8 + urg * 8)) * 0.2, ecol = ev.needsEnabled ? C.b : C.f;
      pc(evx, evy, 56 * pulse, urg > 0.6 ? C.a : ecol, urg * 0.4);
      for (var ri2 = 0; ri2 < 8; ri2++) { if (ri2 / 8 > frac) continue; var rang = ri2 / 8 * Math.PI * 2; pc(evx + Math.cos(rang) * 52, evy + Math.sin(rang) * 52, 6, ecol, 0.8); }
      txt(ev.needsEnabled ? 'ON!' : 'OFF!', evx, evy - 76, 32, urg > 0.6 ? C.a : ecol);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < crosses.length; i++) {
      var cx = OX + crosses[i].col * CELL, cy = OY + crosses[i].row * CELL;
      if (Math.abs(tx - cx) < 60 && Math.abs(ty - cy) < 60) {
        crosses[i].enabled = !crosses[i].enabled; game.audio.play('se_tap', 0.3);
        for (var ei = shortEvents.length - 1; ei >= 0; ei--) {
          var ev = shortEvents[ei];
          if (Math.abs(ev.col - crosses[i].col) < 0.1 && Math.abs(ev.row - crosses[i].row) < 0.1 && crosses[i].enabled === ev.needsEnabled) {
            prevented++; shortEvents.splice(ei, 1); flash = 0.25; flashCol = C.b; game.audio.play('se_success', 0.7);
            for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.b }); }
            if (prevented >= NEEDED) { finish(true); return; }
          }
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!crosses) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
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
      txt(resultSuccess ? 'CIRCUIT SAFE!' : 'MELTDOWN', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
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
      nextEvent -= dt; if (nextEvent <= 0) { spawnEvent(); nextEvent = Math.max(0.8, 1.4 - prevented * 0.05); }
      for (var ei = shortEvents.length - 1; ei >= 0; ei--) {
        var ev = shortEvents[ei]; ev.timer -= dt;
        if (ev.timer <= 0) {
          var cross = findCross(ev.col, ev.row);
          if (!cross || cross.enabled !== ev.needsEnabled) { shorted++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.6); var sx = OX + ev.col * CELL, sy = OY + ev.row * CELL; for (var pi2 = 0; pi2 < 12; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: sx, y: sy, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250, life: 0.5, col: C.a }); } shortEvents.splice(ei, 1); if (shorted >= MAX_SHORT) { finish(false); return; } }
          else { prevented++; shortEvents.splice(ei, 1); if (prevented >= NEEDED) { finish(true); return; } }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(prevented + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var si = 0; si < MAX_SHORT; si++) game.draw.rect(snap(W / 2 + (si - (MAX_SHORT - 1) / 2) * 56) - 10, 224, 20, 20, si < shorted ? C.a : '#021408');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
