// 405-crowd-count.js
// 群衆カウント — 一瞬映る群衆の人数を目測で記憶し、3択から正しい人数を選ぶ瞬間記憶ゲーム
// 操作: 表示中に人数を数え、隠れたあと正しい数字をタップ
// 成功: 4問 正解  失敗: 3回 大外れ or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、広場） ──
  var C = { bg:'#08061a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CROWD = [C.e, C.d, C.a, C.b, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CROWD COUNT';
  var HOW_TO_PLAY = 'COUNT THE CROWD FAST · PICK THE RIGHT NUMBER';
  var MAX_TIME = 20;
  var NEEDED   = 4;          // 修正2: 8 → 4
  var MAX_WRONG = 3;
  var CW = (W - 80) / 3, CH = 150, CY = snap(H * 0.72);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var iphase, showTimer, crowd, count, choices, resultTimer, correct, wrong, timeLeft, done, particles, flash, flashCol, fbText;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function genRound() {
    count = 5 + Math.floor(Math.random() * 16);   // 修正2: 5-20人（元は5-40）
    crowd = []; for (var i = 0; i < count; i++) crowd.push({ x: snap(80 + Math.random() * (W - 160)), y: snap(H * 0.30 + Math.random() * H * 0.30), col: CROWD[Math.floor(Math.random() * 5)], r: 16 + Math.random() * 8 });
    var cp = Math.floor(Math.random() * 3); choices = []; var used = [count];
    for (var ci = 0; ci < 3; ci++) { if (ci === cp) choices.push(count); else { var off = Math.floor(Math.random() * 5 + 2) * (Math.random() < 0.5 ? 1 : -1), val = Math.max(1, count + off); while (used.indexOf(val) !== -1) val = Math.max(1, val + 1); choices.push(val); used.push(val); } }
    iphase = 'show'; showTimer = 1.8;
  }

  function initGame() { correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; fbText = ''; genRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 600 + Math.ceil(timeLeft) * 100) : correct * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPerson(p, alpha) { pc(p.x, p.y, p.r, p.col, alpha); pc(p.x, p.y - p.r * 0.7, p.r * 0.55, C.g, alpha * 0.8); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'answer') return;
    if (y < CY || y > CY + CH) return;
    var idx = Math.floor((x - 40) / CW); if (idx < 0 || idx > 2) return;
    var chosen = choices[idx];
    if (chosen === count) { correct++; flashCol = C.b; flash = 0.7; fbText = 'CORRECT  ' + count; game.audio.play('se_success', 0.5); for (var p = 0; p < 10; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.b }); } if (correct >= NEEDED) { finish(true); return; } }
    else { var diff = Math.abs(chosen - count); if (diff <= 2) { flashCol = C.c; fbText = 'CLOSE  IT WAS ' + count; } else { wrong++; flashCol = C.a; fbText = 'MISS  IT WAS ' + count; game.audio.play('se_failure', 0.4); if (wrong >= MAX_WRONG) { finish(false); return; } } }
    iphase = 'result'; resultTimer = 1.1;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); if (!crowd) { count = 8; crowd = []; for (var i = 0; i < 8; i++) crowd.push({ x: snap(120 + i * 100), y: snap(H * 0.4 + (i % 2) * 60), col: CROWD[i % 5], r: 20 }); }
      for (var ci = 0; ci < crowd.length; ci++) drawPerson(crowd[ci], 0.9);
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'MISCOUNTED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (iphase === 'show') { showTimer -= dt; if (showTimer <= 0) iphase = 'answer'; }
      else if (iphase === 'result') { resultTimer -= dt; if (resultTimer <= 0) genRound(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (iphase === 'show') { for (var c1 = 0; c1 < crowd.length; c1++) drawPerson(crowd[c1], 0.9); txt('COUNT THEM!', W / 2, snap(H * 0.66), 52, C.c); }
    else if (iphase === 'answer') {
      for (var c2 = 0; c2 < crowd.length; c2++) pc(crowd[c2].x, crowd[c2].y, crowd[c2].r * 1.4, crowd[c2].col, 0.12);
      txt('HOW MANY?', W / 2, snap(H * 0.42), 56, C.g); txt('?', W / 2, snap(H * 0.33), 120, C.e);
      for (var ci = 0; ci < 3; ci++) { var bx = 40 + ci * CW + CW / 2; game.draw.rect(40 + ci * CW + 8, CY, CW - 16, CH, C.d, 0.7); txt(choices[ci] + '', bx, CY + CH / 2 + 20, 68, C.g); }
    } else { for (var c3 = 0; c3 < crowd.length; c3++) drawPerson(crowd[c3], 0.7); txt(fbText, W / 2, snap(H * 0.66), 48, flashCol); }

    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
