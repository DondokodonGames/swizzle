// I-GBA-0047v2-bon-dance-copy.js
// 盆おどり手ぶり写し — 櫓の上の先生が振った手の向きの順を覚え、足もとの六つの提灯を同じ順に叩いて真似る
// 操作: 先生が手を伸ばした方向の提灯が順に光る。終わったら下の輪の同じ位置の提灯を同じ順にタップする。回ごとに一手増え、振りも速くなる
// 終わり: 4回(2→3→4→5手)を間違えずに真似切れば成功。順番を間違える/手が止まる/持ち時間切れで失敗
// @mechanic: memory_sequence
// @theme: bon_dance_lesson
// 世界観: 盆踊りの櫓の下で、踊りを習う子どもが櫓の上の先生の手振りの順番を覚え、足もとの踊りの輪に吊られた提灯を同じ順にたたいて振りを真似していく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(真似できた手数と到達した回)
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い黒縁、大きいアイコン、飛ぶ数字
  var STYLE = { bg: ['#2a0f4a', '#5a1a6a', '#ff7a3a'], main: ['#ff3b5c', '#ffd23a', '#3ad6ff'], accent: ['#ffffff', '#111111'] };
  var C = {
    night: STYLE.bg[0], dusk: STYLE.bg[1], glow: STYLE.bg[2], red: STYLE.main[0], yellow: STYLE.main[1], cyan: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1], good: '#4dff7a', bad: '#ff3b3b', wood: '#9a5a2a', woodDark: '#5a3014',
  };
  var PAD_COL = ['#ff3b5c', '#ff8a2a', '#ffd23a', '#4dff7a', '#3ad6ff', '#b46bff'];
  var PAD_NOTE = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];

  var GAME_TITLE = 'BON DANCE COPY';
  var LENGTHS = [2, 3, 4, 5];
  var SHOW_GAP = [0.62, 0.55, 0.48, 0.42];
  var NEEDED = 14;              // 2+3+4+5 手
  var TIME_LIMIT = 16;          // memory_sequence 10〜20s(真似る時間の合計)
  var STEP_WAIT = 2.6;          // 1手ごとの待ち(止まったら失敗)

  var TEACH = { x: W / 2, y: Math.round(H * 0.27) };
  var RING = { x: W / 2, y: Math.round(H * 0.72) };
  var PAD_R = 92, RING_R = 270, MINI_R = 175;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var seq, round, phase, phaseT, showIdx, inputIdx, stepT, taps, score, timeLeft;
  var countIn, over, won, endT, freeze, wrongPad, rightPad, gapT, teachPose, kidPose, kidT, milestoneDone, prevBest, tickDone, cheerT;

  function bold(str, x, y, sz, color) {
    var o = Math.max(3, sz * 0.08);
    game.draw.text(str, x - o, y, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x + o, y, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y - o, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y + o, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 方向: 0=上 1=右上 2=右下 3=下 4=左下 5=左上(六角形の位置)
  function dirAngle(d) { return -Math.PI / 2 + d * Math.PI / 3; }
  function padPos(d) { var a = dirAngle(d); return { x: RING.x + Math.cos(a) * RING_R, y: RING.y + Math.sin(a) * RING_R * 0.92 }; }
  function miniPos(d) { var a = dirAngle(d); return { x: TEACH.x + Math.cos(a) * MINI_R, y: TEACH.y + 30 + Math.sin(a) * MINI_R * 0.8 }; }

  // 踊り手のポーズ(浴衣): 待機 / 両手上 / 右上 / 右下 / 両手下。左向きは反転
  var POSE = {
    idle: ['...hhh...', '..hhhhh..', '..sksks..', '...sss...', '.yyyyyyy.', 's.yyyyy.s', '..yybyy..', '..yyyyy..', '..y...y..', '..k...k..'],
    up: ['s..hhh..s', 's.hhhhh.s', 'y.sksks.y', '.y.sss.y.', '..yyyyy..', '..yyyyy..', '..yybyy..', '..yyyyy..', '..y...y..', '..k...k..'],
    ur: ['...hhh..s', '..hhhhh.s', '..sksks.y', '...sss.y.', '.yyyyyy..', 's.yyyyy..', '..yybyy..', '..yyyyy..', '..y...y..', '..k...k..'],
    dr: ['...hhh...', '..hhhhh..', '..sksks..', '...sss...', '.yyyyyy..', 's.yyyyyy.', '..yybyy.y', '..yyyyy.s', '..y...y..', '..k...k..'],
    down: ['...hhh...', '..hhhhh..', '..sksks..', '...sss...', '..yyyyy..', '.yyyyyyy.', 'y.yybyy.y', 's.yyyyy.s', '.y.....y.', 'k.......k'],
    sad: ['...hhh...', '..hhhhh..', '..sssss..', '...sks...', '..yyyyy..', '.syyyyys.', '..yybyy..', '..yyyyy..', '..y...y..', '.k.....k.'],
  };
  var TEACH_PAL = { h: '#111111', s: '#ffd8b0', k: '#111111', y: '#3ad6ff', b: '#ff3b5c' };
  var KID_PAL = { h: '#5a2a10', s: '#ffd8b0', k: '#111111', y: '#ff8a2a', b: '#ffffff' };
  function poseFor(d) {
    if (d === 0) return { art: POSE.up, flip: false };
    if (d === 1) return { art: POSE.ur, flip: false };
    if (d === 2) return { art: POSE.dr, flip: false };
    if (d === 3) return { art: POSE.down, flip: false };
    if (d === 4) return { art: POSE.dr, flip: true };
    if (d === 5) return { art: POSE.ur, flip: true };
    return { art: POSE.idle, flip: false };
  }

  function newSequence(fixed) {
    if (fixed) return fixed.slice();
    var s = [];
    for (var i = 0; i < LENGTHS[LENGTHS.length - 1]; i++) {
      var d;
      do { d = Math.floor(game.random(0, 6)); } while (i > 0 && d === s[i - 1]);
      s.push(d);
    }
    return s;
  }

  function startRound(r) {
    round = r; phase = 'show'; phaseT = -0.35; showIdx = -1; inputIdx = 0; stepT = STEP_WAIT;
    teachPose = -1; tickDone = false;
  }

  function initGame() {
    seq = newSequence(null);
    taps = 0; score = 0; timeLeft = TIME_LIMIT;
    countIn = 0.8; over = false; won = false; endT = 0; freeze = 0; wrongPad = -1; rightPad = -1; gapT = 0;
    kidPose = -1; kidT = 0; milestoneDone = false; prevBest = game.best; cheerT = 0;
    startRound(0);
  }

  function lengthNow() { return LENGTHS[round]; }

  // 先生が振る(本番・デモ共通)
  function stepShow(dt) {
    var gap = SHOW_GAP[round];
    phaseT += dt;
    var k = phaseT < 0 ? -1 : Math.floor(phaseT / gap);
    if (k !== showIdx) {
      showIdx = k;
      if (k >= 0 && k < lengthNow()) {
        teachPose = seq[k];
        game.audio.tone(PAD_NOTE[seq[k]], gap * 0.7, { wave: 'square', volume: 0.1 });
      }
    }
    if (k >= 0 && phaseT - k * gap > gap * 0.75) teachPose = -1;
    if (k >= lengthNow()) { phase = 'input'; teachPose = -1; stepT = STEP_WAIT; tickDone = false; game.audio.play('se_jump', 0.25); }
  }

  // 提灯を叩く(本番・デモ共通)
  function hit(d) {
    if (phase !== 'input') return 'busy';
    kidPose = d; kidT = 0.35;
    var p = padPos(d);
    if (d === seq[inputIdx]) {
      inputIdx++; stepT = STEP_WAIT; tickDone = false;
      game.audio.tone(PAD_NOTE[d], 0.16, { wave: 'square', volume: 0.13 });
      if (state === S.PLAYING) {
        taps++;
        var gain = 50 * (round + 1);
        score += gain;
        game.feedback.good(p.x, p.y - 110, { text: '+' + gain, color: PAD_COL[d], size: 60 });
      } else {
        game.fx.burst(p.x, p.y, { color: PAD_COL[d], count: 10, speed: 300 });
      }
      if (inputIdx >= lengthNow()) roundDone();
      return 'good';
    }
    mistake(d);
    return 'bad';
  }

  function mistake(d) {
    wrongPad = d; rightPad = seq[inputIdx]; freeze = 0.55; phase = 'fail';
    var p = d >= 0 ? padPos(d) : RING;
    game.feedback.bad(p.x, p.y, { text: 'MISS', color: C.bad });
    if (state === S.PLAYING) { over = true; won = false; }
  }

  function roundDone() {
    cheerT = 0.8;
    if (state !== S.PLAYING) { phase = 'gap'; return; }
    score += 200 * (round + 1);
    game.fx.popup('NICE', TEACH.x, TEACH.y - 170, { color: C.yellow, size: 80 });
    game.audio.play('se_coin', 0.4);
    if (round === 2 && !milestoneDone) {
      milestoneDone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(taps + ' / ' + NEEDED, W / 2, H * 0.48, { color: C.cyan, size: 72 });
    }
    if (round >= LENGTHS.length - 1) { won = true; over = true; freeze = 0.4; rightPad = -1; return; }
    phase = 'gap'; gapT = 0.6;
  }

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(120, 960), game.random(400, 1500), { color: PAD_COL[i % 6], count: 22, speed: 460 });
  }

  // ── 描画 ──
  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.45, C.dusk], [0.62, C.glow], [0.64, '#3a1a20'], [1, '#1a0a12']]);
    // 遠景: 提灯の綱(揺れる)
    for (var r = 0; r < 2; r++) {
      for (var i = 0; i < 12; i++) {
        var x = i * 100 + 40, y = 250 + r * 90 + Math.sin(i * 0.8 + t * 1.5 + r) * 10;
        game.draw.circle(x, y, 16, PAD_COL[(i + r) % 6], 0.55);
      }
    }
    // 櫓
    game.draw.rect(TEACH.x - 250, TEACH.y + 90, 500, 34, C.ink);
    game.draw.rect(TEACH.x - 244, TEACH.y + 94, 488, 26, C.wood);
    for (var s = 0; s < 8; s++) game.draw.rect(TEACH.x - 240 + s * 60, TEACH.y + 124, 60, 110, s % 2 ? C.white : C.red);
    game.draw.rect(TEACH.x - 250, TEACH.y + 234, 500, 14, C.ink);
    game.draw.rect(TEACH.x - 230, TEACH.y + 248, 22, 200, C.woodDark);
    game.draw.rect(TEACH.x + 208, TEACH.y + 248, 22, 200, C.woodDark);
    // 踊りの輪の床
    game.draw.circle(RING.x, RING.y + 30, RING_R + 120, '#2a0f1a', 0.6);
  }

  function lantern(x, y, r, col, lit, edge) {
    game.draw.circle(x, y, r + 8, C.ink);
    game.draw.circle(x, y, r, lit ? col : '#3a2a3a');
    if (lit) game.draw.circle(x, y, r * 1.6, col, 0.25);
    game.draw.rect(x - r * 0.5, y - r - 10, r, 14, C.ink);
    game.draw.rect(x - r * 0.5, y + r - 4, r, 14, C.ink);
    for (var k = -1; k <= 1; k++) game.draw.rect(x - r * 0.85, y + k * r * 0.4, r * 1.7, 4, C.ink, lit ? 0.35 : 0.6);
    if (!lit) game.draw.circle(x, y, r * 0.35, col, 0.8);
    if (edge) game.draw.circle(x, y, r + 14 + 4 * Math.sin(game.time.elapsed * 8), C.white, 0.35);
  }

  function drawTeacher() {
    var t = game.time.elapsed;
    for (var d = 0; d < 6; d++) { var m = miniPos(d); lantern(m.x, m.y, 26, PAD_COL[d], teachPose === d, false); }
    var p = poseFor(teachPose);
    if (state === S.RESULT) p = won ? poseFor(0) : { art: POSE.sad, flip: false };
    var sway = teachPose < 0 ? Math.sin(t * 3) * 6 : 0;
    game.draw.sprite(p.art, { h: C.ink, s: C.ink, k: C.ink, y: C.ink, b: C.ink }, TEACH.x + sway + 6, TEACH.y + 6, 15, { anchor: 'center', flipX: p.flip });
    game.draw.sprite(p.art, TEACH_PAL, TEACH.x + sway, TEACH.y, 15, { anchor: 'center', flipX: p.flip });
    if (teachPose >= 0) {
      var mp = miniPos(teachPose);
      game.draw.line(TEACH.x, TEACH.y, mp.x, mp.y, PAD_COL[teachPose], 8);
    }
  }

  function drawPads(hint) {
    for (var d = 0; d < 6; d++) {
      var p = padPos(d);
      var lit = (kidT > 0 && kidPose === d) || (freeze > 0 && (d === wrongPad || d === rightPad));
      var col = freeze > 0 && d === wrongPad ? C.bad : PAD_COL[d];
      var r = PAD_R * (freeze > 0 && d === wrongPad ? 1.2 : 1);
      lantern(p.x, p.y, r, col, lit, hint && phase === 'input');
      if (freeze > 0 && d === wrongPad) game.draw.circle(p.x, p.y, r, '#ffffff', 0.4);
    }
    // 子ども(真ん中で同じ振りをする)
    var k = poseFor(kidT > 0 ? kidPose : -1);
    if (state === S.RESULT && !won) k = { art: POSE.sad, flip: false };
    var hop = cheerT > 0 ? Math.abs(Math.sin(game.time.elapsed * 12)) * 24 : 0;
    game.draw.sprite(k.art, KID_PAL, RING.x, RING.y - hop + Math.sin(game.time.elapsed * 3) * 4, 11, { anchor: 'center', flipX: k.flip });
    // 1手の待ち時間(子どもの足もとの縮むリング)
    if (phase === 'input' && state === S.PLAYING) {
      var n = 20, lit2 = Math.ceil(n * Math.max(0, stepT / STEP_WAIT));
      var warn = stepT < 0.7 && Math.floor(game.time.elapsed * 10) % 2 === 0;
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        game.draw.circle(RING.x + Math.cos(a) * 110, RING.y + Math.sin(a) * 110, 8, i < lit2 ? (warn ? C.bad : C.white) : '#ffffff22');
      }
    }
  }

  function hud() {
    bold(String(score), 170, 80, 56, C.yellow);
    bold(taps + ' / ' + NEEDED, W - 170, 80, 48, C.white);
    for (var r = 0; r < LENGTHS.length; r++) {
      game.draw.circle(W / 2 - 75 + r * 50, 80, 18, C.ink);
      game.draw.circle(W / 2 - 75 + r * 50, 80, 13, r < round || won ? C.yellow : (r === round ? C.cyan : '#ffffff33'));
    }
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(86, 156, W - 172, 30, C.ink);
    game.draw.rect(92, 162, (W - 184) * frac, 18, timeLeft < 4 ? C.bad : C.cyan);
    // 今回の手数(覚える数)
    var n = lengthNow();
    for (var i = 0; i < n; i++) game.draw.circle(W / 2 - (n - 1) * 26 + i * 52, 218, 12, phase === 'input' && i < inputIdx ? C.good : (phase === 'show' && i <= showIdx ? C.white : '#ffffff40'));
  }

  function drawWorld(hint) { drawYard(); drawTeacher(); drawPads(hint); }

  // ── 入力 ──
  function padAt(x, y) {
    for (var d = 0; d < 6; d++) { var p = padPos(d); if (Math.hypot(p.x - x, p.y - y) < PAD_R + 30) return d; }
    return -1;
  }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0 || freeze > 0 || phase !== 'input') { game.audio.play('se_tap', 0.06); return; }
    var d = padAt(x, y);
    if (d < 0) { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.white, count: 4, speed: 120 }); return; }
    hit(d);
  });

  // ── ATTRACT: 2手を写して成功 → 3手目を間違えて失敗 ──
  var DEMO_SEQ = [0, 2, 4, 1, 5];
  var demo = { t: 0, gx: W / 2, gy: H * 0.95, press: false, plan: [], k: 0, at: 0 };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.2;
    if (cyc < dt || demo.t <= dt) {
      seq = DEMO_SEQ.slice(); startRound(0); freeze = 0; wrongPad = -1; rightPad = -1; kidT = 0;
      demo.plan = [0, 2, 'next', 0, 2, 3]; demo.k = 0; demo.at = 0;
    }
    if (kidT > 0) kidT -= dt;
    if (cheerT > 0) cheerT -= dt;
    if (freeze > 0) { freeze -= dt; demo.press = false; return; }
    if (phase === 'show') { stepShow(dt); demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 2); demo.gy += (H * 0.95 - demo.gy) * Math.min(1, dt * 2); demo.press = false; return; }
    if (phase === 'gap') { phase = 'wait'; demo.at = 0.5; }
    if (phase === 'wait') { demo.at -= dt; if (demo.at <= 0) { demo.k++; startRound(1); } return; }
    if (phase !== 'input' || demo.k >= demo.plan.length) { demo.press = false; return; }
    var want = demo.plan[demo.k];
    if (want === 'next') { demo.k++; return; }
    var p = padPos(want);
    demo.gx += (p.x - demo.gx) * Math.min(1, dt * 9); demo.gy += (p.y + 20 - demo.gy) * Math.min(1, dt * 9);
    demo.at += dt;
    demo.press = demo.at > 0.32;
    if (demo.at > 0.42) { demo.at = 0; demo.k++; hit(want); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!seq) initGame();
      demoStep(dt);
      drawWorld(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      bold(GAME_TITLE, W / 2, H * 0.06, 76, C.yellow);
      bold('HI-SCORE ' + game.best, W / 2, H * 0.1, 36, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) bold('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.yellow);
      else bold('TAP TO START', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      if (kidT > 0) kidT -= dt;
      drawWorld(false);
      bold(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.47, 96, won ? C.yellow : C.bad);
      bold('SCORE ' + score, W / 2, H * 0.525, 56, C.white);
      if (score > prevBest && prevBest > 0) bold('NEW RECORD', W / 2, H * 0.57, 52, C.yellow);
      else bold('BEST ' + Math.max(prevBest, score), W / 2, H * 0.57, 42, C.white);
      if (!won) bold('あと' + (NEEDED - taps) + '手!', W / 2, H * 0.61, 48, C.cyan);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) bold('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (kidT > 0) kidT -= dt;
    if (cheerT > 0) cheerT -= dt;
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { taps: taps, round: won ? LENGTHS.length : round + 1 };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (freeze > 0) {
      freeze -= dt;
      if (freeze <= 0 && over) finish();
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      if (phase === 'show') stepShow(dt);
      else if (phase === 'gap') { gapT -= dt; if (gapT <= 0) startRound(round + 1); }
      else if (phase === 'input') {
        timeLeft -= dt; stepT -= dt;
        if (!tickDone && stepT < 0.7) { tickDone = true; game.audio.tone(1320, 0.05, { wave: 'square', volume: 0.09 }); }
        if (stepT <= 0 || timeLeft <= 0) {
          if (timeLeft < 0) timeLeft = 0;
          mistake(-1);
          game.audio.play('se_break', 0.3);
        }
      }
    }

    drawWorld(phase === 'input' && round === 0 && inputIdx === 0);
    hud();
    if (countIn > 0) bold(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 2],
    ], { tempo: 116, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
