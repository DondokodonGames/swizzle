// 689-freeze-hunt.js
// フリーズハント — 跳ね回るオブジェクトを全部タップして動きを止めろ
// 操作: タップでオブジェクトを凍結
// 成功: 15ラウンド完了  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020a12',
    orb:     '#38bdf8',
    orbHi:   '#e0f2fe',
    frozen:  '#7dd3fc',
    frozenBg:'#082f49',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030d18'
  };

  var ORBS_PER_ROUND = 5;
  var ORB_R = 50;
  var THAW_TIME = 4.0;
  var PLAY_Y0 = 200;
  var PLAY_Y1 = H * 0.85;

  var orbs = [];
  var round = 0;
  var NEEDED = 15;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var resultTimer = 0, resultText = '';
  var roundComplete = false;
  var waitTimer = 0;

  function newRound() {
    round++;
    var count = ORBS_PER_ROUND;
    var speed = 280 + round * 20;
    orbs = [];
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      orbs.push({
        x: ORB_R + 20 + Math.random() * (W - ORB_R * 2 - 40),
        y: PLAY_Y0 + ORB_R + Math.random() * (PLAY_Y1 - PLAY_Y0 - ORB_R * 2),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        frozen: false,
        frozenTimer: 0,
        phase: Math.random() * Math.PI * 2
      });
    }
    roundComplete = false;
    waitTimer = 0;
  }

  function allFrozen() {
    for (var i = 0; i < orbs.length; i++) {
      if (!orbs[i].frozen) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done || roundComplete) return;
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (o.frozen) continue;
      var dx = tx - o.x, dy = ty - o.y;
      if (dx * dx + dy * dy < (ORB_R + 20) * (ORB_R + 20)) {
        o.frozen = true;
        o.frozenTimer = THAW_TIME;
        game.audio.play('se_tap', 0.15);
        for (var p = 0; p < 4; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: o.x, y: o.y, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.4, col: C.orbHi });
        }
        if (allFrozen()) {
          roundComplete = true;
          flashAnim = 0.35;
          resultText = 'ラウンド' + round + ' クリア！';
          resultTimer = 0.7;
          game.audio.play('se_success', 0.7);
          if (round >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(round * 500 + Math.ceil(timeLeft) * 50); }, 700);
          } else {
            waitTimer = 0.8;
          }
        }
        break;
      }
    }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newRound();
    }

    // Update orbs
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (o.frozen) {
        o.frozenTimer -= dt;
        if (o.frozenTimer <= 0) {
          o.frozen = false;
          o.frozenTimer = 0;
          // Re-launch in random direction
          var speed2 = 280 + round * 20;
          var a2 = Math.random() * Math.PI * 2;
          o.vx = Math.cos(a2) * speed2;
          o.vy = Math.sin(a2) * speed2;
        }
        continue;
      }
      o.phase += dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;

      if (o.x < ORB_R) { o.x = ORB_R; o.vx = Math.abs(o.vx); }
      if (o.x > W - ORB_R) { o.x = W - ORB_R; o.vx = -Math.abs(o.vx); }
      if (o.y < PLAY_Y0 + ORB_R) { o.y = PLAY_Y0 + ORB_R; o.vy = Math.abs(o.vy); }
      if (o.y > PLAY_Y1 - ORB_R) { o.y = PLAY_Y1 - ORB_R; o.vy = -Math.abs(o.vy); }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Play area border
    game.draw.rect(0, PLAY_Y0, W, 4, '#1e3a5f', 0.8);

    // Orbs
    for (var i2 = 0; i2 < orbs.length; i2++) {
      var orb = orbs[i2];
      if (orb.frozen) {
        // Frozen: ice look
        var freezeRatio = orb.frozenTimer / THAW_TIME;
        game.draw.circle(orb.x + 4, orb.y + 4, ORB_R, '#000', 0.3);
        game.draw.circle(orb.x, orb.y, ORB_R, C.frozenBg, 0.9);
        game.draw.circle(orb.x, orb.y, ORB_R * 0.7, C.frozen, 0.4);
        // Thaw timer arc (approximated)
        for (var seg = 0; seg < 12; seg++) {
          if (seg / 12 > freezeRatio) continue;
          var a3 = -Math.PI / 2 + seg * Math.PI * 2 / 12;
          var ax = orb.x + Math.cos(a3) * ORB_R * 0.85;
          var ay = orb.y + Math.sin(a3) * ORB_R * 0.85;
          game.draw.circle(ax, ay, 8, C.frozen, 0.7);
        }
        game.draw.text('❄', orb.x, orb.y + 16, { size: 52, color: C.frozen });
      } else {
        var pulse = 0.8 + 0.2 * Math.sin(orb.phase * 4);
        game.draw.circle(orb.x + 4, orb.y + 4, ORB_R, '#000', 0.3);
        game.draw.circle(orb.x, orb.y, ORB_R, C.orb, 0.85);
        game.draw.circle(orb.x, orb.y, ORB_R * 0.65, C.orb, 0.15);
        game.draw.circle(orb.x - ORB_R * 0.3, orb.y - ORB_R * 0.35, ORB_R * 0.22, C.orbHi, 0.5);
      }
    }

    // Frozen count
    var frozenCount = 0;
    for (var fc = 0; fc < orbs.length; fc++) { if (orbs[fc].frozen) frozenCount++; }
    game.draw.text(frozenCount + ' / ' + orbs.length + ' 凍結', W / 2, PLAY_Y1 + 60, { size: 40, color: '#38bdf866' });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 52, color: C.correct, bold: true });
    }

    game.draw.text(round + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
