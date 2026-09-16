// 078-neon-snake.js
// ネオンスネーク — 迫る分岐で行き先を切り替え、光の蛇を実のある管へ導く
// 操作: タップで次の分岐の行き先(左/右)を切り替える
// 成功: 8個 のオーブを通す  失敗: 3回 行き止まりに突っ込む or 22秒
// @mechanic: guide_path
// @theme: custom
// 世界観: ネオングリッドの回廊。分岐器を切り替えて光の蛇をエネルギーオーブの管へ流す
// 注: 同じslugの #221 が「スワイプで蛇自身を操舵する」遊びなので、こちらは
//     「分岐器を切り替えて導く」に分けた(遊びの重複を避ける。メカニクスは guide_path のまま)
// variation: 物量型(分岐が詰まり、同時に見る先が増えていく)
// spice: コンボ倍率(連続で通すと x2 → x4 → x8)
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s ISO: 6〜8色。菱形グリッドと、影の距離で高さを見せる
  var C = {
    deep: '#0a0620', floor: '#241a52', line: '#4a37a8', edge: '#7a5cff',
    cyan: '#31f5ff', lime: '#9dff3d', amber: '#ffb129', white: '#ffffff', bad: '#ff3d6e',
  };

  var GAME_TITLE = 'NEON RAIL';
  var MAX_TIME = 22;
  var NEEDED = 8;
  var MISS_LIMIT = 3;
  var HEAD_Y = H * 0.70;        // 蛇の頭は固定。分岐が下りてくる
  var LANE = W * 0.20;          // 左右レーンの振り幅

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var forks, body, laneX, choice, orbs, misses, score, combo, totalTime, done, spawnTimer, scroll;
  var ready, hitStop, feedback, feedbackOk, shake;

  // 蛇の頭(2フレーム)
  var HEAD_A = [
    '.CCCC.',
    'CCCCCC',
    'CWCCWC',
    'CCCCCC',
    'CCCCCC',
    '.CCCC.',
  ];
  var HEAD_B = [
    '.CCCC.',
    'CCCCCC',
    'CCCCCC',
    'CWCCWC',
    'CCCCCC',
    '.CCCC.',
  ];
  var HEAD_COL = { C: C.cyan, W: C.deep };

  // オーブ
  var ORB = [
    '.LL.',
    'LWWL',
    'LWWL',
    '.LL.',
  ];
  var ORB_COL = { L: C.lime, W: C.white };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#05030f', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.16); }

  // 等角の床(菱形グリッド)。高さは影の距離で示す
  function isoBg() {
    game.draw.gradient(0, H, [[0, '#140a3a'], [0.5, C.deep], [1, '#05030f']]);
    var off = scroll % 120;
    for (var i = -2; i < 20; i++) {
      var y = i * 120 + off;
      game.draw.line(0, y, W / 2, y - 190, C.line, 3);
      game.draw.line(W, y, W / 2, y - 190, C.line, 3);
    }
    for (var k = -6; k <= 6; k++) {
      game.draw.line(W / 2 + k * 180, -100, W / 2 + k * 60, H, C.line, 2);
    }
    game.draw.rect(0, 0, W, 190, C.deep, 0.75);
  }

  function initGame() {
    forks = []; orbs = []; body = [];
    laneX = 0; choice = -1; misses = 0; score = 0; combo = 0;
    totalTime = 0; done = false; spawnTimer = 0.15; scroll = 0;
    ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false; shake = 0;
    for (var i = 0; i < 9; i++) body.push({ x: W / 2, y: HEAD_Y + 52 + i * 52 });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.bad, 0.28);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function spawnFork() {
    // 物量型: 進むほど分岐が詰まり、先を読む数が増える
    var good = Math.random() < 0.5 ? -1 : 1;
    forks.push({ y: 210, good: good, done: false });
    orbs.push({ y: 210, side: good, taken: false });
  }

  function pass(f) {
    if (choice === f.good) {
      var mult = combo >= 8 ? 8 : combo >= 5 ? 4 : combo >= 3 ? 2 : 1;
      combo++;
      var gain = 100 * mult;
      score += gain;
      feedback = 0.3; feedbackOk = true;
      game.feedback.good(W / 2 + choice * LANE, HEAD_Y, { text: '+' + gain, color: C.lime });
      game.audio.play('se_success', 0.45);
      game.fx.burst(W / 2 + choice * LANE, HEAD_Y, { color: C.lime, count: 10, speed: 320 });
      var got = 0;
      for (var i = 0; i < orbs.length; i++) if (!orbs[i].taken && Math.abs(orbs[i].y - f.y) < 8) { orbs[i].taken = true; got++; }
      if (combo === 3 || combo === 5 || combo === 8) game.audio.play('se_milestone', 0.5);
      var taken = 0;
      for (var j = 0; j < orbs.length; j++) if (orbs[j].taken) taken++;
      if (taken >= NEEDED) finish(true);
    } else {
      misses++;
      combo = 0;
      feedback = 0.4; feedbackOk = false;
      hitStop = 0.32; shake = 0.35;
      game.audio.play('se_failure', 0.6);
      game.feedback.bad(W / 2 + choice * LANE, HEAD_Y, { text: 'MISS' });
      if (misses >= MISS_LIMIT) finish(false);
    }
  }

  function takenCount() {
    var n = 0;
    for (var i = 0; i < orbs.length; i++) if (orbs[i].taken) n++;
    return n;
  }

  function drawFork(f) {
    // Y字の分岐。選ばれている側が光る(telegraph)
    var near = f.y > HEAD_Y - 420;
    var w = 26;
    game.draw.line(W / 2, f.y - 130, W / 2, f.y, C.edge, w);
    game.draw.line(W / 2, f.y, W / 2 - LANE, f.y + 150, choice === -1 ? C.cyan : C.line, w);
    game.draw.line(W / 2, f.y, W / 2 + LANE, f.y + 150, choice === 1 ? C.cyan : C.line, w);
    if (near) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.circle(W / 2 + choice * LANE, f.y + 150, blink ? 34 : 26, C.cyan, 0.5);
    }
    // 行き止まり側は塞がれていることを示す
    game.draw.rect(W / 2 - f.good * LANE - 40, f.y + 130, 80, 22, C.bad, 0.8);
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    choice = -choice;
    game.audio.play('se_tap', 0.35);
  });

  // ── ATTRACT ゴースト実演: 分岐が迫る前に手が切り替える ──
  var demo = { t: 0, y: -140, good: 1, choice: -1, gx: W / 2, gy: H * 0.82, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    demo.y += 330 * dt;
    if (demo.y > HEAD_Y + 200) { demo.y = -140; demo.good = Math.random() < 0.5 ? -1 : 1; demo.choice = -demo.good; }
    if (demo.y > HEAD_Y - 420 && demo.choice !== demo.good) {
      demo.press = true;
      demo.choice = demo.good;
      game.feedback.good(W / 2 + demo.good * LANE, HEAD_Y, { text: '+100', color: C.lime });
    } else if (demo.y > HEAD_Y) {
      demo.press = false;
    }
    demo.gx += (W / 2 + demo.choice * 60 - demo.gx) * Math.min(1, dt * 4);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!body) initGame();
      scroll += 180 * dt;
      isoBg();
      stepDemo(dt);
      choice = demo.choice;
      drawFork({ y: demo.y, good: demo.good });
      var wob0 = Math.floor(game.time.elapsed * 10) % 2 === 0;
      for (var b0 = 8; b0 >= 0; b0--) game.draw.circle(W / 2, HEAD_Y + 52 + b0 * 52, 22 - b0, C.cyan, 0.5);
      game.draw.sprite(wob0 ? HEAD_A : HEAD_B, HEAD_COL, W / 2, HEAD_Y, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.09, 74, C.cyan);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.14, 40, C.lime);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.amber);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 38, C.edge);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      isoBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 96, resultSuccess ? C.lime : C.bad);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.52, 58, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.58, 44, C.cyan);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.66, 54, C.amber);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.71, 46, C.cyan);
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
        scroll += 330 * dt;
        if (totalTime >= MAX_TIME) { finish(takenCount() >= NEEDED); return; }
        spawnTimer -= dt;
        if (spawnTimer <= 0) { spawnFork(); spawnTimer = Math.max(0.85, 1.7 - takenCount() * 0.09); }
        for (var i = forks.length - 1; i >= 0; i--) {
          var f = forks[i];
          f.y += 330 * dt;
          if (!f.done && f.y >= HEAD_Y) { f.done = true; pass(f); if (done) return; }
          if (f.y > H + 200) forks.splice(i, 1);
        }
        for (var o = orbs.length - 1; o >= 0; o--) {
          orbs[o].y += 330 * dt;
          if (orbs[o].y > H + 200) orbs.splice(o, 1);
        }
        // 尾は選んだレーンへ寄っていく
        laneX += (choice * LANE * 0.5 - laneX) * Math.min(1, dt * 6);
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
    }

    // draw
    isoBg();
    for (var k = 0; k < forks.length; k++) drawFork(forks[k]);
    for (var m = 0; m < orbs.length; m++) {
      if (orbs[m].taken) continue;
      game.draw.circle(W / 2 + orbs[m].side * LANE, orbs[m].y + 150, 40, C.lime, 0.22);
      game.draw.sprite(ORB, ORB_COL, W / 2 + orbs[m].side * LANE, orbs[m].y + 150, 12, { anchor: 'center' });
    }
    // 蛇: 頭は固定、胴は選択レーンへ遅れて追従(影で高さを示す)
    var wob = Math.floor(game.time.elapsed * 10) % 2 === 0;
    for (var b = 8; b >= 0; b--) {
      var bx = W / 2 + laneX * (1 - b / 9);
      game.draw.circle(bx + 14, HEAD_Y + 62 + b * 52, 18 - b, '#000000', 0.35);
      game.draw.circle(bx, HEAD_Y + 52 + b * 52, 22 - b, C.cyan, 0.85);
    }
    game.draw.circle(W / 2 + choice * 8 + 16, HEAD_Y + 14, 30, '#000000', 0.35);
    game.draw.sprite(wob ? HEAD_A : HEAD_B, HEAD_COL, W / 2 + choice * 8, HEAD_Y, 16, { anchor: 'center' });

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.floor);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.bad : C.cyan);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 100, 46, C.white);
    txt(takenCount() + ' / ' + NEEDED, W * 0.16, 158, 44, C.lime);
    for (var ms = 0; ms < MISS_LIMIT; ms++) {
      game.draw.circle(W * 0.84 + ms * 52, 152, 18, ms < (MISS_LIMIT - misses) ? C.cyan : C.floor);
    }
    if (combo >= 3) txt('x' + (combo >= 8 ? 8 : combo >= 5 ? 4 : 2), W / 2, 162, 46, C.amber);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 96, C.amber);
    if (feedback > 0 && !feedbackOk && NEEDED - takenCount() <= 3) txt('あと' + (NEEDED - takenCount()) + '個', W / 2, H * 0.26, 50, C.amber);

    scanlines();
  });

  game.onStart(function() {
    // 80s ISO: 等間隔で刻む回廊のループ
    game.audio.melody(
      [['E4', 0.25], ['B4', 0.25], ['E5', 0.25], ['B4', 0.25], ['G4', 0.5], ['A4', 0.5],
       ['D4', 0.25], ['A4', 0.25], ['D5', 0.25], ['A4', 0.25], ['F4', 0.5], ['G4', 0.5]],
      { tempo: 152, wave: 'square', volume: 0.09, loop: true,
        bass: [['E2', 0.5], ['E2', 0.5], ['D2', 0.5], ['D2', 0.5]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
