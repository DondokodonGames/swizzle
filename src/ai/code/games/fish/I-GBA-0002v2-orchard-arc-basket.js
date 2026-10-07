// I-GBA-0002v2-orchard-arc-basket.js
// オーチャードアーク — 枝から弾け飛ぶ林檎の放物線を読み、落ちる先へかごを先回りさせて受け止める
// 操作: 地面のどこかをタップすると、かごを持った子がその位置へ走る。林檎が弾けた直後の弧から着地点を読んで早めに向かわせる
// 終わり: 10個すべて受け止めれば成功。1個でも地面に落とす/時間切れで失敗
// @mechanic: trajectory
// @theme: orchard_harvest_arc
// 世界観: 果樹園の収穫祭で、脚立の下に立つ手伝いの子が、揺すられた枝から弾け飛ぶ林檎の落ちる先を弧の出だしで読み、かごを構えて先回りする
// 残るもの: 正誤(CLEAR/GAME OVER) + 受け止めた数と中心キャッチ数
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 90s HANDHELD COLOR: 低彩度・少色、太い形、密度を抑える
  var STYLE = { bg: ['#9cb38a', '#d8d9a8', '#7a8f5c'], main: ['#c8553d', '#4f6b3a', '#f2e8c9'], accent: ['#e8b04a', '#3b3a36'] };
  var DARK = STYLE.accent[1];

  var GROUND = H * 0.72;
  var CATCH_Y = GROUND - 150;
  var GRAV = 2100;
  var APPLES = 10;
  var TIME_LIMIT = 20;
  var RUN_SPEED = 1050;
  var BASKET_HALF = 78;

  var BRANCHES = [{ x: W * 0.18, y: H * 0.30 }, { x: W * 0.42, y: H * 0.25 }, { x: W * 0.64, y: H * 0.29 }, { x: W * 0.86, y: H * 0.26 }];

  var KID_A = ['..###..', '..#e#..', '...#...', '.#####.', '#.###.#', '..###..', '..#.#..', '.##.##.'];
  var KID_B = ['..###..', '..#e#..', '...#...', '.#####.', '#.###.#', '..###..', '.#...#.', '##...##'];
  var KID_PAL = { '#': STYLE.accent[1], 'e': STYLE.main[2] };
  var BASKET = ['#########', '#.#.#.#.#', '.#.#.#.#.', '..#####..'];
  var BASKET_PAL = { '#': '#8a6a3a' };
  var APPLE = ['...#.', '.##g.', '#####', '#####', '.###.'];
  var APPLE_PAL = { '#': STYLE.main[0], 'g': STYLE.main[1] };
  var APPLE_GOLD = { '#': STYLE.accent[0], 'g': STYLE.main[1] };
  var APPLE_HL = { '#': '#ffffff', 'g': '#ffffff' };
  var LADDER = ['#...#', '#####', '#...#', '#...#', '#####', '#...#', '#...#', '#####', '#...#'];

  var scr = 'ATTRACT';
  var o;

  function blank() {
    return {
      kidX: W * 0.5, goalX: W * 0.5, stride: 0, apples: [], shaking: null, shakeT: 0,
      thrown: 0, caught: 0, centers: 0, wait: 0.5, left: TIME_LIMIT, intro: 0.8,
      halt: 0, culprit: null, lost: false, win: false, wind: 0, marker: 0,
    };
  }

  // 目標の着地点から、打ち出し速度を逆算する(風=横加速度込み)
  function launchToward(br, landX, flight, ax) {
    var vx = (landX - br.x - 0.5 * ax * flight * flight) / flight;
    var vy = (CATCH_Y - br.y - 0.5 * GRAV * flight * flight) / flight;
    return { x: br.x, y: br.y, vx: vx, vy: vy, ax: ax, t: 0, landX: landX, flight: flight, gold: (o.thrown % 5) === 4, done: false };
  }

  function chooseShake() {
    var i = Math.floor(game.random(0, BRANCHES.length));
    o.shaking = BRANCHES[i];
    o.shakeT = 0.6;
    game.audio.tone('D4', 0.12, { wave: 'triangle', volume: 0.06 });
  }

  function release() {
    var n = o.thrown;
    var landX;
    var need = Math.min(340, 200 + n * 20), tries = 0;
    do { landX = game.random(W * 0.1, W * 0.9); tries++; } while (Math.abs(landX - o.kidX) < need && tries < 40);
    o.wind = n >= 5 ? (n % 2 === 0 ? 1 : -1) * game.random(250, 520) : 0;
    var flight = Math.max(0.9, 1.35 - n * 0.05);
    o.apples.push(launchToward(o.shaking, landX, flight, o.wind));
    o.thrown++;
    o.shaking = null;
    game.audio.play('se_jump', 0.25);
  }

  function aim(x) {
    o.goalX = Math.max(W * 0.08, Math.min(W * 0.92, x));
    o.marker = 0.3;
  }

  function land(a) {
    a.done = true;
    var off = Math.abs(a.x - o.kidX);
    if (off > BASKET_HALF + 14) {
      o.lost = true; o.halt = 0.5; o.culprit = a;
      o.missBy = Math.round(off - BASKET_HALF);
      game.fx.flash('#ffffff', 0.12);
      game.audio.play('se_break', 0.4);
      return;
    }
    o.caught++;
    var center = off < 28;
    if (center) o.centers++;
    game.feedback.good(o.kidX, GROUND - 170, { text: center ? 'PERFECT' : 'GOOD', color: center ? STYLE.accent[0] : STYLE.main[2], size: 46 });
    if (a.gold) { game.audio.play('se_coin', 0.45); game.fx.burst(o.kidX, GROUND - 110, { color: STYLE.accent[0], count: 20, speed: 380 }); }
    if (o.caught === APPLES / 2) { game.fx.popup(o.caught + ' / ' + APPLES, W / 2, H * 0.2, { color: STYLE.main[2], size: 50 }); game.audio.play('se_milestone', 0.4); }
    if (o.caught >= APPLES) { o.win = true; o.halt = 0.5; }
  }

  function simulate(dt) {
    o.left -= dt;
    var dx = o.goalX - o.kidX;
    var stepPx = RUN_SPEED * dt;
    if (Math.abs(dx) <= stepPx) o.kidX = o.goalX; else { o.kidX += dx > 0 ? stepPx : -stepPx; o.stride += dt; }
    if (o.marker > 0) o.marker -= dt;
    if (o.shaking) { o.shakeT -= dt; if (o.shakeT <= 0) release(); }
    else if (o.thrown < APPLES && o.apples.every(function (q) { return q.t > q.flight * 0.55; })) { o.wait -= dt; if (o.wait <= 0) { chooseShake(); o.wait = Math.max(0.15, 0.45 - o.thrown * 0.03); } }
    for (var i = 0; i < o.apples.length; i++) {
      var a = o.apples[i];
      a.t += dt;
      a.vx += a.ax * dt;
      a.vy += GRAV * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.vy > 0 && a.y >= CATCH_Y) { a.y = CATCH_Y; land(a); if (o.lost) return; }
    }
    o.apples = o.apples.filter(function (q) { return !q.done; });
    if (o.left <= 0 && !o.win) { o.left = 0; o.lost = true; o.halt = 0.5; o.culprit = o.apples[0] || null; o.missBy = 0; }
  }

  function conclude() {
    var stats = { caught: o.caught, total: APPLES, center: o.centers };
    if (o.win) {
      game.feedback.good(o.kidX, GROUND - 200, { text: 'CLEAR', color: STYLE.accent[0], size: 64 });
      game.audio.play('se_success', 0.6);
      game.end.success(o.caught * 100 + o.centers * 40, stats);
    } else {
      var bx = o.culprit ? o.culprit.x : o.kidX;
      game.feedback.bad(bx, GROUND - 60, { text: 'MISS', size: 58 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    scr = 'RESULT';
  }

  // ── 描画 ──────────────────────────────
  function scenery() {
    var t = game.time.elapsed;
    game.draw.gradient(0, GROUND, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.circle(W * 0.82, H * 0.1, 70, '#f2e8c9', 0.6 + 0.1 * Math.sin(t * 1.3));
    for (var h = 0; h < 5; h++) game.draw.circle(W * (h * 0.25), H * 0.50, 180, '#8aa278', 0.6);
    game.draw.rect(0, GROUND, W, H - GROUND, STYLE.bg[2]);
    for (var s = 0; s < 6; s++) game.draw.rect(0, GROUND + s * 70, W, 8, '#6b7f4f', 0.5);
    // 幹と樹冠(太い形)
    game.draw.rect(W * 0.46, H * 0.28, 70, GROUND - H * 0.28, '#6b5033');
    var sway = Math.sin(t * 1.6) * 8;
    for (var c = 0; c < 7; c++) game.draw.circle(W * (0.06 + c * 0.148) + sway, H * 0.22 + (c % 2) * 40, 150, STYLE.main[1], 0.95);
    for (var b = 0; b < BRANCHES.length; b++) {
      var br = BRANCHES[b];
      var jig = (o.shaking === br) ? Math.sin(t * 60) * 12 : 0;
      game.draw.line(W * 0.5, br.y + 60, br.x + jig, br.y, '#6b5033', 16);
      if (o.shaking === br) game.draw.circle(br.x + jig, br.y, 60 + 30 * (1 - o.shakeT / 0.6), STYLE.accent[0], 0.35);
      game.draw.sprite(APPLE, APPLE_PAL, br.x + jig, br.y + 26, 8, { anchor: 'center' });
    }
    game.draw.sprite(LADDER, { '#': '#a88a5a' }, W * 0.33, GROUND - 150, 18, { anchor: 'center' });
    // 風(吹き流し)
    if (o.wind !== 0) {
      var dir = o.wind > 0 ? 1 : -1;
      for (var l = 0; l < 4; l++) {
        var lx = ((t * 300 * dir + l * 290) % W + W) % W;
        game.draw.line(lx, H * 0.44 + l * 30, lx + dir * 60, H * 0.44 + l * 30, '#f2e8c9', 5);
      }
    }
  }

  function fruit(a, hl) {
    game.draw.circle(a.x, GROUND + 6, 26 + (a.y / GROUND) * 16, '#000000', 0.18);
    game.draw.sprite(APPLE, hl ? APPLE_HL : (a.gold ? APPLE_GOLD : APPLE_PAL), a.x, a.y, hl ? 20 : 13, { anchor: 'center' });
  }

  function helper() {
    var run = o.kidX !== o.goalX;
    var frame = run && Math.floor(o.stride * 10) % 2 ? KID_B : KID_A;
    var bob = Math.sin(game.time.elapsed * 4) * 4;
    game.draw.circle(o.kidX, GROUND + 10, 70, '#000000', 0.2);
    game.draw.sprite(frame, KID_PAL, o.kidX, GROUND - 60 + bob, 16, { anchor: 'center', flipX: o.goalX < o.kidX });
    game.draw.sprite(BASKET, BASKET_PAL, o.kidX, GROUND - 150 + bob, 18, { anchor: 'center' });
    if (o.marker > 0) game.draw.circle(o.goalX, GROUND + 8, 40 * (1 - o.marker / 0.3) + 12, STYLE.main[2], 0.6);
  }

  function thumbZone() {
    game.draw.rect(0, H * 0.8, W, H * 0.2, DARK, 0.25);
    game.draw.line(W * 0.08, H * 0.86, W * 0.92, H * 0.86, STYLE.main[2], 4);
    game.draw.circle(W * 0.08 + (o.kidX - W * 0.08), H * 0.86, 22, STYLE.accent[0]);
  }

  function write(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: DARK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function scene() {
    scenery();
    for (var i = 0; i < o.apples.length; i++) fruit(o.apples[i], false);
    if (o.halt > 0 && o.culprit) fruit(o.culprit, true);
    helper();
    thumbZone();
  }

  // ── ATTRACT: 本物のsimulateを走らせ、ボットが着地点を読んでタップ ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: 0, read: null, round: 0 };
  function demoRun(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { o = blank(); o.intro = 0; o.wait = 0.1; demo.read = null; demo.round = 0; demo.told = false; }
    if (demo.press > 0) demo.press -= dt;
    if (o.lost || o.win) {
      if (o.lost && !demo.told) { demo.told = true; game.feedback.bad(o.culprit ? o.culprit.x : o.kidX, CATCH_Y, { text: 'MISS', size: 50 }); }
      o.halt -= dt; return;
    }
    simulate(dt);
    var a = o.apples[o.apples.length - 1];
    if (a && demo.read !== a && a.t > 0.18) {
      demo.read = a;
      demo.round++;
      var guess = demo.round === 1 ? a.landX : a.landX + (a.landX > W / 2 ? -260 : 260);
      demo.gx = guess; demo.gy = H * 0.86; demo.press = 0.25;
      aim(guess);
      game.audio.play('se_tap', 0.2);
    }
  }

  game.onTap(function (x, y) {
    if (scr === 'ATTRACT') { game.audio.play('se_coin', 0.5); o = blank(); scr = 'PLAYING'; return; }
    if (scr === 'RESULT') { game.audio.play('se_tap', 0.3); scr = 'ATTRACT'; o = blank(); demo.t = 0; return; }
    if (o.intro > 0 || o.halt > 0) return;
    game.audio.play('se_tap', 0.25);
    aim(x);
  });

  game.onUpdate(function (dt) {
    if (!o) o = blank();
    if (scr === 'ATTRACT') {
      demoRun(dt);
      scene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      write('APPLE ARC', W / 2, 90, 66, STYLE.main[2]);
      write('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 165, 34, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.95, 42, STYLE.accent[0]);
      else write('INSERT COIN', W / 2, H * 0.95, 36, STYLE.main[2]);
      return;
    }
    if (scr === 'RESULT') {
      scene();
      game.draw.rect(0, H * 0.3, W, H * 0.28, DARK, 0.78);
      write(o.win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 86, o.win ? STYLE.accent[0] : STYLE.main[0]);
      write(o.caught + ' / ' + APPLES, W / 2, H * 0.43, 52, STYLE.main[2]);
      write('PERFECT ' + o.centers, W / 2, H * 0.475, 38, STYLE.accent[0]);
      var sc = o.caught * 100 + o.centers * 40;
      if (!o.win) write(o.missBy > 0 ? 'あと' + o.missBy + 'cm!' : 'あと' + (APPLES - o.caught) + '個!', W / 2, H * 0.525, 46, STYLE.main[2]);
      else write(sc > game.best ? 'NEW RECORD' : 'BEST ' + game.best, W / 2, H * 0.525, 44, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.95, 36, STYLE.main[2]);
      return;
    }
    if (o.intro > 0) {
      o.intro -= dt;
      if (o.intro <= 0) game.audio.play('se_tap', 0.3);
    } else if (o.halt > 0) {
      o.halt -= dt;
      if (o.halt <= 0) { conclude(); return; }
    } else {
      simulate(dt);
    }
    scene();
    write(o.caught + ' / ' + APPLES, W * 0.22, 70, 46, STYLE.main[2]);
    write('PERFECT ' + o.centers, W * 0.72, 70, 36, STYLE.accent[0]);
    game.draw.rect(60, 150, W - 120, 18, DARK, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, o.left / TIME_LIMIT), 18, o.left < 4 ? STYLE.main[0] : STYLE.main[2]);
    if (o.intro > 0) write(o.intro > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 92, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 1]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    scr = 'ATTRACT';
    o = blank();
    demo.t = 0;
  });
})(game);
