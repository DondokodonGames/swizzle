// D-20092012-0013-canal-dig-flow.js
// カナルフロー — 乾いた大地に指で水路を掘り、井戸の水を待つ旅人まで一本につなげる
// 操作: 井戸から中継石を順になぞってつなぎ、旅人まで水路を通す。ひび割れた岩には触れない
// 終わり: 制限時間内に旅人まで水路をつなげれば成功。岩に触れるか時間切れで失敗
// @mechanic: connect
// @theme: dry_land_canal
// 世界観: 干上がった荒野。井戸のそばに倒れそうな旅人が水を待つ。井戸番が指で水路を掘り、水を旅人まで導く話
// 残るもの: 正誤(CLEAR/GAME OVER) + つながった水路の割合
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 限定パレット、荒く大きいドット、彩度高め
  var C = {
    bg: '#d8a054', bg2: '#b87838', dirt: '#8a5a2c', dirtEdge: '#5e3a18',
    water: '#3ac8ff', waterDark: '#1c86c0', rock: '#6a4a5a', rockWarn: '#ff4d5e',
    good: '#3fe06a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff6e0', ink: '#2a1808',
  };

  var GAME_TITLE = 'CANAL FLOW';
  var TIME_LIMIT = 15;
  var TOL = 78;
  var ROCK_R = 60;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var NODES = [
    { x: W * 0.5, y: H * 0.20 },  // 井戸(始点)
    { x: W * 0.24, y: H * 0.36 },
    { x: W * 0.72, y: H * 0.50 },
    { x: W * 0.30, y: H * 0.64 },
    { x: W * 0.5, y: H * 0.80 },  // 旅人(終点)
  ];
  var ROCK = { x: W * 0.62, y: H * 0.32 }; // 経路脇の危険な岩(触れると即失敗)

  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < NODES.length; i++) {
    var d = Math.hypot(NODES[i].x - NODES[i - 1].x, NODES[i].y - NODES[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WELL = ['.##.', '####', '.##.', '.##.'];
  var TRAVELER = ['.#.', '###', '.#.', '#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, '#00000008');
  }

  function drawScene(dugLen) {
    for (var j = 1; j < NODES.length; j++) {
      game.draw.line(NODES[j - 1].x, NODES[j - 1].y, NODES[j].x, NODES[j].y, C.dirtEdge, 8);
    }
    var acc = 0;
    for (var j = 1; j < NODES.length; j++) {
      var segFrom = acc, segTo = acc + SEG_LEN[j - 1];
      if (dugLen > segFrom) {
        var t = Math.min(1, (dugLen - segFrom) / SEG_LEN[j - 1]);
        var ex = NODES[j - 1].x + (NODES[j].x - NODES[j - 1].x) * t;
        var ey = NODES[j - 1].y + (NODES[j].y - NODES[j - 1].y) * t;
        game.draw.line(NODES[j - 1].x, NODES[j - 1].y, ex, ey, C.waterDark, 30);
        game.draw.line(NODES[j - 1].x, NODES[j - 1].y, ex, ey, C.water, 20);
      }
      acc += SEG_LEN[j - 1];
    }
    for (var k = 0; k < NODES.length; k++) {
      game.draw.circle(NODES[k].x, NODES[k].y, 22, k === 0 ? C.water : (k === NODES.length - 1 ? C.gold : C.dirt));
    }
    var rockBlink = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.circle(ROCK.x, ROCK.y, ROCK_R, C.rock);
    game.draw.circle(ROCK.x, ROCK.y, ROCK_R * 0.6, rockBlink ? C.rockWarn : C.rock, 0.8);
    game.draw.sprite(WELL, { '#': C.waterDark }, NODES[0].x, NODES[0].y - 46, 10, { anchor: 'center' });
    game.draw.sprite(TRAVELER, { '#': C.ink }, NODES[NODES.length - 1].x, NODES[NODES.length - 1].y - 44, 10, { anchor: 'center' });
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
    for (var i = 1; i < NODES.length; i++) {
      var r = distToSeg(px, py, NODES[i - 1].x, NODES[i - 1].y, NODES[i].x, NODES[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  var dugLen, timeLeft, done, endWait, finished, milestoneShown, warned;
  var ready, hitStop, shake;

  function initGame() {
    dugLen = 0; timeLeft = TIME_LIMIT; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; warned = false;
  }

  function onDrag(x, y) {
    if (finished || done || ready > 0) return;
    var dRock = Math.hypot(x - ROCK.x, y - ROCK.y);
    if (dRock < ROCK_R) {
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    var r = evalPoint(x, y);
    if (r.dist > TOL) return;
    if (r.len > dugLen) {
      dugLen = r.len;
      var pct = dugLen / TOTAL_LEN;
      if (pct > 0.5 && !milestoneShown) { milestoneShown = true; game.fx.popup('50%', x, y - 60, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
      if (dugLen >= TOTAL_LEN - 20) {
        finished = true; ok = true; hitStop = 0.1;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(x, y, { color: C.water, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
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

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: NODES[0].x, gy: NODES[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { dugLen = 0; milestoneShown = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.2) * TOTAL_LEN);
    var acc = 0, px = NODES[0].x, py = NODES[0].y;
    for (var i = 1; i < NODES.length; i++) {
      if (target <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (target - acc) / SEG_LEN[i - 1] : 0;
        px = NODES[i - 1].x + (NODES[i].x - NODES[i - 1].x) * t;
        py = NODES[i - 1].y + (NODES[i].y - NODES[i - 1].y) * t;
        break;
      }
      acc += SEG_LEN[i - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.2;
    if (dugLen < target) dugLen = target;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dugLen === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene(dugLen);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
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
      drawScene(dugLen);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      var pct = Math.round((dugLen / TOTAL_LEN) * 100);
      txt(pct + ' / ' + 100, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((dugLen / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!warned && timeLeft <= 3) { warned = true; }
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(dugLen);

    var pct2 = Math.round((dugLen / TOTAL_LEN) * 100);
    txt(pct2 + ' / ' + 100, W / 2, H * 0.055, 30, C.white);
    var timeBlink = warned && Math.floor(game.time.elapsed * 6) % 2 === 0;
    txt(Math.ceil(timeLeft) + 's', W * 0.85, H * 0.055, 30, timeBlink ? C.bad : C.white);
    game.draw.rect(60, 120, W - 120, 14, C.ink, 0.4);
    game.draw.rect(60, 120, (W - 120) * (dugLen / TOTAL_LEN), 14, C.water);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
