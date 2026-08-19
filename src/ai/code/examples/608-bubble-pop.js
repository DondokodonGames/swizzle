// 608-bubble-pop.js
// 精霊泡狩り — 天井へ逃げる泡を、抜ける前に狙って落とす
// 操作: 昇ってくる泡をタップして割る
// 成功: 12個 落とす  失敗: 3個 逃がす or 17秒
// @mechanic: aim_shoot
// @theme: witch
// 世界観: 魔女の工房。大鍋から立つ精霊の泡が天窓から逃げると薬が薄まる
// variation: 精度型(泡が小さく速くなり、狙える幅が狭まっていく)
// spice: 黄金ターゲット(稀に金の泡。落とすと得点3倍)
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // NEO-RETRO: 限定5色 + 差し色1つ(毒々しい黄緑)だけを強く使う
  var C = {
    bg: '#1b1023', bone: '#ede4d3', moss: '#6ab04c', slate: '#4a4458',
    accent: '#c8ff3d', ember: '#e2574c',
  };

  var GAME_TITLE = 'SPIRIT POP';
  var MAX_TIME = 17;
  var NEEDED = 12;
  var ESCAPE_LIMIT = 3;
  var CEIL = H * 0.20;   // ここを抜けると逃げられる

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var bubbles, popped, escaped, score, combo, totalTime, done, spawnTimer;
  var ready, hitStop, feedback, feedbackOk, shake;

  // 精霊(顔つき / 2フレーム)。大きいドットで潔く
  var SPIRIT_A = [
    '.MMMM.',
    'MBBBBM',
    'MBEBEM',
    'MBBBBM',
    'MBMMBM',
    '.MMMM.',
  ];
  var SPIRIT_B = [
    '.MMMM.',
    'MBBBBM',
    'MBBBBM',
    'MBEBEM',
    'MBMMBM',
    '.MMMM.',
  ];
  var SPIRIT_COL = { M: C.moss, B: C.bone, E: C.bg };
  var GOLD_COL = { M: C.accent, B: C.bone, E: C.bg };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#0d0712', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.14); }

  function workshopBg() {
    game.draw.gradient(0, H, [[0, '#241535'], [0.55, C.bg], [1, '#0d0712']]);
    // 遠景: 棚と瓶(余白を恐れず、シルエットだけ)
    game.draw.rect(0, H * 0.30, W, 10, C.slate);
    for (var b = 0; b < 6; b++) {
      var bx = 90 + b * 190;
      game.draw.rect(bx, H * 0.30 - 62, 58, 62, C.slate);
      game.draw.rect(bx + 16, H * 0.30 - 82, 26, 22, C.slate);
    }
    // 天窓(逃げ口)
    game.draw.rect(0, CEIL - 8, W, 8, C.slate);
    game.draw.rect(W * 0.34, CEIL - 60, W * 0.32, 52, '#0d0712');
    game.draw.rect(W * 0.34, CEIL - 60, W * 0.32, 6, C.accent, 0.5);
    // 大鍋(泡の出どころ)
    game.draw.circle(W / 2, H * 0.94, 300, C.slate);
    game.draw.circle(W / 2, H * 0.90, 250, C.moss, 0.35);
  }

  function spawn() {
    // 精度型: 進むほど小さく速く
    var tight = Math.min(1, popped / NEEDED);
    var gold = Math.random() < 0.12;
    bubbles.push({
      x: 140 + Math.random() * (W - 280),
      y: H * 0.86,
      vy: -(150 + tight * 190 + Math.random() * 60),
      vx: (Math.random() * 2 - 1) * 60,
      px: 18 - tight * 6,
      gold: gold,
      pop: 0,
    });
  }

  function initGame() {
    bubbles = []; popped = 0; escaped = 0; score = 0; combo = 0; totalTime = 0;
    done = false; spawnTimer = 0.2; ready = 0.8; hitStop = 0;
    feedback = 0; feedbackOk = false; shake = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = score;
    game.audio.stopBgm();
    if (success) {
      game.audio.play('se_success');
    } else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.ember, 0.25);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function popAt(b, x, y) {
    popped++;
    combo++;
    var base = b.gold ? 300 : 100;
    var gain = base + Math.min(200, (combo - 1) * 20);
    score += gain;
    b.pop = 0.2;
    feedback = 0.3; feedbackOk = true;
    game.feedback.good(x, y, { text: '+' + gain, color: b.gold ? C.accent : C.moss });
    game.audio.play(b.gold ? 'se_milestone' : 'se_success', 0.5);
    game.fx.burst(x, y, { color: b.gold ? C.accent : C.moss, count: 10, speed: 300 });
    if (popped >= NEEDED) finish(true);
  }

  function escape(b) {
    escaped++;
    combo = 0;
    feedback = 0.4; feedbackOk = false;
    hitStop = 0.28; shake = 0.28;
    game.audio.play('se_failure', 0.5);
    game.feedback.bad(b.x, CEIL, { text: 'MISS' });
    if (escaped >= ESCAPE_LIMIT) finish(false);
  }

  function drawBubble(b) {
    var wob = Math.floor(game.time.elapsed * 8 + b.x) % 2 === 0;
    var scale = b.px * (1 + b.pop * 2.5);
    // telegraph: 天窓に近いほど輪郭が強く光り「逃げる」ことを予告する
    var near = 1 - Math.min(1, (b.y - CEIL) / (H * 0.45));
    if (near > 0.3) game.draw.circle(b.x, b.y, scale * 3.4, C.ember, near * 0.3);
    if (b.gold) game.draw.circle(b.x, b.y, scale * 3.0, C.accent, 0.25);
    game.draw.sprite(wob ? SPIRIT_A : SPIRIT_B, b.gold ? GOLD_COL : SPIRIT_COL, b.x, b.y, scale, { anchor: 'center' });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      var r = b.px * 2.6;
      if (Math.abs(x - b.x) < r && Math.abs(y - b.y) < r) {
        popAt(b, b.x, b.y);
        bubbles.splice(i, 1);
        return;
      }
    }
    // 空振り: コンボが切れる(狙いの精度が問われる型なので、外しに意味を持たせる)
    if (combo > 0) { combo = 0; game.feedback.bad(x, y, { text: 'MISS' }); }
    else game.audio.play('se_tap', 0.25);
    feedback = 0.2; feedbackOk = false;
  });

  // ── ATTRACT ゴースト実演: 昇る泡へ手が寄り、抜ける前に落とす ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: false, by: H * 0.8, bx: W * 0.42 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.by -= 220 * dt;
    demo.gx += (demo.bx - demo.gx) * Math.min(1, dt * 4);
    demo.gy += (demo.by - demo.gy) * Math.min(1, dt * 4);
    demo.press = Math.abs(demo.gy - demo.by) < 40 && demo.by < H * 0.55;
    if (demo.press) {
      game.feedback.good(demo.bx, demo.by, { text: '+100', color: C.moss });
      demo.by = H * 0.86;
      demo.bx = 200 + Math.random() * (W - 400);
    }
    if (demo.by < CEIL) { demo.by = H * 0.86; demo.bx = 200 + Math.random() * (W - 400); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      workshopBg();
      stepDemo(dt);
      var wob0 = Math.floor(game.time.elapsed * 8) % 2 === 0;
      game.draw.sprite(wob0 ? SPIRIT_A : SPIRIT_B, SPIRIT_COL, demo.bx, demo.by, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.accent);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.bone);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.moss);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.bone);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 38, C.slate);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      workshopBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.44, 96, resultSuccess ? C.accent : C.ember);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.55, 58, C.bone);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.62, 44, C.moss);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.70, 54, C.accent);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.75, 46, C.bone);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (totalTime >= MAX_TIME) { finish(false); return; }
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          spawnTimer = Math.max(0.45, 1.0 - popped * 0.04);
        }
        for (var i = bubbles.length - 1; i >= 0; i--) {
          var b = bubbles[i];
          b.y += b.vy * dt;
          b.x += b.vx * dt;
          if (b.x < 100 || b.x > W - 100) b.vx *= -1;
          if (b.y <= CEIL) { bubbles.splice(i, 1); escape(b); if (done) return; }
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    workshopBg();
    for (var k = 0; k < bubbles.length; k++) drawBubble(bubbles[k]);

    // HUD
    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 22, C.slate);
    game.draw.rect(60, 40, (W - 120) * frac, 22, frac < 0.25 ? C.ember : C.moss);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 92, 42, C.bone);
    txt(popped + ' / ' + NEEDED, W * 0.16, 150, 44, C.accent);
    for (var e = 0; e < ESCAPE_LIMIT; e++) {
      game.draw.rect(W * 0.80 + e * 52, 134, 40, 30, e < (ESCAPE_LIMIT - escaped) ? C.moss : C.slate);
    }
    if (combo >= 3) txt('x' + combo, W / 2, 152, 46, C.accent);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.52, 96, C.accent);
    if (feedback > 0 && !feedbackOk && NEEDED - popped <= 3) txt('あと' + (NEEDED - popped) + '個', W / 2, H * 0.30, 50, C.ember);

    scanlines();
  });

  game.onStart(function() {
    // NEO-RETRO: 少ない音で間を持たせる工房の低いループ
    game.audio.melody(
      [['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 1],
       ['D4', 0.5], ['C4', 0.5], ['D4', 1], ['R', 0.5]],
      { tempo: 128, wave: 'triangle', volume: 0.09, loop: true,
        bass: [['D2', 1], ['D2', 1], ['Bb2', 1], ['C3', 1]], bassWave: 'square', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
