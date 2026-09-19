// GH-PS-0018-exact-count-stop.js
// ジャストカウント — 0〜9を行き来する数字を、指定された数でちょうど止める
// 操作: 上に出た目標の数と、動き続けるカウンターの数字が一致した瞬間にタップして止める
// 終わり: 規定回数ちょうど止めれば成功。2回外せば失敗
// @mechanic: count_exact
// @theme: coin_counter_booth
// 世界観: 薄暗い両替窓口、旧式のコイン計数機。数字は0から9を行ったり来たりし続け、指定された数でちょうど止めないと硬貨がこぼれる。まれに数字の向きが急に反転する
// 残るもの: 正誤(CLEAR/GAME OVER) + ちょうど止めた回数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // HD POST 3D: 低彩度・褐色寄り。ブルーム(半透明円の重ね)とビネット。コントラストを潰す
  var C = {
    bg1: '#3a3128', bg2: '#1c1712', panel: '#4a3d2e', panelDark: '#2a2118',
    digit: '#e8c888', digitDim: '#7a6a4a', good: '#8adf9a', bad: '#e05858',
    gold: '#e8b84a', white: '#efe6d4', ink: '#141008',
  };

  var GAME_TITLE = 'JUST COUNT';
  var NEEDED = 5, MISS_LIMIT = 2;
  var CX = W / 2, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, cleared, misses, target, tPos, speed, dirMult, revState, revT, final;
  var judged, judgeGood, judgeT, mood;
  var done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function boothBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.circle(CX, CY, 420, C.gold, 0.05);
    game.draw.circle(CX, CY, 300, C.gold, 0.06);
    // ビネット
    game.draw.rect(0, 0, W, 140, '#000000', 0.35);
    game.draw.rect(0, H - 140, W, 140, '#000000', 0.35);
    game.draw.rect(0, 0, 90, H, '#000000', 0.3);
    game.draw.rect(W - 90, 0, 90, H, '#000000', 0.3);
  }

  function curDigit() {
    var period = 18;
    var p = ((tPos % period) + period) % period;
    return p <= 9 ? Math.floor(p) : Math.floor(period - p);
  }

  var BOT_SPRITE = { idle: ['.###.', '#.#.#', '#####'], happy: ['.###.', '#...#', '.###.'], sad: ['.###.', '#.#.#', '..#..'] };

  function drawBooth() {
    game.draw.rect(CX - 260, CY - 260, 520, 460, C.panelDark);
    game.draw.rect(CX - 230, CY - 230, 460, 340, C.panel);
    var d = curDigit();
    var flashBg = final ? (Math.floor(game.time.elapsed * 8) % 2 === 0 ? C.bad : C.panel) : C.panel;
    game.draw.rect(CX - 190, CY - 190, 380, 260, judged ? (judgeGood ? C.good : C.bad) : flashBg, judged ? 0.5 : 1);
    txt(String(d), CX, CY - 20, 190, C.digit);
    if (revState === 'warn' && Math.floor(game.time.elapsed * 14) % 2 === 0) {
      game.draw.rect(CX - 230, CY - 230, 460, 12, C.bad, 0.7);
      game.draw.rect(CX - 230, CY + 106, 460, 12, C.bad, 0.7);
    }
    // 目標
    game.draw.rect(CX - 110, CY - 400, 220, 130, C.panelDark);
    txt(String(target), CX, CY - 300, 96, C.gold);
    // ボット
    var spr = mood > 0.3 ? BOT_SPRITE.happy : mood < -0.3 ? BOT_SPRITE.sad : BOT_SPRITE.idle;
    game.draw.circle(CX, CY + 320, 70, C.panelDark);
    game.draw.sprite(spr, { '#': C.digit }, CX, CY + 315, 11, { anchor: 'center' });
  }

  function newRound() {
    round++;
    final = round === NEEDED - 1;
    target = 1 + Math.floor(Math.random() * 9);
    tPos = 0;
    speed = (5.0 + round * 0.7) * (final ? 1.5 : 1);
    dirMult = 1; revState = 'idle'; revT = 1.4 + Math.random() * 1.2;
    judged = false; judgeT = 0;
  }

  function initGame() {
    round = -1; cleared = 0; misses = 0; mood = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function stop() {
    if (done || ready > 0 || hitStop > 0 || finished || judged) return;
    judged = true; judgeT = 0.55;
    var d = curDigit();
    var exact = d === target;
    hitStop = 0.16;
    if (exact) {
      cleared++; mood = 1; judgeGood = true;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (cleared % 2 === 0) { game.fx.popup(cleared + ' / ' + NEEDED, CX, H * 0.16, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.35); }
      if (cleared >= NEEDED) { ok = true; finished = true; game.fx.burst(CX, CY, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); finish(); return; }
    } else {
      misses++; mood = -1; judgeGood = false;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.18;
      game.audio.play('se_bad', 0.35);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    stop();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepCounter(dt) {
    if (round >= 1) {
      if (revState === 'idle') {
        revT -= dt;
        if (revT <= 0) { revState = 'warn'; revT = 0.45; }
      } else if (revState === 'warn') {
        revT -= dt;
        if (revT <= 0) { revState = 'active'; revT = 1.1; dirMult = -1; game.audio.tone(300, 0.1, { wave: 'triangle', volume: 0.12 }); }
      } else if (revState === 'active') {
        revT -= dt;
        if (revT <= 0) { revState = 'idle'; revT = 1.4 + Math.random() * 1.2; dirMult = 1; }
      }
    }
    tPos += speed * dirMult * dt;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined) initGame();
    if (!judged && !finished) {
      stepCounter(dt);
      demo.press = curDigit() === target;
      if (demo.press && !demo.did) { demo.did = true; stop(); }
      if (!demo.press) demo.did = false;
    } else if (!finished) {
      judgeT -= dt;
      if (judgeT <= -0.5) newRound();
    } else { initGame(); }
    demo.gx = CX; demo.gy = CY;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      boothBg();
      stepDemo(dt);
      drawBooth();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + 260 + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      boothBg();
      drawBooth();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + NEEDED, W / 2, H * 0.10, 28, C.gold);
      if (!ok && cleared >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.14, 24, C.bad);
      if (cleared > game.best && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.18, 28, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { cleared: cleared, misses: misses };
        if (ok) game.end.success(cleared, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!judged) stepCounter(dt);
      else {
        judgeT -= dt;
        if (judgeT <= 0) newRound();
      }
    }
    if (shake > 0) shake -= dt;
    if (mood !== 0) mood *= Math.max(0, 1 - dt * 2.2);

    boothBg();
    drawBooth();

    var progress = cleared / NEEDED;
    txt(cleared + ' / ' + NEEDED, CX, H * 0.055, 30, C.white);
    game.draw.rect(60, 78, W - 120, 14, '#000000', 0.5);
    game.draw.rect(60, 78, (W - 120) * progress, 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', CX, H * 0.86, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['G3', 0.16], ['B3', 0.16], ['D4', 0.16], ['G4', 0.32]],
      { tempo: 118, wave: 'triangle', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
