// 648-tower-defense.js
// タワーディフェンス — 経路の脇にタップで砲台を建て、進軍する敵をゴール前で撃退する
// 操作: タップで砲台を配置（Gを消費）。砲台が自動で敵を撃つ。敵の突破を防ぐ
// 成功: 3ウェーブ 撃退  失敗: 敵3体 突破 or 45秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、防衛戦線） ──
  var C = { bg:'#040801', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER DEFENSE';
  var HOW_TO_PLAY = 'TAP BESIDE THE PATH TO BUILD TURRETS · STOP THE ENEMIES REACHING BASE';
  var MAX_TIME = 45;
  var TOTAL_WAVES = 3;       // 修正2: 5 → 3
  var MAX_LEAK = 3;          // 修正2: lives 5 → 3
  var TOWER_COST = 25, WAVE_INTERVAL = 5;
  var PATH = [{x:W*0.8,y:H*0.14},{x:W*0.8,y:H*0.30},{x:W*0.2,y:H*0.30},{x:W*0.2,y:H*0.48},{x:W*0.8,y:H*0.48},{x:W*0.8,y:H*0.66},{x:W*0.2,y:H*0.66},{x:W*0.2,y:H*0.82}];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var towers, enemies, bullets, particles, gold, leaked, wave, waveTimer, waveActive, enemiesInWave, enemiesSpawned, spawnTimer, timeLeft, done, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#050a02');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { towers = []; enemies = []; bullets = []; particles = []; gold = 80; leaked = 0; wave = 0; waveTimer = 3; waveActive = false; enemiesInWave = 0; enemiesSpawned = 0; spawnTimer = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.a; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (wave * 800 + Math.ceil(timeLeft) * 60 + (MAX_LEAK - leaked) * 400) : wave * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function startWave() { wave++; waveActive = true; enemiesInWave = 3 + wave * 2; enemiesSpawned = 0; spawnTimer = 0; }

  function spawnEnemy() { var isBoss = wave >= 2 && enemiesSpawned === enemiesInWave - 1; enemies.push({ pathIdx: 0, x: PATH[0].x, y: PATH[0].y, speed: isBoss ? 60 : (80 + wave * 10), maxHp: isBoss ? (16 + wave * 8) : (3 + wave * 2), hp: isBoss ? (16 + wave * 8) : (3 + wave * 2), r: isBoss ? 42 : 28, isBoss: isBoss, reward: isBoss ? 20 : 8 }); enemiesSpawned++; }

  function placeTower(tx, ty) {
    for (var pi = 0; pi < PATH.length - 1; pi++) { var a = PATH[pi], b = PATH[pi + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy); var nx = Math.max(0, Math.min(len, (tx - a.x) * dx / len + (ty - a.y) * dy / len)), clx = a.x + dx / len * nx, cly = a.y + dy / len * nx; if (Math.sqrt((tx - clx) * (tx - clx) + (ty - cly) * (ty - cly)) < 80) return; }
    towers.push({ x: tx, y: ty, range: 240, fireRate: 1.5, cooldown: 0 }); gold -= TOWER_COST; game.audio.play('se_tap', 0.2);
  }

  function drawScene() {
    for (var pi = 0; pi < PATH.length - 1; pi++) { var a = PATH[pi], b = PATH[pi + 1]; game.draw.line(a.x, a.y, b.x, b.y, '#1a1205', 90); game.draw.line(a.x, a.y, b.x, b.y, '#2a1c08', 4); }
    pc(PATH[0].x, PATH[0].y, 30, C.a, 0.7); txt('IN', PATH[0].x, PATH[0].y + 10, 26, C.g);
    pc(PATH[PATH.length - 1].x, PATH[PATH.length - 1].y, 30, C.d, 0.7); txt('BASE', PATH[PATH.length - 1].x, PATH[PATH.length - 1].y + 10, 22, C.g);
    for (var ti = 0; ti < towers.length; ti++) { var t = towers[ti]; pc(t.x, t.y, t.range, C.b, 0.03); pc(t.x, t.y, 34, C.d, 0.9); pc(t.x, t.y, 22, C.b, 0.6); game.draw.rect(snap(t.x) - 4, snap(t.y - 60), 8, 26, C.b, 0.8); }
    for (var ei = 0; ei < enemies.length; ei++) {
      var e = enemies[ei], hr = e.hp / e.maxHp;
      pc(e.x, e.y, e.r, e.isBoss ? C.d : C.a, 0.9); pc(e.x - e.r * 0.3, e.y - e.r * 0.3, e.r * 0.25, C.g, 0.5);
      game.draw.rect(snap(e.x - e.r), snap(e.y - e.r - 14), e.r * 2, 8, '#111', 0.8); game.draw.rect(snap(e.x - e.r), snap(e.y - e.r - 14), e.r * 2 * hr, 8, hr > 0.5 ? C.b : C.a, 0.9);
    }
    for (var bi = 0; bi < bullets.length; bi++) pc(bullets[bi].x, bullets[bi].y, 10, C.c, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (gold >= TOWER_COST && ty > H * 0.10) placeTower(tx, ty);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!towers) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.06, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.095, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BASE HELD!' : 'OVERRUN', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      if (!waveActive) { waveTimer -= dt; if (waveTimer <= 0 && wave < TOTAL_WAVES) startWave(); }
      if (waveActive && enemiesSpawned < enemiesInWave) { spawnTimer += dt; if (spawnTimer >= 1.2) { spawnTimer = 0; spawnEnemy(); } }
      for (var ei = enemies.length - 1; ei >= 0; ei--) {
        var e = enemies[ei], target = PATH[e.pathIdx + 1];
        if (!target) { leaked++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.4); enemies.splice(ei, 1); if (leaked >= MAX_LEAK) { finish(false); return; } continue; }
        var dx = target.x - e.x, dy = target.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 12) e.pathIdx++; else { e.x += (dx / dist) * e.speed * dt; e.y += (dy / dist) * e.speed * dt; }
      }
      if (waveActive && enemiesSpawned >= enemiesInWave && enemies.length === 0) {
        waveActive = false; waveTimer = WAVE_INTERVAL; gold += 20 + wave * 5; game.audio.play('se_success', 0.5);
        if (wave >= TOTAL_WAVES) { finish(true); return; }
      }
      for (var ti = 0; ti < towers.length; ti++) {
        var tow = towers[ti]; tow.cooldown -= dt; if (tow.cooldown > 0) continue;
        var closest = null, cd = tow.range;
        for (var ei2 = 0; ei2 < enemies.length; ei2++) { var e2 = enemies[ei2], dx2 = e2.x - tow.x, dy2 = e2.y - tow.y, d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2); if (d2 < cd) { cd = d2; closest = ei2; } }
        if (closest !== null) { var t2 = enemies[closest]; bullets.push({ x: tow.x, y: tow.y, tx: t2.x, ty: t2.y, targetIdx: closest, speed: 700, dmg: 1 }); tow.cooldown = 1 / tow.fireRate; }
      }
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi], dx3 = b.tx - b.x, dy3 = b.ty - b.y, d3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
        if (d3 < 20) {
          if (b.targetIdx < enemies.length) { var he = enemies[b.targetIdx]; he.hp -= b.dmg; if (he.hp <= 0) { gold += he.reward; for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: he.x, y: he.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: he.isBoss ? C.d : C.a }); } enemies.splice(b.targetIdx, 1); } }
          bullets.splice(bi, 1); continue;
        }
        b.x += (dx3 / d3) * b.speed * dt; b.y += (dy3 / d3) * b.speed * dt;
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('G ' + gold, 120, 156, 40, C.c, 'left');
    txt('WAVE ' + wave + '/' + TOTAL_WAVES, W / 2, 156, 40, C.b);
    for (var li = 0; li < MAX_LEAK; li++) game.draw.rect(W - 60 - li * 40, 138, 20, 20, li < (MAX_LEAK - leaked) ? C.b : '#050a02');
    if (gold < TOWER_COST) txt('LOW GOLD', W / 2, snap(H * 0.06), 30, C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
