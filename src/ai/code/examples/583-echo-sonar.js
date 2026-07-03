// 583-echo-sonar.js
// エコーソナー — 各列に音波を打ち、返ってくるエコーで宝の有無を読み、宝のある列をドリルで掘る
// 操作: 海面側（上）をタップで音波発射→エコーが出た列を海底側（下）タップでドリル
// 成功: 宝 3個 発見  失敗: 3回 空掘り or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、探査艇） ──
  var C = { bg:'#000a10', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ECHO SONAR';
  var HOW_TO_PLAY = 'TAP UPPER TO PING · READ THE ECHO · TAP LOWER TO DRILL A TREASURE';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_FAIL = 3;          // 修正2: 8 → 3
  var COLS = 6, SEAFLOOR_Y = snap(H * 0.52), COL_W = W / 6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hasT, depth, foundCol, echoes, waves, selected, drilling, drillTimer, drillCol, found, fails, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color) { cx = snap(cx); cy = snap(cy); for (var a = 0; a < 5; a++) { var ang = -Math.PI / 2 + a * Math.PI * 2 / 5; pc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, r * 0.3, color, 0.95); } pc(cx, cy, r * 0.4, color, 0.95); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, 0, W, SEAFLOOR_Y, '#003344', 0.6);
    game.draw.rect(0, SEAFLOOR_Y, W, H - SEAFLOOR_Y, '#1a1000', 0.9);
    for (var ci = 1; ci < COLS; ci++) game.draw.rect(ci * COL_W - 1, 0, 2, H, '#334455', 0.4);
  }

  function initGame() { hasT = []; depth = []; foundCol = []; echoes = []; for (var i = 0; i < COLS; i++) { hasT.push(Math.random() < 0.55); depth.push(0.2 + Math.random() * 0.6); foundCol.push(false); echoes.push({ visible: false, timer: 0 }); } waves = []; selected = -1; drilling = false; drillTimer = 0; drillCol = -1; found = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (found * 1200 + Math.ceil(timeLeft) * 100) : found * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function ping(col) {
    waves.push({ x: (col + 0.5) * COL_W, y: SEAFLOOR_Y, r: 0, alpha: 0.7 }); game.audio.play('se_tap', 0.2);
    var ec = col; setTimeout(function() { if (!done && !foundCol[ec] && hasT[ec]) { echoes[ec].visible = true; echoes[ec].timer = 2.5; } }, (depth[col] * 800 + 300));
  }

  function drill(col) {
    if (foundCol[col] || drilling) return; drillCol = col; drilling = true; drillTimer = 0.7; game.audio.play('se_tap', 0.4);
  }

  function drawScene() {
    var shipX = W / 2; game.draw.rect(shipX - 80, 30, 160, 40, '#334455', 0.9); pc(shipX, 78, 10, C.b, 0.9); game.draw.rect(shipX - 2, 78, 4, SEAFLOOR_Y * 0.25, C.b, 0.6);
    for (var wi = 0; wi < waves.length; wi++) { var sw = waves[wi]; game.draw.rect(sw.x - sw.r * 0.3, sw.y - sw.r - 2, sw.r * 0.6, 4, C.b, sw.alpha); }
    for (var ei = 0; ei < COLS; ei++) { var e = echoes[ei], ecx = (ei + 0.5) * COL_W; if (!foundCol[ei] && e.visible && e.timer > 0) { var ecy = SEAFLOOR_Y + depth[ei] * (H - SEAFLOOR_Y) * 0.7; game.draw.rect(ecx - 2, SEAFLOOR_Y, 4, ecy - SEAFLOOR_Y, C.d, Math.min(1, e.timer) * 0.6); pc(ecx, ecy, 16, C.b, Math.min(1, e.timer) * 0.7 + Math.sin(game.time.elapsed * 6) * 0.1); } }
    for (var fi = 0; fi < COLS; fi++) if (foundCol[fi]) { var fx = (fi + 0.5) * COL_W, fy = SEAFLOOR_Y + depth[fi] * (H - SEAFLOOR_Y) * 0.7; star(fx, fy, 26, C.c); }
    if (drilling) { var dx = (drillCol + 0.5) * COL_W, dp = 1 - drillTimer / 0.7; game.draw.rect(dx - 10, SEAFLOOR_Y, 20, (H - SEAFLOOR_Y) * dp * 0.7, C.a, 0.6); pc(dx, SEAFLOOR_Y + drillTimer * 80, 18, C.f, 0.9); }
    if (selected >= 0) game.draw.rect(selected * COL_W, 0, COL_W, SEAFLOOR_Y, C.b, 0.05);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.max(0, Math.min(COLS - 1, Math.floor(tx / COL_W)));
    if (ty < SEAFLOOR_Y) { selected = col; ping(col); }
    else drill(selected >= 0 ? selected : col);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!hasT) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.14, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TREASURE FOUND!' : 'EMPTY HAUL', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2.5;
      if (drilling) { drillTimer -= dt; if (drillTimer <= 0) { drilling = false; var dc = drillCol; if (echoes[dc].visible && hasT[dc]) { foundCol[dc] = true; found++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.9); var tx2 = (dc + 0.5) * COL_W, ty2 = SEAFLOOR_Y + depth[dc] * (H - SEAFLOOR_Y) * 0.7; for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: tx2, y: ty2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); } if (found >= NEEDED) { finish(true); return; } } else { fails++; flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.3); if (fails >= MAX_FAIL) { finish(false); return; } } } }
      for (var wi = waves.length - 1; wi >= 0; wi--) { waves[wi].r += 200 * dt; waves[wi].alpha -= dt * 1.2; if (waves[wi].alpha <= 0 || waves[wi].r > 300) waves.splice(wi, 1); }
      for (var ei = 0; ei < COLS; ei++) if (echoes[ei].timer > 0) echoes[ei].timer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(found + ' / ' + NEEDED + ' FOUND', W / 2, 168, 46, C.b);
    for (var fi3 = 0; fi3 < MAX_FAIL; fi3++) game.draw.rect(snap(W / 2 + (fi3 - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi3 < fails ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
