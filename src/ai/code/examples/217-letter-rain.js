// 217-letter-rain.js
// レターレイン — 降ってくる文字から指定の文字だけ素早くタップする反射神経
// 操作: タップで文字を叩く
// 成功: 30個正解  失敗: 10個誤タップ or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060410',
    target: '#22c55e',
    tarHi:  '#86efac',
    decoy:  '#3b82f6',
    decHi:  '#93c5fd',
    wrong:  '#ef4444',
    ui:     '#475569'
  };

  var TARGETS = ['A', 'S', 'D', 'F']; // 4 target letters
  var DECOYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'G', 'H', 'J', 'K'];
  var currentTarget = TARGETS[0];

  var letters = [];
  var score = 0;
  var NEEDED = 30;
  var wrongs = 0;
  var MAX_WRONG = 10;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.55;
  var feedback = 0;
  var feedbackOk = false;
  var targetChangeTimer = 6.0;
  var targetIdx = 0;

  function spawnLetter() {
    var isTarget = Math.random() < 0.35;
    var ch = isTarget ? currentTarget : DECOYS[Math.floor(Math.random() * DECOYS.length)];
    letters.push({
      x: 80 + Math.random() * (W - 160),
      y: -40,
      ch: ch,
      isTarget: isTarget,
      vy: 200 + Math.random() * 120,
      r: 44,
      hit: false,
      hitTimer: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitSomething = false;
    for (var li = letters.length - 1; li >= 0; li--) {
      var l = letters[li];
      if (l.hit) continue;
      var dx = tx - l.x, dy = ty - l.y;
      if (Math.sqrt(dx * dx + dy * dy) < l.r + 20) {
        l.hit = true;
        l.hitTimer = 0.3;
        hitSomething = true;
        if (l.isTarget) {
          score++;
          feedbackOk = true; feedback = 0.2;
          game.audio.play('se_success', 0.5);
          if (score >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(score * 60 + Math.ceil(timeLeft) * 20); }, 400);
          }
        } else {
          wrongs++;
          feedbackOk = false; feedback = 0.3;
          game.audio.play('se_failure', 0.4);
          if (wrongs >= MAX_WRONG && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        break;
      }
    }
    if (!hitSomething) {
      // Miss tap
      wrongs++;
      feedbackOk = false; feedback = 0.2;
      game.audio.play('se_failure', 0.2);
      if (wrongs >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // Change target letter
    targetChangeTimer -= dt;
    if (targetChangeTimer <= 0) {
      targetIdx = (targetIdx + 1) % TARGETS.length;
      currentTarget = TARGETS[targetIdx];
      targetChangeTimer = 5.0 + Math.random() * 3.0;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnLetter();
      spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
    }

    for (var li = letters.length - 1; li >= 0; li--) {
      var l = letters[li];
      l.y += l.vy * dt;
      if (l.hit) {
        l.hitTimer -= dt;
        if (l.hitTimer <= 0) letters.splice(li, 1);
      } else if (l.y > H + 60) {
        letters.splice(li, 1);
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target display
    var pulse = 0.6 + 0.4 * Math.abs(Math.sin(elapsed * 3));
    game.draw.rect(W / 2 - 120, H * 0.12, 240, 120, C.target, pulse * 0.3);
    game.draw.text('たたけ！', W / 2, H * 0.12 + 36, { size: 36, color: C.tarHi });
    game.draw.text(currentTarget, W / 2, H * 0.12 + 90, { size: 88, color: C.target, bold: true });

    // Letters
    for (var li2 = 0; li2 < letters.length; li2++) {
      var l2 = letters[li2];
      var isT = l2.ch === currentTarget;
      var col = isT ? C.target : C.decoy;
      var hi = isT ? C.tarHi : C.decHi;
      var alpha = l2.hit ? 0.3 : 0.85;

      if (l2.hit && l2.isTarget) {
        // Flash green
        game.draw.circle(l2.x, l2.y, l2.r + 20, C.tarHi, l2.hitTimer * 2);
      } else if (l2.hit && !l2.isTarget) {
        game.draw.circle(l2.x, l2.y, l2.r + 10, C.wrong, l2.hitTimer * 2);
      }

      game.draw.circle(l2.x, l2.y, l2.r + 6, hi, isT ? 0.2 : 0.1);
      game.draw.circle(l2.x, l2.y, l2.r, col, alpha);
      game.draw.text(l2.ch, l2.x, l2.y, { size: 52, color: '#fff', bold: true });
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? '#22c55e' : '#ef4444', feedback * 0.12);
    }

    // Wrong counter
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 26 + wi * 52, H * 0.88, 16, wi < wrongs ? C.wrong : '#1a1a2e');
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, H * 0.92, { size: 56, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    spawnTimer = 0.3;
  });
})(game);
