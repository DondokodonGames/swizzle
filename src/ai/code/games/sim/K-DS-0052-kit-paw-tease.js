// K-DS-0052-kit-paw-tease.js
// 子ギツネのじゃれ合い — フェイントを織り交ぜて伸びてくる前脚に、本気の伸びだけ合わせて手を出す
// 操作: 子ギツネの前脚が本気で伸び切った瞬間だけタップする。フェイント(途中で引っ込む動き)ではタップしない
// 終わり: 規定回数(6回)正しく合わせれば成功。3回フェイントに引っかかるか本気を逃せば失敗
// @mechanic: cooldown_tap
// @theme: kit_paw_play
// 世界観: 縁側でじゃれ合う子ギツネ。フェイントを混ぜながら伸ばしてくる前脚に、こちらも本気の瞬間だけ手を合わせる遊び
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせられた回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル、丸みのある柔らかい輪郭、白ハイライト多め
  var C = {
    bg: '#fdeede', bg2: '#ffd9c2', engawa: '#e8c49a', engawaDark: '#c9a06a',
    fox: '#ff9d5c', foxDark: '#d97a30', pawTip: '#fff2e0',
    good: '#5fd98a', bad: '#ff6b7a', gold: '#ffb340', white: '#ffffff', ink: '#4a2c14',
  };

  var GAME_TITLE = 'PAW TEASE';
  var TOTAL = 6;
  var MAX_MISS = 3;
  var CX = W * 0.5, CY = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FOX_SPRITE = ['.##..##.', '########', '.######.', '..####..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.6, W, H * 0.25, C.engawa, 0.6);
    game.draw.line(0, H * 0.6, W, H * 0.6, C.engawaDark, 6);
  }

  var hits, missCount, rounds, done, endWait, finished;
  var ready, hitStop, shake;
  var pawT, pawDur, isFake, pawPhase, resolved, reach;

  function newPaw(idx) {
    pawDur = Math.max(0.6, 1.05 - idx * 0.04);
    pawT = 0; resolved = false; reach = 0;
    isFake = Math.random() < Math.min(0.55, 0.2 + idx * 0.06);
    pawPhase = 'out';
  }

  function initGame() {
    hits = 0; missCount = 0; rounds = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newPaw(0);
  }

  function resolveTap() {
    if (resolved || ready > 0 || done || finished) return;
    resolved = true;
    var full = reach > 0.85 && !isFake;
    hitStop = full ? 0.08 : 0.28;
    if (full) {
      hits++;
      game.feedback.good(CX, CY, { text: 'NICE', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 40 });
    } else {
      missCount++;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.35);
    }
    rounds++;
    afterRound();
  }

  function afterRound() {
    if (missCount >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    newPaw(hits);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); resolveTap(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawFox(reachAmt) {
    game.draw.sprite(FOX_SPRITE, { '#': C.foxDark }, CX, CY, 30, { anchor: 'center' });
    if (reachAmt > 0.02) {
      var len = 160 * reachAmt;
      game.draw.line(CX, CY + 60, CX, CY + 60 + len, C.fox, 20);
      game.draw.circle(CX, CY + 60 + len, 22, C.pawTip);
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { hits = 0; newPaw(0); isFake = false; demo.press = false; demo.tapped = false; }
    pawT += dt;
    var half = pawDur * 0.5;
    if (pawT < half) {
      reach = Math.min(1, pawT / half) * (isFake ? 0.55 : 1);
    } else {
      reach = Math.max(0, reach - dt * 1.6);
    }
    if (!isFake && pawT > half - 0.06 && pawT < half + 0.1 && !demo.tapped) {
      demo.tapped = true;
      demo.press = true;
      demo.gy = H * 0.86 - 30;
      game.feedback.good(CX, CY, { text: 'NICE', color: C.good, sound: false });
      game.audio.play('se_good', 0.22);
    }
    if (pawT >= pawDur) { newPaw(1); demo.tapped = false; demo.press = false; demo.gy = H * 0.86; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFox(reach);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.foxDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFox(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.foxDark);
      if (!ok) txt('あと' + (TOTAL - hits) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: missCount });
        else game.end.failure({ hits: hits, misses: missCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      pawT += dt;
      var half = pawDur * 0.5;
      if (pawT < half) {
        reach = Math.min(1, pawT / half) * (isFake ? 0.55 : 1);
      } else {
        reach = Math.max(0, reach - dt * 1.6);
      }
      if (pawT >= pawDur && !resolved) {
        resolved = true;
        // real reach never tapped = miss; fake never tapped = safe pass (no score change but not a miss)
        if (!isFake) {
          missCount++;
          hitStop = 0.28;
          game.feedback.bad(CX, CY, { text: 'MISS' });
          shake = 0.2;
          game.audio.play('se_bad', 0.35);
        } else {
          game.fx.popup('SAFE', CX, CY - 160, { color: C.good, size: 30 });
        }
        rounds++;
        afterRound();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFox(finished ? 0 : reach);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W - 60 - m * 34, 210, 12, m < missCount ? C.bad : '#00000030');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.3], ['E4', 0.3], ['C4', 0.3], ['E4', 0.3]], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
