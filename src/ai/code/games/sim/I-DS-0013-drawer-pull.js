// I-DS-0013-drawer-pull.js
// アーカイブドロワー — 地下書庫の引き出しを指でなぞって最後まで引き抜く
// 操作: レール(引き出しのスライド軌道)から外れないよう指でなぞって奥から手前へ引く
// 終わり: レールの端(全開)まで引ければ成功。レールから指がはみ出せば引っかかって失敗
// @mechanic: guide_path
// @theme: archive_drawer_pull
// 世界観: 地下書庫のモグラ司書が、光る記憶結晶が入った巨大な引き出しをレールに沿って引き抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き抜けた進行度%
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、粗いドット、タイル反復背景
  var C = {
    bg: '#0c0a12', tile: '#161226', tile2: '#1c1830',
    rail: '#2a2440', railEdge: '#463a68', accent: '#ffcf4d',
    good: '#5dffa0', bad: '#ff5060', gold: '#ffcf4d', white: '#f4f0ff', ink: '#08060c',
    pinch: '#ff5060',
  };

  var GAME_TITLE = 'DRAWER PULL';

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.82 },
    { x: W * 0.5, y: H * 0.70 },
    { x: W * 0.30, y: H * 0.70 },
    { x: W * 0.30, y: H * 0.56 },
    { x: W * 0.70, y: H * 0.56 },
    { x: W * 0.70, y: H * 0.42 },
    { x: W * 0.40, y: H * 0.42 },
    { x: W * 0.40, y: H * 0.28 },
    { x: W * 0.5, y: H * 0.18 },
  ];
  // 2箇所の「サビついた蝶番」区間(そこだけレール幅が狭くなる)
  var PINCH = [{ from: 2, to: 4 }, { from: 5, to: 7 }];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }
  var HALF_WIDE = 70, HALF_NARROW = 34;

  function segIsPinch(segIdx) {
    for (var p = 0; p < PINCH.length; p++) if (segIdx >= PINCH[p].from && segIdx < PINCH[p].to) return true;
    return false;
  }

  var progress, cursorX, cursorY, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MOLE_A = ['.####.', '######', '#.##.#', '######', '.####.'];
  var MOLE_B = ['.####.', '######', '#.##.#', '#####.', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, '#141026'], [1, C.bg]]);
    for (var gx = 0; gx < W; gx += 90) {
      for (var gy = 0; gy < H; gy += 90) {
        game.draw.rect(gx, gy, 88, 88, (Math.floor(gx / 90) + Math.floor(gy / 90)) % 2 === 0 ? C.tile : C.tile2, 0.5);
      }
    }
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      var pinch = segIsPinch(j - 1);
      var half = pinch ? HALF_NARROW : HALF_WIDE;
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, pinch ? C.pinch : C.railEdge, half * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.rail, half * 2);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 44, C.accent, 0.9);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 44, C.gold);
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return { dist: Math.hypot(px - cx, py - cy), t: t };
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, bestSeg = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var r = distToSeg(px, py, PTS[i - 1].x, PTS[i - 1].y, PTS[i].x, PTS[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * SEG_LEN[i - 1]; bestSeg = i - 1; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen, seg: bestSeg };
  }

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    var half = segIsPinch(r.seg) ? HALF_NARROW : HALF_WIDE;
    if (r.dist > half) {
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      progress = r.len;
      var pct = progress / TOTAL_LEN;
      if (!milestoneShown && pct >= 0.5) {
        milestoneShown = true;
        game.fx.popup('50%', x, y - 70, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 16) {
      finished = true; ok = true; hitStop = 0.15;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { progress = 0; milestoneShown = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.6) * TOTAL_LEN);
    var acc = 0, px = PTS[0].x, py = PTS[0].y;
    for (var i = 1; i < PTS.length; i++) {
      if (target <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (target - acc) / SEG_LEN[i - 1] : 0;
        px = PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t;
        py = PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t;
        break;
      }
      acc += SEG_LEN[i - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.6;
    if (progress < target) progress = target;
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.sprite(Math.floor(game.time.elapsed * 4) % 2 === 0 ? MOLE_A : MOLE_B, { '#': C.accent, '.': null }, cursorX, cursorY - 60, 8, { anchor: 'center' });
      game.draw.circle(cursorX, cursorY, 14, C.accent);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      game.draw.circle(cursorX, cursorY, 14, ok ? C.good : C.bad);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var p = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(p, { pct: p }); else game.end.failure({ pct: p });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) {
      game.draw.sprite(Math.floor(game.time.elapsed * 6) % 2 === 0 ? MOLE_A : MOLE_B, { '#': C.accent, '.': null }, cursorX, cursorY - 60, 8, { anchor: 'center' });
      game.draw.circle(cursorX, cursorY, 14, C.accent);
    }

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['D3', 0.5], ['F3', 0.5], ['G3', 1]], { tempo: 96, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
