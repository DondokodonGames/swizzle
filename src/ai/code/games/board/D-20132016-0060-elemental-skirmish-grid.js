// D-20132016-0060-elemental-skirmish-grid.js
// エレメンタルスカーミッシュグリッド — 3x3の盤面で、自分と相性の良い色の敵だけを狙って連続撃破する
// 操作: 盤面の敵マスをタップして攻撃する。自分が有利な色の敵だけを選ぶ(不利な色に触れると即敗北)
// 終わり: 有利な色の敵を規定数(3体)撃破すれば成功。不利な色に触れれば即失敗
// @mechanic: turn_attack
// @theme: elemental_grid_skirmish
// 世界観: 小さな陣地の盤上で、炎の紋章を宿す守り手が周囲マスに湧く敵の色を見極め、有利な相性の敵だけを一撃で討つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドット、柔らかいアンビエントライト、輪郭は控えめ
  var C = {
    bg: '#1a1024', bg2: '#241536', cell: '#2e1c40', cellEdge: '#432a5c',
    home: '#ff6a3d', good: '#3ddc84', bad: '#3da5ff', badGlow: '#1a5c9c',
    goodGlow: '#1f8a52', gold: '#ffd400', white: '#f4e9ff', ink: '#0c0714',
  };

  var GAME_TITLE = 'GRID SKIRMISH';
  var ROWS = 3, COLS = 3;
  var CELL = 280;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.28;
  var TARGET = 3;
  var TIME_LIMIT = 12;

  // T=Gale(自分に弱い=撃破対象) / D=Tide(自分に強い=触れると敗北) / H=自陣(何もない)
  var LAYOUT = ['T', 'D', 'T', 'D', 'H', 'D', 'D', 'T', 'D'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var alive, defeated, timeLeft, done, endWait, finished, dash;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO = ['..#..', '.###.', '#####', '.#.#.'];
  var GALE_S = ['.....', '..#..', '.###.', '..#..'];
  var TIDE_S = ['.....', '.#.#.', '#####', '.#.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function cellCenter(i) {
    var r = Math.floor(i / COLS), c = i % COLS;
    return { x: GX + c * CELL + CELL / 2, y: GY + r * CELL + CELL / 2 };
  }

  function drawGrid(bob) {
    for (var i = 0; i < LAYOUT.length; i++) {
      var p = cellCenter(i);
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, C.cellEdge);
      game.draw.rect(p.x - CELL / 2 + 14, p.y - CELL / 2 + 14, CELL - 28, CELL - 28, C.cell);
      var kind = LAYOUT[i];
      if (kind === 'H') {
        game.draw.sprite(HERO, { '#': C.home }, p.x, p.y + bob, 16, { anchor: 'center' });
        continue;
      }
      if (!alive[i]) continue;
      if (kind === 'T') {
        game.draw.circle(p.x, p.y, 70, C.goodGlow, 0.5);
        game.draw.sprite(GALE_S, { '#': C.good }, p.x, p.y + bob, 16, { anchor: 'center' });
      } else {
        game.draw.circle(p.x, p.y, 70, C.badGlow, 0.5);
        game.draw.sprite(TIDE_S, { '#': C.bad }, p.x, p.y + bob, 16, { anchor: 'center' });
      }
    }
    if (dash && dash.t < dash.dur) {
      var pr = dash.t / dash.dur;
      var hx = cellCenter(4).x, hy = cellCenter(4).y;
      var lx = hx + (dash.tx - hx) * pr, ly = hy + (dash.ty - hy) * pr;
      game.draw.line(hx, hy, lx, ly, C.gold, 10);
    }
  }

  function initGame() {
    alive = LAYOUT.map(function(k) { return k !== 'H'; });
    defeated = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false; dash = null;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attackCell(i) {
    if (LAYOUT[i] === 'H' || !alive[i] || finished || ready > 0) return;
    var p = cellCenter(i);
    dash = { tx: p.x, ty: p.y, t: 0, dur: 0.15 };
    if (LAYOUT[i] === 'T') {
      alive[i] = false; defeated++;
      hitStop = 0.12;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.good, count: 14, speed: 320 });
      game.audio.play('se_good', 0.35);
      if (defeated === TARGET - 1) game.fx.popup('LAST ONE!', W * 0.5, GY - 40, { color: C.gold, size: 34 });
      if (defeated >= TARGET) {
        ok = true; finished = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(p.x, p.y, { text: 'HIT' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function cellAt(x, y) {
    var c = Math.floor((x - GX) / CELL);
    var r = Math.floor((y - GY) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return -1;
    return r * COLS + c;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var i = cellAt(x, y);
      if (i < 0 || LAYOUT[i] === 'H' || !alive[i]) { game.feedback.bad(x, y, { text: 'MISS' }); return; }
      attackCell(i);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var GOOD_IDX = [];
  for (var gi = 0; gi < LAYOUT.length; gi++) if (LAYOUT[gi] === 'T') GOOD_IDX.push(gi);

  var demo = { t: 0, gx: 0, gy: 0, press: false, tapT: 0.6, k: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      alive = LAYOUT.map(function(k) { return k !== 'H'; });
      defeated = 0; demo.k = 0; demo.tapT = 0.5;
    }
    demo.tapT -= dt;
    if (dash) dash.t += dt;
    if (demo.tapT <= 0 && demo.k < GOOD_IDX.length) {
      var idx = GOOD_IDX[demo.k];
      var p = cellCenter(idx);
      demo.gx = p.x; demo.gy = p.y; demo.press = true;
      alive[idx] = false; defeated++;
      dash = { tx: p.x, ty: p.y, t: 0, dur: 0.15 };
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      demo.k++;
      demo.tapT = 0.55;
    } else if (demo.k >= GOOD_IDX.length) {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var bob = Math.sin(game.time.elapsed * 2.2) * 5;

    if (state === S.ATTRACT) {
      if (alive === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGrid(bob);
      game.draw.hand(demo.gx || cellCenter(4).x, demo.gy || cellCenter(4).y, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid(bob);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(defeated + ' / ' + TARGET, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (TARGET - defeated) + '体!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(defeated, { defeated: defeated, target: TARGET });
        else game.end.failure({ defeated: defeated, target: TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (dash) dash.t += dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, GY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid(bob);

    txt(defeated + ' / ' + TARGET, W / 2, H * 0.06, 30, C.white);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.ink, 0.6);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.35], ['F3', 0.35], ['A3', 0.35], ['D4', 0.6]], { tempo: 128, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
