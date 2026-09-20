// I-GBA-0030-relic-fruit-peel.js
// レリックフルーツ・ピール — 遺跡で見つけた発光する果実を、渦を描く皮の筋に沿って指でむいていく
// 操作: 果実表面に浮かぶ渦の筋から指がはみ出さないよう、なぞって皮をむき進める
// 終わり: 渦の終点(核)までむき切れば成功。筋から外れれば失敗
// @mechanic: trace
// @theme: relic_fruit_peel
// 世界観: 密林の遺跡で見つかった発光する渦巻き果実。探検家が皮の筋を指でなぞってむき、中の光る核を取り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + むき終えた進行度%
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色 + 光、パララックス、細かいアニメ
  var C = {
    bg: '#0a1c14', bg2: '#123322', canopy: '#0e2a1a', ruin: '#3a4a3a',
    fruit: '#1f5a3a', fruitDark: '#0f3320', peel: '#8fe06a', peelEdge: '#c8ffa0',
    core: '#ffd85a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffe066', white: '#f2fff0', ink: '#06120a',
  };

  var GAME_TITLE = 'FRUIT PEEL';
  var CX = W * 0.5, CY = H * 0.46;
  var HALF = 58;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  // 渦を描く経路点を生成(外周のヘタ側から核へ、3周しながら半径が縮む)
  var SPIRAL = [];
  (function buildSpiral() {
    var N = 44, LOOPS = 2.6, R0 = 250, R1 = 46;
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      var ang = -Math.PI / 2 + t * LOOPS * Math.PI * 2;
      var r = R0 + (R1 - R0) * t;
      SPIRAL.push({ x: CX + Math.cos(ang) * r, y: CY + Math.sin(ang) * r });
    }
  })();
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var si = 1; si < SPIRAL.length; si++) {
    var sd = Math.hypot(SPIRAL[si].x - SPIRAL[si - 1].x, SPIRAL[si].y - SPIRAL[si - 1].y);
    SEG_LEN.push(sd); TOTAL_LEN += sd;
  }

  var progress, curX, curY, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var EXPLORER_A = ['.##.', '####', '.##.', '#.##'];
  var EXPLORER_B = ['.##.', '####', '.##.', '##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) {
      game.draw.rect(W * (0.08 + i * 0.26), H * 0.1, 34, H * 0.22, C.ruin, 0.35);
    }
    game.draw.circle(CX, CY, 300, C.canopy, 0.4);
  }

  function nearestOnPath(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < SPIRAL.length; i++) {
      var ax = SPIRAL[i - 1].x, ay = SPIRAL[i - 1].y, bx = SPIRAL[i].x, by = SPIRAL[i].y;
      var vx = bx - ax, vy = by - ay;
      var wx = px - ax, wy = py - ay;
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
    for (var i = 1; i < SPIRAL.length; i++) {
      if (target <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (target - acc) / SEG_LEN[i - 1] : 0;
        return {
          x: SPIRAL[i - 1].x + (SPIRAL[i].x - SPIRAL[i - 1].x) * t,
          y: SPIRAL[i - 1].y + (SPIRAL[i].y - SPIRAL[i - 1].y) * t,
        };
      }
      acc += SEG_LEN[i - 1];
    }
    return SPIRAL[SPIRAL.length - 1];
  }

  function initGame() {
    progress = 0; curX = SPIRAL[0].x; curY = SPIRAL[0].y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function onDrag(x, y) {
    if (finished || ready > 0 || done) return;
    var r = nearestOnPath(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.3;
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
      if (beforePct < 50 && afterPct >= 50) {
        game.fx.popup('50%', x, y - 60, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    curX = x; curY = y;
    if (progress >= TOTAL_LEN - 18) {
      finished = true; ok = true; hitStop = 0.15;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.core, count: 18, speed: 360 });
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

  function drawFruit() {
    game.draw.circle(CX, CY, 268, C.fruitDark);
    game.draw.circle(CX, CY, 250, C.fruit);
    for (var i = 1; i < SPIRAL.length; i++) {
      var doneSeg = (i / SPIRAL.length) * TOTAL_LEN <= progress;
      game.draw.line(SPIRAL[i - 1].x, SPIRAL[i - 1].y, SPIRAL[i].x, SPIRAL[i].y, doneSeg ? C.peelEdge : C.peel, HALF * 2);
    }
    game.draw.circle(CX, CY, 44, C.core, 0.9);
    game.draw.circle(SPIRAL[0].x, SPIRAL[0].y, HALF * 0.5, C.white);
  }

  var demo = { t: 0, gx: SPIRAL[0].x, gy: SPIRAL[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.2) * TOTAL_LEN);
    var p = pointAtLen(target);
    demo.gx = p.x; demo.gy = p.y; demo.press = cyc < 3.2;
    if (target > progress) progress = target;
    curX = p.x; curY = p.y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFruit();
      game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? EXPLORER_A : EXPLORER_B, { '#': C.gold }, W * 0.5, H * 0.86, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFruit();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(pct + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFruit();
    if (!finished) game.draw.circle(curX, curY, 14, C.white);
    game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? EXPLORER_A : EXPLORER_B, { '#': C.gold }, W * 0.5, H * 0.86, 18, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
