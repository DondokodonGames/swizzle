// J-N6434-0055-pontoon-bobber-strike.js
// ウキしずめ一本釣り — 浮きが水中に引き込まれた一瞬だけ合わせ、つつきのフェイントには乗らない
// 操作: 画面のどこでもタップで竿を合わせる。浮きが沈み切っている間だけ釣れる(小さくつつく間は我慢)
// 終わり: 4匹釣れば成功。空振り・早合わせ・見逃しが3回で失敗。時間切れも失敗
// @mechanic: timing_window
// @theme: pontoon_bobber_strike
// 世界観: 夕暮れの浮き桟橋で、渡し舟の番をする少年が晩のおかずを釣る。魚影の寄り方と浮きの沈み方を読み、つつきに惑わされず本当の食いつきだけに合わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 釣った数・PERFECT数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い縁取り・飛ぶ数字
  var STYLE = { bg: ['#ff9a52', '#ffd66b'], main: ['#1e9bff', '#0a4f9e', '#ffffff'], accent: ['#ff2e63', '#ffe81a'] };
  var C = { sky1: '#ff8a4c', sky2: '#ffd66b', water: '#1e9bff', deep: '#0a4f9e', ink: '#1b1030', white: '#ffffff',
    red: '#ff2e63', yellow: '#ffe81a', good: '#29e07a', plank: '#b8682f', plankDark: '#7a3f18', shadow: '#062c5c' };

  var GAME_TITLE = 'BOBBER STRIKE';
  var TIME_LIMIT = 14;
  var NEEDED = 4;
  var MAX_MISS = 3;
  var WATER_Y = H * 0.5;
  var BOB_X = 660;
  var ROD_TIP = { x: 330, y: H * 0.3 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var caught, misses, perfects, score, timeLeft, ready, hitStop, finished, ok, done, endWait;
  var bob, flyFish, flash, rodKick;

  function txt(s, x, y, sz, col, align) {
    var o = { size: sz, color: C.ink, bold: true, align: align || 'center' };
    game.draw.text(s, x - 3, y, o); game.draw.text(s, x + 3, y, o); game.draw.text(s, x, y - 3, o); game.draw.text(s, x, y + 4, o);
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var BOY_A = ['..yyyyy..', '.yyyyyyy.', '...sss...', '...sKs...', '..rrrrr..', '.rrrrrrr.', '..rrrrr..', '..bb.bb..', '..bb.bb..'];
  var BOY_B = ['..yyyyy..', '.yyyyyyy.', '...sss...', '...sKs...', '..rrrrr..', 'rrrrrrr..', '..rrrrr..', '..bb.bb..', '..bb.bb..'];
  var BOY_PAL = { y: '#ffe81a', s: '#ffc9a0', K: '#1b1030', r: '#ff2e63', b: '#0a4f9e' };
  var FISH = ['..ooo..o', '.ooooooo', 'oKoooooo', '.ooooooo', '..ooo..o'];
  var FISH_PAL = { o: '#29e07a', K: '#1b1030' };
  var GOLD_PAL = { o: '#ffe81a', K: '#1b1030' };
  var GULL_A = ['w...w', '.w.w.', '..w..'];
  var GULL_B = ['.....', 'ww.ww', '..w..'];

  function windowFor(n) { return Math.max(0.36, 0.56 - n * 0.05); }

  function newCycle() {
    var gold = caught === NEEDED - 1;
    bob = { phase: 'idle', t: 0, dur: game.random(0.35, 0.7), nib: Math.floor(game.random(0, caught >= 2 ? 2.99 : 1.99)), gold: gold, fx: bob ? bob.fx : BOB_X - 260 };
  }

  function initGame() {
    caught = 0; misses = 0; perfects = 0; score = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0;
    finished = false; ok = false; done = false; endWait = 0; flyFish = null; flash = 0; rodKick = 0;
    newCycle();
  }

  function addMiss(live, word) {
    misses++;
    if (live) game.feedback.bad(BOB_X, WATER_Y - 40, { text: word || 'MISS', shake: 8 });
    bob.phase = 'escape'; bob.t = 0; bob.dur = 0.45;
    if (misses >= MAX_MISS && live) { finished = true; ok = false; hitStop = 0.45; flash = 0.45; }
  }

  // 合わせる — プレイもデモもここを通る
  function strike(live) {
    rodKick = 0.25;
    var ph = bob.phase;
    if (ph === 'bite') {
      var f = bob.t / bob.dur;
      var perfect = f > 0.25 && f < 0.7;
      caught++;
      if (perfect) perfects++;
      var pts = (perfect ? 150 : 100) * (bob.gold ? 2 : 1);
      score += pts;
      flyFish = { t: 0, gold: bob.gold };
      bob.phase = 'reel'; bob.t = 0; bob.dur = 0.5;
      if (live) {
        game.feedback.good(BOB_X, WATER_Y - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.yellow : C.good, size: 64 });
        game.fx.popup('+' + pts, BOB_X + 140, WATER_Y - 160, { color: C.white, size: 52 });
        if (caught === 2) { game.audio.play('se_milestone', 0.5); game.fx.popup(caught + ' / ' + NEEDED, W / 2, H * 0.36, { color: C.yellow, size: 72 }); }
        if (caught >= NEEDED) { finished = true; ok = true; hitStop = 0.4; flash = 0.4; score += Math.round(timeLeft * 20); }
      }
      return;
    }
    if (ph === 'reel' || ph === 'escape') { if (live) game.audio.play('se_tap', 0.1); return; }
    addMiss(live, 'MISS');
  }

  function stepBob(dt, live) {
    bob.t += dt;
    if (bob.phase === 'idle' && bob.t > bob.dur) {
      if (bob.nib > 0) { bob.nib--; bob.phase = 'nibble'; bob.t = 0; bob.dur = 0.28; if (live) game.audio.tone(520, 0.05, { wave: 'square', volume: 0.04 }); }
      else { bob.phase = 'approach'; bob.t = 0; bob.dur = 0.6; if (live) game.audio.tone('C4', 0.4, { wave: 'triangle', volume: 0.05, slide: -60 }); }
    } else if (bob.phase === 'nibble' && bob.t > bob.dur) {
      bob.phase = 'idle'; bob.t = 0; bob.dur = game.random(0.3, 0.6);
    } else if (bob.phase === 'approach' && bob.t > bob.dur) {
      bob.phase = 'bite'; bob.t = 0; bob.dur = windowFor(caught) * (bob.gold ? 0.85 : 1);
      if (live) game.audio.tone('G2', 0.12, { wave: 'sine', volume: 0.12 });
    } else if (bob.phase === 'bite' && bob.t > bob.dur) {
      addMiss(live, 'MISS');
    } else if ((bob.phase === 'escape' || bob.phase === 'reel') && bob.t > bob.dur) {
      newCycle();
    }
    if (flyFish) { flyFish.t += dt; if (flyFish.t > 0.7) flyFish = null; }
    if (rodKick > 0) rodKick -= dt;
    // 魚影の位置(approach で針へ寄る、それ以外は周回)
    var target = bob.phase === 'approach' ? BOB_X - 40 : bob.phase === 'bite' ? BOB_X - 10 : BOB_X - 260;
    bob.fx += (target - bob.fx) * Math.min(1, dt * (bob.phase === 'approach' ? 5 : 2));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
    if (finished || ready > 0) { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.3);
    strike(true);
  });

  // ── ATTRACT: AI が本物の stepBob/strike で2匹釣る → つつきに早合わせして失敗例 ──
  var demo = { t: 0, gx: W * 0.62, gy: H * 0.78, press: false, n: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.n = 0; demo.cool = 0; }
    stepBob(dt, false);
    demo.cool -= dt;
    demo.press = demo.cool > 0.1;
    if (demo.cool > 0) return;
    if (caught < 2 && bob.phase === 'bite' && bob.t > bob.dur * 0.45) { strike(false); demo.cool = 0.3; }
    else if (caught >= 2 && bob.phase === 'nibble' && bob.t > 0.1) { strike(false); demo.cool = 0.3; }
  }

  function drawScene(t) {
    var pulse = 0.05 + 0.05 * Math.sin(t * 1.5);
    game.draw.gradient(0, WATER_Y, [[0, C.sky1], [1, C.sky2]]);
    game.draw.circle(W * 0.78, H * 0.2, 110, '#fff3b0', 0.8 + pulse);
    for (var hI = 0; hI < 5; hI++) game.draw.circle(hI * 260 + 60, WATER_Y + 40, 160, '#e2663a', 0.6);
    // カモメ(見物)
    for (var g = 0; g < 2; g++) {
      var gx = (t * 60 + g * 520) % (W + 200) - 100;
      game.draw.sprite(Math.floor(t * 4 + g) % 2 ? GULL_A : GULL_B, { w: C.white }, gx, H * 0.14 + g * 70 + Math.sin(t * 2 + g) * 12, 9, { anchor: 'center' });
    }
    game.draw.gradient(WATER_Y, H, [[0, C.water], [1, C.deep]]);
    for (var s = 0; s < 8; s++) {
      var wy = WATER_Y + 30 + s * 90;
      game.draw.rect((t * 40 * (s % 2 ? 1 : -1) + s * 170) % W, wy, 140, 6, C.white, 0.18);
    }
    game.draw.rect(0, 0, W, H, C.white, pulse * 0.4);
    // 浮き桟橋
    for (var p = 0; p < 6; p++) {
      game.draw.rect(-20 + p * 70, H * 0.44 + Math.sin(t * 1.8) * 4, 64, 34, C.plank);
      game.draw.rect(-20 + p * 70, H * 0.44 + 28 + Math.sin(t * 1.8) * 4, 64, 6, C.plankDark);
    }
  }

  function bobberY(t) {
    var base = WATER_Y - 10 + Math.sin(t * 3) * 5;
    if (bob.phase === 'nibble') return base + Math.sin((bob.t / bob.dur) * Math.PI) * 22;
    if (bob.phase === 'approach') return base + Math.sin(t * 40) * 3;
    if (bob.phase === 'bite') return WATER_Y + 60;
    if (bob.phase === 'escape') return base - Math.sin((bob.t / bob.dur) * Math.PI) * 30;
    return base;
  }

  function drawRig(t) {
    var by = bobberY(t);
    var kick = rodKick > 0 ? rodKick * 160 : 0;
    var tipX = ROD_TIP.x + kick * 0.3, tipY = ROD_TIP.y - kick;
    game.draw.line(170, H * 0.42, tipX, tipY, C.ink, 14);
    game.draw.line(170, H * 0.42, tipX, tipY, '#d49a52', 8);
    game.draw.line(tipX, tipY, BOB_X, by - 20, C.white, 3);
    // 魚影(予告)
    var fx = bob.fx;
    var shadowA = bob.phase === 'approach' || bob.phase === 'bite' ? 0.75 : 0.35;
    var sz = bob.gold ? 1.4 : 1;
    game.draw.circle(fx, WATER_Y + 150 + Math.sin(t * 2) * 10, 44 * sz, bob.gold ? '#8a7300' : C.shadow, shadowA);
    game.draw.circle(fx - 48 * sz, WATER_Y + 150 + Math.sin(t * 2) * 10, 22 * sz, bob.gold ? '#8a7300' : C.shadow, shadowA);
    if (bob.phase === 'nibble' || bob.phase === 'idle') game.draw.circle(BOB_X + 60, WATER_Y + 110 + Math.sin(t * 5) * 8, 16, C.shadow, 0.4);
    // 浮き
    if (bob.phase === 'bite') {
      var rr = 30 + (bob.t / bob.dur) * 50;
      game.draw.circle(BOB_X, WATER_Y, rr + 6, C.ink, 0.5);
      game.draw.circle(BOB_X, WATER_Y, rr, C.white, 0.55);
      game.draw.circle(BOB_X, WATER_Y + 40, 20, C.red, 0.5);
    } else if (bob.phase !== 'reel') {
      game.draw.circle(BOB_X, by, 28, C.ink);
      game.draw.circle(BOB_X, by - 6, 22, C.red);
      game.draw.circle(BOB_X, by + 8, 20, C.white);
      if (bob.phase === 'approach') game.draw.circle(BOB_X, WATER_Y, 40 + (bob.t / bob.dur) * 30, C.white, 0.35);
    }
    if (flash > 0) game.draw.circle(BOB_X, WATER_Y, 80 + (0.45 - flash) * 200, C.white, Math.min(0.8, flash * 2));
  }

  function drawBoy(t) {
    var fr = rodKick > 0 ? BOY_B : BOY_A;
    game.draw.sprite(fr, BOY_PAL, 140 + Math.sin(t * 1.3) * 3, H * 0.4 + Math.sin(t * 2.6) * 5, 14, { anchor: 'center' });
    if (flyFish) {
      var k = flyFish.t / 0.7;
      var fx = BOB_X + (180 - BOB_X) * k, fy = WATER_Y - Math.sin(k * Math.PI) * 420 + k * 380;
      game.draw.circle(fx, fy, 70, C.white, 0.35);
      game.draw.sprite(FISH, flyFish.gold ? GOLD_PAL : FISH_PAL, fx, fy, 14, { anchor: 'center' });
    }
  }

  function drawHud() {
    txt(caught + ' / ' + NEEDED, W / 2, 80, 70, C.white);
    game.draw.rect(90, 160, W - 180, 26, C.ink);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(96, 166, (W - 192) * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.red : C.yellow);
    // 親指ゾーン: 魚籠と残りミス
    game.draw.rect(W / 2 - 330, H * 0.83, 660, 170, C.ink, 0.55);
    for (var i = 0; i < NEEDED; i++) {
      var got = i < caught;
      game.draw.sprite(FISH, got ? (i === NEEDED - 1 ? GOLD_PAL : FISH_PAL) : { o: '#3a4a6a', K: '#3a4a6a' }, W / 2 - 240 + i * 160, H * 0.83 + 60, 10, { anchor: 'center' });
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W / 2 - 60 + m * 60, H * 0.83 + 135, 16, m < misses ? C.red : C.white, m < misses ? 1 : 0.5);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (bob === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawRig(t);
      drawBoy(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 74, C.yellow);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.11, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 48, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.94, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawBoy(t);
      game.draw.rect(0, H * 0.34, W, H * 0.3, C.ink, 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 100, ok ? C.good : C.red);
      txt(caught + ' / ' + NEEDED + '  PERFECT ' + perfects, W / 2, H * 0.47, 44, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.53, 50, C.yellow);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.59, 48, C.good);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 38, C.white);
      } else {
        txt('あと' + (NEEDED - caught) + '匹!', W / 2, H * 0.53, 54, C.yellow);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 38, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 42, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { fish: caught, perfect: perfects, miss: misses }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ fish: caught, perfect: perfects, miss: misses }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (flash > 0) flash -= dt;
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.36, { text: 'CLEAR', color: C.good, count: 30 });
        else game.feedback.bad(BOB_X, WATER_Y - 60, { text: timeLeft <= 0 ? 'TIME UP' : 'GAME OVER' });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepBob(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; finished = true; ok = false; hitStop = 0.45; flash = 0.45; }
    }

    drawScene(t);
    drawRig(t);
    drawBoy(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 100, C.yellow);
  });

  function music() {
    game.audio.melody([['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1]], { tempo: 118, wave: 'square', volume: 0.04, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
