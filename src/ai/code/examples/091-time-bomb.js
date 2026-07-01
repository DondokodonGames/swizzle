// 091-time-bomb.js
// タイムボム — 表示された解除コードを時間内に入力して爆弾を止める
// 操作: 数字ボタンを順にタップ、CLRでやり直し
// 成功: 1問解除  失敗: 時間切れ爆発 or 8秒×コード

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  var GAME_TITLE  = 'TIME BOMB';
  var HOW_TO_PLAY = 'ENTER THE DEFUSE CODE IN TIME';
  var CODE_LEN = 4;
  var FUSE_TIME = 8;
  var NEEDED = 1;           // 修正2: 4 → 1

  var NUMPAD = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [-1, 0, -2]];
  var BTN_W = 220, BTN_H = 170, BTN_GAP = 28;
  var NUMPAD_X = (W - (3 * BTN_W + 2 * BTN_GAP)) / 2, NUMPAD_Y = H * 0.56;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var code, input, fuseTimer, score, done, exploding, defused, wrongFlash, particles;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(fuseTimer / FUSE_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? (fuseTimer > 3 ? C.a : C.f) : '#003b00');
  }

  function genCode() { code = []; for (var i = 0; i < CODE_LEN; i++) code.push(Math.floor(Math.random() * 10)); input = []; fuseTimer = FUSE_TIME; }
  function btnPos(col, row) { return { x: NUMPAD_X + col * (BTN_W + BTN_GAP), y: NUMPAD_Y + row * (BTN_H + BTN_GAP) }; }
  function initGame() { score = 0; done = false; exploding = 0; defused = 0; wrongFlash = 0; particles = []; genCode(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(fuseTimer) * 60) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, success ? 400 : 700);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function explode() {
    exploding = 0.8;
    for (var i = 0; i < 30; i++) { var ang = Math.random() * Math.PI * 2, spd = 300 + Math.random() * 400; particles.push({ x: W / 2, y: H * 0.36, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.7 }); }
    finish(false);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || exploding > 0 || defused > 0) return;
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) {
      var num = NUMPAD[r][c]; if (num === -2) continue;
      var pos = btnPos(c, r);
      if (tx >= pos.x && tx <= pos.x + BTN_W && ty >= pos.y && ty <= pos.y + BTN_H) {
        if (num === -1) { input = []; game.audio.play('se_tap', 0.4); }
        else {
          input.push(num); game.audio.play('se_tap', 0.7);
          if (input.length === CODE_LEN) {
            var ok = true; for (var i = 0; i < CODE_LEN; i++) if (input[i] !== code[i]) { ok = false; break; }
            if (ok) { score++; defused = 0.6; game.audio.play('se_success'); if (score >= NEEDED) { finish(true); return; } setTimeout(genCode, 700); }
            else { wrongFlash = 0.4; input = []; game.audio.play('se_failure', 0.7); fuseTimer -= 2; }
          }
        }
        return;
      }
    }
  });

  // 世界観: 爆弾処理室。導火線が尽きる前に解除コードを打ち込む。
  function background() {
    game.draw.clear('#001100');
    game.draw.rect(snap(W / 2) - 160, snap(H * 0.28), 320, 200, '#002200');
    game.draw.rect(snap(W / 2) - 160, snap(H * 0.28), 320, 12, C.d);
    txt('BOMB SQUAD', W / 2, 250, 34, C.b);
  }

  function drawBomb() {
    // 爆弾本体
    game.draw.rect(snap(W / 2) - 120, snap(H * 0.3), 240, 150, '#001a00');
    // 導火線の火花
    game.draw.rect(snap(W / 2) - 4, snap(H * 0.3) - 40, 8, 40, fuseTimer > 3 ? C.a : C.f);
    if (Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.rect(snap(W / 2) - 12, snap(H * 0.3) - 52, 24, 16, C.e);
    txt(Math.max(0, fuseTimer).toFixed(1), W / 2, H * 0.37, 72, fuseTimer > 3 ? C.a : C.f);
    // コード表示
    game.draw.rect(snap(W / 2) - 280, snap(H * 0.45), 560, 100, '#002200');
    for (var d = 0; d < CODE_LEN; d++) txt(code[d] + '', W / 2 - 200 + d * 132, H * 0.48, 68, C.a);
    for (var id = 0; id < CODE_LEN; id++) txt(id < input.length ? input[id] + '' : '_', W / 2 - 200 + id * 132, H * 0.53, 56, id < input.length ? C.g : C.d);
  }

  function drawNumpad() {
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) {
      var num = NUMPAD[r][c]; if (num === -2) continue;
      var pos = btnPos(c, r);
      game.draw.rect(snap(pos.x), snap(pos.y), BTN_W, BTN_H, '#002a00');
      game.draw.rect(snap(pos.x), snap(pos.y), BTN_W, 8, C.d, 0.6);
      txt(num === -1 ? 'CLR' : num + '', pos.x + BTN_W / 2, pos.y + BTN_H / 2, num === -1 ? 44 : 64, num === -1 ? C.f : C.a);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!code) initGame();
      background();
      txt(GAME_TITLE,  W / 2, H * 0.14, 84, C.f);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 30, C.b);
      txt('CODE: ' + code.join(' '), W / 2, H * 0.4, 60, C.a);
      drawNumpad();
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.46, 60, C.e);
        txt('TAP TO START', W / 2, H * 0.5, 44, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEFUSED!' : 'BOOM!', W / 2, H * 0.35, 88, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done && exploding <= 0 && defused <= 0) {
      fuseTimer -= dt;
      if (fuseTimer <= 0) { fuseTimer = 0; explode(); }
    }
    if (exploding > 0) exploding -= dt;
    if (defused > 0) defused -= dt;
    if (wrongFlash > 0) wrongFlash -= dt;
    for (var i = 0; i < particles.length; i++) { var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    background();
    drawBomb();
    drawNumpad();
    if (wrongFlash > 0) { game.draw.rect(0, 0, W, H, C.f, wrongFlash * 0.3); txt('WRONG CODE!', W / 2, H * 0.42, 56, C.f); }
    if (defused > 0) { game.draw.rect(0, 0, W, H, C.a, defused / 0.6 * 0.3); txt('DEFUSED!', W / 2, H * 0.42, 72, C.a); }
    if (exploding > 0) game.draw.rect(0, 0, W, H, C.f, exploding * 0.6);
    for (var pi = 0; pi < particles.length; pi++) { var pp = particles[pi]; game.draw.rect(snap(pp.x) - 8, snap(pp.y) - 8, 16, 16, C.e, pp.life); }
    timeBar();
    txt('DEFUSE THE BOMB!', W / 2, 96, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
