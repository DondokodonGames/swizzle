// D-20222026-0001-orchard-crate-drop.js
// オーチャード・クレートドロップ — 5本の木箱シュートに同じ大きさの果物を落として重ね、隣り合う同格を合体させて育てる
// 操作: 画面下の5本のシュートのいずれかをタップして次の果物を落とす
// 終わり: 規定の段位の果物を1つ作れば成功。いずれかのシュートが山積みで溢れたら失敗
// @mechanic: drop_timing
// @theme: orchard_crate_drop
// 世界観: 収穫期の果樹園倉庫で、仕分け係が5本の木箱シュートへ次々届く果物を落とし、同じ大きさ同士を重ねて合体させながら溢れさせずに育てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した最高段位
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: つやのあるグラデーション球体、濃い縁取りでプリレンダ感
  var C = {
    bg: '#5a3018', bg2: '#2a1608', crate: '#8a5a2a', crateDark: '#5a3818',
    good: '#3fbf6f', bad: '#ff4d5e', gold: '#ffcf3a', ink: '#20100a', white: '#fff6ea',
  };
  var FRUIT_COL = ['#ff6a6a', '#ffb04a', '#ffe14d', '#8ade6a', '#5ad0e0', '#c07aff'];

  var GAME_TITLE = 'CRATE DROP';
  var COLS = 5;
  var COL_W = 168;
  var BOARD_X0 = W * 0.5 - (COLS * COL_W) / 2;
  var FLOOR_Y = H * 0.86;
  var SLOT_H = 96;
  var MAX_STACK = 5;
  var TARGET_TIER = 5;
  var TIME_LIMIT = 16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#100a04', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PACKER_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
  }

  function colX(c) { return BOARD_X0 + c * COL_W + COL_W / 2; }

  var cols, maxTier, nextTier, roundClock, fallAnim;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    cols = []; for (var i = 0; i < COLS; i++) cols.push([]);
    maxTier = 1; nextTier = 1 + Math.floor(Math.random() * 2);
    roundClock = 0; fallAnim = null; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function dropInto(c) {
    if (finished || ready > 0) return;
    var stack = cols[c];
    var tier = nextTier;
    game.audio.play('se_tap', 0.1);
    fallAnim = { c: c, tier: tier, y: H * 0.2, ty: FLOOR_Y - stack.length * SLOT_H };
    stack.push(tier);
    nextTier = 1 + Math.floor(Math.random() * 2);
    // カスケード合体判定
    var merges = 0;
    while (stack.length >= 2 && stack[stack.length - 1] === stack[stack.length - 2]) {
      var t = stack.pop(); stack.pop();
      stack.push(t + 1);
      merges++;
      if (stack[stack.length - 1] > maxTier) maxTier = stack[stack.length - 1];
    }
    var p = { x: colX(c), y: FLOOR_Y - stack.length * SLOT_H };
    if (merges > 0) {
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_good', 0.4);
      if (maxTier >= Math.ceil(TARGET_TIER / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, H * 0.25, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      game.audio.play('se_break', 0.25);
    }
    if (maxTier >= TARGET_TIER) { succeedNow(); return; }
    if (stack.length > MAX_STACK) {
      hitStop = 0.3; shake = 0.26;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      failNow();
    }
  }

  function succeedNow() {
    if (finished) return;
    ok = true; finished = true; hitStop = 0.24;
    game.fx.burst(W / 2, FLOOR_Y - 200, { color: C.gold, count: 26, speed: 420 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    if (finished) return;
    ok = false; finished = true; hitStop = 0.3;
    game.audio.play('se_failure', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var c = Math.floor((x - BOARD_X0) / COL_W);
      if (c >= 0 && c < COLS) dropInto(c);
      else { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.15); }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene() {
    for (var c = 0; c <= COLS; c++) {
      game.draw.rect(BOARD_X0 + c * COL_W - 6, H * 0.4, 12, FLOOR_Y - H * 0.4 + 20, C.crate);
    }
    game.draw.rect(BOARD_X0 - 6, FLOOR_Y + 14, COLS * COL_W + 12, 18, C.crateDark);
    for (var i = 0; i < COLS; i++) {
      var stack = cols[i];
      for (var s = 0; s < stack.length; s++) {
        var tier = stack[s];
        var col = FRUIT_COL[Math.min(tier - 1, FRUIT_COL.length - 1)];
        var r = 30 + tier * 8;
        var py = FLOOR_Y - s * SLOT_H - r * 0.9;
        game.draw.circle(colX(i), py, r, col);
        game.draw.circle(colX(i) - r * 0.3, py - r * 0.3, r * 0.3, '#ffffff', 0.35);
      }
    }
    if (fallAnim) {
      var col2 = FRUIT_COL[Math.min(fallAnim.tier - 1, FRUIT_COL.length - 1)];
      game.draw.circle(colX(fallAnim.c), fallAnim.y, 30 + fallAnim.tier * 8, col2);
    }
    var nr = 30 + nextTier * 8;
    var bob = Math.sin(game.time.elapsed * 2.4) * 26;
    game.draw.circle(W * 0.5, H * 0.16 + bob, nr, FRUIT_COL[Math.min(nextTier - 1, FRUIT_COL.length - 1)]);
    var pf = Math.floor(game.time.elapsed * 4) % 2;
    var packerBob = Math.sin(game.time.elapsed * 3.1) * 22;
    game.draw.sprite(PACKER_F[pf], { '#': C.ink }, W * 0.86 + packerBob, H * 0.86, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: colX(2), gy: H * 0.95, press: false, target: 2 };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    roundClock += dt;
    var seg = cyc % 1.3;
    var bestCol = 0, bestLen = 999;
    for (var i = 0; i < COLS; i++) {
      if (cols[i].length > 0 && cols[i][cols[i].length - 1] === nextTier && cols[i].length < bestLen) { bestLen = cols[i].length; bestCol = i; }
    }
    if (bestLen === 999) bestCol = Math.floor(Math.random() * COLS);
    var tx = colX(bestCol);
    if (seg < 0.9) {
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.press = false;
    } else {
      demo.press = true;
      if (!demo.done) { demo.done = true; dropInto(bestCol); }
    }
    if (seg < 0.05) demo.done = false;
  }

  game.onUpdate(function(dt) {
    if (fallAnim) {
      fallAnim.y += (fallAnim.ty - fallAnim.y) * Math.min(1, dt * 12);
      if (Math.abs(fallAnim.y - fallAnim.ty) < 4) fallAnim = null;
    }
    if (state === S.ATTRACT) {
      if (cols === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? 'T' + game.best : '-'), W / 2, H * 0.1, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 42, ok ? C.good : C.bad);
      txt('T' + maxTier + ' / ' + 'T' + TARGET_TIER, W / 2, H * 0.1, 26, C.gold);
      if (!ok) txt('あと1段!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(maxTier, { maxTier: maxTier, target: TARGET_TIER });
        else game.end.failure({ maxTier: maxTier, target: TARGET_TIER });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) failNow();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt('T' + maxTier + ' / ' + 'T' + TARGET_TIER, W / 2, H * 0.04, 26, C.white);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 96, W - 120, 14, '#00000055', 1);
    game.draw.rect(60, 96, (W - 120) * barPct, 14, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.5]], { tempo: 122, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
