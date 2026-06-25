// 181-clone-dodge.js
// クローン回避 — 自分の0.5秒遅れのゴーストが追ってくる、自分の軌跡を避ける不思議なゲーム
// 操作: タップで移動先を指定
// 成功: 25秒クローンに当たらずに逃げ続ける  失敗: クローンに追いつかれる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040608',
    player:  '#22c55e',
    playerHi:'#86efac',
    clone:   '#ef4444',
    cloneHi: '#fca5a5',
    trail:   '#0f4020',
    walls:   '#1e293b',
    ui:      '#334155',
    survive: '#22c55e'
  };

  var PLAYER_R = 32;
  var CLONE_R = 30;
  var MOVE_SPEED = 480;
  var HISTORY_DELAY = 0.5; // seconds lag
  var HISTORY_MAX = 200;

  var px = W / 2;
  var py = H * 0.6;
  var pvx = 0, pvy = 0;
  var FRICTION = 0.82;

  var posHistory = []; // {x, y, t}
  var elapsed = 0;

  var cloneX = W / 2;
  var cloneY = H * 0.4;

  var survived = 0;
  var NEEDED = 25;
  var timeLeft = NEEDED;
  var done = false;
  var trail = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - px, dy = ty - py;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 10) return;
    pvx = (dx / len) * MOVE_SPEED;
    pvy = (dy / len) * MOVE_SPEED;
    game.audio.play('se_tap', 0.15);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    pvx = 0; pvy = 0;
    if (dir === 'up') pvy = -MOVE_SPEED;
    else if (dir === 'down') pvy = MOVE_SPEED;
    else if (dir === 'left') pvx = -MOVE_SPEED;
    else if (dir === 'right') pvx = MOVE_SPEED;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 80 + 600); }, 400);
        return;
      }
    }

    // Move player
    pvx *= Math.pow(FRICTION, dt * 60);
    pvy *= Math.pow(FRICTION, dt * 60);
    px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px + pvx * dt));
    py = Math.max(PLAYER_R, Math.min(H - PLAYER_R, py + pvy * dt));

    // Record history
    posHistory.push({ x: px, y: py, t: elapsed });
    if (posHistory.length > HISTORY_MAX) posHistory.shift();

    // Clone follows HISTORY_DELAY seconds behind
    var targetT = elapsed - HISTORY_DELAY;
    for (var hi = 0; hi < posHistory.length; hi++) {
      if (posHistory[hi].t >= targetT) {
        cloneX = posHistory[Math.max(0, hi - 1)].x;
        cloneY = posHistory[Math.max(0, hi - 1)].y;
        break;
      }
    }

    trail.push({ x: cloneX, y: cloneY, life: 0.4 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Collision check
    var dx = px - cloneX, dy = py - cloneY;
    if (Math.sqrt(dx * dx + dy * dy) < PLAYER_R + CLONE_R - 8 && elapsed > HISTORY_DELAY + 0.5 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Clone trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, CLONE_R * t.life * 2.5, C.clone, t.life * 0.2);
    }

    // Clone ghost
    game.draw.circle(cloneX, cloneY, CLONE_R + 12, C.cloneHi, 0.15);
    game.draw.circle(cloneX, cloneY, CLONE_R, C.clone, 0.65);
    game.draw.circle(cloneX, cloneY, CLONE_R * 0.5, C.cloneHi, 0.3);
    // Ghost eyes
    game.draw.circle(cloneX - 10, cloneY - 8, 8, '#fff', 0.6);
    game.draw.circle(cloneX + 10, cloneY - 8, 8, '#fff', 0.6);

    // Player
    game.draw.circle(px, py, PLAYER_R + 8, C.playerHi, 0.25);
    game.draw.circle(px, py, PLAYER_R, C.player, 0.95);
    game.draw.circle(px - PLAYER_R * 0.3, py - PLAYER_R * 0.35, PLAYER_R * 0.3, '#fff', 0.5);

    // Distance warning
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200 && elapsed > HISTORY_DELAY + 0.5) {
      var dangerAlpha = (1 - dist / 200) * 0.3;
      game.draw.line(px, py, cloneX, cloneY, C.clone, 3);
      game.draw.rect(0, 0, W, H, C.clone, dangerAlpha * 0.5);
    }

    game.draw.text('タップで逃げる！', W / 2, H * 0.91, { size: 42, color: C.ui });
    game.draw.text('0.5秒後の自分が追ってくる', W / 2, H * 0.87, { size: 34, color: C.ui });

    var ratio = Math.max(0, timeLeft / NEEDED);
    var rSteps = Math.floor(ratio * 40);
    game.draw.text(timeLeft.toFixed(1), W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.survive : C.clone);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    // Prepopulate some history so clone doesn't start at origin
    for (var i = 0; i < 50; i++) {
      posHistory.push({ x: px, y: py, t: -HISTORY_DELAY + i * 0.01 });
    }
  });
})(game);
