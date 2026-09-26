// J-N6424-0043-glacier-sled-lean.js
// グレイシャー・スレッド・リーン — 凍った坂でひとりでに傾いていくそりを、左右タップで起こしながら麓の小屋まで滑り切る
// 操作: そりが右に傾いたら左側、左に傾いたら右側をタップして体重を戻す。赤い矢印の氷の畝は、その向きにそりを突き飛ばす
// 終わり: 麓の山小屋に着けば成功。傾きが限界を超えて転倒、または20秒の時間切れで失敗
// @mechanic: balance
// @theme: glacier_sled_post
// 世界観: 吹雪の前に最後の郵便を届けるため、雪ウサギの配達係が白樺の皮のそりで氷河の斜面を下る。つるつるの氷でそりは勝手に傾き、畝に乗るたびに揺さぶられる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイムと越えた畝の数・安定度%
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップを奥ほど圧縮、地平線へ収束する床、少色+地平グラデ
  var STYLE = { bg: ['#1d3a6e', '#6fa8dc', '#e6f3ff'], main: ['#ffffff', '#b8dcf5', '#5a86b8'], accent: ['#ff4b3e', '#ffd84a'] };

  var TITLE = 'GLACIER SLED';
  var TIME_LIMIT = 20;
  var COURSE = 16;
  var HORIZON = H * 0.3;
  var GROUND_B = H * 0.78;
  var SLED_Y = H * 0.64;
  var K_TIP = 1.7;
  var PUSH = 0.85;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var HARE_C = ['.w....w.', '.wp..pw.', '.ww..ww.', '.wwwwww.', 'wwkwwkww', 'wwwnnwww', '.wwwwww.', 'bbwbbwbb', '.bbbbbb.'];
  var HARE_L = ['w....w..', 'wp..pw..', 'ww..ww..', 'wwwwww..', 'wkwwkww.', 'wwnnwww.', '.wwwwww.', 'bbwbbwbb', '.bbbbbb.'];
  var HARE_R = ['..w....w', '..wp..pw', '..ww..ww', '..wwwwww', '.wwkwwkw', '.wwwnnww', '.wwwwww.', 'bbwbbwbb', '.bbbbbb.'];
  var HARE_DOWN = ['........', '........', '..wwwwww', '.wwxwwxw', 'wwwwooow', 'pwwwwwww', 'bbbbbbbb', '.bbbbbb.', '........'];
  var HARE_PAL = { w: '#ffffff', p: '#ffb3c7', k: '#243048', n: '#ff8fa3', b: '#4a7bd0', x: '#ff4b3e', o: '#c0304a' };
  var PINE = ['...g...', '..ggg..', '.ggggg.', '..ggg..', '.ggggg.', 'ggggggg', '...t...'];
  var LODGE = ['....rr....', '...rrrr...', '..rrrrrr..', '.rrrrrrrr.', 'rrrrrrrrrr', '.wwwwwwww.', '.wyywwyyw.', '.wyywwddw.', '.wwwwwddw.'];
  var ENV = ['eeeeeeee', 'effeeffe', 'eeffffee', 'eeeeeeee'];

  var sl = null;
  var demo = { t: 0, gx: W / 2, gy: H * 0.87, press: false, pressT: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 2, y + 3, { size: size, color: '#0f2244', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function newRide(isDemo) {
    return {
      demo: isDemo, tilt: 0.05, vel: 0, drift: 0, dist: 0, scroll: 0,
      bump: null, bumpGap: 1.6, bumps: 0, steady: 0, total: 0, danger: false,
      hitStop: 0, over: false, win: false, endWait: -1, crashed: false,
      ready: isDemo ? 0 : 0.8, timeLeft: TIME_LIMIT, elapsed: 0, milestone: false, score: 0, flash: 0
    };
  }

  function push(dir) {
    // dir: -1 = lean to the left side, +1 = lean to the right side
    sl.vel += dir * PUSH;
    sl.flash = 0.15;
    game.audio.play('se_tap', 0.25);
    game.fx.burst(W / 2 + dir * 150, SLED_Y + 60, { color: '#ffffff', count: 5, speed: 180 });
  }

  function step(dt) {
    if (sl.flash > 0) sl.flash -= dt;
    if (sl.hitStop > 0) {
      sl.hitStop -= dt;
      if (sl.hitStop <= 0) {
        if (sl.over) sl.endWait = 0.6;
        else if (sl.demo && sl.crashed) { sl.crashed = false; sl.tilt = 0.05; sl.vel = 0; }
      }
      return;
    }
    if (sl.over) return;
    sl.elapsed += dt;
    // unstable ice: the lean feeds itself
    sl.drift += game.random(-1, 1) * dt * 0.8;
    sl.drift *= Math.pow(0.5, dt);
    sl.vel += (K_TIP * sl.tilt + sl.drift * 0.6) * dt;
    sl.vel *= Math.pow(0.5, dt);
    sl.tilt += sl.vel * dt;
    var stab = Math.max(0, 1 - Math.abs(sl.tilt));
    var speed = 1 + 0.5 * stab * stab;
    sl.dist += speed * dt;
    sl.scroll += speed * dt * 2.2;
    sl.total += dt;
    if (Math.abs(sl.tilt) < 0.3) sl.steady += dt;
    // danger telegraph (creak)
    if (Math.abs(sl.tilt) > 0.68 && !sl.danger) { sl.danger = true; game.audio.tone('D3', 0.12, { wave: 'sawtooth', volume: 0.06 }); }
    if (sl.danger && Math.abs(sl.tilt) < 0.25) {
      sl.danger = false;
      if (!sl.demo) game.feedback.good(W / 2, SLED_Y - 180, { text: 'NICE', color: STYLE.accent[1] });
    }
    // ice ridges: seen on the horizon 0.8s before they kick the sled
    if (!sl.bump) {
      sl.bumpGap -= dt;
      if (sl.bumpGap <= 0) {
        sl.bump = { t: 0, dur: 0.8, dir: game.random(0, 1) < 0.5 ? -1 : 1 };
        game.audio.tone('A4', 0.08, { wave: 'square', volume: 0.05 });
      }
    } else {
      sl.bump.t += dt;
      if (sl.bump.t >= sl.bump.dur) {
        sl.vel += sl.bump.dir * 1.05;
        sl.bumps++;
        game.audio.play('se_jump', 0.25);
        game.fx.shake(6, 0.15);
        sl.bump = null;
        sl.bumpGap = Math.max(1.0, 1.9 - sl.dist * 0.05) + game.random(0, 0.4);
        if (!sl.demo && sl.bumps % 3 === 0) game.audio.play('se_coin', 0.25);
      }
    }
    if (!sl.demo && !sl.milestone && sl.dist >= COURSE / 2) {
      sl.milestone = true;
      game.fx.popup(Math.round(sl.dist / COURSE * 100) + '%', W / 2, H * 0.36, { color: STYLE.accent[1], size: 64 });
      game.audio.play('se_milestone', 0.4);
    }
    if (Math.abs(sl.tilt) >= 1) {
      sl.tilt = sl.tilt > 0 ? 1 : -1;
      sl.crashed = true; sl.hitStop = 0.55;
      game.audio.play('se_break', 0.3);
      if (!sl.demo) {
        sl.over = true; sl.win = false;
        game.feedback.bad(W / 2 + sl.tilt * 160, SLED_Y, { text: 'MISS' });
      } else {
        game.audio.tone('C3', 0.15, { wave: 'sawtooth', volume: 0.05 });
      }
      return;
    }
    if (!sl.demo && sl.dist >= COURSE) {
      sl.over = true; sl.win = true; sl.hitStop = 0.5;
      game.fx.burst(W / 2, SLED_Y - 60, { color: STYLE.accent[1], count: 36, speed: 520 });
    }
  }

  function demoPilot(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) sl = newRide(true);
    if (demo.pressT > 0) { demo.pressT -= dt; if (demo.pressT <= 0) demo.press = false; }
    var lazy = cyc > 4.2 && cyc < 5.6;
    if (!lazy && sl.hitStop <= 0 && demo.pressT <= 0 && Math.abs(sl.tilt + sl.vel * 0.35) > 0.28) {
      var dir = sl.tilt > 0 ? -1 : 1;
      demo.gx = dir < 0 ? W * 0.25 : W * 0.75; demo.gy = H * 0.87;
      demo.press = true; demo.pressT = 0.28;
      push(dir);
    }
    if (lazy && Math.abs(sl.tilt) < 0.5) sl.vel += (sl.tilt >= 0 ? 1 : -1) * dt * 1.2;
  }

  function drawSlope() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HORIZON, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // far peaks
    for (var p = 0; p < 7; p++) {
      var px = p * 180 - 40, ph = 120 + (p % 3) * 60;
      for (var row = 0; row < ph; row += 6) {
        var half = (ph - row) * 0.9;
        game.draw.rect(px + 90 - half, HORIZON - row - 6, half * 2, 6, row > ph - 40 ? '#ffffff' : '#8fb3d9');
      }
    }
    // mode7 floor: strips compress toward the horizon
    for (var y = HORIZON; y < H; y += 6) {
      var depth = (y - HORIZON) + 8;
      var z = 400 / depth;
      var band = Math.floor(z * 3 + sl.scroll * 3) % 2;
      var shade = y > GROUND_B ? '#cfe6f7' : (band ? '#e6f3ff' : '#b8dcf5');
      game.draw.rect(0, y, W, 6, shade);
    }
    // track edges converging
    game.draw.line(W / 2 - 40, HORIZON, W * 0.05, H, STYLE.main[2], 6);
    game.draw.line(W / 2 + 40, HORIZON, W * 0.95, H, STYLE.main[2], 6);
    // passing pines on both sides
    for (var i = 0; i < 6; i++) {
      var f = ((i / 6) + sl.scroll * 0.12) % 1;
      var yy = HORIZON + f * f * (H - HORIZON);
      var spread = 60 + f * f * 620;
      var scale = 2 + f * f * 16;
      game.draw.sprite(PINE, { g: '#2f6b4f', t: '#6b4a2e' }, W / 2 - spread - 60, yy - scale * 7, scale, { anchor: 'center' });
      game.draw.sprite(PINE, { g: '#2f6b4f', t: '#6b4a2e' }, W / 2 + spread + 60, yy - scale * 7, scale, { anchor: 'center' });
    }
    // the lodge grows on the horizon as the course runs out
    var prog = Math.min(1, sl.dist / COURSE);
    game.draw.sprite(LODGE, { r: '#b23b3b', w: '#8b5a3c', y: STYLE.accent[1], d: '#3b2416' }, W / 2, HORIZON - 10 - prog * 60, 3 + prog * 12, { anchor: 'center' });
    // incoming ridge (telegraph)
    if (sl.bump) {
      var u = sl.bump.t / sl.bump.dur;
      var by = HORIZON + u * u * (SLED_Y + 60 - HORIZON);
      var bw = 80 + u * u * 700;
      game.draw.rect(W / 2 - bw / 2, by - 6, bw, 12 + u * 16, '#9ed4f5');
      game.draw.rect(W / 2 - bw / 2, by - 6, bw, 4, '#ffffff');
      if (Math.floor(t * 10) % 2 === 0) {
        var ax = W / 2 + sl.bump.dir * (bw / 2 + 40);
        game.draw.circle(ax, by - 10, 22 + u * 18, STYLE.accent[0]);
        game.draw.line(ax - sl.bump.dir * 20, by - 10, ax + sl.bump.dir * 20, by - 10, '#ffffff', 8);
      }
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawSled() {
    var t = game.time.elapsed;
    var ang = sl.tilt * 0.62;
    var cx = W / 2 + sl.tilt * 90, cy = SLED_Y + 70;
    var dx = Math.cos(ang) * 190, dy = Math.sin(ang) * 190;
    game.draw.circle(cx, cy + 30, 150, '#5a86b8', 0.25);
    if (sl.crashed && sl.hitStop > 0) game.draw.circle(cx, cy - 60, 200, '#ffffff', 0.6);
    game.draw.line(cx - dx, cy - dy, cx + dx, cy + dy, '#8b5a3c', 34);
    game.draw.line(cx - dx, cy - dy + 22, cx + dx, cy + dy + 22, '#3b2416', 8);
    var art = HARE_C;
    if (sl.crashed) art = HARE_DOWN;
    else if (sl.tilt < -0.25) art = HARE_R;
    else if (sl.tilt > 0.25) art = HARE_L;
    var sc = sl.crashed && sl.hitStop > 0 ? 20 : 17;
    game.draw.sprite(art, HARE_PAL, cx + (sl.crashed ? sl.tilt * 120 : 0), cy - 120 + Math.sin(t * 9) * 3, sc, { anchor: 'center' });
    game.draw.sprite(ENV, { e: '#f3e3c3', f: '#b23b3b' }, cx - dx * 0.7, cy - dy * 0.7 - 40, 7, { anchor: 'center' });
  }

  function drawControls() {
    var t = game.time.elapsed;
    var needL = sl.tilt > 0.3, needR = sl.tilt < -0.3;
    var ly = H * 0.87;
    game.draw.circle(W * 0.25, ly, 115 + (needL ? Math.sin(t * 12) * 10 : 0), '#ffffff', needL ? 0.55 : 0.3);
    game.draw.circle(W * 0.25, ly, 95, STYLE.main[2]);
    game.draw.line(W * 0.25 + 40, ly, W * 0.25 - 40, ly, '#ffffff', 16);
    game.draw.line(W * 0.25 - 40, ly, W * 0.25 - 10, ly - 30, '#ffffff', 14);
    game.draw.line(W * 0.25 - 40, ly, W * 0.25 - 10, ly + 30, '#ffffff', 14);
    game.draw.circle(W * 0.75, ly, 115 + (needR ? Math.sin(t * 12) * 10 : 0), '#ffffff', needR ? 0.55 : 0.3);
    game.draw.circle(W * 0.75, ly, 95, STYLE.main[2]);
    game.draw.line(W * 0.75 - 40, ly, W * 0.75 + 40, ly, '#ffffff', 16);
    game.draw.line(W * 0.75 + 40, ly, W * 0.75 + 10, ly - 30, '#ffffff', 14);
    game.draw.line(W * 0.75 + 40, ly, W * 0.75 + 10, ly + 30, '#ffffff', 14);
  }

  function drawHud() {
    // tilt gauge: green centre, red edges, needle
    var gx = 120, gw = W - 240, gy = 150;
    game.draw.rect(gx, gy, gw, 26, STYLE.accent[0]);
    game.draw.rect(gx + gw * 0.16, gy, gw * 0.68, 26, '#ffd84a');
    game.draw.rect(gx + gw * 0.35, gy, gw * 0.3, 26, '#5fd08a');
    var nx = gx + gw / 2 + sl.tilt * gw / 2;
    game.draw.rect(nx - 6, gy - 14, 12, 54, Math.abs(sl.tilt) > 0.68 && Math.floor(game.time.elapsed * 10) % 2 ? STYLE.accent[0] : '#0f2244');
    var prog = Math.min(1, sl.dist / COURSE);
    txt(Math.round(prog * 100) + '%', W / 2, 100, 60, '#ffffff');
    game.draw.rect(60, 205, W - 120, 14, '#0f2244');
    game.draw.rect(60, 205, (W - 120) * prog, 14, STYLE.accent[1]);
    var frac = Math.max(0, sl.timeLeft / TIME_LIMIT);
    game.draw.rect(W - 80, 60, 20, 70, '#0f2244');
    game.draw.rect(W - 80, 60 + 70 * (1 - frac), 20, 70 * frac, sl.timeLeft < 4 ? STYLE.accent[0] : '#ffffff');
  }

  function initGame() {
    sl = newRide(false);
  }

  function wrapUp() {
    state = S.RESULT;
    game.audio.stopBgm();
    var steadyPct = Math.round(sl.steady / Math.max(0.1, sl.total) * 100);
    sl.steadyPct = steadyPct;
    var stats = { seconds: Math.round(sl.total * 10) / 10, ridges: sl.bumps, steady: steadyPct };
    if (sl.win) {
      sl.score = Math.max(0, Math.round((TIME_LIMIT - sl.total) * 100)) + sl.bumps * 50 + steadyPct * 5;
      game.audio.play('se_success', 0.5);
      game.end.success(sl.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['E5', 0.5], ['D5', 0.5], ['B4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1]], { tempo: 140, wave: 'triangle', volume: 0.045, loop: true, bass: [['E3', 2], ['G2', 2]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (sl.ready > 0 || sl.over || sl.hitStop > 0) { game.audio.play('se_tap', 0.08); return; }
    push(x < W / 2 ? -1 : 1);
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!sl || !sl.demo) sl = newRide(true);
      demoPilot(dt);
      step(dt);
      drawSlope();
      drawSled();
      drawControls();
      game.draw.hand(demo.gx, demo.gy + 30, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2 + Math.sin(t * 1.3) * 6, H * 0.07, 80, '#ffffff');
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 36, STYLE.accent[1]);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 42, STYLE.accent[1]);
      else txt('INSERT COIN', W / 2, H * 0.96, 34, '#ffffff');
      return;
    }
    if (state === S.RESULT) {
      drawSlope();
      drawSled();
      game.draw.rect(0, 0, W, H, '#0f2244', 0.45);
      if (sl.win) {
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: STYLE.accent[1], count: 5, speed: 280 });
        txt('CLEAR', W / 2, H * 0.28, 120, STYLE.accent[1]);
      } else {
        txt(sl.crashed ? 'GAME OVER' : 'TIME UP', W / 2, H * 0.28, 100, STYLE.accent[0]);
        txt(Math.round(Math.min(1, sl.dist / COURSE) * 100) + '%', W / 2, H * 0.35, 64, '#ffffff');
      }
      txt((Math.round(sl.total * 10) / 10) + '秒', W / 2, H * 0.43, 56, '#ffffff');
      txt('x' + sl.bumps + '   ' + (sl.steadyPct || 0) + '%', W / 2, H * 0.48, 44, STYLE.main[1]);
      txt('SCORE ' + sl.score, W / 2, H * 0.53, 48, '#ffffff');
      if (sl.win && sl.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.58, 52, STYLE.accent[1]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 40, STYLE.main[1]);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, '#ffffff');
      return;
    }
    // PLAYING
    if (sl.ready > 0) {
      sl.ready -= dt;
      if (sl.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!sl.over) {
        sl.timeLeft -= dt;
        if (sl.timeLeft <= 0) {
          sl.timeLeft = 0; sl.over = true; sl.win = false; sl.hitStop = 0.45;
          game.feedback.bad(W / 2, SLED_Y - 120, { text: 'TIME UP' });
        }
      }
      step(dt);
      if (sl.over && sl.endWait > 0) {
        sl.endWait -= dt;
        if (sl.endWait <= 0) { wrapUp(); return; }
      }
    }
    drawSlope();
    drawSled();
    drawControls();
    drawHud();
    if (sl.ready > 0) txt(sl.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 120, STYLE.accent[1]);
  });

  game.onStart(function() {
    game.audio.melody([['B4', 1], ['E5', 0.5], ['D5', 0.5], ['B4', 1], ['A4', 1]], { tempo: 96, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    sl = newRide(true);
    demo.t = 0;
  });
})(game);
