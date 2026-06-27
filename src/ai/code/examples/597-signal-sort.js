// 597-signal-sort.js
// シグナルソート — 混線した無線信号を周波数帯で仕分ける管制ゲーム
// 操作: スワイプで信号を正しいチャンネルへ振り分ける
// 成功: 30本仕分け成功  失敗: 8本ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    panel:   '#050f1a',
    channel: ['#ff4466', '#44aaff', '#44ffaa', '#ffcc00'],
    channelDk:['#330010', '#001535', '#003320', '#332800'],
    signal:  '#ffffff',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a1a2a'
  };

  var NUM_CHANNELS = 4;
  var CHANNEL_W = W / NUM_CHANNELS;
  var ZONE_Y = H * 0.82;
  var ZONE_H = H * 0.15;

  var signals = [];
  var sorted = 0;
  var NEEDED = 30;
  var mistakes = 0;
  var MAX_MISTAKES = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var nextSignal = 0.8;
  var resultText = '';
  var resultTimer = 0;

  var WAVE_SHAPES = [
    // Channel 0: narrow wave (high frequency)
    function(x, t, amp) { return Math.sin(x * 0.06 + t * 4) * amp; },
    // Channel 1: slow sine (low frequency)
    function(x, t, amp) { return Math.sin(x * 0.015 + t) * amp; },
    // Channel 2: sawtooth-ish
    function(x, t, amp) { return ((x * 0.02 + t * 2) % (Math.PI * 2) - Math.PI) / Math.PI * amp; },
    // Channel 3: square-ish
    function(x, t, amp) { return Math.sign(Math.sin(x * 0.03 + t * 1.5)) * amp; }
  ];

  function spawnSignal() {
    var ch = Math.floor(Math.random() * NUM_CHANNELS);
    var x = 120 + Math.random() * (W - 240);
    var y = H * 0.2 + Math.random() * (H * 0.45);
    signals.push({
      x: x, y: y,
      channel: ch,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.4,
      dragging: false,
      dragX: 0, dragY: 0,
      placed: false,
      life: 1.0
    });
  }

  var draggingIdx = -1;
  var dragStartX = 0, dragStartY = 0;
  var dragCurX = 0, dragCurY = 0;

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Find signal near swipe start
    var hit = -1;
    for (var si = 0; si < signals.length; si++) {
      var s = signals[si];
      if (s.placed) continue;
      var dx = x1 - s.x, dy = y1 - s.y;
      if (dx * dx + dy * dy < 70 * 70) { hit = si; break; }
    }
    if (hit < 0) return;

    // Determine target channel from swipe endpoint
    var targetChannel = Math.floor(x2 / CHANNEL_W);
    targetChannel = Math.max(0, Math.min(NUM_CHANNELS - 1, targetChannel));

    // Is endpoint in the zone area?
    if (y2 >= ZONE_Y) {
      var s2 = signals[hit];
      if (targetChannel === s2.channel) {
        // Correct!
        s2.placed = true;
        sorted++;
        flashCol = C.correct;
        flashAnim = 0.2;
        resultText = 'OK!';
        resultTimer = 0.4;
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({
            x: (targetChannel + 0.5) * CHANNEL_W, y: ZONE_Y + ZONE_H / 2,
            vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4,
            col: C.channel[s2.channel]
          });
        }
        if (sorted >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(sorted * 200 + Math.ceil(timeLeft) * 100); }, 700);
        }
      } else {
        // Wrong channel
        mistakes++;
        flashCol = C.wrong;
        flashAnim = 0.25;
        resultText = 'まちがい';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.3);
        if (mistakes >= MAX_MISTAKES && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    game.audio.play('se_tap', 0.05);
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (resultTimer > 0) resultTimer -= dt;

    // Spawn signals
    nextSignal -= dt;
    if (nextSignal <= 0 && !done) {
      var active = signals.filter(function(s) { return !s.placed; }).length;
      if (active < 5) spawnSignal();
      nextSignal = Math.max(0.4, 1.0 - elapsed * 0.01);
    }

    // Update signals
    for (var si = signals.length - 1; si >= 0; si--) {
      var s = signals[si];
      s.phase += s.speed * dt;
      if (s.placed) {
        s.life -= dt * 3;
        if (s.life <= 0) signals.splice(si, 1);
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

    // Channel zones at bottom
    for (var ch = 0; ch < NUM_CHANNELS; ch++) {
      game.draw.rect(ch * CHANNEL_W + 2, ZONE_Y, CHANNEL_W - 4, ZONE_H, C.channelDk[ch], 0.9);
      game.draw.rect(ch * CHANNEL_W + 2, ZONE_Y, CHANNEL_W - 4, 4, C.channel[ch], 0.8);

      // Channel label wave preview
      var previewY = ZONE_Y + ZONE_H / 2;
      var cx2 = (ch + 0.5) * CHANNEL_W;
      for (var xi = 0; xi < 40; xi++) {
        var wx = ch * CHANNEL_W + 8 + xi * (CHANNEL_W - 16) / 40;
        var wy = previewY + WAVE_SHAPES[ch](xi * 8, elapsed, 18);
        if (xi > 0) {
          var prevX = ch * CHANNEL_W + 8 + (xi - 1) * (CHANNEL_W - 16) / 40;
          var prevY = previewY + WAVE_SHAPES[ch]((xi - 1) * 8, elapsed, 18);
          game.draw.line(prevX, prevY, wx, wy, C.channel[ch], 3);
        }
      }
    }

    // Dividers
    for (var di = 1; di < NUM_CHANNELS; di++) {
      game.draw.line(di * CHANNEL_W, ZONE_Y, di * CHANNEL_W, H, C.ui, 2);
    }

    // Signals
    for (var si2 = 0; si2 < signals.length; si2++) {
      var s2 = signals[si2];
      if (s2.placed) continue;
      var sigCol = C.channel[s2.channel];
      var sigAlpha = s2.placed ? s2.life : 0.9;

      // Draw waveform for this signal
      var waveW = 150, waveH = 40;
      for (var xi2 = 0; xi2 < 30; xi2++) {
        var relX = xi2 / 30 * waveW;
        var relX2 = (xi2 + 1) / 30 * waveW;
        var wy2 = s2.y + WAVE_SHAPES[s2.channel](xi2 * 6, s2.phase, waveH * 0.4);
        var wy3 = s2.y + WAVE_SHAPES[s2.channel]((xi2 + 1) * 6, s2.phase, waveH * 0.4);
        if (xi2 > 0) {
          game.draw.line(s2.x - waveW / 2 + relX, wy2, s2.x - waveW / 2 + relX2, wy3, sigCol, 4);
        }
      }
      // Signal box
      game.draw.rect(s2.x - waveW / 2 - 8, s2.y - waveH - 8, waveW + 16, waveH * 2 + 16, sigCol, 0.08);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.74, { size: 52, color: flashCol, bold: true });
    }

    // Mistake dots
    for (var mi = 0; mi < MAX_MISTAKES; mi++) {
      game.draw.circle(W / 2 - (MAX_MISTAKES - 1) * 44 + mi * 88, H * 0.955, 18, mi < mistakes ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(sorted + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.channel[0] : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnSignal();
    spawnSignal();
  });
})(game);
