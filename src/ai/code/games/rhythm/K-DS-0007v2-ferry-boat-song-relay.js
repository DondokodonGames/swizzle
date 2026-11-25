// K-DS-0007v2-ferry-boat-song-relay.js
// 渡し舟の舟歌つなぎ — 船頭や乗り合い客が1小節歌った節を、自分の番の次の1小節で同じ拍・同じ高さで歌い返す。仲間の番の小節は黙って聴く
// 操作: 画面の左半分を押すと低い声、右半分を押すと高い声で一声歌う(押した瞬間で判定)。1回は2小節: 1小節目は誰かが節を歌い(下の帯に音の位置と高さが残る)、2小節目はその節を返す番。返すのが自分のとき(自分の頭上の提灯が光り、下の左右の台が明るい)は帯と同じ8分の位置・同じ高さで押す。拍のずれでPERFECT/GOOD、高さ違い・拍外れ・歌い漏らしはMISS。返すのが仲間のとき(その人の提灯が光り、台が灰色)に声を出すと割り込みでMISS
// 終わり: 5節(11小節・約20秒・自分の番4回)を歌いつないでMISS3回以内ならCLEAR(判定の点+節を全部合わせたNICEボーナス)。MISS4回でGAME OVER
// @mechanic: turn_attack
// @theme: ferry_boat_song_relay
// 世界観: 川の渡し舟の上で、竿をさす船頭と乗り合いのおばあさん・子ども・旅の若者が、一節ずつ交互に舟歌をつないで向こう岸まで渡っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・合わせた節の数
// スタイル: 80s ISO
var STYLE = { bg: ['#1a3a78', '#2858a8'], main: ['#b07a40', '#4a9a40', '#f0e8d0'], accent: ['#ffd040', '#40d0c0'] };

