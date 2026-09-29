// J-3DSDSDSTOP10-0009-pneumatic-valve-twist.js
// 気送管の分岐ひねり — 分岐弁をダイヤルでひねって行き先を選び、郵便筒を迷路の先の局へ送り届ける
// 操作: 下のダイヤルを指で円を描くように回すと、筒が止まっている分岐弁の矢印が回る。指を離すとその向きへ筒が飛ぶ
// 終わり: 15秒以内に最後の弁を抜けて局の受け箱に届けばCLEAR。行き止まりへ送ると跳ね返って-1秒、時間切れでGAME OVER
// @mechanic: rotate_gesture
// @theme: pneumatic_mail_valves
// 世界観: 古い中央郵便局の地下で、気送管係が迷路のように枝分かれした配管の弁を一つずつひねり、速達の筒を締め切り前に正しい窓口へ送り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた弁の数・跳ね返り数・残り時間
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数(8色ベタ)、細線とテキスト枠のUI
  var STYLE = { bg: ['#000033', '#000055', '#0000aa'], main: ['#55ffff', '#ffffff', '#aaaaaa'], accent: ['#ffff55', '#ff5555'] };
  var C = { bg: '#000033', grid: '#0000aa', pipe: '#55ffff', pipeD: '#00aaaa', white: '#ffffff', gray: '#aaaaaa', yel: '#ffff55', red: '#ff5555', green: '#55ff55', mag: '#ff55ff' };

  var GAME_TITLE = 'VALVE MAZE';
  var TIME_LIMIT = 15;
  var COLS = 3, ROWS = 4;
  var GX = [W * 0.2, W * 0.5, W * 0.8];
  var GY = [H * 0.25, H * 0.365, H * 0.48, H * 0.595];
  var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];   // 0右 1下 2左 3上
  var DIAL_X = W / 2, DIAL_Y = H * 0.835, DIAL_R = 200;
  var COMMIT_TIMEOUT = 3.0;
  var STUB = 90;

  var CAPSULE = ['.####.', '#oooo#', '######', '#oooo#', '.####.'];
  var CLERK = ['..####..', '.#o##o#.', '.######.', '..#..#..', '.######.', '#.####.#', '..#..#..'];
  var BOX = ['########', '#......#', '#.####.#', '#......#', '########'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var path, cur, rotA, capsule, passed, bounces, timeLeft, ready, ended, ok, hitStop, endWait, score, milestone, wait, dial, NEEDED;

  function buildPath() {
    for (var tries = 0; tries < 200; tries++) {
      var c = Math.floor(game.random(0, COLS)), r = 0;
      var nodes = [{ c: c, r: r }];
      var lastSide = 0, visited = {};
      visited[c + ',' + r] = true;
      while (r < ROWS - 1 && nodes.length < 8) {
        var opts = [];
        if (c > 0 && !visited[(c - 1) + ',' + r] && lastSide !== 1) opts.push(-1);
        if (c < COLS - 1 && !visited[(c + 1) + ',' + r] && lastSide !== -1) opts.push(1);
        if (opts.length && Math.random() < 0.6) { var s = opts[Math.floor(game.random(0, opts.length))]; c += s; lastSide = s; }
        else { r++; lastSide = 0; }
        visited[c + ',' + r] = true;
        nodes.push({ c: c, r: r });
      }
      if (r === ROWS - 1 && nodes.length >= 6 && nodes.length <= 8) {
        for (var i = 0; i < nodes.length; i++) {
          var n = nodes[i], nx = nodes[i + 1];
          n.inDir = i === 0 ? 3 : nodes[i - 1].outDirRev;
          if (nx) { n.out = nx.c > n.c ? 0 : (nx.c < n.c ? 2 : 1); }
          else n.out = 1;
          n.outDirRev = (n.out + 2) % 4;
          n.rev = i >= 2 && Math.random() < 0.3;
        }
        return nodes;
      }
    }
    return [{ c: 1, r: 0, inDir: 3, out: 1, rev: false }, { c: 1, r: 1, inDir: 3, out: 1, rev: false }, { c: 1, r: 2, inDir: 3, out: 1, rev: false }, { c: 1, r: 3, inDir: 3, out: 1, rev: false }];
  }

  function nodeXY(n) { return { x: GX[n.c], y: GY[n.r] }; }
  function rotDir() { return ((Math.round(rotA / (Math.PI / 2)) % 4) + 4) % 4; }
  function setRotorAway() {
    var n = path[cur];
    var d = (n.out + 1 + Math.floor(game.random(0, 3))) % 4;
    if (d === n.out) d = (d + 1) % 4;
    rotA = d * Math.PI / 2;
  }

  function initGame() {
    path = buildPath(); NEEDED = path.length; cur = 0; setRotorAway();
    var p0 = nodeXY(path[0]);
    capsule = { x: p0.x, y: p0.y - 160, tx: p0.x, ty: p0.y, mode: 'travel', t: 0, bx: 0, by: 0 };
    passed = 0; bounces = 0; timeLeft = TIME_LIMIT; ready = 0.8; ended = false; ok = false;
    hitStop = 0; endWait = 0; score = 0; milestone = false; wait = 0;
    dial = { active: false, last: 0, turned: 0 };
    setRotorAwaySoon = false;
  }

  // 実ロジック: ダイヤルのひねり量を弁へ伝える(逆ギアの弁は逆回り)
  function twist(dA) {
    var n = path[cur];
    var before = rotDir();
    rotA += n && n.rev ? -dA : dA;
    if (rotDir() !== before) game.audio.tone(rotDir() === (n ? n.out : -1) ? 'E6' : 'C5', 0.04, { wave: 'square', volume: 0.04 });
  }

  // 実ロジック: 今の向きへ筒を送る(デモも同じ関数)
  function commit(demoMode) {
    if (capsule.mode !== 'wait') return;
    var n = path[cur], p = nodeXY(n), d = rotDir();
    if (d === n.out) {
      var quick = wait < 1.2;
      passed++;
      if (!demoMode) {
        score += quick ? 150 : 100;
        game.feedback.good(p.x, p.y - 70, { text: quick ? 'NICE' : 'GOOD', color: C.green, size: 44 });
        if (!milestone && passed >= Math.ceil(NEEDED / 2)) {
          milestone = true; game.audio.play('se_milestone', 0.6);
          game.fx.popup(passed + ' / ' + NEEDED, W / 2, H * 0.19, { color: C.yel, size: 64 });
        }
      } else {
        game.fx.burst(p.x, p.y, { color: C.green, count: 8 });
      }
      if (cur === path.length - 1) { capsule.mode = 'travel'; capsule.tx = p.x; capsule.ty = H * 0.69; capsule.final = true; }
      else {
        var nx = nodeXY(path[cur + 1]);
        capsule.mode = 'travel'; capsule.tx = nx.x; capsule.ty = nx.y;
        cur++; setRotorAwaySoon = true;
      }
      if (!demoMode) game.audio.play('se_jump', 0.3);
      return;
    }
    // 行き止まり(または来た管)へ送った = 跳ね返り
    bounces++;
    capsule.mode = 'bounce'; capsule.t = 0.35; capsule.bx = DX[d]; capsule.by = DY[d];
    if (!demoMode) { timeLeft = Math.max(0.01, timeLeft - 1); game.feedback.bad(p.x + DX[d] * STUB, p.y + DY[d] * STUB, { text: 'MISS', size: 44 }); }
    else game.fx.burst(p.x + DX[d] * STUB, p.y + DY[d] * STUB, { color: C.red, count: 8 });
  }
  var setRotorAwaySoon = false;

  function stepCapsule(dt, demoMode) {
    if (capsule.mode === 'travel') {
      var dx = capsule.tx - capsule.x, dy = capsule.ty - capsule.y, d = Math.hypot(dx, dy), sp = 1500 * dt;
      if (d <= sp) {
        capsule.x = capsule.tx; capsule.y = capsule.ty;
        if (capsule.final) { capsule.mode = 'done'; return; }
        capsule.mode = 'wait'; wait = 0;
        if (setRotorAwaySoon) { setRotorAway(); setRotorAwaySoon = false; }
      } else { capsule.x += dx / d * sp; capsule.y += dy / d * sp; }
    } else if (capsule.mode === 'bounce') {
      capsule.t -= dt;
      var p = nodeXY(path[cur]);
      var k = Math.sin(Math.max(0, capsule.t) / 0.35 * Math.PI);
      capsule.x = p.x + capsule.bx * STUB * k; capsule.y = p.y + capsule.by * STUB * k;
      if (capsule.t <= 0) { capsule.x = p.x; capsule.y = p.y; capsule.mode = 'wait'; wait = 0; }
    } else if (capsule.mode === 'wait') {
      wait += dt;
      if (!demoMode && wait > COMMIT_TIMEOUT && !dial.active) commit(false);
      else if (!demoMode && wait > COMMIT_TIMEOUT + 1.5) { dial.active = false; commit(false); }
    }
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function drawBoard(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    for (var gx = 0; gx < W; gx += 60) game.draw.rect(gx, 0, 1, H, C.grid, 0.5);
    for (var gy = 0; gy < H; gy += 60) game.draw.rect(0, gy, W, 1, C.grid, 0.5);
    game.draw.rect(0, 0, W, H, C.pipe, 0.02 + 0.02 * Math.sin(t * 1.8));
    // 枠
    game.draw.rect(30, H * 0.18, W - 60, 3, C.white, 1);
    game.draw.rect(30, H * 0.73, W - 60, 3, C.white, 1);
    game.draw.rect(30, H * 0.18, 3, H * 0.55, C.white, 1);
    game.draw.rect(W - 33, H * 0.18, 3, H * 0.55, C.white, 1);
    game.draw.sprite(CLERK, { '#': C.mag, 'o': C.white }, W * 0.1, H * 0.81 + Math.sin(t * 2.4) * 6, 10, { anchor: 'center' });
  }

  function drawPipes(t) {
    if (!path) return;
    var p0 = nodeXY(path[0]);
    game.draw.line(p0.x, H * 0.19, p0.x, p0.y, C.pipeD, 26);
    for (var i = 0; i < path.length; i++) {
      var n = path[i], p = nodeXY(n);
      // 行き止まりの枝(キャップ付き)
      for (var d = 0; d < 4; d++) {
        if (d === n.out || d === n.inDir) continue;
        var ex = p.x + DX[d] * STUB, ey = p.y + DY[d] * STUB;
        game.draw.line(p.x, p.y, ex, ey, C.gray, 18);
        game.draw.rect(ex - 16, ey - 16, 32, 32, C.red, 1);
      }
      var q = i < path.length - 1 ? nodeXY(path[i + 1]) : { x: p.x, y: H * 0.69 };
      game.draw.line(p.x, p.y, q.x, q.y, i < cur ? C.pipe : C.pipeD, 26);
    }
    var last = nodeXY(path[path.length - 1]);
    game.draw.sprite(BOX, { '#': C.yel }, last.x, H * 0.7, 12, { anchor: 'center' });
    // 弁
    for (var j = 0; j < path.length; j++) {
      var nn = path[j], pp = nodeXY(nn);
      var isCur = j === cur && capsule && (capsule.mode === 'wait' || capsule.mode === 'bounce');
      game.draw.circle(pp.x, pp.y, 50, nn.rev ? C.red : C.white, 1);
      game.draw.circle(pp.x, pp.y, 42, C.bg, 1);
      var dd = j === cur ? rotDir() : (j < cur ? nn.out : -1);
      if (dd >= 0) game.draw.line(pp.x, pp.y, pp.x + DX[dd] * 38, pp.y + DY[dd] * 38, j < cur ? C.pipe : C.yel, 12);
      if (nn.rev) for (var g = 0; g < 6; g++) { var a = g * Math.PI / 3 + t; game.draw.rect(pp.x + Math.cos(a) * 56 - 5, pp.y + Math.sin(a) * 56 - 5, 10, 10, C.red, 1); }
      if (isCur && wait > COMMIT_TIMEOUT - 1 && Math.floor(t * 10) % 2 === 0) game.draw.circle(pp.x, pp.y, 64, C.red, 0.3);
    }
  }

  function drawCapsule(t) {
    if (!capsule) return;
    var sc = (ended && hitStop > 0) ? 14 : 10;
    game.draw.sprite(CAPSULE, { '#': C.yel, 'o': C.white }, capsule.x, capsule.y + (capsule.mode === 'wait' ? Math.sin(t * 8) * 3 : 0), sc, { anchor: 'center' });
  }

  function drawDial(t) {
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 10, C.white, 1);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R, C.grid, 1);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R * 0.35, C.bg, 1);
    var n = path ? path[cur] : null;
    var shown = rotA * (n && n.rev ? -1 : 1);
    for (var k = 0; k < 8; k++) {
      var a = shown + k * Math.PI / 4;
      game.draw.circle(DIAL_X + Math.cos(a) * DIAL_R * 0.75, DIAL_Y + Math.sin(a) * DIAL_R * 0.75, k === 0 ? 26 : 14, k === 0 ? C.yel : C.pipe, 1);
    }
    if (dial.active) game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 24, C.yel, 0.25);
  }

  function drawHud(t) {
    txt(passed + ' / ' + NEEDED, W / 2, H * 0.05, 60, C.white);
    txt('SCORE ' + score, W * 0.2, H * 0.05, 30, C.pipe);
    game.draw.rect(60, 150, W - 120, 18, C.grid, 1);
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C.red : C.yel);
  }

  // ── 入力: ダイヤル周りの角度変化をそのまま弁へ ──
  function angleAt(x, y) { return Math.atan2(y - DIAL_Y, x - DIAL_X); }
  function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    if (y > H * 0.66) {
      dial.active = true; dial.last = angleAt(x, y); dial.turned = 0;
      game.audio.play('se_tap', 0.2);
    } else {
      game.audio.tone('A3', 0.05, { wave: 'square', volume: 0.03 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dial.active || ended) return;
    var a = angleAt(x, y), dA = wrap(a - dial.last);
    dial.last = a; dial.turned += Math.abs(dA);
    if (Math.hypot(x - DIAL_X, y - DIAL_Y) > 40) twist(dA);
    if (dial.turned > Math.PI * 2) { dial.turned = 0; game.fx.burst(DIAL_X, DIAL_Y - DIAL_R, { color: C.pipe, count: 5, speed: 120 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !dial.active) return;
    dial.active = false;
    if (ended) { game.audio.play('se_tap', 0.1); return; }
    if (capsule.mode === 'wait') commit(false);
    else game.audio.play('se_tap', 0.1);
  });

  // ── ATTRACT ゴースト実演(ダイヤルを円に回して矢印を合わせ、離して送る。3つ目の弁でわざと行き止まりへ送る) ──
  var demo = { t: 0, gx: DIAL_X, gy: DIAL_Y, press: false, goal: 0, spin: 0, wrongDone: false, hold: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.wrongDone = false; demo.hold = 0; demo.spin = 0; }
    stepCapsule(dt, true);
    if (capsule.mode === 'wait') {
      var n = path[cur];
      var wantDir = (cur === 2 && !demo.wrongDone) ? (n.out + 1) % 4 : n.out;
      if (wantDir === n.inDir) wantDir = (wantDir + 1) % 4;
      if (rotDir() !== wantDir) {
        var step = 3.2 * dt;
        demo.spin += step; twist(n.rev ? -step : step);
        demo.press = true; demo.hold = 0.18;
      } else {
        demo.hold -= dt;
        if (demo.hold <= 0) { if (wantDir !== n.out) demo.wrongDone = true; commit(true); demo.press = false; }
      }
    } else if (capsule.mode === 'done') {
      initGame(); ready = 0; demo.wrongDone = false;
    } else demo.press = false;
    demo.gx = DIAL_X + Math.cos(demo.spin) * DIAL_R * 0.75;
    demo.gy = DIAL_Y + Math.sin(demo.spin) * DIAL_R * 0.75;
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.45; endWait = 1.1; dial.active = false;
    if (success) score += Math.round(timeLeft * 50);
    game.fx.flash('#ffffff', 0.2);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (path === undefined) initGame();
      stepDemo(dt);
      drawBoard(t); drawPipes(t); drawCapsule(t); drawDial(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.075 + Math.sin(t * 2) * 6, 88, C.yel);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.13, 36, C.pipe);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.yel);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawBoard(t); drawPipes(t); drawCapsule(t); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(capsule.x, capsule.y, { color: C.yel, count: 50, speed: 700 }); }
          else { game.feedback.bad(capsule.x, capsule.y, { text: 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { passed: passed, bounces: bounces, valves: NEEDED };
          drawBoard(t); drawPipes(t); drawCapsule(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      stepCapsule(dt, false);
      if (capsule.mode === 'done') finish(true);
      else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawBoard(t); drawPipes(t); drawCapsule(t); drawDial(t); drawHud(t);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 110, C.yel);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.28, W - 120, H * 0.4, C.bg, 0.92);
    game.draw.rect(60, H * 0.28, W - 120, 4, C.white, 1);
    game.draw.rect(60, H * 0.68 - 4, W - 120, 4, C.white, 1);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.35, 130, C.green);
      game.draw.sprite(CAPSULE, { '#': C.yel, 'o': C.white }, W / 2, H * 0.44 + Math.sin(t * 5) * 10, 14, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.35, 104, C.red);
      txt('あと' + Math.max(1, NEEDED - passed) + '弁!', W / 2, H * 0.44, 64, C.yel);
    }
    txt(passed + ' / ' + NEEDED, W / 2, H * 0.51, 58, C.white);
    txt('SCORE ' + score, W / 2, H * 0.57, 46, C.pipe);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.63, 44, isNew ? C.yel : C.white);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.white);
  }

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['E5', 0.5], ['A5', 0.5], ['E5', 0.5], ['G5', 0.5], ['D5', 0.5], ['G4', 1],
      ['F4', 0.5], ['C5', 0.5], ['F5', 0.5], ['C5', 0.5], ['E5', 0.5], ['B4', 0.5], ['E4', 1]
    ], { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: [['A2', 2], ['G2', 2], ['F2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
