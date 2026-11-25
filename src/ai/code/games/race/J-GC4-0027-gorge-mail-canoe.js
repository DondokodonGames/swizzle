// J-GC4-0027-gorge-mail-canoe.js
// 渓谷ポストカヌー — 早瀬に浮かぶ合図ブイの矢印どおりにスワイプで左右のオールを漕ぎ分け、岩と渦をすり抜けて下る
// 操作: 近づく関門のブイに出た矢印と同じ向きにスワイプ(←/→=片側のオールで横へ、↑=両オールで渦を突っ切る)
// 終わり: 関門を10個くぐると河口の桟橋でCLEAR。向きの間違い/漕ぎ遅れで3回ぶつかる/時間切れでGAME OVER
// @mechanic: swipe_direction
// @theme: gorge_mail_canoe
// 世界観: 山あいの渓谷で郵便カヌーの漕ぎ手が、先回りの見張りが流した合図ブイの矢印を読み、左右のオールを漕ぎ分けて早瀬の岩と渦を抜け、河口の村へ手紙を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐった関門数・PERFECT数・スコア
// スタイル: 90s 16bit

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き
  var STYLE = {
    bg: ['#1f6b3a', '#2f9a58', '#1c5a8c'],
    main: ['#3aa0e0', '#8fdcff', '#7a4a26'],
    accent: ['#ffe14d', '#ff4a3d'],
  };

  var GAME_TITLE = 'RAPIDS POST';
  var TIME_LIMIT = 15;
  var NEEDED = 10;
  var STRIKES = 3;
  var LANES = [W * 0.28, W * 0.5, W * 0.72];
  var BOAT_Y = H * 0.72;
  var SPAWN_Y = H * 0.2;
  var RIVER_L = W * 0.14, RIVER_R = W * 0.86;

  var CANOE = [
    '...bb...',
    '..bwwb..',
    '.bwwwwb.',
    '.bwrrwb.',
    '.bwrrwb.',
    '.bwwwwb.',
    '.bwppwb.',
    '..bwwb..',
    '...bb...',
  ];
  var CANOE_PAL = { b: '#6b3a1c', w: '#c98a4b', r: '#ff4a3d', p: '#ffe14d' };
  var OAR = ['####', '.##.', '.##.', '.##.'];
  var ROCK = ['..gggg..', '.gGGGgg.', 'gGGggggg', 'gggggggd', '.gggggd.', '..dddd..'];
  var ROCK_PAL = { g: '#8a8f99', G: '#c4c8d0', d: '#50545c' };
  var ARROW = ['...#....', '..##....', '.#######', '########', '.#######', '..##....', '...#....'];
  var ARROW_U = ['...##...', '..####..', '.######.', '########', '..####..', '..####..', '..####..'];
  var TREE = ['..gg..', '.gggg.', 'gggggg', '.gggg.', '..tt..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var g = null;

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#0b2a1a', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    g = {
      lane: 1, boatX: LANES[1], gates: [], spawnT: 0.2, spawned: 0, passed: 0, perfect: 0,
      strikes: 0, score: 0, combo: 0, timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0,
      finished: false, done: false, ok: false, endWait: 0, oarL: 0, oarR: 0, surge: 0,
      scroll: 0, hl: null, bump: 0, planLane: 1, half: false,
    };
  }

  function travelTime() { return Math.max(1.15, 1.7 - g.spawned * 0.06); }
  function interval() { return Math.max(0.95, 1.35 - g.spawned * 0.045); }

  function spawnGate() {
    // 直前の関門の結果レーンから次の矢印を決める(常に実行可能な指示)
    var from = g.planLane;
    var opts = ['up'];
    if (from > 0) opts.push('left');
    if (from < 2) opts.push('right');
    var dir = opts[Math.floor(game.random(0, opts.length)) % opts.length];
    var to = dir === 'left' ? from - 1 : dir === 'right' ? from + 1 : from;
    g.planLane = to;
    g.gates.push({ dir: dir, gap: to, y: SPAWN_Y, t: 0, tt: travelTime(), state: 'wait', answered: false });
    g.spawned++;
  }

  function activeGate() {
    for (var i = 0; i < g.gates.length; i++) if (!g.gates[i].answered) return g.gates[i];
    return null;
  }

  function swipe(dir) {
    var gt = activeGate();
    if (!gt || gt.t < 0.1) {
      game.audio.play('se_tap', 0.15);
      g.oarL = g.oarR = 0.15;
      return;
    }
    gt.answered = true;
    if (dir === 'left') g.oarR = 0.3;
    else if (dir === 'right') g.oarL = 0.3;
    else g.oarL = g.oarR = 0.3;
    var bx = g.boatX, by = BOAT_Y - 60;
    if (dir === gt.dir) {
      gt.state = 'ok';
      g.lane = gt.gap;
      if (dir === 'up') g.surge = 0.4;
      var quick = gt.t < gt.tt * 0.5;
      g.combo++;
      if (quick) g.perfect++;
      g.score += 100 + (quick ? 50 : 0) + Math.min(5, g.combo) * 10;
      game.feedback.good(bx, by, { text: quick ? 'PERFECT' : 'GOOD', color: quick ? STYLE.accent[0] : '#8fdcff', count: 12, sound: dir === 'up' ? 'se_powerup' : 'se_good' });
    } else {
      gt.state = 'bad';
      g.combo = 0;
      if (dir === 'left' && g.lane > 0) g.lane--;
      else if (dir === 'right' && g.lane < 2) g.lane++;
      game.feedback.bad(bx, by, { text: 'MISS', shake: 8, size: 48 });
    }
  }

  function bump(gt) {
    g.strikes++;
    g.bump = 0.35;
    g.lane = gt.gap;
    g.combo = 0;
    if (g.strikes >= STRIKES) { endRound(false, [g.boatX, BOAT_Y]); return; }
    game.feedback.bad(g.boatX, BOAT_Y, { text: 'MISS', shake: 14, sound: 'se_break' });
  }

  function endRound(ok, hl) {
    if (g.finished) return;
    g.finished = true; g.ok = ok; g.hitStop = 0.5; g.hl = hl;
    game.fx.flash('#ffffff', 0.15);
    if (ok) { g.score += Math.round(g.timeLeft * 60); game.audio.play('se_milestone', 0.5); }
    else game.audio.play('se_bad', 0.5);
  }

  function step(dt, isDemo) {
    var spd = g.surge > 0 ? 2.2 : 1;
    g.scroll += dt * 420 * spd;
    if (g.oarL > 0) g.oarL -= dt;
    if (g.oarR > 0) g.oarR -= dt;
    if (g.surge > 0) g.surge -= dt;
    if (g.bump > 0) g.bump -= dt;
    g.boatX += (LANES[g.lane] - g.boatX) * Math.min(1, dt * 12);
    g.spawnT -= dt;
    if (g.spawnT <= 0) { spawnGate(); g.spawnT = interval(); }
    for (var i = g.gates.length - 1; i >= 0; i--) {
      var gt = g.gates[i];
      gt.t += dt * (g.surge > 0 && gt.state !== 'wait' ? 1.4 : 1);
      gt.y = SPAWN_Y + (BOAT_Y - SPAWN_Y) * (gt.t / gt.tt);
      if (gt.t >= gt.tt && !gt.resolved) {
        gt.resolved = true;
        if (gt.state === 'ok') {
          g.passed++;
          game.fx.burst(g.boatX, BOAT_Y - 80, { color: '#8fdcff', count: 8, speed: 260 });
          if (g.passed === 5 && !g.half && !isDemo) {
            g.half = true;
            game.fx.popup('5 / ' + NEEDED, W / 2, H * 0.45, { color: STYLE.accent[0], size: 72 });
            game.audio.play('se_milestone', 0.5);
          }
          if (g.passed >= NEEDED && !isDemo) endRound(true, [g.boatX, BOAT_Y]);
        } else {
          gt.answered = true;
          if (!isDemo) bump(gt); else { g.bump = 0.35; g.lane = gt.gap; game.feedback.bad(g.boatX, BOAT_Y, { text: 'MISS', shake: 6 }); }
        }
      }
      if (gt.t > gt.tt + 0.6) g.gates.splice(i, 1);
    }
    if (!isDemo) {
      g.timeLeft -= dt;
      if (g.timeLeft <= 0 && !g.finished) { g.timeLeft = 0; endRound(false, [g.boatX, BOAT_Y]); }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 川
    game.draw.gradient(0, H, [[0, STYLE.bg[2]], [0.5, STYLE.main[0]], [1, STYLE.bg[2]]]);
    game.draw.rect(0, 0, RIVER_L, H, STYLE.bg[1]);
    game.draw.rect(RIVER_R, 0, W - RIVER_R, H, STYLE.bg[1]);
    game.draw.rect(RIVER_L - 14, 0, 14, H, '#c9b27a');
    game.draw.rect(RIVER_R, 0, 14, H, '#c9b27a');
    var sc = g ? g.scroll : t * 400;
    for (var r = 0; r < 18; r++) {
      var ry = ((r * 137 + sc) % (H + 100)) - 50;
      var rx = RIVER_L + 40 + ((r * 271) % (RIVER_R - RIVER_L - 160));
      game.draw.rect(rx, ry, 90, 6, STYLE.main[1], 0.5);
    }
    for (var k = 0; k < 10; k++) {
      var ty = ((k * 240 + sc * 0.8) % (H + 200)) - 100;
      var side = k % 2 ? W - 70 : 70;
      game.draw.sprite(TREE, { g: '#145a2a', t: '#6b3a1c' }, side + Math.sin(t * 1.3 + k) * 4, ty, 18, { anchor: 'center' });
    }
    game.draw.rect(0, 0, W, H, '#fff6c0', 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawGates() {
    var t = game.time.elapsed;
    var act = activeGate();
    for (var i = 0; i < g.gates.length; i++) {
      var gt = g.gates[i];
      if (gt.dir === 'up') {
        // 渦(全レーン)
        for (var c = 0; c < 3; c++) {
          var wx = LANES[c];
          for (var ring = 3; ring > 0; ring--) {
            game.draw.circle(wx + Math.sin(t * 6 + ring) * 6, gt.y, ring * 34, ring % 2 ? '#1c5a8c' : '#8fdcff', 0.6);
          }
        }
      } else {
        for (var l = 0; l < 3; l++) {
          if (l === gt.gap) continue;
          game.draw.sprite(ROCK, ROCK_PAL, LANES[l], gt.y, 22, { anchor: 'center' });
        }
      }
      // 合図ブイ(矢印)
      if (gt.state === 'wait') {
        var isAct = gt === act;
        var by = gt.y - 130;
        var bob = Math.sin(t * 5 + i) * 6;
        game.draw.circle(W / 2, by + bob, 74, isAct ? '#ffffff' : '#c4c8d0', isAct ? 1 : 0.55);
        game.draw.circle(W / 2, by + bob, 64, isAct ? STYLE.accent[1] : '#8a8f99', isAct ? 1 : 0.55);
        var a = isAct ? 1 : 0.45;
        if (gt.dir === 'up') game.draw.sprite(ARROW_U, { '#': '#ffffff' }, W / 2, by + bob, 13, { anchor: 'center', alpha: a });
        else game.draw.sprite(ARROW, { '#': '#ffffff' }, W / 2, by + bob, 13, { anchor: 'center', alpha: a, flipX: gt.dir === 'right' });
        if (isAct && gt.t > gt.tt * 0.65 && Math.floor(t * 10) % 2 === 0) game.draw.circle(W / 2, by + bob, 86, STYLE.accent[0], 0.35);
      }
    }
  }

  function drawBoat() {
    var t = game.time.elapsed;
    var x = g.boatX + (g.bump > 0 ? Math.sin(g.bump * 60) * 14 : 0);
    var y = BOAT_Y + Math.sin(t * 3.5) * 6;
    if (g.surge > 0) for (var w = 0; w < 4; w++) game.draw.rect(x - 60 + w * 34, y + 120 + w * 10, 20, 50, '#ffffff', 0.5);
    game.draw.sprite(CANOE, CANOE_PAL, x, y, 20, { anchor: 'center' });
    var lo = g.oarL > 0 ? -40 : 0, ro = g.oarR > 0 ? -40 : 0;
    game.draw.line(x - 30, y, x - 130, y + 30 + lo, '#6b3a1c', 10);
    game.draw.sprite(OAR, { '#': '#c98a4b' }, x - 130, y + 30 + lo, 10, { anchor: 'center' });
    game.draw.line(x + 30, y, x + 130, y + 30 + ro, '#6b3a1c', 10);
    game.draw.sprite(OAR, { '#': '#c98a4b' }, x + 130, y + 30 + ro, 10, { anchor: 'center' });
    if (g.hl && g.hitStop > 0) game.draw.circle(g.hl[0], g.hl[1], 170 * (1.3 - g.hitStop), '#ffffff', 0.4);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#0b2a1a', 0.55);
    txt(g.passed + ' / ' + NEEDED, W * 0.25, 80, 60, '#ffffff');
    txt('SCORE ' + g.score, W * 0.72, 80, 40, STYLE.accent[0]);
    for (var i = 0; i < STRIKES; i++) game.draw.circle(W * 0.08 + i * 56, 188, 20, i < STRIKES - g.strikes ? STYLE.accent[0] : '#0b2a1a');
    var bw = W * 0.62, low = g.timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(W * 0.3, 178, bw, 20, '#0b2a1a');
    game.draw.rect(W * 0.3, 178, bw * Math.max(0, g.timeLeft / TIME_LIMIT), 20, low ? STYLE.accent[1] : '#8fdcff');
    // 河口までの航程(親指ゾーンの下端)
    var prog = g.passed / NEEDED;
    game.draw.rect(W * 0.1, H * 0.9, W * 0.8, 14, '#0b2a1a', 0.6);
    game.draw.rect(W * 0.1, H * 0.9, W * 0.8 * prog, 14, STYLE.accent[0]);
    game.draw.sprite(CANOE, CANOE_PAL, W * 0.1 + W * 0.8 * prog, H * 0.9 + 7, 5, { anchor: 'center' });
  }

  // ── デモ ─────────────────────────────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, cyc: 0, n: 0, sw: 0, sdir: 'up', seen: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); g.ready = 0; demo.cyc++; demo.n = 0; demo.seen = null; }
    step(dt, true);
    var gt = activeGate();
    if (gt && gt !== demo.seen && gt.t > 0.45) {
      demo.seen = gt; demo.n++;
      var d = gt.dir;
      if (demo.cyc % 2 === 0 && demo.n === 3) d = gt.dir === 'left' ? 'right' : 'left';
      demo.sdir = d; demo.sw = 0.3;
      swipe(d);
    }
    var ox = 0, oy = 0;
    if (demo.sw > 0) {
      demo.sw -= dt;
      var k = 1 - demo.sw / 0.3;
      ox = demo.sdir === 'left' ? -220 * k : demo.sdir === 'right' ? 220 * k : 0;
      oy = demo.sdir === 'up' ? -220 * k : 0;
    }
    demo.press = demo.sw > 0;
    demo.gx = W / 2 + ox; demo.gy = H * 0.86 + oy;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: '#8fdcff', count: 4, speed: 140 });
  });

  game.onSwipe(function (dir) {
    if (state !== S.PLAYING) return;
    if (g.finished || g.ready > 0 || g.hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    swipe(dir);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!g) initGame();
      stepDemo(dt);
      drawBg(); drawGates(); drawBoat();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 96, STYLE.accent[0]);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.14, 44, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.955, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawBg(); drawBoat();
      game.draw.rect(0, H * 0.3, W, H * 0.3, '#0b2a1a', 0.75);
      txt(g.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 116, g.ok ? STYLE.accent[0] : STYLE.accent[1]);
      txt(g.passed + ' / ' + NEEDED, W / 2, H * 0.43, 64, '#ffffff');
      txt('SCORE ' + g.score, W / 2, H * 0.48, 50, STYLE.accent[0]);
      if (!g.ok && NEEDED - g.passed <= 4) txt('あと' + (NEEDED - g.passed) + '個!', W / 2, H * 0.54, 54, '#ffb08a');
      else if (g.ok && g.score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.54, 58, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.54, 46, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 46, '#ffffff');
      return;
    }

    if (g.done) {
      g.endWait -= dt;
      if (g.endWait <= 0) {
        state = S.RESULT;
        var stats = { gates: g.passed, perfect: g.perfect, bumps: g.strikes };
        if (g.ok) game.end.success(g.score, stats); else game.end.failure(stats);
      }
    } else if (g.hitStop > 0) {
      g.hitStop -= dt;
      if (g.hitStop <= 0) {
        g.done = true; g.endWait = 1.1;
        game.audio.stopBgm();
        if (g.ok) {
          game.feedback.good(g.hl[0], g.hl[1] - 100, { text: 'CLEAR', color: STYLE.accent[0], count: 40 });
          game.audio.play('se_success', 0.6);
        } else {
          game.feedback.bad(g.hl[0], g.hl[1] - 100, { text: g.timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', shake: 16 });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (g.ready > 0) {
      g.ready -= dt;
      if (g.ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!g.finished) {
      step(dt, false);
    }

    drawBg(); drawGates(); drawBoat(); drawHud();
    if (g.ready > 0) txt(g.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['E4', 1.5],
    ], { tempo: 156, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
