// I-GBA-0031-pattern-cut-line.js
// パターンカットライン — 仕立て台の生地に引かれたチョークの線からはみ出さず、指でなぞって裁つ
// 操作: 生地に引かれた白い線の上から離れないよう、指でなぞって端から端まで裁ち進める
// 終わり: 線の終点まで裁ち切れば成功。線から外れる/制限時間切れで失敗
// @mechanic: guide_path
// @theme: tailor_pattern_cutting
// 世界観: 仕立て工房の裁断台。裁断ロボットが、生地に引かれた型紙のチョークラインを正確になぞって裁つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 裁ち終えた進行度%
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: ベタ塗り数色、影なし・丸角・余白
  var C = {
    bg: '#f4efe6', bg2: '#e9e1d2', table: '#d8cdb8', fabric: '#f8f4ea', fabricEdge: '#cdbfa0',
    line: '#3a3a44', lineDone: '#3ac37a', cursor: '#ff5d73',
    good: '#3ac37a', bad: '#ff4d5e', gold: '#f5a623', white: '#2c2c34', ink: '#ffffff',
  };

  var GAME_TITLE = 'PATTERN CUT';
  var HALF = 58;
  var TIME_LIMIT = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.22, y: H * 0.32 },
    { x: W * 0.62, y: H * 0.30 },
    { x: W * 0.78, y: H * 0.40 },
    { x: W * 0.70, y: H * 0.50 },
    { x: W * 0.82, y: H * 0.56 },
    { x: W * 0.70, y: H * 0.64 },
    { x: W * 0.76, y: H * 0.72 },
    { x: W * 0.40, y: H * 0.72 },
    { x: W * 0.30, y: H * 0.62 },
    { x: W * 0.40, y: H * 0.54 },
    { x: W * 0.24, y: H * 0.46 },
    { x: W * 0.22, y: H * 0.32 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d0 = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d0); TOTAL_LEN += d0;
  }

  var progress, curX, curY, timeLeft, telegraphWarned;
  var done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TAILOR_A = ['.##.', '####', '.##.', '#..#'];
  var TAILOR_B = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(W * 0.08, H * 0.24, W * 0.84, H * 0.56, C.table, 0.6);
    game.draw.rect(W * 0.12, H * 0.28, W * 0.76, H * 0.48, C.fabric);
    game.draw.rect(W * 0.12, H * 0.28, W * 0.76, H * 0.48, C.fabricEdge, 0.4);
  }

  function nearestOnPath(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var ax = PTS[i - 1].x, ay = PTS[i - 1].y, bx = PTS[i].x, by = PTS[i].y;
      var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
      var len2 = vx * vx + vy * vy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
      var cx = ax + vx * t, cy = ay + vy * t;
      var d = Math.hypot(px - cx, py - cy);
      if (d < best) { best = d; bestLen = acc + t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function pointAtLen(target) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (target <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (target - acc) / SEG_LEN[i - 1] : 0;
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return PTS[PTS.length - 1];
  }

  function initGame() {
    progress = 0; curX = PTS[0].x; curY = PTS[0].y; timeLeft = TIME_LIMIT; telegraphWarned = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function fail(x, y) {
    finished = true; ok = false; hitStop = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.25;
    game.audio.play('se_failure', 0.4);
    finish();
  }

  function onDrag(x, y) {
    if (finished || ready > 0 || done) return;
    var r = nearestOnPath(x, y);
    if (r.dist > HALF) { fail(x, y); return; }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (beforePct < 50 && afterPct >= 50) {
        game.fx.popup('50%', x, y - 60, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    curX = x; curY = y;
    if (progress >= TOTAL_LEN - 18) {
      finished = true; ok = true; hitStop = 0.15;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      var segDoneLen = 0;
      for (var k = 1; k < j; k++) segDoneLen += SEG_LEN[k - 1];
      var isDone = segDoneLen + SEG_LEN[j - 1] <= progress + 1;
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, isDone ? C.lineDone : C.line, 6);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, 16, C.gold);
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.8) * TOTAL_LEN);
    var p = pointAtLen(target);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 3.8;
    if (target > progress) progress = target;
    curX = p.x; curY = p.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.circle(curX, curY, 12, C.cursor);
      game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? TAILOR_A : TAILOR_B, { '#': C.white }, W * 0.5, H * 0.86, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(pct + ' / 100', W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct2, { pct: pct2 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!telegraphWarned && timeLeft <= 3) {
        telegraphWarned = true;
        game.audio.tone(760, 0.12, { wave: 'square', volume: 0.15 });
      }
      if (timeLeft <= 0) fail(curX, curY);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished) game.draw.circle(curX, curY, 12, C.cursor);
    game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? TAILOR_A : TAILOR_B, { '#': C.white }, W * 0.5, H * 0.86, 18, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 14, '#00000020', 1);
    var tp = !finished ? Math.max(0, timeLeft / TIME_LIMIT) : 0;
    game.draw.rect(60, 150, (W - 120) * tp, 14, telegraphWarned ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
