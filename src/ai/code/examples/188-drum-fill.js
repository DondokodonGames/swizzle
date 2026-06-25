// 188-drum-fill.js
// ドラムフィル — 4つのパッドを曲のビートに合わせて叩き続けるリズム感テスト
// 操作: タップで4つのパッドを叩く
// 成功: 30ヒット達成  失敗: タイミングを8回外す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080408',
    pad:     ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'],
    padHi:   ['#fca5a5', '#fde68a', '#86efac', '#93c5fd'],
    hit:     '#ffffff',
    miss:    '#6b7280',
    ring:    '#1a1a2e',
    ui:      '#334155'
  };

  var BPM = 100;
  var BEAT = 60 / BPM;
  var WINDOW = 0.18; // hit window in seconds

  var PAD_R = 200;
  var PAD_POSITIONS = [
    { x: W * 0.28, y: H * 0.38 },
    { x: W * 0.72, y: H * 0.38 },
    { x: W * 0.28, y: H * 0.65 },
    { x: W * 0.72, y: H * 0.65 }
  ];

  var score = 0;
  var needed = 30;
  var misses = 0;
  var maxMisses = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;

  // Beat sequence: which pad should be hit (0-3), cycling
  var sequence = [0, 2, 1, 3, 0, 1, 2, 3, 0, 3, 1, 2];
  var beatIdx = 0;
  var nextBeatT = 0;
  var currentPad = -1;
  var padFlash = [0, 0, 0, 0];
  var padHitFlash = [0, 0, 0, 0];
  var beatWindow = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitPad = -1;
    for (var pi = 0; pi < 4; pi++) {
      var p = PAD_POSITIONS[pi];
      var dx = tx - p.x, dy = ty - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < PAD_R) { hitPad = pi; break; }
    }
    if (hitPad < 0) return;

    if (hitPad === currentPad && beatWindow > 0) {
      score++;
      padHitFlash[hitPad] = 0.3;
      game.audio.play('se_tap', 0.7);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 60 + Math.ceil(timeLeft) * 25); }, 400);
      }
    } else {
      misses++;
      game.audio.play('se_failure', 0.3);
      if (misses >= maxMisses && !done) {
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

    if (beatWindow > 0) beatWindow -= dt;

    // Advance beat
    if (elapsed >= nextBeatT) {
      currentPad = sequence[beatIdx % sequence.length];
      beatIdx++;
      beatWindow = WINDOW;
      padFlash[currentPad] = BEAT * 0.6;
      nextBeatT = elapsed + BEAT;
    }

    for (var pi = 0; pi < 4; pi++) {
      if (padFlash[pi] > 0) padFlash[pi] -= dt;
      if (padHitFlash[pi] > 0) padHitFlash[pi] -= dt;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat indicator (metronome line at top)
    var beatPhase = ((elapsed - (nextBeatT - BEAT)) / BEAT);
    var beatX = W * beatPhase;
    game.draw.rect(0, 88, W, 6, '#1a1428', 0.8);
    game.draw.rect(0, 88, beatX, 6, '#f59e0b', 0.8);

    // Pads
    for (var pi2 = 0; pi2 < 4; pi2++) {
      var p2 = PAD_POSITIONS[pi2];
      var isActive = padFlash[pi2] > 0;
      var isHit = padHitFlash[pi2] > 0;
      var baseAlpha = isActive ? 0.9 : 0.35;
      var col = C.pad[pi2];
      var hiCol = C.padHi[pi2];

      game.draw.circle(p2.x, p2.y, PAD_R + 24, col, 0.08 + (isActive ? 0.15 : 0));
      game.draw.circle(p2.x, p2.y, PAD_R, col, baseAlpha);
      game.draw.circle(p2.x, p2.y, PAD_R - 32, '#000', 0.3);
      game.draw.circle(p2.x, p2.y, PAD_R * 0.3, hiCol, isActive ? 0.6 : 0.15);

      if (isHit) {
        game.draw.circle(p2.x, p2.y, PAD_R * 1.3, C.hit, padHitFlash[pi2] * 0.4);
      }

      // Ring indicator showing when to hit
      if (isActive) {
        var ringAlpha = (padFlash[pi2] / (BEAT * 0.6)) * 0.7;
        for (var rs = 0; rs < 12; rs++) {
          var ra = (rs / 12) * Math.PI * 2;
          game.draw.circle(p2.x + Math.cos(ra) * (PAD_R + 16), p2.y + Math.sin(ra) * (PAD_R + 16), 8, hiCol, ringAlpha);
        }
      }
    }

    // Score display
    game.draw.text(score + ' / ' + needed, W / 2, H * 0.85, { size: 56, color: '#f1f5f9', bold: true });

    // Miss indicators
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 - (maxMisses - 1) * 28 + mi * 56, H * 0.91, 18, mi < misses ? '#ef4444' : '#1a1428');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    nextBeatT = 0.5; // short delay before first beat
  });
})(game);
