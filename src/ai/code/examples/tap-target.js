// tap-target.js
// ランダムに動き回るターゲットをタップするゲーム（10秒）
// SwizzleGameAPI few-shot example #1

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  var target = { x: W / 2, y: H / 2, r: 120 };
  var vx = game.random(200, 400) * (Math.random() < 0.5 ? 1 : -1);
  var vy = game.random(200, 400) * (Math.random() < 0.5 ? 1 : -1);
  var timeLeft = 10;
  var tapped = false;

  game.onTap(function(x, y) {
    var dx = x - target.x;
    var dy = y - target.y;
    if (dx * dx + dy * dy <= target.r * target.r) {
      tapped = true;
      game.audio.play('se_success');
      game.end.success(Math.ceil(timeLeft * 10));
    }
  });

  game.onUpdate(function(dt) {
    if (tapped) return;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      game.audio.play('se_failure');
      game.end.failure();
      return;
    }

    // 移動 & 壁反射
    target.x += vx * dt;
    target.y += vy * dt;
    if (target.x - target.r < 0)    { target.x = target.r;     vx = Math.abs(vx); }
    if (target.x + target.r > W)    { target.x = W - target.r; vx = -Math.abs(vx); }
    if (target.y - target.r < 120)  { target.y = 120 + target.r; vy = Math.abs(vy); }
    if (target.y + target.r > H - 100) { target.y = H - 100 - target.r; vy = -Math.abs(vy); }

    // 描画
    game.draw.clear('#1a1a2e');

    // タイムバー
    var ratio = Math.max(0, timeLeft / 10);
    game.draw.rect(0, 0, W, 80, '#333');
    game.draw.rect(0, 0, W * ratio, 80, ratio > 0.3 ? '#22c55e' : '#ef4444');

    // 残り時間テキスト
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 40, { size: 48, color: '#fff', bold: true });

    // ターゲット
    var pulse = 1 + 0.05 * Math.sin(game.time.elapsed * 6);
    game.draw.circle(target.x, target.y, target.r * pulse, '#ff3b1f');
    game.draw.circle(target.x, target.y, target.r * pulse * 0.5, '#ffffff');

    // ガイドテキスト
    game.draw.text('タップ！', W / 2, H - 200, { size: 56, color: '#ffffff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
  });
})(game);
