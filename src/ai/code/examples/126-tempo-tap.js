// 126-tempo-tap.js
// テンポタップ — 音楽のBPMに合わせてひたすらタップし続けるリズムの気持ちよさ
// 操作: リズムに合わせてタップ
// 成功: 30回±2フレーム以内で叩く  失敗: ズレすぎ×5 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040210',
    ring:    '#7c3aed',
    ringHi:  '#a78bfa',
    hit:     '#22c55e',
    hitOk:   '#fbbf24',
    miss:    '#ef4444',
    pulse:   '#c026d3',
    ui:      '#334155'
  };

  var BPM = 120;
  var BEAT = 60 / BPM; // seconds per beat
  var beatTimer = 0;
  var beatCount = 0;

  var taps = []; // { time, offset } where offset = deviation from nearest beat
  var totalTaps = 0;
  var goodTaps = 0;
  var GOOD_WINDOW = 0.12; // seconds
  var misses = 0;
  var maxMisses = 5;
  var needed = 30;

  var timeLeft = 30;
  var done = false;
  var tapFlash = 0;
  var tapOk = false;
  var beatFlash = 0;

  var pulseScale = 1;
  var ringR = 180;

  game.onTap(function() {
    if (done) return;
    // Find distance to nearest beat
    var tMod = beatTimer % BEAT;
    var offset = Math.min(tMod, BEAT - tMod);
    totalTaps++;

    if (offset < GOOD_WINDOW) {
      goodTaps++;
      tapOk = true;
      tapFlash = 0.25;
      game.audio.play('se_tap', 0.9);
      if (goodTaps >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        var acc = Math.round(goodTaps / totalTaps * 100);
        setTimeout(function() { game.end.success(goodTaps * 20 + acc * 5 + Math.ceil(timeLeft) * 8); }, 400);
      }
    } else {
      misses++;
      tapOk = false;
      tapFlash = 0.2;
      game.audio.play('se_failure', 0.4);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      beatTimer += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Beat pulse
    var beatPhase = (beatTimer % BEAT) / BEAT;
    pulseScale = 1 + 0.3 * Math.pow(1 - beatPhase, 2);
    beatFlash = Math.pow(1 - beatPhase, 3) * 0.5;

    if (tapFlash > 0) tapFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat pulse visual
    game.draw.circle(W/2, H*0.5, ringR * pulseScale + 20, C.ring, beatFlash * 0.3);
    game.draw.circle(W/2, H*0.5, ringR * pulseScale, C.ring, 0.5);
    game.draw.circle(W/2, H*0.5, ringR * pulseScale - 16, C.bg, 0.95);

    // Inner pulse
    var innerR = 80 * pulseScale;
    game.draw.circle(W/2, H*0.5, innerR, C.pulse, 0.4);
    game.draw.circle(W/2, H*0.5, innerR - 20, C.pulse, 0.2);

    // Tap flash
    if (tapFlash > 0) {
      game.draw.circle(W/2, H*0.5, ringR * 1.1, tapOk ? C.hit : C.miss, tapFlash * 0.4);
      game.draw.text(tapOk ? 'GOOD' : 'MISS', W/2, H*0.5, {
        size: 80, color: tapOk ? C.hit : C.miss, bold: true
      });
    }

    // Timing indicator (small arc showing window)
    var tMod2 = (beatTimer % BEAT) / BEAT;
    var angle = tMod2 * Math.PI * 2 - Math.PI / 2;
    // Ring position indicator
    var ix = W/2 + Math.cos(angle) * ringR;
    var iy = H*0.5 + Math.sin(angle) * ringR;
    game.draw.circle(ix, iy, 20, C.ringHi, 0.9);

    // Good window markers (12 o'clock ± window)
    var winAngle = (GOOD_WINDOW / BEAT) * Math.PI * 2;
    for (var wi = 0; wi <= 8; wi++) {
      var wa = -Math.PI/2 - winAngle + wi * winAngle / 4;
      var wx = W/2 + Math.cos(wa) * (ringR - 8);
      var wy = H*0.5 + Math.sin(wa) * (ringR - 8);
      game.draw.circle(wx, wy, 6, C.hit, 0.6);
    }

    // Score
    game.draw.text(goodTaps + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    // Miss dots
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W/2 + (mi-2)*52, 216, 16, mi < misses ? C.miss : '#0a0820');
    }

    game.draw.text('リズムに合わせてタップ！', W/2, H*0.88, { size: 48, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ring : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
  });
})(game);
