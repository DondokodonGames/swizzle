// 257-cargo-sort.js
// カーゴソート — ベルトを流れてくるコンテナを、同じ色のレーンへスワイプで振り分ける仕分け作業
// 操作: コンテナの色と同じレーン方向へスワイプ
// 成功: 3個正しく仕分け  失敗: 3個誤送 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、仕分け工場） ──
  var C = { bg:'#06080a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LANES = [ { col: C.a, name: 'R', x: W * 0.125 }, { col: C.e, name: 'B', x: W * 0.375 }, { col: C.b, name: 'G', x: W * 0.625 }, { col: C.c, name: 'Y', x: W * 0.875 } ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CARGO SORT';
  var HOW_TO_PLAY = 'SWIPE THE CRATE TO ITS MATCHING LANE';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 30 → 3
  var MAX_ERROR = 3;         // 修正2: 5 → 3
  var TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cargo, spawnTimer, sorted, errors, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a2030');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, snap(H * 0.42), W, snap(H * 0.14), C.d, 0.25);
    var off = snap(game.time.elapsed * 200) % 120;
    for (var bi = 0; bi < 10; bi++) game.draw.rect((bi * 120 + off) % (W + 120) - 60, snap(H * 0.42) + 8, 60, snap(H * 0.14) - 16, C.d, 0.15);
    for (var li = 0; li < LANES.length; li++) { var ln = LANES[li], lx = snap(ln.x - W * 0.11); game.draw.rect(lx, snap(H * 0.66), snap(W * 0.22), snap(H * 0.24), ln.col, 0.15); game.draw.rect(lx, snap(H * 0.66), snap(W * 0.22), 8, ln.col, 0.6); txt(ln.name, ln.x, H * 0.66 + H * 0.12, 60, ln.col); }
  }

  function drawCrate(cx, cy, lane) { game.draw.rect(snap(cx) - 64, snap(cy) - 52, 128, 104, LANES[lane].col, 0.9); game.draw.rect(snap(cx) - 64, snap(cy) - 52, 128, 12, C.g, 0.5); txt(LANES[lane].name, cx, cy + 16, 60, '#000'); }

  function spawnCargo() { cargo = { lane: Math.floor(Math.random() * 4), x: W / 2, thrown: false, target: 0, t: 0 }; }

  function initGame() { cargo = null; spawnTimer = 0.4; sorted = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sorted * 400 + Math.ceil(timeLeft) * 60) : sorted * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || !cargo || cargo.thrown || x2 === undefined) return;
    if (Math.abs(x2 - x1) < 40) return;
    var best = -1, bd = Infinity; for (var li = 0; li < LANES.length; li++) { var d = Math.abs(x2 - LANES[li].x); if (d < bd) { bd = d; best = li; } }
    if (best < 0) return;
    cargo.thrown = true; cargo.target = best; cargo.sx = cargo.x; cargo.t = 0;
    if (best === cargo.lane) { sorted++; fbText = 'CORRECT!'; fbCol = C.b; fbTimer = 0.5; game.audio.play('se_success', 0.6); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: LANES[best].x, y: H * 0.75, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 50, life: 0.5, col: LANES[best].col }); } if (sorted >= NEEDED) { finish(true); return; } }
    else { errors++; fbText = 'WRONG LANE'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.5); if (errors >= MAX_ERROR) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawCrate(W / 2, H * 0.48, 0);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.30, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.35, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'MISSHIP', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      if (cargo && cargo.thrown) { cargo.t += dt / 0.3; cargo.x = cargo.sx + (LANES[cargo.target].x - cargo.sx) * Math.min(1, cargo.t); if (cargo.t >= 1) { cargo = null; spawnTimer = 0.3; } }
      else if (!cargo) { spawnTimer -= dt; if (spawnTimer <= 0) spawnCargo(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (cargo) drawCrate(cargo.x, cargo.thrown ? H * 0.6 : H * 0.48, cargo.lane);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.60, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sorted + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_ERROR; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_ERROR - 1) / 2) * 56) - 10, 224, 20, 20, mm < errors ? C.a : '#1a2030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
