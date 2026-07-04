// 604-star-align.js
// スターアライン — 下段の星をタップで選び、光る枠へ運んで星座を完成させる
// 操作: 下の星をタップで選択 → 空いた枠をタップで配置。全枠を埋めると星座完成
// 成功: 3つ 星座完成  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、星海） ──
  var C = { bg:'#000308', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STAR ALIGN';
  var HOW_TO_PLAY = 'TAP A STAR TO PICK IT · TAP A GLOWING SLOT TO PLACE · FILL THE SHAPE';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 8 → 3

  // 星座パターン（相対座標）
  var PATTERNS = [
    [[0,0],[1,0],[2,0],[1,-1]],
    [[0,0],[1,1],[2,0],[0,1]],
    [[0,0],[1,0],[2,0],[1,1],[1,-1]],
    [[0,0],[1,1],[2,2],[0,2]],
    [[0,0],[1,0],[2,0],[0,1],[2,1]]
  ];
  var STAR_R = 26, SLOT_R = 30;
  var PLAY_OX = 60, PLAY_OY = snap(H * 0.24), PLAY_W = W - 120, PLAY_H = snap(H * 0.42);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stars, slots, selectedStar, done_count, timeLeft, done, particles, flash, twinkling, resultText, resultTimer, lock;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color, alpha) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2 - Math.PI / 2; game.draw.rect(cx + Math.cos(a) * r - 4, cy + Math.sin(a) * r - 4, 8, 8, color, alpha); var a2 = a + Math.PI / 5; game.draw.rect(cx + Math.cos(a2) * r * 0.45 - 4, cy + Math.sin(a2) * r * 0.45 - 4, 8, 8, color, alpha); } pc(cx, cy, r * 0.4, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050518');
  }

  function background() { game.draw.clear(C.bg); for (var i = 0; i < twinkling.length; i++) { var ts = twinkling[i]; game.draw.rect(snap(ts.x), snap(ts.y), ts.r, ts.r, C.g, 0.3 + Math.sin(ts.phase) * 0.25); } }

  function loadConstellation() {
    var pat = PATTERNS[done_count % PATTERNS.length];
    var maxC = 0, maxR = 0;
    for (var i = 0; i < pat.length; i++) { if (pat[i][0] > maxC) maxC = pat[i][0]; if (Math.abs(pat[i][1]) > maxR) maxR = Math.abs(pat[i][1]); }
    var scale = Math.min(PLAY_W * 0.55 / (maxC + 1), PLAY_H * 0.5 / (maxR * 2 + 1), 150);
    var cx = PLAY_OX + PLAY_W / 2, cy = PLAY_OY + PLAY_H / 2;
    slots = [];
    for (var si = 0; si < pat.length; si++) slots.push({ x: snap(cx + pat[si][0] * scale - maxC * scale / 2), y: snap(cy + pat[si][1] * scale), filled: false, phase: Math.random() * Math.PI * 2 });
    var starY = snap(H * 0.80), spacing = Math.min(140, (W - 120) / pat.length), startX = W / 2 - (pat.length - 1) * spacing / 2;
    stars = [];
    for (var i2 = 0; i2 < pat.length; i2++) stars.push({ x: snap(startX + i2 * spacing), y: starY, phase: Math.random() * Math.PI * 2, placed: false });
    selectedStar = -1;
  }

  function initGame() { done_count = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; resultText = ''; resultTimer = 0; lock = false; twinkling = []; for (var i = 0; i < 70; i++) twinkling.push({ x: Math.random() * W, y: Math.random() * H, r: 8, phase: Math.random() * Math.PI * 2 }); loadConstellation(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (done_count * 900 + Math.ceil(timeLeft) * 120) : done_count * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    // slot links
    for (var i = 0; i < slots.length - 1; i++) if (slots[i].filled && slots[i + 1].filled) game.draw.line(slots[i].x, slots[i].y, slots[i + 1].x, slots[i + 1].y, C.d, 3);
    for (var si = 0; si < slots.length; si++) {
      var sl = slots[si], pu = 1 + Math.sin(sl.phase) * 0.15;
      if (!sl.filled) { pc(sl.x, sl.y, SLOT_R * pu, C.d, 0.28); pc(sl.x, sl.y, SLOT_R * 0.4, C.e, 0.7); }
      else { pc(sl.x, sl.y, STAR_R * 1.4, C.b, 0.18); star(sl.x, sl.y, STAR_R, C.c, 0.95); }
    }
    for (var s2 = 0; s2 < stars.length; s2++) {
      var st = stars[s2]; if (st.placed) continue; var sel = (s2 === selectedStar), pu2 = 1 + Math.sin(st.phase) * 0.1;
      if (sel) { pc(st.x, st.y, STAR_R * 1.7, C.e, 0.3); star(st.x, st.y, STAR_R * pu2, C.e, 0.95); }
      else star(st.x, st.y, STAR_R * pu2, C.c, 0.85);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lock) return;
    if (selectedStar < 0) {
      for (var si = 0; si < stars.length; si++) { var s = stars[si]; if (s.placed) continue; var dx = tx - s.x, dy = ty - s.y; if (dx * dx + dy * dy < (STAR_R + 34) * (STAR_R + 34)) { selectedStar = si; game.audio.play('se_tap', 0.2); return; } }
    } else {
      for (var sli = 0; sli < slots.length; sli++) {
        var sl = slots[sli]; if (sl.filled) continue; var dx2 = tx - sl.x, dy2 = ty - sl.y;
        if (dx2 * dx2 + dy2 * dy2 < (SLOT_R + 40) * (SLOT_R + 40)) {
          sl.filled = true; stars[selectedStar].placed = true; selectedStar = -1; game.audio.play('se_tap', 0.35);
          if (slots.every(function(s) { return s.filled; })) {
            done_count++; flash = 0.4; resultText = 'ALIGNED!'; resultTimer = 0.7; game.audio.play('se_success', 0.8);
            var cx = PLAY_OX + PLAY_W / 2, cy = PLAY_OY + PLAY_H / 2;
            for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx + (Math.random() - 0.5) * 220, y: cy + (Math.random() - 0.5) * 220, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.g }); }
            if (done_count >= NEEDED) { finish(true); return; }
            lock = true; setTimeout(function() { if (!done) { loadConstellation(); lock = false; } }, 1000);
          }
          return;
        }
      }
      selectedStar = -1;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!twinkling) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SKY COMPLETE!' : 'TIME UP', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var ti = 0; ti < twinkling.length; ti++) twinkling[ti].phase += dt * 1.5;
      for (var si = 0; si < stars.length; si++) stars[si].phase += dt * 2;
      for (var sli = 0; sli < slots.length; sli++) slots[sli].phase += dt * 1.5;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(PLAY_OY + PLAY_H + 60), 56, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(done_count + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
