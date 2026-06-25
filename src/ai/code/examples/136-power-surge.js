// 136-power-surge.js
// パワーサージ — エネルギーゲージをちょうどいい量に止める精密なタイミングゲーム
// 操作: タップでチャージ開始、もう一度でリリース（ゾーン内でリリースで成功）
// 成功: 8回ゾーン内にリリース  失敗: 5回外す or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020408',
    bar:     '#0f1a2e',
    fill:    '#3b82f6',
    fillHi:  '#60a5fa',
    zone:    '#22c55e',
    zoneHi:  '#86efac',
    danger:  '#ef4444',
    overload:'#f97316',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var BAR_X = W * 0.15;
  var BAR_W = W * 0.7;
  var BAR_Y = H * 0.45;
  var BAR_H = 80;

  var power = 0; // 0-1
  var charging = false;
  var CHARGE_SPEED = 0.8; // per second
  var DRAIN_SPEED = 0.35;

  // Target zone (shifts each round)
  var zoneStart = 0.55;
  var zoneEnd = 0.75;
  var ZONE_WIDTH = 0.18;

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 35;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];
  var overloadFlash = 0;

  function newZone() {
    zoneStart = 0.3 + Math.random() * 0.45;
    zoneEnd = zoneStart + ZONE_WIDTH;
    if (zoneEnd > 0.95) { zoneEnd = 0.95; zoneStart = zoneEnd - ZONE_WIDTH; }
  }

  game.onTap(function() {
    if (done) return;
    if (!charging) {
      charging = true;
      game.audio.play('se_tap', 0.4);
    } else {
      // Release
      charging = false;
      if (power >= zoneStart && power <= zoneEnd) {
        score++;
        feedbackOk = true;
        feedback = 0.5;
        game.audio.play('se_success');
        // Sparks
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: BAR_X + power * BAR_W, y: BAR_Y + BAR_H/2, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.4 });
        }
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score*60 + Math.ceil(timeLeft)*12); }, 500);
          return;
        }
        newZone();
      } else {
        misses++;
        feedbackOk = false;
        feedback = 0.4;
        game.audio.play('se_failure', 0.6);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
        newZone();
      }
      // Drain power
      power = 0;
    }
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

    if (charging) {
      power += CHARGE_SPEED * dt;
      if (power >= 1) {
        power = 0; // overload!
        charging = false;
        overloadFlash = 0.5;
        misses++;
        feedbackOk = false;
        feedback = 0.4;
        game.audio.play('se_failure');
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        newZone();
      }
    } else {
      power -= DRAIN_SPEED * dt;
      if (power < 0) power = 0;
    }

    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 300 * dt;
      particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (feedback > 0) feedback -= dt;
    if (overloadFlash > 0) overloadFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Overload flash
    if (overloadFlash > 0) {
      game.draw.rect(0, 0, W, H, C.overload, overloadFlash * 0.4);
    }

    // Energy bar background
    game.draw.rect(BAR_X - 4, BAR_Y - 4, BAR_W + 8, BAR_H + 8, '#0a1020');
    game.draw.rect(BAR_X, BAR_Y, BAR_W, BAR_H, C.bar);

    // Zone indicator
    var zx = BAR_X + zoneStart * BAR_W;
    var zw = (zoneEnd - zoneStart) * BAR_W;
    game.draw.rect(zx, BAR_Y, zw, BAR_H, C.zone, 0.3);
    game.draw.rect(zx, BAR_Y, zw, 8, C.zoneHi, 0.8);
    game.draw.rect(zx, BAR_Y + BAR_H - 8, zw, 8, C.zoneHi, 0.8);
    game.draw.rect(zx, BAR_Y, 4, BAR_H, C.zoneHi);
    game.draw.rect(zx + zw - 4, BAR_Y, 4, BAR_H, C.zoneHi);

    // Power fill
    var fillColor = power > 0.85 ? C.danger : (charging ? C.fillHi : C.fill);
    game.draw.rect(BAR_X, BAR_Y, power * BAR_W, BAR_H, fillColor, 0.9);

    // Glow at power tip
    if (power > 0) {
      var tipX = BAR_X + power * BAR_W;
      game.draw.circle(tipX, BAR_Y + BAR_H/2, 20, fillColor, 0.6);
    }

    // Bar border
    game.draw.rect(BAR_X, BAR_Y, BAR_W, 4, '#1e3050');
    game.draw.rect(BAR_X, BAR_Y + BAR_H - 4, BAR_W, 4, '#1e3050');

    // Labels
    game.draw.text('0%', BAR_X, BAR_Y + BAR_H + 32, { size: 32, color: C.ui });
    game.draw.text('100%', BAR_X + BAR_W, BAR_Y + BAR_H + 32, { size: 32, color: C.ui });
    game.draw.text('ZONE', zx + zw/2, BAR_Y - 32, { size: 36, color: C.zoneHi, bold: true });

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*2.5, C.fill, part.life);
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? 'ジャスト！' : (overloadFlash > 0 ? 'オーバーロード！' : 'ゾーン外！'), W/2, H*0.7, {
        size: 64, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.1);
    }

    // State label
    var stateText = charging ? 'チャージ中…  もう一度でリリース' : 'タップでチャージ開始';
    game.draw.text(stateText, W/2, H*0.87, { size: 40, color: charging ? C.fillHi : C.ui });

    // Score
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W/2+(mi-2)*52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft/35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.fill : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newZone();
  });
})(game);
