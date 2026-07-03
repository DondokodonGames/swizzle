// 468-typing-rain.js
// タイピング雨 — 降ってくる文字を、色（＝方向）に合わせてスワイプで打ち返す
// 操作: 文字の色に対応した向きへスワイプ（上=あ行 下=か行 左=さ行 右=た行）
// 成功: 8文字 処理  失敗: 3個 取りこぼし or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、雨の夜） ──
  var C = { bg:'#020812', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var DIR_COL = { up: C.e, down: C.a, left: C.b, right: C.f };
  // かなは遊びの中身なので保持
  var KANA = { up: ['あ', 'い', 'う', 'え', 'お'], down: ['か', 'き', 'く', 'け', 'こ'], left: ['さ', 'し', 'す', 'せ', 'そ'], right: ['た', 'ち', 'つ', 'て', 'と'] };
  var DIRS = ['up', 'down', 'left', 'right'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TYPING RAIN';
  var HOW_TO_PLAY = 'SWIPE THE WAY THE FALLING LETTER GLOWS';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 40 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var drops, particles, processed, misses, timeLeft, done, nextSpawn, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, dir, sz, color, alpha) {
    cx = snap(cx); cy = snap(cy); var s = sz;
    for (var i = -s; i <= s; i += 8) { var w = s - Math.abs(i); if (dir === 'up') game.draw.rect(cx - w, cy + i, w * 2 + 8, 8, color, alpha); else if (dir === 'down') game.draw.rect(cx - w, cy - i, w * 2 + 8, 8, color, alpha); else if (dir === 'left') game.draw.rect(cx + i, cy - w, 8, w * 2 + 8, color, alpha); else game.draw.rect(cx - i, cy - w, 8, w * 2 + 8, color, alpha); }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#081428');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnDrop() { var dir = DIRS[Math.floor(Math.random() * DIRS.length)], ks = KANA[dir]; drops.push({ x: snap(120 + Math.random() * (W - 240)), y: -40, kana: ks[Math.floor(Math.random() * ks.length)], dir: dir, speed: 180 + Math.random() * 60 + processed * 4, r: 54 }); }

  function initGame() { drops = []; particles = []; processed = 0; misses = 0; timeLeft = MAX_TIME; done = false; nextSpawn = 0.8; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (processed * 500 + Math.ceil(timeLeft) * 100) : processed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawLegend() {
    var ly = snap(H * 0.85);
    for (var li = 0; li < DIRS.length; li++) { var d = DIRS[li], lx = snap(W * 0.15 + li * (W * 0.7 / 3)); pc(lx, ly, 40, DIR_COL[d], 0.2); arrow(lx, ly, d, 22, DIR_COL[d], 0.9); txt(KANA[d][0], lx, ly + 70, 30, DIR_COL[d]); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var hitAny = false;
    for (var di = drops.length - 1; di >= 0; di--) {
      var d = drops[di];
      if (d.dir === dir) {
        for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: d.x, y: d.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: DIR_COL[dir] }); }
        drops.splice(di, 1); processed++; hitAny = true; flash = 0.3; flashCol = C.b; game.audio.play('se_tap', 0.4);
        if (processed >= NEEDED) { finish(true); return; }
      }
    }
    if (!hitAny) { misses++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!drops) initGame(); background(); drawLegend();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.55, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.61, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL TYPED!' : 'RAINED OUT', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnDrop(); nextSpawn = 0.7 + Math.random() * 0.5; }
      for (var di = drops.length - 1; di >= 0; di--) { drops[di].y += drops[di].speed * dt; if (drops[di].y > H * 0.80) { drops.splice(di, 1); misses++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.2); if (misses >= MAX_MISS) { finish(false); return; } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawLegend();
    for (var di2 = 0; di2 < drops.length; di2++) { var d2 = drops[di2]; pc(d2.x, d2.y, d2.r, DIR_COL[d2.dir], 0.85); arrow(d2.x, d2.y - d2.r - 8, d2.dir, 16, DIR_COL[d2.dir], 0.8); txt(d2.kana, d2.x, d2.y + 22, 60, C.g); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(processed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#081428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
