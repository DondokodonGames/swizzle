// I-GBA-0013v2-shiratama-chopstick-dodge.js
// シラタマ・チョップスティックドッジ — まな板の上の白玉団子が、上から伸びてくる菜箸の真下を転がって避け続ける
// 操作: 画面の左半分を押し続けると左へ、右半分を押し続けると右へ転がる。離すと滑って止まる
// 終わり: 16秒逃げ切ればCLEAR。菜箸につままれると仲間の団子が1つ減り、3つ全部つままれたらGAME OVER
// @mechanic: dodge
// @theme: night_kitchen_shiratama_escape
// 世界観: 夜の厨房で、つまみ食いされそうな小さな白玉団子が、まな板に落ちる影で狙いを知らせて迫る菜箸の真下を転がって避け続け、夜明けまで逃げ切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 生き延びた秒数・かすり回数・スコア
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい無地背景 + 単色の主役。柔らかい影の丸い塊、当たり判定は見た目どおり
  var STYLE = { bg: ['#eef0fb', '#d9def5'], main: ['#ffffff', '#e6e2da'], accent: ['#ff6f61', '#6b5cff'] };
  var WHITE = STYLE.main[0], SHADE = STYLE.main[1], CORAL = STYLE.accent[0], VIOLET = STYLE.accent[1];
  var INK = '#2d2a40', BOARD = '#f3dfc0', BOARD_D = '#dcc19a';

  var TITLE = 'SHIRATAMA DODGE';
  var TIME_LIMIT = 16;
  var LIVES = 3;
  var BOARD_Y = H * 0.62;          // 団子の接地線
  var R = 58;                      // 団子の半径(見た目=当たり)
  var CATCH = 64;                  // 箸先の挟み幅(片側)
  var MINX = 130, MAXX = W - 130;
  var WARN = 0.65, DROP = 0.12, PINCH = 0.25, RISE = 0.3;

  var MD = { ATTRACT: 'attract', PLAYING: 'playing', RESULT: 'result' };
  var md = MD.ATTRACT;

  var DANGO = [
    ['...wwww...', '.wwwwwwww.', 'wwwwwwwwww', 'wwkwwwwkww', 'wpwwwwwwpw', 'wwwwkkwwww', 'swwwwwwwws', '.sswwwwss.', '...ssss...'],
    ['...wwww...', '.wwwwwwww.', 'wwwwwwwwww', 'wwwkwwkwww', 'wwpwwwwpww', 'wwwwkkwwww', 'swwwwwwwws', '.sswwwwss.', '...ssss...'],
    ['...wwww...', '.wwwwwwww.', 'wwwwwwwwww', 'wwwwwwwwww', 'wkkwwwwkkw', 'wpwwwwwwpw', 'swwwkkwwws', '.sswwwwss.', '...ssss...'],
  ];
  var DANGO_PAL = { w: WHITE, s: SHADE, k: INK, p: '#ffb3c0' };
  var SLEEVE = ['vvvvvv', 'vvvvvv', 'vvvvvv', 'ffffff', '.ffff.'];
  var MOON = ['..yyy.', '.yy...', 'yy....', 'yy....', '.yy...', '..yyy.'];

  // ── 団子と箸(プレイ・デモ共通) ──
  function makeHero() { return { x: W / 2, vx: 0, frame: 0, roll: 0 }; }

  function moveHero(h, dir, dt) {
    var target = dir * 720;
    h.vx += (target - h.vx) * Math.min(1, dt * (dir === 0 ? 5 : 10));
    h.x += h.vx * dt;
    if (h.x < MINX) { h.x = MINX; h.vx = 0; }
    if (h.x > MAXX) { h.x = MAXX; h.vx = 0; }
    h.roll += h.vx * dt / 40;
  }

  function newStrike(x, track) { return { x: x, t: 0, phase: 'warn', track: track, hit: false, graze: false, done: false }; }

  // 1本の菜箸を進める。戻り値: 'hit' | 'graze' | null
  function stepStrike(s, hero, dt) {
    s.t += dt;
    if (s.phase === 'warn') {
      if (s.track && s.t < WARN * 0.5) s.x += (hero.x - s.x) * Math.min(1, dt * 6);
      if (s.t >= WARN) { s.phase = 'drop'; s.t = 0; }
    } else if (s.phase === 'drop') {
      if (s.t >= DROP) {
        s.phase = 'pinch'; s.t = 0;
        var d = Math.abs(hero.x - s.x);
        if (d < CATCH + R * 0.6) return 'hit';
        if (d < CATCH + R + 70) return 'graze';
      }
    } else if (s.phase === 'pinch') {
      if (s.t >= PINCH) { s.phase = 'rise'; s.t = 0; }
    } else if (s.phase === 'rise') {
      if (s.t >= RISE) s.done = true;
    }
    return null;
  }

  function tipY(s) {
    var top = 200;
    if (s.phase === 'warn') return top + 40 * (s.t / WARN);
    if (s.phase === 'drop') return top + 40 + (BOARD_Y - top - 40 - 10) * (s.t / DROP);
    if (s.phase === 'pinch') return BOARD_Y - 10;
    return BOARD_Y - 10 - (BOARD_Y - top) * (s.t / RISE);
  }

  // ── 状態 ──
  var hero, strikes, spawnT, elapsed, timeLeft, ready, lives, inv, grazes, halt, over, won, endT, score, prevBest, mile;

  function initGame() {
    hero = makeHero(); strikes = []; spawnT = 0.6; elapsed = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    lives = LIVES; inv = 0; grazes = 0; halt = null; over = false; won = false; endT = 0; score = 0; mile = 0;
    prevBest = game.best || 0;
  }

  function write(s, x, y, sz, col) {
    game.draw.text(s, x, y + 4, { size: sz, color: 'rgba(45,42,64,0.25)', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 描画 ──
  function drawKitchen() {
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.5, STYLE.bg[0]], [1, '#e4e7f7']]);
    // 窓の月(夜)とやわらかい丸い調理器具のシルエット
    game.draw.circle(W * 0.18, 330, 90, '#c9cff0');
    game.draw.sprite(MOON, { y: '#fff3b0' }, W * 0.18, 330, 12, { anchor: 'center' });
    for (var p = 0; p < 3; p++) {
      var px = W * 0.5 + p * 170;
      game.draw.circle(px, 360, 60, '#cfd5f2');
      game.draw.rect(px - 60, 360, 120, 70, '#cfd5f2');
    }
    // まな板(厚みのある板を上面+前面で)
    game.draw.rect(60, BOARD_Y + 20, W - 120, 30, '#000000', 0.08);
    game.draw.rect(70, BOARD_Y - 6, W - 140, 60, BOARD);
    game.draw.rect(70, BOARD_Y + 54, W - 140, 26, BOARD_D);
    game.draw.gradient(BOARD_Y + 80, H, [[0, '#e9ecfa'], [1, '#d7dcf3']]);
  }

  function drawHero(h, alpha) {
    // 柔らかい接地影
    game.draw.rect(h.x - R * 0.85, BOARD_Y - 2, R * 1.7, 12, '#000000', 0.12);
    game.draw.rect(h.x - R * 0.6, BOARD_Y, R * 1.2, 8, '#000000', 0.1);
    var fr = Math.floor(Math.abs(h.roll)) % 3;
    game.draw.sprite(DANGO[fr], DANGO_PAL, h.x, BOARD_Y - R + 6, 12, { anchor: 'center', alpha: alpha });
  }

  function drawStrike(s, hl) {
    var y = tipY(s);
    // 狙いの影(まな板の上で点滅→濃くなる)
    var warnK = s.phase === 'warn' ? s.t / WARN : 1;
    var blink = s.phase === 'warn' && Math.floor(s.t * 16) % 2 === 0 ? 0.35 : 0.2;
    game.draw.circle(s.x, BOARD_Y + 6, CATCH + 10 + (1 - warnK) * 40, s.phase === 'warn' ? CORAL : '#000000', s.phase === 'warn' ? blink : 0.1);
    // 箸2本(閉じるとき寄る)
    var gap = s.phase === 'pinch' ? 8 : CATCH;
    var col = hl ? '#ffffff' : '#c98a52';
    game.draw.rect(s.x - gap - 9, 150, 18, y - 150, col);
    game.draw.rect(s.x + gap - 9, 150, 18, y - 150, col);
    game.draw.rect(s.x - gap - 9, y - 30, 18, 30, hl ? '#ffffff' : CORAL);
    game.draw.rect(s.x + gap - 9, y - 30, 18, 30, hl ? '#ffffff' : CORAL);
    game.draw.sprite(SLEEVE, { v: VIOLET, f: '#f1c7a4' }, s.x, 150, 22, { anchor: 'center' });
  }

  function drawPads(dir) {
    // 親指ゾーン: 左右の柔らかいパッド(押している側が沈む)
    for (var i = 0; i < 2; i++) {
      var cx = i === 0 ? W * 0.27 : W * 0.73, cy = H * 0.85;
      var down = (i === 0 && dir < 0) || (i === 1 && dir > 0);
      game.draw.circle(cx, cy + 16, 150, '#000000', 0.08);
      game.draw.circle(cx, cy + (down ? 10 : 0), 150, down ? VIOLET : WHITE);
      // 矢印(ブロック)
      var s = i === 0 ? -1 : 1;
      for (var k = 0; k < 4; k++) game.draw.rect(cx + s * (40 - k * 26) - 13, cy + (down ? 10 : 0) - 14 - k * 16, 26, 28 + k * 32, down ? WHITE : VIOLET);
    }
  }

  function drawHud() {
    for (var i = 0; i < LIVES; i++) game.draw.sprite(DANGO[0], DANGO_PAL, 90 + i * 110, 92, 7, { anchor: 'center', alpha: i < lives ? 1 : 0.25 });
    write(Math.ceil(timeLeft) + '', W / 2, 92, 68, INK);
    write(String(Math.floor(score)), W * 0.84, 92, 44, VIOLET);
    var prog = Math.min(1, elapsed / TIME_LIMIT);
    game.draw.rect(60, 168, W - 120, 20, '#ffffff');
    game.draw.rect(60, 168, (W - 120) * prog, 20, VIOLET);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (md === MD.ATTRACT) { game.audio.play('se_coin', 0.45); md = MD.PLAYING; initGame(); return; }
    if (md === MD.RESULT) { game.audio.play('se_tap', 0.2); md = MD.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (md !== MD.PLAYING || over) return;
    game.audio.play('se_tap', 0.12);
    game.fx.burst(hero.x + (x < W / 2 ? R : -R), BOARD_Y, { color: SHADE, count: 5, speed: 120 });
  });
  game.onRelease(function (x, y) {
    if (md !== MD.PLAYING || over) return;
    game.audio.tone('E5', 0.04, { wave: 'sine', volume: 0.04 });
  });

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) score += lives * 200;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function spawnPlay() {
    var lvl = elapsed / TIME_LIMIT;
    var track = elapsed > 9 && game.random(0, 1) < 0.5;
    var aim = Math.max(MINX, Math.min(MAXX, hero.x + game.random(-80, 80)));
    strikes.push(newStrike(aim, track));
    if (elapsed > 5 && game.random(0, 1) < 0.35 + lvl * 0.3) {
      var other = aim + (game.random(0, 1) < 0.5 ? -1 : 1) * game.random(260, 380);
      if (other > MINX && other < MAXX) strikes.push(newStrike(other, false));
    }
    spawnT = Math.max(0.55, 1.15 - lvl * 0.6);
  }

  // ── ATTRACT: 影が落ちたら押し続けて転がり、箸の外へ抜ける ──
  var demo = { t: 0, hero: null, strikes: [], dir: 0, gx: W * 0.73, gy: H * 0.85, spawn: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt || !demo.hero) { demo.hero = makeHero(); demo.strikes = []; demo.spawn = 0.3; }
    demo.spawn -= dt;
    if (demo.spawn <= 0) { demo.strikes.push(newStrike(demo.hero.x, false)); demo.spawn = 1.2; }
    // 迫る影から遠い側へ押す
    demo.dir = 0;
    for (var i = 0; i < demo.strikes.length; i++) {
      var s = demo.strikes[i];
      if (s.phase === 'warn' && s.t > 0.15 && Math.abs(demo.hero.x - s.x) < CATCH + R + 90) {
        demo.dir = demo.hero.x >= s.x ? 1 : -1;
        if (demo.dir > 0 && demo.hero.x > MAXX - 200) demo.dir = -1;
        if (demo.dir < 0 && demo.hero.x < MINX + 200) demo.dir = 1;
      }
    }
    moveHero(demo.hero, demo.dir, dt);
    for (var j = demo.strikes.length - 1; j >= 0; j--) {
      var r = stepStrike(demo.strikes[j], demo.hero, dt);
      if (r === 'graze') game.feedback.good(demo.hero.x, BOARD_Y - 170, { text: 'NICE', color: VIOLET, count: 8, volume: 0.2 });
      if (demo.strikes[j].done) demo.strikes.splice(j, 1);
    }
    var tx = demo.dir < 0 ? W * 0.27 : W * 0.73;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 10);
  }

  game.onUpdate(function (dt) {
    if (md === MD.ATTRACT) {
      stepDemo(dt);
      drawKitchen();
      for (var i = 0; i < demo.strikes.length; i++) drawStrike(demo.strikes[i], false);
      drawHero(demo.hero, 1);
      drawPads(demo.dir);
      game.draw.hand(demo.gx, demo.gy, { press: demo.dir !== 0, scale: 16 });
      write(TITLE, W / 2, H * 0.07, 64, INK);
      write('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 36, VIOLET);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.965, 42, CORAL);
      else write('INSERT COIN', W / 2, H * 0.965, 36, INK);
      return;
    }

    if (md === MD.RESULT) {
      drawKitchen();
      drawHero(hero, won ? 1 : 0.4);
      drawPads(0);
      game.draw.rect(90, H * 0.2, W - 180, H * 0.26, '#ffffff', 0.85);
      write(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 96, won ? VIOLET : CORAL);
      write(Math.floor(elapsed) + ' / ' + TIME_LIMIT + '秒', W / 2, H * 0.32, 50, INK);
      write('SCORE ' + Math.floor(score) + '  NICE x' + grazes, W / 2, H * 0.37, 40, INK);
      if (won && Math.floor(score) > prevBest) write('NEW RECORD', W / 2, H * 0.42, 50, CORAL);
      else write('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.42, 36, '#8c88a8');
      if (!won) write('あと' + Math.max(1, Math.ceil(TIME_LIMIT - elapsed)) + '秒!', W / 2, H * 0.5, 50, CORAL);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.965, 36, INK);
      return;
    }

    // ── PLAYING ──
    var dir = 0;
    if (game.input.pressing && !over && !halt && ready <= 0) dir = game.input.x < W / 2 ? -1 : 1;
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        md = MD.RESULT;
        var stats = { seconds: Math.floor(elapsed), grazes: grazes, lives: lives };
        if (won) game.end.success(Math.floor(score), stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) {
        lives--; inv = 1.1;
        game.feedback.bad(hero.x, BOARD_Y - 160, { text: 'MISS' });
        halt = null;
        if (lives <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      elapsed += dt; timeLeft = Math.max(0, TIME_LIMIT - elapsed);
      score += dt * 20;
      if (inv > 0) inv -= dt;
      moveHero(hero, dir, dt);
      spawnT -= dt;
      if (spawnT <= 0) { spawnPlay(); game.audio.tone('A4', 0.06, { wave: 'triangle', volume: 0.06 }); }
      for (var j = strikes.length - 1; j >= 0; j--) {
        var s = strikes[j];
        var r = stepStrike(s, hero, dt);
        if (r === 'hit' && inv <= 0) { s.hit = true; halt = { t: 0.45, max: 0.45, s: s }; game.audio.play('se_break', 0.3); break; }
        if (r === 'graze' || (r === 'hit' && inv > 0)) { grazes++; score += 50; game.feedback.good(hero.x, BOARD_Y - 170, { text: 'NICE', color: VIOLET, count: 8 }); }
        if (s.done) strikes.splice(j, 1);
      }
      var m = Math.floor(elapsed / 4);
      if (m > mile && m < 4) { mile = m; game.fx.popup(m * 4 + '秒', W / 2, H * 0.24, { color: VIOLET, size: 60 }); game.audio.play('se_milestone', 0.3); }
      if (elapsed >= TIME_LIMIT && !over) { score += 300; game.feedback.good(hero.x, BOARD_Y - 170, { text: 'FINISH', color: VIOLET, count: 20 }); finish(true); }
    }

    drawKitchen();
    for (var k = 0; k < strikes.length; k++) drawStrike(strikes[k], halt && halt.s === strikes[k]);
    if (halt) {
      var hk = 1 - halt.t / halt.max;
      game.draw.circle(hero.x, BOARD_Y - R, R * (1.4 + hk * 0.6), '#ffffff', 0.7 * (1 - hk) + 0.2);
      game.draw.sprite(DANGO[0], DANGO_PAL, hero.x, BOARD_Y - R + 6, 12 + hk * 4, { anchor: 'center' });
    } else {
      drawHero(hero, inv > 0 && Math.floor(inv * 12) % 2 === 0 ? 0.3 : 1);
    }
    drawPads(dir);
    drawHud();
    if (ready > 0) write(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 104, CORAL);
  });

  game.onStart(function () {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1.5], ['R', 0.5]], { tempo: 144, wave: 'triangle', volume: 0.045, loop: true });
    md = MD.ATTRACT;
    initGame();
  });
})(game);
