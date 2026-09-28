// J-N6434-0032-burrow-drill-dash.js
// 地底掘削ダッシュ — 上下にこすってドリルを回し、指の横位置で舵を切って岩盤の割れ目をくぐり、源泉まで掘り抜く
// 操作: 画面を上下に素早くこすると掘り進む。こすっている指の左右位置へ掘削車が寄る(社内メモ。画面には出さない)
// 終わり: 源泉の深さまで掘り抜けば成功。岩盤に3回ぶつかる/時間切れで失敗
// @mechanic: rub
// @theme: underground_spring_drill
// 世界観: 地底温泉組合の見習い運転士が、手回しドリルの掘削車で硬い岩盤の割れ目を縫い、制限時間内に源泉の湯脈まで一番乗りで掘り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 掘った深さ・拾った鉱石数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドットの絵 + 地層ごとのカラーセロハン帯
  var STYLE = { bg: ['#0e0c10', '#1b1620', '#2a2228'], main: ['#f2f2ea', '#bdbdb4', '#5c5a58'], accent: ['#ffb238', '#ff4a4a'] };
  var C = { dark: STYLE.bg[0], dark2: STYLE.bg[1], dark3: STYLE.bg[2], white: STYLE.main[0], grey: STYLE.main[1], dim: STYLE.main[2], amber: STYLE.accent[0], red: STYLE.accent[1], cyan: '#57e0d8', green: '#8cf06a' };
  var BANDS = ['#ffb238', '#8cf06a', '#57e0d8', '#c78cff'];

  var GAME_TITLE = 'BURROW DRILL';
  var TIME_LIMIT = 14;
  var GOAL = 3600;
  var LIVES = 3;
  var IMPULSE = 52;
  var DRILL_Y = H * 0.33;
  var TIP = 70;
  var HALF_W = 52;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CART_A = ['..####..', '.#o##o#.', '########', '#.####.#', '.######.', '..####..', '...##...', '...#....'];
  var CART_B = ['..####..', '.#o##o#.', '########', '#.####.#', '.######.', '..####..', '...##...', '....#...'];
  var CART_PAL = { '#': '#f2f2ea', 'o': '#ffb238' };
  var ROCK = ['.####.', '######', '##.###', '######'];
  var GEM = ['.#.', '###', '.#.'];
  var BIT = ['###', '.#.'];

  var depth, digVel, drillX, steerX, lastY, rubDir, strokeLen, strokes, spin;
  var slabs, gems, gemsGot, lives, timeLeft, ready, stall, stallSlab, hitStop, finished, ok, done, endWait, passedCount, dust;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    depth = 0; digVel = 0; drillX = W / 2; steerX = W / 2; lastY = null; rubDir = 0; strokeLen = 0; strokes = 0; spin = 0;
    lives = LIVES; timeLeft = TIME_LIMIT; ready = 0.8; stall = 0; stallSlab = null; hitStop = 0;
    finished = false; ok = false; done = false; endWait = 0; passedCount = 0; gemsGot = 0; dust = [];
    slabs = []; gems = [];
    var prev = W / 2;
    var d = 720;
    for (var i = 0; i < 6; i++) {
      var gx;
      var guard = 0;
      do { gx = game.random(230, W - 230); guard++; } while (Math.abs(gx - prev) < 320 && guard < 30);
      slabs.push({ d: d, gx: gx, gw: 330, passed: false, hit: false, flash: 0, idx: i });
      gems.push({ d: d - 260, x: (gx + prev) / 2 + game.random(-60, 60), got: false });
      prev = gx;
      d += 480;
    }
  }

  function scrY(worldD) { return DRILL_Y + (worldD - depth); }

  function stroke() {
    strokes++;
    digVel = Math.min(760, digVel + IMPULSE);
    spin += 1;
    dust.push({ x: drillX + game.random(-40, 40), y: DRILL_Y + TIP, vx: game.random(-160, 160), vy: game.random(-260, -80), life: 0.5 });
    if (state === S.PLAYING) game.audio.tone(strokes % 2 ? 'C3' : 'G2', 0.05, { wave: 'sawtooth', volume: 0.05 });
  }

  function rubInput(x, y) {
    steerX = x;
    if (lastY === null) { lastY = y; return; }
    var dy = y - lastY;
    if (Math.abs(dy) < 2) return;
    var dir = dy > 0 ? 1 : -1;
    if (dir !== rubDir) {
      if (strokeLen > 45) stroke();
      rubDir = dir; strokeLen = 0;
    }
    strokeLen += Math.abs(dy);
    if (strokeLen > 240) { stroke(); strokeLen = 0; }
    lastY = y;
  }

  function nextSlab() {
    for (var i = 0; i < slabs.length; i++) if (!slabs[i].passed) return slabs[i];
    return null;
  }

  function simulate(dt) {
    for (var q = dust.length - 1; q >= 0; q--) {
      var p = dust[q]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt;
      if (p.life <= 0) dust.splice(q, 1);
    }
    for (var f = 0; f < slabs.length; f++) if (slabs[f].flash > 0) slabs[f].flash -= dt;
    if (stall > 0) { stall -= dt; return; }
    digVel *= Math.pow(0.5, dt); // retain 0.5/秒
    drillX += (steerX - drillX) * Math.min(1, dt * 4);
    drillX = Math.max(HALF_W + 20, Math.min(W - HALF_W - 20, drillX));
    var prevD = depth;
    depth += digVel * dt;
    for (var i = 0; i < slabs.length; i++) {
      var s = slabs[i];
      if (s.passed) continue;
      if (prevD + TIP < s.d && depth + TIP >= s.d) {
        if (Math.abs(drillX - s.gx) <= s.gw / 2 - HALF_W) {
          s.passed = true; passedCount++;
          game.feedback.good(drillX, DRILL_Y + 40, { text: 'NICE', color: C.green, size: 48, volume: 0.25 });
          if (passedCount === 3 && state === S.PLAYING) {
            game.fx.popup(Math.floor(depth / 10) + 'm', W / 2, H * 0.22, { color: C.amber, size: 60 });
            game.audio.play('se_milestone', 0.4);
          }
        } else {
          s.flash = 0.6; s.hit = true;
          depth = s.d - TIP - 110; digVel = 0; stall = 0.4; stallSlab = s;
          lives--;
          game.feedback.bad(drillX, DRILL_Y + TIP, { text: 'MISS', shake: 14 });
          game.audio.play('se_break', 0.35);
          if (lives <= 0) { finished = true; ok = false; hitStop = 0.55; }
          return;
        }
      }
    }
    for (var g = 0; g < gems.length; g++) {
      var gm = gems[g];
      if (!gm.got && Math.abs(gm.d - (depth + TIP * 0.5)) < 60 && Math.abs(gm.x - drillX) < 90) {
        gm.got = true; gemsGot++;
        game.audio.play('se_coin', 0.3);
        game.fx.burst(gm.x, scrY(gm.d), { color: C.cyan, count: 10, speed: 260 });
      }
    }
    if (depth >= GOAL && !finished) {
      depth = GOAL; finished = true; ok = true; hitStop = 0.5;
      game.feedback.good(drillX, DRILL_Y + TIP, { text: 'CLEAR', color: C.amber, size: 64 });
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.dark3], [0.5, C.dark2], [1, C.dark]]);
    game.draw.rect(0, 0, W, H, C.amber, 0.025 + 0.025 * Math.sin(t * 1.2));
    // 地層ごとのセロハン帯(深さで色が変わる)
    for (var y = 230; y < H * 0.78; y += 48) {
      var wd = depth + (y - DRILL_Y);
      if (wd < 0) { game.draw.rect(0, y, W, 48, '#3b4a66', 0.5); continue; }
      var band = BANDS[Math.floor(wd / 900) % BANDS.length];
      game.draw.rect(0, y, W, 48, band, 0.12 + 0.05 * ((Math.floor(wd / 48) % 2)));
      for (var k = 0; k < 6; k++) {
        var dx = ((k * 197 + Math.floor(wd / 48) * 131) % W);
        game.draw.circle(dx, y + 24, 3, C.grey, 0.5);
      }
    }
    // 地表(深さ0)
    var sy = scrY(0);
    if (sy > 230) {
      game.draw.rect(0, sy - 12, W, 12, C.green);
      for (var h = 0; h < 5; h++) game.draw.sprite(['.#.', '###', '.#.'], { '#': C.green }, 120 + h * 200 + Math.sin(t * 2 + h) * 6, sy - 60, 10);
    }
    // 源泉(ゴール、常に深さメーターで見える / 近づくと光る湯脈)
    var gy = scrY(GOAL + TIP);
    if (gy < H * 0.8) {
      game.draw.rect(0, gy, W, 120, C.cyan, 0.35 + 0.2 * Math.sin(t * 5));
      for (var b = 0; b < 8; b++) game.draw.circle(80 + b * 130, gy + 30 + Math.sin(t * 4 + b) * 16, 12, C.white, 0.7);
    }
    // 岩盤(危険物: 赤系+トゲ。近づいて位置がずれていれば点滅で予告)
    for (var i = 0; i < slabs.length; i++) {
      var s = slabs[i];
      var y0 = scrY(s.d);
      if (y0 < 180 || y0 > H * 0.8) continue;
      var near = !s.passed && s.d - (depth + TIP) < 320 && Math.abs(drillX - s.gx) > s.gw / 2 - HALF_W;
      var warn = near && Math.floor(t * 10) % 2 === 0;
      var col = s.flash > 0 ? C.white : (warn ? C.red : C.grey);
      var left = s.gx - s.gw / 2, right = s.gx + s.gw / 2;
      for (var x = 0; x < left; x += 72) game.draw.sprite(ROCK, { '#': col }, x, y0, 12);
      for (var x2 = right; x2 < W; x2 += 72) game.draw.sprite(ROCK, { '#': col }, x2, y0, 12);
      for (var sp = 0; sp < W; sp += 72) {
        if (sp + 36 > left && sp + 36 < right) continue;
        game.draw.sprite(['#.#.#.', '######'], { '#': warn ? C.red : C.dim }, sp, y0 - 14, 12);
      }
      if (s.flash > 0) game.draw.rect(0, y0 - 20, W, 70, '#ffffff', s.flash * 0.6);
      // 割れ目(通り道): 明滅する白縁
      var glow = 0.25 + 0.25 * Math.sin(t * 8);
      game.draw.rect(left + 6, y0, 6, 48, C.white, glow);
      game.draw.rect(right - 12, y0, 6, 48, C.white, glow);
    }
    for (var g = 0; g < gems.length; g++) {
      var gm = gems[g];
      if (gm.got) continue;
      var gyy = scrY(gm.d);
      if (gyy < 200 || gyy > H * 0.8) continue;
      game.draw.sprite(GEM, { '#': C.cyan }, gm.x, gyy + Math.sin(t * 4 + g) * 6, 14, { anchor: 'center' });
    }
    // 掘ったトンネル
    game.draw.rect(drillX - 40, Math.max(230, scrY(0)), 80, Math.max(0, DRILL_Y - Math.max(230, scrY(0))), '#000000', 0.35);
  }

  function drawDrill() {
    var t = game.time.elapsed;
    var wob = Math.sin(t * 7) * 3 + (stall > 0 ? Math.sin(t * 60) * 10 : 0);
    var frame = Math.floor(spin) % 2 === 0 ? CART_A : CART_B;
    game.draw.sprite(frame, CART_PAL, drillX + wob, DRILL_Y + Math.cos(t * 5) * 3, 17, { anchor: 'center' });
    var bitCol = Math.floor(spin + t * digVel * 0.02) % 2 === 0 ? C.amber : C.white;
    game.draw.sprite(BIT, { '#': bitCol }, drillX + wob, DRILL_Y + TIP + 4, 20, { anchor: 'center' });
    for (var i = 0; i < dust.length; i++) game.draw.circle(dust[i].x, dust[i].y, 8, C.amber, Math.max(0, dust[i].life * 2));
    if (finished && hitStop > 0) {
      game.draw.circle(drillX, DRILL_Y + 20, 110 + Math.sin(t * 30) * 10, '#ffffff', 0.3);
    }
  }

  function drawPad() {
    // 親指ゾーン: こする板(ストロークで上下の目盛りが点灯)
    var t = game.time.elapsed;
    var y0 = H * 0.8, h = H * 0.15;
    game.draw.rect(60, y0, W - 120, h, C.dark3, 0.9);
    game.draw.rect(60, y0, W - 120, 8, C.amber, 0.5);
    var lit = Math.min(1, digVel / 500);
    for (var i = 0; i < 9; i++) {
      var on = i / 9 < lit;
      game.draw.rect(120 + i * 100, y0 + 40, 70, h - 80, on ? C.amber : C.dim, on ? 0.8 : 0.3);
    }
    var ay = Math.sin(t * 10) * 22;
    game.draw.sprite(['..#..', '.###.', '#####'], { '#': C.white }, W / 2, y0 + h * 0.3 + ay, 10, { anchor: 'center', alpha: 0.6 });
    game.draw.sprite(['#####', '.###.', '..#..'], { '#': C.white }, W / 2, y0 + h * 0.72 - ay, 10, { anchor: 'center', alpha: 0.6 });
  }

  function drawHud() {
    txt(Math.floor(depth / 10) + 'm', 70, 70, 52, C.white, 'left');
    txt(Math.floor(GOAL / 10) + 'm', W - 70, 70, 36, C.cyan, 'right');
    var bw = W - 140;
    game.draw.rect(70, 118, bw, 18, C.dim, 0.7);
    game.draw.rect(70, 118, bw * Math.min(1, depth / GOAL), 18, C.cyan);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 150, bw, 12, C.dim, 0.7);
    game.draw.rect(70, 150, bw * Math.max(0, timeLeft / TIME_LIMIT), 12, low ? C.red : C.amber);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BIT, { '#': i < lives ? C.amber : C.dim }, 100 + i * 70, 200, 12, { anchor: 'center' });
    txt('x' + gemsGot, W - 90, 200, 34, C.cyan, 'right');
    game.draw.sprite(GEM, { '#': C.cyan }, W - 190, 200, 9, { anchor: 'center' });
  }

  function drawScene() { drawWorld(); drawDrill(); drawPad(); }

  // ── ATTRACT ゴースト実演(実ロジック: 上下にこすって掘る→2枚目の岩盤でわざとずれてMISS→割れ目へ修正) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: true, fx: W / 2, hitShown: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.fx = W / 2; demo.hitShown = false; lastY = null; }
    var s = nextSlab();
    var tx = W / 2;
    if (s) {
      tx = s.gx;
      if (s.idx === 1 && !demo.hitShown) tx = s.gx + (s.gx > W / 2 ? -300 : 300);
      if (s.hit) demo.hitShown = true;
    }
    demo.fx += (tx - demo.fx) * Math.min(1, dt * 3.5);
    var fy = H * 0.87 + Math.sin(demo.t * Math.PI * 6) * 110;
    rubInput(demo.fx, fy);
    simulate(dt);
    if (lives < 1) lives = 1;
    finished = false;
    demo.gx = demo.fx; demo.gy = fy;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    // こすらずに叩いただけ: 手応えは返すが掘れない
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: C.dim, count: 4, speed: 120 });
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    lastY = y; rubDir = 0; strokeLen = 0; steerX = x;
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var before = strokes;
    rubInput(x, y);
    if (strokes > before && strokes % 10 === 0) game.fx.popup('x' + strokes, x, y - 60, { color: C.amber, size: 34 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    lastY = null;
    if (!finished && ready <= 0) game.audio.tone('E2', 0.06, { wave: 'triangle', volume: 0.04 });
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (depth === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07, 66, C.amber);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 36, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.amber);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var score = Math.floor(depth / 10) + gemsGot * 50 + (ok ? Math.ceil(timeLeft) * 20 : 0);
        var st = { depth: Math.floor(depth / 10), gems: gemsGot, hits: LIVES - lives };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) game.fx.burst(drillX, DRILL_Y + 80, { color: C.cyan, count: 40, speed: 600 });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.5;
        game.feedback.bad(drillX, DRILL_Y, { text: 'TIME UP' });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, C.amber);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.5, 90, ok ? C.cyan : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, '#000000', 0.5);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, ok ? C.cyan : C.red);
    txt(Math.floor(depth / 10) + 'm', W / 2, H * 0.34, 72, C.white);
    txt('x' + gemsGot, W / 2, H * 0.4, 48, C.cyan);
    var score = Math.floor(depth / 10) + gemsGot * 50 + (ok ? Math.ceil(timeLeft) * 20 : 0);
    txt('SCORE ' + score, W / 2, H * 0.46, 48, C.amber);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.52, 52, C.green);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.52, 40, C.white);
    if (!ok) txt('あと' + Math.max(1, Math.ceil((GOAL - depth) / 10)) + 'm!', W / 2, H * 0.58, 52, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['A2', 0.5], ['A2', 0.5], ['C3', 0.5], ['E3', 0.5], ['D3', 0.5], ['C3', 0.5], ['A2', 1]], { tempo: 150, wave: 'sawtooth', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
