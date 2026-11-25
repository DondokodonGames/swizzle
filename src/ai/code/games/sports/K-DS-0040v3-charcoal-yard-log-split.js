// K-DS-0040v3-charcoal-yard-log-split.js
// 炭焼き小屋の跳ね割り — 跳ねる8分(長・短)の拍で宙へ放り上がる薪を、てっぺんで止まる拍の頭に狙ってタップし、薪割り槌で割る
// 操作: 薪(太い丸太=拍の頭、細い焚きつけ=跳ねた裏の短い拍)が雪の庭から放り上がり、てっぺんに着く場所に白い輪が出て縮む。輪が薪に重なって閉じる瞬間(その拍の頭)に薪そのものをタップすると槌が振り下りて割れる。ずれでPERFECT/GOOD。早すぎ(輪が閉じきる前)は薪を弾いてMISS、遅れて落ちた薪もMISS。何もない所を叩くと空振り(連続が切れるだけ)。上の拍の物差しで、大きい印=拍の頭・小さい印=跳ねた裏、橙の点がこれから来る薪
// 終わり: 100BPMのシャッフル・前奏1小節+7小節(32拍・約19秒・30本)を割り終えればCLEAR。MISS4回でGAME OVER
// @mechanic: aim_shoot
// @theme: charcoal_hut_swing_log_split
// 世界観: 冬の山あいの炭焼き小屋の前、窯の火が赤く透ける雪の庭で、綿入れ半纏の炭焼き職人が跳ね板で放り上げた薪を、薪割り槌で宙のてっぺんを狙って割り、窯にくべる薪束を作る(道具仕事のみ)
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・割った本数・PERFECT/GOOD/MISS数・最大連続
// スタイル: HD POST 3D
var STYLE = { bg: ['#2e2b29', '#5e5248'], main: ['#8a7a68', '#b0a594', '#4a3e34'], accent: ['#e0955a', '#d9d2c4'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色〜灰に寄せた低彩度、ブルーム(半透明円の重ね)とビネット、コントラストを潰す
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], bark: STYLE.main[0], snow: STYLE.main[1], dark: STYLE.main[2],
    fire: STYLE.accent[0], pale: STYLE.accent[1], ink: '#16130f', cut: '#c9ad84', ring: '#8e7254',
    birch: '#b9b2a2', red: '#c8604a', gold: '#e8c27a', haze: '#6e5e50'
  };

  var GAME_TITLE = 'LOG SWING';
  var BPM = 100;
  var SPB = 60 / BPM;
  var SW = 2 / 3;                 // 跳ねる8分: 拍の2/3の位置が裏(長・短)
  // 小節ごとの薪の位置(拍単位。x.667 = 跳ねた裏)。前奏1小節のあと7小節
  var BARS = [
    [0, 2],
    [0, 1, 2, 3],
    [0, SW, 2, 2 + SW],
    [0, SW, 1 + SW, 3],
    [0, SW, 2, 2 + SW, 3 + SW],
    [0, SW, 1, 2, 2 + SW, 3],
    [0, SW, 1, 1 + SW, 2]
  ];
  var TOTAL_BEATS = 32;
  var DEMO_POS = [2, 2 + SW, 4, 5];
  var DEMO_BEATS = 7;
  var DEMO_APEX = [[320, 700], [560, 620], [780, 760], [420, 860]];
  var TIME_LIMIT = 19;            // 32拍 × 0.6秒 = 19.2秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.13, EARLY_W = 0.32;
  var FLY = SPB * 1.35;           // 放り上げてからてっぺんまで
  var TELE_T = 0.7;               // 着く場所の輪が出る(予告)
  var HIT_R = 125;
  var LIVES = 4;
  var GROUND = 1300;

  // 伴奏(オリジナル)。シャッフル: 拍の頭=2/3拍、裏=1/3拍の長・短
  var LEAD = ['D5', 'F5', 'A4', 'C5', 'D5', 'E5', 'F5', 'A5', 'G5', 'F5', 'D5', 'C5', 'A4', 'C5', 'D5', 'R'];
  var WALK = ['D3', 'F3', 'G3', 'A3', 'D3', 'C3', 'A2', 'C3'];

  // ---- スプライト(背中から見た炭焼き職人: 毛糸帽・綿入れ半纏) ----
  var MAN_PAL = { k: '#16130f', c: '#8a4e3e', s: '#b89480', j: '#5e5a48', d: '#3e3a2e', p: '#3a3a40', b: '#2a221c', w: '#d9d2c4' };
  var MAN = [
    '.....kkkk.....',
    '....kcwcck....',
    '...kccccccck..',
    '...kcccccck...',
    '....kssssk....',
    '..kkjjjjjjkk..',
    '.kjjjjjjjjjjk.',
    '.kjjjdjjdjjjk.',
    '.kjjjdjjdjjjk.',
    '.kjjjjjjjjjjk.',
    '..kjjjjjjjjk..',
    '..kddddddddk..',
    '..kppppppppk..',
    '..kppppppppk..',
    '..kppk..kppk..',
    '..kppk..kppk..',
    '.kbbbk..kbbbk.',
    '.kkkkk..kkkkk.'
  ];
  var MAN_SWING = [
    '.....kkkk.....',
    '....kcwcck....',
    '...kccccccck..',
    '...kcccccck...',
    '....kssssk....',
    '..kkjjjjjjkk..',
    '.kjjjjjjjjjjk.',
    'kjjjjdjjdjjjjk',
    'kjjjjdjjdjjjjk',
    '.kjjjjjjjjjjk.',
    '..kjjjjjjjjk..',
    '..kddddddddk..',
    '..kppppppppk..',
    '.kppppkkppppk.',
    '.kppk....kppk.',
    '.kppk....kppk.',
    'kbbbk....kbbbk',
    'kkkkk....kkkkk'
  ];
  var FLAKE = ['.w.', 'www', '.w.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var logs, clock, endT, score, combo, maxCombo, nPerfect, nGood, nMiss, split, nextShow;
  var hitStop, hitObj, over, won, outroT, lastCue, lastBeat, demoMode, prevBest, resultT, realT;
  var beatPulse, swingPulse, chips, halves, swingFx, milestoneDone, flare, lastSwungTick;

  function buildLogs(demo) {
    logs = [];
    var positions = [];
    if (demo) {
      for (var d = 0; d < DEMO_POS.length; d++) positions.push(DEMO_POS[d]);
    } else {
      for (var b = 0; b < BARS.length; b++) for (var i = 0; i < BARS[b].length; i++) positions.push(4 + b * 4 + BARS[b][i]);
    }
    var px = 540, py = 760;
    for (var k = 0; k < positions.length; k++) {
      var pos = positions[k];
      var swung = Math.abs(pos - Math.round(pos)) > 0.01;
      var ax, ay;
      if (demo) { ax = DEMO_APEX[k][0]; ay = DEMO_APEX[k][1]; }
      else {
        var gap = k > 0 ? pos - positions[k - 1] : 4;
        // 短い間隔(1/3拍)の次の薪は近くに上がる
        var reach = gap < 0.5 ? 230 : gap < 0.9 ? 360 : 520;
        for (var tries = 0; tries < 20; tries++) {
          ax = Math.max(200, Math.min(880, px + game.random(-reach, reach)));
          ay = Math.max(520, Math.min(1000, py + game.random(-reach * 0.6, reach * 0.6)));
          if (Math.hypot(ax - px, ay - py) > 150 || k === 0) break;
        }
      }
      px = ax; py = ay;
      var t = pos * SPB;
      var x0 = ax < 540 ? ax + game.random(80, 200) : ax - game.random(80, 200);
      if (demo) x0 = ax + (k % 2 ? -140 : 140);
      logs.push({
        k: k, pos: pos, t: t, tL: t - FLY, ax: ax, ay: ay, x0: x0, swung: swung,
        g: 2 * (GROUND + 160 - ay) / (FLY * FLY), spin: (k % 2 ? 1 : -1) * (swung ? 7 : 4.5),
        res: 0, launched: false, landed: false
      });
    }
  }

  function initRun(demo) {
    demoMode = !!demo;
    buildLogs(demo);
    endT = (demo ? DEMO_BEATS : TOTAL_BEATS) * SPB;
    clock = demo ? -0.4 : -READY_T;
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; split = 0; nextShow = 0;
    hitStop = 0; hitObj = null; over = false; won = false; outroT = 0; lastCue = -1; lastBeat = -1;
    prevBest = game.best; resultT = 0; realT = 0;
    beatPulse = 0; swingPulse = 0; chips = []; halves = []; swingFx = null; milestoneDone = false; flare = 0;
    lastSwungTick = -1;
  }

  function logPos(L) {
    var u = clock - L.t;
    var x = L.ax + (L.ax - L.x0) / FLY * u;
    var y = L.ay + 0.5 * L.g * u * u;
    return { x: x, y: y, a: (clock - L.tL) * L.spin };
  }

  // ---- 拍クロック(1本)と伴奏 ----
  function cueBeats() {
    var total = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    for (var n = lastCue + 1; n < total; n++) {
      if (clock + 0.06 < n * SPB) break;
      lastCue = n;
      if (!demoMode) playBeat(n);
    }
  }
  function playBeat(n) {
    var lead = n < 4 ? 'R' : LEAD[n % 16];
    var lead2 = n < 4 ? 'R' : (n % 2 ? LEAD[(n + 5) % 16] : 'R');
    game.audio.melody([[lead, SW], [lead2, 1 - SW]], {
      tempo: BPM, wave: 'triangle', volume: 0.05,
      bass: [[WALK[n % 8], SW], [WALK[(n + 1) % 8], 1 - SW]], bassWave: 'triangle', bassVolume: 0.11
    });
    // 刻み(頭は太く、跳ねた裏は細く)
    game.audio.tone(n % 4 === 0 ? 'A5' : 'E5', 0.04, { wave: 'square', volume: 0.025 });
  }
  function onBeat(n) {
    beatPulse = 1;
  }

  function stepRun(dt) {
    clock += dt;
    flare = Math.max(0, flare - dt * 1.5);
    cueBeats();
    var bi = Math.floor(clock / SPB);
    while (lastBeat < bi) { lastBeat++; onBeat(lastBeat); }
    var sub = clock / SPB - bi;
    if (sub >= SW && lastSwungTick < bi) {
      lastSwungTick = bi; swingPulse = 1;
      if (!demoMode && bi >= 0) game.audio.tone('E6', 0.02, { wave: 'square', volume: 0.012 });
    }
    for (var i = 0; i < logs.length; i++) {
      var L = logs[i];
      if (!L.launched && clock >= L.tL) {
        L.launched = true;
        // 跳ね板が鳴って薪が上がる(太い薪は低く、焚きつけは高く)
        if (!demoMode) game.audio.tone(L.swung ? 330 : 150, 0.12, { wave: 'triangle', volume: 0.1, slide: L.swung ? 300 : 160 });
      }
      if (L.res === 0 && clock > L.t + GOOD_W) {
        missLog(L, 'late');
        if (over || hitStop > 0) return;
      }
      if (L.res === 3 && !L.landed && L.launched) {
        var p = logPos(L);
        if (p.y > GROUND + 120) {
          L.landed = true;
          for (var c = 0; c < 6; c++) chips.push({ x: p.x, y: GROUND + 110, vx: game.random(-200, 200), vy: game.random(-320, -120), t: 0, col: C.pale });
        }
      }
    }
    if (!demoMode && clock >= endT + 0.1) finishRun(true);
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function strike(x, y) {
    swingFx = { x: x, y: y, t: 0.16 };
    var best = null, bd = 1e9, bestD = 0;
    for (var i = 0; i < logs.length; i++) {
      var L = logs[i];
      if (L.res || !L.launched) continue;
      var d = clock - L.t;
      if (d < -EARLY_W) continue;
      var p = logPos(L);
      if (Math.hypot(x - p.x, y - p.y) > HIT_R) continue;
      if (Math.abs(d) < bd) { bd = Math.abs(d); best = L; bestD = d; }
    }
    if (!best) {
      // 空振り: 連続が切れるだけ
      combo = 0;
      game.feedback.bad(x, y, { text: null, color: C.pale, flashColor: C.haze, shake: 2, volume: demoMode ? 0.02 : 0.15 });
      return 'whiff';
    }
    if (bestD < -GOOD_W) { missLog(best, 'early'); return 'early'; }
    if (bestD > GOOD_W) { missLog(best, 'late'); return 'late'; }
    return splitLog(best, bd <= PERFECT_W ? 1 : 2);
  }

  function splitLog(L, grade) {
    var p = logPos(L);
    L.res = grade;
    split++; combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    var gain = (grade === 1 ? 150 : 90) + (L.swung ? 30 : 0) + Math.min(10, combo) * 12;
    score += gain;
    flare = 1;
    var len = L.swung ? 60 : 80, w = L.swung ? 22 : 46;
    halves.push({ x: p.x, y: p.y, vx: -260, vy: -380, a: p.a, spin: -9, t: 0, len: len, w: w, sw: L.swung });
    halves.push({ x: p.x, y: p.y, vx: 260, vy: -340, a: p.a + 1.2, spin: 9, t: 0, len: len, w: w, sw: L.swung });
    for (var c = 0; c < 10; c++) chips.push({ x: p.x, y: p.y, vx: game.random(-360, 360), vy: game.random(-460, -80), t: 0, col: c % 2 ? C.cut : C.gold });
    game.feedback.good(p.x, p.y, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.gold : C.pale, size: grade === 1 ? 56 : 46,
      count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.16
    });
    if (!demoMode) game.audio.play('se_break', grade === 1 ? 0.3 : 0.2);
    if (!demoMode && combo > 0 && combo % 8 === 0) game.fx.popup('COMBO x' + combo, W / 2, 360, { color: C.gold, size: 58 });
    if (!demoMode && !milestoneDone && split >= 15) {
      milestoneDone = true;
      game.fx.popup('NICE', W / 2, 470, { color: C.fire, size: 92 });
      game.audio.play('se_milestone', 0.45);
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function missLog(L, why) {
    L.res = 3;
    nMiss++; combo = 0;
    hitStop = 0.42; hitObj = L;
    var p = logPos(L);
    if (why === 'early') {
      // 早すぎ: 槌の柄に弾かれて横へ飛ぶ
      var dir = L.ax >= L.x0 ? -1 : 1;
      L.ax = p.x; L.ay = p.y; L.x0 = p.x - dir * 220; L.t = clock;
    }
    game.feedback.bad(p.x, p.y, { text: 'MISS', color: C.red, flashColor: C.pale, shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && nMiss >= LIVES) { game.audio.play('se_failure', 0.2); finishRun(false); }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (LIVES - nMiss) * 250 + 400;
      flare = 1;
      for (var i = 0; i < 6; i++) game.fx.burst(260 + (i % 3) * 280, 640 + Math.floor(i / 3) * 260, { color: i % 2 ? C.gold : C.fire, count: 16, speed: 380 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, split: split, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < -0.35 || hitStop > 0 || y < 230) return;
    var r = strike(x, y);
    if (r === 'whiff') game.audio.tone(200, 0.06, { wave: 'triangle', volume: 0.06, slide: -80 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function glow(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2.2, col, a * 0.12);
    game.draw.circle(x, y, r * 1.5, col, a * 0.28);
    game.draw.circle(x, y, r, col, a);
  }
  function ring(x, y, r, col, w) {
    var n = 28;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }
  function drawLogShape(x, y, a, len, w, swung, white) {
    var dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    game.draw.line(x - dx, y - dy, x + dx, y + dy, white ? '#ffffff' : C.ink, w + 8);
    game.draw.line(x - dx, y - dy, x + dx, y + dy, white ? '#ffffff' : (swung ? C.birch : C.bark), w);
    if (!white) {
      game.draw.line(x - dx * 0.8, y - dy * 0.8 - w * 0.2, x + dx * 0.8, y + dy * 0.8 - w * 0.2, swung ? '#d8d2c4' : '#a08c74', Math.max(3, w * 0.18));
      if (swung) { game.draw.rect(x - dx * 0.3 - 4, y - dy * 0.3 - 4, 8, 8, C.ink); game.draw.rect(x + dx * 0.4 - 3, y + dy * 0.4 - 3, 6, 6, C.ink); }
    }
    game.draw.circle(x + dx, y + dy, w / 2, white ? '#ffffff' : C.cut);
    if (!white) game.draw.circle(x + dx, y + dy, w / 4, C.ring);
  }

  // ---- 描画 ----
  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, GROUND, [[0, C.bg0], [0.55, C.bg1], [1, '#8a7464']]);
    // 遠い山の稜線(低彩度・霞)
    for (var m = 0; m < 9; m++) {
      var mx = m * 140 - 40, mh = 120 + ((m * 53) % 90);
      game.draw.circle(mx, 900, mh + 80, '#4e4640', 0.8);
    }
    game.draw.rect(0, 900, W, 400, '#5a4e44');
    for (var f = 0; f < 4; f++) game.draw.rect(0, 860 + f * 40, W, 40, C.haze, 0.18);
    // 炭窯(土のドーム)と火の口のブルーム、立ちのぼる煙
    var kx = 210, ky = 1110;
    game.draw.circle(kx, ky, 190, '#3e342c');
    game.draw.circle(kx - 30, ky - 40, 150, '#4a3e34');
    game.draw.rect(kx - 200, ky, 400, 200, '#3e342c');
    glow(kx + 10, ky + 60, 46 + flare * 18 + Math.sin(t * 7) * 3, C.fire, 0.55 + flare * 0.3);
    game.draw.rect(kx - 30, ky + 30, 80, 70, '#f0b070', 0.85);
    for (var s = 0; s < 6; s++) {
      var sy = ky - 170 - ((t * 60 + s * 90) % 520);
      game.draw.circle(kx + Math.sin(t * 0.8 + s) * 30 + (ky - 170 - sy) * 0.15, sy, 40 + (ky - sy) * 0.05, '#8a8278', 0.18);
    }
    // 小屋と窓明かり
    var hx = 780, hy = 960;
    game.draw.rect(hx, hy, 260, 260, '#3a3028');
    game.draw.line(hx - 30, hy + 10, hx + 130, hy - 90, '#2a221c', 40);
    game.draw.line(hx + 130, hy - 90, hx + 290, hy + 10, '#2a221c', 40);
    game.draw.line(hx - 30, hy + 4, hx + 130, hy - 96, C.snow, 14);
    game.draw.line(hx + 130, hy - 96, hx + 290, hy + 4, C.snow, 14);
    glow(hx + 90, hy + 100, 38, C.gold, 0.5);
    game.draw.rect(hx + 60, hy + 70, 60, 60, '#e8c27a', 0.9);
    // 雪の庭
    game.draw.gradient(GROUND - 20, H, [[0, '#9a948a'], [0.4, C.snow], [1, '#7e786e']]);
    for (var d = 0; d < 7; d++) game.draw.circle(80 + d * 160, GROUND + 30 + (d % 2) * 20, 70, '#b8b2a6', 0.5);
  }

  function drawWoodpile() {
    // 割れた薪の束(割った数だけ積み上がる)
    var bx = 790, by = 1760;
    game.draw.rect(bx - 190, by + 40, 380, 30, C.dark);
    var n = Math.min(30, split);
    for (var i = 0; i < n; i++) {
      var row = Math.floor(i / 6), col = i % 6;
      var x = bx - 150 + col * 60 + (row % 2) * 30, y = by + 10 - row * 46;
      game.draw.circle(x, y, 26, C.ink);
      game.draw.circle(x, y, 22, C.cut);
      game.draw.circle(x, y, 9, C.ring);
    }
    // 切り株の台
    game.draw.rect(360, 1560, 150, 110, '#5a4636');
    game.draw.rect(360, 1550, 150, 24, C.cut);
    game.draw.circle(435, 1562, 20, C.ring, 0.7);
  }

  function drawMan() {
    var t = game.time.elapsed;
    var swinging = swingFx && swingFx.t > 0;
    var x = 210, y = 1640 - beatPulse * 6;
    game.draw.circle(x, 1800, 110, C.ink, 0.3);
    // 薪割り槌(柄と頭)。叩いた先へ向く
    var hx = x + 60, hy = y - 40;
    var tx, ty;
    if (swinging) { tx = swingFx.x; ty = swingFx.y; }
    else { tx = hx + 90; ty = hy - 200 + Math.sin(t * 2) * 6; }
    var ang = Math.atan2(ty - hy, tx - hx);
    var L = swinging ? Math.min(Math.hypot(tx - hx, ty - hy), 900) : 220;
    var ex = hx + Math.cos(ang) * L, ey = hy + Math.sin(ang) * L;
    if (swinging) {
      game.draw.line(hx, hy, ex, ey, '#ffffff', 10);
      glow(ex, ey, 30, C.pale, 0.35);
    }
    game.draw.line(hx, hy, ex, ey, C.ink, 18);
    game.draw.line(hx, hy, ex, ey, '#8a6a48', 10);
    var nx = -Math.sin(ang), ny = Math.cos(ang);
    game.draw.line(ex - nx * 34, ey - ny * 34, ex + nx * 34, ey + ny * 34, C.ink, 40);
    game.draw.line(ex - nx * 30, ey - ny * 30, ex + nx * 30, ey + ny * 30, '#8e8c88', 30);
    game.draw.sprite(swinging ? MAN_SWING : MAN, MAN_PAL, x, y, 14, { anchor: 'center' });
  }

  function drawLogs() {
    for (var i = 0; i < logs.length; i++) {
      var L = logs[i];
      if (!L.launched) continue;
      if (L.res === 1 || L.res === 2) continue;
      if (L.res === 3 && L.landed) continue;
      var p = logPos(L);
      var flash = hitStop > 0 && hitObj === L;
      var lead = L.t - clock;
      // 予告: てっぺんに着く場所に白い輪が出て縮む(重なって閉じる瞬間が拍の頭)
      if (L.res === 0 && lead <= TELE_T && lead > -GOOD_W) {
        var rr = (L.swung ? 52 : 70) + Math.max(0, lead) / TELE_T * 150;
        game.draw.circle(L.ax, L.ay, L.swung ? 52 : 70, C.pale, 0.12);
        ring(L.ax, L.ay, rr, lead < 0.12 ? C.gold : C.pale, L.swung ? 5 : 8);
      }
      if (flash) {
        glow(p.x, p.y, 80, '#ffffff', 0.5);
        drawLogShape(p.x, p.y, p.a, L.swung ? 150 : 200, L.swung ? 34 : 66, L.swung, true);
        continue;
      }
      var inRange = L.res === 0 && Math.abs(lead) <= GOOD_W + 0.05;
      if (inRange) glow(p.x, p.y, 70, C.gold, 0.35);
      drawLogShape(p.x, p.y, p.a, L.swung ? 120 : 160, L.swung ? 26 : 52, L.swung, false);
    }
  }

  function drawFx(dt) {
    for (var i = halves.length - 1; i >= 0; i--) {
      var h = halves[i];
      h.t += dt;
      if (h.t > 1.1) { halves.splice(i, 1); continue; }
      h.vy += 1500 * dt;
      h.x += h.vx * dt; h.y += h.vy * dt; h.a += h.spin * dt;
      drawLogShape(h.x, h.y, h.a, h.len * 1.4, h.w, h.sw, false);
    }
    for (var c = chips.length - 1; c >= 0; c--) {
      var ch = chips[c];
      ch.t += dt;
      if (ch.t > 0.7) { chips.splice(c, 1); continue; }
      ch.vy += 1300 * dt;
      ch.x += ch.vx * dt; ch.y += ch.vy * dt;
      game.draw.rect(ch.x - 5, ch.y - 5, 10, 10, ch.col);
    }
    if (swingFx) { swingFx.t -= dt; if (swingFx.t <= 0) swingFx = null; }
  }

  function drawSnow() {
    var t = game.time.elapsed;
    for (var i = 0; i < 26; i++) {
      var x = ((i * 211 + t * (20 + (i % 5) * 8)) % (W + 40)) - 20 + Math.sin(t + i) * 14;
      var y = ((i * 137 + t * (70 + (i % 4) * 20)) % 1500) + 230;
      game.draw.sprite(FLAKE, { w: C.pale }, x, y, 3 + (i % 3), { anchor: 'center', alpha: 0.7 });
    }
  }

  // ビネット + コントラストを潰す褐色の膜
  function drawPost() {
    game.draw.rect(0, 0, W, H, '#5a4632', 0.1);
    for (var v = 0; v < 5; v++) {
      var s = 30 + v * 28;
      game.draw.rect(0, 0, s, H, '#000000', 0.07);
      game.draw.rect(W - s, 0, s, H, '#000000', 0.07);
      game.draw.rect(0, H - s * 1.4, W, s * 1.4, '#000000', 0.06);
    }
  }

  // 拍の物差し(頭=大きい印、跳ねた裏=小さい印、橙の点=これから来る薪)
  function drawRuler() {
    var x0 = 300, x1 = 1040, y = 178;
    var bar = Math.floor(Math.max(0, clock) / (SPB * 4));
    var bt = bar * 4;
    game.draw.rect(x0 - 10, y - 26, x1 - x0 + 20, 52, '#000000', 0.35);
    game.draw.line(x0, y, x1, y, C.haze, 4);
    for (var b = 0; b < 4; b++) {
      var hx = x0 + (x1 - x0) * (b / 4) + 20;
      var sx = x0 + (x1 - x0) * ((b + SW) / 4) + 20;
      game.draw.rect(hx - 5, y - 20, 10, 40, b === 0 ? C.fire : C.pale);
      game.draw.rect(sx - 3, y - 10, 6, 20, C.haze);
    }
    for (var i = 0; i < logs.length; i++) {
      var L = logs[i];
      var rel = L.pos - bt;
      if (rel < 0 || rel >= 4) continue;
      var lx = x0 + (x1 - x0) * (rel / 4) + 20;
      var col = L.res === 1 || L.res === 2 ? C.gold : L.res === 3 ? C.red : C.fire;
      game.draw.circle(lx, y, L.swung ? 10 : 16, col);
    }
    var ph = Math.max(0, clock) / SPB - bt;
    var px = x0 + (x1 - x0) * (ph / 4) + 20;
    game.draw.rect(px - 3, y - 30, 6, 60, '#ffffff', 0.85);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#1a1612', 0.9);
    game.draw.rect(0, 226, W, 4, C.haze);
    label('SCORE ' + score, 40, 64, 46, C.pale, 'left');
    label(split + ' / ' + logs.length, 40, 130, 34, C.gold, 'left');
    if (combo >= 2) label('x' + combo, 600, 64, 46, C.gold, 'center');
    // 残りの薪(MISSで減る)
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - nMiss;
      var lx = 820 + i * 60;
      game.draw.line(lx - 20, 62, lx + 20, 62, on ? C.bark : '#3a3430', 26);
      game.draw.circle(lx + 20, 62, 13, on ? C.cut : '#3a3430');
    }
    glow(255, 178, 16 + beatPulse * 10, C.fire, 0.4 + beatPulse * 0.5);
    glow(255, 178, 8 + swingPulse * 6, C.pale, 0.3 + swingPulse * 0.4);
    drawRuler();
  }

  function drawScene(dt) {
    drawYard();
    drawWoodpile();
    drawLogs();
    drawMan();
    drawFx(dt);
    drawSnow();
    drawPost();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.4;
    game.draw.rect(40, y0, W - 80, hh, '#14110e', 0.9);
    game.draw.rect(60, y0 + 18, W - 120, 4, C.fire, 0.6);
    glow(W / 2, H * 0.33, 120, won ? C.gold : C.red, 0.12);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.pale);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.448, 34, C.pale);
    label(split + ' / ' + logs.length, W / 2, H * 0.495, 52, C.gold);
    label('COMBO ' + maxCombo, W / 2, H * 0.535, 38, C.pale);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.58, 58, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.58, 42, C.pale);
    if (!won) label('あと' + Math.max(1, logs.length - split) + '本!', W / 2, H * 0.625, 50, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.69, 36, C.pale);
  }

  // ---- ATTRACT: 実ロジックで太い薪→焚きつけ(長・短)→太い薪×2。偶数周は最後の薪で遅れて落とす ----
  var demo = { t: 0, cyc: 0, next: 0, x: 540, y: 1300, press: 0 };
  var DEMO_CYC = DEMO_BEATS * SPB + 0.4 + 1.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.next = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (hitStop > 0) { hitStop -= dt; return; }
    if (clock < endT + 0.3) stepRun(dt);
    var L = logs[demo.next];
    if (!L) return;
    if (L.res) { demo.next++; return; }
    var late = demo.cyc % 2 === 0 && demo.next === logs.length - 1;
    var tx = L.ax, ty = L.ay;
    demo.x += (tx - demo.x) * Math.min(1, dt * 9);
    demo.y += (ty - demo.y) * Math.min(1, dt * 9);
    if (!late && clock >= L.t - 0.005) {
      var p = logPos(L);
      demo.x = p.x; demo.y = p.y;
      strike(p.x, p.y); demo.press = 0.16; demo.next++;
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    swingPulse = Math.max(0, swingPulse - dt * 6);

    if (state === S.ATTRACT) {
      if (!logs) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#1a1612', 0.9);
      glow(W / 2, 100, 70, C.fire, 0.12 + Math.sin(t * 2) * 0.05);
      label(GAME_TITLE, W / 2, 104, 92, C.gold);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.pale);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else label('TAP TO START', W / 2, H * 0.965, 40, C.pale);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 2.5) { hitStop = 0; finishRun(nMiss < LIVES); }
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

    drawScene(hitStop > 0 ? 0 : dt);
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.4, W, 170, '#14110e', 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 88, 100, C.gold);
    }
    // 最初の薪だけ、ゴーストの手を薄く重ねる
    if (!over && logs.length && !logs[0].res && clock > logs[0].t - 0.9) {
      game.draw.hand(logs[0].ax, logs[0].ay, { press: clock >= logs[0].t - 0.04, scale: 12, alpha: 0.5 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
