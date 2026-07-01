// 111-memory-lights.js
// 記憶の光 — 光ったパネルの順番を覚えてそのまま再現する記憶ゲーム
// 操作: タップでパネルを選択
// 成功: レベル2をクリア  失敗: 順番を間違える or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  var GAME_TITLE  = 'MEMORY LIGHTS';
  var HOW_TO_PLAY = 'WATCH, THEN REPEAT THE PATTERN';
  var MAX_TIME = 30;
  var WIN_LEVEL = 2;        // 修正2: 7 → 2
  var COLS = 3, ROWS = 3, CELL = 260, GAP = 24;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP, GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2, GRID_Y = (H - GRID_H) / 2;
  var SHOW_ON = 0.5, SHOW_OFF = 0.25;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var sequence, playerSeq, level, phase, showIndex, showTimer, litPanel, feedbackTimer, feedbackOk, timeLeft, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#003b00');
  }

  function cellRect(idx) { var col = idx % COLS, row = Math.floor(idx / COLS); return { x: GRID_X + col * (CELL + GAP), y: GRID_Y + row * (CELL + GAP), w: CELL, h: CELL }; }
  function startLevel() { if (state !== S.PLAYING || done) return; sequence.push(Math.floor(Math.random() * (COLS * ROWS))); playerSeq = []; phase = 'show'; showIndex = 0; showTimer = SHOW_ON; litPanel = sequence[0]; game.audio.play('se_tap', 0.4); }
  function initGame() { sequence = []; playerSeq = []; level = 1; phase = 'show'; showIndex = 0; showTimer = SHOW_ON; litPanel = -1; feedbackTimer = 0; feedbackOk = false; timeLeft = MAX_TIME; done = false; startLevel(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : (level - 1) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, 800);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'input') return;
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = cellRect(i);
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
        litPanel = i; playerSeq.push(i);
        if (i !== sequence[playerSeq.length - 1]) { feedbackOk = false; feedbackTimer = 0.8; phase = 'feedback'; finish(false); return; }
        game.audio.play('se_tap', 0.6);
        if (playerSeq.length === sequence.length) {
          level++; feedbackOk = true; feedbackTimer = 0.7; phase = 'feedback';
          if (level > WIN_LEVEL) { finish(true); return; }
          game.audio.play('se_success'); setTimeout(startLevel, 900);
        }
        return;
      }
    }
  });

  // 世界観: 記憶テスト装置。光ったパネル列を記憶し同じ順にタップする。
  function background() {
    game.draw.clear('#001100');
    game.draw.rect(snap(GRID_X) - 20, snap(GRID_Y) - 20, GRID_W + 40, GRID_H + 40, '#002200');
    txt('MEMORY UNIT', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = cellRect(i), isLit = i === litPanel;
      game.draw.rect(snap(r.x), snap(r.y), r.w, r.h, isLit ? C.a : '#002a00');
      if (isLit) { game.draw.rect(snap(r.x), snap(r.y), r.w, 10, C.g); game.draw.rect(snap(r.x), snap(r.y), 10, r.h, C.g); }
      else game.draw.rect(snap(r.x), snap(r.y), r.w, 6, C.d, 0.5);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) { sequence = []; litPanel = -1; }
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.a);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 64, C.e);
        txt('TAP TO START', W / 2, H * 0.87, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#448844');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEAR!' : 'GAME OVER', W / 2, H * 0.35, 84, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'show') {
        showTimer -= dt;
        if (showTimer <= 0) {
          if (litPanel >= 0) { litPanel = -1; showTimer = SHOW_OFF; }
          else { showIndex++; if (showIndex >= sequence.length) { phase = 'input'; litPanel = -1; } else { litPanel = sequence[showIndex]; showTimer = SHOW_ON; game.audio.play('se_tap', 0.4); } }
        }
      }
      if (feedbackTimer > 0) feedbackTimer -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedbackTimer > 0) txt(feedbackOk ? 'GOOD!' : 'WRONG!', W / 2, H * 0.16, 80, feedbackOk ? C.a : C.f);
    timeBar();
    txt('LEVEL ' + level + ' / ' + WIN_LEVEL, W / 2, 96, 44, C.c);
    txt(phase === 'show' ? 'WATCH...' : (phase === 'input' ? 'REPEAT!' : ''), W / 2, H - 90, 48, phase === 'input' ? C.a : C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    sequence = []; litPanel = -1;
  });
})(game);
