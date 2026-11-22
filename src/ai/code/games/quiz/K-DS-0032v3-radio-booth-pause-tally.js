// K-DS-0032v3-radio-booth-pause-tally.js
// 収録ブースの間かぞえ — ガラス越しの話し手が1小節しゃべる間に挟まる相槌の合図(緑のランプ)を数え、話し終わった直後の拍から同じ数だけ拍の頭でカウンターを叩いて記録する
// 操作: 1回は2小節。1小節目は話し手が8分で話し、ところどころで言葉を切って卓の緑ランプが「ポン」と灯る(相槌の合図)。その数を数える。2小節目は自分の番(1拍半前から自分のマイクの赤ランプが点滅)で、1拍目の頭から合図の数だけ1拍に1回ずつ下の丸いカウンターを押し、数え終わったら止める。押すたびに拍の頭からのずれでPERFECT/GOOD。数が足りない・多すぎる・1拍目に遅れる・拍から外れた押しはMISS。3回目からは数えない赤い呼び出しランプ(ブザー音)が混ざる
// 終わり: 4回(128BPM・8小節・約15秒)を答え終えて MISS 1回以内ならCLEAR(判定の点+正しく数えたボーナス)。MISS 2回でGAME OVER
// @mechanic: counting
// @theme: radio_booth_pause_tally
// 世界観: ラジオ局の収録ブースで、新人アシスタントがガラス越しの話し手の語りに挟まる相槌の合図を数え、話し終わった直後の拍から同じ数だけカウンターを押して間の数を記録する
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・正しく数えた回数
// スタイル: 2010s FLAT MOBILE
var STYLE = { bg: ['#f4efe6', '#2b3a55'], main: ['#ff8a4c', '#06d6a0', '#3d5a80'], accent: ['#ffd166', '#ef476f'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影もグラデも使わないベタ塗り・丸角・大きい余白。判定はUIの色変化で返す
  var C = {
    orange: STYLE.main[0], green: STYLE.main[1], navy: STYLE.main[2], yellow: STYLE.accent[0], red: STYLE.accent[1],
    cream: STYLE.bg[0], desk: STYLE.bg[1], white: '#ffffff', glass: '#cde7f0', glass2: '#b5dbe8',
    skin: '#f6c7a1', hair: '#4a3b52', hair2: '#e07a3f', grey: '#c9cfd8', ink: '#22283a', dim: '#5d6b88'
  };

  var GAME_TITLE = 'TALLY BOOTH';
  var BPM = 128;
  var SPB = 60 / BPM;          // 1拍 ≒ 0.469秒
  var HALF = SPB / 2;
  var ROUND_BEATS = 8;         // 話す1小節 + 答える1小節
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var MISS_MAX = 2;
  var HIT_STOP = 0.45;

  // cues = 相槌の合図(数える)、decoys = 呼び出しランプ(数えない)。位置は小節内の拍(0〜3.5の8分刻み)
  var PLANS = [
    [{ cues: [1, 3], decoys: [] }, { cues: [0.5, 2, 3], decoys: [] }, { cues: [1.5, 2.5], decoys: [1, 3] }, { cues: [0.5, 1.5, 2, 3.5], decoys: [3] }],
    [{ cues: [0, 2, 3], decoys: [] }, { cues: [1, 2.5], decoys: [] }, { cues: [0.5, 1.5, 3], decoys: [2] }, { cues: [1, 1.5, 2.5, 3.5], decoys: [0.5] }]
  ];
  var DEMO_PLAN = [{ cues: [1, 2.5], decoys: [] }, { cues: [0.5, 1.5, 3], decoys: [] }];

  // 伴奏(オリジナルのジングル)。話す小節は控えめ、答える小節は同じ和音で明るく返す
  var CALL_MEL = [['E4', 1], ['R', 1], ['G4', 1], ['R', 1]];
  var CALL_BASS = [
    [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]], [['A2', 1], ['E2', 1], ['A2', 1], ['E2', 1]],
    [['F2', 1], ['C3', 1], ['F2', 1], ['C3', 1]], [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1]]
  ];
  var RESP_MEL = [
    [['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1]],
    [['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 1]],
    [['F4', 0.5], ['A4', 0.5], ['C5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1]],
    [['G4', 0.5], ['B4', 0.5], ['D5', 1], ['F5', 0.5], ['E5', 0.5], ['C5', 1]]
  ];
  var VOICE = [233, 262, 208, 294, 247, 220, 277, 196];

  // ---- 配置 ----
  var HOST_X = W * 0.5, HOST_Y = H * 0.27;
  var CUE_X = 420, LAMP_Y = H * 0.505, DECOY_X = 640, ONAIR_X = 900;
  var DOT_Y = H * 0.585;
  var SLOT_Y = H * 0.665;
  var BTN_X = W / 2, BTN_Y = H * 0.865, BTN_R = 176;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var soundOn = false; // 最初の入力までは音を積まない

  var demoMode, rounds, running, slotN, songT, clockT, nextBar, readyT, totalBeats;
  var hitStop, flashT, flashKind, cueT, decoyT, talkT, nodT, btnT, beatFlash, revealT, revealRound;
  var score, perfects, goods, misses, counted, streak, maxStreak, over, won, outroT, prevBest, milestone;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    var src = isDemo ? DEMO_PLAN : PLANS[Math.floor(game.random(0, PLANS.length)) % PLANS.length];
    rounds = [];
    for (var i = 0; i < src.length; i++) {
      rounds.push({ start: i * ROUND_BEATS, cues: src[i].cues, decoys: src[i].decoys, n: src[i].cues.length, taps: 0, marks: [], res: '', warned: false });
    }
    totalBeats = rounds.length * ROUND_BEATS;
    running = false; slotN = -1; songT = 0; clockT = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0; flashKind = ''; cueT = 0; decoyT = 0; talkT = 0; nodT = 0; btnT = 0; beatFlash = 0;
    revealT = 0; revealRound = -1;
    score = 0; perfects = 0; goods = 0; misses = 0; counted = 0; streak = 0; maxStreak = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) running = true;
  }

  function vol() { return demoMode ? 0.45 : 1; }
  function beep(f, d, o) { if (soundOn) game.audio.tone(f, d, o); }

  function playBar(b) {
    if (!soundOn) return;
    var r = Math.floor(b / 2) % 4;
    if (b % 2 === 0) {
      game.audio.melody(CALL_MEL, { tempo: BPM, wave: 'triangle', volume: 0.03 * vol(), bass: CALL_BASS[r], bassWave: 'triangle', bassVolume: 0.06 * vol() });
    } else {
      game.audio.melody(RESP_MEL[r], { tempo: BPM, wave: 'square', volume: 0.028 * vol(), bass: CALL_BASS[r], bassWave: 'triangle', bassVolume: 0.06 * vol() });
    }
  }

  function roundAt(beat) {
    var r = Math.floor(beat / ROUND_BEATS);
    return r >= 0 && r < rounds.length ? rounds[r] : null;
  }
  function respStart(rd) { return (rd.start + 4) * SPB; }

  // ---- 拍クロック(8分の刻みも同じ1本から)----
  function onSlot(s) {
    var beat = s / 2;
    if (beat >= totalBeats) return;
    var rd = roundAt(Math.floor(beat));
    var inRound = beat - rd.start;
    if (s % 2 === 0) {
      beatFlash = 1;
      beep(inRound % 4 === 0 ? 1760 : 1320, 0.02, { wave: 'triangle', volume: 0.03 * vol() });
    }
    if (inRound < 4) {
      if (rd.cues.indexOf(inRound) >= 0) {
        // 言葉を切る間: 緑の相槌ランプ「ポン」
        cueT = 0.3; talkT = 0; nodT = 0.25;
        beep(1047, 0.09, { wave: 'sine', volume: 0.14 * vol() });
        beep(1568, 0.12, { wave: 'sine', volume: 0.08 * vol() });
      } else {
        if (rd.decoys.indexOf(inRound) >= 0) {
          // 呼び出しランプ(おとり)は赤とブザー。話は続く
          decoyT = 0.3;
          beep(330, 0.06, { wave: 'square', volume: 0.05 * vol() });
          beep(311, 0.06, { wave: 'square', volume: 0.04 * vol() });
        }
        talkT = HALF * 0.9;
        beep(VOICE[(s * 3) % VOICE.length], 0.08, { wave: 'sawtooth', volume: 0.03 * vol(), slide: -40 });
      }
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    clockT += dt;
    songT = clockT;
    var s = Math.floor(songT / HALF + 1e-6);
    while (slotN < s) { slotN++; onSlot(slotN); }
    while (nextBar < rounds.length * 2 && songT >= nextBar * 4 * SPB - 0.06) { playBar(nextBar); nextBar++; }
    for (var i = 0; i < rounds.length; i++) {
      var rd = rounds[i];
      var rs = respStart(rd);
      if (!rd.warned && songT >= rs - SPB * 1.5) {
        rd.warned = true;
        beep(660, 0.16, { wave: 'sine', volume: 0.07 * vol(), slide: 440 });
      }
      if (rd.res === '' || rd.res === 'ok') {
        if (rd.res === '' && rd.taps < rd.n && songT > rs + rd.taps * SPB + GOOD_W) {
          missRound(rd, 'short');
        } else if (rd.res === '' && rd.taps === rd.n && songT > rs + rd.n * SPB + GOOD_W) {
          rd.res = 'ok'; counted++; streak++;
          if (streak > maxStreak) maxStreak = streak;
          score += 150 + rd.n * 20;
          revealRound = i; revealT = 1.4;
          game.feedback.good(BTN_X, SLOT_Y - 120, { text: 'NICE', color: C.green, size: 58, count: 14, volume: soundOn ? 0.3 : 0.001 });
          if (!demoMode && !milestone && counted === 2) {
            milestone = true;
            game.audio.play('se_milestone', 0.45);
            game.fx.popup(counted + ' / ' + rounds.length, W / 2, H * 0.36, { color: C.orange, size: 84 });
          }
        }
      }
    }
    if (!demoMode && !over && songT >= totalBeats * SPB + GOOD_W + 0.05) finish(misses < MISS_MAX);
  }

  // ---- 判定 ----
  function press() {
    btnT = 0.12;
    if (!running || over || hitStop > 0) return 'none';
    var rd = null;
    for (var i = 0; i < rounds.length; i++) {
      var rs = respStart(rounds[i]);
      if (songT >= rs - GOOD_W && songT <= rs + 4 * SPB + GOOD_W) { rd = rounds[i]; break; }
    }
    if (!rd || (rd.res !== '' && rd.res !== 'ok')) return 'none';
    var rel = songT - respStart(rd);
    var k = Math.round(rel / SPB);
    var d = rel - k * SPB;
    if (rd.taps >= rd.n) { rd.marks.push('over'); missRound(rd, 'over'); return 'miss'; }
    if (Math.abs(d) > GOOD_W || k !== rd.taps) { rd.marks.push('off'); missRound(rd, k > rd.taps ? 'late' : 'off'); return 'miss'; }
    rd.taps++;
    var sx = slotX(rd.taps - 1);
    if (Math.abs(d) <= PERFECT_W) {
      rd.marks.push('perfect'); perfects++; score += 100;
      game.feedback.good(sx, SLOT_Y - 100, { text: 'PERFECT', color: C.orange, size: 44, count: 10, volume: soundOn ? 0.22 : 0.001 });
    } else {
      rd.marks.push('good'); goods++; score += 50;
      game.feedback.good(sx, SLOT_Y - 100, { text: 'GOOD', color: C.navy, size: 40, count: 6, volume: soundOn ? 0.18 : 0.001 });
    }
    beep(880 * Math.pow(1.12, rd.taps), 0.05, { wave: 'square', volume: 0.08 });
    return 'ok';
  }

  function missRound(rd, kind) {
    if (rd.res === 'ok') { counted--; score = Math.max(0, score - 150 - rd.n * 20); }
    rd.res = kind;
    misses++; streak = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP; flashKind = kind;
    revealRound = rounds.indexOf(rd); revealT = 1.4;
    var fx = slotX(Math.min(3, Math.max(0, kind === 'short' ? rd.taps : rd.marks.length - 1)));
    game.feedback.bad(fx, SLOT_Y, { text: 'MISS', shake: demoMode ? 4 : 10, volume: soundOn ? 0.5 : 0.001 });
    if (kind === 'short') game.fx.popup('あと' + (rd.n - rd.taps) + '回', fx, SLOT_Y - 150, { color: C.red, size: 54 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += counted * 40 + maxStreak * 30;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(160, 920), game.random(400, 1200), { color: i % 2 ? C.orange : C.green, count: 18, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, H * 0.22, { color: C.orange, size: 72 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    soundOn = true;
    if (state !== S.PLAYING || over) return;
    var r = press();
    if (r === 'none') game.audio.play('se_tap', 0.25);
  });
  game.onTap(function(x, y) {
    soundOn = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- スプライト ----
  function rowsWith(src, map) {
    var out = [];
    for (var i = 0; i < src.length; i++) out.push(map.hasOwnProperty(i) ? map[i] : src[i]);
    return out;
  }
  var HOST = [
    '....hhhhhh....', '...hhhhhhhh...', '..phhhhhhhhp..', '..pffffffffp..', '.ppfkffffkfpp.', '.ppffffffffpp.',
    '..pfffllfffp..', '...ffffffff...', '....oooooo....', '..oooooooooo..', '.oooooooooooo.', '.oooooooooooo.'
  ];
  var HOST_TALK = rowsWith(HOST, { 6: '..pfffMMfffp..', 7: '...fffMMfff...' });
  var HOST_NOD = rowsWith(HOST, { 4: '.ppffffffffpp.', 5: '.ppfkffffkfpp.' });
  var HPAL = { h: C.hair, p: C.ink, f: C.skin, k: C.ink, l: C.dim, M: C.red, o: C.orange };

  var KID = [
    '...hhhhhh...', '..hhhhhhhh..', '.phhhhhhhhp.', '.pffffffffp.', 'ppfkffffkfpp', 'ppffffffffpp',
    '.pfffllfffp.', '..ffffffff..', '...gggggg...', '.gggggggggg.', 'gggggggggggg'
  ];
  var KID_JOY = rowsWith(KID, { 4: 'ppfkkffkkfpp', 6: '.pffMMMMffp.' });
  var KID_OOPS = rowsWith(KID, { 4: 'ppkkffffkkpp', 6: '.pfffMMfffp.' });
  var KPAL = { h: C.hair2, p: C.ink, f: C.skin, k: C.ink, l: C.dim, M: C.red, g: C.green };

  // ---- 描画ヘルパー(丸角ベタ塗り)----
  function rr(x, y, w, h, r, col, a) {
    var al = a === undefined ? 1 : a;
    game.draw.rect(x + r, y, w - 2 * r, h, col, al);
    game.draw.rect(x, y + r, r, h - 2 * r, col, al);
    game.draw.rect(x + w - r, y + r, r, h - 2 * r, col, al);
    game.draw.circle(x + r, y + r, r, col, al);
    game.draw.circle(x + w - r, y + r, r, col, al);
    game.draw.circle(x + r, y + h - r, r, col, al);
    game.draw.circle(x + w - r, y + h - r, r, col, al);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function slotX(i) { return 270 + i * 180; }

  function curRound() {
    var b = Math.floor(songT / SPB);
    return roundAt(Math.min(totalBeats - 1, Math.max(0, b)));
  }

  function drawBooth(t) {
    // ベタ塗り2色(壁/卓)。グラデはかけずに境目をそろえる
    game.draw.gradient(0, H, [[0, C.cream], [0.47, C.cream], [0.47, C.desk], [1, C.desk]]);
    // 防音壁の丸い吸音パネル
    for (var i = 0; i < 6; i++) for (var j = 0; j < 2; j++) game.draw.circle(110 + i * 172, 290 + j * 520, 30, C.grey, 0.5);
    // ガラス窓
    rr(110, 330, W - 220, 520, 48, C.navy);
    rr(126, 346, W - 252, 488, 38, C.glass);
    game.draw.rect(170, 380, 40, 400, C.glass2);
    game.draw.rect(240, 380, 18, 400, C.glass2);
    // 話し手
    var rd = curRound();
    var calling = running && rd && (songT / SPB - rd.start) < 4;
    var bob = calling ? Math.sin(t * 12) * 3 : Math.sin(t * 2) * 3;
    var spr = HOST;
    if (nodT > 0) spr = HOST_NOD;
    else if (talkT > 0) spr = HOST_TALK;
    game.draw.sprite(spr, HPAL, HOST_X - 60, HOST_Y + 140 + bob, 16, { anchor: 'center' });
    // ヘッドホンのバンド
    game.draw.rect(HOST_X - 60 - 96, HOST_Y + 30 + bob, 192, 14, C.ink);
    game.draw.rect(HOST_X - 60 - 96, HOST_Y + 30 + bob, 14, 50, C.ink);
    game.draw.rect(HOST_X - 60 + 82, HOST_Y + 30 + bob, 14, 50, C.ink);
    // マイク
    game.draw.rect(HOST_X + 120, HOST_Y + 120, 14, 130, C.dim);
    rr(HOST_X + 92, HOST_Y + 40, 70, 110, 35, C.ink);
    game.draw.rect(HOST_X + 100, HOST_Y + 70, 54, 6, C.dim);
    game.draw.rect(HOST_X + 100, HOST_Y + 90, 54, 6, C.dim);
    // 机
    rr(150, 760, W - 300, 60, 20, C.orange);
    // 吹き出し: 話している間は音の波、間では消える
    if (talkT > 0) {
      var bx = 260, by = 420;
      rr(bx - 110, by - 60, 220, 120, 40, C.white);
      game.draw.circle(bx + 70, by + 70, 18, C.white);
      game.draw.circle(bx + 110, by + 100, 10, C.white);
      for (var w = 0; w < 5; w++) {
        var hh = 16 + Math.abs(Math.sin(t * 18 + w * 1.7)) * 44;
        rr(bx - 80 + w * 34, by - hh / 2, 20, hh, 10, C.orange);
      }
    }
  }

  function drawConsole(t) {
    rr(60, LAMP_Y - 130, W - 120, 260, 44, C.navy);
    // 自分(新人アシスタント)
    var kid = KID;
    if (flashT > 0 && hitStop > 0) kid = KID_OOPS;
    else if (revealT > 0 && revealRound >= 0 && rounds[revealRound].res === 'ok') kid = KID_JOY;
    if (over && state !== S.ATTRACT) kid = won ? KID_JOY : KID_OOPS;
    var kb = running ? -Math.max(0, beatFlash) * 8 : Math.sin(t * 3) * 3;
    game.draw.sprite(kid, KPAL, 170, LAMP_Y + 6 + kb, 13, { anchor: 'center' });
    game.draw.rect(170 - 90, LAMP_Y - 74 + kb, 180, 14, C.ink);
    // 相槌の合図ランプ(緑)
    var on = cueT > 0;
    if (on) game.draw.circle(CUE_X, LAMP_Y, 100, C.green, 0.3);
    game.draw.circle(CUE_X, LAMP_Y, 78, on ? C.green : C.dim);
    game.draw.circle(CUE_X, LAMP_Y - 12, 24, on ? C.white : C.grey);
    game.draw.line(CUE_X - 26, LAMP_Y + 26, CUE_X, LAMP_Y + 46, on ? C.white : C.grey, 10);
    game.draw.line(CUE_X + 26, LAMP_Y + 26, CUE_X, LAMP_Y + 46, on ? C.white : C.grey, 10);
    // 呼び出しランプ(赤・数えない)
    var don = decoyT > 0;
    if (don) game.draw.circle(DECOY_X, LAMP_Y, 80, C.red, 0.3);
    game.draw.circle(DECOY_X, LAMP_Y, 58, don ? C.red : C.dim);
    rr(DECOY_X - 30, LAMP_Y - 10, 60, 20, 10, don ? C.white : C.grey);
    game.draw.rect(DECOY_X - 30, LAMP_Y - 22, 14, 26, don ? C.white : C.grey);
    game.draw.rect(DECOY_X + 16, LAMP_Y - 22, 14, 26, don ? C.white : C.grey);
    // 自分のマイクのオンエアランプ(答える小節の1拍半前から点滅)
    var rd = curRound();
    var lit = false, warn = false;
    if (running && rd) {
      var rel = songT - respStart(rd);
      if (rel >= -GOOD_W && rel < 4 * SPB) lit = true;
      else if (rel >= -SPB * 1.5 && rel < 0) warn = Math.floor(t * 10) % 2 === 0;
    }
    game.draw.rect(ONAIR_X - 8, LAMP_Y - 10, 16, 110, C.dim);
    rr(ONAIR_X - 40, LAMP_Y - 110, 80, 120, 40, C.ink);
    if (lit || warn) game.draw.circle(ONAIR_X, LAMP_Y - 150, 54, C.red, 0.3);
    game.draw.circle(ONAIR_X, LAMP_Y - 150, 34, lit || warn ? C.red : C.dim);
  }

  // 拍のドット: 話す4拍(橙)+答える4拍(緑)
  function drawDots(t) {
    var rd = curRound();
    var bi = running ? songT / SPB - (rd ? rd.start : 0) : -1;
    for (var i = 0; i < 8; i++) {
      var x = 150 + i * 105 + (i >= 4 ? 30 : 0);
      var cur = running && Math.floor(bi) === i;
      var col = i < 4 ? C.orange : C.green;
      var r = cur ? 26 + beatFlash * 8 : 18;
      game.draw.circle(x, DOT_Y, r, col, cur ? 1 : 0.35);
    }
    game.draw.rect(W / 2 + 12, DOT_Y - 34, 8, 68, C.white, 0.4);
  }

  // 記録カード: 押した数だけ線が入る4つの枠
  function drawCard(t) {
    rr(110, SLOT_Y - 120, W - 220, 240, 36, C.white);
    var rd = curRound();
    if (revealRound >= 0 && revealT > 0) rd = rounds[revealRound];
    var stop = flashT > 0 && hitStop > 0;
    var active = running && rd && (songT - respStart(rd)) >= -SPB * 1.5 && (songT - respStart(rd)) < 4 * SPB + GOOD_W;
    for (var i = 0; i < 4; i++) {
      var x = slotX(i);
      var m = rd ? rd.marks[i] : null;
      var col = C.cream;
      if (m === 'perfect') col = C.orange;
      else if (m === 'good') col = C.yellow;
      else if (m === 'over' || m === 'off') col = C.red;
      var big = stop && rd && ((flashKind === 'short' && i === rd.taps) || (flashKind !== 'short' && i === rd.marks.length - 1));
      var sz = big ? 150 + (flashT / HIT_STOP) * 40 : 130;
      if (big) rr(x - sz / 2 - 10, SLOT_Y - sz / 2 - 10, sz + 20, sz + 20, 34, C.white);
      rr(x - sz / 2, SLOT_Y - sz / 2, sz, sz, 28, big ? C.red : col);
      if (m) {
        game.draw.line(x - 30, SLOT_Y + 40, x + 30, SLOT_Y - 40, C.white, 16);
      }
      if (active && rd && rd.res === '' && i === rd.taps) {
        var pulse = 0.5 + 0.5 * Math.sin(t * 16);
        game.draw.circle(x, SLOT_Y + 82, 9 + pulse * 4, C.navy);
      }
    }
    // 答え合わせ: 正しい数を緑の点で見せる
    if (revealRound >= 0 && revealT > 0) {
      var rr2 = rounds[revealRound];
      for (var j = 0; j < rr2.n; j++) game.draw.circle(slotX(j), SLOT_Y - 86, 12, C.green);
    }
  }

  function drawButton(t) {
    var rd = curRound();
    var live = running && rd && rd.res === '' && (songT - respStart(rd)) >= -GOOD_W && (songT - respStart(rd)) < 4 * SPB;
    var pr = btnT > 0 ? 14 : 0;
    if (live) game.draw.circle(BTN_X, BTN_Y, BTN_R + 26 + beatFlash * 16, C.green, 0.35);
    game.draw.circle(BTN_X, BTN_Y, BTN_R - pr, live ? C.green : C.navy);
    game.draw.circle(BTN_X, BTN_Y, BTN_R - 40 - pr, C.white);
    var shown = rd ? rd.taps : 0;
    label('' + shown, BTN_X, BTN_Y + 6, 150, live ? C.green : C.navy);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, C.navy);
    label('SCORE ' + score, 60, 80, 50, C.white, 'left');
    label('BEST ' + prevBest, 60, 154, 32, C.yellow, 'left');
    for (var i = 0; i < rounds.length; i++) {
      var rd = rounds[i];
      var col = rd.res === 'ok' ? C.green : (rd.res && rd.res !== 'ok' ? C.red : C.dim);
      rr(W - 380 + i * 84, 56, 64, 64, 20, col);
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 140 + m * 64, 166, 18, m < misses ? C.red : C.dim);
    var p = Math.max(0, Math.min(1, songT / (totalBeats * SPB)));
    rr(60, 196, W - 120, 14, 7, C.dim);
    if (p > 0.02) rr(60, 196, (W - 120) * p, 14, 7, C.orange);
  }

  function drawScene(t) {
    drawBooth(t);
    drawConsole(t);
    drawDots(t);
    drawCard(t);
    drawButton(t);
  }

  // ---- ATTRACT: 実ロジックで 2つ数えて2回押す(PERFECT/GOOD→NICE)→3つなのに2回で止める(MISS) ----
  var demo = { t: 0, hx: BTN_X + 80, hy: BTN_Y + 40, press: false, done: [] };
  var DEMO_LEN = DEMO_PLAN.length * ROUND_BEATS * SPB + 1.0;
  var DEMO_PRESS = [4 * SPB, 5 * SPB + 0.09, 12 * SPB + 0.02, 13 * SPB];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.done = []; demo.press = false; }
    var nt = songT + dt;
    for (var i = 0; i < DEMO_PRESS.length; i++) {
      if (demo.done[i] || nt < DEMO_PRESS[i]) continue;
      demo.done[i] = true; demo.press = true; demo.upAt = DEMO_PRESS[i] + 0.14;
      press();
    }
    if (demo.press && songT > demo.upAt) demo.press = false;
    stepPlay(dt);
    var tx = demo.press ? BTN_X + 10 : BTN_X + 90, ty = demo.press ? BTN_Y - 10 : BTN_Y + 60;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 18);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 18);
  }

  function tick(dt) {
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (cueT > 0) cueT -= dt;
    if (decoyT > 0) decoyT -= dt;
    if (talkT > 0) talkT -= dt;
    if (nodT > 0) nodT -= dt;
    if (btnT > 0) btnT -= dt;
    if (revealT > 0) revealT -= dt;
    if (beatFlash > 0) beatFlash = Math.max(0, beatFlash - dt * 4);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    tick(dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 226, C.navy);
      label(GAME_TITLE, W / 2, 92, 88 + Math.sin(t * 3) * 3, C.white);
      rr(W / 2 - 200, 140, 400, 8, 4, C.orange);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 186, 34, C.yellow);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.748, 46, C.yellow);
      else label('TAP TO START', W / 2, H * 0.748, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      rr(80, 260, W - 160, 560, 48, C.white);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 360, 96, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, 470, 60, C.ink);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 548, 34, C.navy);
      label(counted + ' / ' + rounds.length, W / 2, 626, 48, C.orange);
      if (won && score > prevBest) label('NEW RECORD', W / 2, 712, 54, C.orange);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 712, 42, C.navy);
      if (!won) label('あと' + Math.max(1, rounds.length - counted - (MISS_MAX - 1)) + '回!', W / 2, 780, 44, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.748, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, counted: counted, perfect: perfects, good: goods, miss: misses, rounds: rounds.length };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0.06 && nextBar === 0) { playBar(0); nextBar = 1; }
      if (readyT <= 0) running = true;
    } else {
      stepPlay(dt);
      if (!over && songT > totalBeats * SPB + 1) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.43, 110, C.orange);
    if (over && won) label('FINISH', W / 2, H * 0.43, 104, C.orange);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
