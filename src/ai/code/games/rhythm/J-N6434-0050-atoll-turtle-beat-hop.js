// J-N6434-0050-atoll-turtle-beat-hop.js
// 環礁の亀の背わたり — うねりの拍に合わせて浮き上がる大海亀の甲羅へ跳び移り、泡が立つ拍(潜る亀)だけは跳ばずに待つ
// 操作: 拍に合わせてタップすると次の亀へ跳ぶ。泡が立った拍は次の亀が潜っているので触らずに見送る
// 終わり: 10回跳んで沖の小島に着けばCLEAR。3回海に落ちる/時間切れでGAME OVER
// @mechanic: rhythm
// @theme: atoll_turtle_beat_hop
// 世界観: 南の環礁の潮祭りの夜、灯籠運びの少年が、うねりに合わせて浮き沈みする大海亀の甲羅を拍どおりに跳び渡り、沖の小島の祭壇へ灯を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳んだ回数とPERFECTの数のスコア
// スタイル: 90s LOW POLY
var STYLE = { bg: ['#1a2a4a', '#3f6f8f'], main: ['#2f8f9f', '#1f5f7a', '#7fc8c0'], accent: ['#ffcf5a', '#ff6a4a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    sky1: '#1a2a4a', sky2: '#3f6f8f', sea: '#2f8f9f', seaD: '#1f5f7a', seaL: '#7fc8c0', fog: '#9fc8d0',
    shell: '#6f8f3a', shellD: '#4a6a24', skin: '#c8b27a', gold: '#ffcf5a', red: '#ff6a4a', ink: '#0e1628', white: '#ffffff', sand: '#e8d8a0',
  };

  var GAME_TITLE = 'TURTLE BEAT';
  var TIME_LIMIT = 14;
  var NEEDED = 10;
  var LIVES = 3;
  var BEAT = 0.6;
  var WIN = 0.15, PERF = 0.06;
  var SPACING = 330;
  var SEA_Y = H * 0.56;
  var PX = W * 0.28;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var TURTLE = [
    '....ssssss....',
    '..ssSsSsSsss..',
    '.sSsSsSsSsSss.',
    'kssssssssssssk',
    '.kk........kk.',
  ];
  var HEAD = ['.kk', 'kkk', 'kk.'];
  var BOY_A = ['..hh..', '.hhhh.', '.fkkf.', '..ff..', 'lrrrr.', 'lrrrr.', '.r..r.'];
  var BOY_B = ['..hh..', '.hhhh.', '.fkkf.', '..ff..', 'lrrrrl', '.rrrr.', 'r....r'];
  var LANTERN = ['.g.', 'yyy', 'yoy', 'yyy'];
  var ISLE = ['.....tt.....', '....tttt....', '.....bb.....', '...ssbbss...', 'ssssssssssss'];

  var pattern, beatIdx, songT, cur, hopT, lives, hops, perfects, missedJ, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait;
  var camX, splash, tappedBeat, nextMs;

  function makePattern() {
    pattern = ['C', 'C'];
    var js = 0;
    while (pattern.length < 40) {
      var prev = pattern[pattern.length - 1];
      if (js >= 2 && prev === 'J' && game.random(0, 1) < 0.24) pattern.push('R');
      else { pattern.push('J'); js++; }
    }
  }

  function initGame() {
    makePattern();
    beatIdx = 0; songT = -0.3; cur = 0; hopT = 0; lives = LIVES; hops = 0; perfects = 0; missedJ = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null; finished = false; ok = false; endWait = 0;
    camX = cur * SPACING - PX; splash = 0; tappedBeat = -1; nextMs = 5;
    stepSong.lastChecked = -1; lastSoundBeat = -1; lastPickup = -1;
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function beatTime(i) { return i * BEAT; }

  // 拍ごとの音: 通常拍は波の打音、次がJなら半拍前に上昇音、Rなら泡の低音(音が先生)
  var lastSoundBeat = -1, lastPickup = -1;
  function audioStep() {
    var b = Math.floor(songT / BEAT + 1e-6);
    if (b >= 0 && b !== lastSoundBeat) {
      lastSoundBeat = b;
      var kind = pattern[b] || 'J';
      game.audio.tone(kind === 'R' ? 'C3' : 'G3', 0.12, { wave: 'triangle', volume: 0.12 });
      if (kind === 'J') game.audio.tone(b % 2 ? 'E5' : 'G5', 0.1, { wave: 'square', volume: 0.05 });
    }
    var half = Math.floor((songT + BEAT * 0.5) / BEAT + 1e-6);
    if (half >= 0 && half !== lastPickup && songT > beatTime(half) - BEAT * 0.5) {
      lastPickup = half;
      var nk = pattern[half] || 'J';
      if (nk === 'J' && half >= 2) game.audio.tone('C5', 0.08, { wave: 'sine', volume: 0.06, slide: 300 });
      if (nk === 'R') game.audio.tone('A2', 0.2, { wave: 'sine', volume: 0.1, slide: -40 });
    }
  }

  function fall(demoMode, why) {
    splash = 0.6; missedJ = 0;
    if (demoMode) { game.feedback.bad(PX, SEA_Y - 100, { text: 'MISS', shake: 4 }); return; }
    lives--;
    game.audio.play('se_break', 0.35);
    if (lives <= 0) {
      focus = { splash: true }; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
    } else {
      game.feedback.bad(PX, SEA_Y - 100, { text: why || 'MISS' });
    }
  }

  function tapBeat(demoMode) {
    // 一番近い拍を判定
    var b = Math.round(songT / BEAT);
    var off = songT - beatTime(b);
    var kind = pattern[b] || 'J';
    if (b < 2 || kind === 'C') { game.audio.play('se_tap', 0.1); return; }
    if (Math.abs(off) > WIN || tappedBeat === b) { fall(demoMode, 'MISS'); return; }
    if (kind === 'R') { tappedBeat = b; fall(demoMode, 'MISS'); return; }
    tappedBeat = b;
    cur++; hops++; hopT = 0.25; missedJ = 0;
    var perfect = Math.abs(off) <= PERF;
    if (perfect) perfects++;
    game.audio.play('se_jump', 0.3);
    game.feedback.good(PX + SPACING, SEA_Y - 170, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.seaL, count: perfect ? 14 : 8, volume: 0.25 });
    if (!demoMode && hops >= nextMs && hops < NEEDED) { nextMs += 5; game.audio.play('se_milestone', 0.4); game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 64 }); }
    if (hops >= NEEDED) {
      if (demoMode) { cur = 0; hops = 0; return; }
      focus = { isle: true }; hitStop = 0.45; pendingEnd = 'clear'; finished = true;
    }
  }

  function stepSong(dt, demoMode) {
    songT += dt;
    if (!demoMode) audioStep();
    if (hopT > 0) hopT -= dt;
    if (splash > 0) splash -= dt;
    // J拍を跳ばずに見送った数(3つで今の亀が潜って落ちる)
    var b = Math.floor((songT - WIN) / BEAT);
    if (b >= 2 && b !== stepSong.lastChecked) {
      stepSong.lastChecked = b;
      if ((pattern[b] || 'J') === 'J' && tappedBeat !== b) {
        missedJ++;
        if (missedJ >= 3) fall(demoMode, 'MISS');
      }
    }
    while (pattern.length < b + 12) pattern.push(game.random(0, 1) < 0.2 ? 'R' : 'J');
    camX += (cur * SPACING - PX - camX) * Math.min(1, dt * 10);
  }
  stepSong.lastChecked = -1;

  function nextBeatInfo() {
    var b = Math.ceil((songT - WIN) / BEAT);
    return { b: b, kind: pattern[b] || 'J', dt: beatTime(b) - songT };
  }

  function drawBg(pulse) {
    game.draw.gradient(0, SEA_Y, [[0, C.sky1], [0.8, C.sky2], [1, C.fog]]);
    game.draw.rect(0, 0, W, H, C.fog, pulse);
    // 低ポリの遠い島影(面ベタ + 輪郭線)
    for (var m = 0; m < 3; m++) {
      var mx = ((m * 420 - camX * 0.2) % (W + 400) + W + 400) % (W + 400) - 200;
      for (var s = 0; s < 60; s += 6) game.draw.rect(mx - (60 - s) * 2, SEA_Y - 40 - s, (60 - s) * 4, 6, C.seaD, 0.6);
      game.draw.line(mx - 120, SEA_Y - 40, mx, SEA_Y - 100, C.seaL, 3);
      game.draw.line(mx, SEA_Y - 100, mx + 120, SEA_Y - 40, C.seaL, 3);
    }
    game.draw.gradient(SEA_Y, H, [[0, C.sea], [1, C.seaD]]);
    // うねり: 拍に合わせて上下する多角形の波(頂点ジッター)
    var beatPh = songT !== undefined ? (songT / BEAT) * Math.PI * 2 : game.time.elapsed * 6;
    for (var r = 0; r < 7; r++) {
      var y = SEA_Y + 20 + r * 90;
      var prevX = 0, prevY = y;
      for (var x = 0; x <= W; x += 120) {
        var jitter = ((x * 13 + r * 7) % 11) - 5;
        var wy = y + Math.sin(beatPh * 0.5 + x * 0.01 + r) * (14 + r * 2) + jitter;
        game.draw.line(prevX, prevY, x, wy, r % 2 ? C.seaL : C.fog, 3);
        prevX = x; prevY = wy;
      }
    }
  }

  function turtleRise(i) {
    if (i <= cur) return 1;
    if (i > cur + 1) return 0.1;
    var nb = nextBeatInfo();
    if (nb.kind !== 'J' || nb.b < 2) return 0.15;
    var d = nb.dt;
    return Math.max(0.15, Math.min(1, 1 - Math.max(0, d) / (BEAT * 0.8)));
  }

  function drawTurtles() {
    var nb = nextBeatInfo();
    var first = Math.max(0, cur - 1);
    for (var i = first; i < cur + 4; i++) {
      var x = i * SPACING - camX;
      if (x < -200 || x > W + 200) continue;
      var rise = turtleRise(i);
      var bob = Math.sin(game.time.elapsed * 3 + i) * 6;
      var y = SEA_Y + 60 - rise * 60 + bob;
      if (i === cur + 1 && nb.kind === 'R' && nb.b >= 2) {
        // 泡の予告 (この拍は潜っている)
        var bl = Math.floor(game.time.elapsed * 12) % 2 === 0;
        for (var q = 0; q < 5; q++) game.draw.circle(x - 80 + q * 40, SEA_Y + 10 - ((game.time.elapsed * 120 + q * 30) % 80), 12, C.white, bl ? 0.9 : 0.5);
        game.draw.circle(x, SEA_Y + 60, 30, C.red, bl ? 0.6 : 0.2);
      }
      var alpha = rise > 0.5 ? 1 : 0.45;
      if (i === cur + 1 && rise > 0.7) game.draw.circle(x, y - 10, 150, C.white, 0.15);
      game.draw.sprite(HEAD, { k: C.skin }, x + 120, y + 6, 14, { anchor: 'center', alpha: alpha });
      game.draw.sprite(TURTLE, { s: C.shell, S: C.shellD, k: C.skin }, x, y, 18, { anchor: 'center', alpha: alpha });
      game.draw.rect(x - 150, SEA_Y + 50, 300, 16, C.sea, 0.7);
    }
    // ゴールの小島
    var ix = (NEEDED) * SPACING - camX;
    var hl = focus && focus.isle;
    if (hl) game.draw.circle(ix, SEA_Y - 60, 200, C.white, 0.4);
    game.draw.sprite(ISLE, { t: '#3f8f4a', b: '#8a5a3a', s: C.sand }, ix + 60, SEA_Y - 20, 22, { anchor: 'center' });
    game.draw.circle(ix + 60, SEA_Y - 130, 20, C.gold, 0.6 + 0.4 * Math.sin(game.time.elapsed * 5));
  }

  function drawBoy(pose) {
    var k = hopT > 0 ? 1 - hopT / 0.25 : 1;
    var x = (cur - (hopT > 0 ? hopT / 0.25 : 0)) * SPACING - camX;
    var hop = hopT > 0 ? Math.sin(k * Math.PI) * 160 : 0;
    var bob = Math.sin(game.time.elapsed * 4) * 5;
    var y = SEA_Y - 60 - hop + bob;
    if (splash > 0 || pose === 'down') {
      var hl = focus && focus.splash;
      game.draw.circle(x, SEA_Y + 20, 90 + (hl ? 40 : 0), C.white, 0.7);
      game.draw.sprite(BOY_A, { h: C.ink, f: '#e8b890', k: C.ink, r: C.red, l: C.gold }, x, SEA_Y + 10, 14, { anchor: 'center', flipY: true });
      return;
    }
    var jump = pose === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 7)) * 60 : 0;
    game.draw.sprite(hopT > 0 ? BOY_B : BOY_A, { h: C.ink, f: '#e8b890', k: C.ink, r: C.red, l: C.gold }, x, y + jump - 40, 14, { anchor: 'center' });
    game.draw.sprite(LANTERN, { g: C.ink, y: C.gold, o: C.red }, x - 50, y + jump - 50 + Math.sin(game.time.elapsed * 6) * 6, 10, { anchor: 'center' });
  }

  function drawBeatRing(active) {
    // 親指ゾーン: 拍が近づくと縮むリング
    var cx = W / 2, cy = H * 0.84;
    var nb = nextBeatInfo();
    var k = Math.max(0, Math.min(1, nb.dt / BEAT));
    var col = nb.kind === 'R' ? C.red : C.gold;
    game.draw.circle(cx, cy, 120, C.ink, 0.35);
    game.draw.circle(cx, cy, 100, active ? C.seaL : C.seaD, 0.9);
    if (active && nb.b >= 2) game.draw.circle(cx, cy, 100 + k * 120, col, 0.25);
    if (nb.kind === 'R' && nb.b >= 2) {
      game.draw.line(cx - 50, cy - 50, cx + 50, cy + 50, C.red, 16);
      game.draw.line(cx + 50, cy - 50, cx - 50, cy + 50, C.red, 16);
    } else {
      game.draw.sprite(TURTLE, { s: C.shell, S: C.shellD, k: C.skin }, cx, cy, 9, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.1, C.ink, 0.6);
    for (var i = 0; i < NEEDED; i++) game.draw.circle(W * 0.07 + i * 56, H * 0.045, 18, i < hops ? C.gold : C.seaD);
    for (var l = 0; l < LIVES; l++) game.draw.sprite(LANTERN, { g: C.ink, y: l < lives ? C.gold : C.seaD, o: l < lives ? C.red : C.seaD }, W * 0.7 + l * 60, H * 0.045, 10, { anchor: 'center' });
    txt(hops + '/' + NEEDED, W * 0.9, H * 0.045, 46, C.white);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(50, H * 0.08, W - 100, 16, C.seaD);
    game.draw.rect(50, H * 0.08, (W - 100) * frac, 16, low ? C.red : C.seaL);
  }

  // ── ATTRACTデモ: J拍ぴったりに跳ぶ。1度だけ泡の拍でも跳んで落ちて見せる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, slip: false, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.2;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; songT = 0; demo.slip = false; }
    var prevT = songT;
    stepSong(dt, true);
    var b = Math.round(songT / BEAT);
    var crossed = prevT < beatTime(b) && songT >= beatTime(b);
    if (crossed && b >= 2) {
      var kind = pattern[b] || 'J';
      if (kind === 'J' || (kind === 'R' && !demo.slip && cyc > 3)) {
        if (kind === 'R') demo.slip = true;
        demo.pressT = 0.12;
        tapBeat(true);
      }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    demo.gx = W / 2 + 20; demo.gy = H * 0.84 + (demo.press ? 10 : -20);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame();
      game.audio.stopBgm();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; startMelody(); return; }
    if (state !== S.PLAYING || finished) return;
    if (ready > 0) { game.audio.play('se_tap', 0.08); return; }
    tapBeat(false);
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(W / 2, SEA_Y - 200, { text: 'CLEAR', color: C.gold, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(PX, SEA_Y - 150, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  function scoreNow() { return hops * 100 + perfects * 50; }

  game.onUpdate(function(dt) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.4);

    if (state === S.ATTRACT) {
      if (pattern === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawTurtles();
      drawBoy('');
      drawBeatRing(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.ink, 0.55);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBg(pulse);
      drawTurtles();
      drawBoy(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.3, { color: C.gold, count: 4 });
      game.draw.rect(0, H * 0.66, W, H * 0.24, C.ink, 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.7, 100, ok ? C.gold : C.red);
      txt('SCORE ' + scoreNow(), W / 2, H * 0.77, 56, C.white);
      if (ok && scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.83, 48, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.83, 42, C.white);
      if (!ok) txt('あと' + Math.max(1, NEEDED - hops) + '回!', W / 2, H * 0.875, 44, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(scoreNow(), { hops: hops, perfects: perfects });
        else game.end.failure({ hops: hops, perfects: perfects });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepSong(dt, false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = null;
        game.fx.popup('TIME UP', W / 2, H * 0.3, { color: C.red, size: 80 });
      }
    }

    drawBg(pulse);
    drawTurtles();
    drawBoy('');
    drawBeatRing(!finished && ready <= 0);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, C.gold);
  });

  function startMelody() {
    game.audio.melody([
      ['G4', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5],
      ['A4', 1], ['G4', 1], ['E4', 1], ['G4', 1],
    ], { tempo: 100, wave: 'triangle', volume: 0.07, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
  }

  game.onStart(function() {
    startMelody();
    state = S.ATTRACT;
    initGame();
  });
})(game);
