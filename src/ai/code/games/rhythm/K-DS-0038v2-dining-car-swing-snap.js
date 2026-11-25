// K-DS-0038v2-dining-car-swing-snap.js
// 食堂車のスイングスナップ — 跳ねる拍の裏ごとに二本指を同時に置いて指を鳴らし、足踏みする客席のビートを夜通し保つ
// 操作: 客が拍の頭で足を踏み鳴らす(長・短の跳ねる8分)。その裏(拍の2/3あと)ごとに、足踏みしている側(画面の左半分/右半分)へ二本指を同時に置いて指を鳴らす(裏からのずれでPERFECT/GOOD)。次に鳴らす側はテーブルのランプと下の押し場所が光り、車体の下のレールにも次の数拍の裏の印(琥珀=左席・青緑=右席)が流れてくる。窓の奥にトンネルの口が見えて汽笛が鳴った拍は客も足を止める(レールの印が黒い帯になる)ので鳴らさない。一本指・反対側・裏から外れる・鳴らし漏れ・トンネルの中で鳴らすはMISS
// 終わり: 前奏1小節(ウェイターのお手本)+7小節(108BPM・32拍・約18秒)を終えてMISS 3回以内ならCLEAR(判定の点×連続ボーナス)。MISS 4回で客が席を立ってGAME OVER
// @mechanic: pinch_zone
// @theme: night_train_dining_car_snap
// 世界観: 夜行列車の食堂車で、背の高いウェイターが左右の席の客の足踏みに合わせ、跳ねる拍の裏ごとに指を鳴らして車内のビートを保ち続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・鳴らした回数
// スタイル: 90s BIG SPRITE
var STYLE = { bg: ['#0c0a26', '#24184a', '#4a1a26'], main: ['#c8463a', '#f4e4c0', '#2a5a5a'], accent: ['#ffc040', '#40d8c8'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大なウェイター。床に楕円の影。背景は横1層(食堂車の壁と窓)
  var C = {
    ink: '#120a18', sky0: STYLE.bg[0], sky1: STYLE.bg[1], wall: STYLE.bg[2], wood: '#6a2e24', woodD: '#3a160f',
    cloth: STYLE.main[1], velvet: STYLE.main[0], teal0: STYLE.main[2], amber: STYLE.accent[0], teal: STYLE.accent[1],
    red: '#ff4a4a', cream: '#fff4dc', carpet: '#5a1a2a', steel: '#8a8aa0', panel: '#1a0e1e'
  };

  var GAME_TITLE = 'SWING SNAP';
  var BPM = 108;
  var SPB = 60 / BPM;
  var SWING = 2 / 3;            // 跳ねる8分: 拍の頭(長)→裏(短)。指を鳴らすのは拍の2/3あと
  var LEAD = 0.06;
  var PERFECT_W = 0.045, GOOD_W = 0.1, OFF_W = 0.21, PAIR_T = 0.12;
  var TOTAL_BEATS = 32;         // 前奏1小節 + 7小節
  var JUDGE_FROM = 4;
  var MISS_MAX = 4;
  var TIME_LIMIT = 18;          // 32拍 × 0.556秒 ≒ 17.8秒
  var READY_T = 0.8;
  var TELE_T = 0.7;             // トンネルの汽笛は0.7秒前
  var PXS = 300;                // レールの印が流れる速さ(px/秒)
  var JX = 540;                 // 判定の位置(ウェイターの真下)
  // 拍4〜31の裏: L=左の席 / R=右の席 / T=トンネル(鳴らさない)
  var PLAY_PAT = 'LLLLRRRRLLRRLTTRRLRLLLTRRRLL';
  var DEMO_PAT = 'LLRRTTRLLRRL';
  var DEMO_BEATS = 16, DEMO_FAIL = 13;   // デモはこの裏で二本目の指が遅れてMISSを見せる

  var FLOOR_Y = 1250, WX = 540, WPX = 24, WY = 1250 - 12 * 24;
  var TABLE = { L: { x: 262, y: 1150 }, R: { x: 818, y: 1150 } };
  var CUST = { L: { x: 105, y: 1146 }, R: { x: 975, y: 1146 } };
  var PAD = { L: { x: 276, y: 1660 }, R: { x: 804, y: 1660 } };

  // ---- スプライト ----
  var W_IDLE = [
    '.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhhhh....', '....hssssssh....', '....seessees....',
    '....ssssssss....', '....smmmmmms....', '.....ssssss.....', '......SSSS......', '...wwwwbbwwww...',
    '..wwvvvbbvvvww..', '..wvvvvwwvvvvw..', '.wwvvvvgwvvvvww.', '.wwvvvvwwvvvvww.', '.wwvvvvgwvvvvww.',
    '.ssaaaaaaaaaass.', '.ss.aaaaaaaa.ss.', '....aaaaaaaa....', '....aAaaaaAa....', '....aAaaaaAa....',
    '....aaaaaaaa....', '....ttt..ttt....', '....ttt..ttt....', '...oooo..oooo...'
  ];
  var W_IDLE2 = W_IDLE.slice();
  W_IDLE2[4] = '....sseesses....';
  W_IDLE2[15] = '.wwaaaaaaaaaaww.';
  W_IDLE2[16] = '.ss.aaaaaaaa.ss.';
  W_IDLE2[17] = '.ss.aaaaaaaa.ss.';
  var W_SNAP = W_IDLE.slice();
  var SNAP_TOP = [
    '.....hhhhhh..ss.', '....hhhhhhhh.sss', '....hhhhhhhh.ss.', '....hssssssh.ww.', '....sseesses.ww.',
    '....ssssssss.ww.', '....smmmmmms.ww.', '.....ssssss..ww.', '......SSSS..ww..', '...wwwwbbwwwww..',
    '..wwvvvbbvvvww..', '..wvvvvwwvvvvw..', '.wwvvvvgwvvvv...', '.wwvvvvwwvvvv...', '.wwvvvvgwvvvv...',
    '.ssaaaaaaaaaa...', '.ss.aaaaaaaa....'
  ];
  for (var si = 0; si < SNAP_TOP.length; si++) W_SNAP[si] = SNAP_TOP[si];
  var W_OOPS = W_IDLE.slice();
  var OOPS_TOP = [
    '.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhhhh....', '....hssssssh....', '....skksskks....',
    '....ssssssss....', '....ssmkkmss....', '.....ssssss.....', 's.....SSSS.....s', 'sw.wwwwbbwwww.ws',
    '.wwwvvvbbvvvwww.', '..wvvvvwwvvvvw..', '...vvvvgwvvvv...', '...vvvvwwvvvv...', '...vvvvgwvvvv...',
    '...aaaaaaaaaa...', '....aaaaaaaa....'
  ];
  for (var oi = 0; oi < OOPS_TOP.length; oi++) W_OOPS[oi] = OOPS_TOP[oi];
  var W_PAL = {
    h: '#2a1a14', s: '#eab48c', S: '#b8785a', e: '#1a1020', k: '#3a1a14', m: '#3a2418',
    w: '#f6eedc', v: '#2a1a3a', b: STYLE.main[0], g: STYLE.accent[0], a: '#f0e6d2', A: '#c4b49c',
    t: '#1e1828', o: '#0a0808'
  };
  // 客(横向き・座り)。DOWN=足を踏み下ろす / UP=足を上げて構える
  var CU_DOWN = [
    '..hhhh....', '.hhhhhh...', '.hhhsss...', '.hhssess..', '..hsssss..', '...sss....', '..cccccc..',
    '.ccccccss.', '.cccccc...', '.ccccccc..', '..pppppp..', '......pp..', '......ooo.'
  ];
  var CU_UP = CU_DOWN.slice(0, 10).concat(['..pppppp..', '......ooo.', '..........']);
  var CU_PAL = {
    L: { h: '#d8a040', s: '#eab48c', e: '#1a1020', c: '#3a6a9a', p: '#2a2a4a', o: '#100a0a' },
    R: { h: '#e8e8f0', s: '#d89a74', e: '#1a1020', c: '#7a4a2a', p: '#3a2a20', o: '#100a0a' }
  };
  var WHITE_W = {}, WHITE_C = {};
  (function() {
    var k;
    for (k in W_PAL) WHITE_W[k] = '#ffffff';
    for (k in CU_PAL.L) WHITE_C[k] = '#ffffff';
  })();
  var ARROW = ['..#', '.##', '###', '.##', '..#'];
  var CUP = ['.ww.', 'wwww', '.ww.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, endBeats, info, tunnels, running, songT, schedB, beatN, readyT, hitStop, realT;
  var judged, pend, taps, score, perfects, goods, misses, combo, maxCombo, snapped, snapTotal;
  var over, won, outroT, prevBest, snapT, snapSide, oopsT, flashSide, flashT, beatPulse, ms8, ms16;
  var stomp = { L: 0, R: 0 }, cheer = { L: 0, R: 0 };
  var trainT = 0;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function sideCol(k) { return k === 'L' ? C.amber : C.teal; }
  function snapAt(b) { return (b + SWING) * SPB; }
  function mirror(p) {
    var o = '';
    for (var i = 0; i < p.length; i++) { var c = p.charAt(i); o += c === 'L' ? 'R' : (c === 'R' ? 'L' : c); }
    return o;
  }

  function buildInfo(pat) {
    info = []; snapTotal = 0; tunnels = [];
    for (var b = 0; b < endBeats; b++) info.push(b < JUDGE_FROM ? '' : pat.charAt(b - JUDGE_FROM));
    for (var j = 0; j < info.length; j++) {
      if (info[j] === 'L' || info[j] === 'R') snapTotal++;
      if (info[j] === 'T' && info[j - 1] !== 'T') tunnels.push({ a: j * SPB, b: (j + 1) * SPB, horn: false });
      if (info[j] === 'T') tunnels[tunnels.length - 1].b = (j + 1) * SPB;
    }
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    buildInfo(demoMode ? DEMO_PAT : (game.random(0, 1) < 0.5 ? PLAY_PAT : mirror(PLAY_PAT)));
    running = demoMode; songT = 0; schedB = 0; beatN = -1; realT = 0;
    readyT = demoMode ? 0 : READY_T;
    hitStop = 0; judged = {}; pend = null; taps = [];
    score = 0; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0; snapped = 0;
    over = false; won = false; outroT = 0; prevBest = game.best;
    snapT = 0; snapSide = info[JUDGE_FROM]; oopsT = 0; flashSide = ''; flashT = 0; beatPulse = 0; ms8 = false; ms16 = false;
    stomp.L = 0; stomp.R = 0; cheer.L = 0; cheer.R = 0;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル): 歩くベース + 跳ねる8分の旋律 + 客の足踏み(頭)とブラシ(裏) ----
  var WALK = [
    ['Bb1', 'D2', 'F2', 'G2'], ['Eb2', 'G2', 'Bb2', 'G2'], ['Bb1', 'D2', 'F2', 'Ab2'], ['G1', 'B1', 'D2', 'F2'],
    ['C2', 'Eb2', 'G2', 'A2'], ['F2', 'A2', 'C3', 'Eb3'], ['Bb1', 'F2', 'D2', 'F2'], ['Eb2', 'E2', 'F2', 'F2']
  ];
  var TUNE = [
    ['D5', 'F5'], ['Bb4', 'R'], ['C5', 'D5'], ['F4', 'R'], ['Eb5', 'G5'], ['F5', 'Eb5'], ['D5', 'R'], ['Bb4', 'C5'],
    ['D5', 'F5'], ['Ab5', 'G5'], ['F5', 'D5'], ['R', 'B4'], ['C5', 'Eb5'], ['G5', 'F5'], ['Eb5', 'C5'], ['A4', 'R']
  ];
  function playBeat(b) {
    if (demoMode) return;
    var k = info[b];
    var walk = WALK[Math.floor(b / 4) % WALK.length][b % 4];
    if (k === 'T') {
      // トンネルの中: 客の足も旋律も止まり、低い走行音だけが続く
      game.audio.melody([[55, 1]], { tempo: BPM, wave: 'triangle', volume: 0.05, bass: [[walk, 0.5], ['R', 0.5]], bassWave: 'triangle', bassVolume: 0.07 });
      return;
    }
    var tn = TUNE[b % TUNE.length];
    game.audio.melody([[tn[0], SWING], [tn[1], 1 - SWING]], { tempo: BPM, wave: 'square', volume: 0.028, bass: [[walk, 0.8], ['R', 0.2]], bassWave: 'triangle', bassVolume: 0.13 });
    game.audio.melody([[62, 0.14], ['R', 0.86]], { tempo: BPM, wave: 'triangle', volume: 0.16 });
    game.audio.melody([['E7', 0.08], ['R', SWING - 0.08], ['E7', 0.05], ['R', 1 - SWING - 0.05]], { tempo: BPM, wave: 'square', volume: 0.008 });
    // 前奏はウェイターが自分で裏を鳴らす(お手本)
    if (k === '') game.audio.melody([['R', SWING], [2600, 0.06], ['R', 1 - SWING - 0.06]], { tempo: BPM, wave: 'square', volume: 0.035 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < endBeats && songT >= schedB * SPB - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < endBeats && songT >= (beatN + 1) * SPB) { beatN++; onHead(beatN); }
    if (beatN >= 0 && beatN < JUDGE_FROM && !judged[beatN] && songT >= snapAt(beatN)) {
      judged[beatN] = 'model'; snapT = 0.16; snapSide = info[JUDGE_FROM];
    }
    for (var i = 0; i < tunnels.length; i++) {
      if (!tunnels[i].horn && songT >= tunnels[i].a - TELE_T) {
        tunnels[i].horn = true;
        sfx(233, 0.5, { wave: 'sawtooth', volume: 0.035 });
        sfx(294, 0.5, { wave: 'square', volume: 0.025 });
      }
    }
    if (pend && songT - pend.t > PAIR_T) { var p = pend; pend = null; judgeSingle(p); if (over || hitStop > 0) return; }
    for (var b = Math.max(JUDGE_FROM, beatN - 2); b <= beatN; b++) {
      var k = info[b];
      if ((k === 'L' || k === 'R') && !judged[b] && songT > snapAt(b) + GOOD_W + PAIR_T + 0.02) {
        judged[b] = 'skip';
        missAt(k);
        if (over || hitStop > 0) return;
      }
    }
    if (songT >= endBeats * SPB + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function onHead(b) {
    beatPulse = 1;
    var k = info[b];
    if (k === 'L' || k === 'R') stomp[k] = 0.16;
    else if (k === '') { stomp.L = 0.16; stomp.R = 0.16; }
  }

  function inTunnel(t) {
    for (var i = 0; i < tunnels.length; i++) if (t >= tunnels[i].a && t < tunnels[i].b) return true;
    return false;
  }
  function nextCue() {
    for (var b = Math.max(JUDGE_FROM, beatN); b < endBeats; b++) {
      var k = info[b];
      if ((k === 'L' || k === 'R') && !judged[b] && snapAt(b) > songT - GOOD_W) return b;
    }
    return -1;
  }
  function faceSide() { var b = nextCue(); return b >= 0 ? info[b] : snapSide; }
  function nearestSnap(t) {
    var b = Math.round(t / SPB - SWING);
    return b >= JUDGE_FROM && b < endBeats ? b : -1;
  }
  function handPos(k) { return { x: WX + (k === 'L' ? -156 : 156), y: WY - 252 }; }

  // ---- 判定 ----
  function hit(b, k, d) {
    var w = d <= PERFECT_W ? 'PERFECT' : 'GOOD';
    judged[b] = w;
    combo++; if (combo > maxCombo) maxCombo = combo;
    snapped++;
    if (w === 'PERFECT') perfects++; else goods++;
    score += Math.round((w === 'PERFECT' ? 100 : 50) * (1 + Math.floor(combo / 4) * 0.5));
    snapT = 0.18; snapSide = k; cheer[k] = 0.3;
    var hp = handPos(k);
    if (demoMode) game.fx.popup(w, hp.x, hp.y - 70, { color: sideCol(k), size: 50 });
    else game.feedback.good(hp.x, hp.y - 70, { text: w, color: sideCol(k), size: w === 'PERFECT' ? 58 : 48, count: 12, volume: 0.12 });
    game.fx.burst(hp.x, hp.y, { color: '#ffffff', count: 8, speed: 260 });
    game.fx.burst(PAD[k].x, PAD[k].y, { color: sideCol(k), count: 10, speed: 320 });
    sfx(2600, 0.04, { wave: 'square', volume: 0.06, slide: -1800 });
    sfx(k === 'L' ? 'F5' : 'A5', 0.1, { wave: 'triangle', volume: 0.07 });
    if (!demoMode && combo === 8 && !ms8) {
      ms8 = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('8 COMBO', W / 2, 470, { color: C.amber, size: 84 });
    } else if (!demoMode && combo === 16 && !ms16) {
      ms16 = true;
      game.audio.play('se_powerup', 0.4);
      game.fx.popup('16 COMBO', W / 2, 470, { color: C.teal, size: 90 });
    }
  }

  function missAt(k) {
    misses++; combo = 0; oopsT = 0.7;
    hitStop = 0.36; flashT = 0.36; flashSide = k;
    var p = k === 'L' || k === 'R' ? TABLE[k] : { x: 540, y: 470 };
    sfx(120, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -50 });
    if (demoMode) { game.fx.popup('MISS', p.x, p.y - 90, { color: C.red, size: 60 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(p.x, p.y - 90, { text: 'MISS', shake: 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function whiff(x, y) {
    taps.push({ x: x, y: y, t: 0.25, col: '#8a7a9a' });
    sfx(300, 0.04, { wave: 'triangle', volume: 0.04 });
  }

  function judgeSingle(p) {
    var b = nearestSnap(p.t);
    var d = b >= 0 ? Math.abs(p.t - snapAt(b)) : 9;
    if (b < 0 || judged[b] || d > OFF_W || info[b] === 'T') { whiff(p.x, p.y); return; }
    judged[b] = 'miss';
    missAt(info[b]);   // 一本指では鳴らない
  }

  function judgePair(s1, s2, t, x, y) {
    var b = nearestSnap(t);
    if (b < 0) { whiff(x, y); return; }
    var k = info[b], d = Math.abs(t - snapAt(b));
    if (judged[b] || d > OFF_W) { whiff(x, y); return; }
    if (k === 'T') { judged[b] = 'miss'; missAt('T'); return; }
    if (d > GOOD_W || s1 !== k || s2 !== k) { judged[b] = 'miss'; missAt(k); return; }
    hit(b, k, d);
  }

  function pressAt(x, y, id) {
    if (!running || hitStop > 0 || over) return;
    var side = x < W / 2 ? 'L' : 'R';
    taps.push({ x: x, y: y, t: 0.3, col: sideCol(side) });
    if (songT < (JUDGE_FROM - 0.3) * SPB) return;   // 前奏はお手本を聞く間
    if (pend && pend.id !== id && songT - pend.t <= PAIR_T) {
      var p = pend; pend = null;
      judgePair(p.side, side, (p.t + songT) / 2, (p.x + x) / 2, (p.y + y) / 2);
      return;
    }
    if (pend) { var q = pend; pend = null; judgeSingle(q); if (over || hitStop > 0) return; }
    pend = { t: songT, x: x, y: y, id: id, side: side };
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false; pend = null;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 150;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 700 + (i % 2) * 260, { color: i % 2 ? C.teal : C.amber, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
  }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0 || y < 230) return;
    game.audio.tone(x < W / 2 ? 520 : 620, 0.03, { wave: 'square', volume: 0.03 });
    pressAt(x, y, id);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ellipse(cx, cy, rx, ry, col, a) {
    for (var i = -ry; i < ry; i += 4) {
      var w = rx * Math.sqrt(Math.max(0, 1 - (i / ry) * (i / ry)));
      game.draw.rect(cx - w, cy + i, w * 2, 4, col, a);
    }
  }
  function ringLine(x, y, r, col, w, segs) {
    var n = segs || 28;
    for (var i = 0; i < n; i++) {
      var a1 = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r, col, w);
    }
  }
  function hush(x, y, r) {
    ringLine(x, y, r, C.red, 6, 20);
    game.draw.line(x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7, C.red, 6);
  }

  // ---- 背景(食堂車の壁と窓、窓の外は夜の景色) ----
  function drawCar() {
    var t = game.time.elapsed;
    var dark = inTunnel(songT);
    // 窓の外
    game.draw.gradient(300, 620, [[0, C.sky0], [0.7, C.sky1], [1, '#3a2048']]);
    for (var s = 0; s < 18; s++) {
      var sx = ((s * 211 - trainT * 12) % 1180 + 1180) % 1180 - 50;
      if ((s + Math.floor(t * 2)) % 5) game.draw.rect(sx, 330 + (s * 67) % 150, 4, 4, '#d8d8ff');
    }
    var mx = ((900 - trainT * 8) % 1300 + 1300) % 1300 - 100;
    game.draw.circle(mx, 380, 38, '#f4ecc8');
    game.draw.circle(mx + 12, 372, 34, C.sky0, 0.35);
    for (var m = -1; m < 7; m++) {
      var hx = ((m * 240 - trainT * 40) % 1440 + 1440) % 1440 - 180;
      for (var r = 0; r < 6; r++) game.draw.rect(hx + r * 20, 540 - r * 18 - (m % 2) * 30, 240 - r * 40, 18, '#1a1438');
      game.draw.rect(hx, 540, 240, 80, '#1a1438');
    }
    for (var l = 0; l < 14; l++) {
      var lx = ((l * 157 - trainT * 220) % 1260 + 1260) % 1260 - 90;
      game.draw.rect(lx, 560 + (l % 3) * 12, 8, 8, l % 4 ? C.amber : '#ff8a5a');
    }
    for (var pl = 0; pl < 3; pl++) {
      var px = ((pl * 700 - trainT * 900) % 2100 + 2100) % 2100 - 100;
      game.draw.rect(px, 300, 14, 320, '#0a0818');
      game.draw.rect(px - 40, 340, 94, 8, '#0a0818');
    }
    // トンネル: 窓の奥に口が見えて、近づいて車ごと入る
    for (var i = 0; i < tunnels.length; i++) {
      var tu = tunnels[i];
      var xs = JX + (tu.a - 0.05 - songT) * 900, xe = JX + (tu.b - songT) * 900;
      if (xe < 0 || xs > W) continue;
      var a0 = Math.max(0, xs), a1 = Math.min(W, xe);
      game.draw.rect(a0, 300, a1 - a0, 320, '#050308');
      for (var q = 0; q < 8; q++) {
        var qx = xs + 60 + q * 300 - ((trainT * 600) % 300);
        if (qx > a0 && qx < a1) game.draw.rect(qx, 400, 30, 10, '#ff9a3a', 0.8);
      }
      if (xs > -60 && xs < W) { game.draw.rect(xs - 40, 300, 50, 320, '#5a5a6a'); game.draw.rect(xs - 40, 300, 50, 14, '#8a8a9a'); }
      if (xe > -60 && xe < W) game.draw.rect(xe - 10, 300, 50, 320, '#5a5a6a');
    }
    // 壁(窓の間の柱と窓枠)
    game.draw.rect(0, 230, W, 70, C.woodD);
    game.draw.rect(0, 286, W, 14, '#8a5a2a');
    for (var lr = 0; lr < 9; lr++) game.draw.rect(30 + lr * 120, 244, 80, 10, '#a88a5a', 0.6);
    var holes = [[60, 340], [400, 680], [740, 1020]];
    game.draw.rect(0, 300, 60, 320, C.wall);
    game.draw.rect(340, 300, 60, 320, C.wall);
    game.draw.rect(680, 300, 60, 320, C.wall);
    game.draw.rect(1020, 300, 60, 320, C.wall);
    for (var h = 0; h < 3; h++) {
      var x0 = holes[h][0], x1 = holes[h][1];
      game.draw.rect(x0, 300, x1 - x0, 16, '#8a5a2a');
      game.draw.rect(x0, 604, x1 - x0, 16, '#8a5a2a');
      game.draw.rect(x0 - 4, 300, 30, 320, C.velvet, 0.9);
      game.draw.rect(x1 - 26, 300, 30, 320, C.velvet, 0.9);
      game.draw.rect(x0 + 20, 306, 8, 300, '#e87060', 0.5);
    }
    // 下の板張り
    game.draw.gradient(620, FLOOR_Y, [[0, C.wall], [1, '#2a0e18']]);
    for (var pn = 0; pn < 9; pn++) {
      game.draw.rect(20 + pn * 120, 660, 100, 300, '#5a2030', 0.5);
      game.draw.rect(20 + pn * 120, 660, 100, 6, '#8a4a40', 0.6);
    }
    game.draw.rect(0, 990, W, 10, '#c08a3a', 0.7);
    // 天井のランプ(拍で脈打つ)
    for (var cl = 0; cl < 5; cl++) {
      var cx = 108 + cl * 216;
      game.draw.circle(cx, 236, 40 + beatPulse * 8, '#ffd890', dark ? 0.05 : 0.18);
      game.draw.circle(cx, 236, 18, dark ? '#5a4a30' : '#ffe8b0');
    }
    // 床(じゅうたん)
    game.draw.rect(0, FLOOR_Y, W, 50, C.carpet);
    for (var cp = 0; cp < 12; cp++) game.draw.rect(cp * 96, FLOOR_Y + 18, 48, 10, '#8a2a3a', 0.6);
  }

  function drawBooth(k) {
    var cu = CUST[k], tb = TABLE[k];
    var fl = flashT > 0 && hitStop > 0 && flashSide === k;
    var lr = k === 'L' ? -1 : 1;
    // 座席の背もたれ
    game.draw.rect(cu.x - 80 + lr * 40, 960, 90, 290, C.velvet);
    game.draw.rect(cu.x - 80 + lr * 40, 960, 90, 14, '#e87060', 0.7);
    // 客
    var active = faceSide() === k && running;
    var art = stomp[k] > 0 || !active ? CU_DOWN : CU_UP;
    var bob = cheer[k] > 0 ? -Math.sin(cheer[k] / 0.3 * Math.PI) * 18 : 0;
    var sc = fl ? 17.6 : 16;
    game.draw.sprite(art, fl ? WHITE_C : CU_PAL[k], cu.x, cu.y + bob, sc, { anchor: 'center', flipX: k === 'R' });
    if (stomp[k] > 0) {
      var fx = cu.x + (k === 'L' ? 32 : -32);
      game.draw.rect(fx - 40, FLOOR_Y - 6, 80, 6, '#ffffff', stomp[k] * 3);
    }
    // テーブル
    var tx = tb.x - 82;
    game.draw.rect(tb.x - 8, tb.y + 40, 16, FLOOR_Y - tb.y - 40, '#2a1410');
    game.draw.rect(tx, tb.y - 4, 164, 26, fl ? '#ffffff' : C.cloth);
    game.draw.rect(tx, tb.y + 22, 164, 34, fl ? '#ffffff' : '#d8c8a4');
    game.draw.sprite(CUP, { w: '#ffffff' }, tb.x + lr * -40, tb.y - 16, 8, { anchor: 'center' });
    // ランプ(次に鳴らす側が光る。切り替わる拍は点滅)
    var lit = active;
    var nb = nextCue();
    var sw = nb > JUDGE_FROM && info[nb - 1] !== info[nb];
    var on = lit && (!sw || Math.floor(game.time.elapsed * 10) % 2 === 0);
    game.draw.rect(tb.x + lr * 40 - 4, tb.y - 70, 8, 66, '#a8783a');
    if (on) game.draw.circle(tb.x + lr * 40, tb.y - 84, 64 + beatPulse * 10, sideCol(k), 0.25);
    game.draw.rect(tb.x + lr * 40 - 30, tb.y - 108, 60, 36, on ? sideCol(k) : '#6a4a3a');
    game.draw.rect(tb.x + lr * 40 - 30, tb.y - 108, 60, 6, '#ffffff', on ? 0.6 : 0.15);
  }

  function drawWaiter() {
    var face = snapT > 0 ? snapSide : faceSide();
    var art = oopsT > 0 ? W_OOPS : (snapT > 0 ? W_SNAP : (Math.floor(songT / SPB) % 2 ? W_IDLE2 : W_IDLE));
    var fl = hitStop > 0 && Math.floor(hitStop * 20) % 2 === 0;
    var sc = WPX * (hitStop > 0 ? 1.06 : 1);
    var bob = Math.round(beatPulse * 6 + Math.sin(game.time.elapsed * 2) * 3);
    ellipse(WX, FLOOR_Y + 8, 200, 24, '#000000', 0.4);
    game.draw.sprite(art, fl ? WHITE_W : W_PAL, WX, WY + bob, sc, { anchor: 'center', flipX: face === 'L' });
    if (snapT > 0) {
      var hp = handPos(snapSide);
      for (var i = 0; i < 6; i++) {
        var a = i / 6 * Math.PI * 2 + 0.3;
        game.draw.line(hp.x + Math.cos(a) * 30, hp.y - 30 + Math.sin(a) * 30, hp.x + Math.cos(a) * (60 + snapT * 120), hp.y - 30 + Math.sin(a) * (60 + snapT * 120), sideCol(snapSide), 6);
      }
    }
  }

  // ---- 車体の下: 台車の車輪とレール。枕木=拍の頭、印=指を鳴らす裏 ----
  function xAt(tt) { return JX + (tt - songT) * PXS; }
  function drawRail() {
    game.draw.gradient(1300, 1440, [[0, '#140a18'], [1, '#05030a']]);
    game.draw.rect(0, 1300, W, 18, '#3a0e1a');
    for (var wh = 0; wh < 4; wh++) {
      var wx = [150, 290, 790, 930][wh];
      game.draw.circle(wx, 1352, 40, '#2a2a36');
      game.draw.circle(wx, 1352, 14, '#6a6a7a');
      var ang = trainT * 9 + wh;
      game.draw.line(wx + Math.cos(ang) * 36, 1352 + Math.sin(ang) * 36, wx - Math.cos(ang) * 36, 1352 - Math.sin(ang) * 36, '#4a4a5a', 6);
    }
    game.draw.rect(0, 1396, W, 8, C.steel);
    for (var b = Math.max(0, beatN - 3); b < Math.min(endBeats + 1, beatN + 9); b++) {
      var hx = xAt(b * SPB);
      if (hx > -40 && hx < W + 40) game.draw.rect(hx - 16, 1404, 32, 18, b % 4 === 0 ? '#8a6a4a' : '#5a4030');
    }
    // トンネル区間は黒い帯
    for (var i = 0; i < tunnels.length; i++) {
      var a0 = xAt(tunnels[i].a), a1 = xAt(tunnels[i].b);
      if (a1 < 0 || a0 > W) continue;
      game.draw.rect(a0, 1324, a1 - a0, 70, '#000000', 0.85);
    }
    for (var c = Math.max(0, beatN - 2); c < Math.min(endBeats, beatN + 9); c++) {
      var x = xAt(snapAt(c));
      if (x < -40 || x > W + 40) continue;
      var k = info[c];
      if (k === '') { game.draw.circle(x, 1370, 12, '#8a7a9a'); continue; }
      if (k === 'T') { hush(x, 1360, 22); continue; }
      var res = judged[c];
      var col = res === 'miss' || res === 'skip' ? '#4a2a2a' : (res ? '#ffffff' : sideCol(k));
      game.draw.circle(x, 1364, 26, C.ink);
      game.draw.circle(x, 1364, 22, col);
      game.draw.sprite(ARROW, { '#': C.ink }, x, 1364, 6, { anchor: 'center', flipX: k === 'R' });
    }
    // 判定の位置
    game.draw.rect(JX - 4, 1318, 8, 104, '#ffffff', 0.8);
    game.draw.rect(JX - 34, 1318, 68, 6, '#ffffff', 0.8);
    game.draw.rect(JX - 34, 1416, 68, 6, '#ffffff', 0.8);
  }

  // ---- 親指ゾーン: 左右の押し場所(二本指の印) ----
  function drawPads() {
    var dark = inTunnel(songT) && running;
    var face = faceSide();
    var nb = nextCue();
    game.draw.gradient(1440, H, [[0, '#0e0812'], [1, '#04020a']]);
    game.draw.rect(0, 1440, W, 6, '#3a0e1a');
    for (var s = 0; s < 2; s++) {
      var k = s ? 'R' : 'L', p = PAD[k];
      var active = running && !dark && face === k;
      game.draw.rect(p.x - 244, 1460, 488, 420, active ? '#2a1a30' : '#140c18');
      game.draw.rect(p.x - 244, 1460, 488, 8, active ? sideCol(k) : '#3a2a40');
      game.draw.rect(p.x - 244, 1872, 488, 8, '#000000', 0.6);
      var pulse = active ? 1 + beatPulse * 0.12 : 1;
      game.draw.circle(p.x - 80, p.y, 54 * pulse, active ? sideCol(k) : '#3a2a40', active ? 0.9 : 0.6);
      game.draw.circle(p.x + 80, p.y, 54 * pulse, active ? sideCol(k) : '#3a2a40', active ? 0.9 : 0.6);
      game.draw.circle(p.x - 80, p.y, 26, '#ffffff', active ? 0.6 : 0.15);
      game.draw.circle(p.x + 80, p.y, 26, '#ffffff', active ? 0.6 : 0.15);
      game.draw.sprite(ARROW, { '#': active ? sideCol(k) : '#3a2a40' }, p.x, p.y + 150, 12, { anchor: 'center', flipX: k === 'R' });
      // 縮む輪: 拍の頭から裏までの長い間で縮み、裏で二つの印に重なる
      if (active && nb >= 0 && info[nb] === k) {
        var pr = clamp((songT - nb * SPB) / (SWING * SPB), 0, 1);
        if (songT >= nb * SPB - 0.1) ringLine(p.x, p.y, 150 + (1 - pr) * 160, '#ffffff', 6, 32);
        ringLine(p.x, p.y, 150, sideCol(k), 3, 32);
      }
      if (dark) hush(p.x, p.y, 70);
    }
  }

  function drawTaps(dt) {
    for (var i = taps.length - 1; i >= 0; i--) {
      var tp = taps[i];
      tp.t -= dt;
      if (tp.t <= 0) { taps.splice(i, 1); continue; }
      ringLine(tp.x, tp.y, 30 + (0.3 - tp.t) * 260, tp.col, 4, 18);
    }
  }

  function drawScene(dt) {
    drawCar();
    drawBooth('L');
    drawBooth('R');
    drawWaiter();
    if (inTunnel(songT)) game.draw.rect(0, 620, W, FLOOR_Y + 50 - 620, '#05030a', 0.45);
    drawRail();
    drawPads();
    drawTaps(dt);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.08);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.panel);
    game.draw.rect(0, 222, W, 8, '#8a5a2a');
    label('SCORE ' + score, 50, 92, 52, C.cream, 'left');
    label('BEST ' + prevBest, 50, 162, 32, C.amber, 'left');
    label(snapped + ' / ' + snapTotal, W - 50, 96, 52, C.teal, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var mx = W - 290 + i * 66;
      game.draw.sprite(CUP, { w: i < misses ? C.red : '#4a3a4a' }, mx, 168, 12, { anchor: 'center' });
    }
    if (combo >= 2) label('x' + combo, W / 2, 168, 40, C.amber);
    var progress = clamp(songT / (endBeats * SPB), 0, 1);
    game.draw.rect(0, 216, W * progress, 6, C.amber);
  }

  function drawResult(t) {
    var y0 = H * 0.24, hh = H * 0.38;
    game.draw.rect(60, y0, W - 120, hh, C.panel, 0.94);
    game.draw.rect(60, y0, W - 120, 10, won ? C.teal : C.red);
    game.draw.rect(60, y0 + hh - 10, W - 120, 10, C.amber);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 100, won ? C.teal : C.red);
    label('SCORE ' + score, W / 2, H * 0.36, 58, C.cream);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.405, 34, C.teal);
    label(maxCombo + ' COMBO', W / 2, H * 0.445, 42, C.amber);
    label(snapped + ' / ' + snapTotal, W / 2, H * 0.49, 46, C.cream);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 54, C.amber);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, C.amber);
    if (!won) label('あと' + Math.max(1, snapTotal - snapped) + '回', W / 2, H * 0.21, 60, C.red);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, '#ffffff');
  }

  // ---- ATTRACT: 実ロジックで裏ごとに二本指を置く。トンネルでは指を浮かせ、13拍目は二本目が遅れてMISS ----
  var demo = { t: 0, a: { x: 460, y: 1780 }, b: { x: 620, y: 1780 }, pa: 0, pb: 0, done: {} };
  var DEMO_LEN = DEMO_BEATS * SPB + 1.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.pa = 0; demo.pb = 0; demo.done = {}; }
    if (demo.pa > 0) demo.pa -= dt;
    if (demo.pb > 0) demo.pb -= dt;
    tickWorld(dt);
    var ta = { x: 460, y: 1800 }, tb = { x: 620, y: 1800 };
    var b = running ? nextCue() : -1;
    if (b >= 0 && songT > snapAt(b) - SPB * 0.9) {
      var p = PAD[info[b]];
      ta = { x: p.x - 80, y: p.y }; tb = { x: p.x + 80, y: p.y };
      if (b === DEMO_FAIL) tb = { x: p.x + 150, y: p.y + 170 };
      if (!demo.done[b] && hitStop <= 0 && songT >= snapAt(b) - 0.01) {
        demo.done[b] = true;
        pressAt(ta.x, ta.y, 'g1'); demo.pa = 0.16;
        if (b !== DEMO_FAIL) { pressAt(tb.x, tb.y, 'g2'); demo.pb = 0.16; }
      }
    }
    var f = Math.min(1, dt * 12);
    demo.a.x += (ta.x - demo.a.x) * f; demo.a.y += (ta.y - demo.a.y) * f;
    demo.b.x += (tb.x - demo.b.x) * f; demo.b.y += (tb.y - demo.b.y) * f;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop <= 0) trainT += dt;
    beatPulse = Math.max(0, beatPulse - dt * 5);
    if (snapT > 0) snapT -= dt;
    if (oopsT > 0) oopsT -= dt;
    if (flashT > 0) flashT -= dt;
    stomp.L = Math.max(0, stomp.L - dt); stomp.R = Math.max(0, stomp.R - dt);
    cheer.L = Math.max(0, cheer.L - dt); cheer.R = Math.max(0, cheer.R - dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.a.x, demo.a.y, { press: demo.pa > 0, scale: 13 });
      game.draw.hand(demo.b.x, demo.b.y, { press: demo.pb > 0, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.panel);
      game.draw.rect(0, 222, W, 8, '#8a5a2a');
      label(GAME_TITLE, W / 2, 116 + Math.sin(t * 3) * 4, 92, Math.floor(t * 3) % 2 ? C.amber : C.cream);
      label('HI-SCORE ' + game.best, W / 2, 196, 36, C.teal);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.amber);
      else label('TAP TO START', W / 2, H * 0.975, 42, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (over) {
      outroT -= dt;
      tickWorld(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo, snaps: snapped, total: snapTotal };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { running = true; game.audio.play('se_tap', 0.4); }
    } else {
      tickWorld(dt);
      if (!over && realT > READY_T + TIME_LIMIT + 2) finish(misses < MISS_MAX);
    }

    drawScene(dt);
    drawHud();
    if (readyT > 0) {
      game.draw.rect(0, H * 0.4, W, 170, C.panel, 0.85);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 118, 110, C.amber);
    }
    if (over && outroT > 1.5) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, won ? C.teal : C.red);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
  });
})(game);
