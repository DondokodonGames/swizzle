// 313-note-catch.js
// 音符キャッチ — 4レーンを流れ落ちる音符を、判定ラインに来た瞬間にレーンをタップして奏でる
// 操作: 音符が判定ラインに来たら、そのレーンをタップ
// 成功: 5音符キャッチ  失敗: 3音符ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズムステージ） ──
  var C = { bg:'#020810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LANE_COL = [C.a, C.e, C.b, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NOTE CATCH';
  var HOW_TO_PLAY = 'TAP THE LANE WHEN A NOTE REACHES THE LINE';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 20 → 5
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var LANES = 4, LANE_W = snap(W / 4), JUDGE_Y = snap(H * 0.72);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var notes, caught, missed, combo, timeLeft, done, spawnTimer, judgments, particles, beatFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function laneX(l) { return snap(LANE_W * (l + 0.5)); }

  function background() {
    game.draw.clear(C.bg);
    for (var l = 0; l < LANES; l++) { game.draw.rect(l * LANE_W + 4, snap(H * 0.10), LANE_W - 8, snap(H * 0.8), LANE_COL[l], 0.05); if (l > 0) game.draw.rect(l * LANE_W - 1, snap(H * 0.10), 2, snap(H * 0.8), '#123', 0.6); }
    game.draw.rect(0, JUDGE_Y - 8, W, 16, C.e, beatFlash > 0 ? 0.8 : 0.3);
    for (var l2 = 0; l2 < LANES; l2++) ring(laneX(l2), JUDGE_Y, 42, LANE_COL[l2], 0.35);
  }

  function spawnNote() { var l = Math.floor(Math.random() * LANES); notes.push({ lane: l, y: -40, vy: 420 + caught * 20, hit: false }); }

  function initGame() { notes = []; caught = 0; missed = 0; combo = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; judgments = []; particles = []; beatFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + combo * 80 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawNote(n) { var lx = laneX(n.lane); pc(lx, n.y, 30, LANE_COL[n.lane], 0.9); pc(lx - 8, n.y - 8, 8, C.g, 0.6); game.draw.rect(snap(lx + 26) - 3, snap(n.y - 60), 6, 60, LANE_COL[n.lane], 0.8); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var lane = Math.floor(x / LANE_W); if (lane < 0 || lane >= LANES) return;
    var best = -1, bd = 999; for (var ni = 0; ni < notes.length; ni++) { var n = notes[ni]; if (n.hit || n.lane !== lane) continue; var d = Math.abs(n.y - JUDGE_Y); if (d < bd) { bd = d; best = ni; } }
    var lx = laneX(lane);
    if (best !== -1 && bd < 100) {
      notes[best].hit = true; caught++; combo++;
      judgments.push({ x: lx, y: JUDGE_Y - 60, txt: bd < 30 ? 'PERFECT!' : bd < 60 ? 'GREAT!' : 'GOOD', col: bd < 30 ? C.c : bd < 60 ? C.b : C.e, life: 0.7 });
      beatFlash = 0.15; game.audio.play('se_tap', 0.35 + combo * 0.02);
      for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: lx, y: JUDGE_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 200, life: 0.5, col: LANE_COL[lane] }); }
      if (caught >= NEEDED) { finish(true); return; }
    } else { judgments.push({ x: lx, y: JUDGE_Y - 40, txt: 'MISS', col: C.a, life: 0.5 }); combo = 0; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!notes) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.32, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.38, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ENCORE!' : 'OUT OF TUNE', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (beatFlash > 0) beatFlash -= dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnNote(); spawnTimer = Math.max(0.5, 0.9 - caught * 0.05); }
      for (var ni = notes.length - 1; ni >= 0; ni--) {
        var n = notes[ni]; n.y += n.vy * dt;
        if (n.y > JUDGE_Y + 80 && !n.hit) { missed++; combo = 0; game.audio.play('se_failure', 0.3); notes.splice(ni, 1); if (missed >= MAX_MISS) { finish(false); return; } continue; }
        if (n.y > H + 60) notes.splice(ni, 1);
      }
      for (var ji = judgments.length - 1; ji >= 0; ji--) { judgments[ji].y -= 80 * dt; judgments[ji].life -= dt * 1.5; if (judgments[ji].life <= 0) judgments.splice(ji, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ni2 = 0; ni2 < notes.length; ni2++) if (!notes[ni2].hit) drawNote(notes[ni2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);
    for (var ji2 = 0; ji2 < judgments.length; ji2++) txt(judgments[ji2].txt, judgments[ji2].x, judgments[ji2].y, 40, judgments[ji2].col);
    if (combo > 1) txt(combo + ' COMBO', W / 2, snap(H * 0.86), 44, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
