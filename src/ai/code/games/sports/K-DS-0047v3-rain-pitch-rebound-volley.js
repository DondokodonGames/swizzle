// K-DS-0047v3-rain-pitch-rebound-volley.js
// 雨のグラウンドの跳ね返りボレー — バーに当たった跳ね返りが落ちてくる裏拍のぎりぎりまで足を引いて待ち、着地の瞬間に蹴り込む。早すぎた分は「あと何cm」で残る
// 操作: 画面のどこでも押している間は足を後ろへ引いて溜め(下の輪が満ちる)、指を離した瞬間に蹴る。コーチが拍の頭の0.6秒前に球を蹴り上げ、拍の頭でバー(カン)か柱(コン)に当たって跳ね返る。バーの球は半拍後の裏拍、柱の球は1拍半後の裏拍に足元の輪へ落ちる(柱の球は輪が遠くに出て橙色、0.6秒前から見える)。着地の瞬間〜直後に離すとPERFECT、少し早いとGOOD(どちらも球の高さが「○cm」で出て、低いほど高得点)。早すぎて空を蹴る、溜めが短くて当たりが弱い(キーパーに取られる)、着地を過ぎて球が弾んで抜ける、はMISS。早すぎたMISSは球と地面の差が「あと○cm」と線で出る
// 終わり: 6小節(100BPM・14.4秒・16球)を蹴り終えればCLEAR(判定+低さ+ぎりぎり+連続)。MISS3回でGAME OVER
// @mechanic: near_miss
// @theme: rainy_pitch_rebound_volley
// 世界観: 雨の練習グラウンドのゴール前で、ユニフォームの選手が、コーチがバーに当てて落とす跳ね返りを裏拍の着地ぎりぎりまで引きつけ、地面すれすれでボレーを蹴り込む居残り練習
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・決めた本数・PERFECT/GOOD/MISS数・いちばん低く蹴れた高さ(cm)・最大連続
// スタイル: 2010s FLAT MOBILE
var STYLE = { bg: ['#7d8fa3', '#748699'], main: ['#3e9a68', '#2f6fe0', '#eef3f7'], accent: ['#ffd23f', '#ff4d6d'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影もグラデも使わないベタ塗り、丸角、大きい余白、アイコン的な形。判定はUIの色変化で示す
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], pitch: STYLE.main[0], kit: STYLE.main[1], white: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], stripe: '#47a673', net: '#c9d6e2', ink: '#243040',
    skin: '#f2c29b', bib: '#ff9a2e', puddle: '#6f8fa8', rain: '#c4d4e4', long: '#ff9a2e'
  };

  var GAME_TITLE = 'RAIN VOLLEY';
  var BPM = 100, SPB = 60 / BPM, BAR = SPB * 4;
  var BARS = 6, END_T = BARS * BAR + 0.3;
  var TIME_LIMIT = 15;
  var READY_T = 0.8;
  var TELE_T = 0.6;
  var PERF_E = 0.045, GOOD_E = 0.13, LATE_W = 0.06;
  var MIN_HOLD = 0.15;
  var MISS_MAX = 3;
  var PX_CM = 3;
  var BAR_Y = 470, LINE_Y = 760, POST_L = 250, POST_R = 830;
  var FOOT_Y = H * 0.71;
  var COACH_X = 120, COACH_Y = 930;
  var METER_Y = H * 0.8;

  // 小節ごとの球: [バー/柱に当たる拍(0〜3), S=バー(半拍後に着地) L=柱(1拍半後に着地)]
  var PAT = [
    [[0, 'S'], [2, 'S']],
    [[0, 'S'], [2, 'L']],
    [[0, 'S'], [1, 'S'], [3, 'S']],
    [[0, 'L'], [2, 'S'], [3, 'S']],
    [[0, 'S'], [1, 'L'], [3, 'S']],
    [[0, 'S'], [1, 'S'], [2, 'L']]
  ];
  var DEMO_PAT = [[[0, 'S'], [2, 'L']], [[1, 'S']]];
  var LAND_DX = [-70, 0, 70];

  // 伴奏(オリジナル・ニ短調)。表拍は低音だけ、裏拍に和音の刻み。1拍ずつ鳴らす
  var STABS = [['A4', 'F4', 'A4', 'D5'], ['A#4', 'F4', 'A#4', 'D5'], ['G4', 'C5', 'E5', 'C5'], ['A4', 'C#5', 'E5', 'C#5'], ['A4', 'D5', 'F5', 'D5'], ['A#4', 'D5', 'G4', 'C5']];
  var MEL = ['A4', 'D5', 'F5', 'E5', 'D5', 'A#4', 'F4', 'G4', 'E5', 'G5', 'E5', 'C5', 'C#5', 'E5', 'A4', 'R', 'F5', 'A5', 'G5', 'F5', 'D5', 'F5', 'E5', 'D5'];
  var ROOT = ['D2', 'A#1', 'C2', 'A1', 'D2', 'A#1'];

  // ---- スプライト(ベタ塗りのアイコン的な人物) ----
  var FWD_IDLE = [
    ['...hhhh...', '..hhhhhh..', '..hhhhse..', '...ssss...', '..kkkkkk..', '.kkkkkkkk.', 's.kkkkkk.s', '..kkkkkk..',
     '..wwwwww..', '..ww..ww..', '..kk..kk..', '..kk..kk..', '.bb...bb..'],
    ['...hhhh...', '..hhhhhh..', '..hhhhse..', '...ssss...', '..kkkkkk..', '.kkkkkkkk.', '.skkkkkks.', '..kkkkkk..',
     '..wwwwww..', '..ww..ww..', '..kk..kk..', '.kk...kk..', '.bb...bb..']
  ];
  var FWD_WIND = ['...hhhh...', '..hhhhhh..', '..hhhhse..', '...ssss...', '..kkkkkk..', 's.kkkkkk..', '.skkkkkk.s',
    '..kkkkkk..', '..wwwwww..', '..ww.www..', '..kk..kkk.', '..kk...kkb', '.bb......b'];
  var FWD_KICK = ['...hhhh...', '..hhhhhh..', '..hhhhse..', '...ssss...', 's.kkkkkk..', '.skkkkkk..', '..kkkkkk.s',
    '..kkkkkk..', '..wwwwwww.', '..ww..kkk.', '..kk...kbb', '..kk......', '.bb.......'];
  var FWD_MISS = ['...hhhh...', '..hhhhhh..', '..hhhhoe..', 's..ssss..s', '.skkkkkks.', '..kkkkkk..', '..kkkkkk..',
    '..kkkkkk..', '..wwwwww..', '..ww..ww..', '.kk....kk.', '.kk....kk.', 'bb......bb'];
  var KEEPER = [
    ['...hhhh...', '..hhhhhh..', '..seesse..', '..ssmsss..', 's.gggggg.s', 'ssggggggss', '..gggggg..', '..gggggg..', '..nn..nn..', '..ss..ss..', '.bb....bb.'],
    ['...hhhh...', '..hhhhhh..', '..seesse..', '..ssmsss..', '..gggggg..', 'ssggggggss', 's.gggggg.s', '..gggggg..', '..nn..nn..', '..ss..ss..', '.bb....bb.']
  ];
  var COACH = ['..cccc..', '.cccccc.', '.seesse.', '..ssss..', '.jjjjjj.', 'jjjjjjjj', 's.jjjj.s', '..jjjj..', '..jj.jj.', '..b...b.'];
  var BALL = ['.www.', 'wwkww', 'wkkkw', 'wwkww', '.www.'];
  var FPAL = { h: '#2a2420', s: C.skin, e: C.ink, k: C.kit, w: C.white, b: C.ink, o: C.ink };
  var KPAL = { h: '#3a2a20', s: C.skin, e: C.ink, m: '#c06060', g: C.bib, n: C.ink, b: C.ink };
  var CPAL = { c: C.red, s: C.skin, e: C.ink, j: '#2a3a52', b: C.ink };
  var WPAL = { h: '#ffffff', s: '#ffffff', e: '#ffffff', k: '#ffffff', w: '#ffffff', b: '#ffffff', o: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, balls, score, combo, maxCombo, nPerfect, nGood, nMiss, nGoal, bestCm, nearEarly, judge, gap;
  var hitStop, over, won, outroT, lastE, lastCue, demoMode, prevBest, realT, resultT, beatPulse, milestoneDone;
  var hold, fwdX, poseT, pose, keeperX, keeperDive, shots, missX, missY, drops, progress;

  function buildBalls(demo) {
    balls = [];
    var pat = demo ? DEMO_PAT : PAT;
    var lastDx = 1;
    for (var b = 0; b < pat.length; b++) {
      for (var i = 0; i < pat[b].length; i++) {
        var q = b * 4 + pat[b][i][0];
        var kind = pat[b][i][1];
        var dxI = demo ? 1 : (lastDx + 1 + Math.floor(game.random(0, 2))) % 3;
        lastDx = dxI;
        var head = q * SPB;
        var land = head + (kind === 'L' ? 1.5 : 0.5) * SPB;
        var hx = kind === 'L' ? (dxI === 0 ? POST_R : POST_L) : 400 + dxI * 140;
        balls.push({ head: head, land: land, kind: kind, hx: hx, hy: kind === 'L' ? 600 : BAR_Y, lx: 540 + LAND_DX[dxI],
          res: 0, kicked: false, hit: false, d: 0, cm: 0, kx: 0, ky: 0 });
      }
    }
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.7 : -READY_T;
    buildBalls(demo);
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nGoal = 0; bestCm = 999; nearEarly = 999; judge = null; gap = null;
    hitStop = 0; over = false; won = false; outroT = 0; lastE = -1; lastCue = -1; prevBest = game.best; realT = 0; resultT = 0;
    beatPulse = 0; milestoneDone = false;
    hold = null; fwdX = 540; poseT = 0; pose = 'idle'; keeperX = 540; keeperDive = 0; shots = []; missX = -999; missY = -999;
    if (!drops) { drops = []; for (var i = 0; i < 70; i++) drops.push({ x: game.random(0, W), y: game.random(0, H), s: game.random(900, 1400) }); }
    progress = 0;
  }

  // ---- 跳ね返りの軌道(着地の直前は一定の速さで落ちる) ----
  function ballHeight(b, t) {
    var D = b.land - b.head, tau = t - b.head;
    var h0 = b.kind === 'L' ? 230 : 200, vEnd = b.kind === 'L' ? 900 : 720;
    var g = 2 * (vEnd * D - h0) / (D * D), v0 = g * D - vEnd;
    return Math.max(0, h0 + v0 * tau - g * tau * tau / 2);
  }
  function ballScreen(b, t) {
    if (t < b.head - TELE_T) return null;
    if (t < b.head) {
      var p = (t - (b.head - TELE_T)) / TELE_T;
      return { x: COACH_X + (b.hx - COACH_X) * p, y: COACH_Y + (b.hy - COACH_Y) * p - Math.sin(p * Math.PI) * 260, s: 5 + p * 0 , h: 0 };
    }
    var k = Math.min(1, (t - b.head) / (b.land - b.head));
    var sx = b.hx + (b.lx - b.hx) * k;
    var sy = LINE_Y + (FOOT_Y - LINE_Y) * k;
    var h = ballHeight(b, Math.min(t, b.land));
    return { x: sx, y: sy - h * (0.6 + 0.4 * k), s: 6 + k * 4, h: h, gx: sx, gy: sy };
  }
  function cmAt(b) { return Math.max(0, Math.round(ballHeight(b, clock) / PX_CM)); }

  // ---- 拍クロック(8分の格子。裏拍が主役) ----
  function cueBeats() {
    var q = Math.floor((clock + 0.06) / SPB);
    if (q > lastCue && q >= 0 && q < BARS * 4) { lastCue = q; if (!demoMode && !over) playBeat(q); }
  }
  function playBeat(q) {
    var bar = Math.floor(q / 4) % 6, k = q % 4;
    game.audio.melody([['R', 0.5], [STABS[bar][k], 0.3], ['R', 0.2]], {
      tempo: BPM, wave: 'square', volume: 0.03,
      bass: [[ROOT[bar], 0.4], ['R', 0.6]], bassWave: 'triangle', bassVolume: 0.12
    });
    game.audio.melody([[MEL[q % MEL.length], 0.9], ['R', 0.1]], { tempo: BPM, wave: 'triangle', volume: 0.035 });
  }
  function onEighth(i) {
    if (i < 0 || i >= BARS * 8) return;
    if (i % 2 === 1) beatPulse = 1;
    if (demoMode || over) return;
    if (i % 2 === 0) game.audio.tone(70, 0.1, { wave: 'sine', volume: 0.1, slide: -25 });
    else game.audio.tone(2100, 0.03, { wave: 'square', volume: 0.016 });
  }

  function ballInPlay() {
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b.res && clock >= b.head && clock <= b.land + LATE_W) return b;
    }
    return null;
  }

  function stepRun(dt) {
    clock += dt;
    cueBeats();
    var ei = clock < 0 ? -1 : Math.floor(clock / (SPB / 2));
    while (lastE < ei) { lastE++; onEighth(lastE); }
    stepShots(dt);
    if (over) return;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b.kicked && clock >= b.head - TELE_T) {
        b.kicked = true;
        if (!demoMode) game.audio.tone(b.kind === 'L' ? 180 : 240, 0.08, { wave: 'triangle', volume: 0.06 });
      }
      if (!b.hit && clock >= b.head) {
        b.hit = true;
        if (!demoMode) game.audio.tone(b.kind === 'L' ? 'E5' : 'A6', b.kind === 'L' ? 0.2 : 0.12, { wave: 'triangle', volume: 0.07 });
        game.fx.burst(b.hx, b.hy, { color: C.white, count: 5, speed: 160 });
      }
      if (!b.res && clock > b.land + LATE_W) {
        b.res = 4;
        var p = ballScreen(b, b.land);
        miss('late', p.gx, p.gy - 30, b);
        gap = { x: p.gx, y: p.gy, h: 0, d: clock - b.land, late: true, t: 1.1, col: C.red };
        return;
      }
    }
    var nb = null;
    for (var j = 0; j < balls.length; j++) if (!balls[j].res) { nb = balls[j]; break; }
    if (nb && clock > nb.head - TELE_T) fwdX += (nb.lx - 70 - fwdX) * Math.min(1, dt * 7);
    keeperX = 540 + Math.sin(game.time.elapsed * 1.3) * 90;
    if (!demoMode && clock >= END_T) finishRun(true);
  }

  // ---- 蹴った球 ----
  function stepShots(dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var s = shots[i];
      s.t += dt;
      if (s.t >= s.dur && !s.done) {
        s.done = true;
        if (s.kind === 'goal') {
          if (!demoMode) game.audio.tone('D6', 0.12, { wave: 'square', volume: 0.04 });
          game.fx.burst(s.x1, s.y1, { color: C.white, count: 10, speed: 200 });
        }
      }
      if (s.t > s.dur + 0.6) shots.splice(i, 1);
    }
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function pressDown() {
    hold = { t0: clock };
    pose = 'wind';
  }
  function releaseKick() {
    if (!hold) return 'none';
    var held = clock - hold.t0;
    hold = null;
    var b = ballInPlay();
    pose = 'kick'; poseT = 0.3;
    if (!b) {
      combo = 0;
      game.feedback.bad(fwdX + 70, FOOT_Y - 60, { text: null, color: C.net, shake: 2, volume: demoMode ? 0.02 : 0.2 });
      return 'whiff';
    }
    var d = clock - b.land;
    var p = ballScreen(b, clock);
    if (d < -GOOD_E) {
      b.res = 3; b.cm = cmAt(b);
      nearEarly = Math.min(nearEarly, b.cm);
      gap = { x: p.gx, y: p.gy, h: p.gy - p.y, cm: b.cm, early: true, t: 1.3, col: C.red };
      miss('early', p.x, p.y, b);
      return 'early';
    }
    if (held < MIN_HOLD) {
      b.res = 3; b.weak = true;
      shots.push({ x0: p.x, y0: p.y, x1: keeperX, y1: LINE_Y - 60, t: 0, dur: 0.5, kind: 'save' });
      gap = null;
      miss('weak', p.x, p.y, b);
      return 'weak';
    }
    var cm = d < 0 ? cmAt(b) : 0;
    var grade = d >= -PERF_E ? 1 : 2;
    b.res = grade; b.d = d; b.cm = cm;
    nGoal++; combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    bestCm = Math.min(bestCm, cm);
    var pts = (grade === 1 ? 300 : 150) + Math.max(0, 30 - cm) * (grade === 1 ? 10 : 5) + Math.min(10, combo) * 20;
    var edge = cm <= 5;
    if (edge) pts += 200;
    score += pts;
    var gx = keeperX > 540 ? POST_L + 70 : POST_R - 70;
    shots.push({ x0: p.x, y0: p.y, x1: gx, y1: BAR_Y + 60, t: 0, dur: 0.3, kind: 'goal' });
    keeperDive = keeperX > 540 ? 1 : -1;
    gap = { x: p.gx, y: p.gy, h: p.gy - p.y, cm: cm, early: false, t: 1.0, col: grade === 1 ? C.gold : C.white };
    judge = { kind: grade === 1 ? 'perfect' : 'good', t: 0.8 };
    game.feedback.good(p.x, p.y - 120, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.gold : C.white, size: grade === 1 ? 62 : 48,
      count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.15
    });
    if (!demoMode) {
      if (edge) game.fx.popup('+200', p.x + 150, p.y - 40, { color: C.gold, size: 50 });
      if (combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W - 170, 330, { color: C.gold, size: 60 });
      if (!milestoneDone && nGoal >= 8) {
        milestoneDone = true;
        game.fx.popup('NICE', W / 2, 400, { color: C.white, size: 90 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function miss(kind, x, y, b) {
    combo = 0; nMiss++;
    hitStop = 0.4; missX = x; missY = y;
    pose = 'miss'; poseT = 0.9;
    judge = { kind: kind, t: 1.0 };
    game.feedback.bad(x, y - 50, { text: 'MISS', color: C.red, flashColor: C.white, shake: demoMode ? 3 : 10, volume: demoMode ? 0.03 : 0.5 });
    if (!demoMode && nMiss >= MISS_MAX) { game.audio.play('se_break', 0.3); finishRun(false); }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - nMiss) * 300;
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 152, 520 + (i % 2) * 80, { color: i % 2 ? C.gold : C.white, count: 16, speed: 360 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = {
      score: score, goals: nGoal, total: balls.length, perfect: nPerfect, good: nGood, miss: nMiss,
      lowestCm: bestCm < 999 ? bestCm : null, nearestEarlyCm: nearEarly < 999 ? nearEarly : null, maxCombo: maxCombo
    };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || y < 230 || clock < -0.35) return;
    pressDown();
    game.audio.tone(330, 0.06, { wave: 'triangle', volume: 0.04, slide: -60 });
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !hold) return;
    if (over || hitStop > 0) { hold = null; pose = 'idle'; return; }
    var res = releaseKick();
    if (res === 'perfect' || res === 'good') game.audio.tone(120, 0.08, { wave: 'square', volume: 0.07, slide: 200 });
    else if (res === 'whiff') game.audio.tone(200, 0.06, { wave: 'triangle', volume: 0.04, slide: -80 });
  });

  // ---- 描画ヘルパー(フラット) ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rrect(x, y, w, h, r, col, a) {
    var al = a === undefined ? 1 : a;
    game.draw.rect(x + r, y, w - r * 2, h, col, al);
    game.draw.rect(x, y + r, r, h - r * 2, col, al);
    game.draw.rect(x + w - r, y + r, r, h - r * 2, col, al);
    game.draw.circle(x + r, y + r, r, col, al);
    game.draw.circle(x + w - r, y + r, r, col, al);
    game.draw.circle(x + r, y + h - r, r, col, al);
    game.draw.circle(x + w - r, y + h - r, r, col, al);
  }
  function ring(x, y, rx, ry, col, w) {
    var n = 28;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * rx, y + Math.sin(a0) * ry, x + Math.cos(a1) * rx, y + Math.sin(a1) * ry, col, w);
    }
  }

  function drawWorld() {
    // 曇り空(ほぼ1色)と遠くの照明塔
    game.draw.gradient(0, 440, [[0, C.sky], [1, C.sky2]]);
    for (var l = 0; l < 2; l++) {
      var lx = l ? 980 : 100;
      game.draw.rect(lx - 6, 250, 12, 200, '#5f7186');
      rrect(lx - 50, 230, 100, 44, 12, '#5f7186');
      for (var k = 0; k < 3; k++) game.draw.circle(lx - 28 + k * 28, 252, 10, beatPulse > 0.5 ? '#fff6c8' : '#e8e2c0');
    }
    // 芝(帯で刈り目)
    game.draw.rect(0, 440, W, H - 440, C.pitch);
    for (var s = 0; s < 7; s++) {
      var y0 = 440 + s * s * 30 + s * 40, y1 = 440 + (s + 1) * (s + 1) * 30 + (s + 1) * 40;
      if (s % 2 === 0) game.draw.rect(0, y0, W, y1 - y0, C.stripe);
    }
    // ペナルティエリアの線(奥へすぼまる)
    game.draw.line(120, LINE_Y, W - 120, LINE_Y, C.white, 6);
    game.draw.line(150, LINE_Y, 20, 1300, C.white, 6);
    game.draw.line(W - 150, LINE_Y, W - 20, 1300, C.white, 6);
    game.draw.line(20, 1300, W - 20, 1300, C.white, 6);
    // 水たまり
    var pud = [[300, 1000, 110, 26], [760, 1120, 140, 30], [520, 880, 80, 18], [880, 1480, 120, 28]];
    for (var p = 0; p < pud.length; p++) {
      var q = pud[p];
      rrect(q[0] - q[2], q[1] - q[3], q[2] * 2, q[3] * 2, q[3], C.puddle, 0.8);
      var rr = (game.time.elapsed * 1.4 + p * 0.37) % 1;
      ring(q[0] - 30 + p * 10, q[1], 10 + rr * 40, 3 + rr * 10, C.rain, 3);
    }
    drawGoal();
  }

  function drawGoal() {
    // ネット(格子)
    game.draw.rect(POST_L, BAR_Y - 70, POST_R - POST_L, LINE_Y - BAR_Y + 70, '#dfe7ef', 0.35);
    for (var x = POST_L; x <= POST_R; x += 40) game.draw.line(x, BAR_Y - 70, x, LINE_Y, C.net, 2);
    for (var y = BAR_Y - 70; y <= LINE_Y; y += 40) game.draw.line(POST_L, y, POST_R, y, C.net, 2);
    // キーパー(練習相手)
    var fr = Math.floor(game.time.elapsed * 3) % 2;
    var kx = keeperX + keeperDive * 120;
    game.draw.sprite(KEEPER[fr], KPAL, kx, LINE_Y - 120, 11, { anchor: 'center' });
    // 柱とバー
    game.draw.rect(POST_L - 12, BAR_Y - 10, 24, LINE_Y - BAR_Y + 10, C.white);
    game.draw.rect(POST_R - 12, BAR_Y - 10, 24, LINE_Y - BAR_Y + 10, C.white);
    game.draw.rect(POST_L - 12, BAR_Y - 12, POST_R - POST_L + 24, 24, C.white);
  }

  function drawCoach() {
    var kickNow = false;
    for (var i = 0; i < balls.length; i++) { var b = balls[i]; if (clock >= b.head - TELE_T && clock < b.head - TELE_T + 0.2) kickNow = true; }
    game.draw.sprite(COACH, CPAL, COACH_X, COACH_Y - 60 - (kickNow ? 10 : 0), 10, { anchor: 'center' });
  }

  function drawBalls() {
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.res === 1 || b.res === 2) continue;
      if (b.res === 3 && (b.weak || clock > b.land + 0.6)) continue;
      if (b.res === 4 && clock > b.land + 0.9) continue;
      // 落ちる先の輪(柱の球は遠く・橙。0.6秒前から)
      if (!b.res && clock >= b.head - TELE_T) {
        var k = Math.max(0, Math.min(1, (b.land - clock) / (b.land - b.head + TELE_T)));
        var col = b.kind === 'L' ? C.long : C.gold;
        ring(b.lx, FOOT_Y + 8, 54 + k * 80, 16 + k * 22, col, 6);
        game.draw.circle(b.lx, FOOT_Y + 8, 12, col);
        if (b.kind === 'L') ring(b.lx, FOOT_Y + 8, 70 + k * 80, 22 + k * 22, col, 3);
      }
      var p = ballScreen(b, clock);
      if (!p) continue;
      if (b.res === 4) {
        var a = clock - b.land;
        p = { x: b.lx + a * 300, y: FOOT_Y - Math.abs(Math.sin(a * 9)) * 40 / (1 + a * 3) + a * 500, s: 10, gx: b.lx + a * 300, gy: FOOT_Y + a * 500 };
      } else if (b.res === 3 && clock > b.land) {
        var a2 = clock - b.land;
        p = { x: b.lx - a2 * 200, y: FOOT_Y + a2 * 400, s: 10, gx: b.lx - a2 * 200, gy: FOOT_Y + a2 * 400 };
      }
      if (p.gx !== undefined) game.draw.circle(p.gx, p.gy + 6, p.s * 2.6, '#2f7a52', 0.7);
      var flash = hitStop > 0 && Math.abs(missX - p.x) < 4;
      if (flash) game.draw.circle(p.x, p.y, p.s * 5, '#ffffff', 0.6);
      game.draw.sprite(BALL, { w: flash ? '#ffffff' : C.white, k: flash ? '#ffffff' : C.ink }, p.x, p.y, flash ? p.s * 1.4 : p.s, { anchor: 'center' });
    }
    for (var j = 0; j < shots.length; j++) {
      var s = shots[j];
      var t = Math.min(1, s.t / s.dur);
      var x = s.x0 + (s.x1 - s.x0) * t, y = s.y0 + (s.y1 - s.y0) * t - Math.sin(t * Math.PI) * 60;
      game.draw.sprite(BALL, { w: C.white, k: C.ink }, x, y, 10 - t * 4, { anchor: 'center' });
    }
  }

  function drawForward() {
    var x = fwdX, y = FOOT_Y - 70;
    rrect(x - 80, FOOT_Y + 40, 160, 22, 11, '#2f7a52', 0.8);
    var spr, pal = FPAL;
    if (pose === 'miss' && poseT > 0) { spr = FWD_MISS; if (hitStop > 0) pal = WPAL; }
    else if (pose === 'kick' && poseT > 0) spr = FWD_KICK;
    else if (pose === 'wind' && hold) spr = FWD_WIND;
    else spr = FWD_IDLE[Math.floor(game.time.elapsed * 3) % 2];
    game.draw.sprite(spr, pal, x, y - beatPulse * 6, 13, { anchor: 'center' });
  }

  // 球と地面の差(ニアミスの線)
  function drawGap() {
    if (!gap) return;
    var a = Math.min(1, gap.t);
    if (gap.late) {
      label('+' + Math.max(0.01, gap.d).toFixed(2) + '秒', Math.min(W - 150, gap.x + 230), gap.y - 40, 44, C.red);
      return;
    }
    var top = gap.y - gap.h;
    game.draw.rect(gap.x + 60, top, 10, Math.max(4, gap.h), gap.col, a);
    game.draw.rect(gap.x + 40, top - 4, 50, 8, gap.col, a);
    game.draw.rect(gap.x + 40, gap.y - 4, 50, 8, gap.col, a);
    var s = gap.early ? 'あと' + gap.cm + 'cm' : gap.cm + 'cm';
    if (a > 0.05) {
      rrect(gap.x + 96, top + gap.h / 2 - 36, 210, 64, 32, gap.col, a);
      label(s, gap.x + 201, top + gap.h / 2 + 12, 40, C.ink);
    }
  }

  function drawRain() {
    var dt = game.time.delta || 0.016;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      d.y += d.s * dt; d.x -= d.s * 0.18 * dt;
      if (d.y > H) { d.y = game.random(-200, 0); d.x = game.random(0, W + 200); }
      game.draw.line(d.x, d.y, d.x + 8, d.y - 40, C.rain, 3);
    }
  }

  // 拍の帯(8分のピル。裏拍は大きく、球が落ちる裏拍は球の印)
  function drawMeter(pressing, k) {
    var y = METER_Y;
    rrect(40, y - 56, W - 80, 112, 56, C.ink, 0.85);
    var q = Math.max(0, Math.floor(clock / SPB));
    var bar = Math.floor(q / 4);
    var cur = clock < 0 ? -1 : Math.floor(clock / (SPB / 2));
    for (var i = 0; i < 8; i++) {
      var idx = bar * 8 + i;
      var x = 120 + i * 120;
      var off = i % 2 === 1;
      var landHere = false;
      for (var b = 0; b < balls.length; b++) if (Math.abs(balls[b].land - idx * SPB / 2) < 0.01) landHere = balls[b].kind;
      var lit = idx === cur;
      var col = lit ? (off ? C.gold : C.white) : (off ? '#4a5a70' : '#3a4658');
      rrect(x - (off ? 44 : 30), y - (off ? 30 : 20), off ? 88 : 60, off ? 60 : 40, off ? 30 : 20, col);
      if (landHere) game.draw.circle(x, y, 14, landHere === 'L' ? C.long : C.gold);
    }
    // 親指の溜めボタン
    var bx = W / 2, by = H * 0.9;
    game.draw.circle(bx, by, 92, pressing ? C.kit : '#4a5a70');
    var n = 24, fill = Math.floor(n * k);
    for (var j = 0; j < n; j++) {
      var a0 = -Math.PI / 2 + j / n * Math.PI * 2, a1 = -Math.PI / 2 + (j + 0.8) / n * Math.PI * 2;
      game.draw.line(bx + Math.cos(a0) * 110, by + Math.sin(a0) * 110, bx + Math.cos(a1) * 110, by + Math.sin(a1) * 110, j < fill ? (k >= 1 ? C.gold : C.white) : '#4a5a70', 12);
    }
    game.draw.sprite(['..ww', '.www', 'wwww', 'www.', '.w..'], { w: C.white }, bx, by, 14, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink);
    label('SCORE ' + score, 50, 96, 46, C.white, 'left');
    if (combo >= 2) label('x' + combo, W - 50, 96, 46, C.gold, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - nMiss;
      game.draw.circle(80 + i * 64, 168, 22, on ? C.white : '#3a4658');
      if (on) game.draw.circle(80 + i * 64, 168, 9, C.ink);
    }
    label(nGoal + ' / ' + balls.length, W - 50, 182, 38, C.net, 'right');
    progress = Math.max(0, Math.min(1, clock / END_T));
    rrect(300, 156, 440, 24, 12, '#3a4658');
    if (440 * progress >= 24) rrect(300, 156, 440 * progress, 24, 12, C.pitch);
  }

  function drawScene(pressing, k) {
    drawWorld();
    drawCoach();
    drawForward();
    drawBalls();
    drawGap();
    drawRain();
    drawMeter(pressing, k);
  }

  function drawResult(showTap) {
    var y0 = H * 0.26, hh = H * 0.4;
    rrect(50, y0, W - 100, hh, 48, C.white, 0.96);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 92, won ? C.kit : C.red);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.ink);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, C.ink);
    label(nGoal + ' / ' + balls.length, W / 2, H * 0.49, 46, C.ink);
    if (bestCm < 999) label(bestCm + 'cm', W / 2, H * 0.53, 44, C.kit);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.575, 56, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.575, 42, C.ink);
    if (!won) {
      if (nearEarly < 999) label('あと' + nearEarly + 'cm!', W / 2, H * 0.62, 52, C.red);
      else label('あと' + Math.max(1, balls.length - nGoal - nMiss) + '球!', W / 2, H * 0.62, 52, C.red);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.68, 34, C.white);
  }

  // ---- ATTRACT: 実ロジックで2小節。奇数周は柱の球も着地まで待つ、偶数周は柱の球をいつもの裏拍で蹴って空振り ----
  var demo = { t: 0, cyc: 0, plan: [], k: 0, down: false };
  var DEMO_CYC = 2 * BAR + 1.0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initRun(true); demo.cyc++;
      var fail = demo.cyc % 2 === 0;
      demo.plan = [];
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        var rel = b.kind === 'L' && fail ? b.head + 0.5 * SPB : b.land + 0.01;
        demo.plan.push({ press: b.head - 0.05, rel: rel });
      }
      demo.k = 0; demo.down = false;
    }
    if (hitStop > 0) { hitStop -= dt; } else stepRun(dt);
    var pl = demo.plan[demo.k];
    if (pl && hitStop <= 0) {
      if (!demo.down && clock >= pl.press) { pressDown(); demo.down = true; }
      if (demo.down && clock >= pl.rel) { releaseKick(); demo.down = false; demo.k++; }
    }
  }

  function animate(dt) {
    if (poseT > 0) poseT -= dt; else if (pose !== 'wind') pose = 'idle';
    if (keeperDive !== 0) { keeperDive *= Math.max(0, 1 - dt * 1.5); if (Math.abs(keeperDive) < 0.02) keeperDive = 0; }
    if (gap) { gap.t -= dt; if (gap.t <= 0) gap = null; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (judge) { judge.t -= dt; if (judge.t <= 0) judge = null; }

    if (state === S.ATTRACT) {
      if (!balls) initRun(true);
      stepDemo(dt);
      animate(dt);
      var dk = hold ? Math.min(1, (clock - hold.t0) / MIN_HOLD) : 0;
      drawScene(!!hold, dk);
      game.draw.hand(W / 2 + 30, H * 0.9 + 40, { press: !!hold, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink);
      label(GAME_TITLE, W / 2, 120, 88 + Math.sin(t * 2.5) * 3, C.white);
      label('HI-SCORE ' + game.best, W / 2, 196, 36, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.gold);
      else label('TAP TO START', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      animate(dt);
      drawScene(false, 0);
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
    animate(dt);
    var k = hold ? Math.min(1, (clock - hold.t0) / MIN_HOLD) : 0;
    drawScene(!!hold, k);
    drawHud();
    if (clock < 0) {
      rrect(140, H * 0.42, W - 280, 170, 85, C.ink, 0.9);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 118, 100, C.white);
    }
    // 最初の1球だけ、押して溜めて離す手を薄いゴーストで示す
    if (!over && balls.length && !balls[0].res && clock > balls[0].head - TELE_T) {
      var b0 = balls[0];
      game.draw.hand(W / 2 + 30, H * 0.9 + 40, { press: clock >= b0.head - 0.05 && clock < b0.land, scale: 13, alpha: 0.45 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
