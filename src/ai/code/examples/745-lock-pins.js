// 745-lock-pins.js
// ロックピック — 4本のピンが全て同時にグリーンゾーンに揃った瞬間タップせよ
// 操作: タップ — 全ピンが同時にゾーン内にあるとき成功
// 成功: 20回解錠  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#08080f',
    pin:     '#64748b',
    pinIn:   '#22c55e',
    zone:    '#14532d',
    zoneHi:  '#22c55e',
    keyhole: '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0c0c18'
  };

  var PIN_COUNT = 4;
  var PIN_W     = 60;
  var PIN_H     = 320;
  var PIN_GAP   = 140;
  var PIN_START = W / 2 - (PIN_COUNT - 1) * PIN_GAP / 2;
  var TRACK_Y   = H * 0.38;
  var ZONE_H    = 70;
  var ZONE_Y    = TRACK_Y + PIN_H * 0.35;

  var pins = [];
  for (var i = 0; i < PIN_COUNT; i++) {
    pins.push({
      y: Math.random() * PIN_H,
      speed: 160 + Math.random() * 100,
      dir: Math.random() < 0.5 ? 1 : -1,
      phase: Math.random() * Math.PI * 2
    });
  }

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var lockAnim = 0;

  function allInZone() {
    for (var i = 0; i < pins.length; i++) {
      var py = TRACK_Y + pins[i].y;
      if (Math.abs(py - ZONE_Y) > ZONE_H / 2) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (allInZone()) {
      score++;
      lockAnim = 0.5;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = '解錠！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: ZONE_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.zoneHi });
      }
      // Randomize pin speeds after unlock
      for (var i = 0; i < pins.length; i++) {
        pins[i].speed = Math.min(340, (160 + score * 10) + Math.random() * 80);
        pins[i].dir = Math.random() < 0.5 ? 1 : -1;
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 450 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      var inCount = 0;
      for (var j = 0; j < pins.length; j++) {
        if (Math.abs(TRACK_Y + pins[j].y - ZONE_Y) < ZONE_H / 2) inCount++;
      }
      resultText = inCount + '/' + PIN_COUNT + '本 ズレ！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    for (var i = 0; i < pins.length; i++) {
      pins[i].y += pins[i].speed * pins[i].dir * dt;
      pins[i].phase += dt * 2;
      if (pins[i].y >= PIN_H) { pins[i].y = PIN_H; pins[i].dir = -1; }
      if (pins[i].y <= 0)     { pins[i].y = 0;     pins[i].dir =  1; }
    }

    if (lockAnim > 0) lockAnim -= dt * 2;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var allIn = allInZone();

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Lock body
    game.draw.rect(W / 2 - 240, TRACK_Y - 40, 480, PIN_H + 80, '#0d0d1c', 0.8);
    game.draw.rect(W / 2 - 240, TRACK_Y - 40, 480, 8, '#1e293b', 0.8);
    game.draw.rect(W / 2 - 240, TRACK_Y + PIN_H + 32, 480, 8, '#1e293b', 0.8);

    // Zone highlight
    game.draw.rect(0, ZONE_Y - ZONE_H / 2, W, ZONE_H, allIn ? C.zoneHi : C.zone, allIn ? 0.2 : 0.12);
    game.draw.line(0, ZONE_Y - ZONE_H / 2, W, ZONE_Y - ZONE_H / 2, allIn ? C.zoneHi : '#1a5c2a', 2);
    game.draw.line(0, ZONE_Y + ZONE_H / 2, W, ZONE_Y + ZONE_H / 2, allIn ? C.zoneHi : '#1a5c2a', 2);

    // Pins
    for (var i2 = 0; i2 < pins.length; i2++) {
      var px = PIN_START + i2 * PIN_GAP;
      var py = TRACK_Y + pins[i2].y;
      var inZ = Math.abs(py - ZONE_Y) < ZONE_H / 2;
      // Track
      game.draw.rect(px - PIN_W / 2, TRACK_Y, PIN_W, PIN_H, '#111827', 0.8);
      // Pin body
      game.draw.rect(px - PIN_W / 2 + 3, py - 4, PIN_W - 6, 80, inZ ? C.pinIn : C.pin, 0.9);
      game.draw.rect(px - PIN_W / 2 + 3, py - 4, PIN_W - 6, 14, inZ ? '#86efac' : '#94a3b8', 0.4);
      // Pin top indicator
      game.draw.circle(px, py, 16, inZ ? C.pinIn : C.pin, 0.9);
    }

    // Keyhole
    var kCol = allIn ? C.keyhole : '#2a2a3a';
    game.draw.circle(W / 2, ZONE_Y, 28, kCol, allIn ? (0.8 + 0.2 * Math.sin(elapsed * 8)) : 0.35);
    game.draw.rect(W / 2 - 10, ZONE_Y + 10, 20, 28, kCol, allIn ? 0.8 : 0.3);

    if (allIn && !done) {
      game.draw.text('今タップ！', W / 2, H * 0.87, { size: 56, color: C.zoneHi, bold: true });
    } else {
      game.draw.text('全ピンを揃えろ', W / 2, H * 0.87, { size: 40, color: C.text + '44' });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.13, { size: 48, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
