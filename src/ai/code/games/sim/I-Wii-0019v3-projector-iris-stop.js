// I-Wii-0019v3-projector-iris-stop.js
// 映写室の絞り止め — ゆっくり回り続ける絞りリングの光る目盛りが、上の三角印に重なった瞬間に1回だけタップして止める
// 操作: 画面のどこかを1巻につき1回だけタップするとリングが止まる。光る目盛りと三角印のずれで判定。後半は映写機のシャッターが明滅してリングが途切れ途切れにしか見えず、回る向きも変わる
// 終わり: 6巻を掛け終えればCLEAR。ずれが大きい/目盛りが三角印を通り過ぎるのが2回でGAME OVER(15秒を超えてもGAME OVER)
// @mechanic: timing_one_shot
// @theme: old_cinema_projection_booth
// 世界観: 古い映画館の映写室で、映写技師がフィルムを掛け替えるたびにゆっくり回る絞りリングを指定の目盛りぴったりで止め、客席のスクリーンにくっきりした映像を映し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 掛けた巻数・PERFECT数・スコア
// スタイル: 1BIT INK

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 紙白と墨の2値。中間色は市松ディザで作る
  var STYLE = { bg: ['#0b0b0b', '#000000'], main: ['#f4f1e8', '#0b0b0b', '#f4f1e8'], accent: ['#ffffff', '#000000'] };
  var INK = STYLE.main[1], PAPER = STYLE.main[0], WHITE = STYLE.accent[0];

  var TITLE = 'IRIS STOP';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var MAX_MISS = 2;
  var LX = W / 2, LY = Math.round(H * 0.53);
  var R = 300;
  var STEP = 15;
  var FSTOPS = ['2', '2.8', '4', '5.6', '8', '11', '16', '22'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 映写技師(2フレーム: 構え / レバーを押す)
  var TECH = [
    ['..pppp..', '.pppppp.', '.p.pp.p.', '.pppppp.', '..p..p..', '.pppppp.', 'pp.pp.pp', 'p..pp..p', '...pp...', '..p..p..', '..p..p..', '.pp..pp.'],
    ['..pppp..', '.pppppp.', '.p.pp.p.', '.pppppp.', '..pppp..', '.pppppppp', 'pp.pp...', 'p..pp...', '...pp...', '..p..p..', '..p..p..', '.pp..pp.'],
  ];
  // スクリーンに映る映画の主役(シルクハットの踊る猫)
  var CAT = [
    ['...pppp...', '...pppp...', '..pppppp..', '..p.pp.p..', '..pppppp..', '...pppp...', '..pppppp..', '.pp.pp.pp.', '...pppp...', '...p..p...', '..pp..pp..'],
    ['...pppp...', '...pppp...', '..pppppp..', '..p.pp.p..', '..pppppp..', '...pppp...', 'p.pppppp.p', '.p..pp..p.', '...pppp...', '..p....p..', '.pp....pp.'],
  ];
  var REEL = ['.ppp.', 'p.p.p', 'ppppp', 'p.p.p', '.ppp.'];

  function txt(s, x, y, sz, col, back) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: back || INK, bold: true, align: 'center', font: 'serif' });
    game.draw.text(s, x, y, { size: sz, color: col || PAPER, bold: true, align: 'center', font: 'serif' });
  }
  function dither(x, y, w, h, step, col) {
    for (var yy = 0; yy < h; yy += step) {
      var off = (Math.floor(yy / step) % 2) * step;
      for (var xx = off; xx < w; xx += step * 2) game.draw.rect(x + xx, y + yy, step, step, col);
    }
  }
  function rad(d) { return d * Math.PI / 180; }
  function wrap(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }

  // ── 背景: 映写室の壁と客席を覗く小窓 ──
  function drawBooth(t, img) {
    game.draw.gradient(0, H, [[0, '#141414'], [0.5, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    dither(0, 0, W, Math.round(H * 0.12), 16, '#1c1c1c');
    // 小窓(客席側のスクリーン)
    var wx = 140, wy = 250, ww = W - 280, wh = 360;
    game.draw.rect(wx - 14, wy - 14, ww + 28, wh + 28, PAPER);
    game.draw.rect(wx, wy, ww, wh, INK);
    var sx = wx + 70, sy = wy + 40, sw = ww - 140, sh = wh - 80;
    var bright = img.bright;
    game.draw.rect(sx, sy, sw, sh, bright > 0.5 ? PAPER : '#d8d4ca');
    // 映像: 主役の猫(ずれ=二重像、暗さ=ディザ)
    var fr = Math.floor(t * (3 + img.combo)) % 2;
    var cx = sx + sw / 2 + Math.sin(t * 1.4) * 120, cy = sy + sh / 2 + 10;
    if (img.blur > 0) {
      game.draw.sprite(CAT[fr], { p: '#9a968c' }, cx - img.blur, cy, 16, { anchor: 'center' });
      game.draw.sprite(CAT[fr], { p: '#9a968c' }, cx + img.blur, cy, 16, { anchor: 'center' });
    }
    game.draw.sprite(CAT[fr], { p: INK }, cx, cy, 16, { anchor: 'center', alpha: img.blur > 0 ? 0.6 : 1 });
    if (bright < 1) dither(sx, sy, sw, sh, Math.max(6, Math.round(28 * bright)), '#00000088');
    // 客席の頭のシルエット
    for (var i = 0; i < 9; i++) game.draw.circle(wx + 50 + i * 100, wy + wh - 6, 34, INK);
    // 映写光(レンズから小窓へ伸びる白い線束)
    for (var b = -4; b <= 4; b++) game.draw.line(LX + b * 12, LY - R + 10, sx + sw / 2 + b * 70, sy + sh, '#f4f1e81c', 6);
  }

  // ── 絞りリング ──
  function drawLens(theta, kT, show, hl, sc) {
    var rr = R * sc;
    game.draw.circle(LX, LY, rr + 40, PAPER);
    game.draw.circle(LX, LY, rr + 28, INK);
    if (show) {
      // 目盛り帯
      for (var k = 0; k < 360 / STEP; k++) {
        var a = rad(theta + k * STEP);
        var isT = k === kT;
        var r0 = rr - (k % 3 === 0 ? 70 : 44), r1 = rr + 4;
        var col = isT ? WHITE : PAPER;
        var wdt = isT ? 16 : (k % 3 === 0 ? 7 : 4);
        game.draw.line(LX + Math.cos(a) * r0, LY + Math.sin(a) * r0, LX + Math.cos(a) * r1, LY + Math.sin(a) * r1, col, wdt);
        if (k % 3 === 0 && !isT) {
          var lab = FSTOPS[(k / 3) % FSTOPS.length];
          game.draw.text(lab, LX + Math.cos(a) * (rr - 110), LY + Math.sin(a) * (rr - 110), { size: 30, color: '#8c887f', bold: true, font: 'serif' });
        }
        if (isT) {
          var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
          var tx = LX + Math.cos(a) * (rr - 110), ty = LY + Math.sin(a) * (rr - 110);
          game.draw.circle(tx, ty, 34 + (hl ? 16 : 0), blink || hl ? WHITE : PAPER);
          game.draw.circle(tx, ty, 24 + (hl ? 12 : 0), INK);
          game.draw.circle(tx, ty, 12, WHITE);
        }
      }
      // 絞り羽根(リングに連動して開閉)
      var open = 70 + 60 * (0.5 + 0.5 * Math.sin(rad(theta) * 2));
      for (var bl = 0; bl < 8; bl++) {
        var ba = rad(theta * 0.5 + bl * 45);
        game.draw.line(LX + Math.cos(ba) * open, LY + Math.sin(ba) * open, LX + Math.cos(ba + 1.1) * (rr - 140), LY + Math.sin(ba + 1.1) * (rr - 140), '#6e6a62', 6);
      }
      game.draw.circle(LX, LY, open, '#000000');
      game.draw.circle(LX, LY, open * 0.45, '#f4f1e833');
    } else {
      dither(LX - rr, LY - rr, rr * 2, rr * 2, 20, '#f4f1e80f');
    }
    // 固定の三角印(真上)
    var iy = LY - rr - 60;
    for (var s = 0; s < 6; s++) game.draw.rect(LX - (36 - s * 6), iy + s * 9, (36 - s * 6) * 2, 9, WHITE);
  }

  function drawTech(press) {
    var x = W * 0.2, y = H * 0.84 + Math.sin(game.time.elapsed * 3) * 4;
    game.draw.sprite(TECH[press ? 1 : 0], { p: PAPER }, x, y, 13, { anchor: 'center' });
    // 親指ゾーンの止めレバー板(押せる領域は縁を光らせる)
    var px = W * 0.6, py = H * 0.86;
    var glowOn = Math.floor(game.time.elapsed * 3) % 2 === 0;
    game.draw.rect(px - 230, py - 90, 460, 180, press ? WHITE : (glowOn ? PAPER : '#8c887f'));
    game.draw.rect(px - 214, py - 74, 428, 148, INK);
    game.draw.rect(px - 40, py - 60 + (press ? 30 : 0), 80, 120, PAPER);
    game.draw.circle(px, py - 60 + (press ? 30 : 0), 40, PAPER);
  }

  // ── 1巻の設定 ──
  function makeReel(r) {
    var speeds = [62, 72, 80, 70, 84, 78];
    var dirs = [1, 1, -1, 1, -1, 1];
    var strobe = [0, 0, 0, 0.42, 0.5, 0.56];
    var kT = Math.floor(Math.random() * 24);
    var sp = speeds[Math.min(r, 5)], dir = dirs[Math.min(r, 5)];
    var T0 = 1.1 + Math.random() * 0.4;
    var theta0 = -90 - kT * STEP - dir * sp * T0;
    return { kT: kT, sp: sp, dir: dir, theta: theta0, strobe: strobe[Math.min(r, 5)], t: 0, tol: Math.max(5, 9 - r * 0.7) };
  }
  function reelDist(rl) { return wrap(rl.theta + rl.kT * STEP + 90); }
  function visible(rl) {
    if (!rl.strobe || rl.t < 0.6) return true;
    var per = 0.24;
    return (rl.t % per) / per > rl.strobe;
  }

  // ── ゲーム状態 ──
  var reelNo, reel, phase, phaseT, misses, done, perfects, timeLeft, ready, over, won, endT, score, combo, prevBest, img, lastErr, pressT;

  function initGame() {
    reelNo = 0; misses = 0; done = 0; perfects = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    over = false; won = false; endT = 0; score = 0; combo = 0; prevBest = game.best || 0;
    img = { blur: 0, bright: 1, combo: 0 }; lastErr = 0; pressT = 0;
    reel = makeReel(0); phase = 'spin'; phaseT = 0;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.floor(timeLeft * 30) + (MAX_MISS - misses) * 120;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function stopAt() {
    var err = Math.abs(reelDist(reel));
    lastErr = err;
    game.audio.tone('C3', 0.06, { wave: 'square', volume: 0.12 });
    if (err <= reel.tol) {
      var perfect = err <= 3;
      done++; combo++;
      if (perfect) perfects++;
      score += Math.floor((perfect ? 200 : 110) * (1 + Math.min(combo - 1, 4) * 0.2));
      img = { blur: perfect ? 0 : Math.round(err * 2), bright: 1, combo: Math.min(combo, 4) };
      game.feedback.good(LX, LY - R - 140, { text: perfect ? 'PERFECT' : 'GOOD', color: WHITE, count: perfect ? 18 : 10 });
      if (done === 3) { game.fx.popup(done + ' / ' + NEEDED, W / 2, H * 0.36, { color: WHITE, size: 64 }); game.audio.play('se_milestone', 0.4); }
      if (combo >= 2) game.fx.popup('x' + combo, LX + 300, LY - R, { color: PAPER, size: 48 });
      phase = 'show'; phaseT = 0.5;
    } else {
      combo = 0;
      phase = 'stop'; phaseT = 0.45;
    }
  }

  function missNow() {
    misses++;
    img = { blur: 26, bright: 0.35, combo: 0 };
    game.feedback.bad(LX, LY - R - 140, { text: 'MISS' });
    game.audio.play('se_break', 0.25);
    phase = 'show'; phaseT = 0.5;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || ready > 0 || phase !== 'spin') { game.audio.play('se_tap', 0.05); return; }
    pressT = 0.2;
    game.audio.play('se_tap', 0.3);
    stopAt();
  });

  // ── ATTRACT ゴースト実演: 1巻目はぴったり、2巻目は遅れて通り過ぎる ──
  var demo = { t: 0, reel: null, n: 0, phase: 'spin', phaseT: 0, press: 0, gx: W * 0.6, gy: H * 0.9, err: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt || !demo.reel) { demo.n = 0; demo.reel = makeReel(0); demo.reel.theta = -90 - demo.reel.kT * STEP - demo.reel.sp * 1.3; demo.phase = 'spin'; }
    var rl = demo.reel;
    if (demo.press > 0) demo.press -= dt;
    if (demo.phase === 'spin') {
      rl.t += dt; rl.theta += rl.dir * rl.sp * dt;
      var d = reelDist(rl);
      var tapAt = demo.n === 0 ? 0.5 : -14;
      if (rl.dir * d >= -tapAt && demo.n === 0 && Math.abs(d) < 1.5) {
        demo.press = 0.25; demo.phase = 'show'; demo.phaseT = 1.0;
        game.feedback.good(LX, LY - R - 140, { text: 'PERFECT', color: WHITE, count: 10, volume: 0.2 });
      } else if (demo.n === 1 && rl.dir * d >= 14) {
        demo.press = 0.25; demo.phase = 'stop'; demo.phaseT = 0.45; demo.err = d;
      }
    } else if (demo.phase === 'stop') {
      demo.phaseT -= dt;
      if (demo.phaseT <= 0) { game.feedback.bad(LX, LY - R - 140, { text: 'MISS', volume: 0.2, shake: 4 }); demo.phase = 'show'; demo.phaseT = 0.9; }
    } else if (demo.phase === 'show') {
      demo.phaseT -= dt;
      if (demo.phaseT <= 0 && demo.n === 0) { demo.n = 1; demo.reel = makeReel(1); demo.reel.theta = -90 - demo.reel.kT * STEP - demo.reel.sp * 1.0; demo.phase = 'spin'; }
    }
    demo.gy = H * 0.86 + (demo.press > 0 ? 20 : -20);
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(REEL, { p: i < done ? WHITE : '#3a3a3a' }, 100 + i * 86, 80, 12, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) {
      var mx = W - 260 + m * 80, used = m < misses;
      game.draw.line(mx - 22, 58, mx + 22, 102, used ? WHITE : '#3a3a3a', 10);
      game.draw.line(mx + 22, 58, mx - 22, 102, used ? WHITE : '#3a3a3a', 10);
    }
    txt(String(score), W - 140, 150, 40, PAPER);
    txt(done + ' / ' + NEEDED, 160, 150, 40, PAPER);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 196, W - 120, 18, '#2a2a2a');
    game.draw.rect(60, 196, (W - 120) * fr, 18, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? '#5a5a5a' : PAPER);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.12, W - 160, 300, INK);
    game.draw.rect(80, H * 0.12, W - 160, 8, PAPER);
    game.draw.rect(80, H * 0.12 + 292, W - 160, 8, PAPER);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12 + 70, 92, PAPER);
    txt(done + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.12 + 150, 38, PAPER);
    if (score > prevBest && prevBest > 0) txt('NEW RECORD ' + score, W / 2, H * 0.12 + 210, 46, WHITE);
    else txt('SCORE ' + score + '  BEST ' + Math.max(prevBest, score), W / 2, H * 0.12 + 210, 38, PAPER);
    if (!won) txt('あと' + (NEEDED - done) + '巻!', W / 2, H * 0.12 + 262, 40, WHITE);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBooth(t, { blur: demo.n === 1 && demo.phase !== 'spin' ? 22 : 0, bright: demo.n === 1 && demo.phase !== 'spin' ? 0.4 : 1, combo: 1 });
      var hlD = demo.phase === 'stop';
      drawLens(demo.reel.theta, demo.reel.kT, visible(demo.reel) || hlD, hlD, hlD ? 1.06 : 1);
      drawTech(demo.press > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      txt(TITLE, W / 2, H * 0.05, 90, PAPER);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 34, PAPER);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, WHITE);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, PAPER);
      return;
    }

    if (state === S.RESULT) {
      drawBooth(t, img);
      drawLens(reel.theta, reel.kT, true, false, 1);
      drawTech(false);
      drawResult();
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 36, PAPER);
      return;
    }

    // ── PLAYING ──
    if (pressT > 0) pressT -= dt;
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { reels: done, perfect: perfects, misses: misses };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      if (phase !== 'stop') timeLeft -= dt;
      if (phase === 'spin') {
        reel.t += dt;
        reel.theta += reel.dir * reel.sp * dt;
        if (reel.strobe && reel.t - dt < 0.0001) game.audio.tone('G2', 0.5, { wave: 'sawtooth', volume: 0.04, slide: 60 });
        if (reel.strobe && reel.t > 0.6 && Math.floor(reel.t / 0.24) !== Math.floor((reel.t - dt) / 0.24)) game.audio.tone(1800, 0.015, { wave: 'square', volume: 0.03 });
        var d = reelDist(reel);
        if (reel.dir * d > 25) { lastErr = Math.abs(d); combo = 0; phase = 'stop'; phaseT = 0.45; }
      } else if (phase === 'stop') {
        phaseT -= dt;
        if (phaseT <= 0) missNow();
      } else if (phase === 'show') {
        phaseT -= dt;
        if (phaseT <= 0) {
          if (done >= NEEDED) finish(true);
          else if (misses >= MAX_MISS) finish(false);
          else { reelNo++; reel = makeReel(reelNo); phase = 'spin'; game.audio.play('se_tap', 0.12); }
        }
      }
      if (timeLeft <= 0 && !over) { timeLeft = 0; game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' }); finish(false); }
    }

    drawBooth(t, img);
    var hl = phase === 'stop';
    var strobeOn = ready > 0 || phase !== 'spin' || visible(reel);
    // シャッター明滅の予告(リング外周が0.6秒点滅)
    if (phase === 'spin' && reel.strobe && reel.t < 0.6 && Math.floor(t * 12) % 2 === 0) game.draw.circle(LX, LY, R + 60, '#f4f1e833');
    drawLens(reel.theta, reel.kT, strobeOn, hl, hl ? 1 + 0.08 * (phaseT / 0.45) : 1);
    if (hl && Math.floor(t * 16) % 2 === 0) game.draw.circle(LX, LY - R - 60, 60, '#ffffff66');
    drawTech(pressT > 0);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.53, 120, WHITE);
    if (over) drawResult();
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['E4', 0.5], ['A4', 2],
    ], { tempo: 96, wave: 'square', volume: 0.04, loop: true, bass: [['A2', 1], ['E2', 1], ['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
