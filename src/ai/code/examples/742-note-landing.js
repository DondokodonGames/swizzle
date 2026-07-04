// 742-note-landing.js
// ノートランディング — 降ってくる音符が五線のゾーンに来た瞬間にタップして着地させる
// 操作: 音符が緑ゾーンに重なった瞬間タップ。早すぎ・遅すぎはミス
// 成功: 10回 着地  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、五線譜） ──
  var C = { bg:'#0c0a1e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var STAFF = '#4c4a70', NOTE = '#ffe600', NOTE_HI = '#fef3c7';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NOTE LANDING';
  var HOW_TO_PLAY = 'TAP WHEN A FALLING NOTE HITS THE GREEN STAFF ZONE';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var STAFF_Y = snap(H * 0.62), ZONE_H = 56, NOTE_R = 28, FALL_SPEED = 320;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var notes, spawnTimer, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#120f28');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnNote() { var cols = [W * 0.2, W * 0.4, W * 0.6, W * 0.8]; notes.push({ x: cols[Math.floor(Math.random() * cols.length)] + (Math.random() - 0.5) * 60, y: -NOTE_R - 20, scored: false }); }

  function initGame() { notes = []; spawnTimer = 0.7; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnNote(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var sl = -2; sl <= 2; sl++) game.draw.line(0, STAFF_Y + sl * 28, W, STAFF_Y + sl * 28, STAFF, sl === 0 ? 3 : 2);
    game.draw.rect(0, STAFF_Y - ZONE_H, W, ZONE_H * 2, C.b, 0.08 + 0.03 * Math.sin(elapsed * 5));
    game.draw.line(0, STAFF_Y - ZONE_H, W, STAFF_Y - ZONE_H, C.b, 2); game.draw.line(0, STAFF_Y + ZONE_H, W, STAFF_Y + ZONE_H, C.b, 2);
    for (var ni2 = 0; ni2 < notes.length; ni2++) {
      var n2 = notes[ni2]; if (n2.scored) continue;
      var isClose = Math.abs(n2.y - STAFF_Y) < ZONE_H, nc = isClose ? C.b : NOTE;
      pc(n2.x, n2.y, NOTE_R, nc, 0.9); pc(n2.x - NOTE_R * 0.3, n2.y - NOTE_R * 0.3, NOTE_R * 0.22, NOTE_HI, 0.45);
      game.draw.line(n2.x + NOTE_R - 4, n2.y, n2.x + NOTE_R - 4, n2.y - 90, nc, 5);
      if (isClose) ring(n2.x, n2.y, NOTE_R + 12, C.b, 0.2 + 0.1 * Math.sin(elapsed * 10));
    }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hitNote = -1;
    for (var j = 0; j < notes.length; j++) { if (notes[j].scored) continue; if (Math.abs(tx - notes[j].x) < 100 && Math.abs(notes[j].y - STAFF_Y) < ZONE_H) { hitNote = j; break; } }
    if (hitNote >= 0) {
      notes[hitNote].scored = true; score++; flash = 0.22; flashCol = C.b; resultText = 'LANDED!'; resultTimer = 0.38; game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: notes[hitNote].x, y: STAFF_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.38, col: NOTE }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      var hasFar = false; for (var k = 0; k < notes.length; k++) if (!notes[k].scored && Math.abs(tx - notes[k].x) < 120) { hasFar = true; break; }
      if (hasFar) { errors++; flash = 0.28; flashCol = C.a; resultText = 'OFF TIMING!'; resultTimer = 0.4; game.audio.play('se_failure', 0.25); if (errors >= MAX_ERR) { finish(false); return; } }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!notes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.86, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT PITCH!' : 'OUT OF TUNE', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; var rate = Math.max(0.45, 0.72 - score * 0.015); if (spawnTimer <= 0) { spawnTimer = rate; if (notes.length < 5) spawnNote(); }
      var spd = Math.min(620, FALL_SPEED + score * 15);
      for (var ni = notes.length - 1; ni >= 0; ni--) { var n = notes[ni]; if (!n.scored) n.y += spd * dt; if (n.y > H + 80) notes.splice(ni, 1); else if (n.y > STAFF_Y + ZONE_H * 2 && !n.scored) notes.splice(ni, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.6; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 50, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#120f28');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
