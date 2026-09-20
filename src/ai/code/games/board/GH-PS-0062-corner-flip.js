// GH-PS-0062-corner-flip.js
// コーナーフリップ — オセロ。挟んでひっくり返す。角を取れる手を探す
// 操作: 盤面を見て、角を取れる1手をタップ
// 終わり: 正しい急所に置ければ成功
// @mechanic: judge
// @theme: tactic_disc
// 世界観: オセロの一局面。角を取れる手は1つだけ。見つけて置く
// 残るもの: 正誤(CLEAR/GAME OVER)
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var C = {
    bg1: '#e0f0e8', bg2: '#c8e0d0', board: '#2a7a4a', line: '#1a5a34',
    me: '#2a2a2a', opp: '#f0f0f0', good: '#5ac88a', bad: '#ff6a80', gold: '#ffb020', ink: '#1a2a1a',
  };

  var GAME_TITLE = 'CORNER FLIP';
  var GS = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var grid, keyR, keyC, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CELL = 140, GX0 = W * 0.5 - GS * CELL / 2, GY0 = H * 0.28;

  var STAR_SPRITE = ['..#..', '..#..', '#####', '..#..', '..#..'];

  function boardBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.sprite(STAR_SPRITE, { '#': C.gold }, W * 0.5, H * 0.90, 10, { anchor: 'center' });
    game.draw.circle(W * 0.5, H * 0.50, 6, C.gold, 0.0);
    game.draw.rect(GX0 - 16, GY0 - 16, GS * CELL + 32, GS * CELL + 32, C.board);
    for (var i = 0; i <= GS; i++) {
      game.draw.line(GX0, GY0 + i * CELL, GX0 + GS * CELL, GY0 + i * CELL, C.line, 3);
      game.draw.line(GX0 + i * CELL, GY0, GX0 + i * CELL, GY0 + GS * CELL, C.line, 3);
    }
    // 角マーク(狙いの視覚ヒントではなく単なる飾り)
    game.draw.circle(GX0, GY0, 8, '#ffffff', 0.5);
    game.draw.circle(GX0 + GS * CELL, GY0, 8, '#ffffff', 0.5);
    game.draw.circle(GX0, GY0 + GS * CELL, 8, '#ffffff', 0.5);
    game.draw.circle(GX0 + GS * CELL, GY0 + GS * CELL, 8, '#ffffff', 0.5);
  }

  function cellXY(r, c) { return { x: GX0 + c * CELL + CELL / 2, y: GY0 + r * CELL + CELL / 2 }; }

  function drawStones() {
    for (var r = 0; r < GS; r++) {
      for (var c = 0; c < GS; c++) {
        var v = grid[r][c];
        if (v === 0) continue;
        var p = cellXY(r, c);
        game.draw.circle(p.x, p.y + 5, 50, '#00000018');
        game.draw.circle(p.x, p.y, 50, v === 1 ? C.me : C.opp);
        game.draw.circle(p.x, p.y, 50, '#ffffff', v === 1 ? 0.15 : 0);
      }
    }
  }

  function makePuzzle() {
    var g = [];
    for (var r = 0; r < GS; r++) { g.push([]); for (var c = 0; c < GS; c++) g[r].push(0); }
    // 角(0,0)を取るために、対角線に沿って相手の石を並べる
    var corners = [[0, 0], [0, GS - 1], [GS - 1, 0], [GS - 1, GS - 1]];
    var corner = corners[Math.floor(Math.random() * 4)];
    var dr = corner[0] === 0 ? 1 : -1, dc = corner[1] === 0 ? 1 : -1;
    g[corner[0] + dr][corner[1] + dc] = 1; // 自分の石(挟む側)
    g[corner[0] + dr * 2][corner[1] + dc * 2] = 2; // 相手
    g[corner[0] + dr][corner[1]] = 2;
    g[corner[0]][corner[1] + dc] = 2;
    return { grid: g, kr: corner[0], kc: corner[1] };
  }

  function initGame() {
    var p = makePuzzle();
    grid = p.grid; keyR = p.kr; keyC = p.kc;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function place(r, c) {
    if (done || ready > 0 || finished) return;
    if (grid[r][c] !== 0) return;
    finished = true;
    hitStop = 0.1;
    grid[r][c] = 1;
    var p = cellXY(r, c);
    ok = (r === keyR && c === keyC);
    if (ok) { game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good }); game.fx.burst(p.x, p.y, { color: C.gold, count: 16, speed: 360 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(p.x, p.y, { text: 'MISS' }); shake = 0.2; game.audio.play('se_failure', 0.4); }
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
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    for (var r = 0; r < GS; r++) {
      for (var c = 0; c < GS; c++) {
        var p = cellXY(r, c);
        if (Math.abs(x - p.x) < CELL / 2 && Math.abs(y - p.y) < CELL / 2) { place(r, c); return; }
      }
    }
  });

  var demo = { t: 0, gx: W / 2, gy: H * 0.80, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (grid === undefined) initGame();
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { var p2 = makePuzzle(); grid = p2.grid; keyR = p2.kr; keyC = p2.kc; }
    var kp = cellXY(keyR, keyC);
    demo.gx += (kp.x - demo.gx) * Math.min(1, dt * 3);
    demo.gy += (kp.y - demo.gy) * Math.min(1, dt * 3);
    demo.press = cyc > 2.2 && cyc < 2.4;
    if (cyc > 2.2 && cyc < 2.23 && grid[keyR][keyC] === 0) { grid[keyR][keyC] = 1; game.feedback.good(kp.x, kp.y, { text: 'GOOD', color: C.good }); game.fx.burst(kp.x, kp.y, { color: C.gold, count: 12, speed: 320 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      boardBg();
      stepDemo(dt);
      drawStones();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 48, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 42, C.gold);
        txt('TAP TO START', W / 2, H * 0.97, 32, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      boardBg();
      drawStones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 28, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({}); else game.end.failure({});
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); game.fx.popup(1 + ' / ' + 1, W / 2, H * 0.20, { color: C.gold, size: 40 }); }
    }
    if (shake > 0) shake -= dt;

    boardBg();
    drawStones();

    txt(1 + ' / ' + 1, W / 2, H * 0.14, 32, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
