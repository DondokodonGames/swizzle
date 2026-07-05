// 787-ice-slide.js
// アイスライド — 氷の上を滑る石をタップで方向転換させ、ゴールへ導け
// 操作: タップで石の進行方向を90度回転させる
// 成功: 8回 ゴール  失敗: 3回 ミス or 26秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷原） ──
  var C = { bg:'#020810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ICE = '#0e2a4a', ICE_HI = '#1e4a7a', STONE = '#6a7a8a', STONE_HI = '#a0b0c0', GOAL = '#00ff41', WALL = '#1e2b45', WALL_HI = '#3a4a6a', TRAIL = '#00cfff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SLIDE';
  var HOW_TO_PLAY = 'TAP TO TURN THE SLIDING STONE 90 DEGREES · STEER IT TO THE GOAL STAR';
  var MAX_TIME = 26;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var GRID = 8, CELL = Math.floor(W / (GRID + 2)), OFFSET_X = snap((W - GRID * CELL) / 2), OFFSET_Y = snap(H * 0.20), SLIDE_SPEED = 10;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stoneX, stoneY, stoneVX, stoneVY, stonePixX, stonePixY, sliding, slideTimer, goalX, goalY, walls, score, missed, done, timeLeft, elapsed, trail, particles, flash, flashCol, resultText, resultTimer, lockNext;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color, alpha) { cx = snap(cx); cy = snap(cy); for (var si = 0; si < 5; si++) { var sa = si * Math.PI * 2 / 5 - Math.PI / 2; for (var t = 0; t < r; t += 8) { var w = (r - t) * 0.45; game.draw.rect(snap(cx + Math.cos(sa) * t - w / 2), snap(cy + Math.sin(sa) * t - w / 2), snap(w) + 4, snap(w) + 4, color, alpha); } } pc(cx, cy, r * 0.4, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#040810');
  }

  function background() { game.draw.clear(C.bg); }

  function cellToPixel(gx, gy) { return { x: OFFSET_X + gx * CELL + CELL / 2, y: OFFSET_Y + gy * CELL + CELL / 2 }; }

  function hasWall(gx, gy) { if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return true; for (var i = 0; i < walls.length; i++) if (walls[i].x === gx && walls[i].y === gy) return true; return false; }

  function setupLevel() {
    var side = Math.floor(Math.random() * 2);
    if (side === 0) { stoneX = 0; stoneY = Math.floor(Math.random() * GRID); stoneVX = 1; stoneVY = 0; goalX = GRID - 1; goalY = Math.floor(Math.random() * GRID); }
    else { stoneX = Math.floor(Math.random() * GRID); stoneY = 0; stoneVX = 0; stoneVY = 1; goalX = Math.floor(Math.random() * GRID); goalY = GRID - 1; }
    walls = []; var numWalls = 2 + Math.floor(Math.random() * 3), attempts = 0;
    while (walls.length < numWalls && attempts < 50) { attempts++; var wx = Math.floor(Math.random() * GRID), wy = Math.floor(Math.random() * GRID); if ((wx === stoneX && wy === stoneY) || (wx === goalX && wy === goalY)) continue; walls.push({ x: wx, y: wy }); }
    var pix = cellToPixel(stoneX, stoneY); stonePixX = pix.x; stonePixY = pix.y; sliding = true; trail = []; slideTimer = 0; lockNext = false;
  }

  function initGame() { score = 0; missed = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; setupLevel(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 130) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function slideStep() {
    var nx = stoneX + stoneVX, ny = stoneY + stoneVY;
    if (hasWall(nx, ny)) {
      sliding = false;
      if (!(stoneX === goalX && stoneY === goalY)) {
        missed++; flash = 0.28; flashCol = C.a; resultText = 'STUCK!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
        if (missed >= MAX_MISS) { finish(false); return; }
        lockNext = true; setTimeout(function() { if (!done && state === S.PLAYING) setupLevel(); }, 700);
      }
      return;
    }
    stoneX = nx; stoneY = ny; var pix = cellToPixel(stoneX, stoneY); trail.push({ x: pix.x, y: pix.y, life: 1.0 });
    if (stoneX === goalX && stoneY === goalY) {
      sliding = false; score++; flash = 0.22; flashCol = C.b; resultText = 'GOAL!'; resultTimer = 0.4; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: pix.x, y: pix.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.45, col: GOAL }); }
      if (score >= NEEDED) { finish(true); return; }
      lockNext = true; setTimeout(function() { if (!done && state === S.PLAYING) setupLevel(); }, 600);
    }
  }

  function drawScene() {
    for (var gx = 0; gx < GRID; gx++) for (var gy2 = 0; gy2 < GRID; gy2++) {
      var px = OFFSET_X + gx * CELL, py = OFFSET_Y + gy2 * CELL, isWall = hasWall(gx, gy2);
      game.draw.rect(px + 2, py + 2, CELL - 4, CELL - 4, isWall ? WALL : ICE, 0.8); game.draw.rect(px + 2, py + 2, CELL - 4, 4, isWall ? WALL_HI : ICE_HI, isWall ? 0.4 : 0.3);
    }
    var gPix = cellToPixel(goalX, goalY);
    pc(gPix.x, gPix.y, CELL * 0.4, GOAL, 0.2 + 0.15 * Math.sin(elapsed * 5)); star(gPix.x, gPix.y, CELL * 0.32, GOAL, 0.9);
    for (var tri = 0; tri < trail.length; tri++) pc(trail[tri].x, trail[tri].y, CELL * 0.18 * trail[tri].life, TRAIL, trail[tri].life * 0.5);
    pc(stonePixX, stonePixY, CELL * 0.34, STONE, 0.95); pc(stonePixX - CELL * 0.1, stonePixY - CELL * 0.1, CELL * 0.1, STONE_HI, 0.5);
    pc(stonePixX + stoneVX * CELL * 0.5, stonePixY + stoneVY * CELL * 0.5, 8, TRAIL, 0.7);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !sliding) return;
    var oldVX = stoneVX; stoneVX = -stoneVY; stoneVY = oldVX; game.audio.play('se_tap', 0.07);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (stoneX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ICE PILOT!' : 'GROUNDED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (sliding) {
        slideTimer += dt * SLIDE_SPEED;
        if (slideTimer >= 1) { slideTimer -= 1; slideStep(); }
        if (sliding) { var targetPix = cellToPixel(stoneX + stoneVX, stoneY + stoneVY), curPix = cellToPixel(stoneX, stoneY); stonePixX = curPix.x + (targetPix.x - curPix.x) * slideTimer; stonePixY = curPix.y + (targetPix.y - curPix.y) * slideTimer; }
      }
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 3; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.94), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#040810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
