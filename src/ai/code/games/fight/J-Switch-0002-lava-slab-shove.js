// J-Switch-0002-lava-slab-shove.js
// 焼け石土俵の押し出し — 熱い円盤の上でじりじり押してくる相手に、踏ん張って力を溜め、満タンの瞬間に離して一気に突き出す
// 操作: 押している間だけ足を踏ん張って力が溜まる。離すと溜めた分だけ相手を突き出す。溜めすぎると足裏が焼けて跳ね上がり押し込まれる(社内メモ。画面には出さない)
// 終わり: 3人を円盤の外へ突き出せばCLEAR。自分が縁から落ちる/時間切れでGAME OVER
// @mechanic: hold_charge
// @theme: volcano_hot_slab_sumo
// 世界観: 火山島の夏祭り、溶岩の上に据えた焼け石の円盤で、若いイモリ力士が次々に上がってくる大トカゲたちと押し合う。熱い床で踏ん張りすぎず、溜めた力を一気に放って3人を円盤の外へ突き出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 突き出した人数・満タン突き(PERFECT)数・足焼け回数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横1pxストリップのベタ塗り、輪郭は line、頂点ジッターと遠景フォグ
  var STYLE = { bg: ['#1a0d1e', '#4a1c28', '#8a2c1c'], main: ['#5a5a66', '#7a7a88', '#3a3a44'], accent: ['#ffb02e', '#ff4a2a'] };
  var C = {
    sky1: '#1a0d1e', sky2: '#6a2430', fog: '#b0506a', rock: '#4a4a56', rockL: '#6e6e7c', rockD: '#2c2c34',
    lava: '#ff4a2a', lavaL: '#ffb02e', hot: '#ff7a3a', newt: '#3ac27a', newtD: '#1e7a4a', liz: '#8a6ad8', lizD: '#4e3a8a',
    white: '#ffffff', ink: '#120810', gold: '#ffe066', bad: '#ff3a5a', belly: '#f2e2a0'
  };

  var GAME_TITLE = 'LAVA SLAB';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var CX = W / 2, CY = H * 0.47, RX = 430, RY = 300;
  var FULL_T = 0.9, BURN_T = 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, c, pushed, perfects, burns, charge, holding, overT, lunge, lungeT, rivalFall, hitStop, outro, ok, halfShown, focus, toneT, shoveAnim, burnHop, sweetRung;

  // ── sprites ───────────────────────────────────────────────────────
  var NEWT = [
    ['..gggg..', '.gkggkg.', '.gggggg.', 'gGbbbbGg', 'g.bbbb.g', '..bbbb..', '.gg..gg.', 'gg....gg'],
    ['..gggg..', '.gkggkg.', '.gggggg.', 'gGbbbbGg', '.gbbbbg.', '..bbbb..', '..gg.gg.', '.gg..gg.']
  ];
  var LIZ = [
    ['...pp...', '..pppp..', '.pkppkp.', '.pppppp.', 'PpwwwwpP', 'P.pppp.P', '..pppp..', '.pp..pp.'],
    ['...pp...', '..pppp..', '.pkppkp.', '.pppppp.', 'PppwwppP', '.Ppppp.P', '..pppp..', '..pp.pp.']
  ];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; c = 0; pushed = 0; perfects = 0; burns = 0;
    charge = 0; holding = false; overT = 0; lunge = 0; lungeT = 2.2; rivalFall = 0; hitStop = 0; outro = 0; ok = false;
    halfShown = false; focus = null; toneT = 0; shoveAnim = 0; burnHop = 0; sweetRung = false;
  }

  function rivalPush() { return 0.13 + pushed * 0.05; }
  function rivalMass() { return 1 + pushed * 0.2; }

  // 押し合い(実プレイ・デモ共用)
  function stepBout(dt, isDemo) {
    if (rivalFall > 0) {
      rivalFall -= dt;
      c += (0 - c) * Math.min(1, dt * 3);
      if (rivalFall <= 0) { c = 0; lungeT = 1.8; lunge = 0; }
      return;
    }
    c += rivalPush() * dt;
    if (shoveAnim > 0) shoveAnim -= dt;
    if (burnHop > 0) burnHop -= dt;
    // 大トカゲの突進(0.7秒前に赤く光って予告)
    if (lunge > 0) {
      lunge -= dt;
      if (lunge <= 0) {
        c += 0.32;
        if (!isDemo) { game.audio.play('se_break', 0.3); game.fx.shake(10, 0.2); }
        lungeT = game.random(2.2, 3.2);
      }
    } else {
      lungeT -= dt;
      if (lungeT <= 0) { lunge = 0.7; if (!isDemo) game.audio.tone('D3', 0.3, { wave: 'sawtooth', volume: 0.05, slide: 80 }); }
    }
    if (holding) {
      var was = charge;
      charge = Math.min(1.2, charge + dt / FULL_T);
      if (!isDemo) {
        toneT -= dt;
        if (toneT <= 0) { toneT = 0.08; game.audio.tone(220 + charge * 500, 0.05, { wave: 'square', volume: 0.03 }); }
        if (was < 0.85 && charge >= 0.85 && !sweetRung) { sweetRung = true; game.audio.play('se_powerup', 0.35); }
      }
      if (charge >= 1) {
        overT += dt;
        if (overT >= BURN_T) burnFeet(isDemo);
      }
    }
  }

  function burnFeet(isDemo) {
    holding = false; charge = 0; overT = 0; burnHop = 0.4; sweetRung = false;
    c += 0.22;
    if (isDemo) { game.fx.burst(CX, CY + (c + 0.14) * RY, { color: C.hot, count: 10, speed: 220 }); return; }
    burns++;
    game.feedback.bad(CX, CY + (c + 0.14) * RY - 120, { text: 'MISS', color: C.bad });
  }

  function startCharge(isDemo) {
    if (holding || burnHop > 0 || rivalFall > 0) return false;
    holding = true; charge = 0; overT = 0; sweetRung = false;
    if (!isDemo) game.audio.play('se_tap', 0.3);
    return true;
  }

  function releaseCharge(isDemo) {
    if (!holding) return null;
    holding = false;
    var perfect = charge >= 0.85 && charge <= 1.0 + BURN_T / FULL_T;
    var counter = lunge > 0 && lunge < 0.45 && charge >= 0.5;
    var power = (0.14 + 0.62 * Math.min(1, charge) + (perfect ? 0.18 : 0) + (counter ? 0.3 : 0)) / rivalMass();
    if (counter) { lunge = 0; lungeT = game.random(2.2, 3.2); }
    c -= power;
    shoveAnim = 0.2;
    var cy = CY + (c - 0.14) * RY;
    if (isDemo) { game.fx.burst(CX, cy, { color: perfect ? C.gold : C.white, count: perfect ? 12 : 5, speed: 240 }); }
    else {
      game.audio.play('se_jump', 0.35);
      if (perfect || counter) {
        perfects++;
        game.feedback.good(CX, cy - 120, { text: counter ? 'NICE' : 'PERFECT', color: C.gold, count: 14 });
      } else if (charge > 0.4) {
        game.feedback.good(CX, cy - 120, { text: 'GOOD', color: C.white, count: 6 });
      } else {
        game.fx.burst(CX, cy, { color: C.white, count: 4, speed: 140 });
      }
    }
    charge = 0; overT = 0;
    if (c <= -1) rivalOut(isDemo);
    return perfect;
  }

  function rivalOut(isDemo) {
    rivalFall = 0.8;
    if (isDemo) { game.fx.burst(CX, CY - RY, { color: C.lava, count: 16, speed: 300 }); return; }
    pushed++;
    game.audio.play('se_coin', 0.4);
    game.fx.burst(CX, CY - RY, { color: C.lavaL, count: 22, speed: 380 });
    if (!halfShown && pushed >= 1 && pushed < NEEDED) {
      halfShown = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(pushed + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 64 });
    }
    if (pushed >= NEEDED) { focus = 'rival'; finish(true); }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55; holding = false;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      focus = 'me';
      game.feedback.bad(CX, CY + RY - 60, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play' && burnHop > 0) game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.03 });
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play' || hitStop > 0) return;
    if (!startCharge(false)) game.fx.burst(x, y, { color: C.hot, count: 3, speed: 80 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    if (holding) releaseCharge(false);
    else game.audio.tone('E3', 0.03, { wave: 'triangle', volume: 0.02 });
  });

  // ── demo(満タンで離す。3回目は溜めすぎて足を焼く)────────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, n: 0, wait: 0.4, burnTry: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { c = 0; pushed = 0; demo.n = 0; holding = false; charge = 0; rivalFall = 0; lunge = 0; lungeT = 2.5; burnHop = 0; }
    stepBout(dt, true);
    if (c >= 0.9) c = 0.2;
    demo.gx = W / 2 + 40; demo.gy = H * 0.86;
    demo.press = holding;
    if (!holding) {
      demo.wait -= dt;
      if (demo.wait <= 0 && burnHop <= 0 && rivalFall <= 0 && startCharge(true)) {
        demo.burnTry = demo.n % 3 === 2; demo.n++;
      }
    } else if (!demo.burnTry && charge >= 0.93) {
      releaseCharge(true); demo.wait = 0.35;
    }
    if (!holding && burnHop > 0) demo.wait = 0.45;
  }

  // ── drawing ───────────────────────────────────────────────────────
  function jit(i) { return Math.sin(game.time.elapsed * 23 + i * 7.1) * 2; }

  function drawStage() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.35, C.sky2], [0.6, C.lava], [1, C.sky1]]);
    // 遠景の火山(ストリップ塗り)とフォグ
    for (var y = 0; y < 260; y += 4) {
      var half = 80 + y * 1.3;
      game.draw.rect(W * 0.72 - half + jit(y), H * 0.12 + y, half * 2, 4, y < 20 ? C.lavaL : C.rockD);
    }
    game.draw.rect(0, H * 0.12, W, 280, C.fog, 0.18);
    // 溶岩の湖
    for (var r = 0; r < 12; r++) {
      var ly = H * 0.62 + r * 36;
      game.draw.rect(0, ly, W, 18, r % 2 ? C.lava : C.lavaL, 0.25 + 0.15 * Math.sin(t * 3 + r));
    }
    // 焼け石の円盤(楕円を横1pxストリップで)
    var heat = 0.35 + 0.25 * Math.sin(t * 2);
    for (var sy = -RY - 40; sy <= RY + 40; sy += 6) {
      var k = sy / (RY + 40);
      var hw = (RX + 40) * Math.sqrt(Math.max(0, 1 - k * k));
      game.draw.rect(CX - hw, CY + sy + 50, hw * 2, 6, C.rockD);
    }
    for (var sy2 = -RY; sy2 <= RY; sy2 += 6) {
      var k2 = sy2 / RY;
      var hw2 = RX * Math.sqrt(Math.max(0, 1 - k2 * k2));
      game.draw.rect(CX - hw2 + jit(sy2), CY + sy2, hw2 * 2, 6, (Math.floor((sy2 + RY) / 48) % 2) ? C.rock : C.rockL);
      if (Math.abs(k2) > 0.8) game.draw.rect(CX - hw2, CY + sy2, hw2 * 2, 6, C.hot, heat);
    }
    // 縁の輪郭線
    for (var a = 0; a < 24; a++) {
      var a1 = a / 24 * Math.PI * 2, a2 = (a + 1) / 24 * Math.PI * 2;
      game.draw.line(CX + Math.cos(a1) * RX, CY + Math.sin(a1) * RY, CX + Math.cos(a2) * RX, CY + Math.sin(a2) * RY, C.lavaL, 4);
    }
    // 立ちのぼる火の粉
    for (var e = 0; e < 14; e++) {
      var ey = H * 0.8 - ((t * 120 + e * 97) % (H * 0.55));
      game.draw.rect((e * 157) % W, ey, 8, 8, C.lavaL, 0.6);
    }
    game.draw.rect(0, 0, W, H, C.lava, 0.02 + 0.02 * Math.sin(t * 1.4));
  }

  function drawWrestlers() {
    var t = game.time.elapsed;
    var push = shoveAnim > 0 ? 30 : 0;
    // 相手(奥=小さい)
    var ry = CY + (c - 0.2) * RY - 40;
    var fallOff = rivalFall > 0 ? (0.8 - rivalFall) * 700 : 0;
    var rscale = 20 - fallOff * 0.01;
    var lGlow = lunge > 0 && Math.floor(t * 14) % 2 === 0;
    if (!(rivalFall > 0 && fallOff > 500)) {
      if (lGlow) game.draw.circle(CX, ry, 120, C.bad, 0.4);
      game.draw.rect(CX - 80, ry + 70, 160, 14, C.ink, 0.35);
      game.draw.sprite(LIZ[Math.floor(t * 3) % 2], { p: lGlow ? C.bad : C.liz, P: C.lizD, k: C.ink, w: C.white }, CX + Math.sin(t * 5) * 4, ry - fallOff - push * 0.5, Math.max(8, rscale + pushed * 1.5), { anchor: 'center' });
    }
    // 自分(手前=大きい)
    var my = CY + (c + 0.2) * RY + 20;
    var hop = burnHop > 0 ? Math.sin((0.4 - burnHop) / 0.4 * Math.PI) * 90 : 0;
    var squat = holding ? Math.min(1, charge) * 16 : 0;
    if (focus === 'me' && phase === 'stop' && Math.floor(t * 14) % 2 === 0) game.draw.circle(CX, my, 140, C.white, 0.45);
    if (focus === 'rival' && phase === 'stop' && Math.floor(t * 14) % 2 === 0) game.draw.circle(CX, CY - RY, 140, C.white, 0.45);
    game.draw.rect(CX - 100, my + 90, 200, 16, C.ink, 0.35);
    var shakeX = holding && charge >= 1 ? Math.sin(t * 60) * 6 : 0;
    game.draw.sprite(NEWT[holding ? 1 : Math.floor(t * 3) % 2], { g: charge >= 1 ? C.hot : C.newt, G: C.newtD, k: C.ink, b: C.belly }, CX + shakeX, my + squat - hop - push, 24, { anchor: 'center' });
    if (holding && charge >= 1) game.draw.rect(CX - 60, my + 90, 120, 12, C.lavaL, 0.8);
  }

  function drawMeter() {
    var t = game.time.elapsed;
    var mx = 120, mw = W - 240, my = H * 0.84;
    game.draw.rect(mx - 6, my - 6, mw + 12, 72, C.ink);
    game.draw.rect(mx, my, mw, 60, C.rockD);
    game.draw.rect(mx + mw * 0.85 / 1.2, my, mw * 0.15 / 1.2, 60, C.gold, 0.35);
    game.draw.rect(mx + mw / 1.2, my, mw * 0.2 / 1.2, 60, C.bad, 0.3);
    var fill = Math.min(1.2, charge) / 1.2;
    var col = charge >= 1 ? (Math.floor(t * 16) % 2 ? C.bad : C.lavaL) : (charge >= 0.85 ? C.gold : C.newt);
    game.draw.rect(mx, my, mw * fill, 60, col);
    // 足元の縁までの距離(自分側)
    var danger = Math.max(0, Math.min(1, (c + 1) / 2));
    game.draw.rect(mx, H * 0.9, mw, 16, C.rockD);
    game.draw.rect(mx, H * 0.9, mw * danger, 16, danger > 0.75 ? C.bad : C.hot);
    for (var i = 0; i < NEEDED; i++) {
      game.draw.circle(W * 0.72 + i * 90, H * 0.955, 30, i < pushed ? C.lavaL : C.rockD);
      game.draw.circle(W * 0.72 + i * 90, H * 0.955, 18, i < pushed ? C.lava : C.rock);
    }
    game.draw.sprite(NEWT[Math.floor(t * 2) % 2], { g: C.newt, G: C.newtD, k: C.ink, b: C.belly }, W * 0.14, H * 0.955 + Math.sin(t * 2.5) * 4, 7, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.7);
    txt(pushed + ' / ' + NEEDED, W / 2, 90, 66, C.gold);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.rockD);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.lavaL);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawStage(); drawWrestlers(); drawMeter();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.7);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.lavaL);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawStage(); drawMeter();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        if (holding && !game.input.pressing) releaseCharge(false);
        stepBout(dt, false);
        if (c >= 1) { c = 1; finish(false); }
        else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (rivalFall > 0) rivalFall = Math.max(0.01, rivalFall - dt);
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = pushed * 200 + perfects * 80 + Math.round(timeLeft * 10);
        var stats = { pushed: pushed, perfect: perfects, burns: burns };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawStage(); drawWrestlers(); drawMeter(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.22, 96, C.gold);
    if (phase === 'outro') {
      var sc = pushed * 200 + perfects * 80 + Math.round(timeLeft * 10);
      game.draw.rect(0, H * 0.24, W, H * 0.16, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.33, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.37, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - pushed) + '人!', W / 2, H * 0.37, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.37, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['D#4', 0.5], ['E4', 1], ['R', 0.5], ['E4', 0.5],
      ['G4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['B3', 0.5], ['A3', 1]
    ], { tempo: 132, wave: 'sawtooth', volume: 0.04, loop: true, bass: [['A2', 1], ['A2', 1], ['E2', 1], ['E2', 1], ['F2', 1], ['G2', 1], ['E2', 1], ['A2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
