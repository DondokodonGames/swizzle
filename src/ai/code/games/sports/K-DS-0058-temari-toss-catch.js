// K-DS-0058-temari-toss-catch.js
// 手毬落下キャッチ — 放り上げた手毬が描く軌道を読み、受け皿が下に来た瞬間にタップして受け止める
// 操作: 手毬の落下軌道を見て、皿の真下に来た瞬間にタップして受け止める。早すぎ/遅すぎは取りこぼし
// 終わり: 規定個数(6個)を受け止めれば成功。3回落とせば失敗
// @mechanic: trajectory
// @theme: temari_toss_catch
// 世界観: 大道芸の曲芸師が、次々放り上げる手毬の落下軌道を読み、構えた受け皿でタイミングよく受け止める見世物
// 残るもの: 正誤(大喝采/演目中断)+ 受け止めた個数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・布地を思わせる質感の縞、柔らかい陰影の丸み
  var C = {
    bg: '#3a2c1a', bg2: '#241a0e', wood: '#5a4228', woodDark: '#3a2c1a',
    ball: '#d84a5a', ballB: '#e8d840', dish: '#c89858', dishDark: '#8a6a3a',
    good: '#4dffa0', bad: '#ff4d5e', gold: '#ffd400', white: '#f4ecd8', ink: '#140c04',
  };

  var GAME_TITLE = 'TOSS CATCH';
  var TOTAL = 6;
  var MAX_MISS = 3;
  var CX = W * 0.5, DISH_Y = H * 0.66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, miss, done, endWait, finished;
  var ready, hitStop, shake;
  var round, temari, dishX;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['..##..', '.####.', '.####.', '######', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * (0.3 + i * 0.08), W, 3, '#00000012');
  }

  function newTemari(idx) {
    var startX = CX + (idx % 2 === 0 ? -1 : 1) * (140 + idx * 6);
    var endX = CX + (idx % 2 === 0 ? 1 : -1) * (140 + idx * 6);
    return {
      t: 0, dur: Math.max(0.85, 1.35 - idx * 0.05),
      x0: startX, x1: endX, resolved: false,
    };
  }

  function temariPos(b) {
    var p = Math.min(1, b.t / b.dur);
    var x = b.x0 + (b.x1 - b.x0) * p;
    var arc = 1 - Math.pow((p - 0.5) * 2, 2);
    var y = DISH_Y - arc * 520;
    return { x: x, y: y, p: p };
  }

  function initGame() {
    caught = 0; miss = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; temari = newTemari(0); dishX = CX;
  }

  function tryCatch(x, y) {
    if (ready > 0 || done || hitStop > 0 || finished || !temari || temari.resolved) return;
    game.audio.play('se_tap', 0.05);
    dishX = x;
    var pos = temariPos(temari);
    var near = Math.abs(pos.x - dishX) < 90;
    var lowEnough = pos.y > DISH_Y - 130 && pos.p > 0.7;
    if (near && lowEnough) {
      temari.resolved = true;
      caught++;
      hitStop = 0.1;
      game.feedback.good(pos.x, DISH_Y, { text: 'CATCH', color: C.good });
      game.fx.burst(pos.x, DISH_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (caught === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, DISH_Y - 260, { color: C.gold, size: 40 });
      round++; temari = newTemari(round);
      if (caught >= TOTAL) { ok = true; finished = true; finish(); }
    }
    // 早すぎ/皿が外れている入力は無反応にしない: 皿の移動音のみ(feedbackはミス確定時のみ出す)
  }

  function registerMiss(b) {
    if (b.resolved) return;
    b.resolved = true;
    miss++;
    hitStop = 0.28;
    game.feedback.bad(dishX, DISH_Y, { text: 'MISS' });
    shake = 0.24;
    game.audio.play('se_bad', 0.4);
    if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
    else { round++; temari = newTemari(round); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryCatch(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawTrail(b) {
    var steps = 8;
    for (var i = 0; i < steps; i++) {
      var pp = Math.max(0, (b.t / b.dur) - i * 0.03);
      var p = Math.min(1, pp);
      var x = b.x0 + (b.x1 - b.x0) * p;
      var arc = 1 - Math.pow((p - 0.5) * 2, 2);
      var y = DISH_Y - arc * 520;
      game.draw.circle(x, y, 6 - i * 0.5, C.ballB, 0.12);
    }
  }

  function drawTemari(b) {
    if (!b || b.resolved) return;
    var pos = temariPos(b);
    drawTrail(b);
    game.draw.circle(pos.x, pos.y, 30, C.ball);
    game.draw.circle(pos.x, pos.y, 30, C.ballB, 0.0);
    game.draw.line(pos.x - 26, pos.y, pos.x + 26, pos.y, C.ballB, 4);
    game.draw.line(pos.x, pos.y - 26, pos.x, pos.y + 26, C.ballB, 4);
  }

  function drawDish(x) {
    game.draw.circle(x, DISH_Y + 10, 70, C.dishDark);
    game.draw.circle(x, DISH_Y, 62, C.dish);
  }

  var demo = { t: 0, gx: CX, gy: DISH_Y, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { demo.b = newTemari(0); demo.b.dur = 1.15; demo.caught = false; }
    demo.b.t += dt;
    temari = demo.b;
    var pos = temariPos(demo.b);
    dishX += (pos.x - dishX) * Math.min(1, dt * 6);
    demo.gx = dishX; demo.gy = DISH_Y;
    if (pos.p > 0.7 && pos.y > DISH_Y - 130 && !demo.caught) {
      demo.caught = true;
      demo.press = true;
      demo.b.resolved = true;
      game.fx.burst(pos.x, DISH_Y, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_good', 0.2);
    }
    if (pos.p >= 1) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawTemari(temari);
      drawDish(dishX);
      game.draw.sprite(PERFORMER, { '#': C.white }, CX, H * 0.86, 22, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy - 100, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
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
      drawDish(dishX);
      game.draw.sprite(PERFORMER, { '#': C.white }, CX, H * 0.86, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, miss: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      temari.t += dt;
      if (temari.t / temari.dur >= 1 && !temari.resolved) registerMiss(temari);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawTemari(temari);
    drawDish(dishX);
    game.draw.sprite(PERFORMER, { '#': C.white }, CX, H * 0.86, 22, { anchor: 'center' });

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W - 70 - mi * 44, 200, 14, mi < miss ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.4], ['A3', 0.4], ['C4', 0.4], ['F4', 0.8]], { tempo: 108, wave: 'sine', volume: 0.07, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
