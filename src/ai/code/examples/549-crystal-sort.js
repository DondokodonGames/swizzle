// 549-crystal-sort.js
// クリスタルソート — 試験管間でクリスタルを移し替え、各試験管を同色でそろえる（水ソートパズル）
// 操作: 試験管をタップで選択 → 別の試験管をタップで上のクリスタルを移動（同色/空にのみ）
// 成功: 全試験管を同色にそろえる  失敗: 手詰まり or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、錬金ラボ） ──
  var C = { bg:'#0d0d20', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CRYSTAL_COLS = [C.a, C.e, C.b];  // 3色（内容そのもの）

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL SORT';
  var HOW_TO_PLAY = 'TAP A TUBE TO PICK · TAP ANOTHER TO POUR · MATCH EACH TUBE';
  var MAX_TIME = 30;
  var TUBE_COUNT = 4, CAPACITY = 4;
  var TUBE_W = 140, TUBE_H = CAPACITY * 88 + 40, TUBE_GAP = (W - TUBE_COUNT * TUBE_W) / (TUBE_COUNT + 1), TUBE_Y = snap(H * 0.30);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tubes, selected, moves, timeLeft, done, particles, flash, solvedAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#141428');
  }

  function background() { game.draw.clear(C.bg); }

  function tubeX(i) { return TUBE_GAP + i * (TUBE_W + TUBE_GAP) + TUBE_W / 2; }

  function initTubes() {
    var all = []; for (var ci = 0; ci < CRYSTAL_COLS.length; ci++) for (var j = 0; j < CAPACITY; j++) all.push(ci);
    for (var si = all.length - 1; si > 0; si--) { var sj = Math.floor(Math.random() * (si + 1)); var t = all[si]; all[si] = all[sj]; all[sj] = t; }
    tubes = []; for (var ti = 0; ti < TUBE_COUNT; ti++) { var tube = []; if (ti < CRYSTAL_COLS.length) for (var j2 = 0; j2 < CAPACITY; j2++) tube.push(all[ti * CAPACITY + j2]); tubes.push(tube); }
  }

  function tubeSolved(idx) { var t = tubes[idx]; if (t.length === 0) return true; if (t.length !== CAPACITY) return false; for (var i = 1; i < t.length; i++) if (t[i] !== t[0]) return false; return true; }
  function solvedCount() { var n = 0; for (var i = 0; i < TUBE_COUNT; i++) if (tubes[i].length === CAPACITY && tubeSolved(i)) n++; return n; }
  function isSolved() { for (var i = 0; i < TUBE_COUNT; i++) if (!tubeSolved(i)) return false; return true; }
  function canMove(from, to) { if (from === to) return false; var f = tubes[from], tt = tubes[to]; if (f.length === 0 || tt.length >= CAPACITY) return false; if (tt.length === 0) return true; return f[f.length - 1] === tt[tt.length - 1]; }
  function hasAnyMove() { for (var i = 0; i < TUBE_COUNT; i++) for (var j = 0; j < TUBE_COUNT; j++) if (canMove(i, j)) return true; return false; }

  function initGame() { selected = -1; moves = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; solvedAnim = 0; initTubes(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? Math.max(1000, 12000 - moves * 150 + Math.ceil(timeLeft) * 100) : solvedCount() * 800;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ti = 0; ti < TUBE_COUNT; ti++) {
      var tx = tubeX(ti), isSel = selected === ti, rim = isSel ? C.g : C.d;
      game.draw.rect(tx - TUBE_W / 2 + 4, TUBE_Y + 8, TUBE_W - 8, TUBE_H - 8, isSel ? C.g : '#1a2040', isSel ? 0.15 : 0.2);
      game.draw.rect(tx - TUBE_W / 2 + 4, TUBE_Y, 6, TUBE_H, rim, 0.9);
      game.draw.rect(tx + TUBE_W / 2 - 10, TUBE_Y, 6, TUBE_H, rim, 0.9);
      game.draw.rect(tx - TUBE_W / 2 + 4, TUBE_Y + TUBE_H - 6, TUBE_W - 8, 6, rim, 0.9);
      game.draw.rect(tx - TUBE_W / 2, TUBE_Y - 4, TUBE_W, 8, C.d, 0.9);
      for (var ci = 0; ci < tubes[ti].length; ci++) { var col = CRYSTAL_COLS[tubes[ti][ci]], cy = TUBE_Y + TUBE_H - (ci + 0.5) * 88; pc(tx, cy, 40, col, 0.9); pc(tx - 10, cy - 12, 10, C.g, 0.4); }
      if (isSel && tubes[ti].length > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) { var top = TUBE_Y + TUBE_H - (tubes[ti].length - 0.5) * 88; game.draw.rect(tx - 12, top - 78, 24, 24, C.g, 0.9); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var tapped = -1;
    for (var ti = 0; ti < TUBE_COUNT; ti++) { if (Math.abs(tx - tubeX(ti)) < TUBE_W / 2 + 20 && ty > TUBE_Y - 20 && ty < TUBE_Y + TUBE_H + 20) { tapped = ti; break; } }
    if (tapped === -1) { selected = -1; return; }
    if (selected === -1) { if (tubes[tapped].length > 0) { selected = tapped; game.audio.play('se_tap', 0.3); } return; }
    if (tapped === selected) { selected = -1; return; }
    if (canMove(selected, tapped)) {
      var cr = tubes[selected].pop(); tubes[tapped].push(cr); moves++; game.audio.play('se_tap', 0.4);
      var tx3 = tubeX(tapped), cy = TUBE_Y + TUBE_H - (tubes[tapped].length - 0.5) * 88;
      for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: tx3, y: cy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.3, col: CRYSTAL_COLS[cr] }); }
      selected = -1;
      if (isSolved()) { flash = 0.5; solvedAnim = 1.0; for (var pi2 = 0; pi2 < 24; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a2) * 300, vy: Math.sin(a2) * 300, life: 0.6, col: CRYSTAL_COLS[Math.floor(Math.random() * 3)] }); } finish(true); return; }
      if (!hasAnyMove()) { finish(false); return; }
    } else { selected = tubes[tapped].length > 0 ? tapped : -1; game.audio.play('se_failure', 0.2); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tubes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'STUCK', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (solvedAnim > 0) solvedAnim -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 7, snap(particles[pp2].y) - 7, 14, 14, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.g, flash * 0.12);

    txt('MOVES ' + moves, W / 2, snap(TUBE_Y + TUBE_H + 80), 44, C.c);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('SORTED ' + solvedCount() + ' / ' + CRYSTAL_COLS.length, W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
