// I-Wii-0020v2-nursery-swing-settle.js
// ブランコおさえ — 大きく揺れるブランコの座面が奥の光る輪に戻ってきた時だけ1回押さえ、揺れを少しずつ収めて園児を降ろす
// 操作: 押さえたいブランコの列をタップ。座面が奥の光る輪に入っている時だけ押さえられて揺れが半分になる。押さえた直後はそのブランコが前へ振れて戻ってくるまで押さえられない(輪の時計が一周するまで)。輪の外や戻る前に押すと逆にひと押ししてしまい揺れが大きくなる
// 終わり: 1台→2台→3台の順にすべてのブランコを止めて園児を降ろせばCLEAR。押し間違いでハートを3つ失う/15秒経過でGAME OVER
// @mechanic: cooldown_tap
// @theme: nursery_swing_settle
// 世界観: 保育園の園庭で、お迎えの時間に保育士が大きく揺れるブランコの後ろに回り、座面が戻ってくるたびに一度ずつ押さえて揺れを収め、園児を順に降ろしていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 降ろした園児数・残りハート・スコア
// スタイル: 2000s HANDHELD PASTEL

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 白縁の丸い形。上画面=情報、下画面=遊び
  var STYLE = { bg: ['#fde6ef', '#e3efff'], main: ['#ff9ec7', '#8fd3ff', '#ffe08a'], accent: ['#ffffff', '#7a5c8a'] };
  var PINK = STYLE.main[0], SKY = STYLE.main[1], YEL = STYLE.main[2], WHITE = STYLE.accent[0], PLUM = STYLE.accent[1];
  var MINT = '#a8e6c8';

  var TITLE = 'SWING STOP';
  var TIME_LIMIT = 15;
  var LIVES = 3;
  var STOP_AMP = 8;
  var PIV_Y = Math.round(H * 0.37);
  var ROPE = 520;
  var GROUND = Math.round(H * 0.72);
  var PAD_Y = Math.round(H * 0.855);
  var STAGES = [
    [{ x: 540, a: 26, p: 1.3 }],
    [{ x: 330, a: 26, p: 1.15 }, { x: 750, a: 22, p: 1.45 }],
    [{ x: 190, a: 24, p: 1.2 }, { x: 540, a: 28, p: 1.45 }, { x: 890, a: 20, p: 1.05 }],
  ];
  var TOTAL_KIDS = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KID = [
    ['..hhhh..', '.hhhhhh.', '.hffffh.', '.fkffkf.', '.ffmmff.', '..ffff..', '.cccccc.', 'f.cccc.f', '..l..l..', '..l..l..'],
    ['..hhhh..', '.hhhhhh.', '.hffffh.', '.fkffkf.', '.ffmmff.', '..ffff..', 'fcccccc.', '..cccc.f', '.l....l.', 'l......l'],
  ];
  var KID_SURPRISE = ['..hhhh..', '.hhhhhh.', '.hffffh.', '.fkffkf.', '.ff..ff.', '..fmmf..', '.cccccc.', 'f.cccc.f', '..l..l..', '..l..l..'];
  var KID_PALS = [
    { h: '#7a5c8a', f: '#ffe0cc', k: '#3a2a40', m: '#ff7aa8', c: '#8fd3ff', l: '#7a5c8a' },
    { h: '#b5651d', f: '#ffd8bf', k: '#3a2a40', m: '#ff7aa8', c: '#ffe08a', l: '#7a5c8a' },
    { h: '#3a2a40', f: '#ffe6d6', k: '#3a2a40', m: '#ff7aa8', c: '#a8e6c8', l: '#7a5c8a' },
  ];
  var TEACHER = [
    ['...hhh...', '..hhhhh..', '..hfffh..', '..fkfkf..', '...fff...', '.aaaaaaa.', 'ff.aaa.ff', 'f..aaa..f', '...aaa...', '...a.a...'],
    ['f..hhh..f', 'f.hhhhh.f', '.fhfffhf.', '..fkfkf..', '...fff...', '..aaaaa..', '...aaa...', '...aaa...', '...aaa...', '...a.a...'],
  ];
  var TPAL = { h: '#7a5c8a', f: '#ffe0cc', k: '#3a2a40', a: '#ff9ec7' };
  var HEART = ['.pp.pp.', 'ppppppp', 'ppppppp', '.ppppp.', '..ppp..', '...p...'];

  function txt(s, x, y, sz, col) {
    var o = { size: sz, color: WHITE, bold: true, align: 'center' };
    game.draw.text(s, x - 3, y, o); game.draw.text(s, x + 3, y, o); game.draw.text(s, x, y - 3, o); game.draw.text(s, x, y + 3, o);
    game.draw.text(s, x, y, { size: sz, color: col || PLUM, bold: true, align: 'center' });
  }
  function rrect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - r * 2, h, col);
    game.draw.rect(x, y + r, w, h - r * 2, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }

  // ── ブランコの位置(正面から見た奥行き: 奥=小さく高い、手前=大きく低い) ──
  function seatPos(sw, phi) {
    var r = phi * Math.PI / 180;
    var sc = 1 + 0.36 * Math.sin(r);
    return { x: sw.x, y: PIV_Y + ROPE * Math.cos(r) + 190 * Math.sin(r), s: sc };
  }
  function makeSwing(def, i) {
    return { x: def.x, a: def.a, p: def.p, psi: Math.random() * Math.PI * 2, phi: 0, disp: 0, lock: 0, done: false, hop: 0, pal: KID_PALS[i % 3], hl: 0, thr: 0.78 };
  }
  function inWindow(sw) { return sw.phi < -sw.a * sw.thr; }
  function stepSwing(sw, dt) {
    if (sw.done) { sw.disp += (0 - sw.disp) * Math.min(1, dt * 3); sw.hop += dt; return; }
    sw.psi += dt * Math.PI * 2 / sw.p;
    sw.phi = sw.a * Math.sin(sw.psi);
    sw.disp += (sw.phi - sw.disp) * Math.min(1, dt * 14);
    if (sw.lock > 0) sw.lock -= dt;
    if (sw.hl > 0) sw.hl -= dt;
  }
  function catchSwing(sw) {
    sw.a *= 0.5;
    sw.psi = -Math.PI / 2;
    sw.phi = -sw.a;
    sw.lock = sw.p * 0.62;
    if (sw.a < STOP_AMP) { sw.done = true; sw.hop = 0; }
  }
  function pushSwing(sw) {
    sw.a = Math.min(44, sw.a * 1.3 + 2);
    sw.lock = Math.max(sw.lock, 0.25);
  }

  function drawPanels() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, '#fff6e8'], [1, STYLE.bg[1]]]);
    // 上画面(情報)
    rrect(30, 24, W - 60, Math.round(H * 0.25), 40, WHITE);
    rrect(46, 40, W - 92, Math.round(H * 0.25) - 32, 30, '#fff3f8');
    // ヒンジ
    rrect(W / 2 - 160, Math.round(H * 0.265), 320, 28, 14, '#f3d6e4');
    // 下画面(遊び)
    rrect(30, Math.round(H * 0.3), W - 60, H - Math.round(H * 0.3) - 24, 40, WHITE);
    game.draw.gradient(Math.round(H * 0.3) + 16, GROUND, [[0, '#d6ecff'], [1, '#f2fbff']]);
    // 遠景: 園舎の屋根と雲
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 380 + game.time.elapsed * 22) % (W + 200)) - 100;
      game.draw.circle(cx, H * 0.34 + c * 20, 44, WHITE); game.draw.circle(cx + 50, H * 0.34 + c * 20, 34, WHITE);
    }
    rrect(60, GROUND - 170, 300, 170, 24, '#ffe9c9');
    for (var rf = 0; rf < 5; rf++) game.draw.rect(60 + rf * 60, GROUND - 200 + rf * 0, 60, 34, rf % 2 ? PINK : YEL);
    rrect(54, GROUND, W - 108, H - GROUND - 40, 30, '#e8f7dc');
    for (var g = 0; g < 14; g++) game.draw.circle(80 + g * 70, GROUND + 10 + (g % 2) * 8, 10, MINT);
  }

  function drawFrame(sws) {
    // 支柱と上の横木
    var xs = sws.map(function (s) { return s.x; });
    var x0 = Math.min.apply(null, xs) - 170, x1 = Math.max.apply(null, xs) + 170;
    game.draw.line(x0, PIV_Y - 20, x0 - 60, GROUND + 30, '#c9a6ff', 22);
    game.draw.line(x1, PIV_Y - 20, x1 + 60, GROUND + 30, '#c9a6ff', 22);
    rrect(x0 - 30, PIV_Y - 44, x1 - x0 + 60, 40, 20, '#c9a6ff');
    rrect(x0 - 20, PIV_Y - 38, x1 - x0 + 40, 12, 6, WHITE);
  }

  function drawWindow(sw, available) {
    var wp = seatPos(sw, -sw.a);
    var blink = Math.floor(game.time.elapsed * 6) % 2 === 0;
    var lit = available && inWindow(sw);
    var r = 70 * wp.s;
    game.draw.circle(wp.x, wp.y, r + 14, lit ? WHITE : (blink ? '#fff8c0' : '#ffffff99'));
    game.draw.circle(wp.x, wp.y, r, lit ? YEL : '#fff3c8');
    // ロック中: 時計の針が回る(戻ってくるまで押さえられない)
    if (sw.lock > 0) {
      var k = 1 - sw.lock / (sw.p * 0.62);
      var a = -Math.PI / 2 + k * Math.PI * 2;
      game.draw.circle(wp.x, wp.y, r * 0.7, '#e7dcf2');
      game.draw.line(wp.x, wp.y, wp.x + Math.cos(a) * r * 0.6, wp.y + Math.sin(a) * r * 0.6, PLUM, 8);
    }
  }

  function drawSwing(sw, teacherHere) {
    if (sw.done) {
      // 降りた園児がぴょんと跳ねて上画面へ
      var p0 = seatPos(sw, sw.disp);
      game.draw.line(sw.x - 60, PIV_Y, sw.x - 60, p0.y, '#b9a2d9', 6);
      game.draw.line(sw.x + 60, PIV_Y, sw.x + 60, p0.y, '#b9a2d9', 6);
      rrect(sw.x - 75, p0.y - 10, 150, 26, 12, PINK);
      if (sw.hop < 0.9) {
        var jy = p0.y - 60 - Math.sin(sw.hop / 0.9 * Math.PI) * 260 - sw.hop * 120;
        game.draw.sprite(KID[1], sw.pal, sw.x, jy, 11, { anchor: 'center' });
      }
      return;
    }
    var p = seatPos(sw, sw.disp);
    // 地面の影(手前ほど下)
    var sy = GROUND + 50 + 110 * Math.sin(sw.disp * Math.PI / 180);
    game.draw.circle(sw.x, sy, 60 * p.s, '#c7dcc0');
    game.draw.line(sw.x - 58 * p.s, PIV_Y - 20, sw.x - 62 * p.s, p.y, '#b9a2d9', 6);
    game.draw.line(sw.x + 58 * p.s, PIV_Y - 20, sw.x + 62 * p.s, p.y, '#b9a2d9', 6);
    var hlk = sw.hl > 0 ? sw.hl / 0.35 : 0;
    var sc = p.s * (1 + hlk * 0.3);
    if (hlk > 0) game.draw.circle(p.x, p.y - 40 * sc, 110 * sc, WHITE);
    if (teacherHere) {
      var wp = seatPos(sw, -sw.a);
      var reach = inWindow(sw) ? 1 : 0;
      game.draw.sprite(TEACHER[reach], TPAL, sw.x, wp.y - 150 + (1 - reach) * 20, 10, { anchor: 'center', alpha: 0.95 });
    }
    var vel = Math.cos(sw.psi);
    var art = hlk > 0 ? KID_SURPRISE : KID[vel > 0 ? 1 : 0];
    game.draw.sprite(art, sw.pal, p.x, p.y - 72 * sc, 14 * sc, { anchor: 'center' });
    rrect(p.x - 90 * sc, p.y - 12 * sc, 180 * sc, 30 * sc, 12 * sc, hlk > 0 ? WHITE : PINK);
    // 押せる時は座面に白縁が明滅
    if (inWindow(sw) && sw.lock <= 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) rrect(p.x - 96 * sc, p.y - 18 * sc, 192 * sc, 6, 3, WHITE);
  }

  function drawPad(sw, pressed) {
    // 親指ゾーン: ブランコごとの押さえパッド(押せる時だけ白縁+黄色に光る)
    var w = 230, h = 150, x = sw.x - w / 2, y = PAD_Y - h / 2 + Math.sin(game.time.elapsed * 4 + sw.x) * 5;
    if (sw.done) { rrect(x, y, w, h, 40, '#e8efe4'); game.draw.sprite(HEART, { p: MINT }, sw.x, y + h / 2, 10, { anchor: 'center' }); return; }
    var ok = inWindow(sw) && sw.lock <= 0;
    rrect(x - 10, y - 10, w + 20, h + 20, 48, ok || pressed ? WHITE : '#f0e4f6');
    rrect(x, y, w, h, 40, ok ? YEL : (sw.lock > 0 ? '#e7dcf2' : '#ffe9f3'));
    var k = sw.lock > 0 ? 1 - sw.lock / (sw.p * 0.62) : 1;
    rrect(x + 20, y + h - 34, (w - 40) * k, 16, 8, sw.lock > 0 ? PLUM : PINK);
    game.draw.sprite(TEACHER[ok ? 1 : 0], TPAL, sw.x, y + 58, 7, { anchor: 'center' });
  }

  function drawTop(kidsDone, sws, hearts, tl) {
    // 降りた園児の列(進捗)
    for (var i = 0; i < TOTAL_KIDS; i++) {
      var x = 120 + i * 110, y = H * 0.17;
      if (i < kidsDone) game.draw.sprite(KID[Math.floor(game.time.elapsed * 3 + i) % 2], KID_PALS[i % 3], x, y + Math.sin(game.time.elapsed * 6 + i) * 6, 8, { anchor: 'center' });
      else { game.draw.circle(x, y, 34, '#f3dbe8'); game.draw.circle(x, y, 24, '#fff3f8'); }
    }
    for (var h = 0; h < LIVES; h++) game.draw.sprite(HEART, { p: h < hearts ? PINK : '#efd6e2' }, W - 270 + h * 80, 96, 8, { anchor: 'center' });
    txt(kidsDone + ' / ' + TOTAL_KIDS, 200, 96, 52, PLUM);
    txt(String(score), W / 2, 96, 44, PINK);
    var fr = Math.max(0, tl / TIME_LIMIT);
    rrect(80, H * 0.225, W - 160, 26, 13, '#f3dbe8');
    if (fr > 0.02) rrect(80, H * 0.225, Math.max(26, (W - 160) * fr), 26, 13, tl < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? PINK : SKY);
  }

  // ── ゲーム状態 ──
  var stage, swings, teacher, kids, hearts, timeLeft, ready, over, won, endT, score, halt, prevBest, perfects, stageT;

  function setStage(n) {
    stage = n; swings = STAGES[n].map(function (d, i) { return makeSwing(d, i + n); });
    if (n === 2) swings.forEach(function (s) { s.thr = 0.82; });
    teacher = 0; stageT = n === 0 ? 0.6 : 0;
  }
  function initGame() {
    kids = 0; hearts = LIVES; timeLeft = TIME_LIMIT; ready = 0.8; over = false; won = false; endT = 0; score = 0; halt = null;
    prevBest = game.best || 0; perfects = 0;
    setStage(0);
  }
  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.floor(timeLeft * 40) + hearts * 150;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }
  function nearestSwing(x) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < swings.length; i++) {
      var d = Math.abs(x - swings[i].x);
      if (d < bd) { bd = d; best = i; }
    }
    return best >= 0 && swings[best].done ? -1 : best;
  }

  function press(i) {
    var sw = swings[i];
    teacher = i;
    var p = seatPos(sw, sw.disp);
    if (sw.lock <= 0 && inWindow(sw)) {
      var deep = sw.phi < -sw.a * 0.93;
      if (deep) perfects++;
      score += deep ? 150 : 100;
      catchSwing(sw);
      game.audio.tone('E5', 0.07, { wave: 'triangle', volume: 0.1 });
      game.feedback.good(p.x, p.y - 200, { text: deep ? 'PERFECT' : 'GOOD', color: PINK, count: 12 });
      if (sw.done) {
        kids++;
        score += 200;
        game.audio.play('se_coin', 0.35);
        if (kids === 3) { game.fx.popup(kids + ' / ' + TOTAL_KIDS, W / 2, H * 0.5, { color: PINK, size: 70 }); game.audio.play('se_milestone', 0.4); }
      }
    } else {
      // 焦った押し: 逆にひと押ししてしまう
      game.audio.play('se_tap', 0.3);
      sw.hl = 0.35;
      halt = { t: 0.35, i: i };
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || ready > 0 || halt || stageT < 0.6) { game.audio.play('se_tap', 0.05); return; }
    if (y < H * 0.3) return;
    var i = nearestSwing(x);
    if (i >= 0) press(i); else game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT ゴースト実演: 輪に戻った時だけ押さえる → 戻る前に押して揺れを大きくしてしまう ──
  var demo = { t: 0, sw: null, step: 0, press: 0, gx: 540, gy: H * 0.85 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt || !demo.sw) { demo.sw = makeSwing({ x: 540, a: 34, p: 1.2 }, 0); demo.sw.psi = 0; demo.step = 0; }
    var sw = demo.sw;
    stepSwing(sw, dt);
    if (demo.press > 0) demo.press -= dt;
    var wp = seatPos(sw, -sw.a);
    demo.gx += (540 - demo.gx) * Math.min(1, dt * 5);
    demo.gy += ((demo.step < 3 ? PAD_Y : H * 0.93) - demo.gy) * Math.min(1, dt * 5);
    if (demo.step < 2 && sw.lock <= 0 && sw.phi < -sw.a * 0.95 && !sw.done) {
      catchSwing(sw); demo.press = 0.25; demo.step++;
      game.feedback.good(540, wp.y - 200, { text: 'PERFECT', color: PINK, count: 8, volume: 0.2 });
    } else if (demo.step === 2 && sw.lock > 0 && sw.lock < 0.3) {
      demo.press = 0.25; demo.step = 3; sw.hl = 0.35;
      game.feedback.bad(540, wp.y - 200, { text: 'MISS', volume: 0.2, shake: 4 });
      pushSwing(sw);
    }
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawPanels();
      drawFrame([demo.sw]);
      drawWindow(demo.sw, true);
      drawSwing(demo.sw, true);
      drawPad(demo.sw, demo.press > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      txt(TITLE, W / 2, H * 0.08, 92, PINK);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.15, 40, PLUM);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.215, 44, PINK);
      else txt('TAP TO START', W / 2, H * 0.215, 42, PLUM);
      return;
    }
    if (state === S.RESULT) {
      drawPanels();
      drawFrame(swings);
      drawTop(kids, swings, hearts, timeLeft);
      drawResult();
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 38, PLUM);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      for (var a = 0; a < swings.length; a++) stepSwing(swings[a], dt);
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { kids: kids, hearts: hearts, perfect: perfects };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      swings[halt.i].hl = Math.max(swings[halt.i].hl, halt.t);
      if (halt.t <= 0) {
        var sw = swings[halt.i];
        pushSwing(sw);
        hearts--;
        var hp = seatPos(sw, sw.disp);
        game.feedback.bad(hp.x, hp.y - 200, { text: 'MISS' });
        halt = null;
        if (hearts <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      for (var b = 0; b < swings.length; b++) stepSwing(swings[b], dt);
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      stageT += dt;
      for (var c = 0; c < swings.length; c++) {
        var s0 = swings[c], wasIn = inWindow(s0);
        stepSwing(s0, dt);
        if (!s0.done && s0.lock <= 0 && !wasIn && inWindow(s0)) game.audio.tone('C6', 0.03, { wave: 'sine', volume: 0.04 });
      }
      var all = swings.every(function (s) { return s.done && s.hop > 0.7; });
      if (all) {
        if (stage >= STAGES.length - 1) finish(true);
        else { setStage(stage + 1); game.audio.play('se_powerup', 0.3); }
      }
      if (timeLeft <= 0 && !over) { timeLeft = 0; game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' }); finish(false); }
    }

    drawPanels();
    drawFrame(swings);
    for (var d = 0; d < swings.length; d++) if (!swings[d].done) drawWindow(swings[d], stageT >= 0.6);
    for (var e = 0; e < swings.length; e++) { drawSwing(swings[e], e === teacher && !swings[e].done); drawPad(swings[e], halt && halt.i === e); }
    if (stageT < 0.6 && !over && ready <= 0) txt('GO!', W / 2, H * 0.5, 100, PINK);
    drawTop(kids, swings, hearts, timeLeft);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 120, PINK);
    if (over) drawResult();
  });

  function drawResult() {
    rrect(90, H * 0.36, W - 180, 420, 40, WHITE);
    rrect(104, H * 0.36 + 14, W - 208, 392, 30, '#fff3f8');
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36 + 90, 96, won ? PINK : PLUM);
    txt(kids + ' / ' + TOTAL_KIDS + '   PERFECT ' + perfects, W / 2, H * 0.36 + 190, 40, PLUM);
    if (score > prevBest && prevBest > 0) txt('NEW RECORD ' + score, W / 2, H * 0.36 + 260, 48, PINK);
    else txt('SCORE ' + score + '  BEST ' + Math.max(prevBest, score), W / 2, H * 0.36 + 260, 40, PLUM);
    if (!won) txt('あと' + (TOTAL_KIDS - kids) + '人!', W / 2, H * 0.36 + 340, 52, PINK);
  }

  game.onStart(function () {
    game.audio.melody([
      ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['D5', 0.5], ['C5', 1.5], ['R', 0.5],
    ], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 1.5], ['G2', 1.5], ['F2', 1.5], ['G2', 1.5]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
