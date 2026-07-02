// 262-ice-sculptor.js
// アイス彫刻 — 氷ブロックの四辺をスワイプで少しずつ削り、目標サイズに揃える繊細な彫刻
// 操作: 上下左右スワイプでその辺を削る（削りすぎ厳禁）
// 成功: 2体を完成  失敗: 削りすぎ or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷の彫刻室） ──
  var C = { bg:'#020510', a:'#ff4d6d', b:'#00ff9f', c:'#aef7ff', d:'#0284c7', e:'#7dd3fc', f:'#ffe600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SCULPTOR';
  var HOW_TO_PLAY = 'SWIPE EACH EDGE TO CARVE · DO NOT OVERCUT';
  var MAX_TIME = 20;
  var NEEDED   = 2;           // 修正2: 5 → 2
  var ICE_MAX = 20, CX = snap(W / 2), CY = snap(H * 0.46);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ice, target, round, timeLeft, done, chips, solved, solveTimer, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2a');
  }

  function background() { game.draw.clear(C.bg); }

  function newPuzzle() { ice = { top: ICE_MAX, right: ICE_MAX, bottom: ICE_MAX, left: ICE_MAX }; target = { top: 5 + Math.floor(Math.random() * 10), right: 5 + Math.floor(Math.random() * 10), bottom: 5 + Math.floor(Math.random() * 10), left: 5 + Math.floor(Math.random() * 10) }; solved = false; }

  function checkSolved() { var d = ['top', 'right', 'bottom', 'left']; for (var i = 0; i < 4; i++) if (Math.abs(ice[d[i]] - target[d[i]]) > 1) return false; return true; }

  function initGame() { round = 0; timeLeft = MAX_TIME; done = false; chips = []; solved = false; solveTimer = 0; fbText = ''; fbCol = C.g; fbTimer = 0; newPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 600 + Math.ceil(timeLeft) * 60) : round * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function carve(dir) {
    if (solved) return;
    var amt = 1 + Math.floor(Math.random() * 2); ice[dir] = Math.max(1, ice[dir] - amt);
    if (ice[dir] < target[dir]) { fbText = 'OVERCUT!'; fbCol = C.a; fbTimer = 0.7; game.audio.play('se_failure', 0.6); finish(false); return; }
    game.audio.play('se_tap', 0.3);
    var cd = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }[dir];
    for (var ci = 0; ci < 4; ci++) { var a = Math.atan2(cd[1], cd[0]) + game.random(-0.6, 0.6); chips.push({ x: CX + cd[0] * 100, y: CY + cd[1] * 100, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5 }); }
    if (checkSolved()) { round++; solved = true; solveTimer = 0.8; fbText = 'PERFECT!'; fbCol = C.b; fbTimer = 0.8; game.audio.play('se_success', 0.8); if (round >= NEEDED) { finish(true); return; } }
  }

  function drawIce() {
    var t = ice.top * 10, r = ice.right * 10, b = ice.bottom * 10, l = ice.left * 10;
    game.draw.rect(snap(CX - l), snap(CY - t), snap(l + r), snap(t + b), C.e, 0.35);
    game.draw.rect(snap(CX - l) + 4, snap(CY - t) + 4, snap(l + r) - 8, snap(t + b) - 8, C.c, 0.15);
    // 目標ガイド
    game.draw.rect(snap(CX - target.left * 10), CY - 300, 3, 600, C.b, 0.6); game.draw.rect(snap(CX + target.right * 10), CY - 300, 3, 600, C.b, 0.6);
    game.draw.rect(CX - 300, snap(CY - target.top * 10), 600, 3, C.b, 0.6); game.draw.rect(CX - 300, snap(CY + target.bottom * 10), 600, 3, C.b, 0.6);
    var dirs = ['top', 'right', 'bottom', 'left'], pos = [{ x: CX, y: CY - t - 50 }, { x: CX + r + 80, y: CY }, { x: CX, y: CY + b + 50 }, { x: CX - l - 80, y: CY }];
    for (var i = 0; i < 4; i++) { var diff = ice[dirs[i]] - target[dirs[i]]; txt(ice[dirs[i]] + '>' + target[dirs[i]], pos[i].x, pos[i].y, 32, diff <= 1 ? C.b : C.c); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || fbTimer > 0.1) return;
    var c = { up: 'top', down: 'bottom', left: 'left', right: 'right' }[dir];
    if (c) carve(c);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ice) initGame(); background(); drawIce();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTERPIECE!' : 'SHATTERED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (solved) { solveTimer -= dt; if (solveTimer <= 0) newPuzzle(); }
      for (var ci = chips.length - 1; ci >= 0; ci--) { var c = chips[ci]; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.life -= dt; if (c.life <= 0) chips.splice(ci, 1); }
    }

    // ---- 描画 ----
    background(); drawIce();
    for (var ci2 = 0; ci2 < chips.length; ci2++) game.draw.rect(snap(chips[ci2].x) - 5, snap(chips[ci2].y) - 5, 10, 10, C.c, chips[ci2].life * 2);
    txt('SWIPE ▲ ▼ ◄ ► TO CARVE', W / 2, H - 120, 34, C.c);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.82, 54, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('SCULPTURE ' + round + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
