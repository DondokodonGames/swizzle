// K-DS-0025v2-desert-tomb-trap-run.js
// 墓所通路のステップラン — 拍ごとに一歩ずつ古い墓所の通路を奥へ進み、振り下りる砂袋の拍は跳び、飛んでくる壺の拍は伏せてやり過ごす。テンポは段ごとに速まる
// 操作: 考古学者は拍の頭ごとに自動で一歩進む。画面の右半分(下に跳ぶ絵の板)=跳ぶ、左半分(伏せる絵の板)=伏せる。天井の落とし戸が開いて砂がこぼれた床の拍は、その拍の頭で跳んで足元を振り抜ける砂袋をかわす。奥の壁の穴が赤く光って転がり飛んでくる壺の拍は、その拍の頭で伏せる。拍の頭からのずれでPERFECT/GOOD。違う動き・遅れ・早すぎは当たってMISS。何もない拍の動きは空振り(連続が切れる)
// 終わり: 96→112→128→144BPMの4段(12+8+8+8拍・約19秒)を進み切って奥の玄室の扉に着けばCLEAR。3回当たればGAME OVER。段が上がる1小節前に歯車の板が次のBPMを点滅させ、壁の松明が燃え上がり、上昇チャイムで予告
// @mechanic: camera_run
// @theme: desert_tomb_passage_step_run
// 世界観: 砂漠の古い墓所の通路で、ヘッドランプと赤いバンダナの考古学者が拍ごとに一歩ずつ奥の玄室へ進み、仕掛けの砂袋は跳んで、転がり飛んでくる壺は伏せてかわす
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・進んだ歩数・PERFECT/GOOD/MISS数・最大連続・到達BPM
// スタイル: 90s PRE-RENDER
var STYLE = { bg: ['#120d0a', '#3a2a1c'], main: ['#8a7356', '#c8a46a', '#4a3a2a'], accent: ['#e8c070', '#d04a30'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗い金属質。描き込んだ壁(1枚絵の質感)+粒状ノイズ、キャラだけドットで動かす
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], stone: STYLE.main[0], sand: STYLE.main[1], dark: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], ink: '#0a0705', hi: '#f4dca0', teal: '#3a8a88'
  };

  var GAME_TITLE = 'TOMB STEP RUN';
  var STAGES = [{ bpm: 96, beats: 12 }, { bpm: 112, beats: 8 }, { bpm: 128, beats: 8 }, { bpm: 144, beats: 8 }];
  var DEMO_STAGES = [{ bpm: 96, beats: 6 }, { bpm: 128, beats: 6 }];
  var TIME_LIMIT = 19;                 // 12×0.625 + 8×0.536 + 8×0.469 + 8×0.417 ≒ 18.9秒
  var READY_T = 0.8;
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var TELE_T = 0.75;
  var LIVES = 3;
  var TILE = 170, PX = 300, FLOOR = 1180, CEIL = 430, STEP_T = 0.16;
  var ROPE_L = 700, POT_Y = 1000, POT_V = 760, ACT_T = 0.36, JUMP_H = 170;

  // 段ごとの砂袋/壺の拍(段の頭からの拍番号)。種類は毎回入れ替わる
  var TEMPLATES = [[5, 8, 10], [1, 3, 5, 7], [1, 2, 4, 6, 7], [1, 2, 4, 5, 6]];
  var DEMO_HAZ = [[2, 'bag'], [4, 'pot'], [8, 'pot'], [10, 'bag']];

  // 伴奏(オリジナル)。砂漠の墓所の旋法で1拍ずつ刻む
  var LEAD = ['D5', 'D#5', 'F#5', 'G5', 'A5', 'G5', 'F#5', 'D#5'];
  var BASS = ['D2', 'D2', 'A1', 'D2'];

  // ---- スプライト(右向き) ----
  var HERO_PAL = { h: '#3a2414', l: '#ffe680', b: '#c03828', s: '#c89870', e: '#1a100a', t: C.teal, p: '#6a6a3a', k: '#b8a070', o: '#2a1c12' };
  var HERO_WALK = [
    ['....hhhh....', '...hhhhhhl..', '..bbbbbbbll.', '..bhhssess..', '..b.hsssss..', '.....ssss...', '..ppttttt...', '.ppptttttts.', '.ppptttttt..', '..pptttttt..', '....kkkkk...', '....kkkkk...', '....ss..ss..', '...ss....ss.', '..oo.....oo.', '..ooo....ooo'],
    ['....hhhh....', '...hhhhhhl..', '..bbbbbbbll.', '..bhhssess..', '..b.hsssss..', '.....ssss...', '..ppttttt...', '.ppptttttt..', '.pppttttttts', '..pptttttt..', '....kkkkk...', '....kkkkk...', '....ssss....', '.....ss.....', '....oooo....', '....ooooo...']
  ];
  var HERO_JUMP = ['....hhhh....', '...hhhhhhl..', '..bbbbbbbll.', '..bhhssess..', '..b.hsssss..', '.....ssss.s.', '..ppttttts..', '.pppttttt...', '.ppptttttt..', '..pptttttt..', '....kkkkk...', '...kkkkkkk..', '..ss....ss..', '..oo....oo..', '............', '............'];
  var HERO_DUCK = ['............', '....hhhh....', '...hhhhhhl..', '..bbbbbbbll.', '..bhhssess..', '.pppttttts..', '.ppptttttttt', '..kkkkkkk...', '.ss.....ss..', 'oo......ooo.'];
  var HERO_HIT = ['............', '....hhhh....', '...hhhhhhl..', '..bbbbbbbll.', '..bhhssess..', '.....ssss...', '..ppttttts..', '.ppptttttt..', '..kkkkkkssoo', '.kkkkkk..ooo'];
  var BAG = ['...rr...', '..rggr..', '.gggggg.', 'gggdgggg', 'gggggggg', 'ggggdggg', 'gggggggg', '.gggggg.', '..gggg..'];
  var BAG_PAL = { r: '#5a4028', g: '#b89868', d: '#6a5034' };
  var TORCH = [['.y.', 'yoy', '.o.'], ['y..', 'oyy', '.o.']];
  var GEAR = ['.g.g.', 'ggggg', '.g.g.', 'ggggg', '.g.g.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var beats, endT, haz, clock, score, combo, maxCombo, nPerfect, nGood, nMiss, hits, steps, topBpm;
  var hitStop, over, won, timeUp, outroT, lastCue, lastBeat, demoMode, prevBest, resultT, realT;
  var act, actT, hitObj, beatPulse, flare, announce, milestoneDone, dust, grain;

  function buildBeats(stages) {
    beats = [];
    var t = 0;
    for (var s = 0; s < stages.length; s++) {
      var spb = 60 / stages[s].bpm;
      for (var i = 0; i < stages[s].beats; i++) { beats.push({ t: t, spb: spb, stage: s, bpm: stages[s].bpm, first: i === 0 }); t += spb; }
    }
    endT = t;
  }

  function buildHazards(demo) {
    haz = [];
    if (demo) {
      for (var d = 0; d < DEMO_HAZ.length; d++) haz.push({ b: DEMO_HAZ[d][0], type: DEMO_HAZ[d][1], t: beats[DEMO_HAZ[d][0]].t, res: 0, teled: false });
      return;
    }
    var base = 0, lastType = 'pot';
    for (var s = 0; s < STAGES.length; s++) {
      var tp = TEMPLATES[s];
      for (var i = 0; i < tp.length; i++) {
        var b = base + tp[i];
        if (b >= beats.length) continue;
        var type = game.random(0, 1) < 0.6 ? (lastType === 'bag' ? 'pot' : 'bag') : lastType;
        lastType = type;
        haz.push({ b: b, type: type, t: beats[b].t, res: 0, teled: false });
      }
      base += STAGES[s].beats;
    }
  }

  function initRun(demo) {
    demoMode = !!demo;
    buildBeats(demo ? DEMO_STAGES : STAGES);
    buildHazards(demo);
    clock = demo ? -0.5 : -READY_T;
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; hits = 0; steps = 0; topBpm = beats[0].bpm;
    hitStop = 0; over = false; won = false; timeUp = false; outroT = 0; lastCue = -1; lastBeat = -1;
    prevBest = game.best; resultT = 0; realT = 0;
    act = null; actT = 0; hitObj = null; beatPulse = 0; flare = 0; announce = null; milestoneDone = false; dust = []; grain = 0;
  }

  // ---- 拍クロック(テンポは段ごとに変わるが、時計は1本) ----
  function beatIndex(t) {
    var n = -1;
    for (var i = 0; i < beats.length; i++) { if (beats[i].t <= t) n = i; else break; }
    return n;
  }
  function playerPos(t) {
    var n = beatIndex(t) + 1;   // 次の拍
    var prev = n - 1;
    if (n < beats.length) {
      var rem = beats[n].t - t;
      if (rem < STEP_T) { var k = 1 - rem / STEP_T; return prev + k * k * (3 - 2 * k); }
    }
    return prev;
  }
  function cueBeats() {
    for (var n = lastCue + 1; n < beats.length; n++) {
      if (clock + 0.06 < beats[n].t) break;
      lastCue = n;
      if (!demoMode) playBeat(n);
    }
  }
  function playBeat(n) {
    var b = beats[n];
    var hasHaz = false;
    for (var i = 0; i < haz.length; i++) if (haz[i].b === n) hasHaz = true;
    game.audio.melody([[LEAD[n % 8], 0.5], [b.stage >= 2 ? LEAD[(n + 4) % 8] : 'R', 0.5]], {
      tempo: b.bpm, wave: 'square', volume: hasHaz ? 0.04 : 0.028,
      bass: [[BASS[n % 4], 0.6], ['R', 0.4]], bassWave: 'triangle', bassVolume: 0.12
    });
  }
  function onBeat(n) {
    beatPulse = 1;
    if (n >= 0) steps = Math.max(steps, n + 1);
    var b = beats[n];
    if (b.bpm > topBpm) topBpm = b.bpm;
    // 段の1小節前に予告(次のBPMの点滅・松明・上昇チャイム)
    var nx = n + 4;
    if (nx < beats.length && beats[nx].first && beats[nx].stage > 0) {
      announce = { bpm: beats[nx].bpm, until: beats[nx].t };
      flare = 1;
      if (!demoMode) {
        game.audio.tone('A4', 0.1, { wave: 'square', volume: 0.05 });
        game.audio.tone('D5', 0.1, { wave: 'square', volume: 0.05 });
        game.audio.tone('A5', 0.16, { wave: 'square', volume: 0.05 });
      }
    }
    if (b.first && b.stage > 0) {
      announce = null; flare = 1;
      if (!demoMode) {
        game.audio.play('se_powerup', 0.35);
        game.fx.popup(String(b.bpm), W - 170, 360, { color: C.gold, size: 64 });
      }
      if (!demoMode && !milestoneDone && b.stage >= 2) {
        milestoneDone = true;
        game.fx.popup('NICE', W / 2, 560, { color: C.hi, size: 88 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    if (!demoMode) game.audio.tone(n % 4 === 0 ? 1200 : 900, 0.02, { wave: 'square', volume: 0.02 });
  }

  function stepRun(dt) {
    clock += dt;
    if (actT > 0) { actT -= dt; if (actT <= 0) act = null; }
    flare = Math.max(0, flare - dt * 1.5);
    cueBeats();
    var bi = beatIndex(clock);
    while (lastBeat < bi) { lastBeat++; onBeat(lastBeat); }
    if (over) return;
    for (var i = 0; i < haz.length; i++) {
      var h = haz[i];
      if (!h.teled && clock >= h.t - TELE_T) {
        h.teled = true;
        if (!demoMode) {
          if (h.type === 'bag') game.audio.tone(900, 0.4, { wave: 'sawtooth', volume: 0.02, slide: -700 });
          else game.audio.tone(70, 0.45, { wave: 'triangle', volume: 0.12, slide: 30 });
        }
      }
      // 動けなかった/遅れた/早すぎた → 当たる
      if (!h.res && clock > h.t + GOOD_W) {
        h.res = 3;
        takeHit(h);
        if (over || hitStop > 0) return;
      }
    }
    if (!demoMode && clock >= endT + 0.15) finishRun(true);
  }

  // ---- 判定 ----
  function takeHit(h) {
    hits++; nMiss++; combo = 0;
    hitStop = 0.45; hitObj = h; act = 'hit'; actT = 0.9;
    var y = h.type === 'bag' ? FLOOR - 60 : POT_Y;
    game.feedback.bad(PX, y, { text: 'MISS', color: C.red, flashColor: C.hi, shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    for (var k = 0; k < 8; k++) dust.push({ x: PX + game.random(-60, 60), y: FLOOR - game.random(0, 40), t: 0, vx: game.random(-120, 120) });
    if (!demoMode && hits >= LIVES) { game.audio.play('se_break', 0.35); finishRun(false); }
  }

  // 動く(本番の指もATTRACTのゴーストも同じ関数)
  function doAction(kind) {
    act = kind; actT = ACT_T;
    var best = null, bd = 1e9;
    for (var i = 0; i < haz.length; i++) {
      var h = haz[i];
      if (h.res) continue;
      var d = Math.abs(clock - h.t);
      if (d <= GOOD_W && d < bd) { bd = d; best = h; }
    }
    if (!best) {
      // 何もない拍で動いた: 空振り(連続が切れる)
      combo = 0;
      game.feedback.bad(PX, FLOOR - 100, { text: null, color: C.stone, shake: 2, volume: demoMode ? 0.02 : 0.2 });
      return 'whiff';
    }
    var need = best.type === 'bag' ? 'jump' : 'duck';
    if (need !== kind) { best.res = 3; takeHit(best); return 'wrong'; }
    var grade = bd <= PERFECT_W ? 1 : 2;
    best.res = grade;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    score += (grade === 1 ? 200 : 110) + Math.min(10, combo) * 15 + Math.round(beats[best.b].bpm / 4);
    game.feedback.good(PX + 40, kind === 'jump' ? FLOOR - 330 : FLOOR - 220, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.gold : C.hi, size: grade === 1 ? 56 : 46,
      count: grade === 1 ? 14 : 8, flashColor: C.hi, volume: demoMode ? 0.03 : 0.15
    });
    if (!demoMode && combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W - 170, 470, { color: C.gold, size: 60 });
    return grade === 1 ? 'perfect' : 'good';
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (LIVES - hits) * 300 + steps * 10 + 500;
      for (var i = 0; i < 6; i++) game.fx.burst(560 + (i % 3) * 160, 700 + Math.floor(i / 3) * 200, { color: i % 2 ? C.gold : C.hi, count: 16, speed: 380 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, steps: steps, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo, topBpm: topBpm };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    var kind = x >= W / 2 ? 'jump' : 'duck';
    pads[kind] = 0.18;
    var res = doAction(kind);
    if (res === 'perfect' || res === 'good') game.audio.play('se_jump', kind === 'jump' ? 0.3 : 0.15);
    else if (res === 'whiff') game.audio.tone(kind === 'jump' ? 330 : 180, 0.07, { wave: 'square', volume: 0.04 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function glow(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2, col, a * 0.2);
    game.draw.circle(x, y, r * 1.4, col, a * 0.4);
    game.draw.circle(x, y, r, col, a);
  }
  var pads = { jump: 0, duck: 0 };

  // ---- 描画 ----
  function drawTomb(cam) {
    var t = game.time.elapsed;
    // 遠景(動かない描き込みの1枚絵): 奥へ続く暗い回廊と天窓の光
    game.draw.gradient(230, 1440, [[0, '#0c0806'], [0.4, C.bg1], [0.75, '#2a1e14'], [1, '#160f0a']]);
    glow(760, 560, 60, '#e8c070', 0.18 + flare * 0.2);
    for (var r = 0; r < 5; r++) game.draw.rect(700 + r * 20, CEIL, 14, 520, '#f4dca0', 0.03 + flare * 0.02);
    // 壁(0.5倍速の視差): 面取りした石積み + 浮き彫りの帯
    var off = -(cam * TILE * 0.5) % 120;
    for (var row = 0; row < 6; row++) {
      var y = CEIL + 30 + row * 110;
      var shift = (row % 2) * 60;
      for (var x = off - 120 + shift; x < W + 120; x += 120) {
        game.draw.rect(x + 4, y + 4, 112, 102, '#3e2e20');
        game.draw.rect(x + 4, y + 4, 112, 6, '#6a5238', 0.8);
        game.draw.rect(x + 4, y + 4, 6, 102, '#5a4430', 0.6);
        game.draw.rect(x + 4, y + 100, 112, 6, '#1a120c', 0.8);
      }
    }
    // 浮き彫りの帯(オリジナルの意匠: 目・波・柱)
    var band = 600, bo = -(cam * TILE * 0.5) % 240;
    game.draw.rect(0, band - 30, W, 60, '#2a1e14');
    for (var g = bo - 240; g < W + 240; g += 240) {
      game.draw.circle(g + 60, band, 16, C.sand, 0.5); game.draw.circle(g + 60, band, 7, '#2a1e14');
      game.draw.line(g + 110, band + 12, g + 150, band - 12, C.sand, 4); game.draw.line(g + 150, band - 12, g + 190, band + 12, C.sand, 4);
      game.draw.rect(g + 210, band - 22, 10, 44, C.sand, 0.5);
    }
    // 天井と床の縁(金属の金具のハイライト)
    game.draw.rect(0, CEIL - 20, W, 34, '#1a120c');
    game.draw.rect(0, CEIL + 10, W, 4, C.sand, 0.35);
    // 柱(1倍速)と壁の松明
    var po = -(cam * TILE) % (TILE * 3);
    for (var px = po - TILE * 3; px < W + TILE * 3; px += TILE * 3) {
      game.draw.rect(px, CEIL, 60, FLOOR - CEIL, '#2e2218');
      game.draw.rect(px + 6, CEIL, 8, FLOOR - CEIL, '#7a6040', 0.5);
      game.draw.rect(px + 50, CEIL, 10, FLOOR - CEIL, '#120c08', 0.6);
      var tx = px + 30, ty = 760;
      glow(tx, ty - 20, 22 + flare * 30 + Math.sin(t * 9 + px) * 3, '#ffb040', 0.3 + flare * 0.3);
      game.draw.sprite(TORCH[Math.floor(t * 8 + px) % 2], { y: '#ffe680', o: '#d06020' }, tx, ty - 24, 10 + flare * 6, { anchor: 'center' });
      game.draw.rect(tx - 6, ty, 12, 40, '#5a4028');
    }
    // 床(1倍速): 1拍=1枚の敷石。次に踏む石が拍で光る
    game.draw.rect(0, FLOOR, W, 260, '#2a1e14');
    var nextTile = beatIndex(clock) + 1;
    var first = Math.floor(cam) - 3;
    for (var k = first; k < first + 12; k++) {
      var sx = PX + (k - cam) * TILE - TILE / 2;
      if (sx > W + 10 || sx + TILE < -10) continue;
      var col = k % 2 ? '#4a3826' : '#54402c';
      if (k >= beats.length) col = '#6a5236';
      game.draw.rect(sx + 3, FLOOR, TILE - 6, 40, col);
      game.draw.rect(sx + 3, FLOOR, TILE - 6, 5, '#8a7050', 0.7);
      if (k === nextTile && k < beats.length && clock >= 0) game.draw.rect(sx + 3, FLOOR, TILE - 6, 40, C.gold, 0.2 + beatPulse * 0.3);
    }
    game.draw.rect(0, FLOOR + 40, W, 220, '#1a120c');
    // 親指ゾーンの床下(石の台座)
    game.draw.gradient(1440, H, [[0, '#1a120c'], [1, '#080504']]);
    for (var fl = 0; fl < 4; fl++) game.draw.rect(0, 1452 + fl * 120, W, 3, '#3a2a1c', 0.6);
    // 奥の玄室の扉(ゴール)
    var gx = PX + (beats.length - cam) * TILE;
    if (gx < W + 300) {
      game.draw.rect(gx - 20, CEIL + 40, 300, FLOOR - CEIL - 40, '#5a4430');
      game.draw.rect(gx + 30, CEIL + 160, 200, FLOOR - CEIL - 160, '#120c08');
      glow(gx + 130, 820, 70 + Math.sin(t * 3) * 6, '#f4dca0', 0.45);
      glow(gx + 130, CEIL + 100, 30, C.gold, 0.6);
      for (var ry = 0; ry < 8; ry++) {
        var ra = ry / 8 * Math.PI * 2 + t;
        game.draw.line(gx + 130, CEIL + 100, gx + 130 + Math.cos(ra) * 54, CEIL + 100 + Math.sin(ra) * 54, C.gold, 4);
      }
    }
  }

  function drawHazards(cam) {
    var t = game.time.elapsed;
    for (var i = 0; i < haz.length; i++) {
      var h = haz[i];
      var dt0 = h.t - clock;
      var flash = hitStop > 0 && hitObj === h;
      if (h.type === 'bag') {
        var ax = PX + (h.b - cam) * TILE;
        if (ax < -500 || ax > W + 700) continue;
        // 天井の落とし戸(予告で開き、砂がこぼれる)
        var opened = dt0 <= TELE_T;
        game.draw.rect(ax - 40, CEIL - 14, 80, 18, opened ? C.ink : '#4a3a2a');
        if (opened && dt0 > -0.3) {
          for (var s = 0; s < 6; s++) {
            var sy = CEIL + ((t * 600 + s * 70) % 420);
            game.draw.rect(ax - 6 + (s % 3) * 5, sy, 4, 10, C.sand, 0.7);
          }
          if (dt0 > 0 && Math.floor(t * 12) % 2 === 0) game.draw.rect(ax - TILE / 2 + 6, FLOOR, TILE - 12, 40, C.red, 0.35);
        }
        if (dt0 > TELE_T + 0.1 || dt0 < -0.6) continue;
        var th = dt0 > 0.45 ? 1.2 : 1.2 * Math.sin(Math.PI / 2 * Math.max(-1, Math.min(1, dt0 / 0.45)));
        var bx = ax + Math.sin(th) * ROPE_L, by = CEIL + Math.cos(th) * ROPE_L;
        game.draw.line(ax, CEIL, bx, by - 40, '#5a4028', 6);
        if (flash) glow(bx, by, 70, '#ffffff', 0.5);
        game.draw.sprite(BAG, flash ? { r: '#ffffff', g: '#ffffff', d: '#ffffff' } : BAG_PAL, bx, by, flash ? 13 : 10, { anchor: 'center' });
      } else {
        if (dt0 > TELE_T + 0.05 || dt0 < -0.8) continue;
        // 奥の壁の穴が赤く光る(予告)
        if (dt0 > 0) {
          var on = Math.floor(t * 10) % 2 === 0;
          glow(W - 60, POT_Y, 20, C.red, on ? 0.7 : 0.3);
        }
        var wx = h.b + (h.t - clock) * POT_V / TILE;   // タイル単位の位置
        var px = PX + (wx - cam) * TILE;
        if (px > W + 80) continue;
        var ang = clock * 10;
        var r = flash ? 64 : 48;
        if (flash) glow(px, POT_Y, 80, '#ffffff', 0.5);
        game.draw.circle(px + 6, POT_Y + 8, r, '#000000', 0.25);
        game.draw.circle(px, POT_Y, r, flash ? '#ffffff' : '#a85a34');
        game.draw.circle(px - r * 0.3, POT_Y - r * 0.3, r * 0.35, '#d88a5a', flash ? 0 : 0.7);
        game.draw.line(px + Math.cos(ang) * r, POT_Y + Math.sin(ang) * r, px - Math.cos(ang) * r, POT_Y - Math.sin(ang) * r, '#4a2414', 10);
        game.draw.circle(px + Math.cos(ang + 1.57) * r * 0.9, POT_Y + Math.sin(ang + 1.57) * r * 0.9, r * 0.35, flash ? '#ffffff' : '#8a4424');
      }
    }
  }

  function drawHero() {
    var t = game.time.elapsed;
    var x = PX, spr, h;
    var yOff = 0;
    if (act === 'hit') { spr = HERO_HIT; h = 10; }
    else if (act === 'duck') { spr = HERO_DUCK; h = 10; }
    else if (act === 'jump') {
      spr = HERO_JUMP; h = 16;
      var k = 1 - actT / ACT_T;
      yOff = -Math.sin(Math.PI * Math.max(0, Math.min(1, k))) * JUMP_H;
    } else {
      // 拍で踏み出す: 歩みの2コマ
      var n = beatIndex(clock);
      spr = HERO_WALK[(n + 100) % 2]; h = 16;
    }
    var px = 14;
    var cy = FLOOR - h * px / 2 + yOff;
    game.draw.circle(x, FLOOR + 6, 60 - Math.min(40, -yOff * 0.2), '#000000', 0.35);
    // ヘッドランプの光(前方)
    var lx = x + 40, ly = cy - h * px / 2 + 30;
    if (act !== 'hit') { game.draw.circle(lx + 120, ly + 10, 70, '#ffe680', 0.06); game.draw.circle(lx + 200, ly + 20, 100, '#ffe680', 0.04); }
    game.draw.sprite(spr, HERO_PAL, x, cy, px, { anchor: 'center' });
    if (act === 'hit') {
      for (var s = 0; s < 3; s++) {
        var a = t * 5 + s * 2.1;
        game.draw.rect(x + Math.cos(a) * 50 - 6, cy - 70 + Math.sin(a) * 14 - 6, 12, 12, C.gold);
      }
    }
  }

  function drawDust() {
    for (var i = dust.length - 1; i >= 0; i--) {
      var d = dust[i];
      d.t += game.time.delta;
      if (d.t > 0.6) { dust.splice(i, 1); continue; }
      game.draw.circle(d.x + d.vx * d.t, d.y - d.t * 60, 14 + d.t * 30, C.sand, 0.5 - d.t * 0.8);
    }
  }

  function drawPads(dpress, jpress) {
    var y0 = 1480, hh = 330;
    var items = [[40, 'duck', dpress], [560, 'jump', jpress]];
    for (var i = 0; i < 2; i++) {
      var x0 = items[i][0], pr = items[i][2];
      game.draw.rect(x0, y0 + (pr ? 8 : 0), 480, hh, pr ? '#5a4430' : '#3a2a1c');
      game.draw.rect(x0, y0 + (pr ? 8 : 0), 480, 8, pr ? C.hi : C.sand, pr ? 0.9 : 0.5);
      game.draw.rect(x0, y0 + hh - 8 + (pr ? 8 : 0), 480, 8, '#120c08');
      var cx = x0 + 240, cy = y0 + hh / 2 + (pr ? 8 : 0);
      if (items[i][1] === 'jump') {
        game.draw.sprite(HERO_JUMP, HERO_PAL, cx, cy - 10, 9, { anchor: 'center', alpha: pr ? 1 : 0.75 });
        game.draw.sprite(BAG, BAG_PAL, cx, cy + 110, 5, { anchor: 'center', alpha: 0.7 });
        game.draw.line(cx - 150, cy - 40, cx - 120, cy - 80, C.gold, 10); game.draw.line(cx - 120, cy - 80, cx - 90, cy - 40, C.gold, 10);
      } else {
        game.draw.sprite(HERO_DUCK, HERO_PAL, cx, cy + 40, 9, { anchor: 'center', alpha: pr ? 1 : 0.75 });
        game.draw.circle(cx + 10, cy - 80, 26, '#a85a34', 0.7);
        game.draw.line(cx - 150, cy - 70, cx - 120, cy - 30, C.gold, 10); game.draw.line(cx - 120, cy - 30, cx - 90, cy - 70, C.gold, 10);
      }
    }
  }

  function drawGrain() {
    grain++;
    for (var i = 0; i < 70; i++) {
      var gx = ((i * 7919 + grain * 104729) % 1080 + 1080) % 1080;
      var gy = ((i * 6007 + grain * 7393) % 1920 + 1920) % 1920;
      game.draw.rect(gx, gy, 3, 3, i % 2 ? '#ffffff' : '#000000', 0.07);
    }
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.12);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#0e0a07');
    game.draw.rect(0, 222, W, 8, C.sand, 0.4);
    label('SCORE ' + score, 40, 80, 42, C.hi, 'left');
    if (combo >= 2) label('x' + combo, 560, 80, 42, C.gold, 'center');
    // 残りの松明(当たると消える)
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - hits;
      if (on) glow(60 + i * 64, 150, 14, '#ffb040', 0.35);
      game.draw.sprite(TORCH[0], { y: on ? '#ffe680' : '#3a2a1c', o: on ? '#d06020' : '#2a1e14' }, 60 + i * 64, 146, 9, { anchor: 'center' });
      game.draw.rect(54 + i * 64, 160, 12, 30, '#5a4028');
    }
    // 進み具合(敷石の列 → 扉)
    var pr = Math.max(0, Math.min(1, steps / beats.length));
    game.draw.rect(260, 180, 560, 12, '#2a1e14');
    game.draw.rect(260, 180, 560 * pr, 12, C.sand);
    game.draw.rect(826, 166, 30, 40, C.gold, 0.8);
    // 歯車の板: 今のBPM(予告中は次のBPMを点滅)
    var bi = Math.max(0, beatIndex(clock));
    var bpm = beats[bi] ? beats[bi].bpm : beats[0].bpm;
    var show = announce && Math.floor(game.time.elapsed * 8) % 2 === 0 ? announce.bpm : bpm;
    game.draw.rect(870, 30, 180, 120, '#2a1e14');
    game.draw.rect(870, 30, 180, 6, C.gold, 0.7);
    var gs = announce ? 1 : beatPulse;
    game.draw.sprite(GEAR, { g: announce ? C.gold : C.sand }, 910, 90, 9 + gs * 2, { anchor: 'center' });
    label(String(show), 1000, 106, 44, announce ? C.gold : C.hi, 'center');
  }

  function drawScene() {
    var cam = playerPos(Math.max(-1, clock));
    drawTomb(cam);
    drawHazards(cam);
    drawHero();
    drawDust();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.38;
    game.draw.rect(40, y0, W - 80, hh, '#0e0a07', 0.88);
    game.draw.rect(56, y0 + 16, W - 112, 6, C.gold, 0.6);
    game.draw.rect(56, y0 + hh - 22, W - 112, 6, C.gold, 0.6);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.hi);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, C.hi);
    label(steps + ' / ' + beats.length, W / 2, H * 0.49, 46, C.hi);
    label(String(topBpm), W / 2, H * 0.53, 40, C.gold);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.575, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.575, 42, C.hi);
    if (!won) label('あと' + Math.max(1, beats.length - steps) + '歩!', W / 2, H * 0.618, 50, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.635 + (won ? 0 : 30), 34, C.hi);
  }

  // ---- ATTRACT: 実ロジックで96→128BPMを12拍。奇数周は全部かわす、偶数周は最後の砂袋で伏せて当たる ----
  var demo = { t: 0, x: 780, y: 1640, press: 0, next: 0, cyc: 0 };
  var DEMO_CYC = 6 * 0.625 + 6 * 60 / 128 + 1.3;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.next = 0; }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var h = haz[demo.next];
    if (h) {
      var fail = demo.cyc % 2 === 0 && demo.next === haz.length - 1;
      var kind = (h.type === 'bag') !== fail ? 'jump' : 'duck';
      var tx = kind === 'jump' ? 780 : 300;
      demo.x += (tx - demo.x) * Math.min(1, dt * 10);
      if (hitStop <= 0 && clock >= h.t + 0.01) {
        doAction(kind); pads[kind] = 0.18; demo.press = 0.16; demo.next++;
      }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    pads.jump = Math.max(0, pads.jump - dt); pads.duck = Math.max(0, pads.duck - dt);

    if (state === S.ATTRACT) {
      if (!beats) initRun(true);
      stepDemo(dt);
      drawScene();
      drawPads(pads.duck > 0, pads.jump > 0);
      game.draw.hand(demo.x, demo.y - (demo.press > 0 ? 0 : 30), { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#0e0a07');
      game.draw.rect(0, 222, W, 8, C.sand, 0.4);
      glow(W / 2, 100, 50, C.gold, 0.1 + Math.sin(t * 3) * 0.04);
      label(GAME_TITLE, W / 2, 112, 88, C.gold);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.hi);
      drawGrain();
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else label('TAP TO START', W / 2, H * 0.965, 40, C.hi);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene();
      drawPads(false, false);
      drawHud();
      drawResult(true);
      drawGrain();
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 2.5) { timeUp = true; hitStop = 0; finishRun(hits < LIVES); }
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawPads(pads.duck > 0, pads.jump > 0);
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.4, W, 170, '#0e0a07', 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 115, 100, C.gold);
    }
    // 最初の仕掛けだけ、押す板にゴーストの手を薄く出す
    if (!over && haz.length && !haz[0].res && clock > haz[0].t - 0.8) {
      var hx = haz[0].type === 'bag' ? 800 : 280;
      game.draw.hand(hx, 1640, { press: clock >= haz[0].t - 0.03, scale: 13, alpha: 0.55 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
    drawGrain();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
