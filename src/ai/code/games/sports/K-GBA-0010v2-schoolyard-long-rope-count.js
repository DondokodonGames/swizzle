// K-GBA-0010v2-schoolyard-long-rope-count.js
// 長縄ぴったり抜け — 回る長縄が足元を通る拍ごとに跳び、札の回数ぴったり跳んだら次の拍で縄から抜ける
// 操作: 左の大きいボタン=跳ぶ、右の矢印ボタン=抜ける。縄が足元を通る拍の頭で跳ぶ(ずれでPERFECT/GOOD)。札の数だけ跳んだら、次に縄が来る拍で抜けるを押す。跳びすぎ・早抜け・拍外れはMISS
// 終わり: 5回の順番(札 3→5→4→6→7)を回り切ればCLEAR(跳び/ぴったり抜けの点+コンボ+残り命)。MISS3回でGAME OVER
// @mechanic: count_exact
// @theme: schoolyard_long_rope_count
// 世界観: 休み時間の校庭の長縄で、順番待ちの子が、回し手の掲げた札の回数だけ縄の拍に合わせて跳び、ぴったり次の拍で縄から抜けて列に戻る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・ぴったり抜けた順番の数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var STYLE = { bg: ['#dff3fb', '#d3eef8'], main: ['#ff7a59', '#2ec4b6', '#ffd166'], accent: ['#3d405b', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なしのベタ塗り数色、丸角、余白。判定はUIの色変化で返す
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], coral: STYLE.main[0], teal: STYLE.main[1], sun: STYLE.main[2],
    navy: STYLE.accent[0], white: STYLE.accent[1],
    sand: '#f4e1b8', sandLine: '#ead39f', wall: '#f6f1e7', glass: '#9ad1e6', leaf: '#7bc96f', grey: '#c9ced9', red: '#ef476f'
  };

  var GAME_TITLE = 'ROPE COUNT';
  var HUD_H = Math.round(H * 0.12);
  var BPM = 120, SPB = 60 / BPM;
  var PERFECT_W = 0.06, GOOD_W = 0.13;
  var READY_T = 0.8;
  var LIVES = 3;
  var ROUND_N = [3, 5, 4, 6, 7];
  var DEMO_N = [3, 2];
  var TIME_LIMIT = 20.5;
  var DEMO_CYC = 5.4;
  var KID_X = 540, GROUND_Y = 1250, SHOULDER_Y = 1070, TURN_L = 190, TURN_R = 890;
  var PAD_Y = Math.round(H * 0.86);

  // 校庭の縄跳び歌(オリジナル): 8分で弾む長調の節。ベースが毎拍(=縄が地面を打つ拍)を鳴らす
  var TUNE = [
    [['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1]],
    [['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 1]],
    [['E4', 0.5], ['G4', 0.5], ['C5', 1], ['B4', 0.5], ['A4', 0.5], ['G4', 1]],
    [['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 1], ['R', 1]]
  ];
  var BASS = [
    [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]],
    [['F2', 1], ['C3', 1], ['F2', 1], ['C3', 1]],
    [['A2', 1], ['E2', 1], ['F2', 1], ['G2', 1]],
    [['G2', 1], ['D3', 1], ['G2', 1], ['C3', 1]]
  ];

  // ---- スプライト(アイコン的な単純形) ----
  var KID_STAND = ['...rrrr...', '..rrrrrr..', '...ffff...', '...ffff...', '..tttttt..', '.t.tttt.t.', '.f.tttt.f.', '...nnnn...', '...n..n...', '...f..f...', '..ww..ww..'];
  var KID_AIR = ['...rrrr...', 'f.rrrrrr.f', 't..ffff..t', '.t.ffff.t.', '..tttttt..', '...tttt...', '...tttt...', '..nnnnnn..', '.nn....nn.', '.ff....ff.', '.ww....ww.'];
  var KID_RUN = ['...rrrr...', '..rrrrrr..', '...ffff...', '...ffff...', '..tttttt..', '.ttttttt..', 'f..tttt.f.', '...nnnn...', '..n...n...', '.f.....f..', 'ww.....ww.'];
  var KID_FALL = ['..........', '..........', '..........', '..........', '..........', '..........', '.rr.......', 'rrrff.....', 'rrfftttnnf', '.rfftttnnw', '..........'];
  var KIDPAL = { r: '#ff7a59', f: '#ffd9b8', t: '#2ec4b6', n: '#3d405b', w: '#ffffff' };
  var KIDWHITE = { r: '#ffffff', f: '#ffffff', t: '#ffffff', n: '#ffffff', w: '#ffffff' };
  var MATE = ['...hhhh...', '..hhhhhh..', '...ffff...', '...ffff...', '..ssssss..', '..ssssss..', '..ssssss..', '...nnnn...', '...n..n...', '...f..f...', '..ww..ww..'];
  var ARROW_UP = ['...##...', '..####..', '.######.', '########', '..####..', '..####..', '..####..'];
  var ARROW_R = ['...#....', '...##...', '#######.', '########', '#######.', '...##...', '...#....'];
  var SHOE = ['..###.', '.#####', '######', 'w.w.w.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, plan, starts, totalBeats, evs, roundState, lives, score, combo, maxCombo, nPerfect, nGood, nMiss, cleared;
  var hitStop, over, won, outroT, cuedBar, lastBeat, jumpT, exitT, padFlash, demoMode, prevBest, failX, failY, cardFlip;
  var beatPulse = 0;

  function initRun(demo) {
    demoMode = !!demo;
    plan = demo ? DEMO_N : ROUND_N;
    starts = []; evs = []; roundState = [];
    var acc = 0;
    for (var r = 0; r < plan.length; r++) {
      starts.push(acc);
      // 拍: acc=札が上がる / acc+1=列から入る / acc+2..acc+N+1=跳ぶ / acc+N+2=抜ける
      for (var j = 1; j <= plan[r]; j++) evs.push({ r: r, k: acc + 1 + j, kind: 'jump', idx: j, res: 0 });
      evs.push({ r: r, k: acc + plan[r] + 2, kind: 'exit', idx: plan[r] + 1, res: 0 });
      roundState.push({ jumps: 0, failed: false, clear: false });
      acc += plan[r] + 3;
    }
    totalBeats = acc;
    clock = -READY_T; lives = LIVES; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; cleared = 0;
    hitStop = 0; over = false; won = false; outroT = 0; cuedBar = -1; lastBeat = -99;
    jumpT = 9; exitT = 9; padFlash = [0, 0]; prevBest = game.best; failX = -999; failY = -999; cardFlip = 0;
  }

  function roundAt(t) {
    var k = t / SPB, r = 0;
    for (var i = 0; i < starts.length; i++) if (k >= starts[i] - 0.2) r = i;
    return r;
  }
  function kidY() { return GROUND_Y - (jumpT < 0.34 ? Math.sin(jumpT / 0.34 * Math.PI) * 150 : 0); }

  // ---- 判定 ----
  function failRound(e, x, y) {
    var r = e ? e.r : roundAt(clock);
    roundState[r].failed = true;
    for (var i = 0; i < evs.length; i++) if (evs[i].r === r && !evs[i].res) evs[i].res = 4;
    if (e) e.res = 3;
    combo = 0; nMiss++; lives--;
    failX = x; failY = y;
    if (lives <= 0 && !demoMode) {
      hitStop = 0.45;
      game.feedback.bad(x, y, { text: 'MISS', shake: 16 });
      game.audio.play('se_break', 0.4);
      finishRun(false);
    } else {
      game.feedback.bad(x, y, { text: 'MISS', shake: demoMode ? 4 : 10, volume: demoMode ? 0.04 : 0.6 });
    }
  }

  function hitEvent(e, grade) {
    e.res = grade;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    var rs = roundState[e.r];
    var y = kidY() - 200;
    if (e.kind === 'jump') {
      rs.jumps++;
      score += Math.round((grade === 1 ? 100 : 60) * (1 + Math.min(10, combo) * 0.1));
      game.feedback.good(KID_X, y, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.coral : C.teal, size: grade === 1 ? 50 : 42, count: 8, volume: demoMode ? 0.04 : 0.2 });
      if (!demoMode) game.audio.tone(392 * Math.pow(2, Math.min(12, rs.jumps + 2) / 12), 0.06, { wave: 'square', volume: 0.05 });
    } else {
      rs.clear = true; cleared++;
      score += grade === 1 ? 300 : 200;
      exitT = 0;
      game.feedback.good(KID_X + 160, y, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: C.sun, size: 56, count: 16, volume: demoMode ? 0.04 : 0.25 });
      if (!demoMode) {
        game.fx.popup(cleared + ' / ' + plan.length, W / 2, 360, { color: C.coral, size: 70 });
        game.audio.play('se_milestone', 0.45);
      }
    }
  }

  function press(kind) {
    padFlash[kind === 'jump' ? 0 : 1] = 0.16;
    if (clock < 0) return 'early';
    var r = roundAt(clock), rs = roundState[r], s = starts[r], n = plan[r];
    if (rs.failed || rs.clear) return 'idle';
    var k = Math.round(clock / SPB), ad = Math.abs(clock - k * SPB);
    var act = clock >= (s + 1.5) * SPB && clock <= (s + n + 2) * SPB + GOOD_W;
    if (!act) return 'idle';
    if (kind === 'jump') jumpT = 0;
    var e = null;
    for (var i = 0; i < evs.length; i++) if (evs[i].r === r && evs[i].k === k && !evs[i].res) e = evs[i];
    if (e && ad <= GOOD_W) {
      if (e.kind === kind) { hitEvent(e, ad <= PERFECT_W ? 1 : 2); return 'hit'; }
      // 札の数を超えて跳んだ / 数が足りないのに抜けた
      failRound(e, KID_X, kidY() - 80);
      return 'miss';
    }
    // 縄の拍から外れた一跳び・早すぎる抜け
    failRound(null, KID_X, kidY() - 80);
    return 'miss';
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    if (ok) {
      score += lives * 200;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 700 + (i % 2) * 120, { color: [C.coral, C.teal, C.sun][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.white, 0.15);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, cleared: cleared, total: plan.length, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 拍クロック: 縄は毎拍の頭で地面を打つ。小節頭で節を出す
  function beatClock() {
    var barT = 4 * SPB;
    var nb = Math.floor((clock + 0.06) / barT);
    if (!demoMode && nb > cuedBar && nb >= 0 && nb * 4 < totalBeats) {
      cuedBar = nb;
      var i = nb % TUNE.length;
      game.audio.melody(TUNE[i], { tempo: BPM, wave: 'square', volume: 0.04, bass: BASS[i], bassVolume: 0.07 });
    }
    var bi = Math.floor(clock / SPB);
    if (bi !== lastBeat) {
      lastBeat = bi;
      if (clock >= 0 && bi <= totalBeats) {
        beatPulse = 1;
        var r = roundAt(clock);
        if (!demoMode) game.audio.tone(130, 0.05, { wave: 'square', volume: 0.07 });
        if (bi === starts[r]) {
          cardFlip = 0;
          if (!demoMode) game.audio.tone(1320, 0.08, { wave: 'triangle', volume: 0.06 });
        }
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    jumpT += dt; exitT += dt; cardFlip += dt;
    if (padFlash[0] > 0) padFlash[0] -= dt;
    if (padFlash[1] > 0) padFlash[1] -= dt;
    beatClock();
    if (over) return;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (!e.res && clock > e.k * SPB + GOOD_W) {
        // 跳ばなかった→縄が足にかかる / 抜けなかった→次の縄が当たる
        failRound(e, KID_X, GROUND_Y - 60);
        if (over) return;
      }
    }
    if (!over && clock > totalBeats * SPB + GOOD_W) finishRun(lives > 0);
    if (!over && clock > TIME_LIMIT) finishRun(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
    if (state === S.PLAYING && over) game.fx.burst(x, y, { color: C.grey, count: 3, speed: 80 });
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0) return;
    var kind = x < 660 ? 'jump' : 'exit';
    var r = press(kind);
    if (kind === 'jump' && (r === 'hit' || r === 'miss')) game.audio.play('se_jump', 0.3);
    if (r === 'idle' || r === 'early') {
      // 縄に入っていない時の操作は効かない(短い音とボタンの揺れだけ)
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: C.grey, count: 4, speed: 90 });
    }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function roundRect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - r * 2, h, col);
    game.draw.rect(x, y + r, w, h - r * 2, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }

  function ropePhase() { return ((clock - 0.05) / SPB) - Math.floor((clock - 0.05) / SPB); }
  function ropeSlack() {
    if (clock < 0) return true;
    var r = roundAt(clock);
    return roundState[r].failed && clock < (starts[r] + plan[r] + 3) * SPB;
  }
  function hands(ph) {
    var a = ph * Math.PI * 2;
    return { lx: TURN_L + 40 + Math.sin(a) * 26, ly: SHOULDER_Y + Math.cos(a) * 46, rx: TURN_R - 40 - Math.sin(a) * 26, ry: SHOULDER_Y + Math.cos(a) * 46 };
  }
  function drawRope(front) {
    var hp, midY, col = hitStop > 0 ? C.white : C.coral;
    if (ropeSlack() || over) {
      if (front) return;
      hp = hands(0.5);
      for (var s = 0; s < 12; s++) {
        var u0 = s / 12, u1 = (s + 1) / 12;
        game.draw.line(hp.lx + (hp.rx - hp.lx) * u0, GROUND_Y + 6 - Math.abs(u0 - 0.5) * 40, hp.lx + (hp.rx - hp.lx) * u1, GROUND_Y + 6 - Math.abs(u1 - 0.5) * 40, col, 10);
      }
      return;
    }
    var ph = ropePhase();
    var isFront = ph < 0.25 || ph > 0.75;
    if (isFront !== front) return;
    hp = hands(ph);
    midY = SHOULDER_Y + Math.cos(ph * Math.PI * 2) * 200;
    var lx = hp.lx, ly = hp.ly;
    for (var i = 1; i <= 14; i++) {
      var u = i / 14, x = hp.lx + (hp.rx - hp.lx) * u, v = u * 2 - 1;
      var y = hp.ly + (midY - hp.ly) * (1 - v * v);
      game.draw.line(lx, ly, x, y, col, isFront ? 12 : 8);
      lx = x; ly = y;
    }
  }

  function drawYard() {
    var t = game.time.elapsed;
    game.draw.clear(C.sky);
    game.draw.gradient(0, 900, [[0, C.sky], [1, C.sky2]]);
    game.draw.circle(900, 380, 70, C.sun);
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 380 + t * 18) % (W + 300)) - 150;
      roundRect(cx, 300 + c * 60, 200, 54, 27, C.white);
    }
    // 校舎(遠景)と木
    roundRect(60, 520, 720, 420, 24, C.wall);
    for (var wy = 0; wy < 3; wy++) for (var wx = 0; wx < 5; wx++) roundRect(100 + wx * 136, 560 + wy * 120, 100, 70, 12, C.glass);
    roundRect(330, 860, 140, 80, 12, C.grey);
    game.draw.circle(900, 760, 110, C.leaf); game.draw.circle(840, 820, 80, C.leaf);
    game.draw.rect(888, 820, 24, 140, '#c49a6c');
    // 校庭
    game.draw.rect(0, 940, W, H - 940, C.sand);
    game.draw.rect(0, GROUND_Y + 40, W, 6, C.sandLine);
    // 縄の影(下りてくる拍の予告)
    if (!ropeSlack() && !over) {
      var ph = ropePhase(), near = ph > 0.6 ? (ph - 0.6) / 0.4 : 0;
      roundRect(KID_X - 120 - near * 140, GROUND_Y + 20, 240 + near * 280, 24, 12, near > 0.7 ? C.red : C.sandLine);
    }
  }

  function drawPeople() {
    var ph = ropePhase(), hp = hands(ropeSlack() || over ? 0.5 : ph), bob = beatPulse * 8;
    // 回し手
    game.draw.sprite(MATE, { h: '#3d405b', f: '#ffd9b8', s: '#ffd166', n: '#3d405b', w: '#ffffff' }, TURN_L, GROUND_Y - 72, 13, { anchor: 'center' });
    game.draw.sprite(MATE, { h: '#8d5a3b', f: '#ffd9b8', s: '#ffd166', n: '#3d405b', w: '#ffffff' }, TURN_R, GROUND_Y - 72, 13, { anchor: 'center', flipX: true });
    game.draw.line(TURN_L + 20, SHOULDER_Y - 10, hp.lx, hp.ly, '#ffd9b8', 14);
    game.draw.line(TURN_R - 20, SHOULDER_Y - 10, hp.rx, hp.ry, '#ffd9b8', 14);
    // 順番待ちの列(左)
    game.draw.sprite(MATE, { h: '#3d405b', f: '#ffd9b8', s: '#ef476f', n: '#3d405b', w: '#ffffff' }, 50, GROUND_Y + 40 - bob, 9, { anchor: 'center' });
    game.draw.sprite(MATE, { h: '#8d5a3b', f: '#ffd9b8', s: '#9ad1e6', n: '#3d405b', w: '#ffffff' }, 110, GROUND_Y + 40 - (beatPulse > 0.5 ? 0 : bob), 9, { anchor: 'center' });
  }

  function drawKid() {
    var x = 150, y = GROUND_Y + 36, art = KID_STAND, px = 11;
    if (clock >= 0 || over) {
      var r = roundAt(clock), s = starts[r], rs = roundState[r];
      var tb = clock / SPB;
      if (rs.clear) {
        var u = Math.min(1, exitT / 0.4);
        x = KID_X + (W + 80 - KID_X) * u; y = GROUND_Y - 77; art = KID_RUN; px = 14;
      } else if (rs.failed) {
        x = KID_X; y = GROUND_Y - 24; art = KID_FALL; px = 14;
      } else if (tb >= s + 1) {
        var v = Math.min(1, (tb - s - 1) / 0.7);
        x = 150 + (KID_X - 150) * v; y = GROUND_Y - 77 + (1 - v) * 100; px = 14;
        art = v < 1 ? KID_RUN : (jumpT < 0.34 ? KID_AIR : KID_STAND);
        if (v >= 1) y = kidY() - 77;
      }
    }
    if (hitStop > 0) {
      game.draw.circle(x, y, 130, C.white, 0.7);
      game.draw.sprite(art, KIDWHITE, x, y, 17, { anchor: 'center' });
      return;
    }
    game.draw.sprite(art, KIDPAL, x, y, px, { anchor: 'center' });
  }

  // 札: 跳ぶ回数(数字)と、跳ぶたびに埋まる丸
  function drawCard() {
    if (clock < 0 && !demoMode) return;
    var r = roundAt(Math.max(0, clock)), n = plan[r], rs = roundState[r];
    var pop = Math.min(1, cardFlip / 0.15);
    var cw = 300, ch = 210 * pop, cx = W / 2 - cw / 2, cy = 430;
    roundRect(cx - 10, cy - 10, cw + 20, ch + 20, 30, rs.failed ? C.grey : C.coral);
    roundRect(cx, cy, cw, Math.max(1, ch), 24, C.white);
    if (pop >= 1) label(String(n), W / 2, cy + 105, 150, rs.failed ? C.grey : C.navy);
    var pw = Math.min(110, 760 / n);
    for (var i = 0; i < n; i++) {
      var px = W / 2 - (n - 1) * pw / 2 + i * pw;
      game.draw.circle(px, 720, 30, C.navy);
      game.draw.circle(px, 720, 22, i < rs.jumps ? C.sun : C.white);
    }
    if (rs.clear) game.draw.sprite(ARROW_R, { '#': C.teal }, W / 2 + (n + 1) * pw / 2 + 30, 720, 7, { anchor: 'center' });
  }

  function drawPads() {
    var t = game.time.elapsed;
    roundRect(50, PAD_Y - 160, 590, 320, 48, padFlash[0] > 0 ? C.sun : C.coral);
    game.draw.sprite(ARROW_UP, { '#': C.white }, 345, PAD_Y - 10 - (padFlash[0] > 0 ? 18 : 0), 20, { anchor: 'center' });
    roundRect(680, PAD_Y - 160, 350, 320, 48, padFlash[1] > 0 ? C.sun : C.teal);
    game.draw.sprite(ARROW_R, { '#': C.white }, 855 + (padFlash[1] > 0 ? 18 : 0) + Math.sin(t * 4) * 4, PAD_Y, 20, { anchor: 'center' });
  }

  function drawBeatDots() {
    var bi = Math.max(0, Math.floor(clock / SPB));
    roundRect(W / 2 - 200, HUD_H + 24, 400, 70, 35, C.white);
    for (var i = 0; i < 4; i++) {
      var on = clock >= 0 && bi % 4 === i;
      game.draw.circle(W / 2 - 135 + i * 90, HUD_H + 59, (i === 0 ? 22 : 17) + (on ? beatPulse * 6 : 0), on ? C.coral : C.grey);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, HUD_H, C.white);
    label('SCORE ' + score, 50, 70, 40, C.navy, 'left');
    var r = clock >= 0 ? roundAt(clock) : 0;
    label((r + 1) + ' / ' + plan.length, W / 2, 70, 40, C.coral);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(SHOE, { '#': i < lives ? C.teal : C.grey, w: C.white }, W - 80 - i * 90, 70, 10, { anchor: 'center' });
    var progress = Math.max(0, Math.min(1, clock / (totalBeats * SPB)));
    roundRect(50, 140, W - 100, 26, 13, C.sky);
    if (progress > 0.03) roundRect(50, 140, (W - 100) * progress, 26, 13, C.teal);
    if (combo >= 2) label('COMBO x' + combo, 50, 200, 30, C.coral, 'left');
  }

  function drawScene() {
    drawYard();
    drawRope(false);
    drawPeople();
    drawKid();
    drawRope(true);
    drawCard();
    drawBeatDots();
    drawPads();
  }

  function drawResult(showTap) {
    roundRect(50, H * 0.29, W - 100, H * 0.32, 48, C.white);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.335, 96, won ? C.teal : C.red);
    label('SCORE ' + score, W / 2, H * 0.40, 56, C.navy);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, C.coral);
    label('CLEAR ' + cleared + ' / ' + plan.length, W / 2, H * 0.49, 38, C.teal);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.535, 52, C.coral);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.535, 40, C.navy);
    if (!won) label('あと' + Math.max(1, plan.length - cleared) + '回!', W / 2, H * 0.575, 44, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.60, 34, C.navy);
  }

  // ---- ATTRACT: 実ロジックで札3回をぴったり跳んで次の拍で抜ける。続く札2回では跳びすぎてMISS ----
  var demo = { t: 0, x: 345, y: PAD_Y, press: false, gi: 0, pressT: 0 };
  function demoReset() {
    initRun(true);
    clock = 0.3; lastBeat = 0; cardFlip = 0.3; demo.gi = 0; demo.pressT = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var tx = 345, ty = PAD_Y + 20;
    if (demo.gi < evs.length) {
      var e = evs[demo.gi];
      // 2つ目の順番の「抜ける拍」だけ、わざと跳んでしまう(跳びすぎの失敗例)
      var kind = (e.r === 1 && e.kind === 'exit') ? 'jump' : e.kind;
      tx = kind === 'jump' ? 345 : 855;
      if (e.res) demo.gi++;
      else if (clock >= e.k * SPB) { press(kind); demo.gi++; demo.pressT = 0.15; }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 12);
    demo.y += (ty - demo.y) * Math.min(1, dt * 12);
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, HUD_H, C.white);
      label(GAME_TITLE, W / 2, 84, 86 + Math.sin(t * 3) * 3, C.coral);
      label('HI-SCORE ' + game.best, W / 2, 176, 36, C.navy);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.43, 52, C.coral);
      else label('TAP TO START', W / 2, H * 0.43, 46, C.navy);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt; exitT += dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      roundRect(140, H * 0.46, W - 280, 150, 40, C.white);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46 + 75, 96, C.coral);
    }
    // 開始時お手本: 最初の跳ぶ拍の直前に、跳ぶボタンへ手を1回出す
    if (!over && clock > 1.2 * SPB && clock < 2 * SPB + 0.15) {
      game.draw.hand(345, PAD_Y + 20, { press: clock >= 2 * SPB - 0.05, scale: 13, alpha: 0.8 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
