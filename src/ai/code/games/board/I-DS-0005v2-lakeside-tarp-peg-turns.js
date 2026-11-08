// I-DS-0005v2-lakeside-tarp-peg-turns.js
// 湖畔のタープ杭抜き — 相棒と交互に地面の杭を1〜3本ずつ抜く。最後の1本(赤旗の杭)を抜いた方の頭にタープが落ちる
// 操作: 自分の番(足もとが光り、持ち時間の帯が減る)に、下の3つの札から抜く本数(1・2・3)をタップ。杭はロープの色で4本ずつの束に分かれていて、半端な束を片付けると相棒に最後の1本が回る
// 終わり: 3張り(6本→8本→11本。相棒は張りごとに手強くなる)すべてで相棒に最後の杭を抜かせればCLEAR。自分が最後の杭を抜く/持ち時間切れ/28秒切れでGAME OVER
// @mechanic: turn_attack
// @theme: lakeside_camp_tarp_peg_nim
// 世界観: 湖畔のキャンプ場の撤収の朝、キャンパーが相棒と交互にタープの杭を1〜3本ずつ抜き、最後まで残る赤旗の杭を相棒に抜かせて、自分はタープをかぶらずに片付けを終える
// 残るもの: 正誤(CLEAR/GAME OVER) + 勝った張りの数・読み切った手の数・スコア
// スタイル: 80s ISO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: クォータービューの菱形グリッドの床。高さは影の距離で示し、奥でも小さくしない
  var STYLE = { bg: ['#9fd4e8', '#5aa0c8'], main: ['#5fb04a', '#e8743a', '#f6e05a'], accent: ['#e8344a', '#ffffff'] };
  var SKY = STYLE.bg[0], LAKE = STYLE.bg[1], GRASS = STYLE.main[0], ORANGE = STYLE.main[1], YELLOW = STYLE.main[2], RED = STYLE.accent[0], WHITE = STYLE.accent[1];
  var DARK = '#26402a', SOIL = '#8a6a3a', CYAN = '#58d8e8', INK = '#1a2420';

  var TITLE = 'PEG TURNS';
  var TIME_LIMIT = 28;
  var TARPS = [6, 8, 11];
  var TURN_TIME = [4.0, 3.2, 2.6];
  var SMART = [0.35, 0.6, 0.8];
  var PULL_T = 0.22;
  var PEG_Y = H * 0.62;
  var TARP_X = W * 0.5, TARP_Y = H * 0.36;
  var BTN = [{ n: 1, x: W * 0.2 }, { n: 2, x: W * 0.5 }, { n: 3, x: W * 0.8 }];
  var BTN_Y = H * 0.875, BTN_W = 250, BTN_H = 170;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CAMPER = [
    ['..hhhhhh..', '.hhhhhhhh.', '.hffffffh.', '.fekffekf.', '.ffffffff.', '..ffmmff..', '.jjjjjjjj.', 'jjjjjjjjjj', 'fjjjjjjjjf', '.jjjjjjjj.', '..pp..pp..', '..kk..kk..'],
    ['..hhhhhh..', '.hhhhhhhh.', '.hffffffh.', '.fekffekf.', '.ffffffff.', '..ffmmff..', '.jjjjjjjjf', 'jjjjjjjjj.', 'fjjjjjjjj.', '.jjjjjjjj.', '..pp..pp..', '..kk..kk..'],
    ['f.hhhhhh.f', 'fhhhhhhhhf', '.hffffffh.', '.fekffekf.', '.ffmmmmff.', '..ffffff..', '.jjjjjjjj.', '.jjjjjjjj.', '.jjjjjjjj.', '.jjjjjjjj.', '.pp....pp.', '.kk....kk.'],
    ['..........', '..........', '..hhhhhh..', '.hhhhhhhh.', '.hfkffkfh.', '.ffffffff.', '.jjffmmjj.', 'fjjjjjjjjf', 'jjjjjjjjjj', '.jjjjjjjj.', '..pp..pp..', '..kk..kk..'],
  ];
  var PEG = ['.w.', 'www', '.s.', '.s.', '.s.', '..s'];
  var FLAG = ['rrr.', 'rrrr', 'rrr.', 's...', 's...', 's...', 's...'];

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 杭の並び: 右端が赤旗の杭(p=0)。そこから左へ4本ずつの束。抜くのは常に左端(いちばん遠い束)から ──
  function pegX(p) { return W - 120 - p * 66 - Math.floor((p + 3) / 4) * 42; }
  function pegY(p) { return PEG_Y - (W - pegX(p)) * 0.08; }
  function groupOf(p) { return p === 0 ? -1 : Math.floor((p - 1) / 4); }

  // ── AI 相棒の手(見せるだけの相手。読み切れる手を選ぶ確率が張りごとに上がる) ──
  function aiTake(rem, smart) {
    var best = (rem - 1) % 4;
    if (rem === 1) return 1;
    if (best > 0 && game.random(0, 1) < smart) return best;
    return 1 + Math.floor(game.random(0, Math.min(3, rem - 1)));
  }

  // ── 描画 ──
  function drawCamp(sway) {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H, [[0, SKY], [0.2, '#c8ecf4'], [0.24, LAKE], [0.3, '#4a8ab4'], [0.31, GRASS], [1, '#4a9a3a']]);
    // 対岸の山と湖面のきらめき
    for (var m = 0; m < 5; m++) game.draw.circle(m * 260 + 60, H * 0.24, 150, '#7aa0b0', 0.6);
    game.draw.rect(0, H * 0.23, W, H * 0.08, LAKE);
    for (var g = 0; g < 8; g++) game.draw.rect(((g * 150 + tt * 30) % (W + 120)) - 60, H * 0.245 + (g % 3) * 40, 70, 5, WHITE, 0.5);
    // 菱形グリッドの地面
    var y0 = H * 0.31, y1 = H * 0.78;
    for (var i = -8; i < 18; i++) {
      var x = i * 140;
      game.draw.line(x, y0, x + (y1 - y0) * 2, y1, DARK, 2);
      game.draw.line(x, y0, x - (y1 - y0) * 2, y1, DARK, 2);
    }
    game.draw.rect(0, y1, W, H - y1, '#3e7e30');
    // 焚き火の跡と木
    game.draw.circle(W * 0.13, H * 0.45, 40, SOIL);
    game.draw.circle(W * 0.13, H * 0.45, 14, ORANGE, 0.5 + 0.3 * Math.sin(tt * 8));
    game.draw.rect(W * 0.9, H * 0.30, 26, 120, SOIL);
    game.draw.circle(W * 0.9 + 13, H * 0.30, 80, '#3a8a32');
  }

  function drawTarp(rem, total, sway, drop, flashK) {
    var tension = rem <= 4 ? (5 - rem) / 4 : 0;
    var sag = Math.sin(game.time.elapsed * (4 + tension * 8)) * (4 + tension * 22) + sway;
    var cx = TARP_X, cy = TARP_Y + (drop ? drop.k * drop.k * 560 : 0);
    var dx = drop ? drop.side * drop.k * 260 : 0;
    var w = 540, h = 150;
    // 影(高さ = 影までの距離)
    game.draw.rect(cx - w / 2 + 60 + dx, PEG_Y - 120, w, 40, INK, 0.18 * (1 - (drop ? drop.k : 0)));
    // ポール
    if (!drop) {
      game.draw.rect(cx - w / 2 + 6, cy, 10, 200, SOIL);
      game.draw.rect(cx + w / 2 - 16, cy - 40, 10, 240, SOIL);
    }
    // 斜めの幕(横ストリップ塗り)
    for (var r = 0; r < h; r += 6) {
      var k = r / h;
      var col = flashK ? WHITE : r % 24 < 12 ? ORANGE : YELLOW;
      game.draw.rect(cx - w / 2 + r * 0.6 + dx, cy - 40 + r + Math.sin(k * 3.14) * sag, w, 6, col);
    }
    game.draw.rect(cx - w / 2 + dx, cy - 46, w, 8, '#b85424');
  }

  function drawPegs(rem, warnLast) {
    var tx0 = TARP_X - 270, tx1 = TARP_X + 270;
    for (var p = rem - 1; p >= 0; p--) {
      var x = pegX(p), y = pegY(p), g = groupOf(p);
      var rope = g < 0 ? RED : g % 2 ? CYAN : YELLOW;
      var ax = p === 0 ? tx1 : tx0 + ((x - 100) / (W - 200)) * (tx1 - tx0);
      game.draw.line(ax, TARP_Y + 60, x, y - 40, rope, 4);
      game.draw.rect(x - 22, y + 8, 44, 10, INK, 0.25);
      if (p === 0) {
        var blink = warnLast && Math.floor(game.time.elapsed * 8) % 2 === 0;
        game.draw.sprite(FLAG, { r: blink ? WHITE : RED, s: SOIL }, x + 8, y - 44, 10, { anchor: 'center' });
      }
      game.draw.sprite(PEG, { w: rope, s: '#d8d0b0' }, x, y - 18, 10, { anchor: 'center' });
    }
    // 束の下の地面の線(4本でひと束。半端な束は線が短い)
    var groups = {};
    for (var q = 1; q < rem; q++) { var gg = groupOf(q); if (!groups[gg]) groups[gg] = { l: pegX(q), r: pegX(q) }; groups[gg].l = Math.min(groups[gg].l, pegX(q)); groups[gg].r = Math.max(groups[gg].r, pegX(q)); }
    for (var key in groups) {
      var gr = groups[key];
      game.draw.rect(gr.l - 26, pegY(1) + 34, gr.r - gr.l + 52, 8, Number(key) % 2 ? CYAN : YELLOW, 0.8);
    }
  }

  function drawFlying(list) {
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      game.draw.sprite(PEG, { w: f.col, s: '#d8d0b0' }, f.x, f.y, 10, { anchor: 'center' });
    }
  }

  function stepFlying(list, dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      var f = list[i];
      f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 2200 * dt;
      if (f.t > 0.6) list.splice(i, 1);
    }
  }

  function drawCampers(turn, youPose, buddyPose, covered) {
    var tt = game.time.elapsed;
    var yf = youPose === 'pull' ? 1 : youPose === 'cheer' ? 2 : youPose === 'sad' ? 3 : 0;
    var bf = buddyPose === 'pull' ? 1 : buddyPose === 'cheer' ? 2 : buddyPose === 'sad' ? 3 : 0;
    var yb = Math.sin(tt * 3) * 5 - (youPose === 'cheer' ? Math.abs(Math.sin(tt * 9)) * 28 : 0);
    var bb = Math.sin(tt * 3 + 1) * 5 - (buddyPose === 'cheer' ? Math.abs(Math.sin(tt * 9)) * 28 : 0);
    // 手番の足もとリング
    var ring = 0.45 + 0.35 * Math.sin(tt * 8);
    if (turn === 'you') game.draw.circle(W * 0.13, H * 0.765, 90, YELLOW, ring * 0.6);
    if (turn === 'ai') game.draw.circle(W * 0.87, H * 0.765, 90, CYAN, ring * 0.6);
    game.draw.sprite(CAMPER[yf], { h: '#4a2a1a', f: '#ffd2a8', e: INK, k: INK, m: RED, j: ORANGE, p: '#3a4a6a' }, W * 0.13, H * 0.71 + yb, 14, { anchor: 'center' });
    game.draw.sprite(CAMPER[bf], { h: '#1a1a2a', f: '#f0c090', e: INK, k: INK, m: RED, j: '#3a9a8a', p: '#5a4a3a' }, W * 0.87, H * 0.71 + bb, 14, { anchor: 'center', flipX: true });
    if (covered) {
      var cx = covered === 'you' ? W * 0.13 : W * 0.87;
      for (var r = 0; r < 120; r += 8) game.draw.rect(cx - 110 + Math.sin(r * 0.1 + tt * 6) * 6, H * 0.66 + r, 220, 8, r % 16 ? ORANGE : YELLOW);
    }
  }

  function drawButtons(rem, enabled, hot, pressN) {
    for (var i = 0; i < BTN.length; i++) {
      var b = BTN[i];
      var can = enabled && b.n <= rem;
      var last = can && b.n === rem;
      var blink = last && Math.floor(game.time.elapsed * 6) % 2 === 0;
      var lift = pressN === b.n ? 10 : 0;
      game.draw.rect(b.x - BTN_W / 2, BTN_Y - BTN_H / 2 + 14, BTN_W, BTN_H, INK, can ? 0.5 : 0.2);
      game.draw.rect(b.x - BTN_W / 2, BTN_Y - BTN_H / 2 + lift, BTN_W, BTN_H, last ? (blink ? RED : '#f4c0c0') : can ? (hot ? '#fff6c8' : '#f0ead0') : '#9aa89a', can ? 1 : 0.5);
      game.draw.rect(b.x - BTN_W / 2, BTN_Y - BTN_H / 2 + lift, BTN_W, 10, can ? YELLOW : '#7a887a');
      for (var k = 0; k < b.n; k++) game.draw.sprite(PEG, { w: last ? RED : SOIL, s: SOIL }, b.x - (b.n - 1) * 34 + k * 68, BTN_Y - 30 + lift, 8, { anchor: 'center' });
      label(String(b.n), b.x, BTN_Y + 48 + lift, 56, last ? RED : INK);
    }
  }

  // ── 状態 ──
  var round, rem, turn, phase, phaseT, pullLeft, mover, turnLeft, flying, score, wonRounds, reads, timeLeft;
  var ready, halt, over, won, endT, prevBest, milestoneDone, youPose, buddyPose, covered, drop, sparkT, pressN, pressT, warnT;

  function initGame() {
    round = 0; score = 0; wonRounds = 0; reads = 0; timeLeft = TIME_LIMIT; flying = [];
    ready = 0.8; halt = null; over = false; won = false; endT = 0; milestoneDone = false; sparkT = 0; pressN = 0; pressT = 0; warnT = 0;
    prevBest = game.best || 0;
    beginTarp();
  }

  function beginTarp() {
    rem = TARPS[round]; turn = 'you'; phase = 'you'; phaseT = 0; pullLeft = 0; mover = null;
    turnLeft = TURN_TIME[round]; youPose = 'idle'; buddyPose = 'idle'; covered = null; drop = null;
  }

  function startPull(who, n) {
    mover = who; pullLeft = n; phase = 'pull'; phaseT = 0; turn = who;
  }

  function popPeg() {
    var p = rem - 1;
    var x = pegX(p), y = pegY(p) - 18;
    var g = groupOf(p);
    flying.push({ x: x, y: y, vx: mover === 'you' ? -420 : 420, vy: -900, t: 0, col: g < 0 ? RED : g % 2 ? CYAN : YELLOW });
    rem--;
    pullLeft--;
    game.audio.tone(mover === 'you' ? 520 + rem * 12 : 400 + rem * 12, 0.06, { wave: 'square', volume: 0.07 });
    game.fx.burst(x, y + 20, { color: SOIL, count: 5, speed: 140 });
  }

  function tarpFalls(onWho) {
    phase = 'fall'; phaseT = 0;
    covered = null;
    drop = { k: 0, side: onWho === 'you' ? -1 : 1, who: onWho };
    game.audio.play('se_break', 0.5);
    if (onWho === 'you') {
      halt = { t: 0.5, max: 0.5 };
    } else {
      wonRounds++;
      score += 200 + Math.round(timeLeft * 6);
      game.feedback.good(W * 0.87, H * 0.58, { text: 'GOOD', color: YELLOW, count: 18 });
      if (wonRounds === 2 && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup(wonRounds + ' / ' + TARPS.length, W / 2, H * 0.14, { color: YELLOW, size: 62 });
        game.audio.play('se_milestone', 0.45);
      }
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.8;
    youPose = ok ? 'cheer' : 'sad'; buddyPose = ok ? 'sad' : 'cheer';
    if (ok) score += Math.round(timeLeft * 20) + reads * 30;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function btnAt(x, y) {
    for (var i = 0; i < BTN.length; i++) if (Math.abs(x - BTN[i].x) < BTN_W / 2 && Math.abs(y - BTN_Y) < BTN_H / 2 + 20) return BTN[i];
    return null;
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    var b = btnAt(x, y);
    if (over || halt || ready > 0 || phase !== 'you' || !b || b.n > rem) {
      game.audio.play('se_tap', 0.05);
      game.fx.burst(x, y, { color: WHITE, count: 3, speed: 60 });
      return;
    }
    pressN = b.n; pressT = 0.18;
    youPose = 'pull';
    var leaves = rem - b.n;
    if (leaves > 0 && leaves % 4 === 1) {
      reads++;
      score += 40 + Math.round(turnLeft * 10);
      game.feedback.good(b.x, BTN_Y - 120, { text: 'NICE', color: YELLOW, count: 10 });
    } else {
      game.audio.play('se_tap', 0.3);
      game.fx.burst(b.x, BTN_Y - 60, { color: WHITE, count: 8, speed: 160 });
    }
    startPull('you', b.n);
  });

  // ── ATTRACT: 6本の張り。1本抜いて半端を片付け → 相棒2本 → 自分2本で束を閉じる → 相棒が赤旗を抜いてタープをかぶる ──
  var DEMO_CYCLE = 5.6;
  var DEMO_MOVES = [
    { at: 0.4, who: 'you', n: 1 },
    { at: 1.3, who: 'ai', n: 2 },
    { at: 2.3, who: 'you', n: 2 },
    { at: 3.2, who: 'ai', n: 1 },
  ];
  var demo = { t: 0, rem: 6, step: 0, pullLeft: 0, mover: null, pullT: 0, flying: [], gx: W / 2, gy: H * 0.8, press: false, drop: null, pressN: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { demo.rem = 6; demo.step = 0; demo.pullLeft = 0; demo.mover = null; demo.flying = []; demo.drop = null; demo.pressN = 0; }
    var mv = DEMO_MOVES[demo.step];
    var tx = W * 0.5, ty = H * 0.7;
    demo.press = false;
    if (mv && cyc >= mv.at && demo.pullLeft === 0) {
      demo.mover = mv.who; demo.pullLeft = mv.n; demo.pullT = 0; demo.step++;
      if (mv.who === 'you') { demo.pressN = mv.n; game.feedback.good(BTN[mv.n - 1].x, BTN_Y - 120, { text: 'NICE', color: YELLOW, count: 8, volume: 0.25 }); }
    }
    if (demo.pullLeft > 0) {
      demo.pullT -= dt;
      if (demo.pullT <= 0) {
        demo.pullT = PULL_T;
        var p = demo.rem - 1;
        demo.flying.push({ x: pegX(p), y: pegY(p) - 18, vx: demo.mover === 'you' ? -420 : 420, vy: -900, t: 0, col: groupOf(p) < 0 ? RED : groupOf(p) % 2 ? CYAN : YELLOW });
        demo.rem--; demo.pullLeft--;
        game.audio.tone(460 + demo.rem * 12, 0.05, { wave: 'square', volume: 0.04 });
        if (demo.rem === 0) demo.drop = { k: 0, side: 1, who: 'ai' };
      }
    }
    if (demo.drop) demo.drop.k = Math.min(1, demo.drop.k + dt * 1.6);
    stepFlying(demo.flying, dt);
    var nextYou = null;
    for (var i = demo.step; i < DEMO_MOVES.length; i++) if (DEMO_MOVES[i].who === 'you') { nextYou = DEMO_MOVES[i]; break; }
    if (nextYou && cyc > nextYou.at - 0.5) { tx = BTN[nextYou.n - 1].x; ty = BTN_Y; demo.press = cyc > nextYou.at - 0.12; }
    else if (demo.mover === 'you' && demo.pullLeft > 0) { tx = BTN[demo.pressN - 1].x; ty = BTN_Y; }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 9);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 9);
    return cyc;
  }

  function drawHud() {
    for (var i = 0; i < TARPS.length; i++) {
      var col = i < wonRounds ? YELLOW : i === round ? WHITE : '#7aa0b0';
      game.draw.rect(40 + i * 110, 48, 92, 54, INK, 0.5);
      for (var r = 0; r < 40; r += 8) game.draw.rect(48 + i * 110 + r * 0.4, 56 + r, 70, 8, col);
    }
    label(wonRounds + ' / ' + TARPS.length, W * 0.52, 78, 44, WHITE);
    label(String(score), W * 0.84, 78, 44, YELLOW);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 130, W - 80, 16, INK, 0.5);
    game.draw.rect(44, 133, (W - 88) * fr, 10, WHITE);
    // 自分の番の持ち時間(縮む帯)
    if (phase === 'you' && !over && ready <= 0) {
      var tk = Math.max(0, turnLeft / TURN_TIME[round]);
      game.draw.rect(40, 170, W - 80, 30, INK, 0.5);
      game.draw.rect(44, 174, (W - 88) * tk, 22, tk < 0.35 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? RED : YELLOW);
    }
    label(String(rem), TARP_X, H * 0.53, 70, WHITE);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.18, W - 160, H * 0.30, INK, 0.82);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.23, 104, won ? YELLOW : RED);
    label(wonRounds + ' / ' + TARPS.length, W / 2, H * 0.30, 60, WHITE);
    label('SCORE ' + score, W / 2, H * 0.36, 50, WHITE);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.42, 54, YELLOW);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.42, 42, CYAN);
    if (!won && wonRounds < TARPS.length) label('あと' + (TARPS.length - wonRounds) + '張り!', W / 2, H * 0.465, 44, YELLOW);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawCamp(0);
      drawPegs(demo.rem, demo.rem <= 3);
      drawTarp(Math.max(1, demo.rem), 6, 0, demo.drop, 0);
      drawFlying(demo.flying);
      drawCampers(demo.drop ? null : demo.mover === 'ai' || (demo.step >= 2 && demo.step < 3) ? 'ai' : 'you', demo.drop ? 'cheer' : demo.mover === 'you' && demo.pullLeft > 0 ? 'pull' : 'idle', demo.drop ? 'sad' : demo.mover === 'ai' && demo.pullLeft > 0 ? 'pull' : 'idle', demo.drop && demo.drop.k >= 1 ? 'ai' : null);
      drawButtons(demo.rem, true, true, demo.press ? demo.pressN : 0);
      label(String(demo.rem), TARP_X, H * 0.53, 70, WHITE);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.06, 92, ORANGE);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 38, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 40, YELLOW);
      else label('TAP TO START', W / 2, H * 0.975, 38, WHITE);
      return;
    }

    if (state === S.PLAYING) {
      stepFlying(flying, dt);
      if (pressT > 0) { pressT -= dt; if (pressT <= 0) pressN = 0; }
      if (drop && !halt) drop.k = Math.min(1, drop.k + dt * 1.6);
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(120, W - 120), game.random(H * 0.2, H * 0.5), { color: [YELLOW, ORANGE, CYAN, WHITE][Math.floor(game.random(0, 4))], count: 16, speed: 360 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          halt = null;
          covered = 'you';
          game.feedback.bad(W * 0.13, H * 0.58, { text: 'MISS' });
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_jump', 0.3);
      } else {
        timeLeft -= dt;
        if (phase === 'you') {
          turnLeft -= dt;
          if (turnLeft < 1 && turnLeft > 0) {
            warnT -= dt;
            if (warnT <= 0) { warnT = 0.25; game.audio.tone(880, 0.04, { wave: 'square', volume: 0.05 }); }
          }
          if (turnLeft <= 0) {
            turnLeft = 0;
            halt = { t: 0.5, max: 0.5 };
            drop = { k: 0, side: -1, who: 'you' };
            game.audio.play('se_break', 0.5);
          }
        } else if (phase === 'pull') {
          phaseT -= dt;
          if (phaseT <= 0) {
            phaseT = PULL_T;
            popPeg();
            if (rem === 0) {
              tarpFalls(mover);
            } else if (pullLeft === 0) {
              if (mover === 'you') { phase = 'think'; phaseT = 0.35; turn = 'ai'; youPose = 'idle'; buddyPose = 'idle'; }
              else { phase = 'you'; turn = 'you'; turnLeft = TURN_TIME[round]; buddyPose = 'idle'; }
            }
          }
          if (mover === 'ai') buddyPose = 'pull';
        } else if (phase === 'think') {
          phaseT -= dt;
          if (phaseT <= 0) startPull('ai', aiTake(rem, SMART[round]));
        } else if (phase === 'fall') {
          phaseT += dt;
          buddyPose = 'sad'; youPose = 'cheer';
          if (drop && drop.k >= 1) covered = 'ai';
          if (phaseT > 1.1) {
            if (round + 1 >= TARPS.length) finish(true);
            else { round++; beginTarp(); game.audio.play('se_coin', 0.3); }
          }
        }
        if (timeLeft <= 0 && !over) {
          timeLeft = 0;
          game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
          finish(false);
        }
      }
    }

    drawCamp(0);
    drawPegs(rem, phase === 'you' && rem <= 3);
    drawTarp(Math.max(1, rem), TARPS[round], 0, drop, halt ? 1 - halt.t / halt.max : 0);
    drawFlying(flying);
    drawCampers(over ? null : turn, youPose, buddyPose, covered);
    drawButtons(rem, phase === 'you' && !over && !halt && ready <= 0, phase === 'you', pressN);
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, YELLOW);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.975, 38, WHITE);
      var stats = { tarps: wonRounds, total: TARPS.length, reads: reads };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['D5', 0.5], ['F#5', 0.5], ['A5', 1], ['G5', 0.5], ['F#5', 0.5], ['E5', 1],
      ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['A5', 0.5], ['B5', 1], ['A5', 1],
      ['G5', 0.5], ['F#5', 0.5], ['E5', 1], ['F#5', 0.5], ['E5', 0.5], ['D5', 1],
      ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['D5', 2],
    ], {
      tempo: 116, wave: 'triangle', volume: 0.05, loop: true,
      bass: [['D3', 1], ['A2', 1], ['D3', 1], ['A2', 1], ['G2', 1], ['D3', 1], ['A2', 1], ['E3', 1],
        ['G2', 1], ['D3', 1], ['A2', 1], ['F#2', 1], ['G2', 1], ['A2', 1], ['D3', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);
