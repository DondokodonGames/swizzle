// J-Switch-0005-dam-crank-reel.js
// 堰堤の手回しリール — 真鍮のリールの周りを指でぐるぐる回して糸を巻き、糸の張りを帯の中に保ったまま大ナマズを引き寄せる
// 操作: 下のリールの周りで時計回りに円を描くと巻く(速いほど張りが上がる)。反時計回りで糸を送って緩める。魚が暴れる合図の間は巻く手を止める(社内メモ。画面には出さない)
// 終わり: 3匹釣り上げればCLEAR。2匹逃がす(張りすぎて糸切れ・緩めすぎて外れる)/時間切れでGAME OVER
// @mechanic: rotate_gesture
// @theme: old_dam_crank_reel
// 世界観: 霧の立ちこめる古いダムの放水口、水門番の老人が欄干に据えた真鍮の手回しリールで、濁った淵に潜む引きの強い大ナマズと根比べをし、今夜の3匹を釣り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 釣った数・逃がした数・帯の中にいた割合
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質。粒状ノイズと擬似奥行き、背景は1枚絵として描く
  var STYLE = { bg: ['#0c1416', '#1c2a2c', '#2e3e3a'], main: ['#8a7a4a', '#c8a85a', '#5a5a52'], accent: ['#7affc0', '#ff5a3a'] };
  var C = {
    bg1: '#0a1012', bg2: '#22322e', concrete: '#4a524c', concreteD: '#2a302c', water: '#16302c', waterL: '#2a4a40', fog: '#9ab0a8',
    brass: '#c8a85a', brassD: '#7a6230', brassL: '#f2dc9a', steel: '#8a9294', band: '#7affc0', bad: '#ff5a3a', white: '#f4f4ec', ink: '#060a0a',
    fish: '#0a1a16', gold: '#ffd86a'
  };

  var GAME_TITLE = 'DAM REEL';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var MAX_LOST = 2;
  var HX = W / 2, HY = H * 0.83, HR = 190;
  var BAND_LO = 0.35, BAND_HI = 0.8, SLACK = 0.15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, landed, lost, fish, tension, omega, accum, lastAng, crank, slackT, surgeT, surge, surgeWarn, hitStop, outro, ok, halfShown, bandTime, playTime, nextT, clickT, focusBad;

  // ── sprites ───────────────────────────────────────────────────────
  var CATFISH = [
    ['w.........ffff..', '.w....ffffffffff', '..ffffffffffffff', 'fkffffffffffff.f', '..fffffffffff...', '.w...ff.ff......'],
    ['w.........ffff..', '.w....ffffffff.f', '..fffffffffffff.', 'fkffffffffffffff', '..fffffffffff..f', '.w...ff.ff......']
  ];
  var KEEPER = [
    ['..hhhh..', '.hhhhhh.', '..ffff..', '..fkfk..', '..ffff..', '.cccccc.', 'cc.cc.cc', '..cccc..'],
    ['..hhhh..', '.hhhhhh.', '..ffff..', '..fkfk..', '..fwwf..', '.cccccc.', '.cccccc.', '..cccc..']
  ];
  var KNOB = ['.bb.', 'bBBb', 'bBBb', '.bb.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function newFish() {
    var k = landed + lost;
    fish = { dist: 26 + k * 2, max: 26 + k * 2, x: game.random(W * 0.3, W * 0.7), vx: game.random(-120, 120), big: k >= 2 };
    tension = 0.3; slackT = 0; surge = 0; surgeWarn = 0; surgeT = game.random(1.4, 2.2); nextT = 0;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; landed = 0; lost = 0; omega = 0; accum = 0; lastAng = null; crank = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; bandTime = 0; playTime = 0; clickT = 0; focusBad = false;
    newFish();
  }

  // 張りと距離(実プレイ・デモ共用)。w は巻く角速度(rad/s、負は糸送り)
  function stepReel(dt, w, isDemo) {
    if (nextT > 0) { nextT -= dt; if (nextT <= 0) newFish(); return; }
    var f = fish;
    // 大ナマズの暴れ(0.6秒前に合図)
    if (surge > 0) { surge -= dt; if (surge <= 0) surgeT = game.random(1.6, 2.6); }
    else if (surgeWarn > 0) { surgeWarn -= dt; if (surgeWarn <= 0) { surge = 0.9; if (!isDemo) game.audio.play('se_break', 0.25); } }
    else { surgeT -= dt; if (surgeT <= 0) { surgeWarn = 0.6; if (!isDemo) game.audio.tone('D3', 0.35, { wave: 'sawtooth', volume: 0.05, slide: -60 }); } }
    var pull = (f.big ? 0.16 : 0.12) + (surge > 0 ? 0.75 : 0);
    var reelIn = Math.max(0, w), letOut = Math.max(0, -w);
    tension += (0.055 * reelIn + pull - 0.9 * tension - 0.08 * letOut) * dt;
    if (tension < 0) tension = 0;
    var inBand = tension >= BAND_LO && tension <= BAND_HI;
    if (!isDemo && inBand) bandTime += dt;
    f.dist -= reelIn * dt * (inBand ? 1 : 0.5);
    f.dist = Math.min(f.max, f.dist + letOut * dt * 0.4 + (surge > 0 ? 3 * dt : 0));
    f.x += f.vx * dt * (surge > 0 ? 3 : 1);
    if (f.x < W * 0.2 || f.x > W * 0.8) f.vx = -f.vx;
    crank += w * dt;
    if (tension >= 1) { lose('snap', isDemo); return; }
    if (tension < SLACK) { slackT += dt; if (slackT > 1.6) { lose('slack', isDemo); return; } } else slackT = 0;
    if (f.dist <= 0) land(isDemo);
  }

  function fishPos() {
    var d = fish ? Math.max(0, fish.dist / fish.max) : 1;
    return { x: fish ? fish.x : W / 2, y: H * 0.42 + (1 - d) * H * 0.18, s: 7 + (1 - d) * 7 };
  }

  function land(isDemo) {
    var p = fishPos();
    nextT = 0.7;
    if (isDemo) { game.fx.burst(p.x, p.y, { color: C.gold, count: 12, speed: 260 }); return; }
    landed++;
    focusBad = false; hitStop = 0.25;
    game.feedback.good(p.x, p.y - 100, { text: tension > 0.5 && tension < 0.7 ? 'PERFECT' : 'GOOD', color: C.gold, count: 16 });
    game.audio.play('se_coin', 0.4);
    if (!halfShown && landed >= 1 && landed < NEEDED) {
      halfShown = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(landed + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.band, size: 64 });
    }
    if (landed >= NEEDED) finish(true);
  }

  function lose(why, isDemo) {
    var p = fishPos();
    nextT = 0.7;
    if (isDemo) { game.fx.burst(p.x, p.y, { color: C.bad, count: 10, speed: 220 }); return; }
    lost++;
    focusBad = true;
    if (lost >= MAX_LOST) { finish(false); return; }
    hitStop = 0.4;
    game.feedback.bad(p.x, p.y - 100, { text: 'MISS', color: C.bad });
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      var p = fishPos();
      game.feedback.bad(p.x, p.y - 100, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play') game.audio.tone('A3', 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    var d = Math.hypot(x - HX, y - HY);
    lastAng = d > 50 ? Math.atan2(y - HY, x - HX) : null;
    if (d < 460) game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    var d = Math.hypot(x - HX, y - HY);
    if (d < 50 || d > 520) { lastAng = null; return; }
    var a = Math.atan2(y - HY, x - HX);
    if (lastAng !== null) {
      var da = a - lastAng;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      accum += da;
      clickT += Math.abs(da);
      if (clickT > 0.8) { clickT = 0; game.audio.tone(da > 0 ? 'E5' : 'C5', 0.02, { wave: 'square', volume: 0.025 }); }
    }
    lastAng = a;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    lastAng = null;
    if (phase === 'play' && tension > BAND_HI) game.fx.burst(HX, HY, { color: C.bad, count: 3, speed: 90 });
  });

  // ── demo(円を描いて巻き、合図で手を止める。3匹目は止めずに糸を切る)──
  var demo = { t: 0, a: 0, w: 0, gx: HX, gy: HY - HR, n: 0, greedy: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 12;
    if (cyc < dt || demo.t <= dt) { landed = 0; lost = 0; demo.n = 0; newFish(); }
    if (nextT > 0 && nextT - dt <= 0) { demo.n++; demo.greedy = demo.n % 3 === 2; }
    var want = 9;
    if (!demo.greedy && (surgeWarn > 0 || surge > 0 || tension > 0.72)) want = surge > 0 ? -2 : 0;
    if (demo.greedy) want = 12;
    demo.w += (want - demo.w) * Math.min(1, dt * 8);
    demo.a += demo.w * dt;
    demo.gx = HX + Math.cos(demo.a) * (HR + 40); demo.gy = HY + Math.sin(demo.a) * (HR + 40);
    stepReel(dt, demo.w, true);
    if (landed + lost > 6) { landed = 0; lost = 0; }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.3, C.bg2], [0.36, C.water], [0.72, C.ink]]);
    // 対岸のダム壁(遠景の一枚絵)
    for (var y = 0; y < 300; y += 6) game.draw.rect(0, H * 0.06 + y, W, 6, (Math.floor(y / 36) % 2) ? C.concrete : C.concreteD, 0.8);
    for (var g = 0; g < 5; g++) {
      game.draw.rect(90 + g * 200, H * 0.08, 90, 220, C.concreteD);
      game.draw.rect(100 + g * 200, H * 0.08 + 180, 70, 40, C.fog, 0.25 + 0.1 * Math.sin(t * 2 + g));
    }
    // 淵の水面(霧のかかった縞)
    for (var r = 0; r < 14; r++) {
      var wy = H * 0.37 + r * 26;
      game.draw.rect(((t * 30 * (r % 2 ? 1 : -1) + r * 90) % 200) - 200, wy, W + 400, 3, C.waterL, 0.35);
    }
    game.draw.rect(0, H * 0.34, W, 90, C.fog, 0.12 + 0.05 * Math.sin(t * 0.8));
    // 粒状ノイズ
    for (var n = 0; n < 40; n++) game.draw.rect(game.random(0, W), game.random(0, H), 4, 4, C.white, 0.05);
    game.draw.rect(0, 0, W, H, C.band, 0.015 + 0.015 * Math.sin(t * 1.3));
  }

  function drawFishAndLine() {
    var t = game.time.elapsed;
    var p = fishPos();
    var tipX = W * 0.82, tipY = H * 0.3;
    // 竿(欄干から張り出す)
    game.draw.line(W * 0.95, H * 0.66, tipX, tipY, C.steel, 10);
    var sag = Math.max(0, (0.4 - tension)) * 160;
    var midX = (tipX + p.x) / 2, midY = (tipY + p.y) / 2 + sag;
    var lcol = tension > BAND_HI ? C.bad : (tension < SLACK ? C.fog : C.white);
    if (nextT <= 0) {
      game.draw.line(tipX, tipY, midX, midY, lcol, 3);
      game.draw.line(midX, midY, p.x, p.y, lcol, 3);
      var warn = surgeWarn > 0 && Math.floor(t * 14) % 2 === 0;
      if (warn || surge > 0) game.draw.circle(p.x, p.y, 70 + p.s * 4, surge > 0 ? C.bad : C.white, 0.3);
      var hl = (phase === 'stop' || hitStop > 0) && Math.floor(t * 14) % 2 === 0;
      if (hl) game.draw.circle(p.x, p.y, 140, focusBad ? C.bad : C.gold, 0.4);
      var thr = surge > 0 ? Math.sin(t * 40) * 12 : Math.sin(t * 3) * 4;
      game.draw.sprite(CATFISH[Math.floor(t * (surge > 0 ? 14 : 4)) % 2], { f: fish.big ? '#7a7040' : '#5a806a', k: C.band, w: C.fog }, p.x + thr, p.y, p.s, { anchor: 'center', flipX: fish.vx < 0, alpha: 0.95 });
    }
    // 手前の欄干(奥行き)
    game.draw.rect(0, H * 0.66, W, 26, C.steel);
    game.draw.rect(0, H * 0.66 + 26, W, 10, C.concreteD);
    for (var b = 0; b < 9; b++) game.draw.rect(b * 130 + 20, H * 0.66 + 36, 16, 80, C.steel);
    game.draw.sprite(KEEPER[Math.floor(t * 2) % 2], { h: '#3a4a3a', f: '#d8c0a0', k: C.ink, w: C.white, c: '#4a5a6a' }, W * 0.12, H * 0.62 + Math.sin(t * 2) * 4, 14, { anchor: 'center' });
  }

  function drawReel() {
    var t = game.time.elapsed;
    // 真鍮のリール(下の親指ゾーン)
    game.draw.rect(0, H * 0.72, W, H * 0.28, C.ink, 0.6);
    game.draw.circle(HX, HY + 16, HR + 20, C.ink, 0.6);
    game.draw.circle(HX, HY, HR + 12, C.brassD);
    game.draw.circle(HX, HY, HR, C.brass);
    game.draw.circle(HX, HY, HR * 0.7, C.brassD);
    game.draw.circle(HX, HY, HR * 0.62, C.brass);
    game.draw.circle(HX - 50, HY - 60, HR * 0.3, C.brassL, 0.25);
    for (var s = 0; s < 6; s++) {
      var a = crank + s * Math.PI / 3;
      game.draw.line(HX + Math.cos(a) * 30, HY + Math.sin(a) * 30, HX + Math.cos(a) * HR * 0.6, HY + Math.sin(a) * HR * 0.6, C.brassD, 8);
    }
    game.draw.circle(HX, HY, 34, C.steel);
    var kx = HX + Math.cos(crank) * (HR + 50), ky = HY + Math.sin(crank) * (HR + 50);
    game.draw.line(HX, HY, kx, ky, C.steel, 16);
    game.draw.sprite(KNOB, { b: C.brassD, B: C.brassL }, kx, ky, 16, { anchor: 'center' });
    // 回す向きの目盛り(時計回りに流れる点)
    for (var d = 0; d < 12; d++) {
      var da = t * 2 + d * Math.PI / 6;
      game.draw.circle(HX + Math.cos(da) * (HR + 90), HY + Math.sin(da) * (HR + 90), 6, C.brassL, 0.25);
    }
  }

  function drawGauge() {
    var t = game.time.elapsed;
    // 張りのゲージ(右端の縦帯)
    var gx = W - 90, gy = H * 0.3, gh = H * 0.36;
    game.draw.rect(gx - 6, gy - 6, 52, gh + 12, C.ink);
    game.draw.rect(gx, gy, 40, gh, C.concreteD);
    game.draw.rect(gx, gy + gh * (1 - BAND_HI), 40, gh * (BAND_HI - BAND_LO), C.band, 0.35);
    var ty = gy + gh * (1 - Math.min(1, tension));
    var col = tension > BAND_HI ? C.bad : (tension < SLACK ? C.fog : C.band);
    if (tension > 0.9 && Math.floor(t * 16) % 2 === 0) col = C.white;
    game.draw.rect(gx - 14, ty - 8, 68, 16, col);
    // 距離(糸の残り)
    var d = fish ? Math.max(0, fish.dist / fish.max) : 0;
    game.draw.rect(60, H * 0.7, W - 240, 14, C.concreteD);
    game.draw.rect(60, H * 0.7, (W - 240) * (1 - d), 14, C.gold);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.7);
    txt(landed + ' / ' + NEEDED, W / 2, 90, 66, C.gold);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    for (var i = 0; i < MAX_LOST; i++) game.draw.circle(W - 150 + i * 60, 90, 18, i < lost ? C.bad : C.steel);
    game.draw.rect(60, 170, W - 120, 20, C.concreteD);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.band);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawBackdrop(); drawFishAndLine(); drawReel(); drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.7);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.brassL);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBackdrop(); drawReel();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    // 指の回転を角速度に(1フレーム分の累積角を平滑化)
    var raw = dt > 0 ? accum / dt : 0;
    accum = 0;
    if (!game.input.pressing) raw = 0;
    omega += (Math.max(-16, Math.min(16, raw)) - omega) * Math.min(1, dt * 10);

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt; playTime += dt;
        stepReel(dt, omega, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var pct = playTime > 0 ? Math.round(bandTime / playTime * 100) : 0;
        var score = landed * 300 + pct * 3 + Math.round(timeLeft * 10);
        var stats = { landed: landed, lost: lost, inBand: pct };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawBackdrop(); drawFishAndLine(); drawReel(); drawGauge(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, C.gold);
    if (phase === 'outro') {
      var pc = playTime > 0 ? Math.round(bandTime / playTime * 100) : 0;
      var sc = landed * 300 + pc * 3 + Math.round(timeLeft * 10);
      game.draw.rect(0, H * 0.24, W, H * 0.16, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + sc + '  ' + pc + '%', W / 2, H * 0.33, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.37, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - landed) + '匹!', W / 2, H * 0.37, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.37, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['F4', 1],
      ['E4', 1], ['G4', 0.5], ['A#4', 0.5], ['A4', 2]
    ], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true, bass: [['D2', 2], ['A#1', 2], ['C2', 2], ['A1', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
