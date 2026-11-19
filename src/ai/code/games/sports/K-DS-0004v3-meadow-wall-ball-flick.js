// K-DS-0004v3-meadow-wall-ball-flick.js
// 石垣の木球弾き — 牧草地の石垣から跳ね返ってきた木の球を、拍の頭(後半は3+3+2の食い)で上へ弾き、光っている印の高さに届く勢いで打ち返し続ける
// 操作: 画面を押して上へ払い、離した瞬間に球を弾く。払った長さが勢い=石垣のどの高さ(下・中・上の3つの印)に当たるかになる(払っている間、右のゲージと石垣の上に届く先が出る)。球が手元に戻る拍の点で離すと判定。光っていない高さ・拍外れ・見送りはMISS(球は転がり落ち、籠の予備の球で続ける)。戻りから遠い空振りは罰なし
// 終わり: 8小節(約19秒・18球)を弾き切ればCLEAR。MISSが3つ(予備の球が尽きる)でGAME OVER。3小節目から3+3+2の食いのリズムになる(上の譜面帯に次の小節の打点が見える)
// @mechanic: flick_launch
// @theme: highland_pasture_stone_wall_flick
// 世界観: 高原の牧草地の段々の石垣の前で、羊飼いの少女が木の球を石垣へ弾き当て、戻ってくる球を拍に乗せて光る石の印へ弾き返し続けて遊ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き返した数・食いの拍で返した数・PERFECT数・最大コンボ・スコア
// スタイル: PIXEL HD
(function (game) {
  var STYLE = { bg: ['#8ec8f0', '#d8eef8', '#f4f0e0'], main: ['#5aa04a', '#8a8478', '#d8584a'], accent: ['#ffd65a', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 遠景の雪山・中景の丘と羊・近景の石垣と草の3層以上のパララックス。光源は左上の朝日(石の左上が明るく右下に影)
  var SKY0 = STYLE.bg[0], SKY1 = STYLE.bg[1], MIST = STYLE.bg[2];
  var GRASS = STYLE.main[0], STONE = STYLE.main[1], SCARF = STYLE.main[2];
  var GOLD = STYLE.accent[0], WHITE = STYLE.accent[1];
  var INK = '#1e2a22', GRASS_D = '#3f7a38', GRASS_L = '#8ccc6a', STONE_L = '#bab4a6', STONE_D = '#5c564c', MOUNT = '#7a90b8', SNOW = '#f0f4ff';
  var WOOD = '#c08a50', WOOD_D = '#7a5430', MISSC = '#e8483a';
  var MARK_COL = ['#7fe0ff', '#ffd65a', '#ff9a6a'];

  var GAME_TITLE = 'MEADOW FLICK';
  var BPM = 100;
  var SPB = 60 / BPM;
  var SONG_BEATS = 32;
  var TIME_LIMIT = 20;
  var PERF = 0.06, GOODW = 0.13, EDGE = 0.26, LATE = 0.15;
  var LIVES = 3;
  var WALL_BASE = 1010, GROUND0 = 1480, HAND_H = 200;
  var MARK_H = [214, 536, 857];          // 下・中・上の印の高さ(壁の位置での見かけ y=920/785/650)
  var LV_DY = [60, 220, 400];            // 払いの長さの境目(px)
  var GAUGE_X = 880, GAUGE_Y0 = 1660, GAUGE_LEN = 520;

  // [戻る拍(.5 は食い), 光る印]。1〜2小節は2拍ごと、3小節目から 3+3+2 の食い
  var CHART = [[4, 1], [6, 0], [8, 2], [10, 1],
    [12, 0], [13.5, 1], [15, 2], [16, 1], [17.5, 1], [19, 0], [20, 2], [21.5, 0], [23, 1],
    [24, 2], [25.5, 2], [27, 1], [28, 0], [29.5, 2]];
  // デモ: [拍, 印, ゴーストの勢い, ゴーストの時刻ずれ]。4球目は勢い不足でMISS
  var DEMO_CHART = [[4, 1, 1, 0], [6, 0, 0, 0], [7.5, 2, 2, 0], [9, 1, 0, 0]];
  var DEMO_BEATS = 12;

  // 高原の伴奏(独自)。1〜2小節は4分のベース、3小節目から 3+3+2 のベースと食う旋律
  var MEL = [
    [['G4', 1], ['B4', 1], ['D5', 1], ['B4', 1]],
    [['C5', 1], ['E5', 1], ['D5', 2]],
    [['G5', 1.5], ['E5', 1.5], ['D5', 1]],
    [['C5', 0.5], ['D5', 1], ['E5', 1], ['D5', 0.5], ['B4', 1]],
    [['A4', 1.5], ['C5', 1.5], ['B4', 1]],
    [['D5', 0.5], ['G5', 1], ['F#5', 1], ['E5', 0.5], ['D5', 1]],
    [['G5', 1.5], ['D5', 1.5], ['G5', 1]]
  ];
  var BASS = [
    [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1]],
    [['C3', 1], ['G2', 1], ['D3', 2]],
    [['G2', 1.5], ['G2', 1.5], ['D3', 1]],
    [['C3', 1.5], ['C3', 1.5], ['D3', 1]],
    [['E3', 1.5], ['E3', 1.5], ['C3', 1]],
    [['D3', 1.5], ['D3', 1.5], ['G2', 1]],
    [['G2', 1.5], ['G2', 1.5], ['D3', 1]]
  ];

  // 少女(後ろ姿)。0=待機 1=待機2 2=構え 3=弾く 4=しまった
  var GIRL = [
    ['....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '..rrhhhhrr..', '...hhhhhh...', '...hhbbhh...', '....hbbh....', '...dddddd...',
      '..ddddbddd..', '.sdddddddds.', '.s.dddddd.s.', '...dddddd...', '..dddddddd..', '..dddddddd..', '...ll..ll...', '...ll..ll...', '..kk....kk..'],
    ['............', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '..rrhhhhrr..', '...hhhhhh...', '...hhbbhh...', '...dddbdd...',
      '..ddddbddd..', '.sdddddddds.', '.s.dddddd.s.', '...dddddd...', '..dddddddd..', '..dddddddd..', '...ll..ll...', '...ll..ll...', '..kk....kk..'],
    ['....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '..rrhhhhrr..', '...hhhhhh...', '...hhbbhh...', '....hbbh....', '...dddddd...',
      '..ddddbddd..', '..ddddddddss', '...dddddd.s.', '...dddddd...', '..dddddddd..', '..dddddddd..', '...ll..ll...', '..ll....ll..', '.kk......kk.'],
    ['..........s.', '....rrrr..s.', '...rrrrrr.s.', '..rrrrrrrrs.', '..rrhhhhrrs.', '...hhhhhhs..', '...hhbbhh...', '....hbbh....',
      '...dddddd...', '.sddddbddd..', '.s.dddddd...', '...dddddd...', '..dddddddd..', '..dddddddd..', '...ll..ll...', '...ll..ll...', '..kk....kk..'],
    ['.s..rrrr..s.', '.s.rrrrrr.s.', '..rrrrrrrr..', '..rrhhhhrr..', '...hhhhhh...', '...hhbbhh...', '....hbbh....', '...dddddd...',
      '..ddddbddd..', '..dddddddd..', '...dddddd...', '...dddddd...', '..dddddddd..', '..dddddddd..', '...ll..ll...', '...ll..ll...', '..kk....kk..']
  ];
  var GIRL_PAL = { r: SCARF, h: '#6a4428', b: '#4a2c18', d: '#4a6aa8', s: '#f0c8a0', l: '#f4f0e8', k: '#3a2a1e' };
  var DOG = [
    ['.......ww.', '......wkkw', 't.....wwww', '.t...wwbw.', '.bbbbbbbw.', 'bbbwwbbbb.', '.bb....bb.', '.ww....ww.'],
    ['.t.....ww.', '.t....wkkw', 't.....wwww', '.....wwbw.', '.bbbbbbbw.', 'bbbwwbbbb.', '.bb....bb.', '.ww....ww.']
  ];
  var DOG_PAL = { w: '#f4f0e8', k: INK, b: '#3a3030', t: '#3a3030' };
  var SHEEP = [['.wwwww..', 'wwwwwwwk', 'wwwwwwkk', '.l..l...'], ['.wwwww..', 'wwwwwww.', 'wwwwwwkk', '.l..l.kk']];
  var SHEEP_PAL = { w: '#f8f6ee', k: '#3a3a3a', l: '#3a3a3a' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltQ, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function zY(z) { return GROUND0 + (WALL_BASE - GROUND0) * z; }
  function zS(z) { return 1 + (0.42 - 1) * z; }
  function proj(z, h) { var s = zS(z); return { x: W / 2, y: zY(z) - h * s, s: s }; }
  function markPos(k) { return proj(1, MARK_H[k]); }

  function newRun(chart, demo) {
    var rs = [];
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      rs.push({ beat: c[0], h: c[1], tR: c[0] * SPB, sync: c[0] % 1 !== 0, res: '', resT: 0, lv: 1, fz: 0, post: 0, fx: 0, fy: 0, fs: 1,
        gL: c[2] === undefined ? c[1] : c[2], gT: c[3] || 0, gDone: false, gStart: false, impact: false, bounce: false, endHalt: false });
    }
    return {
      demo: demo, rs: rs, beats: demo ? DEMO_BEATS : SONG_BEATS,
      songT: 0, lastBeat: -1, lastBar: -1, lastHalf: -1, beatK: -1, beatT: 0,
      hits: 0, syncHits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false,
      drag: null, poseT: 0, pose: 0, flashK: -1, flashT: 0, finImpact: false
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltQ = null; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  // ── 拍クロック(1本)と伴奏 ──
  function syncBar(nb) { return nb >= 3; }
  function playBar(nb) {
    if (nb === 0) {
      game.audio.melody([['R', 3], ['D5', 1]], { tempo: BPM, wave: 'triangle', volume: 0.05, bass: [['G2', 1], ['R', 1], ['G2', 1], ['D3', 1]], bassWave: 'triangle', bassVolume: 0.08 });
      return;
    }
    var i = Math.min(nb - 1, MEL.length - 1);
    game.audio.melody(MEL[i], { tempo: BPM, wave: 'triangle', volume: 0.06, bass: BASS[i], bassWave: 'square', bassVolume: 0.035 });
  }

  function halfDrum(hk) {
    var nb = Math.floor(hk / 8), pos = hk % 8;
    if (nb === 0) { if (pos % 2 === 0) game.audio.tone(pos === 0 ? 2200 : 1700, 0.025, { wave: 'square', volume: 0.03 }); return; }
    var kick = syncBar(nb) ? (pos === 0 || pos === 3 || pos === 6) : (pos === 0 || pos === 4);
    var snare = syncBar(nb) ? pos === 4 : (pos === 2 || pos === 6);
    if (kick) game.audio.tone(82, 0.12, { wave: 'sine', volume: 0.22 });
    if (snare) game.audio.tone(210, 0.05, { wave: 'square', volume: 0.05, slide: -70 });
    game.audio.tone(3100, 0.01, { wave: 'square', volume: 0.01 });
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb < r.beats / 4) playBar(nb); }
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) { r.lastBeat = k; r.beatK = k; if (k < r.beats) r.beatT = 0.16; }
    var hk = Math.floor(t / (SPB / 2));
    if (hk > r.lastHalf) { r.lastHalf = hk; if (loud && k < r.beats) halfDrum(hk); }

    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res === '') {
        var f = flightOf(r, i);
        if (f && !q.impact && t >= f.tw) {
          q.impact = true;
          r.flashK = f.lv; r.flashT = 0.3;
          if (loud) game.audio.tone(f.ok ? 660 + f.lv * 220 : 300, 0.08, { wave: 'triangle', volume: 0.12 });
          if (f.ok) game.fx.burst(W / 2, markPos(f.lv).y, { color: MARK_COL[f.lv], count: 10, speed: 220 });
        }
        if (f && !q.bounce && t >= f.tw + 0.45 * (q.tR - f.tw)) {
          q.bounce = true;
          if (loud) game.audio.tone(140, 0.05, { wave: 'sine', volume: 0.12 });
        }
        if (t > q.tR + LATE) missRet(r, q, loud);
      }
      if (q.res === 'miss') {
        if (q.fz > 0 && !q.endHalt) {
          q.fz -= dt;
          if (q.fz <= 0) game.feedback.bad(q.fx, q.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8, flashColor: MISSC });
        } else if (q.fz <= 0) q.post += dt;
      }
    }
    var last = r.rs[r.rs.length - 1];
    if (last.res === 'hit' && !r.finImpact && t >= (last.resT + last.tR + SPB) / 2) {
      r.finImpact = true; r.flashK = last.lv; r.flashT = 0.4;
      if (loud) game.audio.tone(660 + last.lv * 220, 0.1, { wave: 'triangle', volume: 0.12 });
      game.fx.burst(W / 2, markPos(last.lv).y, { color: MARK_COL[last.lv], count: 16, speed: 260 });
    }
    if (r.beatT > 0) r.beatT -= dt;
    if (r.poseT > 0) r.poseT -= dt;
    if (r.flashT > 0) r.flashT -= dt;
  }

  // 返ってくる球の飛行: どこから(放った時刻)・どの高さへ
  function flightOf(r, i) {
    var q = r.rs[i];
    var t0, lv, ok = true;
    if (i === 0) { t0 = 2 * SPB; lv = 1; }
    else {
      var pv = r.rs[i - 1];
      if (pv.res === 'hit') { t0 = pv.resT; lv = pv.lv; }
      else if (pv.res === 'miss') { t0 = Math.min(pv.resT + 0.12, q.tR - 0.3); lv = 1; }
      else return null;
    }
    return { t0: t0, tw: (t0 + q.tR) / 2, lv: lv, ok: ok };
  }

  function ballAt(r, t) {
    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res !== '') continue;
      var f = flightOf(r, i);
      if (!f) return null;
      if (t < f.t0) {
        var bob = Math.abs(Math.sin(Math.PI * t / SPB));
        return proj(0, HAND_H + bob * 70);
      }
      var hm = MARK_H[f.lv];
      if (t < f.tw) {
        var p = (t - f.t0) / Math.max(0.05, f.tw - f.t0);
        return proj(p, HAND_H + (hm - HAND_H) * p + 120 * 4 * p * (1 - p));
      }
      var u = (t - f.tw) / Math.max(0.05, q.tR - f.tw);
      return proj(1 - u, retH(hm, u));
    }
    var last = r.rs[r.rs.length - 1];
    if (last.res === 'hit') {
      var tw2 = (last.resT + last.tR + SPB) / 2;
      var hm2 = MARK_H[last.lv];
      if (t < tw2) {
        var p2 = (t - last.resT) / Math.max(0.05, tw2 - last.resT);
        return proj(p2, HAND_H + (hm2 - HAND_H) * p2 + 120 * 4 * p2 * (1 - p2));
      }
      var v = Math.min(1, (t - tw2) / 0.45);
      return proj(1 - v * 0.12, hm2 * (1 - v * v));
    }
    return null;
  }

  function retH(hm, u) {
    if (u < 0.45) { var a = u / 0.45; return hm * (1 - a * a); }
    var q = (u - 0.45) / 0.55;
    return Math.max(0, HAND_H * q + 240 * 4 * q * (1 - q));
  }

  function pending(r) {
    for (var i = 0; i < r.rs.length; i++) if (r.rs[i].res === '') return r.rs[i];
    return null;
  }

  function levelOf(dy) {
    if (dy < LV_DY[0]) return -1;
    if (dy < LV_DY[1]) return 0;
    if (dy < LV_DY[2]) return 1;
    return 2;
  }

  function hitRet(r, q, d, lv, loud) {
    q.res = 'hit'; q.resT = r.songT; q.lv = lv;
    var perfect = Math.abs(d) <= PERF;
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo);
    if (q.sync) r.syncHits++;
    if (perfect) r.perfects++; else r.goods++;
    var gain = Math.round(((perfect ? 300 : 150) + r.combo * 20) * (q.sync ? 1.5 : 1));
    r.score += gain;
    var hp = proj(0, HAND_H);
    game.feedback.good(hp.x, hp.y - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : WHITE, count: perfect ? 16 : 8, volume: loud ? 0.4 : 0 });
    game.fx.popup('+' + gain, hp.x + 170, hp.y - 160, { color: q.sync ? GOLD : WHITE, size: 44 });
    if (loud) game.audio.tone(330 + lv * 130 + Math.min(r.combo, 10) * 12, 0.08, { wave: 'square', volume: 0.06, slide: 240 });
    if (!r.demo && r.hits === 9 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 9', W / 2, H * 0.36, { color: GOLD, size: 84 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missRet(r, q, loud) {
    if (q.res !== '') return;
    var b = ballAt(r, r.songT) || proj(0, HAND_H);
    q.res = 'miss'; q.resT = r.songT; q.fz = 0.35; q.post = 0; q.fx = b.x; q.fy = b.y; q.fs = b.s;
    r.misses++; r.combo = 0; r.pose = 4; r.poseT = 0.5;
    if (loud) game.audio.tone(115, 0.16, { wave: 'sawtooth', volume: 0.07, slide: -40 });
    if (!r.demo && r.misses >= LIVES) { q.endHalt = true; halt = 0.5; haltQ = q; }
  }

  // ── 弾く(押す→上へ払う→離す)。勢い=払った長さ、判定=離した時刻 ──
  function flickStart(r, x, y) { r.drag = { x0: x, y0: y, x: x, y: y, lv: -1 }; r.pose = 2; r.poseT = 9; }
  function flickMove(r, x, y) {
    if (!r.drag) return false;
    r.drag.x = x; r.drag.y = y;
    var lv = levelOf(r.drag.y0 - y);
    var changed = lv !== r.drag.lv;
    r.drag.lv = lv;
    return changed;
  }
  function flickRelease(r, x, y, loud) {
    if (!r.drag) return;
    var lv = levelOf(r.drag.y0 - y);
    r.drag = null; r.pose = 3; r.poseT = 0.25;
    var best = null, bd = 99;
    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res !== '') continue;
      var dd = Math.abs(r.songT - q.tR);
      if (dd <= EDGE && dd < bd) { bd = dd; best = q; }
    }
    if (!best) {
      if (loud) game.audio.tone(300, 0.04, { wave: 'triangle', volume: 0.04, slide: -100 });
      return;
    }
    var d = r.songT - best.tR;
    if (Math.abs(d) <= GOODW && lv === best.h) hitRet(r, best, d, lv, loud);
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
    var stats = { returns: run.hits, total: CHART.length, syncHits: run.syncHits, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onPress(function (x, y) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(250, 0.03, { wave: 'square', volume: 0.03 }); return; }
    flickStart(run, x, y);
    game.audio.tone(520, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !run.drag) return;
    if (flickMove(run, x, y) && run.drag.lv >= 0) game.audio.tone(440 + run.drag.lv * 160, 0.03, { wave: 'square', volume: 0.03 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !run.drag) return;
    if (over || halt > 0 || readyT > 0) { run.drag = null; return; }
    game.fx.burst(x, y, { color: WHITE, count: 3, speed: 90 });
    flickRelease(run, x, y, true);
  });
  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 実ロジックで 中→下→(食いで)上 と弾き返し、4球目は勢い不足でMISS ──
  var demo = { t: 0, run: null, hx: W / 2, hy: H * 0.86, press: false };
  var DEMO_DY = [150, 310, 480];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var q = pending(r);
    var tx = W * 0.42, ty = H * 0.86 + Math.sin(game.time.elapsed * 3) * 12;
    demo.press = false;
    if (q && !q.gDone) {
      var tRel = q.tR + q.gT, t0 = tRel - 0.2;
      var dy = DEMO_DY[q.gL];
      if (r.songT >= t0 - 0.4) { tx = W * 0.42; ty = 1640; }
      if (r.songT >= t0) {
        if (!q.gStart) { q.gStart = true; flickStart(r, W * 0.42, 1640); }
        var a = Math.min(1, (r.songT - t0) / 0.2);
        tx = W * 0.42; ty = 1640 - dy * a;
        flickMove(r, tx, ty);
        demo.press = true;
        if (r.songT >= tRel) { q.gDone = true; flickRelease(r, tx, 1640 - dy, audioOk); }
      }
    }
    demo.hx += (tx - demo.hx) * Math.min(1, dt * (demo.press ? 40 : 9));
    demo.hy += (ty - demo.hy) * Math.min(1, dt * (demo.press ? 40 : 9));
  }

  // ── 描画 ──
  function drawSky(el) {
    var sway = Math.sin(el * 0.25);
    game.draw.gradient(0, WALL_BASE, [[0, SKY0], [0.75, SKY1], [1, MIST]]);
    // 朝日(左上の光源)
    game.draw.circle(170, 330, 150, WHITE, 0.18);
    game.draw.circle(170, 330, 90, '#fff8d8', 0.45);
    game.draw.circle(170, 330, 54, '#fffbe8');
    // 層1: 雪山(ほぼ動かない)
    var o1 = sway * 6;
    for (var m = 0; m < 6; m++) {
      var mx = m * 220 - 60 + o1, top = 330 + (m % 2) * 60 + (m === 3 ? -40 : 0);
      for (var y = top; y < 500; y += 6) {
        var hw = (y - top) * 1.15;
        game.draw.rect(mx - hw, y, hw * 2, 6, MOUNT);
        if (y < top + 60) game.draw.rect(mx - hw, y, hw * 2, 6, SNOW, 0.9);
        game.draw.rect(mx + hw * 0.1, y, hw * 0.9, 6, '#5e7298', 0.35);
      }
    }
    // 雲
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 + el * 16) % (W + 360)) - 180, cy = 300 + c * 55;
      game.draw.rect(cx, cy, 200, 16, WHITE, 0.7);
      game.draw.rect(cx + 30, cy - 14, 120, 14, WHITE, 0.7);
    }
    // 層2: 丘と羊と小屋
    var o2 = sway * 14;
    game.draw.rect(0, 600, W, WALL_BASE - 600, GRASS_L);
    for (var hx = -2; hx < 12; hx++) game.draw.circle(hx * 110 + o2, 640 + (hx % 3) * 16, 90, GRASS_L);
    game.draw.rect(0, 620, W, 8, '#a8dc84', 0.6);
    game.draw.rect(760 + o2, 590, 80, 50, '#a87850');
    game.draw.rect(750 + o2, 576, 100, 16, '#7a4a30');
    game.draw.rect(790 + o2, 610, 20, 30, '#4a3020');
    var sf = Math.floor(el * 1.5) % 2;
    game.draw.sprite(SHEEP[sf], SHEEP_PAL, 260 + o2, 690, 6, { anchor: 'center' });
    game.draw.sprite(SHEEP[1 - sf], SHEEP_PAL, 420 + o2, 720, 6, { anchor: 'center', flipX: true });
    game.draw.sprite(SHEEP[sf], SHEEP_PAL, 930 + o2, 700, 5, { anchor: 'center' });
  }

  function drawWall(r, el) {
    var o3 = Math.sin(el * 0.25) * 22;
    // 層3: 段々の石垣(上に草)
    game.draw.rect(0, 560, W, 20, GRASS_D);
    for (var gx = 0; gx < W; gx += 18) game.draw.rect(gx + (o3 % 18), 548 + (gx % 36 === 0 ? 0 : 6), 8, 16, GRASS);
    var row = 0;
    for (var y = 580; y < WALL_BASE; y += 54) {
      var off = (row % 2) * 60;
      for (var x = -120 + off; x < W + 60; x += 120) {
        var sx = x + o3 * 0.3, w2 = 112 - ((x + row * 7) % 3) * 6;
        game.draw.rect(sx, y, w2, 48, STONE_D);
        game.draw.rect(sx, y, w2 - 6, 42, STONE);
        game.draw.rect(sx, y, w2 - 6, 6, STONE_L);
        game.draw.rect(sx, y, 6, 42, STONE_L, 0.7);
      }
      row++;
    }
    game.draw.rect(0, WALL_BASE - 10, W, 10, STONE_D, 0.6);
    // 光る石の印(下・中・上)
    var cur = r ? pending(r) : null;
    for (var k = 0; k < 3; k++) {
      var mp = markPos(k);
      var lit = cur && cur.h === k;
      var pulse = 0.5 + 0.5 * Math.sin(el * 10);
      if (lit) {
        game.draw.circle(mp.x, mp.y, 96 + pulse * 14, MARK_COL[k], 0.22);
        game.draw.circle(mp.x, mp.y, 64, MARK_COL[k], 0.4);
      }
      game.draw.rect(mp.x - 44, mp.y - 30, 88, 60, STONE_D);
      game.draw.rect(mp.x - 40, mp.y - 26, 80, 52, lit ? MARK_COL[k] : '#a8a296');
      game.draw.rect(mp.x - 40, mp.y - 26, 80, 8, WHITE, lit ? 0.8 : 0.3);
      game.draw.rect(mp.x - 22, mp.y - 8, 44, 16, lit ? WHITE : MARK_COL[k], lit ? 0.9 : 0.45);
      if (r && r.flashT > 0 && r.flashK === k) game.draw.circle(mp.x, mp.y, 70 + (0.3 - r.flashT) * 200, WHITE, Math.min(1, r.flashT * 3) * 0.6);
    }
  }

  function drawMeadow(r, el) {
    game.draw.gradient(WALL_BASE, H, [[0, GRASS], [0.6, GRASS_D], [1, '#2e5a2a']]);
    // 遠近の草の筋と花
    for (var i = 0; i < 9; i++) {
      var z = i / 9, y = zY(z);
      game.draw.rect(0, y, W, 3, GRASS_L, 0.25);
    }
    for (var f = 0; f < 26; f++) {
      var fz = ((f * 0.37) % 1), fx = ((f * 197) % 1000) + 40;
      var fy = zY(fz) + 10, fs = zS(fz);
      var sw = Math.sin(el * 2.2 + f) * 4 * fs;
      game.draw.rect(fx + sw, fy - 14 * fs, 3 * fs + 1, 14 * fs, GRASS_D);
      game.draw.rect(fx + sw - 3 * fs, fy - 20 * fs, 9 * fs, 8 * fs, f % 3 === 0 ? WHITE : f % 3 === 1 ? GOLD : '#d88ad8');
    }
    // 親指ゾーン(払う場所)を明るく
    var pulse = r && r.beatT > 0 ? r.beatT / 0.16 : 0;
    game.draw.rect(60, 1500, W - 120, 300, WHITE, 0.06 + 0.06 * pulse);
    game.draw.rect(60, 1500, W - 120, 4, WHITE, 0.4 + 0.3 * pulse);
  }

  function drawGauge(r) {
    // 勢いゲージ: 下=青(下の印)・中=黄・上=橙。払っている長さぶん満ちる
    var x = GAUGE_X;
    game.draw.rect(x - 22, GAUGE_Y0 - GAUGE_LEN - 6, 44, GAUGE_LEN + 12, INK, 0.5);
    for (var k = 0; k < 3; k++) {
      var a = LV_DY[k], b = k < 2 ? LV_DY[k + 1] : GAUGE_LEN;
      game.draw.rect(x - 16, GAUGE_Y0 - b, 32, b - a, MARK_COL[k], 0.35);
    }
    var dr = r.drag;
    if (dr) {
      var dy = Math.max(0, Math.min(GAUGE_LEN, dr.y0 - dr.y));
      var col = dr.lv >= 0 ? MARK_COL[dr.lv] : WHITE;
      game.draw.rect(x - 16, GAUGE_Y0 - dy, 32, dy, col);
      game.draw.rect(x - 26, GAUGE_Y0 - dy - 4, 52, 8, WHITE);
      // 届く先の予告(点線)
      var hp = proj(0, HAND_H);
      var tgt = dr.lv >= 0 ? markPos(dr.lv) : proj(0.35, 0);
      for (var n = 1; n < 10; n++) {
        var u = n / 10;
        game.draw.rect(hp.x + (tgt.x - hp.x) * u - 5, hp.y + (tgt.y - hp.y) * u - 40 * Math.sin(u * Math.PI) - 5, 10, 10, col, 0.8);
      }
      if (dr.lv >= 0) { var mp = markPos(dr.lv); game.draw.rect(mp.x - 54, mp.y - 40, 108, 6, col); game.draw.rect(mp.x - 54, mp.y + 34, 108, 6, col); }
    }
  }

  function drawApproach(r) {
    var q = pending(r);
    if (!q) return;
    var t = r.songT;
    if (t < q.tR - 0.6 || t > q.tR + LATE) return;
    var hp = proj(0, HAND_H);
    var a = Math.max(0, (q.tR - t) / 0.6);
    var rr = 54 + a * 160;
    var col = q.sync ? GOLD : WHITE;
    for (var n = 0; n < 20; n++) {
      var an = n / 20 * Math.PI * 2;
      game.draw.rect(hp.x + Math.cos(an) * rr - 6, hp.y + Math.sin(an) * rr * 0.6 - 6, 12, 12, col, 0.9);
    }
  }

  function drawBall(r) {
    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      if (q.res !== 'miss') continue;
      if (q.fz > 0 || (q.endHalt && halt > 0)) {
        game.draw.circle(q.fx, q.fy, 70 * q.fs, WHITE, 0.45);
        game.draw.circle(q.fx, q.fy, 40 * q.fs, WHITE);
      } else if (q.post < 1.4) {
        var dir = i % 2 ? 1 : -1;
        var mx = q.fx + dir * q.post * 520, my = q.fy + q.post * q.post * 700 - Math.sin(Math.min(1, q.post * 2) * Math.PI) * 120;
        game.draw.circle(mx, my, 28 * q.fs, WOOD, Math.max(0, 1 - q.post / 1.4));
      }
    }
    var b = ballAt(r, r.songT);
    if (!b) return;
    // 接地影(右下へ落ちる)
    var z = (GROUND0 - Math.min(GROUND0, b.y + 1)) >= 0 ? 0 : 0;
    game.draw.rect(b.x - 26 * b.s + 10 * b.s, b.y + 6 + z, 52 * b.s, 10 * b.s, INK, 0.15);
    var R = 28 * b.s;
    game.draw.circle(b.x, b.y, R + 4, WOOD_D);
    game.draw.circle(b.x, b.y, R, WOOD);
    game.draw.circle(b.x - R * 0.35, b.y - R * 0.35, R * 0.35, '#f0c890');
    var sp = game.time.elapsed * 12;
    game.draw.rect(b.x + Math.cos(sp) * R * 0.5 - 3, b.y + Math.sin(sp) * R * 0.5 - 3, 6, 6, WOOD_D);
  }

  function drawGirl(r, el) {
    var gx = W / 2, gy = 1430;
    var fr = r.poseT > 0 ? r.pose : (Math.floor(el * 3) % 2);
    if (r.drag) fr = 2;
    game.draw.rect(gx - 30, gy + 74, 140, 18, INK, 0.25);
    game.draw.sprite(GIRL[fr], GIRL_PAL, gx, gy, 9, { anchor: 'center' });
    // 牧羊犬(しっぽを振る)と予備の球の籠
    var df = Math.floor(el * 6) % 2;
    game.draw.sprite(DOG[df], DOG_PAL, 260, 1480, 8, { anchor: 'center' });
    game.draw.rect(200, 1530, 120, 12, INK, 0.2);
    var bx = 700, by = 1500;
    game.draw.rect(bx - 60, by, 120, 50, '#a87a48');
    game.draw.rect(bx - 60, by, 120, 8, '#d0a070');
    for (var i = 0; i < LIVES - r.misses; i++) game.draw.circle(bx - 34 + i * 34, by - 6, 18, WOOD);
  }

  function drawStrip(r) {
    // 譜面帯: 今の小節と次の小節を8分で区切り、打点を置く(食いは金)。再生位置の縦線
    var x0 = 90, x1 = W - 90, wbar = (x1 - x0) / 2, y = 168;
    var t = r.songT, bar = Math.max(0, Math.floor(t / (4 * SPB)));
    game.draw.rect(x0, y - 22, x1 - x0, 44, INK, 0.45);
    for (var e = 0; e <= 16; e++) {
      var ex = x0 + e * wbar / 8;
      game.draw.rect(ex - 1, y - (e % 2 === 0 ? 20 : 8), e % 8 === 0 ? 4 : 2, e % 2 === 0 ? 40 : 16, WHITE, e % 2 === 0 ? 0.5 : 0.25);
    }
    for (var i = 0; i < r.rs.length; i++) {
      var q = r.rs[i];
      var rel = q.beat - bar * 4;
      if (rel < 0 || rel >= 8) continue;
      var nx = x0 + rel / 4 * wbar;
      var col = q.res === 'hit' ? GRASS_L : q.res === 'miss' ? MISSC : (q.sync ? GOLD : WHITE);
      game.draw.circle(nx, y, q.res === '' ? 13 : 10, col);
      if (q.res === '') game.draw.rect(nx - 4, y - 4, 8, 8, MARK_COL[q.h]);
    }
    var ph = x0 + ((t / SPB) - bar * 4) / 4 * wbar;
    game.draw.rect(ph - 2, y - 28, 4, 56, SCARF);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 232, INK, 0.45);
    txt(String(r.score), 90, 92, 54, WHITE, 'left');
    txt(r.hits + ' / ' + r.rs.length, W - 90, 92, 46, GOLD, 'right');
    drawStrip(r);
    if (r.combo >= 2) txt('x' + r.combo, W / 2, H * 0.27, 46, GOLD);
    var prog = Math.min(1, r.songT / (r.beats * SPB));
    game.draw.rect(0, 226, W * prog, 6, GOLD);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.44, 110, won ? GOLD : MISSC);
      return;
    }
    game.draw.rect(80, H * 0.24, W - 160, H * 0.35, INK, 0.82);
    game.draw.rect(80, H * 0.24, W - 160, 10, won ? GOLD : MISSC);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 100, won ? GOLD : MISSC);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.365, 64, WHITE);
    txt('SCORE ' + run.score, W / 2, H * 0.42, 52, GOLD);
    txt('PERFECT ' + run.perfects, W * 0.38, H * 0.465, 40, WHITE);
    game.draw.circle(W * 0.66, H * 0.465 - 12, 16, GOLD);
    txt('x' + run.syncHits, W * 0.74, H * 0.465, 40, GOLD);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.515, 56, GOLD);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.515, 44, WHITE);
    if (!won) txt('あと' + Math.max(1, CHART.length - run.hits) + '球!', W / 2, H * 0.57, 50, GOLD);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 44, WHITE);
  }

  function scan() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, INK, 0.06);
  }

  function drawAll(r) {
    var el = game.time.elapsed;
    drawSky(el);
    drawWall(r, el);
    drawMeadow(r, el);
    drawApproach(r);
    drawGirl(r, el);
    drawBall(r);
    drawGauge(r);
    scan();
    drawHud(r);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 16 });
      game.draw.rect(0, 0, W, 232, INK, 0.7);
      txt(GAME_TITLE, W / 2, 120, 92 + Math.sin(game.time.elapsed * 3) * 3, GOLD);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 196, 38, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 46, GOLD);
      else txt('TAP TO START', W / 2, H * 0.94, 44, WHITE);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(140, W - 140), game.random(H * 0.3, H * 0.55), { color: MARK_COL[Math.floor(game.random(0, 3))], count: 14, speed: 300 }); }
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
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 120, GOLD);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
