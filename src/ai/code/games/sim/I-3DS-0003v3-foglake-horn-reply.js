// I-3DS-0003v3-foglake-horn-reply.js
// 霧の渡し場の霧笛 — 霧の中の舟が灯を何回瞬かせたか数え、同じ回数だけ霧笛を長く吹いて返す
// 操作: 舟の灯の点滅を数える。霧笛が光ったら画面を押して吹く(押している間鳴り、短すぎる押しはプスッと空振りで数えない)。回数ぶん吹いたら手を止めて待つ
// 終わり: 4艘のうち3艘以上を桟橋へ導けばCLEAR。吹きすぎ・足りない・吹かないで2艘を見失うとGAME OVER。23秒で時間切れ
// @mechanic: count_exact
// @theme: foggy_lake_ferry_horn
// 世界観: 霧の湖の渡し場の見張り小屋で、見張り番が霧の中から近づく渡し舟の灯の瞬きの数を読み、同じ回数だけ霧笛を鳴らして桟橋の位置を知らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 導いた舟の数・得点
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: パララックス3層以上、光源は舟の灯と小屋のランプ。細かいアニメ
  var STYLE = { bg: ['#16213a', '#2e4060', '#8aa0b8'], main: ['#c88a3a', '#e8d8b0', '#5a7a6a'], accent: ['#ffb040', '#6af0b0'] };
  var C = {
    night: STYLE.bg[0], dusk: STYLE.bg[1], fog: STYLE.bg[2], brass: STYLE.main[0], cream: STYLE.main[1], reed: STYLE.main[2],
    lamp: STYLE.accent[0], ok: STYLE.accent[1], bad: '#ff5a5a', ink: '#0c1020', wood: '#5a3e2a', water: '#20304a',
  };

  var GAME_TITLE = 'FOG HORN';
  var BOATS = 4, NEEDED = 3, LIVES = 2;
  var TIME_LIMIT = 23;
  var FULL = 0.18, SETTLE = 0.9, NOREPLY = 3.0;
  var HORN = { x: 760, y: Math.round(H * 0.8) };
  var BTN = { x: W / 2, y: Math.round(H * 0.88), r: 140 };

  // 舟ごとに回数が増え、点滅が速く、灯の残像が早く消える
  var ROUNDS = [
    { n: [2], gap: 0.5, fade: 9 }, { n: [3], gap: 0.46, fade: 2.2 },
    { n: [3, 4], gap: 0.42, fade: 1.1 }, { n: [4, 5], gap: 0.38, fade: 0.5 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ri, rd, phase, pt, blinkI, blinks, blasts, holding, holdT, silentT, guided, lost, score, readyT, over, won, outroT, stopT, focus, playT, boatX, boatY, verdict, shownN;
  var waves = [], tallies = [], results = [];

  function initGame() {
    ri = 0; guided = 0; lost = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; focus = null; playT = 0;
    waves = []; tallies = []; results = []; holding = false; holdT = 0;
    startRound(0);
  }

  function startRound(i) {
    ri = i;
    var r = ROUNDS[i];
    rd = { n: r.n[Math.floor(game.random(0, r.n.length)) % r.n.length], gap: r.gap, fade: r.fade };
    phase = 'arrive'; pt = 0; blinkI = 0; blinks = []; blasts = 0; silentT = 0; verdict = null; tallies = []; shownN = 0;
    boatX = i % 2 === 0 ? 380 : 700; boatY = Math.round(H * 0.36);
  }

  // ---- 1艘ぶんの進行(本番もデモも同じ) ----
  function stepRound(dt, demo) {
    pt += dt;
    if (phase === 'arrive') {
      if (pt >= 0.35) { phase = 'blink'; pt = 0; }
    } else if (phase === 'blink') {
      var k = Math.floor(pt / rd.gap);
      if (k > blinkI && blinkI < rd.n) {
        blinks.push({ t: 0 });
        blinkI++;
        game.audio.tone(880 + blinkI * 40, 0.06, { wave: 'sine', volume: 0.08 });
      }
      if (blinkI >= rd.n && pt >= rd.n * rd.gap + 0.3) {
        phase = 'reply'; pt = 0; silentT = 0;
        game.audio.tone('C6', 0.08, { wave: 'triangle', volume: 0.08 });
      }
    } else if (phase === 'reply') {
      if (!holding) silentT += dt;
      if (blasts === 0 && silentT >= NOREPLY) judge(false, demo);
      else if (blasts > 0 && silentT >= SETTLE) judge(blasts === rd.n, demo);
    } else if (phase === 'answer') {
      boatY += dt * (verdict ? 160 : -60);
      boatX += dt * (verdict ? 0 : (boatX < W / 2 ? -120 : 120));
      if (pt >= 0.7) return true;
    }
    for (var b = 0; b < blinks.length; b++) blinks[b].t += dt;
    return false;
  }

  function hornDown(demo) {
    if (phase !== 'reply') {
      game.audio.tone(130, 0.05, { wave: 'square', volume: 0.05 });
      game.fx.burst(HORN.x, HORN.y, { color: C.fog, count: 3, speed: 80 });
      return;
    }
    holding = true; holdT = 0; silentT = 0;
    game.audio.tone(110, 0.08, { wave: 'sawtooth', volume: 0.05 });
  }

  function hornUp(demo) {
    if (!holding) return;
    holding = false;
    if (phase !== 'reply') return;
    if (holdT < FULL) {
      // 短すぎ: 空振り(数えない)
      game.audio.tone(200, 0.05, { wave: 'square', volume: 0.05 });
      game.fx.burst(HORN.x + 120, HORN.y - 60, { color: C.fog, count: 4, speed: 100 });
    }
  }

  // 押している間: FULL 秒を越えた瞬間に1回と数える
  function stepHorn(dt, demo) {
    if (!holding || phase !== 'reply') return;
    var before = holdT;
    holdT += dt;
    if (Math.floor(holdT * 6) !== Math.floor(before * 6)) waves.push({ r: 30, a: 1 });
    if (before < FULL && holdT >= FULL) {
      blasts++;
      tallies.push({ n: blasts, t: 0 });
      game.audio.tone(98, 0.5, { wave: 'sawtooth', volume: 0.12, slide: -8 });
      game.audio.tone(147, 0.5, { wave: 'triangle', volume: 0.08 });
      game.fx.burst(HORN.x + 140, HORN.y - 80, { color: C.cream, count: 8, speed: 200 });
      if (blasts > rd.n) judge(false, demo);
    }
  }

  function judge(ok, demo) {
    if (phase !== 'reply') return;
    holding = false;
    phase = 'answer'; pt = 0; verdict = ok; shownN = rd.n;
    results.push(ok);
    if (ok) {
      guided++;
      score += 100 * rd.n + 50;
      game.feedback.good(boatX, boatY - 80, { text: 'GOOD', color: C.ok, size: 56 });
      if (!demo && guided === 2) { game.fx.popup('NICE', W / 2, H * 0.24, { color: C.lamp, size: 60 }); game.audio.play('se_milestone', 0.45); }
    } else {
      lost++;
      focus = { x: boatX, y: boatY - 40 };
      stopT = 0.45;
      game.feedback.bad(boatX, boatY - 80, { text: 'MISS', shake: demo ? 6 : 12 });
      if (!demo && lost >= LIVES) { over = true; won = false; outroT = 1.4; game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      game.fx.burst(W / 2, H * 0.55, { color: C.lamp, count: 30, speed: 440 });
      game.fx.burst(HORN.x, HORN.y, { color: C.ok, count: 20, speed: 360 });
      game.fx.flash(C.cream, 0.2);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0 || stopT > 0) return;
    if (y < 230) { game.audio.tone(220, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    hornDown(false);
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING || over) return;
    if (holding) game.audio.tone(80, 0.04, { wave: 'triangle', volume: 0.04 });
    hornUp(false);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function glow(x, y, r, col, k) {
    game.draw.circle(x, y, r * 3, col, 0.07 * k);
    game.draw.circle(x, y, r * 2, col, 0.14 * k);
    game.draw.circle(x, y, r * 1.3, col, 0.3 * k);
  }

  var KEEPER_A = ['..hhhh..', '.hhhhhh.', 'hhhhhhhh', '.sssss..', '.sesse..', '.sssss..', '..mm....', 'cccccccc', 'cccbcccc', '.cccccc.', '.cc..cc.', '.kk..kk.'];
  var KEEPER_B = ['..hhhh..', '.hhhhhh.', 'hhhhhhhh', '.sssss..', '.s-ss-..', '.sssss..', '..oo....', 'cccccccc', 'cccbcccc', '.cccccc.', '.cc..cc.', '.kk..kk.'];
  var BOAT = ['......m......', '......m......', '.....smss....', '....ssmsss...', '......m......', 'ww.wwwwwww.ww', '.wwwwwwwwwww.', '..wwwwwwwww..'];
  var HERON = ['..ww', '.wwe', 'ww..', 'w...', 'w...'];

  function drawLake() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.5, [[0, C.night], [0.6, C.dusk], [1, '#4a5a78']]);
    // 遠景: 山の稜線(ゆっくり)
    for (var i = 0; i < 12; i++) {
      var mx = ((i * 140 - t * 6) % (W + 280)) - 140;
      var mh = 90 + ((i * 53) % 70);
      game.draw.rect(mx, H * 0.43 - mh, 140, mh, '#26344e');
    }
    game.draw.gradient(H * 0.43, H, [[0, '#3a4c68'], [0.3, C.water], [1, '#141c2c']]);
    // 水面のさざ波
    for (var w = 0; w < 18; w++) {
      var wy = H * 0.45 + w * 52;
      var wx = ((w * 173 + t * (20 + w * 3)) % (W + 200)) - 100;
      game.draw.rect(wx, wy, 120 + (w % 3) * 40, 4, C.fog, 0.18);
    }
    // 中景: 葦の茂み
    for (var r = 0; r < 16; r++) {
      var rx = r * 72 + 10, sw = Math.sin(t * 1.5 + r) * 6;
      game.draw.line(rx, H * 0.66, rx + sw, H * 0.6 - (r % 3) * 20, C.reed, 6);
    }
    game.draw.sprite(HERON, { w: '#d8dce8', e: C.ink }, 960, H * 0.6 + Math.sin(t * 2) * 2, 10, { anchor: 'center' });
  }

  function drawFog(thick) {
    var t = game.time.elapsed;
    for (var f = 0; f < 7; f++) {
      var fy = H * 0.24 + f * 60;
      var fx = ((f * 220 + t * (25 + f * 7)) % (W + 600)) - 300;
      game.draw.rect(fx, fy, 520, 46, C.fog, 0.1 + thick * 0.06);
      game.draw.rect(fx - 400, fy + 20, 380, 30, C.fog, 0.08 + thick * 0.05);
    }
  }

  function drawBoat() {
    var t = game.time.elapsed;
    var appear = phase === 'arrive' ? Math.min(1, pt / 0.35) : 1;
    var bx = boatX, by = boatY + Math.sin(t * 2) * 6;
    game.draw.sprite(BOAT, { m: '#3a3020', s: '#a8a090', w: '#6a4a30' }, bx, by, 20, { anchor: 'center', alpha: 0.35 + appear * 0.6 });
    // 舳先の灯: 点滅の瞬間に光る。答えの後は緑(導けた)/赤(見失った)
    var lx = bx, ly = by - 100;
    var on = false;
    if (phase === 'blink') { var ph = pt % rd.gap; on = blinkI > 0 && ph < rd.gap * 0.45 && pt < rd.n * rd.gap + rd.gap * 0.45; }
    var col = phase === 'answer' ? (verdict ? C.ok : C.bad) : C.lamp;
    var hl = focus && stopT > 0;
    if (on || phase === 'answer') glow(lx, ly, hl ? 30 : 20, col, 1);
    game.draw.circle(lx, ly, hl ? 22 : 14, on || phase === 'answer' ? col : '#5a4a3a');
    // 点滅の残像(数えるための手がかり): 舟ごとに早く消える
    for (var i = 0; i < blinks.length; i++) {
      var a = Math.max(0, 1 - blinks[i].t / rd.fade);
      if (phase === 'answer') a = 1;
      if (a <= 0) continue;
      var dx = lx + 60 + i * 44;
      game.draw.circle(dx, ly, 12, col, 0.85 * a);
      glow(dx, ly, 8, col, 0.5 * a);
    }
  }

  function drawHut() {
    var t = game.time.elapsed;
    // 見張り小屋(手前の層)
    game.draw.rect(0, H * 0.68, 420, H * 0.32, C.wood);
    game.draw.rect(0, H * 0.68, 420, 16, '#7a5a3a');
    for (var p = 0; p < 6; p++) game.draw.rect(p * 70, H * 0.69, 4, H * 0.31, '#4a3020');
    game.draw.rect(-20, H * 0.63, 470, 50, '#3a2818');
    glow(330, H * 0.72, 18, C.lamp, 0.8 + Math.sin(t * 3) * 0.1);
    game.draw.circle(330, H * 0.72, 12, C.lamp);
    // 桟橋
    game.draw.rect(420, H * 0.74, W - 420, 26, '#6a4a30');
    for (var q = 0; q < 6; q++) game.draw.rect(460 + q * 110, H * 0.74 + 26, 14, 60, '#4a3020');
    // 見張り番
    var blow = holding && phase === 'reply';
    var fr = blow ? KEEPER_B : KEEPER_A;
    game.draw.sprite(fr, { h: '#2a3a5a', s: '#e8c098', e: C.ink, '-': C.ink, m: '#a05a4a', o: '#5a2a2a', c: '#3a5a8a', b: C.brass, k: C.ink }, 470, H * 0.7 + Math.sin(t * 3) * 3, 14, { anchor: 'center' });
  }

  function drawHorn() {
    var t = game.time.elapsed;
    var blow = holding && phase === 'reply';
    var ready = phase === 'reply' && !blow;
    // ラッパ型の霧笛(真鍮)
    var sh = blow ? Math.sin(t * 60) * 3 : 0;
    game.draw.rect(HORN.x - 140 + sh, HORN.y - 20, 160, 40, C.brass);
    for (var k = 0; k < 10; k++) {
      var r = 22 + k * 7;
      game.draw.rect(HORN.x + 20 + k * 14 + sh, HORN.y - r, 14, r * 2, k % 2 ? '#d89a4a' : C.brass);
    }
    game.draw.rect(HORN.x + 160 + sh, HORN.y - 90, 12, 180, '#f0c070');
    game.draw.rect(HORN.x - 120, HORN.y + 20, 20, 120, '#4a3020');
    // 音の輪
    for (var i = waves.length - 1; i >= 0; i--) {
      var w = waves[i];
      w.r += 520 * (1 / 60); w.a -= 1.4 / 60;
      if (w.a <= 0) { waves.splice(i, 1); continue; }
      game.draw.circle(HORN.x + 180, HORN.y, w.r, C.cream, 0.12 * w.a);
    }
    // 吹いた回数の札(1, 2, 3...)
    for (var j = 0; j < tallies.length; j++) {
      var ty = HORN.y - 170 - j * 4;
      var tx = HORN.x - 220 + j * 80;
      tallies[j].t += 1 / 60;
      game.draw.circle(tx, ty, 34, C.ink, 0.6);
      game.draw.circle(tx, ty, 30, verdict === false && phase === 'answer' && j >= shownN ? C.bad : C.cream);
      label('' + tallies[j].n, tx, ty + 14, 38, C.ink);
    }
    // 押しボタン(吹き口のふいご)
    game.draw.circle(BTN.x, BTN.y + 12, BTN.r, C.ink, 0.5);
    game.draw.circle(BTN.x, BTN.y, BTN.r * (blow ? 0.94 : 1), blow ? C.lamp : (ready ? '#a87a3a' : '#5a4a3a'));
    if (ready) game.draw.circle(BTN.x, BTN.y, BTN.r + 10 + Math.sin(t * 10) * 6, C.lamp, 0.25);
    if (blow) game.draw.rect(BTN.x - 110, BTN.y + 60, 220 * Math.min(1, holdT / FULL), 18, C.ok);
    game.draw.circle(BTN.x, BTN.y, 50, C.brass);
    game.draw.circle(BTN.x - 14, BTN.y - 14, 16, C.cream, 0.6);
    // 待ちの輪: 手を止めると縮んで締め切る
    if (phase === 'reply' && blasts > 0 && !blow) {
      var left = Math.max(0, 1 - silentT / SETTLE);
      game.draw.circle(BTN.x, BTN.y, 60 + 70 * left, C.ok, 0.25);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.6);
    label('SCORE ' + score, 250, 80, 44, C.cream);
    for (var i = 0; i < BOATS; i++) {
      var col = i < results.length ? (results[i] ? C.ok : C.bad) : (i === ri ? C.cream : '#3a4660');
      game.draw.rect(90 + i * 110, 140, 80, 34, col);
      game.draw.rect(110 + i * 110, 128, 40, 12, col);
    }
    label(guided + ' / ' + NEEDED, 640, 176, 40, C.ok);
    for (var l = 0; l < LIVES; l++) {
      var on = l < LIVES - lost;
      game.draw.circle(830 + l * 90, 70, 26, on ? C.lamp : '#3a4660');
      if (on) glow(830 + l * 90, 70, 14, C.lamp, 0.5);
    }
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(760, 150, 240 * tk, 14, tk < 0.25 ? C.bad : C.cream);
  }

  function drawScene() {
    drawLake();
    drawBoat();
    drawFog(ri);
    drawHut();
    drawHorn();
    if (focus && stopT > 0) game.draw.circle(focus.x, focus.y, 120, '#ffffff', 0.25);
  }

  // ---- ATTRACT: 3回瞬く舟に3回吹いて導く → 2回の舟に3回吹いて見失う ----
  var demo = { t: 0, press: false, plan: 0, hold: 0, gap: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || ri > 1 || readyT > 0) {
      initGame(); readyT = 0; startRound(0); rd.n = 3; rd.fade = 9; demo.plan = 3;
    }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; }
    else if (stepRound(dt, true)) {
      if (ri === 0) { startRound(1); rd.n = 2; rd.fade = 9; demo.plan = 3; }
      else { startRound(0); rd.n = 3; rd.fade = 9; demo.plan = 3; guided = 0; lost = 0; }
    }
    if (phase === 'reply' && blasts < demo.plan) {
      if (!holding) {
        demo.gap -= dt;
        if (demo.gap <= 0) { demo.press = true; hornDown(true); demo.hold = 0.3; }
      } else {
        demo.hold -= dt;
        if (demo.hold <= 0) { demo.press = false; hornUp(true); demo.gap = 0.18; }
      }
    } else if (holding) { demo.press = false; hornUp(true); }
    stepHorn(dt, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(BTN.x + 30, BTN.y - (demo.press ? 10 : 70), { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.6);
      label(GAME_TITLE, W / 2, 105, 88 + Math.sin(t * 3) * 3, C.lamp);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.55, 50, C.lamp);
      else label('TAP TO START', W / 2, H * 0.55, 44, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.22, C.ink, 0.7);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, won ? C.ok : C.bad);
      label('SCORE ' + score, W / 2, H * 0.42, 52, C.cream);
      label(guided + ' / ' + BOATS, W / 2, H * 0.465, 40, C.ok);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.505, 46, C.lamp);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.505, 36, C.cream);
      if (!won) label('あと' + Math.max(1, NEEDED - guided) + '艘!', W / 2, H * 0.29, 48, C.lamp);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, C.cream);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { guided: guided, lost: lost };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      playT += dt;
      stepHorn(dt, false);
      if (stepRound(dt, false)) {
        if (ri + 1 >= BOATS) finish(guided >= NEEDED);
        else startRound(ri + 1);
      } else if (playT >= TIME_LIMIT && !over && phase !== 'answer') {
        focus = { x: boatX, y: boatY - 40 };
        finish(guided >= NEEDED);
      }
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 100, C.lamp);
    if (over && !won && playT >= TIME_LIMIT) label('TIME UP', W / 2, H * 0.55, 90, C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 1], ['C4', 0.5], ['E4', 0.5], ['D4', 1.5], ['C4', 0.5],
      ['B3', 1], ['G3', 1], ['A3', 2],
    ], { tempo: 72, wave: 'triangle', volume: 0.05, loop: true, bass: [['A2', 4], ['E2', 4]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
