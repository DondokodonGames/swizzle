// GH-PS-0035-reel-stop.js
// リールストップ — 回る3つのリールを、狙った絵で順に止める
// 操作: 左から順に、狙った絵が窓に来た瞬間にタップして止める
// 終わり: 3つとも狙った絵で止まれば成功。1つでも外せば失敗。何個当たったかが残る
// @mechanic: timing_window
// @theme: lucky_panel
// 世界観: 3つの窓が縦に回り続ける。狙う絵は上に常に示される。順番に、絵が来た瞬間だけ止められる
// 残るもの: 正誤(CLEAR/GAME OVER) + 当たった数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var C = {
    bg1: '#ffd85a', bg2: '#ff9a3a', panel: '#4a3ac8', panelDark: '#2a1e88', ink: '#0a0a10',
    good: '#4dcf8a', bad: '#ff4d5e', gold: '#ffe040', white: '#ffffff',
  };

  var GAME_TITLE = 'REEL STOP';
  var REELS = 3;
  var SYM_SET = [0, 1, 2, 3, 4];
  var TARGET = 0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, correctN = 0;

  var reelPos, reelSpeed, stopped, curReel, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function thickOutline(x, y, w, h, fill) {
    game.draw.rect(x - 8, y - 8, w + 16, h + 16, C.ink);
    game.draw.rect(x, y, w, h, fill);
  }

  var SYM_SHAPES = [
    ['.#.', '###', '.#.'],   // 0: 星(狙う絵)
    ['###', '#.#', '###'],
    ['#.#', '.#.', '#.#'],
    ['##.', '.##', '##.'],
    ['.#.', '.#.', '###'],
  ];
  var SYM_COL = [C.gold, '#ff8a3a', '#4dcf8a', '#3a9adf', '#df4dcf'];

  var REEL_X = [W * 0.5 - 220, W * 0.5, W * 0.5 + 220];
  var REEL_Y = H * 0.48, REEL_H = 260, ITEM_H = 130;

  var SPARKS_TOP = (function() {
    var arr = [];
    for (var i = 0; i < 5; i++) arr.push({ x: W * (0.14 + i * 0.18), y: H * (0.20 + (i % 2) * 0.02) });
    return arr;
  })();
  var SPARKS_BOT = (function() {
    var arr = [];
    for (var i = 0; i < 6; i++) arr.push({ x: W * (0.12 + i * 0.15), y: H * (0.68 + (i % 3) * 0.08) });
    return arr;
  })();
  var STAR = ['..#..', '..#..', '#####', '..#..', '..#..'];

  function panelBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var s, o;
    for (s = 0; s < SPARKS_TOP.length; s++) { o = SPARKS_TOP[s]; game.draw.circle(o.x, o.y, 24, C.ink); game.draw.sprite(STAR, { '#': C.gold }, o.x, o.y, 5, { anchor: 'center' }); }
    for (s = 0; s < SPARKS_BOT.length; s++) { o = SPARKS_BOT[s]; game.draw.circle(o.x, o.y, 24, C.ink); game.draw.sprite(STAR, { '#': C.white }, o.x, o.y, 5, { anchor: 'center' }); }
    thickOutline(W * 0.5 - 340, REEL_Y - REEL_H / 2 - 20, 680, REEL_H + 40, C.panel);
  }

  function drawReel(i) {
    var x = REEL_X[i];
    for (var k = -1; k <= 1; k++) {
      var idx = ((Math.floor(reelPos[i]) + k) % SYM_SET.length + SYM_SET.length) % SYM_SET.length;
      var frac = reelPos[i] - Math.floor(reelPos[i]);
      var y = REEL_Y + k * ITEM_H - frac * ITEM_H;
      if (Math.abs(y - REEL_Y) > REEL_H / 2 + 20) continue;
      game.draw.circle(x, y, 62, C.ink);
      game.draw.circle(x, y, 56, SYM_COL[idx]);
      game.draw.sprite(SYM_SHAPES[idx], { '#': '#ffffff' }, x, y, 12, { anchor: 'center' });
    }
    // 窓の枠(狙う位置)
    game.draw.rect(x - 70, REEL_Y - 66, 140, 132, C.ink, 0.0);
    game.draw.line(x - 70, REEL_Y - 66, x + 70, REEL_Y - 66, i === curReel ? C.gold : C.white, i === curReel ? 6 : 3);
    game.draw.line(x - 70, REEL_Y + 66, x + 70, REEL_Y + 66, i === curReel ? C.gold : C.white, i === curReel ? 6 : 3);
    if (stopped[i] !== null) game.draw.circle(x, REEL_Y, 76, stopped[i] === TARGET ? C.good : C.bad, 0.3);
  }

  function initGame() {
    reelPos = [0, 0, 0]; reelSpeed = [5.5, 6.2, 6.9];
    stopped = [null, null, null]; curReel = 0; correctN = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function stopCurrent() {
    if (done || ready > 0 || finished || curReel >= REELS) return;
    var idx = ((Math.round(reelPos[curReel])) % SYM_SET.length + SYM_SET.length) % SYM_SET.length;
    stopped[curReel] = idx;
    hitStop = 0.08;
    if (idx === TARGET) {
      correctN++;
      game.feedback.good(REEL_X[curReel], REEL_Y, { text: 'HIT', color: C.good });
      game.fx.burst(REEL_X[curReel], REEL_Y, { color: C.gold, count: 12, speed: 320 });
      game.audio.play('se_success', 0.4);
    } else {
      game.feedback.bad(REEL_X[curReel], REEL_Y, { text: 'MISS' });
      shake = 0.12;
      game.audio.play('se_bad', 0.35);
    }
    curReel++;
    if (curReel >= REELS) {
      ok = correctN >= REELS; finished = true; finish();
    } else {
      game.fx.popup(curReel + ' / ' + REELS, W / 2, H * 0.20, { color: C.gold, size: 44 });
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    stopCurrent();
  });

  // ── ATTRACT ゴースト実演: 狙った絵が来た瞬間だけ止める ──
  var demoT = 0, demoReel = [0, 0, 0], demoStopped = [null, null, null], demoCur = 0;
  function stepDemo(dt) {
    demoT += dt;
    for (var i = 0; i < 3; i++) if (demoStopped[i] === null) demoReel[i] += (5.5 + i * 0.7) * dt;
    var cyc = demoT % 4.5;
    if (cyc < dt || demo.t <= dt) { demoReel = [0, 0, 0]; demoStopped = [null, null, null]; demoCur = 0; }
    var stepAt = [1.3, 2.6, 3.9];
    if (demoCur < 3 && cyc > stepAt[demoCur]) {
      var idx = Math.round(demoReel[demoCur]) % SYM_SET.length;
      demoStopped[demoCur] = idx;
      game.feedback.good(REEL_X[demoCur], REEL_Y, { text: 'HIT', color: C.good });
      game.fx.burst(REEL_X[demoCur], REEL_Y, { color: C.gold, count: 10, speed: 300 });
      demoCur++;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (reelPos === undefined) initGame();
      panelBg();
      stepDemo(dt);
      reelPos = demoReel; stopped = demoStopped; curReel = demoCur;
      for (var i = 0; i < REELS; i++) drawReel(i);
      game.draw.hand(REEL_X[Math.min(2, demoCur)], H * 0.68, { press: true, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 54, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 26, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.ink);
        txt('TAP TO START', W / 2, H * 0.95, 36, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      panelBg();
      for (var i2 = 0; i2 < REELS; i2++) drawReel(i2);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 58, ok ? C.good : C.bad);
      txt(correctN + ' / ' + REELS, W / 2, H * 0.14, 40, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 32, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ correct: correctN });
        else game.end.failure({ correct: correctN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      for (var r = 0; r < REELS; r++) if (stopped[r] === null) reelPos[r] += reelSpeed[r] * dt;
    }
    if (shake > 0) shake -= dt;

    panelBg();
    for (var i3 = 0; i3 < REELS; i3++) drawReel(i3);

    txt(curReel + ' / ' + REELS, W / 2, H * 0.16, 36, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 74, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
