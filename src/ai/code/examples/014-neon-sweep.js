// 014-neon-sweep.js
// ネオンスウィープ — 光の帯がゾーンを通る瞬間を狙う爽快感
// 操作: 光の帯がターゲットゾーンにいる間にタップ
// 成功: 5回ヒット  失敗: 3回ミス or 18秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#040415',
    track:    '#0a0a2e',
    zone:     '#16a34a',
    zoneHi:   '#4ade80',
    beam:     '#e879f9',
    beamHi:   '#f0abfc',
    hit:      '#22c55e',
    miss:     '#ef4444',
    ui:       '#475569'
  };

  var TRACK_Y = H * 0.5;
  var TRACK_H = 180;
  var TRACK_W = W - 80;
  var TRACK_X = 40;

  // Zone: centered, 12% of track width
  var ZONE_HALF = TRACK_W * 0.06;
  var ZONE_X = W / 2;

  // Beam
  var BEAM_W = 40;
  var beamX = TRACK_X;
  var beamDir = 1;
  var BEAM_SPEED = 560; // px/sec

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 18;
  var done = false;

  var feedback = 0;
  var feedbackOk = false;
  var hitStreak = 0;

  // Speed increases with streak and score
  function getSpeed() {
    return BEAM_SPEED + hitStreak * 30 + score * 15;
  }

  game.onTap(function(x, y) {
    if (done) return;
    feedback = 0.35;
    var inZone = beamX > ZONE_X - ZONE_HALF - BEAM_W / 2 && beamX < ZONE_X + ZONE_HALF + BEAM_W / 2;
    if (inZone) {
      score++;
      hitStreak++;
      feedbackOk = true;
      game.audio.play('se_tap', Math.min(1, 0.7 + hitStreak * 0.05));
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 20 + hitStreak * 10 + Math.ceil(timeLeft) * 4);
        }, 400);
      }
    } else {
      misses++;
      hitStreak = 0;
      feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
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

    // Move beam
    beamX += beamDir * getSpeed() * dt;
    if (beamX >= TRACK_X + TRACK_W - BEAM_W) {
      beamX = TRACK_X + TRACK_W - BEAM_W;
      beamDir = -1;
    }
    if (beamX <= TRACK_X) {
      beamX = TRACK_X;
      beamDir = 1;
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // background lines
    for (var i = 0; i < 8; i++) {
      var lineY = (game.time.elapsed * 40 + i * (H / 8)) % H;
      game.draw.rect(0, lineY, W, 1, '#0a0a3a', 0.5);
    }

    // timer bar
    var ratio = Math.max(0, timeLeft / 18);
    game.draw.rect(0, 0, W, 72, '#0a0a20');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#7c3aed' : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // score & misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 80;
      game.draw.circle(sx, 128, 24, s < score ? C.hit : '#0a0a2e');
      if (s < score) game.draw.circle(sx, 128, 14, '#ffffff80');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 64;
      game.draw.circle(mx, 196, 18, m < misses ? C.miss : '#0a0a2e');
    }

    // streak display
    if (hitStreak >= 2) {
      game.draw.text('×' + hitStreak + ' コンボ！', W / 2, 260, { size: 52, color: '#f0abfc', bold: true });
    }

    // track
    game.draw.rect(TRACK_X - 8, TRACK_Y - TRACK_H / 2 - 8, TRACK_W + 16, TRACK_H + 16, '#07073a');
    game.draw.rect(TRACK_X, TRACK_Y - TRACK_H / 2, TRACK_W, TRACK_H, C.track);

    // zone
    var zoneLeft = ZONE_X - ZONE_HALF;
    var inZoneNow = beamX > zoneLeft - BEAM_W / 2 && beamX < ZONE_X + ZONE_HALF + BEAM_W / 2;
    var zoneAlpha = inZoneNow ? 0.45 : 0.2;
    game.draw.rect(zoneLeft, TRACK_Y - TRACK_H / 2, ZONE_HALF * 2, TRACK_H, C.zone, zoneAlpha);
    game.draw.rect(zoneLeft - 4, TRACK_Y - TRACK_H / 2 - 20, 8, TRACK_H + 40, C.zoneHi, 0.8);
    game.draw.rect(ZONE_X + ZONE_HALF - 4, TRACK_Y - TRACK_H / 2 - 20, 8, TRACK_H + 40, C.zoneHi, 0.8);
    game.draw.text('⬇', ZONE_X, TRACK_Y - TRACK_H / 2 - 56, { size: 48, color: C.zoneHi, bold: true });

    // beam
    var beamGlow = 0.3 + 0.15 * Math.sin(game.time.elapsed * 12);
    game.draw.rect(beamX - 8, TRACK_Y - TRACK_H / 2 - 8, BEAM_W + 16, TRACK_H + 16, C.beamHi, beamGlow);
    game.draw.rect(beamX, TRACK_Y - TRACK_H / 2, BEAM_W, TRACK_H, C.beam);
    game.draw.rect(beamX + BEAM_W * 0.25, TRACK_Y - TRACK_H / 2, BEAM_W * 0.35, TRACK_H, C.beamHi, 0.7);

    // feedback
    if (feedback > 0) {
      var p = 1 - feedback / 0.35;
      if (feedbackOk) {
        game.draw.text('HIT!', ZONE_X, TRACK_Y - 180 - p * 60, { size: 80, color: C.hit, bold: true });
        game.draw.rect(ZONE_X - ZONE_HALF, TRACK_Y - TRACK_H / 2, ZONE_HALF * 2, TRACK_H, C.hit, (1 - p) * 0.5);
      } else {
        game.draw.text('MISS', beamX + BEAM_W / 2, TRACK_Y - 180, { size: 72, color: C.miss, bold: true });
      }
    }

    // guide
    game.draw.text('ゾーンでタップ！', W / 2, H - 180, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
  });
})(game);
