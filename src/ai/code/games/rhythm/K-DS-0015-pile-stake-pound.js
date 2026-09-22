// K-DS-0015-pile-stake-pound.js
// 杭打ちビート — 地面に立てた杭を、振り下ろす掛矢の合図に合わせて打ち込む
// 操作: 掛矢が振り上がり切って落ち始める瞬間にタップして打ち込む
// 終わり: 規定回数(8回)を打ち込めば成功。3回外せば失敗
// @mechanic: rhythm
// @theme: stake_pounding_worksite
// 世界観: 河原の普請場。地面に半分刺さった杭を、大きな掛矢を担いだ作業員が拍に合わせて打ち込み、深く沈めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 沈めた杭の深さ(打ち込み回数)
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: くすんだオリーブ系の限定色、太いドット輪郭
  var C = {
    bg: '#243120', bg2: '#161f14', dirt: '#5a4326', dirtDark: '#3a2c18',
    stake: '#8a6a3a', stakeDark: '#5a4020', mallet: '#c9a24a', malletDark: '#7a5a20',
    good: '#7dff6a', bad: '#ff4d5e', gold: '#ffe14a', white: '#eef2e6', ink: '#0a0c08',
  };

  var GAME_TITLE = 'STAKE POUND';
  var TOTAL = 8;
  var MISS_LIMIT = 3;
  var CX = W * 0.5, GROUND_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER = ['..##..', '.####.', '..##..', '#####.', '.##.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [0.6, C.bg], [1, C.dirtDark]]);
    for (var i = 0; i < 5; i++) game.draw.rect(W * (0.1 + i * 0.2), H * 0.1, 6, H * 0.4, '#ffffff05');
    game.draw.rect(0, GROUND_Y + 40, W, H, C.dirt);
    game.draw.rect(0, GROUND_Y + 40, W, 10, C.dirtDark);
  }

  var beatIdx, sunk, misses, interval, beatT, swingAngle, struck, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    beatIdx = 0; sunk = 0; misses = 0; interval = 0.95; beatT = 0; swingAngle = 0; struck = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  // 掛矢の振り角: 0=最下点(打ち込み)/1=最上点。beatTが0→intervalで 上→下 のサイクル
  function malletAngle(t, iv) {
    var p = t / iv;
    return Math.sin(p * Math.PI) * -1 + 1; // 0(下)->1(上)->0(下) の山なり反転
  }

  function tryStrike(x, y) {
    if (ready > 0 || done || finished || hitStop > 0) return;
    var p = beatT / interval; // 0..1 サイクル進行
    var win = p >= 0.72 && p <= 1.0; // 下降〜着地の窓
    game.audio.play('se_tap', 0.08);
    if (win) {
      sunk++; beatIdx++;
      struck = true;
      hitStop = 0.1;
      shake = 0.18;
      var golden = beatIdx % 4 === 0;
      game.feedback.good(CX, GROUND_Y, { text: golden ? 'PERFECT' : 'GOOD', color: golden ? C.gold : C.good });
      game.fx.burst(CX, GROUND_Y, { color: golden ? C.gold : C.good, count: golden ? 20 : 12, speed: 300 });
      game.audio.play(golden ? 'se_milestone' : 'se_good', 0.35);
      interval = Math.max(0.62, interval - 0.03);
      if (sunk >= Math.ceil(TOTAL / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup(sunk + ' / ' + TOTAL, CX, GROUND_Y - 260, { color: C.gold, size: 38 });
      }
      if (sunk >= TOTAL) { ok = true; finished = true; finish(); }
      else { beatT = 0; }
    } else {
      misses++;
      hitStop = 0.28;
      shake = 0.25;
      game.feedback.bad(CX, GROUND_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryStrike(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(sunkLocal, swingA, strikeFlash) {
    bg();
    var depth = 40 + sunkLocal * 12;
    game.draw.rect(CX - 20, GROUND_Y - 220 + depth, 40, 260, C.stakeDark);
    game.draw.rect(CX - 20, GROUND_Y - 220 + depth, 40, 14, C.stake);
    var headX = CX + Math.sin(0) * 0;
    var headY = GROUND_Y - 260 - swingA * 320;
    game.draw.line(CX, headY, CX, GROUND_Y - 240 + depth, C.malletDark, 14);
    game.draw.circle(CX, headY, 46, C.mallet);
    game.draw.circle(CX, headY, 46, C.malletDark, 0.3);
    game.draw.sprite(WORKER, { '#': C.white }, CX + 150, GROUND_Y - 40, 20, { anchor: 'center' });
    if (strikeFlash) game.draw.circle(CX, GROUND_Y - 200 + depth, 70, C.gold, 0.35);
  }

  var demo = { t: 0, gx: CX, gy: GROUND_Y - 200, press: false, sunk: 0, iv: 0.95, bt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { demo.sunk = 0; demo.iv = 0.95; demo.bt = 0; }
    demo.bt += dt;
    var p = demo.bt / demo.iv;
    if (p >= 1) {
      demo.bt = 0;
      demo.sunk = Math.min(TOTAL, demo.sunk + 1);
      demo.press = true;
    } else {
      demo.press = false;
    }
    sunk = demo.sunk;
    var a = malletAngle(demo.bt, demo.iv);
    demo.gx = CX; demo.gy = GROUND_Y - 260 - a * 320;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(sunk, malletAngle(demo.bt, demo.iv), demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
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
      drawScene(sunk, 1, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(sunk + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - sunk <= 2) txt('あと' + (TOTAL - sunk) + '打!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(sunk, { sunk: sunk, total: TOTAL, misses: misses });
        else game.end.failure({ sunk: sunk, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      if (beatT / interval >= 1.15) {
        // 打ち損ね(窓を過ぎた)
        misses++;
        hitStop = 0.28;
        shake = 0.25;
        game.feedback.bad(CX, GROUND_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.35);
        beatT = 0;
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
      }
    }
    if (struck) { struck = false; }
    if (shake > 0) shake -= dt;

    var swingA = malletAngle(beatT, interval);
    var telegraph = beatT / interval >= 0.55;
    drawScene(sunk, swingA, false);
    if (telegraph && Math.floor(game.time.elapsed * 12) % 2 === 0) {
      game.draw.circle(CX, GROUND_Y - 160, 80, C.gold, 0.18);
    }

    txt(sunk + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (sunk / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['G3', 0.3], ['C4', 0.3], ['G3', 0.3]], { tempo: 110, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
