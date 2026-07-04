// 656-bubble-sort.js
// バブルソート — 隣り合うバブルをタップで交換し、数字を小さい順に並べ替える
// 操作: バブルをタップで選択 → 隣のバブルをタップで交換。1〜6を昇順にそろえる
// 成功: 3セット 完成  失敗: 20手 超過 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、整列盤／数字色は保持） ──
  var C = { bg:'#020d18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BUBBLE_COLS = ['#ff2079', '#ff6600', '#ffe600', '#00ff9f', '#00cfff', '#7700ff'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE SORT';
  var HOW_TO_PLAY = 'TAP A BUBBLE THEN A NEIGHBOR TO SWAP · SORT THE NUMBERS SMALL TO LARGE';
  var MAX_TIME = 25;
  var NUM = 6, MAX_SWAPS = 20, NEEDED_SETS = 3;
  var BUBBLE_R = 76, SPACING = W / (NUM + 1), BUBBLE_Y = snap(H * 0.48);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var values, bubbleX, selected, swaps, sets, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, lock;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#05101e');
  }

  function background() { game.draw.clear(C.bg); }

  function genValues() {
    values = []; for (var i = 1; i <= NUM; i++) values.push(i);
    for (var j = values.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = values[j]; values[j] = values[k]; values[k] = t; }
    for (var b = 0; b < NUM; b++) bubbleX[b] = (b + 1) * SPACING;
    selected = -1;
  }

  function initGame() { bubbleX = []; swaps = 0; sets = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lock = false; genValues(); }

  function checkSorted() { for (var i = 0; i < NUM - 1; i++) if (values[i] > values[i + 1]) return false; return true; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sets * 700 + Math.ceil(timeLeft) * 100) : sets * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    txt('SMALL --> LARGE', W / 2, snap(H * 0.28), 32, '#ffffff66');
    for (var i = 0; i < NUM; i++) { var tx2 = (i + 1) * SPACING; pc(tx2, snap(H * 0.34), 26, BUBBLE_COLS[i], 0.4); txt((i + 1) + '', tx2, snap(H * 0.34) + 10, 28, '#ffffff88'); }
    for (var bi = 0; bi < NUM; bi++) {
      var bx = bubbleX[bi], val = values[bi], sel = bi === selected, col = BUBBLE_COLS[val - 1], sz = sel ? BUBBLE_R + 10 : BUBBLE_R;
      pc(bx, BUBBLE_Y, sz, col, sel ? 0.95 : 0.85); pc(bx - sz * 0.3, BUBBLE_Y - sz * 0.3, sz * 0.3, C.g, sel ? 0.3 : 0.2);
      txt(val + '', bx, BUBBLE_Y + 18, 60, C.g);
      if (sel) ring(bx, BUBBLE_Y, sz + 8, C.c, 0.7);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lock) return;
    var hitIdx = -1;
    for (var i = 0; i < NUM; i++) { var dx = tx - bubbleX[i], dy = ty - BUBBLE_Y; if (Math.sqrt(dx * dx + dy * dy) < BUBBLE_R + 20) { hitIdx = i; break; } }
    if (hitIdx < 0) { selected = -1; return; }
    if (selected < 0) { selected = hitIdx; game.audio.play('se_tap', 0.1); }
    else if (selected === hitIdx) selected = -1;
    else if (Math.abs(selected - hitIdx) === 1) {
      var t = values[selected]; values[selected] = values[hitIdx]; values[hitIdx] = t; swaps++; game.audio.play('se_tap', 0.2);
      for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2, mx = (bubbleX[selected] + bubbleX[hitIdx]) / 2; particles.push({ x: mx, y: BUBBLE_Y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.35, col: C.e }); }
      selected = -1;
      if (checkSorted()) { sets++; flash = 0.3; flashCol = C.b; resultText = 'SORTED!'; resultTimer = 0.8; game.audio.play('se_success', 0.7); if (sets >= NEEDED_SETS) { finish(true); return; } lock = true; setTimeout(function() { if (!done) { genValues(); lock = false; } }, 700); }
      else if (swaps >= MAX_SWAPS) { finish(false); return; }
    } else { selected = hitIdx; game.audio.play('se_tap', 0.1); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!values) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL SORTED!' : 'TANGLED UP', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.66), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sets + ' / ' + NEEDED_SETS + '   SWAPS ' + (MAX_SWAPS - swaps), W / 2, 168, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
