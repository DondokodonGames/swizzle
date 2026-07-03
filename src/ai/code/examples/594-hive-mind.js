// 594-hive-mind.js
// ハイブマインド — 六角セルの巣へ最短で這い寄る侵入者を、セルをタップで叩き潰して守り抜く
// 操作: 侵入者のいるセルをタップで撃退。空セルをタップで壁を設置/解除して進路を塞ぐ
// 成功: 侵入者 8匹 撃退  失敗: 3匹 巣に到達 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、巣の防衛） ──
  var C = { bg:'#050300', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HIVE MIND';
  var HOW_TO_PLAY = 'TAP AN INTRUDER TO SMASH IT · TAP AN EMPTY CELL TO WALL IT OFF';
  var MAX_TIME = 20;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_BREACH = 3;        // 修正2: 10 → 3
  var HEX_R = 58, HEX_ROWS = 7, HEX_COLS = 6, HIVE_ROW = 3, HIVE_COL = 2;
  var OX = W / 2 - HEX_COLS * HEX_R * 0.9, OY = snap(H * 0.20);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bugs, walls, deflected, breached, timeLeft, done, particles, flash, flashCol, nextBug;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#2a1800');
  }

  function hexCenter(row, col) { return { x: OX + col * HEX_R * 1.75 + (row % 2) * HEX_R * 0.875, y: OY + row * HEX_R * 1.52 }; }
  function hexKey(r, c) { return r + ',' + c; }

  function drawHex(cx, cy, r, col, alpha, w) { for (var i = 0; i < 6; i++) { var a1 = i / 6 * Math.PI * 2 - Math.PI / 6, a2 = (i + 1) / 6 * Math.PI * 2 - Math.PI / 6; game.draw.line(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r, col, w); } }

  function hexNeighbors(r, c) { var off = r % 2 === 0 ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]] : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]; var res = []; for (var i = 0; i < off.length; i++) { var nr = r + off[i][0], nc = c + off[i][1]; if (nr >= 0 && nr < HEX_ROWS && nc >= 0 && nc < HEX_COLS) res.push({ r: nr, c: nc }); } return res; }

  function background() { game.draw.clear(C.bg); }

  function spawnBug() { var edge = []; for (var r = 0; r < HEX_ROWS; r++) for (var c = 0; c < HEX_COLS; c++) if (r === 0 || r === HEX_ROWS - 1 || c === 0 || c === HEX_COLS - 1) edge.push({ r: r, c: c }); var st = edge[Math.floor(Math.random() * edge.length)], p = hexCenter(st.r, st.c); bugs.push({ r: st.r, c: st.c, x: p.x, y: p.y, moveTimer: 0, moveDelay: 0.7, state: 'alive' }); }

  function bugMove(bug) {
    if (bug.r === HIVE_ROW && bug.c === HIVE_COL) { bug.state = 'breached'; breached++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5); if (breached >= MAX_BREACH) { finish(false); } return; }
    var nb = hexNeighbors(bug.r, bug.c), best = null, bd = 1e9;
    for (var ni = 0; ni < nb.length; ni++) { var n = nb[ni]; if (walls[hexKey(n.r, n.c)]) continue; var dr = n.r - HIVE_ROW, dc = n.c - HIVE_COL, d = dr * dr + dc * dc; if (d < bd) { bd = d; best = n; } }
    if (best) { bug.r = best.r; bug.c = best.c; var p = hexCenter(bug.r, bug.c); bug.x = p.x; bug.y = p.y; }
  }

  function initGame() { bugs = []; walls = {}; deflected = 0; breached = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; nextBug = 1.2; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (deflected * 500 + Math.ceil(timeLeft) * 100) : deflected * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < HEX_ROWS; r++) for (var c = 0; c < HEX_COLS; c++) {
      var p = hexCenter(r, c), key = hexKey(r, c), isHive = r === HIVE_ROW && c === HIVE_COL, isWall = walls[key];
      if (isHive) { pc(p.x, p.y, HEX_R * 0.55, C.c, 0.3 + Math.sin(game.time.elapsed * 3) * 0.1); drawHex(p.x, p.y, HEX_R * 0.9, C.c, 1.0, 4); txt('HIVE', p.x, p.y + 12, 26, C.c); }
      else if (isWall) { pc(p.x, p.y, HEX_R * 0.5, C.f, 0.7); drawHex(p.x, p.y, HEX_R * 0.9, C.f, 0.8, 4); }
      else drawHex(p.x, p.y, HEX_R * 0.9, '#332200', 0.5, 2);
    }
    for (var bi = 0; bi < bugs.length; bi++) { var b = bugs[bi], al = b.state === 'dead' ? b.moveTimer * 0.5 : 0.9; pc(b.x, b.y, 22, b.state === 'dead' ? C.b : C.d, al); pc(b.x - 6, b.y - 6, 6, C.g, al * 0.5); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var r = 0; r < HEX_ROWS; r++) for (var c = 0; c < HEX_COLS; c++) {
      if (r === HIVE_ROW && c === HIVE_COL) continue;
      var p = hexCenter(r, c);
      if ((tx - p.x) * (tx - p.x) + (ty - p.y) * (ty - p.y) < HEX_R * HEX_R * 0.7) {
        var bh = false;
        for (var bi = bugs.length - 1; bi >= 0; bi--) if (bugs[bi].r === r && bugs[bi].c === c && bugs[bi].state === 'alive') { bugs[bi].state = 'dead'; bugs[bi].moveTimer = 0; deflected++; flash = 0.2; flashCol = C.b; game.audio.play('se_success', 0.6); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.b }); } bh = true; if (deflected >= NEEDED) { finish(true); return; } break; }
        if (!bh) { var key = hexKey(r, c); if (walls[key]) { delete walls[key]; game.audio.play('se_tap', 0.1); } else { walls[key] = true; game.audio.play('se_tap', 0.2); } }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bugs) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.09, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.125, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HIVE DEFENDED!' : 'OVERRUN', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
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
      nextBug -= dt; if (nextBug <= 0) { spawnBug(); nextBug = Math.max(0.8, 1.6 - (MAX_TIME - timeLeft) * 0.04); }
      for (var bi = bugs.length - 1; bi >= 0; bi--) { var bug = bugs[bi]; if (bug.state !== 'alive') { bug.moveTimer += dt * 3; if (bug.moveTimer > 1) bugs.splice(bi, 1); continue; } bug.moveTimer += dt; if (bug.moveTimer >= bug.moveDelay) { bug.moveTimer = 0; bugMove(bug); if (done) return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(deflected + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var bi3 = 0; bi3 < MAX_BREACH; bi3++) game.draw.rect(snap(W / 2 + (bi3 - (MAX_BREACH - 1) / 2) * 56) - 10, 220, 20, 20, bi3 < breached ? C.a : '#2a1800');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
