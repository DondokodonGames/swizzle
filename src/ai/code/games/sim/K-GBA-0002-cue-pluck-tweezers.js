// K-GBA-0002-cue-pluck-tweezers.js
// キューピンセット — 生えてくる一本を、電子音の拍に合わせてピンセットでつまみ抜く
// 操作: 拍に合わせて伸びきった一本が画面中央に来た瞬間タップしてつまみ抜く
// 終わり: 10拍すべて正しいタイミングで抜き切れば成功。拍を外せば失敗
// @mechanic: rhythm
// @theme: pastel_grooming_booth
// 世界観: パステル色の身だしなみブース。生えてくる一本一本を、鳴る電子音の拍にきっちり合わせてつまみ抜く仕事
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けた本数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡い3色+はっきりした差し色2色、丸みのある形
  var C = {
    bg: '#ffe9f2', bg2: '#ffd4e6', skin: '#ffcaa8', skinDark: '#f0a878',
    hair: '#6a5648', good: '#3ad18a', bad: '#ff5b7a', gold: '#ffb400', white: '#fff8fb', ink: '#5a3a4a',
  };

  var GAME_TITLE = 'CUE PLUCK';
  var TOTAL = 10;
  var BEAT = 0.78;
  var WIN = 0.20;
  var CX = W * 0.5, SPOT_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var plucked, done, endWait, finished, ready, hitStop, shake, beatIdx, beatStart, resolvedThis, combo, grow;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FACE = ['.####.', '#.##.#', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.circle(W * (0.15 + i * 0.2), H * 0.12, 36, '#ffffff', 0.4);
    game.draw.sprite(FACE, { '#': C.skin }, CX, H * 0.62, 34, { anchor: 'center' });
  }

  function beatTime(i) { return 0.8 + i * BEAT; }

  function initGame() {
    plucked = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; beatIdx = 0; beatStart = 0.8; resolvedThis = false; combo = 0; grow = 0;
  }

  function failPluck() {
    hitStop = 0.32;
    game.feedback.bad(CX, SPOT_Y, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function successPluck() {
    plucked++; combo++;
    hitStop = 0.10;
    game.feedback.good(CX, SPOT_Y, { text: 'GOOD', color: C.good });
    game.fx.burst(CX, SPOT_Y, { color: C.gold, count: 14, speed: 300 });
    game.audio.play('se_good', 0.35);
    if (plucked === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, SPOT_Y - 200, { color: C.gold, size: 40 });
    if (plucked >= TOTAL) { ok = true; finished = true; finish(); return; }
    beatIdx++;
    beatStart = beatTime(beatIdx);
    resolvedThis = false;
  }

  function tryTap() {
    if (ready > 0 || done || finished || resolvedThis) return;
    var t = game.time.elapsed - beatStart;
    if (Math.abs(t) <= WIN) { resolvedThis = true; successPluck(); }
    else { resolvedThis = true; failPluck(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawHair(g) {
    var len = Math.min(1, g) * 130;
    game.draw.line(CX, SPOT_Y + 20, CX + 6, SPOT_Y + 20 - len, C.hair, 9);
    if (g > 0.55 && g < 1) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(CX, SPOT_Y - len + 20, 24, C.gold, 0.4);
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, idx: 0, start: 0.8 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (BEAT * 3 + 0.8);
    if (cyc < dt || demo.t <= dt) { demo.idx = 0; demo.start = 0.8; demo.pressedThis = false; }
    var bt = 0.8 + demo.idx * BEAT;
    var t = cyc - bt;
    grow = Math.max(0, Math.min(1, (cyc - (bt - BEAT)) / BEAT));
    if (t > -0.06 && t < 0.06 && !demo.pressedThis) {
      demo.pressedThis = true;
      demo.gx = CX; demo.gy = SPOT_Y; demo.press = true;
      game.feedback.good(CX, SPOT_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
    } else if (t < -0.06) {
      demo.press = false;
      demo.gx += (CX - demo.gx) * Math.min(1, dt * 4);
      demo.gy += (SPOT_Y - demo.gy) * Math.min(1, dt * 4);
    }
    if (t > 0.2) { demo.idx = (demo.idx + 1) % 3; demo.pressedThis = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawHair(grow);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(plucked + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - plucked) + '本!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(plucked, { plucked: plucked, total: TOTAL });
        else game.end.failure({ plucked: plucked, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var t = game.time.elapsed - beatStart;
      grow = Math.max(0, Math.min(1, (game.time.elapsed - (beatStart - BEAT)) / BEAT));
      if (t > WIN && !resolvedThis) { resolvedThis = true; failPluck(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawHair(grow);

    txt(plucked + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#ffffff', 0.6);
    game.draw.rect(60, 150, (W - 120) * (plucked / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
