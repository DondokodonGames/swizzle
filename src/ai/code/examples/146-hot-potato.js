// 146-hot-potato.js
// 爆弾パス — 爆発する前に爆弾を投げ続けるスリリングなカウントゲーム
// 操作: タップで敵に爆弾を投げる
// 成功: 爆弾を2回投げる  失敗: 爆弾を持ったまま爆発 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HOT POTATO';
  var HOW_TO_PLAY = 'TAP AN ENEMY TO THROW THE BOMB';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 2;              // 修正2: 20 → 2
  var TOP    = 220;
  var BOMB_R = 48, FUSE_MAX = 3.5, FLY_SPEED = 2.2;

  var PLAYER = { x: snap(W / 2), y: snap(H * 0.76), r: 56 };
  var ENEMIES = [{ x: snap(W * 0.22), y: snap(TOP + 120), r: 48 }, { x: snap(W * 0.5), y: snap(TOP + 60), r: 48 }, { x: snap(W * 0.78), y: snap(TOP + 120), r: 48 }];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bombX, bombY, bombHolder, flyTarget, flyFrom, flyProgress, fuse, fuseDecay;
  var score, timeLeft, done, particles, sparkAngle;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawPlayer(hasBomb) {
    pc(PLAYER.x, PLAYER.y, PLAYER.r, hasBomb ? C.e : C.a, 1);
    game.draw.rect(PLAYER.x - 24, PLAYER.y - 12, 14, 14, C.g);   // 目
    game.draw.rect(PLAYER.x + 10, PLAYER.y - 12, 14, 14, C.g);
    game.draw.rect(PLAYER.x - 20, PLAYER.y + 16, 40, 8, C.g);    // 笑口
    game.draw.rect(PLAYER.x - 24, PLAYER.y + 24, 8, 8, C.g);
    game.draw.rect(PLAYER.x + 16, PLAYER.y + 24, 8, 8, C.g);
  }

  function drawEnemy(e, has) {
    pc(e.x, e.y, e.r, has ? C.c : C.a, 1);
    game.draw.rect(e.x - e.r, e.y - e.r, 16, 16, C.f);   // 角
    game.draw.rect(e.x + e.r - 16, e.y - e.r, 16, 16, C.f);
    game.draw.rect(e.x - 20, e.y - 8, 12, 12, C.e);      // 目
    game.draw.rect(e.x + 8, e.y - 8, 12, 12, C.e);
    game.draw.rect(e.x - 16, e.y + 16, 32, 6, C.bg);     // への字口
  }

  function drawBomb() {
    var ratio = fuse / FUSE_MAX, danger = ratio < 0.25;
    pc(bombX, bombY, BOMB_R, '#222222', 1);
    pc(bombX, bombY, BOMB_R - 16, '#000000', 1);
    pc(bombX - 14, bombY - 14, 8, C.g, 0.7);
    // 導火線＋火花（フレーム刻み）
    var fuseLen = ratio * 60;
    var tipX = bombX + Math.sin(sparkAngle) * 16, tipY = bombY - BOMB_R - fuseLen;
    game.draw.rect(snap(bombX) - 4, snap(bombY - BOMB_R - fuseLen) - 4, 8, snap(fuseLen), C.f);
    var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(snap(tipX) - 8, snap(tipY) - 8, 16, 16, on ? C.c : C.f, danger ? 1 : 0.7);
  }

  function initGame() {
    bombX = PLAYER.x; bombY = PLAYER.y - BOMB_R - 20; bombHolder = 'player';
    flyTarget = null; flyFrom = null; flyProgress = 0;
    fuse = FUSE_MAX; fuseDecay = 1.0;
    score = 0; timeLeft = MAX_TIME; done = false; particles = []; sparkAngle = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function startThrow(from, to) {
    flyFrom = { x: from.x, y: from.y };
    flyTarget = { x: to.x, y: to.y, holder: to.holder };
    flyProgress = 0; bombHolder = 'flying'; score++;
    game.audio.play('se_tap', 0.6);
    fuseDecay = Math.min(2.5, 1.0 + score * 0.05);
    if (score >= NEEDED) { finish(true); return; }
  }

  function enemyThrow() {
    for (var ei = 0; ei < ENEMIES.length; ei++) if (bombHolder === ei) { startThrow(ENEMIES[ei], { x: PLAYER.x, y: PLAYER.y, holder: 'player' }); return; }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || bombHolder === 'flying' || bombHolder !== 'player') return;
    for (var ei = 0; ei < ENEMIES.length; ei++) {
      if (Math.hypot(x - ENEMIES[ei].x, y - ENEMIES[ei].y) < ENEMIES[ei].r + 40) {
        startThrow(PLAYER, { x: ENEMIES[ei].x, y: ENEMIES[ei].y, holder: ei }); fuse = FUSE_MAX * 0.85; return;
      }
    }
    var rnd = Math.floor(Math.random() * ENEMIES.length);
    startThrow(PLAYER, { x: ENEMIES[rnd].x, y: ENEMIES[rnd].y, holder: rnd }); fuse = FUSE_MAX * 0.85;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawEnemy(ENEMIES[1], false); drawPlayer(true);
      bombX = PLAYER.x; bombY = PLAYER.y - BOMB_R - 20; fuse = FUSE_MAX; sparkAngle += dt * 8;
      drawBomb();
      txt(GAME_TITLE, W / 2, H * 0.10, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SAFE!' : 'BOOM!', W / 2, H * 0.35, 84, resultSuccess ? C.b : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    sparkAngle += dt * 8;
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (bombHolder === 'player' || typeof bombHolder === 'number') {
        fuse -= dt * fuseDecay;
        if (fuse <= 0) {
          fuse = 0;
          for (var pi = 0; pi < 20; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: bombX, y: bombY, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.6 }); }
          finish(false); return;
        }
      }
      if (bombHolder === 'flying') {
        flyProgress += FLY_SPEED * dt;
        if (flyProgress >= 1) {
          flyProgress = 1; bombHolder = flyTarget.holder; bombX = flyTarget.x; bombY = flyTarget.y;
          if (typeof bombHolder === 'number') {
            var captured = bombHolder;
            setTimeout(function() { if (state === S.PLAYING && !done && bombHolder === captured) enemyThrow(); }, (0.3 + Math.random() * 0.4) * 1000);
          }
        } else {
          var arc = Math.sin(flyProgress * Math.PI) * -200;
          bombX = flyFrom.x + (flyTarget.x - flyFrom.x) * flyProgress;
          bombY = flyFrom.y + (flyTarget.y - flyFrom.y) * flyProgress + arc;
        }
      } else if (bombHolder === 'player') { bombX = PLAYER.x; bombY = PLAYER.y - BOMB_R - 20; }
      else if (typeof bombHolder === 'number') { bombX = ENEMIES[bombHolder].x; bombY = ENEMIES[bombHolder].y - BOMB_R - 10; }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    drawPlayer(bombHolder === 'player');
    for (var ei2 = 0; ei2 < ENEMIES.length; ei2++) drawEnemy(ENEMIES[ei2], bombHolder === ei2);
    drawBomb();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 6, snap(particles[pp].y) - 6, 12, 12, C.f, particles[pp].life * 1.5);

    // 導火線ゲージ
    var ratio = fuse / FUSE_MAX;
    game.draw.rect(snap(W * 0.1), H - 120, snap(W * 0.8), 24, '#2a0a3a');
    game.draw.rect(snap(W * 0.1), H - 120, snap(W * 0.8 * ratio), 24, ratio < 0.25 ? C.e : C.f, 0.9);
    if (bombHolder === 'player') txt('TAP AN ENEMY!', W / 2, H * 0.66, 40, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
