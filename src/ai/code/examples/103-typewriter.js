// 103-typewriter.js
// タイプライター — スワイプでパネルを選びタップで文字を打ち、単語を綴る入力端末
// 操作: 4方向スワイプで文字パネルを選び、タップで文字を確定
// 成功: 1単語入力  失敗: 3回ミス or 40秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  var GAME_TITLE  = 'TYPEWRITER';
  var HOW_TO_PLAY = 'SWIPE A PANEL, TAP THE LETTER';
  var MAX_TIME = 40;
  var NEEDED = 1;           // 修正2: 8 → 1
  var MAX_MISS = 3;

  var PANELS = { up: ['A', 'E', 'I'], right: ['O', 'U', 'T'], down: ['N', 'S', 'R'], left: ['L', 'H', 'M'] };
  var PANEL_LABEL = { up: 'UP', right: 'RIGHT', down: 'DOWN', left: 'LEFT' };
  var WORDS = ['SUN', 'STAR', 'MOON', 'RAIN', 'LION', 'ROSE', 'IRON', 'HERO'];
  var PANEL_Y = H * 0.62, SLOT_W = W / 3, SLOT_H = 200;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var word, targetIdx, activePanel, score, misses, timeLeft, done, feedback, feedbackOk;

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

  function wordHasLetters(w) { for (var i = 0; i < w.length; i++) { var found = false; for (var dir in PANELS) if (PANELS[dir].indexOf(w[i]) >= 0) found = true; if (!found) return false; } return true; }
  function pickWord() { var ok = WORDS.filter(wordHasLetters); return ok[Math.floor(Math.random() * ok.length)]; }
  function nextWord() { if (state !== S.PLAYING || done) return; word = pickWord(); targetIdx = 0; activePanel = null; }
  function targetChar() { return word[targetIdx] || ''; }
  function findPanel(ch) { for (var dir in PANELS) { var p = PANELS[dir]; for (var i = 0; i < p.length; i++) if (p[i] === ch) return { dir: dir, pos: i }; } return null; }

  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; nextWord(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (PANELS[dir]) { activePanel = dir; game.audio.play('se_tap', 0.3); }
  });
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !activePanel) return;
    var slot = -1;
    if (ty > PANEL_Y - SLOT_H / 2 && ty < PANEL_Y + SLOT_H / 2) { if (tx < SLOT_W) slot = 0; else if (tx < SLOT_W * 2) slot = 1; else slot = 2; }
    if (slot < 0) { activePanel = null; return; }
    var ch = PANELS[activePanel][slot];
    if (ch === targetChar()) {
      targetIdx++; feedbackOk = true; feedback = 0.2; game.audio.play('se_tap', 0.8); activePanel = null;
      if (targetIdx >= word.length) { score++; game.audio.play('se_success'); if (score >= NEEDED) { finish(true); return; } setTimeout(nextWord, 400); }
    } else { misses++; feedbackOk = false; feedback = 0.4; activePanel = null; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // 世界観: レトロ入力端末。スワイプで文字パネルを呼び出しタップで綴る。
  function background() {
    game.draw.clear('#001100');
    game.draw.rect(120, snap(H * 0.18), W - 240, 200, '#002200');
    game.draw.rect(120, snap(H * 0.18), W - 240, 12, C.d);
    txt('INPUT TERMINAL', W / 2, 250, 34, C.b);
  }

  function drawWord() {
    var wy = H * 0.28;
    for (var ci = 0; ci < word.length; ci++) {
      var cx = W / 2 + (ci - (word.length - 1) / 2) * 120, typed = ci < targetIdx, next = ci === targetIdx;
      game.draw.rect(snap(cx) - 48, snap(wy) - 52, 96, 100, typed ? '#003300' : (next ? '#004400' : '#001a00'));
      txt(word[ci], cx, wy, 76, typed ? C.a : (next ? C.e : C.d));
    }
    var nc = targetChar(), loc = nc && findPanel(nc);
    if (loc) txt('SWIPE ' + PANEL_LABEL[loc.dir] + ' FOR "' + nc + '"', W / 2, H * 0.4, 40, C.b);
  }

  function drawPanels() {
    var dirs = ['up', 'right', 'down', 'left'], dx = [W / 2, W * 0.82, W / 2, W * 0.18], dy = [H * 0.5, H * 0.55, H * 0.6, H * 0.55];
    for (var di = 0; di < dirs.length; di++) {
      var dir = dirs[di], act = activePanel === dir;
      game.draw.rect(snap(dx[di]) - 70, snap(dy[di]) - 40, 140, 80, act ? '#004400' : '#002200');
      txt(PANEL_LABEL[dir], dx[di], dy[di] - 12, 24, act ? C.a : C.d);
      txt(PANELS[dir].join(''), dx[di], dy[di] + 16, 24, act ? C.b : C.d);
    }
    if (activePanel) {
      var nc = targetChar();
      for (var si = 0; si < 3; si++) {
        var sx = SLOT_W * si + SLOT_W / 2;
        game.draw.rect(SLOT_W * si + 8, snap(PANEL_Y - SLOT_H / 2), SLOT_W - 16, SLOT_H, '#002a00');
        game.draw.rect(SLOT_W * si + 8, snap(PANEL_Y - SLOT_H / 2), SLOT_W - 16, 8, C.d, 0.6);
        txt(PANELS[activePanel][si], sx, PANEL_Y, 96, PANELS[activePanel][si] === nc ? C.e : C.a);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!word) initGame();
      background();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.a);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 28, C.b);
      drawPanels();
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.e);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WORD DONE!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawWord();
    drawPanels();
    if (feedback > 0) txt(feedbackOk ? 'OK' : 'X', W * 0.88, H * 0.28, 72, feedbackOk ? C.a : C.f);
    timeBar();
    txt('LETTER ' + targetIdx + ' / ' + word.length, W / 2, 96, 40, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.f : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
