// J-N6434-0035-acorn-raft-lob.js
// どんぐり投げ込み便 — 揺れる枝の上から放物線でどんぐりを放り、川を行き来するいかだの籠に落とし込む
// 操作: タップでどんぐりを投げる。点線の放物線と着地点を読み、いかだが着地点に来るよう先回りして投げる(社内メモ。画面には出さない)
// 終わり: 8個のどんぐりのうち5個を籠に入れれば成功。どんぐり切れ/時間切れで失敗
// @mechanic: trajectory
// @theme: acorn_raft_delivery
// 世界観: 川べりの大木に住むリスの配達係が、揺れる枝の上から放物線を読んでどんぐりを放り、行き来する冬支度いかだの籠へ届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 籠に入れた数・ど真ん中(PERFECT)数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = { bg: ['#4fd1ff', '#9ff0ff', '#2bd46b'], main: ['#ff9f1a', '#7a3d12', '#1b1b2f'], accent: ['#ffe600', '#ff3b5c'] };
  var C = { sky1: STYLE.bg[0], sky2: STYLE.bg[1], grass: STYLE.bg[2], orange: STYLE.main[0], bark: STYLE.main[1], ink: STYLE.main[2], yellow: STYLE.accent[0], red: STYLE.accent[1], white: '#ffffff', river: '#1f8cff', river2: '#0f5fd0', leaf: '#23b04f' };

  var GAME_TITLE = 'ACORN LOB';
  var TIME_LIMIT = 16;
  var NEEDED = 5;
  var NUTS = 8;
  var GRAV = 2200, SPEED = 760, BASE_ANG = -0.74;
  var LAND_Y = H * 0.62;
  var BASKET_HALF = 78, PERFECT_HALF = 24;
  var RELOAD = 0.45;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var SQ_A = ['..##.....', '.####..##', '#o###.###', '######.##', '.#####.##', '.##.##.#.', '.#...#...'];
  var SQ_B = ['..##.....', '.####....', '#o###..##', '######.##', '.#####.##', '.##.##.##', '..#.#....'];
  var SQ_PAL = { '#': '#e0782a', 'o': '#1b1b2f' };
  var ACORN = ['.##.', '####', '#aa#', '#aa#', '.aa.'];
  var ACORN_PAL = { '#': '#7a3d12', 'a': '#ffb23f' };
  var RAFT = ['.#......#.', '.########.', '.#bbbbbb#.', '.#bbbbbb#.', '##########', 'wwwwwwwwww'];
  var RAFT_PAL = { '#': '#7a3d12', 'b': '#ffcf6a', 'w': '#c8ecff' };
  var BEAVER = ['.##.', '#oo#', '####', '.##.'];

  var nuts, flying, hits, perfects, thrown, timeLeft, ready, hitStop, finished, ok, done, endWait;
  var bx, bv, turnWarn, turnT, reload, sway, misses, lastMissDx, marks, combo;

  function txt(str, x, y, sz, color, align) {
    var o = Math.max(3, sz * 0.08);
    game.draw.text(str, x - o, y, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x + o, y, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y + o, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    nuts = NUTS; flying = []; hits = 0; perfects = 0; thrown = 0; misses = 0; combo = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    bx = W * 0.3; bv = 280; turnWarn = 0; turnT = game.random(2.2, 3.4); reload = 0; sway = 0; lastMissDx = 0; marks = [];
  }

  function launch() {
    var sy = H * 0.3 + Math.sin(sway * 1.7) * 60;
    var ang = BASE_ANG + Math.sin(sway * 1.7 + 0.8) * 0.16;
    return { x: W * 0.16 + 60, y: sy - 40, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED };
  }

  function flightTime(L) {
    var a = GRAV / 2, b = L.vy, c = L.y - LAND_Y;
    return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  }

  function landX() { var L = launch(); return L.x + L.vx * flightTime(L); }

  function basketSpeed() { return 280 + hits * 55; }

  // いかだの未来位置(端での折り返し込み)
  function predictBasket(T) {
    var x = bx, v = bv, t = 0, step = 1 / 60;
    while (t < T) {
      x += v * step;
      if (x < 180) { x = 180; v = Math.abs(v); }
      if (x > W - 140) { x = W - 140; v = -Math.abs(v); }
      t += step;
    }
    return x;
  }

  function throwNut() {
    if (reload > 0 || nuts <= 0 || finished) return false;
    var L = launch();
    flying.push({ x: L.x, y: L.y, vx: L.vx, vy: L.vy, rot: 0 });
    nuts--; thrown++; reload = RELOAD;
    if (state === S.PLAYING) game.audio.play('se_jump', 0.35);
    return true;
  }

  function simulate(dt) {
    sway += dt;
    if (reload > 0) reload -= dt;
    // いかだ: 速くなる+ときどき折り返す(折り返し前に予告)
    turnT -= dt;
    if (turnT <= 0.6 && turnWarn <= 0 && turnT > 0) {
      turnWarn = turnT + 0.05;
      if (state === S.PLAYING) game.audio.tone('B4', 0.06, { wave: 'square', volume: 0.04 });
    }
    if (turnT <= 0) { bv = -bv; turnT = game.random(2.0, 3.2); turnWarn = 0; }
    if (turnWarn > 0) turnWarn -= dt;
    bv = (bv >= 0 ? 1 : -1) * basketSpeed();
    bx += bv * dt;
    if (bx < 180) { bx = 180; bv = Math.abs(bv); }
    if (bx > W - 140) { bx = W - 140; bv = -Math.abs(bv); }
    for (var m = marks.length - 1; m >= 0; m--) { marks[m].t -= dt; if (marks[m].t <= 0) marks.splice(m, 1); }
    for (var i = flying.length - 1; i >= 0; i--) {
      var n = flying[i];
      n.x += n.vx * dt; n.vy += GRAV * dt; n.y += n.vy * dt; n.rot += dt * 12;
      if (n.y >= LAND_Y) {
        flying.splice(i, 1);
        var dx = n.x - bx;
        if (Math.abs(dx) <= BASKET_HALF) {
          var perfect = Math.abs(dx) <= PERFECT_HALF;
          hits++; combo++; if (perfect) perfects++;
          game.feedback.good(bx, LAND_Y - 50, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.yellow : C.white, size: 56, volume: 0.3 });
          game.audio.play('se_coin', 0.3);
          marks.push({ x: n.x, t: 0.6, good: true });
          if (hits === 3 && state === S.PLAYING) {
            game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.yellow, size: 60 });
            game.audio.play('se_milestone', 0.4);
          }
          if (hits >= NEEDED && state === S.PLAYING) { finished = true; ok = true; hitStop = 0.45; }
        } else {
          misses++; combo = 0; lastMissDx = dx;
          marks.push({ x: n.x, t: 0.9, good: false, bx: bx });
          game.feedback.bad(n.x, LAND_Y - 30, { text: 'MISS', shake: 6 });
          game.fx.burst(n.x, LAND_Y + 20, { color: C.white, count: 10, speed: 260 });
        }
      }
    }
    if (state === S.PLAYING && !finished && nuts <= 0 && flying.length === 0 && hits < NEEDED) {
      finished = true; ok = false; hitStop = 0.5;
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.58, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(t * 1.5));
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + t * 30) % (W + 300)) - 150;
      game.draw.circle(cx, 300 + c * 90, 60, C.white, 0.8);
      game.draw.circle(cx + 60, 290 + c * 90, 70, C.white, 0.8);
    }
    // 対岸の草地と川
    game.draw.rect(0, H * 0.54, W, H * 0.06, C.grass);
    game.draw.gradient(H * 0.6, H * 0.76, [C.river, C.river2]);
    for (var w = 0; w < 9; w++) {
      var wx = ((w * 150 + t * 70) % (W + 160)) - 80;
      game.draw.rect(wx, H * 0.64 + (w % 3) * 50 + Math.sin(t * 3 + w) * 5, 80, 10, C.white, 0.45);
    }
    // 手前の岸(親指ゾーン)
    game.draw.gradient(H * 0.76, H, [C.grass, C.leaf]);
    for (var g = 0; g < 12; g++) game.draw.rect(g * 95 + Math.sin(t * 2 + g) * 4, H * 0.76 - 16, 16, 26, C.leaf);
    // 大木と枝
    game.draw.rect(0, 0, 150, H * 0.76, C.bark);
    game.draw.rect(20, 0, 30, H * 0.76, '#8e4b1a');
    var sy = H * 0.3 + Math.sin(sway * 1.7) * 60;
    game.draw.line(120, H * 0.3 - 40, W * 0.16 + 110, sy + 20, C.bark, 36);
    for (var lf = 0; lf < 6; lf++) game.draw.circle(60 + lf * 40, 200 + Math.sin(t * 2 + lf) * 8, 60, C.leaf, 0.9);
  }

  function drawArc() {
    if (state === S.RESULT || finished) return;
    var L = launch();
    var T = flightTime(L);
    var full = hits < 2; // 精度型: 後半は放物線の出だししか見えない
    var upto = full ? T : T * 0.5;
    var n = 16;
    for (var i = 1; i <= n; i++) {
      var tt = upto * i / n;
      var x = L.x + L.vx * tt, y = L.y + L.vy * tt + GRAV * tt * tt / 2;
      game.draw.circle(x, y, 9, C.ink, 0.5);
      game.draw.circle(x, y, 6, C.white, reload > 0 ? 0.3 : 0.9);
    }
    if (full) {
      var lx = L.x + L.vx * T;
      var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 10);
      game.draw.circle(lx, LAND_Y + 10, 34 + pulse * 8, C.yellow, 0.35);
      game.draw.rect(lx - 3, LAND_Y - 20, 6, 50, C.yellow, 0.9);
    }
  }

  function drawActors() {
    var t = game.time.elapsed;
    var sy = H * 0.3 + Math.sin(sway * 1.7) * 60;
    var fr = reload > RELOAD * 0.5 ? SQ_B : SQ_A;
    game.draw.sprite(fr, SQ_PAL, W * 0.16 + 60, sy - 70 + Math.sin(t * 6) * 3, 13, { anchor: 'center' });
    if (reload <= 0 && nuts > 0) game.draw.sprite(ACORN, ACORN_PAL, W * 0.16 + 110, sy - 70, 9, { anchor: 'center' });
    // いかだ(狙う物: 明滅する白縁)
    var ry = LAND_Y + 20 + Math.sin(t * 3) * 6;
    var blink = 0.3 + 0.3 * Math.sin(t * 9);
    game.draw.rect(bx - BASKET_HALF - 10, LAND_Y - 60, (BASKET_HALF + 10) * 2, 8, C.white, blink);
    game.draw.sprite(RAFT, RAFT_PAL, bx, ry, 16, { anchor: 'center' });
    game.draw.sprite(BEAVER, { '#': '#8e4b1a', 'o': C.ink }, bx + (bv > 0 ? -70 : 70), ry - 60, 10, { anchor: 'center' });
    if (turnWarn > 0 && Math.floor(t * 12) % 2 === 0) {
      var ax = bx + (bv > 0 ? 130 : -130);
      game.draw.sprite(bv > 0 ? ['#..', '##.', '###', '##.', '#..'] : ['..#', '.##', '###', '.##', '..#'], { '#': C.red }, ax, ry - 40, 10, { anchor: 'center' });
    }
    for (var i = 0; i < flying.length; i++) {
      var n = flying[i];
      game.draw.circle(n.x, LAND_Y + 30, 16, C.ink, 0.25);
      game.draw.sprite(ACORN, ACORN_PAL, n.x, n.y, 10, { anchor: 'center', flipY: Math.floor(n.rot) % 2 === 0 });
    }
    for (var m = 0; m < marks.length; m++) {
      var mk = marks[m];
      game.draw.circle(mk.x, LAND_Y + 20, 28, mk.good ? C.yellow : C.red, mk.t);
      if (!mk.good) game.draw.line(mk.x, LAND_Y + 20, mk.bx, LAND_Y + 20, C.red, 6);
    }
    if (finished && hitStop > 0) game.draw.circle(bx, LAND_Y, 150, C.white, hitStop * 0.6);
  }

  function drawHud() {
    txt(hits + ' / ' + NEEDED, W / 2, 70, 56, C.white);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 120, bw, 20, C.ink, 0.6);
    game.draw.rect(80, 120, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.red : C.yellow);
    // 残りどんぐり(親指ゾーンの岸に並べる)
    for (var i = 0; i < NUTS; i++) {
      game.draw.sprite(ACORN, ACORN_PAL, 120 + i * 110, H * 0.88, 12, { anchor: 'center', alpha: i < nuts ? 1 : 0.2 });
    }
    if (combo >= 2) txt('x' + combo, W - 100, 190, 48, C.yellow, 'right');
  }

  function drawScene() { drawWorld(); drawArc(); drawActors(); }

  // ── ATTRACT ゴースト実演(実ロジック: 着地点といかだの未来位置が重なる瞬間に投げる→3投目はわざと早投げでMISS) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, n: 0, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.n = 0; }
    simulate(dt);
    if (nuts <= 1) nuts = NUTS;
    var L = launch();
    var T = flightTime(L);
    var err = predictBasket(T) - (L.x + L.vx * T);
    var want = demo.n === 2 ? Math.abs(err - 170) < 30 : Math.abs(err) < 18;
    if (reload <= 0 && flying.length === 0 && want) {
      if (throwNut()) { demo.n++; demo.pressT = 0.2; }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    demo.gx = W * 0.62; demo.gy = H * 0.86;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) { game.audio.play('se_tap', 0.1); return; }
    if (!throwNut()) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(W * 0.16 + 110, H * 0.26, { color: C.orange, count: 4, speed: 100 });
    }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (nuts === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 76, C.yellow);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.13, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.yellow);
      else txt('TAP TO START', W / 2, H * 0.955, 42, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var score = hits * 100 + perfects * 80 + nuts * 30;
        var st = { hits: hits, perfect: perfects, thrown: thrown };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) game.fx.burst(bx, LAND_Y - 40, { color: C.yellow, count: 44, speed: 650 });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.5;
        game.feedback.bad(bx, LAND_Y, { text: 'TIME UP' });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, C.yellow);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 96, ok ? C.yellow : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, C.ink, 0.45);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 100, ok ? C.yellow : C.red);
    txt(hits + ' / ' + NEEDED, W / 2, H * 0.34, 72, C.white);
    txt('PERFECT ' + perfects, W / 2, H * 0.4, 46, C.yellow);
    var score = hits * 100 + perfects * 80 + nuts * 30;
    txt('SCORE ' + score, W / 2, H * 0.46, 50, C.white);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.52, 56, C.yellow);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.52, 42, C.white);
    if (!ok && NEEDED - hits > 0) txt('あと' + (NEEDED - hits) + '個!', W / 2, H * 0.58, 56, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 42, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1]], { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: [['G2', 2], ['D2', 2]] });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
