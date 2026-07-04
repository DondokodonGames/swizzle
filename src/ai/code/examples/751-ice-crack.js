// 751-ice-crack.js
// アイスクラック — 溶けてしまう前に氷のブロックを3回タップして砕く
// 操作: 氷ブロックをタップして亀裂を入れる。3回で粉砕。溶ける前に砕け
// 成功: 12個 粉砕  失敗: 3個 溶ける or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷） ──
  var C = { bg:'#030c18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ICE = '#00cfff', ICE_HI = '#e0f2fe', ICE_DARK = '#0369a1', MELT = '#3355ff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE CRACK';
  var HOW_TO_PLAY = 'TAP EACH ICE BLOCK THREE TIMES TO SHATTER IT BEFORE IT MELTS AWAY';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 30 → 12
  var MAX_MELT = 3;          // 修正2: 8 → 3
  var MAX_BLOCKS = 6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var blocks, spawnTimer, score, melted, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#060f1e');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBlock() { var margin = 100, s = 55 + Math.random() * 35; blocks.push({ x: margin + Math.random() * (W - margin * 2), y: H * 0.22 + Math.random() * (H * 0.55), s: s, hp: 3, meltTime: Math.max(2.5, 4.5 - score * 0.12), meltTimer: 0, cracks: [] }); }
  function addCrack(block) { block.cracks.push({ a: Math.random() * Math.PI, len: block.s * (0.4 + Math.random() * 0.5) }); }

  function initGame() { blocks = []; spawnTimer = 0.6; score = 0; melted = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnBlock(); spawnBlock(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi2 = 0; bi2 < blocks.length; bi2++) {
      var b2 = blocks[bi2], meltFrac = b2.meltTimer / b2.meltTime, alpha = 1 - meltFrac * 0.4, sz = b2.s * (1 - meltFrac * 0.15);
      game.draw.rect(snap(b2.x - sz), snap(b2.y - sz), snap(sz * 2), snap(sz * 2), ICE, alpha * 0.85);
      game.draw.rect(snap(b2.x - sz), snap(b2.y - sz), snap(sz * 2), snap(sz * 0.3), ICE_HI, alpha * 0.4); game.draw.rect(snap(b2.x - sz), snap(b2.y - sz), snap(sz * 0.25), snap(sz * 2), ICE_HI, alpha * 0.25);
      for (var ci = 0; ci < b2.cracks.length; ci++) { var cr = b2.cracks[ci]; game.draw.line(b2.x, b2.y, b2.x + Math.cos(cr.a) * cr.len, b2.y + Math.sin(cr.a) * cr.len, C.g, 3); game.draw.line(b2.x, b2.y, b2.x - Math.cos(cr.a) * cr.len * 0.5, b2.y - Math.sin(cr.a) * cr.len * 0.5, C.g, 2); }
      for (var hi = 0; hi < 3; hi++) game.draw.rect(snap(b2.x - 18 + hi * 18) - 6, snap(b2.y + sz + 16) - 6, 12, 12, hi < (3 - b2.hp) ? ICE_DARK : ICE_HI, 0.9);
      game.draw.rect(snap(b2.x - sz), snap(b2.y + sz + 24), snap(sz * 2), 8, ICE_DARK, 0.5); game.draw.rect(snap(b2.x - sz), snap(b2.y + sz + 24), snap(sz * 2 * (1 - meltFrac)), 8, meltFrac > 0.7 ? C.a : MELT, 0.85);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = blocks.length - 1; i >= 0; i--) {
      var b = blocks[i], dx = tx - b.x, dy = ty - b.y;
      if (Math.abs(dx) < b.s && Math.abs(dy) < b.s) {
        b.hp--; addCrack(b); game.audio.play('se_tap', 0.1);
        if (b.hp <= 0) {
          score++; flash = 0.22; flashCol = C.b; resultText = 'SHATTERED!'; resultTimer = 0.38; game.audio.play('se_success', 0.5);
          for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.4, col: ICE_HI }); }
          blocks.splice(i, 1);
          if (score >= NEEDED) { finish(true); return; }
        } else { flash = 0.1; flashCol = MELT; }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!blocks) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ICE BREAKER!' : 'THAWED OUT', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnTimer = Math.max(0.45, 0.6 - score * 0.008); if (blocks.length < MAX_BLOCKS) spawnBlock(); }
      for (var bi = blocks.length - 1; bi >= 0; bi--) { var b = blocks[bi]; b.meltTimer += dt; if (b.meltTimer >= b.meltTime) { blocks.splice(bi, 1); melted++; flash = 0.28; flashCol = C.a; resultText = 'MELTED!'; resultTimer = 0.38; game.audio.play('se_failure', 0.22); if (melted >= MAX_MELT) { finish(false); return; } } }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_MELT; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_MELT - 1) / 2) * 56) - 10, 224, 20, 20, ei < melted ? C.a : '#060f1e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
