// 415-card-flip.js
// カードめくり — 最初に一瞬すべての数字を見せられ、伏せた後に1から順にめくり当てる記憶ゲーム
// 操作: 最初に位置を覚え、伏せたら小さい数から順にカードをタップ
// 成功: 2セット 完成  失敗: 3回 間違える or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、カード台） ──
  var C = { bg:'#060412', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CARD FLIP';
  var HOW_TO_PLAY = 'MEMORIZE THE NUMBERS · THEN TAP THEM 1,2,3... IN ORDER';
  var MAX_TIME = 25;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_WRONG = 3;
  var GN = 3, N = GN * GN;   // 修正2: 4x4 → 3x3
  var CW = snap(W * 0.26), CHh = snap(W * 0.32), GAP = 20, GX = snap((W - GN * snap(W * 0.26) - (GN - 1) * 20) / 2), GY = snap(H * 0.30);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cards, iphase, peekTimer, nextExpected, sets, wrong, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

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

  function genCards() {
    var nums = []; for (var i = 1; i <= N; i++) nums.push(i);
    for (var i2 = nums.length - 1; i2 > 0; i2--) { var j = Math.floor(Math.random() * (i2 + 1)); var t = nums[i2]; nums[i2] = nums[j]; nums[j] = t; }
    cards = []; for (var i3 = 0; i3 < N; i3++) cards.push({ num: nums[i3], faceUp: true, col: i3 % GN, row: Math.floor(i3 / GN), selected: false });
    nextExpected = 1; iphase = 'peek'; peekTimer = 2.5;
  }

  function initGame() { sets = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; genCards(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sets * 900 + Math.ceil(timeLeft) * 100) : sets * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCards() {
    for (var ci = 0; ci < cards.length; ci++) {
      var c = cards[ci], cx = GX + c.col * (CW + GAP), cy = GY + c.row * (CHh + GAP);
      if (c.faceUp) { game.draw.rect(cx, cy, CW, CHh, C.g, 0.92); txt(c.num + '', cx + CW / 2, cy + CHh / 2 + 24, 72, c.selected ? C.b : '#1a1040'); if (c.selected) game.draw.rect(cx, cy, CW, CHh, C.b, 0.15); }
      else { game.draw.rect(cx, cy, CW, CHh, C.d, 0.9); game.draw.rect(cx + 12, cy + 12, CW - 24, CHh - 24, C.e, 0.3); }
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'play') return;
    var col = Math.floor((x - GX) / (CW + GAP)), row = Math.floor((y - GY) / (CHh + GAP));
    if (col < 0 || col >= GN || row < 0 || row >= GN) return;
    var idx = row * GN + col, card = cards[idx];
    if (card.faceUp || card.selected) return;
    card.faceUp = true; game.audio.play('se_tap', 0.3);
    if (card.num === nextExpected) {
      card.selected = true; nextExpected++;
      for (var p = 0; p < 5; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: GX + col * (CW + GAP) + CW / 2, y: GY + row * (CHh + GAP) + CHh / 2, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: C.b }); }
      if (nextExpected > N) { sets++; flashCol = C.b; flash = 0.8; game.audio.play('se_success', 0.7); if (sets >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done && state === S.PLAYING) genCards(); }, 1000); }
    } else {
      wrong++; flashCol = C.a; flash = 0.7; game.audio.play('se_failure', 0.4); if (wrong >= MAX_WRONG) { finish(false); return; }
      var self = card; setTimeout(function() { self.faceUp = false; }, 600);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cards) initGame(); background(); drawCards();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'RECALL!' : 'MIXED UP', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      if (iphase === 'peek') { peekTimer -= dt; if (peekTimer <= 0) { iphase = 'play'; for (var ci = 0; ci < cards.length; ci++) cards[ci].faceUp = false; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawCards();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt(iphase === 'peek' ? 'MEMORIZE  ' + peekTimer.toFixed(1) + 's' : 'NEXT: ' + nextExpected, W / 2, snap(H * 0.82), 46, iphase === 'peek' ? C.c : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sets + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
