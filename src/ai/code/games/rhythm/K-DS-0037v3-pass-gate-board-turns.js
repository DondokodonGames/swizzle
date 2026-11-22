// K-DS-0037v3-pass-gate-board-turns.js
// 関所の開門板木 — 相方の門番が1小節で打った板木の節を、次の小節で二人で一打ずつ交互に打ち分けて返す。自分の打ちでだけ打ち、相方の打ちには手を出さない
// 操作: 画面のどこでも押すと自分の板木を打つ(押した瞬間で判定)。1回は2小節: 1小節目は左の相方が一人で節を打つ(打った位置が中段の札に白く並ぶ。この間に打つと割り込みでMISS)。小節の最後の拍(0.6秒前)で札が交互に青=相方・赤=自分に色分けされ、相方が先頭の札の持ち主を指さす(後半は自分から始まる回がある)。2小節目は相方が青の札を打つので、自分は赤の札の8分の位置で打つ。ずれでPERFECT/GOOD、青の札で打つ・札の無い所で打つ・赤の札を打ち逃すとMISS
// 終わり: 4回(節は4打→5打→6打→6打、100BPM・8小節・約19秒)を返し切ればCLEAR(判定点+きれいに返せた回のボーナス+残り)。MISS3回でGAME OVER
// @mechanic: turn_attack
// @theme: mountain_pass_gate_board_turns
// 世界観: 夜明け前の峠の関所の門前で、二人の門番が相方の打ってみせた板木の節を一打ずつ交互に打ち分け、間を崩さずに開門の刻を告げて大門を開ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・きれいに返せた回の数・PERFECT/GOOD/MISS数・最大連続
// スタイル: 8bit HOME
var STYLE = { bg: ['#000000', '#24188c'], main: ['#a85c18', '#fcfcfc', '#f8b800'], accent: ['#d82800', '#0078f8'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒の粗いドット(16px格子)、輪郭線なし。石垣・瓦・星はタイル反復、雲は一方向スクロール
  var BLACK = STYLE.bg[0], NIGHT = STYLE.bg[1];
  var WOOD = STYLE.main[0], WHITE = STYLE.main[1], GOLD = STYLE.main[2];
  var RED = STYLE.accent[0], BLUE = STYLE.accent[1];
  var STONE = '#7c7c7c', STONE_D = '#4c4c4c', DAWN = '#f87858', SKIN = '#fca044', DARKWOOD = '#503000';

  var GAME_TITLE = 'GATE BOARDS';
  var BPM = 100, SPB = 60 / BPM, EIGHTH = SPB / 2, BAR = SPB * 4;
  var ROUNDS = 4;
  var TIME_LIMIT = 19.2;               // 8小節 × 2.4秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.11;
  var MISS_MAX = 3;

  // 節(8分の位置0〜7)と先頭の持ち主(P=相方 / Y=自分)
  var POOLS = [
    [{ s: [0, 2, 4, 6], f: 'P' }],
    [{ s: [0, 2, 3, 4, 6], f: 'P' }, { s: [0, 2, 4, 5, 6], f: 'P' }],
    [{ s: [0, 1, 2, 4, 5, 6], f: 'Y' }, { s: [0, 2, 3, 4, 6, 7], f: 'Y' }],
    [{ s: [0, 2, 3, 5, 6, 7], f: 'P' }, { s: [0, 1, 3, 4, 6, 7], f: 'Y' }]
  ];

  var P_X = 190, Y_X = 890, MAN_Y = 1060;
  var P_BOARD = 360, Y_BOARD = 720, BOARD_Y = 930;
  var GATE_X = 540, GATE_TOP = 600, GATE_BOT = 1150;
  var STRIP_Y = Math.round(H * 0.69), CELL_W = 112, CELL_X = 540 - CELL_W * 4;
  var PAD_Y = Math.round(H * 0.86);

  // 伴奏(オリジナル): 矩形波の節+三角波の低音+短い高音の刻み。1拍ずつ拍クロックから鳴らす
  var MEL_CALL = [[['C5', 0.5], ['E5', 0.5]], [['G5', 0.5], ['E5', 0.5]], [['A5', 0.5], ['G5', 0.5]], [['E5', 0.5], ['D5', 0.5]]];
  var MEL_RESP = [[['G4', 1]], [['R', 1]], [['A4', 1]], [['R', 1]]];
  var BASS = [['C3', 'C3', 'F2', 'G2'], ['A2', 'A2', 'F2', 'G2']];

  // ---- スプライト(16px格子) ----
  var GUARD = [
    '....hhhh....', '..hhhhhhhh..', 'hhhhhhhhhhhh', '...ssssss...', '...skssks...', '...ssssss...', '....ssss....',
    '..cccccccc..', '.cccwwwwccc.', 'sccccccccccs', 's.cccccccc.s', '..cccccccc..', '..pppppppp..', '..ppp..ppp..',
    '..ppp..ppp..', '.kkkk..kkkk.'
  ];
  var GUARD_HIT = GUARD.slice();
  GUARD_HIT[6] = '....skks....';
  var GUARD_OOPS = GUARD.slice();
  GUARD_OOPS[4] = '...ksssk....'.slice(0, 12);
  GUARD_OOPS[6] = '....kkkk....';
  var PAL_P = { h: GOLD, s: SKIN, k: BLACK, c: BLUE, w: WHITE, p: DARKWOOD };
  var PAL_Y = { h: GOLD, s: SKIN, k: BLACK, c: RED, w: WHITE, p: DARKWOOD };
  var PAL_FLASH = { h: WHITE, s: WHITE, k: WHITE, c: WHITE, w: WHITE, p: WHITE };
  var LANTERN = ['.kkkk.', 'wwwwww', 'wrrrrw', 'wwwwww', 'wrrrrw', 'wwwwww', '.kkkk.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, rounds, misses, score, combo, maxCombo, nPerfect, nGood, nMiss, nClean;
  var hitStop, pendingBad, failAt, over, won, outroT, demoMode, prevBest, resultT, milestoneDone;
  var lastSlot, beatPulse, pT, yT, pointT, gateOpen, gateTo, oopsT, joyT, stars;

  function buildRound(r, demo) {
    var pick = demo ? { s: [0, 2, 4, 6], f: 'P' } : POOLS[r][Math.floor(game.random(0, POOLS[r].length)) % POOLS[r].length];
    var notes = [];
    for (var i = 0; i < pick.s.length; i++) {
      var own = (i % 2 === 0) === (pick.f === 'P') ? 'P' : 'Y';
      notes.push({ k: pick.s[i], owner: own, shown: false, st: 'wait' });
    }
    return { notes: notes, first: pick.f, assigned: false, warned: false, missed: 0, closed: false };
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.3 : -READY_T;
    rounds = [];
    var n = demo ? 1 : ROUNDS;
    for (var r = 0; r < n; r++) rounds.push(buildRound(r, demo));
    misses = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nClean = 0;
    hitStop = 0; pendingBad = null; failAt = null; over = false; won = false; outroT = 0;
    prevBest = game.best; resultT = 0; milestoneDone = false;
    lastSlot = -1; beatPulse = 0; pT = 0; yT = 0; pointT = 0; gateOpen = 0; gateTo = 0; oopsT = 0; joyT = 0;
    if (!stars) {
      stars = [];
      for (var i = 0; i < 30; i++) stars.push({ x: Math.floor(game.random(0, 66)) * 16, y: 240 + Math.floor(game.random(0, 20)) * 16, p: game.random(0, 6) });
    }
  }

  function isCall(b) { return b % 2 === 0; }
  function roundOf(b) { return Math.floor(b / 2); }
  function curRound() {
    if (clock < 0) return rounds[0];
    return rounds[Math.min(rounds.length - 1, roundOf(Math.floor(clock / BAR)))];
  }

  // ---- 音 ----
  function boardSound(who, v) {
    if (who === 'P') { game.audio.tone(620, 0.07, { wave: 'square', volume: 0.09 * v }); game.audio.tone(310, 0.1, { wave: 'triangle', volume: 0.12 * v }); }
    else { game.audio.tone(930, 0.07, { wave: 'square', volume: 0.09 * v }); game.audio.tone(465, 0.1, { wave: 'triangle', volume: 0.12 * v }); }
  }
  function partnerStrike(v) {
    pT = 0.14;
    boardSound('P', v);
    game.fx.burst(P_BOARD, BOARD_Y, { color: GOLD, count: 6, speed: 200, size: 10, life: 0.35 });
  }

  // 拍クロック(1本)。8分のマスごとに伴奏・相方の打ち・番の予告
  function onSlot(s) {
    var b = Math.floor(s / 8), k = s % 8;
    var r = roundOf(b);
    if (r >= rounds.length) return;
    var R = rounds[r];
    var v = demoMode ? 0.4 : 1;
    var call = isCall(b);
    if (k % 2 === 0) {
      var beat = k / 2;
      game.audio.melody(call ? MEL_CALL[beat] : MEL_RESP[beat], { tempo: BPM, wave: 'square', volume: (call ? 0.035 : 0.03) * v, bass: [[BASS[r % 2][beat], 1]], bassVolume: 0.09 * v, bassWave: 'triangle' });
      beatPulse = 1;
    } else {
      game.audio.tone(6000, 0.015, { wave: 'square', volume: 0.012 * v });
    }
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.k !== k) continue;
      if (call) { n.shown = true; partnerStrike(v); }
      else if (n.owner === 'P') { n.st = 'ok'; partnerStrike(v); }
    }
    if (call && k === 6 && !R.warned) {
      // 番の予告: 札を色分けし、相方が先頭の持ち主を指さす
      R.warned = true; R.assigned = true; pointT = 2 * EIGHTH + 0.2;
      game.audio.tone(R.first === 'Y' ? 784 : 523, 0.08, { wave: 'square', volume: 0.07 * v });
      game.audio.tone(R.first === 'Y' ? 1046 : 659, 0.12, { wave: 'square', volume: 0.07 * v });
    }
  }

  // ---- 判定 ----
  function missAt(x, y, kind, R) {
    misses++; nMiss++; combo = 0;
    if (R) R.missed++;
    hitStop = 0.42; pendingBad = { x: x, y: y }; failAt = { x: x, y: y, kind: kind };
    oopsT = 1.0;
    if (!demoMode) game.audio.play('se_bad', 0.3);
  }
  function releaseStop() {
    var p = pendingBad;
    pendingBad = null; failAt = null;
    if (p) game.feedback.bad(p.x, p.y - 60, { text: 'MISS', shake: demoMode ? 3 : 14, volume: demoMode ? 0.05 : 0.6 });
    if (!demoMode && misses >= MISS_MAX) finishRun(false);
  }
  function cellX(k) { return CELL_X + k * CELL_W + CELL_W / 2; }

  // 自分の板木を1回打つ(本番の指もATTRACTのゴーストも同じ関数)
  function strike() {
    yT = 0.14;
    if (clock < 0) return 'none';
    var b0 = Math.floor(clock / BAR);
    var rb = -1;
    if (!isCall(b0)) rb = b0;
    else if (clock >= (b0 + 1) * BAR - GOOD_W) rb = b0 + 1;
    var r = roundOf(rb >= 0 ? rb : b0);
    if (r >= rounds.length) return 'air';
    var R = rounds[r];
    if (rb < 0) { missAt(P_BOARD, BOARD_Y, 'interrupt', R); return 'miss'; }
    var t0 = rb * BAR;
    var own = null, od = 99, other = null, pd = 99;
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      var d = Math.abs(clock - (t0 + n.k * EIGHTH));
      if (n.owner === 'Y' && n.st === 'wait' && d < od) { od = d; own = n; }
      if (n.owner === 'P' && d < pd) { pd = d; other = n; }
    }
    if (own && od <= GOOD_W) {
      own.st = 'ok';
      var perfect = od <= PERFECT_W;
      combo++; maxCombo = Math.max(maxCombo, combo);
      if (perfect) nPerfect++; else nGood++;
      var pts = (perfect ? 100 : 60) + Math.min(10, combo) * 10;
      score += pts;
      game.feedback.good(Y_BOARD, BOARD_Y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : WHITE, size: perfect ? 58 : 46, count: perfect ? 12 : 7, volume: demoMode ? 0.03 : 0.1 });
      if (!demoMode && combo >= 4 && combo % 4 === 0) game.fx.popup('x' + combo, W / 2, 560, { color: GOLD, size: 80 });
      return perfect ? 'perfect' : 'good';
    }
    if (other && pd <= GOOD_W) { missAt(cellX(other.k), STRIP_Y, 'clash', R); return 'miss'; }
    missAt(Y_BOARD, BOARD_Y, 'off', R);
    return 'miss';
  }

  function closeRound(r) {
    var R = rounds[r];
    R.closed = true;
    if (R.missed === 0) {
      nClean++;
      score += 250 + r * 50;
      gateTo = Math.min(1, gateTo + 1 / Math.max(ROUNDS, rounds.length));
      joyT = 1.0;
      game.fx.popup('NICE', GATE_X, GATE_TOP + 120, { color: GOLD, size: 88 });
      game.fx.burst(GATE_X, GATE_TOP + 300, { color: GOLD, count: 16, speed: 360 });
      if (!demoMode) {
        game.audio.play('se_powerup', 0.4);
        if (!milestoneDone && nClean >= 2) {
          milestoneDone = true;
          game.fx.popup(nClean + ' / ' + ROUNDS, W / 2, 420, { color: WHITE, size: 80 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      gateTo = 1;
      score += (MISS_MAX - misses) * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 420 + (i % 2) * 140, { color: [GOLD, RED, WHITE, BLUE][i % 4], count: 20, speed: 460 });
      game.fx.flash(GOLD, 0.18);
      game.audio.play('se_success', 0.55);
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 520, { color: GOLD, size: 80 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, cleanRounds: nClean, total: ROUNDS, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function stepRun(dt) {
    clock += dt;
    var s8 = Math.floor((clock + 0.02) / EIGHTH);
    while (lastSlot < s8) { lastSlot++; if (lastSlot >= 0) onSlot(lastSlot); }
    for (var r = 0; r < rounds.length; r++) {
      var R = rounds[r];
      var t0 = (2 * r + 1) * BAR;
      for (var i = 0; i < R.notes.length; i++) {
        var n = R.notes[i];
        if (n.owner === 'Y' && n.st === 'wait' && clock > t0 + n.k * EIGHTH + GOOD_W) {
          n.st = 'miss';
          missAt(cellX(n.k), STRIP_Y, 'silent', R);
          return;
        }
      }
      if (!R.closed && clock >= t0 + BAR - 0.05) closeRound(r);
    }
    if (!demoMode && !over && clock >= ROUNDS * 2 * BAR) finishRun(misses < MISS_MAX);
  }

  function tick(dt) {
    beatPulse = Math.max(0, beatPulse - dt * 4);
    pT = Math.max(0, pT - dt);
    yT = Math.max(0, yT - dt);
    pointT = Math.max(0, pointT - dt);
    oopsT = Math.max(0, oopsT - dt);
    joyT = Math.max(0, joyT - dt);
    gateOpen += (gateTo - gateOpen) * Math.min(1, dt * 3);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.5) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || clock < -0.05 || y < 230) return;
    var res = strike();
    if (res === 'perfect' || res === 'good') boardSound('Y', 1);
    else if (res === 'miss') game.audio.tone(200, 0.12, { wave: 'square', volume: 0.08, slide: -80 });
    else game.fx.burst(x, y, { color: WOOD, count: 4, speed: 120 });
  });

  // ---- 描画ヘルパー(16px格子にそろえる) ----
  function snap(v) { return Math.round(v / 16) * 16; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 5, y + 5, { size: sz, color: BLACK, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // ---- 描画 ----
  function drawSky() {
    var t = game.time.elapsed;
    var prog = Math.max(0, Math.min(1, clock / (ROUNDS * 2 * BAR)));
    if (state === S.ATTRACT) prog = 0.3;
    var top = prog < 0.5 ? NIGHT : '#3c1878';
    var low = prog < 0.35 ? '#2838a8' : (prog < 0.7 ? '#a83858' : DAWN);
    game.draw.gradient(230, 760, [[0, top], [1, low]]);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (Math.floor(t * 2 + s.p) % 3 === 0) continue;
      game.draw.rect(s.x, s.y, 8, 8, WHITE, Math.max(0, 1 - prog * 1.4));
    }
    // 朝日(終盤に昇る)
    if (prog > 0.6 || won) game.draw.circle(GATE_X, 760 - snap((prog - 0.6) * 300), 80, GOLD);
    // 山並み(段々の矩形)と、一方向に流れる雲
    for (var m = 0; m < 6; m++) {
      var mx = m * 200 - 40, mh = [160, 240, 192, 272, 176, 224][m];
      for (var st = 0; st < mh; st += 32) game.draw.rect(mx + st * 0.5, 760 - mh + st, 240 - st, 32, '#1c2c5c');
    }
    var cx = snap((t * 40) % (W + 400)) - 200;
    game.draw.rect(W - cx, 320, 192, 32, WHITE, 0.5);
    game.draw.rect(W - cx + 32, 288, 112, 32, WHITE, 0.5);
  }

  function drawGate() {
    // 石垣(レンガのタイル反復)
    for (var y = 700; y < 1150; y += 32) {
      var off = (y / 32) % 2 ? 32 : 0;
      for (var x = -off; x < W; x += 64) {
        if (x > GATE_X - 300 && x < GATE_X + 236) continue;
        game.draw.rect(x, y, 60, 28, (x / 64 + y / 32) % 3 ? STONE : STONE_D);
      }
    }
    // 門の奥(開くと明け方の道が見える)
    var gw = 520;
    game.draw.rect(GATE_X - gw / 2, GATE_TOP + 64, gw, GATE_BOT - GATE_TOP - 64, '#f8d878');
    game.draw.rect(GATE_X - 32, GATE_TOP + 300, 64, GATE_BOT - GATE_TOP - 300, '#c88848');
    // 扉(左右に開く)、鋲の格子
    var open = gateOpen * (gw / 2 - 16);
    var dw = gw / 2 - open;
    for (var side = -1; side <= 1; side += 2) {
      var dx = side < 0 ? GATE_X - gw / 2 : GATE_X + open;
      game.draw.rect(dx, GATE_TOP + 64, dw, GATE_BOT - GATE_TOP - 64, WOOD);
      for (var ty = GATE_TOP + 96; ty < GATE_BOT; ty += 64) {
        game.draw.rect(dx, ty, dw, 8, DARKWOOD);
        for (var tx = dx + 24; tx < dx + dw - 8; tx += 64) game.draw.rect(tx, ty + 24, 16, 16, GOLD);
      }
    }
    // 柱と屋根(瓦の段)
    game.draw.rect(GATE_X - gw / 2 - 48, GATE_TOP + 32, 48, GATE_BOT - GATE_TOP - 32, DARKWOOD);
    game.draw.rect(GATE_X + gw / 2, GATE_TOP + 32, 48, GATE_BOT - GATE_TOP - 32, DARKWOOD);
    for (var r = 0; r < 4; r++) game.draw.rect(GATE_X - gw / 2 - 112 + r * 16, GATE_TOP - 32 + r * 24, gw + 224 - r * 32, 24, r % 2 ? '#3c3c3c' : '#5c5c5c');
    for (var k = 0; k < 20; k++) game.draw.rect(GATE_X - gw / 2 - 96 + k * 36, GATE_TOP + 64, 16, 16, '#2c2c2c');
    // 地面(タイル)
    for (var gx = 0; gx < W; gx += 64) {
      game.draw.rect(gx, 1150, 64, 112, gx / 64 % 2 ? '#887050' : '#a08060');
      game.draw.rect(gx, 1150, 64, 8, '#685030');
    }
  }

  function drawBoard(x, y, who, lit, flash) {
    // 吊り枠
    game.draw.rect(x - 112, y - 160, 16, 300, DARKWOOD);
    game.draw.rect(x + 96, y - 160, 16, 300, DARKWOOD);
    game.draw.rect(x - 128, y - 176, 256, 24, DARKWOOD);
    game.draw.rect(x - 48, y - 152, 8, 64, WHITE, 0.6);
    game.draw.rect(x + 40, y - 152, 8, 64, WHITE, 0.6);
    var sh = lit ? 8 : 0;
    var big = flash ? 16 : 0;
    game.draw.rect(x - 80 - big, y - 88 + sh - big, 160 + big * 2, 96 + big * 2, flash ? WHITE : (lit ? GOLD : WOOD));
    if (!flash) {
      game.draw.rect(x - 80, y - 88 + sh, 160, 8, who === 'P' ? BLUE : RED);
      game.draw.rect(x - 64, y - 56 + sh, 128, 8, DARKWOOD);
      game.draw.rect(x - 48, y - 24 + sh, 96, 8, DARKWOOD);
    }
  }

  function drawGuard(x, who, hitT, pal) {
    var t = game.time.elapsed;
    var bob = -snap(beatPulse * 16) + (Math.floor(t * 2) % 2 ? 0 : 0);
    var myFail = hitStop > 0 && failAt && ((who === 'Y' && failAt.kind !== 'silent') || (who === 'P' && failAt.kind === 'interrupt'));
    var frame = hitT > 0 ? GUARD_HIT : (oopsT > 0 && who === 'Y' ? GUARD_OOPS : GUARD);
    if (joyT > 0) bob = -snap(Math.abs(Math.sin(t * 10)) * 32);
    game.draw.sprite(frame, myFail && who === 'Y' ? PAL_FLASH : pal, x, MAN_Y + bob, 10, { anchor: 'center', flipX: who === 'Y' });
    // 木槌(持ち手+頭)。打つ瞬間は板木の前へ
    var bx = who === 'P' ? P_BOARD : Y_BOARD;
    var hx = hitT > 0 ? bx + (who === 'P' ? -40 : 40) : x + (who === 'P' ? 80 : -80);
    var hy = hitT > 0 ? BOARD_Y - 40 : MAN_Y - 120 + bob;
    var sx = x + (who === 'P' ? 56 : -56), sy = MAN_Y + 16 + bob;
    game.draw.line(sx, sy, hx, hy, DARKWOOD, 16);
    game.draw.rect(hx - 24, hy - 32, 48, 48, '#c87c38');
  }

  function drawLanterns(R) {
    var t = game.time.elapsed;
    var b = clock >= 0 ? Math.floor(clock / BAR) : -1;
    var call = b < 0 || isCall(b);
    var pOn = call, yOn = false;
    if (!call && R) {
      // 返しの番: 次に打つ札の持ち主の行灯が灯る
      var t0 = b * BAR, next = null;
      for (var i = 0; i < R.notes.length; i++) {
        var n = R.notes[i];
        if (t0 + n.k * EIGHTH > clock - GOOD_W) { next = n; break; }
      }
      if (next) { pOn = next.owner === 'P'; yOn = next.owner === 'Y'; }
    }
    if (pointT > 0 && R) { pOn = R.first === 'P'; yOn = R.first === 'Y'; if (Math.floor(t * 12) % 2) { pOn = false; yOn = false; } }
    game.draw.sprite(LANTERN, { k: BLACK, w: pOn ? WHITE : '#5c5c5c', r: pOn ? BLUE : '#3c3c3c' }, P_X, 820, 12, { anchor: 'center' });
    game.draw.sprite(LANTERN, { k: BLACK, w: yOn ? WHITE : '#5c5c5c', r: yOn ? RED : '#3c3c3c' }, Y_X, 820, 12, { anchor: 'center' });
    if (pOn) game.draw.circle(P_X, 820, 80, GOLD, 0.18);
    if (yOn) game.draw.circle(Y_X, 820, 80, GOLD, 0.18);
    // 相方の指さし: 先頭の持ち主へ
    if (pointT > 0 && R) {
      var tx = R.first === 'Y' ? Y_X - 120 : P_X + 40;
      game.draw.line(P_X + 40, MAN_Y - 40, tx, MAN_Y - 120, SKIN, 12);
      game.draw.rect(tx - 12, MAN_Y - 132, 24, 24, SKIN);
    }
  }

  function drawStrip(R) {
    var t = game.time.elapsed;
    var b = clock >= 0 ? Math.floor(clock / BAR) : -1;
    var call = b < 0 || isCall(b);
    game.draw.rect(CELL_X - 24, STRIP_Y - 80, CELL_W * 8 + 48, 160, BLACK);
    game.draw.rect(CELL_X - 24, STRIP_Y - 80, CELL_W * 8 + 48, 8, call ? BLUE : RED);
    game.draw.rect(CELL_X - 24, STRIP_Y + 72, CELL_W * 8 + 48, 8, call ? BLUE : RED);
    var cur = b >= 0 && !over ? Math.floor((clock - b * BAR) / EIGHTH + 0.5) % 8 : -1;
    for (var k = 0; k < 8; k++) {
      var x = CELL_X + k * CELL_W;
      game.draw.rect(x + 8, STRIP_Y - 56, CELL_W - 16, 112, k % 2 === 0 ? '#2c2c2c' : '#1c1c1c');
      if (k === cur) game.draw.rect(x + 8, STRIP_Y + 44, CELL_W - 16, 12, WHITE, 0.4 + beatPulse * 0.6);
    }
    if (!R) return;
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (!n.shown) continue;
      var cx = cellX(n.k);
      var col = WHITE;
      if (R.assigned) col = n.owner === 'P' ? BLUE : RED;
      var done = n.st === 'ok', miss = n.st === 'miss';
      var flash = hitStop > 0 && failAt && Math.abs(failAt.x - cx) < 4 && failAt.y === STRIP_Y;
      var sz = flash ? 88 : 64;
      game.draw.rect(cx - sz / 2, STRIP_Y - sz / 2 - 8, sz, sz * 0.7, flash ? WHITE : (miss ? '#5c5c5c' : col));
      if (done) game.draw.rect(cx - 16, STRIP_Y - 24, 32, 16, GOLD);
      if (miss) { game.draw.rect(cx - 24, STRIP_Y - 30, 48, 8, RED); }
      // 持ち主の印(相方=丸い陣笠の点 / 自分=四角)
      if (R.assigned && !flash) {
        if (n.owner === 'P') game.draw.circle(cx, STRIP_Y + 32, 10, BLUE);
        else game.draw.rect(cx - 10, STRIP_Y + 22, 20, 20, RED);
      }
    }
  }

  function drawPad() {
    var pr = yT > 0;
    game.draw.rect(0, 1440, W, H - 1440, '#1c1408');
    for (var x = 0; x < W; x += 64) game.draw.rect(x, 1440, 32, 8, DARKWOOD);
    var sh = pr ? 16 : 0;
    game.draw.rect(PAD_X() - 320, PAD_Y - 112 + sh, 640, 208, BLACK);
    game.draw.rect(PAD_X() - 304, PAD_Y - 128 + sh, 608, 208, pr ? GOLD : WOOD);
    game.draw.rect(PAD_X() - 304, PAD_Y - 128 + sh, 608, 16, RED);
    game.draw.rect(PAD_X() - 240, PAD_Y - 72 + sh, 480, 12, DARKWOOD);
    game.draw.rect(PAD_X() - 200, PAD_Y - 24 + sh, 400, 12, DARKWOOD);
    game.draw.rect(PAD_X() - 160, PAD_Y + 24 + sh, 320, 12, DARKWOOD);
  }
  function PAD_X() { return W / 2; }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, BLACK);
    txt('SCORE ' + score, 40, 84, 50, WHITE, 'left');
    txt('BEST ' + game.best, W - 40, 84, 34, GOLD, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      game.draw.rect(W - 96 - i * 72, 128, 48, 48, on ? RED : '#3c3c3c');
      game.draw.rect(W - 88 - i * 72, 136, 16, 16, on ? '#fc7460' : '#3c3c3c');
    }
    for (var r = 0; r < ROUNDS; r++) {
      var R = rounds[r], col = '#3c3c3c';
      if (R && R.closed) col = R.missed === 0 ? GOLD : RED;
      else if (R && curRound() === R && clock >= 0) col = WHITE;
      game.draw.rect(40 + r * 72, 128, 48, 48, col);
    }
    if (combo >= 2) txt('x' + combo, 360, 172, 44, GOLD, 'left');
    var progress = Math.max(0, Math.min(1, clock / (ROUNDS * 2 * BAR)));
    game.draw.rect(40, 200, W - 80, 16, '#3c3c3c');
    game.draw.rect(40, 200, snap((W - 80) * progress), 16, GOLD);
  }

  function drawScene() {
    var R = curRound();
    drawSky();
    drawGate();
    drawLanterns(R);
    var pFlash = hitStop > 0 && failAt && failAt.kind === 'interrupt';
    var yFlash = hitStop > 0 && failAt && failAt.kind === 'off';
    drawBoard(P_BOARD, BOARD_Y, 'P', pT > 0, pFlash);
    drawBoard(Y_BOARD, BOARD_Y, 'Y', yT > 0, yFlash);
    drawGuard(P_X, 'P', pT, PAL_P);
    drawGuard(Y_X, 'Y', yT, PAL_Y);
    drawStrip(R);
    drawPad();
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, BLACK, 0.14);
  }

  function drawResult(showTap) {
    var y0 = H * 0.27;
    game.draw.rect(64, y0, W - 128, H * 0.35, BLACK, 0.92);
    game.draw.rect(64, y0, W - 128, 16, won ? GOLD : RED);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.335, 100, won ? GOLD : RED);
    txt('SCORE ' + score, W / 2, H * 0.395, 62, WHITE);
    txt('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.44, 36, GOLD);
    game.draw.rect(W / 2 - 170, H * 0.47, 64, 40, WOOD);
    game.draw.rect(W / 2 - 170, H * 0.47, 64, 8, RED);
    txt(nClean + ' / ' + ROUNDS, W / 2 + 40, H * 0.49, 54, WHITE);
    if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.545, 62, GOLD);
    else txt('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 44, WHITE);
    if (!won) {
      var left = 0;
      for (var r = 0; r < rounds.length; r++) for (var i = 0; i < rounds[r].notes.length; i++) if (rounds[r].notes[i].owner === 'Y' && rounds[r].notes[i].st === 'wait') left++;
      txt('あと' + Math.max(1, left) + '打!', W / 2, H * 0.585, 50, SKIN);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.61, 34, WHITE);
  }

  // ---- ATTRACT: 実ロジックで1回(節4打・相方から)。奇数周は自分の札だけ打ってNICE、偶数周は相方の札で手を出してMISS ----
  var demo = { t: 0, cyc: 0, plan: [], pi: 0, pressT: 0 };
  var DEMO_CYC = 2 * BAR + 0.9;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++;
      demo.plan = demo.cyc % 2 === 0 ? [2, 4, 6] : [2, 6];
      demo.pi = 0;
    }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) releaseStop(); }
    else stepRun(dt);
    if (demo.pi < demo.plan.length && hitStop <= 0 && clock >= BAR + demo.plan[demo.pi] * EIGHTH) {
      var res = strike();
      if (res === 'perfect' || res === 'good') boardSound('Y', 0.3);
      demo.pi++; demo.pressT = 0.12;
    }
    demo.pressT = Math.max(0, demo.pressT - dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    tick(dt);

    if (state === S.ATTRACT) {
      if (!rounds) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 60, PAD_Y + (demo.pressT > 0 ? 0 : 50), { press: demo.pressT > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, BLACK);
      var bob = snap(Math.sin(t * 2.4) * 10);
      txt(GAME_TITLE, W / 2 + 8, 118 + bob, 108, RED);
      game.draw.text(GAME_TITLE, W / 2, 110 + bob, { size: 108, color: GOLD, bold: true, align: 'center' });
      txt('HI-SCORE ' + game.best, W / 2, 200, 38, WHITE);
      if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 46, GOLD);
      else txt('INSERT COIN', W / 2, H * 0.975, 42, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) releaseStop();
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(64, H * 0.42, W - 128, 176, BLACK, 0.9);
      game.draw.rect(64, H * 0.42, W - 128, 16, RED);
      txt(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 128, 110, GOLD);
    }
    // 最初の返しの番だけ、自分の札の拍で手を薄く出す
    var R0 = rounds[0];
    if (!over && R0 && clock > BAR - 0.2 && clock < 2 * BAR) {
      var pressNow = false;
      for (var i = 0; i < R0.notes.length; i++) {
        var n = R0.notes[i];
        if (n.owner === 'Y' && Math.abs(clock - (BAR + n.k * EIGHTH)) < 0.08) pressNow = true;
      }
      game.draw.hand(W / 2 + 60, PAD_Y + (pressNow ? 0 : 50), { press: pressNow, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