(function (game) {
  // 80s ISO: 菱形グリッドの川と岸、舟は上面+2側面の3明度。高さは影との距離で示し、奥でも縮めない
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    water: STYLE.bg[1], waterD: STYLE.bg[0], waterL: '#4a88d0', wood: STYLE.main[0], grass: STYLE.main[1], cream: STYLE.main[2],
    yellow: STYLE.accent[0], teal: STYLE.accent[1], woodD: '#7a4a24', woodK: '#4a2a14', grassD: '#2e6a2a', grassK: '#1e4a1c',
    ink: '#101828', red: '#e04040', gray: '#6a7080', grayD: '#40465a', white: '#ffffff', shadow: '#0a1a40'
  };

  var GAME_TITLE = 'FERRY SONG';
  var BPM = 132;
  var SPB = 60 / BPM;
  var SONG_BEATS = 44;          // 11小節(カウント1 + 5節x2)
  var TIME_LIMIT = 21;
  var PERFECT_W = 0.06;
  var GOOD_W = 0.13;
  var RUSH_W = 0.24;
  var MISS_MAX = 4;
  var HIT_STOP = 0.4;
  var YOU = 3;
  var PITCH = { L: 'D4', H: 'A4' };

  // 節: 歌い手(0 船頭 / 1 おばあさん / 2 子ども / 3 自分)、返す人、8分の位置と高さ
  var PH = [
    { caller: 0, resp: YOU, notes: [[0, 'L'], [2, 'L'], [4, 'H']] },
    { caller: 0, resp: 1, notes: [[0, 'H'], [2, 'H'], [3, 'L'], [4, 'L']] },
    { caller: 1, resp: YOU, notes: [[0, 'H'], [2, 'L'], [3, 'L'], [4, 'H']] },
    { caller: 2, resp: YOU, notes: [[0, 'L'], [1, 'L'], [2, 'H'], [4, 'L'], [6, 'H']] },
    { caller: 0, resp: YOU, notes: [[0, 'H'], [2, 'L'], [3, 'H'], [4, 'L'], [5, 'L'], [6, 'H']] }
  ];
  var NOTES = [], SUNG = [];
  for (var pp = 0; pp < PH.length; pp++) {
    var cb = (1 + pp * 2) * 4, rb = (2 + pp * 2) * 4;
    for (var nn = 0; nn < PH[pp].notes.length; nn++) {
      var nt = PH[pp].notes[nn];
      SUNG.push({ T: (cb + nt[0] * 0.5) * SPB, who: PH[pp].caller, pitch: nt[1], p: pp, i: nn, call: true });
      if (PH[pp].resp === YOU) NOTES.push({ T: (rb + nt[0] * 0.5) * SPB, pitch: nt[1], p: pp, i: nn });
      else SUNG.push({ T: (rb + nt[0] * 0.5) * SPB, who: PH[pp].resp, pitch: nt[1], p: pp, i: nn, call: false });
    }
  }
  SUNG.sort(function (a, b) { return a.T - b.T; });

  // 伴奏(オリジナル): 竿の拍とゆったりしたベース。節そのものは歌い手の声で鳴る
  var BASS = [['D2', 'A2'], ['F2', 'C3'], ['G2', 'D3'], ['A2', 'E3']];
  var PAD_MEL = [[['F4', 4]], [['A4', 4]], [['G4', 4]], [['E4', 4]]];

  // ---- ドット絵 ----
  var FIG = [
    '....hhhh....',
    '..hhhhhhhh..',
    '...ssssss...',
    '...sEssEs...',
    '...ssMMss...',
    '....ssss....',
    '..cccccccc..',
    '.cccccccccc.',
    '.cAccccccAc.',
    '.sAccccccAs.',
    '..cccccccc..',
    '..cccccccc..',
    '...dd..dd...',
    '...dd..dd...',
    '...ff..ff...',
    '..fff..fff..'
  ];
  var HEAD = ['....hhhh....', '..hhhhhhhh..', '...ssssss...', '...sEssEs...', '...ssMMss...', '....ssss....'];
  var NOTE = ['..##', '..#.', '..#.', '###.', '###.'];
  var LANTERN = ['.kk.', 'rrrr', 'rYYr', 'rYYr', 'rrrr', '.kk.'];
  var LOOK = [
    { h: '#e8c060', s: '#e8b080', c: '#3a5aa0', A: '#26407a', d: '#3a3040', f: '#201820' },   // 船頭(笠と藍の半纏)
    { h: '#e8e8f0', s: '#f0c8a0', c: '#8a4a9a', A: '#62346e', d: '#4a3a50', f: '#201820' },   // おばあさん
    { h: '#d03030', s: '#f0c090', c: '#f0c040', A: '#c09020', d: '#3a5aa0', f: '#201820' },   // 子ども
    { h: '#8a5a2a', s: '#f0c090', c: '#3a8a4a', A: '#286036', d: '#4a3a30', f: '#201820' }    // 旅の若者(自分)
  ];
  function figPal(w, mode) {
    var L = LOOK[w];
    return { h: L.h, s: L.s, c: L.c, A: L.A, d: L.d, f: L.f, E: mode === 2 ? C.red : C.ink, M: mode === 1 ? '#501818' : '#c08868' };
  }
  var PALS = [];
  for (var pw = 0; pw < 4; pw++) PALS.push([figPal(pw, 0), figPal(pw, 1), figPal(pw, 2)]);
  var WHITE_PAL = { h: C.white, s: C.white, c: C.white, A: C.white, d: C.white, f: C.white, E: C.white, M: C.white };
  var LPAL_ON = { k: C.ink, r: C.red, Y: C.yellow };
  var LPAL_OFF = { k: C.ink, r: '#6a3030', Y: '#806040' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextBar, readyT, hitStop, lampT, flashT, glareT, strayCool;
  var sungIdx, nres, callMark, respMark, floats, singT, padT, padPitch, perfectPhr;
  var score, combo, maxCombo, perfects, goods, misses, hits, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; lampT = 0; flashT = 0; glareT = 0; strayCool = 0;
    sungIdx = 0; nres = []; callMark = []; respMark = []; floats = []; singT = [0, 0, 0, 0]; padT = 0; padPitch = 'L'; perfectPhr = 0;
    for (var p = 0; p < PH.length; p++) { callMark.push([]); respMark.push([]); }
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hits = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ) ----
  function playBar(b) {
    if (!armed || b > 10) return;
    var bs = BASS[b % 4];
    game.audio.melody(PAD_MEL[b % 4], { tempo: BPM, wave: 'triangle', volume: 0.025 * vol(), bass: [[bs[0], 1], [bs[1], 1], [bs[0], 1], [bs[1], 1]], bassWave: 'triangle', bassVolume: 0.08 * vol() });
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }

  function onBeat(k) {
    if (k >= SONG_BEATS) { if (!demoMode) finish(misses < MISS_MAX); return; }
    lampT = 1;
    if (k < 4) { tone(k === 0 ? 1175 : 880, 0.05, { wave: 'square', volume: 0.05 * vol() }); return; }
    // 竿が川底を突く音(1拍目と3拍目)
    if (k % 2 === 0) tone(k % 4 === 0 ? 147 : 131, 0.07, { wave: 'square', volume: 0.035 * vol() });
  }

  function barAt(T) { return Math.floor(T / (4 * SPB)); }
  function phraseOfBar(b) { return b < 1 ? -1 : Math.floor((b - 1) / 2); }
  function isCallBar(b) { return b >= 1 && (b - 1) % 2 === 0; }

  var SEAT = [[-240, 0], [-110, -60], [100, 60], [220, -10]];
  function iso(ix, iy, iz) { return { x: 540 + (ix - iy), y: 720 + (ix + iy) * 0.5 - iz }; }
  function bob(t) { return Math.sin(t * 1.6) * 6; }
  function seatPt(w, t) { var p = iso(SEAT[w][0], SEAT[w][1], 36); p.y += bob(t); return p; }

  function voice(w, pitch, soft) {
    singT[w] = 0.3;
    var waves = ['square', 'triangle', 'square', 'triangle'];
    var oct = w === 0 ? -12 : 0;
    var f = 440 * Math.pow(2, ((pitch === 'H' ? 69 : 62) + oct - 69) / 12);
    tone(f, 0.26, { wave: waves[w], volume: (soft ? 0.03 : 0.06) * vol(), slide: w === 0 ? -6 : 8 });
    var sp = seatPt(w, game.time.elapsed);
    floats.push({ x: sp.x + 30, y: sp.y, z: 150, vz: pitch === 'H' ? 260 : 150, col: pitch === 'H' ? C.yellow : C.teal, t: 0 });
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); if (!running) return; }
    songT = beatN * SPB + beatT;
    if (nextBar <= 10 && songT >= nextBar * 4 * SPB - 0.06) { playBar(nextBar); nextBar++; }
    // 仲間の歌(手本の節・仲間の返し)
    while (sungIdx < SUNG.length && songT >= SUNG[sungIdx].T) {
      var s = SUNG[sungIdx++];
      voice(s.who, s.pitch, false);
      if (s.call) callMark[s.p][s.i] = 1; else respMark[s.p][s.i] = 'ai';
    }
    // 歌い漏らし
    for (var i = 0; i < NOTES.length; i++) {
      if (!nres[i] && songT > NOTES[i].T + GOOD_W) { missNote(i); if (over) return; }
    }
  }

  // ---- 判定(押した瞬間 vs 自分の番の8分) ----
  function sing(pitch) {
    if (!running || over) return;
    voice(YOU, pitch, false);
    padT = 0.15; padPitch = pitch;
    var best = -1, bd = 99;
    for (var i = 0; i < NOTES.length; i++) {
      if (nres[i]) continue;
      var d = songT - NOTES[i].T;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = i; }
    }
    if (best >= 0 && Math.abs(bd) <= GOOD_W) {
      if (NOTES[best].pitch === pitch) hitNote(best, bd);
      else missNote(best);
      return;
    }
    if (best >= 0 && Math.abs(bd) <= RUSH_W) { missNote(best); return; }
    if (songT < 4 * SPB - 0.2 || strayCool > 0) return;
    // 割り込み・余計な一声: 皆ににらまれる
    strayCool = 0.3; glareT = 0.7;
    missCommon();
  }

  function phraseDone(p) {
    for (var i = 0; i < NOTES.length; i++) if (NOTES[i].p === p && nres[i] !== 'perfect' && nres[i] !== 'good') return false;
    return true;
  }

  function hitNote(i, off) {
    var perfect = Math.abs(off) <= PERFECT_W, n = NOTES[i];
    nres[i] = perfect ? 'perfect' : 'good';
    respMark[n.p][n.i] = nres[i];
    hits++; combo++;
    if (combo > maxCombo) maxCombo = combo;
    score += perfect ? 100 + Math.min(combo, 8) * 10 : 50;
    var sp = seatPt(YOU, game.time.elapsed);
    var vv = armed ? (perfect ? 0.2 : 0.15) : 0.001;
    if (perfect) { perfects++; game.feedback.good(sp.x, sp.y - 230, { text: 'PERFECT', color: C.yellow, size: 50, count: 10, volume: vv }); }
    else { goods++; game.feedback.good(sp.x, sp.y - 230, { text: 'GOOD', color: C.cream, size: 44, count: 6, volume: vv }); }
    var last = true;
    for (var j = 0; j < NOTES.length; j++) if (NOTES[j].p === n.p && !nres[j]) last = false;
    if (last && phraseDone(n.p)) {
      perfectPhr++;
      score += 150;
      game.fx.popup('NICE', 540, 470, { color: C.teal, size: 72 });
      tone('D5', 0.12, { wave: 'triangle', volume: 0.05 * vol() });
      tone('A5', 0.2, { wave: 'triangle', volume: 0.04 * vol() });
    }
    if (!demoMode && hits === 9 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(hits + ' / ' + NOTES.length, W / 2, 400, { color: C.yellow, size: 76 });
    }
  }

  function missNote(i) {
    var n = NOTES[i];
    nres[i] = 'miss';
    respMark[n.p][n.i] = 'miss';
    missCommon();
  }

  function missCommon() {
    misses++; combo = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP;
    var sp = seatPt(YOU, game.time.elapsed);
    game.feedback.bad(sp.x, sp.y - 230, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(160, 920), game.random(420, 900), { color: i % 2 ? C.yellow : C.teal, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 400, { color: C.yellow, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function (x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    if (readyT > 0) { game.audio.play('se_tap', 0.2); return; }
    var pitch = x < W / 2 ? 'L' : 'H';
    game.fx.burst(x, y, { color: pitch === 'H' ? C.yellow : C.teal, count: 4, speed: 120 });
    sing(pitch);
  });
  game.onTap(function () {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; demo.i = 0; return; }
  });

  // ---- 描画ヘルパー ----
  function fillPoly(pts, col, al) {
    var minY = 1e9, maxY = -1e9, n = pts.length / 2, i;
    for (i = 0; i < n; i++) { if (pts[i * 2 + 1] < minY) minY = pts[i * 2 + 1]; if (pts[i * 2 + 1] > maxY) maxY = pts[i * 2 + 1]; }
    for (var y = Math.floor(minY); y < maxY; y += 3) {
      var yy = y + 1.5, l = 1e9, r = -1e9;
      for (i = 0; i < n; i++) {
        var j = (i + 1) % n, ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[j * 2], by = pts[j * 2 + 1];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) {
          var x = ax + (yy - ay) * (bx - ax) / (by - ay);
          if (x < l) l = x;
          if (x > r) r = x;
        }
      }
      if (r > l) game.draw.rect(l, y, r - l, 3, col, al);
    }
  }
  function diamond(cx, cy, hw, hh, col, al) { fillPoly([cx, cy - hh, cx + hw, cy, cx, cy + hh, cx - hw, cy], col, al); }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawRiver(t) {
    game.draw.gradient(0, H, [[0, C.waterD], [0.4, C.water], [0.75, C.waterD], [1, '#0e1e40']]);
    // 菱形グリッドの水面(流れに合わせてずれる)
    var off = (t * 30) % 80;
    for (var k = -16; k < 30; k++) {
      var c = k * 80 + off;
      game.draw.line(c, 236, c + 1180 * 2, 236 + 1180, '#3a70c0', 1);
      game.draw.line(c, 236, c - 1180 * 2, 236 + 1180, '#3a70c0', 1);
    }
    for (var w = 0; w < 16; w++) {
      var wx = (w * 173 + t * 60) % W, wy = 300 + (w * 97) % 1100;
      game.draw.line(wx, wy, wx + 30, wy + 15, C.waterL, 3);
    }
    // 向こう岸(左上)と手前の岸(右下)
    fillPoly([0, 236, 520, 236, 0, 496], C.grass);
    fillPoly([0, 496, 520, 236, 560, 256, 0, 536], C.grassD);
    fillPoly([1080, 1150, 1080, 1420, 540, 1420], C.grass);
    fillPoly([1080, 1110, 1080, 1150, 540, 1420, 480, 1420], C.grassD);
    // 岸の小屋と木(等角の箱)
    isoBox(70, 330, 50, 40, C.cream, '#c8b898', '#a09070', '#a04030');
    isoTree(240, 290, t);
    isoTree(360, 260, t + 1);
    isoTree(930, 1300, t + 2);
    // 葦
    for (var r = 0; r < 8; r++) {
      var rx = 720 + r * 42, ry = 1400 - r * 21;
      game.draw.line(rx, ry, rx + Math.sin(t * 2 + r) * 6, ry - 50, C.grassK, 4);
    }
  }

  function isoBox(x, y, hw, h, top, left, right, roof) {
    fillPoly([x - hw, y, x, y + hw * 0.5, x, y + hw * 0.5 + h, x - hw, y + h], left);
    fillPoly([x, y + hw * 0.5, x + hw, y, x + hw, y + h, x, y + hw * 0.5 + h], right);
    fillPoly([x - hw, y, x, y - hw * 0.5, x + hw, y, x, y + hw * 0.5], roof || top);
  }
  function isoTree(x, y, t) {
    diamond(x + 26, y + 46, 30, 15, C.grassK, 0.5);
    game.draw.rect(x - 5, y + 10, 10, 36, C.woodK);
    isoBox(x, y - 40, 34, 34, C.grass, C.grassD, C.grassK, '#6aba50');
  }

  function drawBoat(t) {
    var b = bob(t);
    function Q(ix, iy, iz, out) { var p = iso(ix, iy, iz); out.push(p.x, p.y + b); return out; }
    // 水面の影(高さ0)
    var sh = [];
    Q(-300, -110, -8, sh); Q(300, -110, -8, sh); Q(360, 0, -8, sh); Q(300, 110, -8, sh); Q(-300, 110, -8, sh);
    fillPoly(sh, C.shadow, 0.35);
    // 舷側(左面・右面)
    var lf = []; Q(-300, 110, 36, lf); Q(300, 110, 36, lf); Q(300, 110, 0, lf); Q(-300, 110, 0, lf);
    fillPoly(lf, C.woodD);
    var rf = []; Q(300, 110, 36, rf); Q(360, 0, 36, rf); Q(360, 0, 0, rf); Q(300, 110, 0, rf);
    fillPoly(rf, C.woodK);
    // 甲板(上面)
    var top = []; Q(-300, -110, 36, top); Q(300, -110, 36, top); Q(360, 0, 36, top); Q(300, 110, 36, top); Q(-300, 110, 36, top);
    fillPoly(top, C.wood);
    for (var pl = -80; pl <= 80; pl += 40) {
      var a = iso(-300, pl, 36), c = iso(300, pl, 36);
      game.draw.line(a.x, a.y + b, c.x, c.y + b, C.woodD, 2);
    }
    for (var e = 0; e < 5; e++) {
      var i0 = e * 2, i1 = ((e + 1) % 5) * 2;
      game.draw.line(top[i0], top[i0 + 1], top[i1], top[i1 + 1], C.woodK, 3);
    }
    // 舳先の提灯(残りの声 = MISSの余裕)
    for (var m = 0; m < MISS_MAX; m++) {
      var lp = iso(250 + m * 24, -90 + m * 20, 36);
      game.draw.line(lp.x, lp.y + b, lp.x, lp.y + b - 60, C.woodK, 3);
      game.draw.sprite(LANTERN, m < MISS_MAX - misses ? LPAL_ON : LPAL_OFF, lp.x, lp.y + b - 74, 5, { anchor: 'center' });
    }
  }

  function turnInfo() {
    if (!running) return { bar: -1, singer: -1, next: -1 };
    var bar = barAt(songT), p = phraseOfBar(bar);
    if (p < 0 || p >= PH.length) return { bar: bar, singer: -1, next: p < 0 ? PH[0].caller : -1, p: p };
    if (isCallBar(bar)) return { bar: bar, singer: PH[p].caller, next: PH[p].resp, p: p, call: true };
    return { bar: bar, singer: PH[p].resp, next: p + 1 < PH.length ? PH[p + 1].caller : -1, p: p, call: false };
  }

  function drawFigure(w, t, ti) {
    var sp = seatPt(w, t);
    var me = w === YOU;
    var isTurn = ti.singer === w, isNext = ti.call && ti.next === w;
    // 足もとの菱形(番の人が光る)
    diamond(sp.x, sp.y, 70, 35, isTurn ? C.yellow : C.woodD, isTurn ? 0.55 : 0.4);
    if (isNext && Math.floor(t * 6) % 2 === 0) diamond(sp.x, sp.y, 80, 40, C.teal, 0.35);
    var mode = singT[w] > 0 ? 1 : (glareT > 0 && !me ? 2 : 0);
    var pal = me && hitStop > 0 ? WHITE_PAL : PALS[w][mode];
    var sc = me && hitStop > 0 ? 9.5 : 8;
    var sway = Math.sin(t * 2 + w) * 2;
    if (me && hitStop > 0) game.draw.circle(sp.x, sp.y - 70, 110, C.white, 0.4 * hitStop / HIT_STOP);
    game.draw.sprite(FIG, pal, sp.x + sway, sp.y - 64 * sc / 8, sc, { anchor: 'center', flipX: w === YOU });
    // 頭上の提灯: 次に返す人(と、いま歌う人)
    if (isTurn || isNext) {
      var ly = sp.y - 170 + Math.sin(t * 5) * 4;
      game.draw.line(sp.x + 40, sp.y - 90, sp.x + 40, ly + 10, C.woodK, 3);
      game.draw.sprite(LANTERN, LPAL_ON, sp.x + 40, ly, 6, { anchor: 'center' });
    }
    if (w === 0) {
      // 船頭の竿
      var pt = Math.sin(t * 1.2) * 20;
      game.draw.line(sp.x - 30, sp.y - 110, sp.x - 110 + pt, sp.y + 150, C.woodK, 6);
    }
  }

  function drawFloats() {
    for (var i = 0; i < floats.length; i++) {
      var f = floats[i];
      if (f.t > 1.1) continue;
      var a = Math.max(0, 1 - f.t / 1.1);
      diamond(f.x, f.y, 14, 7, C.shadow, 0.4 * a);             // 影は甲板に残る(高さ = 影との距離)
      game.draw.sprite(NOTE, { '#': f.col }, f.x, f.y - f.z, 9, { anchor: 'center', alpha: a });
    }
  }

  // 下の帯: 手本の節(上段 = 高い声 / 下段 = 低い声)と、返した結果
  var SX = 250, SDX = 92, SY_H = 1236, SY_L = 1316;
  function drawStrip(t, ti) {
    game.draw.rect(40, 1160, W - 80, 230, C.ink, 0.8);
    game.draw.line(40, 1160, W - 40, 1160, C.teal, 3);
    game.draw.line(40, 1390, W - 40, 1390, C.teal, 3);
    for (var k = 0; k < 8; k++) {
      var x = SX + k * SDX;
      diamond(x, 1370, k % 2 === 0 ? 12 : 6, k % 2 === 0 ? 6 : 3, C.cream, 0.6);
      game.draw.circle(x, SY_H, 6, C.gray, 0.6);
      game.draw.circle(x, SY_L, 6, C.gray, 0.6);
    }
    if (!running || ti.p < 0 || ti.p >= PH.length) return;
    var ph = PH[ti.p];
    // 左端: いま歌う人の顔(手本の小節)→ 返す人の顔
    game.draw.sprite(HEAD, PALS[ph.caller][0], 110, SY_H - 4, 7, { anchor: 'center' });
    game.draw.sprite(HEAD, PALS[ph.resp][0], 110, SY_L + 10, 7, { anchor: 'center', alpha: ti.call ? (Math.floor(t * 6) % 2 ? 1 : 0.4) : 1 });
    if (ph.resp !== YOU && Math.floor(t * 4) % 2 === 0) game.draw.circle(110, SY_L + 10, 52, C.red, 0.25);
    for (var i = 0; i < ph.notes.length; i++) {
      var n = ph.notes[i], nx = SX + n[0] * SDX, ny = n[1] === 'H' ? SY_H : SY_L, col = n[1] === 'H' ? C.yellow : C.teal;
      if (callMark[ti.p][i]) game.draw.sprite(NOTE, { '#': col }, nx, ny - 6, 9, { anchor: 'center' });
      var r = respMark[ti.p][i];
      if (r === 'perfect' || r === 'good') { game.draw.circle(nx, ny, 34, r === 'perfect' ? C.yellow : C.cream, 0.45); }
      else if (r === 'miss') { game.draw.line(nx - 24, ny - 24, nx + 24, ny + 24, C.red, 6); game.draw.line(nx + 24, ny - 24, nx - 24, ny + 24, C.red, 6); }
      else if (r === 'ai') game.draw.circle(nx, ny, 30, LOOK[ph.resp].c, 0.5);
    }
    // 小節の進み(再生位置)
    var u = (songT - ti.bar * 4 * SPB) / (4 * SPB);
    var px = SX - SDX * 0.5 + u * SDX * 8;
    game.draw.line(px, 1180, px, 1350, ti.call ? C.cream : (ph.resp === YOU ? C.yellow : C.gray), 4);
  }

  function drawPads(t, ti) {
    var mine = running && ((!ti.call && ti.singer === YOU) || (ti.call && ti.next === YOU));
    for (var s = 0; s < 2; s++) {
      var pitch = s === 0 ? 'L' : 'H';
      var cx = s === 0 ? 290 : 790, cy = 1660, hw = 210, hh = 105;
      var pressed = padT > 0 && padPitch === pitch;
      var z = pressed ? 8 : 30 + (mine ? Math.sin(t * 6 + s) * 4 : 0);
      var col = mine ? (pitch === 'H' ? C.yellow : C.teal) : C.gray;
      var colD = mine ? (pitch === 'H' ? '#b08a20' : '#208a80') : C.grayD;
      diamond(cx + 10, cy + 16, hw, hh, C.shadow, 0.5);
      fillPoly([cx - hw, cy - z, cx, cy + hh - z, cx, cy + hh, cx - hw, cy], colD);
      fillPoly([cx, cy + hh - z, cx + hw, cy - z, cx + hw, cy, cx, cy + hh], C.ink);
      diamond(cx, cy - z, hw, hh, col);
      game.draw.sprite(NOTE, { '#': mine ? C.ink : C.grayD }, cx, cy - z - (pitch === 'H' ? 30 : -6), pitch === 'H' ? 10 : 15, { anchor: 'center' });
    }
    // 拍のランプ(菱形・1拍目が大きい)
    var pos = running ? beatN % 4 : -1;
    for (var i = 0; i < 4; i++) {
      var lx = 330 + i * 140, ly = 1462, on = i === pos && lampT > 0;
      diamond(lx, ly, i === 0 ? 34 : 24, i === 0 ? 17 : 12, on ? C.yellow : C.grayD);
    }
  }

  function drawScene(t) {
    var ti = turnInfo();
    drawRiver(t);
    drawBoat(t);
    var order = [0, 1, 2, YOU].sort(function (a, b) { return seatPt(a, t).y - seatPt(b, t).y; });
    for (var i = 0; i < order.length; i++) drawFigure(order[i], t, ti);
    drawFloats();
    drawStrip(t, ti);
    drawPads(t, ti);
    if (flashT > 0) game.draw.rect(0, 0, W, H, C.red, 0.16 * flashT / HIT_STOP);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 236, C.ink, 0.85);
    game.draw.rect(0, 228, W, 8, C.teal);
    label('SCORE ' + score, 56, 92, 52, C.yellow, 'left');
    label('BEST ' + prevBest, 56, 164, 32, C.cream, 'left');
    label(hits + ' / ' + NOTES.length, W - 56, 92, 54, C.cream, 'right');
    var progress = Math.min(1, songT / (SONG_BEATS * SPB));
    game.draw.rect(0, 228, W * progress, 8, C.yellow);
  }

  // ---- ATTRACT: 実ロジックで 船頭の節を同じ拍・同じ高さで返す → おばあさんの番に割り込んでMISS ----
  var demo = { t: 0, i: 0, pressT: 0, x: 290, y: 1640 };
  var DEMO_TAPS = [];
  for (var dn = 0; dn < PH[0].notes.length; dn++) DEMO_TAPS.push([(8 + PH[0].notes[dn][0] * 0.5) * SPB + 0.01, PH[0].notes[dn][1]]);
  DEMO_TAPS.push([(16 + 1) * SPB, 'H']);     // おばあさんの番に割り込む
  var DEMO_LEN = 19.5 * SPB;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.i = 0; }
    stepPlay(dt);
    if (demo.i < DEMO_TAPS.length) {
      var tp = DEMO_TAPS[demo.i];
      var tx = tp[1] === 'H' ? 790 : 290;
      demo.x += (tx - demo.x) * Math.min(1, dt * 10);
      if (songT >= tp[0]) { demo.i++; demo.pressT = 0.16; demo.x = tx; sing(tp[1]); }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
  }

  function stepFloats(dt) {
    for (var i = floats.length - 1; i >= 0; i--) {
      var f = floats[i];
      f.t += dt; f.z += f.vz * dt; f.vz *= 0.97; f.x += 20 * dt;
      if (f.t > 1.2) floats.splice(i, 1);
    }
    for (var w = 0; w < 4; w++) if (singT[w] > 0) singT[w] -= dt;
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (lampT > 0) lampT -= dt * 4;
    if (glareT > 0) glareT -= dt;
    if (strayCool > 0) strayCool -= dt;
    if (padT > 0) padT -= dt;
    stepFloats(dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.pressT > 0 ? 1640 : 1600 + Math.sin(t * 3) * 12, { press: demo.pressT > 0, scale: 15 });
      game.draw.rect(0, 0, W, 236, C.ink, 0.85);
      game.draw.rect(0, 228, W, 8, C.teal);
      label(GAME_TITLE, W / 2, 110, 90 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 34, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.yellow);
      else label('TAP TO START', W / 2, H * 0.955, 42, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawHud();
      game.draw.rect(100, H * 0.19, W - 200, H * 0.3, C.ink, 0.88);
      game.draw.rect(100, H * 0.19, W - 200, 8, won ? C.yellow : C.red);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 100, won ? C.yellow : C.red);
      label('SCORE ' + score, W / 2, H * 0.3, 60, C.cream);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.345, 34, C.cream);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.395, 54, C.yellow);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.395, 42, C.cream);
      if (!won) label('あと' + Math.max(1, NOTES.length - hits) + '声!', W / 2, H * 0.45, 52, C.teal);
      else label('NICE ' + perfectPhr + ' / 4', W / 2, H * 0.45, 48, C.teal);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.cream);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, notes: hits, total: NOTES.length, perfect: perfects, good: goods, miss: misses, phrases: perfectPhr, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.yellow);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, C.yellow);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
