// 031-typebeat.js
// タイプビート — 流れてくる音符を方向スワイプで叩く音楽の快感
// 操作: 音符の矢印方向にスワイプ（ヒットゾーンに来た瞬間に）
// 成功: 2個ヒット  失敗: 4回ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'TYPE BEAT';
  var HOW_TO_PLAY = 'SWIPE THE ARROW DIRECTION';
  var MAX_TIME = 20;
  var NEEDED = 2;            // 修正2: 12 → ceil(12/10) = 2
  var MAX_MISS = 4;
  var DIRS = ['up', 'down', 'left', 'right'];
  var ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };
  var NOTE_COLORS = { up: C.e, down: C.f, left: C.b, right: C.a };
  // 修正1: 4レーンを縦全域に広げる
  var LANE_COUNT = 4, LANE_H = 280, TRACK_Y = 400, NOTE_SPEED = 480, NOTE_R = 76, HIT_ZONE_X = W * 0.16, SPAWN_X = W + 76;
  var TOTAL_TRACK_H = LANE_COUNT * LANE_H;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var notes, spawnTimer, score, misses, timeLeft, done, feedback, pendingSwipe;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function laneY(lane) { return TRACK_Y + lane * LANE_H + LANE_H / 2; }
  function spawnNote() { var lane = Math.floor(Math.random() * LANE_COUNT); notes.push({ x: SPAWN_X, lane: lane, dir: DIRS[lane], hit: false }); }
  function initGame() { notes = []; spawnTimer = 0.5; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = []; pendingSwipe = null; spawnNote(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 200 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function registerMiss(x, y) { misses++; feedback.push({ x: x, y: y, ok: false, life: 0.4 }); game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) finish(false); }

  game.onSwipe(function(dir) { if (state === S.PLAYING && !done) pendingSwipe = dir; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  function background() { game.draw.clear(C.bg); }

  function drawTrack() {
    for (var l = 0; l < LANE_COUNT; l++) {
      var ly = TRACK_Y + l * LANE_H;
      game.draw.rect(0, ly, W, LANE_H, l % 2 === 0 ? '#0a0018' : '#12002a');
      txt(ARROWS[DIRS[l]], HIT_ZONE_X, ly + LANE_H / 2, 72, NOTE_COLORS[DIRS[l]]);
    }
    game.draw.rect(snap(HIT_ZONE_X) - 4, TRACK_Y, 8, TOTAL_TRACK_H, C.d, 0.8);
    for (var n = 0; n < notes.length; n++) {
      var note = notes[n];
      drawPixelCircle(note.x, laneY(note.lane), NOTE_R, NOTE_COLORS[note.dir], 1);
      txt(ARROWS[note.dir], note.x, laneY(note.lane), 72, C.g);
    }
    for (var fb = 0; fb < feedback.length; fb++) {
      var f2 = feedback[fb];
      if (f2.ok) txt('HIT', f2.x, f2.y - 40, 60, C.b);
      else txt('×', f2.x, f2.y, 80, C.a);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!notes) initGame();
      background();
      drawTrack();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 42, '#888888');
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
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnNote(); spawnTimer = 0.6 - (MAX_TIME - timeLeft) * 0.008; }
      for (var i = notes.length - 1; i >= 0; i--) {
        var note = notes[i]; note.x -= NOTE_SPEED * dt;
        if (!note.hit && note.x < HIT_ZONE_X - NOTE_R * 1.5) { notes.splice(i, 1); registerMiss(HIT_ZONE_X, laneY(note.lane)); if (done) return; }
        else if (note.x < -NOTE_R * 2) notes.splice(i, 1);
      }
      if (pendingSwipe) {
        var dir = pendingSwipe; pendingSwipe = null;
        var best = -1, bestDist = NOTE_R * 2.5;
        for (var j = 0; j < notes.length; j++) {
          if (notes[j].hit || notes[j].dir !== dir) continue;
          var d = Math.abs(notes[j].x - HIT_ZONE_X);
          if (d < bestDist) { bestDist = d; best = j; }
        }
        if (best >= 0) {
          score++; feedback.push({ x: HIT_ZONE_X, y: laneY(notes[best].lane), ok: true, life: 0.4 }); notes.splice(best, 1);
          game.audio.play('se_tap', 0.8);
          if (score >= NEEDED) { finish(true); return; }
        } else registerMiss(HIT_ZONE_X, TRACK_Y + TOTAL_TRACK_H / 2);
        if (done) return;
      }
      for (var f = feedback.length - 1; f >= 0; f--) { feedback[f].life -= dt; if (feedback[f].life <= 0) feedback.splice(f, 1); }
    }

    // ---- draw ----
    background();
    drawTrack();
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, TRACK_Y + TOTAL_TRACK_H + 60, 52, C.b);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1.5) * 56, TRACK_Y + TOTAL_TRACK_H + 110, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.45);
    state = S.ATTRACT;
    initGame();
  });
})(game);
