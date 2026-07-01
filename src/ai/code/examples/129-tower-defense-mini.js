// 129-tower-defense-mini.js
// ミニ防衛 — 砲塔を向けて敵の波を食い止める瞬間判断のタワーディフェンス
// 操作: タップで砲台を向ける（近くの敵を自動で狙い撃つ）
// 成功: 1波防衛  失敗: 敵がゴールに3体到達 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、防衛レーダー） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MINI DEFENSE';
  var HOW_TO_PLAY = 'TAP TO AIM · AUTO-FIRE AT ENEMIES';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var TOTAL_WAVES = 1;           // 修正2: 5 → 1
  var MAX_BREACH = 3;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var PATH = [
    { x: 0,        y: snap(H * 0.30) },
    { x: snap(W * 0.30), y: snap(H * 0.30) },
    { x: snap(W * 0.30), y: snap(H * 0.52) },
    { x: snap(W * 0.70), y: snap(H * 0.52) },
    { x: snap(W * 0.70), y: snap(H * 0.30) },
    { x: W,        y: snap(H * 0.30) }
  ];

  var TOWER_X = snap(W / 2);
  var TOWER_Y = snap(H * 0.74);   // 下部三分の一
  var TOWER_R = 48;
  var CANNON_L = 64;
  var FIRE_RATE = 1.6;
  var BULLET_SPEED = 720;
  var BULLET_R = 14;
  var ENEMY_R = 32;
  var ENEMY_SPEED = 80;
  var WAVE_SIZE = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bullets, enemies, cannonAngle, fireTimer, wave, waveTimer, waveSpawnCount;
  var enemiesInWave, waveActive, breachCount, kills, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) {
          game.draw.rect(cx + px, cy + py, step, step, color, alpha);
        }
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) {
      game.draw.rect(0, sy, W, 2, '#000000', 0.18);
    }
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#003300');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    // レーダーグリッド
    for (var gx = 0; gx < W; gx += 120) game.draw.rect(gx, TOP, 2, BOTTOM - TOP, C.d, 0.2);
    for (var gy = TOP; gy < BOTTOM; gy += 120) game.draw.rect(0, gy, W, 2, C.d, 0.2);
  }

  function getPathPoint(idx, prog) {
    var p1 = PATH[idx], p2 = PATH[idx + 1];
    return { x: p1.x + (p2.x - p1.x) * prog, y: p1.y + (p2.y - p1.y) * prog };
  }

  function getSegLen(idx) {
    var p1 = PATH[idx], p2 = PATH[idx + 1];
    return Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawEnemy(pt, e) {
    // 侵入者：本体＋目＋脚
    drawPixelCircle(pt.x, pt.y, ENEMY_R, C.f, 0.9);
    game.draw.rect(pt.x - 16, pt.y - 8, 12, 12, C.g);
    game.draw.rect(pt.x + 4,  pt.y - 8, 12, 12, C.g);
    game.draw.rect(pt.x - 12, pt.y - 4, 4, 4, C.bg);
    game.draw.rect(pt.x + 8,  pt.y - 4, 4, 4, C.bg);
    game.draw.rect(pt.x - ENEMY_R, pt.y + ENEMY_R - 8, 12, 12, C.f); // 脚
    game.draw.rect(pt.x + ENEMY_R - 12, pt.y + ENEMY_R - 8, 12, 12, C.f);
    // HPバー
    var hpW = ENEMY_R * 2 * (e.hp / e.maxHp);
    game.draw.rect(pt.x - ENEMY_R, pt.y - ENEMY_R - 16, ENEMY_R * 2, 8, '#003300');
    game.draw.rect(pt.x - ENEMY_R, pt.y - ENEMY_R - 16, hpW, 8, C.a);
  }

  function drawTower() {
    var cx2 = TOWER_X + Math.cos(cannonAngle) * (TOWER_R + CANNON_L);
    var cy2 = TOWER_Y + Math.sin(cannonAngle) * (TOWER_R + CANNON_L);
    // 砲身
    for (var t = 0; t < 8; t++) {
      var bx = TOWER_X + Math.cos(cannonAngle) * (TOWER_R + t * 8);
      var by = TOWER_Y + Math.sin(cannonAngle) * (TOWER_R + t * 8);
      game.draw.rect(snap(bx) - 8, snap(by) - 8, 16, 16, C.e);
    }
    // 基部（多矩形の砲台）
    drawPixelCircle(TOWER_X, TOWER_Y, TOWER_R, C.d, 1);
    drawPixelCircle(TOWER_X, TOWER_Y, TOWER_R - 12, C.a, 0.8);
    game.draw.rect(TOWER_X - 12, TOWER_Y - 12, 24, 24, C.c);
    game.draw.rect(TOWER_X - TOWER_R, TOWER_Y + TOWER_R - 8, TOWER_R * 2, 12, C.d);
    // 未使用変数を避けるための描画
    game.draw.rect(snap(cx2) - 4, snap(cy2) - 4, 8, 8, C.e, 0);
  }

  // ── 初期化 ──
  function initGame() {
    bullets = []; enemies = []; particles = [];
    cannonAngle = -Math.PI / 2;
    fireTimer = 0;
    wave = 0; waveTimer = 1.2; waveSpawnCount = 0; enemiesInWave = 0;
    waveActive = false; breachCount = 0; kills = 0;
    timeLeft = MAX_TIME;
    done = false;
  }

  function startWave() {
    wave++;
    waveActive = true;
    waveSpawnCount = 0;
    enemiesInWave = WAVE_SIZE + wave;
    waveTimer = 0;
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (kills * 60 + wave * 200 + Math.ceil(timeLeft) * 20) : kills * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING
    if (done) return;
    cannonAngle = Math.atan2(y - TOWER_Y, x - TOWER_X);
    game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawPath();
      drawTower();
      drawEnemy(getPathPoint(1, (game.time.elapsed * 0.3) % 1), { hp: 2, maxHp: 2 });
      txt(GAME_TITLE,  W / 2, H * 0.80, 78, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 30, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.10, 60, C.e);
        txt('TAP TO START', W / 2, H * 0.16, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEFENDED!' : 'BREACHED', W / 2, H * 0.35, 80, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }

      if (!waveActive) {
        if (wave < TOTAL_WAVES) {
          waveTimer -= dt;
          if (waveTimer <= 0) startWave();
        } else if (enemies.length === 0) {
          finish(true); return;
        }
      } else {
        waveTimer -= dt;
        if (waveTimer <= 0 && waveSpawnCount < enemiesInWave) {
          waveTimer = 0.9;
          waveSpawnCount++;
          enemies.push({ pathIdx: 0, progress: 0, hp: 1 + wave, maxHp: 1 + wave });
        }
        if (waveSpawnCount >= enemiesInWave && enemies.length === 0) {
          waveActive = false;
          waveTimer = 1.0;
        }
      }

      // 自動発射
      fireTimer -= dt;
      if (fireTimer <= 0 && enemies.length > 0) {
        fireTimer = 1 / FIRE_RATE;
        var closest = null, cd = 1e9;
        for (var i = 0; i < enemies.length; i++) {
          var pt = getPathPoint(enemies[i].pathIdx, enemies[i].progress);
          var d = Math.hypot(pt.x - TOWER_X, pt.y - TOWER_Y);
          if (d < cd) { cd = d; closest = pt; }
        }
        if (closest) {
          cannonAngle = Math.atan2(closest.y - TOWER_Y, closest.x - TOWER_X);
          bullets.push({
            x: TOWER_X + Math.cos(cannonAngle) * (TOWER_R + 10),
            y: TOWER_Y + Math.sin(cannonAngle) * (TOWER_R + 10),
            vx: Math.cos(cannonAngle) * BULLET_SPEED,
            vy: Math.sin(cannonAngle) * BULLET_SPEED
          });
          game.audio.play('se_tap', 0.3);
        }
      }

      // 敵移動
      for (var i2 = 0; i2 < enemies.length; i2++) {
        var en = enemies[i2];
        if (en.pathIdx >= PATH.length - 1) continue;
        en.progress += (ENEMY_SPEED * (1 + wave * 0.1)) / getSegLen(en.pathIdx) * dt;
        if (en.progress >= 1) {
          en.pathIdx++; en.progress -= 1;
          if (en.pathIdx >= PATH.length - 1) {
            en.reachedGoal = true;
            breachCount++;
            game.audio.play('se_failure', 0.6);
            if (breachCount >= MAX_BREACH) { finish(false); return; }
          }
        }
      }

      // 弾移動＆命中
      for (var bi = 0; bi < bullets.length; bi++) {
        var b = bullets[bi];
        b.x += b.vx * dt; b.y += b.vy * dt;
        for (var ei = 0; ei < enemies.length; ei++) {
          var en2 = enemies[ei];
          var pt2 = getPathPoint(en2.pathIdx, en2.progress);
          if (Math.hypot(b.x - pt2.x, b.y - pt2.y) < BULLET_R + ENEMY_R) {
            en2.hp--; b.hit = true;
            if (en2.hp <= 0) {
              kills++;
              for (var pi = 0; pi < 6; pi++) {
                var ang = Math.random() * Math.PI * 2;
                particles.push({ x: pt2.x, y: pt2.y, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, life: 0.35 });
              }
            }
            break;
          }
        }
      }
      bullets = bullets.filter(function(b) { return !b.hit && b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < H + 50; });
      enemies = enemies.filter(function(e) { return !e.reachedGoal && e.hp > 0; });
    }

    for (var k = 0; k < particles.length; k++) {
      particles[k].x += particles[k].vx * dt; particles[k].y += particles[k].vy * dt; particles[k].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- 描画 ----
    background();
    drawPath();
    for (var ei2 = 0; ei2 < enemies.length; ei2++) {
      drawEnemy(getPathPoint(enemies[ei2].pathIdx, enemies[ei2].progress), enemies[ei2]);
    }
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      drawPixelCircle(bullets[bi2].x, bullets[bi2].y, BULLET_R, C.e, 1);
    }
    drawTower();
    for (var pp = 0; pp < particles.length; pp++) {
      game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.f, particles[pp].life * 3);
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt('WAVE ' + Math.max(1, wave) + '/' + TOTAL_WAVES, W / 2, 168, 48, C.b);
    // 突破ドット
    for (var bd = 0; bd < MAX_BREACH; bd++) {
      var bx = snap(W / 2 + (bd - (MAX_BREACH - 1) / 2) * 56);
      game.draw.rect(bx - 12, 208, 24, 24, bd < breachCount ? C.f : '#003300');
    }
    scanlines();
  });

  function drawPath() {
    for (var i = 0; i < PATH.length - 1; i++) {
      var p1 = PATH[i], p2 = PATH[i + 1];
      game.draw.line(p1.x, p1.y, p2.x, p2.y, C.d, 56);
      game.draw.line(p1.x, p1.y, p2.x, p2.y, C.a, 4);
    }
    var goal = PATH[PATH.length - 1];
    drawPixelCircle(goal.x - 16, goal.y, 28, C.f, 0.8);
    txt('EXIT', goal.x - 40, goal.y - 60, 32, C.f);
  }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
