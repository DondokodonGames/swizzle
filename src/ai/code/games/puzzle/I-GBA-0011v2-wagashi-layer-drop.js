// I-GBA-0011v2-wagashi-layer-drop.js
// ワガシ・レイヤードロップ — 左右に行き来する土台の真上に来た瞬間に餡の層を落とし、5段ぴったり重ねる
// 操作: 上で構えた層は画面のどこかをタップすると真下に落ちる。はみ出した分は切り落とされて次の層が細くなる。ぴったりなら幅が少し戻る
// 終わり: 15秒以内に5段重ねればCLEAR。層が土台から完全に外れる/時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: wagashi_layer_prep_table
// 世界観: 和菓子屋の仕込み台で、菓子職人が行き来する土台の上に小豆餡・白餡・抹茶・桜・栗の層を1枚ずつ落とし、5段の棹物をずれなく重ねて仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 重ねた段数・平均ズレpx・PERFECT数
// スタイル: 90s LOW POLY

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 輪郭は line、面は横ストリップ塗り。頂点ジッターと奥のフォグ
  var STYLE = { bg: ['#3d4a6b', '#8fa3b8', '#d9cdb4'], main: ['#5b2a3a', '#efe6d2', '#7fa35a'], accent: ['#f2a7b8', '#e0b04a'] };
  var LAYERS = [
    { top: '#7a3b4e', side: '#4a1f2d' },  // 小豆餡
    { top: '#f4ecdc', side: '#c9bea6' },  // 白餡
    { top: '#95b86a', side: '#5c7a3c' },  // 抹茶
    { top: '#f5b8c6', side: '#c7849a' },  // 桜
    { top: '#ecc15a', side: '#b08a2e' },  // 栗
  ];
  var INK = '#1e1a22', CREAM = '#fff6e0', RED = '#d84a4a', GOLD = '#ffd35a';

  var TITLE = 'LAYER DROP';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var FULL_W = 320, LAYER_H = 46, DEPTH = 26;
  var RAIL_Y = H * 0.66;             // 土台の上面
  var HOLD_GAP = 150;                // 構えの高さ(最上段からの距離)
  var AMP = 270;
  var GRAV = 6500;

  var ST = { ATTRACT: 'a', PLAYING: 'p', RESULT: 'r' };
  var st = ST.ATTRACT;

  var MAKER = [
    ['...www...', '..wwwww..', '..sssss..', '..s.s.s..', '...sss...', '.wwwwwww.', 'wwwwwwwww', 's.wwwww.s', '..wwwww..'],
    ['...www...', '..wwwww..', '..sssss..', '..s.s.s..', '...sss...', '.wwwwwww.', 'swwwwwwws', '..wwwww..', '..wwwww..'],
  ];
  var MAKER_PAL = { w: '#f2f0ea', s: '#e3bf98' };
  var BOWL = ['.#######.', '#########', '.#######.', '..#####..'];

  // ── 描画: 低ポリの直方体(上面=平行四辺形を横ストリップで) ──
  function slab(cx, baseY, w, col, jit) {
    var j = jit ? (Math.floor(game.time.elapsed * 12) % 2) : 0;
    var x0 = cx - w / 2;
    // 前面
    game.draw.rect(x0, baseY - LAYER_H, w, LAYER_H, col.side);
    // 上面(奥へずれる平行四辺形)
    for (var k = 0; k < DEPTH; k += 2) game.draw.rect(x0 + k * 0.8 + j, baseY - LAYER_H - k - 2, w, 2, col.top);
    // 右側面(細いストリップ)
    for (var m = 0; m < DEPTH; m += 2) game.draw.rect(x0 + w + m * 0.8, baseY - LAYER_H - m, 2, LAYER_H, col.side, 0.8);
    // 輪郭線
    game.draw.line(x0, baseY - LAYER_H, x0 + w, baseY - LAYER_H, INK, 2);
    game.draw.line(x0, baseY, x0 + w, baseY, INK, 2);
    game.draw.line(x0, baseY - LAYER_H, x0 + DEPTH * 0.8 + j, baseY - LAYER_H - DEPTH, INK, 2);
    game.draw.line(x0 + w, baseY - LAYER_H, x0 + w + DEPTH * 0.8, baseY - LAYER_H - DEPTH, INK, 2);
    game.draw.line(x0 + DEPTH * 0.8 + j, baseY - LAYER_H - DEPTH, x0 + w + DEPTH * 0.8, baseY - LAYER_H - DEPTH, INK, 2);
  }

  function drawRoom() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, STYLE.bg[1]], [0.64, STYLE.bg[2]], [1, '#6b5a44']]);
    // 奥の暖簾と棚(フォグで霞む)
    for (var i = 0; i < 5; i++) {
      game.draw.rect(90 + i * 190, 260, 150, 260, i % 2 ? '#3a4f7a' : '#2e3f63');
      game.draw.rect(90 + i * 190, 260 + 230 + Math.sin(game.time.elapsed * 1.5 + i) * 6, 150, 30, '#2e3f63');
    }
    game.draw.rect(0, 250, W, 300, '#c8d4e0', 0.35);
    // 仕込み台(手前へ広がる台形をストリップで)
    for (var y = 0; y < 200; y += 3) {
      var inset = 120 - y * 0.6;
      game.draw.rect(inset, RAIL_Y + 20 + y, W - inset * 2, 3, y % 12 < 6 ? '#b38b5d' : '#a67e52');
    }
    game.draw.line(120, RAIL_Y + 20, W - 120, RAIL_Y + 20, INK, 3);
    // レール
    game.draw.rect(W / 2 - AMP - 200, RAIL_Y + 6, (AMP + 200) * 2, 10, '#5a5a66');
  }

  function drawTray(x) {
    game.draw.rect(x - FULL_W / 2 - 40, RAIL_Y - 6, FULL_W + 80, 14, '#6a4a2e');
    game.draw.line(x - FULL_W / 2 - 40, RAIL_Y - 6, x + FULL_W / 2 + 40, RAIL_Y - 6, INK, 2);
  }

  function drawStack(sx, list) {
    drawTray(sx);
    for (var i = 0; i < list.length; i++) slab(sx + list[i].off, RAIL_Y - 6 - i * LAYER_H, list[i].w, LAYERS[i % LAYERS.length], i === list.length - 1);
  }

  function drawMaker(cx, holdY, frame) {
    game.draw.sprite(MAKER[frame], MAKER_PAL, cx - 250, holdY - 60, 16, { anchor: 'center' });
    game.draw.line(cx - 190, holdY - 40, cx - 60, holdY - 30, '#8a6a4a', 10);
  }

  function drawBowls(nextIdx) {
    for (var i = 0; i < NEEDED; i++) {
      var x = W / 2 + (i - 2) * 180, y = H * 0.9;
      var done = i < nextIdx;
      game.draw.sprite(BOWL, { '#': done ? '#6a6a74' : '#d9d4c8' }, x, y, 16, { anchor: 'center' });
      if (!done) game.draw.rect(x - 56, y - 36, 112, 18, LAYERS[i].top);
      if (i === nextIdx) game.draw.rect(x - 80, y + 40, 160, 8, GOLD, 0.6 + 0.4 * Math.sin(game.time.elapsed * 8));
    }
  }

  function say(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 土台の動き(段が進むほど速く、後半は緩急) ──
  function railX(ph, warp) { return W / 2 + AMP * Math.sin(ph + warp * Math.sin(ph * 0.5)); }
  function railSpeed(idx) { return 1.25 + idx * 0.38; }

  // 落とした層がどこに乗るか(プレイ・デモ共通)。戻り値 {ok, off, w, delta}
  function landLayer(list, sx, dropX, width) {
    var top = list.length ? list[list.length - 1] : { off: 0, w: FULL_W };
    var rel = dropX - sx;                  // 土台中心からの位置
    var delta = rel - top.off;
    var ad = Math.abs(delta);
    if (ad >= Math.min(width, top.w)) return { ok: false, delta: delta };
    if (ad <= 10) return { ok: true, off: top.off, w: Math.min(FULL_W, width + 8), delta: delta, perfect: true };
    // はみ出し分を切り落とす
    var left = Math.max(rel - width / 2, top.off - top.w / 2);
    var right = Math.min(rel + width / 2, top.off + top.w / 2);
    return { ok: true, off: (left + right) / 2, w: right - left, delta: delta, perfect: false };
  }

  // ── 状態 ──
  var stack, holdW, falling, railPh, warp, timeLeft, ready, halt, over, won, endT, score, perfects, sumOff, prevBest, trimmed;

  function initGame() {
    stack = []; holdW = FULL_W; falling = null; railPh = 0; warp = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    halt = null; over = false; won = false; endT = 0; score = 0; perfects = 0; sumOff = 0; trimmed = [];
    prevBest = game.best || 0;
  }

  function holdY() { return RAIL_Y - 6 - stack.length * LAYER_H - HOLD_GAP; }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (st === ST.ATTRACT) { game.audio.play('se_coin', 0.45); st = ST.PLAYING; initGame(); return; }
    if (st === ST.RESULT) { game.audio.play('se_tap', 0.2); st = ST.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || falling || ready > 0) { game.audio.play('se_tap', 0.06); game.fx.burst(x, y, { color: CREAM, count: 3, speed: 60 }); return; }
    game.audio.play('se_jump', 0.3);
    falling = { y: holdY(), vy: 0, w: holdW, idx: stack.length };
  });

  function settle(res) {
    var idx = stack.length;
    if (!res.ok) {
      halt = { t: 0.45, max: 0.45, x: W / 2 + res.delta * 0.2, y: RAIL_Y - 6 - idx * LAYER_H, w: falling.w, idx: idx };
      falling = null;
      return;
    }
    stack.push({ off: res.off, w: res.w });
    holdW = res.w;
    var ad = Math.abs(Math.round(res.delta));
    sumOff += res.perfect ? 0 : ad;
    var sxNow = railX(railPh, warp);
    var fx = sxNow + res.off, fy = RAIL_Y - 6 - idx * LAYER_H - 40;
    if (res.perfect) {
      perfects++;
      score += 200;
      game.feedback.good(fx, fy, { text: 'PERFECT', color: GOLD, count: 18 });
      game.audio.play('se_coin', 0.3);
    } else {
      score += Math.max(20, 120 - ad);
      game.feedback.good(fx, fy, { text: ad + 'px', color: CREAM, count: 10 });
      trimmed.push({ x: fx + (res.delta > 0 ? res.w / 2 + 20 : -res.w / 2 - 20), y: fy + 40, vy: -200, c: LAYERS[idx].top, t: 0.8 });
    }
    falling = null;
    if (stack.length === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.22, { color: GOLD, size: 60 }); game.audio.play('se_milestone', 0.35); }
    if (stack.length >= NEEDED) { won = true; finish(); }
  }

  function finish() {
    if (over) return;
    over = true; endT = 1.5;
    if (won) score += Math.floor(timeLeft * 30);
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
  }

  // ── ATTRACT: 土台の動きを読んで少し早めに落とす実演 ──
  var demo = { t: 0, stack: [], fall: null, gx: W / 2, gy: H * 0.8, press: 0, ph: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { demo.stack = []; demo.fall = null; demo.ph = 0.4; }
    demo.ph += dt * railSpeed(1);
    var idx = demo.stack.length;
    var sx = railX(demo.ph, 0);
    var hy = RAIL_Y - 6 - idx * LAYER_H - HOLD_GAP;
    // 落下中に土台が中央へ来るよう、中心の少し手前で落とす
    if (!demo.fall && idx < 3 && cyc > 0.4) {
      var fallT = Math.sqrt(2 * HOLD_GAP / GRAV);
      var future = railX(demo.ph + fallT * railSpeed(1), 0);
      if (Math.abs(future - W / 2) < 12) { demo.fall = { y: hy, vy: 0 }; demo.press = 0.2; game.audio.play('se_jump', 0.1); }
    }
    if (demo.fall) {
      demo.fall.vy += GRAV * dt; demo.fall.y += demo.fall.vy * dt;
      var land = RAIL_Y - 6 - idx * LAYER_H;
      if (demo.fall.y >= land) {
        var r = landLayer(demo.stack, sx, W / 2, FULL_W);
        demo.stack.push({ off: r.ok ? r.off : 0, w: r.ok ? r.w : FULL_W });
        demo.fall = null;
        game.feedback.good(W / 2, land - 60, { text: 'PERFECT', color: GOLD, count: 8, volume: 0.2 });
      }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.gy = H * 0.8 + (demo.press > 0 ? 12 : -8);
    return sx;
  }

  game.onUpdate(function (dt) {
    var frame = Math.floor(game.time.elapsed * 2) % 2;
    for (var q = trimmed.length - 1; q >= 0; q--) {
      var tr = trimmed[q];
      tr.vy += 1800 * dt; tr.y += tr.vy * dt; tr.t -= dt;
      if (tr.t <= 0) trimmed.splice(q, 1);
    }

    if (st === ST.ATTRACT) {
      var dsx = stepDemo(dt);
      drawRoom();
      drawStack(dsx, demo.stack);
      var dIdx = demo.stack.length;
      var dhy = demo.fall ? demo.fall.y : RAIL_Y - 6 - dIdx * LAYER_H - HOLD_GAP;
      if (dIdx < 3) slab(W / 2, dhy, FULL_W, LAYERS[dIdx], false);
      drawMaker(W / 2, RAIL_Y - 6 - dIdx * LAYER_H - HOLD_GAP, frame);
      drawBowls(dIdx);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 16 });
      say(TITLE, W / 2, H * 0.07, 70, CREAM);
      say('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 36, GOLD);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.975, 40, GOLD);
      else say('INSERT COIN', W / 2, H * 0.975, 34, CREAM);
      return;
    }

    if (st === ST.RESULT) {
      drawRoom();
      drawStack(W / 2, stack);
      drawBowls(stack.length);
      game.draw.rect(70, H * 0.17, W - 140, H * 0.22, INK, 0.7);
      say(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.22, 96, won ? GOLD : RED);
      say(stack.length + ' / ' + NEEDED + '   PERFECT x' + perfects, W / 2, H * 0.28, 40, CREAM);
      say('SCORE ' + score, W / 2, H * 0.32, 44, CREAM);
      if (won && score > prevBest) say('NEW RECORD', W / 2, H * 0.365, 50, GOLD);
      else say('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.365, 36, '#c9c0ad');
      if (!won) say('あと' + (NEEDED - stack.length) + '段!', W / 2, H * 0.42, 48, GOLD);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.975, 34, CREAM);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        st = ST.RESULT;
        var stats = { layers: stack.length, perfect: perfects, avgOffPx: stack.length ? Math.round(sumOff / stack.length) : 0 };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      halt.y += 500 * dt;
      if (halt.t <= 0) { game.feedback.bad(W / 2, halt.y - 60, { text: 'MISS' }); halt = null; won = false; finish(); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      timeLeft -= dt;
      railPh += dt * railSpeed(stack.length);
      warp += ((stack.length >= 3 ? 0.6 : 0) - warp) * Math.min(1, dt * 2);
      if (falling) {
        falling.vy += GRAV * dt; falling.y += falling.vy * dt;
        var land = RAIL_Y - 6 - stack.length * LAYER_H;
        if (falling.y >= land) { falling.y = land; settle(landLayer(stack, railX(railPh, warp), W / 2, falling.w)); }
      }
      if (timeLeft <= 0 && !over && !halt) {
        timeLeft = 0; won = false;
        game.feedback.bad(W / 2, holdY(), { text: 'TIME UP' });
        finish();
      }
    }

    var sx = railX(railPh, warp);
    drawRoom();
    drawStack(sx, stack);
    for (var t = 0; t < trimmed.length; t++) game.draw.rect(trimmed[t].x - 20, trimmed[t].y - 14, 40, 28, trimmed[t].c);
    if (!over || halt) {
      var idx = stack.length;
      if (halt) {
        var k = 1 - halt.t / halt.max;
        slab(halt.x, halt.y, halt.w * (1 + k * 0.15), { top: '#ffffff', side: LAYERS[halt.idx].side }, false);
        game.draw.rect(halt.x - halt.w / 2 - 20, halt.y - LAYER_H - 40, halt.w + 40, LAYER_H + 60, '#ffffff', 0.5 * (1 - k));
      } else if (idx < NEEDED) {
        var hy = falling ? falling.y : holdY();
        slab(W / 2, hy, falling ? falling.w : holdW, LAYERS[idx], false);
        // 真下への落下ガイド(点線)
        if (!falling) for (var g = hy + 10; g < RAIL_Y - idx * LAYER_H - 10; g += 24) game.draw.rect(W / 2 - 2, g, 4, 12, CREAM, 0.5);
      }
    }
    drawMaker(W / 2, holdY(), frame);
    drawBowls(stack.length);

    say(stack.length + ' / ' + NEEDED, W * 0.18, 92, 52, CREAM);
    say(String(score), W * 0.82, 92, 46, GOLD);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 166, W - 120, 20, INK, 0.5);
    game.draw.rect(60, 166, (W - 120) * fr, 20, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : GOLD);
    if (ready > 0) say(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 100, GOLD);
  });

  game.onStart(function () {
    game.audio.melody([['C5', 0.5], ['D5', 0.5], ['F5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['D5', 1], ['C5', 0.5], ['D5', 0.5], ['C5', 1.5], ['R', 0.5]], { tempo: 112, wave: 'triangle', volume: 0.05, loop: true });
    st = ST.ATTRACT;
    initGame();
  });
})(game);
