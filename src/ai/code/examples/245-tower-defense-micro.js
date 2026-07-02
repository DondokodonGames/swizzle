// 245-tower-defense-micro.js
// マイクロタワー — 曲がりくねる一本道を進む敵に砲台を置いて食い止める超小型防衛
// 操作: 道以外をタップで砲台を設置（3基まで）
// 成功: 敵を3体倒す  失敗: 3体逃がす or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、防衛拠点） ──
  var C = { bg:'#060a0c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MICRO TOWER';
  var HOW_TO_PLAY = 'TAP OFF-PATH TO PLACE TURRETS (MAX 3)';
  var MAX_TIME = 20;
  var NEEDED   = 3;           // 修正2: 20 → 3
  var MAX_ESCAPE = 3;        // 修正2: 5 → 3
  var MAX_TOWERS = 3, TOP = 220, TOTAL_SPAWN = 6;
  var PATH = [
    { x: -60, y: snap(H * 0.32) }, { x: snap(W * 0.25), y: snap(H * 0.32) }, { x: snap(W * 0.25), y: snap(H * 0.58) },
    { x: snap(W * 0.75), y: snap(H * 0.58) }, { x: snap(W * 0.75), y: snap(H * 0.32) }, { x: W + 60, y: snap(H * 0.32) }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var towers, enemies, bullets, killed, escaped, spawnTimer, spawned, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var pi = 0; pi < PATH.length - 1; pi++) { game.draw.line(PATH[pi].x, PATH[pi].y, PATH[pi + 1].x, PATH[pi + 1].y, C.d, 84); game.draw.line(PATH[pi].x, PATH[pi].y, PATH[pi + 1].x, PATH[pi + 1].y, '#1a2e10', 6); }
  }

  function isOnPath(x, y) {
    for (var i = 0; i < PATH.length - 1; i++) { var ax = PATH[i].x, ay = PATH[i].y, dx = PATH[i + 1].x - ax, dy = PATH[i + 1].y - ay, len = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)); if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) < 60) return true; }
    return false;
  }

  function drawTower(t) { game.draw.circle(t.x, t.y, t.range, C.b, 0.04); pc(t.x, t.y, 28, C.b, 0.9); game.draw.rect(snap(t.x) - 6, snap(t.y) - 6, 12, 12, C.g, 0.8); }
  function drawEnemy(e) { pc(e.x, e.y, e.r, C.a, 0.9); game.draw.rect(snap(e.x) - 10, snap(e.y) - 4, 6, 6, C.g); game.draw.rect(snap(e.x) + 4, snap(e.y) - 4, 6, 6, C.g); game.draw.rect(snap(e.x) - e.r, snap(e.y) - e.r - 12, e.r * 2, 6, '#333', 0.8); game.draw.rect(snap(e.x) - e.r, snap(e.y) - e.r - 12, snap(e.r * 2 * e.hp / e.maxHp), 6, C.b); }

  function spawnEnemy() { enemies.push({ x: PATH[0].x, y: PATH[0].y, wp: 1, speed: 90 + spawned * 6, hp: 2 + Math.floor(spawned / 3), maxHp: 2 + Math.floor(spawned / 3), r: 24 }); spawned++; }

  function initGame() { towers = []; enemies = []; bullets = []; killed = 0; escaped = 0; spawnTimer = 1; spawned = 0; timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (killed * 300 + Math.ceil(timeLeft) * 60) : killed * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || y < TOP) return;
    if (isOnPath(x, y) || towers.length >= MAX_TOWERS) { game.audio.play('se_failure', 0.2); return; }
    towers.push({ x: snap(x), y: snap(y), range: 220, rate: 1.0, fireTimer: 0 }); game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawTower({ x: W * 0.5, y: H * 0.45, range: 200 }); drawEnemy({ x: W * 0.25, y: H * 0.32, r: 24, hp: 2, maxHp: 2 });
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#556677');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HELD THE LINE!' : 'OVERRUN', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (spawned < TOTAL_SPAWN) { spawnTimer -= dt; if (spawnTimer <= 0) { spawnEnemy(); spawnTimer = 1.8; } }
      for (var ei = enemies.length - 1; ei >= 0; ei--) {
        var e = enemies[ei]; if (e.wp >= PATH.length) { escaped++; enemies.splice(ei, 1); game.audio.play('se_failure', 0.3); if (escaped >= MAX_ESCAPE) { finish(false); return; } continue; }
        var tg = PATH[e.wp], dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy);
        if (d < 10) e.wp++; else { e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt; }
      }
      for (var ti = 0; ti < towers.length; ti++) {
        var t = towers[ti]; t.fireTimer -= dt; if (t.fireTimer > 0) continue;
        var near = null, nd = t.range; for (var ej = 0; ej < enemies.length; ej++) { var dd = Math.hypot(t.x - enemies[ej].x, t.y - enemies[ej].y); if (dd < nd) { nd = dd; near = enemies[ej]; } }
        if (near) { var bdx = near.x - t.x, bdy = near.y - t.y, bl = Math.hypot(bdx, bdy) || 1; bullets.push({ x: t.x, y: t.y, vx: bdx / bl * 600, vy: bdy / bl * 600, life: 0.7 }); t.fireTimer = t.rate; game.audio.play('se_tap', 0.15); }
      }
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; var hit = false;
        for (var ek = enemies.length - 1; ek >= 0; ek--) { if (Math.hypot(b.x - enemies[ek].x, b.y - enemies[ek].y) < enemies[ek].r + 8) { enemies[ek].hp--; hit = true; if (enemies[ek].hp <= 0) { killed++; enemies.splice(ek, 1); if (killed >= NEEDED) { finish(true); return; } } break; } }
        if (hit || b.life <= 0) bullets.splice(bi, 1);
      }
    }

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < towers.length; ti2++) drawTower(towers[ti2]);
    for (var bi2 = 0; bi2 < bullets.length; bi2++) game.draw.rect(snap(bullets[bi2].x) - 5, snap(bullets[bi2].y) - 5, 10, 10, C.c);
    for (var ei2 = 0; ei2 < enemies.length; ei2++) drawEnemy(enemies[ei2]);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('KILLED ' + killed + ' / ' + NEEDED, W / 2, 168, 46, C.b);
    txt('TURRETS ' + towers.length + ' / ' + MAX_TOWERS, W / 2, H - 150, 38, C.c);
    for (var es = 0; es < MAX_ESCAPE; es++) game.draw.rect(snap(W / 2 + (es - (MAX_ESCAPE - 1) / 2) * 56) - 10, H - 100, 20, 20, es < escaped ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
