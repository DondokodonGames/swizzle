// D-20132016-0034-dispatch-board-order.js
// ディスパッチボード・オーダー — 赤い糸で結ばれた2台を離して発車させ、3台とも無事故で送り出す
// 操作: 盤上の3台の車駒を、発車させたい順にタップして番号を振る。3台目を振ると自動で発車する
// 終わり: 赤い糸の2台が1番目2番目/2番目3番目に連続しなければ成功。連続して衝突すれば失敗
// @mechanic: drag_sort
// @theme: dispatch_board_car_order
// 世界観: 木製の配車盤に置かれたミニカー駒。赤い糸で結ばれた2台は同じ交差点を通るため続けて出せない。3台すべてを順番よく送り出す夜間配車係
// 残るもの: 正誤(CLEAR/GAME OVER) + 発車順の妥当性
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルトの質感、gradientで厚みを作る
  var C = {
    wood: '#6b4a30', wood2: '#4a3320', felt: '#2d5a3a', feltEdge: '#1c3d26',
    car: '#e8dcc8', carEdge: '#a89060', link: '#e04030', good: '#4dffb0', bad: '#ff4d5e',
    gold: '#ffd400', white: '#fff6e6', ink: '#1c1208',
  };

  var GAME_TITLE = 'DISPATCH ORDER';
  var MAX_TIME = 17; // drag_sort = E族 15-25s

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CX = W * 0.5, CY = H * 0.44;
  var POS = [{ x: CX - 200, y: CY - 60 }, { x: CX + 200, y: CY - 60 }, { x: CX, y: CY + 200 }];

  var conflictA, conflictB, safeIdx, rank, assignCount, phase, phaseT, runIdx, crashed, done, endWait, finished, timeLeft;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAR = ['.##.', '####', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.wood], [1, C.wood2]]);
    for (var i = 0; i < 12; i++) game.draw.rect(0, i * (H / 12), W, 2, '#00000015');
    game.draw.rect(CX - 260, CY - 220, 520, 480, C.feltEdge);
    game.draw.rect(CX - 244, CY - 204, 488, 448, C.felt);
  }

  function pickConflict() {
    var a = Math.floor(Math.random() * 3);
    var b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
    var s = 3 - a - b;
    return { a: a, b: b, s: s };
  }

  function initGame() {
    var cc = pickConflict();
    conflictA = cc.a; conflictB = cc.b; safeIdx = cc.s;
    rank = [-1, -1, -1]; assignCount = 0;
    phase = 'assign'; phaseT = 0; runIdx = -1; crashed = -1;
    finished = false; done = false; endWait = 0; timeLeft = MAX_TIME;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function pickCar(px, py) {
    for (var i = 0; i < 3; i++) if (Math.hypot(px - POS[i].x, py - POS[i].y) < 90) return i;
    return -1;
  }

  function assign(i) {
    if (rank[i] >= 0) return;
    rank[i] = assignCount; assignCount++;
    game.feedback.good(POS[i].x, POS[i].y, { text: String(assignCount), color: C.gold });
    game.audio.play('se_tap', 0.2);
    if (assignCount >= 3) {
      phase = 'pause'; phaseT = 0.5;
      game.fx.popup('3 / 3', W / 2, H * 0.16, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.4);
    }
  }

  function tapPlay(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished || phase !== 'assign') return;
    var i = pickCar(x, y);
    if (i < 0) return;
    assign(i);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapPlay(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function orderOf(idx) { for (var i = 0; i < 3; i++) if (rank[i] === idx) return i; return -1; }

  function startRun() {
    var diff = Math.abs(rank[conflictA] - rank[conflictB]);
    var valid = diff !== 1; // 赤い糸の2台が連続していなければ安全
    runIdx = 0; phase = 'run'; phaseT = 0;
    crashed = valid ? -1 : Math.max(rank[conflictA], rank[conflictB]);
  }

  function stepPlay(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0 && phase === 'assign') { ok = false; finished = true; finish(); return; }
    if (phase === 'pause') {
      phaseT -= dt;
      if (phaseT <= 0) startRun();
    } else if (phase === 'run') {
      phaseT += dt;
      var stepDur = 0.62;
      var wantIdx = Math.floor(phaseT / stepDur);
      if (wantIdx > runIdx) {
        runIdx = wantIdx;
        if (runIdx === crashed) {
          hitStop = 0.32;
          var a = orderOf(crashed), b = orderOf(crashed - 1);
          var mx = (POS[a].x + POS[b].x) / 2, my = (POS[a].y + POS[b].y) / 2;
          game.feedback.bad(mx, my, { text: 'MISS' });
          shake = 0.32;
          game.audio.play('se_bad', 0.45);
          ok = false; finished = true; finish();
          return;
        }
        if (runIdx <= 2) { game.audio.play('se_jump', 0.3); }
      }
      if (runIdx >= 3 && crashed < 0) {
        ok = true; finished = true; hitStop = 0.15; finish();
      }
    }
  }

  function drawLink() {
    var blink = Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.line(POS[conflictA].x, POS[conflictA].y, POS[conflictB].x, POS[conflictB].y, C.link, blink ? 6 : 4);
  }

  function carProgress(i) {
    if (phase !== 'run') return 0;
    var myRank = rank[i];
    var elapsedSince = phaseT - myRank * 0.62;
    if (elapsedSince <= 0) return 0;
    return Math.min(1, elapsedSince / 0.5);
  }

  function drawCar(i, bobY) {
    var p = carProgress(i);
    var x = POS[i].x, y = POS[i].y + bobY - p * 260;
    var alpha = 1 - p * 0.7;
    if (phase === 'run' && p >= 1 && i !== crashed) return;
    game.draw.circle(x, y + 34, 44, '#000000', 0.2);
    game.draw.rect(x - 46, y - 34, 92, 68, C.carEdge, alpha);
    game.draw.sprite(CAR, { '#': C.car }, x, y, 15, { anchor: 'center' });
    if (rank[i] >= 0) txt(String(rank[i] + 1), x, y - 60, 34, C.gold);
  }

  var demo = { t: 0, gx: POS[0].x, gy: POS[0].y, press: false, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.step = 0; }
    if (phase === 'assign' && demo.step < 3) {
      var order = [conflictA, safeIdx, conflictB];
      var target = POS[order[demo.step]];
      demo.gx += (target.x - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (target.y - demo.gy) * Math.min(1, dt * 5);
      if (Math.hypot(demo.gx - target.x, demo.gy - target.y) < 8) {
        demo.press = true;
        assign(order[demo.step]);
        demo.step++;
      } else demo.press = false;
    } else {
      stepPlay(dt);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 1.7) * 4;

    if (state === S.ATTRACT) {
      if (rank === undefined) initGame();
      bg();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      drawLink();
      for (var i = 0; i < 3; i++) drawCar(i, bob);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLink();
      for (var j = 0; j < 3; j++) drawCar(j, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(1, { valid: true }); else game.end.failure({ valid: false });
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

    bg();
    drawLink();
    for (var k = 0; k < 3; k++) drawCar(k, bob);

    game.draw.rect(60, H * 0.72, W - 120, 16, C.feltEdge);
    game.draw.rect(60, H * 0.72, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.3], ['A3', 0.3], ['C4', 0.5]], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
