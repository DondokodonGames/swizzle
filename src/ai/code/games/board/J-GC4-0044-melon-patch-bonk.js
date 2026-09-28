// J-GC4-0044-melon-patch-bonk.js
// 瓜畑の見張り番 — 畝の穴から顔を出すうち、瓜泥棒のアライグマだけを葉うちわで叩き、畑の守り手ハリネズミは見逃す
// 操作: 穴から出た顔をタップすると葉うちわで叩く。仮面顔(アライグマ)は叩く、トゲ頭で鼻の赤い顔(ハリネズミ)は叩かない。トゲの帽子をかぶった仮面顔もいる
// 終わり: 時間内に規定数のアライグマを追い払えばCLEAR。ハリネズミを叩く/アライグマを逃がすと瓜が減り、瓜が尽きる/時間切れでGAME OVER
// @mechanic: judge
// @theme: night_melon_patch_watch
// 世界観: 月夜の瓜畑、見張り番の少年が葉うちわを構え、畝の穴から次々と顔を出す瓜泥棒のアライグマだけを追い払い、一緒に畑を守るハリネズミは叩かずに、収穫前夜の瓜を守り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 追い払った数・誤りの数・最大コンボ
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き、表情のあるスプライト
  var STYLE = { bg: ['#1b1f4a', '#2e3a78', '#3d6b3a'], main: ['#5a8f3c', '#7a5230', '#9a9aa8'], accent: ['#ffe066', '#ff5a5a'] };
  var C = {
    night1: '#141840', night2: '#2e3a78', moon: '#fff4c2', field1: '#3d6b3a', field2: '#2f5a2e', soil: '#6b4526', soilD: '#3e2614',
    melon: '#5ac24a', melonS: '#2e7a2a', fur: '#9a9aa8', furD: '#5e5e6c', mask: '#1c1c24', muzzle: '#f2f2f2', spike: '#7a5230',
    spikeD: '#4a2e18', face: '#f2d2a8', nose: '#ff6a8a', leaf: '#6a9a3a', ink: '#0e0e18', white: '#ffffff', gold: '#ffe066', bad: '#ff5a5a', good: '#7af07a'
  };

  var GAME_TITLE = 'MELON WATCH';
  var TIME_LIMIT = 14;
  var NEEDED = 10;
  var MELONS = 4;
  var HOLES = [];
  for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) HOLES.push({ x: W * (0.2 + c * 0.3), y: H * (0.36 + r * 0.15) });

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, holes, spawnT, bonked, wrong, melons, combo, maxCombo, hitStop, outro, ok, focus, halfShown, playT, swat;

  // ── sprites ───────────────────────────────────────────────────────
  var RACCOON = [
    ['.ff....ff.', 'fDff..ffDf', 'ffffffffff', 'fmmmmmmmmf', 'mmwkmmkwmm', 'fffwwwwfff', '.ffwkkwff.', '..fwwwwf..'],
    ['.ff....ff.', 'fDff..ffDf', 'ffffffffff', 'fmmmmmmmmf', 'mmkkmmkkmm', 'fffwwwwfff', '.ffwkkwff.', '..fwwwwf..']
  ];
  var RACCOON_PAL = { f: C.fur, D: C.furD, m: C.mask, w: C.muzzle, k: C.ink };
  var HEDGE = [
    ['.s.s.s.s..', 's.s.s.s.s.', 'sSsSsSsSss', 'SsSsSsSsSs', 'ssffffffss', 'sfkfffkfs.', '.ffffnfff.', '..ffffff..'],
    ['.s.s.s.s..', 's.s.s.s.s.', 'sSsSsSsSss', 'SsSsSsSsSs', 'ssffffffss', 'sfffffffs.', '.ffkfnkff.', '..ffffff..']
  ];
  var HEDGE_PAL = { s: C.spike, S: C.spikeD, f: C.face, k: C.ink, n: C.nose };
  var DISGUISE = ['.l.l.l.l..', 'l.l.l.l.l.', 'lLlLlLlLll', 'LlLlLlLlLl', 'mmwkmmkwmm', 'fffwwwwfff', '.ffwkkwff.', '..fwwwwf..'];
  var DISGUISE_PAL = { l: C.leaf, L: '#4a7a2a', m: C.mask, w: C.muzzle, k: C.ink, f: C.fur };
  var MELON = ['..ssss..', '.sMsMss.', 'sMsMsMss', 'sMsMsMss', '.sMsMss.', '..ssss..'];
  var FAN = ['..ll..', '.llll.', 'llllll', '.llll.', '..b...', '..b...'];
  var BOY = [
    ['..hhh..', '.hhhhh.', '..fff..', '..fef..', '.yyyyy.', 'y.yyy.y', '..y.y..', '.k...k.'],
    ['..hhh..', '.hhhhh.', '..fff..', '..fef..', '.yyyyy.', '.yyyyy.', '..y.y..', '..k.k..']
  ];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; spawnT = 0.4; bonked = 0; wrong = 0; melons = MELONS; combo = 0; maxCombo = 0;
    hitStop = 0; outro = 0; ok = false; focus = null; halfShown = false; playT = 0; swat = null;
    holes = [];
    for (var i = 0; i < HOLES.length; i++) holes.push({ x: HOLES[i].x, y: HOLES[i].y, kind: null, t: 0, up: 0, rumble: 0, hit: 0, done: false });
  }

  function spawn() {
    var free = [];
    for (var i = 0; i < holes.length; i++) if (!holes[i].kind && holes[i].rumble <= 0) free.push(holes[i]);
    if (!free.length) return;
    var h = free[Math.floor(game.random(0, free.length)) % free.length];
    var roll = Math.random();
    h.next = roll < 0.3 ? 'hedge' : (playT > 4 && roll > 0.86 ? 'disguise' : 'raccoon');
    h.rumble = 0.3;
  }

  function isThief(kind) { return kind === 'raccoon' || kind === 'disguise'; }

  // 叩く判断(実プレイ・デモ共用)
  function bonk(h, isDemo) {
    if (!h.kind || h.done || h.up < 0.35) return null;
    h.done = true; h.hit = 0.4;
    swat = { x: h.x, y: h.y - 60, t: 0.2 };
    var good = isThief(h.kind);
    if (isDemo) {
      game.fx.burst(h.x, h.y - 60, { color: good ? C.gold : C.bad, count: 8, speed: 220 });
      return good;
    }
    if (good) {
      bonked++; combo++; if (combo > maxCombo) maxCombo = combo;
      game.feedback.good(h.x, h.y - 150, { text: h.kind === 'disguise' ? 'PERFECT' : (combo >= 3 ? 'x' + combo : 'GOOD'), color: h.kind === 'disguise' ? C.gold : C.good, count: 10 });
      if (!halfShown && bonked >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(bonked + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 64 });
      }
      if (bonked >= NEEDED) { focus = h; finish(true); }
    } else {
      combo = 0; wrong++; melons--;
      focus = h;
      if (melons <= 0) finish(false);
      else game.feedback.bad(h.x, h.y - 150, { text: 'MISS' });
    }
    return good;
  }

  function stepHoles(dt, isDemo) {
    var stay = Math.max(0.75, 1.15 - playT * 0.03);
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i];
      if (h.rumble > 0) {
        h.rumble -= dt;
        if (h.rumble <= 0) { h.kind = h.next; h.t = 0; h.up = 0; h.done = false; if (!isDemo) game.audio.tone(isThief(h.kind) ? 'G4' : 'C5', 0.05, { wave: 'square', volume: 0.04 }); }
        continue;
      }
      if (!h.kind) continue;
      h.t += dt;
      if (h.hit > 0) { h.hit -= dt; if (h.hit <= 0) { h.kind = null; } continue; }
      h.up = Math.min(1, h.t / 0.18);
      if (h.t > stay) {
        h.up = Math.max(0, 1 - (h.t - stay) / 0.15);
        if (h.up <= 0) {
          if (isThief(h.kind) && !h.done && !isDemo) {
            // 取り逃がし: 瓜を一つ持っていかれる
            combo = 0; melons--; focus = h;
            game.audio.play('se_bad', 0.35);
            game.fx.popup('MISS', h.x, h.y - 150, { color: C.bad, size: 48 });
            if (melons <= 0) { h.up = 1; finish(false); return; }
          }
          h.kind = null;
        }
      }
    }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      var fx = focus ? focus.x : W / 2, fy = focus ? focus.y - 150 : H * 0.5;
      game.feedback.bad(fx, fy, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
  }

  function holeAt(x, y) {
    var best = null, bd = 150;
    for (var i = 0; i < holes.length; i++) {
      var d = Math.hypot(x - holes[i].x, y - (holes[i].y - 50));
      if (d < bd) { bd = d; best = holes[i]; }
    }
    return best;
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') return;
    var h = holeAt(x, y);
    var res = h ? bonk(h, false) : null;
    if (res === null) {
      // 空の穴を叩いた: 土ぼこりだけ
      swat = { x: x, y: y, t: 0.2 };
      game.audio.play('se_tap', 0.25);
      game.fx.burst(x, y, { color: C.soil, count: 4, speed: 120 });
    }
  });

  // ── demo(実際の顔を見て判断。4回に1回はハリネズミを叩いてしまう)───
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, n: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { demo.n = 0; for (var i = 0; i < holes.length; i++) { holes[i].kind = null; holes[i].rumble = 0; } spawnT = 0; }
    playT = 5;
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = 0.5; }
    stepHoles(dt, true);
    demo.cool -= dt;
    demo.press = demo.cool > 0.3;
    if (demo.cool <= 0) {
      for (var j = 0; j < holes.length; j++) {
        var h = holes[j];
        if (!h.kind || h.done || h.t < 0.4) continue;
        var slip = demo.n % 4 === 3;
        if (isThief(h.kind) || (slip && h.kind === 'hedge')) {
          demo.gx = h.x + 30; demo.gy = h.y - 40;
          bonk(h, true); demo.n++; demo.cool = 0.5;
          break;
        }
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night1], [0.24, C.night2], [0.27, C.field1], [1, C.field2]]);
    game.draw.circle(W * 0.82, H * 0.1, 70, C.moon);
    game.draw.circle(W * 0.82 - 24, H * 0.1 - 16, 64, C.night1, 0.35);
    for (var s = 0; s < 14; s++) game.draw.rect((s * 173) % W, (s * 97) % (H * 0.2) + 30, 4, 4, C.white, 0.4 + 0.4 * Math.sin(t * 3 + s));
    // 遠景の林(層1)と生け垣(層2)
    for (var x = 0; x < W; x += 16) {
      var h1 = 60 + Math.sin(x * 0.02) * 20 + Math.sin(x * 0.05 + 1) * 12;
      game.draw.rect(x, H * 0.26 - h1, 16, h1, '#1e2e3a');
    }
    for (var row = 0; row < 8; row++) game.draw.rect(0, H * (0.29 + row * 0.07), W, 18, C.field2, 0.5);
    game.draw.rect(0, 0, W, H, C.moon, 0.02 + 0.02 * Math.sin(t * 1.4));
  }

  function drawHoles() {
    var t = game.time.elapsed;
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i];
      var rx = h.rumble > 0 ? Math.sin(t * 60) * 6 : 0;
      game.draw.circle(h.x, h.y + 6, 118, C.soilD);
      game.draw.circle(h.x + rx, h.y, 110, C.soil);
      game.draw.circle(h.x + rx, h.y + 8, 84, C.ink);
      if (h.rumble > 0) game.draw.rect(h.x - 60 + ((t * 300) % 120), h.y - 90, 10, 10, C.soil);
      if (h.kind) {
        var spr, pal;
        if (h.kind === 'hedge') { spr = HEDGE[Math.floor(t * 4) % 2]; pal = HEDGE_PAL; }
        else if (h.kind === 'disguise') { spr = DISGUISE; pal = DISGUISE_PAL; }
        else { spr = RACCOON[Math.floor(t * 4) % 2]; pal = RACCOON_PAL; }
        var rise = h.up * 180;
        var squash = h.hit > 0 ? 0.6 : 1;
        var isF = focus === h && phase === 'stop';
        var px = isF ? 17 : 14;
        game.draw.sprite(spr, pal, h.x, h.y + 110 - rise * squash, px, { anchor: 'center' });
        if (isF && Math.floor(t * 14) % 2 === 0) game.draw.circle(h.x, h.y - 60, 120, C.white, 0.45);
      }
      // 穴の手前の土(顔の下を隠す)
      game.draw.rect(h.x - 118, h.y + 54, 236, 118, C.field1);
      game.draw.rect(h.x - 118, h.y + 50, 236, 10, C.soil);
    }
  }

  function drawSwat(dt) {
    if (!swat) return;
    swat.t -= dt;
    game.draw.sprite(FAN, { l: C.leaf, b: C.spike }, swat.x + 40, swat.y - 40 + (0.2 - swat.t) * 200, 16, { anchor: 'center' });
    if (swat.t <= 0) swat = null;
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.field2);
    for (var i = 0; i < MELONS; i++) {
      game.draw.sprite(MELON, { s: C.melonS, M: C.melon }, W * 0.45 + i * 130, H * 0.86 + Math.sin(t * 2 + i) * 4, 14, { anchor: 'center', alpha: i < melons ? 1 : 0.2 });
    }
    game.draw.sprite(BOY[Math.floor(t * 2) % 2], { h: '#3a2a1a', f: C.face, e: C.ink, y: '#e0a030', k: C.ink }, W * 0.16, H * 0.86 + Math.sin(t * 2.5) * 5, 16, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.night1, 0.6);
    txt(bonked + ' / ' + NEEDED, W / 2, 90, 66, C.gold);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    if (combo >= 2) txt('x' + combo, W - 70, 90, 48, C.good, 'right');
    game.draw.rect(60, 170, W - 120, 20, C.ink);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.gold);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawField(); drawHoles(); drawSwat(dt); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.night1, 0.6);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 76, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawField(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      timeLeft -= dt; playT += dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.38, 0.62 - playT * 0.018); }
      stepHoles(dt, false);
      if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; focus = null; finish(false); }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = bonked * 100 + maxCombo * 20 + melons * 50;
        var stats = { bonked: bonked, wrong: wrong, maxCombo: maxCombo, melons: melons };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawField(); drawHoles(); drawSwat(dt); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.gold);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.24, W, H * 0.16, C.night1, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 96, ok ? C.gold : C.bad);
      var sc = bonked * 100 + maxCombo * 20 + melons * 50;
      txt('SCORE ' + sc, W / 2, H * 0.33, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.37, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - bonked) + '匹!', W / 2, H * 0.37, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.37, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['R', 0.25], ['A4', 0.25], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 1],
      ['G4', 0.5], ['R', 0.25], ['G4', 0.25], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1]
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1], ['G2', 1], ['D3', 1], ['G2', 1], ['E3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
