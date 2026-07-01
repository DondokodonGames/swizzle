// 056-rope-cut.js
// ロープカット — 正しい順序でロープを切って爆弾を解除する
// 操作: 番号順にロープをタップして切断
// 成功: 爆弾1個解除  失敗: 順序ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };
  var ROPE_COLORS = [C.e, C.a, C.f, C.d, C.g];

  var GAME_TITLE  = 'ROPE CUT';
  var HOW_TO_PLAY = 'CUT ROPES IN NUMBER ORDER';
  var MAX_TIME = 25;
  var NEEDED = 1;            // 修正2: 3 → 1
  var BOMB_X = W / 2, BOMB_Y = H * 0.46, BOMB_R = 160, ROPE_SPACING = 180;   // 修正1: 大きく縦中央

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var ropes, defused, timeLeft, done, feedback, feedbackOk, wrongFlash;

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

  function newBomb() {
    var count = 3 + Math.floor(Math.random() * 2);
    var idx = []; for (var i = 0; i < ROPE_COLORS.length; i++) idx.push(i);
    for (var s = idx.length - 1; s > 0; s--) { var r = Math.floor(Math.random() * (s + 1)); var t = idx[s]; idx[s] = idx[r]; idx[r] = t; }
    idx = idx.slice(0, count);
    var order = []; for (var j = 0; j < count; j++) order.push(j + 1);
    for (var s2 = order.length - 1; s2 > 0; s2--) { var r2 = Math.floor(Math.random() * (s2 + 1)); var t2 = order[s2]; order[s2] = order[r2]; order[r2] = t2; }
    ropes = [];
    for (var k = 0; k < count; k++) ropes.push({ colorIdx: idx[k], cutOrder: order[k], cut: false, x: W / 2 + (k - (count - 1) / 2) * ROPE_SPACING });
  }
  function initGame() { defused = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; wrongFlash = 0; newBomb(); }
  function nextExpected() { var m = 9999; for (var i = 0; i < ropes.length; i++) if (!ropes[i].cut && ropes[i].cutOrder < m) m = ropes[i].cutOrder; return m; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (defused * 300 + Math.ceil(timeLeft) * 40) : defused * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function missCut() { feedbackOk = false; feedback = 0.5; wrongFlash = 0.5; game.audio.play('se_failure', 0.7); finish(false); }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < ropes.length; i++) {
      if (!ropes[i].cut && Math.abs(x - ropes[i].x) < 90) {
        if (ropes[i].cutOrder === nextExpected()) {
          ropes[i].cut = true; game.audio.play('se_tap', 0.8);
          if (ropes.every(function(r) { return r.cut; })) { defused++; feedbackOk = true; feedback = 0.6; if (defused >= NEEDED) finish(true); else setTimeout(newBomb, 700); }
        } else missCut();
        break;
      }
    }
  });

  // 世界観: 時限爆弾の解体。導線を書かれた番号順に切って起爆を止める。
  function background() {
    game.draw.clear('#000011');
    if (wrongFlash > 0) game.draw.rect(0, 0, W, H, C.e, wrongFlash * 0.3);
    txt('DEFUSE', W / 2, H * 0.1, 40, C.b);
  }

  function drawBombScene() {
    // 導線
    for (var i = 0; i < ropes.length; i++) {
      var rp = ropes[i], top = BOMB_Y - BOMB_R - 40, bot = BOMB_Y + BOMB_R + 100, col = ROPE_COLORS[rp.colorIdx];
      if (rp.cut) {
        game.draw.line(rp.x, top, rp.x, (top + bot) / 2 - 30, col, 12);
        game.draw.line(rp.x, (top + bot) / 2 + 30, rp.x, bot, col, 12);
      } else game.draw.line(rp.x, top, rp.x, bot, col, 14);
      game.draw.rect(snap(rp.x) - 36, snap(bot + 20), 72, 72, rp.cut ? '#222244' : col);
      txt(rp.cutOrder + '', rp.x, bot + 56, 44, rp.cut ? '#555577' : C.c);
    }
    // 爆弾本体
    drawPixelCircle(BOMB_X, BOMB_Y, BOMB_R, '#333355', 1);
    drawPixelCircle(BOMB_X - 40, BOMB_Y - 40, 24, C.c, 0.4);
    game.draw.rect(snap(BOMB_X) - 6, snap(BOMB_Y - BOMB_R - 40), 12, 40, C.d);  // 導火線基部
    if (Math.floor(game.time.elapsed * 12) % 2 === 0) drawPixelCircle(BOMB_X, BOMB_Y - BOMB_R - 48, 16, C.e, 1);  // 火花
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ropes) initGame();
      background();
      drawBombScene();
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.92, 52, C.c);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
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
      if (wrongFlash > 0) wrongFlash -= dt;
    }

    // ---- draw ----
    background();
    drawBombScene();
    if (feedback > 0 && feedbackOk) txt('DEFUSED!', W / 2, H * 0.8, 80, C.f);
    timeBar();
    txt('NEXT ' + (nextExpected() === 9999 ? '-' : nextExpected()), W / 2, 96, 48, C.d);
    txt('TAP IN ORDER!', W / 2, H - 100, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
