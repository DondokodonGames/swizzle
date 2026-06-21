// dodge-balls.js
// 上から降ってくるボールをスワイプで避けて生き延びる（15秒）
// SwizzleGameAPI few-shot example #2

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  var player = { x: W / 2, y: H - 300, r: 70 };
  var balls = [];
  var timeLeft = 15;
  var alive = true;
  var spawnTimer = 0;

  function spawnBall() {
    balls.push({
      x: game.random(80, W - 80),
      y: -60,
      r: game.random(40, 80),
      vy: game.random(500, 900)
    });
  }

  game.onSwipe(function(dir) {
    if (!alive) return;
    var step = 220;
    if (dir === 'left')  player.x = Math.max(player.r, player.x - step);
    if (dir === 'right') player.x = Math.min(W - player.r, player.x + step);
    if (dir === 'up')    player.y = Math.max(200, player.y - step);
    if (dir === 'down')  player.y = Math.min(H - 150, player.y + step);
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!alive) return;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      alive = false;
      game.audio.play('se_success');
      game.end.success(100);
      return;
    }

    // ボールを定期スポーン（時間が経つほど頻繁に）
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnBall();
      spawnTimer = Math.max(0.3, 1.0 - (15 - timeLeft) * 0.04);
    }

    // ボール更新 & 当たり判定
    for (var i = balls.length - 1; i >= 0; i--) {
      balls[i].y += balls[i].vy * dt;
      if (balls[i].y - balls[i].r > H) {
        balls.splice(i, 1);
        continue;
      }
      var dx = balls[i].x - player.x;
      var dy = balls[i].y - player.y;
      var minDist = balls[i].r + player.r * 0.7;
      if (dx * dx + dy * dy < minDist * minDist) {
        alive = false;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // 描画
    game.draw.clear('#0f172a');

    // タイムバー
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 80, '#1e293b');
    game.draw.rect(0, 0, W * ratio, 80, '#3b82f6');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 40, { size: 48, color: '#fff', bold: true });

    // ボール
    for (var j = 0; j < balls.length; j++) {
      game.draw.circle(balls[j].x, balls[j].y, balls[j].r, '#ff3b1f');
    }

    // プレイヤー
    game.draw.circle(player.x, player.y, player.r, '#22c55e');
    game.draw.circle(player.x, player.y, player.r * 0.5, '#ffffff');

    game.draw.text('スワイプで避けろ！', W / 2, H - 120, { size: 52, color: '#94a3b8' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnBall();
  });
})(game);
