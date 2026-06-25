// 227-spin-duel.js
// スピンデュエル — コマがぶつかって弾き飛ばされる前に相手を場外に落とす
// 操作: タップで自コマをチャージしてぶつける
// 成功: 相手を3回場外に  失敗: 自分が3回落ちる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a10',
    arena:  '#1e293b',
    arenaHi:'#334155',
    player: '#22c55e',
    plrHi:  '#86efac',
    enemy:  '#ef4444',
    eneHi:  '#fca5a5',
    charge: '#f59e0b',
    ui:     '#475569'
  };

  var ARENA_R = 360;
  var CX = W / 2;
  var CY = H * 0.48;
  var TOP_R = 32;

  // Player
  var px = CX - 100, py = CY + 50;
  var pvx = 0, pvy = 0;
  var pCharge = 0; // 0–1
  var pCharging = false;
  var pSpinAngle = 0;
  var pWins = 0;
  var pLosses = 0;

  // Enemy (simple AI)
  var ex = CX + 100, ey = CY - 50;
  var evx = 0, evy = 0;
  var eAngle = 0;
  var eTimer = 1.0;
  var eWins = 0; // enemy wins = player losses

  var FRICTION = 0.985;
  var CHARGE_SPEED = 1200;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var respawnTimer = 0;
  var feedback = 0;
  var feedbackOk = false;

  function isInArena(x, y) {
    var dx = x - CX, dy = y - CY;
    return Math.sqrt(dx * dx + dy * dy) < ARENA_R;
  }

  function respawnPlayer() {
    var a = Math.random() * Math.PI * 2;
    px = CX + Math.cos(a) * ARENA_R * 0.4;
    py = CY + Math.sin(a) * ARENA_R * 0.4;
    pvx = 0; pvy = 0; pCharge = 0;
  }

  function respawnEnemy() {
    var a = Math.random() * Math.PI * 2;
    ex = CX + Math.cos(a) * ARENA_R * 0.4;
    ey = CY + Math.sin(a) * ARENA_R * 0.4;
    evx = 0; evy = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || respawnTimer > 0) return;
    // Direction from player to tap
    var dx = tx - px, dy = ty - py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return;
    var speed = CHARGE_SPEED * (0.5 + pCharge * 0.8);
    pvx = (dx / dist) * speed;
    pvy = (dy / dist) * speed;
    pCharge = 0;
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    if (respawnTimer > 0) {
      respawnTimer -= dt;
      return;
    }

    // Build charge over time
    pCharge = Math.min(1, pCharge + dt * 0.5);
    pSpinAngle += 5 * dt;

    // Move player
    px += pvx * dt;
    py += pvy * dt;
    pvx *= FRICTION;
    pvy *= FRICTION;

    // Arena edge for player
    var pDist = Math.sqrt((px - CX) * (px - CX) + (py - CY) * (py - CY));
    if (pDist > ARENA_R - TOP_R) {
      // Player fell off
      pLosses++;
      feedbackOk = false; feedback = 0.4;
      game.audio.play('se_failure', 0.5);
      if (pLosses >= 3 && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
      respawnPlayer();
      respawnTimer = 0.8;
    }

    // Enemy AI — move toward player
    eTimer -= dt;
    if (eTimer <= 0) {
      var eDx = px - ex, eDy = py - ey;
      var eDist = Math.sqrt(eDx * eDx + eDy * eDy);
      var eSpeed = 450 + elapsed * 15;
      evx = (eDx / eDist) * eSpeed + (Math.random() - 0.5) * 200;
      evy = (eDy / eDist) * eSpeed + (Math.random() - 0.5) * 200;
      eTimer = 0.6 + Math.random() * 0.8;
      game.audio.play('se_tap', 0.15);
    }

    ex += evx * dt;
    ey += evy * dt;
    evx *= FRICTION;
    evy *= FRICTION;
    eAngle += 4 * dt;

    // Arena edge for enemy
    var eDist2 = Math.sqrt((ex - CX) * (ex - CX) + (ey - CY) * (ey - CY));
    if (eDist2 > ARENA_R - TOP_R) {
      eWins++;
      pWins++;
      feedbackOk = true; feedback = 0.4;
      game.audio.play('se_success', 0.6);
      if (pWins >= 3 && !done) {
        done = true;
        setTimeout(function() { game.end.success(pWins * 200 + Math.ceil(timeLeft) * 40); }, 400);
        return;
      }
      respawnEnemy();
    }

    // Collision between player and enemy
    var cdx = ex - px, cdy = ey - py;
    var cDist = Math.sqrt(cdx * cdx + cdy * cdy);
    if (cDist < TOP_R * 2) {
      // Elastic-ish collision
      var nx = cdx / cDist, ny = cdy / cDist;
      var impulse = 600;
      pvx -= nx * impulse;
      pvy -= ny * impulse;
      evx += nx * impulse;
      evy += ny * impulse;
      game.audio.play('se_tap', 0.7);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Arena
    game.draw.circle(CX, CY, ARENA_R, C.arena, 0.8);
    game.draw.circle(CX, CY, ARENA_R, C.arenaHi, 0.2);

    // Danger edge ring
    for (var a = 0; a < Math.PI * 2; a += 0.15) {
      game.draw.circle(CX + Math.cos(a) * (ARENA_R - TOP_R), CY + Math.sin(a) * (ARENA_R - TOP_R), 6, '#ef4444', 0.4);
    }

    // Player
    game.draw.circle(px, py, TOP_R + 8, C.plrHi, 0.25 + pCharge * 0.3);
    game.draw.circle(px, py, TOP_R, C.player, 0.9);
    // Spin indicator
    game.draw.line(px, py, px + Math.cos(pSpinAngle) * TOP_R * 0.6, py + Math.sin(pSpinAngle) * TOP_R * 0.6, '#fff', 4);
    // Charge indicator
    if (pCharge > 0.1) {
      game.draw.circle(px, py, TOP_R + 15 * pCharge, C.charge, pCharge * 0.4);
    }

    // Enemy
    game.draw.circle(ex, ey, TOP_R + 8, C.eneHi, 0.25);
    game.draw.circle(ex, ey, TOP_R, C.enemy, 0.9);
    game.draw.line(ex, ey, ex + Math.cos(eAngle) * TOP_R * 0.6, ey + Math.sin(eAngle) * TOP_R * 0.6, '#fff', 4);

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? '#22c55e' : '#ef4444', feedback * 0.1);
    }

    // Score
    game.draw.text('撃墜 ' + pWins + ' / 3', W / 2, H * 0.89, { size: 48, color: C.player, bold: true });
    game.draw.text('被撃 ' + pLosses + ' / 3', W / 2, H * 0.93, { size: 40, color: C.enemy });
    game.draw.text('タップで弾き飛ばす！', W / 2, H * 0.96, { size: 32, color: C.ui });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
  });
})(game);
