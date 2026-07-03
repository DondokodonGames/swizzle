// 473-sand-timer.js
// 砂時計反転 — 砂が上のチェンバーから落ちきる前にタップで反転させ、時間を稼ぎ続ける
// 操作: タップで砂時計を反転（上の砂が空になると失敗）
// 成功: 10秒 耐える  失敗: 砂が落ちきる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アンバー、時の砂） ──
  var C = { bg:'#120a00', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAND TIMER';
  var HOW_TO_PLAY = 'TAP TO FLIP BEFORE THE TOP RUNS DRY';
  var MAX_TIME = 15;
  var GOAL     = 10;         // 修正2: 60秒 → 10秒 耐える
  var CX = snap(W / 2), CY = snap(H * 0.46), GW = 340, GHALF = 280, NECK = 32;
  var FLOW_RATE = 0.055;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sandTop, sandBot, survived, timeLeft, done, particles, flipCount, shake, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2a1800');
  }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.b : '#2a1800');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { sandTop = 0.6; sandBot = 0.4; survived = 0; timeLeft = MAX_TIME; done = false; particles = []; flipCount = 0; shake = 0; flash = 0; flashCol = C.b; }

  function flip() { var tmp = sandTop; sandTop = sandBot; sandBot = tmp; flipCount++; shake = 0.15; game.audio.play('se_tap', 0.5); for (var i = 0; i < 8; i++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5, col: C.c }); } }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (flipCount * 200 + Math.ceil(survived) * 200) : flipCount * 100 + Math.ceil(survived) * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGlass(ox) {
    // 砂（上）
    var topH = GHALF * sandTop;
    if (topH > 4) { var w = NECK + (GW - NECK) * (topH / GHALF); game.draw.rect(CX - w / 2 + ox, CY - topH, w, topH, C.f, 0.9); game.draw.rect(CX - w / 2 + ox, CY - topH, w, 12, C.c, 0.7); }
    // 砂（下）
    var botH = GHALF * sandBot;
    if (botH > 4) { var w2 = NECK + (GW - NECK) * (botH / GHALF); game.draw.rect(CX - w2 / 2 + ox, CY + (GHALF - botH) + 8, w2, botH, C.f, 0.9); game.draw.rect(CX - w2 / 2 + ox, CY + (GHALF - botH) + 8, w2, 12, C.c, 0.6); }
    // ガラス枠
    pline(CX - GW / 2 + ox, CY - GHALF, CX - NECK / 2 + ox, CY, '#d6d3d1', 0.9, 8);
    pline(CX + NECK / 2 + ox, CY, CX + GW / 2 + ox, CY - GHALF, '#d6d3d1', 0.9, 8);
    pline(CX - GW / 2 + ox, CY - GHALF, CX + GW / 2 + ox, CY - GHALF, '#d6d3d1', 0.9, 10);
    pline(CX - NECK / 2 + ox, CY + 8, CX - GW / 2 + ox, CY + GHALF + 8, '#d6d3d1', 0.9, 8);
    pline(CX + GW / 2 + ox, CY + GHALF + 8, CX + NECK / 2 + ox, CY + 8, '#d6d3d1', 0.9, 8);
    pline(CX - GW / 2 + ox, CY + GHALF + 8, CX + GW / 2 + ox, CY + GHALF + 8, '#d6d3d1', 0.9, 10);
    game.draw.rect(CX - GW / 2 - 34 + ox, CY - GHALF - 20, 24, GHALF * 2 + 60, '#57534e', 0.9);
    game.draw.rect(CX + GW / 2 + 10 + ox, CY - GHALF - 20, 24, GHALF * 2 + 60, '#57534e', 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    flip();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (sandTop === undefined) initGame(); background(); drawGlass(0);
      txt(GAME_TITLE, W / 2, H * 0.86, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.91, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.96, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TIME WON!' : 'SANDS RAN OUT', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (shake > 0) shake -= dt;
      if (sandTop > 0) { var flow = Math.min(FLOW_RATE * dt * (1 + flipCount * 0.05), sandTop); sandTop -= flow; sandBot += flow; }
      if (sandTop <= 0.001) { finish(false); return; }
      if (sandTop > 0 && Math.random() < dt * 10) particles.push({ x: CX + (Math.random() - 0.5) * NECK, y: CY + 20, vx: 0, vy: 80 + Math.random() * 60, life: 0.4, col: C.f });
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    var ox = shake > 0 ? Math.sin(game.time.elapsed * 40) * 20 * (shake / 0.15) : 0;
    background(); drawGlass(ox);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x + ox) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (sandTop < 0.18 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('FLIP!', W / 2, H * 0.12, 72, C.a);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    survBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(survived) + ' / ' + GOAL + 's', W / 2, 168, 44, C.b);
    txt('FLIPS ' + flipCount, W / 2, 224, 30, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
