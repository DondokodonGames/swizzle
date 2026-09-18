// GH-PS-0051-five-block.js
// ファイブブロック — 相手の3を止めるか、自分の4を作るかを1手で決める
// 操作: 盤面を見て、次の1手を置くマスをタップ
// 終わり: 正しい急所に置ければ成功。それ以外は失敗
// @mechanic: judge
// @theme: tactic_board
// 世界観: 五目並べの一局面。自分の石を1つ置くだけ。相手の3並びを止めるか、自分の4並びを作れる急所は1つしかない
// 残るもの: 正誤(CLEAR/GAME OVER)
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HOME: 3〜4色 + 黒。8x8ドット、タイル反復背景
  var C = {
    bg1: '#3a2a1a', bg2: '#2a1c10', board: '#c89a5a', line: '#5a3a20',
    me: '#e8e8e8', opp: '#2a2a2a', good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffd400', white: '#ffffff', ink: '#1a1208',
  };

  var GAME_TITLE = 'FIVE BLOCK';
  var GS = 7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var grid, keyR, keyC, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CELL = 130, GX0 = W * 0.5 - GS * CELL / 2, GY0 = H * 0.28;

  var STAR_SPRITE = ['..#..', '..#..', '#####', '..#..', '..#..'];

  function boardBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(GX0 - 20, GY0 - 20, GS * CELL + 40, GS * CELL + 40, C.board);
    for (var i = 0; i <= GS; i++) {
      game.draw.line(GX0, GY0 + i * CELL, GX0 + GS * CELL, GY0 + i * CELL, C.line, 3);
      game.draw.line(GX0 + i * CELL, GY0, GX0 + i * CELL, GY0 + GS * CELL, C.line, 3);
    }
    game.draw.sprite(STAR_SPRITE, { '#': C.gold }, W * 0.5, H * 0.90, 10, { anchor: 'center' });
    game.draw.circle(W * 0.5, H * 0.50, 6, C.gold, 0.0);
  }

  function cellXY(r, c) { return { x: GX0 + c * CELL + CELL / 2, y: GY0 + r * CELL + CELL / 2 }; }

  function drawStones() {
    for (var r = 0; r < GS; r++) {
      for (var c = 0; c < GS; c++) {
        var v = grid[r][c];
        if (v === 0) continue;
        var p = cellXY(r, c);
        game.draw.circle(p.x, p.y + 6, 46, '#000000', 0.25);
        game.draw.circle(p.x, p.y, 46, v === 1 ? C.me : C.opp);
      }
    }
  }

  function makePuzzle() {
    var g = [];
    for (var r = 0; r < GS; r++) { g.push([]); for (var c = 0; c < GS; c++) g[r].push(0); }
    // 相手の3並び(横)を作る。止める急所は両端のどちらか(片方は既に塞ぐ)
    var row = 2 + Math.floor(Math.random() * 3);
    var col0 = 1 + Math.floor(Math.random() * 3);
    for (var k = 0; k < 3; k++) g[row][col0 + k] = 2;
    g[row][col0 - 1] = 1; // 片側は自分の石で塞いである
    var kr = row, kc = col0 + 3; // 唯一の急所(反対側)
    // 味付けの石を少し
    if (row + 2 < GS) g[row + 2][col0] = 2;
    if (col0 - 2 >= 0) g[row - 1 < 0 ? row + 1 : row - 1][Math.max(0, col0 - 2)] = 1;
    return { grid: g, kr: kr, kc: kc };
  }

  function initGame() {
    var p = makePuzzle();
    grid = p.grid; keyR = p.kr; keyC = p.kc;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    readyPopped = false;
  }
  var readyPopped = false;

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
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    for (var r = 0; r < GS; r++) {
      for (var c = 0; c < GS; c++) {
        var p = cellXY(r, c);
        if (Math.abs(x - p.x) < CELL / 2 && Math.abs(y - p.y) < CELL / 2) { place(r, c); return; }
      }
    }
  });

  // ── ATTRACT ゴースト実演: 急所に置く ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.80, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (grid === undefined) initGame();
    var cyc = demo.t % 3.0;
    if (cyc < dt) { var p2 = makePuzzle(); grid = p2.grid; keyR = p2.kr; keyC = p2.kc; }
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
      txt(GAME_TITLE, W / 2, H * 0.09, 50, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.97, 34, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      boardBg();
      drawStones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 52, ok ? C.good : C.bad);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 30, C.white);
      return;
    }

    // ── PLAYING ──
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

    txt(1 + ' / ' + 1, W / 2, H * 0.14, 34, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
