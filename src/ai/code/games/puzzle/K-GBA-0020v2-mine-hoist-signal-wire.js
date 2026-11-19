// K-GBA-0020v2-mine-hoist-signal-wire.js
// 坑口合図の配線 — 坑道から拍ごとに届く汽笛・鐘・灯りの合図を聞き取り、次の小節で同じ順に巻き上げ機を線で結ぶ
// 操作: 1回は2小節。1小節目(お手本)は合図盤の4つの窓に拍ごとに合図が出て鳴るので見て聞くだけ(入力は効かない)。2小節目(返し)で、合図と同じ拍の頭に同じ印の巻き上げ機(汽笛=左上/鐘=右上/灯り=下)へ指を置き、離さずに次の巻き上げ機へなぞって線を結ぶ。後半2回は返しの小節で合図盤にシャッターが下りる
// 終わり: 8小節(約20秒)を乗り切ればCLEAR。違う巻き上げ機・拍ずれ・結び忘れのMISSが3回でGAME OVER
// @mechanic: connect
// @theme: mine_hoist_signal_wire
// 世界観: 鉱山の昇降機の操作室。巻き上げ番が坑道から届く汽笛・鐘・灯りの合図を聞き取り、対応する巻き上げ機へ拍の順に配線を結んで籠を動かす
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ・ノーミスで返せた回数)
// スタイル: 90s PRE-RENDER

