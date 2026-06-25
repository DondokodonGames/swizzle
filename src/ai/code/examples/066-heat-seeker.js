// 066-heat-seeker.js
// ヒートシーカー — 熱源に向かって自動追尾するミサイルをスワイプで撃ち落とす
// 操作: スワイプ方向にシールドを展開（上下左右から選ぶ）
// 成功: 10機撃墜  失敗: 3機が基地に到達 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080c',
    base:    '#1d4ed8',
    baseHi:  '#60a5fa',
    missile: '#ef4444',
    missileHi:'#fca5a5',
    shield:  '#22c55e',
    shieldHi:'#86efac',
    exhaust: '#f97316',
    ui:      '#475569'
  };

  var BASE_X = W / 2;
  var BASE_Y = H * 0.8;
  var BASE_R = 80;
  var MISSILE_R = 28;
  var SHIELD_R = 160;

  var missiles = [];
  var shield = null; // {dir, timer}
  var SHIELD_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var SHIELD_DURATION = 0.45;

  var kills = 0;
  var needed = 10;
  var hits = 0;
  var maxHits = 3;
  var timeLeft = 20;
  var done = false;
  var killFlash = 0;

  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.2;

  function spawnMissile() {
    var side = Math.floor(Math.random() * 4);
    var x, y, vx, vy;
    var speed = 280 + kills * 15;
    if (side === 0) { x = Math.random() * W; y = -40; }
    else if (side === 1) { x = Math.random() * W; y = H + 40; }
    else if (side === 2) { x = -40; y = H * 0.1 + Math.random() * H * 0.8; }
    else { x = W + 40; y = H * 0.1 + Math.random() * H * 0.8; }
    var dx = BASE_X - x, dy = BASE_Y - y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    vx = (dx / dist) * speed;
    vy = (dy / dist) * speed;
    missiles.push({ x: x, y: y, vx: vx, vy: vy, trail: [] });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    shield = { dir: dir, timer: SHIELD_DURATION };
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnMissile();
      spawnTimer = Math.max(0.5, SPAWN_INTERVAL - kills * 0.04);
    }

    if (shield && shield.timer > 0) {
      shield.timer -= dt;
      if (shield.timer <= 0) shield = null;
    }

    // Shield direction vector
    var sdx = 0, sdy = 0;
    if (shield) {
      var sv = SHIELD_DIRS[shield.dir];
      sdx = sv[0]; sdy = sv[1];
    }

    for (var i = missiles.length - 1; i >= 0; i--) {
      var m = missiles[i];
      // Homing: adjust toward base
      var dx = BASE_X - m.x, dy = BASE_Y - m.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
      m.vx = m.vx * 0.92 + (dx / dist) * speed * 0.08;
      m.vy = m.vy * 0.92 + (dy / dist) * speed * 0.08;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.trail.unshift({ x: m.x, y: m.y });
      if (m.trail.length > 8) m.trail.pop();

      // Shield intercept check
      if (shield && shield.timer > 0) {
        var sx = BASE_X + sdx * SHIELD_R;
        var sy = BASE_Y + sdy * SHIELD_R;
        var sdist = Math.sqrt((m.x - sx) * (m.x - sx) + (m.y - sy) * (m.y - sy));
        // Shield covers a wide arc in that direction
        var shieldCoverX = BASE_X + sdx * 80;
        var shieldCoverY = BASE_Y + sdy * 80;
        var mAngle = Math.atan2(m.y - BASE_Y, m.x - BASE_X);
        var sAngle = Math.atan2(sdy, sdx);
        var angleDiff = Math.abs(mAngle - sAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (angleDiff < Math.PI * 0.6 && dist < SHIELD_R + MISSILE_R + 40) {
          kills++;
          killFlash = 0.2;
          game.audio.play('se_tap', 0.8);
          missiles.splice(i, 1);
          if (kills >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(kills * 20 + Math.ceil(timeLeft) * 10); }, 400);
          }
          continue;
        }
      }

      // Hit base
      var bd = Math.sqrt((m.x - BASE_X) * (m.x - BASE_X) + (m.y - BASE_Y) * (m.y - BASE_Y));
      if (bd < BASE_R + MISSILE_R) {
        hits++;
        game.audio.play('se_failure', 0.7);
        missiles.splice(i, 1);
        if (hits >= maxHits && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    if (killFlash > 0) killFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var s = 0; s < 20; s++) {
      var sa = ((s * 137 + game.time.elapsed * 20) % 360) / 360;
      game.draw.circle(
        (s * 197 + 40) % (W - 80) + 40,
        (s * 83 + 60) % (H - 120) + 60,
        2 + s % 2, '#fff', sa * 0.5
      );
    }

    // Missile trails and bodies
    for (var j = 0; j < missiles.length; j++) {
      var m2 = missiles[j];
      for (var tr = 0; tr < m2.trail.length; tr++) {
        var ta = (1 - tr / m2.trail.length) * 0.6;
        game.draw.circle(m2.trail[tr].x, m2.trail[tr].y, MISSILE_R * 0.6 * (1 - tr / m2.trail.length), C.exhaust, ta);
      }
      game.draw.circle(m2.x, m2.y, MISSILE_R + 8, C.missileHi, 0.3);
      game.draw.circle(m2.x, m2.y, MISSILE_R, C.missile);
      game.draw.circle(m2.x - 8, m2.y - 8, MISSILE_R * 0.3, '#fff', 0.4);
    }

    // Shield
    if (shield && shield.timer > 0) {
      var sa2 = shield.timer / SHIELD_DURATION;
      var sv2 = SHIELD_DIRS[shield.dir];
      var shx = BASE_X + sv2[0] * SHIELD_R;
      var shy = BASE_Y + sv2[1] * SHIELD_R;
      game.draw.circle(shx, shy, 90 * sa2, C.shieldHi, sa2 * 0.3);
      game.draw.circle(shx, shy, 60 * sa2, C.shield, sa2 * 0.7);
      // Arc
      game.draw.line(BASE_X + sv2[0] * 80, BASE_Y + sv2[1] * 80,
                     BASE_X + sv2[0] * 200, BASE_Y + sv2[1] * 200,
                     C.shieldHi, 8 * sa2);
    }

    // Base
    if (killFlash > 0) {
      game.draw.circle(BASE_X, BASE_Y, BASE_R + 24, '#fff', killFlash / 0.2 * 0.5);
    }
    game.draw.circle(BASE_X, BASE_Y, BASE_R + 16, C.baseHi, 0.15);
    game.draw.circle(BASE_X, BASE_Y, BASE_R, C.base);
    game.draw.circle(BASE_X, BASE_Y, BASE_R * 0.6, C.baseHi, 0.3);
    game.draw.circle(BASE_X - 24, BASE_Y - 24, BASE_R * 0.2, '#fff', 0.4);

    // Shield direction arrows
    var arrowDirs = [
      {dir:'up', x:W/2, y:BASE_Y-220, label:'↑'},
      {dir:'down', x:W/2, y:BASE_Y+220, label:'↓'},
      {dir:'left', x:BASE_X-220, y:BASE_Y, label:'←'},
      {dir:'right', x:BASE_X+220, y:BASE_Y, label:'→'}
    ];
    for (var ad = 0; ad < arrowDirs.length; ad++) {
      var adir = arrowDirs[ad];
      var isActive = shield && shield.dir === adir.dir;
      game.draw.text(adir.label, adir.x, adir.y, { size: 52, color: isActive ? C.shieldHi : '#1e3a5f', bold: isActive });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#04080c');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.base : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Kills & hits
    game.draw.text(kills + ' / ' + needed, W / 2, 140, { size: 56, color: C.shieldHi, bold: true });
    for (var h = 0; h < maxHits; h++) {
      var hx = W / 2 + (h - 1) * 64;
      game.draw.circle(hx, 212, 20, h < hits ? '#ef4444' : '#0a1428');
    }

    // Guide
    game.draw.text('スワイプでシールドを展開！', W / 2, H - 200, { size: 48, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnTimer = 0.5;
  });
})(game);
