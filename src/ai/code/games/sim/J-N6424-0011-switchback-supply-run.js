// J-N6424-0011-switchback-supply-run.js
// スイッチバック・サプライラン — つづら折りの山道を荷馬車でなぞり進み、崩れ落ちる岩を片側へ避けて配送所まで届ける
// 操作: 荷馬車から指を離さず、つづら折りの山道の幅からはみ出さないようになぞり進む。落石地点は空いている側へ迂回する
// 終わり: 道を外れず岩にも当たらず配送所まで届ければ成功。道を外れる/岩に当たる/時間切れで失敗
// @mechanic: guide_path
// @theme: mountain_supply_switchback
// 世界観: 山あいの集落を回る荷馬車引きが、つづら折りの山道を踏み外さず、警告と共に崩れる落石を空いた側へ避けながら配送所まで荷を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達距離
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き
  var C = {
    sky: '#7fc9e0', sky2: '#c8e8c0', mtn: '#4a7a4a', mtnDark: '#2f5a30',
    road: '#8a7550', roadDone: '#e0a840', roadEdge: '#5a4a30',
    cart: '#c04030', cartDark: '#7a2418', rock: '#6a5a58', rockWarn: '#e0533f',
    good: '#3fbf6a', bad: '#e0453f', gold: '#ffd24a', ink: '#233018', white: '#ffffff',
  };

  var GAME_TITLE = 'SUPPLY RUN';
  var TIME_LIMIT = 19;
  var HALF = 74;
  var TRIGGER_LEN = 160;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS = [
    { x: W * 0.20, y: H * 0.20 },
    { x: W * 0.80, y: H * 0.30 },
    { x: W * 0.20, y: H * 0.44 },
    { x: W * 0.80, y: H * 0.58 },
    { x: W * 0.22, y: H * 0.72 },
    { x: W * 0.78, y: H * 0.84 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d0 = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d0); TOTAL_LEN += d0;
  }

  function lenAt(frac) {
    var target = TOTAL_LEN * frac, acc = 0;
    for (var k = 1; k < PTS.length; k++) {
      if (target <= acc + SEG_LEN[k - 1]) {
        var t = SEG_LEN[k - 1] > 0 ? (target - acc) / SEG_LEN[k - 1] : 0;
        var ax = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t;
        var ay = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t;
        var nx = -(PTS[k].y - PTS[k - 1].y), ny = (PTS[k].x - PTS[k - 1].x);
        var nl = Math.hypot(nx, ny) || 1;
        return { x: ax, y: ay, nx: nx / nl, ny: ny / nl, len: target };
      }
      acc += SEG_LEN[k - 1];
    }
    return { x: PTS[PTS.length - 1].x, y: PTS[PTS.length - 1].y, nx: 0, ny: 1, len: TOTAL_LEN };
  }

  var ROCK_FRAC = [0.3, 0.55, 0.8];
  function buildRocks() {
    var list = [];
    for (var i = 0; i < ROCK_FRAC.length; i++) {
      var p = lenAt(ROCK_FRAC[i]);
      var side = i % 2 === 0 ? 1 : -1;
      list.push({ x: p.x + p.nx * HALF * 0.55 * side, y: p.y + p.ny * HALF * 0.55 * side, len: p.len, warn: false, r: 40 });
    }
    return list;
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CART = ['.####.', '######', '.#..#.'];
  var DEPOT = ['####', '#..#', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [0.5, C.sky2], [1, C.sky2]]);
    var pulse = 0.03 + 0.02 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    for (var m = 0; m < 4; m++) {
      game.draw.rect(m * W / 4, H * 0.02, W / 4 - 6, 90, m % 2 === 0 ? C.mtn : C.mtnDark, 0.6);
    }
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var ax = PTS[i - 1].x, ay = PTS[i - 1].y, bx = PTS[i].x, by = PTS[i].y;
      var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
      var len2 = vx * vx + vy * vy;
      var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
      var cx = ax + vx * t, cy = ay + vy * t;
      var dist = Math.hypot(px - cx, py - cy);
      if (dist < best) { best = dist; bestLen = acc + t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function drawRoad(prog) {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.road, HALF * 2);
    }
    var acc2 = 0;
    for (var k = 1; k < PTS.length; k++) {
      var segStart = acc2, segEnd = acc2 + SEG_LEN[k - 1];
      if (prog > segStart) {
        var t2 = Math.min(1, (prog - segStart) / SEG_LEN[k - 1]);
        var ex = PTS[k - 1].x + (PTS[k].x - PTS[k - 1].x) * t2;
        var ey = PTS[k - 1].y + (PTS[k].y - PTS[k - 1].y) * t2;
        game.draw.line(PTS[k - 1].x, PTS[k - 1].y, ex, ey, C.roadDone, 14);
      }
      acc2 = segEnd;
    }
    game.draw.sprite(DEPOT, { '#': C.gold }, PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, 16, { anchor: 'center' });
    for (var r = 0; r < rocks.length; r++) {
      var rk = rocks[r];
      if (rk.cleared) continue;
      var col = rk.warn ? C.rockWarn : C.rock;
      game.draw.circle(rk.x, rk.y, rk.r, col, rk.warn ? 0.95 : 0.85);
      if (rk.warn) {
        var a = 0.4 + 0.4 * Math.sin(game.time.elapsed * 16);
        game.draw.circle(rk.x, rk.y, rk.r + 16, C.rockWarn, a * 0.4);
      }
    }
  }

  var progress, cursorX, cursorY, rocks, done, endWait, finished, ready, hitStop, shake, halfHit;

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    rocks = buildRocks(); halfHit = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function crash(x, y, kind) {
    ok = false; finished = true; hitStop = 0.3; shake = 0.25;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function onDrag(x, y) {
    if (finished || ready > 0) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) { crash(x, y, 'off'); return; }
    for (var i = 0; i < rocks.length; i++) {
      var rk = rocks[i];
      if (rk.cleared) continue;
      if (game.hit.circle(x, y, 30, rk.x, rk.y, rk.r - 6)) { crash(x, y, 'rock'); return; }
      if (r.len > rk.len + 10) rk.cleared = true;
    }
    if (r.len > progress) {
      if (!halfHit && r.len > TOTAL_LEN * 0.5) {
        halfHit = true;
        game.fx.popup('NICE', x, y - 70, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      progress = r.len;
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 16) {
      ok = true; finished = true; hitStop = 0.25;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 22, speed: 400 });
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
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
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
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var target = Math.min(TOTAL_LEN, (cyc / 4.8) * TOTAL_LEN);
    var info = lenAt(target / TOTAL_LEN);
    var dodge = 0;
    for (var i = 0; i < rocks.length; i++) {
      var rk = rocks[i];
      if (!rk.cleared && Math.abs(target - rk.len) < 120) {
        rk.warn = true;
        dodge = rk.x > info.x ? -1 : 1;
      }
      if (!rk.cleared && target > rk.len + 10) rk.cleared = true;
    }
    var px = info.x + info.nx * HALF * 0.5 * dodge;
    var py = info.y + info.ny * HALF * 0.5 * dodge;
    demo.gx = px; demo.gy = py; demo.press = cyc < 4.8;
    if (target > progress) progress = target;
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRoad(progress);
      game.draw.circle(cursorX, cursorY, 14, C.cartDark);
      game.draw.sprite(CART, { '#': C.cart }, cursorX, cursorY, 10, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 22, C.mtnDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.mtnDark);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRoad(progress);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.14, 28, C.mtnDark);
      if (!ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctF = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pctF, { progressPct: pctF });
        else game.end.failure({ progressPct: pctF });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var timeLeft = TIME_LIMIT - game.time.elapsed;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(cursorX, cursorY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRoad(progress);
    if (!finished) {
      game.draw.circle(cursorX, cursorY, 14, C.cartDark);
      game.draw.sprite(CART, { '#': C.cart }, cursorX, cursorY, 10, { anchor: 'center' });
    }

    var pctNow = Math.round((progress / TOTAL_LEN) * 100);
    txt(pctNow + ' / ' + 100, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = (TIME_LIMIT - game.time.elapsed) < 3;
    game.draw.rect(60, 150, tbW, 16, '#5a4a30', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, (TIME_LIMIT - game.time.elapsed) / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.3], ['A3', 0.3], ['C4', 0.3], ['F4', 0.5]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
