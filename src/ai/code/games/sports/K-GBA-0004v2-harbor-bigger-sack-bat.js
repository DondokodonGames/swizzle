// K-GBA-0004v2-harbor-bigger-sack-bat.js
// 荷揚げ場の大袋打ち — 拍ごとに二つずつ投げ上げられる荷袋の大きい方を見極め、袋が頂点に来る次の拍の頭で船へ打ち返す
// 操作: 左右に一つずつ上がってくる荷袋のうち大きい方の側(画面の左半分/右半分)を、袋が頂点に来る拍の頭で押して打ち返す
// 終わり: 24組(8組ごとに3段階で加速)を打ち切ればCLEAR。小さい方を打つ・拍を外す・見送るのが合計3回でGAME OVER
// @mechanic: size_judge
// @theme: harbor_crane_apprentice_sack_return
// 世界観: 港の荷揚げ場で、クレーン番の見習いが岸壁の荷役から二つずつ投げ上げられる荷袋の大きい方を見極め、拍に合わせて船の甲板へ打ち返す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: VOXEL BLOCK

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で塗り分け、等角に積む。影は落とさず明度差だけで立体を出す
  var STYLE = { bg: ['#8fd0ec', '#dff3fa'], main: ['#efd7a0', '#4f7aa0', '#c9ccd2'], accent: ['#e8603c', '#26313f'] };
  var SKY = STYLE.bg[0], SKY2 = STYLE.bg[1], SACK = STYLE.main[0], NAVY = STYLE.main[1], STONE = STYLE.main[2], ORANGE = STYLE.accent[0], INK = STYLE.accent[1];
  var C_SACK = ['#efd7a0', '#cfae6c', '#a8854a'];
  var C_STONE = ['#d3d6dc', '#a9adb6', '#858a94'];
  var C_CRANE = ['#ff9a6c', '#e8603c', '#b8452a'];
  var C_HULL = ['#5f8ab0', '#3a6286', '#25445f'];
  var C_DECK = ['#e2b47a', '#bf8c50', '#956838'];
  var C_LAMP = [['#b4ffb0', '#5fd65c', '#3a9e38'], ['#fff3a0', '#e8cf3a', '#b39a1c'], ['#ffa49a', '#e84a3c', '#b0302a']];
  var C_WHITE = ['#ffffff', '#ffffff', '#ffffff'];
  var GOLD = '#ffd23c';

  var TITLE = 'HARBOR BAT';
  var STAGE_BPM = [90, 112, 135];     // tempo_ramp: 8組ごとに段階的に加速(1拍0.667 → 0.536 → 0.444秒)
  var PER_STAGE = 8;
  var NP = 24;
  var RATIO = [0.58, 0.72, 0.82];     // 小さい方の大きさ(大きい方に対する比)。段階が進むほど見分けにくい
  var TIME_LIMIT = 13;                // 8 x (0.667 + 0.536 + 0.444) = 13.2秒。放置でも READY 0.8 + 前奏1.3 + 13.2 + 結果1.8 = 17.1秒で終わる
  var LEAD_BEATS = 2;
  var PERF_WIN = 0.06, GOOD_WIN = 0.13;
  var MISS_LIMIT = 3;
  var LANE_DX = 270;
  var APEX_Y = H * 0.47;
  var THROW_Y = H * 0.83;
  var APP_Y = H * 0.545;
  var SHIP_X = W * 0.8, SHIP_Y = H * 0.335;
  var DEMO_TEMPO = [90, 90, 90, 90, 125, 125, 125, 125];
  var DEMO_SIDES = [1, -1, -1, 1, -1, 1, 1, -1];
  var DEMO_RATIO = [0.55, 0.6, 0.62, 0.6, 0.66, 0.7, 0.68, 0.72];
  var DEMO_WRONG = 5;                 // デモはこの組で小さい方を打ってしまう失敗例を見せる

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── キャラ: クレーン番の見習い(橙のヘルメット)と岸壁の荷役 ──
  var APP_IDLE = ['...oooo...', '..oooooo..', '..OOOOOO..', '..ssssss..', '..skssks..', '..ssssss..', '.bbbbbbbb.', 'sbbbwwbbbs', 'sbbbwwbbbs', '.bbbbbbbb.', '..nn..nn..', '..nn..nn..', '.nnn..nnn.'];
  var APP_SWING = ['...oooo...', '..oooooo..', '..OOOOOO..', '..ssssss.s', '..skssks.s', '..ssssssbs', '.bbbbbbbbb', '.bbbwwbbb.', 'sbbbwwbbb.', '.bbbbbbbb.', '..nn..nn..', '.nn...nn..', 'nnn...nnn.'];
  var WORKER_DOWN = ['..ccccc..', '.ccccccc.', '..sssss..', '..sksks..', '..sssss..', '.bbbbbbb.', 'sbbbbbbbs', 'sbbbbbbbs', '.bbbbbbb.', '..bb.bb..', '.nnn.nnn.'];
  var WORKER_UP = ['s.ccccc.s', 's.ccccccs', 's.sssss.s', 's.sksks.s', '.bsssssb.', '.bbbbbbb.', '.bbbbbbb.', '.bbbbbbb.', '.bbbbbbb.', '..bb.bb..', '.nnn.nnn.'];
  var PAL = { o: '#ff9a6c', O: ORANGE, s: '#f4c79a', k: INK, b: NAVY, w: '#ffffff', n: INK, c: '#3a6286' };
  var PAL_FLASH = { o: '#ffffff', O: '#ffffff', s: '#ffffff', k: '#ffffff', b: '#ffffff', w: '#ffffff', n: '#ffffff', c: '#ffffff' };

  // ── 伴奏: 自作の港の舟歌(ト長調・8拍)。段階が変わる拍で新しいテンポで頭出しし、曲ごと加速する ──
  var SHANTY = [['G4', 0.5], ['B4', 0.5], ['D5', 1], ['B4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['G4', 2]];
  var SHANTY_BASS = [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1], ['C3', 1], ['D3', 1], ['G2', 1], ['D3', 1]];
  function startTune(bpm) {
    game.audio.melody(SHANTY, { tempo: bpm, wave: 'square', volume: 0.045, loop: true, bass: SHANTY_BASS, bassWave: 'triangle', bassVolume: 0.08 });
  }

  function txt(s, x, y, size, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: col, bold: true, align: align || 'center' });
  }

  function ring(x, y, r, col, w) {
    var n = 36;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }

  // 等角の立方体: (x, y) = 上面の中心、a = 辺の長さ、h = 側面の高さ。cols = [上面, 左面, 右面]
  function cube(x, y, a, h, cols, step) {
    step = step || 4;
    var hw = a * 0.866, hh = a * 0.5;
    for (var yy = -hh; yy < hh; yy += step) {
      var w = hw * (1 - Math.abs(yy + step / 2) / hh);
      game.draw.rect(x - w, y + yy, w * 2, step + 0.6, cols[0]);
    }
    for (var xx = 0; xx < hw; xx += step) {
      game.draw.rect(x - hw + xx, y + (xx / hw) * hh, step + 0.6, h, cols[1]);
      game.draw.rect(x + xx, y + hh - (xx / hw) * hh - (step / hw) * hh, step + 0.6, h, cols[2]);
    }
  }

  function sackCube(x, y, size, cols) {
    var a = 96 * size;
    cube(x, y - a * 0.4, a, a * 0.75, cols, 4);
    cube(x, y - a * 0.4 - a * 0.42, a * 0.32, a * 0.22, cols, 3);   // 口を縛った結び目
  }

  // ── 拍のクロック(テンポは段階的に上がる)とペア(プレイとデモで共通の実ロジック) ──
  function makeTimes(tempos) {
    var T = [], t = 0;
    for (var k = 0; k <= tempos.length; k++) { T.push(t); if (k < tempos.length) t += 60 / tempos[k]; }
    return T;
  }
  function beatTime(r, k) {
    var n = r.tempos.length;
    if (r.loop) {
      var c = Math.floor(k / n);
      return c * r.T[n] + r.T[k - c * n];
    }
    if (k < 0) return k * 60 / r.tempos[0];
    if (k > n) return r.T[n] + (k - n) * 60 / r.tempos[n - 1];
    return r.T[k];
  }
  function tempoOf(r, i) {
    var n = r.tempos.length;
    if (r.loop) return r.tempos[((i % n) + n) % n];
    return r.tempos[Math.max(0, Math.min(n - 1, i))];
  }
  function stageOf(r, i) {
    var bpm = tempoOf(r, i);
    return bpm >= 130 ? 2 : bpm >= 105 ? 1 : 0;
  }

  function makePairs() {
    var arr = [], last = 0, same = 0;
    for (var i = 0; i < NP; i++) {
      var st = Math.floor(i / PER_STAGE);
      var side = game.random(0, 1) < 0.5 ? -1 : 1;
      if (side === last) { same++; if (same >= 3) { side = -side; same = 1; } } else same = 1;
      last = side;
      var big = game.random(0.92, 1.06);
      arr.push({ side: side, big: big, small: big * (RATIO[st] + game.random(-0.03, 0.03)), res: null, rt: 0 });
    }
    return arr;
  }
  function pairOf(r, i) {
    if (!r.loop) return r.pairs[Math.max(0, Math.min(NP - 1, i))];
    if (!r.pairs[i]) {
      var j = ((i % DEMO_SIDES.length) + DEMO_SIDES.length) % DEMO_SIDES.length;
      r.pairs[i] = { side: DEMO_SIDES[j], big: 1, small: DEMO_RATIO[j], res: null, rt: 0 };
      delete r.pairs[i - 12];
    }
    return r.pairs[i];
  }

  function newRun(loop, vol) {
    var tempos = [];
    if (loop) tempos = DEMO_TEMPO.slice();
    else for (var i = 0; i < NP; i++) tempos.push(STAGE_BPM[Math.floor(i / PER_STAGE)]);
    var r = {
      loop: loop, vol: vol, play: false, tempos: tempos, T: makeTimes(tempos), pairs: loop ? {} : makePairs(),
      lastHit: loop ? 1e9 : NP, lastLaunch: loop ? 1e9 : NP,
      t: 0, lastBeat: -LEAD_BEATS - 1, next: 1, judged: {},
      combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, score: 0, cargo: 0,
      swingT: 0, swingSide: 1, throwT: 0, pulse: 0, teleT: 0, flashPair: -1,
    };
    r.t = beatTime(r, -LEAD_BEATS);
    return r;
  }

  function laneX(side) { return W / 2 + side * LANE_DX; }

  function hitBeat(r, k, d, side) {
    r.judged[k] = true;
    var p = pairOf(r, k - 1);
    p.res = 'hit'; p.rt = r.t;
    var perfect = Math.abs(d) <= PERF_WIN;
    if (perfect) r.perfect++; else r.good++;
    r.combo++;
    if (r.combo > r.maxCombo) r.maxCombo = r.combo;
    r.score += Math.round(((perfect ? 100 : 60) + Math.min(r.combo, 20) * 5) * [1, 1.5, 2][stageOf(r, k - 1)]);
    r.cargo++;
    r.swingT = 0.25; r.swingSide = side;
    game.audio.tone(perfect ? 330 : 262, 0.08, { wave: 'square', volume: 0.1 * r.vol });   // 板で打ち返す音
    game.feedback.good(laneX(side), APEX_Y - 150, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : SKY2, size: perfect ? 60 : 48, count: perfect ? 14 : 8, sound: perfect ? 'se_good' : 'se_tap', volume: 0.3 * r.vol });
    if (r.combo === 8 || r.combo === 16 || r.combo === 24) {
      game.fx.popup(r.combo + ' COMBO', W / 2, H * 0.4, { color: GOLD, size: 70 });
      game.audio.play('se_milestone', 0.45 * r.vol);
    }
  }

  function missBeat(r, k, kind, side) {
    if (r.play && fatal) return;
    r.judged[k] = true;
    var p = pairOf(r, k - 1);
    p.res = kind === 'wrong' ? 'wrong' : 'miss'; p.rt = r.t;
    r.miss++; r.combo = 0;
    if (side) { r.swingT = 0.25; r.swingSide = side; }
    var x = laneX(side || p.side);
    if (r.play && r.miss >= MISS_LIMIT) {
      // 3回目: ヒットストップで止め、外した荷袋を白く拡大してから feedback.bad
      fatal = true; hitStop = 0.5; r.flashPair = k - 1; fatalX = x;
      game.audio.stopBgm();
      game.audio.tone(160, 0.3, { wave: 'sawtooth', volume: 0.12, slide: -70 });
      return;
    }
    game.feedback.bad(x, APEX_Y - 150, { text: 'MISS', volume: 0.5 * r.vol, shake: 8 });
  }

  function stray(r) {
    game.audio.tone(600, 0.04, { wave: 'triangle', volume: 0.04 * r.vol, slide: 200 });
  }

  function pressRun(r, side) {
    var k = Math.max(1, r.next);
    while (k + 1 <= r.lastHit && Math.abs(beatTime(r, k + 1) - r.t) < Math.abs(beatTime(r, k) - r.t)) k++;
    var prev = beatTime(r, k - 1);
    if (k > r.lastHit || r.judged[k] || r.t < beatTime(r, 0) || Math.abs(r.t - prev) < Math.abs(r.t - beatTime(r, k))) {
      r.swingT = 0.18; r.swingSide = side;
      stray(r);
      return 'stray';
    }
    var d = r.t - beatTime(r, k);
    if (Math.abs(d) > GOOD_WIN) { missBeat(r, k, 'early', side); return 'miss'; }
    if (side !== pairOf(r, k - 1).side) { missBeat(r, k, 'wrong', side); return 'miss'; }
    hitBeat(r, k, d, side);
    return 'hit';
  }

  function onBeat(r, b) {
    r.pulse = 1;
    var st = stageOf(r, b);
    // 拍クロック: 木箱を叩くような低い音(前奏はスティック)
    if (b < 0) game.audio.tone(1568, 0.03, { wave: 'square', volume: 0.05 * r.vol });
    else game.audio.tone(st === 2 ? 147 : st === 1 ? 131 : 117, 0.09, { wave: 'triangle', volume: 0.22 * r.vol });
    if (b >= 0 && b < r.lastLaunch) {
      r.throwT = 0.22;
      pairOf(r, b);
      game.audio.tone(220, 0.12, { wave: 'triangle', volume: 0.05 * r.vol, slide: 260 });
    }
    // 次の拍から速くなる: 1拍前に笛(上がる2音)とランプの点滅で予告
    if (b >= 0 && b + 1 < r.lastLaunch && stageOf(r, b + 1) > st) {
      r.teleT = 60 / tempoOf(r, b);
      game.audio.play('se_powerup', 0.4 * r.vol);
    }
    if (b >= 0 && b < r.lastLaunch && (b === 0 || tempoOf(r, b) !== tempoOf(r, b - 1))) startTune(tempoOf(r, b));
  }

  function stepRun(r, dt) {
    r.t += dt;
    while (beatTime(r, r.lastBeat + 1) <= r.t) { r.lastBeat++; onBeat(r, r.lastBeat); }
    while (r.next <= r.lastHit && (r.judged[r.next] || r.t > beatTime(r, r.next) + GOOD_WIN)) {
      if (!r.judged[r.next]) missBeat(r, r.next, 'late', 0);
      r.next++;
      if (r.loop && r.next > 12) delete r.judged[r.next - 12];
      if (r.play && fatal) break;
    }
    if (r.swingT > 0) r.swingT -= dt;
    if (r.throwT > 0) r.throwT -= dt;
    if (r.teleT > 0) r.teleT -= dt;
    if (r.pulse > 0) r.pulse = Math.max(0, r.pulse - dt * 4);
  }

  // ── 描画 ──
  function drawHarbor(r) {
    var t = game.time.elapsed;
    game.draw.clear(SKY2);
    game.draw.gradient(0, H * 0.28, [[0, SKY], [1, SKY2]]);
    // 海(波の帯が流れる)
    game.draw.gradient(H * 0.28, H * 0.43, [[0, '#6fb6d8'], [1, '#3f86b0']]);
    for (var w = 0; w < 6; w++) {
      var wy = H * 0.3 + w * 44;
      var wx = ((t * (40 + w * 12) + w * 170) % (W + 240)) - 240;
      game.draw.rect(wx, wy, 180, 8, '#ffffff', 0.35);
      game.draw.rect(wx + 420 > W ? wx - 600 : wx + 420, wy + 18, 120, 6, '#ffffff', 0.25);
    }
    // 船: 紺の船体の立方体を並べ、甲板に打ち返した袋が積み上がる
    var bob = Math.sin(t * 1.6) * 6;
    for (var h = 0; h < 6; h++) cube(W * 0.5 + h * 110, H * 0.355 + bob, 110, 60, C_HULL, 12);
    for (var d = 0; d < 5; d++) cube(W * 0.55 + d * 110, H * 0.33 + bob, 104, 16, C_DECK, 12);
    game.draw.rect(W * 0.62, H * 0.2 + bob, 14, H * 0.12, INK);
    game.draw.rect(W * 0.62 + 14, H * 0.21 + bob, 120, 70, '#ffffff', 0.9);
    var n = Math.min(r.cargo, 14);
    for (var c = 0; c < n; c++) {
      var row = c < 5 ? 0 : c < 9 ? 1 : c < 12 ? 2 : 3;
      var idx = row === 0 ? c : row === 1 ? c - 5 : row === 2 ? c - 9 : c - 12;
      cube(SHIP_X - 150 + idx * 66 + row * 33, SHIP_Y - 26 + bob - row * 44, 58, 40, C_SACK, 8);
    }
    // 岸壁(石の立方体)と見習いの台
    game.draw.gradient(H * 0.43, H, [[0, '#b9bec7'], [1, '#8d939d']]);
    for (var q = 0; q < 10; q++) cube(q * 120, H * 0.44, 120, 40, C_STONE, 12);
    for (var y = H * 0.5; y < H; y += 120) game.draw.rect(0, y, W, 4, INK, 0.12);
    cube(W / 2, APP_Y + 30, 170, 260, C_CRANE, 10);
    // クレーン(左): 塔・腕・揺れるフック。てっぺんのランプがテンポの段階(緑→黄→赤)
    for (var s = 0; s < 8; s++) cube(110, H * 0.5 - s * 74, 70, 74, C_CRANE, 10);
    var armY = H * 0.5 - 7 * 74 - 40;
    game.draw.rect(110, armY - 12, 600, 24, C_CRANE[2]);
    game.draw.rect(110, armY - 20, 600, 10, C_CRANE[0]);
    var hookX = 640 + Math.sin(t * 1.3) * 26;
    game.draw.line(680, armY + 12, hookX, H * 0.25, INK, 4);
    game.draw.rect(hookX - 14, H * 0.25, 28, 24, INK);
    var st = stageOf(r, Math.max(0, r.lastBeat));
    var blink = r.teleT > 0 && Math.floor(t * 14) % 2 === 0;
    var lampCols = blink ? C_LAMP[Math.min(2, st + 1)] : C_LAMP[st];
    cube(110, armY - 60 - r.pulse * 10, 74 + r.pulse * 12, 50, lampCols, 5);
  }

  function drawLanes(r) {
    // 袋の通り道(左右の画面半分)と頂点の印。輪が縮み切った瞬間が拍の頭
    for (var s = -1; s <= 1; s += 2) {
      var x = laneX(s);
      game.draw.rect(x - 110, APEX_Y - 160, 220, THROW_Y - APEX_Y + 160, '#ffffff', 0.08);
      game.draw.rect(x - 80, APEX_Y - 4, 160, 8, GOLD, 0.6);
    }
    if (r.next <= r.lastHit && r.t >= beatTime(r, 0)) {
      var tb = beatTime(r, r.next);
      var span = tb - beatTime(r, r.next - 1);
      var u = Math.max(0, (tb - r.t) / span);
      for (s = -1; s <= 1; s += 2) ring(laneX(s), APEX_Y - 40, 70 + u * 110, u < 0.15 ? GOLD : '#ffffff', 8);
    }
  }

  function drawPairs(r, frozen) {
    for (var i = Math.max(0, r.next - 4); i <= r.next; i++) {
      var t0 = beatTime(r, i);
      if (r.t < t0 || i >= r.lastLaunch) continue;
      var p = pairOf(r, i);
      var t1 = beatTime(r, i + 1);
      for (var s = -1; s <= 1; s += 2) {
        var isBig = s === p.side;
        var size = isBig ? p.big : p.small;
        var x = laneX(s), y;
        var cols = C_SACK;
        if (!p.res) {
          var u = Math.min(1, (r.t - t0) / (t1 - t0));
          y = THROW_Y - (THROW_Y - APEX_Y) * (1 - (1 - u) * (1 - u));
          if (r.t > t1) y = APEX_Y + (r.t - t1) * (r.t - t1) * 900;
        } else {
          var e = r.t - p.rt;
          if (e > 0.9) continue;
          var flown = (p.res === 'hit' && isBig) || (p.res === 'wrong' && !isBig);
          if (flown && p.res === 'hit') {
            var f = Math.min(1, e / 0.55);
            x = x + (SHIP_X - x) * f;
            y = APEX_Y + (SHIP_Y - 60 - APEX_Y) * f - Math.sin(Math.PI * f) * 260;
            size *= 1 - 0.4 * f;
            if (f >= 1) continue;
          } else if (flown) {
            x = x + s * e * 300;
            y = APEX_Y - e * 300 + e * e * 1400;     // 小さい袋は弱く飛んで海へ落ちる
          } else {
            y = APEX_Y + e * e * 1800;
          }
          // 大きさの根拠を一瞬見せる: 大きい方を金の枠で囲む
          if (isBig && e < 0.35 && !flown) {
            game.draw.rect(x - 96, y - 140, 192, 10, GOLD);
            game.draw.rect(x - 96, y + 92, 192, 10, GOLD);
            game.draw.rect(x - 96, y - 140, 10, 242, GOLD);
            game.draw.rect(x + 86, y - 140, 10, 242, GOLD);
          }
          if (isBig && e < 0.35 && flown) game.draw.circle(x, y - 40, 96 * size, GOLD, 0.35);
        }
        if (frozen && i === r.flashPair) { cols = C_WHITE; size *= 1.3; }
        sackCube(x, y, size, cols);
      }
    }
  }

  function drawPeople(r, frozen) {
    // 見習い: 打った側へ板を振る
    var sw = r.swingT > 0;
    var ax = W / 2, ay = APP_Y - 80;
    game.draw.sprite(sw ? APP_SWING : APP_IDLE, frozen ? PAL_FLASH : PAL, ax, ay, 12, { anchor: 'center', flipX: sw && r.swingSide < 0 });
    var k = sw ? r.swingT / 0.25 : 0;
    var tipX = ax + r.swingSide * (sw ? 120 + (1 - k) * 140 : 70);
    var tipY = sw ? APEX_Y - 30 - k * 40 : ay + 40;
    game.draw.line(ax + r.swingSide * 40, ay, tipX, tipY, '#956838', 26);
    game.draw.line(ax + r.swingSide * 40, ay, tipX, tipY, '#e2b47a', 14);
    // 岸壁の荷役: 拍ごとに投げ上げる
    for (var s = -1; s <= 1; s += 2) {
      var wx = laneX(s);
      game.draw.sprite(r.throwT > 0 ? WORKER_UP : WORKER_DOWN, PAL, wx, H * 0.875, 13, { anchor: 'center', flipX: s > 0 });
      cube(wx - s * 120, H * 0.92, 80, 50, C_SACK, 10);
    }
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 230, INK, 0.72);
    txt('SCORE ' + r.score, 40, 66, 44, '#ffffff', 'left');
    for (var m = 0; m < MISS_LIMIT; m++) {
      var used = m < r.miss;
      game.draw.rect(W - 92 - m * 74, 44, 52, 44, used ? ORANGE : C_SACK[1]);
      game.draw.rect(W - 92 - m * 74, 44, 52, 12, used ? C_CRANE[0] : C_SACK[0]);
    }
    var st = stageOf(r, Math.max(0, r.lastBeat));
    for (var l = 0; l < 3; l++) game.draw.rect(W / 2 - 110 + l * 80, 118, 60, 36, C_LAMP[l][1], l <= st ? 1 : 0.25);
    var done = Math.min(NP, Math.max(0, r.next - 1));
    if (r.combo >= 2) txt(r.combo + ' COMBO', 40, 140, 40, GOLD, 'left');
    txt(done + ' / ' + NP, W - 40, 140, 40, '#ffffff', 'right');
    var progress = done / NP;
    game.draw.rect(40, 196, W - 80, 16, '#ffffff', 0.25);
    game.draw.rect(40, 196, (W - 80) * progress, 16, GOLD);
  }

  function drawResult() {
    game.draw.rect(70, H * 0.24, W - 140, H * 0.27, INK, 0.9);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 100, won ? GOLD : ORANGE);
    txt('SCORE ' + finalScore, W / 2, H * 0.335, 58, '#ffffff');
    txt('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.38, 38, '#ffffff');
    txt('COMBO ' + run.maxCombo, W / 2, H * 0.42, 42, GOLD);
    if (newRecord) txt('NEW RECORD', W / 2, H * 0.465, 56, GOLD);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.465, 44, SKY);
    if (!won) txt('あと' + Math.max(1, NP - Math.min(NP, run.next - 1)) + '個!', W / 2, H * 0.497, 42, SACK);
  }

  // ── 状態 ──
  var run, ready, hitStop, fatal, fatalX, over, won, endT, prevBest, finalScore, newRecord, confT;

  function initGame() {
    run = newRun(false, 1);
    run.play = true;
    ready = 0.8; hitStop = 0; fatal = false; fatalX = W / 2; over = false; won = false; endT = 0;
    prevBest = game.best || 0; finalScore = 0; newRecord = false; confT = 0;
  }

  function finish(win) {
    if (over) return;
    over = true; won = win; endT = 1.8;
    finalScore = win ? run.score + (MISS_LIMIT - run.miss) * 200 : run.score;
    newRecord = win && finalScore > prevBest;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.6);
    if (newRecord) game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: GOLD, size: 76 });
  }

  // ── ATTRACT: 実ロジックでゴーストが大きい方を拍の頭で叩く。テンポが上がる区間で一度だけ小さい方を打って見せる ──
  var demo = { t: 0, run: null, gx: W / 2, gy: APEX_Y, pressT: 0 };
  function resetDemo() {
    demo.run = newRun(true, 0.35);
    demo.gx = W / 2; demo.gy = APEX_Y + 200; demo.pressT = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.run || demo.t <= dt) resetDemo();
    var r = demo.run;
    stepRun(r, dt);
    var k = r.next;
    var p = pairOf(r, k - 1);
    var j = (((k - 1) % DEMO_SIDES.length) + DEMO_SIDES.length) % DEMO_SIDES.length;
    var side = j === DEMO_WRONG ? -p.side : p.side;
    var tx = laneX(side), ty = APEX_Y - 30;
    if (r.t >= beatTime(r, 0)) {
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 12);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 12);
    }
    if (!r.judged[k] && r.t >= beatTime(r, k) - 0.008 && r.t >= beatTime(r, 0)) { pressRun(r, side); demo.pressT = 0.14; }
    if (demo.pressT > 0) demo.pressT -= dt;
  }

  function canPlay() { return state === S.PLAYING && !over && hitStop <= 0; }

  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); game.audio.stopBgm(); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; resetDemo(); return; }
  });

  game.onPress(function (x) {
    if (!canPlay()) return;
    if (ready > 0) { game.audio.tone(440, 0.03, { wave: 'square', volume: 0.04 }); return; }
    var side = x < W / 2 ? -1 : 1;
    var res = pressRun(run, side);
    if (res === 'hit') game.fx.burst(laneX(side), APEX_Y - 40, { color: SACK, count: 8, speed: 260 });
  });

  game.onUpdate(function (dt) {
    if (dt > 0.05) dt = 0.05;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      var dr = demo.run;
      drawHarbor(dr);
      drawLanes(dr);
      drawPeople(dr, false);
      drawPairs(dr, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.pressT > 0, scale: 16 });
      game.draw.rect(0, 0, W, 230, INK, 0.72);
      txt(TITLE, W / 2, 92, 88, ORANGE);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 182, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.972, 44, GOLD);
      else txt('TAP TO START', W / 2, H * 0.972, 40, '#ffffff');
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          confT -= dt;
          if (confT <= 0) { confT = 0.16; game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.5), { color: [GOLD, ORANGE, SKY][Math.floor(game.random(0, 3))], count: 14, speed: 340 }); }
        }
        if (endT <= 0) {
          state = S.RESULT;
          var stats = { perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo, cargo: run.cargo, score: finalScore };
          if (won) game.end.success(finalScore, stats);
          else game.end.failure(stats);
        }
      } else if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          game.feedback.bad(fatalX, APEX_Y - 150, { text: 'MISS', size: 76, shake: 18 });
          run.flashPair = -1;
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt);
        if (!fatal && run.next > NP) finish(true);
      }
    }

    drawHarbor(run);
    drawLanes(run);
    drawPeople(run, false);
    drawPairs(run, hitStop > 0);
    drawHud(run);
    if (state === S.PLAYING && ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 116, ORANGE);
    if (over || state === S.RESULT) drawResult();
    if (state === S.RESULT) txt('TAP TO CONTINUE', W / 2, H * 0.972, 40, '#ffffff');
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    resetDemo();
    startTune(STAGE_BPM[0]);
  });
})(game);
