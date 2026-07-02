// 349-shadow-puppets.js
// シャドーパペット — 光源をタップで動かして角度を合わせ、壁に映る影をお手本の形にそろえる
// 操作: 画面のタップした側へ光源を移動（上下左右）して一致度を上げる
// 成功: 3つの形を合わせる  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影絵の壁） ──
  var C = { bg:'#0a0805', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', wall:'#1c1510' };

  var SHAPES = [
    { name: 'RABBIT', pts: [[0,-60],[-30,-100],[-20,-120],[0,-100],[20,-120],[30,-100],[0,-60],[40,-40],[40,20],[-40,20],[-40,-40]] },
    { name: 'FISH', pts: [[-60,0],[-80,-30],[-80,30],[-60,0],[60,0],[80,-20],[60,0],[80,20],[60,0]] },
    { name: 'BIRD', pts: [[0,-20],[-80,-60],[-60,-20],[0,-20],[60,-20],[80,-60],[0,-20],[0,40],[-30,80],[30,80],[0,40]] },
    { name: 'DOG', pts: [[-40,-60],[-50,-90],[-30,-80],[0,-60],[30,-80],[50,-90],[40,-60],[60,-30],[60,20],[-60,20],[-60,-30]] }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW PUPPETS';
  var HOW_TO_PLAY = 'TAP TO MOVE THE LIGHT · MATCH THE TARGET SHAPE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var STEP = 40, TOL = 0.3, OBJ_X = snap(W * 0.34), OBJ_Y = snap(H * 0.56);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shapeIdx, lightX, lightY, targetAng, completed, timeLeft, done, particles, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1c1510');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(snap(W * 0.55), 0, snap(W * 0.45), H, C.wall, 0.9); game.draw.rect(snap(W * 0.55) - 2, 0, 4, H, '#2a2018', 0.9); }

  function curAng() { return Math.atan2(OBJ_Y - lightY, OBJ_X - lightX); }
  function match() { var d = Math.abs(curAng() - targetAng); while (d > Math.PI) d = Math.abs(d - Math.PI * 2); return 1 - Math.min(1, d / TOL); }

  function nextPuzzle() { shapeIdx = (shapeIdx + 1) % SHAPES.length; targetAng = (Math.random() - 0.5) * Math.PI * 0.8; lightX = OBJ_X + Math.cos(targetAng + Math.PI) * 300; lightY = OBJ_Y + Math.sin(targetAng + Math.PI) * 300; lightX += (Math.random() < 0.5 ? -1 : 1) * 120; lightY += (Math.random() < 0.5 ? -1 : 1) * 100; lightX = Math.max(80, Math.min(W * 0.5, lightX)); lightY = Math.max(220, Math.min(H * 0.46, lightY)); }

  function initGame() { shapeIdx = 0; completed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; nextPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 500 + Math.ceil(timeLeft) * 100) : completed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var m = match(), ang = curAng();
    // 光の筋
    for (var li = 0; li < 5; li++) { var la = ang + (li - 2) * 0.1; pline(lightX, lightY, lightX + Math.cos(la) * 600, lightY + Math.sin(la) * 600, C.c, 0.12); }
    // オブジェ
    game.draw.rect(snap(OBJ_X) - 34, snap(OBJ_Y) - 56, 68, 112, '#444', 0.9);
    // お手本の影
    var wx = snap(W * 0.74), wy = snap(H * 0.52), sh = SHAPES[shapeIdx];
    txt('TARGET: ' + sh.name, wx, wy - 130, 34, m > 0.85 ? C.b : C.c);
    for (var si = 0; si < sh.pts.length - 1; si++) pline(wx + sh.pts[si][0], wy + sh.pts[si][1], wx + sh.pts[si + 1][0], wy + sh.pts[si + 1][1], m > 0.85 ? C.b : C.f, 0.9, 6);
    // 光源
    pc(lightX, lightY, 26, C.c, 0.95); pc(lightX, lightY, 14, C.g, 0.9);
    if (flash > 0) pc(wx, wy, 60 * flash, C.b, flash * 0.5);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - W / 2, dy = y - H / 2;
    if (Math.abs(dx) > Math.abs(dy)) lightX += dx > 0 ? STEP : -STEP; else lightY += dy > 0 ? STEP : -STEP;
    lightX = Math.max(80, Math.min(W * 0.52, lightX)); lightY = Math.max(220, Math.min(H * 0.48, lightY));
    game.audio.play('se_tap', 0.2);
    if (match() > 0.85) {
      completed++; flash = 1.0; game.audio.play('se_success', 0.7);
      for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W * 0.74, y: H * 0.52, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.7, col: C.b }); }
      if (completed >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) nextPuzzle(); }, 800);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (lightX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 68, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT SHADOW!' : 'MISMATCH', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 1.5;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    var m = match(), col = m > 0.7 ? C.b : m > 0.4 ? C.c : '#887766';
    game.draw.rect(snap(W * 0.15), snap(H * 0.86), snap(W * 0.7), 24, '#1a1a1a', 0.8); game.draw.rect(snap(W * 0.15), snap(H * 0.86), snap(W * 0.7 * m), 24, col, 0.9);
    txt('MATCH ' + Math.round(m * 100) + '%', W / 2, snap(H * 0.83), 42, col);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
