// 199-swarm-tap.js
// スウォームタップ — 群れをなして逃げ回る小さな点を指で追いかけて消す快感
// 操作: タップで周囲の点を消す
// 成功: 80匹消す  失敗: 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030508',
    bug:    '#f59e0b',
    bugHi:  '#fde68a',
    splash: '#22c55e',
    ui:     '#334155'
  };

  var TAP_R = 100;
  var BUG_R = 14;
  var BUG_SPEED = 200;
  var NUM_BUGS = 120;
  var bugs = [];
  var score = 0;
  var needed = 80;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var splashes = [];

  function initBugs() {
    bugs = [];
    for (var i = 0; i < NUM_BUGS; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = BUG_SPEED * (0.5 + Math.random() * 0.8);
      bugs.push({
        x: 80 + Math.random() * (W - 160),
        y: 200 + Math.random() * (H - 400),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: BUG_R * (0.7 + Math.random() * 0.6),
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var killed = 0;
    for (var bi = bugs.length - 1; bi >= 0; bi--) {
      var b = bugs[bi];
      var dx = tx - b.x, dy = ty - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < TAP_R) {
        bugs.splice(bi, 1);
        killed++;
        score++;
      } else {
        // Scatter nearby bugs
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < TAP_R * 2) {
          var flee = 1 - dist / (TAP_R * 2);
          b.vx -= (dx / dist) * BUG_SPEED * 2 * flee;
          b.vy -= (dy / dist) * BUG_SPEED * 2 * flee;
        }
      }
    }
    if (killed > 0) {
      game.audio.play('se_tap', Math.min(1, 0.3 + killed * 0.1));
      splashes.push({ x: tx, y: ty, life: 0.5, killed: killed });
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 15 + Math.ceil(timeLeft) * 40); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    for (var bi2 = 0; bi2 < bugs.length; bi2++) {
      var b2 = bugs[bi2];
      b2.wobble += dt * (3 + Math.random());
      // Random direction change
      if (Math.random() < dt * 0.5) {
        var newAng = Math.random() * Math.PI * 2;
        b2.vx += Math.cos(newAng) * BUG_SPEED * 0.3;
        b2.vy += Math.sin(newAng) * BUG_SPEED * 0.3;
      }
      // Speed limit
      var spd = Math.sqrt(b2.vx * b2.vx + b2.vy * b2.vy);
      if (spd > BUG_SPEED * 2) {
        b2.vx = b2.vx / spd * BUG_SPEED * 2;
        b2.vy = b2.vy / spd * BUG_SPEED * 2;
      }
      b2.x += b2.vx * dt;
      b2.y += b2.vy * dt;
      // Bounce
      if (b2.x < 20) { b2.x = 20; b2.vx = Math.abs(b2.vx); }
      if (b2.x > W - 20) { b2.x = W - 20; b2.vx = -Math.abs(b2.vx); }
      if (b2.y < 100) { b2.y = 100; b2.vy = Math.abs(b2.vy); }
      if (b2.y > H - 100) { b2.y = H - 100; b2.vy = -Math.abs(b2.vy); }
      // Friction
      b2.vx *= Math.pow(0.96, dt * 60);
      b2.vy *= Math.pow(0.96, dt * 60);
    }

    for (var si = splashes.length - 1; si >= 0; si--) {
      splashes[si].life -= dt;
      if (splashes[si].life <= 0) splashes.splice(si, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Tap hint circle (faint)
    game.draw.circle(W / 2, H / 2, TAP_R, '#ffffff', 0.03);

    // Bugs
    for (var bi3 = 0; bi3 < bugs.length; bi3++) {
      var b3 = bugs[bi3];
      var wobX = Math.cos(b3.wobble) * 4;
      var wobY = Math.sin(b3.wobble * 1.3) * 3;
      game.draw.circle(b3.x + wobX, b3.y + wobY, b3.size, C.bug, 0.85);
      game.draw.circle(b3.x + wobX - b3.size * 0.3, b3.y + wobY - b3.size * 0.3, b3.size * 0.25, C.bugHi, 0.4);
      // Legs
      game.draw.line(b3.x + wobX - b3.size, b3.y + wobY - 4, b3.x + wobX - b3.size * 2.2, b3.y + wobY - 8, C.bug, 3);
      game.draw.line(b3.x + wobX + b3.size, b3.y + wobY - 4, b3.x + wobX + b3.size * 2.2, b3.y + wobY - 8, C.bug, 3);
    }

    // Splashes
    for (var si2 = 0; si2 < splashes.length; si2++) {
      var s = splashes[si2];
      game.draw.circle(s.x, s.y, TAP_R * (1 - s.life * 0.5), C.splash, s.life * 0.3);
      if (s.killed > 1) {
        game.draw.text('+' + s.killed, s.x, s.y - 30, { size: 48, color: C.bugHi, bold: true });
      }
    }

    var remaining = bugs.length;
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    game.draw.text('残り ' + remaining + '匹', W / 2, H * 0.93, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    initBugs();
  });
})(game);
