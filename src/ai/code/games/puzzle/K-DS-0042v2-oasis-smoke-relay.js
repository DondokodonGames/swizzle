// K-DS-0042v2-oasis-smoke-relay.js
// オアシスの狼煙つなぎ — 遠くの台が1小節で上げた煙の順とリズムを見て聞き、次の小節で同じ拍のまま台から台へ指で火の線を結んで合図を送り継ぐ
// 操作: 呼びかけの小節では砂漠の狼煙台から拍ごとに煙が上がり、台ごとの角笛の高さが鳴る(見て聞くだけ。入力は効かない)。返しの小節で、最初の台(前の回の終わりの台。1回目は手前の自分の台)を拍の頭に押さえ、指を離さずに煙が上がった順に次の台へなぞって入る。台に入る時刻が煙の拍の頭ちょうどでPERFECT、少しずれるとGOOD。早すぎ・遅れ・入らずに拍を過ぎる・その拍に別の台へ入るとMISS。同じ一筆で続けて入った台の間に火の線が引かれる。上の譜面帯に呼びかけのリズムが点で残り、返しではカーソルが点に近づく。1・2回目は煙の名残が台に残るが、3・4回目は砂風が煙を吹き消し(直前に砂の唸りで予告)、8分の食い込みも入る
// 終わり: 96BPM・4回(呼びかけ1小節+返し1小節、計8小節・20秒・16台)を通せばCLEAR。MISS4回でGAME OVER
// @mechanic: connect
// @theme: oasis_beacon_smoke_relay
// 世界観: 砂漠のオアシスを結ぶ狼煙台で、ターバンの番人が遠くの台に上がった煙の順とリズムを読み取り、同じ拍で台から台へ火の線を結んで次のオアシスへ合図を送り継ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・結んだ火の線の本数・最大連続
// スタイル: 2000s BILLBOARD 3D
var STYLE = { bg: ['#4f8fd0', '#ffe2b0'], main: ['#e8b56e', '#9c7a58', '#3a2418'], accent: ['#ff6a2a', '#2fb5a8'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物は板(sprite)のまま距離で px を変える。真下に楕円の接地影。奥ほど砂霞に寄せて彩度を落とす
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], sand: STYLE.main[0], stone: STYLE.main[1], ink: STYLE.main[2],
    fire: STYLE.accent[0], teal: STYLE.accent[1], haze: '#f6dcb4', white: '#ffffff', gold: '#ffd040',
    smoke: '#efe9e0', dune: '#e3aa60', duneDk: '#c98a46', palm: '#3f8a4a', palmDk: '#2a5e34',
    water: '#46b8cf', bad: '#ff4a3a', panel: '#fff4e0'
  };

  var GAME_TITLE = 'SMOKE RELAY';
  var BPM = 96;
  var SPB = 60 / BPM;                 // 0.625秒
  var TIME_LIMIT = 20;                // 32拍 = 8小節 = 20秒
  var READY_T = 0.8;
  var PERFECT_W = 0.07, GOOD_W = 0.15, ARM_W = 0.24;
  var R = 100;                        // 台に「入った」とみなす半径(奥の台も同じ広さ)
  var LIVES = 4;
  // 各回 = 呼びかけ1小節(4拍) + 返し1小節(4拍)。offs は小節内の拍位置(0.5 = 8分の裏)
  var ROUNDS = [
    { offs: [0, 1, 2], wind: false },
    { offs: [0, 1, 2, 3], wind: false },
    { offs: [0, 1, 1.5, 3], wind: true },
    { offs: [0, 1, 2, 2.5, 3], wind: true }
  ];
  var DEMO_ROUNDS = [
    { offs: [0, 1, 2], seq: [0, 1, 3], wind: false, wrongAt: -1 },
    { offs: [0, 1, 1.5, 3], seq: [3, 5, 4, 2], wind: true, wrongAt: 3, wrongTo: 0 }
  ];

  // 狼煙台(x, 足元y, 距離スケール)。手前ほど大きい。touch 中心は台の火皿
  var TOWERS = [
    { x: 540, y: 1290, s: 1.0 },
    { x: 205, y: 1110, s: 0.82 },
    { x: 875, y: 1100, s: 0.82 },
    { x: 320, y: 840, s: 0.62 },
    { x: 770, y: 810, s: 0.6 },
    { x: 545, y: 620, s: 0.46 }
  ];
  var HORN = ['D5', 'F#5', 'A5', 'C6', 'Eb5', 'G5'];   // 台ごとの角笛の高さ
  var LEAD = ['D5', 'Eb5', 'F#5', 'G5', 'A5', 'G5', 'F#5', 'Eb5'];
  var BASS = ['D3', 'D3', 'C3', 'D3'];

  // ── スプライト ─────────────────────────────────────
  var TOWER_ART = [
    '.oooooooo.',
    'oOOOOOOOOo',
    '.oOOOOOOo.',
    '..oooooo..',
    '...ssss...',
    '...sSss...',
    '...ssss...',
    '...sSss...',
    '..ssssss..',
    '..sSssss..',
    '.ssssssss.',
    'ssssssssss'
  ];
  var KEEPER_IDLE = [
    '....tttt....',
    '...tTTTTt...',
    '...tttttt...',
    '...ssssss...',
    '...sessse...',
    '...ssssss...',
    '....ssss....',
    '..rrrrrrrr..',
    '.rrrrGrrrrr.',
    '.srrrGrrrrs.',
    '.srrrGrrrrs.',
    '..rrrGrrrr..',
    '..rrrGrrrr..',
    '..rrrrrrrr..',
    '...kk..kk...'
  ];
  var KEEPER_LOOK = [
    '....tttt....',
    '...tTTTTt...',
    '..stttttt...',
    '..sssssss...',
    '...sessse...',
    '..rssssss...',
    '..r.ssss....',
    '..rrrrrrrr..',
    '..rrrGrrrrr.',
    '...rrGrrrrs.',
    '...rrGrrrrs.',
    '..rrrGrrrr..',
    '..rrrGrrrr..',
    '..rrrrrrrr..',
    '...kk..kk...'
  ];
  var KEEPER_CHEER = [
    's...tttt...s',
    's..tTTTTt..s',
    'r..tttttt..r',
    'r..ssssss..r',
    '.r.sessse.r.',
    '.r.ssssss.r.',
    '..r.ssss.r..',
    '..rrrrrrrr..',
    '..rrrGrrrr..',
    '..rrrGrrrr..',
    '..rrrGrrrr..',
    '..rrrGrrrr..',
    '..rrrGrrrr..',
    '..rrrrrrrr..',
    '...kk..kk...'
  ];
  var KEEPER_OOPS = [
    '............',
    '....tttt....',
    '..stTTTTts..',
    '..rttttttr..',
    '..rssssssr..',
    '...sksksk...',
    '...ssmmss...',
    '..rrrrrrrr..',
    '.rrrrGrrrrr.',
    '.rrrrGrrrrr.',
    '..rrrGrrrr..',
    '..rrrGrrrr..',
    '..rrrGrrrr..',
    '..rrrrrrrr..',
    '...kk..kk...'
  ];
  var KEEPER_PAL = { t: '#f6efe2', T: C.teal, s: '#c98a5a', e: C.ink, k: '#5a3a22', m: '#8a3a2a', r: '#3d4f9a', G: C.gold };
  var PALM = [
    '..gg....gg..',
    '.gGGg..gGGg.',
    'gG..gggg..Gg',
    '.....gg.....',
    '...gGttGg...',
    '..g..tt..g..',
    '.....tt.....',
    '.....tt.....',
    '....tt......',
    '....tt......',
    '....tt......',
    '...tttt.....'
  ];

  function hx(n) { var s = Math.round(Math.max(0, Math.min(255, n))).toString(16); return s.length < 2 ? '0' + s : s; }
  function mix(a, b, k) {
    var ar = parseInt(a.substr(1, 2), 16), ag = parseInt(a.substr(3, 2), 16), ab = parseInt(a.substr(5, 2), 16);
    var br = parseInt(b.substr(1, 2), 16), bg = parseInt(b.substr(3, 2), 16), bb = parseInt(b.substr(5, 2), 16);
    return '#' + hx(ar + (br - ar) * k) + hx(ag + (bg - ag) * k) + hx(ab + (bb - ab) * k);
  }
  // 台ごとの霞パレット(奥ほど砂霞に寄せる)と火皿の位置
  for (var ti = 0; ti < TOWERS.length; ti++) {
    var tw = TOWERS[ti];
    var hz = (1 - tw.s) * 0.85;
    tw.pal = { o: mix('#6a4a2a', C.haze, hz), O: mix('#b07a3a', C.haze, hz), s: mix(C.stone, C.haze, hz), S: mix('#d8b890', C.haze, hz) };
    tw.px = 14 * tw.s;
    tw.hx = tw.x; tw.hy = tw.y - 150 * tw.s;
  }
  // まっすぐなぞって他の台を通らない組だけを隣り合わせにする
  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
    var k = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2)) : 0;
    return Math.hypot(px - (ax + vx * k), py - (ay + vy * k));
  }
  function clearPath(a, b) {
    var A = TOWERS[a], B = TOWERS[b];
    for (var k = 0; k < TOWERS.length; k++) {
      if (k === a || k === b) continue;
      if (segDist(TOWERS[k].hx, TOWERS[k].hy, A.hx, A.hy, B.hx, B.hy) < R + 20) return false;
    }
    return true;
  }
  function towerDist(a, b) { return Math.hypot(TOWERS[a].hx - TOWERS[b].hx, TOWERS[a].hy - TOWERS[b].hy); }

  function makeSeq(start, offs) {
    var seq = [start];
    for (var k = 1; k < offs.length; k++) {
      var cur = seq[k - 1], back = k >= 2 ? seq[k - 2] : -1;
      var quick = offs[k] - offs[k - 1] < 1;
      var cand = [], fresh = [];
      for (var j = 0; j < TOWERS.length; j++) {
        if (j === cur || j === back || !clearPath(cur, j)) continue;
        if (quick && towerDist(cur, j) > 440) continue;
        cand.push(j);
        if (seq.indexOf(j) < 0) fresh.push(j);
      }
      var pool = fresh.length ? fresh : cand;
      if (!pool.length) { for (var q = 0; q < TOWERS.length; q++) if (q !== cur && clearPath(cur, q)) pool.push(q); }
      seq.push(pool[Math.floor(game.random(0, pool.length)) % pool.length]);
    }
    return seq;
  }

  // ── 進行 ─────────────────────────────────────────
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run = null;

  function newRun(isDemo) {
    var plan = isDemo ? DEMO_ROUNDS : ROUNDS;
    var rounds = [], notes = [], cur = 0;
    for (var r = 0; r < plan.length; r++) {
      var offs = plan[r].offs;
      var seq = isDemo ? plan[r].seq.slice() : makeSeq(cur, offs);
      var rd = {
        idx: r, offs: offs, seq: seq, wind: plan[r].wind, callB: r * 8, respB: r * 8 + 4,
        notes: [], clean: true, links: 0, gust: -1, wrongAt: isDemo ? plan[r].wrongAt : -1, wrongTo: isDemo ? plan[r].wrongTo : -1
      };
      for (var k = 0; k < offs.length; k++) {
        var n = { rd: rd, k: k, tower: seq[k], callT: (r * 8 + offs[k]) * SPB, t: (r * 8 + 4 + offs[k]) * SPB, res: 0, stroke: -1, called: false };
        rd.notes.push(n); notes.push(n);
      }
      cur = seq[seq.length - 1];
      rounds.push(rd);
    }
    var totalLinks = 0;
    for (var q = 0; q < rounds.length; q++) totalLinks += rounds[q].notes.length - 1;
    return {
      demo: isDemo, rounds: rounds, notes: notes, endB: plan.length * 8, totalLinks: totalLinks,
      clock: isDemo ? -0.3 : -READY_T, realT: 0, cueQ: -1, lastBeat: -1, next: 0,
      score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, linkCount: 0,
      pressing: false, stroke: 0, inside: -1, trail: [], links: [], puffs: [], sparks: [],
      hitStop: 0, hitTower: -1, pendingBad: null, beatPulse: 0, cheer: 0, oops: 0, gustT: -1,
      lit: [false, false, false, false, false, false], wisp: [0, 0, 0, 0, 0, 0],
      over: false, won: false, outroT: 0, prevBest: game.best, milestone: false, ended: false
    };
  }

  // ATTRACT のデモは無音(音声の解禁前に音を溜めない)。拍は画面のランプと台の脈で見せる
  function vol(v) { return run.demo ? 0 : v; }
  function tone(f, d, o) { if (!run.demo) game.audio.tone(f, d, o); }

  // 8分ごとの拍クロック(伴奏は melody を 0.06秒先に予約して拍の頭に鳴らす)
  function cueAudio() {
    var lim = run.endB * 2;
    for (var q = run.cueQ + 1; q <= lim; q++) {
      if (run.clock + 0.06 < q * SPB / 2) break;
      run.cueQ = q;
      if (q % 2 === 0 && q < lim) playBeat(q / 2);
    }
  }
  function playBeat(b) {
    if (run.demo) return;
    var inBar = b % 4, call = Math.floor(b / 4) % 2 === 0;
    var lead = call ? (inBar === 0 ? 'D4' : 'R') : LEAD[b % 8];
    game.audio.melody([[lead, 0.5], [call ? 'R' : LEAD[(b + 3) % 8], 0.5]], {
      tempo: BPM, wave: 'triangle', volume: vol(0.035),
      bass: [[BASS[inBar], 0.6], ['R', 0.4]], bassWave: 'sine', bassVolume: vol(0.14)
    });
  }
  // 枠太鼓(拍の頭、小節頭は低く強く)
  function onBeat(b) {
    run.beatPulse = 1;
    var head = b % 4 === 0;
    tone(head ? 110 : 180, head ? 0.11 : 0.05, { wave: 'triangle', volume: vol(head ? 0.22 : 0.1), slide: head ? -40 : -60 });
  }

  function towerAt(x, y) {
    for (var i = 0; i < TOWERS.length; i++) {
      if (Math.hypot(x - TOWERS[i].hx, y - TOWERS[i].hy) <= R) return i;
    }
    return -1;
  }

  function callSmoke(n) {
    var tw = TOWERS[n.tower];
    if (n.k === 0) run.wisp = [0, 0, 0, 0, 0, 0];     // 新しい呼びかけで前の回の名残は消える
    tone(HORN[n.tower], 0.32, { wave: 'sawtooth', volume: vol(0.07), slide: 18 });
    tone(HORN[n.tower], 0.3, { wave: 'triangle', volume: vol(0.08) });
    for (var i = 0; i < 9; i++) {
      run.puffs.push({ x: tw.hx + game.random(-14, 14) * tw.s, y: tw.hy - 10 * tw.s, vx: game.random(-12, 12), vy: -game.random(120, 210) * tw.s, r: (22 + i * 3) * tw.s, t: -i * 0.04, life: 1.2, col: C.smoke });
    }
    if (!n.rd.wind) run.wisp[n.tower] = 1;
  }

  function stepRun(dt) {
    run.clock += dt;
    cueAudio();
    var bi = Math.floor(run.clock / SPB);
    while (run.lastBeat < bi && run.lastBeat + 1 < run.endB) { run.lastBeat++; onBeat(run.lastBeat); }
    for (var i = 0; i < run.notes.length; i++) {
      var n = run.notes[i];
      if (!n.called && run.clock >= n.callT) { n.called = true; callSmoke(n); }
    }
    // 砂風: 呼びかけの終わりに煙を吹き消す(3.3拍目で唸り音の予告 → 3.6拍目から吹き抜ける)
    for (var r = 0; r < run.rounds.length; r++) {
      var rd = run.rounds[r];
      if (!rd.wind) continue;
      if (rd.gust < 0 && run.clock >= (rd.callB + 3.25) * SPB) {
        rd.gust = 0;
        tone(240, 0.5, { wave: 'sawtooth', volume: vol(0.05), slide: 260 });
        tone(120, 0.5, { wave: 'square', volume: vol(0.03), slide: 90 });
      }
      if (rd.gust === 0 && run.clock >= (rd.callB + 3.6) * SPB) { rd.gust = 1; run.gustT = 0; }
    }
    if (run.over) return;
    var p = run.notes[run.next];
    if (p && run.clock > p.t + GOOD_W) { missNote(p, 'late', p.tower); return; }
    if (!run.demo && !p && run.clock >= run.endB * SPB) finishRun(run.miss < LIVES);
  }

  // ── 判定(本番の指もATTRACTのゴーストも同じ関数) ──────────────
  function enterTower(ti, isPress) {
    var p = run.notes[run.next];
    if (!p || run.over || ti < 0) return null;
    var d = run.clock - p.t;
    if (ti === p.tower) {
      if (d < -ARM_W) return null;                     // まだ遠い(居座ると拍を過ぎてMISS)
      if (d < -GOOD_W) { missNote(p, 'early', ti); return 'miss'; }
      if (d > GOOD_W) { missNote(p, 'late', ti); return 'miss'; }
      return hitNote(p, Math.abs(d) <= PERFECT_W ? 1 : 2);
    }
    var prevTower = p.k > 0 ? p.rd.seq[p.k - 1] : -1;
    if (Math.abs(d) <= GOOD_W && ti !== prevTower) { missNote(p, 'wrong', ti); return 'miss'; }
    return null;
  }

  function hitNote(p, grade) {
    var tw = TOWERS[p.tower];
    var rd = p.rd;
    p.res = grade; p.stroke = run.stroke;
    run.next++;
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo);
    if (grade === 1) run.perfect++; else run.good++;
    var gain = (grade === 1 ? 100 : 60) + Math.min(10, run.combo) * 10;
    run.score += gain;
    run.lit[p.tower] = true;
    // 角笛は台の高さで返す + 連続でせり上がるチャイム
    tone(HORN[p.tower], 0.22, { wave: 'triangle', volume: vol(0.12) });
    tone(660 + Math.min(12, run.combo) * 45, 0.07, { wave: 'square', volume: vol(0.05) });
    game.feedback.good(tw.hx, tw.hy - 40, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.gold : C.teal, size: grade === 1 ? 56 : 46,
      count: grade === 1 ? 14 : 8, volume: vol(0.2)
    });
    if (!run.demo) game.fx.popup('+' + gain, tw.hx + 70, tw.hy - 120, { color: C.white, size: 40 });
    for (var i = 0; i < 6; i++) run.puffs.push({ x: tw.hx, y: tw.hy - 10 * tw.s, vx: game.random(-20, 20), vy: -game.random(160, 240) * tw.s, r: (20 + i * 3) * tw.s, t: -i * 0.03, life: 0.9, col: '#ffcf9a' });
    if (p.k > 0) {
      var prev = rd.notes[p.k - 1];
      if ((prev.res === 1 || prev.res === 2) && prev.stroke === run.stroke && run.pressing) {
        run.links.push({ a: prev.tower, b: p.tower, t: 0 });
        rd.links++; run.linkCount++;
        run.score += 40;
        tone(1200, 0.1, { wave: 'sawtooth', volume: vol(0.035), slide: 500 });
        run.sparks.push({ a: prev.tower, b: p.tower, t: 0 });
      }
    }
    if (!run.demo && run.combo === 8 && !run.milestone) {
      run.milestone = true;
      game.fx.popup('x8', W / 2, 470, { color: C.gold, size: 84 });
      game.audio.play('se_milestone', 0.45);
    }
    if (p.k === rd.notes.length - 1) {
      var all = rd.links === rd.notes.length - 1;
      for (var j = 0; j < rd.notes.length; j++) if (rd.notes[j].res !== 1 && rd.notes[j].res !== 2) all = false;
      if (all) {
        rd.clean = true; run.cheer = 1.0;
        run.score += 250;
        if (!run.demo) {
          game.fx.popup('NICE', W / 2, 560, { color: C.gold, size: 96 });
          game.audio.play('se_powerup', 0.4);
        }
      }
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function missNote(p, why, ti) {
    p.res = 3;
    p.rd.clean = false;
    run.next++;
    run.miss++; run.combo = 0;
    run.hitStop = 0.4; run.hitTower = ti >= 0 ? ti : p.tower; run.oops = 1.0;
    var tw = TOWERS[run.hitTower];
    run.pendingBad = { x: tw.hx, y: tw.hy - 40 };
    tone(why === 'wrong' ? 150 : 200, 0.18, { wave: 'sawtooth', volume: vol(0.12), slide: -70 });
    for (var k = 0; k < 10; k++) run.puffs.push({ x: tw.hx, y: tw.hy, vx: game.random(-240, 240), vy: game.random(-220, 40), r: 16 * tw.s + 6, t: 0, life: 0.6, col: C.dune, grav: 700 });
  }

  function flushBad() {
    if (!run.pendingBad) return;
    var pb = run.pendingBad;
    run.pendingBad = null;
    game.feedback.bad(pb.x, pb.y, { text: 'MISS', color: C.bad, flashColor: C.white, shake: run.demo ? 3 : 12, volume: vol(0.55) });
    if (!run.demo && run.miss >= LIVES) { game.audio.play('se_break', 0.35); finishRun(false); }
  }

  function fingerDown(x, y) {
    run.pressing = true; run.stroke++;
    run.trail = [{ x: x, y: y, t: game.time.elapsed }];
    var ti = towerAt(x, y);
    run.inside = ti;
    return enterTower(ti, true);
  }
  function fingerMove(x, y) {
    if (!run.pressing) return null;
    run.trail.push({ x: x, y: y, t: game.time.elapsed });
    if (run.trail.length > 40) run.trail.shift();
    var ti = towerAt(x, y);
    if (ti === run.inside) return null;
    run.inside = ti;
    return enterTower(ti, false);
  }
  function fingerUp() {
    run.pressing = false; run.inside = -1;
  }

  function finishRun(ok) {
    if (run.over) return;
    run.over = true; run.won = ok; run.outroT = 2.2;
    run.pressing = false;
    if (run.demo) return;
    game.audio.stopBgm();
    if (ok) {
      run.score += (LIVES - run.miss) * 150 + 300;
      for (var i = 0; i < 6; i++) {
        var tw = TOWERS[i];
        game.fx.burst(tw.hx, tw.hy - 30, { color: i % 2 ? C.gold : C.fire, count: 18, speed: 380 });
        run.lit[i] = true;
      }
      game.fx.flash(C.white, 0.25);
      game.audio.play('se_success', 0.55);
      run.cheer = 2.2;
    } else {
      game.audio.play('se_failure', 0.5);
      run.oops = 2.2;
    }
  }

  function endGame() {
    var stats = { score: run.score, links: run.linkCount, perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo };
    if (run.won) game.end.success(run.score, stats); else game.end.failure(stats);
  }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; run = newRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; run = newRun(true); demo.t = 0; demo.cyc = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || run.over || run.hitStop > 0 || run.clock < 0) return;
    var r = fingerDown(x, y);
    if (!r) game.audio.tone(420, 0.04, { wave: 'triangle', volume: 0.05 });     // 台の外/まだ早い: 砂を踏む音だけ
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || run.over || run.hitStop > 0) return;
    var r = fingerMove(x, y);
    if (r === 'perfect' || r === 'good') game.audio.tone(1480, 0.03, { wave: 'square', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !run.pressing) return;
    fingerUp();
    if (!run.over) game.audio.tone(300, 0.04, { wave: 'sine', volume: 0.04 });
  });

  // ── 描画ヘルパー ─────────────────────────────────────
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function oval(x, y, rx, ry, col, a) {
    var n = Math.max(3, Math.round(ry / 3));
    for (var i = -n; i < n; i++) {
      var f = (i + 0.5) / n;
      var w = rx * Math.sqrt(Math.max(0, 1 - f * f));
      game.draw.rect(x - w, y + i * ry / n, w * 2, ry / n + 0.6, col, a);
    }
  }
  function ring(x, y, r, col, w) {
    var n = 36;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }

  var HORIZON = 470;
  function drawDesert() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HORIZON + 10, [[0, C.sky0], [0.75, '#bcd8ec'], [1, C.sky1]]);
    // 太陽と陽炎
    game.draw.circle(840, 300, 120, '#fff3c8', 0.25);
    game.draw.circle(840, 300, 80, '#fff3c8', 0.45);
    game.draw.circle(840, 300, 56, '#fffbe8');
    game.draw.gradient(HORIZON, H, [[0, C.haze], [0.25, C.sand], [1, C.duneDk]]);
    // 遠い砂丘(霞んで低彩度) → 近い砂丘(濃い)
    game.draw.circle(150, HORIZON + 560, 600, mix(C.dune, C.haze, 0.7));
    game.draw.circle(980, HORIZON + 620, 640, mix(C.dune, C.haze, 0.55));
    game.draw.circle(560, HORIZON + 1180, 1000, mix(C.dune, C.haze, 0.3));
    game.draw.circle(-120, 2050, 760, C.dune);
    game.draw.circle(1250, 2080, 780, C.dune);
    for (var h = 0; h < 5; h++) {
      var hy = HORIZON + 8 + h * 7;
      game.draw.rect(0, hy + Math.sin(t * 3 + h) * 2, W, 2, C.white, 0.12);
    }
    // 遠くの隊商(板のまま小さく)
    var cx = ((t * 18) % (W + 200)) - 100;
    oval(cx, HORIZON + 30, 26, 5, C.ink, 0.12);
    game.draw.sprite(['.kk....', 'kkkk.kk', '.kkkkk.', '.k.k.k.'], { k: mix('#6a4a2a', C.haze, 0.6) }, cx, HORIZON + 18, 5, { anchor: 'center' });
    // オアシス(手前右)
    oval(860, 1610, 190, 46, C.ink, 0.15);
    oval(860, 1600, 180, 40, C.water);
    oval(860, 1592, 140, 18, '#a8ecf2', 0.5 + Math.sin(t * 2) * 0.15);
    drawPalm(980, 1560, 1.15, t);
    drawPalm(720, 1520, 0.95, t + 1);
    drawPalm(110, 760, 0.5, t + 2);
    drawPalm(960, 700, 0.45, t + 3);
  }
  function drawPalm(x, y, s, t) {
    var hz = (1.2 - s) * 0.5;
    oval(x + 10 * s, y + 4, 70 * s, 14 * s, C.ink, 0.18);
    var sway = Math.sin(t * 1.3) * 3;
    game.draw.sprite(PALM, { g: mix(C.palm, C.haze, hz), G: mix(C.palmDk, C.haze, hz), t: mix('#8a5a30', C.haze, hz) }, x + sway, y - 84 * s, 14 * s, { anchor: 'center' });
  }

  function drawTower(i) {
    var tw = TOWERS[i];
    var flash = run.hitStop > 0 && run.hitTower === i;
    // 接地影
    oval(tw.x, tw.y + 4, 90 * tw.s, 20 * tw.s, C.ink, 0.22);
    var scale = flash ? tw.px * 1.18 : tw.px;
    var pal = flash ? { o: C.white, O: C.white, s: C.white, S: C.white } : tw.pal;
    game.draw.sprite(TOWER_ART, pal, tw.x, tw.y - 6 * scale, scale, { anchor: 'center' });
    if (run.lit[i] || flash) {
      var f = Math.sin(game.time.elapsed * 14 + i) * 0.5 + 0.5;
      game.draw.circle(tw.hx, tw.hy - 8 * tw.s, (30 + f * 8) * tw.s, C.fire, 0.85);
      game.draw.circle(tw.hx, tw.hy - 16 * tw.s, (16 + f * 6) * tw.s, C.gold);
    }
    // 触れる範囲(全台同じ広さ・同じ見た目)
    var pulse = run.beatPulse * 0.25;
    ring(tw.hx, tw.hy, R, C.white, 3);
    game.draw.circle(tw.hx, tw.hy, R, C.white, 0.08 + pulse * 0.3);
  }

  function drawWisps(dt) {
    for (var i = 0; i < TOWERS.length; i++) {
      if (run.wisp[i] <= 0) continue;
      var tw = TOWERS[i];
      var t = game.time.elapsed;
      for (var k = 0; k < 3; k++) {
        var ph = (t * 0.6 + k / 3) % 1;
        game.draw.circle(tw.hx + Math.sin(t * 2 + k) * 10 * tw.s, tw.hy - 30 * tw.s - ph * 120 * tw.s, (14 + ph * 16) * tw.s, C.smoke, 0.45 * (1 - ph) * run.wisp[i]);
      }
    }
  }

  function drawLinks() {
    for (var i = 0; i < run.links.length; i++) {
      var L = run.links[i], A = TOWERS[L.a], B = TOWERS[L.b];
      var glow = 0.6 + Math.sin(game.time.elapsed * 6 + i) * 0.2;
      game.draw.line(A.hx, A.hy, B.hx, B.hy, C.ink, 22);
      game.draw.line(A.hx, A.hy, B.hx, B.hy, C.fire, 12);
      game.draw.line(A.hx, A.hy, B.hx, B.hy, C.gold, 4 + glow * 3);
    }
  }
  function drawSparks(dt) {
    for (var i = run.sparks.length - 1; i >= 0; i--) {
      var s = run.sparks[i];
      s.t += dt * 2.6;
      if (s.t >= 1) { run.sparks.splice(i, 1); continue; }
      var A = TOWERS[s.a], B = TOWERS[s.b];
      var x = A.hx + (B.hx - A.hx) * s.t, y = A.hy + (B.hy - A.hy) * s.t;
      game.draw.circle(x, y, 26, C.gold, 0.5);
      game.draw.circle(x, y, 14, C.white);
    }
  }
  function drawPuffs(dt) {
    for (var i = run.puffs.length - 1; i >= 0; i--) {
      var f = run.puffs[i];
      f.t += dt;
      if (f.t < 0) continue;
      if (f.t > f.life) { run.puffs.splice(i, 1); continue; }
      if (f.grav) f.vy += f.grav * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      var k = f.t / f.life;
      game.draw.circle(f.x, f.y, f.r * (1 + k * 0.8), f.col, 0.85 * (1 - k));
    }
  }
  function drawGust(dt) {
    if (run.gustT < 0) return;
    run.gustT += dt;
    var k = run.gustT / 0.7;
    if (k >= 1) { run.gustT = -1; return; }
    if (k > 0.3) {
      run.wisp = [0, 0, 0, 0, 0, 0];
      for (var q = run.puffs.length - 1; q >= 0; q--) if (run.puffs[q].col === C.smoke) run.puffs.splice(q, 1);
    }
    var x0 = -300 + k * (W + 600);
    for (var i = 0; i < 14; i++) {
      var y = 520 + i * 62;
      game.draw.line(x0 - 260 + (i % 3) * 60, y, x0 + (i % 4) * 40, y + 10, C.dune, 10);
      game.draw.line(x0 - 180 + (i % 3) * 60, y + 18, x0 + 40 + (i % 4) * 40, y + 24, C.haze, 5);
    }
  }
  function drawTrail() {
    var now = game.time.elapsed, pts = [];
    for (var i = 0; i < run.trail.length; i++) if (now - run.trail[i].t < 0.25) pts.push(run.trail[i]);
    for (var j = 1; j < pts.length; j++) game.draw.line(pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y, C.fire, 16);
    for (var k = 1; k < pts.length; k++) game.draw.line(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, C.white, 6);
  }

  function drawKeeper() {
    var spr = KEEPER_IDLE;
    var phase = curPhase();
    if (run.oops > 0) spr = KEEPER_OOPS;
    else if (run.cheer > 0) spr = KEEPER_CHEER;
    else if (phase.call) spr = KEEPER_LOOK;
    var bob = run.beatPulse * 8;
    var x = 210, y = 1600 - bob;
    oval(x, 1712, 120, 22, C.ink, 0.25);
    game.draw.sprite(spr, KEEPER_PAL, x, y, 15, { anchor: 'center' });
    // 手持ちの松明
    var fx = x + 112, fy = y - 40;
    game.draw.line(fx, fy, fx + 10, fy + 120, '#6a4424', 10);
    var fl = Math.sin(game.time.elapsed * 16) * 4;
    game.draw.circle(fx, fy - 10, 22 + fl, C.fire, 0.9);
    game.draw.circle(fx, fy - 16, 12 + fl * 0.5, C.gold);
  }

  function curPhase() {
    var b = run.clock / SPB;
    var r = Math.floor(b / 8);
    var rd = r >= 0 && r < run.rounds.length ? run.rounds[r] : null;
    var call = !!rd && b - rd.callB < 4 && b >= rd.callB;
    return { rd: rd, call: call, resp: !!rd && !call, pos: rd ? (call ? b - rd.callB : b - rd.respB) : 0 };
  }

  // 譜面帯: 呼びかけのリズムを点で残し、返しではカーソルが点へ近づく(0.6秒前から次の点が脈打つ)
  function drawStrip() {
    var ph = curPhase();
    var y = 318, x0 = 200, bw = 190;
    game.draw.rect(60, y - 58, W - 120, 116, C.ink, 0.55);
    game.draw.rect(66, y - 52, W - 132, 104, C.panel, 0.92);
    // 左のアイコン: 呼びかけ=煙 / 返し=火
    if (ph.call || !ph.rd) {
      game.draw.circle(122, y + 6, 18, '#b8b0a4');
      game.draw.circle(110, y - 10, 14, '#cfc8bc');
      game.draw.circle(130, y - 22, 11, '#e0dad0');
    } else {
      game.draw.circle(122, y + 4, 22, C.fire);
      game.draw.circle(122, y - 4, 12, C.gold);
    }
    for (var b = 0; b <= 4; b++) game.draw.rect(x0 + b * bw - 2, y - 40, 4, 80, b === 0 ? C.ink : '#c8b090');
    if (!ph.rd) return;
    var rd = ph.rd;
    for (var k = 0; k < rd.notes.length; k++) {
      var n = rd.notes[k];
      var nx = x0 + rd.offs[k] * bw + 24;
      if (ph.call) {
        if (!n.called) continue;
        game.draw.circle(nx, y, 22, C.ink);
        game.draw.circle(nx, y, 16, '#8a8478');
      } else {
        var col = n.res === 1 ? C.gold : n.res === 2 ? C.teal : n.res === 3 ? C.bad : C.panel;
        var lead = n.t - run.clock;
        var isNext = run.notes[run.next] === n;
        var rr = isNext && lead < 0.6 && lead > -0.2 ? 24 + (1 - Math.max(0, lead) / 0.6) * 10 : 22;
        game.draw.circle(nx, y, rr, C.ink);
        game.draw.circle(nx, y, rr - 6, col);
        if (isNext && Math.floor(game.time.elapsed * 10) % 2 === 0) ring(nx, y, rr + 8, C.fire, 4);
      }
    }
    var cx = x0 + Math.max(0, Math.min(4, ph.pos)) * bw + 24;
    game.draw.rect(cx - 3, y - 46, 6, 92, ph.call ? '#7a7468' : C.fire);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.panel, 0.94);
    game.draw.rect(0, 222, W, 8, C.ink);
    label('SCORE ' + run.score, 40, 84, 50, C.fire, 'left');
    if (run.combo >= 2) label('x' + run.combo, 40, 168, 44, C.teal, 'left');
    // 残りの松明(MISSで消える)
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - run.miss;
      var lx = W - 70 - i * 64;
      game.draw.rect(lx - 5, 70, 10, 50, '#6a4424');
      game.draw.circle(lx, 62, 18, on ? C.fire : '#c8b8a0');
      if (on) game.draw.circle(lx, 56, 9, C.gold);
    }
    // 4回の進み具合
    for (var r = 0; r < run.rounds.length; r++) {
      var rd = run.rounds[r];
      var done = rd.notes[rd.notes.length - 1].res > 0;
      var px = 420 + r * 64;
      game.draw.rect(px - 4, 148, 52, 40, C.ink);
      game.draw.rect(px, 152, 44, 32, done ? (rd.clean ? C.gold : '#c8a888') : (curPhase().rd === rd ? C.fire : '#efe0c8'));
    }
    // 拍ランプ(4つ)
    var cur = run.lastBeat >= 0 ? run.lastBeat % 4 : -1;
    for (var b = 0; b < 4; b++) {
      var lit = b === cur;
      game.draw.circle(750 + b * 76, 168, lit ? 24 + run.beatPulse * 8 : 20, C.ink);
      game.draw.circle(750 + b * 76, 168, lit ? 18 + run.beatPulse * 8 : 14, lit ? (b === 0 ? C.fire : C.gold) : '#e8dcc4');
    }
  }

  function drawScene(dt) {
    drawDesert();
    drawLinks();
    // 奥の台から順に(板の重なり順)
    var order = [5, 4, 3, 2, 1, 0];
    for (var i = 0; i < order.length; i++) drawTower(order[i]);
    drawWisps(dt);
    drawPuffs(dt);
    drawSparks(dt);
    drawGust(dt);
    drawTrail();
    drawKeeper();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.4;
    game.draw.rect(40, y0 - 8, W - 80, hh + 16, C.ink);
    game.draw.rect(48, y0, W - 96, hh, C.panel);
    game.draw.rect(48, y0, W - 96, 22, run.won ? C.teal : C.bad);
    label(run.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, run.won ? C.gold : C.bad);
    label('SCORE ' + run.score, W / 2, H * 0.4, 62, C.fire);
    label('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.45, 36, C.teal);
    label(run.linkCount + ' / ' + run.totalLinks, W / 2, H * 0.5, 58, C.gold);
    label('x' + run.maxCombo, W / 2, H * 0.54, 40, C.teal);
    if (run.won && run.score > run.prevBest) label('NEW RECORD', W / 2, H * 0.59, 62, C.gold);
    else label('BEST ' + Math.max(run.prevBest, run.won ? run.score : 0), W / 2, H * 0.59, 46, C.fire);
    if (!run.won) {
      var left = 0;
      for (var i = 0; i < run.notes.length; i++) if (run.notes[i].res !== 1 && run.notes[i].res !== 2) left++;
      label('あと' + Math.max(1, left) + '台!', W / 2, H * 0.635, 52, C.bad);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.72, 40, C.white);
  }

  // ── ATTRACT: 実ロジックで2回。2回目の最後の台は別の台へ結んでMISSになる例を見せる ──
  var demo = { t: 0, cyc: 0, next: 0, x: 540, y: 1460 };
  var DEMO_CYC = 16 * SPB + 1.6;
  function ghostTarget(p) {
    var ti = p.rd.wrongAt === p.k ? p.rd.wrongTo : p.tower;
    return TOWERS[ti];
  }
  function ghostStep(dt) {
    var p = run.notes[demo.next];
    if (p) {
      var tg = ghostTarget(p);
      if (p.k === 0) {
        if (run.pressing && run.clock > p.t - SPB * 1.5) fingerUp();
        demo.x += (tg.hx - demo.x) * Math.min(1, dt * 6);
        demo.y += (tg.hy - demo.y) * Math.min(1, dt * 6);
        if (run.clock >= p.t) { demo.x = tg.hx; demo.y = tg.hy; fingerDown(demo.x, demo.y); demo.next++; }
      } else if (run.pressing) {
        var prevN = p.rd.notes[p.k - 1];
        var A = TOWERS[prevN.tower];
        var ux = tg.hx - A.hx, uy = tg.hy - A.hy, L = Math.hypot(ux, uy) || 1;
        var ex = tg.hx - ux / L * (R + 12), ey = tg.hy - uy / L * (R + 12);
        var t0 = prevN.t + 0.05, k = Math.max(0, Math.min(1, (run.clock - t0) / Math.max(0.05, p.t - t0)));
        k = k * k * (3 - 2 * k);
        demo.x = A.hx + (ex - A.hx) * k; demo.y = A.hy + (ey - A.hy) * k;
        if (run.clock >= p.t) { demo.x = tg.hx; demo.y = tg.hy; demo.next++; }
        fingerMove(demo.x, demo.y);
      } else {
        demo.next++;
      }
    } else {
      if (run.pressing) fingerUp();
      demo.x += (540 - demo.x) * Math.min(1, dt * 3);
      demo.y += (1460 - demo.y) * Math.min(1, dt * 3);
    }
    // 回の最後の台を過ぎたら指を離す
    if (run.pressing) {
      var last = run.notes[demo.next - 1];
      if (last && last.k === last.rd.notes.length - 1 && run.clock > last.t + SPB * 0.4) fingerUp();
    }
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { run = newRun(true); demo.next = 0; demo.cyc++; }
    if (run.hitStop > 0) { run.hitStop -= dt; if (run.hitStop <= 0) flushBad(); return; }
    if (run.clock < run.endB * SPB + 0.4) stepRun(dt);
    ghostStep(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (!run) run = newRun(true);
    run.beatPulse = Math.max(0, run.beatPulse - dt * 4);
    run.cheer = Math.max(0, run.cheer - dt); run.oops = Math.max(0, run.oops - dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      drawStrip();
      game.draw.hand(demo.x, demo.y, { press: run.pressing, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.panel, 0.94);
      game.draw.rect(0, 222, W, 8, C.ink);
      label(GAME_TITLE, W / 2, 104 + Math.sin(t * 3) * 6, 96, C.fire);
      label('HI-SCORE ' + game.best, W / 2, 188, 38, C.teal);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.gold);
      else label('TAP TO START', W / 2, H * 0.965, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ── PLAYING ──
    run.realT += dt;
    if (!run.over && run.realT >= READY_T + TIME_LIMIT + 2.5) { run.hitStop = 0; run.pendingBad = null; finishRun(run.miss < LIVES); }
    if (run.hitStop > 0) {
      run.hitStop -= dt;
      if (run.hitStop <= 0) flushBad();
    } else if (run.over) {
      run.outroT -= dt;
      if (run.outroT <= 0 && !run.ended) { run.ended = true; state = S.RESULT; endGame(); }
    } else {
      var wasReady = run.clock < -0.35;
      stepRun(dt);
      if (wasReady && run.clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(dt);
    drawStrip();
    drawHud();
    if (run.clock < 0) {
      game.draw.rect(0, H * 0.42 - 10, W, 190, C.ink);
      game.draw.rect(0, H * 0.42, W, 170, C.panel);
      label(run.clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 112, 110, C.fire);
    }
    if (run.over && run.hitStop <= 0 && run.outroT < 1.4) drawResult(state === S.RESULT);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    run = newRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
