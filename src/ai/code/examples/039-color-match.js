// 039-color-match.js
// カラーマッチ — 混色で目標カラーを作る色彩感覚ゲーム
// 操作: 上下スワイプで赤/青/緑の配合を変える、タップで決定
// 成功: 目標色との差異20%以内で1回マッチ  失敗: 3回外す or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'COLOR MATCH';
  var HOW_TO_PLAY = 'SWIPE TO MIX, TAP TO LOCK';
  var MAX_TIME = 25;
  var NEEDED = 1;           // 修正2: 3 → 1
  var MAX_MISS = 3;
  var STEP = 16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var values, target, selectedChannel, score, misses, timeLeft, done, feedback, feedbackOk;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function rgb(r, g, b) {
    function h(v) { return ('0' + Math.min(255, Math.max(0, Math.round(v))).toString(16)).slice(-2); }
    return '#' + h(r) + h(g) + h(b);
  }
  function colorDiff(a, b) { var dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3 * 255 * 255); }
  function newTarget() { target = [Math.floor(Math.random() * 8) * 32, Math.floor(Math.random() * 8) * 32, Math.floor(Math.random() * 8) * 32]; if (target[0] + target[1] + target[2] < 96) target[0] = 128; }
  function initGame() { values = [128, 128, 128]; selectedChannel = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; newTarget(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') values[selectedChannel] = Math.min(255, values[selectedChannel] + STEP);
    else if (dir === 'down') values[selectedChannel] = Math.max(0, values[selectedChannel] - STEP);
    else if (dir === 'right') { selectedChannel = (selectedChannel + 1) % 3; game.audio.play('se_tap', 0.4); }
    else if (dir === 'left') { selectedChannel = (selectedChannel + 2) % 3; game.audio.play('se_tap', 0.4); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || feedback > 0) return;
    feedback = 0.6;
    if (colorDiff(values, target) <= 0.18) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= NEEDED) finish(true); else setTimeout(newTarget, 650);
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  function background() { game.draw.clear(C.bg); }

  function drawPanels() {
    game.draw.rect(W * 0.1, H * 0.26, W * 0.34, W * 0.34, rgb(target[0], target[1], target[2]));
    txt('TARGET', W * 0.27, H * 0.24, 36, C.g);
    game.draw.rect(W * 0.56, H * 0.26, W * 0.34, W * 0.34, rgb(values[0], values[1], values[2]));
    txt('CURRENT', W * 0.73, H * 0.24, 36, C.g);
    var diff = colorDiff(values, target), pct = Math.floor(diff * 100);
    txt('DIFF ' + pct + '%', W / 2, H * 0.56, 56, diff <= 0.18 ? C.b : (diff <= 0.35 ? C.c : C.a));
    var chCol = [C.a, C.b, C.e], labels = ['R', 'G', 'B'];
    for (var ch = 0; ch < 3; ch++) {
      var cx = W * (0.2 + ch * 0.3), sy = H * 0.63, sh = H * 0.2, sel = ch === selectedChannel;
      game.draw.rect(cx - (sel ? 16 : 10), sy, sel ? 32 : 20, sh, '#0a0018');
      var ty = sy + sh * (1 - values[ch] / 255);
      game.draw.rect(cx - 32, ty - 16, 64, 32, chCol[ch]);
      txt(labels[ch], cx, sy + sh + 60, sel ? 48 : 40, sel ? chCol[ch] : '#555577');
      txt('' + values[ch], cx, ty - 40, 32, C.g);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!values) initGame();
      background();
      drawPanels();
      txt(GAME_TITLE,  W / 2, H * 0.1, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 36, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.9, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 48, C.g);
      }
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
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawPanels();
    if (feedback > 0) { if (feedbackOk) txt('MATCH!', W / 2, H * 0.44, 88, C.b); else txt('OFF!', W / 2, H * 0.44, 80, C.a); }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
