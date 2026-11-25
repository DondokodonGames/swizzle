// K-GBA-0015v3-rooftop-star-count.js
// 屋上の星当て札 — 拍ごとに瞬く星を数え、その回の最後の拍で同じ数の札を挙げる。回を追うごとに拍が速くなる
// 操作: 1回は6拍。1拍目は合図、2〜4拍目の拍の頭に星が0〜2個ずつ瞬く(すぐ消える)。5拍目で札が光り、6拍目の頭ちょうどに下の札(1〜6)から数と同じ札をタップして挙げる。拍の頭からのずれでPERFECT/GOOD。札違い・早すぎ・遅れはMISS。2回ごとに拍が速くなる(メトロノームが赤く点滅→×1.25/×1.5)
// 終わり: 5回答えて MISS 1回以内ならCLEAR(判定の点+速さボーナス)。MISS 2回でGAME OVER
// @mechanic: counting
// @theme: rooftop_star_count
// 世界観: 丘の上の天文台の屋上観望会で、見学の子が拍ごとに瞬く星を数え、案内係の合図の拍に数と同じ答えの札を掲げる。会が進むほど拍が速くなる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・当てた回数
// スタイル: PIXEL HD

(function(game) {
  // PIXEL HD: 多色 + 光。月を光源に右上から照らし、遠景の星・中景の丘・近景の屋上デッキの3層パララックス
  var STYLE = { bg: ['#070b24', '#1b2350', '#3a3170'], main: ['#7fb6ff', '#ffe08a', '#e8eefc'], accent: ['#ff7a59', '#6ef0c8'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    night: STYLE.bg[0], navy: STYLE.bg[1], dusk: STYLE.bg[2],
    sky: STYLE.main[0], star: STYLE.main[1], pale: STYLE.main[2],
    warm: STYLE.accent[0], mint: STYLE.accent[1],
    ink: '#05061a', hill: '#141a3c', hill2: '#0d1230', deck: '#5a3f34', deck2: '#6e4e40', deckLit: '#9a6e52',
    rail: '#2a2030', card: '#fff6dc', cardEdge: '#c9a65a', red: '#ff4f6a',
  };

  var GAME_TITLE = 'STAR TALLY';
  var BPMS = [104, 104, 130, 130, 156];     // 2回ごとに段階的に加速(予告つき)
  var SPEED_LABEL = ['×1', '×1', '×1.25', '×1.25', '×1.5'];
  var ROUND_BEATS = 6;                      // 1拍目=合図 / 2〜4拍目=星 / 5拍目=札が光る / 6拍目=答え
  var ROUNDS = BPMS.length;
  var TIME_LIMIT = 15;
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var MISS_MAX = 2;
  var NEEDED = 4;
  var HIT_STOP = 0.42;
  var POOLS = [
    [[1, 1, 1], [1, 2, 1], [2, 1, 1], [1, 1, 2], [1, 0, 2]],
    [[2, 1, 2], [2, 2, 1], [1, 2, 2], [2, 0, 2], [0, 2, 1]],
    [[2, 2, 2], [1, 2, 2], [2, 1, 0], [2, 2, 1]],
  ];
  var STAGE_OF = [0, 0, 1, 1, 2];
  var CARD_W = 150, CARD_H = 220, CARD_Y = H * 0.79, CARD_GAP = 16;
  var CARD_X0 = (W - (6 * CARD_W + 5 * CARD_GAP)) / 2;

  // 伴奏(オリジナル)。1回=6拍ぶんのフレーズを、拍クロックからその回のテンポで鳴らす
  var PHRASES = [
    [['C4', 1], ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['C4', 1]],
    [['F4', 1], ['A4', 0.5], ['C5', 0.5], ['B4', 1], ['G4', 1], ['A4', 0.5], ['G4', 0.5], ['D4', 1]],
    [['E4', 1], ['G4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['B4', 0.5], ['G4', 1], ['E4', 1]],
  ];
  var PBASS = [[['C3', 3], ['G2', 3]], [['F2', 3], ['G2', 3]], [['A2', 3], ['G2', 3]]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, SPB, readyT, hitStop, nextPhrase;
  var rounds, cardLift, cardFlash, raiseT, raiseCard, shockT, speedFlash, warnT, beatPulse;
  var score, perfects, goods, misses, corrects, combo, over, won, outroT, prevBest, milestone;
  var farStars = [];
  (function() {
    for (var i = 0; i < 70; i++) farStars.push([(i * 197) % W, 260 + ((i * 131) % 760), 1 + (i % 3), i * 0.7]);
  })();

  function vol() { return demoMode ? 0.5 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function makeRound(r, forcedPick) {
    var pool = POOLS[STAGE_OF[r]];
    var pick = forcedPick !== undefined ? forcedPick : Math.floor(game.random(0, pool.length)) % pool.length;
    var counts = pool[pick];
    var stars = [];
    for (var b = 0; b < 3; b++) {
      for (var k = 0; k < counts[b]; k++) {
        var x, y, ok = false, tries = 0;
        while (!ok && tries < 40) {
          x = game.random(130, W - 130); y = game.random(330, 900); ok = true; tries++;
          if (x > 780 && y < 470) ok = false; // 月を避ける
          for (var s = 0; s < stars.length; s++) if (Math.abs(stars[s].x - x) < 130 && Math.abs(stars[s].y - y) < 120) ok = false;
        }
        stars.push({ x: x, y: y, beat: b + 1, lit: 0 });
      }
    }
    return { counts: counts, total: counts[0] + counts[1] + counts[2], stars: stars, res: '', pick: -1, ansT: -1, reveal: 0 };
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; SPB = 60 / BPMS[0]; nextPhrase = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0;
    rounds = [];
    var forced = isDemo ? [0, 1, 0, 0, 0] : [];
    for (var r = 0; r < ROUNDS; r++) rounds.push(makeRound(r, forced[r]));
    cardLift = [0, 0, 0, 0, 0, 0]; cardFlash = [0, 0, 0, 0, 0, 0];
    raiseT = 0; raiseCard = -1; shockT = 0; speedFlash = 0; warnT = 0; beatPulse = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; corrects = 0; combo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) startClock();
  }

  function playPhrase(r) {
    if (!armed || r >= ROUNDS) return;
    game.audio.melody(PHRASES[r % PHRASES.length], { tempo: BPMS[r], wave: 'triangle', volume: demoMode ? 0.03 : 0.05, bass: PBASS[r % PBASS.length], bassVolume: demoMode ? 0.03 : 0.06 });
  }

  // ---- 拍クロック(1本だけ。回の頭でSPBを段階的に縮める)----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; SPB = 60 / BPMS[0]; nextPhrase = 1;
    playPhrase(0);
    onBeat(0);
  }

  function onBeat(k) {
    var r = Math.floor(k / ROUND_BEATS), b = k % ROUND_BEATS;
    if (r >= ROUNDS) { if (!demoMode) finish(misses < MISS_MAX); running = demoMode ? running : false; return; }
    beatPulse = 1;
    var rd = rounds[r];
    if (b === 0) {
      SPB = 60 / BPMS[r];
      if (r > 0 && BPMS[r] !== BPMS[r - 1]) {
        // 加速の本番: 札とメトロノームが光り、上がる音
        speedFlash = 1;
        if (armed) game.audio.play('se_powerup', 0.4 * vol());
        game.fx.popup(SPEED_LABEL[r], W * 0.5, 420, { color: C.warm, size: 96 });
      }
      tone(392, 0.06, { wave: 'square', volume: 0.07 * vol() });
      tone(784, 0.04, { wave: 'square', volume: 0.05 * vol() });
    } else if (b <= 3) {
      tone(1046, 0.025, { wave: 'triangle', volume: 0.04 * vol() });
      var n = 0;
      for (var s = 0; s < rd.stars.length; s++) {
        if (rd.stars[s].beat === b) { rd.stars[s].lit = 1; n++; }
      }
      if (n > 0) tone(1760, 0.12, { wave: 'sine', volume: 0.1 * vol() });
      if (n > 1) tone(2217, 0.12, { wave: 'sine', volume: 0.08 * vol() });
    } else if (b === 4) {
      // 札が光る拍(答えの予告)
      tone(660, 0.16, { wave: 'triangle', volume: 0.08 * vol(), slide: 330 });
      // 次の回で加速するなら、ここからメトロノームが赤く点滅
      if (r + 1 < ROUNDS && BPMS[r + 1] !== BPMS[r]) { warnT = 2 * SPB; tone(523, 0.5, { wave: 'square', volume: 0.05 * vol(), slide: 523 }); }
    } else if (b === 5) {
      rd.ansT = songT - beatT;
      tone(1319, 0.05, { wave: 'square', volume: 0.08 * vol() });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    beatT += dt;
    while (running && beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    // 伴奏の先読み(次の回の頭の少し前)
    var r = Math.floor(beatN / ROUND_BEATS), b = beatN % ROUND_BEATS;
    if (nextPhrase < ROUNDS && nextPhrase === r + 1 && b === ROUND_BEATS - 1 && beatT >= SPB - 0.06) { playPhrase(nextPhrase); nextPhrase++; }
    for (var i = 0; i < rounds.length; i++) {
      var rd = rounds[i];
      for (var s = 0; s < rd.stars.length; s++) if (rd.stars[s].lit > 0) rd.stars[s].lit -= dt / Math.max(0.3, SPB * 0.6);
      if (rd.reveal > 0) rd.reveal -= dt * 1.4;
      if (!rd.res && rd.ansT >= 0 && songT > rd.ansT + GOOD_W) missRound(i, -1);
    }
  }

  function revealRound(i) {
    rounds[i].reveal = 1;
    var c = rounds[i].total - 1;
    if (c >= 0 && c < 6) cardFlash[c] = 1;
  }

  function missRound(i, card) {
    var rd = rounds[i];
    if (rd.res) return;
    rd.res = 'miss'; rd.pick = card;
    misses++; combo = 0;
    hitStop = HIT_STOP; shockT = HIT_STOP;
    revealRound(i);
    var mx = card >= 0 ? CARD_X0 + card * (CARD_W + CARD_GAP) + CARD_W / 2 : W / 2;
    game.feedback.bad(mx, CARD_Y - 60, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  // 札を挙げる(入力とデモで共通)。戻り値: 'ok' | 'miss' | 'none'
  function answer(card) {
    if (!running || over || hitStop > 0) return 'none';
    var r = Math.floor(beatN / ROUND_BEATS), b = beatN % ROUND_BEATS;
    if (r >= ROUNDS) return 'none';
    var rd = rounds[r];
    if (rd.res || b < 4) return 'none';
    var off = b === 5 ? beatT : beatT - SPB;     // 答えの拍の頭からのずれ
    cardLift[card] = 0.35; raiseT = 0.6; raiseCard = card;
    if (Math.abs(off) > GOOD_W) { missRound(r, card); return 'miss'; }
    if (card + 1 !== rd.total) { missRound(r, card); return 'miss'; }
    rd.pick = card; corrects++; combo++;
    revealRound(r);
    var cx = CARD_X0 + card * (CARD_W + CARD_GAP) + CARD_W / 2;
    var stageBonus = STAGE_OF[r] * 50;
    if (Math.abs(off) <= PERFECT_W) {
      rd.res = 'perfect'; perfects++; score += 100 + stageBonus + combo * 10;
      game.feedback.good(cx, CARD_Y - 80, { text: 'PERFECT', color: C.star, size: 52, count: 14, volume: armed ? 0.25 : 0.001 });
    } else {
      rd.res = 'good'; goods++; score += 50 + stageBonus / 2;
      game.feedback.good(cx, CARD_Y - 80, { text: 'GOOD', color: C.mint, size: 46, count: 8, volume: armed ? 0.2 : 0.001 });
    }
    if (!demoMode && corrects === 3 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(corrects + ' / ' + ROUNDS, W / 2, 560, { color: C.mint, size: 76 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += corrects * 50 + (misses === 0 ? 300 : 0);
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(150, 930), game.random(320, 900), { color: i % 2 ? C.star : C.sky, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 640, { color: C.star, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function cardAt(x, y) {
    if (y < CARD_Y - 30 || y > CARD_Y + CARD_H + 40) return -1;
    for (var i = 0; i < 6; i++) {
      var cx = CARD_X0 + i * (CARD_W + CARD_GAP);
      if (x >= cx - CARD_GAP / 2 && x <= cx + CARD_W + CARD_GAP / 2) return i;
    }
    return -1;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || over || readyT > 0) return;
    var c = cardAt(x, y);
    if (c < 0) { game.audio.tone(220, 0.04, { wave: 'triangle', volume: 0.04 }); return; }
    var res = answer(c);
    if (res === 'ok') game.audio.tone(1568, 0.08, { wave: 'square', volume: 0.08 });
    else if (res === 'none') { cardLift[c] = 0.12; game.audio.play('se_tap', 0.15); }
  });
  game.onTap(function(x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function bloom(x, y, r, col, a) {
    game.draw.circle(x, y, r * 2.4, col, a * 0.08);
    game.draw.circle(x, y, r * 1.7, col, a * 0.16);
    game.draw.circle(x, y, r * 1.25, col, a * 0.3);
    game.draw.circle(x, y, r, col, a);
  }

  var SPARK = ['...y...', '...y...', '..yYy..', 'yyYWYyy', '..yYy..', '...y...', '...y...'];
  var SPAL = { y: '#ffd76a', Y: '#fff1b0', W: '#ffffff' };
  var KID = [
    '.....rrrrrr.....', '....rrrrrrRR....', '...rrrrrrrrRR...', '...wwwwwwwwww...', '...ffffffffff...', '...fkkfffkkfF...',
    '...ffffffffFF...', '....fpfffpfF....', '.....ffmmff.....', '....ssssssss....', '...ssssssssSS...', '..ccccccccccCC..',
    '..ccccccccccCC..', '.ccccccccccccCC.', '.fcccccccccccCf.', '..cccccccccccC..', '..cccccccccccC..', '...nnnn..nnnn...',
    '...nnnn..nnnn...', '..bbbbb..bbbbb..',
  ];
  function variant(base, rows) { var o = base.slice(); for (var k in rows) o[+k] = rows[k]; return o; }
  var KID_FLUTTER = variant(KID, { 10: '...ssssssssSSs..' });
  var KID_BLINK = variant(KID, { 5: '...fhhfffhhfF...' });
  var KID_UP = variant(KID, { 8: '.....ffoof......', 13: '.ccccccccccccCC.', 14: '..cccccccccccC..' });
  var KID_SHOCK = variant(KID, { 5: '...fWkfffWkfF...', 8: '.....fooof......' });
  var KID_FRAMES = [KID, KID_FLUTTER, KID, KID_BLINK];
  var KPAL = { r: '#e0503e', R: '#ff8a6a', w: '#f4f0ff', f: '#f6c9a6', F: '#ffe3cc', k: '#1a1430', h: '#7a4a3a', p: '#ff9a9a', m: '#c0404a', o: '#3a1a20', W: '#ffffff', s: '#ffd040', S: '#fff0a0', c: '#3a6ad0', C: '#7fb6ff', n: '#2a2a50', b: '#4a2a20' };
  var GUIDE = [
    '.....gggggg.....', '....gggggggG....', '....hhffffhh....', '....hfkffkfF....', '....hffffffF....', '.....ffmmfF.....',
    '......ffff......', '....oooooooo....', '...ooooooooOO...', '...ooooooooOO...', '..oooooooooOOf..', '..oooooooooOO...',
    '..oooooooooOO...', '..oooooooooOO...', '...oooooooOO....', '...nnn....nnn...', '...nnn....nnn...', '..bbbb....bbbb..',
  ];
  var GUIDE_B = variant(GUIDE, { 5: '.....ffoofF.....' });
  var GPAL = { g: '#2e8a6a', G: '#6ef0c8', h: '#3a2a20', f: '#e8b896', F: '#ffd8b8', k: '#1a1430', m: '#a03a3a', o: '#5a4a7a', O: '#8a7ab0', n: '#2a2440', b: '#3a2018' };

  function drawSky(t) {
    game.draw.gradient(0, H, [[0, C.night], [0.35, C.navy], [0.6, C.dusk], [1, '#1a1030']]);
    // 遠景: 小さな星(ゆっくり流れる)
    for (var i = 0; i < farStars.length; i++) {
      var fs = farStars[i];
      var fx = (fs[0] + t * 4 * fs[2]) % W;
      var tw = 0.35 + 0.35 * Math.sin(t * 1.3 + fs[3]);
      game.draw.rect(fx, fs[1], fs[2] * 3, fs[2] * 3, C.pale, tw);
    }
    // 月(光源)
    bloom(905, 360, 58, '#fff4c8', 0.95);
    game.draw.circle(890, 348, 14, '#e8dca8', 0.8);
    game.draw.circle(926, 380, 9, '#e8dca8', 0.7);
    // 中景: 丘のシルエット(月側の縁が明るい)
    for (var x = 0; x < W; x += 12) {
      var hy = 1010 - 60 * Math.sin(x * 0.006 + 0.8) - 30 * Math.sin(x * 0.017 + t * 0.05);
      game.draw.rect(x, hy, 12, 1120 - hy, C.hill);
      game.draw.rect(x, hy, 12, 4, '#3a4a8a', 0.8);
    }
    for (var x2 = 0; x2 < W; x2 += 10) {
      var hy2 = 1060 - 40 * Math.sin(x2 * 0.009 + 2.1);
      game.draw.rect(x2, hy2, 10, 1120 - hy2, C.hill2);
    }
    // ふもとの家の灯り
    for (var l = 0; l < 9; l++) game.draw.rect(80 + l * 110 + (l % 3) * 14, 1080 + (l % 2) * 14, 8, 8, '#ffcf6a', 0.55 + 0.25 * Math.sin(t * 2 + l));
  }

  function drawStars(t) {
    var r = Math.min(ROUNDS - 1, Math.floor(beatN / ROUND_BEATS));
    var rd = rounds[r];
    var list = [rd];
    if (r > 0 && rounds[r - 1].reveal > 0) list.push(rounds[r - 1]);
    for (var j = 0; j < list.length; j++) {
      var q = list[j];
      for (var s = 0; s < q.stars.length; s++) {
        var st = q.stars[s];
        var a = Math.max(st.lit > 0 ? st.lit : 0, q.reveal > 0 ? q.reveal * 0.9 : 0);
        if (a <= 0) continue;
        bloom(st.x, st.y, 20 + a * 10, q.res === 'miss' && q.reveal > 0 ? C.warm : C.star, 0.5 * a);
        game.draw.sprite(SPARK, SPAL, st.x, st.y, 9 + a * 5, { anchor: 'center', alpha: Math.min(1, a * 1.3) });
        if (st.lit > 0.85) game.draw.circle(st.x, st.y, 60 + (1 - st.lit) * 300, C.pale, 0.25 * st.lit);
      }
    }
  }

  // 1回=6拍の拍ランプ(合図・星・星・星・札・答え)
  function drawBeatRow(t) {
    var b = beatN % ROUND_BEATS;
    var y = H * 0.528;
    game.draw.rect(150, y - 44, W - 300, 88, C.ink, 0.45);
    for (var i = 0; i < ROUND_BEATS; i++) {
      var x = 210 + i * 132;
      var on = running && i === b ? Math.max(0, 1 - beatT / SPB) : 0;
      var col = i === 0 ? C.pale : (i <= 3 ? C.sky : C.star);
      var r = i === 5 ? 30 : (i === 0 ? 14 : 20);
      game.draw.circle(x, y, r + 6, C.ink, 0.6);
      if (i === 5) game.draw.rect(x - 18, y - 24, 36, 48, running && b >= 4 ? C.star : '#6a5a40');
      else game.draw.circle(x, y, r, col, 0.35 + on * 0.65);
      if (on > 0) bloom(x, y, r * 0.6, col, on * 0.6);
    }
  }

  function drawDeck(t) {
    // 近景: 屋上デッキ(ランタンと月で照らされる床板)
    game.draw.rect(0, 1120, W, 360, C.deck);
    for (var p = 0; p < 6; p++) game.draw.rect(0, 1130 + p * 58, W, 50, p % 2 ? C.deck : C.deck2);
    game.draw.circle(830, 1250, 260, '#ffb060', 0.08);
    game.draw.circle(830, 1250, 150, '#ffb060', 0.08);
    // 手すり
    game.draw.rect(0, 1112, W, 16, C.rail);
    game.draw.rect(0, 1112, W, 4, '#6a5a7a');
    for (var k = 0; k < 10; k++) game.draw.rect(30 + k * 112, 1112, 12, 70, C.rail);
    // 望遠鏡(三脚 + 筒)
    var tx = 190, ty = 1280;
    game.draw.line(tx, ty - 90, tx - 70, ty + 60, '#20202c', 10);
    game.draw.line(tx, ty - 90, tx + 70, ty + 60, '#20202c', 10);
    game.draw.line(tx, ty - 90, tx, ty + 70, '#20202c', 10);
    game.draw.line(tx - 90, ty - 40, tx + 110, ty - 210, '#c8ccd8', 36);
    game.draw.line(tx - 90, ty - 40, tx + 110, ty - 210, '#eef0f8', 10);
    game.draw.circle(tx + 110, ty - 210, 20, '#7fb6ff', 0.6);
    // 案内係(ランタン)
    var gy = 1235 + Math.sin(t * 2.2) * 3;
    var spk = beatN % ROUND_BEATS === 0 && running && beatT < SPB * 0.5;
    game.draw.sprite(spk ? GUIDE_B : GUIDE, GPAL, 830, gy, 11, { anchor: 'center' });
    var lx = 920 + Math.sin(t * 2.6) * 8, ly = gy + 20;
    game.draw.line(912, gy - 10, lx, ly - 30, '#30202a', 4);
    bloom(lx, ly, 18, '#ffbf60', 0.9);
    // 見学の子
    var stop = hitStop > 0;
    var fr = KID_FRAMES[Math.floor(t * 4) % 4];
    var spr = shockT > 0 ? KID_SHOCK : (raiseT > 0 ? KID_UP : fr);
    var ky = 1250 + (stop ? 0 : Math.sin(t * 3) * 3);
    if (shockT > 0) {
      var k2 = shockT / HIT_STOP;
      game.draw.circle(530, ky, 140 + (1 - k2) * 80, '#ffffff', 0.5 * k2);
    }
    game.draw.sprite(spr, KPAL, 530, ky, shockT > 0 ? 12 : 11, { anchor: 'center' });
    if (raiseT > 0 && raiseCard >= 0) {
      var cy = ky - 210 - (1 - Math.min(1, raiseT / 0.3)) * 10;
      game.draw.rect(468, ky - 130, 16, 70, '#3a6ad0');
      game.draw.rect(578, ky - 130, 16, 70, '#3a6ad0');
      game.draw.rect(470, cy - 70, 122, 120, C.cardEdge);
      game.draw.rect(476, cy - 64, 110, 108, C.card);
      label('' + (raiseCard + 1), 531, cy + 26, 76, '#3a2a10');
    }
  }

  function drawCards(t) {
    game.draw.rect(0, H * 0.765, W, H * 0.235, '#120c22');
    game.draw.rect(0, H * 0.765, W, 6, '#3a2f5a');
    var r = Math.min(ROUNDS - 1, Math.floor(beatN / ROUND_BEATS));
    var b = beatN % ROUND_BEATS;
    var lead = (5 - b) * SPB - beatT;
    var glow = running && !over && !rounds[r].res && b >= 3 && lead <= 0.65 && lead > -GOOD_W;
    for (var i = 0; i < 6; i++) {
      var x = CARD_X0 + i * (CARD_W + CARD_GAP);
      var lift = cardLift[i] > 0 ? cardLift[i] * 120 : 0;
      var y = CARD_Y - lift + (glow ? -8 - 6 * Math.sin(t * 16) : 0);
      if (glow) game.draw.rect(x - 8, y - 8, CARD_W + 16, CARD_H + 16, C.star, 0.35 + 0.25 * Math.sin(t * 16));
      if (cardFlash[i] > 0) game.draw.rect(x - 14, y - 14, CARD_W + 28, CARD_H + 28, C.mint, 0.7 * cardFlash[i]);
      game.draw.rect(x + 6, y + 10, CARD_W, CARD_H, C.ink, 0.5);
      game.draw.rect(x, y, CARD_W, CARD_H, C.cardEdge);
      game.draw.rect(x + 6, y + 6, CARD_W - 12, CARD_H - 12, C.card);
      game.draw.rect(x + CARD_W - 20, y + 6, 14, CARD_H - 12, '#fffbea');
      label('' + (i + 1), x + CARD_W / 2, y + 112, 92, '#3a2a10');
      // 星の数の点
      for (var d = 0; d <= i; d++) {
        var px = x + 26 + (d % 3) * 48, py = y + 150 + Math.floor(d / 3) * 34;
        game.draw.sprite(SPARK, SPAL, px + 24, py + 12, 3, { anchor: 'center' });
      }
    }
  }

  function drawMetronome(t, x, y) {
    var warn = warnT > 0 && Math.floor(t * 12) % 2 === 0;
    game.draw.rect(x - 36, y - 70, 72, 110, warn ? C.red : '#4a3a6a');
    game.draw.rect(x - 28, y - 62, 56, 94, warn ? '#ff9aa8' : '#2a2050');
    var ph = running ? (beatN % 2 === 0 ? 1 : -1) * Math.cos(Math.PI * beatT / SPB) : Math.sin(t * 3);
    var ex = x + ph * 26, ey = y - 50;
    game.draw.line(x, y + 26, ex, ey, C.pale, 5);
    game.draw.circle(ex + (x - ex) * 0.35, ey + (y + 26 - ey) * 0.35, 8, C.star);
    if (speedFlash > 0) bloom(x, y - 20, 30, C.warm, speedFlash * 0.6);
  }

  function drawHud(t) {
    game.draw.rect(0, 0, W, 230, C.ink, 0.78);
    game.draw.rect(0, 226, W, 4, '#3a3170');
    label('SCORE ' + score, 60, 98, 50, C.pale, 'left');
    label('BEST ' + prevBest, 60, 168, 30, C.sky, 'left');
    var r = Math.min(ROUNDS, Math.floor(beatN / ROUND_BEATS) + 1);
    label(r + ' / ' + ROUNDS, W - 60, 98, 52, C.star, 'right');
    for (var m = 0; m < MISS_MAX; m++) bloom(W - 200 + m * 70, 160, 15, m < misses ? C.red : '#3a3a6a', 0.9);
    drawMetronome(t, W * 0.6, 120);
    var ri = Math.min(ROUNDS - 1, Math.floor(beatN / ROUND_BEATS));
    label(SPEED_LABEL[ri], W * 0.6 + 60, 140, 34, warnT > 0 ? C.red : C.warm, 'left');
    var progress = Math.min(1, beatN / (ROUNDS * ROUND_BEATS));
    game.draw.rect(0, 222, W * progress, 6, C.sky);
  }

  function drawScene(t) {
    drawSky(t);
    drawStars(t);
    drawBeatRow(t);
    drawDeck(t);
    drawCards(t);
  }

  // ---- ATTRACT: 実ロジックで 星を数えて正しい札(PERFECT)→数え違いでMISS(答え合わせの再生)→加速して正解 ----
  var demo = { t: 0, hx: W / 2, hy: CARD_Y + 120, press: false };
  var DEMO_LEN = ROUND_BEATS * (60 / 104) * 2 + ROUND_BEATS * (60 / 130) + 0.8;
  var demoTapped = [];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demoTapped = []; }
    stepPlay(dt);
    var r = Math.min(ROUNDS - 1, Math.floor(beatN / ROUND_BEATS)), b = beatN % ROUND_BEATS;
    var rd = rounds[r];
    var seen = 0;
    for (var k = 1; k <= 3 && k <= b; k++) seen += rd.counts[k - 1];
    var wrong = r === 1;
    var target = Math.max(0, (wrong && b >= 3 ? seen - 1 : seen) - 1);
    if (!demoTapped[r] && b === 5) {
      demoTapped[r] = true;
      answer(target);
      demo.press = true;
    }
    if (b !== 5 || beatT > 0.2) demo.press = false;
    var tx = CARD_X0 + target * (CARD_W + CARD_GAP) + CARD_W / 2, ty = CARD_Y + (demo.press ? 90 : 150);
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 10);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (shockT > 0) shockT -= dt;
    if (raiseT > 0) raiseT -= dt;
    if (speedFlash > 0) speedFlash -= dt * 1.5;
    if (warnT > 0) warnT -= dt;
    for (var i = 0; i < 6; i++) { if (cardLift[i] > 0) cardLift[i] -= dt; if (cardFlash[i] > 0) cardFlash[i] -= dt * 1.2; }

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.78);
      label(GAME_TITLE, W / 2, 112, 86 + Math.sin(t * 3) * 3, C.star);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 34, C.sky);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.985 - 20, 44, C.star);
      else label('TAP TO START', W / 2, H * 0.985 - 20, 40, C.pale);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      game.draw.rect(60, H * 0.15, W - 120, H * 0.33, C.ink, 0.86);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.21, 100, won ? C.star : C.red);
      label('SCORE ' + score, W / 2, H * 0.265, 58, C.pale);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.31, 34, C.sky);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.36, 52, C.star);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.36, 40, C.sky);
      if (!won) label('あと' + Math.max(1, NEEDED - corrects) + '問!', W / 2, H * 0.415, 50, C.warm);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.455, 36, C.pale);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, correct: corrects, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT + 1) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.star);
    if (over && won) label('FINISH', W / 2, H * 0.36, 100, C.star);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
