// 014-neon-sweep.js
// ネオンスウィープ — 光の帯がゾーンを通る瞬間を狙う爽快感
// 操作: 光の帯がターゲットゾーンにいる間にタップ
// 成功: 1回ヒット  失敗: 3回ミス or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'NEON SWEEP';
  var HOW_TO_PLAY = 'TAP WHEN BEAM IS IN ZONE';
  var MAX_TIME = 18;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_MISS = 3;
  // 修正1: 縦トラック（全高をスイープ）
  var TRACK_X = W / 2 - 200, TRACK_W = 400, TOP = 240, BOTTOM = H - 240;
  var ZONE_Y = H / 2, ZONE_HALF = (BOTTOM - TOP) * 0.07;
  var BEAM_H = 48, BEAM_SPEED = 700;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var score, misses, timeLeft, done, beamY, beamDir, feedback, feedbackOk;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function getSpeed() { return BEAM_SPEED + score * 60; }

  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false;
    beamY = TOP; beamDir = 1; feedback = 0; feedbackOk = false;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    feedback = 0.35;
    var inZone = beamY + BEAM_H / 2 > ZONE_Y - ZONE_HALF && beamY < ZONE_Y + ZONE_HALF;
    if (inZone) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= NEEDED) finish(true);
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  function background() { game.draw.clear(C.bg); }

  function drawTrack() {
    game.draw.rect(snap(TRACK_X), TOP, TRACK_W, BOTTOM - TOP, '#0a0018');
    // ゾーン
    var inZone = beamY + BEAM_H / 2 > ZONE_Y - ZONE_HALF && beamY < ZONE_Y + ZONE_HALF;
    game.draw.rect(snap(TRACK_X), snap(ZONE_Y - ZONE_HALF), TRACK_W, snap(ZONE_HALF * 2), C.b, inZone ? 0.5 : 0.25);
    game.draw.rect(snap(TRACK_X), snap(ZONE_Y - ZONE_HALF), TRACK_W, 8, C.b);
    game.draw.rect(snap(TRACK_X), snap(ZONE_Y + ZONE_HALF), TRACK_W, 8, C.b);
    // ビーム
    game.draw.rect(snap(TRACK_X), snap(beamY), TRACK_W, BEAM_H, C.a);
    game.draw.rect(snap(TRACK_X), snap(beamY) + 16, TRACK_W, 12, C.g, 0.6);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      beamY = TOP + (Math.sin(game.time.elapsed * 1.5) * 0.5 + 0.5) * (BOTTOM - TOP - BEAM_H);
      drawTrack();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.21, 40, C.e);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      beamY += beamDir * getSpeed() * dt;
      if (beamY >= BOTTOM - BEAM_H) { beamY = BOTTOM - BEAM_H; beamDir = -1; }
      if (beamY <= TOP) { beamY = TOP; beamDir = 1; }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawTrack();
    if (feedback > 0) {
      if (feedbackOk) txt('HIT!', W / 2, ZONE_Y - 120, 80, C.b);
      else txt('MISS', W / 2, beamY - 60, 72, C.a);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    txt(score + ' / ' + NEEDED, W / 2, H - 100, 56, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
