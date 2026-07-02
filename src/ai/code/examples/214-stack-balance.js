// 214-stack-balance.js
// スタックバランス — 傾いていくタワーを左右タップで立て直しながらブロックを積み上げる綱渡り
// 操作: 左タップで右へ、右タップで左へ立て直す
// 成功: 3個積む  失敗: 傾きが限界を超える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、建設現場） ──
  var C = { bg:'#0a0a14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STACK BALANCE';
  var HOW_TO_PLAY = 'TAP ◄ RIGHT · LEFT ► TO STEADY THE TOWER';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var BW = 200, BH = 88, GX = snap(W / 2), GY = snap(H - 220);
  var TILT_MAX = 0.45, TAP_CORRECT = 0.16;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var blocks, tilt, tiltVel, timeLeft, done, dropTimer, dropping, feedback;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a2a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, GY + BH / 2, W, H - GY - BH / 2, C.d, 0.5); }

  function drawTower() {
    var danger = Math.abs(tilt) / TILT_MAX, col = danger > 0.7 ? C.a : danger > 0.4 ? C.f : C.e;
    for (var bi = 0; bi < blocks.length; bi++) {
      var bx = GX + Math.sin(tilt) * bi * BH + Math.sin(game.time.elapsed * 3 + bi) * Math.abs(tilt) * 20;
      var by = GY - bi * BH;
      game.draw.rect(snap(bx) - BW / 2, snap(by) - BH / 2, BW, BH, col, 0.9);
      game.draw.rect(snap(bx) - BW / 2, snap(by) - BH / 2, BW, 8, C.g, 0.4);
      game.draw.rect(snap(bx) - BW / 2, snap(by) - BH / 2, 8, BH, C.g, 0.25);
    }
  }

  function initGame() { blocks = [{}]; tilt = 0; tiltVel = 0; timeLeft = MAX_TIME; done = false; dropTimer = 1.2; dropping = null; feedback = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (blocks.length * 400 + Math.ceil(timeLeft) * 50) : blocks.length * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    tiltVel += (x < W / 2 ? TAP_CORRECT : -TAP_CORRECT);
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); blocks = [{}, {}, {}]; tilt = Math.sin(game.time.elapsed) * 0.15; drawTower();
      txt(GAME_TITLE, W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.52, 40, '#555577');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STACKED!' : 'TOPPLED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      var sway = 0.008 * (1 + blocks.length * 0.2);
      tiltVel += sway * (Math.random() - 0.5) * dt * 60;
      tilt += tiltVel * dt; tiltVel *= 0.96;
      if (Math.abs(tilt) > TILT_MAX) { finish(false); return; }
      if (dropping) {
        dropping.y += 700 * dt;
        var landY = GY - blocks.length * BH;
        if (dropping.y >= landY) { dropping = null; blocks.push({}); feedback = 0.4; game.audio.play('se_success', 0.5); if (blocks.length >= NEEDED) { finish(true); return; } dropTimer = 1.6 + Math.random() * 0.6; }
      } else { dropTimer -= dt; if (dropTimer <= 0) dropping = { x: W / 2 + game.random(-160, 160), y: 220 }; }
    }

    // ---- 描画 ----
    background(); drawTower();
    if (dropping) { game.draw.rect(snap(dropping.x) - BW / 2, snap(dropping.y) - BH / 2, BW, BH, C.c, 0.7); game.draw.rect(snap(dropping.x) - BW / 2, snap(dropping.y) - BH / 2, BW, 8, C.g, 0.5); }

    // 傾きメーター
    var danger = Math.abs(tilt) / TILT_MAX, mc = danger > 0.7 ? C.a : danger > 0.4 ? C.f : C.b;
    game.draw.rect(snap(W / 2) - 200, snap(H * 0.30), 400, 28, C.d, 0.4);
    var needle = snap(W / 2 + (tilt / TILT_MAX) * 200);
    game.draw.rect(needle - 8, snap(H * 0.30) - 8, 16, 44, mc);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(blocks.length + ' / ' + NEEDED, W / 2, 168, 52, C.b);
    txt('TAP ◄ ►', W / 2, H * 0.36, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
