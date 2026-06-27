// 685-color-sort.js
// 色仕分け — 落ちてくる玉を瞬時に左右のバケツに分類せよ
// 操作: タップ左で左バケツ、タップ右で右バケツ
// 成功: 30個正解  失敗: 8回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060a',
    bucketL: '#ef4444',
    bucketR: '#3b82f6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#08090f'
  };

  var BUCKET_Y = H * 0.82;
  var BUCKET_W = 360;
  var BUCKET_H = 100;
  var BUCKET_LX = W * 0.25;
  var BUCKET_RX = W * 0.75;

  var BALL_COLORS = ['#ef4444', '#3b82f6']; // red=left, blue=right
  var BALL_NAMES = ['赤', '青'];
  var BALL_BUCKET = [0, 1]; // 0=left, 1=right

  var ball = null;
  var answered = false;
  var waitTimer = 0;

  var correct = 0;
  var NEEDED = 30;
  var missed = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newBall() {
    var colorIdx = Math.floor(Math.random() * 2);
    // Occasionally flip colors to trick player
    ball = {
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: -50,
      r: 55,
      colorIdx: colorIdx,
      speed: 450 + elapsed * 4 + Math.random() * 150
    };
    answered = false;
  }

  game.onTap(function(tx, ty) {
    if (done || !ball || answered) return;
    var side = tx < W / 2 ? 0 : 1; // 0=left, 1=right
    answered = true;

    if (side === BALL_BUCKET[ball.colorIdx]) {
      correct++;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = '正解！';
      resultTimer = 0.4;
      game.audio.play('se_success', 0.5);
      var destX = side === 0 ? BUCKET_LX : BUCKET_RX;
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: ball.x, y: ball.y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.4, col: BALL_COLORS[ball.colorIdx] });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 300 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        waitTimer = 0.35;
      }
    } else {
      missed++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '間違い！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.4);
      if (missed >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        waitTimer = 0.35;
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
      if (waitTimer <= 0) {
        ball = null;
        newBall();
      }
    }

    if (ball && !answered) {
      ball.y += ball.speed * dt;
      // Auto-miss if ball passes buckets without being tapped
      if (ball.y > H + ball.r) {
        missed++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = '逃した！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.25);
        ball = null;
        answered = true;
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else {
          waitTimer = 0.25;
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Center line hint
    game.draw.line(W / 2, H * 0.12, W / 2, BUCKET_Y, '#ffffff0a', 2);

    // Left / Right labels
    game.draw.text('◀ 赤', W * 0.25, H * 0.15, { size: 48, color: '#ef444466' });
    game.draw.text('青 ▶', W * 0.75, H * 0.15, { size: 48, color: '#3b82f666' });

    // Buckets
    // Left bucket (red)
    game.draw.rect(BUCKET_LX - BUCKET_W / 2 + 5, BUCKET_Y + 5, BUCKET_W, BUCKET_H, '#000', 0.3);
    game.draw.rect(BUCKET_LX - BUCKET_W / 2, BUCKET_Y, BUCKET_W, BUCKET_H, C.bucketL, 0.8);
    game.draw.rect(BUCKET_LX - BUCKET_W / 2, BUCKET_Y, BUCKET_W, 14, '#fca5a5', 0.5);
    game.draw.text('赤', BUCKET_LX, BUCKET_Y + BUCKET_H * 0.6 + 10, { size: 50, color: '#fff', bold: true });

    // Right bucket (blue)
    game.draw.rect(BUCKET_RX - BUCKET_W / 2 + 5, BUCKET_Y + 5, BUCKET_W, BUCKET_H, '#000', 0.3);
    game.draw.rect(BUCKET_RX - BUCKET_W / 2, BUCKET_Y, BUCKET_W, BUCKET_H, C.bucketR, 0.8);
    game.draw.rect(BUCKET_RX - BUCKET_W / 2, BUCKET_Y, BUCKET_W, 14, '#93c5fd', 0.5);
    game.draw.text('青', BUCKET_RX, BUCKET_Y + BUCKET_H * 0.6 + 10, { size: 50, color: '#fff', bold: true });

    // Ball
    if (ball) {
      var bCol = BALL_COLORS[ball.colorIdx];
      game.draw.circle(ball.x + 5, ball.y + 5, ball.r, '#000', 0.3);
      game.draw.circle(ball.x, ball.y, ball.r, bCol, 0.9);
      game.draw.circle(ball.x - ball.r * 0.3, ball.y - ball.r * 0.35, ball.r * 0.25, '#fff', 0.35);
      game.draw.text(BALL_NAMES[ball.colorIdx], ball.x, ball.y + 14, { size: 42, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.68, { size: 64, color: flashCol, bold: true });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 20, mi < missed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    newBall();
  });
})(game);
