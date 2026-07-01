// 044-spiral-run.js
// スパイラルラン — らせん状に落下する玉を中心へ導く
// 操作: タップで落下速度を一時的に遅くする
// 成功: 中心まで到達  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'SPIRAL RUN';
  var HOW_TO_PLAY = 'TAP TO SLOW THE DESCENT';
  var MAX_TIME = 20;
  var SPIRAL_LOOPS = 2;     // 修正2: 5 → 2 で易化
  var OUTER_R = 420, INNER_R = 60, cx = W / 2, cy = H * 0.46;   // 修正1: 大きく縦中央
  var MAX_T = SPIRAL_LOOPS * Math.PI * 2;
  var SLOW_SPEED = 0.5, NORMAL_SPEED = 1.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var t, isSlow, done, timeLeft, trail;

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

  function getPos(t2) {
    var r = OUTER_R - (OUTER_R - INNER_R) * (t2 / MAX_T), a = t2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }
  function initGame() { t = 0; isSlow = false; done = false; timeLeft = MAX_TIME; trail = []; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : Math.floor(t / MAX_T * 100) * 5;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    isSlow = !isSlow; game.audio.play('se_tap', 0.5);
  });

  // 世界観: 渦巻く時空のトンネルを中心のコアへ降下していく。
  function background() {
    game.draw.clear('#0a0018');
    // らせんの軌道（ドット）
    var SEGS = 160;
    for (var s = 0; s < SEGS; s++) {
      var p = getPos((s / SEGS) * MAX_T), ahead = (s / SEGS) * MAX_T >= t;
      game.draw.rect(snap(p.x) - 6, snap(p.y) - 6, 12, 12, ahead ? C.d : '#2a1040', ahead ? 0.7 : 0.4);
    }
    // 中心コア
    drawPixelCircle(cx, cy, INNER_R, C.b, 0.8);
    drawPixelCircle(cx, cy, INNER_R * 0.5, C.g, 0.6);
  }

  function drawPod(x, y) {
    var bx = snap(x), by = snap(y);
    drawPixelCircle(bx, by, 40, C.c, 1);              // 本体
    game.draw.rect(bx - 16, by - 8, 32, 16, C.e);     // 窓
    game.draw.rect(bx - 8, by + 32, 16, 16, isSlow ? C.d : C.f);  // スラスター
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (t === undefined) initGame();
      background();
      drawPod(getPos((game.time.elapsed * 1.2) % MAX_T).x, getPos((game.time.elapsed * 1.2) % MAX_T).y);
      txt(GAME_TITLE,  W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 42, '#888888');
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
      t += (isSlow ? SLOW_SPEED : NORMAL_SPEED) * dt;
      if (t >= MAX_T) { t = MAX_T; finish(true); return; }
      var p = getPos(t); trail.unshift({ x: p.x, y: p.y }); if (trail.length > 10) trail.pop();
    }

    // ---- draw ----
    background();
    for (var tr = 0; tr < trail.length; tr++) {
      var ta = (1 - tr / trail.length) * 0.5;
      game.draw.rect(snap(trail[tr].x) - 8, snap(trail[tr].y) - 8, 16, 16, C.f, ta);
    }
    var bp = getPos(t);
    drawPod(bp.x, bp.y);
    timeBar();
    txt('DEPTH ' + Math.floor(t / MAX_T * 100) + '%', W / 2, 96, 48, C.b);
    txt(isSlow ? 'SLOW' : 'TAP TO SLOW!', W / 2, H - 100, 48, isSlow ? C.d : C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