(function(game) {
  var STYLE = { bg: ['#14171c', '#2a3038', '#3c434c'], main: ['#8c96a2', '#c8a060', '#5a6470'], accent: ['#ff7a3c', '#3cc8ff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗い金属質の1枚絵(粒状ノイズ・リベット・管のハイライト)。動くのは合図と巻き上げ番(ドット)と配線だけ
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], plate: STYLE.bg[2],
    steel: STYLE.main[0], brass: STYLE.main[1], steelDk: STYLE.main[2],
    horn: STYLE.accent[0], bell: STYLE.accent[1], lamp: '#f2eea0',
    hi: '#e6ecf2', ink: '#08090b', good: '#7cf08a', bad: '#ff4a4a', gold: '#ffc84a', glass: '#101418', copper: '#e08a4a'
  };
  var TYPE_COL = [C.horn, C.bell, C.lamp];

  var GAME_TITLE = 'HOIST SIGNAL';
  var BPM = 96;
  var SPB = 60 / BPM;
  var PHRASES = 4;
  var SONG_BEATS = PHRASES * 8;
  var WIN_P = 0.07, WIN_G = 0.15, CATCH = 0.28;
  var LIVES = 3;
  var LAYOUTS = [[0, 1, 2], [0, 1, 2, 3], [0, 2, 3], [0, 1, 2, 3]];
  var HIDDEN = [false, false, true, true];
  var DEMO_PATS = [[0, 1, 2, null], [2, 0, 1, 0]];
  var DEMO_CYCLE = 16 * SPB + 1.0;

  var NODES = [{ x: 250, y: 1070 }, { x: 830, y: 1070 }, { x: 540, y: 1500 }];
  var NODE_R = 125;
  var SLOT_X = [365, 525, 685, 845], SLOT_Y = 450, SLOT_W = 140, SLOT_H = 200;
  var OP_X = 175, OP_Y = 430;

  // 伴奏(8分刻み、1小節で一巡): 短調の巻き上げ機のうなり
  var MEL = ['A3', 0, 'C4', 'E4', 'A3', 0, 'D4', 'C4'];
  var BASS = ['A2', 'A2', 'F2', 'G2'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, x: 900, y: 1700, down: false };

  // ── スプライト ─────────────────────────────────────────
  var SPR = [
    ['...#...', '..###..', '..#.#..', '..###..', '.#####.', '.#.#.#.', '#######', '..###..'],
    ['...##...', '..####..', '.######.', '.######.', '.######.', '########', '...##...'],
    ['..###..', '.#...#.', '#.###.#', '#.###.#', '#.###.#', '.#...#.', '..###..', '...#...', '..###..']
  ];
  var OP_BASE = [
    '....yyyy....',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    '.hHhhhhhhhh.',
    '..ssssssss..',
    '..sesssses..',
    '..ssssssss..',
    '..sssmmsss..',
    '...ssssss...',
    '..oooooooo..',
    '.oooobboooo.',
    'oooooooooooo',
    'oooooooooooo',
    'oooooooooooo'
  ];
  function opFrame(rows) {
    var f = OP_BASE.slice();
    for (var k in rows) f[k] = rows[k];
    return f;
  }
  var OP_A = opFrame({});
  var OP_BLINK = opFrame({ 5: '..ssssssss..' });
  var OP_LISTEN = opFrame({ 4: '.sssssssss..', 5: 'ssesssses...', 6: 'ssssssss....', 7: '.sssoosss...' });
  var OP_OOPS = opFrame({ 5: '..seesseess.', 7: '..ssmmmmss..' });
  var OP_PAL = { y: '#fff6a0', h: '#d89a2a', H: '#ffe08a', s: '#d8a880', e: C.ink, m: '#7a3a2a', o: '#4a5a70', b: C.brass };

  // 粒状ノイズ(1枚絵として固定)
  var GRAIN = [];
  var seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (var g = 0; g < 320; g++) GRAIN.push([rnd() * W, rnd() * H, 2 + rnd() * 3, rnd() < 0.5 ? '#ffffff' : '#000000', 0.04 + rnd() * 0.06]);

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function rivet(x, y) {
    game.draw.circle(x, y, 9, C.ink, 0.6);
    game.draw.circle(x - 1, y - 1, 7, C.steel);
    game.draw.circle(x - 3, y - 3, 3, C.hi, 0.8);
  }
  function plate(x, y, w, h, col) {
    game.draw.rect(x, y, w, h, col || C.plate);
    game.draw.rect(x, y, w, 4, C.hi, 0.35);
    game.draw.rect(x, y + h - 5, w, 5, C.ink, 0.5);
    rivet(x + 18, y + 18); rivet(x + w - 18, y + 18); rivet(x + 18, y + h - 18); rivet(x + w - 18, y + h - 18);
  }
  function pipe(x, y0, y1, w) {
    var shades = ['#2a3038', '#4a525c', '#7a848e', '#a8b2bc', '#7a848e', '#4a525c', '#2a3038'];
    var sw = w / shades.length;
    for (var i = 0; i < shades.length; i++) game.draw.rect(x + i * sw, y0, sw + 1, y1 - y0, shades[i]);
  }

  // ── 進行 ───────────────────────────────────────────────
  function makePattern(slots) {
    var pat = [null, null, null, null], prev = -1;
    for (var i = 0; i < slots.length; i++) {
      var t = prev < 0 ? Math.floor(game.random(0, 3)) % 3 : (prev + 1 + Math.floor(game.random(0, 2)) % 2) % 3;
      pat[slots[i]] = t; prev = t;
    }
    return pat;
  }

  function newRun(isDemo) {
    var pats = [], notes = [];
    var n = isDemo ? DEMO_PATS.length : PHRASES;
    for (var p = 0; p < n; p++) {
      var pat = isDemo ? DEMO_PATS[p] : makePattern(LAYOUTS[p]);
      pats.push({ pat: pat, hidden: isDemo ? false : HIDDEN[p], clean: true });
      for (var s = 0; s < 4; s++) if (pat[s] !== null) notes.push({ phrase: p, slot: s, beat: p * 8 + 4 + s, type: pat[s], st: 'wait' });
    }
    return {
      demo: isDemo, pats: pats, notes: notes, songT: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, cleanRounds: 0,
      cables: [], lastNode: -1, lastPhrase: -1, inNode: -1, down: false, px: 0, py: 0,
      slotFlash: [0, 0, 0, 0], nodeFlash: [0, 0, 0], nodeGrade: [0, 0, 0],
      stop: 0, stopNote: null, pulse: 0, oops: 0, shutter: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < MEL.length; i++) notes.push([MEL[i] || 'R', 0.5]);
    for (var j = 0; j < BASS.length; j++) bass.push([BASS[j], 1]);
    game.audio.melody(notes, { tempo: BPM, wave: 'square', volume: 0.035, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  function signalSound(type, vol) {
    if (type === 0) {
      game.audio.tone('D4', 0.32, { wave: 'sawtooth', volume: 0.06 * vol });
      game.audio.tone('A4', 0.32, { wave: 'sawtooth', volume: 0.04 * vol });
    } else if (type === 1) {
      game.audio.tone('E6', 0.3, { wave: 'triangle', volume: 0.1 * vol });
      game.audio.tone('B6', 0.12, { wave: 'sine', volume: 0.05 * vol });
    } else {
      game.audio.tone(1100, 0.12, { wave: 'sine', volume: 0.09 * vol, slide: 700 });
    }
  }

  // 拍クロックから鳴らす伴奏: 4分でベース+打音、8分でうなり。返しの小節は薄く
  function playStep(s) {
    var beat = Math.floor(s / 2);
    var resp = beat % 8 >= 4;
    var m = MEL[s % 8];
    if (m && !resp) game.audio.tone(m, SPB * 0.4, { wave: 'square', volume: 0.035 });
    game.audio.tone(s % 2 === 0 ? 3200 : 2600, 0.02, { wave: 'square', volume: 0.02 });
    if (s % 2 === 0) {
      game.audio.tone(BASS[beat % 4], SPB * 0.8, { wave: 'triangle', volume: resp ? 0.06 : 0.09 });
      game.audio.tone(beat % 4 === 0 ? 90 : 70, 0.08, { wave: 'square', volume: 0.08, slide: -30 });
    }
  }

  function onBeat(b) {
    R.pulse = 1;
    var p = Math.floor(b / 8), inPh = b % 8;
    if (p >= R.pats.length) return;
    if (inPh < 4) {
      var t = R.pats[p].pat[inPh];
      if (t !== null) { R.slotFlash[inPh] = 1; if (!R.demo) signalSound(t, 1); }
      if (inPh === 3 && !R.demo) { game.audio.tone('C5', 0.06, { wave: 'square', volume: 0.05 }); game.audio.tone('G5', 0.06, { wave: 'square', volume: 0.05 }); }
    }
  }

  function phraseOf(b) { return Math.floor(b / 8); }
  function inResponse() { return R.beatIdx >= 0 && R.beatIdx % 8 >= 4; }

  function nodeAt(x, y) {
    for (var i = 0; i < NODES.length; i++) {
      var dx = x - NODES[i].x, dy = y - NODES[i].y;
      if (dx * dx + dy * dy <= (NODE_R + 15) * (NODE_R + 15)) return i;
    }
    return -1;
  }

  // 指が巻き上げ機に入った(押した or なぞって入った)。戻り値は判定
  function enterNode(k) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    var best = null, bestD = 1e9;
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st !== 'wait') continue;
      var d = R.songT - n.beat * SPB;
      if (Math.abs(d) < Math.abs(bestD)) { bestD = d; best = n; }
    }
    if (!best || Math.abs(bestD) > CATCH) { R.nodeFlash[k] = 0.3; R.nodeGrade[k] = 0; return 'stray'; }
    if (best.phrase !== R.lastPhrase) { R.lastPhrase = best.phrase; R.lastNode = -1; R.cables = []; }
    if (R.lastNode >= 0 && R.lastNode !== k) R.cables.push({ a: R.lastNode, b: k, ok: best.type === k && Math.abs(bestD) <= WIN_G });
    R.lastNode = k;
    if (best.type !== k || Math.abs(bestD) > WIN_G) { missNote(best, k); return 'miss'; }
    hitNote(best, k, Math.abs(bestD) <= WIN_P ? 'PERFECT' : 'GOOD');
    return 'hit';
  }

  function pointerAt(x, y) {
    R.px = x; R.py = y;
    var k = nodeAt(x, y);
    var res = 'none';
    if (k >= 0 && k !== R.inNode) res = enterNode(k);
    R.inNode = k;
    return { res: res, node: k };
  }

  function hitNote(n, k, grade) {
    n.st = 'hit';
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; }
    else { R.good++; R.score += 50 + R.combo * 5; }
    R.nodeFlash[k] = 0.4; R.nodeGrade[k] = 1;
    var nd = NODES[k];
    game.feedback.good(nd.x, nd.y - 150, { text: grade, color: grade === 'PERFECT' ? C.gold : C.good, count: grade === 'PERFECT' ? 16 : 9 });
    game.fx.burst(nd.x, nd.y, { color: TYPE_COL[k], count: 12, speed: 320 });
    if (!R.demo) signalSound(k, 0.7);
    // 1回ぶん全部返せた
    var ph = R.pats[n.phrase], all = true;
    for (var i = 0; i < R.notes.length; i++) if (R.notes[i].phrase === n.phrase && R.notes[i].st !== 'hit') all = false;
    if (all && ph.clean) {
      R.cleanRounds++; R.score += 200;
      game.fx.popup('NICE +200', W / 2, 820, { color: C.gold, size: 64 });
      if (!R.demo) game.audio.play('se_milestone', 0.5);
    }
  }

  function missNote(n, k) {
    n.st = 'miss';
    R.pats[n.phrase].clean = false;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopNote = { n: n, k: k === undefined ? n.type : k }; R.oops = 1.1;
    if (!R.demo) game.audio.tone(120, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function releaseStop() {
    var s = R.stopNote;
    R.stopNote = null;
    if (!s) return;
    var nd = NODES[s.k];
    game.feedback.bad(nd.x, nd.y - 150, { text: 'MISS' });
    game.fx.burst(nd.x, nd.y, { color: C.gold, count: 14, speed: 420 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8; R.down = false;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 3; i++) game.fx.burst(NODES[i].x, NODES[i].y, { color: TYPE_COL[i], count: 22, speed: 480 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.oops = Math.max(0, R.oops - dt);
    for (var f = 0; f < 4; f++) R.slotFlash[f] = Math.max(0, R.slotFlash[f] - dt * 1.6);
    for (var g2 = 0; g2 < 3; g2++) R.nodeFlash[g2] = Math.max(0, R.nodeFlash[g2] - dt);
    var ph = phraseOf(Math.max(0, R.beatIdx));
    var wantShut = inResponse() && R.pats[ph] && R.pats[ph].hidden ? 1 : 0;
    R.shutter += (wantShut - R.shutter) * Math.min(1, dt * 14);
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('A4', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    var bi = Math.floor(R.songT / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    var si = Math.floor(R.songT / (SPB / 2));
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st === 'wait' && R.songT > n.beat * SPB + WIN_G) { missNote(n); return; }
    }
    if (!R.demo && R.songT >= SONG_BEATS * SPB) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(1回目は全部結ぶ、2回目の3つ目で違う巻き上げ機に入ってMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.x = 900; demo.y = 1700; }
    var nx = null, idx = -1;
    for (var i = 0; i < R.notes.length; i++) if (R.notes[i].st === 'wait') { nx = R.notes[i]; idx = i; break; }
    var tx = 920, ty = 1720, down = false, enterNow = false;
    if (nx && R.stop <= 0) {
      var until = nx.beat * SPB - R.songT;
      var target = idx === 5 ? (nx.type + 1) % 3 : nx.type;
      var resp = R.beatIdx >= 0 && phraseOf(R.beatIdx) === nx.phrase && R.beatIdx % 8 >= 3;
      if (resp && until < SPB * 0.9) {
        var from = R.lastNode >= 0 && phraseOf(R.beatIdx) === R.lastPhrase ? NODES[R.lastNode] : { x: NODES[target].x + 160, y: NODES[target].y + 160 };
        var k = Math.max(0, Math.min(1, 1 - (until - 0.02) / (SPB * 0.6)));
        tx = from.x + (NODES[target].x - from.x) * k;
        ty = from.y + (NODES[target].y - from.y) * k;
        down = (R.lastNode >= 0 && R.lastPhrase === nx.phrase) || until < 0.05;
        enterNow = until <= 0.01;
        demo.x = tx; demo.y = ty;
      }
    }
    if (!down) {
      demo.x += (tx - demo.x) * Math.min(1, dt * 6);
      demo.y += (ty - demo.y) * Math.min(1, dt * 6);
      R.inNode = -1;
    } else if (enterNow) {
      pointerAt(demo.x, demo.y);
    } else {
      R.px = demo.x; R.py = demo.y;
    }
    demo.down = down;
    R.down = down;
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    game.draw.gradient(0, H, [[0, C.bg0], [0.45, C.bg1], [1, C.bg0]]);
    pipe(10, 230, H, 56);
    pipe(1014, 230, H, 56);
    plate(80, 700, 920, 200, '#232930');
    // 籠の縦坑(窓)
    game.draw.rect(430, 720, 220, 160, C.glass);
    for (var c = 0; c < 3; c++) game.draw.line(470 + c * 70, 720, 470 + c * 70, 880, '#3a4048', 4);
    plate(80, 1280, 300, 120, '#262c33');
    plate(700, 1280, 300, 120, '#262c33');
    for (var i = 0; i < GRAIN.length; i++) {
      var g = GRAIN[i];
      game.draw.rect(g[0], g[1], g[2], g[2], g[3], g[4]);
    }
  }

  function drawCage() {
    var p = Math.min(1, R.songT / (SONG_BEATS * SPB));
    var cy = 860 - p * 130 + Math.sin(game.time.elapsed * 3) * 2;
    game.draw.line(540, 720, 540, cy - 30, C.steel, 6);
    game.draw.rect(490, cy - 30, 100, 44, C.steelDk);
    game.draw.rect(490, cy - 30, 100, 6, C.hi, 0.5);
    game.draw.rect(500, cy - 18, 80, 22, C.gold, 0.25 + R.pulse * 0.3);
  }

  function drawBoard() {
    plate(50, 250, 980, 400, '#2e353d');
    var e = game.time.elapsed;
    var bi = R.beatIdx < 0 || R.ready > 0 ? -1 : R.beatIdx;
    var ph = bi < 0 ? 0 : Math.min(R.pats.length - 1, phraseOf(bi));
    var inPh = bi < 0 ? -1 : bi % 8;
    var resp = inPh >= 4;
    var pat = R.pats[ph] ? R.pats[ph].pat : [null, null, null, null];
    for (var s = 0; s < 4; s++) {
      var x = SLOT_X[s], y = SLOT_Y;
      game.draw.rect(x - SLOT_W / 2 - 6, y - SLOT_H / 2 - 6, SLOT_W + 12, SLOT_H + 12, C.ink);
      game.draw.rect(x - SLOT_W / 2, y - SLOT_H / 2, SLOT_W, SLOT_H, C.glass);
      var shown = bi >= 0 && pat[s] !== null && (resp || s <= inPh);
      if (shown) {
        var col = TYPE_COL[pat[s]];
        var a = resp ? 0.45 : 0.35 + R.slotFlash[s] * 0.6;
        game.draw.circle(x, y, 62 + R.slotFlash[s] * 16, col, a * 0.5);
        game.draw.sprite(SPR[pat[s]], { '#': col }, x, y, 14, { anchor: 'center', alpha: resp ? 0.6 : 1 });
      }
      // 拍のカーソル
      var cur = s === (inPh % 4) && inPh >= 0;
      if (cur) {
        var cc = resp ? C.good : C.gold;
        game.draw.rect(x - SLOT_W / 2 - 6, y + SLOT_H / 2 + 14, SLOT_W + 12, 12, cc, 0.6 + R.pulse * 0.4);
      } else {
        game.draw.rect(x - SLOT_W / 2 - 6, y + SLOT_H / 2 + 14, SLOT_W + 12, 12, C.steelDk, 0.6);
      }
      game.draw.rect(x - SLOT_W / 2, y - SLOT_H / 2, SLOT_W, 10, C.hi, 0.15);
    }
    // シャッター(後半の返し)
    if (R.shutter > 0.01) {
      var sh = (SLOT_H + 12) * R.shutter;
      var x0 = SLOT_X[0] - SLOT_W / 2 - 6, w = SLOT_X[3] - SLOT_X[0] + SLOT_W + 12;
      game.draw.rect(x0, SLOT_Y - SLOT_H / 2 - 6, w, sh, '#4a525c');
      for (var k = 0; k < sh; k += 24) game.draw.rect(x0, SLOT_Y - SLOT_H / 2 - 6 + k, w, 4, '#2a3038');
      game.draw.rect(x0, SLOT_Y - SLOT_H / 2 - 6 + sh - 8, w, 8, C.hi, 0.4);
    }
    // 次がシャッターの回なら警告の縞を点滅
    if (inPh >= 0 && inPh < 4 && R.pats[ph] && R.pats[ph].hidden && Math.floor(e * 6) % 2 === 0) {
      for (var z = 0; z < 8; z++) game.draw.rect(330 + z * 70, 268, 36, 14, C.gold, 0.8);
    }
    // 巻き上げ番
    var turnCol = resp ? C.good : (inPh >= 0 ? C.gold : C.steelDk);
    game.draw.circle(OP_X, OP_Y + 140, 22, turnCol, 0.9);
    game.draw.circle(OP_X, OP_Y + 140, 34, turnCol, 0.2 + R.pulse * 0.3);
    var frame = R.oops > 0 ? OP_OOPS : (inPh >= 0 && !resp ? OP_LISTEN : (Math.floor(e * 1.3) % 5 === 0 ? OP_BLINK : OP_A));
    var bob = Math.sin(e * 3) * 3 - R.pulse * 4;
    game.draw.sprite(frame, OP_PAL, OP_X, OP_Y - 20 + bob, 10, { anchor: 'center' });
  }

  function drawNodes() {
    var e = game.time.elapsed;
    var bi = R.beatIdx < 0 || R.ready > 0 ? -1 : R.beatIdx;
    var inPh = bi < 0 ? -1 : bi % 8;
    var live = inPh >= 4 || inPh === 3;
    // 配線
    for (var c = 0; c < R.cables.length; c++) {
      var cb = R.cables[c], a = NODES[cb.a], b = NODES[cb.b];
      game.draw.line(a.x, a.y, b.x, b.y, C.ink, 22);
      game.draw.line(a.x, a.y, b.x, b.y, cb.ok ? C.copper : C.bad, 12);
      game.draw.line(a.x, a.y - 3, b.x, b.y - 3, C.hi, 3);
    }
    if (R.down && R.lastNode >= 0 && !R.over) {
      var ln = NODES[R.lastNode];
      game.draw.line(ln.x, ln.y, R.px, R.py, C.copper, 10);
    }
    for (var i = 0; i < 3; i++) {
      var n = NODES[i];
      var stopHere = R.stopNote && R.stopNote.k === i;
      var sc = stopHere ? 1.25 : 1 + R.nodeFlash[i] * 0.2;
      var r = NODE_R * sc;
      var white = stopHere && Math.floor(e * 20) % 2 === 0;
      game.draw.circle(n.x + 10, n.y + 14, r + 8, C.ink, 0.6);
      var rimCol = white ? '#ffffff' : (live ? (Math.floor(e * 8) % 2 === 0 || inPh >= 4 ? C.good : C.steelDk) : C.steelDk);
      game.draw.circle(n.x, n.y, r + 8, rimCol);
      game.draw.circle(n.x, n.y, r, white ? '#ffffff' : C.steel);
      game.draw.circle(n.x - r * 0.18, n.y - r * 0.18, r * 0.78, white ? '#ffffff' : '#a4aeb8');
      // 巻いたワイヤ
      for (var w = 0; w < 5; w++) game.draw.line(n.x - r * 0.7, n.y - r * 0.4 + w * r * 0.2, n.x + r * 0.7, n.y - r * 0.4 + w * r * 0.2, '#6a727c', 4);
      game.draw.circle(n.x, n.y, r * 0.5, C.glass);
      game.draw.circle(n.x, n.y, r * 0.5, TYPE_COL[i], 0.15 + R.nodeFlash[i] * 0.8);
      game.draw.sprite(SPR[i], { '#': TYPE_COL[i] }, n.x, n.y, 10, { anchor: 'center' });
      game.draw.circle(n.x - r * 0.55, n.y - r * 0.55, 10, C.hi, 0.7);
      if (R.nodeFlash[i] > 0 && R.nodeGrade[i] === 0 && !stopHere) game.draw.circle(n.x, n.y, r * 0.5, C.steelDk, 0.5);
    }
  }

  function drawWorld() {
    drawBg();
    drawCage();
    drawBoard();
    drawNodes();
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 46, C.hi, 'left');
    txt('BEST ' + game.best, W - 40, 70, 34, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.circle(W - 70 - i * 64, 150, 22, C.ink);
      game.draw.circle(W - 70 - i * 64, 150, 17, on ? C.gold : C.steelDk);
    }
    if (R.combo >= 2) txt(R.combo + ' COMBO', 40, 150, 40, C.gold, 'left');
    var progress = Math.min(1, R.songT / (SONG_BEATS * SPB));
    game.draw.rect(40, 200, W - 80, 14, C.ink);
    game.draw.rect(40, 200, (W - 80) * progress, 14, C.brass);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 800, 100, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.21, W, H * 0.34, C.ink, 0.82);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 92, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.34, 60, C.hi);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.39, 34, C.steel);
    txt('MAX COMBO ' + R.maxCombo + '   NICE ' + R.cleanRounds + ' / ' + R.pats.length, W / 2, H * 0.43, 34, C.steel);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.48, 50, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.48, 40, C.gold);
    if (!R.ok) {
      var left = Math.max(1, Math.ceil((SONG_BEATS * SPB - R.songT) / (4 * SPB)));
      txt('あと' + left + '小節', W / 2, H * 0.52, 44, C.gold);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.text(GAME_TITLE, W / 2 + 6, 120 + 6 + bob, { size: 96, color: C.ink, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 120 + bob, { size: 96, color: C.brass, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 2, 116 + bob, { size: 96, color: '#f0d8a0', bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 205, 38, C.hi);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 48, C.gold);
    else txt('INSERT COIN', W / 2, H * 0.955, 40, C.hi);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R) return;
    R.down = true; R.inNode = -1;
    var r = pointerAt(x, y);
    if (r.res === 'stray') game.audio.tone(200, 0.05, { wave: 'square', volume: 0.05 });
    else if (r.node < 0) game.audio.play('se_tap', 0.2);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.down) return;
    var r = pointerAt(x, y);
    if (r.res === 'stray') {
      game.audio.tone(200, 0.05, { wave: 'square', volume: 0.05 });
      game.fx.burst(NODES[r.node].x, NODES[r.node].y, { color: C.steel, count: 4, speed: 120 });
    }
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || !R) return;
    if (R.down && R.lastNode >= 0) game.audio.tone(160, 0.04, { wave: 'triangle', volume: 0.04 });
    R.down = false; R.inNode = -1;
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.x, demo.y, { press: demo.down, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.hi);
      return;
    }
    stepRun(dt);
    drawWorld();
    drawHud();
    if (R.over) {
      drawResult();
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, cleanRounds: R.cleanRounds };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
