// K-GBA-0006v2-cobble-plaza-tile-break.js
// 石畳の瓦割り — 太鼓の合図が鳴る小節のあいだ8分の拍に乗って連打し、拍に乗った打ち数だけ積んだ瓦に割れ目を走らせる。段ごとにテンポが上がる
// 操作: 画面のどこでも押すと瓦を打つ(押した瞬間で判定)。休みの小節(観客の手拍子)のあとに太鼓が8分で鳴る小節が来るので、その8つの拍に合わせて連打する。拍に乗った1打で割れ目が瓦1枚ぶん下へ走り、拍外れや同じ拍への2打目はMISSで割れ目が1枚ぶん戻る。休みの小節の打撃は空打ち(罰なし)
// 終わり: 3段(96→112→128BPM、約13秒)のうちに18枚すべてに割れ目が届けばCLEAR。最後の小節を終えても届かない/残りの拍では届かなくなった時点でGAME OVER
// @mechanic: mash
// @theme: cobble_plaza_tile_breaking
// 世界観: 石畳の広場の瓦割り大会で、鉢巻を締めた挑戦者が太鼓の合図に合わせた連打で積んだ瓦を上から割り抜き、段ごとに速まる太鼓に食らいつく
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った枚数・PERFECT数・最大コンボ・スコア
// スタイル: 90s PRE-RENDER
(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗めの金属質な色、粒状ノイズ、1枚絵として描く背景と擬似奥行き
  var STYLE = { bg: ['#141a22', '#2c3440'], main: ['#5a6470', '#8a96a0', '#a07a50'], accent: ['#e8c068', '#c84030'] };
  var SKY0 = STYLE.bg[0], SKY1 = STYLE.bg[1], TILE = STYLE.main[0], TILE_L = STYLE.main[1], WOODC = STYLE.main[2];
  var GOLD = STYLE.accent[0], CRIM = STYLE.accent[1];
  var INK = '#07090c', STONE = '#3a4048', STONE_L = '#4e5660', STONE_D = '#262b32', SKIN = '#c89878', WHITE = '#f0ece0', LAMP = '#ffcc70';

  var GAME_TITLE = 'TILE BREAK';
  var STAGE_BPM = [96, 112, 128];
  var DEMO_BPM = [96, 128];
  var TILES = 18;
  var PERF = 0.045, GOODW = 0.085;
  var TOWER_X = W * 0.47, TILE_TOP = H * 0.47, TILE_H = 18, TILE_W = 300;
  var PIP_Y = H * 0.86;
  var TIME_LIMIT = 13;   // 3段 × 8拍(96/112/128BPM)≒13.0秒

  // 休みの小節と合図の小節の旋律(独自・ヨナ抜き風)
  var REST_PHR = [['D5', 1], ['A4', 1], ['B4', 1], ['A4', 1]];
  var REST_BASS = [['D3', 2], ['A2', 2]];
  var STRIKE_PHR = [
    [['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5]],
    [['G5', 0.5], ['A5', 0.5], ['B5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5]],
    [['A5', 0.5], ['B5', 0.5], ['D6', 0.5], ['B5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5]]
  ];
  var STRIKE_BASS = [['D3', 1], ['D3', 1], ['A2', 1], ['A2', 1]];

  var HERO = [
    ['....rrrr....', '...rhhhhr...', '..rrrrrrrr..', '...hskskh...', '...hsssshr..', '....ssss..r.', '..wwwwwwww..', '.swwwwwwwws.', '.s.wwwwww.s.', '.s.wwwwww.s.', '...bbbbbb...', '...wwwwww...', '...ww..ww...', '...ww..ww...', '..sss..sss..', '............'],
    ['....rrrr....', '...rhhhhr...', '..rrrrrrrr..', '...hskskh...', '...hsssshr..', '....ssss..r.', '.swwwwwwww..', 's.wwwwwwwws.', 's..wwwwww..s', '...wwwwww..s', '...bbbbbb...', '...wwwwww...', '..ww....ww..', '..ww....ww..', '.sss....sss.', '............']
  ];
  var HERO_PAL = { r: CRIM, h: '#2a2220', s: SKIN, k: INK, w: WHITE, b: INK };
  var DRUMMER = [
    ['.....rr.....', '....hhhh....', '....ssss....', '....kssk....', '..wwwwwwww..', '.wwwwwwwwwws', '.s.wwwwww..s', '.s.wwwwww...', '...nnnnnn...', '...nn..nn...', '..nnn..nnn..', '............'],
    ['s....rr.....', 's...hhhh....', '.s..ssss....', '..s.kssk....', '..wwwwwwww..', '..wwwwwwwww.', '...wwwwww.s.', '...wwwwww..s', '...nnnnnn...', '...nn..nn...', '..nnn..nnn..', '............']
  ];
  var DRUMMER_PAL = { r: CRIM, h: INK, s: SKIN, k: INK, w: '#3c5a7a', n: '#2a3440' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function glow(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2, col, a * 0.1);
    game.draw.circle(x, y, r * 1.4, col, a * 0.2);
    game.draw.circle(x, y, r, col, a);
  }

  // ── 段ごとにBPMが上がる拍の時刻表(休み1小節+合図1小節 × 段数) ──
  function buildTimeline(bpms) {
    var tl = { beats: [], slots: [], bars: [], stages: [], end: 0 };
    var t = 0;
    for (var s = 0; s < bpms.length; s++) {
      var spb = 60 / bpms[s];
      tl.stages.push({ t: t, spb: spb, bpm: bpms[s], strikeT: t + 4 * spb, end: t + 8 * spb, checked: false });
      tl.bars.push({ t: t, stage: s, strike: false });
      tl.bars.push({ t: t + 4 * spb, stage: s, strike: true });
      for (var q = 0; q < 8; q++) tl.beats.push({ t: t + q * spb, stage: s, strike: q >= 4, q: q % 4 });
      for (var e = 0; e < 8; e++) tl.slots.push({ t: t + 4 * spb + e * spb / 2, stage: s, idx: e, res: '' });
      t += 8 * spb;
    }
    tl.end = t;
    return tl;
  }

  function newRun(bpms, demo) {
    return {
      demo: demo, tl: buildTimeline(bpms), songT: 0, nb: 0, ne: 0, nbar: 0,
      stage: 0, strike: false, beatQ: -1, beatT: 0, drumT: 0, armT: 0, rampT: 0, missT: 0, badCool: 0,
      depth: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, ms: 0,
      judge: '', judgeT: 0, splitT: 0, cleared: false, ghostMiss: false
    };
  }

  function initGame() {
    run = newRun(STAGE_BPM, false);
    readyT = 0.8; halt = 0; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  function stageAt(r, t) {
    var st = r.tl.stages;
    for (var i = st.length - 1; i >= 0; i--) if (t >= st[i].t - 0.1) return i;
    return 0;
  }

  // ── 拍クロックの音 ──
  function onBar(r, bar, loud) {
    var st = r.tl.stages[bar.stage];
    if (!bar.strike && bar.stage > 0) {
      r.rampT = 1.0;
      game.fx.popup(String(st.bpm), W * 0.5, H * 0.3, { color: GOLD, size: 90 });
      if (loud) game.audio.tone(300, 0.35, { wave: 'square', volume: 0.05, slide: 700 });
    }
    if (!loud) return;
    if (bar.strike) game.audio.melody(STRIKE_PHR[bar.stage % 3], { tempo: st.bpm, wave: 'triangle', volume: 0.06, bass: STRIKE_BASS, bassWave: 'square', bassVolume: 0.035 });
    else game.audio.melody(REST_PHR, { tempo: st.bpm, wave: 'triangle', volume: 0.05, bass: REST_BASS, bassWave: 'triangle', bassVolume: 0.07 });
  }
  function onBeat(r, b, loud) {
    r.stage = b.stage; r.strike = b.strike; r.beatQ = b.q; r.beatT = 0.12;
    if (!loud || b.strike) return;
    // 観客の手拍子(休みの小節も拍は続く)
    game.audio.tone(1250, 0.03, { wave: 'square', volume: 0.04 });
    game.audio.tone(b.q === 0 ? 'D3' : 'A2', 0.12, { wave: 'triangle', volume: 0.08 });
  }
  function onDrum(r, s, loud) {
    r.drumT = 0.1;
    if (loud) game.audio.tone(s.idx % 2 === 0 ? 72 : 96, 0.1, { wave: 'triangle', volume: s.idx % 2 === 0 ? 0.2 : 0.12 });
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT, tl = r.tl;
    while (r.nbar < tl.bars.length && t + 0.06 >= tl.bars[r.nbar].t) { onBar(r, tl.bars[r.nbar], loud); r.nbar++; }
    while (r.nb < tl.beats.length && t >= tl.beats[r.nb].t) { onBeat(r, tl.beats[r.nb], loud); r.nb++; }
    while (r.ne < tl.slots.length && t >= tl.slots[r.ne].t) { onDrum(r, tl.slots[r.ne], loud); r.ne++; }
    for (var i = 0; i < tl.slots.length; i++) {
      var sl = tl.slots[i];
      if (sl.res === '' && t > sl.t + GOODW) sl.res = 'empty';
    }
    // 合図の小節が終わるたび: 残りの拍で届かなくなったら終わり
    for (var s = 0; s < tl.stages.length; s++) {
      var st = tl.stages[s];
      if (!st.checked && t >= st.end + GOODW) {
        st.checked = true;
        var remaining = (tl.stages.length - s - 1) * 8;
        if (!r.demo && !r.cleared && TILES - r.depth > remaining) fail(r);
      }
    }
    if (r.beatT > 0) r.beatT -= dt;
    if (r.drumT > 0) r.drumT -= dt;
    if (r.armT > 0) r.armT -= dt;
    if (r.rampT > 0) r.rampT -= dt;
    if (r.missT > 0) r.missT -= dt;
    if (r.badCool > 0) r.badCool -= dt;
    if (r.judgeT > 0) r.judgeT -= dt;
    if (r.cleared) r.splitT += dt;
  }

  // ── 1打の判定: 合図の小節の8分の拍の頭からのずれ ──
  function strike(r, loud) {
    var t = r.songT;
    r.armT = 0.09;
    var si = stageAt(r, t), st = r.tl.stages[si];
    var idx = Math.round((t - st.strikeT) / (st.spb / 2));
    if (idx < 0 || idx > 7 || r.cleared) {
      // 休みの小節の空打ち(罰なし)
      if (loud) game.audio.tone(180, 0.05, { wave: 'triangle', volume: 0.05 });
      game.fx.burst(TOWER_X, TILE_TOP - 10, { color: STONE_L, count: 3, speed: 90 });
      return;
    }
    var slot = r.tl.slots[si * 8 + idx];
    var off = Math.abs(t - slot.t);
    if (slot.res !== '' || off > GOODW) {
      r.misses++; r.combo = 0; r.depth = Math.max(0, r.depth - 1); r.missT = 0.25;
      r.judge = 'MISS'; r.judgeT = 0.3;
      if (loud) game.audio.tone(110, 0.08, { wave: 'sawtooth', volume: 0.07 });
      if (r.badCool <= 0) { r.badCool = 0.35; game.feedback.bad(TOWER_X, TILE_TOP + r.depth * TILE_H, { text: null, shake: 5, volume: loud ? 0.25 : 0, flashColor: CRIM }); }
      else game.fx.burst(TOWER_X, TILE_TOP + r.depth * TILE_H, { color: CRIM, count: 4, speed: 120 });
      return;
    }
    var perfect = off <= PERF;
    slot.res = perfect ? 'perfect' : 'good';
    r.depth = Math.min(TILES, r.depth + 1);
    r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfects++; else r.goods++;
    r.score += (perfect ? 100 : 60) + r.combo * 5 + si * 20;
    r.judge = perfect ? 'PERFECT' : 'GOOD'; r.judgeT = 0.3;
    game.feedback.good(TOWER_X, TILE_TOP + (r.depth - 1) * TILE_H, { text: null, color: perfect ? GOLD : WHITE, count: perfect ? 10 : 6, sound: 'se_break', volume: loud ? 0.35 : 0 });
    if (loud) game.audio.tone(perfect ? 1760 : 1320, 0.04, { wave: 'square', volume: 0.05 });
    if (r.depth >= 6 * (r.ms + 1) && r.depth < TILES) {
      r.ms++;
      game.fx.popup(r.depth + ' / ' + TILES, W * 0.5, H * 0.38, { color: GOLD, size: 72 });
      if (loud) game.audio.play('se_milestone', 0.4);
    }
    if (r.depth >= TILES && !r.demo) {
      r.cleared = true; r.splitT = 0;
      r.score += 1000 + Math.round(Math.max(0, r.tl.end - t) * 200);
      game.fx.burst(TOWER_X, H * 0.57, { color: GOLD, count: 40, speed: 520 });
      finish(true);
    }
  }

  function fail(r) {
    if (halt > 0 || over) return;
    halt = 0.5;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.6;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { tiles: run.depth, total: TILES, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  game.onPress(function () {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(330, 0.03, { wave: 'square', volume: 0.03 }); return; }
    strike(run, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 96BPMと128BPMの2段を実演。最初の合図の小節で1打だけ拍を外してMISS(割れ目が戻る) ──
  var demo = { t: 0, run: null, press: 0, done: {} };
  function stepDemo(dt) {
    demo.t += dt;
    var len = 8 * 60 / DEMO_BPM[0] + 8 * 60 / DEMO_BPM[1] + 0.8;
    var cyc = demo.t % len;
    if (cyc < dt || demo.t <= dt || !demo.run) { demo.run = newRun(DEMO_BPM, true); demo.done = {}; }
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var sl = r.tl.slots;
    for (var i = 0; i < sl.length; i++) {
      var s = sl[i];
      var at = s.t + (i === 5 ? 0.13 : 0);   // 6打目だけ遅れて外す
      if (!demo.done[i] && r.songT >= at && r.songT < at + 0.1) {
        demo.done[i] = true;
        strike(r, audioOk);
        demo.press = 0.07;
      }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  // ── 描画 ──
  function drawPlaza(r) {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H * 0.42, [[0, SKY0], [1, SKY1]]);
    // 広場を囲む石造りの建物とアーチ(1枚絵)
    for (var b = 0; b < 4; b++) {
      var bx = b * 290 - 40, bh = 260 + (b % 2) * 70;
      game.draw.rect(bx, H * 0.42 - bh, 260, bh, STONE_D);
      game.draw.rect(bx, H * 0.42 - bh, 260, 8, STONE);
      game.draw.rect(bx + 90, H * 0.42 - 150, 80, 150, INK);
      game.draw.circle(bx + 130, H * 0.42 - 150, 40, INK);
      for (var wv = 0; wv < 2; wv++) game.draw.rect(bx + 30 + wv * 160, H * 0.42 - bh + 40, 40, 60, LAMP, 0.25 + 0.1 * Math.sin(tt + b + wv));
    }
    // 提灯の列(拍で明るくなる)
    var pulse = r && r.beatT > 0 ? r.beatT / 0.12 : 0;
    game.draw.line(0, H * 0.25, W, H * 0.22, '#1e242c', 3);
    for (var l = 0; l < 8; l++) {
      var lx = 60 + l * 135, ly = H * 0.25 - l * 3.5 + 26;
      glow(lx, ly, 16, (l % 2) ? CRIM : LAMP, 0.55 + 0.4 * pulse);
    }
    // 石畳(奥ほど小さく詰まる)
    game.draw.gradient(H * 0.42, H, [[0, STONE_D], [1, STONE]]);
    for (var row = 0; row < 14; row++) {
      var k = row / 13, y = H * 0.42 + (H * 0.58) * k * k + 6;
      var sz = 14 + 50 * k, step = sz * 2.1;
      for (var x = (row % 2) * sz; x < W + sz; x += step) {
        game.draw.circle(x, y, sz * 0.9, STONE_L, 0.55);
        game.draw.circle(x - sz * 0.15, y - sz * 0.15, sz * 0.5, '#5e6670', 0.35);
      }
    }
    // 観客(拍で揺れる)
    for (var c = 0; c < 11; c++) {
      var cx = 40 + c * 100, bob = (r && r.beatT > 0 && !r.strike) ? -10 : 0;
      game.draw.circle(cx, H * 0.405 + bob, 26, '#1a1e24');
      game.draw.rect(cx - 34, H * 0.42 + bob, 68, 70, '#1a1e24');
    }
    game.draw.rect(0, H * 0.445, W, 6, CRIM, 0.7);
  }

  function drawStage(r) {
    var tt = game.time.elapsed;
    // 太鼓と打ち手(合図の小節で叩く)
    var dx = W * 0.15, dy = H * 0.6;
    game.draw.sprite(DRUMMER[r.drumT > 0 ? 1 : 0], DRUMMER_PAL, dx - 40, dy - 150, 14, { anchor: 'center' });
    game.draw.rect(dx - 20, dy + 40, 16, 120, WOODC);
    game.draw.rect(dx + 70, dy + 40, 16, 120, WOODC);
    game.draw.circle(dx + 34, dy, 104, '#5a2a1a');
    game.draw.circle(dx + 34, dy, 88, r.drumT > 0 ? WHITE : '#d8c8a8');
    game.draw.circle(dx + 34, dy, 30, CRIM, r.strike ? 0.9 : 0.4);
    if (r.drumT > 0) glow(dx + 34, dy, 40, GOLD, 0.5);
    // 瓦の塔(上から割れ目が走る)
    var split = r.cleared ? Math.min(1, r.splitT * 3) : 0;
    var flash = halt > 0;
    game.draw.rect(TOWER_X - 170, TILE_TOP + TILES * TILE_H, 90, 70, STONE_D);
    game.draw.rect(TOWER_X + 80, TILE_TOP + TILES * TILE_H, 90, 70, STONE_D);
    game.draw.rect(TOWER_X - 170, TILE_TOP + TILES * TILE_H, 90, 10, STONE_L);
    game.draw.rect(TOWER_X + 80, TILE_TOP + TILES * TILE_H, 90, 10, STONE_L);
    var sc = flash ? 1.06 : 1;
    for (var i = 0; i < TILES; i++) {
      var y = TILE_TOP + i * TILE_H, cracked = i < r.depth;
      var gap = cracked ? 4 + split * 120 + (r.cleared ? i * 2 : 0) : 0;
      var drop = r.cleared ? split * split * 160 : 0;
      var col = flash ? WHITE : (Math.floor(i / 6) % 2 ? TILE : '#525c68');
      var hw = TILE_W * sc / 2;
      game.draw.rect(TOWER_X - hw - gap, y + drop * (cracked ? 1 : 0), hw - 2, TILE_H - 4, col);
      game.draw.rect(TOWER_X + 2 + gap, y + drop * (cracked ? 1 : 0), hw - 2, TILE_H - 4, col);
      game.draw.rect(TOWER_X - hw - gap, y + drop * (cracked ? 1 : 0), hw - 2, 4, TILE_L, 0.8);
      game.draw.rect(TOWER_X + 2 + gap, y + drop * (cracked ? 1 : 0), hw - 2, 4, TILE_L, 0.8);
      if (cracked && !r.cleared) {
        game.draw.line(TOWER_X - 6 + (i % 2) * 12, y, TOWER_X + 6 - (i % 2) * 12, y + TILE_H - 4, GOLD, 3);
      }
    }
    // 割れ目の先端(次に割る瓦)が拍で光る
    if (!r.cleared && r.depth < TILES) {
      var ty = TILE_TOP + r.depth * TILE_H + TILE_H / 2;
      glow(TOWER_X, ty, 10, r.missT > 0 ? CRIM : GOLD, r.strike ? 0.9 : 0.4);
    }
    // 挑戦者(鉢巻)と打ち下ろす腕
    var hx = TOWER_X + 230, hy = H * 0.5;
    game.draw.sprite(HERO[r.armT > 0 ? 1 : 0], HERO_PAL, hx, hy, 20, { anchor: 'center' });
    var ex = r.armT > 0 ? TOWER_X + 30 : hx - 95, ey = r.armT > 0 ? TILE_TOP - 18 : hy - 150 + Math.sin(tt * 3) * 6;
    var mx = (hx - 70 + ex) / 2, my = (hy - 60 + ey) / 2;
    game.draw.line(hx - 70, hy - 60, mx, my, WHITE, 34);
    game.draw.line(mx, my, ex, ey, SKIN, 26);
    game.draw.circle(ex, ey, 22, SKIN);
    if (r.armT > 0) glow(TOWER_X + 20, TILE_TOP - 10, 18, WHITE, 0.6);
  }

  function drawPips(r) {
    // 親指ゾーン: 合図の小節の8つの拍(打てば埋まる) + 進む再生位置
    var si = Math.min(r.tl.stages.length - 1, stageAt(r, r.songT));
    var st = r.tl.stages[si];
    game.draw.rect(40, PIP_Y - 110, W - 80, 220, INK, 0.55);
    game.draw.rect(40, PIP_Y - 110, W - 80, 6, r.strike ? GOLD : STONE_L);
    for (var e = 0; e < 8; e++) {
      var sl = r.tl.slots[si * 8 + e];
      var x = W * 0.13 + e * W * 0.106, big = e % 2 === 0;
      var col = sl.res === 'perfect' ? GOLD : sl.res === 'good' ? WHITE : sl.res === 'empty' ? '#2a3038' : r.strike ? TILE_L : TILE;
      game.draw.rect(x - (big ? 38 : 28), PIP_Y - (big ? 38 : 28), big ? 76 : 56, big ? 76 : 56, INK);
      game.draw.rect(x - (big ? 32 : 22), PIP_Y - (big ? 32 : 22), big ? 64 : 44, big ? 64 : 44, col);
    }
    if (r.strike && r.songT >= st.strikeT) {
      var ph = (r.songT - st.strikeT) / (st.spb / 2);
      var px = W * 0.13 + Math.min(7.5, ph) * W * 0.106;
      game.draw.rect(px - 4, PIP_Y - 70, 8, 140, GOLD);
    }
    if (r.judgeT > 0) txt(r.judge, W * 0.5, PIP_Y - 150, 54, r.judge === 'MISS' ? CRIM : r.judge === 'PERFECT' ? GOLD : WHITE);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, H * 0.118, INK, 0.65);
    txt(String(r.score), 40, 66, 50, GOLD, 'left');
    txt(r.depth + ' / ' + TILES, W - 40, 66, 50, WHITE, 'right');
    // 振り子のメトロノーム: 拍の頭で端に届く。段が上がると速くなる
    var si = Math.min(r.tl.stages.length - 1, stageAt(r, r.songT)), st = r.tl.stages[si];
    var bp = Math.max(0, (r.songT - st.t) / st.spb);
    var ang = Math.cos(Math.PI * bp) * 0.6;
    var mx = W * 0.5, my = H * 0.112;
    game.draw.rect(mx - 70, my - 10, 140, 20, WOODC);
    game.draw.line(mx, my, mx + Math.sin(ang) * 150, my - Math.cos(ang) * 150, r.rampT > 0 && Math.floor(game.time.elapsed * 12) % 2 === 0 ? CRIM : TILE_L, 8);
    glow(mx + Math.sin(ang) * 120, my - Math.cos(ang) * 120, 14, r.beatT > 0 ? GOLD : TILE_L, 1);
    txt(String(st.bpm), mx + 150, 66, 34, r.rampT > 0 ? CRIM : TILE_L);
    for (var s = 0; s < r.tl.stages.length; s++) game.draw.rect(mx - 150 + s * 40, 120, 28, 20, s <= si ? GOLD : '#2a3038');
  }

  function grain() {
    var tt = Math.floor(game.time.elapsed * 12);
    for (var i = 0; i < 90; i++) {
      var x = (i * 977 + tt * 131) % W, y = (i * 613 + tt * 257) % H;
      game.draw.rect(x, y, 3, 3, i % 2 ? WHITE : INK, 0.06);
    }
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 112, won ? GOLD : CRIM);
      return;
    }
    game.draw.rect(80, H * 0.17, W - 160, H * 0.33, INK, 0.85);
    game.draw.rect(80, H * 0.17, W - 160, 8, won ? GOLD : CRIM);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.22, 100, won ? GOLD : CRIM);
    txt(run.depth + ' / ' + TILES, W / 2, H * 0.285, 64, WHITE);
    txt('SCORE ' + run.score, W / 2, H * 0.34, 52, GOLD);
    txt('PERFECT ' + run.perfects + '   COMBO ' + run.maxCombo, W / 2, H * 0.385, 38, TILE_L);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.43, 56, GOLD);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.43, 44, WHITE);
    if (!won) txt('あと' + (TILES - run.depth) + '枚!', W / 2, H * 0.475, 50, CRIM);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, WHITE);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawPlaza(demo.run);
      drawStage(demo.run);
      drawPips(demo.run);
      drawHud(demo.run);
      grain();
      game.draw.hand(TOWER_X + 120, TILE_TOP + (demo.press > 0 ? 30 : -40) + Math.sin(game.time.elapsed * 2) * 6, { press: demo.press > 0, scale: 16 });
      game.draw.rect(0, H * 0.14, W, 160, INK, 0.55);
      txt(GAME_TITLE, W / 2, H * 0.17, 100, GOLD);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.213, 40, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, GOLD);
      else txt('TAP TO START', W / 2, H * 0.965, 44, WHITE);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        run.splitT += dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.18; game.fx.burst(game.random(120, W - 120), game.random(H * 0.2, H * 0.45), { color: [GOLD, CRIM, WHITE][Math.floor(game.random(0, 3))], count: 14, speed: 320 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(TOWER_X, H * 0.56, { text: 'MISS', flashColor: CRIM });
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_jump', 0.3);
      } else {
        stepRun(run, dt, true);
        if (!over && halt <= 0 && (run.songT >= run.tl.end + GOODW + 0.05 || run.songT >= TIME_LIMIT + 0.5)) {
          if (run.depth >= TILES) finish(true); else fail(run);
        }
      }
    }

    drawPlaza(run);
    drawStage(run);
    drawPips(run);
    drawHud(run);
    grain();
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 120, GOLD);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
