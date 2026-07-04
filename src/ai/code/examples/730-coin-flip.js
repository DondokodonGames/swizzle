// 730-coin-flip.js
// コインフリップ — 回転しながら止まるコインが表か裏かを見極めて当てる
// 操作: 画面上半分タップ=表(HEADS)、下半分タップ=裏(TAILS)
// 成功: 8回 正解  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、コイン色は保持） ──
  var C = { bg:'#0a0602', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COIN_A = '#ca8a04', COIN_A_HI = '#fde68a', COIN_B = '#92400e', COIN_B_HI = '#d97706';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COIN FLIP';
  var HOW_TO_PLAY = 'TAP TOP FOR HEADS · TAP BOTTOM FOR TAILS · CALL IT RIGHT';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.42), COIN_R = 180, MIN_SPEED = 1.5, MAX_SPEED = 12.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flipAngle, flipSpeed, flipping, currentSide, visibleSide, score, streak, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, coinAnim, waitTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#110a04');
  }

  function background() { game.draw.clear(C.bg); }

  function startFlip() { flipSpeed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED); flipping = true; currentSide = Math.random() < 0.5 ? 'heads' : 'tails'; }

  function initGame() { flipAngle = 0; flipSpeed = 0; flipping = false; currentSide = 'heads'; visibleSide = 'heads'; score = 0; streak = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; coinAnim = 0; waitTimer = 0; startFlip(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + streak * 100 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var a2 = ((flipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), scaleY = Math.abs(Math.cos(a2)), coinH = Math.max(8, COIN_R * scaleY);
    var isHeads = visibleSide === 'heads', coinCol = isHeads ? COIN_A : COIN_B, coinHiCol = isHeads ? COIN_A_HI : COIN_B_HI, sideLabel = isHeads ? 'H' : 'T';
    txt('UP: HEADS', W / 2, H * 0.20, 44, '#fde68a66'); txt('DOWN: TAILS', W / 2, H * 0.68, 44, '#d9770666');
    game.draw.line(0, H / 2, W, H / 2, '#ffffff0a', 2);
    game.draw.rect(snap(CX - COIN_R), snap(CY - coinH), COIN_R * 2, snap(coinH * 2), coinCol, 0.95);
    game.draw.rect(snap(CX - COIN_R), snap(CY - coinH), COIN_R * 2, Math.max(4, snap(coinH * 0.15)), coinHiCol, 0.6);
    if (coinH > 20) { game.draw.rect(snap(CX - COIN_R), snap(CY - coinH), 12, snap(coinH * 2), coinHiCol, 0.3); game.draw.rect(snap(CX + COIN_R - 12), snap(CY - coinH), 12, snap(coinH * 2), coinHiCol, 0.3); }
    if (coinH > COIN_R * 0.4 && !flipping) txt(sideLabel, CX, CY + 30, 120, coinHiCol);
    if (coinAnim > 0) game.draw.rect(snap(CX - COIN_R - 20), snap(CY - COIN_R - 20), (COIN_R + 20) * 2, (COIN_R + 20) * 2, C.b, coinAnim * 0.2);
    if (streak >= 3) txt(streak + ' STREAK', W * 0.8, CY, 40, COIN_A_HI);
    if (!flipping && !done) txt('HEADS OR TAILS?', W / 2, snap(H * 0.78), 48, '#ffffff66');
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || flipping || waitTimer > 0) return;
    var guess = ty < H / 2 ? 'heads' : 'tails';
    if (guess === currentSide) {
      score++; streak++; coinAnim = 0.4; flash = 0.3; flashCol = C.b; resultText = (guess === 'heads' ? 'HEADS' : 'TAILS') + '  CORRECT!'; resultTimer = 0.6; game.audio.play('se_success', 0.5);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.45, col: currentSide === 'heads' ? COIN_A_HI : COIN_B_HI }); }
      if (score >= NEEDED) { finish(true); return; }
      waitTimer = 0.5;
    } else {
      errors++; streak = 0; flash = 0.3; flashCol = C.a; resultText = 'WRONG CALL!'; resultTimer = 0.6; game.audio.play('se_failure', 0.35);
      if (errors >= MAX_ERR) { finish(false); return; }
      waitTimer = 0.5;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (flipAngle === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LUCKY CALLER!' : 'CALLED IT WRONG', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) startFlip(); }
      if (flipping) {
        flipAngle += flipSpeed * dt; flipSpeed -= dt * 6;
        if (flipSpeed <= MIN_SPEED) {
          flipSpeed = MIN_SPEED; var normalized = ((flipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          if (currentSide === 'heads') { if (normalized > Math.PI * 0.5 && normalized < Math.PI * 1.5) flipAngle += Math.PI - normalized; }
          else { if (normalized < Math.PI * 0.5 || normalized > Math.PI * 1.5) flipAngle += Math.PI * 2 - normalized; }
          flipping = false; flipSpeed = 0; game.audio.play('se_tap', 0.12);
        }
        var a = ((flipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); visibleSide = (a < Math.PI) ? 'heads' : 'tails';
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (coinAnim > 0) coinAnim -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#110a04');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
