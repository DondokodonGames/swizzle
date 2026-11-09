// I-Wii-0011v2-music-room-handbell-recall.js
// 音楽室のハンドベル写し — 先生が鳴らしたベルの順番と、短く鳴らしたか長く響かせたかを覚え、手元の同じ色のベルで同じ順・同じ長さに鳴らす
// 操作: 先生の手本の間は見て聴くだけ(この間は時間が減らない)。終わったら手元のベルを順に鳴らす。短い音はタップ、長い音は押したまま輪が金色になるまで響かせて離す。色か長さを間違えると先生の正解がもう一度光り、リボンを1本失う
// 終わり: 3曲(3音→4音→5音、後の曲ほど長い音が混じる)を鳴らし切ればCLEAR。リボン2本を失う/鳴らす時間(合計14秒)が尽きるとGAME OVER
// @mechanic: memory_sequence
// @theme: school_music_room_handbells
// 世界観: 小学校の音楽室で、ハンドベル係の子どもが先生の鳴らしたベルの順番と響かせ方を覚え、手元の色違いのベルで同じ順・同じ長さに鳴らして合奏の練習を進める
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(正しく鳴らした音数・長い音の成功数・残りリボン)
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 空グラデ+遠景+近景の3層、暗色の輪郭とハイライトのある大きめのキャラ
  var STYLE = { bg: ['#3a5a3a', '#f0e0c0', '#c89a6a'], main: ['#e8402e', '#f8a830', '#f8e040'], accent: ['#40b860', '#4878e8'] };
  var C = {
    board: STYLE.bg[0], wall: STYLE.bg[1], floor: STYLE.bg[2], ink: '#20182a', white: '#ffffff', chalk: '#e8f0e0',
    gold: '#ffd84a', red: '#e8402e', bad: '#ff4a5a', wood: '#a06a3a',
  };
  var BELL_COLS = [STYLE.main[0], STYLE.main[1], STYLE.main[2], STYLE.accent[0], STYLE.accent[1]];
  var BELL_FREQ = [523.3, 587.3, 659.3, 784.0, 880.0];

  var GAME_TITLE = 'BELL COPY';
  var TIME_LIMIT = 14;             // 鳴らす側の持ち時間(手本の間は止まる)
  var LIVES = 2;
  var LONG_T = 0.4;
  var ROUNDS = [{ n: 3, longs: 0 }, { n: 4, longs: 1 }, { n: 5, longs: 2 }];
  var NEEDED = 12;
  var BELL_Y = Math.round(H * 0.84), BELL_R = 92;
  var TBELL_Y = Math.round(H * 0.36);
  var SLOT_Y = Math.round(H * 0.5);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, seq, phase, phaseT, showIdx, inIdx, slots, lives, holdBell, holdT, holdTick, flashBell, flashT, answerT, teacherRing, teacherRingT;
  var correct, longsOk, inputT, stopT, stopBell, kidMood, kidMoodT;
  var score, countIn, over, won, endT, prevBest;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  function bx(i) { return 140 + i * 200; }
  function tbx(i) { return 420 + i * 125; }

  // 先生(眼鏡)と係の子ども(体操帽)
  var TEACHER = [
    ['..kkkk..', '.kkkkkk.', '.kssssk.', '.gwgwgs.', '.ssmss..', '..pppp..', '.pppppps', '.pppppp.', '..pp.pp.', '..kk.kk.'],
    ['..kkkk.s', '.kkkkkks', '.ksssskp', '.gwgwgsp', '.ssmss..', '..ppppp.', '.pppppp.', '.pppppp.', '..pp.pp.', '..kk.kk.'],
    ['..kkkk..', '.kkkkkk.', '.kssssk.', '.gwgwgs.', '.ssoss..', '..pppp..', 'spppppps', '.pppppp.', '..pp.pp.', '..kk.kk.'],
  ];
  var TEACHER_PAL = { k: '#3a2a2a', s: '#f0c8a0', g: '#5a5a6a', w: '#ffffff', m: '#c05050', o: '#c05050', p: '#7a4a9a' };
  var KID = [
    ['..rrrr..', '.rrrrrr.', '.wsssss.', '.sesess.', '..smms..', '.wwwwww.', 'swwwwwws', '.bbbbbb.'],
    ['s.rrrr.s', 's.rrrr.s', '.wsssss.', '.sesess.', '..sOOs..', '.wwwwww.', '.wwwwww.', '.bbbbbb.'],
    ['..rrrr..', '.rrrrrr.', '.wsssss.', '.sxssxs.', '..sees..', '.wwwwww.', 'swwwwwws', '.bbbbbb.'],
  ];
  var KID_PAL = { r: '#e8402e', w: '#ffffff', s: '#f0c8a0', e: '#20182a', x: '#20182a', m: '#c05050', O: '#c05050', b: '#2a3a8a' };

  function buildSeq(r) {
    var spec = ROUNDS[r], s = [], prev = -1;
    for (var i = 0; i < spec.n; i++) {
      var b;
      do { b = Math.floor(Math.random() * 5); } while (b === prev);
      prev = b;
      s.push({ bell: b, long: false });
    }
    var placed = 0;
    while (placed < spec.longs) {
      var k = 1 + Math.floor(Math.random() * (spec.n - 1));
      if (!s[k].long) { s[k].long = true; placed++; }
    }
    return s;
  }

  function startRound(r, fixedSeq) {
    round = r; seq = fixedSeq || buildSeq(r);
    phase = 'show'; phaseT = -0.5; showIdx = 0; inIdx = 0;
    slots = [];
    for (var i = 0; i < seq.length; i++) slots.push(0);   // 0=空 1=正解 -1=間違い
  }

  function resetRun(fixedSeq) {
    lives = LIVES; holdBell = -1; holdT = 0; holdTick = 0; flashBell = -1; flashT = 0; answerT = 0;
    teacherRing = -1; teacherRingT = 0; correct = 0; longsOk = 0; inputT = 0; stopT = 0; stopBell = -1; kidMood = 0; kidMoodT = 0;
    startRound(0, fixedSeq);
  }

  function initGame() {
    resetRun(null);
    score = 0; countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best;
  }

  function ring(b, dur, vol) { game.audio.tone(BELL_FREQ[b], dur, { wave: 'triangle', volume: vol }); }

  // ── 先生の手本: 短い音=0.3s / 長い音=0.85s ──
  function stepShow(dt) {
    phaseT += dt;
    if (teacherRingT > 0) teacherRingT -= dt;
    if (phaseT < 0) return;
    var n = seq[showIdx];
    var dur = n.long ? 0.85 : 0.3;
    if (teacherRing !== showIdx) { teacherRing = showIdx; teacherRingT = dur; ring(n.bell, dur + 0.2, 0.14); }
    if (phaseT >= dur + 0.22) {
      showIdx++; phaseT = 0;
      if (showIdx >= seq.length) { phase = 'input'; teacherRing = -1; game.audio.tone(1318, 0.06, { wave: 'square', volume: 0.06 }); }
    }
  }

  // ── 子どもの入力(本番・デモ共通) ──
  function bellAt(x, y) {
    for (var i = 0; i < 5; i++) if (Math.hypot(bx(i) - x, BELL_Y - 40 - y) < BELL_R + 30) return i;
    return -1;
  }
  function holdStart(b) {
    holdBell = b; holdT = 0; holdTick = 0.3;
    ring(b, 0.4, 0.13);
  }
  function holdEnd() {
    if (holdBell < 0) return 'none';
    var b = holdBell, isLong = holdT >= LONG_T;
    holdBell = -1;
    if (phase !== 'input') return 'early';
    var exp = seq[inIdx];
    if (exp.bell === b && exp.long === isLong) {
      slots[inIdx] = 1; inIdx++; correct++;
      if (isLong) longsOk++;
      var pts = isLong ? 150 : 100;
      if (state === S.PLAYING) score += pts;
      kidMood = 1; kidMoodT = 0.4;
      game.feedback.good(bx(b), BELL_Y - 220, { text: (isLong ? 'PERFECT +' : 'GOOD +') + pts, color: isLong ? C.gold : C.white, size: 46, count: 10 });
      afterNote();
      return 'ok';
    }
    // 間違い: 正解のベルと長さをもう一度光らせる
    slots[inIdx] = -1; lives--;
    flashBell = exp.bell; flashT = exp.long ? 0.9 : 0.45;
    kidMood = 2; kidMoodT = 0.6;
    if (state === S.PLAYING && lives <= 0) { stopT = 0.45; stopBell = b; game.audio.tone(196, 0.25, { wave: 'sawtooth', volume: 0.12 }); return 'out'; }
    game.feedback.bad(bx(b), BELL_Y - 220, { text: 'MISS' });
    ring(exp.bell, exp.long ? 0.85 : 0.3, 0.08);
    inIdx++;
    afterNote();
    return 'wrong';
  }
  function afterNote() {
    if (inIdx < seq.length) return;
    phase = 'gap'; phaseT = 0;
    if (state === S.PLAYING) {
      game.audio.play('se_milestone', 0.45);
      game.fx.popup((round + 1) + '/3', W / 2, SLOT_Y - 130, { color: C.gold, size: 80 });
    }
  }

  function stepWorld(dt) {
    if (flashT > 0) flashT -= dt;
    if (kidMoodT > 0) { kidMoodT -= dt; if (kidMoodT <= 0) kidMood = 0; }
    if (holdBell >= 0) {
      var before = holdT;
      holdT += dt; holdTick -= dt;
      if (before < LONG_T && holdT >= LONG_T) game.audio.tone(BELL_FREQ[holdBell] * 2, 0.08, { wave: 'square', volume: 0.06 });
      if (holdTick <= 0) { holdTick = 0.3; ring(holdBell, 0.4, 0.07); }
    }
    if (phase === 'show') stepShow(dt);
    else if (phase === 'gap') {
      phaseT += dt;
      if (phaseT >= 0.7) {
        if (round + 1 < ROUNDS.length) startRound(round + 1, null);
        else phase = 'done';
      }
    }
  }

  // ── 描画 ──
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#f8ecd0'], [0.55, C.wall], [0.62, C.floor], [1, '#a87a4a']]);
    // 黒板と五線(遠景)
    var by = Math.round(H * 0.13);
    game.draw.rect(60, by, W - 120, 330, C.wood);
    game.draw.rect(76, by + 16, W - 152, 298, C.board);
    for (var l = 0; l < 5; l++) game.draw.line(110, by + 80 + l * 34, W - 110, by + 80 + l * 34, C.chalk, 3);
    for (var nn = 0; nn < 6; nn++) {
      var nx = 180 + nn * 140, ny = by + 80 + ((nn * 3) % 5) * 34 + Math.sin(t * 2 + nn) * 3;
      game.draw.circle(nx, ny, 14, C.chalk);
      game.draw.line(nx + 13, ny, nx + 13, ny - 60, C.chalk, 4);
    }
    // 先生の机
    game.draw.rect(330, TBELL_Y + 60, 680, 30, C.wood);
    game.draw.rect(330, TBELL_Y + 60, 680, 8, '#c8905a');
    // 子どもの机(近景)
    game.draw.rect(30, BELL_Y + 60, W - 60, 40, C.wood);
    game.draw.rect(30, BELL_Y + 60, W - 60, 10, '#c8905a');
  }

  function drawBell(x, y, r, col, lit, shake, flashWhite) {
    var s = r / 92;
    var dx = shake ? Math.sin(game.time.elapsed * 50) * 6 * s : 0;
    if (lit) { game.draw.circle(x + dx, y, r * 1.35, col, 0.25); game.draw.circle(x + dx, y, r * 1.1, C.white, 0.25); }
    // 取っ手
    game.draw.rect(x - 14 * s + dx, y - r - 70 * s, 28 * s, 70 * s, C.ink);
    game.draw.rect(x - 10 * s + dx, y - r - 66 * s, 20 * s, 62 * s, flashWhite ? C.white : '#5a3a8a');
    // 鐘の胴(下ほど広がる): 暗い輪郭→本体→ハイライト
    for (var yy = 0; yy < r * 1.4; yy += 4) {
      var u = yy / (r * 1.4);
      var hw = r * (0.42 + 0.58 * u * u);
      game.draw.rect(x - hw - 5 * s + dx, y - r + yy, hw * 2 + 10 * s, 4, C.ink);
      game.draw.rect(x - hw + dx, y - r + yy, hw * 2, 4, flashWhite ? C.white : col);
      game.draw.rect(x - hw * 0.6 + dx, y - r + yy, hw * 0.25, 4, C.white, flashWhite ? 0 : 0.35);
    }
    game.draw.circle(x + dx, y + r * 0.45, 12 * s, C.ink);
  }

  function drawTeacher() {
    var t = game.time.elapsed;
    var fr = teacherRingT > 0 ? TEACHER[1] : TEACHER[0];
    if (kidMood === 2 || (over && !won)) fr = TEACHER[2];
    game.draw.sprite(fr, TEACHER_PAL, 190, TBELL_Y - 10 + Math.sin(t * 2.5) * 3, 16, { anchor: 'center' });
    for (var i = 0; i < 5; i++) {
      var ringing = phase === 'show' && teacherRing >= 0 && teacherRingT > 0 && seq[teacherRing].bell === i;
      var y = TBELL_Y + 10 - (ringing ? 20 : 0);
      drawBell(tbx(i), y, 44, BELL_COLS[i], ringing, ringing, false);
      if (ringing && seq[teacherRing].long) {
        // 長い音: 鐘の下に響きの帯が伸びる
        var len = (1 - teacherRingT / 0.85) * 110;
        game.draw.rect(tbx(i) - 55, TBELL_Y + 98, len, 12, C.gold);
      }
    }
  }

  function drawSlots() {
    var n = seq.length, w = 150;
    var x0 = W / 2 - (n - 1) * w / 2;
    game.draw.rect(60, SLOT_Y - 70, W - 120, 140, C.white, 0.55);
    for (var i = 0; i < n; i++) {
      var x = x0 + i * w;
      var st = slots[i];
      var cur = phase === 'input' && i === inIdx;
      if (cur) game.draw.circle(x, SLOT_Y, 56 + Math.sin(game.time.elapsed * 8) * 6, C.white, 0.8);
      if (st === 0) { game.draw.circle(x, SLOT_Y, 40, '#00000022'); continue; }
      var col = st === 1 ? BELL_COLS[seq[i].bell] : C.bad;
      if (seq[i].long) { game.draw.rect(x - 50, SLOT_Y - 26, 100, 52, col); game.draw.circle(x - 50, SLOT_Y, 26, col); game.draw.circle(x + 50, SLOT_Y, 26, col); }
      else game.draw.circle(x, SLOT_Y, 36, col);
      if (st === -1) { game.draw.line(x - 26, SLOT_Y - 26, x + 26, SLOT_Y + 26, C.white, 8); game.draw.line(x + 26, SLOT_Y - 26, x - 26, SLOT_Y + 26, C.white, 8); }
    }
  }

  function drawKidAndBells() {
    var t = game.time.elapsed;
    var fr = KID[kidMood];
    if (over && won) fr = KID[1];
    if (over && !won) fr = KID[2];
    game.draw.sprite(fr, KID_PAL, W / 2, Math.round(H * 0.66) + Math.sin(t * 3) * 4, 18, { anchor: 'center' });
    for (var i = 0; i < 5; i++) {
      var held = holdBell === i;
      var fl = flashBell === i && flashT > 0;
      var stopFl = stopT > 0 && stopBell === i;
      var ready = phase === 'input' && Math.sin(t * 5 + i) > 0.6;
      var r = stopFl ? BELL_R * 1.2 : BELL_R;
      drawBell(bx(i), BELL_Y - 40 - (held ? 16 : 0), r, BELL_COLS[i], held || fl || ready, held, stopFl || (fl && Math.floor(t * 10) % 2 === 0));
      if (held) {
        // 押している長さの輪: 長い音の境目で金色に
        var k = Math.min(1, holdT / LONG_T);
        var segs = 20;
        for (var s = 0; s < segs * k; s++) {
          var a = -Math.PI / 2 + s / segs * Math.PI * 2;
          game.draw.circle(bx(i) + Math.cos(a) * 120, BELL_Y - 40 + Math.sin(a) * 120, 10, k >= 1 ? C.gold : C.white);
        }
      }
    }
  }

  function drawWorld() {
    drawRoom(); drawTeacher(); drawSlots(); drawKidAndBells();
  }

  function hud() {
    label(String(score), 190, 110, 60, C.ink);
    label(correct + ' / ' + NEEDED, W / 2, 110, 48, C.red);
    for (var i = 0; i < LIVES; i++) {
      var x = W - 200 + i * 80;
      game.draw.rect(x - 8, 80, 16, 50, i < lives ? C.red : '#c8b8a8');
      game.draw.circle(x - 20, 80, 16, i < lives ? C.red : '#c8b8a8');
      game.draw.circle(x + 20, 80, 16, i < lives ? C.red : '#c8b8a8');
    }
    var timeBar = Math.max(0, 1 - inputT / TIME_LIMIT);
    game.draw.rect(60, 172, W - 120, 16, '#00000022');
    game.draw.rect(60, 172, (W - 120) * timeBar, 16, phase === 'show' ? '#a0a0a0' : (timeBar < 0.25 ? C.bad : STYLE.accent[1]));
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || countIn > 0 || stopT > 0) return;
    var b = bellAt(x, y);
    if (b >= 0) { holdStart(b); game.fx.burst(bx(b), BELL_Y - 120, { color: BELL_COLS[b], count: 5, speed: 140 }); }
    else { game.audio.play('se_tap', 0.06); game.fx.burst(x, y, { color: C.wood, count: 3, speed: 90 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over) { holdBell = -1; return; }
    var r = holdEnd();
    if (r === 'early') game.audio.play('se_tap', 0.05);
  });

  // ── ATTRACT: 実ロジックで先生が 短・長・短 を鳴らし、手がタップ→長押し→色違いのベルを押して間違える ──
  var DEMO_SEQ = [{ bell: 1, long: false }, { bell: 3, long: true }, { bell: 0, long: false }];
  var DEMO_IN = [[1, 0.12], [3, 0.6], [4, 0.12]];
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, k: 0, hold: -1, wait: 0 };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) { resetRun(DEMO_SEQ.slice()); demo.k = 0; demo.hold = -1; demo.wait = 0.35; }
    stepWorld(dt);
    if (demo.k >= DEMO_IN.length) { demo.wait -= dt; if (demo.wait <= -1.0) demo.t = 0; return; }
    if (phase !== 'input') { demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3); demo.gy += (H * 0.95 - demo.gy) * Math.min(1, dt * 3); return; }
    var b = DEMO_IN[demo.k][0];
    demo.gx += (bx(b) - demo.gx) * Math.min(1, dt * 9); demo.gy += (BELL_Y - 10 - demo.gy) * Math.min(1, dt * 9);
    if (demo.wait > 0) { demo.wait -= dt; return; }
    if (demo.hold < 0 && Math.abs(bx(b) - demo.gx) < 12) { holdStart(b); demo.hold = 0; }
    else if (demo.hold >= 0) {
      demo.hold += dt;
      if (demo.hold >= DEMO_IN[demo.k][1]) { holdEnd(); demo.hold = -1; demo.k++; demo.wait = 0.3; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!seq) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: holdBell >= 0, scale: 14 });
      label(GAME_TITLE, W / 2, 110, 92, C.red);
      label('HI-SCORE ' + game.best, W / 2, 180, 38, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1890, 44, C.red);
      else label('TAP TO START', W / 2, 1890, 42, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(60, 260, W - 120, 330, C.white, 0.88);
      label(won ? 'CLEAR' : (inputT >= TIME_LIMIT ? 'TIME UP' : 'GAME OVER'), W / 2, 360, 100, won ? C.red : C.ink);
      label('SCORE ' + score, W / 2, 440, 58, C.ink);
      label(correct + ' / ' + NEEDED + '  PERFECT ' + longsOk, W / 2, 500, 40, C.board);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 565, 52, C.red);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 565, 42, C.ink);
      if (!won) label('あと' + Math.max(1, NEEDED - correct) + '音!', W / 2, Math.round(H * 0.58), 60, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1890, 40, C.ink);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { correct: correct, longs: longsOk, lives: lives };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      // hit-stop: 間違えたベルを白く光らせて拡大
      stopT -= dt;
      if (stopT <= 0) { game.feedback.bad(bx(stopBell), BELL_Y - 220, { text: 'MISS' }); over = true; won = false; finish(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      if (phase === 'input') inputT += dt;
      stepWorld(dt);
      if (phase === 'done') {
        over = true; won = true;
        score += lives * 200 + Math.round(Math.max(0, TIME_LIMIT - inputT) * 20);
        finish();
      } else if (inputT >= TIME_LIMIT && stopT <= 0) {
        over = true; won = false; holdBell = -1;
        game.feedback.bad(W / 2, SLOT_Y - 100, { text: 'TIME UP' });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.3), 120, C.red);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(350, 1300), { color: BELL_COLS[i % 5], count: 22, speed: 460 });
  }

  // 音楽室の小さな練習曲(オリジナル)。手本が聞こえるよう小さく
  var TUNE = [['C4', 1], ['E4', 1], ['G4', 1], ['E4', 1], ['F4', 1], ['A4', 1], ['G4', 2]];

  game.onStart(function() {
    game.audio.melody(TUNE, { tempo: 96, wave: 'sine', volume: 0.025, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
