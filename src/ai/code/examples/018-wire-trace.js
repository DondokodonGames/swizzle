// 018-wire-trace.js
// ワイヤートレース — 震える手でケーブルをなぞる外科医の集中力
// 操作: スワイプで上下左右に進み、ワイヤーのルートに沿って進む
// 成功: 終点まで到達  失敗: ワイヤーから外れる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'WIRE TRACE';
  var HOW_TO_PLAY = 'SWIPE ALONG THE WIRE';
  var MAX_TIME = 20;
  // 修正2: 経路を短く（ROWS 7 → 3）。修正1: 縦グリッドを全域に
  var CELL = 240, COLS = 3, ROWS = 5;
  var GRID_X = (W - COLS * CELL) / 2, GRID_Y = 320;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var path, playerIdx, done, won, timeLeft;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function buildPath() {
    var p = [{ c: 0, r: 0 }], c = 0, r = 0, visited = { '0,0': true };
    while (c < COLS - 1 || r < ROWS - 1) {
      var options = [];
      if (c < COLS - 1) options.push({ dc: 1, dr: 0 });
      if (r < ROWS - 1) options.push({ dc: 0, dr: 1 });
      var valid = options.filter(function(o) {
        var nc = c + o.dc, nr = r + o.dr;
        return nc < COLS && nr < ROWS && !visited[nc + ',' + nr];
      });
      if (valid.length === 0) break;
      valid.sort(function() { return Math.random() - 0.5; });
      c += valid[0].dc; r += valid[0].dr; visited[c + ',' + r] = true;
      p.push({ c: c, r: r });
    }
    return p;
  }

  function nodePos(idx) {
    var n = path[idx];
    return { x: GRID_X + n.c * CELL + CELL / 2, y: GRID_Y + n.r * CELL + CELL / 2 };
  }

  function initGame() { path = buildPath(); playerIdx = 0; done = false; won = false; timeLeft = MAX_TIME; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success; won = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 20) : playerIdx * 50;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var dc = 0, dr = 0;
    if (dir === 'right') dc = 1; if (dir === 'left') dc = -1;
    if (dir === 'down') dr = 1; if (dir === 'up') dr = -1;
    var cur = path[playerIdx], nc = cur.c + dc, nr = cur.r + dr;
    if (playerIdx + 1 < path.length) {
      var nx = path[playerIdx + 1];
      if (nx.c === nc && nx.r === nr) {
        playerIdx++;
        game.audio.play('se_tap', 0.5);
        if (playerIdx >= path.length - 1) finish(true);
        return;
      }
    }
    if (playerIdx - 1 >= 0) {
      var pv = path[playerIdx - 1];
      if (pv.c === nc && pv.r === nr) { playerIdx--; game.audio.play('se_tap', 0.3); return; }
    }
    finish(false);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  // 世界観: 爆弾の配線をたどる解体作業。回路を正しくなぞって起爆を止める。
  function background() {
    game.draw.clear('#0a0a02');
    // 回路基板（緑のランド＋トレース）
    var fx = GRID_X - 40, fy = GRID_Y - 40, fw = COLS * CELL + 80, fh = ROWS * CELL + 80;
    game.draw.rect(fx, fy, fw, fh, '#0a2a0a');
    game.draw.rect(fx + 12, fy + 12, fw - 24, fh - 24, '#031403');
    // ランダムな飾りトレース
    for (var i = 0; i < 6; i++) {
      var ty = fy + 60 + i * (fh - 120) / 6;
      game.draw.rect(fx + 20, snap(ty), fw - 40, 3, C.b, 0.2);
    }
    txt('DEFUSE WIRING', W / 2, fy - 8, 36, C.b);
  }

  function drawWire() {
    for (var gc = 0; gc <= COLS; gc++)
      for (var gr = 0; gr <= ROWS; gr++)
        game.draw.rect(GRID_X + gc * CELL - 4, GRID_Y + gr * CELL - 4, 8, 8, C.d, 0.5);
    for (var i = 0; i < path.length - 1; i++) {
      var p1 = nodePos(i), p2 = nodePos(i + 1);
      var traveled = i < playerIdx;
      game.draw.line(p1.x, p1.y, p2.x, p2.y, traveled ? C.b : C.e, traveled ? 16 : 10);
    }
    var sp = nodePos(0), ep = nodePos(path.length - 1);
    game.draw.rect(sp.x - 24, sp.y - 24, 48, 48, C.b); txt('S', sp.x, sp.y, 36, C.g);
    game.draw.rect(ep.x - 24, ep.y - 24, 48, 48, won ? C.b : C.f); txt('G', ep.x, ep.y, 36, C.g);
    var pp = nodePos(playerIdx);
    game.draw.rect(pp.x - 32, pp.y - 32, 64, 64, C.c);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!path) initGame();
      background();
      drawWire();
      txt(GAME_TITLE,  W / 2, H * 0.12, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 42, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
    }

    // ---- draw ----
    background();
    drawWire();
    timeBar();
    txt('SCORE ' + String(playerIdx * 50).padStart(6, '0'), W / 2, 96, 48, C.g);
    txt('FOLLOW THE WIRE!', W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
