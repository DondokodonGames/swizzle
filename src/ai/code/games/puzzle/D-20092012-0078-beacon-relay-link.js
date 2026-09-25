// D-20092012-0078-beacon-relay-link.js
// ビーコン・リレーリンク — 中継塔をタッチした指先の軌跡でつなぎ、番号順に信号網を完成させる
// 操作: 1番の中継塔から指を離さずドラッグし、番号の順に次々と塔へつないでいく
// 終わり: 制限時間内に全塔を順番通りにつなげば成功。順番を外す/時間切れで失敗
// @mechanic: connect
// @theme: signal_relay_operator
// 世界観: 山間の中継基地を管理する信号オペレーター。散らばる中継塔を、決められた順番で光の線につないで信号網を完成させる
// 残るもの: 正誤(CLEAR/GAME OVER) + つないだ塔の数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 濃紺の盤面にネオン等角グリッド、光る接続線
  var STYLE = { bg: ['#0c1230', '#080c20'], main: ['#1c2a5a', '#2c3a7a'], accent: ['#5adfff', '#ffd400'] };
  var C = {
    bg1: '#0c1230', bg2: '#080c20', grid: '#1c2a5a',
    node: '#1c2a5a', nodeEdge: '#5adfff', nodeDone: '#ffd400',
    line: '#5adfff', bad: '#ff4d5e', good: '#3adf7a',
    gold: '#ffd400', white: '#eaf6ff', ink: '#04060f',
  };

  var GAME_TITLE = 'BEACON RELAY';
  var TIME_LIMIT = 17;
  var TOWER = ['.#.', '###', '.#.', '###'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var NODES = [
    { x: W * 0.5, y: H * 0.66 },
    { x: W * 0.22, y: H * 0.58 },
    { x: W * 0.30, y: H * 0.38 },
    { x: W * 0.62, y: H * 0.30 },
    { x: W * 0.82, y: H * 0.46 },
    { x: W * 0.68, y: H * 0.62 },
  ];

  var connected, dragging, curX, curY, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    connected = 1; dragging = false; curX = NODES[0].x; curY = NODES[0].y;
    timeLeft = TIME_LIMIT; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function onDrag(x, y) {
    if (finished || done || ready > 0) return;
    curX = x; curY = y;
    if (connected >= NODES.length) return;
    var target = NODES[connected];
    if (Math.hypot(x - target.x, y - target.y) < 74) {
      connected++;
      curX = target.x; curY = target.y;
      game.feedback.good(target.x, target.y, { text: 'GOOD' });
      game.fx.burst(target.x, target.y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_milestone', 0.4);
      if (!milestoneShown && connected === Math.ceil(NODES.length / 2)) {
        milestoneShown = true;
        game.fx.popup(connected + ' / ' + NODES.length, target.x, target.y - 100, { color: C.gold, size: 36 });
      }
      if (connected >= NODES.length) {
        ok = true; finished = true; hitStop = 0.1;
        game.fx.burst(target.x, target.y, { color: C.white, count: 24, speed: 420 });
        finish();
      }
      return;
    }
    for (var i = connected + 1; i < NODES.length; i++) {
      var n = NODES[i];
      if (Math.hypot(x - n.x, y - n.y) < 74) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.28;
        game.feedback.bad(n.x, n.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
        return;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.06);
    if (Math.hypot(x - NODES[0].x, y - NODES[0].y) < 90 && connected === 1) dragging = true;
    onDrag(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING) { dragging = false; game.audio.play('se_tap', 0.03); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(elapsed * 1.3));
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10), W, i * (H / 10), C.grid, 2);
    for (var j = 0; j < 8; j++) game.draw.line(j * (W / 8), 0, j * (W / 8), H, C.grid, 2);
  }

  function drawNodes(bob) {
    for (var i = 0; i < NODES.length - 1; i++) {
      if (i < connected - 1) game.draw.line(NODES[i].x, NODES[i].y, NODES[i + 1].x, NODES[i + 1].y, C.line, 8);
    }
    if (connected >= 1 && connected < NODES.length && (dragging || state === S.ATTRACT)) {
      game.draw.line(NODES[connected - 1].x, NODES[connected - 1].y, curX, curY, C.line, 5);
    }
    for (var k = 0; k < NODES.length; k++) {
      var n = NODES[k];
      var by = n.y + Math.sin(bob * 2 + k) * 5;
      var isDone = k < connected;
      game.draw.circle(n.x, by, 50, isDone ? C.nodeDone : C.node);
      game.draw.circle(n.x, by, 50, C.nodeEdge, isDone ? 0.2 : 0.7);
      game.draw.sprite(TOWER, { '#': isDone ? C.ink : C.nodeEdge }, n.x, by, 12, { anchor: 'center' });
      txt('' + (k + 1), n.x, by - 66, 24, C.white);
    }
  }

  var demo = { t: 0, gx: NODES[0].x, gy: NODES[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { connected = 1; curX = NODES[0].x; curY = NODES[0].y; }
    var segDur = 5.2 / (NODES.length - 1);
    var segIdx = Math.min(NODES.length - 2, Math.floor(cyc / segDur));
    var segT = (cyc % segDur) / segDur;
    var a = NODES[segIdx], b = NODES[segIdx + 1];
    demo.gx = a.x + (b.x - a.x) * segT;
    demo.gy = a.y + (b.y - a.y) * segT;
    demo.press = true;
    curX = demo.gx; curY = demo.gy;
    if (segT > 0.92 && connected === segIdx + 1) connected = segIdx + 2;
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(elapsed);
      stepDemo(dt);
      drawNodes(elapsed);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      drawNodes(elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt((connected - 1) + ' / ' + (NODES.length - 1), W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + (NODES.length - connected) + '!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var got = connected - 1;
        if (ok) game.end.success(got, { linked: got, total: NODES.length - 1 }); else game.end.failure({ linked: got, total: NODES.length - 1 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(curX, curY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(elapsed);
    drawNodes(elapsed);

    txt((connected - 1) + ' / ' + (NODES.length - 1), W / 2, H * 0.06, 30, C.white);
    var barColor = timeLeft < 2 && Math.floor(elapsed * 8) % 2 === 0 ? C.bad : C.gold;
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, barColor);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 140, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
