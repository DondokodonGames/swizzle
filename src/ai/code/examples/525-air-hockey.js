// 525-air-hockey.js
// エアホッケー — 縦型コートで自陣のマレットをスワイプで操り、パックを相手ゴールへ叩き込む
// 操作: 自陣（下半分）をスワイプ/タップでマレットを動かしてパックを打つ
// 成功: 3点 先取  失敗: 相手が3点 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ゲームセンター） ──
  var C = { bg:'#080818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'AIR HOCKEY';
  var HOW_TO_PLAY = 'SWIPE YOUR MALLET (LOWER HALF) TO STRIKE THE PUCK';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var CX = 60, CY = 260, CW = W - 120, CH = H - 360, GW = 320, GOX = (W - 320) / 2, PUCK_R = 46, MAL_R = 70;
  var DIV_Y = 260 + (H - 360) / 2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var puck, mallet, cpu, playerScore, cpuScore, timeLeft, done, particles, goalAnim, goalCol, resetting, resetTimer, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function background() { game.draw.clear(C.bg); game.draw.rect(CX, CY, CW, CH, '#0a1030', 0.9); game.draw.rect(CX, DIV_Y - 2, CW, 4, C.d, 0.4); game.draw.rect(GOX, CY - 12, GW, 12, C.a, 0.6); game.draw.rect(GOX, CY + CH, GW, 12, C.b, 0.6); }

  function resetPuck(dir) { puck.x = W / 2; puck.y = DIV_Y; puck.vx = (Math.random() - 0.5) * 300; puck.vy = dir * 420; resetting = false; }

  function initGame() { puck = { x: W / 2, y: DIV_Y, vx: 200, vy: -300 }; mallet = { x: W / 2, y: CY + CH * 0.78 }; cpu = { x: W / 2, y: CY + CH * 0.22 }; playerScore = 0; cpuScore = 0; timeLeft = MAX_TIME; done = false; particles = []; goalAnim = 0; goalCol = C.b; resetting = false; resetTimer = 0; flash = 0; resetPuck(-1); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (playerScore * 1000 + Math.ceil(timeLeft) * 100) : playerScore * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(cpu.x, cpu.y, MAL_R, C.a, 0.9); pc(cpu.x, cpu.y, 22, C.g, 0.6);
    pc(mallet.x, mallet.y, MAL_R, C.f, 0.9); pc(mallet.x, mallet.y, 22, C.g, 0.6);
    if (!resetting) { pc(puck.x, puck.y, PUCK_R, C.g, 0.95); pc(puck.x - PUCK_R * 0.2, puck.y - PUCK_R * 0.2, PUCK_R * 0.25, C.e, 0.5); }
    txt(cpuScore + '', W / 2, CY + 80, 70, C.a); txt(playerScore + '', W / 2, CY + CH - 40, 70, C.b);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (ty > DIV_Y) { mallet.x = tx; mallet.y = Math.max(DIV_Y + MAL_R, Math.min(CY + CH - MAL_R, ty)); }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    if (y1 > DIV_Y || y2 > DIV_Y) {
      mallet.x = x2; mallet.y = Math.max(DIV_Y + MAL_R, Math.min(CY + CH - MAL_R, y2));
      var dx = puck.x - mallet.x, dy = puck.y - mallet.y, d = Math.hypot(dx, dy);
      if (d < PUCK_R + MAL_R + 40) { var nx = dx / (d || 1), ny = dy / (d || 1); puck.vx = nx * 800 + (x2 - x1) * 1.2; puck.vy = ny * 800 + (y2 - y1) * 1.2; game.audio.play('se_tap', 0.5); }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!puck) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, DIV_Y - 60, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, DIV_Y, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, DIV_Y + 120, 56, C.a);
        txt('TAP TO START', W / 2, DIV_Y + 180, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'YOU WIN!' : 'YOU LOSE', W / 2, H * 0.42, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.52, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.60, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(playerScore > cpuScore); return; }
      if (goalAnim > 0) goalAnim -= dt * 2; if (flash > 0) flash -= dt * 3;
      if (resetting) { resetTimer -= dt; if (resetTimer <= 0) resetPuck(Math.random() < 0.5 ? 1 : -1); }
      else {
        puck.x += puck.vx * dt; puck.y += puck.vy * dt;
        if (puck.x - PUCK_R < CX) { puck.x = CX + PUCK_R; puck.vx = Math.abs(puck.vx) * 0.85; }
        if (puck.x + PUCK_R > CX + CW) { puck.x = CX + CW - PUCK_R; puck.vx = -Math.abs(puck.vx) * 0.85; }
        if (puck.y - PUCK_R < CY) { if (puck.x > GOX && puck.x < GOX + GW) { cpuScore++; goalAnim = 1.0; goalCol = C.a; game.audio.play('se_failure', 0.6); if (cpuScore >= NEEDED) { finish(false); return; } resetting = true; resetTimer = 1.3; } else { puck.y = CY + PUCK_R; puck.vy = Math.abs(puck.vy) * 0.85; } }
        if (puck.y + PUCK_R > CY + CH) { if (puck.x > GOX && puck.x < GOX + GW) { playerScore++; goalAnim = 1.0; goalCol = C.b; game.audio.play('se_success', 0.8); if (playerScore >= NEEDED) { finish(true); return; } resetting = true; resetTimer = 1.3; } else { puck.y = CY + CH - PUCK_R; puck.vy = -Math.abs(puck.vy) * 0.85; } }
        puck.vx *= 0.998; puck.vy *= 0.998; var sp = Math.hypot(puck.vx, puck.vy); if (sp > 1200) { puck.vx = puck.vx / sp * 1200; puck.vy = puck.vy / sp * 1200; } if (sp < 50) { puck.vx += (Math.random() - 0.5) * 100; puck.vy += (Math.random() - 0.5) * 100; }
        var dm = Math.hypot(puck.x - mallet.x, puck.y - mallet.y); if (dm < PUCK_R + MAL_R) { var nx = (puck.x - mallet.x) / dm, ny = (puck.y - mallet.y) / dm; puck.x = mallet.x + nx * (PUCK_R + MAL_R); puck.y = mallet.y + ny * (PUCK_R + MAL_R); var rv = puck.vx * nx + puck.vy * ny; puck.vx -= 2 * rv * nx; puck.vy -= 2 * rv * ny; if (Math.hypot(puck.vx, puck.vy) < 600) { puck.vx = nx * 600; puck.vy = ny * 600; } game.audio.play('se_tap', 0.4); }
        cpu.x += ((puck.y < DIV_Y ? puck.x : W / 2) - cpu.x) * Math.min(1, dt * 3); cpu.y = CY + CH * 0.22;
        var dc = Math.hypot(puck.x - cpu.x, puck.y - cpu.y); if (dc < PUCK_R + MAL_R) { var ncx = (puck.x - cpu.x) / dc, ncy = (puck.y - cpu.y) / dc; puck.x = cpu.x + ncx * (PUCK_R + MAL_R); puck.y = cpu.y + ncy * (PUCK_R + MAL_R); puck.vx = ncx * 700; puck.vy = ncy * 700; game.audio.play('se_tap', 0.3); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (goalAnim > 0) game.draw.rect(0, 0, W, H, goalCol, goalAnim * 0.12);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    var t = Math.ceil(timeLeft / MAX_TIME * 12); for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0a1030');
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(playerScore + ' - ' + cpuScore + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
