// 331-crystal-grow.js
// クリスタルグロウ — 結晶を育てて目標サイズに到達させる
// 操作: タップして栄養を注入（過剰注入で崩壊）
// 成功: 5個の結晶を完璧に育てる  失敗: 3個崩壊 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c1a',
    crystal:'#a78bfa',
    crystalHi:'#c4b5fd',
    crystalGlow:'#7c3aed',
    target: '#22c55e',
    targetHi:'#86efac',
    over:   '#ef4444',
    overHi: '#fca5a5',
    glow:   '#818cf8',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var TARGET_MIN = 0.72;
  var TARGET_MAX = 0.90;
  var OVERFILL = 1.0;

  var crystal = null;
  var grown = 0;
  var NEEDED = 5;
  var collapsed = 0;
  var MAX_COLLAPSE = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var resultAnim = 0;
  var resultGood = true;
  var sparkles = [];
  var spawnSpark = 0;

  function newCrystal() {
    crystal = {
      size: 0.05,
      growing: false,
      phase: 'grow', // grow, done
      flashGood: 0,
      flashBad: 0
    };
    sparkles = [];
  }

  game.onTap(function() {
    if (done || !crystal || crystal.phase !== 'grow') return;
    crystal.growing = true;
    setTimeout(function() { if (crystal) crystal.growing = false; }, 200);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;
    if (spawnSpark > 0) spawnSpark -= dt;

    if (crystal && crystal.phase === 'grow') {
      if (crystal.growing) {
        crystal.size += dt * 0.55;
      } else {
        // Slow drift
        crystal.size += dt * 0.02;
      }

      // Sparkles when growing fast
      if (crystal.growing && Math.random() < dt * 12) {
        var ang = Math.random() * Math.PI * 2;
        var r = crystal.size * 220;
        sparkles.push({
          x: W / 2 + Math.cos(ang) * r * 0.7,
          y: H * 0.5 + Math.sin(ang) * r * 0.4,
          life: 0.4,
          r: 6 + Math.random() * 8
        });
      }

      // Check overfill
      if (crystal.size >= OVERFILL) {
        crystal.phase = 'done';
        collapsed++;
        resultAnim = 1.0;
        resultGood = false;
        game.audio.play('se_failure', 0.6);
        for (var pi = 0; pi < 14; pi++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang2) * 300, vy: Math.sin(ang2) * 300, life: 0.8, col: C.overHi });
        }
        if (collapsed >= MAX_COLLAPSE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
        setTimeout(function() { if (!done) newCrystal(); }, 800);
        return;
      }

      // Check success zone
      if (crystal.size >= TARGET_MIN && crystal.size <= TARGET_MAX && !crystal.growing && crystal.size > TARGET_MIN + 0.05) {
        // Player stopped in zone
        crystal.phase = 'done';
        grown++;
        resultAnim = 1.0;
        resultGood = true;
        game.audio.play('se_success', 0.7);
        for (var pi2 = 0; pi2 < 12; pi2++) {
          var ang3 = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang3) * 250, vy: Math.sin(ang3) * 250, life: 0.7, col: C.crystalHi });
        }
        if (grown >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(grown * 600 + Math.ceil(timeLeft) * 100); }, 600);
          return;
        }
        setTimeout(function() { if (!done) newCrystal(); }, 800);
      }
    }

    // Sparkles
    for (var si = sparkles.length - 1; si >= 0; si--) {
      sparkles[si].life -= dt * 2;
      if (sparkles[si].life <= 0) sparkles.splice(si, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (crystal) {
      var sz = crystal.size;
      var maxR = 280;
      var r = sz * maxR;
      var isInZone = sz >= TARGET_MIN && sz <= TARGET_MAX;
      var isOver = sz >= TARGET_MAX;

      var col = isOver ? C.over : (isInZone ? C.target : C.crystal);
      var glow = isOver ? C.overHi : (isInZone ? C.targetHi : C.crystalGlow);

      // Glow
      game.draw.circle(W / 2, H * 0.5, r * 1.4, glow, 0.08 + (isInZone ? 0.1 : 0));
      game.draw.circle(W / 2, H * 0.5, r * 1.15, col, 0.1 + (isInZone ? 0.12 : 0));

      // Crystal body (hexagonal approximation with circles)
      game.draw.circle(W / 2, H * 0.5, r, col, 0.75);
      for (var ci = 0; ci < 6; ci++) {
        var ca = ci * Math.PI / 3 + elapsed * 0.3;
        game.draw.circle(W / 2 + Math.cos(ca) * r * 0.7, H * 0.5 + Math.sin(ca) * r * 0.55, r * 0.45, col, 0.6);
      }
      game.draw.circle(W / 2, H * 0.5, r * 0.35, '#fff', 0.3);

      // Target zone ring
      game.draw.circle(W / 2, H * 0.5, TARGET_MIN * maxR, C.target, 0.5);
      game.draw.circle(W / 2, H * 0.5, TARGET_MAX * maxR, C.target, 0.4);

      // Sparkles
      for (var si2 = 0; si2 < sparkles.length; si2++) {
        var sp = sparkles[si2];
        game.draw.circle(sp.x, sp.y, sp.r * sp.life, C.crystalHi, sp.life * 0.8);
      }

      // Instructions
      if (!isInZone && sz < TARGET_MIN) {
        game.draw.text('タップで育てる！', W / 2, H * 0.82, { size: 44, color: C.ui });
      } else if (isInZone) {
        game.draw.text('今が最高！', W / 2, H * 0.82, { size: 48, color: C.targetHi, bold: true });
      } else if (isOver) {
        game.draw.text('崩壊！', W / 2, H * 0.82, { size: 56, color: C.overHi, bold: true });
      }
    }

    // Result flash
    if (resultAnim > 0) {
      var rcol = resultGood ? C.targetHi : C.overHi;
      var rtxt = resultGood ? '完璧！' : '崩壊…';
      game.draw.text(rtxt, W / 2, H * 0.87, { size: 72, color: rcol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Collapse dots
    for (var ci2 = 0; ci2 < MAX_COLLAPSE; ci2++) {
      game.draw.circle(W / 2 - (MAX_COLLAPSE - 1) * 28 + ci2 * 56, H * 0.92, 16, ci2 < collapsed ? C.over : '#020c1a');
    }

    game.draw.text(grown + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.crystalGlow : C.over);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    newCrystal();
  });
})(game);
