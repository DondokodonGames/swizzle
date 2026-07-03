// 444-rythm-tap.js
// リズムタップ — 4レーンを流れ落ちるノーツが判定ラインに重なる瞬間、そのレーンをタップする音ゲー
// 操作: ノーツが下のライン（丸）に来た瞬間、そのレーンをタップ
// 成功: 8ノーツ ヒット  失敗: 3ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、音ゲー筐体） ──
  var C = { bg:'#060010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RHYTHM TAP';
  var HOW_TO_PLAY = 'TAP EACH LANE WHEN THE NOTE HITS THE LINE';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var LANES = 4, LANE_W = W / 4, HIT_Y = snap(H * 0.82), HIT_RANGE = 80, NOTE_SPEED = 480;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var notes, particles, nextSpawn, caught, misses, combo, lastLane, lastType, hitTimer, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.18) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#180a30');
  }

  function background() { game.draw.clear(C.bg); for (var li = 0; li < LANES; li++) { var lx = li * LANE_W; game.draw.rect(lx + 4, 260, LANE_W - 8, H - 260, '#1a0a30', 0.6); game.draw.rect(lx, 260, 2, H, C.d, 0.2); } game.draw.rect(0, HIT_Y - 4, W, 8, C.d, 0.9); for (var li2 = 0; li2 < LANES; li2++) ring(li2 * LANE_W + LANE_W / 2, HIT_Y, 44, C.e, 0.5); }

  function spawnNote() { notes.push({ lane: Math.floor(Math.random() * LANES), y: 260, hit: false }); }

  function initGame() { notes = []; particles = []; nextSpawn = 0.4; caught = 0; misses = 0; combo = 0; lastLane = -1; lastType = ''; hitTimer = 0; timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + combo * 30 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var lane = Math.floor(x / LANE_W); if (lane < 0 || lane >= LANES) return;
    var best = -1, bd = 999;
    for (var i = 0; i < notes.length; i++) { var n = notes[i]; if (n.lane !== lane || n.hit) continue; var d = Math.abs(n.y - HIT_Y); if (d < HIT_RANGE + 40 && d < bd) { bd = d; best = i; } }
    if (best >= 0) {
      notes[best].hit = true; var perfect = Math.abs(notes[best].y - HIT_Y) < HIT_RANGE * 0.4; caught++; combo++; lastLane = lane; lastType = perfect ? 'PERFECT!' : 'GOOD'; hitTimer = 0.6;
      var nx = lane * LANE_W + LANE_W / 2; for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: nx, y: HIT_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: perfect ? C.c : C.b }); } game.audio.play('se_tap', 0.5);
      if (caught >= NEEDED) { finish(true); return; }
    } else { misses++; combo = 0; lastLane = lane; lastType = 'MISS'; hitTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULL COMBO!' : 'OFF BEAT', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (hitTimer > 0) hitTimer -= dt;
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnNote(); nextSpawn = 0.5 * (0.8 + Math.random() * 0.4); }
      for (var ni = notes.length - 1; ni >= 0; ni--) { notes[ni].y += NOTE_SPEED * dt; if (notes[ni].y > H + 40) { if (!notes[ni].hit) { misses++; combo = 0; if (misses >= MAX_MISS) { finish(false); return; } } notes.splice(ni, 1); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ni2 = 0; ni2 < notes.length; ni2++) { var n2 = notes[ni2]; if (n2.hit) continue; var nx2 = n2.lane * LANE_W + LANE_W / 2, d3 = Math.abs(n2.y - HIT_Y), gl = d3 < HIT_RANGE ? (1 - d3 / HIT_RANGE) * 0.5 : 0; pc(nx2, n2.y, 44, C.d, 0.9); pc(nx2, n2.y, 28, C.a, 0.5 + gl); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (hitTimer > 0 && lastLane >= 0) { var fx = lastLane * LANE_W + LANE_W / 2, fc = lastType === 'PERFECT!' ? C.c : lastType === 'GOOD' ? C.b : C.a; txt(lastType, fx, HIT_Y - 100, 40, fc); }
    if (combo >= 5) txt(combo + ' COMBO', W / 2, snap(H * 0.90), 44, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#180a30');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
