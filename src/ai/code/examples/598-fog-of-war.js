// 598-fog-of-war.js
// フォグオブウォー — 霧に覆われた盤を1マスずつ進んで視界を開き、敵陣（拠点）を制圧する
// 操作: 隣接マスをタップで移動（視界内の敵をタップで撃退）。敵と同じマスに入ると奇襲される
// 成功: 拠点 3個 制圧  失敗: 3回 奇襲 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、偵察作戦） ──
  var C = { bg:'#040810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FOG OF WAR';
  var HOW_TO_PLAY = 'TAP ADJACENT CELLS TO ADVANCE · CAPTURE BASES · TAP ENEMIES IN SIGHT';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_AMBUSH = 3;        // 修正2: 5 → 3
  var COLS = 8, ROWS = 9, VISION = 2, CELL_W = W / 8, CELL_H = (H * 0.66) / 9, OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, bases, enemies, revealed, captured, ambushes, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color) { cx = snap(cx); cy = snap(cy); for (var a = 0; a < 5; a++) { var ang = -Math.PI / 2 + a * Math.PI * 2 / 5; pc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, r * 0.3, color, 0.95); } pc(cx, cy, r * 0.4, color, 0.95); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1a2a');
  }

  function background() { game.draw.clear(C.bg); }

  function ckey(r, c) { return r + ',' + c; }
  function center(r, c) { return { x: c * CELL_W + CELL_W / 2, y: OY + r * CELL_H + CELL_H / 2 }; }
  function inB(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
  function mdist(r1, c1, r2, c2) { return Math.abs(r1 - r2) + Math.abs(c1 - c2); }
  function visible(r, c) { return mdist(player.r, player.c, r, c) <= VISION; }

  function reveal() { for (var dr = -VISION; dr <= VISION; dr++) for (var dc = -VISION; dc <= VISION; dc++) { var nr = player.r + dr, nc = player.c + dc; if (inB(nr, nc) && mdist(player.r, player.c, nr, nc) <= VISION) revealed[ckey(nr, nc)] = true; } }

  function initGame() {
    player = { r: ROWS - 1, c: Math.floor(COLS / 2) }; bases = []; enemies = []; revealed = {}; captured = 0; ambushes = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b;
    for (var bi = 0; bi < NEEDED + 2; bi++) { var r, c, at = 0; do { r = Math.floor(Math.random() * (ROWS * 0.6)); c = Math.floor(Math.random() * COLS); at++; } while (at < 20 && bases.some(function(b) { return b.r === r && b.c === c; })); bases.push({ r: r, c: c, captured: false }); }
    for (var ei = 0; ei < 3; ei++) { var base = bases[Math.floor(Math.random() * bases.length)], er = Math.max(0, Math.min(ROWS - 1, base.r + Math.floor(Math.random() * 3) - 1)), ec = Math.max(0, Math.min(COLS - 1, base.c + Math.floor(Math.random() * 3) - 1)); enemies.push({ r: er, c: ec, moveTimer: 2 + Math.random() * 2 }); }
    reveal();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (captured * 1000 + Math.ceil(timeLeft) * 100) : captured * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var vis = visible(r, c), rev = revealed[ckey(r, c)]; game.draw.rect(c * CELL_W + 1, OY + r * CELL_H + 1, CELL_W - 2, CELL_H - 2, vis ? '#112030' : (rev ? '#0a1520' : '#040810'), vis ? 0.9 : (rev ? 0.9 : 0.95)); }
    for (var bi = 0; bi < bases.length; bi++) { var b = bases[bi]; if (!revealed[ckey(b.r, b.c)]) continue; var bp = center(b.r, b.c); if (b.captured) star(bp.x, bp.y, 20, C.b); else { pc(bp.x, bp.y, 20, C.c, 0.7); txt('!', bp.x, bp.y + 12, 32, C.bg); } }
    for (var ei = 0; ei < enemies.length; ei++) { var e = enemies[ei]; if (!visible(e.r, e.c)) continue; var ep = center(e.r, e.c); pc(ep.x, ep.y, 18, C.a, 0.9); pc(ep.x - 6, ep.y - 6, 6, C.g, 0.5); }
    var pp = center(player.r, player.c); pc(pp.x, pp.y, 22, C.e, 0.9); pc(pp.x - 8, pp.y - 8, 8, C.g, 0.5);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor(tx / CELL_W), row = Math.floor((ty - OY) / CELL_H); if (!inB(row, col)) return;
    if (visible(row, col)) for (var ei = enemies.length - 1; ei >= 0; ei--) if (enemies[ei].r === row && enemies[ei].c === col) { var p = center(row, col); enemies.splice(ei, 1); game.audio.play('se_success', 0.5); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.a }); } return; }
    if (Math.abs(row - player.r) + Math.abs(col - player.c) === 1) {
      player.r = row; player.c = col; reveal(); game.audio.play('se_tap', 0.15);
      for (var ei2 = 0; ei2 < enemies.length; ei2++) if (enemies[ei2].r === player.r && enemies[ei2].c === player.c) { ambushes++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5); enemies.splice(ei2, 1); if (ambushes >= MAX_AMBUSH) { finish(false); return; } break; }
      for (var bi = 0; bi < bases.length; bi++) { var b = bases[bi]; if (!b.captured && b.r === player.r && b.c === player.c) { b.captured = true; captured++; flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.7); var p2 = center(player.r, player.c); for (var pi2 = 0; pi2 < 8; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: p2.x, y: p2.y, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180, life: 0.5, col: C.c }); } if (captured >= NEEDED) { finish(true); return; } break; } }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.14, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.965, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CAPTURED!' : 'AMBUSHED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
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
      for (var ei = 0; ei < enemies.length; ei++) {
        var e = enemies[ei]; e.moveTimer -= dt;
        if (e.moveTimer <= 0) { e.moveTimer = 1.5 + Math.random() * 1.5; var dr = player.r - e.r, dc = player.c - e.c, mr = 0, mc = 0; if (Math.abs(dr) > Math.abs(dc)) mr = dr > 0 ? 1 : -1; else mc = dc > 0 ? 1 : -1; var nr = e.r + mr, nc = e.c + mc; if (inB(nr, nc)) { e.r = nr; e.c = nc; } if (e.r === player.r && e.c === player.c) { ambushes++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5); enemies.splice(ei, 1); ei--; if (ambushes >= MAX_AMBUSH) { finish(false); return; } } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(captured + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var ai = 0; ai < MAX_AMBUSH; ai++) game.draw.rect(snap(W / 2 + (ai - (MAX_AMBUSH - 1) / 2) * 56) - 10, 220, 20, 20, ai < ambushes ? C.a : '#0a1a2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
