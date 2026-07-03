// 453-beat-punch.js
// ビートパンチ — ビートの瞬間にタップして敵にパンチを叩き込む格闘リズムゲーム
// 操作: 光る輪が中心に重なる瞬間にタップ（PERFECTで大ダメージ）
// 成功: 敵のHPを0に  失敗: 自分のHPが0 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、格闘筐体） ──
  var C = { bg:'#100020', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BEAT PUNCH';
  var HOW_TO_PLAY = 'TAP ON THE BEAT · PERFECT HITS DEAL BIG DAMAGE';
  var MAX_TIME = 15;
  var ENEMY_HP0 = 60;        // 修正2: 100 → 60（少ない手数で倒せる）
  var BEAT_INTERVAL = 0.55;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beatTimer, beatCount, beatAnim, playerHP, enemyHP, punchAnim, enemyPunchAnim, hitText, hitTimer, hitCol, timeLeft, done, flash, flashCol, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0035');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.55, W, H * 0.45, '#1a0035', 0.6); game.draw.rect(0, H * 0.55, W, 4, C.d, 0.6); }

  function initGame() { beatTimer = 0; beatCount = 0; beatAnim = 0; playerHP = 100; enemyHP = ENEMY_HP0; punchAnim = 0; enemyPunchAnim = 0; hitText = ''; hitTimer = 0; hitCol = C.c; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(playerHP) * 400 + Math.ceil(timeLeft) * 100) : Math.ceil((ENEMY_HP0 - enemyHP) * 100);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFighters() {
    var px = snap(W * 0.24 + punchAnim * 80), py = snap(H * 0.36);
    pc(px, py - 56, 44, C.e, 0.9); pc(px, py, 34, C.d, 0.6); pc(px + punchAnim * 60, py - 36, 22, C.g, 0.9);
    var ex = snap(W * 0.76 - enemyPunchAnim * 80), ey = snap(H * 0.36);
    pc(ex, ey - 56, 44, C.a, 0.9); pc(ex, ey, 34, C.f, 0.6); pc(ex - enemyPunchAnim * 60, ey - 36, 22, C.g, 0.9);
    // HPバー
    var bw = W * 0.4, by = snap(H * 0.62);
    game.draw.rect(W * 0.05, by, bw, 26, '#301040', 0.7); game.draw.rect(W * 0.05, by, bw * (playerHP / 100), 26, playerHP > 30 ? C.b : C.a, 0.9); txt('YOU', W * 0.05 + bw / 2, by + 22, 24, C.g);
    game.draw.rect(W * 0.55, by, bw, 26, '#301040', 0.7); game.draw.rect(W * 0.55, by, bw * (enemyHP / ENEMY_HP0), 26, enemyHP > ENEMY_HP0 * 0.3 ? C.b : C.a, 0.9); txt('ENEMY', W * 0.55 + bw / 2, by + 22, 24, C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var phase = beatTimer / BEAT_INTERVAL, dist = Math.min(phase, 1 - phase); punchAnim = 0.3;
    var dmg;
    if (dist < 0.1) { dmg = 25; hitText = 'PERFECT!'; hitCol = C.c; flashCol = C.c; }
    else if (dist < 0.22) { dmg = 14; hitText = 'GOOD'; hitCol = C.b; flashCol = C.b; }
    else { dmg = 4; hitText = 'weak'; hitCol = C.g; flashCol = C.d; }
    enemyHP = Math.max(0, enemyHP - dmg); hitTimer = 0.5; flash = 0.3; game.audio.play('se_tap', 0.4 + dmg / 50);
    for (var pi = 0; pi < Math.floor(dmg / 5) + 1; pi++) { var a = Math.PI + (Math.random() - 0.5) * Math.PI; particles.push({ x: W * 0.72, y: H * 0.36, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.a }); }
    if (enemyHP <= 0) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawFighters();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'K.O.!' : 'DOWN YOU GO', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (hitTimer > 0) hitTimer -= dt; if (punchAnim > 0) punchAnim -= dt * 4; if (enemyPunchAnim > 0) enemyPunchAnim -= dt * 4; if (beatAnim > 0) beatAnim -= dt * 6;
      beatTimer += dt;
      if (beatTimer >= BEAT_INTERVAL) {
        beatTimer -= BEAT_INTERVAL; beatCount++; beatAnim = 0.5;
        if (beatCount % 3 === 0) {
          enemyPunchAnim = 0.4; playerHP = Math.max(0, playerHP - (8 + Math.random() * 6)); game.audio.play('se_failure', 0.3);
          for (var pi2 = 0; pi2 < 5; pi2++) { var a2 = (Math.random() - 0.5) * Math.PI; particles.push({ x: W * 0.28, y: H * 0.36, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180, life: 0.4, col: C.e }); }
          if (playerHP <= 0) { finish(false); return; }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawFighters();
    // ビートインジケータ（縮む輪が中心に重なる瞬間がPERFECT）
    var bp = beatTimer / BEAT_INTERVAL;
    ring(W / 2, H * 0.76, 50, C.c, 0.6 + beatAnim * 0.4);
    ring(W / 2, H * 0.76, 50 + (1 - bp) * 130, C.b, bp * 0.5);
    txt('BEAT', W / 2, H * 0.76 + 16, 40, C.c);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (hitTimer > 0) txt(hitText, W / 2, snap(H * 0.68), 54, hitCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
