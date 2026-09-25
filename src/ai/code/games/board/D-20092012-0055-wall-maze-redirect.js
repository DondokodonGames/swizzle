// D-20092012-0055-wall-maze-redirect.js
// ウォールメイズ迎撃 — 資材の通る細道からはみ出さず指でなぞって防壁を築き、迫る侵入者を逸らす
// 操作: 表示された細道(資材レーン)からはみ出さないよう指でなぞって、防壁を最後まで築く
// 終わり: 侵入者が拠点に着く前に防壁を築き終えれば成功。細道からはみ出す/間に合わなければ失敗
// @mechanic: guide_path
// @theme: block_fortress_wall
// 世界観: 積み木のような掘っ立て砦。資材レーンを指でなぞって防壁を築き、まっすぐ迫る侵入者を拠点の手前で逸らす石工の仕事
// 残るもの: 正誤(CLEAR/GAME OVER) + 築けた防壁の進捗%
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: ブロック状の塊、太い輪郭、疑似3Dの段差影
  var C = {
    bg: '#3a3020', bg2: '#221c14', laneEdge: '#5a4a30', lane: '#7a6640',
    wallBlock: '#c98a4a', wallEdge: '#7a4a1e', enemy: '#e0524f', enemyDark: '#8a2a24',
    base: '#4a8acc', good: '#5fd47a', bad: '#e0524f', gold: '#ffd23f', white: '#f2e8d0', ink: '#181208',
  };

  var GAME_TITLE = 'WALL MAZE';
  var HALF = 68;
  var ENEMY_DUR = 6.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var LANE = [
    { x: W * 0.16, y: H * 0.34 },
    { x: W * 0.5, y: H * 0.47 },
    { x: W * 0.84, y: H * 0.60 },
  ];
  var ENEMY_PATH = [{ x: W * 0.5, y: H * 0.16 }, { x: W * 0.5, y: H * 0.74 }];

  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < LANE.length; i++) {
    var d = Math.hypot(LANE[i].x - LANE[i - 1].x, LANE[i].y - LANE[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY_SPR = ['.##.', '####', '.##.', '#..#'];
  var BASE_SPR = ['#####', '#.#.#', '#####'];

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 3, '#00000012');
    ambient(t);
  }

  function drawLane() {
    for (var j = 1; j < LANE.length; j++) {
      game.draw.line(LANE[j - 1].x, LANE[j - 1].y, LANE[j].x, LANE[j].y, C.laneEdge, HALF * 2 + 10);
      game.draw.line(LANE[j - 1].x, LANE[j - 1].y, LANE[j].x, LANE[j].y, C.lane, HALF * 2);
    }
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var tt = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * tt, cy = ay + vy * tt;
    return { dist: Math.hypot(px - cx, py - cy), t: tt };
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < LANE.length; i++) {
      var r = distToSeg(px, py, LANE[i - 1].x, LANE[i - 1].y, LANE[i].x, LANE[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function enemyPos(p) {
    return { x: ENEMY_PATH[0].x + (ENEMY_PATH[1].x - ENEMY_PATH[0].x) * p, y: ENEMY_PATH[0].y + (ENEMY_PATH[1].y - ENEMY_PATH[0].y) * p };
  }

  var progress, wallDone, enemyT, done, endWait, finished, ready, hitStop, shake, cursorX, cursorY, deflected;

  function initGame() {
    progress = 0; wallDone = false; enemyT = 0;
    done = false; endWait = 0; finished = false; deflected = false;
    ready = 0.8; hitStop = 0; shake = 0;
    cursorX = LANE[0].x; cursorY = LANE[0].y;
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished || wallDone) return;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; hitStop = 0.2;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) progress = r.len;
    cursorX = x; cursorY = y;
    game.audio.play('se_tap', 0.03);
    if (progress >= TOTAL_LEN - 16 && !wallDone) {
      wallDone = true;
      hitStop = 0.1;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 340 });
      game.audio.play('se_success', 0.4);
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) onDrag(x, y); });
  game.onMove(function(x, y) { if (state === S.PLAYING) onDrag(x, y); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawWall() {
    var acc = 0;
    for (var i = 1; i < LANE.length; i++) {
      var segStart = acc, segEnd = acc + SEG_LEN[i - 1];
      if (progress > segStart) {
        var p = Math.min(1, (progress - segStart) / SEG_LEN[i - 1]);
        var ex = LANE[i - 1].x + (LANE[i].x - LANE[i - 1].x) * p;
        var ey = LANE[i - 1].y + (LANE[i].y - LANE[i - 1].y) * p;
        game.draw.line(LANE[i - 1].x, LANE[i - 1].y, ex, ey, C.wallEdge, 30);
        game.draw.line(LANE[i - 1].x, LANE[i - 1].y, ex, ey, C.wallBlock, 20);
      }
      acc = segEnd;
    }
  }

  function drawEnemy(p, hurt) {
    if (p >= 1 && deflected) return;
    var pos = enemyPos(Math.min(1, p));
    var near = p > 0.7;
    if (near) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(pos.x, pos.y, 40, C.enemy, 0.3);
    }
    game.draw.sprite(ENEMY_SPR, { '#': hurt ? C.white : C.enemy }, pos.x, pos.y, 14, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LANE[0].x, gy: LANE[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { progress = 0; wallDone = false; enemyT = 0; deflected = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 2.6) * TOTAL_LEN);
    var acc = 0, px = LANE[0].x, py = LANE[0].y;
    for (var i = 1; i < LANE.length; i++) {
      if (target <= acc + SEG_LEN[i - 1]) {
        var tt = SEG_LEN[i - 1] > 0 ? (target - acc) / SEG_LEN[i - 1] : 0;
        px = LANE[i - 1].x + (LANE[i].x - LANE[i - 1].x) * tt;
        py = LANE[i - 1].y + (LANE[i].y - LANE[i - 1].y) * tt;
        break;
      }
      acc += SEG_LEN[i - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 2.6;
    progress = Math.max(progress || 0, target);
    if (target >= TOTAL_LEN - 16 && !wallDone) { wallDone = true; deflected = true; game.feedback.good(px, py, { text: 'GOOD', color: C.good }); game.audio.play('se_good', 0.2); }
    enemyT = Math.min(ENEMY_DUR, cyc / 4.0 * ENEMY_DUR);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      stepDemo(dt);
      drawLane();
      drawWall();
      drawEnemy(enemyT / ENEMY_DUR, false);
      game.draw.sprite(BASE_SPR, { '#': C.base }, ENEMY_PATH[1].x, ENEMY_PATH[1].y + Math.sin(t * 2) * 4, 16, { anchor: 'center' });
      game.draw.circle(demo.gx, demo.gy, 14, C.gold);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawLane();
      drawWall();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.11, 30, C.gold);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      enemyT += dt;
      if (enemyT / ENEMY_DUR >= 1) {
        if (wallDone) {
          deflected = true; ok = true; finished = true;
          game.feedback.good(ENEMY_PATH[1].x, ENEMY_PATH[1].y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.3);
          finish();
        } else {
          ok = false; finished = true; hitStop = 0.35; shake = 0.35;
          game.feedback.bad(ENEMY_PATH[1].x, ENEMY_PATH[1].y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      } else if (wallDone && !finished) {
        ok = true; finished = true;
        game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 40 });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawLane();
    drawWall();
    if (!finished) drawEnemy(enemyT / ENEMY_DUR, false);
    game.draw.sprite(BASE_SPR, { '#': C.base }, ENEMY_PATH[1].x, ENEMY_PATH[1].y + Math.sin(t * 2) * 4, 16, { anchor: 'center' });
    if (!wallDone && !finished) game.draw.circle(cursorX, cursorY, 14, C.gold);

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, enemyT / ENEMY_DUR), 16, C.enemy);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.85, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
