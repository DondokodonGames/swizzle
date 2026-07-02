// 250-wire-cut.js
// ワイヤーカット — 爆弾解除、赤いワイヤーだけをスワイプで切る。他の色を切れば即爆発
// 操作: スワイプでワイヤーを切る（赤だけ）
// 成功: 赤ワイヤーを2本切る  失敗: 他色を切る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆弾解除） ──
  var C = { bg:'#0a0800', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WIRE = [
    { col: C.a, name: 'RED', correct: true },
    { col: C.e, name: 'BLUE', correct: false },
    { col: C.c, name: 'YEL', correct: false },
    { col: C.g, name: 'WHT', correct: false }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIRE CUT';
  var HOW_TO_PLAY = 'SWIPE TO CUT ONLY THE RED WIRES';
  var MAX_TIME = 15;
  var NEEDED   = 2;           // 修正2: 5 → 2
  var WIRE_COUNT = 6, TOP = 240;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var wires, cutCount, timeLeft, done, sparks, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pline(x1, y1, x2, y2, color, alpha) {
    var len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 10));
    for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + (x2 - x1) * i / n) - 5, snap(y1 + (y2 - y1) * i / n) - 5, 10, 10, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1a00');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(snap(W * 0.06), TOP, snap(W * 0.88), snap(H * 0.62), '#1a1408', 0.9);
    game.draw.rect(snap(W * 0.06), TOP, snap(W * 0.12), snap(H * 0.62), '#0f0c04', 0.9);
    game.draw.rect(snap(W * 0.82), TOP, snap(W * 0.12), snap(H * 0.62), '#0f0c04', 0.9);
  }

  function initWires() {
    wires = [];
    var redCount = Math.max(NEEDED, 2 + Math.floor(Math.random() * 2)), assign = [];
    for (var i = 0; i < redCount; i++) assign.push(0);
    while (assign.length < WIRE_COUNT) assign.push(1 + Math.floor(Math.random() * 3));
    for (var j = assign.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = assign[j]; assign[j] = assign[k]; assign[k] = t; }
    for (var wi = 0; wi < WIRE_COUNT; wi++) {
      var y = snap(TOP + 80 + wi * ((H * 0.62 - 140) / (WIRE_COUNT - 1)));
      wires.push({ color: WIRE[assign[wi]], x1: snap(W * 0.1), y1: y, mx: snap(W * 0.3 + Math.random() * W * 0.4), my: snap(y + game.random(-30, 30)), x2: snap(W * 0.9), y2: y, cut: false, cx: 0, cy: 0 });
    }
  }

  function initGame() { initWires(); cutCount = 0; timeLeft = MAX_TIME; done = false; sparks = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cutCount * 500 + Math.ceil(timeLeft) * 80) : cutCount * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawWires() {
    for (var wi = 0; wi < wires.length; wi++) {
      var w = wires[wi];
      if (!w.cut) { pline(w.x1, w.y1, w.mx, w.my, w.color.col, 0.95); pline(w.mx, w.my, w.x2, w.y2, w.color.col, 0.95); }
      else { pline(w.x1, w.y1, w.cx - 18, w.cy, '#556', 0.7); pline(w.cx + 18, w.cy, w.x2, w.y2, '#556', 0.7); }
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || x1 === undefined) return;
    var sdx = x2 - x1, sdy = y2 - y1, slen = Math.hypot(sdx, sdy); if (slen < 1) return;
    for (var wi = 0; wi < wires.length; wi++) {
      var w = wires[wi]; if (w.cut) continue;
      var proj = ((w.mx - x1) * sdx + (w.my - y1) * sdy) / slen, perp = Math.abs((w.mx - x1) * sdy - (w.my - y1) * sdx) / slen;
      if (perp < 34 && proj >= 0 && proj <= slen) {
        w.cut = true; w.cx = w.mx; w.cy = w.my;
        if (w.color.correct) { cutCount++; fbText = 'RED CUT!'; fbCol = C.b; fbTimer = 0.6; game.audio.play('se_success', 0.7); for (var si = 0; si < 8; si++) { var a = Math.random() * Math.PI * 2; sparks.push({ x: w.cx, y: w.cy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.c }); } if (cutCount >= NEEDED) { finish(true); return; } }
        else { fbText = 'WRONG WIRE!'; fbCol = C.a; fbTimer = 0.8; for (var si2 = 0; si2 < 20; si2++) { var a2 = Math.random() * Math.PI * 2; sparks.push({ x: w.cx, y: w.cy, vx: Math.cos(a2) * 350, vy: Math.sin(a2) * 350, life: 0.8, col: C.a }); } finish(false); return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!wires) initGame(); background(); drawWires();
      txt(GAME_TITLE, W / 2, H * 0.15, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.21, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEFUSED!' : 'BOOM!', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
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
      for (var si = sparks.length - 1; si >= 0; si--) { var s = sparks[si]; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; s.life -= dt; if (s.life <= 0) sparks.splice(si, 1); }
    }

    // ---- 描画 ----
    background(); drawWires();
    for (var si2 = 0; si2 < sparks.length; si2++) game.draw.rect(snap(sparks[si2].x) - 5, snap(sparks[si2].y) - 5, 10, 10, sparks[si2].col, sparks[si2].life * 1.6);
    txt('CUT THE RED WIRES', W / 2, H * 0.18, 40, C.a);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.90, 48, fbCol);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, timeLeft < 5 ? C.a : C.g);
    txt(cutCount + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
