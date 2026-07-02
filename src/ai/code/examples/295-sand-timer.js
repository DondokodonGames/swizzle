// 295-sand-timer.js
// 砂時計の番人 — 上の砂が落ちきる前にタップで反転し、砂を絶やさず時間を守り抜くサバイバル
// 操作: タップで砂時計を反転
// 成功: 15秒間 砂を切らさず耐える  失敗: 砂が3回落ちきる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、時の神殿） ──
  var C = { bg:'#0a0612', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', sand:'#ffb020' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAND KEEPER';
  var HOW_TO_PLAY = 'TAP TO FLIP BEFORE THE SAND RUNS OUT';
  var NEEDED   = 15;         // 修正2: サバイバル 60s → 15s
  var MAX_FAIL = 3;
  var DRAIN = 0.09;          // 上砂の減る割合/秒
  var CX = snap(W / 2), CY = snap(H * 0.46), GW = 280, GH = 520;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sandTop, sandBot, survived, fails, timeLeft, done, particles, flipFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { sandTop = 1.0; sandBot = 0.0; survived = 0; fails = 0; timeLeft = NEEDED; done = false; particles = []; flipFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 300 + (MAX_FAIL - fails) * 500) : Math.round(survived) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGlass() {
    var half = GH / 2, neck = 32;
    // 上室
    game.draw.rect(CX - GW / 2, CY - half, GW, half - neck / 2, C.d, 0.25);
    var topH = snap((half - neck / 2 - 16) * sandTop);
    game.draw.rect(CX - GW / 2 + 12, CY - neck / 2 - 16 - topH, GW - 24, topH, C.sand, 0.9);
    game.draw.rect(CX - GW / 2 + 12, CY - neck / 2 - 16 - topH, GW - 24, 8, C.c, 0.6);
    // くびれ
    game.draw.rect(CX - 20, CY - neck / 2, 40, neck, C.d, 0.9);
    // 下室
    game.draw.rect(CX - GW / 2, CY + neck / 2, GW, half - neck / 2, C.d, 0.25);
    var botH = snap((half - neck / 2 - 16) * sandBot);
    game.draw.rect(CX - GW / 2 + 12, CY + half - 16 - botH, GW - 24, botH, C.f, 0.9);
    game.draw.rect(CX - GW / 2 + 12, CY + half - 16 - botH, GW - 24, 8, C.c, 0.4);
    // 落ちる砂すじ
    if (sandTop > 0.01 && !done) for (var yy = CY - neck / 2; yy < CY + half - 24; yy += 24) game.draw.rect(CX - 4, snap(yy + (game.time.elapsed * 200 % 24)), 8, 8, C.c, 0.8);
    // フレーム
    game.draw.rect(CX - GW / 2 - 16, CY - half - 20, GW + 32, 20, C.e, 0.9);
    game.draw.rect(CX - GW / 2 - 16, CY + half, GW + 32, 20, C.e, 0.9);
    for (var i = 0; i <= GH; i += 24) { game.draw.rect(CX - GW / 2 - 12, snap(CY - half + i) - 4, 8, 8, C.e, 0.5); game.draw.rect(CX + GW / 2 + 4, snap(CY - half + i) - 4, 8, 8, C.e, 0.5); }
    // 危険点滅
    if (sandTop < 0.22 && !done && Math.floor(game.time.elapsed * 8) % 2 === 0) game.draw.rect(CX - GW / 2, CY - half, GW, half, C.a, 0.25);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var tmp = sandTop; sandTop = sandBot; sandBot = tmp; flipFlash = 0.3; game.audio.play('se_tap', 0.35);
    for (var i = 0; i < 8; i++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.5, col: C.c }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (sandTop === undefined) initGame(); background(); drawGlass();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TIME KEPT!' : 'SANDS FELL', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived = NEEDED - Math.max(0, timeLeft);
      if (timeLeft <= 0) { finish(true); return; }
      if (flipFlash > 0) flipFlash -= dt;
      var drain = Math.min(sandTop, DRAIN * dt);
      sandTop -= drain; sandBot += drain;
      if (sandTop <= 0.001) {
        fails++; game.audio.play('se_failure', 0.6);
        for (var fi = 0; fi < 12; fi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.6, col: C.a }); }
        if (fails >= MAX_FAIL) { finish(false); return; }
        sandTop = 1.0; sandBot = 0.0;
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGlass();
    if (flipFlash > 0) game.draw.rect(0, 0, W, H, C.c, flipFlash * 0.3);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('TOP ' + Math.round(sandTop * 100) + '%', W / 2, 168, 46, sandTop < 0.22 ? C.a : C.c);
    for (var fi2 = 0; fi2 < MAX_FAIL; fi2++) game.draw.rect(snap(W / 2 + (fi2 - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi2 < fails ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
