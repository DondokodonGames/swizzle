// 089-hot-potato.js
// ホットポテト — 爆発する前に素早くスワイプして爆弾を隣へ渡し続ける
// 操作: スワイプで受け取った爆弾を上/左/右のプレイヤーへ渡す
// 成功: 2回渡す  失敗: 爆弾を持ったまま時間切れ or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'HOT POTATO';
  var HOW_TO_PLAY = 'SWIPE TO PASS THE BOMB';
  var MAX_TIME = 30;
  var NEEDED = 2;           // 修正2: 20 → 2
  var FUSE_TIME = 2.4;
  var PLAYER_IDX = 2;       // 自分は下（H*0.75）

  var PLAYERS = [
    { x: W / 2,   y: H * 0.28, label: 'UP' },
    { x: W * 0.8, y: H * 0.52, label: 'R' },
    { x: W / 2,   y: H * 0.75, label: 'YOU' },
    { x: W * 0.2, y: H * 0.52, label: 'L' }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var ballHolder, fuseTimer, passCooldown, score, timeLeft, done, particles, passFeedback;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() { ballHolder = PLAYER_IDX; fuseTimer = FUSE_TIME; passCooldown = 0; score = 0; timeLeft = MAX_TIME; done = false; particles = []; passFeedback = 0; }

  function opponentPass() {
    setTimeout(function() {
      if (done || state !== S.PLAYING) return;
      ballHolder = PLAYER_IDX; fuseTimer = FUSE_TIME; game.audio.play('se_tap', 0.5);
    }, 300 + Math.random() * 400);
  }

  function explode() {
    var b = PLAYERS[ballHolder];
    for (var i = 0; i < 20; i++) { var ang = Math.random() * Math.PI * 2, spd = 200 + Math.random() * 300; particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.6 }); }
    finish(false);
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, success ? 0 : 700);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || ballHolder !== PLAYER_IDX || passCooldown > 0) return;
    var targets = { up: 0, right: 1, left: 3 }, target = targets[dir];
    if (target === undefined) return;
    ballHolder = target; fuseTimer = FUSE_TIME; passCooldown = 0.2; score++; passFeedback = 0.3; game.audio.play('se_tap', 0.8);
    if (score >= NEEDED) { finish(true); return; }
    opponentPass();
  });

  // 世界観: 爆弾リレー。導火線が尽きる前に爆弾を隣のプレイヤーへ渡し続ける。
  function background() {
    game.draw.clear('#0a0018');
    for (var i = 0; i < 4; i++) { var n = (i + 1) % 4; game.draw.line(PLAYERS[i].x, PLAYERS[i].y, PLAYERS[n].x, PLAYERS[n].y, '#221040', 6); }
    txt('BOMB RELAY', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var j = 0; j < 4; j++) {
      var pl = PLAYERS[j], isMe = j === PLAYER_IDX;
      drawPixelCircle(pl.x, pl.y, 52, isMe ? C.e : C.d, 1);
      game.draw.rect(snap(pl.x) - 20, snap(pl.y) - 12, 12, 12, C.g);
      game.draw.rect(snap(pl.x) + 8, snap(pl.y) - 12, 12, 12, C.g);
      txt(pl.label, pl.x, pl.y + 76, 30, isMe ? C.b : '#8888aa');
    }
    if (!done || particles.length === 0) {
      var h = PLAYERS[ballHolder], frac = Math.max(0, fuseTimer / FUSE_TIME), urg = 1 - frac;
      var col = urg > 0.6 ? C.a : (urg > 0.3 ? C.f : C.c);
      if (ballHolder === PLAYER_IDX) drawPixelCircle(h.x, h.y - 70, 40, col, 0.3 + urg * 0.4);
      drawPixelCircle(h.x, h.y - 70, 32, col, 1);
      game.draw.rect(snap(h.x) - 4, snap(h.y - 70) - 44, 8, 20, C.c);   // 導火線
      if (ballHolder === PLAYER_IDX) txt(Math.ceil(fuseTimer) + '', h.x, h.y - 70, 34, C.g);
    }
    for (var pi = 0; pi < particles.length; pi++) { var p = particles[pi]; game.draw.rect(snap(p.x) - 8, snap(p.y) - 8, 16, 16, C.f, p.life); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ballHolder === undefined) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.13, 84, C.f);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.9, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (passCooldown > 0) passCooldown -= dt;
      if (passFeedback > 0) passFeedback -= dt;
      if (ballHolder === PLAYER_IDX) { fuseTimer -= dt; if (fuseTimer <= 0) { explode(); return; } }
    }
    for (var i = 0; i < particles.length; i++) { var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('PASS ' + score + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    if (ballHolder === PLAYER_IDX && passFeedback <= 0) txt('SWIPE UP/L/R!', W / 2, H - 90, 46, C.f);
    if (passFeedback > 0) txt('PASS!', W / 2, H - 90, 56, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
