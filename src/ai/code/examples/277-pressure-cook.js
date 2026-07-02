// 277-pressure-cook.js
// プレッシャークック — 圧力鍋の弁をタップで開閉し、レシピの適正圧を保って料理を仕上げる
// 操作: 弁をタップで開閉（閉で上昇、開で降下）
// 成功: 2品を調理  失敗: 爆発2回 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、調理場） ──
  var C = { bg:'#04020a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RECIPES = [
    { name: 'RICE', min: 55, max: 75, time: 3.5 }, { name: 'PORK', min: 65, max: 82, time: 3 },
    { name: 'POTATO', min: 40, max: 60, time: 3 }, { name: 'EGG', min: 30, max: 50, time: 2.5 }, { name: 'CURRY', min: 70, max: 88, time: 4 }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PRESSURE COOK';
  var HOW_TO_PLAY = 'TAP THE VALVE · HOLD PRESSURE IN RANGE';
  var MAX_TIME = 20;
  var NEEDED   = 2;           // 修正2: 3 → 2
  var MAX_EXPLODE = 2;
  var GX = snap(W * 0.24), GY = snap(H * 0.42), GR = 130, VX = snap(W / 2), VY = snap(H * 0.72);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pressure, valve, recipe, cookTimer, cooked, explosions, timeLeft, done, steam, flash, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function nextRecipe() { recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)]; cookTimer = 0; pressure = 20 + Math.random() * 15; }

  function drawGauge() {
    var ang = function(p) { return -Math.PI * 1.2 + p / 100 * Math.PI * 1.4; };
    pc(GX, GY, GR, '#12102a', 0.9);
    for (var s = 0; s < 20; s++) { var a1 = ang(recipe.min) + (ang(recipe.max) - ang(recipe.min)) * s / 20; game.draw.rect(snap(GX + Math.cos(a1) * (GR - 30)) - 6, snap(GY + Math.sin(a1) * (GR - 30)) - 6, 12, 12, C.b, 0.8); }
    var na = ang(pressure), col = pressure >= 100 ? C.a : (pressure >= recipe.min && pressure <= recipe.max ? C.b : C.f);
    for (var r = 0; r < GR - 30; r += 8) game.draw.rect(snap(GX + Math.cos(na) * r) - 5, snap(GY + Math.sin(na) * r) - 5, 10, 10, col, 0.9);
    pc(GX, GY, 12, C.g, 0.9); txt(Math.round(pressure), GX, GY + GR * 0.5, 44, col);
  }

  function drawPot(sx) {
    game.draw.rect(snap(W / 2 - 170) + sx, snap(H * 0.52), 340, 300, C.d, 0.6);
    game.draw.rect(snap(W / 2 - 180) + sx, snap(H * 0.49), 360, 30, C.d, 0.9);
    var vc = valve ? C.b : C.a; pc(VX + sx, VY, 56, vc, 0.9); txt(valve ? 'OPEN' : 'SHUT', VX + sx, VY + 14, 34, '#000');
  }

  function initGame() { valve = false; nextRecipe(); cooked = 0; explosions = 0; timeLeft = MAX_TIME; done = false; steam = []; flash = 0; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cooked * 600 + Math.ceil(timeLeft) * 50) : cooked * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if ((x - VX) * (x - VX) + (y - VY) * (y - VY) < 90 * 90) { valve = !valve; game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); recipe = RECIPES[0]; pressure = 60; valve = false; drawPot(0); drawGauge();
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DINNER READY!' : 'KABOOM', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt; if (flash > 0) flash -= dt;
      if (valve) { pressure -= 42 * dt; if (Math.random() < 0.4) steam.push({ x: VX + game.random(-30, 30), y: VY - 40, vy: -(120 + Math.random() * 60), r: 8 + Math.random() * 8, life: 0.6 }); }
      else pressure += 24 * dt;
      pressure = Math.max(0, Math.min(110, pressure));
      if (pressure >= 100) { explosions++; pressure = 30; valve = false; flash = 0.5; fbText = 'BOOM!'; fbCol = C.a; fbTimer = 1.0; game.audio.play('se_failure', 0.8); if (explosions >= MAX_EXPLODE) { finish(false); return; } }
      if (pressure >= recipe.min && pressure <= recipe.max) { cookTimer += dt; if (cookTimer >= recipe.time) { cooked++; fbText = recipe.name + ' DONE!'; fbCol = C.b; fbTimer = 1.0; game.audio.play('se_success', 0.7); valve = false; if (cooked >= NEEDED) { finish(true); return; } nextRecipe(); } }
      for (var sp = steam.length - 1; sp >= 0; sp--) { var s = steam[sp]; s.y += s.vy * dt; s.r += dt * 8; s.life -= dt; if (s.life <= 0) steam.splice(sp, 1); }
    }

    // ---- 描画 ----
    var sx = flash > 0 ? game.random(-20, 20) : 0;
    background();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.3);
    for (var sp2 = 0; sp2 < steam.length; sp2++) pc(steam[sp2].x + sx, steam[sp2].y, steam[sp2].r * steam[sp2].life, C.g, steam[sp2].life * 0.4);
    drawPot(sx); drawGauge();
    // レシピ表示
    var prog = Math.min(1, cookTimer / recipe.time);
    game.draw.rect(snap(W * 0.52), snap(H * 0.56), snap(W * 0.36), 22, C.d, 0.4); game.draw.rect(snap(W * 0.52), snap(H * 0.56), snap(W * 0.36 * prog), 22, C.b, 0.9);
    txt(recipe.name + '  ' + recipe.min + '-' + recipe.max, W * 0.7, H * 0.53, 36, C.c);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.86, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cooked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_EXPLODE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_EXPLODE - 1) / 2) * 56) - 10, 224, 20, 20, ei < explosions ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
