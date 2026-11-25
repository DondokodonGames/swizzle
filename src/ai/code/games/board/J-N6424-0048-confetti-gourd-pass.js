// J-N6424-0048-confetti-gourd-pass.js
// コンフェッティ・ゴード・パス — ぜんまいで鳴る紙吹雪ひょうたんを、向かいの誰かが手を開いた瞬間に渡して手元ではじけさせない
// 操作: 向かいの手がパッと開いて光った瞬間にタップして渡す。開く前・ピクッと動いただけのフェイントで押すと取り落として時間が縮む
// 終わり: 6回渡せば成功。手元でひょうたんがはじける(ぜんまい切れ)、または15秒の時間切れで失敗
// @mechanic: reaction_duel
// @theme: harvest_table_confetti_pass
// 世界観: 収穫祭の夜の円卓で、ぜんまいが切れると紙吹雪を噴き出すひょうたん玩具を回す遊び。アナグマの子は、向かいの誰かが手を開いた瞬間に素早く手渡し、紙吹雪まみれを避ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡した回数と平均反応時間(ms)
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 大きいドット、限定4〜6色、1色だけ強い差し色(オレンジ)
  var STYLE = { bg: ['#1b1330', '#3a2a5a', '#6d4c7d'], main: ['#f2e9d8', '#8fc9b0', '#3a2a5a'], accent: ['#ff7a1a', '#ff3d5a'] };

  var TITLE = 'CONFETTI PASS';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var FUSE = 11;
  var FUMBLE_COST = 1.6;
  var OPEN_WIN = 0.55;
  var HOLD_X = W / 2, HOLD_Y = H * 0.66;
  var SEATS = [{ x: W * 0.2, y: H * 0.34 }, { x: W * 0.5, y: H * 0.28 }, { x: W * 0.8, y: H * 0.34 }];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BADGER_A = ['.g......g.', 'gggggggggg', 'gwwkggkwwg', 'gwwwggwwwg', '.gwwnnwwg.', '..gwwwwg..', '.agggggga.', 'aa.gggg.aa', '...g..g...'];
  var BADGER_B = ['.g......g.', 'gggggggggg', 'gwwkggkwwg', 'gwwwggwwwg', '.gwwnnwwg.', '..gwwwwg..', 'aagggggga.', '...gggg.aa', '...g..g...'];
  var BADGER_POP = ['.g.c..y.g.', 'ggcgggyggg', 'gwwxggxwwg', 'gcwwggwwyg', '.gwwoowwg.', '..gwwwwg..', 'aaggggggaa', '...gggg...', '..gg..gg..'];
  var BADGER_PAL = { g: '#6d6d7d', w: '#f2e9d8', k: '#1b1330', n: '#1b1330', a: '#6d6d7d', x: '#1b1330', o: '#ff3d5a', c: '#8fc9b0', y: '#ff7a1a' };
  var GOURD_A = ['...kk...', '...k....', '..oooo..', '.oyoooo.', '..oooo..', '.oooooo.', 'ooyooooo', 'oooooooo', '.oooooo.'];
  var GOURD_B = ['....kk..', '....k...', '..oooo..', '.oyoooo.', '..oooo..', '.oooooo.', 'ooyooooo', 'oooooooo', '.oooooo.'];
  var GOURD_PAL = { k: '#f2e9d8', o: '#ff7a1a', y: '#ffd2a0' };
  var PAW_SHUT = ['..pppp..', '.pppppp.', 'pppppppp', 'pppppppp', '.pppppp.'];
  var PAW_OPEN = ['p.p..p.p', 'p.p..p.p', 'pppppppp', 'pqqqqqqp', '.pppppp.'];
  var PAW_TWITCH = ['...pp...', '.p.pp.p.', 'pppppppp', 'pppppppp', '.pppppp.'];
  var CANDLE = ['.f.', 'fyf', '.w.', '.w.', '.w.'];

  var P = null;
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, pressT: 0, feintBait: false };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: '#1b1330', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function newTable(isDemo) {
    var t = {
      demo: isDemo, fuse: FUSE, passes: 0, fumbles: 0, reactSum: 0, perfect: 0,
      phase: 'hold', wait: 0, seat: 1, openT: 0, feintAt: -1, feintSeat: 0, feintT: 0,
      fly: null, hitStop: 0, popped: false, over: false, win: false, endWait: -1,
      ready: isDemo ? 0 : 0.8, timeLeft: TIME_LIMIT, milestone: false, score: 0, tick: 0, holdT: 0, fumbleShow: 0
    };
    armWait(t);
    return t;
  }

  function armWait(t) {
    t.phase = 'hold';
    t.holdT = 0;
    t.wait = game.random(0.6, 1.35);
    t.seat = Math.floor(game.random(0, 3));
    t.openT = 0;
    t.feintAt = game.random(0, 1) < 0.35 ? game.random(0.2, t.wait - 0.25) : -1;
    t.feintSeat = Math.floor(game.random(0, 3));
    t.feintT = 0;
  }

  function fumble(why) {
    P.fumbles++;
    P.fuse = Math.max(0.05, P.fuse - FUMBLE_COST);
    P.hitStop = 0.3;
    P.fumbleShow = 0.4;
    if (!P.demo) game.feedback.bad(HOLD_X, HOLD_Y - 160, { text: 'MISS' });
    else game.audio.tone('C3', 0.12, { wave: 'sawtooth', volume: 0.05 });
    if (why === 'late') armWait(P);
    else { P.wait = Math.max(P.wait, 0.5); }
  }

  function passIt() {
    if (P.phase === 'open') {
      var rt = P.openT;
      var perfect = rt < 0.3;
      P.passes++;
      P.reactSum += rt;
      if (perfect) P.perfect++;
      P.score += perfect ? 250 : 150;
      P.fly = { t: 0, to: SEATS[P.seat] };
      P.phase = 'away';
      game.audio.play('se_jump', 0.3);
      if (!P.demo) {
        game.feedback.good(SEATS[P.seat].x, SEATS[P.seat].y + 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : STYLE.main[1] });
        game.fx.popup(Math.round(rt * 1000) + 'ms', HOLD_X, HOLD_Y - 200, { color: STYLE.main[0], size: 40 });
        if (!P.milestone && P.passes >= NEEDED / 2) { P.milestone = true; game.fx.popup(P.passes + ' / ' + NEEDED, W / 2, H * 0.48, { color: STYLE.accent[0], size: 60 }); game.audio.play('se_milestone', 0.4); }
        if (P.passes >= NEEDED) { P.over = true; P.win = true; P.hitStop = 0.5; game.fx.burst(SEATS[P.seat].x, SEATS[P.seat].y, { color: STYLE.main[1], count: 30, speed: 480 }); }
      } else {
        game.audio.tone('G5', 0.08, { wave: 'square', volume: 0.05 });
      }
      return;
    }
    if (P.phase === 'hold') { fumble(P.feintT > 0 ? 'feint' : 'early'); return; }
    game.audio.play('se_tap', 0.08);
  }

  function step(dt) {
    if (P.fumbleShow > 0) P.fumbleShow -= dt;
    if (P.hitStop > 0) {
      P.hitStop -= dt;
      if (P.hitStop <= 0 && P.over) P.endWait = 0.7;
      return;
    }
    if (P.over) return;
    if (P.phase === 'away') {
      P.fly.t += dt;
      if (P.fly.t >= 0.55) {
        P.fly = null;
        armWait(P);
        game.audio.play('se_coin', 0.2);
      }
      return;
    }
    // the spring only unwinds while the gourd is in your paws
    var rate = P.passes === NEEDED - 1 ? 1.35 : 1;
    P.fuse -= dt * rate;
    P.holdT += dt;
    P.tick += dt * (P.fuse < 3 ? 3 : 1.5) * rate;
    if (P.tick >= 1) { P.tick -= 1; game.audio.tone(P.fuse < 3 ? 'E5' : 'B4', 0.03, { wave: 'square', volume: 0.04 }); }
    if (P.fuse <= 0) {
      P.fuse = 0; P.popped = true;
      if (!P.demo) {
        P.over = true; P.win = false; P.hitStop = 0.6;
        game.feedback.bad(HOLD_X, HOLD_Y - 60, { text: 'MISS' });
        game.audio.play('se_break', 0.35);
        game.fx.burst(HOLD_X, HOLD_Y - 40, { color: STYLE.accent[0], count: 40, speed: 600 });
        game.fx.burst(HOLD_X, HOLD_Y - 40, { color: STYLE.main[1], count: 30, speed: 500 });
      } else {
        P.hitStop = 0.5; P.fuse = FUSE; game.audio.play('se_break', 0.2);
      }
      return;
    }
    if (P.phase === 'hold') {
      P.wait -= dt;
      if (P.feintAt >= 0 && P.holdT >= P.feintAt && P.feintT <= 0 && P.feintAt < 90) {
        P.feintT = 0.28; P.feintAt = 99;
        game.audio.tone('D4', 0.05, { wave: 'triangle', volume: 0.04 });
      }
      if (P.feintT > 0) P.feintT -= dt;
      if (P.wait <= 0) {
        P.phase = 'open'; P.openT = 0; P.feintT = 0;
        game.audio.tone('A5', 0.09, { wave: 'square', volume: 0.08 });
      }
    } else if (P.phase === 'open') {
      P.openT += dt;
      if (P.openT >= OPEN_WIN) fumble('late');
    }
    if (P.demo) {
      var bait = demo.feintBait;
      if (P.phase === 'open' && P.openT >= 0.22 && !bait) { demo.press = true; demo.pressT = 0.2; passIt(); }
      else if (P.phase === 'hold' && P.feintT > 0.1 && bait) { demo.press = true; demo.pressT = 0.2; demo.feintBait = false; passIt(); }
    }
  }

  function drawTable() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    for (var s = 0; s < 18; s++) game.draw.rect((s * 211) % W, 250 + (s * 83) % 200, 10, 10, STYLE.main[0], 0.25 + 0.25 * Math.sin(t * 2 + s));
    // round table (big-pixel stepped ellipse)
    for (var y = -260; y < 260; y += 20) {
      var hw = 480 * Math.sqrt(1 - (y / 260) * (y / 260));
      game.draw.rect(W / 2 - hw, H * 0.5 + y, hw * 2, 20, y < 0 ? '#8a5a3a' : '#6e4530');
    }
    game.draw.sprite(CANDLE, { f: STYLE.accent[0], y: '#ffe08a', w: STYLE.main[0] }, W * 0.3, H * 0.47 + Math.sin(t * 7) * 2, 14, { anchor: 'center' });
    game.draw.sprite(CANDLE, { f: STYLE.accent[0], y: '#ffe08a', w: STYLE.main[0] }, W * 0.7, H * 0.47 + Math.cos(t * 6) * 2, 14, { anchor: 'center' });
    game.draw.circle(W * 0.3, H * 0.44, 90 + Math.sin(t * 5) * 8, '#ffe08a', 0.08);
    game.draw.circle(W * 0.7, H * 0.44, 90 + Math.cos(t * 5) * 8, '#ffe08a', 0.08);
    game.draw.rect(0, 0, W, H, STYLE.accent[0], 0.02 + 0.02 * Math.sin(t * 1.4));
  }

  function drawSeats() {
    var t = game.time.elapsed;
    for (var i = 0; i < 3; i++) {
      var st = SEATS[i];
      var art = PAW_SHUT, pal = { p: '#4a3a6a', q: STYLE.main[0] };
      var sway = Math.sin(t * 2 + i * 1.3) * 8;
      if (P.phase === 'open' && P.seat === i) {
        art = PAW_OPEN; pal = { p: STYLE.main[1], q: STYLE.main[0] };
        game.draw.circle(st.x, st.y, 120 + Math.sin(t * 20) * 8, STYLE.main[1], 0.35);
      } else if (P.feintT > 0 && P.feintSeat === i) {
        art = PAW_TWITCH; pal = { p: '#6d6d7d', q: STYLE.main[0] };
      }
      // seated silhouettes behind the paws (staging only)
      game.draw.circle(st.x, st.y - 110 + sway * 0.5, 80, '#2a1f45', 0.8);
      game.draw.sprite(art, pal, st.x - 60, st.y + sway, 12, { anchor: 'center' });
      game.draw.sprite(art, pal, st.x + 60, st.y + sway, 12, { anchor: 'center', flipX: true });
    }
  }

  function drawHolder() {
    var t = game.time.elapsed;
    var low = P.fuse < 3;
    var shake = low ? Math.sin(t * 50) * 6 : 0;
    var art = P.popped ? BADGER_POP : (Math.floor(t * 3) % 2 ? BADGER_A : BADGER_B);
    if (P.fumbleShow > 0) shake += Math.sin(t * 70) * 10;
    game.draw.sprite(art, BADGER_PAL, HOLD_X + shake * 0.3, HOLD_Y + 170 + Math.sin(t * 3) * 4, 20, { anchor: 'center' });
    var gx = HOLD_X, gy = HOLD_Y;
    if (P.fly) {
      var u = Math.min(1, P.fly.t / 0.55);
      var k = u < 0.5 ? u * 2 : 1;
      gx = HOLD_X + (P.fly.to.x - HOLD_X) * k;
      gy = HOLD_Y + (P.fly.to.y - HOLD_Y) * k - Math.sin(k * Math.PI) * 160;
      if (u >= 0.5) {
        // it rounds the table and comes back
        var v = (u - 0.5) * 2;
        gx = P.fly.to.x + (HOLD_X - P.fly.to.x) * v;
        gy = P.fly.to.y + (HOLD_Y - P.fly.to.y) * v - Math.sin(v * Math.PI) * 220;
      }
    }
    if (P.popped && P.hitStop > 0) {
      game.draw.circle(gx, gy, 170, '#ffffff', 0.7);
      for (var c = 0; c < 18; c++) {
        var a = c * 0.35 + t;
        game.draw.rect(gx + Math.cos(a) * (60 + c * 12), gy + Math.sin(a) * (60 + c * 12), 18, 10, c % 3 === 0 ? STYLE.accent[0] : (c % 3 === 1 ? STYLE.main[1] : STYLE.accent[1]));
      }
    }
    var sc = P.popped && P.hitStop > 0 ? 22 : 16;
    if (low && !P.fly) game.draw.circle(gx, gy, 110, STYLE.accent[1], 0.2 + 0.2 * Math.sin(t * 16));
    game.draw.sprite(Math.floor(t * (low ? 16 : 6)) % 2 ? GOURD_A : GOURD_B, GOURD_PAL, gx + shake, gy, sc, { anchor: 'center' });
  }

  function drawHud() {
    txt(P.passes + ' / ' + NEEDED, W / 2, 100, 64, STYLE.main[0]);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(GOURD_A, i < P.passes ? { k: STYLE.main[0], o: STYLE.main[1], y: '#d8fff0' } : { k: '#4a3a6a', o: '#4a3a6a', y: '#4a3a6a' }, W / 2 - (NEEDED - 1) * 50 + i * 100, 170, 5, { anchor: 'center' });
    // spring gauge next to the gourd: drains while you hold it
    var ff = Math.max(0, P.fuse / FUSE);
    game.draw.rect(W * 0.78, H * 0.58, 40, 220, '#2a1f45');
    game.draw.rect(W * 0.78, H * 0.58 + 220 * (1 - ff), 40, 220 * ff, ff < 0.33 ? STYLE.accent[1] : STYLE.accent[0]);
    var frac = Math.max(0, P.timeLeft / TIME_LIMIT);
    game.draw.rect(60, 212, W - 120, 14, '#2a1f45');
    game.draw.rect(60, 212, (W - 120) * frac, 14, P.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? STYLE.accent[1] : STYLE.main[1]);
  }

  function drawPad() {
    var open = P.phase === 'open';
    game.draw.circle(W / 2, H * 0.9, 100 + (open ? 16 : 0), open ? STYLE.main[1] : '#2a1f45', open ? 0.8 : 0.6);
    game.draw.sprite(PAW_OPEN, { p: open ? STYLE.main[0] : '#6d6d7d', q: open ? STYLE.main[1] : '#4a3a6a' }, W / 2, H * 0.9, 12, { anchor: 'center' });
  }

  function initGame() {
    P = newTable(false);
  }

  function finalize() {
    state = S.RESULT;
    game.audio.stopBgm();
    var avg = P.passes ? Math.round(P.reactSum / P.passes * 1000) : 0;
    P.avg = avg;
    var stats = { passes: P.passes, avgMs: avg, perfect: P.perfect, fumbles: P.fumbles };
    if (P.win) {
      P.score += Math.round(P.fuse * 100) + Math.max(0, 600 - avg);
      game.audio.play('se_success', 0.5);
      game.end.success(P.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['D5', 0.5], ['A4', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1]], { tempo: 138, wave: 'square', volume: 0.035, loop: true, bass: [['D3', 2], ['A2', 2]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (P.ready > 0 || P.over || P.hitStop > 0) { game.audio.play('se_tap', 0.08); return; }
    passIt();
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!P || !P.demo) P = newTable(true);
      demo.t += dt;
      var cyc = demo.t % 6;
      if (cyc < dt || demo.t <= dt) { P = newTable(true); P.feintAt = 0.3; demo.feintBait = false; }
      if (cyc > 2.2 && cyc < 2.2 + dt * 1.5) { demo.feintBait = true; if (P.phase === 'hold') { P.feintAt = P.holdT + 0.1; P.wait = Math.max(P.wait, 0.8); } }
      if (demo.pressT > 0) { demo.pressT -= dt; if (demo.pressT <= 0) demo.press = false; }
      step(dt);
      drawTable();
      drawSeats();
      drawHolder();
      drawPad();
      game.draw.hand(W / 2 + 40, H * 0.9 + (demo.press ? 0 : 30), { press: demo.press, scale: 14 });
      txt(TITLE, W / 2 + Math.sin(t * 1.3) * 6, H * 0.07, 80, STYLE.accent[0]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 36, STYLE.main[0]);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 42, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.97, 34, STYLE.main[0]);
      return;
    }
    if (state === S.RESULT) {
      drawTable();
      drawSeats();
      drawHolder();
      game.draw.rect(0, 0, W, H, '#1b1330', 0.5);
      if (P.win) {
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: STYLE.main[1], count: 5, speed: 280 });
        txt('CLEAR', W / 2, H * 0.24, 120, STYLE.main[1]);
      } else {
        txt(P.popped ? 'GAME OVER' : 'TIME UP', W / 2, H * 0.24, 100, STYLE.accent[1]);
        txt('あと' + (NEEDED - P.passes) + '回!', W / 2, H * 0.31, 60, STYLE.main[0]);
      }
      txt(P.passes + ' / ' + NEEDED, W / 2, H * 0.38, 60, STYLE.main[0]);
      txt((P.avg || 0) + 'ms  PERFECT ' + P.perfect, W / 2, H * 0.43, 44, STYLE.main[1]);
      txt('SCORE ' + P.score, W / 2, H * 0.48, 48, STYLE.main[0]);
      if (P.win && P.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.53, 52, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.53, 40, STYLE.main[1]);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, STYLE.main[0]);
      return;
    }
    // PLAYING
    if (P.ready > 0) {
      P.ready -= dt;
      if (P.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!P.over) {
        P.timeLeft -= dt;
        if (P.timeLeft <= 0) {
          P.timeLeft = 0; P.over = true; P.win = false; P.hitStop = 0.45;
          game.feedback.bad(HOLD_X, HOLD_Y - 100, { text: 'TIME UP' });
        }
      }
      step(dt);
      if (P.over && P.endWait > 0) {
        P.endWait -= dt;
        if (P.endWait <= 0) { finalize(); return; }
      }
    }
    drawTable();
    drawSeats();
    drawHolder();
    drawPad();
    drawHud();
    if (P.ready > 0) txt(P.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.5], ['D5', 0.5], ['F5', 1], ['E5', 0.5], ['C5', 0.5], ['D5', 1]], { tempo: 108, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    P = newTable(true);
    demo.t = 0;
  });
})(game);
