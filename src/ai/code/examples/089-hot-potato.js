// 089-hot-potato.js
// ホットポテト — 爆発する前に素早くスワイプしてボールを次のプレイヤーに渡し続ける
// 操作: スワイプで受け取ったボールを隣のプレイヤーへ渡す
// 成功: 20回渡す  失敗: 時間切れでボールを持ったまま爆発 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0f0a04',
    ball:    '#f97316',
    ballHi:  '#fed7aa',
    hot:     '#ef4444',
    safe:    '#22c55e',
    player:  '#3b82f6',
    playerHi:'#93c5fd',
    smoke:   '#78716c',
    ui:      '#475569'
  };

  // 4 players at compass positions
  var PLAYERS = [
    { x: W / 2, y: H * 0.25, dir: 'down',  label: '上' },
    { x: W * 0.8, y: H * 0.5, dir: 'left', label: '右' },
    { x: W / 2, y: H * 0.75, dir: 'up',   label: '下' },
    { x: W * 0.2, y: H * 0.5, dir: 'right',label: '左' }
  ];

  // You are always "player 2" = bottom (index 2)
  var PLAYER_IDX = 2;
  var FUSE_TIME = 2.2; // seconds before explosion
  var fuseTimer = FUSE_TIME;
  var ballHolder = PLAYER_IDX;
  var passCooldown = 0;

  var score = 0;
  var needed = 20;
  var timeLeft = 30;
  var done = false;
  var explosionTimer = 0;
  var particles = [];
  var passFeedback = 0;
  var arrowHint = null;
  var arrowTimer = 0;

  function opponentPass() {
    // Opponent passes ball to you after brief delay
    setTimeout(function() {
      if (done) return;
      ballHolder = PLAYER_IDX;
      fuseTimer = FUSE_TIME;
      game.audio.play('se_tap', 0.5);
      arrowHint = null;
    }, 300 + Math.random() * 400);
  }

  function explode() {
    done = true;
    explosionTimer = 0.8;
    // Particles
    var bx = PLAYERS[ballHolder].x;
    var by = PLAYERS[ballHolder].y;
    for (var i = 0; i < 20; i++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = 200 + Math.random() * 300;
      particles.push({ x: bx, y: by, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.6, color: C.hot });
    }
    game.audio.play('se_failure');
    setTimeout(function() { game.end.failure(); }, 900);
  }

  game.onSwipe(function(dir) {
    if (done || ballHolder !== PLAYER_IDX || passCooldown > 0) return;
    // Pass to the player in that direction
    var targets = {
      up:    0,  // PLAYERS[0] is above
      right: 1,  // right
      down:  -1, // no one below (PLAYER_IDX is bottom)
      left:  3   // left
    };
    var target = targets[dir];
    if (target === undefined || target < 0) return;
    ballHolder = target;
    fuseTimer = FUSE_TIME;
    passCooldown = 0.2;
    score++;
    passFeedback = 0.3;
    game.audio.play('se_tap', 0.8);
    if (score >= needed && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(score * 25 + Math.ceil(timeLeft) * 8); }, 400);
      return;
    }
    // Opponent passes back after brief delay
    opponentPass();
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

    if (passCooldown > 0) passCooldown -= dt;
    if (passFeedback > 0) passFeedback -= dt;
    if (arrowTimer > 0) arrowTimer -= dt;

    // Fuse countdown
    if (!done && ballHolder === PLAYER_IDX) {
      fuseTimer -= dt;
      if (fuseTimer <= 0) {
        explode();
        return;
      }
    }

    // Particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw connection lines between players
    for (var i = 0; i < 4; i++) {
      var next = (i + 1) % 4;
      game.draw.line(PLAYERS[i].x, PLAYERS[i].y, PLAYERS[next].x, PLAYERS[next].y, '#1c1410', 4);
    }

    // Draw players
    for (var j = 0; j < 4; j++) {
      var pl = PLAYERS[j];
      var isMe = j === PLAYER_IDX;
      var hasBall = j === ballHolder;
      var pColor = isMe ? C.player : C.smoke;
      game.draw.circle(pl.x, pl.y, 52, pColor);
      game.draw.circle(pl.x, pl.y, 38, isMe ? C.playerHi : '#44403c', 0.4);
      game.draw.text(pl.label, pl.x, pl.y, { size: 40, color: '#fff', bold: true });
      if (isMe) game.draw.text('あなた', pl.x, pl.y + 80, { size: 32, color: C.playerHi });
    }

    // Ball
    if (explosionTimer <= 0) {
      var holder = PLAYERS[ballHolder];
      var frac = Math.max(0, fuseTimer / FUSE_TIME);
      var urgency = 1 - frac;
      var ballColor = urgency > 0.6 ? C.hot : (urgency > 0.3 ? C.ball : C.ballHi);
      var pulse = ballHolder === PLAYER_IDX ? (0.7 + 0.3 * Math.sin(game.time.elapsed * (4 + urgency * 12))) : 0.8;

      // Fuse ring
      if (ballHolder === PLAYER_IDX) {
        game.draw.circle(holder.x, holder.y, 80, C.hot, urgency * 0.4);
        // Fuse arc indicator
        var arcR = 72;
        game.draw.circle(holder.x, holder.y, arcR, '#000', (1 - frac) * 0.6);
        game.draw.circle(holder.x, holder.y, arcR, ballColor, frac * 0.3);
      }

      // Ball
      game.draw.circle(holder.x, holder.y - 60, 36 + pulse * 4, ballColor);
      game.draw.circle(holder.x - 10, holder.y - 72, 12, '#fff', 0.4);

      // Fuse countdown number
      if (ballHolder === PLAYER_IDX) {
        game.draw.text(Math.ceil(fuseTimer) + '', holder.x, holder.y - 60, {
          size: 36, color: '#fff', bold: true
        });
      }
    }

    // Explosion particles
    for (var pi = 0; pi < particles.length; pi++) {
      var pp = particles[pi];
      game.draw.circle(pp.x, pp.y, 12 * pp.life, pp.color, pp.life);
    }

    // Swipe hint when holding
    if (ballHolder === PLAYER_IDX && fuseTimer < 1.5 && passFeedback <= 0) {
      game.draw.text('↑←→ スワイプ！', W / 2, H * 0.88, {
        size: 52, color: '#f59e0b', bold: true
      });
    }

    // Pass feedback
    if (passFeedback > 0) {
      game.draw.text('パス！', W / 2, H * 0.88, { size: 64, color: C.safe, bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#0f0a04');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#d97706' : C.hot);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: '#f1f5f9', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    fuseTimer = FUSE_TIME;
  });
})(game);
