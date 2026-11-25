// K-DS-0032v2-barber-chair-nod.js
// 床屋の椅子の相槌 — 店主の世間話と棚のラジオが拍を刻む間は椅子の上でじっと動かず、話もラジオも途切れた無音の拍の頭でだけ下へなぞって頷く
// 操作: 画面のどこかを押して下へなぞると客が頷く(なぞりが一定の長さに届いた瞬間で判定)。店主が話す拍(吹き出しの記号とおしゃべり音・ラジオの伴奏)の間に指を置いて離す/なぞると身じろぎでMISS。話とラジオが両方止まる無音の拍(下の拍タイルが小節の頭から白抜きで予告、1拍前に店主が息を吸いラジオのランプが赤く点滅)の頭で頷くとPERFECT/GOOD。無音の拍を見送る・ずれすぎもMISS。店主だけ黙ってラジオは鳴り続ける拍(息継ぎ)はおとりで、頷くとMISS。後半は無音が2拍続く
// 終わり: 7小節(112BPM・約15秒・頷き8回)を終えて MISS 2回以内ならCLEAR(判定の点+連続ボーナス)。MISS 3回でGAME OVER
// @mechanic: freeze
// @theme: barber_chair_nod
// 世界観: 町の床屋の椅子で、散髪中の客が店主の世間話と棚のラジオが拍を刻む間はじっと動かず、話もラジオも途切れた無音の拍にだけ小さく頷いて相槌を打つ
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・頷けた回数
// スタイル: 80s ISO
var STYLE = { bg: ['#1d2233', '#3b6f86'], main: ['#e4473c', '#f2efe6', '#4f8fa8'], accent: ['#f6c445', '#2a2a3a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 市松の菱形タイル床と等角の壁・箱。高さは影との距離で見せ、奥でも縮めない
  var C = {
    red: STYLE.main[0], cream: STYLE.main[1], teal: STYLE.main[2], brass: STYLE.accent[0], ink: STYLE.accent[1],
    tealDk: '#2c5a6e', tealLt: '#7cbacd', white: '#ffffff', skin: '#f0b48a', skinDk: '#d18e63', hair: '#5a3a28',
    blue: '#3a62b8', glass: '#bfe4ee', chrome: '#a9aebd', chromeDk: '#6c7183', seat: '#a8324e', seatDk: '#76203a',
    wood: '#b0703c', woodDk: '#7c4a26', grey: '#c9c9d1'
  };

  var GAME_TITLE = 'CHAIR NOD';
  var BPM = 112;
  var SPB = 60 / BPM;            // 1拍 ≒ 0.536秒
  var BAR = 4;
  var BARS = 7;                  // 28拍 ≒ 15秒
  var PERFECT_W = 0.07;          // 無音の拍の頭からのずれ
  var GOOD_W = 0.15;
  var MISS_MAX = 3;
  var HIT_STOP = 0.45;
  var NOD_PX = 46;               // 頷きになる下なぞりの長さ

  // rest = 話もラジオも止まる無音の拍(頷く)/ breath = 店主だけ黙る息継ぎ(ラジオは鳴る・おとり)
  var PLANS = [
    { rest: [7, 10, 15, 18, 19, 23, 25, 26], breath: [13, 21] },
    { rest: [6, 11, 14, 18, 19, 22, 25, 26], breath: [9, 16] }
  ];
  var DEMO_PLAN = { rest: [3, 6], breath: [9] };
  var DEMO_BARS = 3;

  // 棚のラジオの曲(オリジナル)。1拍ずつの音型。無音の拍は休符に差し替えて小節ごとに流す
  var TUNE = [
    [[['F4', 0.5], ['A4', 0.5]], [['C5', 1]], [['D5', 0.5], ['C5', 0.5]], [['A4', 1]]],
    [[['Bb4', 0.5], ['D5', 0.5]], [['F5', 1]], [['E5', 0.5], ['D5', 0.5]], [['C5', 1]]],
    [[['A4', 0.5], ['C5', 0.5]], [['F5', 0.5], ['E5', 0.5]], [['D5', 1]], [['C5', 0.5], ['A4', 0.5]]],
    [[['G4', 0.5], ['Bb4', 0.5]], [['D5', 1]], [['C5', 0.5], ['Bb4', 0.5]], [['A4', 1]]],
    [[['F4', 0.5], ['A4', 0.5]], [['C5', 1]], [['F5', 0.5], ['G5', 0.5]], [['A5', 1]]],
    [[['G5', 0.5], ['F5', 0.5]], [['E5', 1]], [['D5', 0.5], ['E5', 0.5]], [['C5', 1]]],
    [[['A4', 0.5], ['C5', 0.5]], [['Bb4', 0.5], ['G4', 0.5]], [['F4', 1]], [['F5', 1]]]
  ];
  var BASSL = [
    ['F2', 'C3', 'F2', 'C3'], ['Bb2', 'F2', 'Bb2', 'F2'], ['F2', 'C3', 'D3', 'A2'], ['C3', 'G2', 'C3', 'E2'],
    ['F2', 'C3', 'F2', 'C3'], ['C3', 'G2', 'C3', 'G2'], ['F2', 'C3', 'F2', 'F2']
  ];
  var SYL = [392, 466, 523, 440, 587, 494, 415, 349];

  // ---- 等角投影 ----
  var OX = W / 2, OY = 640, TW2 = 90, TH2 = 45;
  function iso(x, y, z) { return [OX + (x - y) * TW2, OY + (x + y) * TH2 - (z || 0)]; }

  var CUST_X = 540, CUST_HEAD_Y = Math.round(H * 0.35), CAPE_Y = CUST_HEAD_Y + 100;
  var BARB_X = 376, BARB_Y = 700;
  var RADIO_X = 676, RADIO_Y = 468;
  var POLE = iso(4.6, 0, 0);
  var PAD_X = 540, PAD_Y = H * 0.869, TRACK_TOP = H * 0.802;
  var LAMP_Y = H * 0.696;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var soundOn = false; // 最初の入力まで音を積まない(解錠前の音が後でまとめて鳴るのを防ぐ)

  var demoMode, plan, barsTotal, running, beatN, beatT, songT, halfDone, nextBar, readyT;
  var cues, hitStop, stopUntil, flashT, missKind, nodT, twitchT, padT, beatFlash, inhaleT, snipT, talkT, breathT, talkIcon, notch, puzzledT;
  var score, streak, maxStreak, perfects, goods, misses, nods, over, won, outroT, prevBest, milestone;
  var clips, notes, stroke;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    plan = isDemo ? DEMO_PLAN : PLANS[Math.floor(game.random(0, PLANS.length)) % PLANS.length];
    barsTotal = isDemo ? DEMO_BARS : BARS;
    running = false; beatN = 0; beatT = 0; songT = 0; halfDone = -1; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    cues = [];
    for (var i = 0; i < plan.rest.length; i++) cues.push({ beat: plan.rest[i], res: '', warned: false });
    hitStop = 0; stopUntil = -9; flashT = 0; missKind = ''; nodT = 0; twitchT = 0; padT = 0; beatFlash = 0;
    inhaleT = 0; snipT = 0; talkT = 0; breathT = 0; talkIcon = 0; notch = 0; puzzledT = 0;
    score = 0; streak = 0; maxStreak = 0; perfects = 0; goods = 0; misses = 0; nods = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    clips = []; notes = []; stroke = null;
    if (isDemo) startClock();
  }

  function kindOf(k) {
    if (k < 0 || k >= barsTotal * BAR) return 'end';
    if (plan.rest.indexOf(k) >= 0) return 'rest';
    if (plan.breath.indexOf(k) >= 0) return 'breath';
    return 'talk';
  }

  // ---- 音 ----
  function vol() { return demoMode ? 0.45 : 1; }
  function beep(f, d, o) { if (soundOn) game.audio.tone(f, d, o); }
  function playBar(b) {
    if (!soundOn) return;
    var mel = [], bass = [];
    for (var i = 0; i < BAR; i++) {
      var k = b * BAR + i;
      if (kindOf(k) === 'rest') { mel.push(['R', 1]); bass.push(['R', 1]); continue; }
      var part = TUNE[b % TUNE.length][i];
      for (var j = 0; j < part.length; j++) mel.push(part[j]);
      bass.push([BASSL[b % BASSL.length][i], 1]);
    }
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.03 * vol(), bass: bass, bassWave: 'triangle', bassVolume: 0.065 * vol() });
  }
  function chatter(k, half) {
    beep(SYL[(k * 3 + half * 5) % SYL.length], 0.07, { wave: 'sawtooth', volume: 0.03 * vol(), slide: -90 });
  }

  // ---- 拍クロック(1本だけ)----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; halfDone = -1;
    onBeat(0);
  }

  function onBeat(k) {
    var kind = kindOf(k);
    if (kind === 'end') return;
    beatFlash = 1;
    if (kind === 'talk') {
      snipT = 0.16; talkT = SPB * 0.9; talkIcon = (k * 5 + 3) % ICONS.length;
      chatter(k, 0);
      spawnClip();
    } else if (kind === 'breath') {
      breathT = SPB * 0.85;
      beep(260, 0.12, { wave: 'sine', volume: 0.05 * vol(), slide: -60 });
    }
    if (kind !== 'rest') {
      beep(2900, 0.012, { wave: 'square', volume: 0.016 * vol() });
      notes.push({ x: RADIO_X - 30 + (k % 3) * 22, y: RADIO_Y - 40, t: 0 });
      if (notes.length > 8) notes.shift();
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    if (beatT >= SPB / 2 && halfDone !== beatN) {
      halfDone = beatN;
      if (kindOf(beatN) === 'talk') chatter(beatN, 1);
    }
    // 伴奏は小節頭の少し前に積む(合成の遅延ぶん)
    while (nextBar < barsTotal && songT >= nextBar * BAR * SPB - 0.06) { playBar(nextBar); nextBar++; }
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      if (c.res) continue;
      var ct = c.beat * SPB;
      if (!c.warned && songT >= ct - SPB) {
        // 予告(1拍前): 店主が息を吸い、ラジオのランプが赤く点滅して絞られる
        c.warned = true; inhaleT = SPB;
        beep(330, 0.22, { wave: 'sine', volume: 0.08 * vol(), slide: 260 });
        beep(880, 0.12, { wave: 'square', volume: 0.025 * vol(), slide: -520 });
      }
      if (songT > ct + GOOD_W) {
        if (ct - GOOD_W < stopUntil) c.res = 'void';
        else { c.res = 'miss'; puzzledT = 0.6; miss('late'); }
      }
    }
    if (!demoMode && !over && songT >= barsTotal * BAR * SPB + 0.1) finish(misses < MISS_MAX);
  }

  // ---- 判定 ----
  function nod() {
    nodT = 0.3;
    if (!running || over || hitStop > 0) return 'none';
    var best = null, bd = 99;
    for (var i = 0; i < cues.length; i++) {
      if (cues[i].res) continue;
      var d = songT - cues[i].beat * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = cues[i]; }
    }
    if (best && Math.abs(bd) <= GOOD_W) {
      nods++; streak++;
      if (streak > maxStreak) maxStreak = streak;
      if (Math.abs(bd) <= PERFECT_W) {
        best.res = 'perfect'; perfects++; score += 100 + Math.min(streak, 8) * 10;
        game.feedback.good(CUST_X + 170, CUST_HEAD_Y - 120, { text: 'PERFECT', color: C.brass, size: 54, count: 12, volume: soundOn ? 0.25 : 0.001 });
      } else {
        best.res = 'good'; goods++; score += 50;
        game.feedback.good(CUST_X + 170, CUST_HEAD_Y - 120, { text: 'GOOD', color: C.tealLt, size: 46, count: 6, volume: soundOn ? 0.2 : 0.001 });
      }
      beep(523 * Math.pow(1.06, Math.min(streak, 8)), 0.07, { wave: 'triangle', volume: 0.1 });
      if (!demoMode && !milestone && nods === 4) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(nods + ' / ' + cues.length, W / 2, 540, { color: C.brass, size: 80 });
      }
      return 'ok';
    }
    var nb = Math.round(songT / SPB);
    miss(kindOf(nb) === 'breath' && Math.abs(songT - nb * SPB) < SPB * 0.6 ? 'decoy' : 'moved');
    return 'miss';
  }

  // 頷かずに指を離した(身じろぎ)。無音の拍の中なら何も起きない
  function fidget() {
    twitchT = 0.22;
    if (!running || over || hitStop > 0) { if (soundOn) game.audio.play('se_tap', 0.2); return; }
    for (var i = 0; i < cues.length; i++) {
      var ct = cues[i].beat * SPB;
      if (songT >= ct - GOOD_W && songT <= ct + SPB - 0.04) { game.audio.play('se_tap', 0.25); return; }
    }
    miss('moved');
  }

  function miss(kind) {
    misses++; streak = 0; missKind = kind;
    hitStop = HIT_STOP; stopUntil = songT + HIT_STOP; flashT = HIT_STOP;
    if (kind !== 'late') notch = Math.min(4, notch + 1);
    var fx = kind === 'decoy' ? RADIO_X : CUST_X;
    var fy = kind === 'decoy' ? RADIO_Y : CUST_HEAD_Y - 70;
    game.feedback.bad(fx, fy, { text: 'MISS', shake: demoMode ? 4 : 10, volume: soundOn ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false; stroke = null;
    game.audio.stopBgm();
    if (ok) {
      score += nods * 20 + maxStreak * 15;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(160, 920), game.random(420, 1100), { color: i % 2 ? C.red : C.brass, count: 20, speed: 430 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 400, { color: C.brass, size: 72 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: 押して下へなぞる = 頷く / なぞらずに離す = 身じろぎ ----
  game.onPress(function(x, y, id) {
    soundOn = true;
    if (state !== S.PLAYING || over) return;
    stroke = { y0: y, done: false };
    padT = 0.12;
    game.audio.tone(196, 0.04, { wave: 'triangle', volume: 0.07 });
  });
  game.onMove(function(x, y, id) {
    if (!stroke || stroke.done || state !== S.PLAYING || over) return;
    if (y - stroke.y0 >= NOD_PX) {
      stroke.done = true;
      if (nod() === 'none') game.audio.play('se_tap', 0.2);
    }
  });
  game.onRelease(function(x, y, id) {
    var s = stroke;
    stroke = null;
    if (!s || state !== S.PLAYING || over) return;
    if (!s.done) { game.audio.tone(247, 0.03, { wave: 'triangle', volume: 0.05 }); fidget(); }
  });
  game.onTap(function(x, y) {
    soundOn = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- スプライト ----
  function swapRows(src, map) {
    return src.map(function(row, i) { return map[i] !== undefined ? map[i] : row; });
  }
  var BARBER = [
    '...gggggg...', '..gggggggg..', '..gffffffg..', '..fkffffkf..', '..ffffnfff..', '..fmmmmmmf..',
    '...ffffff...', '....ffff....', '..wwwrrwww..', '.wwwwrrwwww.', '.wwwwwwwwww.', 'fwwwwwwwwwwf',
    'fwwwwwwwwwwf', '.wwwwwwwwww.', '.wwwwwwwwww.', '..pppppppp..', '..ppp..ppp..', '..ppp..ppp..', '.sss....sss.'
  ];
  var BARBER_TALK = swapRows(BARBER, { 6: '...ffoofff..' });
  var BARBER_IN = swapRows(BARBER, { 2: '..gkffffkg..', 3: '..ffffffff..', 6: '..ffffffff..' });
  var BARBER_OOPS = swapRows(BARBER, { 3: '..kkffffkk..', 6: '...ffoofff..', 7: '....fooff...' });
  var BARBER_JOY = swapRows(BARBER, { 3: '..ffkffkff..', 6: '...foooof...' });
  var BPAL = { g: C.grey, f: C.skin, k: C.ink, n: C.skinDk, m: '#4a4a52', o: C.red, w: C.white, r: C.red, p: C.ink, s: C.woodDk };
  var WPAL = { g: C.white, f: C.white, k: C.white, n: C.white, m: C.white, o: C.white, w: C.white, r: C.white, p: C.white, s: C.white, h: C.white, c: C.white, b: C.white };

  var HEAD = [
    '..hhhhhhhh..', '.hhhhhhhhhh.', 'hhhhhhhhhhhh', 'hhffffffffhh', 'hfkkffffkkfh',
    '.ffffffffff.', '.frffffffrf.', '..ffffmmff..', '...ffffff...'
  ];
  var HEAD_NOD = swapRows(HEAD, { 4: 'hffffffffffh', 5: '.fkkffffkkf.' });
  var HEAD_OOPS = swapRows(HEAD, { 4: 'hkkkffffkkkh', 7: '..fffooffff.' });
  var HEAD_JOY = swapRows(HEAD, { 4: 'hfkffffffkfh', 7: '..fmmmmmmf..' });
  var HPAL = { h: C.hair, f: C.skin, k: C.ink, r: '#f08a80', m: C.seatDk, o: C.ink };

  var CAPE = [
    '....cccccc....', '..cccccccccc..', '.ccbccbccbccc.', 'ccbccbccbccbcc',
    'cbccbccbccbccc', 'cccccccccccccc', 'cccccccccccccc', '.cccccccccccc.'
  ];
  var CPAL = { c: C.cream, b: C.blue };

  var NOTE = ['..yyy', '..y.y', '..y..', '..y..', 'yyy..', 'yyy..'];
  var FISH = ['..bbbb.b', '.bwbbbbb', 'bbbbbbbb', '.bbbbbbb', '..bbbb.b'];
  var SUN = ['.y..y..y', '..yyyy..', 'y.yyyy.y', '..yyyy..', '.y..y..y'];
  var CUP = ['.s.s....', '..s.s...', 'wwwwww..', 'wwwwwwww', 'wwwwww.w', '.wwww...'];
  var CAT = ['k....k..', 'kk..kk..', 'kkkkkk..', 'kwkkwk.k', 'kkkkkk.k', '.kkkkkkk'];
  var ICONS = [FISH, SUN, CUP, CAT];
  var IPAL = { b: C.teal, w: C.white, y: C.brass, s: C.chrome, k: C.ink };

  // ---- 描画ヘルパー ----
  function fillPoly(pts, col, a, step) {
    var st = step || 3, minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y < maxY; y += st) {
      var yc = y + st / 2, xl = 1e9, xr = -1e9;
      for (i = 0; i < pts.length; i++) {
        var p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc)) {
          var xx = p[0] + (yc - p[1]) / (q[1] - p[1]) * (q[0] - p[0]);
          if (xx < xl) xl = xx;
          if (xx > xr) xr = xx;
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, st, col, a === undefined ? 1 : a);
    }
  }
  function isoBox(x, y, z, dx, dy, dz, top, left, right) {
    fillPoly([iso(x, y + dy, z), iso(x + dx, y + dy, z), iso(x + dx, y + dy, z + dz), iso(x, y + dy, z + dz)], left);
    fillPoly([iso(x + dx, y, z), iso(x + dx, y + dy, z), iso(x + dx, y + dy, z + dz), iso(x + dx, y, z + dz)], right);
    fillPoly([iso(x, y, z + dz), iso(x + dx, y, z + dz), iso(x + dx, y + dy, z + dz), iso(x, y + dy, z + dz)], top);
  }
  function diamond(cx, cy, hw, hh, col, a) {
    fillPoly([[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]], col, a, 3);
  }
  function diamondLine(cx, cy, hw, hh, col, wd) {
    game.draw.line(cx, cy - hh, cx + hw, cy, col, wd);
    game.draw.line(cx + hw, cy, cx, cy + hh, col, wd);
    game.draw.line(cx, cy + hh, cx - hw, cy, col, wd);
    game.draw.line(cx - hw, cy, cx, cy - hh, col, wd);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // 床に落ちる髪の房(影との距離で高さを見せる)
  function spawnClip() {
    var gx = CUST_X + game.random(-150, 150);
    var gy = 930 + game.random(-30, 70);
    clips.push({ x: gx, gy: gy, z: gy - (CUST_HEAD_Y + game.random(-20, 30)), vz: 0, landed: false });
    if (clips.length > 26) clips.shift();
  }
  function stepClips(dt) {
    for (var i = 0; i < clips.length; i++) {
      var c = clips[i];
      if (c.landed) continue;
      c.vz += 1100 * dt; c.z -= c.vz * dt; c.x += Math.sin(c.gy + c.z * 0.05) * 30 * dt;
      if (c.z <= 0) { c.z = 0; c.landed = true; }
    }
    for (var j = notes.length - 1; j >= 0; j--) { notes[j].t += dt; if (notes[j].t > 1.2) notes.splice(j, 1); }
  }
  function drawClips(onlyLanded) {
    for (var i = 0; i < clips.length; i++) {
      var c = clips[i];
      if (c.landed !== onlyLanded) continue;
      var sh = Math.max(4, 12 - c.z * 0.02);
      diamond(c.x, c.gy, sh * 1.6, sh * 0.8, C.ink, 0.28);
      game.draw.rect(c.x - 9, c.gy - c.z - 6, 18, 6, C.hair);
      game.draw.rect(c.x - 4, c.gy - c.z - 10, 10, 4, C.hair);
    }
  }

  function drawRoom(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 奥の2枚の壁(左=明るい面 / 右=暗い面)
    var WH = 400;
    fillPoly([iso(0, 0, 0), iso(0, 6, 0), iso(0, 6, WH), iso(0, 0, WH)], C.teal, 1, 4);
    fillPoly([iso(0, 0, 0), iso(6, 0, 0), iso(6, 0, WH), iso(0, 0, WH)], C.tealDk, 1, 4);
    // 腰板
    fillPoly([iso(0, 0, 0), iso(0, 6, 0), iso(0, 6, 90), iso(0, 0, 90)], C.woodDk, 1, 4);
    fillPoly([iso(0, 0, 0), iso(6, 0, 0), iso(6, 0, 90), iso(0, 0, 90)], C.wood, 1, 4);
    // 鏡(左壁)
    fillPoly([iso(0, 1.4, 120), iso(0, 4.6, 120), iso(0, 4.6, 335), iso(0, 1.4, 335)], C.brass, 1, 3);
    fillPoly([iso(0, 1.55, 132), iso(0, 4.45, 132), iso(0, 4.45, 322), iso(0, 1.55, 322)], C.glass, 1, 3);
    var g1 = iso(0, 2.0, 300), g2 = iso(0, 2.6, 160), g3 = iso(0, 2.5, 300), g4 = iso(0, 3.1, 160);
    game.draw.line(g1[0], g1[1], g2[0], g2[1], C.white, 6);
    game.draw.line(g3[0], g3[1], g4[0], g4[1], C.white, 3);
    // 鏡に映る客の後頭部(頷くと一緒に下がる)
    var dip = nodDip();
    var mr = iso(0, 3.4, 230);
    game.draw.circle(mr[0], mr[1] + dip * 0.6, 44, C.hair, 0.55);
    game.draw.rect(mr[0] - 70, mr[1] + 40 + dip * 0.3, 140, 60, C.cream, 0.45);
    // 棚とラジオ(右壁)
    isoBox(0.9, 0, 188, 2.0, 0.42, 12, C.wood, C.woodDk, C.woodDk);
    var radioOn = running && kindOf(beatN) !== 'rest';
    isoBox(1.15, 0.02, 200, 1.4, 0.32, 82, '#d9d2c0', C.red, C.seatDk);
    var pulse = radioOn ? beatFlash : 0;
    game.draw.circle(RADIO_X - 20, RADIO_Y + 12, 26 + pulse * 5, C.ink);
    for (var gr = -2; gr <= 2; gr++) game.draw.rect(RADIO_X - 40, RADIO_Y + 12 + gr * 8, 40, 2, radioOn ? C.chrome : C.chromeDk);
    var warnBlink = inhaleT > 0 && Math.floor(t * 14) % 2 === 0;
    game.draw.circle(RADIO_X + 34, RADIO_Y - 2, 11, warnBlink ? C.red : (radioOn ? C.brass : C.chromeDk));
    for (var n = 0; n < notes.length; n++) {
      var nt = notes[n];
      game.draw.sprite(NOTE, { y: C.brass }, nt.x + Math.sin(nt.t * 6) * 10, nt.y - nt.t * 110, 6, { anchor: 'center', alpha: Math.max(0, 1 - nt.t / 1.2) });
    }
    drawPole(t);
    // 床(市松の菱形タイル)と厚み
    fillPoly([iso(0, 6, 0), iso(6, 6, 0), [OX, iso(6, 6, 0)[1] + 50], [0, iso(0, 6, 0)[1] + 50]], '#14182a', 1, 4);
    fillPoly([iso(6, 6, 0), iso(6, 0, 0), [W, iso(6, 0, 0)[1] + 50], [OX, iso(6, 6, 0)[1] + 50]], '#0e1120', 1, 4);
    fillPoly([iso(0, 0, 0), iso(6, 0, 0), iso(6, 6, 0), iso(0, 6, 0)], C.ink, 1, 4);
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < 6; j++) {
        if ((i + j) % 2) continue;
        fillPoly([iso(i, j, 0), iso(i + 1, j, 0), iso(i + 1, j + 1, 0), iso(i, j + 1, 0)], C.cream, 1, 3);
      }
    }
    drawClips(true);
  }

  // 床屋のサインポール: 拍の頭ごとに縞が1段ぶん上がる(拍が目に見える)
  function drawPole(t) {
    var px = POLE[0], top = POLE[1] - 330, bot = POLE[1] - 70, pw = 46;
    var ph;
    if (running) { var p = beatT / SPB; ph = beatN + (1 - Math.pow(1 - Math.min(1, p * 2.2), 3)); }
    else ph = t * 0.5;
    game.draw.rect(px - pw / 2 - 6, top - 24, pw + 12, 24, C.brass);
    game.draw.rect(px - pw / 2 - 6, bot, pw + 12, 24, C.brass);
    game.draw.rect(px - pw / 2, top, pw, bot - top, C.white);
    var band = 26, cols = [C.red, C.white, C.blue, C.white];
    var off = (ph * band * 2) % (band * 4);
    for (var b = -2; b < (bot - top) / band + 3; b++) {
      var col = cols[((b % 4) + 4) % 4];
      if (col === C.white) continue;
      for (var s = 0; s < 8; s++) {
        var y0 = top + b * band - off + s * 3 + 40;
        var y1 = y0 + band;
        var ya = Math.max(top, y0), yb = Math.min(bot, y1);
        if (yb > ya) game.draw.rect(px - pw / 2 + s * (pw / 8), ya, pw / 8 + 0.5, yb - ya, col);
      }
    }
    game.draw.rect(px - pw / 2 + 6, top, 6, bot - top, C.white, 0.5);
    if (running) game.draw.circle(px, top - 34, 12 + beatFlash * 10, C.brass, 0.4 + beatFlash * 0.5);
    game.draw.circle(px, top - 34, 12, C.brass);
  }

  function nodDip() {
    if (nodT <= 0) return 0;
    return Math.sin(Math.PI * (1 - nodT / 0.3)) * 24;
  }

  function drawCast(t) {
    var stop = flashT > 0 && hitStop > 0;
    // 店主(左奥)
    var bspr = BARBER;
    if (over && state !== S.ATTRACT) bspr = won ? BARBER_JOY : BARBER_OOPS;
    else if (stop) bspr = BARBER_OOPS;
    else if (inhaleT > 0 || (running && kindOf(beatN) === 'rest')) bspr = BARBER_IN;
    else if (talkT > 0 && beatT < SPB * 0.25) bspr = BARBER_TALK;
    else if (talkT > 0 && beatT > SPB * 0.5 && beatT < SPB * 0.75) bspr = BARBER_TALK;
    var bob = stop ? 0 : Math.sin(t * 3) * 3;
    diamond(BARB_X, BARB_Y + 108, 70, 26, C.ink, 0.3);
    game.draw.sprite(bspr, BPAL, BARB_X, BARB_Y + bob, 11, { anchor: 'center' });
    if (puzzledT > 0) label('?', BARB_X + 10, BARB_Y - 160, 72, C.brass);
    // 椅子
    game.draw.rect(CUST_X - 96, CUST_HEAD_Y - 40, 192, 170, C.seat);
    game.draw.rect(CUST_X - 70, CUST_HEAD_Y - 64, 140, 30, C.chrome);
    diamond(CUST_X, 918, 120, 50, C.ink, 0.3);
    isoBox(2.82, 2.82, 0, 0.36, 0.36, 60, C.chrome, C.chromeDk, C.chromeDk);
    isoBox(2.35, 2.35, 60, 1.3, 1.3, 28, C.seat, C.seatDk, C.seatDk);
    // 客(マントと頭)
    var dip = nodDip();
    var tw = twitchT > 0 ? Math.sin(twitchT * 70) * 6 : 0;
    game.draw.sprite(CAPE, stop && missKind !== 'decoy' ? WPAL : CPAL, CUST_X, CAPE_Y, 12, { anchor: 'center' });
    var hspr = HEAD;
    if (over && state !== S.ATTRACT) hspr = won ? HEAD_JOY : HEAD_OOPS;
    else if (stop && missKind !== 'decoy') hspr = HEAD_OOPS;
    else if (nodT > 0) hspr = HEAD_NOD;
    var cueNow = restCueNear(SPB);
    if (cueNow && !stop) {
      var blink = cueNow.near ? 1 : (Math.floor(t * 12) % 2 === 0 ? 0.7 : 0.2);
      game.draw.circle(CUST_X, CUST_HEAD_Y + dip, 96, C.white, 0.25 * blink);
      game.draw.circle(CUST_X, CUST_HEAD_Y + dip, 84, C.brass, 0.2 * blink);
    }
    if (stop && missKind !== 'decoy') {
      var k = flashT / HIT_STOP;
      game.draw.circle(CUST_X, CUST_HEAD_Y, 110 + (1 - k) * 90, C.white, 0.6 * k);
      game.draw.sprite(hspr, WPAL, CUST_X, CUST_HEAD_Y - 6, 15, { anchor: 'center' });
    } else {
      game.draw.sprite(hspr, HPAL, CUST_X + tw, CUST_HEAD_Y + dip, 12, { anchor: 'center' });
      // 身じろぎで切りそろえ損ねた段差
      for (var q = 0; q < notch; q++) game.draw.rect(CUST_X - 66 + q * 34 + tw, CUST_HEAD_Y - 54 + dip, 14, 18, C.skin);
    }
    // ひじ掛け
    isoBox(2.35, 3.55, 88, 1.3, 0.14, 16, C.chrome, C.chromeDk, C.chromeDk);
    isoBox(3.55, 2.35, 88, 0.14, 1.3, 16, C.chrome, C.chromeDk, C.chromeDk);
    // 店主の腕とハサミ・くし(話す拍ごとにハサミが鳴る)
    var hx = CUST_X - 70, hy = CUST_HEAD_Y - 70 + bob;
    game.draw.line(BARB_X + 50, BARB_Y - 40 + bob, hx, hy + 10, C.white, 22);
    game.draw.circle(hx, hy + 10, 13, C.skin);
    var open = (snipT > 0 ? 0.08 : 0.42) + (running && kindOf(beatN) === 'rest' ? 0.1 : 0);
    var bl = 62;
    game.draw.line(hx, hy, hx + Math.cos(-0.9 - open) * bl, hy + Math.sin(-0.9 - open) * bl, C.chrome, 7);
    game.draw.line(hx, hy, hx + Math.cos(-0.9 + open) * bl, hy + Math.sin(-0.9 + open) * bl, C.chrome, 7);
    game.draw.circle(hx - 14, hy + 18, 10, C.red);
    game.draw.circle(hx + 4, hy + 24, 10, C.red);
    game.draw.circle(hx, hy, 5, C.ink);
    // くし
    game.draw.rect(BARB_X - 92, BARB_Y - 10 + bob, 46, 12, C.ink);
    for (var tt = 0; tt < 6; tt++) game.draw.rect(BARB_X - 90 + tt * 8, BARB_Y + 2 + bob, 3, 10, C.ink);
    drawClips(false);
    // ハイライト: おとり(息継ぎ)で頷いた → 鳴り続けるラジオを白く拡大
    if (stop && missKind === 'decoy') {
      var kk = flashT / HIT_STOP;
      game.draw.circle(RADIO_X, RADIO_Y, 90 + (1 - kk) * 80, C.white, 0.55 * kk);
      game.draw.sprite(NOTE, { y: C.white }, RADIO_X, RADIO_Y - 10, 16, { anchor: 'center' });
    }
  }

  function restCueNear(ahead) {
    if (!running) return null;
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      if (c.res) continue;
      var d = c.beat * SPB - songT;
      if (d <= ahead && d >= -GOOD_W) return { near: Math.abs(d) <= GOOD_W };
    }
    return null;
  }

  // 店主の吹き出し: 話す拍は記号が入れ替わり、黙る拍は消える
  function drawBubble(t) {
    if (!(talkT > 0) || (flashT > 0 && hitStop > 0)) return;
    var bx = 238, by = 452;
    var pop = Math.min(1, (SPB * 0.9 - talkT) * 14);
    var r = 78 * (0.8 + 0.2 * pop);
    game.draw.circle(BARB_X - 70, BARB_Y - 140, 12, C.white);
    game.draw.circle(BARB_X - 104, BARB_Y - 186, 18, C.white);
    game.draw.circle(bx - 52, by + 6, r * 0.72, C.white);
    game.draw.circle(bx + 52, by + 6, r * 0.72, C.white);
    game.draw.circle(bx, by - 10, r, C.white);
    game.draw.rect(bx - 100, by + 6, 200, r * 0.6, C.white);
    game.draw.sprite(ICONS[talkIcon], IPAL, bx, by - 14, 9, { anchor: 'center' });
    for (var w = 0; w < 4; w++) {
      var x0 = bx - 64 + w * 32;
      game.draw.line(x0, by + 46, x0 + 16, by + 38 + Math.sin(t * 20 + w) * 4, C.teal, 5);
      game.draw.line(x0 + 16, by + 38 + Math.sin(t * 20 + w) * 4, x0 + 32, by + 46, C.teal, 5);
    }
  }

  // 拍タイル(下): 今の小節の4拍。白抜き = 頷く無音の拍
  function drawLamps(t) {
    var total = barsTotal * BAR;
    var bar = Math.floor(Math.min(Math.max(beatN, 0), total - 1) / BAR);
    for (var i = 0; i < BAR; i++) {
      var k = bar * BAR + i;
      var cx = 225 + i * 210;
      var kind = kindOf(k);
      var cur = running && k === beatN;
      var cue = null;
      for (var c = 0; c < cues.length; c++) if (cues[c].beat === k) cue = cues[c];
      diamond(cx, LAMP_Y + 16, 86, 43, '#0b0e19', 0.9);
      if (kind === 'rest') {
        var fillCol = null;
        if (cue && (cue.res === 'perfect' || cue.res === 'good')) fillCol = C.brass;
        else if (cue && cue.res === 'miss') fillCol = C.red;
        else if (cur) fillCol = C.white;
        if (fillCol) diamond(cx, LAMP_Y, 80, 40, fillCol, cur ? 0.9 : 0.75);
        var bl = cue && cue.warned && !cue.res && Math.floor(t * 12) % 2 === 0;
        diamondLine(cx, LAMP_Y, 80, 40, bl ? C.brass : C.white, 7);
        diamondLine(cx, LAMP_Y, 58, 29, C.white, 3);
      } else {
        diamond(cx, LAMP_Y, 80, 40, cur ? C.brass : C.tealDk, 1);
        diamond(cx, LAMP_Y - 4, 60, 28, cur ? '#ffe08a' : C.teal, 1);
        if (kind === 'talk') {
          game.draw.circle(cx - 8, LAMP_Y - 6, 12, C.white, cur ? 1 : 0.6);
          game.draw.circle(cx + 6, LAMP_Y + 8, 5, C.white, cur ? 1 : 0.6);
        }
      }
      if (cur) diamondLine(cx, LAMP_Y, 92 + beatFlash * 10, 46 + beatFlash * 5, C.brass, 3);
    }
  }

  // 親指ゾーン: マントのひざ(下へなぞる溝)
  function drawPad(t) {
    var top = 1450, bot = 1884;
    game.draw.rect(56, top, W - 112, bot - top, C.ink);
    game.draw.rect(68, top + 12, W - 136, bot - top - 24, C.cream);
    for (var s = 0; s < 9; s++) game.draw.rect(110 + s * 106, top + 12, 30, bot - top - 24, C.blue, 0.35);
    var live = restCueNear(SPB) && state !== S.RESULT;
    var pr = padT > 0 ? 6 : 0;
    game.draw.rect(PAD_X - 86 + pr, TRACK_TOP - 30, 172 - pr * 2, 300, live ? C.brass : C.ink, live ? 0.9 : 0.75);
    game.draw.rect(PAD_X - 70 + pr, TRACK_TOP - 14, 140 - pr * 2, 268, C.tealDk);
    for (var c = 0; c < 3; c++) {
      var cy = TRACK_TOP + 40 + c * 72 + (live ? ((t * 160) % 72) : 0);
      if (cy > TRACK_TOP + 230) continue;
      var col = live ? C.white : C.teal;
      game.draw.line(PAD_X - 40, cy, PAD_X, cy + 34, col, 10);
      game.draw.line(PAD_X + 40, cy, PAD_X, cy + 34, col, 10);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, '#151a2b');
    game.draw.rect(0, 222, W, 6, C.brass);
    label('SCORE ' + score, 54, 74, 52, C.cream, 'left');
    label('BEST ' + prevBest, 54, 150, 34, C.brass, 'left');
    label(nods + ' / ' + cues.length, W - 54, 74, 56, C.cream, 'right');
    for (var m = 0; m < MISS_MAX; m++) diamond(W - 250 + m * 90, 154, 34, 17, m < misses ? C.red : C.tealDk, 1);
    var total = barsTotal * BAR * SPB;
    var p = Math.max(0, Math.min(1, songT / total));
    game.draw.rect(54, 196, W - 108, 12, C.tealDk);
    game.draw.rect(54, 196, (W - 108) * p, 12, C.red);
  }

  function drawScene(t) {
    drawRoom(t);
    drawCast(t);
    drawBubble(t);
    drawLamps(t);
    drawPad(t);
  }

  // ---- ATTRACT: 実ロジックで 無音の拍に頷く(PERFECT)→少し遅れて頷く(GOOD)→息継ぎにつられて頷く(MISS) ----
  var demo = { t: 0, hx: PAD_X + 60, hy: TRACK_TOP + 40, press: false, nodded: false, done: [] };
  var DEMO_LEN = DEMO_BARS * BAR * SPB + 0.9;
  var DEMO_ACTS = [
    [3 * SPB - 0.2, 'down'], [3 * SPB, 'nod'], [3 * SPB + 0.24, 'up'],
    [6 * SPB - 0.1, 'down'], [6 * SPB + 0.1, 'nod'], [6 * SPB + 0.34, 'up'],
    [9 * SPB - 0.18, 'down'], [9 * SPB + 0.02, 'nod'], [9 * SPB + 0.3, 'up']
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = []; demo.press = false; demo.nodded = false; }
    var nt = songT + dt;
    for (var i = 0; i < DEMO_ACTS.length; i++) {
      var a = DEMO_ACTS[i];
      if (demo.done[i] || nt < a[0]) continue;
      demo.done[i] = true;
      if (a[1] === 'down') { demo.press = true; demo.nodded = false; padT = 0.12; }
      else if (a[1] === 'nod') { demo.nodded = true; nod(); }
      else demo.press = false;
    }
    stepPlay(dt);
    var tx = PAD_X + 60, ty = TRACK_TOP + 10;
    if (demo.press) { tx = PAD_X; ty = demo.nodded ? TRACK_TOP + 150 : TRACK_TOP + 20; }
    var k = Math.min(1, dt * (demo.nodded ? 22 : 12));
    demo.hx += (tx - demo.hx) * k;
    demo.hy += (ty - demo.hy) * k;
  }

  function tickTimers(dt) {
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (nodT > 0) nodT -= dt;
    if (twitchT > 0) twitchT -= dt;
    if (padT > 0) padT -= dt;
    if (inhaleT > 0) inhaleT -= dt;
    if (snipT > 0) snipT -= dt;
    if (talkT > 0) talkT -= dt;
    if (breathT > 0) breathT -= dt;
    if (puzzledT > 0) puzzledT -= dt;
    if (beatFlash > 0) beatFlash = Math.max(0, beatFlash - dt * 4);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    tickTimers(dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepClips(dt);
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 226, '#151a2b');
      game.draw.rect(0, 222, W, 6, C.brass);
      label(GAME_TITLE, W / 2 + 4, 96, 92 + Math.sin(t * 3) * 3, C.red);
      label(GAME_TITLE, W / 2, 90, 92 + Math.sin(t * 3) * 3, C.cream);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.092, 36, C.brass);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1270, 46, C.brass);
      else label('TAP TO START', W / 2, 1270, 42, C.cream);
      return;
    }

    if (state === S.RESULT) {
      stepClips(dt);
      drawScene(t);
      game.draw.rect(90, 250, W - 180, 470, C.ink, 0.92);
      game.draw.rect(90, 250, W - 180, 8, C.brass);
      game.draw.rect(90, 712, W - 180, 8, C.brass);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 330, 96, won ? C.brass : C.red);
      label('SCORE ' + score, W / 2, 428, 58, C.cream);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 504, 34, C.tealLt);
      if (won && score > prevBest) label('NEW RECORD', W / 2, 580, 54, C.brass);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 580, 42, C.brass);
      var left = 0;
      for (var c = 0; c < cues.length; c++) if (!cues[c].res) left++;
      if (!won) label('あと' + Math.max(1, left) + '回!', W / 2, 660, 50, C.cream);
      else label(nods + ' / ' + cues.length, W / 2, 660, 50, C.cream);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1270, 42, C.cream);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, nods: nods, perfect: perfects, good: goods, miss: misses, maxStreak: maxStreak };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0.06 && nextBar === 0) { playBar(0); nextBar = 1; }
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && songT > barsTotal * BAR * SPB + 1) finish(misses < MISS_MAX);
    }
    stepClips(dt);

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 1100, 110, C.brass);
    if (over && won) label('FINISH', W / 2, 1100, 104, C.brass);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
