// K-X-0039-firefly-pattern-recall.js
// ファイアフライパターンリコール — 一瞬だけ光る蛍の点滅間隔を覚え、消えた後も同じ間で拍手する
// 操作: 蛍が数回光る間隔をよく見て覚え、光が消えた後、同じタイミングでタップし続ける
// 終わり: 覚えた4拍を消灯後も正確なタイミングで再現できれば成功。1拍でもズレれば失敗
// @mechanic: memory_sequence
// @theme: firefly_pattern_conductor
// 世界観: 夜の野原で蛍を導く指揮者。蛍が数回瞬く間隔を目に焼き付け、光が消えた暗闇の中でも同じ拍で手を打ち続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 再現できた拍数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 柔らかいライティング、被写界深度風のぼかし円、深みのあるグラデーション
  var C = {
    bg: '#041018', bg2: '#0a2018', field: '#0e2a1c', firefly: '#c8ff6a',
    fireflyDim: '#3a5a20', good: '#39ff6a', bad: '#ff4455', gold: '#ffe066', white: '#ffffff', ink: '#020604',
  };

  var GAME_TITLE = 'FIREFLY RECALL';
  var BEATS = 4;
  var CX = W * 0.5, CY = H * 0.42;
  var WINDOW_SEC = 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var pattern, showIdx, showT, phase; // phase: 'show' | 'recall'
  var recallIdx, recallT, waitingTap, resolvedThisBeat, solved, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CONDUCTOR = ['..##..', '.####.', '..##..', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 12; i++) {
      var sx = (i * 211) % W, sy = H * 0.15 + (i * 77) % (H * 0.5);
      game.draw.circle(sx, sy, 4, C.fireflyDim, 0.5);
    }
    var bob = Math.sin(game.time.elapsed * 2.2) * 10;
    game.draw.sprite(CONDUCTOR, { '#': C.gold }, CX, H * 0.78 + bob, 16, { anchor: 'center' });
  }

  function makePattern() {
    // 拍間隔をランダムに(0.55〜0.9s)、覚えやすいよう緩急を持たせる
    var arr = [];
    for (var i = 0; i < BEATS; i++) arr.push(game.random(0.55, 0.9));
    return arr;
  }

  function initGame() {
    pattern = makePattern();
    showIdx = 0; showT = 0.5; phase = 'show';
    recallIdx = 0; recallT = 0; waitingTap = false; resolvedThisBeat = false;
    solved = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function fireflyFlash() {
    game.fx.burst(CX, CY, { color: C.firefly, count: 10, speed: 220 });
    game.audio.tone(700, 0.12, { wave: 'sine', volume: 0.3 });
  }

  function resolveTap() {
    if (ready > 0 || done || finished || phase !== 'recall' || !waitingTap || resolvedThisBeat) return;
    resolvedThisBeat = true;
    var dist = Math.abs(recallT);
    if (dist <= WINDOW_SEC) {
      solved++; hitStop = 0.06;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.3);
      if (solved === Math.ceil(BEATS / 2)) game.fx.popup('HALFWAY!', CX, CY - 260, { color: C.gold, size: 40 });
      if (solved >= BEATS) { ok = true; finished = true; finish(); }
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (phase === 'recall') resolveTap();
      else game.audio.play('se_tap', 0.04); // 記憶フェーズ中のタップは無視(音のみ)
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, p: null, idx: 0, showT: 0, ph: 'show', rIdx: 0, rT: 0 };
  function resetDemo() { demo.p = makePattern(); demo.idx = 0; demo.showT = 0.4; demo.ph = 'show'; demo.rIdx = 0; demo.rT = 0; demo.press = false; }
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.p) resetDemo();
    if (demo.ph === 'show') {
      demo.showT -= dt;
      if (demo.showT <= 0) {
        fireflyFlash();
        demo.idx++;
        if (demo.idx >= demo.p.length) { demo.ph = 'recall'; demo.rT = 0.4; }
        else demo.showT = demo.p[demo.idx];
      }
    } else {
      demo.rT -= dt;
      if (demo.rT <= 0) {
        demo.press = true;
        game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.18);
        demo.rIdx++;
        if (demo.rIdx >= demo.p.length) { demo.p = null; demo.press = false; }
        else demo.rT = demo.p[demo.rIdx];
      } else if (demo.rT < 0.15) {
        // keep press briefly true window handled by press flag reset below
      }
    }
    if (demo.press && demo.rT > 0.1) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var lit = demo.ph === 'show' && demo.showT > (demo.p ? demo.p[demo.idx] || 0 : 0) - 0.15;
      game.draw.circle(CX, CY, 50, lit ? C.firefly : C.fireflyDim, lit ? 0.9 : 0.4);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(solved + ' / ' + BEATS, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (BEATS - solved) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(solved * 20, { solved: solved, total: BEATS });
        else game.end.failure({ solved: solved, total: BEATS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'show') {
        showT -= dt;
        if (showT <= 0) {
          fireflyFlash();
          showIdx++;
          if (showIdx >= pattern.length) { phase = 'recall'; recallT = 0.5; waitingTap = false; }
          else showT = pattern[showIdx];
        }
      } else {
        recallT += dt;
        if (!waitingTap && recallT >= -WINDOW_SEC) { waitingTap = true; resolvedThisBeat = false; }
        if (waitingTap && recallT > WINDOW_SEC && !resolvedThisBeat) {
          resolvedThisBeat = true;
          hitStop = 0.35; shake = 0.3;
          game.feedback.bad(CX, CY, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
        if (!finished && recallT > WINDOW_SEC + 0.05) {
          recallIdx++;
          waitingTap = false;
          if (recallIdx < pattern.length) recallT = -(pattern[recallIdx] - WINDOW_SEC - 0.05);
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) {
      var showLit = phase === 'show' && showT > (pattern[showIdx] || 0) - 0.15;
      var recallGlow = phase === 'recall' && waitingTap ? Math.max(0, 1 - Math.abs(recallT) / WINDOW_SEC) : 0;
      game.draw.circle(CX, CY, 50, showLit ? C.firefly : C.fireflyDim, showLit ? 0.9 : (0.4 + recallGlow * 0.4));
    }

    txt(solved + ' / ' + BEATS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (solved / BEATS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
