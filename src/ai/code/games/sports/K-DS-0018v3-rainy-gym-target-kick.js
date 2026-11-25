// K-DS-0018v3-rainy-gym-target-kick.js
// 雨の日の的蹴り — 拍の頭ごとに横へ跳ぶ的の列を見て、その拍の裏で足元の球を蹴り当てる
// 操作: 画面下に並ぶ5つの球のうち、的がいる列の球をタップして蹴る(列はタップした横位置で決まる)。的は拍の頭で次の列へ跳んで灯りがともり、その拍の裏(半拍後)に蹴れば当たる。次に跳ぶ列は1拍前に点線の枠で出る。拍の頭に蹴る・列違い・裏を逃すとMISS。灯りの消えた的を蹴っても罰なし。笛が鳴って床に黄色い帯が点滅したら、マットの台車が的の前を横切る拍なので蹴らずに待つ(蹴るとマットに当たってMISS)
// 終わり: 8小節(16秒・23回)を蹴り終えればCLEAR(当てた数と判定でスコア)。MISSが4つでGAME OVER
// @mechanic: aim_shoot
// @theme: rainy_day_indoor_target_kick
// 世界観: 雨で外が使えない日の室内練習場で、少年団の控え選手が、拍ごとに左右へ跳ぶ練習用の的へ、裏拍のたびに足元の球を蹴り当てていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・命中数・PERFECT/GOOD/MISS数・台車を見送った数・最大コンボ
// スタイル: SKEUOMORPH

