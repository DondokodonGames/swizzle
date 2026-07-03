// 585-chain-reaction.js
// チェーンリアクション — 1回のタップで爆弾を起爆し、爆風の連鎖で盤面の爆弾を巻き込み尽くす
// 操作: 爆弾群のどこか1点をタップして起爆（爆風が近くの爆弾を誘爆→連鎖）位置取りが鍵
// 成功: 爆弾の60%以上を連鎖爆発  失敗: 3回 挑戦しても未達 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆破解体） ──
  var C = { bg:'#06040a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'TAP ONE BOMB TO IGNITE · BLASTS CHAIN TO NEARBY BOMBS · 60% WINS';
  var MAX_TIME = 20;
  var THRESHOLD = 0.6;      // 修正2: 80% → 60%
  var MAX_ATTEMPTS = 3;     // 修正2: 5 → 3
  var BOMB_R = 36, EXPLODE_R = 130;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bombs, totalBombs, chainActive, chainDone, attempts, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, bestRatio;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0a10');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBombs() {
    bombs = []; var count = 12 + Math.floor(Math.random() * 5);
    for (var i = 0; i < count; i++) bombs.push({ x: 80 + Math.random() * (W - 160), y: H * 0.20 + Math.random() * (H * 0.55), r: BOMB_R, state: 'idle', litTimer: 0, explodeTimer: 0, explodeR: 0 });
    totalBombs = bombs.length; chainActive = false; chainDone = false;
  }

  function initGame() { attempts = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; bestRatio = 0; spawnBombs(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(bestRatio * 3000) + Math.ceil(timeLeft) * 100) : Math.round(bestRatio * 1000);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function ignite(i) { if (bombs[i].state !== 'idle') return; bombs[i].state = 'lit'; bombs[i].litTimer = 0.35 + Math.random() * 0.25; }

  function drawScene() {
    for (var i = 0; i < bombs.length; i++) {
      var b = bombs[i]; if (b.state === 'done') continue;
      if (b.state === 'exploding') { pc(b.x, b.y, b.explodeR, C.f, 0.3); pc(b.x, b.y, b.explodeR * 0.6, C.c, 0.5); pc(b.x, b.y, b.explodeR * 0.3, C.g, 0.5); continue; }
      var col = b.state === 'lit' ? C.c : C.a, pulse = b.state === 'lit' ? 1 + Math.sin(game.time.elapsed * 15) * 0.15 : 1;
      if (!chainActive && !chainDone) pc(b.x, b.y, EXPLODE_R, col, 0.04);
      pc(b.x, b.y, b.r * pulse, col, 0.9); pc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.3, C.g, 0.4);
      if (b.state === 'lit') pc(b.x + 12, b.y - b.r - 16, 8, C.c, 0.9 + Math.sin(game.time.elapsed * 20) * 0.1);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || chainActive || chainDone) return;
    var best = -1, bd = 90; for (var i = 0; i < bombs.length; i++) { var d = Math.hypot(tx - bombs[i].x, ty - bombs[i].y); if (d < bd) { bd = d; best = i; } }
    if (best >= 0) { ignite(best); chainActive = true; attempts++; game.audio.play('se_tap', 0.4); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bombs) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.16, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BOOM! CLEARED!' : 'FIZZLED OUT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(bestRatio >= THRESHOLD); return; }
      if (flash > 0) flash -= dt * 2.5; if (resultTimer > 0) resultTimer -= dt;
      if (chainActive) {
        var any = false;
        for (var i = 0; i < bombs.length; i++) {
          var b = bombs[i];
          if (b.state === 'lit') { any = true; b.litTimer -= dt; if (b.litTimer <= 0) { b.state = 'exploding'; b.explodeTimer = 0.5; b.explodeR = 0; game.audio.play('se_success', 0.4); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.4, col: C.c }); } } }
          else if (b.state === 'exploding') { any = true; b.explodeTimer -= dt; b.explodeR = EXPLODE_R * (1 - b.explodeTimer / 0.5); for (var j = 0; j < bombs.length; j++) if (bombs[j].state === 'idle' && Math.hypot(bombs[j].x - b.x, bombs[j].y - b.y) < b.explodeR + bombs[j].r) ignite(j); if (b.explodeTimer <= 0) b.state = 'done'; }
        }
        if (!any) {
          chainDone = true; chainActive = false; var ex = 0; for (var i2 = 0; i2 < bombs.length; i2++) if (bombs[i2].state === 'done') ex++; var ratio = ex / totalBombs; bestRatio = Math.max(bestRatio, ratio);
          if (ratio >= THRESHOLD) { resultText = Math.round(ratio * 100) + '%!'; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.9); finish(true); return; }
          resultText = Math.round(ratio * 100) + '%'; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.4); resultTimer = 1.2;
          if (attempts >= MAX_ATTEMPTS) { finish(false); return; }
          setTimeout(function() { if (!done) spawnBombs(); }, 1200);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.4);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 60, flashCol);
    else if (!chainActive && !chainDone) txt('TAP TO IGNITE', W / 2, snap(H * 0.86), 44, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('TRIES ' + attempts + ' / ' + MAX_ATTEMPTS, W / 2, 168, 46, C.b);
    for (var ai = 0; ai < MAX_ATTEMPTS; ai++) game.draw.rect(snap(W / 2 + (ai - (MAX_ATTEMPTS - 1) / 2) * 56) - 10, 224, 20, 20, ai < attempts ? C.f : '#1a0a10');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
