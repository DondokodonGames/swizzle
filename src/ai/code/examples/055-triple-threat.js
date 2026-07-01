// 055-triple-threat.js
// トリプルスレット — 3つの迫ってくる脅威を同時に管理する注意力分散ゲーム
// 操作: タップで最も危険な脅威をリセット（3つのゾーンのどこかをタップ）
// 成功: 8秒生き残る  失敗: いずれかの脅威がMAXに達する

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'TRIPLE THREAT';
  var HOW_TO_PLAY = 'TAP THE RISING GAUGE';
  var MAX_TIME = 8;          // 修正2: 生存系 30s → 8s
  var BAR_W = 120, BAR_H = H * 0.5, BAR_Y = H * 0.26;   // 修正1: ゲージを縦に長く

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var threats, timeLeft, done, flashIndex, flashTimer;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() {
    threats = [
      { level: 0.1, rate: 0.10, col: C.e, label: 'FIRE', x: W * 0.22 },
      { level: 0.25, rate: 0.075, col: C.a, label: 'FLOOD', x: W * 0.5 },
      { level: 0.15, rate: 0.09, col: C.d, label: 'VOLT', x: W * 0.78 }
    ];
    timeLeft = MAX_TIME; done = false; flashIndex = -1; flashTimer = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? 300 : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < threats.length; i++) {
      if (Math.abs(x - threats[i].x) < W * 0.16) { threats[i].level = Math.max(0, threats[i].level - 0.55); flashIndex = i; flashTimer = 0.3; game.audio.play('se_tap', 0.6); break; }
    }
  });

  // 世界観: 制御室の3系統管理。炎・洪水・電圧のゲージをMAX未満に保つ。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(0, 0, W, H, C.a, 0.08);
    for (var gy = 120; gy < H; gy += 96) game.draw.rect(0, gy, W, 2, C.a, 0.2);
    txt('CONTROL ROOM', W / 2, H * 0.1, 36, C.b);
  }

  function drawThreats() {
    for (var j = 0; j < threats.length; j++) {
      var t = threats[j], bx = t.x - BAR_W / 2, fillH = BAR_H * t.level, fillY = BAR_Y + BAR_H - fillH;
      game.draw.rect(snap(bx) - 8, snap(BAR_Y) - 8, BAR_W + 16, BAR_H + 16, '#333355');   // 筐体
      game.draw.rect(snap(bx), snap(BAR_Y), BAR_W, BAR_H, '#0a0018');
      game.draw.rect(snap(bx), snap(fillY), BAR_W, snap(fillH), t.col, t.level > 0.75 ? 1 : 0.8);
      // 危険ライン
      game.draw.rect(snap(bx) - 16, snap(BAR_Y + BAR_H * 0.15), BAR_W + 32, 4, C.e, 0.6);
      if (t.level > 0.75 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.rect(snap(bx), snap(BAR_Y), BAR_W, BAR_H * 0.12, C.e);
      if (flashIndex === j && flashTimer > 0) game.draw.rect(snap(bx) - 20, snap(BAR_Y) - 20, BAR_W + 40, BAR_H + 40, C.g, flashTimer / 0.3 * 0.3);
      txt(t.label, t.x, BAR_Y + BAR_H + 56, 44, t.col);
      txt(Math.floor(t.level * 100) + '%', t.x, BAR_Y + BAR_H + 120, 40, t.level > 0.75 ? C.e : C.c);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!threats) initGame();
      background();
      drawThreats();
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 64, C.g);
        txt('TAP TO START', W / 2, H * 0.93, 48, C.c);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      var mult = 1 + (MAX_TIME - timeLeft) * 0.08;
      for (var i = 0; i < threats.length; i++) { threats[i].level += threats[i].rate * mult * dt; if (threats[i].level >= 1.0) { finish(false); return; } }
      if (flashTimer > 0) flashTimer -= dt;
    }

    // ---- draw ----
    background();
    drawThreats();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.c);
    txt('TAP RISING GAUGES!', W / 2, H - 80, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
