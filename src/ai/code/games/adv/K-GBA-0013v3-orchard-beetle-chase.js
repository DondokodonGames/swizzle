// K-GBA-0013v3-orchard-beetle-chase.js
// 枝渡りの甲虫 — 拍に乗って枝から枝へ跳ぶ甲虫を追い、跳び移った先の枝を着地の拍の頭で押さえる。半拍前に食って着地する跳びが混ざる
// 操作: 甲虫が次にとまる枝に縮む輪が出る。輪が閉じる瞬間(甲虫の着地)にその枝を押して網をかぶせる。白い輪は拍の頭、橙の輪は半拍前に食って着地する。枝違い・拍外れ・押し逃しはMISS(着地から遠い時の空押しは罰なし)
// 終わり: 7小節(約18秒・18跳び)を追い切り、最後の跳びで網に収めればCLEAR。MISSが3つ、または最後の跳びを逃すとGAME OVER
// @mechanic: chase
// @theme: after_rain_orchard_beetle_chase
// 世界観: 夕立ちの上がった果樹園で、虫とり網を持つ子が拍ごとに枝を渡る甲虫を追い、着地した枝を押さえながら奥へ奥へと追い詰める
// 残るもの: 正誤(CLEAR/GAME OVER) + 押さえた数・食いの跳びを押さえた数・PERFECT数・最大コンボ・スコア
// スタイル: MODE7 PSEUDO
(function (game) {
  var STYLE = { bg: ['#5c6a8e', '#f2c98c'], main: ['#3f7a3a', '#2a5530', '#6a4a2e'], accent: ['#f0a020', '#f6f2e0'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 地平線から上は空のグラデ、下は横ストリップの床を奥ほど横に圧縮して描く。少色
  var SKY0 = STYLE.bg[0], SKY1 = STYLE.bg[1], GRASS = STYLE.main[0], GRASS_D = STYLE.main[1], BARK = STYLE.main[2];
  var AMBER = STYLE.accent[0], CREAM = STYLE.accent[1];
  var INK = '#14140f', LEAF = '#2c5e30', LEAF_L = '#5a9a48', FOG = '#c8bfa4', PUDDLE = '#a8bcd4', APPLE = '#d8443a', MISSC = '#e04848';

  var GAME_TITLE = 'BEETLE DASH';
  var BPM = 108;
  var SPB = 60 / BPM;
  var BARS = 8;                        // 0小節目はカウント
  var SONG_BEATS = BARS * 4;
  var PERF = 0.06, GOODW = 0.12, EDGE = 0.24, LATE = 0.18;
  var LIVES = 3;
  var HZ = H * 0.36;                   // 地平線
  var HIT_R = 150;
  var KID_Y = H * 0.8;
  var SPOTS = [
    { x: W * 0.12, y: H * 0.27 }, { x: W * 0.33, y: H * 0.37 }, { x: W * 0.14, y: H * 0.5 },
    { x: W * 0.5, y: H * 0.3 },
    { x: W * 0.88, y: H * 0.27 }, { x: W * 0.67, y: H * 0.37 }, { x: W * 0.86, y: H * 0.5 }
  ];
  var START_SPOT = 3;
  // [着地する拍(.5 は半拍前に食う), 枝]
  var CHART = [[4, 1], [6, 5], [8, 4], [10, 6], [11.5, 5], [13, 1], [15, 2], [16, 0], [17.5, 1], [19.5, 3],
    [21, 5], [22, 6], [23.5, 4], [25, 3], [26.5, 0], [27.5, 1], [29, 5], [30.5, 3]];
  // デモ: [拍, 枝, ゴーストが押すずれ(秒)]。3跳びは押さえ、4跳び目は早押しでMISS
  var DEMO_CHART = [[4, 1, 0], [6, 5, 0], [7.5, 4, 0], [9, 6, -0.2]];
  var DEMO_BEATS = 12;

  // 果樹園の伴奏(独自)。旋律もベースも小節の終わりで次の頭を食う
  var PHR = [
    [['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5]],
    [['D5', 0.5], ['E5', 0.5], ['F5', 1], ['E5', 0.5], ['D5', 1], ['B4', 0.5]],
    [['C5', 1], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['G5', 0.5]],
    [['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5]]
  ];
  var BAS = [
    [['C3', 1.5], ['C3', 1], ['G2', 1.5]],
    [['F2', 1.5], ['F2', 1], ['G2', 1.5]],
    [['A2', 1.5], ['A2', 1], ['E2', 1.5]],
    [['F2', 1.5], ['G2', 1], ['C3', 1.5]]
  ];

  var BEETLE = [
    ['....h...h....', '.....h.h.....', '....hhhhh....', '...hwkhwkh...', '..ssssgssss..', '.ssssgssssss.', 'lsssss.sssssl', '.ssssss.ssss.', 'l.ssss.ssss.l', '...ss...ss...', '..l.......l..'],
    ['....h...h....', '.....h.h.....', '....hhhhh....', '...hwkhwkh...', 'l.ssssgssss.l', '.ssssgssssss.', '.sssss.sssss.', 'lssssss.ssssl', '..ssss.ssss..', '...ss...ss...', '.l.........l.'],
    ['f...h...h...f', 'ff...h.h...ff', 'fff.hhhhh.fff', 'ffshwkhwkhsff', 'ffss.....ssff', '.fss.....ssf.', '..ss.....ss..', '...s.....s...', '.............', '.............', '.............']
  ];
  var BEE_PAL = { h: '#3a2410', w: '#ffffff', k: INK, s: '#b8661a', g: '#ffd890', l: '#2a1a0a', f: '#e8f0ff' };
  var KID = [
    ['....hhhh....', '..hhhhhhhh..', '...ffffff...', '...fkffkf...', '...ffffff...', '....cccc....', '..cccccccc..', '.f.cccccc.f.', '...cccccc...', '...pp..pp...', '...pp..pp...', '..bb....bb..'],
    ['....hhhh....', '..hhhhhhhh..', '...ffffff...', '...fkffkf...', '...ffffff...', '....cccc....', '..cccccccc.f', '.f.cccccc...', '...cccccc...', '..pp...pp...', '.pp.....pp..', 'bb.......bb.'],
    ['....hhhh....', '..hhhhhhhh..', '...ffffff...', '...fkffkf...', '...ffffff...', '....cccc..f.', '..ccccccccf.', '...cccccc...', '...cccccc...', '...pp.pp....', '..pp...pp...', '.bb.....bb..']
  ];
  var KID_PAL = { h: '#e8c060', f: '#f0c8a0', k: INK, c: '#4a78c0', p: '#3a3a50', b: '#5a3a24' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltHop, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 5, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function newRun(chart, demo) {
    var hops = [], prevS = START_SPOT;
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      var gap = i === 0 ? 2 : c[0] - chart[i - 1][0];
      var fl = Math.min(gap - 0.3, 1) * SPB;
      var tl = c[0] * SPB;
      hops.push({ beat: c[0], spot: c[1], from: prevS, tLand: tl, tOff: tl - fl, sync: c[0] % 1 !== 0, res: '', fz: 0, post: 0, fx: 0, fy: 0,
        ghost: c[2] || 0, tapped: false, clicked: false, last: i === chart.length - 1, endHalt: false });
      prevS = c[1];
    }
    return {
      demo: demo, hops: hops, beats: demo ? DEMO_BEATS : SONG_BEATS,
      songT: 0, lastBeat: -1, lastBar: -1, beatK: -1, beatT: 0, halfK: -1,
      hits: 0, syncHits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false, caught: false,
      kidX: W / 2, kidVX: 0, netT: 0, netX: 0, netY: 0, camZ: 0, camZT: 0
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltHop = null; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  // ── 拍クロック ──
  function playBar(nb) {
    if (nb === 0) {
      game.audio.melody([['R', 3], ['G4', 0.5], ['B4', 0.5]], { tempo: BPM, wave: 'square', volume: 0.05, bass: [['C3', 1], ['C3', 1], ['C3', 1], ['G2', 0.5], ['B2', 0.5]], bassWave: 'triangle', bassVolume: 0.08 });
      return;
    }
    var i = (nb - 1) % PHR.length;
    game.audio.melody(PHR[i], { tempo: BPM, wave: 'square', volume: 0.055, bass: BAS[i], bassWave: 'triangle', bassVolume: 0.08 });
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb < r.beats / 4) playBar(nb); }
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) {
      r.lastBeat = k; r.beatK = k;
      if (k < r.beats) {
        r.beatT = 0.15;
        if (loud) game.audio.tone(k % 4 === 0 ? 2200 : 1700, 0.025, { wave: 'square', volume: 0.03 });
      }
    }
    r.halfK = Math.floor(t / (SPB / 2));
    for (var i = 0; i < r.hops.length; i++) {
      var h = r.hops[i];
      if (!h.clicked && t >= h.tLand) {
        h.clicked = true;
        if (loud) game.audio.tone(h.sync ? 880 : 660, 0.04, { wave: 'triangle', volume: 0.07 });
      }
      if (h.res === '' && t > h.tLand + LATE) missHop(r, h, loud);
      if (h.res === 'miss') {
        if (h.fz > 0 && !h.endHalt) {
          h.fz -= dt;
          if (h.fz <= 0) game.feedback.bad(h.fx, h.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: MISSC });
        } else if (h.fz <= 0) h.post += dt;
      }
      if (h.res === 'hit') h.post += dt;
    }
    // 子は次に着く枝の下へ走る
    var nx = nextHop(r);
    var tx = nx ? SPOTS[nx.spot].x : r.kidX;
    var ox = r.kidX;
    r.kidX += (tx - r.kidX) * Math.min(1, dt * 5);
    r.kidVX = (r.kidX - ox) / Math.max(dt, 0.001);
    r.camZ += (r.camZT - r.camZ) * Math.min(1, dt * 6);
    if (r.beatT > 0) r.beatT -= dt;
    if (r.netT > 0) r.netT -= dt;
  }

  function nextHop(r) {
    for (var i = 0; i < r.hops.length; i++) if (r.hops[i].res === '') return r.hops[i];
    return null;
  }

  function beetlePos(r, t) {
    var pos = SPOTS[START_SPOT];
    for (var i = 0; i < r.hops.length; i++) {
      var h = r.hops[i];
      if (t < h.tOff) break;
      if (t < h.tLand) {
        var a = SPOTS[h.from], b = SPOTS[h.spot];
        var p = (t - h.tOff) / (h.tLand - h.tOff);
        var arc = 200 * (h.tLand - h.tOff) / SPB;
        return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p - Math.sin(p * Math.PI) * arc, fly: true };
      }
      pos = SPOTS[h.spot];
    }
    return { x: pos.x, y: pos.y, fly: false };
  }

  function hitHop(r, h, d, loud) {
    var perfect = Math.abs(d) <= PERF;
    var sp = SPOTS[h.spot];
    h.res = 'hit'; h.post = 0;
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (h.sync) r.syncHits++;
    if (perfect) r.perfects++; else r.goods++;
    var gain = Math.round(((perfect ? 300 : 150) + r.combo * 20) * (h.sync ? 1.5 : 1));
    if (h.last) { r.caught = true; gain += 1000; }
    r.score += gain; r.camZT += 1;
    game.feedback.good(sp.x, sp.y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? AMBER : CREAM, count: perfect ? 18 : 10, volume: loud ? 0.4 : 0 });
    game.fx.popup('+' + gain, sp.x, sp.y - 130, { color: h.sync ? AMBER : CREAM, size: 46 });
    if (loud) game.audio.tone(523 * Math.pow(1.06, Math.min(r.combo, 12)), 0.07, { wave: 'square', volume: 0.06 });
    if (r.hits === 8 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 8', W / 2, H * 0.6, { color: AMBER, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
    if (h.last) {
      game.fx.popup('x' + r.maxCombo + ' COMBO', W / 2, H * 0.66, { color: CREAM, size: 56 });
      if (loud) game.audio.play('se_powerup', 0.4);
    }
  }

  function missHop(r, h, loud) {
    if (h.res !== '') return;
    var sp = SPOTS[h.spot];
    h.res = 'miss'; h.fz = 0.32; h.post = 0; h.fx = sp.x; h.fy = sp.y;
    r.misses++; r.combo = 0;
    if (loud) game.audio.tone(130, 0.15, { wave: 'sawtooth', volume: 0.07, slide: -50 });
    if (!r.demo && (r.misses >= LIVES || h.last)) { h.endHalt = true; halt = 0.5; haltHop = h; }
  }

  // 押さえる(押した位置と時刻で判定)
  function press(r, x, y, loud) {
    r.netT = 0.24; r.netX = x; r.netY = y;
    var best = null, bd = 99;
    for (var i = 0; i < r.hops.length; i++) {
      var h = r.hops[i];
      if (h.res !== '') continue;
      var dd = Math.abs(r.songT - h.tLand);
      if (dd <= EDGE && dd < bd) { bd = dd; best = h; }
    }
    if (!best) {
      // 着地から遠い空押し(罰なし)
      if (loud) game.audio.tone(300, 0.04, { wave: 'triangle', volume: 0.04, slide: -100 });
      game.fx.burst(x, y, { color: LEAF_L, count: 4, speed: 120 });
      return;
    }
    var sp = SPOTS[best.spot];
    var dx = x - sp.x, dy = y - sp.y;
    var d = r.songT - best.tLand;
    if (dx * dx + dy * dy <= HIT_R * HIT_R && Math.abs(d) <= GOODW) hitHop(r, best, d, loud);
    else missHop(r, best, loud);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) run.score += (LIVES - run.misses) * 300;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { hits: run.hits, total: CHART.length, syncHits: run.syncHits, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo, caught: run.caught ? 1 : 0 };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押した瞬間で判定 ──
  game.onPress(function (x, y) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(250, 0.03, { wave: 'square', volume: 0.03 }); return; }
    press(run, x, y, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 実ロジックで3跳び押さえ(1つは食い)、4跳び目は早押しでMISS ──
  var demo = { t: 0, run: null, hx: W / 2, hy: H * 0.9, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var h = nextHop(r);
    var tx = W / 2, ty = H * 0.9;
    if (h) {
      var sp = SPOTS[h.spot];
      if (r.songT >= h.tLand - 0.7) { tx = sp.x; ty = sp.y + 30; }
      if (!h.tapped && r.songT >= h.tLand + h.ghost) { h.tapped = true; demo.press = 0.16; press(r, sp.x, sp.y, audioOk); }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 10);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 10);
  }

  // ── 描画 ──
  function drawSky() {
    var el = game.time.elapsed;
    game.draw.gradient(0, HZ, [[0, SKY0], [0.55, '#9a94a8'], [1, SKY1]]);
    // 雨上がりの虹(地平線の下は床が隠す)
    var rc = ['#e86a5a', '#f0b050', '#f0e070', '#7ac87a', '#6a9ae0'];
    for (var i = 0; i < rc.length; i++) game.draw.circle(W * 0.62, HZ + 60, 520 - i * 22, rc[i], 0.16);
    game.draw.circle(W * 0.62, HZ + 60, 408, SKY1, 0.5);
    // 流れる雲(横ストリップ)
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 + el * 18) % (W + 400)) - 200, cy = H * 0.15 + c * 40;
      game.draw.rect(cx, cy, 260, 18, '#d8d4dc', 0.7);
      game.draw.rect(cx + 40, cy - 16, 160, 16, '#e8e4ea', 0.7);
    }
    game.draw.circle(W * 0.2, HZ - 30, 60, '#fff0c0', 0.35);
    game.draw.circle(W * 0.2, HZ - 30, 36, '#fff4d8', 0.8);
  }

  function drawFloor(r) {
    var camZ = r ? r.camZ : 0;
    var shift = r ? (r.kidX - W / 2) * 1.4 : 0;
    var pulse = r && r.beatT > 0 ? r.beatT / 0.15 : 0;
    var TILE = 300;
    for (var y = HZ; y < H; y += 5) {
      var dy = y - HZ + 2.5;
      var f = dy / (H - HZ);
      var z = 1 / f;
      var row = Math.floor(z * 2.2 + camZ * 2);
      var odd = row % 2 === 0;
      game.draw.rect(0, y, W, 5, odd ? GRASS : GRASS_D);
      var tw = TILE * f;
      if (tw >= 18) {
        var n0 = Math.floor((shift - (W / 2) / f) / TILE);
        for (var n = n0; n < n0 + 80; n++) {
          var x = W / 2 + (n * TILE - shift) * f;
          if (x > W) break;
          var puddle = (row % 9 === 4) && ((n % 5) + 5) % 5 === 2;
          if (puddle) game.draw.rect(x, y, tw, 5, PUDDLE, 0.85);
          else if ((n + row) % 2 === 0) game.draw.rect(x, y, tw, 5, odd ? GRASS_D : GRASS, 0.55);
        }
      }
      if (f < 0.22) game.draw.rect(0, y, W, 5, FOG, (0.22 - f) * 3.2);
      if (pulse > 0 && row % 4 === 0) game.draw.rect(0, y, W, 5, CREAM, 0.1 * pulse);
    }
  }

  function drawFarTrees(r) {
    var camZ = r ? r.camZ : 0;
    // 通路の両側に並ぶ果樹(板)。距離で px スケールを変え、奥へ流れる
    for (var j = 7; j >= 0; j--) {
      var zz = j + 1 - (camZ % 1);
      var f = 0.62 / zz;
      if (f < 0.04 || f > 0.3) continue;
      var y = HZ + f * (H - HZ);
      for (var s = -1; s <= 1; s += 2) {
        var x = W / 2 + s * 520 * f * 3.2;
        var sz = 260 * f * 3;
        game.draw.rect(x - sz * 0.06, y - sz * 0.8, sz * 0.12, sz * 0.8, BARK);
        game.draw.circle(x, y - sz * 0.95, sz * 0.5, LEAF);
        game.draw.circle(x - sz * 0.15, y - sz * 1.05, sz * 0.25, LEAF_L, 0.6);
        game.draw.rect(x - sz * 0.5, y - 2, sz, 4, INK, 0.25);
        game.draw.rect(x - sz * 0.5, y - sz * 1.5, sz, sz * 1.5, FOG, Math.max(0, 0.5 - f * 2));
      }
    }
  }

  function drawTree(tx, baseY, topY, side, el) {
    // 幹(ストリップ) + 枝 + 葉の茂み
    game.draw.rect(tx - 34, topY, 68, baseY - topY, BARK);
    game.draw.rect(tx - 34, topY, 16, baseY - topY, '#4e3420');
    game.draw.circle(tx, baseY + 8, 90, INK, 0.25);
    for (var i = 0; i < 6; i++) {
      var cx = tx + side * (i % 3) * 90 - side * 60, cy = H * 0.16 + Math.floor(i / 3) * 90;
      game.draw.circle(cx, cy, 120, LEAF);
      game.draw.circle(cx - 30, cy - 34, 60, LEAF_L, 0.5);
    }
    for (var a = 0; a < 5; a++) game.draw.circle(tx + side * (a * 70 - 120), H * 0.13 + (a % 2) * 110, 16, APPLE);
    // 雨上がりのしずく
    for (var d = 0; d < 3; d++) {
      var ph = (el * 0.9 + d * 0.37 + (side > 0 ? 0.2 : 0)) % 1;
      game.draw.rect(tx + side * (d * 80 - 60), H * 0.24 + ph * 260, 6, 16, PUDDLE, 1 - ph);
    }
  }

  function drawTrees(r) {
    var el = game.time.elapsed;
    // 奥の1本(真ん中の枝)
    var c = SPOTS[3];
    game.draw.rect(c.x - 16, c.y, 32, HZ + 50 - c.y, BARK);
    game.draw.circle(c.x, c.y - 60, 110, LEAF);
    game.draw.circle(c.x - 30, c.y - 90, 50, LEAF_L, 0.5);
    game.draw.rect(c.x - 120, c.y - 120, 240, 160, FOG, 0.18);
    drawTree(W * 0.2, H * 0.66, H * 0.2, -1, el);
    drawTree(W * 0.8, H * 0.66, H * 0.2, 1, el);
    // 枝(幹から各とまり場へ)
    for (var i = 0; i < SPOTS.length; i++) {
      if (i === 3) continue;
      var sp = SPOTS[i], tx = sp.x < W / 2 ? W * 0.2 : W * 0.8;
      game.draw.line(tx, sp.y + 40, sp.x, sp.y + 22, BARK, 22);
      game.draw.line(tx, sp.y + 40, sp.x, sp.y + 22, '#8a6a44', 6);
    }
    for (var k = 0; k < SPOTS.length; k++) {
      var s2 = SPOTS[k], sw = Math.sin(el * 2 + k) * 4;
      game.draw.rect(s2.x - 60 + sw, s2.y + 18, 120, 14, '#8a6a44');
      game.draw.circle(s2.x - 62 + sw, s2.y + 12, 26, LEAF_L);
      game.draw.circle(s2.x + 64 + sw, s2.y + 14, 22, LEAF);
    }
  }

  function drawRings(r) {
    var t = r.songT;
    for (var i = 0; i < r.hops.length; i++) {
      var h = r.hops[i];
      if (h.res !== '' || t < h.tLand - 0.6 || t > h.tLand + LATE) continue;
      var sp = SPOTS[h.spot];
      var q = Math.max(0, (h.tLand - t) / 0.6);
      var col = h.sync ? AMBER : CREAM;
      game.draw.circle(sp.x, sp.y, 70, col, 0.18);
      var rr = 70 + q * 170;
      for (var n = 0; n < 20; n++) {
        var a = n / 20 * Math.PI * 2;
        game.draw.rect(sp.x + Math.cos(a) * rr - 7, sp.y + Math.sin(a) * rr - 7, 14, 14, col);
      }
    }
  }

  function drawBeetle(r) {
    var t = r.songT, el = game.time.elapsed;
    // MISS の残像(白く光って大きく)
    for (var i = 0; i < r.hops.length; i++) {
      var h = r.hops[i];
      if (h.res === 'miss' && (h.fz > 0 || (h.endHalt && halt > 0))) {
        game.draw.circle(h.fx, h.fy, 110, '#ffffff', 0.35);
        game.draw.sprite(BEETLE[0], { h: '#ffffff', w: '#ffffff', k: MISSC, s: '#ffffff', g: '#ffffff', l: '#ffffff', f: '#ffffff' }, h.fx, h.fy, 14, { anchor: 'center' });
      }
    }
    if (r.caught) {
      var last = r.hops[r.hops.length - 1], sp = SPOTS[last.spot];
      game.draw.sprite(BEETLE[Math.floor(el * 8) % 2], BEE_PAL, sp.x, sp.y, 8, { anchor: 'center' });
      game.draw.circle(sp.x, sp.y, 90, CREAM, 0.3);
      for (var m = -2; m <= 2; m++) game.draw.line(sp.x + m * 34, sp.y - 85, sp.x + m * 30, sp.y + 85, CREAM, 3);
      return;
    }
    var p = beetlePos(r, t);
    var fr = p.fly ? 2 : (r.beatT > 0.07 ? 1 : 0);
    var sc = p.fly ? 8 + Math.sin(el * 30) : 8;
    game.draw.circle(p.x, p.y + 50, 30, INK, p.fly ? 0.12 : 0.25);
    game.draw.sprite(BEETLE[fr], BEE_PAL, p.x, p.y, sc, { anchor: 'center' });
    // 押さえた直後の網
    for (var j = 0; j < r.hops.length; j++) {
      var hh = r.hops[j];
      if (hh.res === 'hit' && hh.post < 0.2) {
        var s3 = SPOTS[hh.spot];
        game.draw.circle(s3.x, s3.y, 80, CREAM, 0.35 * (1 - hh.post / 0.2));
      }
    }
  }

  function drawKid(r) {
    var el = game.time.elapsed;
    var moving = Math.abs(r.kidVX) > 40;
    var fr =r.netT > 0 ? KID[2] : moving ? KID[Math.floor(el * 10) % 2] : KID[0];
    var kx = r.kidX, ky = KID_Y - Math.abs(Math.sin(el * (moving ? 12 : 3))) * (moving ? 14 : 5);
    game.draw.circle(kx, KID_Y + 80, 70, INK, 0.25);
    // 網の柄(押した所へ伸びる)
    var hx = kx + 60, hy = ky - 10;
    var nx = r.netT > 0 ? r.netX : kx + 110, ny = r.netT > 0 ? r.netY : ky - 170;
    game.draw.line(hx, hy, nx, ny + 40, BARK, 10);
    game.draw.circle(nx, ny, 58, CREAM, r.netT > 0 ? 0.4 : 0.22);
    for (var n = 0; n < 16; n++) {
      var a = n / 16 * Math.PI * 2;
      game.draw.rect(nx + Math.cos(a) * 58 - 5, ny + Math.sin(a) * 58 - 5, 10, 10, CREAM);
    }
    game.draw.sprite(fr, KID_PAL, kx, ky, 13, { anchor: 'center', flipX: r.kidVX < -40 });
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 232, INK, 0.55);
    txt(String(r.score), 36, 62, 50, CREAM, 'left');
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 66 - i * 74;
      if (i < LIVES - r.misses) game.draw.sprite(BEETLE[0], BEE_PAL, lx, 56, 3.4, { anchor: 'center' });
      else game.draw.rect(lx - 22, 52, 44, 8, MISSC);
    }
    // 追跡メーター: 子が甲虫へ迫る
    var x0 = 150, x1 = W - 150, prog = r.hits / r.hops.length;
    game.draw.rect(x0, 128, x1 - x0, 10, GRASS_D);
    game.draw.rect(x0, 128, (x1 - x0) * prog, 10, AMBER);
    game.draw.sprite(KID[0], KID_PAL, x0 + (x1 - x0) * prog, 120, 3.4, { anchor: 'center' });
    game.draw.sprite(BEETLE[0], BEE_PAL, x1 + 50, 126, 3.4, { anchor: 'center' });
    // 拍ランプ(4拍 + 裏の点)
    var k = Math.max(0, r.beatK), q = k % 4, hk = r.halfK;
    for (var b = 0; b < 4; b++) {
      var bx = W / 2 - 240 + b * 160;
      var on = b === q && r.beatT > 0 && k < r.beats;
      game.draw.rect(bx - 30, 180, 60, 30, on ? CREAM : '#3a3a30', on ? 1 : 0.9);
      var andOn = hk >= 0 && hk % 2 === 1 && Math.floor(hk / 2) % 4 === b && k < r.beats;
      game.draw.rect(bx + 66, 189, 14, 14, andOn ? AMBER : '#3a3a30');
    }
    if (r.combo >= 2) txt('x' + r.combo, W / 2, H * 0.715, 48, AMBER);
  }

  function scan() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, INK, 0.12);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.47, 110, won ? AMBER : MISSC);
      return;
    }
    game.draw.rect(70, H * 0.2, W - 140, H * 0.37, INK, 0.84);
    game.draw.rect(70, H * 0.2, W - 140, 10, won ? AMBER : MISSC);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 100, won ? AMBER : MISSC);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.325, 64, CREAM);
    txt('SCORE ' + run.score, W / 2, H * 0.38, 52, AMBER);
    txt('PERFECT ' + run.perfects, W * 0.34, H * 0.425, 40, CREAM);
    game.draw.circle(W * 0.64, H * 0.425 - 12, 18, AMBER);
    txt('x' + run.syncHits, W * 0.73, H * 0.425, 40, AMBER);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.475, 56, AMBER);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.475, 44, CREAM);
    if (!won) {
      var left = 0;
      for (var i = 0; i < run.hops.length; i++) if (run.hops[i].res !== 'hit') left++;
      txt('あと' + left + '回!', W / 2, H * 0.535, 50, AMBER);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, CREAM);
  }

  function drawAll(r) {
    drawSky();
    drawFloor(r);
    drawFarTrees(r);
    drawTrees(r);
    drawRings(r);
    drawBeetle(r);
    drawKid(r);
    scan();
    drawHud(r);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 16 });
      game.draw.rect(0, H * 0.58, W, 190, INK, 0.6);
      txt(GAME_TITLE, W / 2, H * 0.62, 104, AMBER);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.665, 40, CREAM);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, AMBER);
      else txt('TAP TO START', W / 2, H * 0.965, 44, CREAM);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.5), { color: [AMBER, CREAM, APPLE][Math.floor(game.random(0, 3))], count: 14, speed: 300 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(haltHop.fx, haltHop.fy, { text: 'MISS', flashColor: MISSC });
          haltHop.fz = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt, true);
        var lastT = CHART[CHART.length - 1][0] * SPB;
        if (run.caught && run.songT >= lastT + 0.45) {
          game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5]], { tempo: BPM, wave: 'square', volume: 0.06, bass: [['C3', 3]] });
          finish(true);
        } else if (run.songT >= SONG_BEATS * SPB + 0.3) finish(run.caught);
      }
    }

    drawAll(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 120, AMBER);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
