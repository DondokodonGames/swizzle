// K-GBA-0030v2-subway-vine-chase.js
// 地下鉄の壁面つる摘み — 拍ごとに壁のプランターからプランターへ顔を出し直すつる草の芽を追い、出た拍の頭でつまみ取る。テンポは4段階で速まる
// 操作: 壁の箱のうち、白く縁取られて点滅する箱(つるの先が伸びていく先)を、芽が顔を出す拍の頭でタップしてつまむ。その次の行き先は薄い点で見える。違う箱・早すぎるタップはコンボが切れるだけ。つまみ損ねると芽がそこに根を張り葉が茂る(MISS)
// 終わり: 4段階(96→112→128→144拍/分、各8拍)の32回を追い切ればCLEAR(PERFECT/GOOD/コンボ+到達テンポ+残り)。葉が4か所茂るとGAME OVER
// @mechanic: chase
// @theme: subway_green_wall_vine_chase
// 世界観: 地下鉄駅のホームの壁面緑化パネルで、夜の清掃員が長い摘み取りばさみを手に、拍ごとにプランターを渡り歩くつる草の芽を追いかけては摘み取り、壁が茂るのを食い止める
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・摘んだ芽の数・PERFECT/GOOD/MISS数・最大コンボ・到達したテンポ
// スタイル: VOXEL BLOCK

