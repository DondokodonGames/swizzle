// 651-lava-hop.js
// ラバホップ — 溶岩に浮かぶ石を、沈む前にタップで次々に飛び移って進む
// 操作: タップで次の石へジャンプ。乗った石は少し待つと沈み始める。溶岩に落ちるとミス
// 成功: 15石 クリア  失敗: 3回 落下 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、溶岩洞） ──
  var C = { bg:'#100200', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LAVA HOP';
  var HOW_TO_PLAY = 'TAP TO LEAP TO THE NEXT STONE · THEY SINK ONCE YOU LAND · DODGE THE LAVA';
  var MAX_TIME = 18;
  var NEEDED   = 15;         // 修正2: 25 → 15
  var MAX_FELL = 3;          // 修正2: 5 → 3
  var STONE_R = 56, LAVA_Y = snap(H * 0.68), PLAYER_R = 32;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stones, playerX, playerY, jumping, jumpX, jumpY, jumpTX, jumpTY, jumpT, currentStone, cleared, fell, timeLeft, done, particles, flash, flashCol, lavaWave;
  var jumpDur = 0.35;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1c0400');
  }

  function background() { game.draw.clear(C.bg); }

  function genStones() {
    stones = []; var x = 120;
    for (var i = 0; i < 6; i++) { var y = LAVA_Y - 80 - Math.random() * 160; stones.push({ x: x, y: y, sinkSpeed: 15 + Math.random() * 20, sinking: false, sinkTimer: 0, r: STONE_R }); x += 140 + Math.random() * 100; }
    currentStone = 0; playerX = stones[0].x; playerY = stones[0].y - STONE_R - PLAYER_R; stones[0].sinking = true; stones[0].sinkTimer = 1.5;
  }

  function shiftStones() {
    stones.shift(); var lastX = stones[stones.length - 1].x, y = LAVA_Y - 80 - Math.random() * 160;
    stones.push({ x: lastX + 140 + Math.random() * 100, y: y, sinkSpeed: 15 + Math.random() * 20 + cleared * 0.5, sinking: false, sinkTimer: 0, r: STONE_R });
    currentStone = Math.max(0, currentStone - 1);
  }

  function initGame() { cleared = 0; fell = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; lavaWave = 0; jumping = false; genStones(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 400 + Math.ceil(timeLeft) * 100) : cleared * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function jumpTo(idx) {
    if (jumping || idx >= stones.length) return;
    var target = stones[idx]; if (!target) return;
    jumping = true; jumpX = playerX; jumpY = playerY; jumpTX = target.x; jumpTY = target.y - STONE_R - PLAYER_R; jumpT = 0; currentStone = idx; target.sinking = true; target.sinkTimer = 1.5; game.audio.play('se_tap', 0.2);
  }

  function drawScene() {
    game.draw.rect(0, LAVA_Y, W, H - LAVA_Y, C.f, 0.8);
    for (var lw = 0; lw < 8; lw++) { var lwx = (lw * W / 7 + lavaWave * 60) % (W + 60) - 30; pc(lwx, LAVA_Y, 40, C.c, 0.3 + Math.sin(lavaWave + lw) * 0.1); }
    game.draw.rect(0, LAVA_Y, W, 20, C.a, 0.4);
    for (var si = 0; si < stones.length; si++) {
      var s = stones[si]; if (s.y > H + 60) continue;
      var sr = s.sinking ? Math.max(0, 1 - s.sinkTimer / 1.5) : 0;
      pc(s.x, s.y, s.r, sr > 0.5 ? '#44403c' : '#57534e', 0.9); pc(s.x - 16, s.y - 16, s.r * 0.3, C.g, 0.4);
      if (sr > 0.3) pc(s.x, s.y, s.r + 10, C.f, (sr - 0.3) / 0.7 * 0.4);
    }
    pc(playerX, playerY, PLAYER_R, C.e, 0.9); pc(playerX - 10, playerY - 10, PLAYER_R * 0.3, C.g, 0.5);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || jumping) return;
    var bestIdx = -1, bestDist = Infinity;
    for (var i = 0; i < stones.length; i++) { if (i <= currentStone) continue; var dx = stones[i].x - tx, dy = stones[i].y - ty, d = Math.sqrt(dx * dx + dy * dy); if (d < bestDist) { bestDist = d; bestIdx = i; } }
    if (bestIdx >= 0 && bestDist < 300) jumpTo(bestIdx); else jumpTo(currentStone + 1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stones) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LAVA MASTER!' : 'MELTED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4; lavaWave += dt * 2;
      if (jumping) {
        jumpT += dt; var t = Math.min(1, jumpT / jumpDur), arc = Math.sin(t * Math.PI) * 120;
        playerX = jumpX + (jumpTX - jumpX) * t; playerY = jumpY + (jumpTY - jumpY) * t - arc;
        if (t >= 1) {
          jumping = false; playerX = jumpTX; playerY = jumpTY; cleared++; game.audio.play('se_success', 0.3);
          for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: playerY, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.3, col: C.e }); }
          if (cleared >= NEEDED) { finish(true); return; }
          if (currentStone >= 4) shiftStones();
        }
      }
      for (var si = 0; si < stones.length; si++) { var s = stones[si]; if (s.sinking) { s.sinkTimer -= dt; if (s.sinkTimer <= 0) s.y += s.sinkSpeed * dt; } }
      if (!jumping) {
        var cur = stones[currentStone];
        if (cur && cur.y - STONE_R > LAVA_Y) {
          fell++; flash = 0.5; flashCol = C.f; game.audio.play('se_failure', 0.45);
          for (var p2 = 0; p2 < 8; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: LAVA_Y, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.5, col: C.c }); }
          if (fell >= MAX_FELL) { finish(false); return; } genStones(); return;
        }
        if (cur) playerY = cur.y - STONE_R - PLAYER_R;
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2.5; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FELL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FELL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fell ? C.a : '#1c0400');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
