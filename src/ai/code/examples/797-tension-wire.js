// 797-tension-wire.js
// テンションワイヤー — ワイヤーの張力が限界を超える前にタップで緩めろ
// 操作: タップ — ワイヤーを緩める（張力-0.08）
// 成功: 90秒間ワイヤーを切らずに耐える  失敗: 3回切断 or 95秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#030508',
    wire:     '#94a3b8',
    wireHi:   '#e2e8f0',
    wireDanger:'#ef4444',
    post1:    '#334155',
    post2:    '#475569',
    safe:     '#22c55e',
    warn:     '#f59e0b',
    danger:   '#ef4444',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#030508'
  };

  var tension = 0.2; // 0 to 1
  var RISE_SPEED = 0.1;
  var TAP_REDUCE = 0.08;
  var DANGER_ZONE = 0.82;
  var WARN_ZONE = 0.58;

  var cuts = 0;
  var MAX_CUTS = 3;
  var inDanger = false;
  var dangerTimer = 0;
  var DANGER_GRACE = 1.4;

  var gameTimer = 0;
  var WIN_TIME = 90;
  var done = false;
  var timeLeft = 95;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var tapFlash = 0;
  var vibration = 0; // wire vibration on tap

  game.onTap(function(tx, ty) {
    if (done) return;
    tension -= TAP_REDUCE;
    if (tension < 0) tension = 0;
    tapFlash = 0.15;
    vibration = 0.5;
    game.audio.play('se_tap', 0.06);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    // Tension rises faster as time goes on
    var multip = 1 + Math.min(2, gameTimer / 30) + cuts * 0.2;
    tension += RISE_SPEED * multip * dt;
    if (tension > 1) tension = 1;

    // Wire vibration
    if (vibration > 0) vibration -= dt * 2.5;

    // Danger zone check
    if (tension >= DANGER_ZONE) {
      if (!inDanger) {
        inDanger = true;
        dangerTimer = 0;
      }
      dangerTimer += dt;
      if (dangerTimer >= DANGER_GRACE) {
        // CUT!
        cuts++;
        inDanger = false;
        dangerTimer = 0;
        tension = 0.25;
        vibration = 1.0;
        flashCol = C.wrong;
        flashAnim = 0.5;
        resultText = '切断！';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.5);
        for (var p = 0; p < 10; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.42, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220 - 80, life: 0.55, col: C.wire });
        }
        if (cuts >= MAX_CUTS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }
    } else {
      inDanger = false;
      dangerTimer = 0;
    }

    // Win condition
    if (!done) {
      gameTimer += dt;
      if (gameTimer >= WIN_TIME) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(7000 + Math.ceil(timeLeft) * 200 - cuts * 1000); }, 700);
        return;
      }
    }

    if (tapFlash > 0) tapFlash -= dt * 4;
    if (flashAnim > 0) flashAnim -= dt * 2.5;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 280 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Posts
    var postH = 200;
    var postY = H * 0.42;
    game.draw.rect(W * 0.08 - 18, postY - postH / 2, 36, postH, C.post1, 0.9);
    game.draw.rect(W * 0.08 - 18, postY - postH / 2, 36, 10, C.post2, 0.6);
    game.draw.rect(W * 0.92 - 18, postY - postH / 2, 36, postH, C.post1, 0.9);
    game.draw.rect(W * 0.92 - 18, postY - postH / 2, 36, 10, C.post2, 0.6);

    // Wire
    var wireY = postY;
    var sag = tension * 60 * vibration * 0.1;
    var vib = vibration * 20 * Math.sin(elapsed * 40);
    var wireCol = tension >= DANGER_ZONE ? C.wireDanger : (tension >= WARN_ZONE ? '#f59e0b' : C.wire);
    var wireWidth = 4 + tension * 6;

    // Draw wire as series of points (catenary approximation)
    var WX1 = W * 0.08;
    var WX2 = W * 0.92;
    for (var wi = 0; wi <= 40; wi++) {
      var wt = wi / 40;
      var wx = WX1 + (WX2 - WX1) * wt;
      // Sag: parabola + tension stretches wire
      var wy = wireY + sag * 4 * wt * (1 - wt) + vib * Math.sin(wt * Math.PI * 3);
      game.draw.circle(wx, wy, wireWidth / 2, wireCol, 0.9);
    }

    // Tension meter
    var mX = W * 0.1;
    var mY = H * 0.62;
    var mW = W * 0.8;
    var mH = 28;
    game.draw.rect(mX, mY, mW, mH, '#0a0f18', 0.9);
    var barCol = tension >= DANGER_ZONE ? C.danger : (tension >= WARN_ZONE ? C.warn : C.safe);
    game.draw.rect(mX, mY, mW * tension, mH, barCol, 0.9);
    game.draw.rect(mX + mW * DANGER_ZONE - 3, mY - 5, 6, mH + 10, C.danger, 0.8);
    game.draw.text('張力: ' + Math.round(tension * 100) + '%', W / 2, mY + 50, { size: 44, color: barCol, bold: true });
    game.draw.text('危険ライン', mX + mW * DANGER_ZONE - 10, mY - 25, { size: 26, color: C.danger });

    // Tap to loosen
    if (tension >= DANGER_ZONE) {
      game.draw.rect(0, 0, W, H, C.danger, 0.04 + 0.04 * Math.sin(elapsed * 12));
      game.draw.text('危険！タップで緩めろ！', W / 2, H * 0.87, { size: 46, color: C.danger, bold: true });
    } else {
      game.draw.text('タップで張力DOWN', W / 2, H * 0.87, { size: 38, color: C.text + '44' });
    }

    // Game progress
    var gRatio = Math.min(1, gameTimer / WIN_TIME);
    game.draw.rect(W * 0.08, H * 0.73, W * 0.84, 14, '#0a1520', 0.8);
    game.draw.rect(W * 0.08, H * 0.73, W * 0.84 * gRatio, 14, C.safe, 0.6);
    game.draw.text(Math.ceil(WIN_TIME - gameTimer) + '秒耐えろ', W / 2, H * 0.715, { size: 30, color: C.safe + 'aa' });

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var ci = 0; ci < MAX_CUTS; ci++) {
      game.draw.circle(W / 2 - (MAX_CUTS - 1) * 80 + ci * 160, H * 0.955, 28, ci < cuts ? C.wrong : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 95);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