(function (game) {
  var STYLE = { bg: ['#3b2a1e', '#c99a5b'], main: ['#efe4cc', '#2f6fb0', '#c8372d'], accent: ['#ffcf3f', '#3c8a46'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・ビニールのマット・フェルト・真鍮。面は帯状の段階塗りで厚みを、光沢は白い差しで出す
  var WALNUT = STYLE.bg[0], HONEY = STYLE.bg[1];
  var CREAM = STYLE.main[0], MATBLUE = STYLE.main[1], RED = STYLE.main[2];
  var BRASS = STYLE.accent[0], FELT = STYLE.accent[1];
  var INK = '#1d140d';

  var TITLE = 'RAINY KICK';
  var BPM = 120;
  var SPB = 60 / BPM;             // 1拍 0.5秒。蹴るのは裏(拍の頭 + 0.25秒)
  var LEAD = 0.06;
  var BARS = 8;
  var TIME_LIMIT = 16;            // 8小節 = 16秒。放置でも READY 0.8 + 16 + 余韻 1.6 = 18.4秒で終わる
  var PERFECT_W = 0.045, GOOD_W = 0.1, NOTE_RANGE = 0.25;
  var STOP = 0.35;                // 失敗時のヒットストップ
  var MISS_MAX = 4;
  var FLY = 0.18;                 // 球が壁まで飛ぶ時間
  var LANES = 5;
  var WALL_X = [200, 370, 540, 710, 880];
  var BALL_X = [108, 324, 540, 756, 972];
  var TGT_Y = 640, RAIL_Y = 792;
  var BALL_Y = Math.round(H * 0.83);
  var KID_Y = 1430;
  var CART_LEAD = 1.5;            // 台車の予告は1.5拍前(0.75秒)

  // 的が跳び込む拍と列。前半は1小節に1〜2回、後半は毎拍。台車の拍で「いつもの裏」を止める
  var NOTES = [
    [2, 2],
    [4, 1], [6, 3],
    [8, 0], [10, 2], [11, 4],
    [12, 3], [14, 1], [15, 2],
    [16, 4], [17, 3], [19, 1],
    [20, 0], [21, 1], [22, 2], [23, 3],
    [24, 4], [25, 2], [27, 0],
    [28, 1], [29, 3], [31, 4]
  ];
  var CARTS = [18, 26, 30];
  var DEMO_NOTES = [[2, 2], [3, 0], [4, 3], [6, 1]];
  var DEMO_CARTS = [5];
  var DEMO_OFF = [0, -0.25, 0.07, 0];   // デモ: 2回目は拍の頭で蹴ってしまう失敗例

  // 伴奏(オリジナル): 頭はベース(ズン)、裏は鍵盤(チャッ)。台車の拍は裏を抜く
  var ROOT = [['C3', 'G2'], ['G2', 'D3'], ['A2', 'E3'], ['F2', 'C3'], ['C3', 'G2'], ['G2', 'D3'], ['F2', 'C3'], ['C3', 'G2']];
  var PAH = [['E5', 'G5', 'E5', 'G5'], ['D5', 'G5', 'B4', 'D5'], ['C5', 'E5', 'A5', 'E5'], ['A4', 'C5', 'F5', 'C5'], ['E5', 'G5', 'C6', 'G5'], ['D5', 'B4', 'G5', 'D5'], ['F5', 'A5', 'C5', 'A4'], ['E5', 'G5', 'C6', 'C6']];

  // ---- スプライト: 背番号のビブを着た控え選手(後ろ姿) ----
  var KID_A = ['...hhhh...', '..hhhhhh..', '..hhhhhh..', '...ssss...', '.bbbbbbbb.', 'sbbwwwwbbs', 'sbbwbbwbbs', 'sbbwwwwbbs', '.bbbbbbbb.', '..kkkkkk..', '..kk..kk..', '..ss..ss..', '..ss..ss..', '.ooo..ooo.'];
  var KID_B = ['..........', '...hhhh...', '..hhhhhh..', '..hhhhhh..', '.sbbbbbbs.', 'sbbwwwwbbs', '.bbwbbwbb.', '.bbwwwwbb.', '.bbbbbbbb.', '..kkkkkk..', '..kk..kk..', '..ss..ss..', '..ss..ss..', '.ooo..ooo.'];
  var KID_KICK = ['...hhhh...', '..hhhhhh..', '..hhhhhh..', 's..ssss..s', 'sbbbbbbbbs', '.bbwwwwbb.', '.bbwbbwbb.', '.bbwwwwbb.', '.bbbbbbbb.', '..kkkkkk..', '..kk..kk..', '..ss...ss.', '..ss....ss', '.ooo....oo'];
  var KID_PAL = { h: '#3a2414', s: '#f1c49a', b: '#e9752a', w: '#fff6e6', k: '#2b3a66', o: '#f4f4f4' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, notes, carts, running, songT, beatN, schedBar, readyT, headFlash, andFlash;
  var shots, kidX, kidGoal, kickT, stopT, stopX, stopY, stopKind, badPending, judgeW, judgeT;
  var score, hits, perfects, goods, misses, dodges, combo, maxCombo, over, won, outroT, prevBest, milestone;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var ns = demoMode ? DEMO_NOTES : NOTES, cs = demoMode ? DEMO_CARTS : CARTS;
    notes = []; carts = [];
    for (var i = 0; i < ns.length; i++) notes.push({ b: ns[i][0], lane: ns[i][1], done: false, hit: false, pressed: false });
    for (var j = 0; j < cs.length; j++) carts.push({ b: cs[j], warned: false, kicked: false, passed: false });
    running = false; songT = 0; beatN = -1; schedBar = 0;
    readyT = demoMode ? 0 : 0.8;
    headFlash = 0; andFlash = 0;
    shots = []; kidX = BALL_X[2]; kidGoal = kidX; kickT = 0;
    stopT = 0; stopX = 0; stopY = 0; stopKind = ''; badPending = false; judgeW = ''; judgeT = 0;
    score = 0; hits = 0; perfects = 0; goods = 0; misses = 0; dodges = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = 0;
    if (demoMode) running = true;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }
  function isCartBeat(b) { for (var i = 0; i < carts.length; i++) if (carts[i].b === b) return true; return false; }

  function playBar(n) {
    if (demoMode) return;
    var r = ROOT[n % ROOT.length], p = PAH[n % PAH.length], mel = [], bass = [];
    for (var i = 0; i < 4; i++) {
      var b = n * 4 + i;
      bass.push([r[i % 2], 0.5]); bass.push(['R', 0.5]);
      mel.push(['R', 0.5]); mel.push([isCartBeat(b) ? 'R' : p[i], 0.5]);
    }
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.035, bass: bass, bassWave: 'triangle', bassVolume: 0.11 });
  }

  // ---- 拍クロック(1本だけ)。ヒットストップ中も止めない ----
  function stepClock(dt) {
    if (!running) return;
    songT += dt;
    while (schedBar < BARS && songT >= schedBar * 4 * SPB - LEAD) { playBar(schedBar); schedBar++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; headFlash = 1; }
    var ph = songT / SPB - Math.floor(songT / SPB);
    if (ph >= 0.5 && ph < 0.5 + 0.12 && andFlash <= 0.4) andFlash = 1;
  }

  // ---- 的の位置: 直前に跳び込んだ列。拍の頭から0.12秒で横へ跳ぶ ----
  function targetState(t) {
    var lane = 2, prev = 2, hop = -9, lit = null;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].b * SPB <= t) { prev = lane; lane = notes[i].lane; hop = notes[i].b * SPB; lit = notes[i]; }
      else break;
    }
    var k = Math.max(0, Math.min(1, (t - hop) / 0.12));
    var e = k * k * (3 - 2 * k);
    return { x: WALL_X[prev] + (WALL_X[lane] - WALL_X[prev]) * e, jump: Math.sin(Math.PI * k) * 46, lane: lane, on: !!(lit && !lit.done) };
  }

  function nextNote() {
    for (var i = 0; i < notes.length; i++) if (notes[i].b * SPB > songT) return notes[i];
    return null;
  }

  function say(word, x, y, col) {
    judgeW = word; judgeT = 0.45;
    if (demoMode) game.fx.popup(word, x, y, { color: col, size: 56 });
  }

  function fail(kind, x, y) {
    misses++; combo = 0;
    stopT = STOP; stopKind = kind; stopX = x; stopY = y; badPending = true;
    game.fx.flash('#ffffff', 0.07);
  }

  // ---- 蹴る: タップの横位置で列を決め、いちばん近い裏の拍で判定 ----
  function kick(x) {
    if (!running || over) return 'none';
    var lane = Math.max(0, Math.min(LANES - 1, Math.floor(x / (W / LANES))));
    kidGoal = BALL_X[lane]; kickT = 0.2;
    var T = songT;
    var shot = { lane: lane, t0: T, kind: 'free', note: null };
    shots.push(shot);
    for (var c = 0; c < carts.length; c++) {
      var ca = carts[c];
      if (Math.abs(T - (ca.b + 0.5) * SPB) <= NOTE_RANGE) {
        ca.kicked = true; shot.kind = 'mat';
        say('MISS', WALL_X[lane], TGT_Y - 200, RED);
        sfx(150, 0.1, { wave: 'square', volume: 0.06 });
        return 'miss';
      }
    }
    var n = null;
    for (var i = 0; i < notes.length; i++) {
      if (!notes[i].done && Math.abs(T - (notes[i].b + 0.5) * SPB) <= NOTE_RANGE) { n = notes[i]; break; }
    }
    if (!n) return 'free';
    n.done = true;
    var a = Math.abs(T - (n.b + 0.5) * SPB);
    if (lane !== n.lane || a > GOOD_W) {
      shot.kind = 'wall';
      say('MISS', WALL_X[lane], TGT_Y - 200, RED);
      sfx(170, 0.09, { wave: 'sawtooth', volume: 0.05, slide: -50 });
      return 'miss';
    }
    var perfect = a <= PERFECT_W;
    shot.kind = 'hit'; shot.note = n; n.hit = true;
    hits++; combo++; if (combo > maxCombo) maxCombo = combo;
    if (perfect) perfects++; else goods++;
    score += perfect ? 100 + combo * 10 : 60 + combo * 5;
    say(perfect ? 'PERFECT' : 'GOOD', WALL_X[lane], TGT_Y - 200, perfect ? BRASS : CREAM);
    if (combo === 10 || combo === 18) {
      if (!demoMode) game.audio.play('se_milestone', 0.4);
      game.fx.popup(combo + ' COMBO', W / 2, 960, { color: BRASS, size: 76 });
    }
    return perfect ? 'perfect' : 'good';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (ok) {
      score += 300 + dodges * 50;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(450, 1100), { color: i % 2 ? BRASS : RED, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    stepClock(dt);
    if (!running) return;
    if (headFlash > 0) headFlash = Math.max(0, headFlash - dt * 5);
    if (andFlash > 0) andFlash = Math.max(0, andFlash - dt * 5);
    if (kickT > 0) kickT -= dt;
    if (judgeT > 0) judgeT -= dt;
    kidX += (kidGoal - kidX) * Math.min(1, dt * 22);
    // 着弾
    for (var i = shots.length - 1; i >= 0; i--) {
      var s = shots[i];
      if (!s.landed && songT >= s.t0 + FLY) {
        s.landed = true;
        if (s.kind === 'hit') {
          sfx(880, 0.08, { wave: 'triangle', volume: 0.1, slide: 220 });
          game.fx.burst(WALL_X[s.lane], TGT_Y, { color: BRASS, count: 12, speed: 300 });
          if (!demoMode) game.feedback.good(WALL_X[s.lane], TGT_Y, { text: null, color: BRASS, count: 6, volume: 0.15 });
        } else if (s.kind === 'wall') {
          fail('wall', WALL_X[s.lane], TGT_Y + 40);
        } else if (s.kind === 'mat') {
          fail('mat', WALL_X[s.lane], TGT_Y + 20);
        } else {
          sfx(240, 0.05, { wave: 'triangle', volume: 0.03 });
        }
      }
      if (songT > s.t0 + 0.7) shots.splice(i, 1);
    }
    // 裏を逃した的
    for (var j = 0; j < notes.length; j++) {
      var n = notes[j];
      if (!n.done && songT > (n.b + 0.5) * SPB + GOOD_W) {
        n.done = true;
        say('MISS', WALL_X[n.lane], TGT_Y - 200, RED);
        sfx(200, 0.12, { wave: 'square', volume: 0.05, slide: -90 });
        fail('pass', WALL_X[n.lane], TGT_Y);
      }
    }
    // 台車: 予告の笛 → 横切る → 見送れたら NICE
    for (var c = 0; c < carts.length; c++) {
      var ca = carts[c];
      if (!ca.warned && songT >= (ca.b - CART_LEAD) * SPB) {
        ca.warned = true;
        sfx(2093, 0.07, { wave: 'square', volume: 0.05 });
        sfx(2637, 0.1, { wave: 'square', volume: 0.05 });
      }
      if (!ca.passed && songT >= (ca.b + 1) * SPB + 0.1) {
        ca.passed = true;
        if (!ca.kicked) {
          dodges++; score += 50;
          game.fx.popup('NICE', W / 2, 520, { color: FELT, size: 54 });
        }
      }
    }
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0 && badPending) {
        badPending = false;
        if (!demoMode) game.feedback.bad(stopX, stopY, { text: null, shake: 8 });
        else game.fx.shake(5, 0.15);
        if (!demoMode && misses >= MISS_MAX) finish(false);
      }
    }
    if (!demoMode && !over && songT >= BARS * 4 * SPB) finish(true);
    if (!demoMode && !over && songT > TIME_LIMIT + 0.5) finish(misses < MISS_MAX);
  }

  // ---- 描画ヘルパー(質感) ----
  function hx(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) {
    var A = hx(a), B = hx(b), out = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(A[i] + (B[i] - A[i]) * t); out += (v < 16 ? '0' : '') + v.toString(16); }
    return out;
  }
  function slab(x, y, w, h, top, bot, n) {
    var sh = h / n;
    for (var i = 0; i < n; i++) game.draw.rect(x, y + i * sh, w, sh + 1, mix(top, bot, i / (n - 1)));
  }
  function bevel(x, y, w, h, top, bot) {
    slab(x, y, w, h, top, bot, 6);
    game.draw.rect(x, y, w, 3, '#ffffff', 0.35);
    game.draw.rect(x, y + h - 3, w, 3, '#000000', 0.25);
  }
  function stitch(x, y, w, h) {
    for (var i = x + 10; i < x + w - 10; i += 18) { game.draw.rect(i, y + 8, 9, 2, CREAM, 0.6); game.draw.rect(i, y + h - 10, 9, 2, CREAM, 0.6); }
    for (var j = y + 10; j < y + h - 10; j += 18) { game.draw.rect(x + 8, j, 2, 9, CREAM, 0.6); game.draw.rect(x + w - 10, j, 2, 9, CREAM, 0.6); }
  }
  function glossBall(x, y, r, alpha) {
    game.draw.circle(x + r * 0.06, y + r * 0.12, r, '#5c5246', alpha);
    game.draw.circle(x, y, r * 0.96, '#f6f2ea', alpha);
    game.draw.circle(x + r * 0.15, y + r * 0.2, r * 0.7, '#ddd5c6', alpha);
    game.draw.circle(x, y, r * 0.28, '#3a3a3a', alpha);
    game.draw.circle(x - r * 0.55, y - r * 0.2, r * 0.18, '#3a3a3a', alpha);
    game.draw.circle(x + r * 0.5, y - r * 0.35, r * 0.17, '#3a3a3a', alpha);
    game.draw.circle(x - r * 0.35, y - r * 0.45, r * 0.22, '#ffffff', 0.7 * (alpha === undefined ? 1 : alpha));
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawRoom() {
    var t = game.time.elapsed;
    // 上の壁と高窓(外は雨)
    game.draw.gradient(230, 430, [[0, '#d8cbb3'], [1, '#bfae92']]);
    for (var w = 0; w < 3; w++) {
      var wx = 90 + w * 330;
      bevel(wx - 10, 258, 280, 150, '#8a6a48', '#5e4630');
      slab(wx, 268, 260, 130, '#7d93a8', '#4b5d70', 6);
      for (var r = 0; r < 9; r++) {
        var rx = wx + ((r * 47 + t * 260) % 260), ry = 272 + ((r * 31 + t * 520) % 100);
        game.draw.line(rx, ry, rx - 6, ry + 22, '#d6e4f0', 2);
      }
      game.draw.rect(wx + 128, 268, 4, 130, '#5e4630');
    }
    // ビニールのマットを張った壁
    for (var p = 0; p < 6; p++) {
      var px = p * 180;
      bevel(px + 3, 430, 174, 360, '#3f82c8', '#24578f');
      stitch(px + 3, 430, 174, 360);
    }
    // 的のレール
    bevel(0, RAIL_Y - 10, W, 22, '#cfd4d8', '#7e868c');
    // 木の床(奥へ収束する板目)
    game.draw.gradient(812, 1500, [[0, '#a87a45'], [0.4, HONEY], [1, '#d8ac6c']]);
    for (var k = -6; k <= 6; k++) {
      var nx = 540 + k * 120;
      game.draw.line(540 + (nx - 540) * 0.6, 812, nx, 1500, '#8a5f33', 2);
    }
    for (var g = 0; g < 9; g++) {
      var gy = 830 + g * g * 8 + g * 22;
      game.draw.line(0, gy, W, gy, '#ffffff', 1);
    }
    // 列の白線
    for (var l = 0; l <= LANES; l++) {
      var nearX = l * (W / LANES), farX = 540 + (nearX - 540) * 0.787;
      game.draw.line(farX, 812, nearX, 1500, CREAM, 4);
    }
    // 親指の帯: 緑のフェルト
    game.draw.gradient(1500, H, [[0, '#2e6e38'], [0.5, FELT], [1, '#245a2e']]);
    for (var f = 0; f < 40; f++) game.draw.rect((f * 211) % W, 1510 + (f * 97) % 400, 3, 3, '#5aa866', 0.5);
  }

  function drawCartWarning() {
    var t = game.time.elapsed;
    for (var c = 0; c < carts.length; c++) {
      var ca = carts[c];
      var t0 = (ca.b - CART_LEAD) * SPB, t1 = (ca.b + 1) * SPB + 0.1;
      if (songT < t0 || songT > t1) continue;
      if (Math.floor(t * 10) % 2 === 0) {
        for (var i = 0; i < 24; i++) game.draw.rect(i * 46, 814, 23, 26, i % 2 ? '#1d1d1d' : BRASS, 0.9);
      }
      // 台車: 頭の拍から次の拍まで、的の前を左から右へ
      var u = (songT - (ca.b * SPB - 0.06)) / (SPB + 0.16);
      var cx = u < 0 ? -110 + Math.sin(t * 20) * 8 : -110 + (W + 370) * Math.min(1, u);
      if (u > 1.05) continue;
      var white = stopKind === 'mat' && stopT > 0;
      for (var m = 0; m < 4; m++) bevel(cx - 150, 520 + m * 62, 300, 60, white ? '#ffffff' : '#4f93d6', white ? '#e8eef4' : '#2a5d93');
      bevel(cx - 165, 768, 330, 22, '#9aa1a6', '#5c6368');
      game.draw.circle(cx - 120, 796, 16, '#2a2a2a');
      game.draw.circle(cx + 120, 796, 16, '#2a2a2a');
    }
  }

  function drawTarget() {
    var ts = targetState(songT);
    var x = ts.x, y = TGT_Y - ts.jump;
    var white = stopT > 0 && (stopKind === 'pass' || stopKind === 'wall');
    var sc = white ? 1.18 : 1;
    // 次に跳ぶ列の点線枠(1拍前)
    var nn = nextNote();
    if (nn && songT >= (nn.b - 1) * SPB) {
      var nx = WALL_X[nn.lane];
      for (var d = 0; d < 16; d++) {
        var a = d / 16 * Math.PI * 2;
        game.draw.circle(nx + Math.cos(a) * 92, TGT_Y + Math.sin(a) * 92, 5, BRASS, 0.9);
      }
    }
    // スタンドと車輪
    game.draw.rect(x - 34, y + 60, 8, RAIL_Y - y - 60, '#6b4a2c');
    game.draw.rect(x + 26, y + 60, 8, RAIL_Y - y - 60, '#6b4a2c');
    game.draw.circle(x - 30, RAIL_Y + 2, 10, '#2a2a2a');
    game.draw.circle(x + 30, RAIL_Y + 2, 10, '#2a2a2a');
    // 木枠とフェルトの同心円
    game.draw.circle(x + 4, y + 8, 84 * sc, '#000000', 0.25);
    game.draw.circle(x, y, 84 * sc, white ? '#ffffff' : '#8a5a2e');
    game.draw.circle(x, y, 76 * sc, white ? '#ffffff' : '#a87443');
    var rings = [RED, CREAM, RED, CREAM, RED];
    for (var r = 0; r < 5; r++) game.draw.circle(x, y, (68 - r * 13) * sc, white ? '#ffffff' : rings[r]);
    game.draw.circle(x - 22, y - 26, 16, '#ffffff', 0.35);
    // 灯り: 跳び込んで当てるのを待っている間だけともる
    game.draw.circle(x, y - 104, 16, ts.on ? BRASS : '#6a5a40');
    if (ts.on) { game.draw.circle(x, y - 104, 30, BRASS, 0.3); game.draw.circle(x - 5, y - 109, 5, '#ffffff', 0.8); }
  }

  function drawShots() {
    for (var i = 0; i < shots.length; i++) {
      var s = shots[i];
      var u = (songT - s.t0) / FLY;
      var x0 = BALL_X[s.lane], x1 = WALL_X[s.lane];
      if (u <= 1) {
        var x = x0 + (x1 - x0) * u, y = BALL_Y + (TGT_Y + 30 - BALL_Y) * u - Math.sin(Math.PI * u) * 80;
        glossBall(x, y, 60 - 30 * u);
      } else if (s.kind === 'wall' || s.kind === 'mat') {
        var fr = stopT > 0 ? 1.25 : 1;
        var bu = Math.min(1, (u - 1) * FLY / 0.5);
        glossBall(x1, TGT_Y + 40 + bu * 180, 32 * fr);
        if (stopT > 0) game.draw.circle(x1, TGT_Y + 40, 48, '#ffffff', 0.6);
      } else {
        var du = Math.min(1, (u - 1) * FLY / 0.45);
        glossBall(x1, TGT_Y + 40 + du * 140, 30, 1 - du * 0.6);
      }
    }
  }

  function drawRack() {
    for (var i = 0; i < LANES; i++) {
      var x = BALL_X[i];
      game.draw.circle(x, BALL_Y + 52, 74, '#1e4a26', 0.6);
      game.draw.circle(x, BALL_Y + 50, 70, '#7a4b26');
      game.draw.circle(x, BALL_Y + 50, 60, '#5a3618');
      var away = false;
      for (var s = 0; s < shots.length; s++) if (shots[s].lane === i && songT - shots[s].t0 < 0.3) away = true;
      if (!away) glossBall(x, BALL_Y, 60);
    }
  }

  function drawKid() {
    var art = kickT > 0 ? KID_KICK : (Math.floor(songT / SPB) % 2 ? KID_B : KID_A);
    game.draw.circle(kidX, KID_Y + 78, 46, '#000000', 0.2);
    game.draw.sprite(art, KID_PAL, kidX, KID_Y, 11, { anchor: 'center' });
  }

  // 壁時計がわりの振り子メトロノームと、頭(白)・裏(橙)のランプ
  function drawPlaque() {
    game.draw.gradient(0, 230, [[0, '#5a3d27'], [0.5, WALNUT], [1, '#2a1c12']]);
    for (var g = 0; g < 6; g++) game.draw.line(0, 30 + g * 34 + Math.sin(g) * 6, W, 36 + g * 34, '#6e4d33', 2);
    game.draw.rect(0, 226, W, 4, BRASS, 0.8);
    var mx = 720, my = 200;
    for (var i = 0; i < 8; i++) game.draw.rect(mx - 30 - i * 4, my - 150 + i * 18, 60 + i * 8, 19, mix('#8a5a2e', '#4a2f18', i / 7));
    var ang = Math.sin(Math.PI * songT / SPB) * 0.45;
    game.draw.line(mx, my - 20, mx + Math.sin(ang) * 130, my - 20 - Math.cos(ang) * 130, BRASS, 5);
    game.draw.rect(mx + Math.sin(ang) * 90 - 10, my - 20 - Math.cos(ang) * 90 - 8, 20, 16, BRASS);
    game.draw.circle(830, 96, 26, '#3a3a3a');
    game.draw.circle(830, 96, 21, headFlash > 0 ? '#ffffff' : '#7a7a7a', 0.5 + headFlash * 0.5);
    game.draw.circle(900, 96, 30, '#3a3a3a');
    game.draw.circle(900, 96, 25, andFlash > 0 ? '#ff9a2e' : '#7a4a1e', 0.5 + andFlash * 0.5);
    game.draw.circle(892, 88, 7, '#ffffff', 0.6);
  }

  function drawScene() {
    drawRoom();
    drawTarget();
    drawCartWarning();
    drawShots();
    drawKid();
    drawRack();
    drawPlaque();
  }

  function drawHud() {
    label('SCORE ' + score, 40, 84, 50, BRASS, 'left');
    label('BEST ' + prevBest, 40, 150, 32, CREAM, 'left');
    label(hits + ' / ' + notes.length, 40, 204, 32, CREAM, 'left');
    for (var i = 0; i < MISS_MAX; i++) {
      game.draw.circle(990, 60 + i * 44, 16, '#2a1c12');
      game.draw.circle(990, 60 + i * 44, 12, i < misses ? RED : '#6e4d33');
    }
    if (combo >= 2) label(combo + ' COMBO', W / 2, 1000, 44, BRASS);
    if (judgeT > 0) label(judgeW, W / 2, 1100, 64, judgeW === 'MISS' ? RED : (judgeW === 'PERFECT' ? BRASS : CREAM));
    var prog = Math.min(1, songT / (BARS * 4 * SPB));
    game.draw.rect(0, 812, W * prog, 6, BRASS, 0.8);
  }

  // ---- ATTRACT: 実ロジックで裏に蹴る。2回目は拍の頭で蹴って外し、台車は見送る ----
  var demo = { t: 0, hx: BALL_X[2], press: 0 };
  var DEMO_LEN = 9 * SPB;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.hx = BALL_X[2]; demo.press = 0; }
    var n = null, k = -1;
    for (var i = 0; i < notes.length; i++) if (!notes[i].done) { n = notes[i]; k = i; break; }
    if (n) {
      var goal = BALL_X[n.lane];
      if (songT >= (n.b - 1) * SPB) demo.hx += (goal - demo.hx) * Math.min(1, dt * 14);
      if (!n.pressed && songT >= (n.b + 0.5) * SPB + DEMO_OFF[k]) { n.pressed = true; kick(demo.hx); demo.press = 0.16; }
    }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
  }

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var r = kick(x);
    if (r === 'free') game.audio.tone(330, 0.05, { wave: 'triangle', volume: 0.05, slide: 120 });
    else if (r !== 'none') game.audio.tone(r === 'miss' ? 196 : 523, 0.04, { wave: 'square', volume: 0.04 });
  });
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, BALL_Y - 10, { press: demo.press > 0, scale: 15 });
      label(TITLE, W / 2 - 120, 110, 78 + Math.sin(t * 3) * 3, BRASS);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2 - 120, 188, 36, CREAM);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.735, 50, BRASS);
      else label('TAP TO START', W / 2, H * 0.735, 46, CREAM);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      bevel(80, H * 0.25, W - 160, H * 0.36, '#6e4d33', '#3b2a1e');
      game.draw.rect(96, H * 0.25 + 16, W - 192, H * 0.36 - 32, '#000000', 0.25);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 96, won ? BRASS : RED);
      label('SCORE ' + score, W / 2, H * 0.37, 58, CREAM);
      label(hits + ' / ' + notes.length, W / 2, H * 0.42, 50, BRASS);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.465, 34, CREAM);
      label(maxCombo + ' COMBO   NICE ' + dodges, W / 2, H * 0.505, 36, CREAM);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 52, BRASS);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, CREAM);
      if (!won) {
        var left = 0;
        for (var i = 0; i < notes.length; i++) if (!notes[i].done) left++;
        label('あと' + Math.max(1, left) + '回', W / 2, H * 0.225, 56, RED);
      }
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.595, 36, CREAM);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      stepClock(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, hits: hits, notes: notes.length, perfect: perfects, good: goods, miss: misses, dodged: dodges, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; songT = 0; beatN = -1; schedBar = 0; game.audio.play('se_tap', 0.3); }
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, BRASS);
    if (over && won) label('FINISH', W / 2, H * 0.47, 100, BRASS);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
