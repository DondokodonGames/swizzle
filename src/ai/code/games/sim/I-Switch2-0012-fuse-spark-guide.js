// I-Switch2-0012-fuse-spark-guide.js
// フューズスパークガイド — 花火師見習いが、後ろから迫る火花に追いつかれる前に導火線をなぞって着火点まで導く
// 操作: 導火線からはみ出さないよう指でなぞって進む。後方から迫る火花に追いつかれないよう速さも保つ
// 終わり: 着火点に着けば成功。導火線の外にはみ出す、または火花に追いつかれれば失敗
// @mechanic: trace
// @theme: firework_apprentice_fuse
// 世界観: 川辺の花火工房。見習い職人が、曲がりくねる導火線の上を指で火花のようになぞり玉に導く。
//        後方では本物の火花が迫ってきており、なぞる速さで逃げ切る必要がある
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景に細い発光ライン、単色の幾何グロー
  var C = {
    bg: '#050508', wire: '#1a1a22', path: '#2a1810', pathEdge: '#e05a1a',
    spark: '#ffd23a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f0e8', ink: '#050505',
  };

  var GAME_TITLE = 'FUSE GUIDE';
  var HALF = 46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.5, y: H * 0.84 },
    { x: W * 0.22, y: H * 0.76 },
    { x: W * 0.30, y: H * 0.62 },
    { x: W * 0.72, y: H * 0.58 },
    { x: W * 0.64, y: H * 0.44 },
    { x: W * 0.28, y: H * 0.38 },
    { x: W * 0.36, y: H * 0.24 },
    { x: W * 0.5, y: H * 0.16 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var CHASE_SPEED; // 1秒あたりの燃え進む長さ(初期化時に経路長から算出)
  var progress, chaseLen, cursorX, cursorY, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SHELL = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#0a0a0f']]);
    for (var i = 0; i < 8; i++) game.draw.rect(0, i * (H / 8), W, 1, '#ffffff05');
    game.draw.sprite(SHELL, { '#': C.pathEdge }, W * 0.5, H * 0.94, 8, { anchor: 'center' });
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.wire, HALF * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.path, HALF * 2);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.6, C.spark);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, HALF * 0.6, C.gold);
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
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var r = distToSeg(px, py, PTS[i - 1].x, PTS[i - 1].y, PTS[i].x, PTS[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  // 経路上の長さ(0〜TOTAL_LEN)から座標を求める(追跡する火花の描画に使う)
  function pointAtLen(len) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (len <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (len - acc) / SEG_LEN[i - 1] : 0;
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return { x: PTS[PTS.length - 1].x, y: PTS[PTS.length - 1].y };
  }

  function initGame() {
    progress = 0; chaseLen = -220; cursorX = PTS[0].x; cursorY = PTS[0].y;
    CHASE_SPEED = TOTAL_LEN / 7.5;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.15;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (beforePct < 50 && afterPct >= 50) game.fx.popup('50 / 100', x, y - 60, { color: C.gold, size: 36 });
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 20) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
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
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.2) * TOTAL_LEN);
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
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.2;
    progress = Math.min(progress || 0, target);
    if (progress < target) progress = target;
    cursorX = px; cursorY = py;
    chaseLen = Math.max(0, target - TOTAL_LEN * 0.3);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      var demoChasePt = pointAtLen(chaseLen);
      game.draw.circle(demoChasePt.x, demoChasePt.y, 20, C.spark, 0.7);
      game.draw.circle(demoChasePt.x, demoChasePt.y, 10, '#ffffff', 0.9);
      game.draw.circle(cursorX, cursorY, 14, C.spark);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      game.draw.circle(cursorX, cursorY, 14, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / ' + 100, W / 2, H * 0.12, 30, C.gold);
      if (!ok) txt('あと' + (100 - Math.round((progress / TOTAL_LEN) * 100)) + '%!', W / 2, H * 0.16, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      chaseLen += CHASE_SPEED * dt;
      if (chaseLen >= progress) {
        var caughtAt = pointAtLen(Math.max(0, progress));
        finished = true; ok = false; hitStop = 0.15;
        game.feedback.bad(caughtAt.x, caughtAt.y, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath();
    if (!finished && chaseLen > -100) {
      var chasePt = pointAtLen(Math.max(0, chaseLen));
      var chaseGap = progress - chaseLen;
      var closing = chaseGap < TOTAL_LEN * 0.16;
      var blink = !closing || Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (blink) {
        game.draw.circle(chasePt.x, chasePt.y, closing ? 26 : 20, C.spark, closing ? 0.95 : 0.7);
        game.draw.circle(chasePt.x, chasePt.y, closing ? 14 : 10, '#ffffff', 0.9);
      }
    }
    if (!finished) game.draw.circle(cursorX, cursorY, 14, C.spark);

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
