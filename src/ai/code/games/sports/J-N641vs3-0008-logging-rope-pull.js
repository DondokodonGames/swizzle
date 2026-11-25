// J-N641vs3-0008-logging-rope-pull.js
// 山林綱引き対決 — 左右の足場を交互に踏み込みながら丸太の綱を引き合う
// 操作: 画面左右を交互にタップして体重をかけ、綱の目印を自陣側へ引き寄せる
// 終わり: 制限時間内に目印を自陣ラインまで引き切れば成功。逆に引きずり込まれる/時間切れなら失敗
// @mechanic: alternate_tap
// @theme: logging_camp_rope_pull
// 世界観: 山あいの木こり小屋の力自慢が、丸太を束ねた太綱の両端を握り、左右交互の踏み込みで相手を自陣へ引きずり込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き寄せた綱の位置
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、差し色1色
  var C = {
    bg: '#1c2418', bg2: '#111a0e', ground: '#3a4a28', groundDark: '#26331a',
    rope: '#c8a05a', ropeDark: '#8a6a34', mark: '#ff9f1c',
    playerC: '#e8683a', rivalC: '#3a7ee8', good: '#7cd94a', badc: '#ff4d5e',
    gold: '#ffd400', ink: '#f0f6e0',
  };

  var GAME_TITLE = 'ROPE PULL';
  var TIME_LIMIT = 11;
  var ROPE_MIN = -1, ROPE_MAX = 1; // -1 = rival side win, 1 = player side win
  var WIN_AT = 0.92, LOSE_AT = -0.92;
  var STEP = 0.09;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#08100a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER_SPR = ['.##.', '####', '.#..', '.#.#'];
  var RIVAL_SPR = ['.##.', '####', '..#.', '#.#.'];

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 8; i++) {
      game.draw.rect(0, H * 0.55 + i * 26, W, 26, i % 2 === 0 ? C.ground : C.groundDark, 0.6);
    }
    var pulse = 0.03 + 0.03 * Math.sin(t * 1.4);
    game.draw.rect(0, 0, W, H, C.mark, pulse * 0.3);
  }

  function drawScene(pos, lean) {
    var midY = H * 0.58;
    var midX = W * 0.5 + pos * (W * 0.28);
    game.draw.line(W * 0.08, midY, W * 0.92, midY, C.rope, 20);
    game.draw.circle(midX, midY, 22, C.mark);
    game.draw.line(W * 0.5 - 60, midY - 40, W * 0.5 - 60, midY + 40, C.groundDark, 6);
    game.draw.line(W * 0.5 + 60, midY - 40, W * 0.5 + 60, midY + 40, C.groundDark, 6);
    game.draw.sprite(PLAYER_SPR, { '#': C.playerC }, W * 0.16 - lean * 10, midY - 40, 34, { anchor: 'center' });
    game.draw.sprite(RIVAL_SPR, { '#': C.rivalC }, W * 0.84 + lean * 10, midY - 40, 34, { anchor: 'center' });
  }

  var pos, lastSide, timeLeft, milestoneCalled, lean;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    pos = 0; lastSide = null; timeLeft = TIME_LIMIT; milestoneCalled = false; lean = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function stepPull(side, x, y) {
    if (finished || ready > 0) return;
    if (side === lastSide) {
      // 同じ側の連打はNG判定(交互を要求)
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.15);
      return;
    }
    lastSide = side;
    pos += STEP;
    lean = side === 'left' ? -1 : 1;
    game.feedback.good(x, y, { text: '', color: C.good, count: 4 });
    game.audio.play('se_tap', 0.2);
    if (!milestoneCalled && pos >= 0.4) {
      milestoneCalled = true;
      game.fx.popup('NICE', W * 0.5, H * 0.38, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (pos >= WIN_AT) { pos = WIN_AT; winRun(); }
  }

  function winRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.2;
    game.fx.burst(W * 0.5 + pos * (W * 0.28), H * 0.58, { color: C.gold, count: 24, speed: 400 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function loseRun() {
    if (finished) return;
    finished = true; ok = false; shake = 0.3; hitStop = 0.3;
    game.feedback.bad(W * 0.5 + pos * (W * 0.28), H * 0.58, { text: 'MISS' });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var side = x < W / 2 ? 'left' : 'right';
      stepPull(side, x, y);
    }
  });

  var demo = { t: 0, gx: W * 0.2, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { pos = 0; lastSide = null; milestoneCalled = false; }
    var beat = Math.floor(cyc / 0.34);
    var side = beat % 2 === 0 ? 'left' : 'right';
    demo.gx = side === 'left' ? W * 0.2 : W * 0.8;
    demo.gy = H * 0.85;
    demo.press = (cyc % 0.34) < 0.14;
    if (demo.press && side !== lastSide) stepPull(side, demo.gx, demo.gy);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pos === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed);
      drawScene(pos, lean);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('TAP TO START', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      drawScene(pos, lean);
      var pct = Math.round(((pos + 1) / 2) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.badc);
      txt(pct + '%', W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, Math.round((WIN_AT - pos) * 50)) + '%!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(((pos + 1) / 2) * 100);
        if (ok) game.end.success(pct, { pct: pct });
        else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      pos -= 0.028 * dt; // 相手の自然な引き戻し
      lean *= Math.pow(0.4, dt);
      if (pos <= LOSE_AT) { pos = LOSE_AT; loseRun(); }
      else if (timeLeft <= 0) { timeLeft = 0; if (pos > 0) winRun(); else loseRun(); }
    }
    if (shake > 0) shake -= dt;

    bg(game.time.elapsed);
    drawScene(pos, lean);

    var pct2 = Math.round(((pos + 1) / 2) * 100);
    txt(pct2 + '%', W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.groundDark, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.badc : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['G3', 0.2], ['B3', 0.2], ['E4', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
