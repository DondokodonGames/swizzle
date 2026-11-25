// J-N641-0009-block-slide-extract.js
// ブロックスライド抜き取り — 積み木の塔から示された細道をなぞって下段の木片を抜き取り、崩さず何本抜けたかを競う
// 操作: 光る木片に表示された細い軌跡を、指を離さずそのままなぞって塔の外まで引き抜く
// 終わり: 規定本数を軌跡からはみ出さずに抜ければ成功。はみ出す/時間切れで失敗
// @mechanic: trace
// @theme: block_tower_extraction
// 世界観: 木工見習いが積み木の塔から下段の木片を一本ずつ、示された細道どおりに引き抜き、上を崩さず何本抜けたかを競う
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜いた本数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドット感、タイル反復
  var C = {
    bg: '#1a2e1a', bg2: '#0e1c0e', wood: '#c88a3a', woodDark: '#8a5a1e',
    track: '#3a5a3a', trackGlow: '#6ad06a', tower: '#e0b060', towerEdge: '#7a4a18',
    good: '#6ad06a', bad: '#ff5050', gold: '#ffd400', ink: '#e8ffe8', white: '#ffffff',
  };

  var GAME_TITLE = 'BLOCK EXTRACT';
  var TOTAL_TARGET = 4;
  var TIME_LIMIT = 13;
  var TRACK_HALF = 46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CARPENTER = ['.##.', '####', '.##.', '##.#'];

  var TOWER_X = W * 0.5, TOWER_TOP = H * 0.30, ROW_H = 60, ROW_W = 300, N_ROWS = 6;

  // extraction path: from block center, out to the right edge of screen
  function pathFor(rowIdx) {
    var y = TOWER_TOP + rowIdx * ROW_H + ROW_H / 2;
    var startX = TOWER_X;
    var endX = W * 0.88;
    return [{ x: startX, y: y }, { x: (startX + endX) / 2, y: y + (rowIdx % 2 === 0 ? -30 : 30) }, { x: endX, y: y }];
  }

  function pathLen(pts) {
    var total = 0;
    for (var i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return total;
  }

  function evalOnPath(pts, px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i - 1].x, ay = pts[i - 1].y, bx = pts[i].x, by = pts[i].y;
      var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
      var len2 = vx * vx + vy * vy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
      var cx = ax + vx * t, cy = ay + vy * t;
      var dist = Math.hypot(px - cx, py - cy);
      var segLen = Math.hypot(bx - ax, by - ay);
      if (dist < best) { best = dist; bestLen = acc + t * segLen; }
      acc += segLen;
    }
    return { dist: best, len: bestLen };
  }

  var extracted, curRow, dragging, dragProgress, extractCount, wobble, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    game.draw.sprite(CARPENTER, { '#': C.gold }, W * 0.13, H * 0.86, 10, { anchor: 'center' });
  }

  function pickNextRow() {
    var candidates = [];
    for (var i = 0; i < N_ROWS; i++) if (!extracted[i]) candidates.push(i);
    if (candidates.length === 0) return -1;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function drawTower() {
    for (var i = 0; i < N_ROWS; i++) {
      if (extracted[i]) continue;
      var y = TOWER_TOP + i * ROW_H;
      var wobbleOff = i === curRow ? wobble : 0;
      game.draw.rect(TOWER_X - ROW_W / 2 + wobbleOff, y + 4, ROW_W, ROW_H - 8, i % 2 === 0 ? C.tower : C.woodDark);
      game.draw.rect(TOWER_X - ROW_W / 2 + wobbleOff, y + 4, ROW_W, 6, '#ffffff', 0.15);
    }
    if (curRow >= 0 && !extracted[curRow]) {
      var pts = pathFor(curRow);
      for (var k = 1; k < pts.length; k++) {
        game.draw.line(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, C.track, TRACK_HALF * 2);
      }
      var len = pathLen(pts);
      var acc2 = 0;
      for (var k2 = 1; k2 < pts.length; k2++) {
        var segStart = acc2, segLen2 = Math.hypot(pts[k2].x - pts[k2 - 1].x, pts[k2].y - pts[k2 - 1].y);
        if (dragProgress > segStart) {
          var t2 = Math.min(1, (dragProgress - segStart) / segLen2);
          var ex = pts[k2 - 1].x + (pts[k2].x - pts[k2 - 1].x) * t2;
          var ey = pts[k2 - 1].y + (pts[k2].y - pts[k2 - 1].y) * t2;
          game.draw.line(pts[k2 - 1].x, pts[k2 - 1].y, ex, ey, C.trackGlow, 14);
        }
        acc2 += segLen2;
      }
    }
  }

  function initGame() {
    extracted = new Array(N_ROWS).fill(false);
    curRow = pickNextRow();
    dragging = false; dragProgress = 0; extractCount = 0; wobble = 0;
    roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function beginDrag(x, y) {
    if (finished || ready > 0 || curRow < 0) return;
    var pts = pathFor(curRow);
    var r = evalOnPath(pts, x, y);
    if (r.dist <= TRACK_HALF && r.len < 40) {
      dragging = true; dragProgress = r.len;
      game.audio.play('se_tap', 0.1);
    } else {
      game.audio.play('se_tap', 0.05);
      game.fx.flash('#ffffff', 0.08);
    }
  }

  function moveDrag(x, y) {
    if (!dragging || finished) return;
    var pts = pathFor(curRow);
    var r = evalOnPath(pts, x, y);
    if (r.dist > TRACK_HALF) {
      dragging = false;
      wobble = 14;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      failRound();
      return;
    }
    if (r.len > dragProgress) dragProgress = r.len;
    var total = pathLen(pts);
    if (dragProgress >= total - 10) {
      dragging = false;
      extracted[curRow] = true;
      extractCount++;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_break', 0.3);
      game.fx.burst(x, y, { color: C.gold, count: 14, speed: 300 });
      if (extractCount === Math.ceil(TOTAL_TARGET / 2)) {
        game.fx.popup('NICE', TOWER_X, TOWER_TOP - 40, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (extractCount >= TOTAL_TARGET) {
        ok = true; finished = true; hitStop = 0.25;
        game.feedback.good(TOWER_X, TOWER_TOP, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      curRow = pickNextRow();
      dragProgress = 0;
    }
  }

  function endDrag() {
    if (dragging) {
      dragging = false;
      dragProgress = 0;
      game.audio.play('se_tap', 0.05);
    }
  }

  function failRound() {
    ok = extractCount >= Math.ceil(TOTAL_TARGET * 0.5);
    finished = true; hitStop = 0.35; shake = 0.3;
    game.audio.play('se_bad', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); beginDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    moveDrag(x, y);
  });
  game.onRelease(function() { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); endDrag(); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: TOWER_X, gy: TOWER_TOP + ROW_H / 2, press: false };
  var demoExtracted, demoRow, demoProgress;
  function resetDemo() {
    demoExtracted = new Array(N_ROWS).fill(false);
    demoRow = 0;
    demoProgress = 0;
    extracted = demoExtracted;
    curRow = demoRow;
    extractCount = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var pts = pathFor(demoRow);
    var total = pathLen(pts);
    var target = Math.min(total, (cyc / 2.4) * total);
    demoProgress = target;
    dragProgress = target;
    var acc = 0, px = pts[0].x, py = pts[0].y;
    for (var k = 1; k < pts.length; k++) {
      var segLen = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
      if (target <= acc + segLen) {
        var t = segLen > 0 ? (target - acc) / segLen : 0;
        px = pts[k - 1].x + (pts[k].x - pts[k - 1].x) * t;
        py = pts[k - 1].y + (pts[k].y - pts[k - 1].y) * t;
        break;
      }
      acc += segLen;
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 2.4;
    if (target >= total - 10 && !demoExtracted[demoRow]) {
      demoExtracted[demoRow] = true;
      extractCount++;
      game.feedback.good(px, py, { text: 'GOOD', color: C.good });
      game.audio.play('se_break', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (extracted === undefined) { initGame(); resetDemo(); }
      stepDemo(dt);
      bg();
      drawTower();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTower();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(extractCount + ' / ' + TOTAL_TARGET, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, TOTAL_TARGET - extractCount) + '本!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(extractCount, { extracted: extractCount, total: TOTAL_TARGET });
        else game.end.failure({ extracted: extractCount, total: TOTAL_TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', TOWER_X, TOWER_TOP - 40, { color: C.gold, size: 30 });
      }
      if (roundClock >= TIME_LIMIT) {
        failRound();
      }
    }
    if (wobble > 0) wobble -= dt * 40;
    if (shake > 0) shake -= dt;

    bg();
    drawTower();

    txt(extractCount + ' / ' + TOTAL_TARGET, W / 2, H * 0.06, 30, C.ink);
    var barW = W - 120;
    var pct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, barW, 16, '#3a4a3a', 1);
    game.draw.rect(60, 150, barW * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 124, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
