// GH-PS-0120-crumble-climb.js
// クランブルクライム — 足場を選んで登る。崩れる足場は音と揺れで分かる
// 操作: 3つの足場のうち、しっかりしている(揺れが小さい・音が澄んでいる)ものをタップ
// 終わり: 5段登れば成功。崩れる足場を踏めば落下して失敗
// @mechanic: spot
// @theme: cliff_face
// 世界観: 垂直な崖。3つの足場が現れるたび、1つだけかすかに崩れかけている(揺れが大きく、音がこもる)。見極めて登る
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // HYPERCASUAL 3D: 白背景 + 単色。柔らかい影の丸い塊
  var C = {
    bg: '#f5f5f2', rock: '#8a8478', rockBad: '#8a8478', shadow: '#00000022',
    good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffb020', ink: '#2a2733',
  };

  var GAME_TITLE = 'CRUMBLE CLIMB';
  var LEVELS = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, level = 0;

  var rocks, badIdx, resolved, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RX = [W * 0.24, W * 0.5, W * 0.76], RY = H * 0.44;

  var FLAG_SPRITE = ['#.', '#.', '##', '#.'];

  function cliffBg() {
    game.draw.gradient(0, H, [[0, '#e8ece8'], [1, C.bg]]);
    // 雲の影(ゆっくり流れる、ATTRACT差分検出のためにも使う)
    var shadowX = (game.time.elapsed * 300) % (W + 500) - 250;
    game.draw.rect(shadowX, 0, 260, H, '#4a5a6a', 0.16);
    game.draw.rect(0, H * 0.72, W, H * 0.28, '#e0e0da');
    game.draw.sprite(FLAG_SPRITE, { '#': C.gold }, W * 0.5, H * 0.18, 14, { anchor: 'center' });
  }

  function newLevel() {
    badIdx = Math.floor(Math.random() * 3);
    resolved = false;
  }

  function initGame() {
    level = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newLevel();
  }

  function drawRocks(t) {
    for (var i = 0; i < 3; i++) {
      var bad = i === badIdx;
      var wob = bad ? Math.sin(t * 16 + i) * 6 : Math.sin(t * 3 + i) * 1.5;
      var rx = RX[i] + wob, ry = RY;
      game.draw.circle(rx, ry + 40, 50, C.shadow, 0.5);
      game.draw.circle(rx, ry, 58, C.rock);
      game.draw.circle(rx - 14, ry - 14, 16, '#ffffff', 0.4);
    }
  }

  function pick(i) {
    if (done || ready > 0 || resolved) return;
    resolved = true;
    hitStop = 0.08;
    if (i === badIdx) {
      ok = false; finished = true;
      game.feedback.bad(RX[i], RY, { text: 'FALL' });
      game.fx.burst(RX[i], RY, { color: C.bad, count: 18, speed: 400 });
      shake = 0.25;
      game.audio.play('se_failure', 0.5);
      finish();
    } else {
      level++;
      game.feedback.good(RX[i], RY, { text: null, color: C.good });
      game.fx.burst(RX[i], RY, { color: C.good, count: 10, speed: 280 });
      game.audio.play('se_success', 0.3);
      if (level >= LEVELS) { ok = true; finished = true; finish(); }
      else { newLevel(); game.fx.popup(level + ' / ' + LEVELS, W / 2, H * 0.20, { color: C.gold, size: 44 }); }
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    var idx = -1, best = 999;
    for (var i = 0; i < 3; i++) { var d = Math.hypot(x - RX[i], y - RY); if (d < best) { best = d; idx = i; } }
    if (best < 90) pick(idx);
  });

  // ── ATTRACT ゴースト実演: 揺れが小さい足場だけを選ぶ ──
  var demo = { t: 0, gx: RX[1], gy: H * 0.68, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt) newLevel();
    var good2 = -1;
    for (var i = 0; i < 3; i++) if (i !== badIdx) { good2 = i; break; }
    var tx = RX[good2];
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
    demo.press = cyc > 1.6 && cyc < 1.8;
    if (cyc > 1.6 && cyc < 1.63) { game.feedback.good(tx, RY, { text: null, color: C.good }); game.fx.burst(tx, RY, { color: C.good, count: 8, speed: 260 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (rocks === undefined) { rocks = true; initGame(); }
      cliffBg();
      stepDemo(dt);
      drawRocks(demo.t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 48, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.14, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 34, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      cliffBg();
      drawRocks(game.time.elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 52, ok ? C.good : C.bad);
      txt(level + ' / ' + LEVELS, W / 2, H * 0.16, 34, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 30, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ level: level });
        else game.end.failure({ level: level });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    cliffBg();
    drawRocks(game.time.elapsed);

    game.draw.rect(60, 40, W - 120, 20, '#00000018');
    game.draw.rect(60, 40, (W - 120) * (level / LEVELS), 20, C.gold);
    txt(level + ' / ' + LEVELS, W / 2, 104, 36, C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
