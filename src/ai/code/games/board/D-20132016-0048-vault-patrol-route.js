// D-20132016-0048-vault-patrol-route.js
// ヴォルトルート読み — 巡回する警備の動きを先読みし、捕まらない経路を選んで金庫室へ抜ける
// 操作: 警備の巡回を見てから、盤面の分岐点を順にドラッグでなぞり出口までのルートを決める
// 終わり: 決めたルートを実行して警備と鉢合わせせず出口(金庫室)に着けば成功。鉢合わせれば失敗
// @mechanic: connect
// @theme: vault_patrol_planning
// 世界観: 深夜の金庫室ビル。固定巡回ルートで動く警備員の動きを先に見切り、鉢合わせない経路を選んで忍び込む怪盗
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏破したノード数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値+線の太さ。危険のみ最小限の赤アクセント
  var C = {
    bg: '#e9e5da', paper: '#f3f0e8', ink: '#161412', inkSoft: '#161412',
    node: '#161412', nodeOff: '#3a352e', route: '#161412',
    bad: '#c8261c', gold: '#b8860a', good: '#1a1613', white: '#f3f0e8',
  };

  var GAME_TITLE = 'VAULT ROUTE';
  var TICK = 0.55;

  var NODES = [
    { x: W * 0.5, y: H * 0.66 },  // 0 start
    { x: W * 0.30, y: H * 0.555 }, // 1
    { x: W * 0.70, y: H * 0.555 }, // 2
    { x: W * 0.30, y: H * 0.435 }, // 3
    { x: W * 0.70, y: H * 0.435 }, // 4
    { x: W * 0.5, y: H * 0.325 }, // 5 合流
    { x: W * 0.5, y: H * 0.215 }, // 6 goal
  ];
  var EDGES = { 0: [1, 2], 1: [0, 3], 2: [0, 4], 3: [1, 5], 4: [2, 5], 5: [3, 4, 6], 6: [5] };
  var PATROL = [1, 3, 1, 3, 2, 4, 2, 4];
  var GOAL = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var PH = { PREVIEW: 0, DRAW: 1, EXECUTE: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var phase, phaseT, route, dragging, guardPhase, tickAcc, globalTick;
  var execI, execSegT, execWillCollide, playerPos, playerAt;
  var done, endWait, finished, ready, hitStop, shake, drawTimeout;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var THIEF_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var GUARD_SPRITE = ['####', '.##.', '####', '#..#'];

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.paper]]);
    game.draw.rect(0, 0, W, H, '#000000', 0.02 + 0.02 * Math.sin(elapsed * 1.2));
    // ディザ市松(壁の質感)
    for (var i = 0; i < 12; i++) {
      for (var j = 0; j < 4; j++) {
        if ((i + j) % 2 === 0) game.draw.rect(i * (W / 12), H * 0.02 + j * 22, W / 12, 14, C.ink, 0.04);
      }
    }
  }

  function drawBoard(gPos, playerP, blinkNode) {
    for (var eid in EDGES) {
      var a = NODES[eid];
      EDGES[eid].forEach(function(n2) {
        if (Number(n2) > Number(eid)) {
          var b = NODES[n2];
          game.draw.line(a.x, a.y, b.x, b.y, C.ink, 5);
        }
      });
    }
    for (var i = 0; i < NODES.length; i++) {
      var n = NODES[i];
      var visited = route.indexOf(i) >= 0;
      game.draw.circle(n.x, n.y, 30, visited ? C.node : C.nodeOff, visited ? 1 : 0.4);
      if (i === blinkNode) {
        var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
        if (blink) game.draw.circle(n.x, n.y, 44, C.bad, 0.5);
      }
    }
    game.draw.circle(NODES[0].x, NODES[0].y, 36, C.ink, 0.15);
    game.draw.circle(NODES[GOAL].x, NODES[GOAL].y, 36, C.gold, 0.25);
    for (var r = 1; r < route.length; r++) {
      game.draw.line(NODES[route[r - 1]].x, NODES[route[r - 1]].y, NODES[route[r]].x, NODES[route[r]].y, C.gold, 10);
    }
    if (gPos) game.draw.sprite(GUARD_SPRITE, { '#': C.bad, '.': null }, gPos.x, gPos.y, 12, { anchor: 'center' });
    if (playerP) game.draw.sprite(THIEF_SPRITE, { '#': C.ink, '.': null }, playerP.x, playerP.y, 12, { anchor: 'center' });
  }

  function guardNodeAt(g) {
    var idx = ((g + guardPhase) % PATROL.length + PATROL.length) % PATROL.length;
    return PATROL[idx];
  }
  function guardPos(g, frac) {
    var a = NODES[guardNodeAt(g)];
    var b = NODES[guardNodeAt(g + 1)];
    return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
  }

  function initGame() {
    phase = PH.PREVIEW; phaseT = 0;
    route = [0]; dragging = false;
    guardPhase = Math.floor(game.random(0, PATROL.length));
    tickAcc = 0; globalTick = 0;
    execI = 1; execSegT = 0; execWillCollide = false;
    playerAt = 0; playerPos = { x: NODES[0].x, y: NODES[0].y };
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    drawTimeout = 7.5;
  }

  function nearestNode(x, y) {
    var best = -1, bd = 999999;
    for (var i = 0; i < NODES.length; i++) {
      var d = Math.hypot(x - NODES[i].x, y - NODES[i].y);
      if (d < bd) { bd = d; best = i; }
    }
    return bd < 90 ? best : -1;
  }

  function onBoardDrag(x, y) {
    if (phase !== PH.DRAW) return;
    var n = nearestNode(x, y);
    if (n < 0) return;
    var last = route[route.length - 1];
    if (n === last) return;
    if (EDGES[last] && EDGES[last].indexOf(n) >= 0 && route.indexOf(n) < 0) {
      route.push(n);
      game.audio.play('se_tap', 0.15);
      game.fx.popup(route.length + ' / ' + 5, x, y - 60, { color: C.gold, size: 26 });
      if (n === GOAL) {
        phase = PH.EXECUTE;
        execI = 1; execSegT = 0; execStartTick = globalTick;
        game.audio.play('se_milestone', 0.3);
      }
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING && phase === PH.DRAW) { dragging = true; onBoardDrag(x, y); game.audio.play('se_tap', 0.05); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && dragging && phase === PH.DRAW) { onBoardDrag(x, y); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { dragging = false; game.audio.play('se_tap', 0.04); } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    tickAcc += dt;
    while (tickAcc >= TICK) { tickAcc -= TICK; globalTick++; }

    if (phase === PH.PREVIEW) {
      phaseT += dt;
      if (phaseT > 2.6) { phase = PH.DRAW; game.audio.play('se_tap', 0.2); }
      return;
    }
    if (phase === PH.DRAW) {
      drawTimeout -= dt;
      if (drawTimeout <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(NODES[0].x, NODES[0].y, { text: 'MISS' });
        finish();
      }
      return;
    }
    if (phase === PH.EXECUTE) {
      var i = execI;
      if (i >= route.length) return;
      var arriveTick = execStartTickFor(i);
      var collide = guardNodeAt(arriveTick) === route[i];
      execSegT += dt;
      var a = NODES[route[i - 1]], b = NODES[route[i]];
      var p = Math.min(1, execSegT / TICK);
      playerPos = { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
      if (p >= 1) {
        if (collide) {
          ok = false; finished = true; hitStop = 0.4; shake = 0.35;
          game.feedback.bad(b.x, b.y, { text: 'MISS' });
          finish();
          return;
        } else {
          game.feedback.good(b.x, b.y, { text: '', count: 6, sound: 'se_tap', volume: 0.15 });
          playerAt = route[i];
          execI++;
          execSegT = 0;
          if (execI >= route.length) {
            ok = true; finished = true;
            game.feedback.good(b.x, b.y, { text: 'CLEAR' });
            finish();
          } else if (execI === Math.ceil(route.length / 2)) {
            game.fx.popup('あと少し!', b.x, b.y - 70, { color: C.gold, size: 28 });
          }
        }
      }
    }
  }

  function execStartTickFor(i) {
    return (execStartTick || 0) + i;
  }
  var execStartTick;

  function telegraphNode() {
    if (phase !== PH.EXECUTE || execI >= route.length) return -1;
    var arriveTick = execStartTickFor(execI);
    var collide = guardNodeAt(arriveTick) === route[execI];
    if (collide && execSegT / TICK > 0.55) return route[execI];
    return -1;
  }

  var demo = { t: 0, gx: NODES[0].x, gy: NODES[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.0;
    if (cyc < dt || demo.t <= dt) {
      route = [0]; phase = PH.PREVIEW; phaseT = 0; globalTick = 0; tickAcc = 0;
      guardPhase = 0; execI = 1; execSegT = 0; execStartTick = undefined;
      playerAt = 0; playerPos = { x: NODES[0].x, y: NODES[0].y };
    }
    tickAcc += dt; while (tickAcc >= TICK) { tickAcc -= TICK; globalTick++; }
    if (cyc < 2.4) {
      phase = PH.PREVIEW; demo.press = false; demo.gx = NODES[0].x; demo.gy = NODES[0].y;
    } else if (cyc < 4.2) {
      phase = PH.DRAW;
      // 安全な側(guardPhase起点から見て左)を選んでなぞる実演
      var demoRoute = [0, 1, 3, 5, 6];
      var frac = Math.min(1, (cyc - 2.4) / 1.6);
      var idx = Math.min(demoRoute.length - 1, Math.floor(frac * demoRoute.length));
      route = demoRoute.slice(0, idx + 1);
      var cur = NODES[route[route.length - 1]];
      demo.gx = cur.x; demo.gy = cur.y; demo.press = true;
      if (route.length === demoRoute.length) phase = PH.EXECUTE;
    } else {
      phase = PH.EXECUTE;
      var i = Math.min(4, 1 + Math.floor((cyc - 4.2) / 0.6));
      execI = i; execSegT = ((cyc - 4.2) % 0.6);
      var a2 = NODES[route[i - 1] !== undefined ? route[i - 1] : 0], b2 = NODES[route[i] !== undefined ? route[i] : GOAL];
      var p2 = Math.min(1, execSegT / TICK);
      playerPos = { x: a2.x + (b2.x - a2.x) * p2, y: a2.y + (b2.y - a2.y) * p2 };
      demo.press = false; demo.gx = playerPos.x; demo.gy = playerPos.y + 140;
    }
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (route === undefined) initGame();
      stepDemo(dt);
      bg(el);
      var gp = guardPos(globalTick, tickAcc / TICK);
      drawBoard(gp, playerPos, -1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      var gp2 = guardPos(globalTick, 0);
      drawBoard(gp2, playerPos, -1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt((route.length) + ' / ' + 5, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(route.length, { nodes: route.length }); else game.end.failure({ nodes: route.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg(el);
    var gpp = guardPos(globalTick, tickAcc / TICK);
    var warnNode = telegraphNode();
    var flash = hitStop > 0 && Math.floor(hitStop * 30) % 2 === 0;
    drawBoard(gpp, finished && ok ? null : playerPos, warnNode);
    if (flash) game.draw.circle(playerPos.x, playerPos.y, 46, C.white, 0.7);

    txt(route.length + ' / ' + 5, W / 2, H * 0.06, 26, C.ink);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (route.length / 5), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.3], ['G3', 0.3], ['B3', 0.3], ['E4', 0.5]], { tempo: 100, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
