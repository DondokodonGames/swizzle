// D-20132016-0014-lantern-wire-connect.js
// ランタンワイヤー — 夜空に浮かぶ同色のランタンを指でドラッグした線で結び、灯りをつなげて消す
// 操作: 同じ色のランタン2つを指でドラッグして線を引き、つなげて消す
// 終わり: 規定数のペアを全て結べば成功。時間切れなら失敗
// @mechanic: connect
// @theme: floating_lantern_festival
// 世界観: 夜空に浮かぶ提灯祭り。散らばった同色の提灯を線でつなぎ、灯りを空へ送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + つないだペア数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで階調、線の太さで語る
  var C = {
    bg: '#0c0c10', ink: '#000000', white: '#f2f2f2', dim: '#77777a',
    good: '#f2f2f2', bad: '#3a3a3e', gold: '#ffffff',
    p1: '#ffffff', p2: '#aaaaaa', p3: '#777777', p4: '#444444',
  };
  var PALS = [C.p1, C.p2, C.p3, C.p4];

  var GAME_TITLE = 'LANTERN WIRE';
  var PAIR_COUNT = 4;
  var MAX_TIME = 15;
  var NEEDED = 4;
  var R = 58;

  var LANT = ['.###.', '#####', '#####', '#####', '..#..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var nodes, connected, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;
  var dragging, dragFrom, dragX, dragY;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, '#050508'], [1, C.bg]]);
    for (var i = 0; i < 30; i++) {
      var sx = (i * 137) % W, sy = (i * 251) % (H * 0.6);
      game.draw.rect(sx, sy, 3, 3, '#ffffff', 0.25);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function makeNodes() {
    var arr = [];
    var used = [];
    var cols = 3, rows = 4;
    var xs = [W * 0.22, W * 0.5, W * 0.78];
    var ys = [H * 0.28, H * 0.40, H * 0.52, H * 0.64];
    var slots = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) slots.push({ x: xs[c], y: ys[r] });
    // shuffle slots
    for (var i = slots.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = slots[i]; slots[i] = slots[j]; slots[j] = t; }
    var idx = 0;
    for (var p = 0; p < PAIR_COUNT; p++) {
      var col = p % PALS.length;
      for (var k = 0; k < 2; k++) {
        var s = slots[idx++];
        arr.push({ x: s.x, y: s.y, color: col, done: false, bx: (game.random(0, 1) - 0.5), by: (game.random(0, 1) - 0.5) });
      }
    }
    return arr;
  }

  function initGame() {
    nodes = makeNodes(); connected = 0; timeLeft = MAX_TIME; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    dragging = false; dragFrom = -1; dragX = 0; dragY = 0;
  }

  function drawNode(n, i) {
    if (n.done) return;
    var bob = Math.sin(game.time.elapsed * 2 + n.bx * 6) * 5;
    var sway = Math.cos(game.time.elapsed * 1.6 + n.by * 6) * 4;
    game.draw.line(n.x + sway, n.y - 40 + bob, n.x + sway, n.y - 60 + bob, C.dim, 3);
    game.draw.sprite(LANT, { '#': PALS[n.color] }, n.x + sway, n.y + bob, 12, { anchor: 'center' });
  }

  function nodeAt(x, y) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].done) continue;
      if (game.hit.circle(x, y, 1, nodes[i].x, nodes[i].y, R)) return i;
    }
    return -1;
  }

  function tryConnect(a, b, px, py) {
    if (a === b) return;
    if (nodes[a].color !== nodes[b].color) {
      game.feedback.bad(px, py, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      shake = 0.12;
      return;
    }
    nodes[a].done = true; nodes[b].done = true;
    connected++;
    hitStop = 0.12;
    game.feedback.good(px, py, { text: 'GOOD', color: C.good });
    game.fx.burst((nodes[a].x + nodes[b].x) / 2, (nodes[a].y + nodes[b].y) / 2, { color: PALS[nodes[a].color], count: 18, speed: 340 });
    game.audio.play('se_good', 0.4);
    if (connected === Math.ceil(PAIR_COUNT / 2)) { game.fx.popup(connected + ' / ' + PAIR_COUNT, W * 0.5, H * 0.45, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
    if (connected >= PAIR_COUNT) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    var n = nodeAt(x, y);
    if (n >= 0) { dragging = true; dragFrom = n; dragX = x; dragY = y; game.audio.play('se_tap', 0.08); }
  });
  game.onMove(function(x, y) {
    if (!dragging) return;
    dragX = x; dragY = y;
  });
  game.onRelease(function(x, y) {
    if (!dragging) return;
    dragging = false;
    var n = nodeAt(x, y);
    if (n >= 0) tryConnect(dragFrom, n, x, y);
    else { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_bad', 0.25); }
    dragFrom = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.4, press: false, a: -1, b: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) {
      initGame();
      // find a matching pair to demo
      outer:
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          if (nodes[i].color === nodes[j].color) { demo.a = i; demo.b = j; break outer; }
        }
      }
    }
    var a = nodes[demo.a], b = nodes[demo.b];
    var phase = cyc % 3.8;
    if (phase < 0.6) { demo.gx = a.x; demo.gy = a.y; demo.press = false; }
    else if (phase < 1.6) { var t = (phase - 0.6) / 1.0; demo.gx = a.x + (b.x - a.x) * t; demo.gy = a.y + (b.y - a.y) * t; demo.press = true; }
    else if (phase < 1.7 && !nodes[demo.a].done) { tryConnect(demo.a, demo.b, b.x, b.y); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (nodes === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i0 = 0; i0 < nodes.length; i0++) drawNode(nodes[i0], i0);
      if (demo.press) game.draw.line(nodes[demo.a].x, nodes[demo.a].y, demo.gx, demo.gy, C.white, 5);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 24, C.dim);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.white);
      else txt('INSERT COIN', W / 2, H * 0.92, 26, C.dim);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var i1 = 0; i1 < nodes.length; i1++) drawNode(nodes[i1], i1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, C.white);
      txt(connected + ' / ' + PAIR_COUNT, W / 2, H * 0.13, 30, C.dim);
      if (!ok) txt('あと' + (PAIR_COUNT - connected) + '組!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(connected, { connected: connected, pairs: PAIR_COUNT });
        else game.end.failure({ connected: connected, pairs: PAIR_COUNT });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; ok = false; finished = true; hitStop = 0.3; game.feedback.bad(W * 0.5, H * 0.4, { text: 'MISS' }); finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var i2 = 0; i2 < nodes.length; i2++) drawNode(nodes[i2], i2);
    if (dragging) game.draw.line(nodes[dragFrom].x, nodes[dragFrom].y, dragX, dragY, C.white, 5);

    txt(connected + ' / ' + PAIR_COUNT, W / 2, H * 0.08, 32, C.white);
    game.draw.rect(60, 190, W - 120, 16, C.ink, 0.6);
    game.draw.rect(60, 190, (W - 120) * (timeLeft / MAX_TIME), 16, timeLeft < 3 ? C.bad : C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.white);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.6], ['C4', 0.6], ['E4', 0.6], ['A4', 1.2]], { tempo: 90, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
