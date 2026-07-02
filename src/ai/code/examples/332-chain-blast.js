// 332-chain-blast.js
// チェーンブラスト — 爆弾を1つ起爆し、爆風の連鎖で盤上すべての爆弾を消し去る一撃パズル
// 操作: タップで最初の爆弾を起爆（爆風が近くの爆弾に連鎖する）
// 成功: 3ラウンド全消し  失敗: 3回連鎖失敗 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆破フィールド） ──
  var C = { bg:'#0c0700', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN BLAST';
  var HOW_TO_PLAY = 'TAP ONE BOMB · CHAIN THE BLAST TO CLEAR ALL';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_FAIL = 3;
  var BLAST_R = 130;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bombs, explosions, round, cleared, failures, timeLeft, done, phase, resultTimer, resultGood, particles, fbText, fbCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#221400');
  }

  function background() { game.draw.clear(C.bg); }

  function generateRound() {
    bombs = []; var count = 4 + round;
    for (var i = 0; i < count; i++) {
      var bx, by, tries = 0;
      do { bx = snap(120 + Math.random() * (W - 240)); by = snap(H * 0.26 + Math.random() * H * 0.5); tries++; } while (tries < 30 && bombs.some(function(b) { return Math.hypot(b.x - bx, b.y - by) < 60; }));
      bombs.push({ x: bx, y: by, r: 28, exploded: false });
    }
    if (count > 1) { bombs[1].x = snap(bombs[0].x + 110); bombs[1].y = snap(bombs[0].y + (Math.random() - 0.5) * 80); }
    if (count > 2) { bombs[2].x = snap(bombs[1].x - 110); bombs[2].y = snap(bombs[1].y + 100); }
    explosions = []; phase = 'place';
  }

  function initGame() { round = 0; cleared = 0; failures = 0; timeLeft = MAX_TIME; done = false; particles = []; resultTimer = 0; fbText = ''; generateRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 700 + Math.ceil(timeLeft) * 100) : cleared * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function boom(bi) { var b = bombs[bi]; b.exploded = true; explosions.push({ x: b.x, y: b.y, r: 0, life: 0.8 }); game.audio.play('se_success', 0.4); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 60, life: 0.5, col: C.f }); } }

  function drawBomb(b) {
    if (b.exploded) return;
    if (phase === 'place') ring(b.x, b.y, BLAST_R, C.f, 0.15);
    pc(b.x, b.y, b.r, '#1a1408', 0.95); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, C.d, 0.5);
    pline(b.x + b.r * 0.4, b.y - b.r, b.x + b.r * 0.4 + 10, b.y - b.r - 24, C.f, 0.9, 5); pc(b.x + b.r * 0.4 + 12, b.y - b.r - 28, 8 + 4 * (Math.floor(game.time.elapsed * 8) % 2), C.c, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'place') return;
    for (var bi = 0; bi < bombs.length; bi++) if (!bombs[bi].exploded && Math.hypot(x - bombs[bi].x, y - bombs[bi].y) < bombs[bi].r + 24) { phase = 'exploding'; boom(bi); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bombs) initGame(); background(); for (var i = 0; i < bombs.length; i++) drawBomb(bombs[i]);
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CLEAR!' : 'DUD CHAIN', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (resultTimer > 0) { resultTimer -= dt; if (resultTimer <= 0) { round++; generateRound(); } }
      if (phase === 'exploding') {
        for (var ei = explosions.length - 1; ei >= 0; ei--) {
          var ex = explosions[ei]; ex.r += 320 * dt; ex.life -= dt * 1.2;
          if (ex.r < BLAST_R * 1.1) for (var bi = 0; bi < bombs.length; bi++) if (!bombs[bi].exploded && Math.hypot(bombs[bi].x - ex.x, bombs[bi].y - ex.y) < ex.r + bombs[bi].r) boom(bi);
          if (ex.life <= 0) explosions.splice(ei, 1);
        }
        var allDone = bombs.every(function(b) { return b.exploded; }), anyLeft = bombs.some(function(b) { return !b.exploded; });
        if (explosions.length === 0) {
          if (allDone) { phase = 'result'; cleared++; fbText = 'ALL CLEAR!'; fbCol = C.b; game.audio.play('se_success', 0.8); resultTimer = 0.9; if (cleared >= NEEDED) { finish(true); return; } }
          else if (anyLeft) { phase = 'result'; failures++; fbText = 'FAILED'; fbCol = C.a; game.audio.play('se_failure', 0.5); resultTimer = 0.9; if (failures >= MAX_FAIL) { finish(false); return; } }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ei2 = 0; ei2 < explosions.length; ei2++) { var ex2 = explosions[ei2]; ring(ex2.x, ex2.y, ex2.r, C.f, ex2.life * 0.7); pc(ex2.x, ex2.y, ex2.r * 0.5, C.c, ex2.life * 0.8); }
    for (var bi2 = 0; bi2 < bombs.length; bi2++) drawBomb(bombs[bi2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (phase === 'result' && resultTimer > 0) txt(fbText, W / 2, snap(H * 0.82), 66, fbCol);
    else if (phase === 'place') txt('TAP A BOMB TO IGNITE', W / 2, snap(H * 0.86), 40, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < failures ? C.a : '#221400');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
