// 450-bubble-sort.js
// バブルソート — 隣り合う数字の泡をタップで入れ替えて昇順に並べる
// 操作: 隣接する2つの泡を続けてタップして入れ替え（離れた泡を選ぶとミス）
// 成功: 2列 完成  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、数字パズル） ──
  var C = { bg:'#000818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE SORT';
  var HOW_TO_PLAY = 'TAP TWO ADJACENT BUBBLES TO SWAP · SORT LOW TO HIGH';
  var MAX_TIME = 25;
  var NEEDED   = 2;          // 修正2: 5 → 2
  var MAX_MISS = 3;          // 修正2: 30 → 3
  var N = 5, BUBBLE_R = 88, GAP = 24;
  var TOTAL_W = N * (BUBBLE_R * 2 + GAP) - GAP;
  var OX = snap((W - TOTAL_W) / 2), OY = snap(H / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var arr, selected, particles, swapAnim, sorted, misses, timeLeft, done, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#04142a');
  }

  function background() { game.draw.clear(C.bg); }

  function shuffle() {
    arr = []; for (var i = 1; i <= N; i++) arr.push(i);
    for (var si = arr.length - 1; si > 0; si--) { var sj = Math.floor(Math.random() * (si + 1)); var t = arr[si]; arr[si] = arr[sj]; arr[sj] = t; }
    if (isSortedArr()) { var tt = arr[0]; arr[0] = arr[1]; arr[1] = tt; }
    selected = -1; swapAnim = null;
  }

  function isSortedArr() { for (var k = 1; k < arr.length; k++) if (arr[k] < arr[k - 1]) return false; return true; }

  function bubbleCenter(idx) { return { x: OX + idx * (BUBBLE_R * 2 + GAP) + BUBBLE_R, y: OY }; }

  function initGame() { particles = []; sorted = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; shuffle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sorted * 900 + Math.ceil(timeLeft) * 100) : sorted * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBubbles() {
    var allSorted = isSortedArr();
    for (var i = 0; i < N; i++) {
      var c = bubbleCenter(i), isSel = i === selected;
      var col = allSorted ? C.b : (isSel ? C.f : C.e);
      var ox = 0;
      if (swapAnim) { var pr = Math.min(1, swapAnim.progress); var ease = pr < 0.5 ? 2 * pr * pr : -1 + (4 - 2 * pr) * pr; if (i === swapAnim.from) ox = (BUBBLE_R * 2 + GAP) * ease; if (i === swapAnim.to) ox = -(BUBBLE_R * 2 + GAP) * ease; }
      pc(c.x + ox, c.y, BUBBLE_R, col, 0.9); pc(c.x + ox - BUBBLE_R * 0.3, c.y - BUBBLE_R * 0.3, BUBBLE_R * 0.2, C.g, 0.3);
      txt(arr[i] + '', c.x + ox, c.y + 24, 72, C.bg);
      if (isSel) ring(c.x, c.y, BUBBLE_R + 12, C.c, 0.8);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || swapAnim) return;
    var hit = -1;
    for (var i = 0; i < N; i++) { var c = bubbleCenter(i); if (Math.hypot(tx - c.x, ty - c.y) < BUBBLE_R + 15) { hit = i; break; } }
    if (hit < 0) { selected = -1; return; }
    if (selected < 0) { selected = hit; game.audio.play('se_tap', 0.3); return; }
    if (hit === selected) { selected = -1; return; }
    if (Math.abs(hit - selected) === 1) {
      swapAnim = { from: Math.min(hit, selected), to: Math.max(hit, selected), progress: 0 };
      var t = arr[swapAnim.from]; arr[swapAnim.from] = arr[swapAnim.to]; arr[swapAnim.to] = t;
      selected = -1; game.audio.play('se_tap', 0.5);
      if (isSortedArr()) {
        sorted++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.7, col: C.b }); }
        if (sorted >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) shuffle(); }, 1000);
      }
    } else {
      misses++; selected = hit; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!arr) initGame(); background(); drawBubbles();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.83, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'OUT OF ORDER', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (swapAnim) { swapAnim.progress += dt * 4; if (swapAnim.progress >= 1) swapAnim = null; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBubbles();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('LOW  ►  HIGH', W / 2, snap(H * 0.68), 40, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sorted + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#04142a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
