// K-DS-0003-beat-bounce-keeper.js
// ビートバウンス — 街角のパフォーマー。跳ねる玉を拍のタイミングでパドルに合わせて弾き続ける
// 操作: 曲の拍に合わせてタップし、落ちてくる玉をパドルで弾き続ける
// 終わり: 規定拍数(16拍)を弾き続ければ成功。4回外せば玉を落として失敗
// @mechanic: rhythm
// @theme: street_ball_performer
// 世界観: 夜の街角で玉乗りパフォーマンスをする大道芸人。曲の拍に合わせてパドルで玉を弾き続け、観客を沸かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き続けた拍数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色ライン
  var C = {
    bg: '#0a0018', bg2: '#1a0030', neon1: '#ff2e88', neon2: '#00e5ff',
    ball: '#ffe600', ballGlow: '#7a6300', paddle: '#00e5ff',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'BOUNCE BEAT';
  var TOTAL = 16;
  var MISS_LIMIT = 4;
  var BPM = 100;
  var INTERVAL = 60 / BPM;
  var WIN_HALF = 0.16;
  var CX = W * 0.5, PADDLE_Y = H * 0.58;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['..##..', '.####.', '..##..', '#.##.#', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) game.draw.line(0, H * (0.2 + i * 0.16), W, H * (0.2 + i * 0.16), C.neon1, 2);
    for (var j = 0; j < 4; j++) game.draw.line(W * (0.2 + j * 0.16), 0, W * (0.2 + j * 0.16), H, C.neon2, 2);
  }

  var clock, beatIdx, resolved, misses, bounceHeight, lastHitGood, done, endWait, finished, ready, hitStop, shake, flashT, flashOk;

  function initGame() {
    clock = 0; beatIdx = 0; resolved = false; misses = 0;
    bounceHeight = 0; lastHitGood = true;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashT = 0; flashOk = true;
  }

  function beatTime(i) { return i * INTERVAL + 0.4; }
  function beatOpen() {
    var bt = beatTime(beatIdx);
    return clock >= bt - WIN_HALF && clock <= bt + WIN_HALF;
  }

  function onBounceInput() {
    if (ready > 0 || done || finished || hitStop > 0) return;
    if (beatIdx >= TOTAL) return;
    if (beatOpen() && !resolved) {
      resolved = true;
      lastHitGood = true;
      hitStop = 0.08;
      flashT = 0.15; flashOk = true;
      bounceHeight = 1;
      game.feedback.good(CX, PADDLE_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_tap', 0.15);
      if (beatIdx + 1 === Math.floor(TOTAL / 2)) { game.fx.popup((beatIdx + 1) + ' / ' + TOTAL, CX, PADDLE_Y - 260, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
    } else {
      resolved = true;
      lastHitGood = false;
      misses++;
      hitStop = 0.16;
      shake = 0.12;
      flashT = 0.2; flashOk = false;
      bounceHeight = 0.35;
      game.feedback.bad(CX, PADDLE_Y, { text: 'MISS' });
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onBounceInput();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.1;
  }

  function stepRound(dt) {
    clock += dt;
    if (beatIdx < TOTAL) {
      var bt = beatTime(beatIdx);
      if (clock > bt + WIN_HALF && !resolved) {
        resolved = true; lastHitGood = false; misses++;
        hitStop = Math.max(hitStop, 0.16); shake = 0.12;
        flashT = 0.2; flashOk = false; bounceHeight = 0.35;
        game.feedback.bad(CX, PADDLE_Y, { text: 'MISS' });
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
      }
      if (clock > bt + WIN_HALF) { beatIdx++; resolved = false; }
    }
    if (beatIdx >= TOTAL && !finished) { ok = true; finished = true; finish(); }
    bounceHeight *= Math.pow(0.02, dt);
  }

  var demo = { t: 0, gx: CX, gy: PADDLE_Y - 40, press: false, clock: 0, idx: 0, resolved: false, bh: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.clock = 0; demo.idx = 0; demo.resolved = false; }
    demo.clock += dt;
    demo.press = false;
    var bt = demo.idx * INTERVAL + 0.4;
    if (demo.clock >= bt && !demo.resolved) {
      demo.resolved = true; demo.press = true; demo.bh = 1;
      game.feedback.good(CX, PADDLE_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_tap', 0.08);
    }
    if (demo.clock > bt + WIN_HALF) { demo.idx++; demo.resolved = false; }
    demo.bh *= Math.pow(0.02, dt);
    bounceHeight = demo.bh;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var by = PADDLE_Y - 220 * demo.bh;
      game.draw.circle(CX, by, 34, C.ball);
      game.draw.circle(CX, by, 18, C.ballGlow, 0.4);
      game.draw.sprite(PERFORMER, { '#': C.paddle }, CX, PADDLE_Y + 60, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(PERFORMER, { '#': C.paddle }, CX, PADDLE_Y + 60, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.min(beatIdx, TOTAL) + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - beatIdx <= 3) txt('あと' + Math.max(0, TOTAL - beatIdx) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(beatIdx, { beats: beatIdx, total: TOTAL, misses: misses });
        else game.end.failure({ beats: beatIdx, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    var by2 = PADDLE_Y - 220 * bounceHeight;
    if (flashT > 0) game.draw.circle(CX, by2, 50, flashOk ? C.good : C.bad, 0.3);
    game.draw.circle(CX, by2, 34, C.ball);
    game.draw.circle(CX, by2, 18, C.ballGlow, 0.4);
    game.draw.sprite(PERFORMER, { '#': C.paddle }, CX, PADDLE_Y + 60, 16, { anchor: 'center' });

    txt(Math.min(beatIdx, TOTAL) + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (Math.min(beatIdx, TOTAL) / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 30, 190, 9, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 0.5]], { tempo: BPM, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
