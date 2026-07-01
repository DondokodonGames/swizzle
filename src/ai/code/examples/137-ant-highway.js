// 137-ant-highway.js
// アリの道 — 行列を乱す障害物をタップで除去してアリをゴールへ導く誘導ゲーム
// 操作: タップで障害物を除去（障害物は自動再生成）
// 成功: 5匹のアリをゴールへ  失敗: 20匹が迷子 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、巣穴） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ANT HIGHWAY';
  var HOW_TO_PLAY = 'TAP TO CLEAR OBSTACLES · GUIDE THE ANTS';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 5;              // 修正2: 50 → 5
  var MAX_LOST = 20;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var PATH = [
    { x: 0, y: snap(H * 0.5) }, { x: snap(W * 0.2), y: snap(H * 0.5) },
    { x: snap(W * 0.2), y: snap(H * 0.34) }, { x: snap(W * 0.5), y: snap(H * 0.34) },
    { x: snap(W * 0.5), y: snap(H * 0.64) }, { x: snap(W * 0.8), y: snap(H * 0.64) },
    { x: snap(W * 0.8), y: snap(H * 0.42) }, { x: W, y: snap(H * 0.42) }
  ];
  var ANT_SPEED = 0.12, SPAWN_INTERVAL = 0.35, BLOCK_R = 32, MAX_BLOCKS = 4, BLOCK_RESPAWN = 3.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ants, blocks, particles, spawnTimer, blockTimer, arrived, lost, totalSpawned, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#003300');
  }

  function getPathAt(t) {
    var total = 0, segs = [];
    for (var i = 0; i < PATH.length - 1; i++) {
      var l = Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].y - PATH[i].y);
      segs.push(l); total += l;
    }
    var target = t * total, cum = 0;
    for (var j = 0; j < segs.length; j++) {
      if (cum + segs[j] >= target) {
        var f = (target - cum) / segs[j];
        return { x: PATH[j].x + (PATH[j + 1].x - PATH[j].x) * f, y: PATH[j].y + (PATH[j + 1].y - PATH[j].y) * f };
      }
      cum += segs[j];
    }
    return PATH[PATH.length - 1];
  }

  function spawnBlock() {
    if (blocks.length >= MAX_BLOCKS) return;
    var t = 0.1 + Math.random() * 0.8;
    for (var i = 0; i < blocks.length; i++) if (Math.abs(blocks[i].t - t) < 0.1) return;
    blocks.push({ t: t });
  }

  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < PATH.length - 1; i++) {
      game.draw.line(PATH[i].x, PATH[i].y, PATH[i + 1].x, PATH[i + 1].y, C.d, 44);
      game.draw.line(PATH[i].x, PATH[i].y, PATH[i + 1].x, PATH[i + 1].y, C.a, 4);
    }
    var goal = PATH[PATH.length - 1];
    pc(goal.x - 24, goal.y, 32, C.e, Math.floor(game.time.elapsed * 8) % 2 === 0 ? 0.9 : 0.5);
    txt('NEST', goal.x - 40, goal.y - 56, 30, C.e);
  }

  function drawAnt(pos) {
    pc(pos.x, pos.y, 12, C.a, 1);
    pc(pos.x, pos.y - 14, 8, C.b, 1);          // 頭
    game.draw.rect(snap(pos.x) - 16, snap(pos.y), 8, 4, C.a);   // 脚
    game.draw.rect(snap(pos.x) + 8, snap(pos.y), 8, 4, C.a);
  }

  function drawBlock(pos) {
    pc(pos.x, pos.y, BLOCK_R, C.f, 0.9);
    game.draw.rect(snap(pos.x) - 20, snap(pos.y) - 4, 40, 8, C.g);
    game.draw.rect(snap(pos.x) - 4, snap(pos.y) - 20, 8, 40, C.g);
  }

  function initGame() {
    ants = []; blocks = []; particles = [];
    spawnTimer = 0.3; blockTimer = BLOCK_RESPAWN;
    arrived = 0; lost = 0; totalSpawned = 0;
    timeLeft = MAX_TIME; done = false;
    spawnBlock(); spawnBlock();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (arrived * 100 + Math.ceil(timeLeft) * 20) : arrived * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = blocks.length - 1; i >= 0; i--) {
      var bp = getPathAt(blocks[i].t);
      if (Math.hypot(x - bp.x, y - bp.y) < BLOCK_R + 40) {
        blocks.splice(i, 1);
        game.audio.play('se_tap', 0.7);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: bp.x, y: bp.y, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.3 });
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var d = 0; d < 4; d++) drawAnt(getPathAt((game.time.elapsed * 0.15 + d * 0.12) % 1));
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.82, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.e);
        txt('TAP TO START', W / 2, H * 0.93, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HOME SAFE!' : 'LOST TRAIL', W / 2, H * 0.35, 76, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }

      spawnTimer -= dt;
      if (spawnTimer <= 0 && totalSpawned < NEEDED + MAX_LOST) {
        spawnTimer = SPAWN_INTERVAL;
        ants.push({ t: 0, speed: ANT_SPEED * (0.8 + Math.random() * 0.4), lost: false, done: false });
        totalSpawned++;
      }
      blockTimer -= dt;
      if (blockTimer <= 0) { blockTimer = BLOCK_RESPAWN; spawnBlock(); }

      for (var ai = 0; ai < ants.length; ai++) {
        var ant = ants[ai];
        if (ant.lost || ant.done) continue;
        var blocked = false;
        for (var bi = 0; bi < blocks.length; bi++) if (Math.abs(ant.t - blocks[bi].t) < 0.045) { blocked = true; break; }
        if (!blocked) ant.t += ant.speed * dt;
        if (ant.t >= 1) { ant.done = true; arrived++; if (arrived >= NEEDED) { finish(true); return; } }
      }
      var stuck = ants.filter(function(a) { return !a.lost && !a.done && a.t < 0.05; }).length;
      if (stuck > 5) {
        for (var k = 0; k < ants.length; k++) {
          if (!ants[k].lost && !ants[k].done && ants[k].t < 0.05) {
            ants[k].lost = true; lost++;
            if (lost >= MAX_LOST) { finish(false); return; }
          }
        }
      }
      ants = ants.filter(function(a) { return !a.done && !a.lost; });
    }

    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt; particles[pi].y += particles[pi].vy * dt; particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- 描画 ----
    background();
    for (var a2 = 0; a2 < ants.length; a2++) if (!ants[a2].lost) drawAnt(getPathAt(ants[a2].t));
    for (var b2 = 0; b2 < blocks.length; b2++) drawBlock(getPathAt(blocks[b2].t));
    for (var pp = 0; pp < particles.length; pp++) {
      game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.f, particles[pp].life * 3);
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(arrived + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
