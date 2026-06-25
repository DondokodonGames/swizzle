// 093-echo-tap.js
// エコータップ — リズムパターンを聞いて同じリズムで叩き返すドラマーの快感
// 操作: タップでリズムを再現する
// 成功: 5パターン完璧に再現  失敗: 3回タイミングミス or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080410',
    drum:    '#7c3aed',
    drumHi:  '#a78bfa',
    beat:    '#f97316',
    beatHi:  '#fed7aa',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var PATTERNS = [
    [0, 0.5, 1.0],             // 3 beats
    [0, 0.33, 0.66, 1.0],      // 4 even
    [0, 0.25, 0.75, 1.0],      // syncopated
    [0, 0.5, 0.75, 1.25, 1.5], // double at end
    [0, 0.4, 0.8, 1.0, 1.4]   // irregular
  ];

  var BEAT_UNIT = 0.5; // base time unit in seconds
  var TOLERANCE = 0.18; // seconds of acceptable timing error

  var phase = 'listen'; // 'listen' | 'replay' | 'feedback'
  var patternIdx = 0;
  var currentPattern = [];
  var playbackTimer = 0;
  var playbackBeat = 0; // which beat we're playing back

  var playerBeats = []; // timestamps of player taps (relative to replay start)
  var replayStartTime = 0;
  var replayTimer = 0;
  var maxReplayTime = 0;

  var score = 0;
  var needed = PATTERNS.length;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 50;
  var done = false;

  var feedback = 0;
  var feedbackOk = false;
  var drumFlash = 0;
  var replayDrumFlash = 0;

  // Visual beat markers
  var beatMarkers = []; // { time, alpha }

  function loadPattern() {
    currentPattern = PATTERNS[patternIdx];
    var lastBeat = currentPattern[currentPattern.length - 1];
    maxReplayTime = (lastBeat + 1.0) * BEAT_UNIT;
    phase = 'listen';
    playbackTimer = 0;
    playbackBeat = 0;
    playerBeats = [];
    beatMarkers = [];
    replayTimer = 0;
  }

  function evaluateReplay() {
    // For each beat in pattern, find closest player tap
    var correctCount = 0;
    var used = new Array(playerBeats.length).fill(false);

    for (var i = 0; i < currentPattern.length; i++) {
      var expected = currentPattern[i] * BEAT_UNIT;
      var best = -1, bestDiff = TOLERANCE + 1;
      for (var j = 0; j < playerBeats.length; j++) {
        if (used[j]) continue;
        var diff = Math.abs(playerBeats[j] - expected);
        if (diff < bestDiff) { bestDiff = diff; best = j; }
      }
      if (best >= 0 && bestDiff <= TOLERANCE) {
        correctCount++;
        used[best] = true;
      }
    }

    var allCorrect = correctCount === currentPattern.length;
    // Also penalize extra taps (more than 1 extra = miss)
    var extraTaps = playerBeats.length - correctCount;
    if (extraTaps > 1) allCorrect = false;

    return allCorrect;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'replay') {
      var elapsed = game.time.elapsed - replayStartTime;
      playerBeats.push(elapsed);
      replayDrumFlash = 0.1;
      game.audio.play('se_tap', 0.9);
    } else if (phase === 'listen') {
      // Tapping during listen is ignored (maybe with light visual)
      game.draw && game.audio.play('se_tap', 0.2);
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

    if (phase === 'listen') {
      playbackTimer += dt;
      // Play beat markers
      if (playbackBeat < currentPattern.length) {
        var beatTime = currentPattern[playbackBeat] * BEAT_UNIT;
        if (playbackTimer >= beatTime) {
          drumFlash = 0.15;
          beatMarkers.push({ time: 0, x: W * 0.3 + playbackBeat * 80, alpha: 1 });
          game.audio.play('se_tap', 0.8);
          playbackBeat++;
        }
      }
      // After pattern played + extra time, switch to replay
      var lastBeat = currentPattern[currentPattern.length - 1] * BEAT_UNIT;
      if (playbackTimer > lastBeat + 0.8) {
        phase = 'replay';
        replayStartTime = game.time.elapsed;
        replayTimer = 0;
      }
    } else if (phase === 'replay') {
      replayTimer += dt;
      // End of replay window
      if (replayTimer >= maxReplayTime + 0.4) {
        phase = 'feedback';
        var ok = evaluateReplay();
        feedbackOk = ok;
        feedback = 0.8;
        if (ok) {
          score++;
          game.audio.play('se_success');
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 10); }, 900);
            return;
          }
        } else {
          misses++;
          game.audio.play('se_failure', 0.7);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 900);
            return;
          }
        }
        setTimeout(function() {
          if (!done) {
            patternIdx = (patternIdx + 1) % PATTERNS.length;
            loadPattern();
          }
        }, 1000);
      }
    }

    if (drumFlash > 0) drumFlash -= dt;
    if (replayDrumFlash > 0) replayDrumFlash -= dt;
    if (feedback > 0) feedback -= dt;

    for (var m = 0; m < beatMarkers.length; m++) {
      beatMarkers[m].time += dt;
      beatMarkers[m].alpha = Math.max(0, 1 - beatMarkers[m].time / 0.6);
    }
    beatMarkers = beatMarkers.filter(function(m) { return m.alpha > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Drum pad (center)
    var drumR = 180;
    var drumCX = W / 2, drumCY = H * 0.45;
    var flash = phase === 'listen' ? drumFlash : replayDrumFlash;
    game.draw.circle(drumCX, drumCY, drumR + 12, C.drumHi, flash * 0.5);
    game.draw.circle(drumCX, drumCY, drumR, C.drum);
    game.draw.circle(drumCX, drumCY, drumR * 0.7, C.drumHi, 0.15);
    game.draw.circle(drumCX - 40, drumCY - 40, drumR * 0.2, '#fff', 0.12);
    if (phase === 'replay') {
      game.draw.text('↓ TAP', drumCX, drumCY, { size: 52, color: '#fff', bold: true });
    } else if (phase === 'listen') {
      game.draw.text('聞け！', drumCX, drumCY, { size: 52, color: C.beatHi, bold: true });
    }

    // Pattern visualization (timeline)
    var timelineY = H * 0.28;
    var timelineW = 700;
    var timelineX = (W - timelineW) / 2;
    game.draw.rect(timelineX, timelineY - 4, timelineW, 8, '#1e1030');
    // Mark pattern beats
    var lastT = currentPattern[currentPattern.length - 1] * BEAT_UNIT;
    for (var bi = 0; bi < currentPattern.length; bi++) {
      var bx = timelineX + (currentPattern[bi] * BEAT_UNIT / lastT) * timelineW;
      game.draw.circle(bx, timelineY, 20, C.beat, 0.8);
    }
    // Playback cursor
    if (phase === 'listen') {
      var cursor = (playbackTimer / (lastT + 0.8)) * timelineW;
      game.draw.rect(timelineX + cursor - 3, timelineY - 24, 6, 48, '#fff', 0.7);
    } else if (phase === 'replay') {
      var rcursor = (replayTimer / maxReplayTime) * timelineW;
      game.draw.rect(timelineX + Math.min(rcursor, timelineW) - 3, timelineY - 24, 6, 48, C.beatHi, 0.7);
      // Player beat marks
      for (var pb = 0; pb < playerBeats.length; pb++) {
        var pbx = timelineX + (playerBeats[pb] / lastT) * timelineW;
        game.draw.circle(Math.min(pbx, timelineX + timelineW), timelineY, 14, C.correct, 0.8);
      }
    }

    // Phase label
    game.draw.text(phase === 'listen' ? 'リズムを聞いて…' : (phase === 'replay' ? '今！再現して！' : ''), W / 2, H * 0.22, {
      size: 44, color: phase === 'listen' ? C.beatHi : C.correct
    });

    // Feedback
    if (feedback > 0 && phase === 'feedback') {
      game.draw.text(feedbackOk ? '完璧！' : 'ズレた…', W / 2, H * 0.65, {
        size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score + misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 100;
      game.draw.circle(sx, 136, 30, s < score ? C.correct : '#100820');
    }
    for (var ms = 0; ms < maxMisses; ms++) {
      var mx = W / 2 + (ms - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mx, 200, 20, ms < misses ? C.wrong : '#100820');
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, '#080410');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.drum : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    loadPattern();
  });
})(game);
