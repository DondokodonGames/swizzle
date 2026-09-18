// GH-PS-0022-memory-flip.js
// メモリーフリップ — 神経衰弱。同じ絵を2枚めくる。めくるたびに残り時間が減る
// 操作: 伏せた札を2枚タップしてめくる。絵が揃えば残る、違えば伏せ直る
// 終わり: 3組全部揃えれば成功。時間切れなら失敗
// @mechanic: pair_match
// @theme: dim_parlor
// 世界観: 薄暗い一室、卓に伏せられた札。めくるたびに蝋燭の時間が短くなる。急ぎすぎても揃わない
// 残るもの: 正誤(CLEAR/GAME OVER) + めくった回数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // HD POST 3D: 低彩度・褐色寄り。ブルームとビネット、コントラストを潰す
  var C = {
    bg1: '#3a2e24', bg2: '#211a14', card: '#5a4a38', cardBack: '#4a3c2c', cardEdge: '#2a2018',
    good: '#8ac878', bad: '#c85858', gold: '#d8a848', white: '#f0e8d8', ink: '#0e0a06',
  };

  var GAME_TITLE = 'MEMORY FLIP';
  var TIME_START = 13, FLIP_PENALTY = 0.7, PAIRS = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, flips = 0, matched = 0;

  var cards, openA, openB, waitT, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ICONS = [
    ['.#.', '###', '.#.'],
    ['##.', '###', '.##'],
    ['#.#', '.#.', '#.#'],
  ];
  var ICON_COL = [C.gold, C.good, C.bad];

  var GX0 = W * 0.5 - 210, GY0 = H * 0.40 - 165, GAP_X = 210, GAP_Y = 330;

  function roomBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // ビネット(四隅を暗く)
    game.draw.circle(0, 0, W * 0.7, '#000000', 0.25);
    game.draw.circle(W, 0, W * 0.7, '#000000', 0.25);
    game.draw.circle(0, H, W * 0.7, '#000000', 0.25);
    game.draw.circle(W, H, W * 0.7, '#000000', 0.25);
    // ブルーム(半透明円、蝋燭の灯)
    game.draw.circle(W * 0.15, H * 0.10, 90, C.gold, 0.10);
    game.draw.circle(W * 0.85, H * 0.10, 90, C.gold, 0.10);
  }

  function initGame() {
    var ids = [0, 0, 1, 1, 2, 2];
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    cards = [];
    for (var r = 0; r < 2; r++) {
      for (var c = 0; c < 3; c++) cards.push({ x: GX0 + c * GAP_X, y: GY0 + r * GAP_Y, id: ids[r * 3 + c], open: false, done: false });
    }
    openA = -1; openB = -1; waitT = 0; timeLeft = TIME_START;
    flips = 0; matched = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawCard(cd) {
    game.draw.circle(cd.x, cd.y + 90, 90, '#000000', 0.3);
    if (cd.done || cd.open) {
      game.draw.rect(cd.x - 80, cd.y - 100, 160, 200, C.card);
      game.draw.rect(cd.x - 80, cd.y - 100, 160, 200, C.cardEdge, 0.0);
      game.draw.sprite(ICONS[cd.id], { '#': ICON_COL[cd.id] }, cd.x, cd.y, 26, { anchor: 'center' });
      if (cd.done) game.draw.circle(cd.x, cd.y, 100, C.good, 0.12);
    } else {
      game.draw.rect(cd.x - 80, cd.y - 100, 160, 200, C.cardBack);
      game.draw.rect(cd.x - 60, cd.y - 80, 120, 160, C.cardEdge, 0.4);
    }
  }

  function flipAt(idx) {
    if (done || ready > 0 || finished || waitT > 0) return;
    var cd = cards[idx];
    if (!cd || cd.open || cd.done) return;
    cd.open = true;
    flips++;
    timeLeft = Math.max(0, timeLeft - FLIP_PENALTY);
    game.audio.play('se_tap', 0.2);
    if (openA === -1) { openA = idx; }
    else if (openB === -1 && idx !== openA) {
      openB = idx;
      waitT = 0.5;
      if (cards[openA].id === cards[openB].id) {
        matched++;
        cards[openA].done = true; cards[openB].done = true;
        game.feedback.good((cards[openA].x + cards[openB].x) / 2, cards[openA].y, { text: 'MATCH', color: C.good });
        game.fx.burst(cards[openA].x, cards[openA].y, { color: C.gold, count: 12, speed: 300 });
        game.audio.play('se_success', 0.4);
        if (matched >= PAIRS) { ok = true; finished = true; hitStop = 0.2; }
        else game.fx.popup(matched + ' / ' + PAIRS, W / 2, H * 0.18, { color: C.gold, size: 46 });
      } else {
        game.feedback.bad(cards[openB].x, cards[openB].y, { text: 'MISS' });
        shake = 0.08;
        game.audio.play('se_bad', 0.3);
      }
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (waitT > 0) return;
    var idx = -1, best = 999;
    for (var i = 0; i < cards.length; i++) { var d = Math.hypot(x - cards[i].x, y - (cards[i].y + 10)); if (d < best) { best = d; idx = i; } }
    if (best < 120) flipAt(idx);
  });

  // ── ATTRACT ゴースト実演: 2枚めくって揃える ──
  var demo = { t: 0, gx: GX0, gy: GY0 + 90, press: false, i1: 0, i2: 3 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt) { for (var i = 0; i < cards.length; i++) { cards[i].open = false; cards[i].done = false; } }
    var c1 = cards[demo.i1], c2 = cards[demo.i2];
    if (cyc > 0.3 && cyc < 2.2) c1.open = true;
    if (cyc > 1.2 && cyc < 2.2) c2.open = true;
    if (cyc > 2.2) { c1.done = true; c2.done = true; }
    demo.press = (cyc > 0.3 && cyc < 0.5) || (cyc > 1.2 && cyc < 1.4);
    var tx = cyc < 1.2 ? c1.x : c2.x, ty = cyc < 1.2 ? c1.y : c2.y;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6); demo.gy += ((ty + 90) - demo.gy) * Math.min(1, dt * 6);
    if (cyc > 2.2 && cyc < 2.23) { game.feedback.good((c1.x + c2.x) / 2, c1.y, { text: 'MATCH', color: C.good }); game.fx.burst(c1.x, c1.y, { color: C.gold, count: 10, speed: 280 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cards === undefined) initGame();
      roomBg();
      stepDemo(dt);
      for (var i = 0; i < cards.length; i++) drawCard(cards[i]);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 54, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 36, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      roomBg();
      for (var i2 = 0; i2 < cards.length; i2++) drawCard(cards[i2]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 56, ok ? C.good : C.bad);
      txt(matched + ' / ' + PAIRS + '　' + flips + '回', W / 2, H * 0.14, 32, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 32, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ flips: flips, matched: matched });
        else game.end.failure({ flips: flips, matched: matched });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (waitT > 0) {
        waitT -= dt;
        if (waitT <= 0) {
          if (!cards[openA].done) { cards[openA].open = false; }
          if (openB !== -1 && !cards[openB].done) { cards[openB].open = false; }
          openA = -1; openB = -1;
        }
      }
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; ok = false; finished = true; finish(); }
    }
    if (finished && !done) finish();
    if (shake > 0) shake -= dt;

    roomBg();
    for (var i3 = 0; i3 < cards.length; i3++) drawCard(cards[i3]);

    var frac = Math.max(0, timeLeft / TIME_START);
    game.draw.rect(60, 40, W - 120, 22, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 22, frac < 0.3 ? C.bad : C.gold);
    txt(matched + ' / ' + PAIRS, W / 2, 104, 40, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 78, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
