// 631-speed-sort.js
// スピードソート — 流れてくる数字を、しきい値より小さいか大きいかで左右に素早く振り分ける
// 操作: 左スワイプ/画面左タップで「LOW」、右で「HIGH」。しきい値と比べて正しい側へ
// 成功: 10問 正解  失敗: 3問 誤答 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、仕分け台） ──
  var C = { bg:'#040810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPEED SORT';
  var HOW_TO_PLAY = 'SWIPE OR TAP LEFT FOR LOW · RIGHT FOR HIGH · BEAT THE THRESHOLD FAST';
  var MAX_TIME = 18;
  var NEEDED    = 10;        // 修正2: 30 → 10
  var MAX_WRONG = 3;         // 修正2: 8 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentNum, threshold, correct, wrong, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, cardX, cardScale, cardVelX, animating;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < size; i += 8) { var w = size - i; if (dir === 'left') game.draw.rect(cx - size / 2 + i, cy - w / 2, 8, w, color); else game.draw.rect(cx + size / 2 - i - 8, cy - w / 2, 8, w, color); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0f20');
  }

  function background() { game.draw.clear(C.bg); }

  function nextCard() { currentNum = Math.floor(Math.random() * 99) + 1; threshold = 20 + Math.floor(Math.random() * 60); cardX = W / 2; cardScale = 1; cardVelX = 0; animating = false; }

  function initGame() { correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; nextCard(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 400 + Math.ceil(timeLeft) * 100) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function decide(dir) {
    if (animating || done) return;
    animating = true;
    var isLeft = dir === 'left', shouldLeft = currentNum < threshold, ok = isLeft === shouldLeft;
    cardVelX = isLeft ? -1200 : 1200;
    if (ok) { correct++; flash = 0.2; flashCol = C.b; resultText = 'CORRECT'; resultTimer = 0.4; game.audio.play('se_success', 0.5); if (correct >= NEEDED) { finish(true); return; } }
    else { wrong++; flash = 0.3; flashCol = C.a; resultText = 'WRONG'; resultTimer = 0.4; game.audio.play('se_failure', 0.35); if (wrong >= MAX_WRONG) { finish(false); return; } }
    setTimeout(function() { if (!done) nextCard(); }, 350);
  }

  function drawScene() {
    game.draw.rect(0, snap(H * 0.22), W / 2, snap(H * 0.62), C.e, 0.06);
    txt('< ' + threshold, W / 4, snap(H * 0.50), 56, C.e); txt('LOW', W / 4, snap(H * 0.57), 40, C.e);
    game.draw.rect(W / 2, snap(H * 0.22), W / 2, snap(H * 0.62), C.a, 0.06);
    txt('>= ' + threshold, W * 3 / 4, snap(H * 0.50), 52, C.a); txt('HIGH', W * 3 / 4, snap(H * 0.57), 40, C.a);
    game.draw.rect(snap(W / 2) - 1, snap(H * 0.22), 2, snap(H * 0.62), C.g, 0.3);
    var CW = 300 * cardScale, CH = 300 * cardScale;
    game.draw.rect(snap(cardX - CW / 2), snap(H * 0.34), snap(CW), snap(CH), '#0f1a30', 0.95);
    game.draw.rect(snap(cardX - CW / 2), snap(H * 0.34), snap(CW), 16, C.c, 0.5);
    txt(currentNum + '', cardX, snap(H * 0.50), 120 * cardScale, C.g);
    if (!animating) { arrow(W / 2 - 200, snap(H * 0.88), 60, 'left', C.e); arrow(W / 2 + 200, snap(H * 0.88), 60, 'right', C.a); }
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || animating) return;
    if (dir === 'left' || dir === 'right') decide(dir);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || animating) return;
    decide(tx < W / 2 ? 'left' : 'right');
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (currentNum === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.76, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED FAST!' : 'MIXED UP', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (resultTimer > 0) resultTimer -= dt;
      if (animating) { cardX += cardVelX * dt; cardScale = Math.max(0.5, cardScale - dt * 2); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#0a0f20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
