// 731-fuse-timer.js
// フューズタイマー — 燃え進む導火線を、燃え尽きる直前(残り5%以内)でタップして切る
// 操作: 火が端に迫り残り5%以内になった瞬間タップ。早すぎても爆発してもミス
// 成功: 8回 切断  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、導火線） ──
  var C = { bg:'#0a0402', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FUSE = '#a16207', FUSE_HI = '#ffe600', FLAME = '#ff6600', FLAME_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FUSE TIMER';
  var HOW_TO_PLAY = 'CUT THE FUSE THE MOMENT IT DROPS BELOW 5% · TOO EARLY OR BOOM IS A MISS';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var FUSE_X0 = 80, FUSE_Y = snap(H * 0.45), FUSE_W = W - 160, FUSE_H = 14, CUT_ZONE = 0.05;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var fuseLife, fuseSpeed, fuseActive, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, cutAnim, sparks, waitTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#110805');
  }

  function background() { game.draw.clear(C.bg); }

  function resetFuse() { fuseLife = 1.0; fuseSpeed = Math.min(0.28, 0.14 + score * 0.02); fuseActive = true; sparks = []; waitTimer = 0; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; cutAnim = 0; waitTimer = 0; resetFuse(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var fuseX = FUSE_X0 + fuseLife * FUSE_W, inZone = fuseLife <= CUT_ZONE;
    var burnedW = (1 - fuseLife) * FUSE_W;
    if (burnedW > 0) game.draw.rect(FUSE_X0, FUSE_Y - FUSE_H / 2, burnedW, FUSE_H, '#2d1a08', 0.9);
    if (fuseLife > 0) { game.draw.rect(fuseX, FUSE_Y - FUSE_H / 2, fuseLife * FUSE_W, FUSE_H, FUSE, 0.9); game.draw.rect(fuseX, FUSE_Y - FUSE_H / 2, fuseLife * FUSE_W, 4, FUSE_HI, 0.6); }
    var cutW = CUT_ZONE * FUSE_W;
    game.draw.rect(FUSE_X0, FUSE_Y - FUSE_H / 2 - 16, cutW, FUSE_H + 32, C.b, inZone ? 0.3 : 0.08);
    txt('CUT ZONE', FUSE_X0 + cutW / 2 + 40, FUSE_Y + FUSE_H / 2 + 40, 28, inZone ? C.b : '#00ff9f55');
    if (cutAnim > 0) game.draw.rect(fuseX - 4, FUSE_Y - 40, 8, 80, C.b, cutAnim);
    if (fuseActive && fuseLife > 0) { pc(fuseX, FUSE_Y, 18, FLAME, 0.9); pc(fuseX, FUSE_Y, 10, FLAME_HI, 0.85); }
    for (var si2 = 0; si2 < sparks.length; si2++) { var sp = sparks[si2]; game.draw.rect(snap(sp.x) - 3, snap(sp.y) - 3, 6, 6, sp.col, sp.life * 3); }
    var pct = Math.ceil(fuseLife * 100), pctCol = inZone ? C.b : (fuseLife < 0.2 ? C.f : C.c);
    txt(pct + '%', W / 2, snap(H * 0.60), 88, pctCol);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !fuseActive || waitTimer > 0) return;
    if (fuseLife <= CUT_ZONE) {
      fuseActive = false; score++; cutAnim = 0.5; flash = 0.35; flashCol = C.b; resultText = 'CUT!'; resultTimer = 0.6; game.audio.play('se_success', 0.6);
      var fx = FUSE_X0 + fuseLife * FUSE_W;
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: fx, y: FUSE_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: FUSE_HI }); }
      if (score >= NEEDED) { finish(true); return; }
      waitTimer = 0.7;
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'TOO EARLY  (' + Math.round(fuseLife * 100) + '%)'; resultTimer = 0.6; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (fuseLife === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.28, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.33, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.78, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEFUSED!' : 'KABOOM', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) resetFuse(); }
      if (fuseActive) {
        fuseLife -= fuseSpeed * dt;
        if (fuseLife <= 0) {
          fuseLife = 0; fuseActive = false; errors++; flash = 0.6; flashCol = C.a; resultText = 'BOOM!'; resultTimer = 0.7; game.audio.play('se_failure', 0.5);
          for (var e2 = 0; e2 < 14; e2++) { var ea = Math.random() * Math.PI * 2; particles.push({ x: FUSE_X0, y: FUSE_Y, vx: Math.cos(ea) * 300, vy: Math.sin(ea) * 300, life: 0.6, col: FLAME }); }
          if (errors >= MAX_ERR) { finish(false); return; }
          waitTimer = 0.9;
        }
      }
      if (fuseActive && fuseLife > 0) { var fx = FUSE_X0 + fuseLife * FUSE_W; if (Math.random() < 0.4) { var sa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; sparks.push({ x: fx, y: FUSE_Y, vx: Math.cos(sa) * 80, vy: Math.sin(sa) * 80 - 60, life: 0.25, col: FLAME_HI }); } }
      for (var si = sparks.length - 1; si >= 0; si--) { sparks[si].x += sparks[si].vx * dt; sparks[si].y += sparks[si].vy * dt; sparks[si].vy += 120 * dt; sparks[si].life -= dt * 4; if (sparks[si].life <= 0) sparks.splice(si, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (cutAnim > 0) cutAnim -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.83), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#110805');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
