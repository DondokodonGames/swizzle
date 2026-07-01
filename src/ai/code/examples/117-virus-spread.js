// 117-virus-spread.js
// ウイルス拡散 — じわじわ広がる感染をワクチンでブロックする緊張のリアルタイム戦略
// 操作: タップでワクチン設置（接触した感染セルを無効化）
// 成功: 50%以上のセルを守り抜く  失敗: 60%感染されたら終了 or 8秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、バイオハザード端末） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VIRUS SPREAD';
  var HOW_TO_PLAY = 'TAP TO PLACE VACCINE · STOP THE SPREAD';
  var MAX_TIME = 8;               // 修正2: 30 → 8（サバイバル短縮）
  var TOP    = 220;
  var BOTTOM = H - 180;
  var SUCCESS_PCT = 0.50;         // 修正2: 60% → 50%
  var LOSE_PCT    = 0.60;         // 修正2: 75% → 60%

  var COLS = 12, ROWS = 16;
  var TOTAL = COLS * ROWS;
  var CELL = snap(Math.min((W - 80) / COLS, (BOTTOM - TOP - 60) / ROWS));
  var GRID_W = COLS * CELL, GRID_H = ROWS * CELL;
  var GRID_X = snap((W - GRID_W) / 2);
  var GRID_Y = snap(TOP + 60);

  var SPREAD_INTERVAL = 0.9;      // 修正2: 感染をゆるやかに

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, spreadTimer, timeLeft, done, vaccines;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) {
          game.draw.rect(cx + px, cy + py, step, step, color, alpha);
        }
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) {
      game.draw.rect(0, sy, W, 2, '#000000', 0.18);
    }
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#003300');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    // 端末フレーム
    game.draw.rect(GRID_X - 16, GRID_Y - 16, GRID_W + 32, GRID_H + 32, C.d, 0.5);
    game.draw.rect(GRID_X - 16, GRID_Y - 16, GRID_W + 32, 8, C.a);
  }

  function cellIdx(col, row) { return row * COLS + col; }

  // ── セルスプライト（多矩形でキャラクター性） ──
  function drawCell(cx, cy, stt) {
    var s = CELL - 8;
    if (stt === 0) {          // 健康（淡い緑ブロック）
      game.draw.rect(cx + 4, cy + 4, s, s, C.d, 0.7);
    } else if (stt === 1) {   // 感染（脈動する赤 + 菌の核）
      var puls = Math.floor(game.time.elapsed * 8) % 2 === 0 ? 1 : 0.7;
      game.draw.rect(cx + 4, cy + 4, s, s, C.f, puls);
      game.draw.rect(cx + CELL / 2 - 8, cy + CELL / 2 - 8, 16, 16, C.e, 1);
      game.draw.rect(cx + 8, cy + 8, 8, 8, C.e, puls);
      game.draw.rect(cx + CELL - 24, cy + CELL - 24, 8, 8, C.e, puls);
    } else {                  // ワクチン（緑の十字盾）
      game.draw.rect(cx + 4, cy + 4, s, s, C.a, 0.9);
      game.draw.rect(cx + CELL / 2 - 4, cy + 12, 8, CELL - 24, C.g);
      game.draw.rect(cx + 12, cy + CELL / 2 - 4, CELL - 24, 8, C.g);
    }
  }

  // ── 初期化 ──
  function initGame() {
    grid = [];
    for (var i = 0; i < TOTAL; i++) grid.push(0);
    // 感染は1セルから（易化）
    grid[Math.floor(Math.random() * TOTAL)] = 1;
    spreadTimer = SPREAD_INTERVAL;
    timeLeft = MAX_TIME;
    done = false;
    vaccines = 30;
  }

  function spreadInfection() {
    var next = [];
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        if (grid[cellIdx(col, row)] !== 1) continue;
        var nb = [[col-1,row],[col+1,row],[col,row-1],[col,row+1]];
        for (var ni = 0; ni < nb.length; ni++) {
          var nc = nb[ni][0], nr = nb[ni][1];
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && grid[cellIdx(nc, nr)] === 0) {
            next.push(cellIdx(nc, nr));
          }
        }
      }
    }
    for (var k = 0; k < next.length; k++) grid[next[k]] = 1;
  }

  function counts() {
    var inf = 0, vac = 0, hea = 0;
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] === 1) inf++;
      else if (grid[i] === 2) vac++;
      else hea++;
    }
    return { inf: inf, vac: vac, hea: hea };
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    var c = counts();
    resultSuccess = success;
    finalScore = success
      ? Math.round((c.hea + c.vac) / TOTAL * 800 + Math.ceil(timeLeft) * 20)
      : Math.round(c.vac * 10);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING
    if (done || vaccines <= 0) return;
    var col = Math.floor((x - GRID_X) / CELL);
    var row = Math.floor((y - GRID_Y) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var idx = cellIdx(col, row);
    if (grid[idx] === 0 || grid[idx] === 1) {
      grid[idx] = 2;
      vaccines--;
      game.audio.play('se_tap', 0.6);
      // 隣接感染セルを治療
      var nb = [[col-1,row],[col+1,row],[col,row-1],[col,row+1]];
      for (var ni = 0; ni < nb.length; ni++) {
        var nc = nb[ni][0], nr = nb[ni][1];
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && grid[cellIdx(nc, nr)] === 1) {
          grid[cellIdx(nc, nr)] = 0;
        }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      // デモ: 中央から広がる感染のイメージ
      for (var r = 0; r < ROWS; r++) {
        for (var cc = 0; cc < COLS; cc++) {
          var d = Math.abs(cc - COLS / 2) + Math.abs(r - ROWS / 2);
          var wave = (game.time.elapsed * 4) % 14;
          var st = d < wave ? (d < wave - 3 ? 2 : 1) : 0;
          drawCell(GRID_X + cc * CELL, GRID_Y + r * CELL, st);
        }
      }
      txt(GAME_TITLE,  W / 2, H * 0.12, 84, C.a);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 66, C.e);
        txt('TAP TO START', W / 2, H * 0.88, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#448844');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONTAINED!' : 'OUTBREAK', W / 2, H * 0.35, 80, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      spreadTimer -= dt;
      if (spreadTimer <= 0) { spreadTimer = SPREAD_INTERVAL; spreadInfection(); }

      var c = counts();
      if (c.inf / TOTAL >= LOSE_PCT) { finish(false); return; }
      if (timeLeft <= 0) {
        finish((c.hea + c.vac) / TOTAL >= SUCCESS_PCT);
        return;
      }
    }

    // ---- 描画 ----
    background();
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        drawCell(GRID_X + col * CELL, GRID_Y + row * CELL, grid[cellIdx(col, row)]);
      }
    }

    var c2 = counts();
    var infPct = Math.round(c2.inf / TOTAL * 100);
    // 感染ゲージ（下部）
    var barW = GRID_W;
    game.draw.rect(GRID_X, BOTTOM - 40, barW, 32, '#003300');
    game.draw.rect(GRID_X, BOTTOM - 40, snap(barW * c2.inf / TOTAL), 32, C.f, 0.9);
    game.draw.rect(GRID_X + snap(barW * LOSE_PCT) - 4, BOTTOM - 48, 8, 48, C.e);

    txt('INFECT ' + infPct + '%', W / 2 - 220, BOTTOM - 80, 40, C.f);
    txt('VAX ' + vaccines, W / 2 + 220, BOTTOM - 80, 40, C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
