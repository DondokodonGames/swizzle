// 058-gem-rush.js
// ジェムラッシュ — 特定の色の宝石だけを素早くタップして集める採掘レース
// 操作: タップで宝石を収集（ターゲット色のみ）、違う色は-1点
// 成功: 2個収集  失敗: -5点 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GEM_COLORS = [C.a, C.f, C.c, C.b, C.e, C.d];

  var GAME_TITLE  = 'GEM RUSH';
  var HOW_TO_PLAY = 'TAP ONLY THE TARGET GEM';
  var MAX_TIME = 15;
  var NEEDED = 2;           // 修正2: 15 → ceil(15/10) = 2
  var MAX_PENALTY = 5;
  var GEM_R = 60, MAX_GEMS = 12, TOP = 460, BOTTOM = H - 200;   // 修正1: 縦全域に散布

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var targetColor, gems, score, penalties, timeLeft, done, colorTimer, floaters;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawGemSprite(x, y, col, r) {
    var bx = snap(x), by = snap(y);
    game.draw.rect(bx - r, by - 8, r * 2, 16, col);          // 中段(広)
    game.draw.rect(bx - r + 16, by - r + 8, r * 2 - 32, r * 2 - 16, col); // 本体
    game.draw.rect(bx - r + 8, by - r + 16, 16, 16, C.g, 0.6);  // 輝き
    game.draw.rect(bx - 8, by + r - 24, 16, 16, col);        // 底の先端
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

  function spawnGem() { gems.push({ x: snap(GEM_R + 40 + Math.random() * (W - (GEM_R + 40) * 2)), y: snap(TOP + Math.random() * (BOTTOM - TOP)), colorIdx: Math.floor(Math.random() * GEM_COLORS.length), life: 1.8 + Math.random() * 1.4, maxLife: 3.2, scale: 1 }); }
  function initGame() { targetColor = Math.floor(Math.random() * GEM_COLORS.length); gems = []; score = 0; penalties = 0; timeLeft = MAX_TIME; done = false; colorTimer = 4; floaters = []; for (var i = 0; i < 6; i++) spawnGem(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = gems.length - 1; i >= 0; i--) {
      var g = gems[i], dx = x - g.x, dy = y - g.y;
      if (Math.sqrt(dx * dx + dy * dy) < GEM_R + 20) {
        if (g.colorIdx === targetColor) { score++; floaters.push({ x: g.x, y: g.y, t: '+1', col: C.b, life: 0.6 }); game.audio.play('se_tap', 0.7); gems.splice(i, 1); if (score >= NEEDED) finish(true); }
        else { penalties++; floaters.push({ x: g.x, y: g.y, t: '-1', col: C.a, life: 0.6 }); game.audio.play('se_failure', 0.4); gems.splice(i, 1); if (penalties >= MAX_PENALTY) finish(false); }
        break;
      }
    }
  });

  // 世界観: 鉱脈のジェム採掘レース。指定色のジェムだけを素早く掘り集める。
  function background() {
    game.draw.clear('#0a0018');
    for (var gy = 400; gy < H; gy += 120) game.draw.rect(0, gy, W, 2, C.d, 0.2);
    txt('GEM MINE', W / 2, H * 0.06, 36, C.b);
  }

  function drawGems() {
    for (var j = 0; j < gems.length; j++) {
      var g = gems[j], col = GEM_COLORS[g.colorIdx], a = Math.min(1, g.life / 0.6);
      if (g.colorIdx === targetColor && Math.floor(game.time.elapsed * 8) % 2 === 0) drawGemSprite(g.x, g.y, C.g, GEM_R + 8);
      if (a < 1) game.draw.rect(snap(g.x) - GEM_R, snap(g.y) - GEM_R, GEM_R * 2, GEM_R * 2, col, a);
      else drawGemSprite(g.x, g.y, col, GEM_R);
    }
    for (var f = 0; f < floaters.length; f++) txt(floaters[f].t, floaters[f].x, floaters[f].y, 56, floaters[f].col);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!gems) initGame();
      background();
      drawGems();
      txt(GAME_TITLE,  W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.21, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 52, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      colorTimer -= dt;
      if (colorTimer <= 0) { targetColor = (targetColor + 1) % GEM_COLORS.length; colorTimer = 4; game.audio.play('se_tap', 0.3); }
      if (gems.length < MAX_GEMS) spawnGem();
      for (var i = gems.length - 1; i >= 0; i--) { gems[i].life -= dt; if (gems[i].life <= 0) gems.splice(i, 1); }
      for (var f = floaters.length - 1; f >= 0; f--) { floaters[f].life -= dt; floaters[f].y -= 80 * dt; if (floaters[f].life <= 0) floaters.splice(f, 1); }
    }

    // ---- draw ----
    background();
    // ターゲット色の提示
    game.draw.rect(0, 380, W, 160, GEM_COLORS[targetColor], 0.1);
    drawGemSprite(W / 2, 460, GEM_COLORS[targetColor], 56);
    txt('COLLECT THIS!', W / 2, 400, 40, GEM_COLORS[targetColor]);
    game.draw.rect(0, 540, W * Math.max(0, colorTimer / 4), 12, GEM_COLORS[targetColor], 0.7);
    drawGems();
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 150, 40, C.b);
    for (var p = 0; p < MAX_PENALTY; p++)
      game.draw.rect(W / 2 + (p - 2) * 56 - 16, 200, 32, 32, p < penalties ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
