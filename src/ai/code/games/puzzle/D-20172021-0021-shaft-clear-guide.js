// D-20172021-0021-shaft-clear-guide.js
// シャフトクリア・ガイド — 崩落坑道の岩塊を叩き砕いてから、探検者を指でなぞって安全地帯まで導く
// 操作: まず経路上の岩塊2箇所をタップして砕く。その後、始点から指を離さず探検者を経路の幅からはみ出さないよう終点までなぞる
// 終わり: 岩塊を全て砕き、経路を外れずに終点まで導けば成功。経路を外れる/時間切れで失敗
// @mechanic: guide_path
// @theme: mine_shaft_clear_guide
// 世界観: 崩落坑道の案内人が、通路をふさぐ岩塊を叩き砕いて道を作り、囚われた探検者を安全地帯まで一本の経路で導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過した区間数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#1c1430', bg2: '#120c20', wall: '#2e2246', wallLite: '#3c2e5c',
    track: '#463664', trackDone: '#ff5ad1',
    rock: '#6a5a48', rockCrack: '#2a2018',
    explorer: '#ffd24a', explorerDark: '#a87c1e',
    good: '#38f0a0', bad: '#ff4d5e', gold: '#ff5ad1', ink: '#f4eaff',
  };

  var GAME_TITLE = 'SHAFT GUIDE';
  var TIME_LIMIT = 17;
  var HALF = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0c0816', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var EXPLORER_SPRITE = ['.##.', '####', '.##.', '#..#'];

  var PTS = [
    { x: W * 0.24, y: H * 0.24 },
    { x: W * 0.74, y: H * 0.32 },
    { x: W * 0.28, y: H * 0.50 },
    { x: W * 0.72, y: H * 0.66 },
    { x: W * 0.30, y: H * 0.80 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  var ROCK_POS = [mid(PTS[0], PTS[1]), mid(PTS[2], PTS[3])];

  var progress, cursorX, cursorY, timeLeft, done, endWait, finished, ready, hitStop, shake;
  var rocksCleared, sections;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff5ad1', pulse * 0.4);
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i2 = 1; i2 < PTS.length; i2++) {
      var ax = PTS[i2 - 1].x, ay = PTS[i2 - 1].y, bx = PTS[i2].x, by = PTS[i2].y;
      var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
      var len2 = vx * vx + vy * vy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
      var cx = ax + vx * t, cy = ay + vy * t;
      var dist = Math.hypot(px - cx, py - cy);
      if (dist < best) { best = dist; bestLen = acc + t * SEG_LEN[i2 - 1]; }
      acc += SEG_LEN[i2 - 1];
    }
    return { dist: best, len: bestLen };
  }

  function drawTrack(prog) {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.track, HALF * 2);
    }
    var acc = 0;
    for (var k = 1; k < PTS.length; k++) {
      var segStart = acc, segEnd = acc + SEG_LEN[k - 1];
      if (prog > segStart) {
        var t = Math.min(1, (prog - segStart) / SEG_LEN[k - 1]);
        var ex = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t;
        var ey = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t;
        game.draw.line(PTS[k - 1].x, PTS[k - 1].y, ex, ey, C.trackDone, 16);
      }
      acc = segEnd;
    }
    for (var r = 0; r < ROCK_POS.length; r++) {
      if (rocksCleared[r]) continue;
      var rp = ROCK_POS[r];
      var wob = Math.sin(game.time.elapsed * 3 + r) * 4;
      game.draw.circle(rp.x, rp.y + wob, 54, C.rock);
      game.draw.line(rp.x - 22, rp.y + wob - 14, rp.x + 10, rp.y + wob + 16, C.rockCrack, 6);
      game.draw.line(rp.x - 10, rp.y + wob + 18, rp.x + 20, rp.y + wob - 10, C.rockCrack, 6);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 34, C.wallLite);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 34, C.gold, 0.5 + 0.3 * Math.sin(game.time.elapsed * 4));
  }

  function allClear() { return rocksCleared[0] && rocksCleared[1]; }

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    rocksCleared = [false, false]; sections = 0;
  }

  function tryClearRock(x, y) {
    for (var r = 0; r < ROCK_POS.length; r++) {
      if (rocksCleared[r]) continue;
      if (Math.hypot(x - ROCK_POS[r].x, y - ROCK_POS[r].y) < 70) {
        rocksCleared[r] = true;
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.fx.burst(x, y, { color: C.rock, count: 14, speed: 300 });
        game.audio.play('se_break', 0.4);
        if (allClear()) {
          game.fx.popup('NICE', W / 2, H * 0.14, { color: C.gold, size: 34 });
          game.audio.play('se_milestone', 0.35);
        }
        return true;
      }
    }
    return false;
  }

  function onDrag(x, y) {
    if (finished || ready > 0 || !allClear()) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var newSections = Math.floor((r.len / TOTAL_LEN) * 4);
      if (newSections > sections) {
        sections = newSections;
        game.feedback.good(x, y, { text: 'GOOD', color: C.good });
        game.audio.play('se_tap', 0.12);
      }
      progress = r.len;
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 14) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tryClearRock(x, y);
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) onDrag(x, y); });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05 && allClear()) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: false, rockDone: [false, false] };
  function resetDemo() { initGame(); demo.rockDone = [false, false]; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < 1.6) {
      var t1 = cyc / 0.8;
      var idx = t1 < 1 ? 0 : 1;
      var localT = idx === 0 ? t1 : (t1 - 1);
      var target = ROCK_POS[idx];
      demo.gx = W * 0.5 + (target.x - W * 0.5) * Math.min(1, localT);
      demo.gy = H * 0.9 + (target.y - H * 0.9) * Math.min(1, localT);
      demo.press = localT > 0.6;
      if (localT > 0.6 && !demo.rockDone[idx]) {
        demo.rockDone[idx] = true;
        rocksCleared[idx] = true;
        game.feedback.good(target.x, target.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_break', 0.25);
      }
    } else {
      var cyc2 = cyc - 1.6;
      var target2 = Math.min(TOTAL_LEN, (cyc2 / 3.4) * TOTAL_LEN);
      var acc = 0, px = PTS[0].x, py = PTS[0].y;
      for (var k = 1; k < PTS.length; k++) {
        if (target2 <= acc + SEG_LEN[k - 1]) {
          var t = SEG_LEN[k - 1] > 0 ? (target2 - acc) / SEG_LEN[k - 1] : 0;
          px = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t;
          py = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t;
          break;
        }
        acc += SEG_LEN[k - 1];
      }
      demo.gx = px; demo.gy = py; demo.press = cyc2 < 3.2;
      if (target2 > progress) progress = target2;
      cursorX = px; cursorY = py;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTrack(progress);
      game.draw.sprite(EXPLORER_SPRITE, { '#': C.explorer }, cursorX, cursorY, 12, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTrack(progress);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(sections + ' / 4', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + (4 - sections) + '区間!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(sections, { sections: sections, total: 4 });
        else game.end.failure({ sections: sections, total: 4 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(cursorX, cursorY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTrack(progress);
    if (!finished) game.draw.sprite(EXPLORER_SPRITE, { '#': C.explorer }, cursorX, cursorY, 12, { anchor: 'center' });

    txt(sections + ' / 4', W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.wallLite, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.5]], { tempo: 118, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
