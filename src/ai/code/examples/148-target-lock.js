// 148-target-lock.js
// ターゲットロック — 動く敵をロックオンしてミサイルを発射する戦術ゲーム
// 操作: タップでロックオン、もう一度で発射
// 成功: 2機撃墜  失敗: 3機逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、レーダー管制） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TARGET LOCK';
  var HOW_TO_PLAY = 'TAP TO LOCK · TAP AGAIN TO FIRE';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 2;              // 修正2: 12 → 2
  var MAX_ESCAPE = 3;
  var TOP    = 220;
  var BOTTOM = H - 180;
  var LOCK_TIME = 0.7, SPAWN_INTERVAL = 1.8, TARGET_SPEED = 160, TARGET_R = 36;
  var PAD_X = snap(W / 2), PAD_Y = snap(H * 0.82);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targets, missiles, stars, lockedTarget, lockProgress, locking, spawnTimer;
  var score, escaped, timeLeft, done, feedback, feedbackOk, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#003300');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < stars.length; i++) {
      var on = Math.floor((game.time.elapsed + stars[i].o) * 8) % 2 === 0 ? 0.8 : 0.3;
      game.draw.rect(stars[i].x, stars[i].y, 8, 8, C.d, on);
    }
    // レーダー同心円
    for (var rr = 120; rr < 500; rr += 120) {
      for (var a = 0; a < Math.PI * 2; a += 0.25) game.draw.rect(snap(PAD_X + Math.cos(a) * rr) - 3, snap(PAD_Y - 300 + Math.sin(a) * rr) - 3, 6, 6, C.d, 0.2);
    }
  }

  // ── スプライト（多矩形の敵機） ──
  function drawTarget(t) {
    var col = t.locked ? C.c : C.f;
    game.draw.rect(t.x - TARGET_R, t.y - 8, TARGET_R * 2, 16, col);       // 翼
    pc(t.x, t.y, 16, col, 1);                                            // 機体
    game.draw.rect(t.x - 6, t.y - TARGET_R, 12, 20, col);                // 機首
    game.draw.rect(t.x - 8, t.y - 4, 8, 8, C.g);                         // コックピット
  }

  function drawMissile(m) {
    pc(m.x, m.y, 10, C.e, 1);
    game.draw.rect(snap(m.x) - 4, snap(m.y) + 8, 8, 16, C.f);   // 炎
  }

  function spawnTarget() {
    var side = Math.floor(Math.random() * 3);
    var x, y, vx, vy;
    if (side === 0) { x = snap(game.random(80, W - 80)); y = TOP; vx = game.random(-TARGET_SPEED, TARGET_SPEED) * 0.5; vy = TARGET_SPEED; }
    else if (side === 1) { x = W; y = snap(game.random(TOP, BOTTOM * 0.6)); vx = -TARGET_SPEED; vy = game.random(-40, 80); }
    else { x = 0; y = snap(game.random(TOP, BOTTOM * 0.6)); vx = TARGET_SPEED; vy = game.random(-40, 80); }
    targets.push({ x: x, y: y, vx: vx, vy: vy, locked: false });
  }

  function initGame() {
    targets = []; missiles = []; particles = [];
    stars = [];
    for (var i = 0; i < 30; i++) stars.push({ x: snap(game.random(0, W)), y: snap(game.random(0, H)), o: Math.random() });
    lockedTarget = null; lockProgress = 0; locking = false; spawnTimer = 0.4;
    score = 0; escaped = 0; timeLeft = MAX_TIME; done = false; feedback = 0;
    spawnTarget(); spawnTarget();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!locking && !lockedTarget) {
      for (var ti = 0; ti < targets.length; ti++) {
        if (Math.hypot(x - targets[ti].x, y - targets[ti].y) < TARGET_R + 40) {
          lockedTarget = targets[ti]; targets[ti].locked = true; locking = true; lockProgress = 0;
          game.audio.play('se_tap', 0.5); return;
        }
      }
    } else if (lockedTarget && lockProgress >= 1) {
      missiles.push({ x: PAD_X, y: PAD_Y, tx: lockedTarget, speed: 500 });
      locking = false; lockedTarget.locked = false; lockedTarget = null; lockProgress = 0;
      game.audio.play('se_success', 0.7);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawTarget({ x: W * 0.4, y: H * 0.4, locked: false });
      drawTarget({ x: W * 0.65, y: H * 0.55, locked: true });
      game.draw.rect(PAD_X - 40, PAD_Y - 16, 80, 40, C.d); game.draw.rect(PAD_X - 40, PAD_Y - 16, 80, 8, C.a);
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.e);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CLEAR!' : 'MISSION FAIL', W / 2, H * 0.35, 72, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6); spawnTarget(); }
      if (locking && lockedTarget) { lockProgress = Math.min(1, lockProgress + dt / LOCK_TIME); }

      for (var ti2 = targets.length - 1; ti2 >= 0; ti2--) {
        var t2 = targets[ti2];
        t2.x += t2.vx * dt; t2.y += t2.vy * dt;
        if (t2.x < -80 || t2.x > W + 80 || t2.y < TOP - 80 || t2.y > BOTTOM + 80) {
          if (t2 === lockedTarget) { lockedTarget = null; locking = false; lockProgress = 0; }
          targets.splice(ti2, 1); escaped++; feedbackOk = false; feedback = 0.4;
          if (escaped >= MAX_ESCAPE) { finish(false); return; }
        }
      }
      for (var mi = missiles.length - 1; mi >= 0; mi--) {
        var m = missiles[mi];
        if (!m.tx || targets.indexOf(m.tx) < 0) { missiles.splice(mi, 1); continue; }
        var dx = m.tx.x - m.x, dy = m.tx.y - m.y, dist = Math.hypot(dx, dy);
        if (dist < 24) {
          score++; feedbackOk = true; feedback = 0.4;
          for (var pi = 0; pi < 14; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: m.tx.x, y: m.tx.y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.5 }); }
          var idx = targets.indexOf(m.tx); if (idx >= 0) targets.splice(idx, 1);
          missiles.splice(mi, 1);
          if (score >= NEEDED) { finish(true); return; }
          continue;
        }
        var spd = m.speed * dt / dist; m.x += dx * spd; m.y += dy * spd;
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 200 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var ti3 = 0; ti3 < targets.length; ti3++) drawTarget(targets[ti3]);
    if (lockedTarget) {
      var lr = TARGET_R + 28, arc = lockProgress * Math.PI * 2;
      for (var la = 0; la < 32; la++) {
        var a1 = -Math.PI / 2 + (la / 32) * arc;
        game.draw.rect(snap(lockedTarget.x + Math.cos(a1) * lr) - 4, snap(lockedTarget.y + Math.sin(a1) * lr) - 4, 8, 8, C.a, 0.9);
      }
      txt(lockProgress >= 1 ? 'FIRE!' : 'LOCKING', lockedTarget.x, lockedTarget.y - lr - 36, lockProgress >= 1 ? 44 : 34, C.a);
    }
    for (var mi2 = 0; mi2 < missiles.length; mi2++) drawMissile(missiles[mi2]);
    game.draw.rect(PAD_X - 40, PAD_Y - 16, 80, 40, C.d); game.draw.rect(PAD_X - 40, PAD_Y - 16, 80, 8, C.a);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.e, particles[pp].life * 2);
    if (feedback > 0) txt(feedbackOk ? 'HIT!' : 'ESCAPED', W / 2, H * 0.3, 72, feedbackOk ? C.a : C.f);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var es = 0; es < MAX_ESCAPE; es++) {
      var ex = snap(W / 2 + (es - (MAX_ESCAPE - 1) / 2) * 56);
      game.draw.rect(ex - 12, 208, 24, 24, es < escaped ? C.f : '#003300');
    }
    txt(lockedTarget ? (lockProgress < 1 ? 'LOCKING...' : 'TAP TO FIRE!') : 'TAP A TARGET', W / 2, H - 120, 40, lockedTarget ? C.a : C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
