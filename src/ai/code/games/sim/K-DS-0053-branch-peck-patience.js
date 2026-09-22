// K-DS-0053-branch-peck-patience.js
// ブランチペックペイシェンス — くちばしが振りかぶりきった一瞬だけタップして幹をつつく
// 操作: くちばしが振り上がって光った瞬間だけタップ。振りかぶり中の連打は我慢する
// 終わり: 規定回数(8回)つつければ成功。早打ちや遅れを3回やれば失敗
// @mechanic: cooldown_tap
// @theme: forest_trunk_pecking
// 世界観: 朝の雑木林。一本の枯れ木に留まり、振りかぶりが満ちた一瞬だけくちばしを打ち込む小鳥
// 残るもの: 正誤(CLEAR/GAME OVER) + タイミングよくつつけた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 輪郭を一回り大きい黒で、内側は明暗2色のみ。中間調なし
  var C = {
    bg1: '#bfe6a8', bg2: '#7fc463', trunk: '#8a5a34', trunkDark: '#5a3a1e',
    birdLight: '#ffce4a', birdDark: '#e08a10', outline: '#1a1208',
    ready: '#4d9dff', hot: '#ff4d6a', good: '#33cc66', gold: '#ffb020', ink: '#1a1208', white: '#ffffff',
  };

  var GAME_TITLE = 'PECK PATIENCE';
  var TOTAL = 8;
  var MISS_LIMIT = 3;
  var CX = W * 0.5, TRUNK_TOP = H * 0.28, TRUNK_BOT = H * 0.72;
  var BIRD_X = W * 0.5, BIRD_Y = H * 0.36;
  var WINDOW = 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.outline, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BIRD_UP = ['..##..', '.####.', '##.##.', '.####.', '..##..'];
  var BIRD_DOWN = ['..##..', '.####.', '.####.', '##.##.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(CX - 40, TRUNK_TOP, 80, TRUNK_BOT - TRUNK_TOP, C.trunkDark);
    game.draw.rect(CX - 34, TRUNK_TOP, 68, TRUNK_BOT - TRUNK_TOP, C.trunk);
    for (var i = 0; i < 4; i++) game.draw.rect(CX - 30, TRUNK_TOP + 60 + i * 90, 60, 10, C.trunkDark, 0.5);
  }

  var round, cool, winOpen, pecked, missed, done, endWait, finished, pulse;
  var ready, hitStop, shake;

  function cooldownFor(n) { return Math.max(0.62, 1.05 - n * 0.05); }

  function initGame() {
    round = 0; cool = cooldownFor(0); winOpen = false; pecked = 0; missed = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; pulse = 0;
  }

  function tryPeck() {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (winOpen) {
      pecked++;
      winOpen = false;
      hitStop = 0.07;
      game.feedback.good(BIRD_X, TRUNK_TOP + 60, { text: 'PECK', color: C.gold });
      game.fx.burst(BIRD_X, TRUNK_TOP + 60, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.4);
      if (pecked === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, BIRD_Y - 220, { color: C.gold, size: 40 });
      round++;
      if (pecked >= TOTAL) { ok = true; finished = true; finish(); return; }
      cool = cooldownFor(round);
    } else {
      // クールダウン中の早打ちはペナルティ
      missed++;
      hitStop = 0.24;
      game.feedback.bad(BIRD_X, BIRD_Y, { text: 'EARLY' });
      shake = 0.15;
      game.audio.play('se_bad', 0.35);
      if (missed >= MISS_LIMIT) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tryPeck();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBird(state2) {
    var sp = state2 === 'up' ? BIRD_UP : BIRD_DOWN;
    var col = winOpen ? C.hot : C.birdLight;
    game.draw.circle(BIRD_X, BIRD_Y + 8, 60, C.birdDark, 0.3);
    game.draw.sprite(sp, { '#': col }, BIRD_X, BIRD_Y, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: BIRD_X, gy: BIRD_Y + 460, press: false, cool: 0.9, open: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.cool = 0.9; demo.open = false; pecked = 0; missed = 0; }
    demo.press = false;
    if (!demo.open) {
      demo.cool -= dt;
      if (demo.cool <= 0) {
        demo.open = true;
        pulse = 0;
      }
    } else {
      pulse += dt;
      if (pulse > WINDOW * 0.7) {
        demo.open = false;
        demo.press = true;
        pecked++;
        game.feedback.good(BIRD_X, TRUNK_TOP + 60, { text: 'PECK', color: C.gold, sound: 'se_good', volume: 0.25 });
        game.fx.burst(BIRD_X, TRUNK_TOP + 60, { color: C.gold, count: 8, speed: 200 });
        demo.cool = 0.9;
      }
    }
    winOpen = demo.open;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBird(winOpen ? 'down' : 'up');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.outline);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.outline);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBird('up');
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.hot);
      txt(pecked + ' / ' + TOTAL, W / 2, H * 0.15, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - pecked) + '回!', W / 2, H * 0.2, 24, C.outline);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.outline);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pecked, { pecked: pecked, total: TOTAL, missed: missed });
        else game.end.failure({ pecked: pecked, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); cool = cooldownFor(round); winOpen = false; }
    } else if (!finished) {
      if (!winOpen) {
        cool -= dt;
        if (cool <= 0) { winOpen = true; pulse = 0; }
      } else {
        pulse += dt;
        if (pulse > WINDOW) {
          winOpen = false;
          missed++;
          hitStop = 0.24;
          game.feedback.bad(BIRD_X, BIRD_Y, { text: 'MISS' });
          shake = 0.15;
          game.audio.play('se_bad', 0.35);
          if (missed >= MISS_LIMIT) { ok = false; finished = true; finish(); }
          else { round++; cool = cooldownFor(round); }
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawBird(winOpen ? 'down' : 'up');

    txt(pecked + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.outline);
    game.draw.rect(60, 140, W - 120, 16, C.outline, 0.15);
    game.draw.rect(60, 140, (W - 120) * (pecked / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 80 - m * 40, 108, 12, m < missed ? C.hot : '#ffffff55');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.8]], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
