// J-3DSDSDSTOP10-0024-dockside-crate-scramble.js
// 波止場の木箱のぼり — 頭上に2つ積まれた木箱のうち大きい方だけが体重を支える。瞬時に見比べて10段よじ登る
// 操作: 左右どちらかの大きい木箱の側をタップして跳び移る。小さい方を選ぶと崩れて1段ずり落ちる
// 終わり: 制限時間内に10段目の旗に着けば成功。ずり落ち3回/時間切れで失敗
// @mechanic: size_judge
// @theme: dockside_crate_scramble
// 世界観: 嵐の前の波止場で荷揚げ人夫が、荷崩れした木箱の山を頑丈な大箱だけ選んで駆け上がり、てっぺんの信号旗を揚げに行く
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数と即断(PERFECT)回数
// スタイル: 8bit PC MONITOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ、細線、テキスト枠のUI
  var STYLE = { bg: ['#000033', '#00005a', '#000000'], main: ['#ffff55', '#55ffff'], accent: ['#ff5555', '#55ff55'] };
  var COL = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1], black: STYLE.bg[2], yellow: STYLE.main[0], cyan: STYLE.main[1],
    red: STYLE.accent[0], green: STYLE.accent[1], white: '#ffffff', magenta: '#ff55ff', blue: '#5555ff', brown: '#aa5500'
  };

  var GAME_TITLE = 'CRATE SCRAMBLE';
  var TIME_LIMIT = 15;
  var NEEDED = 10;
  var MAX_SLIPS = 3;
  var DECIDE = 2.4;       // 決めないと木箱が崩れる(ジェスチャー待ちの上限)
  var STAND_Y = H * 0.62;
  var PAIR_Y = H * 0.4;

  var CRATE = ['bbbbbbbb', 'bwbbbbwb', 'bbwbbwbb', 'bbbwwbbb', 'bbbwwbbb', 'bbwbbwbb', 'bwbbbbwb', 'bbbbbbbb'];
  var CRACK = ['bb.bbbbb', 'bw.b.bwb', 'b..bbwbb', 'bbbw..bb', 'b.bwwb.b', 'bbw.bw.b', 'bw.bb.wb', 'b.bbb.bb'];
  var PAL_CRATE = { b: COL.brown, w: COL.yellow };
  var PAL_CRATE_HI = { b: COL.white, w: COL.yellow };
  var WORKER_A = ['..yyy...', '..yyyy..', '..ccc...', '.rrrrr..', 'r.rrr.r.', '..bbb...', '..b.b...', '.bb.bb..'];
  var WORKER_B = ['..yyy...', '..yyyy..', '..ccc...', 'r.rrr.r.', '.rrrrr..', '..bbb...', '.b...b..', 'bb...bb.'];
  var WORKER_JUMP = ['r.yyy.r.', 'r.yyyyr.', '.rccc r.', '..rrr...', '..rrr...', '..bbb...', '.b...b..', '........'];
  var PAL_WORKER = { y: COL.yellow, c: '#ffcc99', r: COL.red, b: COL.blue };
  var FLAG = ['g.....', 'gggg..', 'ggggg.', 'gggg..', 'g.....', 'g.....', 'g.....'];
  var PAL_FLAG = { g: COL.green };
  var GULL_A = ['w...w', '.w.w.', '..w..'];
  var GULL_B = ['.....', 'ww.ww', '..w..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var level, slips, perfects, timeLeft, ready, finished, ok, hitStop, endWait, hl, pair, decideT, hop, crumble, picks;
  var silent = false;

  function tx(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center', font: 'monospace' });
  }

  function newPair() {
    var k = Math.min(1, level / (NEEDED - 1));
    var ratio = 0.62 + 0.26 * k + game.random(-0.03, 0.03);   // 後半ほど差が小さい
    var big = game.random(150, 200);
    var bigLeft = game.random(0, 1) < 0.5;
    pair = { bigLeft: bigLeft, sizes: bigLeft ? [big, big * ratio] : [big * ratio, big], wob: game.random(0, 6) };
    decideT = 0;
  }

  function initGame() {
    level = 0; slips = 0; perfects = 0; picks = 0; timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false;
    hitStop = 0; endWait = 0; hl = null; hop = null; crumble = null;
    newPair();
  }

  function finishRound(success, x, y) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45; hl = { x: x, y: y, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  function sideX(side) { return side === 0 ? W * 0.3 : W * 0.7; }

  // side: 0=左, 1=右。戻り値: 'good' | 'perfect' | 'bad' | 'busy'
  function pick(side) {
    if (finished || hop || crumble) return 'busy';
    picks++;
    var correct = (side === 0) === pair.bigLeft;
    var x = sideX(side);
    if (correct) {
      var fast = decideT < 0.6;
      if (fast) perfects++;
      hop = { t: 0, x0: W / 2, x1: x, side: side };
      game.feedback.good(x, PAIR_Y - 80, { text: fast ? 'PERFECT' : 'GOOD', color: fast ? COL.yellow : COL.green, sound: silent ? 'se_tap' : 'se_good', volume: silent ? 0 : 0.4 });
      return fast ? 'perfect' : 'good';
    }
    slip(side);
    return 'bad';
  }

  function slip(side) {
    slips++;
    crumble = { t: 0, side: side };
    var x = side < 0 ? W / 2 : sideX(side);
    if (slips >= MAX_SLIPS) { finishRound(false, x, PAIR_Y); return; }
    game.feedback.bad(x, PAIR_Y, { text: 'MISS', sound: silent ? 'se_tap' : 'se_bad', volume: silent ? 0 : 0.5 });
    level = Math.max(0, level - 1);
  }

  function stepWorld(dt) {
    if (finished) return;
    if (hop) {
      hop.t += dt;
      if (hop.t >= 0.22) {
        hop = null; level++;
        if (level === NEEDED / 2) { game.fx.popup(level + ' / ' + NEEDED, W / 2, H * 0.3, { color: COL.cyan, size: 56 }); if (!silent) game.audio.play('se_milestone', 0.45); }
        if (level >= NEEDED) { finishRound(true, W / 2, STAND_Y - 120); return; }
        newPair();
      }
      return;
    }
    if (crumble) {
      crumble.t += dt;
      if (crumble.t >= 0.4) { crumble = null; newPair(); }
      return;
    }
    decideT += dt;
    if (decideT >= DECIDE) {
      if (!silent) game.audio.play('se_break', 0.4);
      slip(-1);
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.bg1], [0.6, COL.bg2], [1, COL.black]]);
    game.draw.rect(0, 0, W, H, COL.blue, 0.04 + 0.04 * Math.sin(t * 1.5));
    // 走査線
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, COL.black, 0.25);
    // 港のクレーン(細線)
    var cx = W * 0.86;
    game.draw.line(cx, H * 0.75, cx, H * 0.2, COL.cyan, 3);
    game.draw.line(cx, H * 0.2, W * 0.58, H * 0.2, COL.cyan, 3);
    game.draw.line(W * 0.62 + Math.sin(t) * 20, H * 0.2, W * 0.62 + Math.sin(t) * 20, H * 0.28, COL.cyan, 2);
    for (var g = 0; g < 2; g++) {
      var gx = (t * 60 + g * 520) % (W + 100) - 50;
      game.draw.sprite(Math.floor(t * 4 + g) % 2 ? GULL_A : GULL_B, { w: COL.white }, gx, H * 0.24 + g * 50 + Math.sin(t * 2 + g) * 12, 8, { anchor: 'center' });
    }
  }

  function crateAt(x, y, size, pal, art) {
    game.draw.rect(x - size / 2 + 8, y - size + 8, size, size, COL.black, 0.5);
    game.draw.sprite(art || CRATE, pal || PAL_CRATE, x, y - size / 2, size / 8, { anchor: 'center' });
  }

  function drawTower() {
    var t = game.time.elapsed;
    var scroll = hop ? (hop.t / 0.22) * 170 : 0;
    // 足元の積み上がった木箱(登った段数だけ)
    for (var i = 0; i < 5; i++) {
      var y = STAND_Y + 20 + i * 170 + scroll;
      if (level - i < 0 && i > 0) break;
      crateAt(W / 2 + ((i % 2) ? 26 : -26), y + 150, 170, PAL_CRATE);
    }
    // 頭上の2候補
    if (!finished || !ok) {
      for (var s = 0; s < 2; s++) {
        var sz = pair.sizes[s];
        var wob = Math.sin(t * (4 + decideT * 6) + pair.wob + s) * (3 + decideT * 6);
        var x = sideX(s) + wob;
        var yy = PAIR_Y + 90 + scroll;
        var broken = crumble && crumble.side === s;
        if (broken) { yy += crumble.t * 900; }
        crateAt(x, yy, sz, broken ? PAL_CRATE_HI : PAL_CRATE, broken ? CRACK : CRATE);
      }
      // 決断ゲージ(細線)
      if (!hop && !crumble) {
        var f = 1 - decideT / DECIDE;
        game.draw.rect(W / 2 - 150, PAIR_Y + 150, 300, 10, COL.bg2);
        game.draw.rect(W / 2 - 150, PAIR_Y + 150, 300 * Math.max(0, f), 10, f < 0.35 ? COL.red : COL.cyan);
      }
    }
    if (level >= NEEDED - 2) game.draw.sprite(FLAG, PAL_FLAG, W / 2, PAIR_Y - 170 + scroll + Math.sin(t * 3) * 4, 14, { anchor: 'center' });
  }

  function drawWorker() {
    var t = game.time.elapsed;
    var x = W / 2, y = STAND_Y - 70 + Math.sin(t * 3) * 4;
    var fr = Math.floor(t * 3) % 2 ? WORKER_A : WORKER_B;
    if (hop) {
      var k = hop.t / 0.22;
      x = hop.x0 + (hop.x1 - hop.x0) * k;
      y = STAND_Y - 70 - Math.sin(k * Math.PI) * 180 - k * 60;
      fr = WORKER_JUMP;
    }
    if (crumble) { y += Math.min(1, crumble.t * 4) * 60; fr = WORKER_JUMP; }
    game.draw.sprite(fr, PAL_WORKER, x, y, 16, { anchor: 'center' });
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.82, W, H * 0.18, '#000044');
    for (var i = 0; i < 12; i++) game.draw.rect((i * 97 + t * 40) % W, H * 0.84 + (i % 3) * 30, 50, 4, COL.blue, 0.8);
    // 左右タップ区画(テキスト枠UI)
    for (var s = 0; s < 2; s++) {
      var x0 = s === 0 ? 40 : W / 2 + 20;
      var glow = 0.5 + 0.3 * Math.sin(t * 4 + s * 3);
      game.draw.line(x0, H * 0.87, x0 + W / 2 - 60, H * 0.87, COL.cyan, 3);
      game.draw.line(x0, H * 0.95, x0 + W / 2 - 60, H * 0.95, COL.cyan, 3);
      game.draw.line(x0, H * 0.87, x0, H * 0.95, COL.cyan, 3);
      game.draw.line(x0 + W / 2 - 60, H * 0.87, x0 + W / 2 - 60, H * 0.95, COL.cyan, 3);
      game.draw.sprite(CRATE, PAL_CRATE, x0 + (W / 2 - 60) / 2, H * 0.91, s === 0 ? 8 : 8, { anchor: 'center', alpha: glow });
    }
  }

  function drawHud() {
    game.draw.line(30, 30, W - 30, 30, COL.cyan, 3);
    game.draw.line(30, 200, W - 30, 200, COL.cyan, 3);
    tx(level + ' / ' + NEEDED, W / 2, H * 0.05, 56, COL.yellow);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 20, COL.bg2);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? COL.red : COL.green);
    for (var s = 0; s < MAX_SLIPS; s++) game.draw.rect(60 + s * 46, 70, 30, 30, s < slips ? COL.red : COL.green);
    tx('x' + perfects, W - 90, H * 0.05, 40, COL.magenta);
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y, 60 + hl.t * 300, COL.white, Math.max(0, 0.6 - hl.t));
    if (ok) game.draw.sprite(FLAG, { g: COL.white }, hl.x, hl.y - 60, 18 + hl.t * 10, { anchor: 'center' });
    else game.draw.sprite(CRACK, PAL_CRATE_HI, hl.x, hl.y, 22 + hl.t * 12, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.91, press: false, n: 0, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; level = 4; demo.n++; }
    silent = true;
    if (!hop && !crumble && !finished && decideT > 0.55) {
      var wrong = demo.n % 2 === 0 && picks % 3 === 2;   // 失敗例: 小さい箱を選ぶ
      var side = pair.bigLeft ? 0 : 1;
      if (wrong) side = 1 - side;
      demo.gx = sideX(side); demo.gy = PAIR_Y + 40; demo.pressT = 0.2;
      pick(side);
    }
    if (slips >= MAX_SLIPS - 1) slips = 0;
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    stepWorld(dt);
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) return;
    var r = pick(x < W / 2 ? 0 : 1);
    if (r === 'good' || r === 'perfect') game.audio.play('se_jump', 0.45);
    else if (r === 'bad') game.audio.play('se_break', 0.5);
    else game.audio.play('se_tap', 0.15);
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (level === undefined) initGame();
      stepDemo(dt);
      drawBack(); drawTower(); drawWorker(); drawThumb();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      tx(GAME_TITLE, W / 2, H * 0.07, 72, COL.yellow);
      tx('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, COL.cyan);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) tx('► 100円 投入 ◄', W / 2, H * 0.975, 42, COL.yellow);
      else tx('INSERT COIN', W / 2, H * 0.975, 36, COL.white);
      return;
    }

    if (state === S.RESULT) {
      drawBack(); drawTower(); drawThumb();
      var sc = level * 100 + perfects * 50 + (ok ? Math.round(timeLeft * 40) : 0);
      tx(ok ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.09, 96, ok ? COL.green : COL.red);
      tx(level + ' / ' + NEEDED, W / 2, H * 0.15, 52, COL.white);
      tx('SCORE ' + sc, W / 2, H * 0.2, 44, COL.cyan);
      if (ok && sc > (game.best || 0)) tx('NEW RECORD', W / 2, H * 0.245, 44, COL.yellow);
      else tx('BEST ' + (game.best || 0), W / 2, H * 0.245, 36, COL.cyan);
      if (!ok) tx('あと' + (NEEDED - level) + '段!', W / 2, H * 0.7, 64, COL.magenta);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) tx('TAP TO CONTINUE', W / 2, H * 0.975, 38, COL.white);
      return;
    }

    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.yellow, count: 26 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { level: level, needed: NEEDED, perfects: perfects, slips: slips };
          if (ok) game.end.success(level * 100 + perfects * 50 + Math.round(timeLeft * 40), stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finishRound(false, W / 2, STAND_Y - 70); }
      else stepWorld(dt);
    }

    drawBack(); drawTower(); drawWorker(); drawThumb(); drawHud();
    if (finished) drawHighlight(dt);
    if (ready > 0) tx(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, COL.yellow);
  });

  game.onStart(function () {
    game.audio.melody([['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5]],
      { tempo: 160, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
