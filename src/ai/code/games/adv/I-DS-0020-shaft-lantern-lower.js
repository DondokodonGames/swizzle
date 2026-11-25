// I-DS-0020-shaft-lantern-lower.js
// シャフトランタン降下 — 縦坑に吊るしたランタンを、指でつまんでガイド沿いに降ろす
// 操作: ランタンを指で押さえたままレール沿いに下へドラッグ。途中3つの関門を壁に触れず通過し、最下段の停止マークで止める
// 終わり: 3関門を無事通過し最下段マークで止まれば成功。壁に触れる/マークを外して落とせば失敗
// @mechanic: guide_path
// @theme: mine_shaft_lantern
// 世界観: 落盤で塞がれた縦坑の救助隊。ロープに吊るしたランタンを慎重に下ろし、閉じた関門をくぐらせて最下段の足場に届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過した関門数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。中間色はディザ(市松)で作る。線の太さで距離と力を語る
  var C = {
    bg: '#0c0c0c', wall: '#e8e8e8', rail: '#3a3a3a', railEdge: '#171717',
    lantern: '#f4f4f4', glow: '#ffffff', good: '#f4f4f4', bad: '#e8e8e8',
    gold: '#ffffff', white: '#f4f4f4', ink: '#000000',
  };

  var GAME_TITLE = 'SHAFT LANTERN';
  var HALF = 78;
  var GATE_HALF = 46; // 関門の狭さ

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  // 縦の降下ルート(まっすぐ下だが左右に揺れる)。関門はこの経路上の3点
  var PTS = [
    { x: W * 0.5, y: H * 0.14 },
    { x: W * 0.38, y: H * 0.30 },
    { x: W * 0.62, y: H * 0.46 },
    { x: W * 0.35, y: H * 0.62 },
    { x: W * 0.58, y: H * 0.78 },
    { x: W * 0.5, y: H * 0.90 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }
  var GATE_LEN = [TOTAL_LEN * 0.28, TOTAL_LEN * 0.56, TOTAL_LEN * 0.84];

  var progress, cursorX, cursorY, done, endWait, finished, gatesPassed;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, '#141414'], [1, C.bg]]);
    // ディザで岩壁の質感
    for (var y = 0; y < H; y += 40) {
      for (var x = (y / 40 % 2 === 0 ? 0 : 20); x < W; x += 40) {
        game.draw.rect(x, y, 3, 3, '#ffffff10');
      }
    }
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.railEdge, HALF * 2 + 10);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.rail, HALF * 2);
    }
    // 関門(3箇所): 狭くくびれた位置を白線で示す
    for (var g = 0; g < GATE_LEN.length; g++) {
      var p = evalLenPoint(GATE_LEN[g]);
      var passed = gatesPassed > g;
      game.draw.circle(p.x, p.y, GATE_HALF + 6, passed ? '#ffffff30' : '#ffffff70');
      game.draw.line(p.x - GATE_HALF - 20, p.y, p.x - GATE_HALF + 4, p.y, C.wall, 8);
      game.draw.line(p.x + GATE_HALF - 4, p.y, p.x + GATE_HALF + 20, p.y, C.wall, 8);
    }
    // 最下段の停止マーク
    var stopP = PTS[PTS.length - 1];
    game.draw.circle(stopP.x, stopP.y, HALF * 0.7, '#ffffff20');
    game.draw.line(stopP.x - HALF, stopP.y, stopP.x + HALF, stopP.y, C.gold, 6);
  }

  function evalLenPoint(len) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (len <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (len - acc) / SEG_LEN[i - 1] : 0;
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return PTS[PTS.length - 1];
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

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false; gatesPassed = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function currentHalf(len) {
    for (var g = 0; g < GATE_LEN.length; g++) {
      if (Math.abs(len - GATE_LEN[g]) < 60) return GATE_HALF;
    }
    return HALF;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    var r = evalPoint(x, y);
    var limit = currentHalf(r.len);
    if (r.dist > limit) {
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      progress = r.len;
      for (var g = 0; g < GATE_LEN.length; g++) {
        if (gatesPassed === g && progress > GATE_LEN[g] + 10) {
          gatesPassed++;
          game.fx.popup('GATE ' + gatesPassed + '/3', x, y - 60, { color: C.gold, size: 34 });
          game.audio.play('se_milestone', 0.4);
        }
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 20) {
      finished = true; ok = true; hitStop = 0.15;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 360 });
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
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { progress = 0; gatesPassed = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.6) * TOTAL_LEN);
    for (var g = 0; g < GATE_LEN.length; g++) {
      if (gatesPassed === g && target > GATE_LEN[g] + 10) gatesPassed++;
    }
    var p = evalLenPoint(target);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 3.6;
    progress = Math.max(progress || 0, target);
    cursorX = p.x; cursorY = p.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPath();
      game.draw.sprite(LANTERN_SPRITE, { '#': C.lantern }, cursorX, cursorY, 8, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath();
      game.draw.sprite(LANTERN_SPRITE, { '#': ok ? C.good : C.bad }, cursorX, cursorY, 8, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 50, ok ? C.good : C.bad);
      txt(gatesPassed + ' / 3', W / 2, H * 0.10, 30, C.gold);
      if (!ok) txt('あと' + (3 - gatesPassed) + '関門!', W / 2, H * 0.14, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(gatesPassed, { gates: gatesPassed, total: 3 });
        else game.end.failure({ gates: gatesPassed, total: 3 });
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
    if (!finished) game.draw.sprite(LANTERN_SPRITE, { '#': C.lantern }, cursorX, cursorY, 8, { anchor: 'center' });

    txt(gatesPassed + ' / 3', W / 2, H * 0.05, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.6], ['D#3', 0.6], ['G3', 0.6], ['C3', 1.2]], { tempo: 84, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
