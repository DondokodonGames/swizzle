// J-GC4-0005-karakuri-stall-trials.js
// からくり屋台の三番勝負 — 叩く・払う・押さえるの小さな試しが次々に切り替わり、ひとつも落とさず2周勝ち抜く
// 操作: 紙風船が出たら全部タップ / 風見の魚が向いた方へスワイプ(2回) / やかんは押し続けて湯気の目盛りが緑の帯に来たら離す
// 終わり: 3つの試し×2周(6本)を全部こなせばCLEAR。1本でも落とす(間違い・時間切れ・吹きこぼれ)と脱落でGAME OVER
// @mechanic: jackpot_combo
// @theme: karakuri_stall_trials
// 世界観: 夜店通りのからくり屋台で、店主のからくり人形が矢継ぎ早に出す小さな試しを、見習いの子が一度も落とさず続けてこなし、連勝の倍率を積み上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 突破した試しの数・最大倍率のスコア
// スタイル: 8bit HOME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドットのタイル反復背景
  var STYLE = {
    bg: ['#000000', '#1a1c4d', '#3a2b73'],
    main: ['#f7d51d', '#f2f2f2', '#e83b3b'],
    accent: ['#3ba55c', '#5ec8f2'],
  };
  var BLACK = '#000000';

  var GAME_TITLE = 'STALL TRIALS';
  var TIME_LIMIT = 24;
  var NEEDED = 6;
  var INTRO = 0.75;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var DOLL_A = [
    '..yyyy..',
    '.yyyyyy.',
    '.wkwwkw.',
    '.wwwwww.',
    '..wrrw..',
    'rrrrrrrr',
    'r.rrrr.r',
    '..r..r..',
  ];
  var DOLL_B = [
    '..yyyy..',
    '.yyyyyy.',
    '.wkwwkw.',
    '.wwwwww.',
    'r.wrrw.r',
    '.rrrrrr.',
    '..rrrr..',
    '..r..r..',
  ];
  var DOLL_PAL = { y: '#f7d51d', w: '#f2f2f2', k: '#000000', r: '#e83b3b' };
  var BALLOON = [
    '..rwwr..',
    '.rwwrrr.',
    'rwwrrrry',
    'rrrryyyy',
    'yyyyrrrr',
    '.yyrrrr.',
    '..rrrr..',
    '...k....',
  ];
  var BALLOON_PAL = { r: '#e83b3b', w: '#f2f2f2', y: '#f7d51d', k: '#f2f2f2' };
  var FISH_R = [
    '...bb.......',
    '..bbbbb...b.',
    '.bwkbbbbbbb.',
    'bbbbbbbbbbbb',
    '.bbbbbbbbbb.',
    '..bbbbb...b.',
    '...bb.......',
  ];
  var FISH_U = [
    '...b...',
    '..bbb..',
    '.bbbbb.',
    'bbwkbbb',
    'bbbbbbb',
    '.bbbbb.',
    '.bbbbb.',
    '..bbb..',
    '..bbb..',
    '.b.b.b.',
    'b..b..b',
  ];
  var FISH_PAL = { b: '#5ec8f2', w: '#f2f2f2', k: '#000000' };
  var KETTLE = [
    '...kk.....',
    '.kkkkkk...',
    'kyyyyyyk..',
    'kyyyyyykk.',
    'kyyyyyyk.k',
    'kyyyyyyk..',
    '.kkkkkk...',
  ];
  var BRICK = ['rrrrrrr.', 'rrrrrrr.', 'rrrrrrr.', '........', 'rrr.rrrr', 'rrr.rrrr', 'rrr.rrrr', '........'];

  var queue, qi, task, phase, phaseT, fuse, fuseMax, mult, maxMult, cleared, score, timeLeft, ready, freeze, ended, endWait, won;
  var balloons, vanes, vaneIdx, gauge, holding, band, pStart, dollJoy;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function initGame() {
    queue = ['tap', 'swipe', 'hold'].concat(shuffle(['tap', 'swipe', 'hold']));
    qi = 0;
    mult = 1;
    maxMult = 1;
    cleared = 0;
    score = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    pStart = null;
    dollJoy = 0;
    startTask(0);
  }

  function startTask(i) {
    qi = i;
    task = queue[i];
    phase = 'intro';
    phaseT = INTRO;
    fuseMax = i < 3 ? 3.4 : 2.6;
    fuse = fuseMax;
    holding = false;
    gauge = 0;
    if (task === 'tap') {
      balloons = [];
      for (var b = 0; b < 3; b++) balloons.push({ x: W * (0.22 + b * 0.28) + game.random(-40, 40), y: H * (0.44 + (b % 2) * 0.1), ph: Math.random() * 6, popped: false });
    } else if (task === 'swipe') {
      var dirs = ['up', 'down', 'left', 'right'];
      var d1 = dirs[Math.floor(Math.random() * 4)];
      var d2 = dirs[Math.floor(Math.random() * 4)];
      if (d2 === d1) d2 = dirs[(dirs.indexOf(d1) + 1 + Math.floor(Math.random() * 3)) % 4];
      vanes = [d1, d2];
      vaneIdx = 0;
    } else {
      var lo = 0.55 + Math.random() * 0.15;
      band = [lo, lo + 0.18];
    }
  }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: BLACK, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  function taskDone(x, y, demo) {
    phase = 'done';
    phaseT = 0.5;
    cleared++;
    var bonus = Math.round(fuse * 30);
    score += 100 * mult + bonus;
    dollJoy = 0.5;
    game.feedback.good(x, y, { text: fuse > fuseMax * 0.5 ? 'PERFECT' : 'GOOD', color: STYLE.main[0], count: 18, volume: demo ? 0 : undefined });
    mult++;
    maxMult = Math.max(maxMult, mult);
    if (!demo) {
      game.fx.popup('x' + mult, W * 0.5, H * 0.3, { color: STYLE.accent[0], size: 72 });
      if (cleared === 3) { game.fx.popup('3 / ' + NEEDED, W * 0.5, H * 0.36, { color: STYLE.main[0], size: 60 }); game.audio.play('se_milestone', 0.5); }
      else game.audio.play('se_powerup', 0.35);
    }
  }

  function taskFail(x, y, demo) {
    if (freeze || ended || phase !== 'go') return;
    phase = 'fail';
    freeze = { t: 0.45, x: x, y: y, done: function () {
      game.feedback.bad(x, y, { text: 'MISS' });
      mult = 1;
      if (!demo) endGame(false);
      else demoFailed = true;
    } };
  }

  // ── 入力の中身(プレイヤーとデモで共用) ─────────────────
  function doTap(x, y, demo) {
    if (task !== 'tap' || phase !== 'go') return false;
    for (var i = 0; i < balloons.length; i++) {
      var b = balloons[i];
      if (b.popped) continue;
      if (Math.hypot(b.x - x, by(b) - y) < 110) {
        b.popped = true;
        game.fx.burst(b.x, by(b), { color: STYLE.main[2], count: 14, speed: 380 });
        if (!demo) game.audio.play('se_break', 0.4);
        var left = 0;
        for (var k = 0; k < balloons.length; k++) if (!balloons[k].popped) left++;
        if (left === 0) taskDone(b.x, by(b), demo);
        return true;
      }
    }
    return false;
  }
  function doSwipe(dir, demo) {
    if (task !== 'swipe' || phase !== 'go') return;
    if (dir === vanes[vaneIdx]) {
      game.fx.burst(W * 0.5, H * 0.47, { color: STYLE.accent[1], count: 12, speed: 320 });
      if (!demo) game.audio.play('se_jump', 0.35);
      vaneIdx++;
      if (vaneIdx >= vanes.length) taskDone(W * 0.5, H * 0.47, demo);
    } else {
      taskFail(W * 0.5, H * 0.47, demo);
    }
  }
  function holdStart(demo) {
    if (task !== 'hold' || phase !== 'go' || holding) return;
    holding = true;
    if (!demo) game.audio.play('se_tap', 0.3);
  }
  function holdEnd(demo) {
    if (task !== 'hold' || phase !== 'go' || !holding) return;
    holding = false;
    if (gauge >= band[0] && gauge <= band[1]) taskDone(W * 0.5, H * 0.45, demo);
    else taskFail(W * 0.5, H * 0.45, demo);
  }

  function by(b) { return b.y + Math.sin(game.time.elapsed * 3 + b.ph) * 30; }

  var demoFailed = false;

  function stepWorld(dt, demo) {
    if (dollJoy > 0) dollJoy -= dt;
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (ended) return;
    if (phase === 'intro') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'go';
        if (!demo) {
          game.audio.tone('G5', 0.08, { wave: 'square', volume: 0.08 });
          // 導入中から押しっぱなしなら、そのままやかんを温め始める
          if (task === 'hold' && game.input.pressing) holdStart(false);
        }
      }
      return;
    }
    if (phase === 'done') {
      phaseT -= dt;
      if (phaseT <= 0) {
        if (qi + 1 >= queue.length) {
          if (!demo) {
            score += Math.round(timeLeft * 20);
            game.feedback.good(W * 0.5, H * 0.4, { text: 'CLEAR', color: STYLE.main[0], count: 40 });
            endGame(true);
          }
          return;
        }
        startTask(qi + 1);
      }
      return;
    }
    if (phase !== 'go') return;
    fuse -= dt;
    if (task === 'hold' && holding) {
      gauge += dt * (qi < 3 ? 0.5 : 0.62);
      if (gauge > 1) { gauge = 1; holding = false; taskFail(W * 0.5, H * 0.45, demo); return; }
    }
    if (fuse <= 0) {
      fuse = 0;
      var fx = W * 0.5, fy = H * 0.47;
      if (task === 'tap') { for (var i = 0; i < balloons.length; i++) if (!balloons[i].popped) { fx = balloons[i].x; fy = by(balloons[i]); } }
      taskFail(fx, fy, demo);
    }
  }

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.62, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 提灯の列(揺れる)
    for (var i = 0; i < 7; i++) {
      var lx = 80 + i * 155, ly = H * 0.2 + Math.sin(t * 2 + i) * 10;
      game.draw.line(lx, H * 0.17, lx, ly, STYLE.main[1], 3);
      game.draw.rect(lx - 24, ly, 48, 56, i % 2 ? STYLE.main[2] : STYLE.main[0]);
      game.draw.rect(lx - 24, ly + 24, 48, 8, BLACK);
    }
    game.draw.line(0, H * 0.17, W, H * 0.17, STYLE.main[1], 4);
    // 屋台のカウンター(8x8レンガのタイル反復)
    game.draw.rect(0, H * 0.62, W, H * 0.38, '#5a1a1a');
    for (var ty = 0; ty < 10; ty++) for (var tx = 0; tx < 17; tx++) {
      game.draw.sprite(BRICK, { r: '#8a2b2b' }, tx * 64, H * 0.66 + ty * 64, 8);
    }
    game.draw.rect(0, H * 0.62, W, 28, STYLE.main[0]);
    game.draw.rect(0, 0, W, H, STYLE.main[0], 0.025 + 0.02 * Math.sin(t * 2.3));
  }

  function drawDoll() {
    var t = game.time.elapsed;
    var art = (dollJoy > 0 || Math.floor(t * 3) % 2 === 0) ? DOLL_B : DOLL_A;
    var shakeX = phase === 'fail' ? Math.sin(t * 60) * 12 : 0;
    game.draw.sprite(art, DOLL_PAL, W * 0.5 + shakeX, H * 0.29 + Math.sin(t * 2) * 8, 16, { anchor: 'center' });
  }

  function drawTask() {
    var t = game.time.elapsed;
    if (task === 'tap') {
      for (var i = 0; i < balloons.length; i++) {
        var b = balloons[i];
        if (b.popped) continue;
        game.draw.sprite(BALLOON, BALLOON_PAL, b.x, by(b), 22, { anchor: 'center' });
      }
    } else if (task === 'swipe') {
      for (var v = 0; v < vanes.length; v++) {
        var d = vanes[v];
        var cx = W * 0.5 + (v - vaneIdx) * 420, cy = H * 0.47;
        if (v < vaneIdx) continue;
        var sc = v === vaneIdx ? 24 : 12;
        var al = v === vaneIdx ? 1 : 0.5;
        var wob = Math.sin(t * 6) * 10;
        game.draw.line(cx, cy + 40, cx, H * 0.6, STYLE.main[1], 8);
        if (d === 'right' || d === 'left') game.draw.sprite(FISH_R, FISH_PAL, cx + (d === 'right' ? wob : -wob), cy, sc, { anchor: 'center', flipX: d === 'left', alpha: al });
        else game.draw.sprite(FISH_U, FISH_PAL, cx, cy + (d === 'down' ? wob : -wob), sc, { anchor: 'center', flipY: d === 'down', alpha: al });
      }
    } else {
      var kx = W * 0.5, ky = H * 0.48;
      // 炭火
      for (var f = 0; f < 5; f++) game.draw.rect(kx - 150 + f * 64, H * 0.58, 48, 24, Math.floor(t * 10 + f) % 2 ? STYLE.main[2] : STYLE.main[0]);
      game.draw.sprite(KETTLE, { k: BLACK, y: '#9aa3b5' }, kx, ky, 26, { anchor: 'center' });
      // 湯気
      var puff = holding ? 6 : 2;
      for (var p = 0; p < puff; p++) {
        var py = ky - 130 - ((t * 200 + p * 60) % 220);
        game.draw.rect(kx + 150 + Math.sin(t * 5 + p) * 20, py, 28, 28, STYLE.main[1], 0.6);
      }
      // 目盛り(縦ゲージ)
      var gx = W * 0.84, gy0 = H * 0.36, gh = H * 0.22;
      game.draw.rect(gx - 30, gy0, 60, gh, BLACK);
      game.draw.rect(gx - 30, gy0 + gh * (1 - band[1]), 60, gh * (band[1] - band[0]), STYLE.accent[0]);
      game.draw.rect(gx - 22, gy0 + gh * (1 - gauge), 44, gh * gauge, STYLE.main[1], 0.85);
      game.draw.rect(gx - 40, gy0 + gh * (1 - gauge) - 4, 80, 8, STYLE.main[0]);
    }
    // 導入の実演(文字の代わりに手で見せる)
    if (phase === 'intro' && state === S.PLAYING) {
      var k = 1 - phaseT / INTRO;
      if (task === 'tap') game.draw.hand(balloons[0].x, by(balloons[0]) + 20, { press: k > 0.4, scale: 11, alpha: 0.85 });
      else if (task === 'swipe') {
        var dv = vanes[0];
        var dx = dv === 'right' ? 1 : dv === 'left' ? -1 : 0;
        var dy = dv === 'down' ? 1 : dv === 'up' ? -1 : 0;
        game.draw.hand(W * 0.5 + dx * 260 * (k - 0.5), H * 0.66 + dy * 200 * (k - 0.5), { press: true, scale: 11, alpha: 0.85 });
      } else game.draw.hand(W * 0.5, H * 0.72, { press: true, scale: 11, alpha: 0.85 });
    }
    if (freeze) {
      var a = 0.5 + 0.5 * Math.sin(freeze.t * 40);
      game.draw.circle(freeze.x, freeze.y, 120 + (0.45 - freeze.t) * 260, '#ffffff', 0.35 * a);
    }
  }

  function drawHud() {
    txt(cleared + ' / ' + NEEDED, W * 0.2, H * 0.045, 56, STYLE.main[1]);
    txt('x' + mult, W * 0.5, H * 0.045, 60, STYLE.accent[0]);
    txt('SCORE ' + score, W * 0.8, H * 0.045, 34, STYLE.main[1]);
    // 導火線(1本ぶんの残り時間)
    var bw = W - 160;
    var k = phase === 'go' ? fuse / fuseMax : phase === 'intro' ? 1 : 0;
    game.draw.rect(80, H * 0.085, bw, 18, '#333355');
    game.draw.rect(80, H * 0.085, bw * Math.max(0, k), 18, k < 0.3 ? STYLE.main[2] : STYLE.main[0]);
    if (phase === 'go') game.draw.circle(80 + bw * Math.max(0, k), H * 0.085 + 9, 16 + Math.sin(game.time.elapsed * 30) * 5, STYLE.main[2]);
    // 全体の残り時間(細線)
    game.draw.rect(80, H * 0.105, bw * Math.max(0, timeLeft / TIME_LIMIT), 6, STYLE.accent[1]);
    // 6本の進み(提灯マーク)
    for (var i = 0; i < NEEDED; i++) {
      game.draw.rect(W * 0.5 - 250 + i * 90, H * 0.125, 50, 34, i < cleared ? STYLE.main[0] : i === qi ? STYLE.main[1] : '#333355');
    }
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.33, W, H * 0.26, BLACK, 0.8);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.39, 96, won ? STYLE.main[0] : STYLE.main[2]);
    txt('SCORE ' + score, W * 0.5, H * 0.46, 50, STYLE.main[1]);
    if (!won) txt('あと' + (NEEDED - cleared) + '本!', W * 0.5, H * 0.52, 48, STYLE.main[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.52, 48, STYLE.main[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.52, 44, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演(同じ関数で遊ぶ) ─────────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.75, press: false, cycle: 0, act: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || !queue || demoFailed || (qi >= 2 && phase === 'done' && phaseT < 0.05)) {
      if (!(demo.t <= dt) && !demoFailed) demo.cycle++;
      if (demoFailed) demo.cycle++;
      demoFailed = false;
      initGame();
      ready = 0;
      queue = ['tap', 'swipe', 'hold', 'tap', 'swipe', 'hold'];
      startTask(0);
      demo.act = 0;
    }
    demo.press = false;
    if (phase !== 'go' || freeze) { demo.gx += (W * 0.5 - demo.gx) * Math.min(1, dt * 4); demo.gy += (H * 0.75 - demo.gy) * Math.min(1, dt * 4); return; }
    demo.act += dt;
    if (task === 'tap') {
      var target = null;
      for (var i = 0; i < balloons.length; i++) if (!balloons[i].popped) { target = balloons[i]; break; }
      if (!target) return;
      var tx = target.x, ty = by(target) + 30;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 12);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 12);
      if (Math.hypot(tx - demo.gx, ty - demo.gy) < 30 && demo.act > 0.25) { demo.press = true; demo.act = 0; doTap(target.x, by(target), true); }
    } else if (task === 'swipe') {
      var d = vanes[vaneIdx];
      var dx = d === 'right' ? 1 : d === 'left' ? -1 : 0;
      var dy = d === 'down' ? 1 : d === 'up' ? -1 : 0;
      var k = Math.min(1, demo.act / 0.45);
      demo.gx = W * 0.5 + dx * 300 * (k - 0.5);
      demo.gy = H * 0.72 + dy * 220 * (k - 0.5);
      demo.press = true;
      if (k >= 1) { demo.act = 0; doSwipe(d, true); }
    } else {
      demo.gx = W * 0.5; demo.gy = H * 0.74;
      if (!holding && gauge === 0) holdStart(true);
      demo.press = holding;
      // 1周おきに離し遅れて吹きこぼれ(失敗例)を見せる
      var aim = demo.cycle % 2 === 0 ? (band[0] + band[1]) / 2 : 2;
      if (holding && gauge >= aim) holdEnd(true);
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) return;
    if (task === 'tap' && phase === 'go') {
      if (!doTap(x, y, false)) game.audio.play('se_tap', 0.2);
    }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    pStart = { x: x, y: y };
    if (task === 'hold') holdStart(false);
    else game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 100 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || ended || !pStart) return;
    var dx = x - pStart.x, dy = y - pStart.y;
    pStart = null;
    if (task === 'hold') { holdEnd(false); return; }
    if (task === 'swipe' && Math.hypot(dx, dy) > 80) {
      var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      game.audio.play('se_tap', 0.2);
      doSwipe(dir, false);
    }
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawDoll();
      drawTask();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W * 0.5, H * 0.07, 84, STYLE.main[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.125, 38, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.9, 48, STYLE.main[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.9, 42, STYLE.main[1]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawDoll();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.9, 40, STYLE.main[1]);
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawDoll();
      drawTask();
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { trials: cleared, maxMult: maxMult };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
    } else {
      if (!freeze) {
        timeLeft -= dt;
        if (timeLeft <= 0 && phase !== 'fail') {
          timeLeft = 0;
          phase = 'go';
          taskFail(W * 0.5, H * 0.45, false);
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawDoll();
    drawTask();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.72, 110, STYLE.main[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 2]],
      { tempo: 168, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['E2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