(function(game) {
  var STYLE = { bg: ['#2b3442', '#4a5568'], main: ['#a6d86e', '#62a347', '#3b6b2c'], accent: ['#ffd23f', '#f05d4e'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面(明)/正面(中)/右面(暗)の3明度で描く。影は落とさず明度差だけで立体を出す
  var C = {
    top: STYLE.main[0], front: STYLE.main[1], side: STYLE.main[2], gold: STYLE.accent[0], red: STYLE.accent[1],
    tile0: '#c9d3dc', tile1: '#aeb9c4', tile2: '#8a97a4', soil: '#5a4030', soilD: '#3f2c20',
    white: '#ffffff', ink: '#1c222c', leaf: '#2e5a24', leafL: '#4c8a36'
  };

  var GAME_TITLE = 'VINE CHASE';
  var PERFECT_W = 0.06, GOOD_W = 0.12, EARLY_W = 0.25;
  var READY_T = 0.8;
  var TIME_LIMIT = 18.9;                       // 導入4拍@96 + 8拍x4段
  var LIVES = 4;
  var STAGE_BPM = [96, 112, 128, 144];
  var STAGE_BEATS = 8;
  var DEMO_BPM = [96, 120], DEMO_STAGE_BEATS = 4, DEMO_MISS_AT = 6;
  var COLS = 4, ROWS = 4, CS = 150, CD = 34, PITCH_X = 210, PITCH_Y = 220;
  var GX = Math.round((W - ((COLS - 1) * PITCH_X + CS + CD)) / 2), GY = Math.round(H * 0.245);
  var FLOOR_Y = Math.round(H * 0.79);
  var DEMO_PATH = [5, 6, 10, 9, 5, 1, 2, 6, 7, 11];

  // 伴奏(オリジナル): 段ごとにテンポが上がる。小節頭で1小節ずつ鳴らして拍クロックに同期
  var TUNE = [
    [['A4', 1], ['C5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 1]],
    [['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['G4', 1]],
    [['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 1]],
    [['C5', 0.5], ['D5', 0.5], ['E5', 1], ['A5', 1], ['G5', 1]]
  ];
  var BASS = [
    [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1]],
    [['F2', 1], ['C3', 1], ['G2', 1], ['D3', 1]],
    [['A2', 0.5], ['A2', 0.5], ['E3', 1], ['F2', 0.5], ['F2', 0.5], ['C3', 1]],
    [['G2', 0.5], ['G2', 0.5], ['D3', 1], ['E2', 0.5], ['E2', 0.5], ['E3', 1]]
  ];

  // ---- スプライト(ボクセルの粒) ----
  var SPROUT = [
    ['...ll....', '..llll...', '....s....', '..sssss..', '.ssssss..', '.skssks..', '.sssssss.', '..sssss..'],
    ['....ll...', '...llll..', '....s....', '..sssss..', '..ssssss.', '..skssks.', '.sssssss.', '..sssss..'],
    ['.ll...ll.', '.lll.lll.', '....s....', '..sssss..', '.sssssss.', '.sksssks.', '.ssssss..', '..sssss..']
  ];
  var SPAL = { l: '#d8f7a0', s: STYLE.main[0], k: C.ink };
  var SPAL_W = { l: C.white, s: C.white, k: C.white };
  // 清掃員(帽子・顔・作業着): 立ち / 走り1 / 走り2 / 摘む
  var CLEANER = [
    ['...yyyy...', '..yyyyyy..', '...ffff...', '...fkfk...', '...ffff...', '..bbbbbb..', '.bbbbbbbb.', 'f.bbbbbb.f', '..bbbbbb..', '..dd..dd..', '..dd..dd..', '..kk..kk..'],
    ['...yyyy...', '..yyyyyy..', '...ffff...', '...fkfk...', '...ffff...', '..bbbbbb..', '.bbbbbbbb.', 'f.bbbbbb..', '..bbbbbbf.', '..dd...dd.', '.dd....dd.', '.kk.....k.'],
    ['...yyyy...', '..yyyyyy..', '...ffff...', '...fkfk...', '...ffff...', '..bbbbbb..', '.bbbbbbbb.', '..bbbbbb.f', '.fbbbbbb..', '...dd.dd..', '...dd.dd..', '...kk.kk..'],
    ['...yyyy..f', '..yyyyyy.f', '...ffff..b', '...fkfk.bb', '...ffff.b.', '..bbbbbbb.', '.bbbbbbb..', 'f.bbbbbb..', '..bbbbbb..', '..dd..dd..', '..dd..dd..', '..kk..kk..']
  ];
  var CPAL = { y: C.gold, f: '#f2c9a0', k: C.ink, b: '#3f7fbf', d: '#2a4a70' };
  var LEAF = ['..LL..', '.LLLL.', 'LLlLLL', 'LLLlLL', '.LLLL.', '..L...'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, beats, bars, targets, introN, lastBeat, cuedBar, lives, score, combo, maxCombo, nP, nG, nM, plucked;
  var leaves, over, won, outroT, hitStop, demoMode, prevBest, stageShown, topBpm, halfShown;
  var cleanerX, cleanerTX, reachT, reachCell, failCell, failT, comboBreakT;
  var beatPulse = 0;

  function cellXY(c) { return { x: GX + (c % COLS) * PITCH_X, y: GY + Math.floor(c / COLS) * PITCH_Y }; }
  function cellCenter(c) { var p = cellXY(c); return { x: p.x + (CS + CD) / 2, y: p.y + CS / 2 - CD / 2 }; }
  function popXY(c) { var p = cellXY(c); return { x: p.x + CS / 2 + CD / 2, y: p.y - CD / 2 - 30 }; }

  function nextCell(cur, prev, far) {
    var cc = cur % COLS, cr = Math.floor(cur / COLS), opts = [];
    for (var dc = -2; dc <= 2; dc++) for (var dr = -2; dr <= 2; dr++) {
      var m = Math.max(Math.abs(dc), Math.abs(dr));
      if (m === 0 || m > (far ? 2 : 1)) continue;
      var nc = cc + dc, nr = cr + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      var id = nr * COLS + nc;
      if (id === prev) continue;
      opts.push(id);
      if (far && m === 2) opts.push(id);      // 後半は遠くへ跳びやすい
    }
    return opts[Math.min(opts.length - 1, Math.floor(game.random(0, opts.length)))];
  }

  // 拍の時刻表を先に作る(段ごとにSPBが変わる)。拍の頭=芽が顔を出す瞬間
  function initRun(demo) {
    demoMode = !!demo;
    var bpms = demoMode ? DEMO_BPM : STAGE_BPM, per = demoMode ? DEMO_STAGE_BEATS : STAGE_BEATS;
    introN = demoMode ? 2 : 4;
    beats = []; bars = []; targets = [];
    var t = 0, spb0 = 60 / bpms[0];
    for (var i = 0; i < introN; i++) { if (i % 4 === 0) bars.push({ t: t, bpm: bpms[0], n: Math.min(4, introN - i) }); beats.push({ t: t, stage: -1, spb: spb0 }); t += spb0; }
    var cur = demoMode ? DEMO_PATH[0] : 5 + Math.floor(game.random(0, 2)), prev = -1, k = 0;
    for (var s = 0; s < bpms.length; s++) {
      var spb = 60 / bpms[s];
      for (var j = 0; j < per; j++) {
        if (j % 4 === 0) bars.push({ t: t, bpm: bpms[s], n: Math.min(4, per - j) });
        var nx = demoMode ? DEMO_PATH[(k + 1) % DEMO_PATH.length] : nextCell(cur, prev, s >= 2);
        targets.push({ t: t, cell: nx, from: cur, stage: s, spb: spb, res: 0 });
        beats.push({ t: t, stage: s, spb: spb });
        prev = cur; cur = nx; k++;
        t += spb;
      }
    }
    clock = -READY_T; lastBeat = -1; cuedBar = -1;
    lives = LIVES; score = 0; combo = 0; maxCombo = 0; nP = 0; nG = 0; nM = 0; plucked = 0;
    leaves = []; over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    stageShown = -1; topBpm = bpms[0]; halfShown = false;
    var c0 = cellCenter(targets[0].from);
    cleanerX = c0.x; cleanerTX = c0.x; reachT = 0; reachCell = -1; failCell = -1; failT = 0; comboBreakT = 0;
  }
  function endTime() { var b = beats[beats.length - 1]; return b.t + b.spb; }
  function curStage() {
    var st = -1;
    for (var i = 0; i < beats.length; i++) if (clock >= beats[i].t - 0.001) st = beats[i].stage;
    return st;
  }

  function cellAt(x, y) {
    for (var c = 0; c < COLS * ROWS; c++) {
      var p = cellXY(c);
      if (x >= p.x - 12 && x <= p.x + CS + CD + 12 && y >= p.y - CD - 12 && y <= p.y + CS + 12) return c;
    }
    return -1;
  }

  // ---- 判定(本番もATTRACTのゴーストも同じ関数) ----
  function pinch(x, y) {
    var c = cellAt(x, y);
    if (c >= 0) cleanerTX = cellCenter(c).x;
    if (over || clock < -0.1) return 'idle';
    var best = null, bd = 9;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.res) continue;
      var d = clock - tg.t;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = tg; }
    }
    if (!best) return 'idle';
    if (c === best.cell && Math.abs(bd) <= GOOD_W) { hitTarget(best, Math.abs(bd) <= PERFECT_W ? 1 : 2); return 'hit'; }
    if (c === best.cell && bd < 0 && -bd <= EARLY_W) { breakCombo(x, y); return 'early'; }
    if (c >= 0 && Math.abs(bd) <= GOOD_W) { breakCombo(x, y); return 'wrong'; }
    return 'idle';
  }

  function hitTarget(tg, grade) {
    tg.res = grade;
    plucked++; combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nP++; else nG++;
    score += Math.round((grade === 1 ? 100 : 60) * (1 + Math.min(10, combo) * 0.1) * (1 + tg.stage * 0.25));
    reachT = 0.18; reachCell = tg.cell;
    var p = popXY(tg.cell);
    game.feedback.good(p.x, p.y - 40, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.gold : C.top, size: grade === 1 ? 50 : 40, count: grade === 1 ? 14 : 8, volume: demoMode ? 0 : 0.2 });
    if (!demoMode && combo >= 2) game.audio.tone(440 * Math.pow(2, Math.min(12, combo) / 12), 0.05, { wave: 'square', volume: 0.04 });
    if (!demoMode && !halfShown && plucked >= targets.length / 2) {
      halfShown = true;
      game.fx.popup('NICE', W / 2, GY - 120, { color: C.gold, size: 80 });
      game.audio.play('se_milestone', 0.45);
    }
  }

  function breakCombo(x, y) {
    combo = 0; comboBreakT = 0.25;
    game.feedback.bad(x, y, { text: null, shake: demoMode ? 2 : 4, volume: demoMode ? 0 : 0.25, flashColor: '#8a97a4' });
  }

  function missTarget(tg) {
    tg.res = 3;
    combo = 0; nM++; lives--;
    leaves.push(tg.cell);
    failCell = tg.cell; failT = 0.4;
    var p = popXY(tg.cell);
    if (lives <= 0 && !demoMode) {
      hitStop = 0.5;
      game.feedback.bad(p.x, p.y - 40, { text: 'MISS', shake: 16 });
      game.audio.play('se_break', 0.4);
      finishRun(false);
    } else {
      game.feedback.bad(p.x, p.y - 40, { text: 'MISS', shake: demoMode ? 3 : 10, volume: demoMode ? 0 : 0.6 });
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200 + topBpm * 2;
      for (var i = 0; i < 8; i++) { var q = cellCenter(i * 2); game.fx.burst(q.x, q.y, { color: i % 2 ? C.gold : C.top, count: 16, speed: 400 }); }
      game.fx.flash(C.top, 0.15);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, plucked: plucked, total: targets.length, perfect: nP, good: nG, miss: nM, maxCombo: maxCombo, topBpm: topBpm };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 拍クロック(1つ)。拍の時刻表を進め、小節頭で伴奏、段の切り替えを1拍前から予告 ----
  function beatClock() {
    for (var b = cuedBar + 1; b < bars.length; b++) {
      if (clock + 0.06 >= bars[b].t) {
        cuedBar = b;
        if (!demoMode) {
          var tn = TUNE[b % TUNE.length], bs = BASS[b % BASS.length];
          if (bars[b].n < 4) { tn = tn.slice(0, 2); bs = bs.slice(0, 2); }
          game.audio.melody(tn, { tempo: bars[b].bpm, wave: 'square', volume: 0.045, bass: bs, bassVolume: 0.08 });
        }
      } else break;
    }
    while (lastBeat + 1 < beats.length && clock >= beats[lastBeat + 1].t) {
      lastBeat++;
      beatPulse = 1;
      var bt = beats[lastBeat];
      var nxt = beats[lastBeat + 1];
      if (!demoMode) game.audio.tone(lastBeat % 4 === 0 ? 1320 : 990, 0.03, { wave: 'square', volume: 0.03 });
      // 次の拍から段が上がる: 3音の上がる予告+テンポ灯の点滅
      if (nxt && nxt.stage > bt.stage && nxt.stage > 0 && !demoMode) {
        game.audio.tone(523, 0.07, { wave: 'square', volume: 0.05 });
        game.audio.tone(784, 0.1, { wave: 'square', volume: 0.05, slide: 260 });
      }
      if (bt.stage > stageShown && bt.stage >= 0) {
        stageShown = bt.stage;
        topBpm = demoMode ? DEMO_BPM[bt.stage] : STAGE_BPM[bt.stage];
        if (bt.stage > 0) {
          game.fx.popup('' + topBpm, W - 150, 200, { color: C.gold, size: 64 });
          if (!demoMode) game.audio.play('se_powerup', 0.35);
        }
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    if (reachT > 0) reachT -= dt;
    if (failT > 0) failT -= dt;
    if (comboBreakT > 0) comboBreakT -= dt;
    cleanerX += (cleanerTX - cleanerX) * Math.min(1, dt * 9);
    beatClock();
    if (over) return;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (!tg.res && clock > tg.t + GOOD_W) {
        missTarget(tg);
        if (over) return;
      }
    }
    if (clock >= endTime() || clock >= TIME_LIMIT + 0.3) finishRun(lives > 0);
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || hitStop > 0) return;
    var r = pinch(x, y);
    // はさみの音(つまめた時は高く、空振りは低く)
    game.audio.tone(r === 'hit' ? 1180 : 420, 0.04, { wave: 'square', volume: r === 'hit' ? 0.05 : 0.03, slide: r === 'hit' ? 200 : -60 });
    if (r === 'idle') game.fx.burst(x, y, { color: C.tile2, count: 4, speed: 90 });
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  // 立方体: x,y=正面の左上。上面(明)・正面(中)・右面(暗)
  function cube(x, y, s, d, top, front, side) {
    game.draw.rect(x, y, s, s, front);
    for (var i = 0; i < d; i += 2) game.draw.rect(x + i, y - i - 2, s, 2, top);
    for (var j = 0; j < d; j += 2) game.draw.rect(x + s + j, y - j - 1, 2, s, side);
  }
  function outlineTop(x, y, s, d, col, w) {
    game.draw.line(x, y, x + s, y, col, w);
    game.draw.line(x + s, y, x + s + d, y - d, col, w);
    game.draw.line(x + s + d, y - d, x + d, y - d, col, w);
    game.draw.line(x + d, y - d, x, y, col, w);
  }

  function drawStation() {
    var t = game.time.elapsed;
    game.draw.clear(STYLE.bg[0]);
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, '#1c2230']]);
    // 天井灯(拍で明るくなる)
    for (var l = 0; l < 4; l++) cube(110 + l * 240, 236, 150, 16, beatPulse > 0.5 ? '#fff6c8' : '#e8e2c0', '#d0c8a0', '#9a9478');
    // 壁のタイル目地
    for (var ty = 300; ty < FLOOR_Y - 40; ty += 60) game.draw.line(0, ty, W, ty, '#3c4656', 2);
    for (var tx = 0; tx < W; tx += 90) game.draw.line(tx, 300, tx, FLOOR_Y - 40, '#3c4656', 2);
    // 緑化パネルの枠
    cube(GX - 40, GY - CD - 40, (COLS - 1) * PITCH_X + CS + 80, 16, '#6f7c8c', '#56616f', '#3d4552');
    game.draw.rect(GX - 30, GY - CD - 30, (COLS - 1) * PITCH_X + CS + 60, (ROWS - 1) * PITCH_Y + CS + CD + 40, '#26303c');
    // ホームの床(ボクセルの板)と黄色い線
    for (var f = 0; f < 8; f++) cube(f * 140 - 20, FLOOR_Y, 140, 30, f % 2 ? '#9aa4b0' : '#a8b2be', '#6c7682', '#4e5662');
    game.draw.rect(0, FLOOR_Y - 18, W, 12, C.gold);
    // 遠くを通る電車の光(左右に流れる)
    var trainX = ((t * 700) % (W * 3)) - W;
    game.draw.rect(trainX, FLOOR_Y + 260, 600, 10, '#ffe8a0', 0.25);
  }

  function nextTarget() {
    for (var i = 0; i < targets.length; i++) if (!targets[i].res && targets[i].t > clock - GOOD_W) return i;
    return -1;
  }

  function drawWall() {
    var t = game.time.elapsed;
    var ni = nextTarget();
    var nt = ni >= 0 ? targets[ni] : null, nn = ni >= 0 && ni + 1 < targets.length ? targets[ni + 1] : null;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var id = r * COLS + c, p = cellXY(id);
        var lifted = nt && nt.cell === id ? Math.max(0, 1 - Math.abs(nt.t - clock) / 0.15) * 8 : 0;
        cube(p.x, p.y - lifted, CS, CD, C.top, C.front, C.side);
        // 土の穴(上面の中央)
        for (var k = 6; k < CD - 6; k += 2) game.draw.rect(p.x + k + 30, p.y - lifted - k - 2, CS - 60, 2, k < CD / 2 ? C.soil : C.soilD);
        // 正面の縦じま(パネルの継ぎ目)
        game.draw.rect(p.x + CS / 2 - 2, p.y - lifted + 10, 4, CS - 20, C.side, 0.5);
        // 次の行き先: 白縁が点滅(拍の頭に向かって強くなる)
        if (nt && nt.cell === id && clock > nt.t - nt.spb * 1.05) {
          var on = Math.floor(t * 12) % 2 === 0 || nt.t - clock < nt.spb * 0.4;
          if (on) outlineTop(p.x, p.y - lifted, CS, CD, C.white, 6);
          game.draw.rect(p.x - 6, p.y - lifted - 6, CS + 12, 6, C.white, 0.6);
        }
        if (nn && nn.cell === id && (!nt || nt.cell !== id)) {
          game.draw.rect(p.x + CS / 2 + CD / 2 - 9, p.y - CD / 2 - 9, 18, 18, C.white, 0.45);
        }
        if (failCell === id && failT > 0) game.draw.rect(p.x - 8, p.y - CD - 8, CS + CD + 16, CS + CD + 16, C.white, failT * 1.5);
      }
    }
    // つる: いまの位置から次の箱へ拍に合わせて伸び、先端のつぼみが這っていく(拍の頭で顔を出す)
    if (nt && clock > -0.4) {
      var a = popXY(nt.from), b = popXY(nt.cell);
      var grow = Math.max(0, Math.min(1, 1 - (nt.t - clock) / nt.spb));
      var ex = a.x + (b.x - a.x) * grow, ey = a.y + 30 + (b.y - a.y) * grow;
      game.draw.line(a.x, a.y + 30, ex, ey, C.side, 14);
      game.draw.line(a.x, a.y + 30, ex, ey, C.top, 6);
      if (grow > 0.05 && grow < 0.97) game.draw.sprite(SPROUT[Math.floor(t * 8) % 3], SPAL, ex, ey - 10, 5, { anchor: 'center' });
    }
    // 茂った葉(MISSの跡)
    for (var i = 0; i < leaves.length; i++) {
      var q = cellXY(leaves[i]);
      game.draw.sprite(LEAF, { L: C.leaf, l: C.leafL }, q.x + 50, q.y + 60, 16, { anchor: 'center' });
      game.draw.sprite(LEAF, { L: C.leaf, l: C.leafL }, q.x + 110, q.y + 90, 13, { anchor: 'center', flipX: true });
    }
    // 芽: 拍の頭で顔を出し、半拍で引っ込む
    var shown = null;
    for (var j = targets.length - 1; j >= 0; j--) {
      var tg = targets[j];
      if (clock >= tg.t - 0.04 && clock < tg.t + tg.spb * 0.55) { shown = tg; break; }
    }
    var sc, sp;
    if (shown && shown.res !== 1 && shown.res !== 2) {
      sp = popXY(shown.cell);
      var u = Math.min(1, (clock - shown.t + 0.04) / 0.08);
      var fr = Math.floor((clock / shown.spb) * 2) % 3;
      var fl = failCell === shown.cell && failT > 0;
      sc = (fl ? 13 : 10) * u;
      if (sc > 0.5) game.draw.sprite(SPROUT[fr], fl ? SPAL_W : SPAL, sp.x, sp.y - u * 14, sc, { anchor: 'center' });
    } else if (!shown && nt && clock < 0.01) {
      // 導入中: 最初の箱でちょこんと揺れている
      sp = popXY(nt.from);
      game.draw.sprite(SPROUT[Math.floor(t * 4) % 3], SPAL, sp.x, sp.y - beatPulse * 10, 9, { anchor: 'center' });
    } else if (!shown && nt && lastBeat < introN) {
      sp = popXY(nt.from);
      game.draw.sprite(SPROUT[lastBeat % 3], SPAL, sp.x, sp.y - beatPulse * 14, 9, { anchor: 'center' });
    }
  }

  function drawCleaner() {
    var moving = Math.abs(cleanerTX - cleanerX) > 8;
    var fr = reachT > 0 ? 3 : (moving ? 1 + Math.floor(game.time.elapsed * 10) % 2 : 0);
    var y = FLOOR_Y - 110 - (reachT > 0 ? 0 : beatPulse * 6);
    var big = hitStop > 0;
    game.draw.sprite(CLEANER[fr], big ? { y: C.white, f: C.white, k: C.white, b: C.white, d: C.white } : CPAL, cleanerX, y, big ? 13 : 11, { anchor: 'center', flipX: cleanerTX < cleanerX - 8 });
    // 長い摘み取りばさみ: つまんだ瞬間だけ箱まで伸びる
    if (reachT > 0 && reachCell >= 0) {
      var p = popXY(reachCell);
      game.draw.line(cleanerX + 40, y - 40, p.x, p.y + 20, '#c8ccd0', 8);
      game.draw.line(cleanerX + 40, y - 40, p.x, p.y + 20, C.white, 3);
    }
    // 摘んだ芽のかご(ボクセルの箱)
    cube(W - 210, FLOOR_Y - 120, 110, 26, '#c89a5a', '#a87a40', '#80592a');
    label('' + plucked, W - 155, FLOOR_Y - 64, 46, C.white);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, '#151a24', 0.92);
    label('SCORE ' + score, 44, 64, 40, C.white, 'left');
    label(plucked + ' / ' + targets.length, W / 2, 64, 40, C.top);
    for (var i = 0; i < LIVES; i++) {
      var used = i >= lives;
      game.draw.sprite(LEAF, { L: used ? C.leaf : '#3a4452', l: used ? C.leafL : '#4a5462' }, W - 60 - i * 62, 64, 8, { anchor: 'center' });
    }
    // テンポ灯(4段)と現在のテンポ
    var st = Math.max(0, curStage());
    var nextUp = lastBeat >= 0 && lastBeat + 1 < beats.length && beats[lastBeat + 1].stage > beats[lastBeat].stage && beats[lastBeat + 1].stage > 0;
    var nst = demoMode ? DEMO_BPM.length : STAGE_BPM.length;
    for (var s = 0; s < nst; s++) {
      var lit = s <= st && clock >= 0;
      var blink = nextUp && s === st + 1 && Math.floor(game.time.elapsed * 12) % 2 === 0;
      cube(44 + s * 70, 150, 46, 12, lit || blink ? C.gold : '#4a5262', lit || blink ? '#d8a820' : '#3a4250', lit || blink ? '#a07c10' : '#2a303c');
    }
    label('' + topBpm, 44 + nst * 70 + 10, 170, 40, C.gold, 'left');
    if (combo >= 3) label('COMBO ' + combo, W - 44, 170, 34, comboBreakT > 0 ? C.red : C.white, 'right');
    // 拍の灯(小節4拍)
    for (var b = 0; b < 4; b++) {
      var cur = lastBeat >= 0 && lastBeat % 4 === b && clock >= 0;
      game.draw.rect(W / 2 - 110 + b * 60, 150, 40, 40, cur ? (b === 0 ? C.red : C.top) : '#3a4250');
    }
  }

  function drawScene() {
    drawStation();
    drawWall();
    drawCleaner();
  }

  function drawResult(showTap) {
    var y0 = H * 0.26, y1 = H * 0.62;
    cube(70, y0, W - 180, 40, '#3d4552', '#151a24', '#0c1018');
    game.draw.rect(70, y0, W - 180, y1 - y0, '#151a24', 0.95);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2 - 20, H * 0.31, 92, won ? C.top : C.red);
    label('SCORE ' + score, W / 2 - 20, H * 0.375, 56, C.white);
    label(plucked + ' / ' + targets.length, W / 2 - 20, H * 0.42, 48, C.top);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2 - 20, H * 0.46, 32, '#c8d0d8');
    label('COMBO ' + maxCombo + '   ' + topBpm, W / 2 - 20, H * 0.5, 38, C.gold);
    if (won && score > prevBest) label('NEW RECORD', W / 2 - 20, H * 0.545, 54, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2 - 20, H * 0.545, 40, '#c8d0d8');
    if (!won) label('あと' + Math.max(1, targets.length - plucked - nM) + '本!', W / 2 - 20, H * 0.59, 44, C.gold);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.65, 34, C.white);
  }

  // ---- ATTRACT: 実ロジックで芽を追う。テンポが一段上がり、7回目だけ遅れてつまみ損ねる(葉が茂る) ----
  var demo = { t: 0, x: W / 2, y: H * 0.5, press: 0, gi: 0 };
  function demoCycle() { return 2 * (60 / DEMO_BPM[0]) + DEMO_STAGE_BEATS * (60 / DEMO_BPM[0] + 60 / DEMO_BPM[1]) + 0.9; }
  function demoReset() {
    initRun(true);
    clock = -0.3; demo.gi = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % demoCycle();
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    if (demo.press > 0) demo.press -= dt;
    var tx = demo.x, ty = demo.y;
    if (demo.gi < targets.length) {
      var tg = targets[demo.gi];
      var late = demo.gi === DEMO_MISS_AT;
      var q = popXY(tg.cell);
      if (tg.t - clock < tg.spb * 0.85) { tx = q.x; ty = q.y + 70; }
      if (late) { if (clock >= tg.t + 0.2) { pinch(q.x, q.y + 70); demo.press = 0.12; demo.gi++; } }
      else if (tg.res) demo.gi++;
      else if (clock >= tg.t) { pinch(q.x, q.y + 70); demo.press = 0.12; demo.gi++; }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 16);
    demo.y += (ty - demo.y) * Math.min(1, dt * 16);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!targets) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 225, '#151a24', 0.94);
      label(GAME_TITLE, W / 2, 86, 86 + Math.sin(t * 3) * 3, C.top);
      label('HI-SCORE ' + game.best, W / 2, 178, 36, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.9, 52, C.gold);
      else label('TAP TO START', W / 2, H * 0.9, 46, C.white);
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
      outroT -= dt;
      stepRun(dt);
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.46, W, 150, '#151a24', 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.gold);
    }
    // 開始時お手本: 最初の芽が出る拍の前に、行き先の箱へ薄い手を出す
    if (!over && clock > targets[0].t - targets[0].spb && clock < targets[0].t + 0.15) {
      var q0 = popXY(targets[0].cell);
      game.draw.hand(q0.x, q0.y + 70, { press: clock >= targets[0].t - 0.05, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
