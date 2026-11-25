// I-GBA-0006v3-ice-hole-still.js
// アイスホール・スティル — 氷穴の浮きがつつかれても触らず、沈み切った瞬間だけ糸を上げる
// 操作: 浮きが小さく揺れる・半分沈む間は画面に触れない。浮きが氷の下まで沈み糸がピンと張ったら1回タッチ
// 終わり: 4匹釣ればCLEAR。フェイント中に触る/本当の引きを逃すと餌を1つ失い、餌3つ全損か14秒経過でGAME OVER
// @mechanic: freeze
// @theme: ice_fishing_hut_patience
// 世界観: 冬の湖の氷上釣り小屋で、釣り人が浮きの小さな揺れには手を出さず、魚が餌を呑んで浮きが沈み切った瞬間だけ糸を上げて4匹を狙う
// 残るもの: 正誤(CLEAR/GAME OVER) + 釣った匹数・残り餌・スコア
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドットのラスター画 + 画面帯ごとに貼ったカラーセロハン(上=琥珀、氷下=シアン)
  var STYLE = { bg: ['#04060a', '#0a1119'], main: ['#f4f4ee', '#8d99a3'], accent: ['#5fd4ff', '#ffb347'] };
  var WHITE = STYLE.main[0], DIM = STYLE.main[1], CYAN = STYLE.accent[0], AMBER = STYLE.accent[1];

  var TITLE = 'ICE HOLE STILL';
  var NEEDED = 4;
  var BAITS = 3;
  var TIME_LIMIT = 14;
  var BITE_WINDOW = 0.85;

  var ICE_Y = H * 0.46;
  var HOLE_X = W * 0.56;
  var TIP_X = W * 0.56, TIP_Y = H * 0.27;
  var MAN_X = W * 0.26, MAN_Y = ICE_Y - 120;

  var MODE = { ATTRACT: 'attract', PLAYING: 'playing', RESULT: 'result' };
  var mode = MODE.ATTRACT;

  // ── スプライト(白1色 + セロハン帯で色がつく) ──
  var ANGLER = [
    ['..###...', '.#####..', '..#.#...', '..###...', '.#####..', '#######.', '.#####..', '.##.##..', '.##.##..', '###.###.'],
    ['..###...', '.#####..', '..#.#...', '..###...', '.#####..', '.######.', '.#####..', '.##.##..', '.##.##..', '###.###.'],
  ];
  var BOBBER = ['.#.', '###', '#o#', '###', '.#.'];
  var FISH = [
    ['..####....', '.######.##', '########.#', '.######.##', '..####....'],
    ['..####....', '.######..#', '#########.', '.######..#', '..####....'],
  ];
  var CAUGHT = ['.####..', '######.', '#######', '######.', '.####..'];

  var snow = [];
  for (var s = 0; s < 34; s++) snow.push({ x: Math.random() * W, y: Math.random() * H * 0.46, v: 30 + Math.random() * 50, r: 2 + Math.random() * 3 });

  // ── 1匹ぶんの課題 ──
  function makeRound(idx) {
    var feints = [];
    var t = 0.45;
    var n = Math.min(4, 1 + idx);
    for (var i = 0; i < n; i++) {
      var kind = 'bob';
      if (idx >= 1 && i === n - 1) kind = 'dip';
      if (idx >= 3 && i === 1) kind = 'twin';
      feints.push({ t: t, kind: kind });
      t += game.random(0.38, 0.62) - idx * 0.03;
    }
    return { feints: feints, biteT: t + game.random(0.25, 0.55), fishFrom: game.random(0, 1) < 0.5 ? -1 : 1 };
  }

  // 浮きの沈み量(px)。プレイもデモも同じ関数を使う
  function floatSink(rd, rt) {
    var dy = Math.sin(rt * 2.4) * 3;
    for (var i = 0; i < rd.feints.length; i++) {
      var f = rd.feints[i];
      var k = rt - f.t;
      if (k < 0) continue;
      if (f.kind === 'bob' && k < 0.32) dy += Math.sin(k / 0.32 * Math.PI * 2) * 12;
      if (f.kind === 'dip' && k < 0.46) dy += Math.sin(k / 0.46 * Math.PI) * 38;
      if (f.kind === 'twin' && k < 0.5) dy += Math.abs(Math.sin(k / 0.25 * Math.PI)) * 26;
    }
    if (rt >= rd.biteT) dy = Math.min(96, 20 + (rt - rd.biteT) * 420);
    return dy;
  }

  function fishX(rd, rt) {
    var near = Math.min(1, rt / Math.max(0.1, rd.biteT));
    return HOLE_X + rd.fishFrom * (340 * (1 - near) + 30 * Math.sin(rt * 5));
  }

  // ── 状態 ──
  var round, rd, rt, caught, baits, timeLeft, ready, bite, reel, stop, over, won, endT, score, prevBest, beat;

  function initGame() {
    round = 0; rd = makeRound(0); rt = 0;
    caught = 0; baits = BAITS; timeLeft = TIME_LIMIT; ready = 0.8;
    bite = false; reel = 0; stop = null; over = false; won = false; endT = 0; score = 0; beat = 0;
    prevBest = game.best || 0;
  }

  function nextFish() {
    round++;
    rd = makeRound(round); rt = 0; bite = false;
  }

  function ink(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col || WHITE, bold: true, align: 'center', font: 'monospace' });
  }

  // ── 描画 ──
  function drawWorld(sink, taut, fx, fishOn, lift, manFrame) {
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.46, '#060a10'], [1, STYLE.bg[0]]]);
    // 小屋の内壁(ラスター線)
    for (var y = 250; y < ICE_Y; y += 14) game.draw.rect(0, y, W, 2, WHITE, 0.05);
    game.draw.rect(W * 0.06, 250, 14, ICE_Y - 250, WHITE, 0.5);
    game.draw.rect(W * 0.9, 250, 14, ICE_Y - 250, WHITE, 0.5);
    game.draw.rect(W * 0.06, 250, W * 0.84 + 14, 12, WHITE, 0.5);
    // 窓の外の雪
    game.draw.rect(W * 0.68, 330, 170, 140, '#000000', 0.8);
    game.draw.rect(W * 0.68, 330, 170, 140, WHITE, 0.08);
    for (var i = 0; i < snow.length; i++) {
      var p = snow[i];
      if (p.x > W * 0.68 && p.x < W * 0.68 + 170 && p.y > 330 && p.y < 470) game.draw.rect(p.x, p.y, p.r, p.r, WHITE, 0.9);
    }
    // 氷面と穴
    game.draw.rect(0, ICE_Y, W, 40, WHITE, 0.85);
    for (var x = 0; x < W; x += 18) game.draw.rect(x, ICE_Y + 44, 8, 4, WHITE, 0.4);
    game.draw.rect(HOLE_X - 70, ICE_Y - 2, 140, 46, '#02060a');
    var pulse = 0.25 + 0.2 * Math.sin(game.time.elapsed * 3);
    game.draw.rect(HOLE_X - 74, ICE_Y - 6, 148, 4, WHITE, pulse);
    // 氷の下の水(ラスター)
    for (var yy = ICE_Y + 60; yy < H * 0.74; yy += 10) game.draw.rect(0, yy, W, 2, WHITE, 0.06 + 0.02 * Math.sin(yy * 0.05 + game.time.elapsed * 2));
    // 魚影
    game.draw.sprite(FISH[Math.floor(game.time.elapsed * 6) % 2], { '#': WHITE }, fx, ICE_Y + 180 + Math.sin(game.time.elapsed * 3) * 8, 10, { anchor: 'center', flipX: fx > HOLE_X, alpha: fishOn ? 0.95 : 0.45 });
    // 釣り人と竿
    var bob = Math.sin(game.time.elapsed * 2.2) * 4;
    game.draw.sprite(ANGLER[manFrame], { '#': WHITE }, MAN_X, MAN_Y + bob, 16, { anchor: 'center' });
    var tipY = TIP_Y - lift * 90;
    game.draw.line(MAN_X + 60, MAN_Y + 10 + bob, TIP_X, tipY, WHITE, 6);
    // 糸と浮き
    var fy = ICE_Y + 10 + sink;
    game.draw.line(TIP_X, tipY, HOLE_X, fy, taut ? WHITE : DIM, taut ? 5 : 2);
    game.draw.line(HOLE_X, fy, HOLE_X, ICE_Y + 170, DIM, 2);
    game.draw.sprite(BOBBER, { '#': WHITE, 'o': '#000000' }, HOLE_X, fy, 9, { anchor: 'center', alpha: sink > 60 ? 0.5 : 1 });
    if (taut) {
      for (var b = 0; b < 3; b++) {
        var ph = (game.time.elapsed * 2 + b / 3) % 1;
        game.draw.circle(HOLE_X, ICE_Y + 10, 20 + ph * 70, WHITE, 0.25 * (1 - ph));
      }
    }
    // 親指ゾーン: 巻き取りリール(床の道具)
    var reelY = H * 0.84;
    game.draw.circle(W / 2, reelY, 120, WHITE, 0.12);
    game.draw.circle(W / 2, reelY, 90, '#000000', 0.7);
    var ang = game.time.elapsed * (taut ? 9 : 0.8);
    game.draw.line(W / 2, reelY, W / 2 + Math.cos(ang) * 80, reelY + Math.sin(ang) * 80, WHITE, 8);
    game.draw.circle(W / 2 + Math.cos(ang) * 80, reelY + Math.sin(ang) * 80, 14, WHITE);
  }

  function drawBands() {
    // セロハン帯: 上(HUD)=琥珀、氷の下=シアン
    game.draw.rect(0, 0, W, 240, AMBER, 0.2);
    game.draw.rect(0, ICE_Y + 44, W, H * 0.74 - ICE_Y - 44, CYAN, 0.16);
    game.draw.rect(0, H * 0.74, W, H * 0.26, AMBER, 0.07);
  }

  function drawHud() {
    ink(caught + ' / ' + NEEDED, W * 0.2, 80, 52, WHITE);
    for (var i = 0; i < BAITS; i++) game.draw.circle(W * 0.72 + i * 60, 78, 18, i < baits ? WHITE : DIM, i < baits ? 1 : 0.3);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 20, WHITE, 0.15);
    game.draw.rect(60, 170, (W - 120) * fr, 20, low ? '#000000' : WHITE, 1);
    ink(String(score), W * 0.5, 80, 40, AMBER);
  }

  // ── 入力 ──
  function haltThen(x, y, good, after) {
    stop = { t: good ? 0.32 : 0.45, max: good ? 0.32 : 0.45, x: x, y: y, good: good, after: after };
  }

  function touchLine(x, y) {
    if (mode !== MODE.PLAYING || over) return;
    if (stop || reel > 0) { game.audio.play('se_tap', 0.08); return; }
    if (ready > 0) { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: DIM, count: 4, speed: 80 }); return; }
    var fy = ICE_Y + 10 + floatSink(rd, rt);
    if (bite) {
      var react = rt - rd.biteT;
      var perfect = react < 0.32;
      game.audio.play('se_tap', 0.2);
      haltThen(HOLE_X, ICE_Y + 160, true, function () {
        caught++;
        score += (perfect ? 150 : 100) + Math.floor(timeLeft * 5);
        game.feedback.good(HOLE_X, ICE_Y - 60, { text: perfect ? 'PERFECT' : 'NICE', color: WHITE, count: 16 });
        game.audio.play('se_coin', 0.5);
        reel = 0.55;
        if (caught === 2) { game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.36, { color: AMBER, size: 56 }); game.audio.play('se_milestone', 0.4); }
        if (caught >= NEEDED) { won = true; wrapUp(); }
      });
    } else {
      // フェイント中に触れた → 魚が逃げる
      game.audio.play('se_tap', 0.2);
      haltThen(HOLE_X, fy, false, function () {
        loseBait('MISS');
      });
    }
  }

  function loseBait(label) {
    baits--;
    game.feedback.bad(HOLE_X, ICE_Y - 40, { text: label, shake: 12 });
    if (baits <= 0) { won = false; wrapUp(); } else nextFish();
  }

  function wrapUp() {
    if (over) return;
    over = true;
    if (won) score += baits * 80;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash(WHITE, 0.25);
  }

  game.onPress(function (x, y) {
    if (mode === MODE.PLAYING) { game.fx.burst(x, y, { color: WHITE, count: 3, speed: 60 }); touchLine(x, y); }
  });

  game.onTap(function (x, y) {
    if (mode === MODE.ATTRACT) { game.audio.play('se_coin', 0.4); mode = MODE.PLAYING; initGame(); return; }
    if (mode === MODE.RESULT) { game.audio.play('se_tap', 0.2); mode = MODE.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT ゴースト実演(同じ浮き関数・同じ描画) ──
  var demo = { t: 0, rd: null, hx: W / 2, hy: H * 0.86, press: false, done: false, lift: 0 };
  var DEMO_CYCLE = 3.8;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.rd) {
      demo.rd = { feints: [{ t: 0.6, kind: 'bob' }, { t: 1.3, kind: 'dip' }], biteT: 2.2, fishFrom: -1 };
      demo.done = false; demo.lift = 0;
    }
    var bitten = cyc >= demo.rd.biteT;
    // フェイント中は手を浮かせたまま静止、本物の引きで押す
    demo.hx = W / 2 + 20;
    demo.hy = H * 0.8 - (bitten ? 0 : 50);
    demo.press = bitten && cyc > demo.rd.biteT + 0.22 && cyc < demo.rd.biteT + 0.5;
    if (demo.press && !demo.done) {
      demo.done = true;
      game.feedback.good(HOLE_X, ICE_Y - 60, { text: 'NICE', color: WHITE, count: 10, volume: 0.25 });
    }
    if (demo.done) demo.lift = Math.min(1, demo.lift + dt * 3);
    return cyc;
  }

  function stepSnow(dt) {
    for (var i = 0; i < snow.length; i++) {
      snow[i].y += snow[i].v * dt;
      snow[i].x += Math.sin(game.time.elapsed + i) * 10 * dt;
      if (snow[i].y > ICE_Y) { snow[i].y = 250; snow[i].x = Math.random() * W; }
    }
  }

  game.onUpdate(function (dt) {
    stepSnow(dt);
    var mf = Math.floor(game.time.elapsed * 2) % 2;

    if (mode === MODE.ATTRACT) {
      var cyc = stepDemo(dt);
      var sink = demo.done ? Math.max(-20, 96 - demo.lift * 140) : floatSink(demo.rd, cyc);
      drawWorld(sink, cyc >= demo.rd.biteT && !demo.done, fishX(demo.rd, cyc), cyc >= demo.rd.biteT, demo.lift, mf);
      if (demo.done) game.draw.sprite(CAUGHT, { '#': WHITE }, HOLE_X, ICE_Y - 60 - demo.lift * 80, 14, { anchor: 'center' });
      drawBands();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 16 });
      ink(TITLE, W / 2, H * 0.07, 60, WHITE);
      ink('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 34, AMBER);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) ink('► 100円 投入 ◄', W / 2, H * 0.95, 44, AMBER);
      else ink('INSERT COIN', W / 2, H * 0.95, 36, WHITE);
      return;
    }

    if (mode === MODE.RESULT) {
      drawWorld(0, false, HOLE_X + 300, false, won ? 1 : 0, mf);
      drawBands();
      ink(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, won ? WHITE : AMBER);
      ink(caught + ' / ' + NEEDED, W / 2, H * 0.37, 60, WHITE);
      ink('SCORE ' + score, W / 2, H * 0.53, 50, WHITE);
      if (won && score > prevBest) ink('NEW RECORD', W / 2, H * 0.59, 48, AMBER);
      else ink('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.59, 38, DIM);
      if (!won) ink('あと' + (NEEDED - caught) + '匹!', W / 2, H * 0.65, 46, AMBER);
      for (var c = 0; c < caught; c++) game.draw.sprite(CAUGHT, { '#': WHITE }, W / 2 + (c - (caught - 1) / 2) * 140, H * 0.42, 12, { anchor: 'center' });
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', W / 2, H * 0.95, 36, WHITE);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        mode = MODE.RESULT;
        if (won) game.end.success(score, { caught: caught, baits: baits, timeLeft: Math.round(timeLeft * 10) / 10 });
        else game.end.failure({ caught: caught, baits: baits });
      }
    } else if (stop) {
      stop.t -= dt;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap', 0.3); beat = 0; }
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; won = false;
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP' });
        wrapUp();
      } else if (reel > 0) {
        reel -= dt;
        if (reel <= 0 && !over) nextFish();
      } else {
        rt += dt;
        // フェイントごとに小さな「ポチャ」
        for (var i = 0; i < rd.feints.length; i++) {
          if (rt - dt < rd.feints[i].t && rt >= rd.feints[i].t) game.audio.tone(rd.feints[i].kind === 'bob' ? 'E5' : 'C5', 0.06, { wave: 'triangle', volume: 0.06 });
        }
        if (!bite && rt >= rd.biteT) {
          bite = true;
          game.audio.tone('G5', 0.16, { wave: 'square', volume: 0.12, slide: -380 });
        }
        if (bite && rt - rd.biteT > BITE_WINDOW) {
          bite = false;
          haltThen(HOLE_X, ICE_Y + 100, false, function () { loseBait('MISS'); });
        }
      }
    }

    var sinkNow = reel > 0 ? -30 * (1 - reel / 0.55) : floatSink(rd, rt);
    var lift = reel > 0 ? 1 - reel / 0.55 : 0;
    drawWorld(sinkNow, bite && !stop, reel > 0 ? HOLE_X : fishX(rd, rt), bite, lift, mf);
    if (reel > 0) game.draw.sprite(CAUGHT, { '#': WHITE }, HOLE_X, ICE_Y - 40 - lift * 120, 14, { anchor: 'center' });
    if (stop) {
      // hit-stop: 対象を白フラッシュ+拡大
      var k = 1 - stop.t / stop.max;
      game.draw.circle(stop.x, stop.y, 50 + k * 90, WHITE, 0.55 * (1 - k) + 0.2);
      if (stop.good) game.draw.sprite(FISH[0], { '#': WHITE }, stop.x, stop.y, 14 + k * 6, { anchor: 'center' });
      else game.draw.sprite(BOBBER, { '#': WHITE, 'o': '#000000' }, stop.x, stop.y, 12 + k * 10, { anchor: 'center' });
    }
    drawBands();
    drawHud();
    if (ready > 0) ink(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 90, AMBER);
  });

  game.onStart(function () {
    game.audio.melody([['A3', 1], ['C4', 0.5], ['E4', 0.5], ['D4', 1], ['R', 0.5], ['A3', 0.5], ['G3', 1], ['E3', 1]], { tempo: 76, wave: 'triangle', volume: 0.05, loop: true });
    mode = MODE.ATTRACT;
    initGame();
  });
})(game);
