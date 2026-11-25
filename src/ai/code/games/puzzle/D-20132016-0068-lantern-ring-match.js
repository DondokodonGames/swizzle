// D-20132016-0068-lantern-ring-match.js
// ランタンリングマッチ — 回転する提灯の輪から同じ柄どうしを指でなぞってつなぐ
// 操作: 未点灯の提灯を押さえて、同じ柄のもう一方までドラッグして離すとつながる
// 終わり: 制限時間内に全ペアをつなげば成功。時間切れなら失敗
// @mechanic: connect
// @theme: night_lantern_ring
// 世界観: 夜市の広場中央でゆっくり回り続ける提灯の輪。灯守りの子が、同じ柄の提灯どうしを結び付けて輪全体を灯す
// 残るもの: 正誤(CLEAR/GAME OVER) + つないだ組数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル基調、白縁の丸い形、上下に情報を分ける
  var C = {
    bg: '#fff2f6', bg2: '#ffe3ee', ring: '#ffffff', ringEdge: '#ffc9de',
    p1: '#ff8fb3', p2: '#7fc9ff', p3: '#ffd27a', p4: '#8fe6a8',
    ink: '#5a3350', gold: '#ffb400', good: '#33c98a', bad: '#ff5577', white: '#ffffff',
  };
  var PATTERN_COLOR = { star: C.p1, moon: C.p2, drop: C.p3, flame: C.p4 };
  var PATTERN_SPRITE = {
    star: ['..#..', '.###.', '#####', '.###.', '..#..'],
    moon: ['..##.', '.###.', '.###.', '.###.', '..##.'],
    drop: ['..#..', '.###.', '#####', '#####', '.###.'],
    flame: ['..#..', '.###.', '##.##', '#####', '.#.#.'],
  };
  var LANTERN_BODY = ['.###.', '#####', '#####', '#####', '.#.#.'];

  var GAME_TITLE = 'LANTERN RING';
  var CX = W * 0.5, CY = H * 0.42;
  var RING_RX = W * 0.33, RING_RY = W * 0.30;
  var SLOTS = 8, TOTAL = 4;
  var ROT_SPEED = 0.22;
  var MAX_TIME = 18;
  var HIT_R = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var lanterns, baseAngle, connected, timeLeft, selectedIdx, dragX, dragY;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function buildLanterns() {
    var pats = ['star', 'star', 'moon', 'moon', 'drop', 'drop', 'flame', 'flame'];
    for (var i = pats.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pats[i]; pats[i] = pats[j]; pats[j] = tmp;
    }
    var arr = [];
    for (var k = 0; k < SLOTS; k++) arr.push({ pattern: pats[k], slot: k, fixedAngle: null });
    return arr;
  }

  function initGame() {
    lanterns = buildLanterns();
    baseAngle = 0; connected = 0; timeLeft = MAX_TIME;
    selectedIdx = -1; dragX = CX; dragY = CY;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function lanternAngle(l) {
    return l.fixedAngle !== null ? l.fixedAngle : baseAngle + l.slot * (Math.PI * 2 / SLOTS);
  }
  function lanternPos(l) {
    var a = lanternAngle(l);
    return { x: CX + Math.cos(a) * RING_RX, y: CY + Math.sin(a) * RING_RY };
  }

  function findLanternAt(x, y, excludeIdx) {
    var best = -1, bestD = HIT_R;
    for (var i = 0; i < lanterns.length; i++) {
      if (i === excludeIdx || lanterns[i].fixedAngle !== null) continue;
      var p = lanternPos(lanterns[i]);
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, H * (0.55 + i * 0.02), W, H * (0.55 + i * 0.02) - 20, C.ringEdge, 2);
    }
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function drawLanterns(activeSel, dx, dy) {
    // 完成した組の結線を先に描く
    for (var i = 0; i < lanterns.length; i++) {
      if (lanterns[i].fixedAngle === null) continue;
      for (var j = i + 1; j < lanterns.length; j++) {
        if (lanterns[j].fixedAngle === null) continue;
        if (lanterns[j].pattern !== lanterns[i].pattern) continue;
        var pa = lanternPos(lanterns[i]), pb = lanternPos(lanterns[j]);
        game.draw.line(pa.x, pa.y, pb.x, pb.y, PATTERN_COLOR[lanterns[i].pattern], 8);
      }
    }
    if (activeSel >= 0) {
      var ps = lanternPos(lanterns[activeSel]);
      game.draw.line(ps.x, ps.y, dx, dy, C.gold, 6);
    }
    for (var k = 0; k < lanterns.length; k++) {
      var l = lanterns[k];
      var p = lanternPos(l);
      var bob = Math.sin(game.time.elapsed * 1.6 + k) * 4;
      var scale = k === activeSel ? 30 : 26;
      if (l.fixedAngle !== null) {
        game.draw.circle(p.x, p.y, 58, PATTERN_COLOR[l.pattern], 0.22);
      } else if (k === activeSel) {
        game.draw.circle(p.x, p.y, 56, C.gold, 0.28);
      }
      game.draw.sprite(LANTERN_BODY, { '#': l.fixedAngle !== null ? C.white : '#ffffffcc' }, p.x, p.y + bob, scale, { anchor: 'center' });
      game.draw.sprite(PATTERN_SPRITE[l.pattern], { '#': PATTERN_COLOR[l.pattern] }, p.x, p.y + bob, scale * 0.8, { anchor: 'center' });
    }
  }

  function tryConnect(x, y) {
    if (selectedIdx < 0) return;
    var target = findLanternAt(x, y, selectedIdx);
    if (target >= 0 && lanterns[target].pattern === lanterns[selectedIdx].pattern) {
      var a = lanternAngle(lanterns[selectedIdx]), b = lanternAngle(lanterns[target]);
      lanterns[selectedIdx].fixedAngle = a; lanterns[target].fixedAngle = b;
      connected++;
      var mid = lanternPos(lanterns[selectedIdx]);
      var mid2 = lanternPos(lanterns[target]);
      game.feedback.good((mid.x + mid2.x) / 2, (mid.y + mid2.y) / 2, { text: 'GOOD', color: C.good });
      game.fx.burst((mid.x + mid2.x) / 2, (mid.y + mid2.y) / 2, { color: PATTERN_COLOR[lanterns[target].pattern], count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      hitStop = 0.08;
      if (!halfCalled && connected >= Math.ceil(TOTAL / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', CX, CY - 260, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
      }
      if (connected >= TOTAL) {
        ok = true; finished = true; finish();
      }
    } else if (target >= 0) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      shake = 0.2; hitStop = 0.08;
      timeLeft = Math.max(0, timeLeft - 1.5);
    }
    selectedIdx = -1;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var idx = findLanternAt(x, y, -1);
    if (idx >= 0) { selectedIdx = idx; dragX = x; dragY = y; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || selectedIdx < 0) return;
    dragX = x; dragY = y;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.03);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || selectedIdx < 0) return;
    tryConnect(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, aIdx: 0, bIdx: 1, phase: 0 };
  function resetDemo() {
    for (var i = 0; i < lanterns.length; i++) lanterns[i].fixedAngle = null;
    connected = 0;
    demo.aIdx = 0;
    demo.bIdx = 1;
    for (var j = 0; j < lanterns.length; j++) {
      if (j !== 0 && lanterns[j].pattern === lanterns[0].pattern) { demo.bIdx = j; break; }
    }
  }
  function stepDemo(dt) {
    demo.t += dt;
    baseAngle += ROT_SPEED * dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var a = lanterns[demo.aIdx], b = lanterns[demo.bIdx];
    var pa = lanternPos(a), pb = lanternPos(b);
    if (cyc < 0.5) {
      demo.gx = pa.x; demo.gy = pa.y; demo.press = false;
    } else if (cyc < 1.15) {
      var t2 = (cyc - 0.5) / 0.65;
      demo.gx = pa.x + (pb.x - pa.x) * t2; demo.gy = pa.y + (pb.y - pa.y) * t2;
      demo.press = true;
      dragX = demo.gx; dragY = demo.gy;
    } else if (cyc < 1.2) {
      if (a.fixedAngle === null) {
        var aa = lanternAngle(a), ba = lanternAngle(b);
        a.fixedAngle = aa; b.fixedAngle = ba; connected = 1;
        game.feedback.good((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
      demo.gx = pb.x; demo.gy = pb.y; demo.press = true;
    } else {
      demo.press = false;
      demo.gx = pb.x; demo.gy = pb.y + 30 * Math.sin(demo.t * 2);
      selectedIdx = -1;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!lanterns) initGame();
      bg();
      stepDemo(dt);
      drawLanterns(demo.press ? demo.aIdx : -1, demo.gx, demo.gy);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLanterns(-1, 0, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(connected + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - connected) + '個!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(connected, { connected: connected, total: TOTAL });
        else game.end.failure({ connected: connected, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      baseAngle += ROT_SPEED * dt;
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; shake = 0.3; hitStop = 0.3;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLanterns(selectedIdx, dragX, dragY);

    txt(connected + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    var barCol = timeLeft < 4 ? C.bad : C.gold;
    var barPulse = timeLeft < 4 ? (0.6 + 0.4 * Math.sin(game.time.elapsed * 10)) : 1;
    game.draw.rect(60, 150, (W - 120) * (timeLeft / MAX_TIME), 16, barCol, barPulse);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
