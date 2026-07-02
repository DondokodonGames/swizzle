// 358-bridge-cross.js
// ブリッジクロス — ひび割れた飛び石をタップで一歩ずつ渡り、崩れる前に対岸のゴールへ渡り切る
// 操作: 隣の石をタップして跳ぶ（ひび石は踏むと崩れ落下）
// 成功: 川を3回 渡り切る  失敗: 3回 落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、渓流の飛び石） ──
  var C = { bg:'#0a1628', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', water:'#0a3a70', stone:'#556' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BRIDGE CROSS';
  var HOW_TO_PLAY = 'TAP THE NEXT STONE TO HOP · CRACKED ONES CRUMBLE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_FALL = 3;          // 修正2: 4 → 3
  var NUM = 4, SPACING = (W - 240) / (NUM + 1);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stones, idx, crossed, falls, timeLeft, done, particles, jumping, jumpFrom, jumpTo, jumpT, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, snap(H * 0.42), W, snap(H * 0.30), C.water, 0.8); for (var wx = 0; wx < W; wx += 96) game.draw.rect(wx, snap(H * 0.42 + Math.sin(game.time.elapsed * 2 + wx * 0.02) * 12), 50, 4, C.e, 0.3); }

  function setupRiver() {
    stones = []; stones.push({ x: 90, y: snap(H * 0.56), r: 56, hp: 9, crack: false });
    for (var i = 0; i < NUM; i++) { var hp = 1 + Math.floor(Math.random() * 3); stones.push({ x: snap(120 + (i + 1) * SPACING), y: snap(H * 0.56 + (Math.random() - 0.5) * 70), r: 44, hp: hp, max: hp, crack: hp < 3 }); }
    stones.push({ x: W - 90, y: snap(H * 0.56), r: 56, hp: 9, crack: false });
    idx = 0;
  }

  function initGame() { crossed = 0; falls = 0; timeLeft = MAX_TIME; done = false; particles = []; jumping = false; jumpT = 0; fbText = ''; fbCol = C.g; fbTimer = 0; setupRiver(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (crossed * 500 + Math.ceil(timeLeft) * 100) : crossed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, snap(H * 0.48), 120, snap(H * 0.24), C.stone, 0.8); game.draw.rect(W - 120, snap(H * 0.48), 120, snap(H * 0.24), C.b, 0.5);
    txt('START', 60, snap(H * 0.50), 26, C.g); txt('GOAL', W - 60, snap(H * 0.50), 26, C.b);
    for (var si = 0; si < stones.length; si++) {
      var s = stones[si]; if (s.hp <= 0) { pc(s.x, s.y, s.r, C.water, 0.4); continue; }
      var col = (s.max && s.hp < s.max) ? C.f : C.stone; pc(s.x, s.y, s.r, col, 0.85);
      if (s.max && s.hp < s.max) { game.draw.rect(snap(s.x) - 3, snap(s.y - 18), 6, 36, C.a, 0.7); }
      if (s.max) for (var h = 0; h < s.max; h++) game.draw.rect(snap(s.x - (s.max - 1) * 10 + h * 20) - 6, snap(s.y - s.r - 16), 12, 12, h < s.hp ? C.b : '#334', 0.8);
      if (Math.abs(si - idx) === 1 && s.hp > 0) ring(s.x, s.y, s.r + 12, C.g, 0.3 + 0.2 * (Math.floor(game.time.elapsed * 4) % 2));
    }
    if (jumping) { var fs = stones[jumpFrom], ts = stones[jumpTo], t = jumpT, jx = fs.x + (ts.x - fs.x) * t, jy = Math.min(fs.y, ts.y) - 100 * Math.sin(t * Math.PI) - 40; pc(jx, jy, 30, C.c, 0.95); }
    else { var ps = stones[idx]; if (ps && ps.hp > 0) { pc(ps.x, ps.y - ps.r - 28, 30, C.c, 0.95); pc(ps.x - 8, ps.y - ps.r - 36, 8, C.g, 0.6); } }
  }

  function hop(to) {
    if (jumping || done) return; if (Math.abs(to - idx) !== 1) return; var t = stones[to]; if (!t || t.hp <= 0) return;
    jumping = true; jumpFrom = idx; jumpTo = to; jumpT = 0; game.audio.play('se_tap', 0.4);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || jumping) return;
    for (var i = 0; i < stones.length; i++) { var s = stones[i]; if (s.hp > 0 && Math.hypot(x - s.x, y - s.y) < s.r + 24 && Math.abs(i - idx) === 1) { hop(i); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stones) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CROSSED!' : 'SPLASH', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (jumping) {
        jumpT += dt * 4;
        if (jumpT >= 1) {
          jumping = false; idx = jumpTo; var landed = stones[idx];
          if (landed.max && landed.hp > 0) { landed.hp--; if (landed.hp <= 0) { falls++; game.audio.play('se_failure', 0.5); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: landed.x, y: landed.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6, col: C.e }); } if (falls >= MAX_FALL) { finish(false); return; } setupRiver(); return; } }
          if (idx === stones.length - 1) { crossed++; fbText = 'CROSSED!'; fbCol = C.b; fbTimer = 0.7; game.audio.play('se_success', 0.6); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: stones[idx].x, y: stones[idx].y, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.6, col: C.b }); } if (crossed >= NEEDED) { finish(true); return; } setupRiver(); }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.80), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(crossed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALL - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#0a1a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
