// 447-chain-reaction.js
// 連鎖爆発 — 1回のタップで最大連鎖を起こす
// 操作: タップで1つのボールを爆発させ、連鎖を起こす
// 成功: 15個以上一度に爆発  失敗: 3回外れ or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0500',
    ball0:  '#f43f5e',
    ball1:  '#f97316',
    ball2:  '#eab308',
    ball3:  '#22c55e',
    ball4:  '#06b6d4',
    ball5:  '#8b5cf6',
    explosion:'#fef08a',
    shock:  '#fff',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var COLORS = [C.ball0, C.ball1, C.ball2, C.ball3, C.ball4, C.ball5];
  var BALL_R = 28;
  var EXPLODE_R = 90;
  var TARGET_CHAIN = 15;

  var balls = [];
  var explosions = [];
  var particles = [];
  var phase = 'aim';  // aim, exploding, result
  var chainCount = 0;
  var resultTimer = 0;
  var tries = 0;
  var MAX_MISS = 3;
  var succeeded = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 45;
  var flashAnim = 0;
  var flashCol = C.correct;

  function spawnBalls() {
    balls = [];
    var count = 25 + Math.floor(Math.random() * 10);
    for (var i = 0; i < count; i++) {
      var x = BALL_R * 2 + Math.random() * (W - BALL_R * 4);
      var y = 150 + Math.random() * (H * 0.75);
      balls.push({ x: x, y: y, col: COLORS[Math.floor(Math.random() * COLORS.length)], exploded: false, r: BALL_R });
    }
    explosions = [];
    chainCount = 0;
    phase = 'aim';
  }

  function triggerExplosion(x, y, col) {
    explosions.push({ x: x, y: y, col: col, r: 0, maxR: EXPLODE_R, life: 0.5 });
    for (var pi = 0; pi < 6; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: x, y: y, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life: 0.5, col: col });
    }
    chainCount++;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'aim') return;
    // Find tapped ball
    var hit = -1;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.exploded) continue;
      var dx = tx - b.x;
      var dy = ty - b.y;
      if (Math.sqrt(dx*dx + dy*dy) < b.r + 15) { hit = i; break; }
    }
    if (hit < 0) return;

    balls[hit].exploded = true;
    triggerExplosion(balls[hit].x, balls[hit].y, balls[hit].col);
    phase = 'exploding';
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Expand explosions and chain
    var anyActive = false;
    for (var ei = 0; ei < explosions.length; ei++) {
      var e = explosions[ei];
      if (e.life <= 0) continue;
      e.r += 400 * dt;
      e.life -= dt * 2;
      if (e.r > e.maxR) e.r = e.maxR;
      anyActive = true;

      // Check chain
      for (var bi = 0; bi < balls.length; bi++) {
        var b2 = balls[bi];
        if (b2.exploded) continue;
        var dx2 = b2.x - e.x;
        var dy2 = b2.y - e.y;
        if (Math.sqrt(dx2*dx2 + dy2*dy2) < e.r + b2.r) {
          b2.exploded = true;
          triggerExplosion(b2.x, b2.y, b2.col);
          game.audio.play('se_tap', 0.2);
        }
      }
    }

    // Clean expired explosions
    for (var ei2 = explosions.length - 1; ei2 >= 0; ei2--) {
      if (explosions[ei2].life <= 0) explosions.splice(ei2, 1);
    }

    if (phase === 'exploding' && !anyActive) {
      // Chain finished
      phase = 'result';
      resultTimer = 0;
      var success = chainCount >= TARGET_CHAIN;
      if (success) {
        succeeded++;
        flashCol = C.correct;
        flashAnim = 1.0;
        game.audio.play('se_success', 0.8);
        if (succeeded >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(chainCount * 100 + Math.ceil(timeLeft) * 80); }, 700);
        }
      } else {
        tries++;
        flashCol = C.wrong;
        flashAnim = 0.7;
        game.audio.play('se_failure', 0.4);
        if (tries >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (phase === 'result') {
      resultTimer += dt;
      if (resultTimer > 1.5 && !done) {
        spawnBalls();
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b3 = balls[bi2];
      if (!b3.exploded) {
        game.draw.circle(b3.x, b3.y, b3.r, b3.col, 0.9);
        game.draw.circle(b3.x - 8, b3.y - 8, b3.r * 0.35, '#fff', 0.3);
        // Show explosion radius hint
        game.draw.circle(b3.x, b3.y, EXPLODE_R, b3.col, 0.04);
      }
    }

    // Explosions
    for (var ei3 = 0; ei3 < explosions.length; ei3++) {
      var e2 = explosions[ei3];
      game.draw.circle(e2.x, e2.y, e2.r * 1.2, C.shock, e2.life * 0.15);
      game.draw.circle(e2.x, e2.y, e2.r, C.explosion, e2.life * 0.5);
      game.draw.circle(e2.x, e2.y, e2.r * 0.5, '#fff', e2.life * 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Chain count
    if (phase === 'exploding' || phase === 'result') {
      var cCol = chainCount >= TARGET_CHAIN ? C.correct : C.text;
      game.draw.text('連鎖: ' + chainCount, W/2, H * 0.85, { size: 56, color: cCol, bold: true });
    }

    if (phase === 'aim') {
      game.draw.text('目標: ' + TARGET_CHAIN + '個連鎖！', W/2, H * 0.87, { size: 44, color: C.explosion });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < tries ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(succeeded + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ball2 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnBalls();
  });
})(game);
