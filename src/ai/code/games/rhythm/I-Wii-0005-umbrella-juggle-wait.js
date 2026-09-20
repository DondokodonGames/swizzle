// I-Wii-0005-umbrella-juggle-wait.js
// 傘上げ玉待ち構え — 頭上に傘を構え、玉が落ちてくる合図まで連打せずじっと待ってタップする
// 操作: 玉が傘に近づく光の合図が出るまで指を我慢し、合図が出た瞬間だけタップして弾き返す
// 終わり: 規定回数(6回)を正しいタイミングで弾き返せれば成功。合図前に押せば即失敗
// @mechanic: cooldown_tap
// @theme: street_umbrella_juggler
// 世界観: 大道芸の辻。頭上に傘を掲げた曲芸師が、落ちてくる玉を我慢強く待ち、合図の瞬間だけ弾き返し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き返せた回数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単色背景、太い縁取り、疑似ボリュームのグラデ玉
  var C = {
    bg: '#5ac8e8', bg2: '#3aa8d0', umbrella: '#ff6b6b', umbrellaDark: '#c83c3c',
    performer: '#ffe066', ball: '#ffd23a', ballDark: '#e0a800',
    good: '#2ecc71', bad: '#ff4757', gold: '#ffd23a', white: '#ffffff', ink: '#12222c',
  };

  var GAME_TITLE = 'BRELLA WAIT';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.46;
  var COOLDOWN = 1.05, WARN = 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, caught, milestoneShown;
  var ready, hitStop, shake;
  var cdT, cdReady, ballDrop;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER_SPRITE = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.68, W, H * 0.14, C.umbrellaDark, 0.3);
  }

  function initGame() {
    caught = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    cdT = 0; cdReady = false; ballDrop = 0;
  }

  function tapBrella(x, y) {
    if (finished || ready > 0 || done) return;
    if (!cdReady) {
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(CX, CY - 150, { text: 'EARLY!' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    caught++;
    cdReady = false; cdT = 0; ballDrop = 0;
    game.feedback.good(CX, CY - 150, { text: 'NICE', color: C.good });
    game.fx.burst(CX, CY - 150, { color: C.gold, count: 12, speed: 280 });
    game.audio.play('se_powerup', 0.4);
    if (!milestoneShown && caught >= Math.ceil(TOTAL / 2)) {
      milestoneShown = true;
      game.fx.popup('HALFWAY!', CX, CY - 260, { color: C.gold, size: 38 });
      game.audio.play('se_milestone', 0.4);
    }
    if (caught >= TOTAL) {
      finished = true; ok = true;
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tapBrella(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  function updateCooldown(dt) {
    cdT += dt;
    ballDrop = Math.min(1, cdT / COOLDOWN);
    if (cdT >= COOLDOWN && !cdReady) {
      cdReady = true;
      game.audio.play('se_tap', 0.12);
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { cdT = 0; cdReady = false; ballDrop = 0; demo.tapped = false; }
    cdT += dt;
    ballDrop = Math.min(1, cdT / COOLDOWN);
    if (cdT >= COOLDOWN && !demo.tapped) {
      demo.tapped = true;
      demo.press = true;
      game.fx.burst(CX, CY - 150, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_powerup', 0.25);
    } else if (cdT < COOLDOWN) {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cdT === undefined) initGame();
      bg();
      stepDemo(dt);
      var by = CY - 150 - (1 - ballDrop) * 380;
      game.draw.circle(CX, by, 26, C.ball);
      game.draw.line(CX - 90, CY - 190, CX + 90, CY - 190, C.umbrella, 24);
      game.draw.sprite(PERFORMER_SPRITE, { '#': C.performer }, CX, CY, 22, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.line(CX - 90, CY - 190, CX + 90, CY - 190, C.umbrella, 24);
      game.draw.sprite(PERFORMER_SPRITE, { '#': C.performer }, CX, CY, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.ink);
      if (!ok) txt('あと' + (TOTAL - caught) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateCooldown(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    var by2 = CY - 150 - (1 - ballDrop) * 380;
    if (!finished) game.draw.circle(CX, by2, 26, cdReady ? C.gold : C.ball);
    var glow = cdT / COOLDOWN;
    if (glow > (COOLDOWN - WARN) / COOLDOWN && !cdReady) {
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (blink) game.draw.circle(CX, CY - 190, 110, C.gold, 0.3);
    }
    game.draw.line(CX - 90, CY - 190, CX + 90, CY - 190, cdReady ? C.gold : C.umbrella, 24);
    game.draw.sprite(PERFORMER_SPRITE, { '#': C.performer }, CX, CY, 22, { anchor: 'center' });

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['B3', 0.3], ['D4', 0.3], ['G4', 0.6]], { tempo: 122, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
