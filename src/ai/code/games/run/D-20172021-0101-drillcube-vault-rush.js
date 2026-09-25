// D-20172021-0101-drillcube-vault-rush.js
// ドリルキューブ・ヴォルトラッシュ — 岩壁に開いた2つの破砕口を一瞬で見比べ、大きい方へキューブを突入させて坑道を進む
// 操作: 左右に並ぶ破砕口のうち大きい方の画面半分をタップして、その側の壁を突き破る
// 終わり: キューブの大きさを1以上保ったまま坑道を抜ければ成功。0になれば失敗
// @mechanic: size_judge
// @theme: drillcube_vault_rush
// 世界観: 採掘用の立方体ドリルマシンが、次々現れる岩壁の2つの破砕口を瞬時に見比べ、自分より大きい方だけを選んで突き破りながら坑道の出口を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 保ったキューブの大きさ
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: くっきりしたブロック単色+濃淡2階調の陰、輪郭なし
  var C = {
    bg: '#2a2018', bg2: '#140f0a', rock: '#5a4632', rockDark: '#3a2e20',
    cube: '#ffa93a', cubeDark: '#b06a10', hole: '#0c0a06',
    good: '#7fffb0', bad: '#ff4d5e', gold: '#ffe14d', white: '#fff2df', ink: '#160f08',
  };

  var GAME_TITLE = 'VAULT RUSH';
  var ROWS = 6;
  var TRAVEL = 1.5;
  var TELE_LEAD = 0.65;
  var MAX_SIZE = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0a0603', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
  }

  function holePx(sz) { return 60 + sz * 40; }
  function cubePx(sz) { return 8 + sz * 5; }
  var CUBE_F = [
    ['####', '#..#', '#..#', '####'],
    ['####', '#..#', '#..#', '####'],
  ];

  var cubeSize, rowIdx, rowT, holeL, holeR, resolved, telegraphOn, chosen;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function newRow() {
    var a = 1 + Math.floor(Math.random() * 3);
    var b;
    do { b = 1 + Math.floor(Math.random() * 3); } while (b === a);
    holeL = a; holeR = b;
    rowT = 0; resolved = false; telegraphOn = false; chosen = 0;
  }

  function initGame() {
    cubeSize = MAX_SIZE; rowIdx = 0; milestoneShown = false;
    newRow();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolveRow() {
    if (resolved) return;
    resolved = true;
    var bigSide = holeL > holeR ? -1 : 1;
    if (chosen === bigSide) {
      game.feedback.good(chosen < 0 ? W * 0.28 : W * 0.72, H * 0.55, { text: 'GOOD', color: C.good });
      game.audio.play('se_break', 0.4);
      if (rowIdx === Math.floor(ROWS / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      cubeSize--;
      hitStop = 0.3; shake = 0.28;
      game.feedback.bad(chosen < 0 ? W * 0.28 : W * 0.72, H * 0.55, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
  }

  function advance(dt) {
    rowT += dt;
    if (!telegraphOn && rowT >= TRAVEL - TELE_LEAD) telegraphOn = true;
    if (rowT >= TRAVEL) {
      if (!resolved) { chosen = -9; resolveRow(); } // 未入力=失敗扱い
      rowIdx++;
      if (cubeSize <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      if (rowIdx >= ROWS) {
        ok = cubeSize >= 1; finished = true; hitStop = 0.25;
        if (ok) { game.fx.burst(W / 2, H * 0.55, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); }
        else game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      newRow();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && telegraphOn && !resolved) {
      chosen = x < W / 2 ? -1 : 1;
      game.audio.play('se_tap', 0.15);
      resolveRow();
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene(sz, hl, hr, showTel) {
    var flash = Math.floor(game.time.elapsed * 8) % 2 === 0;
    var col = showTel ? (flash ? C.gold : C.rock) : C.rock;
    game.draw.rect(W * 0.08, H * 0.4, W * 0.36, H * 0.3, col);
    game.draw.rect(W * 0.56, H * 0.4, W * 0.36, H * 0.3, col);
    game.draw.circle(W * 0.26, H * 0.55, holePx(hl), C.hole);
    game.draw.circle(W * 0.74, H * 0.55, holePx(hr), C.hole);
    var f = Math.floor(game.time.elapsed * 6) % 2;
    var cy = H * 0.82 + (f === 0 ? 0 : 6);
    game.draw.sprite(CUBE_F[f], { '#': C.cube }, W / 2, cy, cubePx(sz), { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.26, gy: H * 0.9, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; }
    else if (!finished) advance(dt);
    var bigSide = holeL > holeR ? -1 : 1;
    var tx = bigSide < 0 ? W * 0.26 : W * 0.74;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy = H * 0.9;
    demo.press = telegraphOn && !resolved;
    if (telegraphOn && !resolved && Math.abs(demo.gx - tx) < 12) { chosen = bigSide; resolveRow(); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cubeSize === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(cubeSize, holeL, holeR, telegraphOn);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(cubeSize, holeL, holeR, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 46, ok ? C.good : C.bad);
      txt(cubeSize + ' / ' + MAX_SIZE, W / 2, H * 0.15, 28, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cubeSize, { size: cubeSize, rows: rowIdx });
        else game.end.failure({ size: cubeSize, rows: rowIdx });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      advance(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(cubeSize, holeL, holeR, telegraphOn);

    txt(rowIdx + ' / ' + ROWS, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000055', 1);
    game.draw.rect(60, 150, (W - 120) * (rowIdx / ROWS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['E3', 0.2], ['G3', 0.2], ['B3', 0.4]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
