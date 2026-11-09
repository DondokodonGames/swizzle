// I-Wii-0001v3-shichigosan-flash-smile.js
// 七五三の一枚 — 写真屋の合図まで画面に触れずに晴れ着の子を構えさせ、ゴム球が押されて閃光が光った瞬間に1回だけ押して笑顔を写す
// 操作: 写真屋が暗幕に入ったら画面に触れない(触れると子が動いて写真がぶれる)。ガラガラを振る・レンズの蓋を少し上げる・ゴム球を上げて下ろす・鳩が横切る、はすべて合図ではない。ゴム球が握られて閃光が光った瞬間に1回だけ押すと笑顔が写る。光っている間にもう一度触れるとぶれる(社内メモ。画面には出さない)
// 終わり: 4枚撮って3枚以上きれいに写ればCLEAR。ぶれ・写し損ねが2枚になるとGAME OVER
// @mechanic: freeze
// @theme: shrine_shichigosan_travel_photographer
// 世界観: 秋の神社の境内で、七五三の晴れ着の子どもが出張写真屋の暗箱カメラの前でじっと構え、ゴム球の閃光の合図に合わせてにっこり笑い、千歳飴を手に記念写真を残していく
// 残るもの: 正誤(CLEAR/GAME OVER) + きれいに写った枚数・最速の笑顔の反応・スコア
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・ビロード・真鍮・革の質感を gradient と細線で作る。ボタンは上明下暗+白ハイライト
  var STYLE = { bg: ['#f2d8b0', '#c89060'], main: ['#7a4a2a', '#c8a050', '#2a1e2a'], accent: ['#d83a3a', '#fff8e8'] };
  var C = {
    wood: STYLE.main[0], brass: STYLE.main[1], velvet: STYLE.main[2], red: STYLE.accent[0], paper: STYLE.accent[1],
    woodHi: '#a86a3a', brassHi: '#f0d890', sepia: '#c8a878', sepiaDk: '#7a5a3a', gravel: '#d8ccb8', maple: '#e8602a', ink: '#2a1e1a',
  };

  var GAME_TITLE = 'SMILE SHOT';
  var SHOTS = 4;
  var MISS_MAX = 2;
  var KX = W / 2, KY = 820;
  var CAMX = 300, CAMY = 1390;
  var ROUND_FAKES = [[], ['rattle'], ['rattle', 'cap'], ['pigeon', 'feint', 'cap']];
  var WINDOWS = [0.5, 0.45, 0.4, 0.34];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var lastPts = 0;
  var shot, phase, phaseT, realT, events, presses, photos, good, misses, score, finalScore, fastest, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, milestone, kidFace, flashA, anim;

  // 晴れ着の子(赤い着物・髪飾り・千歳飴)
  var KID = ['..hhhh..f', '.hhhhhhff', '.hssssh..', '.skssks..', '.ssmmss..', '..ssss...', '.rrrrrr.c', 'rrgrrgrrc', 'r.rrrr.sc', '..rrrr..c', '..rrrr...', '..w..w...'];
  var KID_FIDGET = ['..hhhh..f', '.hhhhhhff', '.hssssh..', '.sksskks.', '.ssssss..', '..ssss...', '.rrrrrr.c', 'rrgrrgrrc', 's.rrrr.rc', '..rrrr..c', '..rrrr...', '..w..w...'];
  var KID_SMILE = ['..hhhh..f', '.hhhhhhff', '.hssssh..', '.s.ss.s..', '.smmmms..', '..ssss...', '.rrrrrr.c', 'rrgrrgrrc', 'r.rrrr.sc', '..rrrr..c', '..rrrr...', '..w..w...'];
  var KID_SULK = ['..hhhh..f', '.hhhhhhff', '.hssssh..', '.skssks..', '.skkkks..', '..ssss...', '.rrrrrr.c', 'rrgrrgrrc', 'r.rrrr.sc', '..rrrr..c', '..rrrr...', '..w..w...'];
  var KID_PAL = { h: '#2a1e1a', f: '#f0a0c0', s: '#ffe0c8', k: '#2a1e1a', m: '#d83a3a', r: '#d83a3a', g: '#f0c850', c: '#f8f0e0', w: '#ffffff' };
  // 写真屋(鳥打帽・口ひげ)
  var MAN = ['.bbbbbb.', 'bbbbbbbb', '.ssssss.', '.skssks.', '.ssssss.', '.smmmms.', '..ssss..', '.vvvvvv.', 'vvvvvvvv', 'v.vvvv.v', '..vvvv..', '..v..v..'];
  var MAN_PAL = { b: '#5a4a3a', s: '#f0c8a0', k: '#2a1e1a', m: '#3a2a20', v: '#3a3a5a' };
  var PIGEON_A = ['..gg....', '.gkgg...', 'gggggggw', '..gggww.', '...y.y..'];
  var PIGEON_B = ['..gg.ww.', '.gkggww.', 'ggggggg.', '..ggg...', '...y.y..'];
  var RATTLE = ['.rr.', 'rrrr', 'rwwr', '.rr.', '.bb.', '.bb.'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#2a1e1a88', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  function panel(x, y, w, h, top, bot) {
    game.draw.rect(x, y, w, h, bot);
    game.draw.rect(x, y, w, h * 0.5, top);
    game.draw.rect(x + 6, y + 4, w - 12, 4, '#ffffff', 0.35);
  }

  function setupShot(k) {
    shot = k; phase = 'pose'; phaseT = 0; presses = 0; kidFace = 'still'; flashA = 0; anim = { kind: '', t: 0 };
    var fakes = ROUND_FAKES[Math.min(k, ROUND_FAKES.length - 1)];
    realT = game.random(1.3, 2.0) + fakes.length * 0.55;
    events = [];
    for (var i = 0; i < fakes.length; i++) {
      var at = 0.5 + (realT - 1.1) * (i + 0.5) / fakes.length + game.random(-0.15, 0.15);
      events.push({ at: Math.max(0.35, at), kind: fakes[i], done: false });
    }
    events.push({ at: realT - 0.6, kind: 'raise', done: false });
  }

  function initGame() {
    photos = []; good = 0; misses = 0; score = 0; finalScore = 0; fastest = 0;
    readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; milestone = false;
    setupShot(0);
  }

  function fakeSound(kind) {
    if (kind === 'rattle') { game.audio.tone('G5', 0.05, { wave: 'square', volume: 0.06 }); game.audio.tone('B5', 0.05, { wave: 'square', volume: 0.05 }); }
    else if (kind === 'cap') game.audio.tone('C5', 0.04, { wave: 'triangle', volume: 0.07 });
    else if (kind === 'pigeon') game.audio.tone('E4', 0.12, { wave: 'triangle', volume: 0.05, slide: 120 });
    else game.audio.tone('A4', 0.08, { wave: 'triangle', volume: 0.05, slide: 80 });
  }

  function spoil(kind) {
    // kind: 'blur'(動いた) / 'dull'(笑い損ね)
    misses++; sadT = 1; kidFace = kind === 'dull' ? 'sulk' : 'blur';
    photos.push(kind);
    phase = 'photo'; phaseT = 0;
    game.audio.play('se_break', 0.25);
    if (mode === S.PLAYING && misses >= MISS_MAX) {
      stopT = 0.55; stopKind = 'miss';
      game.fx.flash('#ffffff', 0.2);
      return;
    }
    game.feedback.bad(KX, KY - 160, { text: 'MISS', color: C.red, size: 62 });
  }

  // 画面に触れた(本番もデモも同じ判定)
  function press() {
    if (phase === 'pose' || phase === 'wait') { spoil('blur'); return; }
    if (phase === 'flash') {
      presses = 1;
      var rt = phaseT;
      if (!fastest || rt < fastest) fastest = rt;
      kidFace = 'smile'; joyT = 0.8;
      var perfect = rt < 0.2;
      var pts = perfect ? 300 : 200;
      score += pts; lastPts = pts;
      game.feedback.good(KX, KY - 180, { text: perfect ? 'PERFECT' : 'GOOD', color: C.brass, size: 64 });
      game.fx.popup(Math.round(rt * 1000) + 'ms', KX + 220, KY - 60, { color: C.paper, size: 40 });
      phase = 'expose'; phaseT = 0;
      return;
    }
    // 光っている間に2度目に触れた: 撮れたはずの1枚がぶれる
    if (phase === 'expose') { score = Math.max(0, score - lastPts); spoil('blur'); return; }
    game.audio.play('se_tap', 0.08);
  }

  function stepShot(dt) {
    phaseT += dt;
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (flashA > 0) flashA -= dt * 2.5;
    if (anim.t > 0) anim.t -= dt;
    if (phase === 'pose') {
      if (phaseT > 0.55) { phase = 'wait'; phaseT = 0; game.audio.tone('D4', 0.06, { wave: 'triangle', volume: 0.05 }); }
    } else if (phase === 'wait') {
      for (var i = 0; i < events.length; i++) {
        var e = events[i];
        if (!e.done && phaseT >= e.at) {
          e.done = true; anim = { kind: e.kind, t: e.kind === 'raise' ? 0.6 : 0.7 };
          if (e.kind === 'raise') game.audio.tone('F5', 0.05, { wave: 'triangle', volume: 0.05 });
          else fakeSound(e.kind);
        }
      }
      if (phaseT >= realT) {
        phase = 'flash'; phaseT = 0; flashA = 1; anim = { kind: 'squeeze', t: 0.3 };
        game.audio.play('se_powerup', 0.4);
        game.fx.flash('#ffffff', 0.25);
      }
    } else if (phase === 'flash') {
      if (phaseT >= WINDOWS[Math.min(shot, WINDOWS.length - 1)]) spoil('dull');
    } else if (phase === 'expose') {
      if (phaseT >= 0.6) {
        good++; photos.push('good'); phase = 'photo'; phaseT = 0;
        game.audio.play('se_coin', 0.35);
        if (mode === S.PLAYING && !milestone && good >= 2) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup('NICE', W / 2, H * 0.2, { color: C.brassHi, size: 84 }); }
      }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? good * 100 + (misses === 0 ? 300 : 0) : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(150 + i * 155, H * 0.38 + (i % 2) * 160, { color: i % 2 ? C.maple : C.brassHi, count: 18, speed: 520 });
      game.fx.flash(C.paper, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    game.audio.play('se_tap', 0.15);
    press();
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function grounds(t) {
    game.draw.gradient(0, H, [[0, '#f8e8c8'], [0.32, STYLE.bg[0]], [0.52, '#e0c8a0'], [0.53, C.gravel], [1, '#b8a890']]);
    // 紅葉の木(遠景)
    for (var m = 0; m < 6; m++) {
      var mx = 60 + m * 190, my = 420 + (m % 2) * 50;
      game.draw.rect(mx - 8, my, 16, 260, C.wood);
      game.draw.circle(mx, my, 110, m % 2 ? C.maple : '#f0903a', 0.85);
      game.draw.circle(mx - 30, my - 30, 60, '#ffb060', 0.4);
    }
    // 鳥居(朱塗りの柱は上明下暗のグラデ板)
    panel(KX - 330, 520, 660, 46, '#f0503a', '#a82a1a');
    panel(KX - 290, 600, 580, 30, '#f0503a', '#a82a1a');
    panel(KX - 270, 560, 54, 470, '#e8483a', '#b02a1a');
    panel(KX + 216, 560, 54, 470, '#e8483a', '#b02a1a');
    // 玉砂利
    for (var g = 0; g < 70; g++) game.draw.circle((g * 131) % W, 1030 + ((g * 71) % 800), 5, '#ffffff', 0.5);
    // 石段
    panel(KX - 200, KY + 100, 400, 40, '#d8d0c0', '#a8a090');
  }

  function drawKid(t) {
    var big = stopT > 0 && stopKind === 'miss';
    var fr = kidFace === 'smile' || (fin && cleared) ? KID_SMILE : kidFace === 'sulk' || (fin && !cleared) ? KID_SULK : (phase === 'wait' && Math.floor(t * 1.3) % 3 === 0 ? KID_FIDGET : KID);
    var sx = Math.sin(t * 2) * 3;
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 10)) * 26 : 0;
    game.draw.circle(KX, KY + 104, 90, '#000000', 0.18);
    if (kidFace === 'blur') {
      for (var b = -2; b <= 2; b++) game.draw.sprite(fr, KID_PAL, KX + sx + b * 16, KY + hop, big ? 22 : 17, { anchor: 'center', alpha: 0.35 });
    } else game.draw.sprite(fr, KID_PAL, KX + sx, KY + hop, 17, { anchor: 'center' });
    // ファインダーの枠(撮影範囲)
    var c = phase === 'flash' || phase === 'expose' ? C.paper : '#ffffff';
    var fx = KX - 200, fy = KY - 170, fw = 400, fh = 330;
    for (var k = 0; k < 4; k++) {
      var cx = k % 2 ? fx + fw : fx, cy = k < 2 ? fy : fy + fh, dx = k % 2 ? -1 : 1, dy = k < 2 ? 1 : -1;
      game.draw.line(cx, cy, cx + dx * 60, cy, c, 6);
      game.draw.line(cx, cy, cx, cy + dy * 60, c, 6);
    }
  }

  function drawCamera(t) {
    // 三脚
    game.draw.line(CAMX, CAMY, CAMX - 120, CAMY + 360, C.wood, 14);
    game.draw.line(CAMX, CAMY, CAMX + 120, CAMY + 360, C.wood, 14);
    game.draw.line(CAMX, CAMY, CAMX, CAMY + 380, C.woodHi, 12);
    // 木の暗箱+蛇腹+真鍮のレンズ
    panel(CAMX - 130, CAMY - 140, 260, 170, '#a86a3a', '#6a3a1a');
    for (var b = 0; b < 5; b++) game.draw.rect(CAMX + 120 + b * 18, CAMY - 120 + b * 6, 14, 130 - b * 12, b % 2 ? '#3a2a2a' : '#2a1e1e');
    game.draw.circle(CAMX + 225, CAMY - 60, 48, C.brass);
    game.draw.circle(CAMX + 225, CAMY - 60, 34, '#3a3040');
    game.draw.circle(CAMX + 212, CAMY - 74, 10, '#ffffff', 0.6);
    // レンズの蓋(cap フェイントで少し上がる / 本番で外れる)
    var capUp = 0;
    if (anim.kind === 'cap' && anim.t > 0) capUp = Math.sin((0.7 - anim.t) / 0.7 * Math.PI) * 40;
    if (phase === 'flash' || phase === 'expose') capUp = 120;
    game.draw.circle(CAMX + 230, CAMY - 60 - capUp, 44, '#2a2a2a');
    game.draw.circle(CAMX + 222, CAMY - 70 - capUp, 10, '#6a6a6a');
    // 暗幕と写真屋
    var under = phase === 'wait' || phase === 'flash' || phase === 'expose';
    if (under) {
      panel(CAMX - 190, CAMY - 220, 220, 300, '#4a3a5a', C.velvet);
      game.draw.rect(CAMX - 190, CAMY + 80, 220, 120, C.velvet);
      game.draw.rect(CAMX - 150, CAMY + 200, 30, 80, '#3a3a5a'); game.draw.rect(CAMX - 80, CAMY + 200, 30, 80, '#3a3a5a');
    } else game.draw.sprite(MAN, MAN_PAL, CAMX - 120, CAMY - 40, 15, { anchor: 'center' });
    // 手: ゴム球(raise=予告、squeeze=本番、feint=上げて下ろす)/ガラガラ
    var hx = CAMX - 230, hy = CAMY - 60;
    if (under && (anim.kind === 'raise' || anim.kind === 'feint' || anim.kind === 'squeeze')) {
      var lift = anim.kind === 'feint' ? Math.sin((0.7 - anim.t) / 0.7 * Math.PI) * 150 : (anim.kind === 'raise' ? Math.min(1, (0.6 - anim.t) / 0.3) * 150 : 150);
      var sq = anim.kind === 'squeeze' && anim.t > 0 ? 0.6 : 1;
      game.draw.line(CAMX + 40, CAMY - 30, hx, hy - lift, '#2a2a2a', 5);
      game.draw.circle(hx, hy - lift, 34 * sq, '#3a3a3a');
      game.draw.circle(hx - 10, hy - lift - 10, 10 * sq, '#7a7a7a');
      game.draw.circle(hx + 30, hy - lift + 10, 26, MAN_PAL.s);
    }
    if (anim.kind === 'rattle' && anim.t > 0) game.draw.sprite(RATTLE, { r: C.red, w: C.paper, b: C.wood }, CAMX + 360 + Math.sin(t * 40) * 26, CAMY - 300, 12, { anchor: 'center' });
    if (anim.kind === 'pigeon' && anim.t > 0) {
      var u = 1 - anim.t / 0.7;
      game.draw.sprite(Math.floor(t * 12) % 2 ? PIGEON_A : PIGEON_B, { g: '#8a8aa0', k: '#2a1e1a', w: '#e0e0f0', y: '#f0a040' }, -100 + u * (W + 200), 640 - Math.sin(u * 3) * 80, 12, { anchor: 'center' });
    }
    if (flashA > 0) {
      game.draw.circle(CAMX + 225, CAMY - 60, 160, '#ffffff', Math.min(1, flashA) * 0.8);
      game.draw.rect(0, 0, W, H, '#ffffff', Math.min(1, flashA) * 0.35);
    }
  }

  function drawAlbum(t) {
    // 革のアルバム(進捗): 撮れた写真が並ぶ
    panel(560, 1500, 470, 300, '#8a5a3a', '#5a3a22');
    for (var i = 0; i < SHOTS; i++) {
      var x = 600 + (i % 2) * 220, y = 1530 + Math.floor(i / 2) * 135;
      game.draw.rect(x, y, 180, 115, i < photos.length ? C.paper : '#00000030');
      if (i < photos.length) {
        var p = photos[i];
        game.draw.rect(x + 10, y + 10, 160, 95, p === 'good' ? C.sepia : '#a89078');
        var fr = p === 'good' ? KID_SMILE : p === 'dull' ? KID_SULK : KID;
        if (p === 'blur' || p === 'blur2') for (var b = -1; b <= 1; b++) game.draw.sprite(fr, { h: C.sepiaDk, f: C.sepiaDk, s: '#e8d0a8', k: C.sepiaDk, m: C.sepiaDk, r: C.sepiaDk, g: C.sepiaDk, c: '#e8d0a8', w: '#e8d0a8' }, x + 90 + b * 10, y + 58, 6, { anchor: 'center', alpha: 0.45 });
        else game.draw.sprite(fr, { h: C.sepiaDk, f: C.sepiaDk, s: '#f0dcb8', k: C.sepiaDk, m: C.sepiaDk, r: C.sepiaDk, g: '#d8b880', c: '#f0dcb8', w: '#f0dcb8' }, x + 90, y + 58, 6, { anchor: 'center' });
        if (p !== 'good') { game.draw.line(x + 20, y + 20, x + 160, y + 95, C.red, 6); game.draw.line(x + 160, y + 20, x + 20, y + 95, C.red, 6); }
      }
    }
  }

  function drawHud(t) {
    panel(40, 30, W - 80, 180, '#a86a3a', '#6a3a1a');
    out(good + ' / ' + SHOTS, W / 2, 150, 60, C.paper);
    out('' + score, 170, 150, 40, C.brassHi);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 120 - m * 70, 128, 24, m < misses ? C.red : '#ffffff40');
  }

  function drawScene(t) {
    grounds(t);
    drawKid(t);
    drawCamera(t);
    drawAlbum(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.04);
  }

  // ---- ATTRACT: 本物の stepShot/press。1枚目は閃光の瞬間に押して笑顔 → 2枚目はガラガラにつられて押し、ぶれる ----
  var demo = { t: 0, x: W * 0.72, y: H * 0.86, press: false, pt: 0, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.5;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.step = 0; }
    stepShot(dt);
    if (demo.pt > 0) demo.pt -= dt;
    if (demo.step === 0 && phase === 'flash' && phaseT > 0.14) { press(); demo.pt = 0.25; demo.step = 1; }
    if (demo.step === 1 && phase === 'photo' && phaseT > 0.7) { setupShot(1); demo.step = 2; }
    if (demo.step === 2 && phase === 'wait' && anim.kind === 'rattle' && anim.t < 0.5) { press(); demo.pt = 0.25; demo.step = 3; }
    demo.press = demo.pt > 0;
    demo.y = H * 0.86 + (demo.press ? 8 : -14 + Math.sin(demo.t * 3) * 6);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      panel(W / 2 - 340, 40, 680, 170, '#a86a3a', '#6a3a1a');
      out(GAME_TITLE, W / 2, 130 + Math.sin(t * 2) * 5, 96, C.brassHi);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 192, 38, C.paper);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.paper);
      else out('TAP TO START', W / 2, H * 0.975, 42, C.brassHi);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      panel(90, H * 0.3, W - 180, 480, '#fff8e8', '#e8d8b8');
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, cleared ? C.wood : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.ink);
      out(good + ' / ' + SHOTS + (fastest ? '   ' + Math.round(fastest * 1000) + 'ms' : ''), W / 2, H * 0.47, 42, C.wood);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.ink);
      if (!cleared) out('あと' + Math.max(1, SHOTS - MISS_MAX + 1 - good) + '枚!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { goodShots: good, misses: misses, fastestMs: Math.round(fastest * 1000) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(KX, KY - 160, { text: 'MISS', color: C.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      stepShot(dt);
      if (phase === 'photo' && phaseT > 0.7 && stopT <= 0) {
        if (photos.length >= SHOTS) { stopT = 0.4; stopKind = 'win'; game.audio.play('se_powerup', 0.4); }
        else { setupShot(shot + 1); game.audio.play('se_jump', 0.25); }
      }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'miss') {
      // ぶれた/笑い損ねた一枚を大きく見せる
      var last = photos[photos.length - 1];
      game.draw.rect(KX - 260, KY - 260, 520, 420, C.paper);
      game.draw.rect(KX - 240, KY - 240, 480, 380, Math.floor(t * 16) % 2 ? '#ffffff' : C.sepia);
      var fr2 = last === 'dull' ? KID_SULK : KID;
      for (var b = (last === 'dull' ? 0 : -2); b <= (last === 'dull' ? 0 : 2); b++) game.draw.sprite(fr2, KID_PAL, KX + b * 18, KY - 50, 16, { anchor: 'center', alpha: last === 'dull' ? 1 : 0.35 });
    }
    if (stopT > 0 && stopKind === 'win') game.draw.circle(KX, KY, 120 + (0.4 - stopT) * 1600, C.paper, 0.3);
    // 1枚目だけ: 閃光の時に押す手のお手本(待つ間は浮かせて見せる)
    if (!fin && readyT <= 0 && shot === 0 && (phase === 'pose' || phase === 'wait' || phase === 'flash')) {
      game.draw.hand(W * 0.72, H * 0.86 + (phase === 'flash' ? 8 : -20), { press: phase === 'flash', scale: 11, alpha: 0.45 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, C.brassHi);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['E5', 1], ['R', 1], ['B4', 1],
      ['D5', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 0.5], ['A4', 0.5], ['B4', 2],
    ], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true, bass: [['G2', 2], ['D3', 2], ['E2', 2], ['D3', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
