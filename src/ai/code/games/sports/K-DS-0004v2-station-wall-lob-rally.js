// K-DS-0004v2-station-wall-lob-rally.js
// 駅舎の壁打ち — 壁で跳ねた球が拍に乗って描く弧を横から読み、戻ってくる拍の頭にその落下点の床へラケットを置いて打ち返す
// 操作: 押した瞬間、押した横位置へ少年が踏み込んでラケットを振る(縦位置は問わない)。壁で跳ねた球は必ず拍の頭に打点へ戻る。高い弧は2拍、低い弧は1拍で戻る。落ちる0.55秒前から落下点の床に砂ぼこりの輪が縮む。打点から横に離れた位置・拍外れ・見送りはMISS(戻りから遠い空振りは罰なし)
// 終わり: 8小節(約18秒・11球)を打ち返し切ればCLEAR。MISSが3つでGAME OVER。後半は低く速い弧と、壁際⇔奥の振り幅が増える
// @mechanic: trajectory
// @theme: abandoned_station_wall_rally
// 世界観: 使われなくなった駅舎の外壁で、夕方の少年が軟らかい球を壁に当て、拍に乗って戻ってくる弧を読みながらホームの床で一人打ち返し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返した数・PERFECT数・最大コンボ・スコア
// スタイル: HD POST 3D
(function (game) {
  var STYLE = { bg: ['#2e2a28', '#6a5a4c', '#b49a7a'], main: ['#8a7a68', '#c4b296', '#4e443c'], accent: ['#ecc88e', '#c85a40'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色〜灰に寄せた低コントラスト。夕陽のブルーム(半透明円の重ね)と四辺のビネット
  var SKY0 = STYLE.bg[0], SKY1 = STYLE.bg[1], SKY2 = STYLE.bg[2];
  var PLASTER = STYLE.main[0], PLASTER_L = STYLE.main[1], PLASTER_D = STYLE.main[2];
  var GLOW = STYLE.accent[0], RUST = STYLE.accent[1];
  var INK = '#1c1816', CONC = '#7a7068', CONC_D = '#5c544e', WEED = '#6a7048', BALLC = '#d8d29a', MISSC = '#d4523e', PALE = '#efe4d0';

  var GAME_TITLE = 'STATION RALLY';
  var BPM = 104;
  var SPB = 60 / BPM;
  var SONG_BEATS = 32;                 // 0小節目はカウント(少年が拍の頭で球をつく)
  var TIME_LIMIT = 19;
  var PERF = 0.06, GOODW = 0.13, EDGE = 0.26, LATE = 0.15;
  var RX = 120;                        // 打点の横の許容(px)
  var LIVES = 3;
  var WALL_X = 190;                    // 駅舎の外壁の面
  var FLOOR_Y = H * 0.72;              // ホームの床
  var HIT_Y = FLOOR_Y - 70;            // 打点の高さ
  var ZONE_Y = H * 0.78;               // 親指ゾーン(ラケットを置く床の帯)
  var TELE = 0.55;

  // [壁に当たる拍, 戻る拍, 打点x]  すべて拍の頭(表拍)。差2=高い弧、差1=低い弧
  var CHART = [[4, 6, 620], [7, 9, 860], [10, 12, 440], [13, 14, 560], [15, 17, 900], [18, 19, 720], [20, 21, 400],
    [22, 24, 820], [25, 26, 520], [27, 28, 940], [29, 30, 660]];
  // デモ: [壁, 戻り, x, ゴーストの押す時刻ずれ, ゴーストの押す横ずれ]。3球目は手前に置いてMISS
  var DEMO_CHART = [[4, 6, 700, 0, 0], [7, 8, 460, 0, 0], [9, 11, 880, 0, -330], [12, 13, 600, 0, 0]];
  var DEMO_BEATS = 16;

  // 夕方の伴奏(独自)。表拍の4つ打ちに8分のハイハット
  var PHR = [
    [['A4', 1], ['C5', 0.5], ['D5', 0.5], ['F5', 1], ['E5', 1]],
    [['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['A4', 1]],
    [['F5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 0.5], ['E5', 0.5]],
    [['F5', 1.5], ['E5', 0.5], ['D5', 2]]
  ];
  var BAS = [
    [['D3', 1], ['A2', 1], ['D3', 1], ['A2', 1]],
    [['A#2', 1], ['F2', 1], ['C3', 1], ['G2', 1]],
    [['D3', 1], ['A2', 1], ['A#2', 1], ['F2', 1]],
    [['G2', 1], ['A2', 1], ['D3', 2]]
  ];

  // 少年(横向き・壁=左を向く)
  var BOY_IDLE = ['....hhhh....', '...hhhhhh...', '..hhffffh...', '..hfkfffh...', '...fffff....', '....ffff....', '...cccccc...', '..cccccccc..',
    '..ccccccc...', '..ccccccc...', '...pppppp...', '...pp..pp...', '...pp..pp...', '..bbb..bbb..'];
  var BOY_IDLE2 = ['............', '....hhhh....', '...hhhhhh...', '..hhffffh...', '..hfkfffh...', '...fffff....', '....ffff....', '...cccccc...',
    '..cccccccc..', '..ccccccc...', '...pppppp...', '...pp..pp...', '...pp..pp...', '..bbb..bbb..'];
  var BOY_RUN = ['....hhhh....', '...hhhhhh...', '..hhffffh...', '..hfkfffh...', '...fffff....', '....ffff....', '...cccccc...', '..cccccccc..',
    '..ccccccc...', '..ccccccc...', '...pppppp...', '..pp....pp..', '.pp......pp.', 'bb........bb'];
  var BOY_SWING = ['....hhhh....', '...hhhhhh...', '..hhffffh...', '..hfkfffh...', '...fffff....', '....ffff....', 'ffcccccc....', '..cccccccc..',
    '...cccccc...', '...cccccc...', '...pppppp...', '..pp...pp...', '.pp.....pp..', 'bbb.....bbb.'];
  var BOY_OOPS = ['....hhhh....', '...hhhhhh...', '..hhffffh...', '..hokfokh...', '...ffoff....', '....ffff....', 'f..cccccc..f', '..cccccccc..',
    '..ccccccc...', '..ccccccc...', '...pppppp...', '...pp..pp...', '...pp..pp...', '..bbb..bbb..'];
  var BOY_PAL = { h: '#3a2c24', f: '#d4a888', k: INK, o: '#ffffff', c: '#5d7a8c', p: '#4a4038', b: '#2a2420' };
  var DOVE = [['..gg...', '.gggk..', 'gggggr.', '.gggg..', '..y.y..'], ['..gg...', '.gggk..', 'gggggr.', '.gggg..', '.y..y..']];
  var DOVE_PAL = { g: '#8a8686', k: INK, r: '#b06048', y: '#c08a50' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltQ, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function newRun(chart, demo) {
    var rs = [];
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      var f = c[1] - c[0];
      rs.push({ w: c[0], L: c[1], x: c[2], f: f, tw: c[0] * SPB, tL: c[1] * SPB,
        hy: f >= 2 ? 640 + (i % 3) * 50 : 1000 + (i % 2) * 60,
        res: '', resT: 0, fz: 0, post: 0, fx: 0, fy: 0, sx: 360, hx: 0, hyy: 0, th: 0,
        gT: c[3] || 0, gX: c[4] || 0, tapped: false, thock: false, endHalt: false });
    }
    return {
      demo: demo, rs: rs, beats: demo ? DEMO_BEATS : SONG_BEATS,
      songT: 0, lastBeat: -1, lastBar: -1, lastHalf: -1, beatK: -1, beatT: 0,
      hits: 0, perfects: 0, goods: 0, drives: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false,
      boyX: 360, boyTX: 360, boyV: 0, swingT: 0, oopsT: 0, wallFx: 0, wallY: 700, finaleThock: false
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltQ = null; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  // ── 拍クロック(1本) ──
  function playBar(nb) {
    if (nb === 0) {
      game.audio.melody([['R', 3], ['A4', 0.5], ['C#5', 0.5]], { tempo: BPM, wave: 'triangle', volume: 0.05, bass: [['D3', 1], ['R', 1], ['D3', 1], ['A2', 1]], bassWave: 'triangle', bassVolume: 0.08 });
      return;
    }
    var i = (nb - 1) % PHR.length;
    game.audio.melody(PHR[i], { tempo: BPM, wave: 'triangle', volume: 0.06, bass: BAS[i], bassWave: 'square', bassVolume: 0.035 });
  }

  function beatDrum(k) {
    var pos = k % 4;
    if (pos === 0 || pos === 2) game.audio.tone(78, 0.13, { wave: 'sine', volume: 0.22 });
    else game.audio.tone(190, 0.05, { wave: 'square', volume: 0.05, slide: -60 });
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb < r.beats / 4) playBar(nb); }
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) {
      r.lastBeat = k; r.beatK = k;
      if (k < r.beats) { r.beatT = 0.18; if (loud) beatDrum(k); }
    }
    var hk = Math.floor(t / (SPB / 2));
    if (hk > r.lastHalf) { r.lastHalf = hk; if (loud && k < r.beats) game.audio.tone(2900, 0.012, { wave: 'square', volume: 0.012 }); }

    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res === '' && !q.thock && t >= q.tw && srcOf(r, i)) {
        q.thock = true; r.wallFx = 0.3; r.wallY = q.hy;
        if (loud) game.audio.tone(170, 0.07, { wave: 'sine', volume: 0.2, slide: -40 });
      }
      if (q.res === '' && t > q.tL + LATE) missRet(r, q, loud);
      if (q.res === 'miss') {
        if (q.fz > 0 && !q.endHalt) {
          q.fz -= dt;
          if (q.fz <= 0) game.feedback.bad(q.fx, q.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: MISSC });
        } else if (q.fz <= 0) q.post += dt;
      }
    }
    // 最後の1球は壁へ返して終わる
    var last = r.rs[r.rs.length - 1];
    if (last.res === 'hit' && !r.finaleThock && t >= last.tL + SPB) {
      r.finaleThock = true; r.wallFx = 0.3; r.wallY = 700;
      if (loud) game.audio.tone(170, 0.07, { wave: 'sine', volume: 0.2, slide: -40 });
    }
    var ox = r.boyX;
    r.boyX += (r.boyTX - r.boyX) * Math.min(1, dt * 16);
    r.boyV = (r.boyX - ox) / Math.max(dt, 0.001);
    if (r.beatT > 0) r.beatT -= dt;
    if (r.swingT > 0) r.swingT -= dt;
    if (r.oopsT > 0) r.oopsT -= dt;
    if (r.wallFx > 0) r.wallFx -= dt;
  }

  // 球がどこから壁へ向かうか(直前を打ち返した点 / MISS後は少年の手から新しい球)
  function srcOf(r, i) {
    var q = r.rs[i];
    if (i === 0) return { x: 320, y: HIT_Y - 60, t: q.tw - SPB };
    var pv = r.rs[i - 1];
    if (pv.res === 'hit') return { x: pv.hx, y: pv.hyy, t: pv.th };
    if (pv.res === 'miss') return { x: pv.sx, y: HIT_Y - 60, t: Math.max(q.tw - SPB, Math.min(pv.resT, q.tw - 0.15)) };
    return null;
  }

  function dribble(t) {
    var ph = (t / SPB) % 1;
    var hgt = 4 * ph * (1 - ph);       // 拍の頭で床に着く
    return { x: 320, y: FLOOR_Y - 20 - hgt * 170 };
  }

  function ballAt(r, t) {
    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res !== '') continue;
      var s = srcOf(r, i);
      if (!s) return null;
      if (t < s.t) return i === 0 ? dribble(t) : { x: s.x, y: s.y };
      if (t < q.tw) {
        var p = (t - s.t) / Math.max(0.05, q.tw - s.t);
        return { x: s.x + (WALL_X + 22 - s.x) * p, y: s.y + (q.hy - s.y) * p - 130 * 4 * p * (1 - p) };
      }
      var u = (t - q.tw) / (q.tL - q.tw);
      var A = q.f >= 2 ? 560 : 150;
      var y = q.hy + (HIT_Y - q.hy) * u - A * 4 * u * (1 - u);
      return { x: WALL_X + 22 + (q.x - WALL_X - 22) * u, y: Math.min(y, FLOOR_Y - 20) };
    }
    var last = r.rs[r.rs.length - 1];
    if (last.res === 'hit') {
      var tw2 = last.tL + SPB;
      if (t < tw2) {
        var p2 = (t - last.th) / Math.max(0.05, tw2 - last.th);
        return { x: last.hx + (WALL_X + 22 - last.hx) * p2, y: last.hyy + (700 - last.hyy) * p2 - 130 * 4 * p2 * (1 - p2) };
      }
      var v = Math.min(1, (t - tw2) / 0.6);
      return { x: WALL_X + 22 + v * 140, y: 700 + (FLOOR_Y - 20 - 700) * v * v };
    }
    return null;
  }

  function nextRet(r) {
    for (var i = 0; i < r.rs.length; i++) if (r.rs[i].res === '') return r.rs[i];
    return null;
  }

  function hitRet(r, q, d, loud) {
    var b = ballAt(r, r.songT) || { x: q.x, y: HIT_Y };
    q.res = 'hit'; q.resT = r.songT; q.th = r.songT; q.hx = b.x; q.hyy = Math.min(b.y, HIT_Y + 20); q.post = 0;
    var perfect = Math.abs(d) <= PERF;
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (perfect) r.perfects++; else r.goods++;
    if (q.f === 1) r.drives++;
    var gain = Math.round(((perfect ? 300 : 150) + r.combo * 20) * (q.f === 1 ? 1.3 : 1));
    r.score += gain;
    game.feedback.good(q.x, HIT_Y - 70, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GLOW : PALE, count: perfect ? 16 : 8, volume: loud ? 0.4 : 0 });
    game.fx.popup('+' + gain, q.x, HIT_Y - 210, { color: q.f === 1 ? GLOW : PALE, size: 44 });
    if (loud) game.audio.tone(392 * Math.pow(1.06, Math.min(r.combo, 12)), 0.07, { wave: 'square', volume: 0.05 });
    if (!r.demo && r.hits === 6 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 6', W / 2, H * 0.4, { color: GLOW, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missRet(r, q, loud) {
    if (q.res !== '') return;
    var b = ballAt(r, r.songT) || { x: q.x, y: HIT_Y };
    q.res = 'miss'; q.resT = r.songT; q.fz = 0.35; q.post = 0; q.fx = b.x; q.fy = b.y; q.sx = Math.max(WALL_X + 120, r.boyX);
    r.misses++; r.combo = 0; r.oopsT = 0.5;
    if (loud) game.audio.tone(120, 0.16, { wave: 'sawtooth', volume: 0.07, slide: -40 });
    if (!r.demo && r.misses >= LIVES) { q.endHalt = true; halt = 0.5; haltQ = q; }
  }

  // ラケットを置く: 押した横位置と時刻で判定
  function press(r, x, loud) {
    r.boyTX = Math.max(WALL_X + 120, Math.min(W - 90, x));
    r.swingT = 0.22;
    var best = null, bd = 99;
    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res !== '') continue;
      var dd = Math.abs(r.songT - q.tL);
      if (dd <= EDGE && dd < bd) { bd = dd; best = q; }
    }
    if (!best) {
      if (loud) game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.04, slide: -120 });
      game.fx.burst(x, FLOOR_Y, { color: CONC, count: 4, speed: 110 });
      return;
    }
    var d = r.songT - best.tL;
    if (Math.abs(d) <= GOODW && Math.abs(x - best.x) <= RX) hitRet(r, best, d, loud);
    else missRet(r, best, loud);
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
    var stats = { rallies: run.hits, total: CHART.length, drives: run.drives, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押した瞬間で判定 ──
  game.onPress(function (x, y) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(250, 0.03, { wave: 'square', volume: 0.03 }); return; }
    press(run, x, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 実ロジックで 高い弧→低い弧を打ち返し、3球目は手前に置いてMISS、4球目でまた返す ──
  var demo = { t: 0, run: null, hx: W / 2, hy: H * 0.86, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var q = nextRet(r);
    var tx = W * 0.62, ty = H * 0.86 + Math.sin(game.time.elapsed * 3) * 12;
    if (q) {
      var gx = q.x + q.gX;
      if (r.songT >= q.tL - 0.75) { tx = gx; ty = ZONE_Y + 110; }
      if (!q.tapped && r.songT >= q.tL + q.gT) { q.tapped = true; demo.press = 0.16; press(r, gx, audioOk); }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 9);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 9);
  }

  // ── 描画 ──
  function drawSky(el) {
    game.draw.gradient(0, FLOOR_Y, [[0, SKY0], [0.5, SKY1], [1, SKY2]]);
    // 夕陽のブルーム
    var sx = W * 0.8, sy = H * 0.46;
    game.draw.circle(sx, sy, 330, GLOW, 0.07);
    game.draw.circle(sx, sy, 210, GLOW, 0.12);
    game.draw.circle(sx, sy, 110, PALE, 0.28);
    game.draw.circle(sx, sy, 56, '#fff2dc', 0.85);
    // 遠い山並み(霧で潰す)
    for (var i = 0; i < 28; i++) {
      var hh = 70 + Math.sin(i * 1.3) * 36 + Math.sin(i * 0.47 + 1) * 40;
      game.draw.rect(i * 40, FLOOR_Y - 250 - hh, 42, hh + 10, '#7c6a5a', 0.55);
    }
    game.draw.rect(0, FLOOR_Y - 260, W, 30, SKY2, 0.35);
    // 電柱と電線(中景・ゆっくり流れる雲の影)
    for (var p = 0; p < 4; p++) {
      var px = 360 + p * 250;
      game.draw.rect(px, FLOOR_Y - 430, 10, 300, '#5a4c42', 0.8);
      game.draw.rect(px - 30, FLOOR_Y - 420, 70, 8, '#5a4c42', 0.8);
      if (p < 3) game.draw.line(px + 5, FLOOR_Y - 412, px + 255, FLOOR_Y - 412, '#4a3e36', 2);
    }
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 420 + el * 14) % (W + 500)) - 250;
      game.draw.rect(cx, H * 0.2 + c * 70, 300, 22, PLASTER_L, 0.14);
      game.draw.rect(cx + 60, H * 0.2 + c * 70 - 18, 180, 18, PLASTER_L, 0.1);
    }
    // 奥の線路(錆びたレールと枕木、雑草)
    game.draw.rect(0, FLOOR_Y - 120, W, 60, '#5e5248');
    for (var s = 0; s < 22; s++) game.draw.rect(s * 52 + 6, FLOOR_Y - 100, 30, 26, '#4a3c32');
    game.draw.rect(0, FLOOR_Y - 104, W, 6, RUST, 0.7);
    game.draw.rect(0, FLOOR_Y - 78, W, 6, RUST, 0.7);
    for (var g = 0; g < 30; g++) {
      var gx = g * 37 + 10, gh = 20 + (g * 7) % 26;
      game.draw.line(gx, FLOOR_Y - 60, gx + Math.sin(el * 2 + g) * 5, FLOOR_Y - 60 - gh, WEED, 4);
    }
  }

  function drawStation(r, el) {
    // 外壁(漆喰の剥がれ、横目地、雨どい、板を打った窓、空の掲示板)
    game.draw.rect(0, 250, WALL_X, FLOOR_Y - 250, PLASTER);
    game.draw.rect(WALL_X - 18, 250, 18, FLOOR_Y - 250, PLASTER_D);
    for (var y = 300; y < FLOOR_Y; y += 46) game.draw.rect(0, y, WALL_X - 18, 3, PLASTER_D, 0.5);
    game.draw.rect(20, 520, 90, 60, PLASTER_D, 0.6);
    game.draw.rect(40, 860, 70, 110, '#9a8a76', 0.5);
    game.draw.rect(30, 380, 110, 120, '#5a4636');
    game.draw.rect(30, 410, 110, 14, '#7a6450');
    game.draw.rect(30, 456, 110, 14, '#7a6450');
    game.draw.rect(24, 1040, 120, 150, '#6e5e50');
    game.draw.rect(34, 1050, 100, 130, '#8a7a66', 0.6);
    game.draw.rect(150, 260, 14, FLOOR_Y - 260, '#5a5048');
    // 軒(左上)と吊り灯(拍で灯る)
    game.draw.rect(0, 238, 560, 30, '#3e3430');
    game.draw.rect(0, 266, 560, 8, INK, 0.3);
    var k = Math.max(0, r ? r.beatK : 0);
    for (var b = 0; b < 4; b++) {
      var lx = 260 + b * 90;
      var on = r && r.beatT > 0 && k % 4 === b && k < r.beats;
      game.draw.line(lx, 268, lx, 300, '#2e2622', 3);
      if (on) { game.draw.circle(lx, 318, 60, GLOW, 0.16); game.draw.circle(lx, 318, 34, GLOW, 0.3); }
      game.draw.rect(lx - 14, 300, 28, 34, '#2e2622');
      game.draw.rect(lx - 9, 305, 18, 24, on ? '#fff0c8' : '#8a7660', on ? 1 : 0.8);
    }
    // 軒の鳩(2コマ)
    var fr = Math.floor(el * 2.5) % 2;
    game.draw.sprite(DOVE[fr], DOVE_PAL, 470, 222, 6, { anchor: 'center' });
    game.draw.sprite(DOVE[1 - fr], DOVE_PAL, 530, 224, 6, { anchor: 'center', flipX: true });
    // 壁に当たった瞬間の輪
    if (r && r.wallFx > 0) {
      var a = r.wallFx / 0.3;
      game.draw.circle(WALL_X, r.wallY, 70 + (1 - a) * 60, PALE, 0.3 * a);
      game.draw.rect(WALL_X - 6, r.wallY - 40, 6, 80, '#fff2dc', a);
    }
  }

  function drawFloor(r, el) {
    // ホームの床(上面)と手前の側面。親指ゾーンは少し明るく縁を光らせる
    game.draw.gradient(FLOOR_Y, H, [[0, CONC], [0.25, CONC_D], [1, '#3a3430']]);
    game.draw.rect(0, FLOOR_Y, W, 6, PALE, 0.5);
    for (var x = WALL_X + 60; x < W; x += 170) game.draw.rect(x, FLOOR_Y + 6, 3, 44, CONC_D, 0.8);
    game.draw.rect(0, FLOOR_Y + 50, W, 4, '#c8a858', 0.35);
    var pulse = r && r.beatT > 0 ? r.beatT / 0.18 : 0;
    game.draw.rect(WALL_X, ZONE_Y, W - WALL_X, 300, PALE, 0.05 + 0.05 * pulse);
    game.draw.rect(WALL_X, ZONE_Y, W - WALL_X, 4, GLOW, 0.35 + 0.3 * pulse);
    for (var g = 0; g < 8; g++) {
      var gx = WALL_X + 80 + g * 120;
      game.draw.line(gx, FLOOR_Y + 2, gx - 6 + Math.sin(el * 2 + g) * 4, FLOOR_Y - 18, WEED, 3);
    }
  }

  function drawTelegraph(r) {
    var t = r.songT;
    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res !== '' || t < q.tL - TELE || t > q.tL + LATE) continue;
      var a = Math.max(0, (q.tL - t) / TELE);
      var rr = 50 + a * 120;
      var col = q.f === 1 ? GLOW : PALE;
      for (var n = 0; n < 18; n++) {
        var an = n / 18 * Math.PI * 2;
        game.draw.rect(q.x + Math.cos(an) * rr - 6, FLOOR_Y + Math.sin(an) * rr * 0.22 - 3, 12, 6, col, 0.85);
      }
      game.draw.circle(q.x, ZONE_Y + 120, 26, col, 0.25 + (1 - a) * 0.4);
    }
  }

  function drawBall(r) {
    var t = r.songT;
    // MISS の球: 白く光って大きくなってから転がって消える
    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res !== 'miss') continue;
      if (q.fz > 0 || (q.endHalt && halt > 0)) {
        game.draw.circle(q.fx, q.fy, 64, '#ffffff', 0.4);
        game.draw.circle(q.fx, q.fy, 34, '#ffffff');
        game.draw.circle(q.fx, q.fy, 34, MISSC, 0.25);
      } else if (q.post < 1.6) {
        var mx = q.fx + q.post * 560, my = FLOOR_Y - 20 - Math.abs(Math.sin(q.post * 9)) * 90 * Math.exp(-q.post * 3);
        game.draw.circle(mx, my, 20, BALLC, Math.max(0, 1 - q.post / 1.6));
      }
    }
    var b = ballAt(r, t);
    if (!b) return;
    var near = Math.max(0, Math.min(1, (b.y - 400) / (FLOOR_Y - 400)));
    var sw = 18 + near * 26;
    game.draw.rect(b.x - sw, FLOOR_Y - 4, sw * 2, 10, INK, 0.12 + near * 0.3);
    game.draw.circle(b.x, b.y, 34, GLOW, 0.12);
    game.draw.circle(b.x, b.y, 22, BALLC);
    game.draw.circle(b.x - 7, b.y - 7, 8, '#fffbe8', 0.8);
    game.draw.rect(b.x - 20, b.y + 2, 40, 4, '#a8a070', 0.6);
  }

  function drawBoy(r, el) {
    var bx = r.boyX + 64;
    var moving = Math.abs(r.boyV) > 60;
    var spr = r.oopsT > 0 ? BOY_OOPS : r.swingT > 0 ? BOY_SWING : moving ? BOY_RUN : (Math.floor(el * 3) % 2 ? BOY_IDLE2 : BOY_IDLE);
    game.draw.rect(bx - 54, FLOOR_Y - 6, 108, 12, INK, 0.3);
    game.draw.sprite(spr, BOY_PAL, bx, FLOOR_Y - 63, 9, { anchor: 'center' });
    // ラケット(打点 = 少年の左前)
    var sw = r.swingT > 0 ? r.swingT / 0.22 : 0;
    var hx = r.boyX + (sw > 0 ? -10 : 18), hy = HIT_Y - (sw > 0 ? 50 * sw : -30);
    game.draw.line(bx - 40, FLOOR_Y - 70, hx + 14, hy + 30, '#4a3a2a', 7);
    game.draw.circle(hx, hy, 36, '#ffffff', sw > 0 ? 0.35 : 0.12);
    for (var n = 0; n < 14; n++) {
      var an = n / 14 * Math.PI * 2;
      game.draw.rect(hx + Math.cos(an) * 34 - 4, hy + Math.sin(an) * 40 - 4, 8, 8, RUST);
    }
  }

  function drawPost() {
    // 褐色に寄せてコントラストを潰し、四辺をビネットで落とす
    game.draw.rect(0, 0, W, H, '#5a3a20', 0.08);
    game.draw.rect(0, 0, 70, H, INK, 0.3);
    game.draw.rect(W - 70, 0, 70, H, INK, 0.3);
    game.draw.rect(0, 0, W, 60, INK, 0.25);
    game.draw.rect(0, H - 80, W, 80, INK, 0.3);
    game.draw.rect(0, 0, 150, H, INK, 0.1);
    game.draw.rect(W - 150, 0, 150, H, INK, 0.1);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 232, INK, 0.55);
    txt(String(r.score), 90, 92, 54, PALE, 'left');
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 110 - i * 76;
      if (i < LIVES - r.misses) { game.draw.circle(lx, 74, 22, BALLC); game.draw.circle(lx - 6, 68, 7, '#fffbe8', 0.8); }
      else game.draw.rect(lx - 22, 70, 44, 8, MISSC);
    }
    txt(r.hits + ' / ' + r.rs.length, W - 90, 168, 40, GLOW, 'right');
    var prog = Math.min(1, r.songT / (r.beats * SPB));
    game.draw.rect(90, 196, W * 0.5, 10, PLASTER_D);
    game.draw.rect(90, 196, W * 0.5 * prog, 10, GLOW);
    var k = Math.max(0, r.beatK);
    for (var b = 0; b < 4; b++) {
      var on = b === k % 4 && r.beatT > 0 && k < r.beats;
      game.draw.circle(130 + b * 62, 160, on ? 18 : 12, on ? GLOW : '#5a4c42');
    }
    if (r.combo >= 2) txt('x' + r.combo, W / 2, H * 0.17, 46, GLOW);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 110, won ? GLOW : MISSC);
      return;
    }
    game.draw.rect(80, H * 0.22, W - 160, H * 0.36, INK, 0.82);
    game.draw.rect(80, H * 0.22, W - 160, 10, won ? GLOW : MISSC);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 100, won ? GLOW : MISSC);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.345, 64, PALE);
    txt('SCORE ' + run.score, W / 2, H * 0.4, 52, GLOW);
    txt('PERFECT ' + run.perfects + '   x' + run.maxCombo, W / 2, H * 0.445, 40, PALE);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.495, 56, GLOW);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.495, 44, PALE);
    if (!won) txt('あと' + Math.max(1, CHART.length - run.hits) + '球!', W / 2, H * 0.55, 50, GLOW);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, PALE);
  }

  function drawAll(r) {
    var el = game.time.elapsed;
    drawSky(el);
    drawStation(r, el);
    drawFloor(r, el);
    drawTelegraph(r);
    drawBoy(r, el);
    drawBall(r);
    drawPost();
    drawHud(r);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 16 });
      game.draw.rect(0, 0, W, 232, INK, 0.75);
      txt(GAME_TITLE, W / 2, 120, 92 + Math.sin(game.time.elapsed * 3) * 3, GLOW);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 196, 38, PALE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.93, 46, GLOW);
      else txt('TAP TO START', W / 2, H * 0.93, 44, PALE);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(260, W - 120), game.random(H * 0.25, H * 0.55), { color: [GLOW, PALE, BALLC][Math.floor(game.random(0, 3))], count: 14, speed: 300 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(haltQ.fx, haltQ.fy, { text: 'MISS', flashColor: MISSC });
          haltQ.fz = 0; haltQ.endHalt = false;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt, true);
        if (run.songT >= SONG_BEATS * SPB || run.songT >= TIME_LIMIT) finish(run.misses < LIVES);
      }
    }

    drawAll(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 120, GLOW);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
