// 064-lens-focus.js
// レンズフォーカス — 素早くピントを合わせて被写体をくっきり捉える撮影ゲーム
// 操作: スワイプ上下でフォーカス距離を調整、タップでシャッター
// 成功: 1枚ピントの合った写真を撮る  失敗: 5回ぼけたまま撮る or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'LENS FOCUS';
  var HOW_TO_PLAY = 'SWIPE TO FOCUS, TAP TO SHOOT';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_MISS = 5;
  var FOCUS_RANGE = 0.12, PERFECT_RANGE = 0.05;
  var VX = 100, VY = H * 0.2, VW = W - 320, VH = H * 0.5;   // 修正1: ビューファインダー拡大

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var focusPos, subjectFocus, subjectMoving, subjectVel, score, misses, timeLeft, done, feedback, feedbackText, feedbackCol, shutterFlash;

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

  function newSubject() { subjectFocus = 0.15 + Math.random() * 0.7; subjectMoving = Math.random() < 0.35; subjectVel = (Math.random() - 0.5) * 0.3; }
  function initGame() { focusPos = 0.5; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackText = ''; feedbackCol = C.g; shutterFlash = 0; newSubject(); }

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
    if (dir === 'up') focusPos = Math.min(1, focusPos + 0.12);
    else if (dir === 'down') focusPos = Math.max(0, focusPos - 0.12);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var diff = Math.abs(focusPos - subjectFocus); shutterFlash = 0.15; feedback = 0.5;
    if (diff <= FOCUS_RANGE) { score++; feedbackText = diff <= PERFECT_RANGE ? 'PERFECT!' : 'GOOD!'; feedbackCol = diff <= PERFECT_RANGE ? C.c : C.b; game.audio.play('se_tap', 1.0); if (score >= NEEDED) { finish(true); return; } newSubject(); }
    else { misses++; feedbackText = 'BLURRY!'; feedbackCol = C.a; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) finish(false); }
  });

  // 世界観: 一眼カメラのファインダー越し。被写体にピントを合わせシャッターを切る。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(VX - 12, VY - 12, VW + 24, VH + 24, '#222244');
    txt('VIEWFINDER', W / 2, VY - 44, 34, C.b);
  }

  function drawScene() {
    game.draw.rect(VX, VY, VW, VH, '#05000f');
    var diff = Math.abs(focusPos - subjectFocus), blur = Math.min(1, diff / 0.3), sharp = 1 - blur;
    var sx = VX + VW * 0.5, sy = VY + VH * 0.5;
    drawPixelCircle(sx, sy, 80 + blur * 100, C.f, blur * 0.3);   // ボケ
    drawPixelCircle(sx, sy, 80, C.f, sharp);                     // 本体
    if (sharp > 0.5) { drawPixelCircle(sx - 24, sy - 24, 16, C.g, sharp); game.draw.rect(snap(sx) - 48, snap(sy) - 2, 96, 4, C.g, sharp); }
    // ファインダー四隅（合焦で色変化）
    var cc = diff < FOCUS_RANGE ? (diff < PERFECT_RANGE ? C.c : C.b) : '#555577', L = 48;
    game.draw.rect(VX, VY, L, 6, cc); game.draw.rect(VX, VY, 6, L, cc);
    game.draw.rect(VX + VW - L, VY, L, 6, cc); game.draw.rect(VX + VW - 6, VY, 6, L, cc);
    game.draw.rect(VX, VY + VH - 6, L, 6, cc); game.draw.rect(VX, VY + VH - L, 6, L, cc);
    game.draw.rect(VX + VW - L, VY + VH - 6, L, 6, cc); game.draw.rect(VX + VW - 6, VY + VH - L, 6, L, cc);
    if (shutterFlash > 0) game.draw.rect(VX, VY, VW, VH, C.g, shutterFlash / 0.15 * 0.8);
    // フォーカススライダー（右）
    var SX = VX + VW + 40, SW = 48;
    game.draw.rect(SX, VY, SW, VH, '#05000f');
    game.draw.rect(SX - 12, snap(VY + VH * (1 - subjectFocus)) - 4, SW + 24, 8, C.f, 0.6);         // 被写体位置
    game.draw.rect(SX, snap(VY + VH * (1 - (subjectFocus + FOCUS_RANGE))), SW, snap(VH * FOCUS_RANGE * 2), C.b, 0.2); // 合焦帯
    game.draw.rect(SX - 8, snap(VY + VH * (1 - focusPos)) - 6, SW + 16, 12, C.e);                  // 現在フォーカス
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (focusPos === undefined) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.76, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.82, 34, C.b);
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
      if (subjectMoving) { subjectFocus += subjectVel * dt; if (subjectFocus > 0.85 || subjectFocus < 0.15) subjectVel = -subjectVel; }
      if (feedback > 0) feedback -= dt;
      if (shutterFlash > 0) shutterFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackText, W / 2, VY + VH + 80, 80, feedbackCol);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 2) * 56 - 16, 150, 32, 32, m < misses ? C.a : '#330011');
    txt(subjectMoving ? 'MOVING TARGET!' : 'SWIPE TO FOCUS!', W / 2, H - 90, 44, subjectMoving ? C.f : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
