// 040-meteor-shield.js
// メテオシールド — 迫りくる隕石を盾で弾いて惑星を守る防衛戦
// 操作: スワイプで盾を上下左右に向ける
// 成功: 20秒守り切る  失敗: 3回直撃

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020510',
    space:   '#030815',
    planet:  '#1d4ed8',
    planetHi:'#60a5fa',
    shield:  '#22d3ee',
    shieldHi:'#a5f3fc',
    meteor:  '#f97316',
    meteorHi:'#fed7aa',
    hit:     '#ef4444',
    good:    '#22c55e',
    ui:      '#475569'
  };

  var cx = W / 2;
  var cy = H / 2;
  var PLANET_R = 120;
  var SHIELD_R = 200;   // radius from center to shield midpoint
  var SHIELD_LEN = 220; // length of shield arc
  var METEOR_R = 36;
  var METEOR_SPEED = 320;

  // Shield angle (0=right, π/2=bottom, π=left, -π/2=top)
  var shieldAngle = -Math.PI / 2; // starts pointing up
  var shieldDir = 0; // current direction for animation

  var meteors = [];
  var spawnTimer = 1.5;
  var lives = 3;
  var timeLeft = 20;
  var done = false;
  var hitFlash = 0;

  // Stars
  var stars = [];
  for (var i = 0; i < 80; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.5 + 0.5, t: Math.random() * Math.PI * 2 });
  }

  var DIRS = { up: -Math.PI/2, down: Math.PI/2, left: Math.PI, right: 0 };

  game.onSwipe(function(dir) {
    if (done) return;
    var targetAngle = DIRS[dir];
    if (targetAngle !== undefined) {
      shieldAngle = targetAngle;
      game.audio.play('se_tap', 0.4);
    }
  });

  function spawnMeteor() {
    // Random entry from screen edge
    var angle = Math.random() * Math.PI * 2;
    var dist = Math.max(W, H);
    var mx = cx + Math.cos(angle) * dist;
    var my = cy + Math.sin(angle) * dist;
    // Direction: toward center with some randomness
    var targetAngle = Math.atan2(cy - my, cx - mx) + (Math.random() - 0.5) * 0.4;
    meteors.push({
      x: mx, y: my,
      vx: Math.cos(targetAngle) * METEOR_SPEED,
      vy: Math.sin(targetAngle) * METEOR_SPEED,
      r: METEOR_R + Math.random() * 20,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 4
    });
  }

  function shieldBlocks(meteor) {
    // Is the meteor approaching from the shield's direction?
    var mAngle = Math.atan2(meteor.y - cy, meteor.x - cx);
    var diff = mAngle - shieldAngle;
    // Normalize to -π..π
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Shield covers ±45 degrees
    return Math.abs(diff) < Math.PI / 4;
  }

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + lives * 50); }, 300);
        return;
      }
    }

    // Spawn meteors
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnMeteor();
      spawnTimer = Math.max(0.5, 1.5 - (20 - timeLeft) * 0.04);
    }

    // Move meteors
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += m.rotSpd * dt;

      var dist = Math.sqrt((m.x - cx) * (m.x - cx) + (m.y - cy) * (m.y - cy));

      // Check shield collision
      if (dist < SHIELD_R + m.r && dist > SHIELD_R - m.r * 0.5) {
        if (shieldBlocks(m)) {
          // Deflected!
          // Bounce outward
          var outAngle = Math.atan2(m.y - cy, m.x - cx);
          m.vx = Math.cos(outAngle) * METEOR_SPEED;
          m.vy = Math.sin(outAngle) * METEOR_SPEED;
          game.audio.play('se_tap', 0.8);
          continue;
        }
      }

      // Check planet collision
      if (dist < PLANET_R + m.r) {
        meteors.splice(i, 1);
        lives--;
        hitFlash = 0.5;
        game.audio.play('se_failure', 0.8);
        if (lives <= 0 && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
        continue;
      }

      // Remove if too far out
      if (dist > Math.max(W, H) * 1.5) {
        meteors.splice(i, 1);
      }
    }

    if (hitFlash > 0) hitFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      var sa = 0.3 + 0.3 * Math.sin(game.time.elapsed * 1.2 + st.t);
      game.draw.circle(st.x, st.y, st.r, '#fff', sa);
    }

    // Meteors
    for (var mi = 0; mi < meteors.length; mi++) {
      var m2 = meteors[mi];
      // Trail
      for (var tr = 1; tr <= 4; tr++) {
        game.draw.circle(m2.x - m2.vx * dt * tr * 1.5, m2.y - m2.vy * dt * tr * 1.5,
          m2.r * (1 - tr * 0.2), C.meteor, 0.1);
      }
      // Body
      game.draw.circle(m2.x, m2.y, m2.r + 6, C.meteor, 0.2);
      game.draw.circle(m2.x, m2.y, m2.r, C.meteor);
      game.draw.circle(m2.x - m2.r * 0.3, m2.y - m2.r * 0.3, m2.r * 0.35, C.meteorHi, 0.6);
    }

    // Shield
    var shX = cx + Math.cos(shieldAngle) * SHIELD_R;
    var shY = cy + Math.sin(shieldAngle) * SHIELD_R;
    // Draw shield as a thick arc approximation
    var perpAngle = shieldAngle + Math.PI / 2;
    var halfLen = SHIELD_LEN / 2;
    for (var seg = -5; seg <= 5; seg++) {
      var t2 = seg / 5;
      var segX = shX + Math.cos(perpAngle) * halfLen * t2;
      var segY = shY + Math.sin(perpAngle) * halfLen * t2;
      game.draw.circle(segX, segY, 18, C.shield);
    }
    // Shield glow
    game.draw.line(
      shX + Math.cos(perpAngle) * halfLen, shY + Math.sin(perpAngle) * halfLen,
      shX - Math.cos(perpAngle) * halfLen, shY - Math.sin(perpAngle) * halfLen,
      C.shieldHi, 6
    );
    // Shield pulse
    var spulse = 0.2 + 0.1 * Math.sin(game.time.elapsed * 8);
    game.draw.circle(shX, shY, SHIELD_LEN * 0.55, C.shield, spulse);

    // Planet
    if (hitFlash > 0) {
      game.draw.rect(0, 0, W, H, C.hit, hitFlash / 0.5 * 0.2);
    }
    game.draw.circle(cx, cy, PLANET_R + 16, C.planetHi, 0.2);
    game.draw.circle(cx, cy, PLANET_R, C.planet);
    game.draw.circle(cx - 30, cy - 30, PLANET_R * 0.35, C.planetHi, 0.4);
    game.draw.circle(cx + 20, cy + 20, PLANET_R * 0.2, C.planetHi, 0.25);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#020510');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.shield : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Lives (hearts)
    for (var lv = 0; lv < 3; lv++) {
      var lvx = W / 2 + (lv - 1) * 70;
      game.draw.circle(lvx, 128, 26, lv < lives ? C.good : '#1a1a2e');
      if (lv < lives) game.draw.circle(lvx, 128, 14, '#86efac', 0.6);
    }

    // Direction hint
    var dirHint = ['↑', '→', '↓', '←'];
    var dirAngles = [-Math.PI/2, 0, Math.PI/2, Math.PI];
    for (var d = 0; d < 4; d++) {
      var isActive = Math.abs(shieldAngle - dirAngles[d]) < 0.1 ||
                     (d === 3 && (shieldAngle > Math.PI - 0.2 || shieldAngle < -Math.PI + 0.2));
      var hintX = W / 2 + Math.cos(dirAngles[d]) * 340;
      var hintY = H * 0.5 + Math.sin(dirAngles[d]) * 340;
      game.draw.text(dirHint[d], hintX, hintY, { size: 52, color: isActive ? C.shield : '#1e3a5f', bold: true });
    }

    // Guide
    game.draw.text('スワイプで盾を向けろ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnMeteor();
  });
})(game);
