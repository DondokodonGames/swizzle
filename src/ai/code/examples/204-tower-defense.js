// 204-tower-defense.js
// タワーディフェンス — 侵入路にタップで砲台を置き、押し寄せる敵の波を食い止める防衛戦
// 操作: タップで砲台を設置（最大5基）
// 成功: 3波しのぐ  失敗: 敵がゴールに5回到達

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、防衛拠点） ──
  var C = { bg:'#040810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER DEFENSE';
  var HOW_TO_PLAY = 'TAP TO PLACE A TURRET (MAX 5)';
  var MAX_TOWERS = 5;
  var MAX_WAVES = 3;            // 修正2: 10 → 3（易化）
  var MAX_LIVES = 5;
  var TOP = 220;
  var PATH = [
    { x: snap(W * 0.2), y: TOP - 40 },
    { x: snap(W * 0.2), y: snap(H * 0.35) },
    { x: snap(W * 0.8), y: snap(H * 0.35) },
    { x: snap(W * 0.8), y: snap(H * 0.6) },
    { x: snap(W * 0.2), y: snap(H * 0.6) },
    { x: snap(W * 0.2), y: snap(H * 0.82) },
    { x: snap(W * 0.8), y: snap(H * 0.82) },
    { x: snap(W * 0.8), y: H + 40 }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var towers, bullets, enemies, particles, wave, lives, waveTimer, spawnQueue, done, score;

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

  function background() {
    game.draw.clear(C.bg);
    for (var pi = 0; pi < PATH.length - 1; pi++) {
      game.draw.line(PATH[pi].x, PATH[pi].y, PATH[pi + 1].x, PATH[pi + 1].y, C.d, 72);
      game.draw.line(PATH[pi].x, PATH[pi].y, PATH[pi + 1].x, PATH[pi + 1].y, '#1a2e10', 6);
    }
    // ゴール拠点
    pc(PATH[PATH.length - 1].x, H - 40, 48, C.e, 0.8);
  }

  function drawTower(t) {
    game.draw.circle(t.x, t.y, t.range, C.b, 0.03);
    pc(t.x, t.y, 30, C.b, 0.9);
    game.draw.rect(snap(t.x) - 6, snap(t.y) - 6, 12, 12, C.g, 0.8);
  }

  function drawEnemy(e) {
    var hp = e.hp / e.maxHp;
    pc(e.x, e.y, 26, C.a, 0.9);
    game.draw.rect(snap(e.x) - 12, snap(e.y) - 4, 6, 6, C.g); game.draw.rect(snap(e.x) + 6, snap(e.y) - 4, 6, 6, C.g);
    game.draw.rect(snap(e.x) - 26, snap(e.y) - 44, 52, 8, '#1a1a1a', 0.8);
    game.draw.rect(snap(e.x) - 26, snap(e.y) - 44, snap(52 * hp), 8, hp > 0.5 ? C.b : C.f);
  }

  function queueWave() {
    wave++;
    var count = 2 + wave * 2;
    for (var i = 0; i < count; i++) spawnQueue.push({ t: i * 0.4, hp: 2 + Math.floor(wave / 2), speed: 100 + wave * 12 });
  }

  function initGame() {
    towers = []; bullets = []; enemies = []; particles = []; wave = 0; lives = MAX_LIVES;
    waveTimer = 1.2; spawnQueue = []; done = false; score = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + lives * 300) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || y < TOP) return;
    if (towers.length >= MAX_TOWERS) { game.audio.play('se_failure', 0.2); return; }
    for (var pi = 0; pi < PATH.length - 1; pi++) {
      var px = PATH[pi].x, py = PATH[pi].y, dx = PATH[pi + 1].x - px, dy = PATH[pi + 1].y - py, len = dx * dx + dy * dy || 1;
      var t = Math.max(0, Math.min(1, ((x - px) * dx + (y - py) * dy) / len));
      if (Math.hypot(x - (px + t * dx), y - (py + t * dy)) < 60) { game.audio.play('se_failure', 0.2); return; }
    }
    towers.push({ x: snap(x), y: snap(y), fireTimer: 0, rate: 1.0, range: 240 });
    game.audio.play('se_tap', 0.5);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawTower({ x: W * 0.5, y: H * 0.5, range: 200 });
      drawEnemy({ x: W * 0.2, y: TOP + 60 + Math.floor(game.time.elapsed * 4) % 2 * 8, hp: 2, maxHp: 2 });
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 28, C.b);
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
      txt(resultSuccess ? 'DEFENDED!' : 'BREACHED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      // 波の生成
      if (wave < MAX_WAVES && spawnQueue.length === 0 && enemies.length === 0) {
        waveTimer -= dt;
        if (waveTimer <= 0) { queueWave(); waveTimer = 3; }
      }
      for (var qi = spawnQueue.length - 1; qi >= 0; qi--) {
        spawnQueue[qi].t -= dt;
        if (spawnQueue[qi].t <= 0) {
          var sp = spawnQueue.splice(qi, 1)[0];
          enemies.push({ pathIdx: 0, x: PATH[0].x, y: PATH[0].y, hp: sp.hp, maxHp: sp.hp, speed: sp.speed });
        }
      }
      // 敵移動
      for (var ei = enemies.length - 1; ei >= 0; ei--) {
        var e = enemies[ei], tg = PATH[Math.min(e.pathIdx + 1, PATH.length - 1)], dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy);
        if (d < 10) { e.pathIdx++; if (e.pathIdx >= PATH.length - 1) { lives--; enemies.splice(ei, 1); game.audio.play('se_failure', 0.4); if (lives <= 0) { finish(false); return; } continue; } }
        else { e.x += dx / d * e.speed * dt; e.y += dy / d * e.speed * dt; }
      }
      // 砲台発射
      for (var ti = 0; ti < towers.length; ti++) {
        var tw = towers[ti]; tw.fireTimer -= dt;
        if (tw.fireTimer <= 0 && enemies.length > 0) {
          var near = null, nd = tw.range;
          for (var ej = 0; ej < enemies.length; ej++) { var dd = Math.hypot(enemies[ej].x - tw.x, enemies[ej].y - tw.y); if (dd < nd) { near = enemies[ej]; nd = dd; } }
          if (near) { var bdx = near.x - tw.x, bdy = near.y - tw.y, bd = Math.hypot(bdx, bdy) || 1; bullets.push({ x: tw.x, y: tw.y, vx: bdx / bd * 700, vy: bdy / bd * 700, life: 0.7 }); tw.fireTimer = tw.rate; game.audio.play('se_tap', 0.2); }
        }
      }
      // 弾
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0) { bullets.splice(bi, 1); continue; }
        for (var ek = enemies.length - 1; ek >= 0; ek--) {
          if (Math.hypot(b.x - enemies[ek].x, b.y - enemies[ek].y) < 34) {
            enemies[ek].hp--;
            if (enemies[ek].hp <= 0) {
              score += 50;
              for (var pp = 0; pp < 5; pp++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: enemies[ek].x, y: enemies[ek].y, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140, life: 0.4 }); }
              enemies.splice(ek, 1);
              if (wave >= MAX_WAVES && enemies.length === 0 && spawnQueue.length === 0) { finish(true); return; }
            }
            bullets.splice(bi, 1); break;
          }
        }
      }
      for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) { var p = particles[pi2]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi2, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < towers.length; ti2++) drawTower(towers[ti2]);
    for (var bi2 = 0; bi2 < bullets.length; bi2++) game.draw.rect(snap(bullets[bi2].x) - 5, snap(bullets[bi2].y) - 5, 10, 10, C.c);
    for (var ei2 = 0; ei2 < enemies.length; ei2++) drawEnemy(enemies[ei2]);
    for (var pi3 = 0; pi3 < particles.length; pi3++) game.draw.rect(snap(particles[pi3].x) - 5, snap(particles[pi3].y) - 5, 10, 10, C.f, particles[pi3].life * 2.5);

    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < Math.ceil(wave / MAX_WAVES * 12) ? C.b : '#0a1420');
    txt('WAVE ' + Math.min(wave, MAX_WAVES) + ' / ' + MAX_WAVES, W / 2, 100, 44, C.c);
    txt('TURRETS ' + towers.length + ' / ' + MAX_TOWERS, W / 2, 168, 40, C.b);
    for (var li = 0; li < MAX_LIVES; li++) game.draw.rect(snap(W / 2 - 96 + li * 48) - 10, 200, 20, 20, li < lives ? C.e : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
