// GH-PS-0034-peg-launch-pocket.js
// ペグランチポケット — 引いて放った玉が釘の海を跳ねて落ちる。中央の穴を狙う
// 操作: 玉を下に引いて狙いと強さを決め、離して発射。落下中は釘に当たって不規則に跳ねる
// 終わり: 3球の合計得点が目標以上ならクリア。届かなければゲームオーバー
// @mechanic: slingshot
// @theme: neon_peg_parlor
// 世界観: ネオンが唸る夜のペグ場。玉の精が釘の群れを抜けて、中央の金の穴を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 3球合計スコア
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s NEON: 濃紺グラデ + 疑似グロー、点滅が命
  var STYLE = {
    bg: ['#0a0630', '#03010c'],
    main: ['#ff2bd6', '#28e8ff', '#ffe600'],
    accent: ['#ffffff', '#ff3b3b'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgBot: STYLE.bg[1],
    peg: STYLE.main[1], pegGlow: '#0d3a44', orb: STYLE.main[0], orbCore: STYLE.accent[0],
    gold: STYLE.main[2], good: '#39ff9e', bad: STYLE.accent[1], white: '#ffffff', ink: '#050208',
  };

  var GAME_TITLE = 'PEG LAUNCH POCKET';
  var SHOTS_TOTAL = 3;
  var SCORE_TARGET = 60;
  var CX = W * 0.5;
  var ANCHOR = { x: CX, y: H * 0.84 };
  var FIELD_TOP = H * 0.22, FIELD_BOT = H * 0.60;
  var POCKET_Y = H * 0.66;
  var FIELD_HALF = 320;
  var BALL_R = 20, PEG_R = 15;
  var GRAVITY = 1500;

  var POCKETS = [
    { lo: -320, hi: -170, val: 0,  label: 'gutter' },
    { lo: -170, hi: -55,  val: 10, label: 'low' },
    { lo: -55,  hi: 55,   val: 50, label: 'jackpot' },
    { lo: 55,   hi: 170,  val: 10, label: 'low' },
    { lo: 170,  hi: 320,  val: 0,  label: 'gutter' },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var shotIdx, pegs, totalScore, fever, phase, pull, orb, resultText, resultTextT, warnSide;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ORB_F = [
    ['.##.', '####', '####', '.##.'],
    ['.##.', '####', '####', '.##.'],
  ];
  var ORB_PAL = { '#': C.orb };

  function buildPegs(rows) {
    var list = [];
    var rowGap = (FIELD_BOT - FIELD_TOP) / (rows - 1);
    var colGap = 92;
    for (var r = 0; r < rows; r++) {
      var y = FIELD_TOP + r * rowGap;
      var offset = (r % 2 === 0) ? 0 : colGap / 2;
      for (var x = -FIELD_HALF + 40; x <= FIELD_HALF - 40; x += colGap) {
        list.push({ x: CX + x + offset, y: y });
      }
    }
    return list;
  }

  function startShot() {
    phase = 'aim'; orb = null; resultText = ''; resultTextT = 0; warnSide = 0;
    var rows = 4 + shotIdx; // 物量プレッシャー: 発射ごとに釘の段数が増える
    pegs = buildPegs(rows);
    fever = shotIdx === SHOTS_TOTAL - 1 || game.random(0, 1) < 0.3;
  }

  function initGame() {
    shotIdx = 0; totalScore = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    startShot();
  }

  // ── 共有ロジック(実演でも本編でもこの関数群を使う) ──────────────────
  function beginPull(x, y) {
    if (phase !== 'aim') return;
    pull = { x0: x, y0: y, x: x, y: y };
  }
  function movePull(x, y) {
    if (phase !== 'aim' || !pull) return;
    pull.x = x; pull.y = y;
  }
  function releasePull(x, y) {
    if (phase !== 'aim' || !pull) return;
    var dx = pull.x0 - x, dy = pull.y0 - y;
    var vx = dx * 3.0;
    var vy = -Math.abs(dy) * 4.2 - 260;
    fireOrb(vx, vy);
    pull = null;
  }
  function fireOrb(vx, vy) {
    orb = { x: ANCHOR.x, y: ANCHOR.y, vx: vx, vy: vy, bounces: 0 };
    phase = 'flight';
    game.audio.play('se_jump', 0.5);
  }
  function updateOrb(dt) {
    if (!orb) return;
    orb.vy += GRAVITY * dt;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    if (orb.x < CX - FIELD_HALF) { orb.x = CX - FIELD_HALF; orb.vx *= -0.6; }
    if (orb.x > CX + FIELD_HALF) { orb.x = CX + FIELD_HALF; orb.vx *= -0.6; }
    for (var i = 0; i < pegs.length; i++) {
      var p = pegs[i];
      var dx = orb.x - p.x, dy = orb.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var minD = BALL_R + PEG_R;
      if (dist < minD && dist > 0.001) {
        var nx = dx / dist, ny = dy / dist;
        var dot = orb.vx * nx + orb.vy * ny;
        orb.vx = (orb.vx - 2 * dot * nx) * 0.72 + game.random(-50, 50);
        orb.vy = (orb.vy - 2 * dot * ny) * 0.72;
        orb.x = p.x + nx * minD; orb.y = p.y + ny * minD;
        orb.bounces++;
        if (orb.bounces % 3 === 0) game.audio.tone(520, 0.03, { wave: 'square', volume: 0.08 });
        break;
      }
    }
    if (!warnSide && orb.y > POCKET_Y - 220 && orb.vy > 0) {
      var predictedX = orb.x - CX;
      var predictedPocket = pocketAt(predictedX);
      if (predictedPocket.val === 0) {
        warnSide = predictedX < 0 ? -1 : 1;
        game.audio.tone(180, 0.1, { wave: 'square', volume: 0.16, slide: -50 });
      }
    }
    if ((orb.y >= POCKET_Y && orb.vy > 0) || orb.y > H * 0.92) resolveShot();
  }
  function pocketAt(relX) {
    for (var i = 0; i < POCKETS.length; i++) {
      if (relX >= POCKETS[i].lo && relX < POCKETS[i].hi) return POCKETS[i];
    }
    return relX < 0 ? POCKETS[0] : POCKETS[POCKETS.length - 1];
  }
  function resolveShot() {
    var pocket = pocketAt(orb.x - CX);
    var gained = pocket.val * (fever && pocket.val > 0 ? 3 : 1);
    totalScore += gained;
    if (pocket.val === 0) {
      resultText = 'GUTTER'; resultTextT = 1.0;
      game.feedback.bad(orb.x, POCKET_Y, { text: 'GUTTER' });
      shake = 0.18; hitStop = 0.12;
    } else if (pocket.label === 'jackpot') {
      resultText = (fever ? 'FEVER +' : '+') + gained;
      resultTextT = 1.0;
      game.fx.burst(orb.x, POCKET_Y, { color: C.gold, count: 26, speed: 420 });
      game.feedback.good(orb.x, POCKET_Y, { text: resultText, color: C.gold });
      shake = 0.22; hitStop = 0.2;
      game.fx.popup('JACKPOT!', CX, POCKET_Y - 100, { color: C.gold, size: 52 });
      game.audio.play('se_milestone', 0.6);
    } else {
      resultText = '+' + gained; resultTextT = 1.0;
      game.feedback.good(orb.x, POCKET_Y, { text: resultText, color: C.good });
      hitStop = 0.12;
    }
    orb = null; phase = 'settle';
    if (shotIdx === 1 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('SUBTOTAL ' + totalScore, CX, H * 0.16, { color: C.white, size: 38 });
      game.audio.play('se_milestone', 0.35);
    }
  }
  function afterSettle() {
    shotIdx++;
    if (shotIdx >= SHOTS_TOTAL) { ok = totalScore >= SCORE_TARGET; finish(); }
    else startShot();
  }

  function tapInput() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; shotIdx = 0; startShot(); demo.t = 0; demo.press = false; return; }
  }
  game.onTap(function(x, y) { game.audio.play('se_tap', 0.1); tapInput(); });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    game.audio.play('se_tap', 0.15);
    beginPull(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    movePull(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_jump', 0.35);
    releasePull(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: beginPull/movePull/releasePull/updateOrb を流用 ──
  var demo = { t: 0, gx: ANCHOR.x, gy: ANCHOR.y, press: false, sub: 'wait', subT: 0.6, cycle: 0 };
  function stepDemo(dt) {
    demo.t += dt; demo.subT -= dt;
    if (pegs === undefined) { shotIdx = 0; startShot(); }
    if (demo.sub === 'wait' && demo.subT <= 0) {
      startShot();
      demo.sub = 'approach'; demo.subT = 0.3; demo.gx = ANCHOR.x; demo.gy = ANCHOR.y - 90;
    } else if (demo.sub === 'approach') {
      demo.gy = ANCHOR.y - 90 * (demo.subT / 0.3);
      demo.press = false;
      if (demo.subT <= 0) { beginPull(ANCHOR.x, ANCHOR.y); demo.sub = 'drag'; demo.subT = 0.45; demo.gx = ANCHOR.x; demo.gy = ANCHOR.y; }
    } else if (demo.sub === 'drag') {
      var goodShot = demo.cycle % 2 === 0;
      var tx = goodShot ? ANCHOR.x + 4 : ANCHOR.x - 200;
      var ty = ANCHOR.y + 130;
      var f = 1 - Math.max(0, demo.subT / 0.45);
      demo.gx = ANCHOR.x + (tx - ANCHOR.x) * f; demo.gy = ANCHOR.y + (ty - ANCHOR.y) * f;
      demo.press = true;
      movePull(demo.gx, demo.gy);
      if (demo.subT <= 0) { releasePull(demo.gx, demo.gy); demo.sub = 'flight'; demo.subT = 2.0; demo.press = false; }
    } else if (demo.sub === 'flight') {
      updateOrb(dt);
      if (phase === 'settle') { demo.sub = 'hold'; demo.subT = 0.9; }
      if (demo.subT <= 0) { demo.sub = 'hold'; demo.subT = 0.1; }
    } else if (demo.sub === 'hold') {
      if (demo.subT <= 0) { demo.cycle++; demo.sub = 'wait'; demo.subT = 0.7; }
    }
  }

  function fieldBg() {
    game.draw.gradient(0, H, [[0, C.bgTop], [0.6, '#100a3a'], [1, C.bgBot]]);
    game.draw.rect(CX - FIELD_HALF - 24, FIELD_TOP - 40, (FIELD_HALF + 24) * 2, (FIELD_BOT - FIELD_TOP) + 140, '#ffffff08');
    for (var i = 0; i < 5; i++) {
      var yy = FIELD_TOP + (FIELD_BOT - FIELD_TOP) * (i / 4);
      game.draw.rect(CX - FIELD_HALF, yy, FIELD_HALF * 2, 2, '#ffffff0f');
    }
  }

  function drawPegs() {
    var blink = Math.floor(game.time.elapsed * 4) % 2 === 0;
    for (var i = 0; i < pegs.length; i++) {
      var p = pegs[i];
      game.draw.circle(p.x, p.y, PEG_R + 6, C.pegGlow, 0.6);
      game.draw.circle(p.x, p.y, PEG_R, blink ? C.peg : '#7fefff');
    }
  }

  function drawPockets() {
    for (var i = 0; i < POCKETS.length; i++) {
      var pk = POCKETS[i];
      var pw = pk.hi - pk.lo;
      var isJack = pk.label === 'jackpot';
      var col = pk.val === 0 ? C.bad : (isJack ? C.gold : C.good);
      var glow = isJack && fever ? (Math.floor(game.time.elapsed * 8) % 2 === 0) : false;
      game.draw.rect(CX + pk.lo, POCKET_Y, pw - 6, 90, col, glow ? 0.95 : 0.55);
      txt(pk.val === 0 ? '-' : String(pk.val), CX + (pk.lo + pk.hi) / 2, POCKET_Y + 56, isJack ? 30 : 22, C.white);
    }
    if (fever) txt('FEVER', CX, POCKET_Y - 30, 26, C.gold);
  }

  function drawOrb() {
    var px = orb ? orb.x : ANCHOR.x;
    var py = orb ? orb.y : ANCHOR.y;
    var f = Math.floor(game.time.elapsed * 12) % 2;
    game.draw.circle(px, py + 4, BALL_R * 0.6, '#00000040');
    game.draw.sprite(ORB_F[f], ORB_PAL, px, py, 6, { anchor: 'center' });
    game.draw.circle(px, py, 5, C.orbCore);
  }

  function drawPull() {
    if (phase !== 'aim' || !pull) return;
    game.draw.line(ANCHOR.x, ANCHOR.y, pull.x, pull.y, C.gold, 6);
    var dx = pull.x0 - pull.x, dy = pull.y0 - pull.y;
    var px = ANCHOR.x - dx * 0.9, py = ANCHOR.y - Math.abs(dy) * 1.1;
    game.draw.line(ANCHOR.x, ANCHOR.y, px, py, '#ffffff55', 3);
  }

  function drawWarn() {
    if (!warnSide) return;
    var flash = Math.floor(game.time.elapsed * 14) % 2 === 0;
    if (flash) game.draw.rect(warnSide > 0 ? CX + FIELD_HALF - 40 : CX - FIELD_HALF, FIELD_TOP - 20, 40, (FIELD_BOT - FIELD_TOP) + 40, C.bad, 0.5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      fieldBg();
      stepDemo(dt);
      drawPegs();
      drawWarn();
      drawPockets();
      drawOrb();
      if (demo.sub === 'drag') drawPull();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      if (resultTextT > 0) txt(resultText, CX, H * 0.42, 44, resultText.indexOf('GUTTER') >= 0 ? C.bad : C.gold);
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      fieldBg(); drawPegs(); drawPockets(); drawOrb();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt('SCORE ' + totalScore + ' / ' + SCORE_TARGET, W / 2, H * 0.13, 30, C.white);
      txt('BEST ' + Math.max(game.best, totalScore), W / 2, H * 0.17, 26, C.gold);
      if (!ok && totalScore >= SCORE_TARGET - 10) txt('あと' + (SCORE_TARGET - totalScore) + '点!', W / 2, H * 0.21, 26, C.white);
      if (totalScore > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.24, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { score: totalScore, target: SCORE_TARGET };
        if (ok) game.end.success(totalScore, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      if (phase === 'flight') updateOrb(dt);
      else if (phase === 'settle') { resultTextT -= dt; if (resultTextT <= 0.15) afterSettle(); }
    }
    if (shake > 0) shake -= dt;

    fieldBg();
    drawPegs();
    if (phase === 'flight') drawWarn();
    drawPockets();
    drawOrb();
    if (phase === 'aim') drawPull();
    if (resultTextT > 0 && phase === 'settle') {
      txt(resultText, CX, H * 0.42, 46, resultText.indexOf('GUTTER') >= 0 ? C.bad : C.gold);
    }

    txt('SHOT ' + (shotIdx + 1) + ' / ' + SHOTS_TOTAL, W / 2, H * 0.06, 30, C.white);
    txt(totalScore + ' / ' + SCORE_TARGET, W / 2, H * 0.10, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.25], ['R', 0.1], ['G5', 0.25], ['B5', 0.25], ['R', 0.15],
      ['A5', 0.25], ['G5', 0.25],
    ], { tempo: 150, wave: 'square', volume: 0.06, loop: true, bass: [['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    shotIdx = 0;
    startShot();
  });
})(game);
