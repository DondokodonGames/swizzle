// 126-tempo-tap.js
// テンポタップ — 鈴の拍にだけ手を合わせる。光る蛍は拍を知らない
// 操作: 鈴が鳴る拍に合わせてタップ(蛍の光に釣られない)
// 成功: 3節 通す  失敗: 3回 外す or 15秒
// @mechanic: rhythm
// @theme: insect
// 世界観: 夜の草むら。鈴虫の合唱に拍を合わせる。無関係に光る蛍が惑わせてくる
// variation: フェイント型(拍と無関係に光る蛍が混ざる)
// spice: サドンデス演出(最後の節は1回でも外すと終わり)
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // PIXEL HD: 多色 + 光。光源を1つに決めて陰影を統一する
  var C = {
    night1: '#0c1630', night2: '#132a44', night3: '#1d4038', grass: '#2f6b46', grass2: '#48925c',
    bell: '#ffe6a3', bellHot: '#ffd12e', fly: '#9dffcf', ink: '#050a14', slot: '#4d7192',
    good: '#6bff9a', bad: '#ff4f6d', white: '#ffffff',
  };

  var GAME_TITLE = 'TEMPO TAP';
  var MAX_TIME = 15;
  var BARS = 3;              // 通すべき節
  var BEATS_PER_BAR = 4;
  var MISS_LIMIT = 3;
  var BPM = 120;
  var BEAT = 60 / BPM;
  var HIT_WINDOW = 0.17;
  var CX = W / 2, CY = H * 0.50;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var clock, nextBeat, beatIdx, bars, hitThisBeat, misses, score, combo, totalTime, done;
  var flies, bellPulse, ready, hitStop, feedback, feedbackOk, shake;

  // 鈴虫(2フレーム: 羽を擦る)
  var CRICK_A = [
    '..KK..KK..',
    '.KGGGGGGK.',
    'KGGWGGWGGK',
    'KGGGGGGGGK',
    '.KGGGGGGK.',
    '..K.GG.K..',
  ];
  var CRICK_B = [
    '.KK....KK.',
    '.KGGGGGGK.',
    'KGGWGGWGGK',
    'KGGGGGGGGK',
    '.KGGGGGGK.',
    '..KK..KK..',
  ];
  var CRICK_COL = { K: C.ink, G: C.grass2, W: C.bell };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.12); }

  function meadowBg() {
    // PIXEL HD: パララックス3層 + 上からの月光で統一した陰影
    game.draw.gradient(0, H, [[0, C.night1], [0.42, C.night2], [0.66, C.night3], [1, '#071a12']]);
    game.draw.circle(W * 0.78, H * 0.16, 74, '#f4f7ff', 0.9);
    game.draw.circle(W * 0.78, H * 0.16, 130, '#f4f7ff', 0.12);
    var t = game.time.elapsed;
    for (var far = 0; far < 22; far++) {
      var fx = (far * 71 + t * 6) % (W + 60) - 30;
      game.draw.line(fx, H * 0.60, fx + 8, H * 0.60 - 90, '#1f4a3a', 5);
    }
    for (var mid = 0; mid < 18; mid++) {
      var mx = (mid * 93 + t * 14) % (W + 80) - 40;
      game.draw.line(mx, H * 0.78, mx + 14, H * 0.78 - 150, C.grass, 8);
    }
    for (var nr = 0; nr < 12; nr++) {
      var nx = (nr * 131 + t * 26) % (W + 120) - 60;
      game.draw.line(nx, H + 20, nx + 26, H * 0.80, C.grass2, 14);
    }
  }

  function initGame() {
    clock = 0; nextBeat = 1.2; beatIdx = 0; bars = 0; hitThisBeat = true;
    misses = 0; score = 0; combo = 0; totalTime = 0; done = false;
    flies = []; bellPulse = 0; ready = 0.8; hitStop = 0;
    feedback = 0; feedbackOk = false; shake = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5; shake = 0.5;
      game.fx.flash(C.bad, 0.24);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function sudden() { return bars >= BARS - 1; }

  function onMiss(x, y, label) {
    misses++;
    combo = 0;
    feedback = 0.35; feedbackOk = false;
    hitStop = 0.26; shake = 0.28;
    game.audio.play('se_failure', 0.55);
    game.feedback.bad(x, y, { text: label });
    if (misses >= MISS_LIMIT || sudden()) finish(false);
  }

  function tap(x, y) {
    var d = Math.abs(clock - nextBeat);
    var dPrev = Math.abs(clock - (nextBeat - BEAT));
    var near = Math.min(d, dPrev);
    if (near <= HIT_WINDOW) {
      if (hitThisBeat && dPrev < d) { onMiss(x, y, 'MISS'); return; }   // 同じ拍を二度叩いた
      hitThisBeat = true;
      combo++;
      var perfect = near <= HIT_WINDOW * 0.45;
      var gain = (perfect ? 200 : 100) + Math.min(200, (combo - 1) * 20);
      score += gain;
      bellPulse = 0.28;
      feedback = 0.25; feedbackOk = true;
      game.feedback.good(CX, CY, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.bellHot : C.good });
      game.audio.play('se_success', 0.42);
    } else {
      onMiss(x, y, 'MISS');
    }
  }

  function drawBell(scale, hot) {
    // 拍の予兆: 次の拍が近いほど鈴が膨らむ(telegraph)
    var toBeat = Math.max(0, nextBeat - clock);
    var pre = 1 - Math.min(1, toBeat / BEAT);
    game.draw.circle(CX, CY, 150 + pre * 70, C.bell, 0.10 + pre * 0.16);
    if (hot) game.draw.circle(CX, CY, 210, C.bellHot, 0.30);
    var wob = Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.circle(CX, CY + 118, 92, '#000000', 0.34);
    game.draw.sprite(wob ? CRICK_A : CRICK_B, CRICK_COL, CX, CY, scale, { anchor: 'center' });
  }

  function drawFlies() {
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      var a = Math.max(0, f.life);
      game.draw.circle(f.x, f.y, 52, C.fly, a * 0.22);
      game.draw.circle(f.x, f.y, 20, C.fly, a * 0.9);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    tap(x, y);
  });

  // ── ATTRACT ゴースト実演: 鈴が膨らみ切った拍で手が落ちる(蛍では落ちない) ──
  var demo = { t: 0, gx: CX, gy: H * 0.72, press: false, last: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var phase = demo.t % BEAT;
    demo.press = phase < 0.10;
    demo.gy += ((demo.press ? CY + 200 : H * 0.72) - demo.gy) * Math.min(1, dt * 8);
    var b = Math.floor(demo.t / BEAT);
    if (b !== demo.last && demo.press) {
      demo.last = b;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
    }
    return phase;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      meadowBg();
      var phase = stepDemo(dt);
      var pre = 1 - phase / BEAT;
      game.draw.circle(CX, CY, 150 + pre * 70, C.bell, 0.10 + pre * 0.16);
      var wob0 = Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.circle(CX, CY + 118, 92, '#000000', 0.34);
      game.draw.sprite(wob0 ? CRICK_A : CRICK_B, CRICK_COL, CX, CY, 20, { anchor: 'center' });
      game.draw.circle(W * 0.24, H * 0.36, 20, C.fly, 0.8);
      game.draw.circle(W * 0.78, H * 0.62, 20, C.fly, 0.6);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.bellHot);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.fly);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 38, C.grass2);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      meadowBg();
      if (hitStop > 0) hitStop -= dt;
      if (shake > 0) shake -= dt;
      drawBell(20, resultSuccess);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.74, 92, resultSuccess ? C.good : C.bad);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.82, 56, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.88, 42, C.bellHot);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.94, 52, C.bellHot);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.94, 44, C.white);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        clock += dt;
        if (totalTime >= MAX_TIME) { finish(bars >= BARS); return; }

        // 拍の進行
        if (clock >= nextBeat) {
          if (!hitThisBeat) { onMiss(CX, CY, 'MISS'); if (done) return; }
          game.audio.tone(880, 0.06, { wave: 'square', volume: 0.16 });
          bellPulse = 0.2;
          beatIdx++;
          hitThisBeat = false;
          nextBeat += BEAT;
          if (beatIdx % BEATS_PER_BAR === 0) {
            bars++;
            if (bars >= BARS) { finish(true); return; }
            game.fx.popup(bars + ' / ' + BARS, CX, H * 0.30, { color: C.bellHot, size: 66 });
            game.audio.play('se_milestone', 0.5);
          }
        }

        // フェイント型: 拍と無関係に光る蛍
        if (Math.random() < dt * 2.2) {
          flies.push({ x: 140 + Math.random() * (W - 280), y: H * 0.28 + Math.random() * (H * 0.45), life: 0.8 });
        }
        for (var i = flies.length - 1; i >= 0; i--) {
          flies[i].life -= dt;
          flies[i].y -= 18 * dt;
          if (flies[i].life <= 0) flies.splice(i, 1);
        }
      }
      if (feedback > 0) feedback -= dt;
      if (shake > 0) shake -= dt;
      if (bellPulse > 0) bellPulse -= dt;
    }

    // draw
    meadowBg();
    drawFlies();
    drawBell(20 + bellPulse * 18, bellPulse > 0);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.night1);
    game.draw.rect(60, 40, (W - 120) * frac, 24, sudden() ? C.bad : C.grass2);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 102, 46, C.white);
    txt(bars + ' / ' + BARS, W * 0.15, 160, 44, C.bellHot);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W * 0.85 - m * 54, 154, 18, m < (MISS_LIMIT - misses) ? C.bell : C.night1);
    }
    if (combo >= 3) txt('x' + combo, W / 2, 162, 44, C.good);

    // 拍のメトロノーム(4拍の位置)。消灯側も背景から浮かせて「4枠ある」と分かるようにする
    game.draw.rect(CX - 182, H * 0.70 - 10, 364, 46, C.ink, 0.72);
    for (var b = 0; b < BEATS_PER_BAR; b++) {
      var on = (beatIdx % BEATS_PER_BAR) === b;
      game.draw.rect(CX - 170 + b * 90, H * 0.70, 62, 26, on ? C.bellHot : C.slot);
    }

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 92, C.bellHot);
    if (sudden() && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('あと' + (BARS - bars) + '節', W / 2, H * 0.26, 50, C.bad);

    scanlines();
  });

  game.onStart(function() {
    // PIXEL HD: 拍が明確な夜の草むらのループ(拍はゲーム側が tone で刻む)
    game.audio.melody(
      [['E4', 1], ['G4', 1], ['B4', 1], ['A4', 1], ['G4', 1], ['E4', 1]],
      { tempo: 120, wave: 'triangle', volume: 0.07, loop: true,
        bass: [['E2', 2], ['C3', 2]], bassWave: 'triangle', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
