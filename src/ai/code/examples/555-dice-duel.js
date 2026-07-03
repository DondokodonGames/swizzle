// 555-dice-duel.js
// ダイスデュエル — 転がるサイコロをタップで止め、目標値に近い出目でCPUに勝つ
// 操作: タップで自分のサイコロを止める（CPUは自動で止まる。目標に近い方が勝ち）
// 成功: 3勝 先取  失敗: CPUが3勝 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、賭場） ──
  var C = { bg:'#1a0a08', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var DOTS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DICE DUEL';
  var HOW_TO_PLAY = 'TAP TO STOP YOUR DIE · LAND CLOSEST TO THE TARGET TO WIN';
  var MAX_TIME = 20;
  var NEEDED_WIN = 3;        // 修正2: 10 → 3
  var DIE_SIZE = 200, PDX = snap(W * 0.28), EDX = snap(W * 0.72), DY = snap(H * 0.46), ROLL_SPEED = 15;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerDie, playerRolling, enemyDie, enemyRolling, target, winsP, winsE, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, roundState, waitTimer, rollTimer, enemyStop;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#2d1a08');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.30, W, H * 0.5, '#2d1a08', 0.6); }

  function drawDie(x, y, face, col, alpha) {
    game.draw.rect(x - DIE_SIZE / 2 + 10, y - DIE_SIZE / 2 + 10, DIE_SIZE, DIE_SIZE, '#3a2a08', alpha * 0.4);
    game.draw.rect(x - DIE_SIZE / 2, y - DIE_SIZE / 2, DIE_SIZE, DIE_SIZE, col, alpha * 0.95);
    game.draw.rect(x - DIE_SIZE / 2 + 8, y - DIE_SIZE / 2 + 8, DIE_SIZE * 0.4, DIE_SIZE * 0.18, C.g, alpha * 0.3);
    var dp = DOTS[face] || DOTS[1];
    for (var di = 0; di < dp.length; di++) game.draw.rect(x + dp[di][0] * 56 - 18, y + dp[di][1] * 56 - 18, 36, 36, '#1a0808', alpha * 0.9);
  }

  function newRound() { target = 3 + Math.floor(Math.random() * 4); playerDie = 1; playerRolling = true; enemyDie = 1; enemyRolling = true; roundState = 'rolling'; rollTimer = 0; enemyStop = 0.7 + Math.random() * 1.3; }

  function initGame() { winsP = 0; winsE = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (winsP * 1000 + Math.ceil(timeLeft) * 100) : winsP * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    txt('TARGET ' + target, W / 2, snap(H * 0.30), 52, C.c);
    txt('CLOSER WINS', W / 2, snap(H * 0.30) + 56, 30, C.f);
    txt('YOU', PDX, DY - DIE_SIZE / 2 - 56, 40, C.e);
    txt('CPU', EDX, DY - DIE_SIZE / 2 - 56, 40, C.a);
    drawDie(PDX, DY, playerDie, playerRolling ? '#e8d5a3' : C.e, playerRolling ? 0.7 + Math.sin(game.time.elapsed * 12) * 0.2 : 1.0);
    if (playerRolling) txt('TAP!', PDX, DY + DIE_SIZE / 2 + 48, 40, C.c); else txt('' + playerDie, PDX, DY + DIE_SIZE / 2 + 48, 46, C.e);
    drawDie(EDX, DY, enemyDie, enemyRolling ? '#e8d5a3' : C.a, enemyRolling ? 0.7 + Math.sin(game.time.elapsed * 10 + 1) * 0.2 : 1.0);
    if (!enemyRolling) txt('' + enemyDie, EDX, DY + DIE_SIZE / 2 + 48, 46, C.a);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (roundState === 'rolling' && playerRolling) { playerRolling = false; game.audio.play('se_tap', 0.5); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (target === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'YOU WIN!' : 'YOU LOSE', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(winsP > winsE); return; }
      if (flash > 0) flash -= dt * 2.5; if (resultTimer > 0) resultTimer -= dt;
      rollTimer += dt;
      if (roundState === 'rolling') {
        if (playerRolling && Math.floor(rollTimer * ROLL_SPEED) !== Math.floor((rollTimer - dt) * ROLL_SPEED)) playerDie = 1 + Math.floor(Math.random() * 6);
        if (enemyRolling) { if (Math.floor(rollTimer * ROLL_SPEED) !== Math.floor((rollTimer - dt) * ROLL_SPEED)) enemyDie = 1 + Math.floor(Math.random() * 6); enemyStop -= dt; if (enemyStop <= 0) enemyRolling = false; }
        if (!playerRolling && !enemyRolling) {
          roundState = 'result'; var pd = Math.abs(playerDie - target), ed = Math.abs(enemyDie - target);
          if (pd < ed) { winsP++; resultText = 'WIN!'; flashCol = C.b; game.audio.play('se_success', 0.8); for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PDX, y: DY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); } }
          else if (ed < pd) { winsE++; resultText = 'LOSE'; flashCol = C.a; game.audio.play('se_failure', 0.5); }
          else { resultText = 'DRAW'; flashCol = C.c; game.audio.play('se_tap', 0.3); }
          flash = 0.4; resultTimer = 1.0; waitTimer = 1.2;
          if (winsP >= NEEDED_WIN) { finish(true); return; }
          if (winsE >= NEEDED_WIN) { finish(false); return; }
        }
      } else if (roundState === 'result') { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.76), 80, flashCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('WIN ' + winsP + '  LOSE ' + winsE + '  /  FIRST TO ' + NEEDED_WIN, W / 2, 168, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
