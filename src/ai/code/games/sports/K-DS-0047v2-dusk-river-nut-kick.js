// K-DS-0047v2-dusk-river-nut-kick.js
// 夕暮れ河原の木の実返し — 枝から落ちる木の実が地面に着く拍の頭で指を弾き、弾いた向きと勢いで川向こうの友だちのかごへ蹴り返す。テンポは段ごとに速まる
// 操作: 画面を押して素早く払い、指を離した瞬間に少女が木の実を蹴る。払った向きがそのまま飛ぶ向き(川向こうの着く位置)、払いの長さと速さが勢い(足りないと川に落ちる)。払っている間は狙いの点線と勢いのゲージが出る。木の実は1拍かけて落ち、地面の輪が縮んで閉じる拍の頭に着く。そこで離すとPERFECT/GOOD、早すぎて空振り・遅れて転がる・川に落とす・かごを外すはMISS。友だちは小節の4拍目に次の位置へ走る(1拍前から足あとが光る)ので、4拍目の実はその先へ返す。赤いトゲのいがは0.6秒前から枝が揺れて赤い輪が出る。蹴らずに見送るのが正解(蹴るとMISS)。押して離すだけでは何も起きない
// 終わり: 96→116→136BPM(2・2・3小節、約14.5秒、木の実17個・いが3個)を返し終えればCLEAR(判定+連続+最後の金の実は2倍)。MISS4回でGAME OVER。段が上がる2拍前から上のテンポ板が次の数字を点滅させ、チャイムで予告
// @mechanic: flick_launch
// @theme: dusk_riverbank_nut_kick_return
// 世界観: 夕暮れの河原で、木の下に立つ少女が落ちてくる木の実を拍の頭で蹴り上げ、川向こうでかごを抱えて走り回る友だちのかごへ返していく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・かごに入れた数・PERFECT/GOOD/MISS数・最大連続・かごまで足りなかった最小の差(cm)
// スタイル: NEO-RETRO
var STYLE = { bg: ['#1c1838', '#4a3a72'], main: ['#3e7a7a', '#f0d2a0', '#9a6a48'], accent: ['#ff6a3a', '#1c1838'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 先に決めた6色だけ(藍・紫・青緑・砂・樹皮 + 差し色の夕焼け橙)。大きいドット(12px前後)。空は色の帯
  var C = { ink: STYLE.bg[0], dusk: STYLE.bg[1], teal: STYLE.main[0], sand: STYLE.main[1], bark: STYLE.main[2], hot: STYLE.accent[0] };

  var GAME_TITLE = 'NUT RETURN';
  var STAGES = [{ bpm: 96, bars: 2 }, { bpm: 116, bars: 2 }, { bpm: 136, bars: 3 }];
  var DEMO_STAGES = [{ bpm: 96, bars: 2 }];
  var TIME_LIMIT = 15;
  var READY_T = 0.8;
  var PERFECT_W = 0.07, GOOD_W = 0.14, LOOK = 0.32;
  var TELE_T = 0.6;
  var MISS_MAX = 4;
  var MIN_LEN = 150, MIN_SPEED = 700;
  var BRANCH_Y = 1070, GROUND_Y = H * 0.72, FAR_Y = 560, DEPTH = GROUND_Y - FAR_Y;
  var BASKET_R = 110;
  var LANES = [300, 540, 780];
  var SPOTS = [260, 540, 820];

  // 小節ごとの落ちてくる物: [着く拍(0〜3), 種類 N=木の実 B=いが G=金の実]
  var PAT = [
    [[1, 'N'], [3, 'N']],
    [[0, 'N'], [2, 'N'], [3, 'N']],
    [[0, 'N'], [1, 'N'], [3, 'B']],
    [[0, 'N'], [2, 'N'], [3, 'N']],
    [[0, 'N'], [1, 'B'], [2, 'N']],
    [[0, 'N'], [1, 'N'], [3, 'N']],
    [[0, 'N'], [2, 'B'], [3, 'G']]
  ];
  var DEMO_PAT = [[[1, 'N'], [3, 'N']], [[1, 'N'], [3, 'B']]];

  // 伴奏(オリジナル・イ短調の夕暮れの歌)。1拍ずつ、その段のテンポで鳴らす
  var LEAD = [
    [['A4', 0.5], ['C5', 0.5]], [['E5', 1]], [['D5', 0.5], ['C5', 0.5]], [['A4', 1]],
    [['F4', 0.5], ['A4', 0.5]], [['C5', 1]], [['D5', 0.5], ['E5', 0.5]], [['C5', 1]],
    [['G4', 0.5], ['C5', 0.5]], [['E5', 0.5], ['G5', 0.5]], [['E5', 0.5], ['D5', 0.5]], [['C5', 1]],
    [['B4', 0.5], ['D5', 0.5]], [['G5', 1]], [['E5', 0.5], ['D5', 0.5]], [['B4', 1]],
    [['A5', 0.5], ['E5', 0.5]], [['C5', 0.5], ['E5', 0.5]], [['A5', 0.5], ['G5', 0.5]], [['E5', 1]],
    [['F5', 0.5], ['C5', 0.5]], [['A4', 0.5], ['C5', 0.5]], [['F5', 0.5], ['G5', 0.5]], [['A5', 1]],
    [['G#5', 0.5], ['E5', 0.5]], [['B4', 0.5], ['E5', 0.5]], [['A5', 1]], [['A4', 1]]
  ];
  var ROOT = ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'E2'];

  // ---- スプライト(大きいドット) ----
  var GIRL = [
    ['...hhhh...', '..hhhhhh..', '.hhsssshh.', '.hsesseshh', '..ssssss..', '...rrrr...', '..rrrrrr..', '.s.rrrr.s.',
     '...rrrr...', '..rrrrrr..', '...s..s...', '...s..s...', '..kk..kk..'],
    ['...hhhh...', '..hhhhhh..', '.hhsssshh.', '.hsesseshh', '..ssssss..', '...rrrr...', '..rrrrrr..', '.s.rrrr.s.',
     '...rrrr...', '..rrrrrr..', '...s..s...', '..s....s..', '.kk....kk.']
  ];
  var GIRL_KICK = ['...hhhh...', '..hhhhhh..', '.hhsssshh.', '.hsesseshh', '..ssssss..', 's..rrrr...', '.rrrrrr...',
    '...rrrr...', '...rrrrr..', '..rrrr.s..', '...s...sk.', '...s....k.', '..kk......'];
  var GIRL_OUCH = ['...hhhh...', '..hhhhhh..', '.hhsssshh.', '.hseesehh.', '..ssoss...', '.s.rrrr.s.', 's.rrrrrr.s',
    '...rrrr...', '..rrrrrr..', '...s..s...', '...s......', '..kk......', '..........'];
  var FRIEND = [
    ['..hhhh..', '.hhhhhh.', '.seesse.', '..ssss..', '.bbbbbb.', 'bbbbbbbb', 'b.cccc.b', '..cccc..', '..s..s..', '.kk..kk.'],
    ['..hhhh..', '.hhhhhh.', '.seesse.', '..ssss..', '.bbbbbb.', 'bbbbbbbb', 'b.cccc.b', '..cccc..', '.s....s.', 'kk....kk']
  ];
  var NUT = ['.cc.', 'cccc', 'nnnn', 'nnnn', '.nn.'];
  var BURR = ['r.r.r', '.rbr.', 'rbbbr', '.rbr.', 'r.r.r'];
  var PRINT = ['.s.', 'sss', '.s.'];
  var GPAL = { h: C.ink, s: C.sand, e: C.ink, r: C.hot, k: C.ink, o: C.ink };
  var FPAL = { h: C.ink, s: C.sand, e: C.ink, b: C.teal, c: C.bark, k: C.ink };
  var WPAL = { h: '#ffffff', s: '#ffffff', e: '#ffffff', r: '#ffffff', k: '#ffffff', o: '#ffffff', c: '#ffffff', n: '#ffffff', b: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, beats, nBeats, evs, spots, totalNuts, score, combo, maxCombo, nPerfect, nGood, nMiss, nIn, nDodge, nearCm, judge;
  var hitStop, over, won, outroT, lastBeat, lastCue, demoMode, prevBest, realT, resultT, beatPulse, milestoneDone;
  var girl, kickT, ouchT, fl, flights, stageIdx, endT, progress, missX, missY;

  // ---- 拍の表(段ごとにBPMが変わる) ----
  function buildBeats(stages) {
    beats = [];
    var t = 0, q = 0;
    for (var s = 0; s < stages.length; s++) {
      var spb = 60 / stages[s].bpm;
      for (var i = 0; i < stages[s].bars * 4; i++) { beats.push({ t: t, len: spb, stage: s, bpm: stages[s].bpm }); t += spb; q++; }
    }
    nBeats = beats.length;
    beats.push({ t: t, len: beats[nBeats - 1].len, stage: stages.length - 1, bpm: stages[stages.length - 1].bpm });
  }
  function beatIndexAt(t) {
    if (t < 0) return -1;
    for (var i = nBeats - 1; i >= 0; i--) if (t >= beats[i].t) return i;
    return -1;
  }
  function spbAt(t) { var q = beatIndexAt(t); return q < 0 ? beats[0].len : beats[Math.min(q, nBeats)].len; }

  function buildEvents(demo) {
    var pat = demo ? DEMO_PAT : PAT;
    evs = []; spots = [];
    var lastLane = 1, lastSpot = 1;
    for (var b = 0; b < pat.length; b++) {
      var sp = demo ? (b === 0 ? 1 : 0) : (b === 0 ? 1 : (lastSpot + 1 + Math.floor(game.random(0, 2))) % 3);
      spots.push(sp); lastSpot = sp;
      for (var i = 0; i < pat[b].length; i++) {
        var q = b * 4 + pat[b][i][0];
        var lane = demo ? (i === 0 ? 0 : 2) : (lastLane + 1 + Math.floor(game.random(0, 2))) % 3;
        lastLane = lane;
        var prevLen = q > 0 ? beats[q - 1].len : beats[0].len;
        evs.push({ q: q, T: beats[q].t, fall: prevLen, kind: pat[b][i][1], x: LANES[lane], res: 0, teled: false, landed: false, rollT: 0 });
      }
    }
    spots.push(spots[spots.length - 1]);
    totalNuts = 0;
    for (var k = 0; k < evs.length; k++) if (evs[k].kind !== 'B') totalNuts++;
  }

  function initRun(demo) {
    demoMode = !!demo;
    buildBeats(demo ? DEMO_STAGES : STAGES);
    buildEvents(demo);
    clock = demo ? -0.3 : -READY_T;
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nIn = 0; nDodge = 0; nearCm = 999; judge = null;
    hitStop = 0; over = false; won = false; outroT = 0; lastBeat = -1; lastCue = -1; prevBest = game.best; realT = 0; resultT = 0;
    beatPulse = 0; milestoneDone = false;
    girl = { x: 540 }; kickT = 0; ouchT = 0; fl = null; flights = []; stageIdx = 0; progress = 0; missX = -999; missY = -999;
    endT = beats[nBeats].t + 0.5;
  }

  // かごの位置: その拍に蹴った実が着く頃(次の拍)の小節の位置。友だちは各小節の4拍目に走り出す
  function spotForBeat(q) { return SPOTS[spots[Math.min(spots.length - 1, Math.floor((q + 1) / 4))]]; }
  function friendX() {
    var q = beatIndexAt(Math.max(0, clock));
    if (q < 0) return SPOTS[spots[0]];
    var bar = Math.floor(q / 4), k = q % 4;
    var a = SPOTS[spots[bar]], b = SPOTS[spots[Math.min(spots.length - 1, bar + 1)]];
    if (k < 3) return a;
    var p = Math.min(1, (clock - beats[q].t) / 0.25);
    return a + (b - a) * p;
  }

  // ---- 拍クロック ----
  function cueBeats() {
    var q = beatIndexAt(clock + 0.06);
    if (q > lastCue && q >= 0 && q < nBeats) { lastCue = q; if (!demoMode && !over) playBeat(q); }
  }
  function playBeat(q) {
    var bar = Math.floor(q / 4) % 7, k = q % 4;
    game.audio.melody(LEAD[q % LEAD.length], {
      tempo: beats[q].bpm, wave: 'square', volume: 0.03,
      bass: [[k % 2 === 0 ? ROOT[bar] : 'R', 0.5], [k % 2 === 1 ? ROOT[bar] : 'R', 0.5]], bassWave: 'triangle', bassVolume: 0.1
    });
  }
  function onBeat(q) {
    if (q < 0 || q >= nBeats) return;
    beatPulse = 1;
    if (beats[q].stage !== stageIdx) {
      stageIdx = beats[q].stage;
      if (!demoMode) {
        game.fx.popup(beats[q].bpm + '', W / 2, 360, { color: C.hot, size: 96 });
        game.audio.play('se_powerup', 0.4);
      }
    }
    if (demoMode || over) return;
    game.audio.tone(q % 2 === 0 ? 75 : 210, q % 2 === 0 ? 0.1 : 0.04, { wave: q % 2 === 0 ? 'sine' : 'square', volume: q % 2 === 0 ? 0.11 : 0.02, slide: q % 2 === 0 ? -30 : 0 });
    // 段の上がる2拍前からチャイムで予告
    var nx = beats[q + 2];
    if (q + 2 < nBeats && nx.stage !== beats[q].stage) game.audio.tone('E6', 0.12, { wave: 'triangle', volume: 0.05 });
    var nx1 = beats[q + 1];
    if (q + 1 < nBeats && nx1.stage !== beats[q].stage) game.audio.tone('A6', 0.16, { wave: 'triangle', volume: 0.05 });
  }
  function announcing() {
    var q = beatIndexAt(clock);
    if (q < 0) return null;
    for (var k = 1; k <= 2; k++) if (q + k < nBeats && beats[q + k].stage !== beats[q].stage) return beats[q + k].bpm;
    return null;
  }

  function stepRun(dt) {
    clock += dt;
    cueBeats();
    var bi = beatIndexAt(clock);
    while (lastBeat < bi) { lastBeat++; onBeat(lastBeat); }
    stepFlights(dt);
    if (over) return;
    var next = null;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (!e.teled && e.kind === 'B' && clock >= e.T - e.fall - TELE_T) {
        e.teled = true;
        if (!demoMode) game.audio.tone(140, 0.25, { wave: 'sawtooth', volume: 0.04, slide: 60 });
      }
      if (!e.landed && clock >= e.T) {
        e.landed = true;
        if (!demoMode) game.audio.tone(e.kind === 'B' ? 160 : 300, 0.05, { wave: 'triangle', volume: 0.05 });
      }
      if (!e.res && clock > e.T + GOOD_W) {
        if (e.kind === 'B') { e.res = 5; nDodge++; score += 50; }
        else { e.res = 4; e.rollT = 0.6; miss('late', e.x, GROUND_Y - 30); return; }
      }
      if (!e.res && e.kind !== 'B' && !next) next = e;
    }
    if (next) girl.x += (next.x - girl.x) * Math.min(1, dt * 8);
    if (!demoMode && clock >= endT) finishRun(true);
  }

  // ---- 蹴った実の飛行 ----
  function launch(e, x1, y1, kind) {
    var dur = spbAt(clock);
    flights.push({ x0: e.x, y0: GROUND_Y - 20, x1: x1, y1: y1, t: 0, dur: dur, kind: kind, gold: e.kind === 'G' });
  }
  function stepFlights(dt) {
    for (var i = flights.length - 1; i >= 0; i--) {
      var f = flights[i];
      f.t += dt;
      if (f.t >= f.dur && !f.done) {
        f.done = true;
        if (f.kind === 'in') {
          if (!demoMode) game.audio.tone(f.gold ? 'E6' : 'C6', 0.1, { wave: 'square', volume: 0.04 });
          game.fx.burst(f.x1, f.y1, { color: f.gold ? C.hot : C.sand, count: 8, speed: 180 });
        } else if (f.kind === 'splash') {
          game.fx.burst(f.x1, f.y1, { color: C.sand, count: 10, speed: 220 });
        }
      }
      if (f.t > f.dur + 0.5) flights.splice(i, 1);
    }
  }

  // ---- 判定 ----
  // 払い(本番の指もATTRACTのゴーストも同じ関数)
  function kick(x0, y0, x1, y1, dur) {
    var vx = x1 - x0, vy = y1 - y0;
    var len = Math.sqrt(vx * vx + vy * vy);
    if (len < 70 || vy > -30) return 'tap';
    var speed = len / Math.max(0.03, dur);
    var power = len >= MIN_LEN && speed >= MIN_SPEED;
    kickT = 0.25;
    var best = null, bd = 1e9;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res) continue;
      var d = clock - e.T;
      if (d >= -LOOK && d <= GOOD_W && Math.abs(d) < bd) { bd = Math.abs(d); best = e; }
    }
    if (!best) {
      combo = 0;
      game.feedback.bad(girl.x, GROUND_Y - 120, { text: null, color: C.dusk, shake: 2, volume: demoMode ? 0.02 : 0.2 });
      return 'whiff';
    }
    var d2 = clock - best.T;
    if (best.kind === 'B') {
      best.res = 3; ouchT = 0.8;
      miss('burr', best.x, GROUND_Y - 40);
      return 'burr';
    }
    if (d2 < -GOOD_W) {
      best.res = 3;
      miss('early', best.x, GROUND_Y - 60);
      return 'early';
    }
    var landX = best.x + (vx / -vy) * DEPTH;
    var bx = spotForBeat(best.q);
    if (!power) {
      best.res = 3;
      launch(best, best.x + (landX - best.x) * 0.4, 820, 'splash');
      miss('weak', best.x, GROUND_Y - 60);
      return 'weak';
    }
    var off = Math.abs(landX - bx);
    if (off > BASKET_R) {
      best.res = 3;
      launch(best, Math.max(40, Math.min(W - 40, landX)), FAR_Y + 30, 'grass');
      nearCm = Math.min(nearCm, Math.max(1, Math.round((off - BASKET_R) * 0.4)));
      miss('aim', best.x, GROUND_Y - 60);
      return 'aim';
    }
    var grade = Math.abs(d2) <= PERFECT_W ? 1 : 2;
    best.res = grade;
    launch(best, bx, FAR_Y - 10, 'in');
    nIn++; combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    var pts = (grade === 1 ? 300 : 150) + Math.min(10, combo) * 20;
    if (best.kind === 'G') pts *= 2;
    score += pts;
    judge = { kind: grade === 1 ? 'perfect' : 'good', t: 0.8 };
    game.feedback.good(best.x, GROUND_Y - 170, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.hot : C.sand, size: grade === 1 ? 60 : 48,
      count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.14
    });
    if (!demoMode) {
      if (combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W - 170, 330, { color: C.hot, size: 60 });
      if (!milestoneDone && nIn >= 8) {
        milestoneDone = true;
        game.fx.popup('NICE', W / 2, 460, { color: C.sand, size: 90 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function miss(kind, x, y) {
    combo = 0; nMiss++;
    hitStop = 0.4; missX = x; missY = y;
    judge = { kind: kind, t: 0.9 };
    game.feedback.bad(x, y - 40, { text: 'MISS', color: C.hot, flashColor: C.sand, shake: demoMode ? 3 : 10, volume: demoMode ? 0.03 : 0.5 });
    if (!demoMode && nMiss >= MISS_MAX) { game.audio.play('se_break', 0.3); finishRun(false); }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - nMiss) * 200 + nDodge * 50;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 420 + (i % 2) * 120, { color: i % 2 ? C.hot : C.sand, count: 16, speed: 360 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = {
      score: score, returned: nIn, total: totalNuts, perfect: nPerfect, good: nGood, miss: nMiss,
      dodged: nDodge, maxCombo: maxCombo, nearestCm: nearCm < 999 ? nearCm : null
    };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || y < 230) return;
    fl = { x0: x, y0: y, x: x, y: y, t0: game.time.elapsed, ready: false };
    game.audio.tone(500, 0.03, { wave: 'triangle', volume: 0.03 });
  });

  game.onMove(function(x, y) {
    if (!fl || state !== S.PLAYING) return;
    fl.x = x; fl.y = y;
    var len = Math.sqrt((x - fl.x0) * (x - fl.x0) + (y - fl.y0) * (y - fl.y0));
    if (!fl.ready && len >= MIN_LEN && y < fl.y0) {
      fl.ready = true;
      game.audio.tone(880, 0.04, { wave: 'square', volume: 0.03 });
    }
  });

  game.onRelease(function(x, y) {
    if (!fl) return;
    var f = fl; fl = null;
    if (state !== S.PLAYING || over || hitStop > 0 || clock < -0.1) return;
    var res = kick(f.x0, f.y0, x, y, game.time.elapsed - f.t0);
    if (res === 'tap') game.audio.tone(260, 0.04, { wave: 'triangle', volume: 0.03 });
    else if (res === 'perfect' || res === 'good') game.audio.tone(140, 0.06, { wave: 'square', volume: 0.06, slide: 220 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function ring(x, y, rx, ry, col, w) {
    var n = 28;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * rx, y + Math.sin(a0) * ry, x + Math.cos(a1) * rx, y + Math.sin(a1) * ry, col, w);
    }
  }

  // 空は色の帯(段が上がるほど夕闇が深まり、日が沈む)
  function drawWorld() {
    var t = game.time.elapsed;
    var st = Math.min(2, stageIdx);
    var bands = [
      [[0, C.dusk], [0.17, C.dusk], [0.17, C.hot], [0.205, C.hot], [0.205, C.sand], [0.25, C.sand], [0.25, C.teal], [1, C.teal]],
      [[0, C.ink], [0.17, C.ink], [0.17, C.dusk], [0.205, C.dusk], [0.205, C.hot], [0.25, C.hot], [0.25, C.teal], [1, C.teal]],
      [[0, C.ink], [0.2, C.ink], [0.2, C.dusk], [0.25, C.dusk], [0.25, C.teal], [1, C.teal]]
    ][st];
    game.draw.gradient(0, H, bands);
    // 沈む夕日(1色だけの差し色)
    var sunY = 360 + st * 55;
    game.draw.circle(820, sunY, 96, C.hot);
    for (var s = 0; s < 4; s++) game.draw.rect(700, sunY + 6 + s * 24, 240, 8, st === 2 ? C.dusk : C.ink);
    // 星(最後の段)
    if (st === 2) for (var k = 0; k < 10; k++) game.draw.rect(60 + k * 101, 250 + (k * 37) % 120, 8, 8, C.sand, 0.4 + 0.4 * Math.sin(t * 3 + k));
    // 川向こうの土手
    game.draw.rect(0, 470, W, 160, C.ink);
    for (var g = 0; g < 18; g++) game.draw.rect(g * 64, 458 + (g % 3) * 4, 36, 16, C.ink);
    game.draw.rect(0, 610, W, 14, C.dusk);
    // 川(青緑の流れと砂色の筋)
    game.draw.rect(0, 624, W, 400, C.teal);
    for (var r = 0; r < 12; r++) {
      var yy = 650 + r * 32;
      var off = ((t * (60 + r * 6) + r * 97) % 240);
      for (var x = -240 + off; x < W; x += 240) game.draw.rect(x, yy, 72, 6, C.sand, 0.35);
    }
    // こちら側の河原
    game.draw.rect(0, 1010, W, H - 1010, C.dusk);
    game.draw.rect(0, 1010, W, 12, C.bark);
    for (var p = 0; p < 22; p++) game.draw.rect((p * 151) % W, 1180 + (p * 67) % 300, 24, 12, C.ink, 0.6);
    game.draw.rect(0, GROUND_Y + 40, W, 12, C.ink, 0.5);
  }

  function drawTree() {
    var sway = Math.sin(game.time.elapsed * 1.5) * 4 + beatPulse * 6;
    game.draw.rect(20, 900, 90, 560, C.bark);
    game.draw.rect(20, 900, 24, 560, C.ink, 0.4);
    // 張り出した枝と葉の塊(拍で揺れる)
    game.draw.rect(60, 1000 + sway * 0.3, 900, 24, C.bark);
    for (var l = 0; l < 9; l++) {
      var lx = 40 + l * 120, ly = 950 + (l % 3) * 22 + sway * (1 + (l % 2) * 0.6);
      game.draw.rect(lx, ly + 12, 132, 48, C.ink);
      game.draw.rect(lx + 24, ly - 12, 84, 36, C.ink);
      game.draw.rect(lx + 36, ly, 48, 24, C.teal, 0.6);
      game.draw.rect(lx + 12, ly + 36, 36, 12, C.teal, 0.4);
    }
  }

  function nutPos(e) {
    var fs = e.T - e.fall;
    if (clock < fs) {
      var shake = 0;
      if (e.kind === 'B' && clock >= fs - TELE_T) shake = Math.sin(game.time.elapsed * 50) * 8;
      return { x: e.x + shake, y: BRANCH_Y + Math.sin(game.time.elapsed * 2 + e.x) * 4, hang: true };
    }
    if (clock < e.T) {
      var p = (clock - fs) / e.fall;
      return { x: e.x, y: BRANCH_Y + (GROUND_Y - 20 - BRANCH_Y) * p * p, hang: false };
    }
    var a = clock - e.T;
    var bounce = Math.max(0, Math.sin(Math.min(1, a / 0.22) * Math.PI)) * 34;
    var roll = e.res === 4 ? (clock - e.T - GOOD_W) * 500 : 0;
    return { x: e.x + Math.max(0, roll), y: GROUND_Y - 20 - bounce, hang: false };
  }

  function drawFalling() {
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.res && e.res !== 4 && e.res !== 5) continue;
      if (clock < e.T - e.fall - 1.3) continue;
      if (clock > e.T + 1.0) continue;
      var p = nutPos(e);
      // 落ちる先の輪(拍の頭で閉じる)
      if (!e.res && clock >= e.T - e.fall - (e.kind === 'B' ? TELE_T : 0) && clock <= e.T + GOOD_W) {
        var k = Math.max(0, Math.min(1, (e.T - clock) / (e.fall + (e.kind === 'B' ? TELE_T : 0))));
        var col = e.kind === 'B' ? C.hot : C.sand;
        ring(e.x, GROUND_Y + 10, 60 + k * 90, 18 + k * 26, col, 5);
        game.draw.rect(e.x - 50, GROUND_Y + 6, 100, 8, col, 0.6);
        if (e.kind === 'B') for (var s = 0; s < 6; s++) game.draw.rect(e.x - 70 + s * 26, GROUND_Y - 6, 10, 10, C.hot);
      }
      if (e.res === 4 && clock > e.T + GOOD_W + 0.6) continue;
      var flash = hitStop > 0 && Math.abs(missX - e.x) < 2 && (e.res === 3 || e.res === 4);
      if (e.kind === 'B') game.draw.sprite(BURR, flash ? WPAL : { r: C.hot, b: C.bark }, p.x, p.y, flash ? 15 : 12, { anchor: 'center' });
      else game.draw.sprite(NUT, flash ? WPAL : { c: C.bark, n: e.kind === 'G' ? C.hot : C.sand }, p.x, p.y, flash ? 15 : 12, { anchor: 'center' });
    }
  }

  function drawFlights() {
    for (var i = 0; i < flights.length; i++) {
      var f = flights[i];
      var p = Math.min(1, f.t / f.dur);
      var x = f.x0 + (f.x1 - f.x0) * p;
      var y = f.y0 + (f.y1 - f.y0) * p - Math.sin(p * Math.PI) * (f.kind === 'splash' ? 140 : 280);
      var px = 12 - p * (f.kind === 'splash' ? 3 : 6);
      if (f.done) {
        if (f.kind === 'splash') continue;
        y = f.y1;
      }
      game.draw.sprite(NUT, { c: C.bark, n: f.gold ? C.hot : C.sand }, x, y, Math.max(5, px), { anchor: 'center' });
    }
  }

  function drawFriend() {
    var fx = friendX();
    var q = beatIndexAt(Math.max(0, clock));
    var running = q >= 0 && q % 4 === 3 && clock - beats[q].t < 0.25;
    // 次の位置の足あと(1拍前から光る)
    if (q >= 0 && q % 4 >= 2) {
      var nb = Math.floor(q / 4) + 1;
      if (nb < spots.length && spots[nb] !== spots[nb - 1]) {
        var nx = SPOTS[spots[nb]];
        var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
        game.draw.sprite(PRINT, { s: C.sand }, nx - 22, 588, 9, { anchor: 'center', alpha: blink ? 0.9 : 0.4 });
        game.draw.sprite(PRINT, { s: C.sand }, nx + 22, 600, 9, { anchor: 'center', alpha: blink ? 0.9 : 0.4 });
      }
    }
    var fr = running ? Math.floor(game.time.elapsed * 12) % 2 : 0;
    game.draw.rect(fx - 70, 600, 140, 10, C.dusk);
    // かご(口を上に抱える)
    game.draw.rect(fx - 64, FAR_Y - 4, 128, 46, C.bark);
    game.draw.rect(fx - 64, FAR_Y - 4, 128, 10, C.sand);
    for (var b = 0; b < 4; b++) game.draw.rect(fx - 52 + b * 32, FAR_Y + 12, 12, 26, C.ink, 0.4);
    game.draw.sprite(FRIEND[fr], FPAL, fx, FAR_Y - 70 - beatPulse * 6, 9, { anchor: 'center' });
  }

  function drawGirl() {
    var t = game.time.elapsed;
    var x = girl.x - 70, y = GROUND_Y - 30;
    game.draw.rect(x - 56, GROUND_Y + 50, 112, 12, C.ink, 0.5);
    if (ouchT > 0) {
      var hop = Math.abs(Math.sin(ouchT * 12)) * 30;
      game.draw.sprite(GIRL_OUCH, hitStop > 0 ? WPAL : GPAL, x, y - hop, 12, { anchor: 'center' });
      return;
    }
    if (kickT > 0) { game.draw.sprite(GIRL_KICK, GPAL, x, y, 12, { anchor: 'center' }); return; }
    var fr = Math.floor(t * 3) % 2;
    game.draw.sprite(GIRL[fr], GPAL, x, y - beatPulse * 8, 12, { anchor: 'center' });
  }

  // 払い中の狙いの点線と勢いのゲージ
  function drawAim(f, isDemo) {
    if (!f) return;
    var vx = f.x - f.x0, vy = f.y - f.y0;
    var len = Math.sqrt(vx * vx + vy * vy);
    var e = null;
    for (var i = 0; i < evs.length; i++) if (!evs[i].res && evs[i].kind !== 'B') { e = evs[i]; break; }
    var sx = e ? e.x : girl.x;
    if (vy < -20) {
      var lx = sx + (vx / -vy) * DEPTH;
      for (var k = 1; k < 12; k += 2) {
        var a = k / 12, b = (k + 0.7) / 12;
        game.draw.line(sx + (lx - sx) * a, GROUND_Y - DEPTH * a, sx + (lx - sx) * b, GROUND_Y - DEPTH * b, C.sand, 5);
      }
    }
    var pw = Math.min(1, len / MIN_LEN);
    game.draw.rect(W - 90, 1250, 40, 300, C.ink, 0.7);
    game.draw.rect(W - 90, 1250 + 300 * (1 - pw), 40, 300 * pw, pw >= 1 ? C.hot : C.sand);
    game.draw.line(f.x0, f.y0, f.x, f.y, C.sand, 6);
    if (!isDemo) game.draw.circle(f.x, f.y, 26, C.hot, 0.6);
  }

  function drawThumb() {
    game.draw.rect(0, H * 0.81, W, 6, C.ink, 0.6);
    for (var i = 0; i < 3; i++) game.draw.rect(480 + i * 40, H * 0.85 - i * 40, 40, 40, C.ink, 0.25);
  }

  function drawScanlines() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, C.ink, 0.08);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.88);
    game.draw.rect(0, 226, W, 6, C.hot);
    label('SCORE ' + score, 50, 84, 44, C.sand, 'left');
    if (combo >= 2) label('x' + combo, W - 50, 84, 44, C.hot, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - nMiss;
      game.draw.sprite(NUT, { c: on ? C.bark : C.dusk, n: on ? C.sand : C.dusk }, 60 + i * 56, 160, 8, { anchor: 'center' });
    }
    label(nIn + ' / ' + totalNuts, W - 50, 168, 36, C.sand, 'right');
    // テンポ板(次の段は点滅で予告)
    var ann = announcing();
    var q = Math.max(0, beatIndexAt(Math.max(0, clock)));
    var bpm = ann && Math.floor(game.time.elapsed * 6) % 2 === 0 ? ann : beats[Math.min(q, nBeats)].bpm;
    game.draw.rect(W / 2 - 110, 120, 220, 76, ann ? C.hot : C.dusk);
    label(bpm + '', W / 2, 176, 52, ann ? C.ink : C.sand);
    for (var k = 0; k < 4; k++) game.draw.rect(W / 2 - 100 + k * 54, 204, 38, 10, (q % 4 === k && clock >= 0) ? C.hot : C.dusk);
    progress = Math.max(0, Math.min(1, clock / endT));
    game.draw.rect(0, 220, W * progress, 6, C.sand);
  }

  function drawScene() {
    drawWorld();
    drawFriend();
    drawFlights();
    drawTree();
    drawFalling();
    drawGirl();
    drawThumb();
    drawScanlines();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.39;
    game.draw.rect(40, y0, W - 80, hh, C.ink, 0.92);
    game.draw.rect(56, y0 + 16, W - 112, 8, C.hot);
    game.draw.rect(56, y0 + hh - 24, W - 112, 8, C.hot);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.hot : C.sand);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.sand);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, C.sand);
    label(nIn + ' / ' + totalNuts + '個', W / 2, H * 0.49, 46, C.sand);
    if (maxCombo > 1) label('COMBO ' + maxCombo, W / 2, H * 0.53, 38, C.teal);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.575, 56, C.hot);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.575, 42, C.sand);
    if (!won) {
      if (nearCm < 999) label('あと' + nearCm + 'cm!', W / 2, H * 0.62, 50, C.hot);
      else label('あと' + Math.max(1, totalNuts - nIn) + '個!', W / 2, H * 0.62, 50, C.hot);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.68, 34, C.sand);
  }

  // ---- ATTRACT: 実ロジックで2小節。奇数周は木の実を返していがは見送る、偶数周はいがを蹴ってしまう ----
  var demo = { t: 0, cyc: 0, plan: [], k: 0, f: null, hx: 540, hy: 1700, press: false };
  var DEMO_CYC = 0;
  function stepDemo(dt) {
    if (!DEMO_CYC) DEMO_CYC = 2 * 4 * (60 / DEMO_STAGES[0].bpm) + 1.2;
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++;
      var fail = demo.cyc % 2 === 0;
      demo.plan = [];
      for (var i = 0; i < evs.length; i++) if (evs[i].kind !== 'B' || fail) demo.plan.push(evs[i]);
      demo.k = 0; demo.f = null; demo.press = false;
    }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var e = demo.plan[demo.k];
    if (e && !demo.f && clock >= e.T - 0.13 && hitStop <= 0 && !e.res) {
      var bx = spotForBeat(e.q);
      var dx = bx - e.x, dy = -DEPTH;
      var n = Math.sqrt(dx * dx + dy * dy);
      demo.f = { x0: e.x, y0: 1720, x: e.x, y: 1720, ux: dx / n * 300, uy: dy / n * 300, t0: game.time.elapsed, s: clock };
    }
    if (demo.f) {
      var p = Math.min(1, (clock - demo.f.s) / 0.13);
      demo.f.x = demo.f.x0 + demo.f.ux * p; demo.f.y = demo.f.y0 + demo.f.uy * p;
      demo.hx = demo.f.x; demo.hy = demo.f.y; demo.press = true;
      if (e && clock >= e.T) {
        kick(demo.f.x0, demo.f.y0, demo.f.x, demo.f.y, 0.13);
        demo.f = null; demo.k++; demo.press = false;
      }
    } else {
      if (e && e.res) demo.k++;
      demo.hx += (girl.x + 40 - demo.hx) * Math.min(1, dt * 6);
      demo.hy += (1720 - demo.hy) * Math.min(1, dt * 6);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (judge) { judge.t -= dt; if (judge.t <= 0) judge = null; }
    if (kickT > 0) kickT -= dt;
    if (ouchT > 0 && hitStop <= 0) ouchT -= dt;

    if (state === S.ATTRACT) {
      if (!evs) initRun(true);
      stepDemo(dt);
      drawScene();
      drawAim(demo.f, true);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.88);
      label(GAME_TITLE, W / 2, 112, 92 + Math.sin(t * 2.5) * 3, C.hot);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.sand);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.96, 46, C.hot);
      else label('TAP TO START', W / 2, H * 0.96, 42, C.sand);
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
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 3) { hitStop = 0; finishRun(nMiss < MISS_MAX); }
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      stepRun(dt);
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }
    drawScene();
    drawAim(fl, false);
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.4, W, 170, C.ink, 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 115, 100, C.hot);
    }
    // 最初の1個だけ、払う手を薄いゴーストで示す
    if (!over && evs.length && !evs[0].res && clock > evs[0].T - evs[0].fall - 0.3) {
      var e0 = evs[0];
      var k = Math.max(0, Math.min(1, 1 - (e0.T - clock) / (e0.fall + 0.3)));
      var bx = spotForBeat(e0.q), n = Math.sqrt((bx - e0.x) * (bx - e0.x) + DEPTH * DEPTH);
      game.draw.hand(e0.x + (bx - e0.x) / n * 260 * k, 1720 - DEPTH / n * 260 * k, { press: true, scale: 13, alpha: 0.45 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
