// D-20172021-0089-circuit-orb-reroute.js
// サーキット・オーブ・リルート — 断線した2つのランプ玉を、間に立つ障害ポストへ触れないよう迂回する導線で結ぶ
// 操作: 片方のランプ玉から指を離さずドラッグを始め、障害ポストに触れないよう迂回してもう片方のランプ玉まで導線を引く
// 終わり: 規定回数、障害に触れず反対側のランプ玉まで導線を結べば成功。障害接触/未接続のまま指を離す/時間切れで失敗
// @mechanic: connect
// @theme: circuit_orb_reroute
// 世界観: 地下配電室の修理士見習いが、断線した2つのランプ玉の間に立つ障害ポストへ導線を触れさせぬよう、迂回する導線を引いて結び直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 結線できた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 黒地に白の輪郭線のみ、彩色は最小限のアクセント1色
  var C = {
    bg: '#0c0c0e', bg2: '#050506', wire: '#f2f2f2', wireDone: '#4ad0ff',
    orbOff: '#3a3a40', orbOn: '#f2f2f2', post: '#f2f2f2', postWarn: '#ff3355',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffce4a', ink: '#f2f2f2', white: '#f2f2f2',
  };

  var GAME_TITLE = 'ORB REROUTE';
  var TOTAL = 3;
  var ROUND_TIME = 6.0;
  var ORB_R = 34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TECH_SPRITE = ['.#.', '###', '.#.', '#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#4ad0ff', pulse * 0.3);
    game.draw.sprite(TECH_SPRITE, { '#': C.wireDone }, W * 0.16, H * 0.86, 12, { anchor: 'center' });
  }

  var ROUNDS = [
    { a: { x: W * 0.24, y: H * 0.4 }, b: { x: W * 0.76, y: H * 0.4 }, obstacles: [{ x: W * 0.5, y: H * 0.4, r: 90 }] },
    { a: { x: W * 0.22, y: H * 0.32 }, b: { x: W * 0.78, y: H * 0.56 }, obstacles: [{ x: W * 0.5, y: H * 0.34, r: 80 }, { x: W * 0.58, y: H * 0.58, r: 70 }] },
    { a: { x: W * 0.78, y: H * 0.3 }, b: { x: W * 0.22, y: H * 0.58 }, obstacles: [{ x: W * 0.5, y: H * 0.3, r: 70 }, { x: W * 0.5, y: H * 0.58, r: 70 }] },
  ];

  var roundIdx, orbA, orbB, obstacles, path, dragging, connected, roundClock;
  var done, endWait, finished, ready, hitStop, shake;

  function loadRound(i) {
    var r = ROUNDS[i % ROUNDS.length];
    orbA = r.a; orbB = r.b; obstacles = r.obstacles;
    path = []; dragging = false; connected = false; roundClock = 0;
  }

  function initGame() {
    roundIdx = 0; loadRound(0);
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene(showPath) {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      game.draw.circle(o.x, o.y, o.r, C.post, 0.9);
      game.draw.circle(o.x, o.y, o.r - 14, C.bg, 1);
    }
    if (showPath && path.length > 1) {
      for (var j = 1; j < path.length; j++) {
        game.draw.line(path[j - 1].x, path[j - 1].y, path[j].x, path[j].y, connected ? C.wireDone : C.wire, 10);
      }
    }
    var glowA = 0.6 + 0.3 * Math.sin(game.time.elapsed * 3);
    var glowB = 0.6 + 0.3 * Math.sin(game.time.elapsed * 3 + 1.5);
    game.draw.circle(orbA.x, orbA.y, ORB_R, C.orbOn, glowA);
    game.draw.circle(orbA.x, orbA.y, ORB_R - 12, C.bg, 1);
    game.draw.circle(orbB.x, orbB.y, ORB_R, connected ? C.wireDone : C.orbOn, connected ? 1 : glowB);
    game.draw.circle(orbB.x, orbB.y, ORB_R - 12, C.bg, 1);
  }

  function hitsObstacle(x1, y1, x2, y2) {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var vx = x2 - x1, vy = y2 - y1;
      var len2 = vx * vx + vy * vy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, ((o.x - x1) * vx + (o.y - y1) * vy) / len2)) : 0;
      var cx = x1 + vx * t, cy = y1 + vy * t;
      if (Math.hypot(o.x - cx, o.y - cy) < o.r + 8) return true;
    }
    return false;
  }

  function failRound(x, y, msg) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: msg || 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function tryStart(x, y) {
    if (game.hit.circle(x, y, 1, orbA.x, orbA.y, ORB_R + 20)) {
      dragging = true; path = [{ x: orbA.x, y: orbA.y }];
      game.audio.play('se_tap', 0.15);
    }
  }

  function tryDrag(x, y) {
    if (!dragging || connected) return;
    var last = path[path.length - 1];
    if (Math.hypot(x - last.x, y - last.y) < 8) return;
    if (hitsObstacle(last.x, last.y, x, y)) {
      dragging = false;
      failRound(x, y, 'MISS');
      return;
    }
    path.push({ x: x, y: y });
    if (Math.random() < 0.2) game.audio.play('se_tap', 0.03);
    if (game.hit.circle(x, y, 1, orbB.x, orbB.y, ORB_R + 16)) {
      connected = true; dragging = false;
      roundIdx++;
      game.feedback.good(orbB.x, orbB.y, { text: 'GOOD', color: C.good });
      game.fx.burst(orbB.x, orbB.y, { color: C.wireDone, count: 18, speed: 360 });
      game.audio.play('se_success', 0.35);
      if (roundIdx === Math.ceil(TOTAL / 2)) game.fx.popup('あと' + (TOTAL - roundIdx) + '!', W * 0.5, H * 0.2, { color: C.gold, size: 32 });
      if (roundIdx >= TOTAL) {
        ok = true; finished = true; hitStop = 0.2;
        finish();
      } else {
        loadRound(roundIdx);
      }
    }
  }

  function tryEnd(x, y) {
    if (!dragging) return;
    dragging = false;
    if (!connected) failRound(x, y, 'MISS');
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) tryStart(x, y); });
  game.onMove(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) tryDrag(x, y); });
  game.onRelease(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) tryEnd(x, y); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    if (cyc < 0.3) { demo.gx = orbA.x; demo.gy = orbA.y; demo.press = false; }
    else if (cyc < 2.6) {
      var t2 = (cyc - 0.3) / 2.3;
      var midX = (orbA.x + orbB.x) / 2;
      var away = obstacles[0].y < H * 0.45 ? -1 : 1;
      var midY = Math.min(orbA.y, orbB.y) - 130 * (away < 0 ? 1 : -1) * 0 + (orbA.y + orbB.y) / 2 + (obstacles[0].y > (orbA.y + orbB.y) / 2 ? -150 : 150);
      var px, py;
      if (t2 < 0.5) { var u = t2 / 0.5; px = orbA.x + (midX - orbA.x) * u; py = orbA.y + (midY - orbA.y) * u; }
      else { var u2 = (t2 - 0.5) / 0.5; px = midX + (orbB.x - midX) * u2; py = midY + (orbB.y - midY) * u2; }
      demo.press = true;
      if (dragging === false && cyc < 0.35) { dragging = true; path = [{ x: orbA.x, y: orbA.y }]; }
      tryDrag(px, py);
      demo.gx = px; demo.gy = py;
    } else {
      if (dragging) tryEnd(demo.gx, demo.gy);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (orbA === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(roundIdx + ' / ' + TOTAL, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - roundIdx) + '本!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(roundIdx, { wires: roundIdx, total: TOTAL });
        else game.end.failure({ wires: roundIdx, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= ROUND_TIME) {
        failRound(orbB.x, orbB.y, 'MISS');
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(true);

    txt(roundIdx + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    var barPct = Math.max(0, 1 - roundClock / ROUND_TIME);
    game.draw.rect(60, 150, W - 120, 16, '#050506', 1);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.3], ['G3', 0.3], ['B3', 0.3], ['E4', 0.6]], { tempo: 104, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
