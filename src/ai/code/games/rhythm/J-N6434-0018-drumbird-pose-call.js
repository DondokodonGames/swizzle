// J-N6434-0018-drumbird-pose-call.js
// 太鼓鳥の掛け声ポーズ — 太鼓鳥が打つ掛け声の拍を聞き、その次に来る「決め」の拍でタップしてポーズを決める
// 操作: 太鼓鳥が3回(または短く2回半)打ったら、光の輪が踊り手に重なる決めの拍でタップ。拍からのズレでPERFECT/GOOD/MISS
// 終わり: 全小節を終えて決めの成功が規定数以上ならCLEAR。MISSが重なり規定数に届かなくなればGAME OVER
// @mechanic: rhythm
// @theme: desert_fiesta_call_and_pose
// 世界観: 砂漠の夜祭りで、サボテン踊りの見習いが太鼓鳥の掛け声の拍を聞き分け、決めの拍ぴったりに見得を切って一座の本舞台入りを勝ち取る
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めの成功数とPERFECT数・最大コンボ
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色 + 白縁、明るい背景、光の柱と祝祭演出
  var STYLE = { bg: ['#ffcf3a', '#ff7a3a', '#ff3a7a'], main: ['#ffffff', '#2ac86a'], accent: ['#2a8aff', '#ff2a4a'] };
  var C = {
    sky1: '#ff3a7a', sky2: '#ff7a3a', sky3: '#ffcf3a', white: '#ffffff', green: '#2ac86a', blue: '#2a8aff',
    red: '#ff2a4a', ink: '#3a1a4a', gold: '#fff04a', sand: '#ffd890', sandDark: '#e8a860'
  };

  var TITLE = 'POSE CALL';
  var BPM = 144;
  var BEAT = 60 / BPM;
  var BAR = BEAT * 4;
  var TIME_LIMIT = 14;
  var PERFECT_W = 0.07, GOOD_W = 0.15;
  // 小節の型: cues=掛け声の拍, poses=決めの拍(拍単位)
  var PATTERNS = {
    A: { cues: [0, 1, 2], poses: [3] },
    B: { cues: [0, 1, 1.5], poses: [2] },
    C: { cues: [0, 1, 2], poses: [3, 3.5] }
  };
  var SONG = ['A', 'A', 'B', 'A', 'C', 'B', 'C'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CACTUS = [
    [
      '...gg...',
      '..gkgk..',
      '..gggg..',
      '...gg...',
      'g..gg..g',
      'gg.gg.gg',
      '.gggggg.',
      '...gg...',
      '..g..g..'
    ],
    [
      'g..gg..g',
      'g.gkgkg.',
      'gggggggg',
      '...gg...',
      '...gg...',
      '...gg...',
      '..gggg..',
      '...gg...',
      '..g..g..'
    ],
    [
      '...gg...',
      '..gkgk.g',
      '..ggggg.',
      'g..ggg..',
      'gggggg..',
      '...gg...',
      '...gg...',
      '...ggg..',
      '..g...g.'
    ],
    [
      '...gg...',
      'g.gkgk..',
      '.ggggg..',
      '..ggg..g',
      '...ggggg',
      '...gg...',
      '...gg...',
      '..ggg...',
      '.g...g..'
    ]
  ];
  var CACTUS_PAL = { g: '#2ac86a', k: '#3a1a4a' };
  var BIRD_A = ['..rr....', '.rrrr.yy', 'rrwkrr..', 'rrrrrr..', '.bbbbb..', '..y..y..'];
  var BIRD_B = ['..rr....', '.rrrryy.', 'rrwkrr..', 'rrrrrrr.', 'bbbbbbbb', '..y..y..'];
  var BIRD_PAL = { r: '#ff2a4a', y: '#fff04a', w: '#ffffff', k: '#3a1a4a', b: '#2a8aff' };
  var DRUM = ['wwwwww', 'rbrbrb', 'rbrbrb', 'wwwwww'];

  var events, cuePtr, poseList, posePtr, songT, phase, phaseT, hits, perfects, misses, combo, maxCombo, needed;
  var pose, poseT, birdHit, lampOn, endOk, lastJudge, focusX, focusY, midShown;
  var demo = { t: 0, press: 0, missBar: 2 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function buildSong() {
    events = []; poseList = [];
    for (var b = 0; b < SONG.length; b++) {
      var st = (b + 1) * BAR, pt = PATTERNS[SONG[b]];
      for (var c = 0; c < pt.cues.length; c++) events.push({ t: st + pt.cues[c] * BEAT, bar: b, k: c });
      for (var p = 0; p < pt.poses.length; p++) poseList.push({ t: st + pt.poses[p] * BEAT, bar: b, done: false, res: '' });
    }
    // 1小節目はカウントイン(4つ打ち)
    for (var k = 0; k < 4; k++) events.push({ t: k * BEAT, bar: -1, k: k });
    events.sort(function(a, b) { return a.t - b.t; });
    needed = Math.ceil(poseList.length * 0.7);
  }

  function initGame() {
    buildSong();
    cuePtr = 0; posePtr = 0; songT = -0.8; phase = 'ready'; phaseT = 0.8;
    hits = 0; perfects = 0; misses = 0; combo = 0; maxCombo = 0;
    pose = 0; poseT = 0; birdHit = 0; lampOn = -1; endOk = false; lastJudge = ''; focusX = W / 2; focusY = H * 0.55; midShown = false;
  }

  function judge(res, live) {
    var pz = poseList[posePtr];
    pz.done = true; pz.res = res; posePtr++;
    if (res === 'MISS') {
      misses++; combo = 0;
      if (live) game.feedback.bad(W / 2, H * 0.40, { text: 'MISS', shake: 6 });
      return;
    }
    hits++; combo++; maxCombo = Math.max(maxCombo, combo);
    if (res === 'PERFECT') perfects++;
    pose = 1 + (hits % 3); poseT = 0.35;
    if (live) {
      game.feedback.good(W / 2, H * 0.40, { text: res, color: res === 'PERFECT' ? C.gold : C.green, sound: 'se_good' });
      game.audio.tone(523 * Math.pow(1.06, Math.min(combo, 12)), 0.12, { wave: 'square', volume: 0.07 });
      if (!midShown && hits >= Math.ceil(needed / 2)) {
        midShown = true;
        game.fx.popup('あと' + (needed - hits) + '回!', W / 2, H * 0.30, { color: C.white, size: 54 });
        game.audio.play('se_milestone', 0.45);
      }
    }
  }

  function tapAt(live) {
    if (posePtr >= poseList.length) return 'none';
    var pz = poseList[posePtr], off = Math.abs(songT - pz.t);
    if (off <= PERFECT_W) { judge('PERFECT', live); return 'PERFECT'; }
    if (off <= GOOD_W) { judge('GOOD', live); return 'GOOD'; }
    return 'stray';
  }

  function stepSong(dt, live) {
    songT += dt;
    while (cuePtr < events.length && songT >= events[cuePtr].t) {
      var ev = events[cuePtr++];
      birdHit = 0.14; lampOn = ev.bar < 0 ? -1 : ev.k;
      if (live) game.audio.tone(ev.bar < 0 ? 'C4' : ['G4', 'A4', 'B4'][Math.min(2, ev.k)], 0.07, { wave: 'square', volume: ev.bar < 0 ? 0.05 : 0.09 });
    }
    while (posePtr < poseList.length && songT > poseList[posePtr].t + GOOD_W + 0.02) judge('MISS', live);
    if (birdHit > 0) birdHit -= dt;
    if (poseT > 0) { poseT -= dt; if (poseT <= 0) pose = 0; }
  }

  function barProgress() {
    var b = Math.floor(songT / BAR) - 1;
    return Math.max(0, Math.min(SONG.length, b));
  }

  function drawStage() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.4, C.sky2], [0.62, C.sky3], [0.63, C.sand], [1, C.sandDark]]);
    game.draw.rect(0, 0, W, H, C.white, 0.04 + 0.04 * Math.sin(el * 1.8));
    // 光の柱(拍で明滅)
    var beatPh = songT > 0 ? (songT % BEAT) / BEAT : (el * 2) % 1;
    for (var i = 0; i < 5; i++) {
      var px = W * (0.1 + i * 0.2);
      game.draw.rect(px - 40, 0, 80, H * 0.63, C.white, 0.08 + 0.12 * (1 - beatPh) * (i % 2 ? 1 : 0.6));
    }
    // 遠景の砂丘と観客のシルエット(演出のみ)
    game.draw.circle(W * 0.2, H * 0.66, 300, C.sandDark, 0.5);
    game.draw.circle(W * 0.85, H * 0.68, 360, C.sandDark, 0.5);
    for (var a = 0; a < 7; a++) {
      var ax = W * (0.08 + a * 0.14), jump = Math.max(0, Math.sin(el * 7 + a)) * 16;
      game.draw.sprite(CACTUS[0], { g: '#c05a30', k: '#c05a30' }, ax, H * 0.90 - jump, 9, { anchor: 'center', alpha: 0.35 });
    }
    // 舞台
    game.draw.rect(W * 0.18, H * 0.63, W * 0.64, 40, C.white);
    game.draw.rect(W * 0.18, H * 0.63 + 40, W * 0.64, 30, C.blue);
  }

  function drawActors() {
    var el = game.time.elapsed;
    // 太鼓鳥と太鼓
    var bx = W * 0.25, by = H * 0.53 + Math.sin(el * 4) * 6;
    game.draw.sprite(DRUM, { w: C.white, r: C.red, b: C.blue }, bx + 20, H * 0.60, 14, { anchor: 'center' });
    game.draw.sprite(birdHit > 0 ? BIRD_B : BIRD_A, BIRD_PAL, bx, by, 16, { anchor: 'center' });
    // 掛け声ランプ(3つ)+決めの星
    for (var i = 0; i < 3; i++) {
      var lx = W * 0.2 + i * 130, on = lampOn >= i && birdHit > -0.3 && songT > BAR;
      game.draw.circle(lx, H * 0.18, 44, C.white);
      game.draw.circle(lx, H * 0.18, 36, on ? C.red : '#ffd0d8');
    }
    var nextPose = posePtr < poseList.length ? poseList[posePtr] : null;
    var starHot = nextPose && Math.abs(songT - nextPose.t) < GOOD_W;
    game.draw.circle(W * 0.2 + 3 * 130 + 40, H * 0.18, 60, C.white);
    game.draw.circle(W * 0.2 + 3 * 130 + 40, H * 0.18, 50, starHot ? C.gold : '#fff8c0');
    // 踊り手と迫る光の輪(決めの拍の予告)
    var dx = W * 0.62, dy = H * 0.52;
    if (nextPose) {
      var lead = nextPose.t - songT;
      if (lead < BEAT * 2 && lead > -GOOD_W) {
        var rr = 70 + Math.max(0, lead) * 320;
        game.draw.circle(dx, dy, rr, C.gold, 0.25);
        game.draw.circle(dx, dy, 70, C.white, 0.35);
      }
    }
    var sprite = CACTUS[pose] || CACTUS[0];
    var bounce = Math.abs(Math.sin((songT > 0 ? songT : el) * Math.PI / BEAT)) * 12;
    game.draw.sprite(sprite, CACTUS_PAL, dx, dy - bounce, 22, { anchor: 'center' });
    if (poseT > 0) game.draw.circle(dx, dy, 140, C.gold, poseT);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.09, C.ink, 0.55);
    txt(hits + ' / ' + needed, W * 0.25, H * 0.045, 56, C.white);
    if (combo >= 2) txt('COMBO ' + combo, W * 0.72, H * 0.045, 46, C.gold);
    var prog = barProgress() / SONG.length;
    game.draw.rect(60, H * 0.10, W - 120, 20, C.white, 0.6);
    game.draw.rect(60, H * 0.10, (W - 120) * prog, 20, C.blue);
    for (var i = 0; i < poseList.length; i++) {
      var pz = poseList[i];
      var col = !pz.done ? C.white : pz.res === 'MISS' ? C.red : pz.res === 'PERFECT' ? C.gold : C.green;
      game.draw.circle(80 + i * ((W - 160) / (poseList.length - 1)), H * 0.125, 12, col);
    }
  }

  function scoreOf() { return hits * 100 + perfects * 50 + maxCombo * 30; }

  function drawResult() {
    game.draw.rect(0, H * 0.24, W, H * 0.22, C.ink, 0.75);
    txt(endOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 100, endOk ? C.gold : C.red);
    txt(hits + ' / ' + poseList.length + '   PERFECT ' + perfects, W / 2, H * 0.36, 44, C.white);
    if (endOk && scoreOf() > game.best) txt('NEW RECORD', W / 2, H * 0.42, 54, C.gold);
    else if (!endOk) txt('あと' + Math.max(1, needed - hits) + '回!', W / 2, H * 0.42, 54, C.gold);
    else txt('BEST ' + game.best, W / 2, H * 0.42, 42, C.white);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (BAR * 4);
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; songT = BAR * 0.5; cuePtr = 0; while (cuePtr < events.length && events[cuePtr].t < songT) cuePtr++; }
    stepSong(dt, false);
    if (demo.press > 0) demo.press -= dt;
    if (posePtr < poseList.length) {
      var pz = poseList[posePtr];
      // 3小節目は一拍遅れて外す(失敗例)
      if (pz.bar !== demo.missBar && songT >= pz.t) {
        if (tapAt(false) !== 'none') { demo.press = 0.15; game.fx.burst(W * 0.62, H * 0.45, { color: C.gold, count: 10 }); }
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') { game.audio.play('se_tap', 0.1); return; }
    var r = tapAt(true);
    if (r === 'stray') {
      game.audio.tone('D3', 0.06, { wave: 'triangle', volume: 0.06 });
      game.fx.burst(x, y, { color: C.white, count: 4, speed: 120 });
    }
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!events) initGame();
      stepDemo(dt);
      drawStage(); drawActors();
      game.draw.hand(W * 0.62, H * 0.76, { press: demo.press > 0, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 96, C.white);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.11, 40, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 52, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 46, C.white);
      return;
    }
    if (state === S.RESULT) {
      drawStage(); drawActors(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 44, C.white);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt; songT += dt;
      if (phaseT <= 0) { phase = 'play'; songT = 0; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      stepSong(dt, true);
      var impossible = poseList.length - misses < needed;
      var lastT = poseList[poseList.length - 1].t;
      if (impossible) {
        endOk = false; phase = 'stop'; phaseT = 0.5;
      } else if (posePtr >= poseList.length && songT > lastT + 0.4) {
        endOk = hits >= needed; phase = 'stop'; phaseT = 0.45;
      } else if (songT > TIME_LIMIT) {
        endOk = hits >= needed; phase = 'stop'; phaseT = 0.45;
      }
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (endOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.gold, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#fff04a', 0.35);
        } else {
          game.feedback.bad(focusX, focusY, { text: 'MISS' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (phaseT <= 0) {
        state = S.RESULT;
        if (endOk) game.end.success(scoreOf(), { hits: hits, perfects: perfects, misses: misses, maxCombo: maxCombo });
        else game.end.failure({ hits: hits, perfects: perfects, misses: misses });
        return;
      }
    }

    drawStage(); drawActors(); drawHud();
    if (phase === 'stop') {
      game.draw.circle(focusX, focusY, 120 + (0.5 - phaseT) * 200, C.white, 0.5);
      game.draw.sprite(endOk ? CACTUS[1] : CACTUS[0], CACTUS_PAL, focusX, focusY, 28, { anchor: 'center', flipY: !endOk });
    }
    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.white);
    if (phase === 'end') drawResult();
    // 親指ゾーン: 叩く面
    var hot = posePtr < poseList.length && Math.abs(songT - poseList[posePtr].t) < GOOD_W;
    game.draw.circle(W / 2, H * 0.86, 130, C.white, 0.8);
    game.draw.circle(W / 2, H * 0.86, 112, hot ? C.gold : C.blue, 0.9);
    game.draw.sprite(CACTUS[1], { g: C.white, k: C.white }, W / 2, H * 0.86, 10, { anchor: 'center' });
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['C5', 1], ['E5', 1], ['D5', 0.5], ['C5', 0.5],
      ['A4', 1], ['G4', 1], ['A4', 2]
    ], { tempo: BPM, wave: 'triangle', volume: 0.045, loop: true, bass: [['A2', 1], ['A2', 1], ['E2', 1], ['E2', 1], ['F2', 1], ['G2', 1], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
