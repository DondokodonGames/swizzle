// 608-bubble-pop.js
// バブルポップ — 大鍋から昇る魔法の泡を、上端へ逃がす前にタップで次々に割る
// 操作: 昇ってくる泡をタップで割る
// 成功: 制限時間内に 12 個割る  失敗: 時間切れ
// @mechanic: aim_shoot
// @theme: witch
// 世界観: 魔女の工房で、大鍋から湧く魔力の泡を弟子が割って調合の暴発を抑える
// variation: 精度型(進むほど泡が小さく速くなる)
// spice: 黄金ターゲット(稀に金の泡=得点2倍が出る)
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO(魔女の工房)
  var C = {
    night: '#0c0a1e', brew: '#8a2be2', brewLt: '#c77dff', lime: '#9dff5a', pink: '#ff5db1',
    gold: '#ffd23f', cream: '#f0eaff', red: '#ff3b6b', cauldron: '#2a2440', dim: '#3a3260',
  };

  var GAME_TITLE = 'BUBBLE POP';
  var MAX_TIME = 17;
  var NEEDED = 12;
  var TOP_LINE = 220;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var bubbles, spawnT, popped, combo, comboT, score, timeLeft, done;
  var ready, hitStop, feedback, feedbackOk;

  // 魔女(顔つき)
  var WITCH = [
    '...K....',
    '..KKK...',
    '.KKKKK..',
    'KKKKKKK.',
    '.GWWWG..',
    '.GEWEG..',
    '.GWWWG..',
    '..GGG...',
  ];
  var WITCH_COL = { K: '#1a0f2e', G: '#5a7a3a', W: C.cream, E: '#1a0f2e' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#03010c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.14); }

  function witchBg() {
    game.draw.gradient(0, H, [[0, '#1a1240'], [0.5, '#0c0a1e'], [1, '#040210']]);
    // 大鍋
    game.draw.rect(W / 2 - 260, H - 200, 520, 200, C.cauldron);
    game.draw.rect(W / 2 - 300, H - 210, 600, 40, C.dim);
    // 鍋の中の煮立ち
    for (var i = 0; i < 8; i++) {
      var bx = W / 2 - 200 + i * 55, by = H - 180 + Math.sin(game.time.elapsed * 4 + i) * 10;
      game.draw.circle(bx, by, 22, C.brew, 0.7);
    }
    // 上端の逃走ライン(telegraph)
    game.draw.line(0, TOP_LINE, W, TOP_LINE, C.red, 3);
  }

  function drawBubble(b) {
    var col = b.gold ? C.gold : C.brewLt;
    if (b.y < TOP_LINE + 160) game.draw.circle(b.x, b.y, b.r + 8, C.red, 0.12); // 逃走間近の警告
    game.draw.circle(b.x, b.y, b.r, col, 0.8);
    game.draw.circle(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, C.cream, 0.9);
    if (b.gold && Math.floor(game.time.elapsed * 8) % 2 === 0) game.draw.circle(b.x, b.y, b.r + 6, C.gold, 0.4);
  }

  function spawnBubble() {
    var small = Math.min(30, popped * 2);
    bubbles.push({
      x: W / 2 + game.random(-220, 220), y: H - 200,
      r: 62 - small + game.random(-6, 6),
      vy: -(150 + popped * 8 + game.random(0, 60)),
      vx: game.random(-40, 40), gold: Math.random() < 0.12,
    });
  }
  function initGame() {
    bubbles = []; spawnT = 0; popped = 0; combo = 0; comboT = 0; score = 0;
    timeLeft = MAX_TIME; done = false; ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false;
    for (var i = 0; i < 3; i++) spawnBubble();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.25); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function tapAt(x, y) {
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      if (game.hit.circle(x, y, 12, b.x, b.y, b.r)) {
        popped++; combo++; comboT = 1.2;
        var mult = combo >= 3 ? 2 : 1;
        var gain = (b.gold ? 200 : 100) * mult;
        score += gain;
        feedback = 0.25; feedbackOk = true;
        game.feedback.good(b.x, b.y, { text: (b.gold ? 'GOLD ' : '') + '+' + gain, color: b.gold ? C.gold : C.lime });
        if (b.gold) game.audio.play('se_milestone');
        else game.audio.play('se_coin', 0.6);
        bubbles.splice(i, 1);
        if (popped >= NEEDED) { finish(true); return; }
        spawnBubble();
        return;
      }
    }
    // 空振り: コンボ切れ
    combo = 0;
    game.feedback.bad(x, y, { text: null });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    tapAt(x, y);
  });

  // ATTRACT ゴースト実演: 手が昇る泡を次々に割る
  var d = { bubbles: null, t: 0, gx: W / 2, gy: H * 0.7, press: false, tgt: 0 };
  function stepDemo(dt) {
    if (!d.bubbles) { d.bubbles = []; for (var i = 0; i < 3; i++) d.bubbles.push({ x: W / 2 + (i - 1) * 200, y: H - 200 - i * 200, r: 56, gold: i === 1 }); }
    d.t += dt;
    for (var j = 0; j < d.bubbles.length; j++) {
      var b = d.bubbles[j]; b.y -= 140 * dt; b.x += Math.sin(d.t * 2 + j) * 30 * dt;
      if (b.y < TOP_LINE) { b.y = H - 200; b.x = W / 2 + game.random(-200, 200); }
    }
    var tgt = d.bubbles[d.tgt % d.bubbles.length];
    d.gx += (tgt.x - d.gx) * Math.min(1, dt * 4);
    d.gy += (tgt.y + 30 - d.gy) * Math.min(1, dt * 4);
    d.press = Math.hypot(d.gx - tgt.x, d.gy - tgt.y - 30) < 80;
    if (d.press) {
      game.feedback.good(tgt.x, tgt.y, { text: '+100', color: C.lime });
      tgt.y = H - 200; tgt.x = W / 2 + game.random(-200, 200); d.tgt++;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      witchBg(); stepDemo(dt);
      game.draw.sprite(WITCH, WITCH_COL, W / 2, H - 130, 14, { anchor: 'center' });
      for (var i = 0; i < d.bubbles.length; i++) drawBubble(d.bubbles[i]);
      game.draw.hand(d.gx, d.gy, { press: d.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 80, C.brewLt);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.16, 40, C.lime);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 60, C.pink);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.cream);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      witchBg();
      if (hitStop > 0) hitStop -= dt;
      game.draw.sprite(WITCH, WITCH_COL, W / 2, H - 130, 14, { anchor: 'center' });
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 88, resultSuccess ? C.lime : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.44, 56, C.cream);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.5, 42, C.gold);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.57, 54, C.pink);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.6, 46, C.lime);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
      else {
        timeLeft -= dt;
        if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
        if (timeLeft <= 0) { finish(false); return; }
        for (var i = bubbles.length - 1; i >= 0; i--) {
          var b = bubbles[i];
          b.y += b.vy * dt; b.x += b.vx * dt;
          if (b.x < 60 || b.x > W - 60) b.vx = -b.vx;
          if (b.y < TOP_LINE - b.r) { // 逃走
            bubbles.splice(i, 1); combo = 0;
            game.feedback.bad(b.x, TOP_LINE, { text: null });
            spawnBubble();
          }
        }
        while (bubbles.length < 4) spawnBubble();
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    witchBg();
    for (var k = 0; k < bubbles.length; k++) drawBubble(bubbles[k]);
    game.draw.sprite(WITCH, WITCH_COL, W / 2, H - 130, 14, { anchor: 'center' });

    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, combo >= 3 ? C.pink : C.brewLt);
    game.draw.rect(60, 40, W - 120, 26, C.dim, 0.6);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 44, C.cream);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 44, C.lime);
    if (combo >= 3) txt('x2', W - 120, 108, 48, C.pink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 92, C.lime);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['F4', 0.5], ['G4', 0.5], ['Bb4', 0.5], ['A4', 1],
       ['E4', 0.5], ['G4', 0.5], ['Bb4', 0.5], ['A4', 0.5], ['D5', 1], ['D4', 1]],
      { tempo: 134, wave: 'square', volume: 0.08, loop: true,
        bass: [['D2', 1], ['D2', 1], ['Bb1', 1], ['C2', 1], ['A1', 1], ['D2', 1]], bassWave: 'triangle', bassVolume: 0.07 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
