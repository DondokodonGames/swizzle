// 422-thread-needle.js
// 糸通し — 揺れる針の穴に素早く糸を通す集中力ゲーム
// 操作: タップで糸を針穴に向けて打ち込む
// 成功: 10回通す  失敗: 3回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0d0a1a',
    needle: '#94a3b8',
    needleHi:'#e2e8f0',
    needleEye:'#0d0a1a',
    thread: '#f472b6',
    threadHi:'#fce7f3',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    glow:   '#a855f7'
  };

  var NEEDLE_X = W / 2;
  var NEEDLE_Y = H * 0.38;
  var NEEDLE_LEN = 280;
  var NEEDLE_W = 18;
  var EYE_H = 36;   // hole height
  var EYE_W = 22;   // hole width

  var needleAngle = 0;  // current angle
  var swaySpeed = 0.8;
  var swayAmp = 0.4;

  var thread = null;  // { x, y, vx, vy, angle }
  var successes = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var successAnim = 0;

  function getEyePos() {
    // Eye is near the top of the needle
    var eyeOffY = -NEEDLE_LEN * 0.85;
    var ex = NEEDLE_X + Math.cos(needleAngle - Math.PI/2) * eyeOffY;
    var ey = NEEDLE_Y + Math.sin(needleAngle - Math.PI/2) * eyeOffY;
    return { x: ex, y: ey };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (thread) return;  // already in flight

    // Launch thread from bottom toward needle
    var eye = getEyePos();
    var dx = eye.x - tx;
    var dy = eye.y - ty;
    var dist = Math.sqrt(dx*dx + dy*dy);
    var speed = 1200;
    thread = {
      x: tx,
      y: ty,
      vx: dx / dist * speed,
      vy: dy / dist * speed,
      startX: tx,
      startY: ty,
      angle: Math.atan2(dy, dx)
    };
    game.audio.play('se_tap', 0.3);
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

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (successAnim > 0) successAnim -= dt * 3;

    // Needle sway
    needleAngle = Math.sin(elapsed * swaySpeed) * swayAmp;
    // Increase difficulty
    swaySpeed = 0.8 + successes * 0.06;
    swayAmp = 0.4 + successes * 0.03;

    var eye = getEyePos();

    // Thread in flight
    if (thread) {
      thread.x += thread.vx * dt;
      thread.y += thread.vy * dt;

      // Check if thread passed needle eye region
      var dx = thread.x - eye.x;
      var dy = thread.y - eye.y;

      // Rotate to needle space
      var na = needleAngle;
      var localX = dx * Math.cos(-na) - dy * Math.sin(-na);
      var localY = dx * Math.sin(-na) + dy * Math.cos(-na);

      if (Math.abs(localX) < EYE_W / 2 && Math.abs(localY) < EYE_H / 2) {
        // Hit!
        successes++;
        flashCol = C.correct;
        flashAnim = 0.8;
        successAnim = 1.0;
        game.audio.play('se_success', 0.6);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: eye.x, y: eye.y, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.6, col: C.thread });
        }
        thread = null;
        if (successes >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(successes * 500 + Math.ceil(timeLeft) * 80); }, 600);
        }
      } else if (thread.y < -100 || thread.x < -200 || thread.x > W + 200 || thread.y > H + 100) {
        // Missed
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.6;
        game.audio.play('se_failure', 0.4);
        thread = null;
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }

      // Also check if thread passed far past needle without hitting
      var passedY = thread.y < eye.y - 100;
      if (passedY && thread) {
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.6;
        game.audio.play('se_failure', 0.4);
        thread = null;
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Needle body
    var tipX = NEEDLE_X + Math.cos(needleAngle - Math.PI/2) * NEEDLE_LEN;
    var tipY = NEEDLE_Y + Math.sin(needleAngle - Math.PI/2) * NEEDLE_LEN;
    game.draw.line(NEEDLE_X, NEEDLE_Y, tipX, tipY, C.needle, NEEDLE_W);
    game.draw.line(NEEDLE_X, NEEDLE_Y, tipX, tipY, C.needleHi, 6);

    // Needle eye
    var eyePos = getEyePos();
    game.draw.circle(eyePos.x, eyePos.y, EYE_W + 6, C.needleHi, 0.9);
    game.draw.circle(eyePos.x, eyePos.y, EYE_W, C.needleEye, 1.0);

    // Eye glow when thread is close
    if (thread) {
      var edx = thread.x - eyePos.x;
      var edy = thread.y - eyePos.y;
      var edist = Math.sqrt(edx*edx + edy*edy);
      if (edist < 200) {
        game.draw.circle(eyePos.x, eyePos.y, EYE_W + 20, C.glow, (1 - edist/200) * 0.4);
      }
    }

    // Success thread trail
    if (successAnim > 0) {
      for (var ti = 0; ti < 6; ti++) {
        var ta = needleAngle + (ti - 3) * 0.15;
        var tx2 = eyePos.x + Math.cos(ta) * ti * 30;
        var ty2 = eyePos.y + Math.sin(ta) * ti * 30;
        game.draw.circle(tx2, ty2, 6, C.thread, successAnim * 0.8);
      }
    }

    // Thread in flight
    if (thread) {
      var trailLen = 80;
      game.draw.line(thread.x, thread.y, thread.x - thread.vx*0.05, thread.y - thread.vy*0.05, C.threadHi, 3);
      game.draw.circle(thread.x, thread.y, 8, C.thread, 0.9);
      game.draw.circle(thread.x, thread.y, 12, C.threadHi, 0.3);
    }

    // Aim indicator from center bottom
    if (!thread) {
      game.draw.circle(W/2, H*0.82, 20, C.thread, 0.6);
      game.draw.line(W/2, H*0.82, eyePos.x, eyePos.y, C.thread, 2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.935, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.thread : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
