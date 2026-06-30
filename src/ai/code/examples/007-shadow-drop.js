// 007-shadow-drop.js
// シャドウドロップ — 影にぴったり重なったらタップ！精度の達成感
// 操作: 落ちてくるブロックが影と重なったらタップ
// 成功: 1回ぴったり合わせる  失敗: 3ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'SHADOW DROP';
  var HOW_TO_PLAY = 'TAP WHEN ALIGNED';
  var MAX_TIME = 20;
  var NEEDED = 1;             // 修正2: 3 → ceil(3/10) = 1
  var MAX_MISS = 3;
  var SHADOW_W = 260, SHADOW_H = 260;
  var FLOOR_Y = H - 460;      // 修正1: 影を縦下方に配置、落下距離を縦全域に
  var DROP_TOP = 220;
  var shadowX = W / 2 - SHADOW_W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var score, misses, timeLeft, done, block, resultFx;

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
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; block = null; resultFx = null;
    spawnBlock();
  }

  function spawnBlock() {
    block = { x: shadowX, y: DROP_TOP, w: SHADOW_W, h: SHADOW_H, vy: game.random(280, 420 + score * 40), tapped: false };
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 50) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function registerMiss() {
    misses++;
    resultFx = { ok: false, t: 0 };
    game.audio.play('se_failure', 0.5);
    if (misses >= MAX_MISS) finish(false);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !block || block.tapped) return;
    var diff = Math.abs(block.y - FLOOR_Y);
    block.tapped = true;
    if (diff <= 70) {
      score++;
      resultFx = { ok: true, t: 0 };
      game.audio.play('se_tap', 0.9);
      if (score >= NEEDED) finish(true);
    } else {
      registerMiss();
    }
  });

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, FLOOR_Y + SHADOW_H + 8, W, H, C.d, 0.15);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var demoY = snap(DROP_TOP + ((game.time.elapsed * 300) % (FLOOR_Y - DROP_TOP + 200)));
      game.draw.rect(shadowX, FLOOR_Y, SHADOW_W, SHADOW_H, C.f, 0.3);
      game.draw.rect(snap(shadowX), demoY, SHADOW_W, SHADOW_H, C.a);
      txt(GAME_TITLE,  W / 2, H * 0.16, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 46, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.86, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.93, 42, '#888888');
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
      if (timeLeft <= 0) { finish(false); return; }
    }

    if (block && !block.tapped) {
      block.y += block.vy * dt;
      if (block.y > FLOOR_Y + SHADOW_H + 120) { block.tapped = true; if (!done) registerMiss(); }
    }

    if (resultFx) {
      resultFx.t += dt;
      if (resultFx.t > 0.5) { resultFx = null; if (!done) spawnBlock(); }
    } else if (!block && !done) spawnBlock();

    // ---- draw ----
    background();

    // 影（接近で点滅）
    var near = block && !block.tapped && Math.abs(block.y - FLOOR_Y) < 120;
    var shadowCol = near && Math.floor(game.time.elapsed * 8) % 2 === 0 ? C.f : '#003b00';
    game.draw.rect(shadowX, FLOOR_Y, SHADOW_W, SHADOW_H, shadowCol);
    txt('▼', W / 2, FLOOR_Y + SHADOW_H / 2, 80, '#004400');

    if (block) {
      var a = block.tapped ? Math.max(0, 1 - (resultFx ? resultFx.t * 2 : 0)) : 1;
      game.draw.rect(snap(block.x), snap(block.y), block.w, block.h, C.a, a);
      game.draw.rect(snap(block.x) + 16, snap(block.y) + 16, 48, 48, C.b, a);
    }

    if (resultFx) {
      var p = resultFx.t / 0.5;
      if (resultFx.ok) txt('PERFECT!', W / 2, FLOOR_Y - 80 - p * 120, 80, C.f);
      else txt('MISS', W / 2, FLOOR_Y - 80 - p * 80, 80, C.e);
    }

    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.c);
    // ミスピップ
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#330000');
    txt(score + ' / ' + NEEDED, W / 2, H - 120, 56, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
