// 389-meteor-shower.js
// 流星雨 — 流れ星がくる方向にスワイプして願い事を叶える
// 操作: 流れ星の軌跡と同じ方向にスワイプ
// 成功: 10個正解  失敗: 5回間違える or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#02040e',
    star:   '#f1f5f9',
    meteor: '#fbbf24',
    meteorHi:'#fef3c7',
    tail:   '#a78bfa',
    wish:   '#22c55e',
    wishHi: '#86efac',
    wrong:  '#ef4444',
    hint:   '#475569',
    text:   '#f1f5f9',
    ui:     '#334155'
  };

  var stars = [];
  for (var si = 0; si < 100; si++) {
    stars.push({ x: Math.random()*W, y: Math.random()*H, r: 0.5+Math.random()*2, twinkle: Math.random()*Math.PI*2 });
  }

  var meteor = null;
  var showMeteor = false;
  var waitingForInput = false;
  var meteorDir = '';
  var correct = 0;
  var NEEDED = 10;
  var wrong = 0;
  var MAX_WRONG = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.wish;
  var nextMeteorTimer = 0;

  // Directions and corresponding meteor paths
  var DIRS = ['up','down','left','right'];
  var DIR_VECTORS = {
    'up':    { dx: 0,   dy: -1 },
    'down':  { dx: 0,   dy:  1 },
    'left':  { dx: -1,  dy:  0 },
    'right': { dx: 1,   dy:  0 }
  };

  function spawnMeteor() {
    var dir = DIRS[Math.floor(Math.random() * DIRS.length)];
    meteorDir = dir;
    var v = DIR_VECTORS[dir];
    // Start from edge opposite to direction
    var sx, sy;
    if (dir === 'right') { sx = 0; sy = H * 0.3 + Math.random() * H * 0.4; }
    else if (dir === 'left') { sx = W; sy = H * 0.3 + Math.random() * H * 0.4; }
    else if (dir === 'down') { sx = W*0.2+Math.random()*W*0.6; sy = 0; }
    else { sx = W*0.2+Math.random()*W*0.6; sy = H; }

    var speed = 900;
    meteor = {
      x: sx, y: sy,
      vx: v.dx * speed, vy: v.dy * speed,
      trail: [],
      visible: true
    };
    showMeteor = true;
    waitingForInput = false;
  }

  game.onSwipe(function(dir) {
    if (done || !waitingForInput) return;
    waitingForInput = false;
    if (dir === meteorDir) {
      correct++;
      resultText = '願い叶え！';
      resultCol = C.wish;
      resultAnim = 0.7;
      game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: H*0.45, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life:0.7, col: C.wishHi });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 400 + Math.ceil(timeLeft) * 80); }, 800);
      }
    } else {
      wrong++;
      resultText = '方向が違う！';
      resultCol = C.wrong;
      resultAnim = 0.6;
      game.audio.play('se_failure', 0.4);
      if (wrong >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    nextMeteorTimer = 1.2;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;

    // Meteor lifecycle
    if (!showMeteor && !waitingForInput) {
      nextMeteorTimer -= dt;
      if (nextMeteorTimer <= 0 && !done) {
        spawnMeteor();
        nextMeteorTimer = 0;
      }
    }

    if (showMeteor && meteor) {
      meteor.trail.push({ x: meteor.x, y: meteor.y, life: 0.5 });
      if (meteor.trail.length > 25) meteor.trail.shift();
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;

      // Off screen
      if (meteor.x < -80 || meteor.x > W+80 || meteor.y < -80 || meteor.y > H+80) {
        showMeteor = false;
        waitingForInput = true;
        // Show direction hint overlay briefly
      }
    }

    for (var ti = meteor && meteor.trail ? meteor.trail.length - 1 : -1; ti >= 0; ti--) {
      meteor.trail[ti].life -= dt * 2.5;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      var alpha = 0.4 + Math.sin(elapsed * 2 + s.twinkle) * 0.3;
      game.draw.circle(s.x, s.y, s.r, C.star, alpha);
    }

    // Meteor
    if (showMeteor && meteor) {
      // Trail
      for (var ti2 = 0; ti2 < meteor.trail.length; ti2++) {
        var t = meteor.trail[ti2];
        if (t.life > 0) game.draw.circle(t.x, t.y, 8 * t.life, C.tail, t.life * 0.6);
      }
      // Head
      game.draw.circle(meteor.x, meteor.y, 18, C.meteor, 0.9);
      game.draw.circle(meteor.x, meteor.y, 10, C.meteorHi, 0.9);
    }

    // Waiting for input indicator
    if (waitingForInput) {
      game.draw.text('どの方向？', W / 2, H * 0.45, { size: 64, color: C.meteorHi, bold: true });
      // Direction arrows
      game.draw.text('↑', W/2, H*0.32, { size: 60, color: C.hint });
      game.draw.text('↓', W/2, H*0.56, { size: 60, color: C.hint });
      game.draw.text('←', W/2 - 180, H*0.44, { size: 60, color: C.hint });
      game.draw.text('→', W/2 + 180, H*0.44, { size: 60, color: C.hint });
    }

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.66, { size: 56, color: resultCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2 - (MAX_WRONG-1)*32 + wi*64, H*0.935, 14, wi < wrong ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tail : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    nextMeteorTimer = 1.0;
  });
})(game);
