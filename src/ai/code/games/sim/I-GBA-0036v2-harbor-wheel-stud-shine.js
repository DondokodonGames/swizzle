// I-GBA-0036v2-harbor-wheel-stud-shine.js
// 舵輪の鋲みがき — 曇った真鍮の飾り鋲の上で指をくるくる回し、回した分だけ光を取り戻して舵輪を磨き上げる
// 操作: 曇った鋲の上で円を描くように指を回し続ける(同じ向きに回した量だけ光が戻る)。後半は舵輪が回るので鋲を追いながら回す。赤いトゲの予告が出た鋲からは指を離す
// 終わり: 3つの舵輪(鋲2→3→4個)を15秒以内に磨き切ればCLEAR。潮しぶきを3回浴びる/時間切れでGAME OVER
// @mechanic: rotate_gesture
// @theme: harbor_chandlery_brass_wheel
// 世界観: 港の船具屋の店先で、手入れ係が売り物の舵輪に並ぶ真鍮の飾り鋲を一つずつ指先で円を描いて磨き上げ、窓から吹き込む潮しぶきをかわす
// 残るもの: 正誤(CLEAR/GAME OVER) + 磨いた鋲の数・最大連続・残り秒のスコア
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗めで金属質。背景は動かない1枚絵として描き込み、粒状ノイズと金属のハイライト
  var STYLE = { bg: ['#101418', '#242a2e', '#3a3028'], main: ['#c0903c', '#6e4c20', '#f2dc9c'], accent: ['#4e8c78', '#f6f2e4'] };
  var M = {
    ink: '#080a0c', brass: STYLE.main[0], brassDk: STYLE.main[1], brassHi: STYLE.main[2], verd: STYLE.accent[0], white: STYLE.accent[1],
    wood: '#5a3a22', woodHi: '#82593a', woodDk: '#34200f', sea: '#2c4c5c', seaHi: '#5a8a98', ng: '#e2503a', ok: '#96d6a6', spray: '#b4e0f4',
  };

  var GAME_TITLE = 'BRASS SHINE';
  var TIME_LIMIT = 15;
  var WHEELS = [{ n: 2, spin: 0, spray: false }, { n: 3, spin: 0.32, spray: false }, { n: 4, spin: -0.5, spray: true }];
  var NEEDED = 9;
  var MISS_MAX = 3;
  var TURN_NEED = Math.PI * 2.5;
  var CX = W / 2, CY = Math.round(H * 0.45), R_RIM = 318, R_GRIP = 405, STUD_R = 46;

  var GRAIN = [];
  for (var gi = 0; gi < 170; gi++) GRAIN.push({ x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H), w: 2 + Math.floor(Math.random() * 5) });

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var wheel, rot, spin, sprayOn, studs, active, lastAng, pressing, fingerX, fingerY;
  var polished, misses, combo, maxCombo, lastDone, score, timeLeft, readyT, wheelT, stopT, stopObj;
  var fin, cleared, postT, warnT, spray, sprayCD, wetT, cheerT, playT, finalScore;

  // 手入れ係(水夫帽の老人)。待機2コマ・磨き2コマ・びしょ濡れ・万歳
  var KEEP_A = ['..cccccc..', '.cccccccc.', '..ffffff..', '..fkffkf..', '..ffffff..', '..fwwwwf..', '...wwww...', '.bsbsbsbb.', 'bsbsbsbsbs', 'bb.bbbb.bb'];
  var KEEP_B = ['..cccccc..', '.cccccccc.', '..ffffff..', '..fkffkf..', '..ffffff..', '..fwwwwf..', '...wwww...', '.bsbsbsbb.', 'bsbsbsbsbs', '.bb.bb.bb.'];
  var KEEP_P1 = ['..cccccc..', '.cccccccc.', '..ffffff..', '..fkffkf..', '..ffffff..', '..fwwwwf.r', '...wwww.rr', '.bsbsbsbbf', 'bsbsbsbsb.', 'bb.bbbb.b.'];
  var KEEP_P2 = ['..cccccc..', '.cccccccc.', '..ffffff..', '..fkffkf..', '..ffffff..', '..fwwwwf..', '...wwww...', '.bsbsbsbbf', 'bsbsbsbsbr', 'bb.bbbb.rr'];
  var KEEP_WET = ['d.cccccc.d', '.cccccccc.', '.dffffffd.', '..fkkfkkf.', '..ffffff..', 'd.fwwwwf.d', '...wwww...', '.bsbsbsbb.', 'bsbsbsbsbs', 'bb.bbbb.bb'];
  var KEEP_JOY = ['f.cccccc.f', 'fcccccccf.', '.fffffff..', '..fkffkf..', '..ffffff..', '..fwkkwf..', '...wwww...', '.bsbsbsbb.', 'bsbsbsbsbs', 'bb.bbbb.bb'];
  var KEEP_PAL = { c: '#24324a', f: '#e2b48a', k: '#101010', w: '#eeeae0', b: '#2e4a6a', s: '#dcd8cc', r: '#c8c0a8', d: '#8ccaf0' };
  var GULL_A = ['..ww..', 'wwwwww', '.wwwy.', '..kk..'];
  var GULL_B = ['w....w', '.wwww.', '.wwwy.', '..kk..'];
  var GULL_PAL = { w: '#e8ecee', y: '#e0a030', k: '#3a3a3a' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: M.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function studPos(s) { return { x: CX + Math.cos(s.ang + rot) * R_RIM, y: CY + Math.sin(s.ang + rot) * R_RIM }; }
  function progOf(s) { return Math.min(1, Math.abs(s.acc) / TURN_NEED); }

  function setupWheel(n, sp, sprayFlag) {
    rot = game.random(0, 6.28); spin = sp; sprayOn = sprayFlag;
    var idx = [0, 1, 2, 3, 4, 5, 6, 7];
    for (var i = 7; i > 0; i--) { var j = Math.min(i, Math.floor(game.random(0, i + 1))); var tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
    studs = [];
    for (var k = 0; k < 8; k++) studs.push({ ang: k * Math.PI / 4 + Math.PI / 8, dirty: false, done: true, acc: 0, tick: 0, flash: 0, t0: -1 });
    for (var m = 0; m < n; m++) { var s = studs[idx[m]]; s.dirty = true; s.done = false; }
    active = null; lastAng = null; spray = null; sprayCD = 0.7;
  }

  function initGame() {
    wheel = 0; pressing = false; fingerX = CX; fingerY = CY;
    polished = 0; misses = 0; combo = 0; maxCombo = 0; lastDone = -9; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; wheelT = 0; stopT = 0; stopObj = null;
    fin = false; cleared = false; postT = 0; warnT = 0; wetT = 0; cheerT = 0; playT = 0; finalScore = 0;
    setupWheel(WHEELS[0].n, WHEELS[0].spin, WHEELS[0].spray);
  }

  function dirtyLeft() {
    var n = 0;
    for (var i = 0; i < studs.length; i++) if (studs[i].dirty && !studs[i].done) n++;
    return n;
  }
  function firstDirty() {
    for (var i = 0; i < studs.length; i++) if (studs[i].dirty && !studs[i].done) return studs[i];
    return null;
  }

  function pickStud(x, y) {
    var best = null, bd = 250;
    for (var i = 0; i < studs.length; i++) {
      var s = studs[i];
      if (s.done) continue;
      var p = studPos(s), d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // 指の位置を受け取り、鋲の周りで回した角度ぶん光を戻す(本番・デモ共通)
  function rubAt(x, y) {
    fingerX = x; fingerY = y;
    var near = pickStud(x, y);
    if (near !== active) {
      var da0 = active && !active.done ? Math.hypot(studPos(active).x - x, studPos(active).y - y) : 1e9;
      var dn = near ? Math.hypot(studPos(near).x - x, studPos(near).y - y) : 1e9;
      if (!active || active.done || da0 > 290 || da0 - dn > 60) { active = near; lastAng = null; }
    }
    if (!active) return;
    var p = studPos(active), d = Math.hypot(x - p.x, y - p.y);
    if (d < 20) { lastAng = null; return; }
    var a = Math.atan2(y - p.y, x - p.x);
    if (lastAng !== null) {
      var da = angDiff(a, lastAng);
      if (Math.abs(da) < 1.3) {
        if (active.t0 < 0) active.t0 = game.time.elapsed;
        active.acc += da;
        var tk = Math.floor(Math.abs(active.acc) / (Math.PI / 4));
        if (tk > active.tick) { active.tick = tk; game.audio.tone(380 + tk * 55, 0.035, { wave: 'square', volume: 0.05 }); }
        else if (tk < active.tick) active.tick = tk;
        if (progOf(active) >= 1) shineDone(active, p);
      }
    }
    lastAng = a;
  }

  function shineDone(s, p) {
    s.done = true; s.flash = 0.5;
    polished++;
    var now = game.time.elapsed;
    combo = now - lastDone < 1.4 ? combo + 1 : 1;
    lastDone = now;
    if (combo > maxCombo) maxCombo = combo;
    var fast = now - s.t0 < 0.95;
    var pts = (fast ? 200 : 100) * Math.min(4, combo);
    score += pts;
    game.feedback.good(p.x, p.y, { text: fast ? 'PERFECT' : 'GOOD', color: M.brassHi, size: 54 });
    game.audio.play('se_coin', 0.3);
    game.fx.popup('+' + pts + (combo >= 2 ? ' x' + combo : ''), p.x, p.y - 120, { color: M.white, size: 38 });
    active = null; lastAng = null;
    if (spray && spray.stud === s) spray = null;
    if (dirtyLeft() === 0) {
      wheelT = 0.9; cheerT = 0.9;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('NICE', CX, CY, { color: M.brassHi, size: 96 });
      for (var i = 0; i < 8; i++) game.fx.burst(CX + Math.cos(i * 0.785 + rot) * R_RIM, CY + Math.sin(i * 0.785 + rot) * R_RIM, { color: M.brassHi, count: 6, speed: 260 });
    }
  }

  function splashed(s, p) {
    s.acc *= 0.4; s.tick = 0;
    misses++; combo = 0; wetT = 0.8;
    if (misses >= MISS_MAX) {
      stopT = 0.45; stopObj = { kind: 'splash', s: s, x: p.x, y: p.y };
      game.fx.flash('#ffffff', 0.12);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    game.feedback.bad(p.x, p.y, { text: 'MISS', color: M.ng, size: 56 });
  }

  function stepSpray(dt) {
    if (spray) {
      spray.t -= dt;
      if (spray.t <= 0) {
        var s = spray.stud, p = studPos(s);
        spray = null;
        game.fx.burst(p.x, p.y, { color: M.spray, count: 24, speed: 480 });
        game.audio.tone('G2', 0.22, { wave: 'sawtooth', volume: 0.07, slide: 90 });
        if (pressing && active === s && !s.done && Math.hypot(fingerX - p.x, fingerY - p.y) < 260) splashed(s, p);
      }
    } else if (sprayOn) {
      sprayCD -= dt;
      if (sprayCD <= 0) {
        sprayCD = 2.0;
        var tg = active && !active.done ? active : firstDirty();
        if (tg) {
          spray = { stud: tg, t: 0.7 };
          game.audio.tone('E6', 0.07, { wave: 'square', volume: 0.07 });
          game.audio.tone('B5', 0.07, { wave: 'square', volume: 0.06 });
        }
      }
    }
  }

  function stepAnim(dt) {
    rot += spin * dt;
    for (var i = 0; i < studs.length; i++) if (studs[i].flash > 0) studs[i].flash -= dt;
    if (wetT > 0) wetT -= dt;
    if (cheerT > 0) cheerT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(CX + Math.cos(i) * 260, CY + Math.sin(i) * 260, { color: i % 2 ? M.brassHi : M.white, count: 18, speed: 520 });
      game.fx.flash(M.brassHi, 0.22);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    if (stopObj.kind === 'win') { ending(true); return; }
    game.feedback.bad(stopObj.x, stopObj.y, { text: stopObj.kind === 'time' ? 'TIME UP' : 'MISS', color: M.ng, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && wheelT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    pressing = true; active = null; lastAng = null;
    rubAt(x, y);
    game.audio.play('se_tap', active ? 0.12 : 0.05);
  });
  game.onMove(function(x, y) {
    if (!pressing || !canPlay()) return;
    rubAt(x, y);
    if (active && Math.random() < 0.15) game.fx.burst(x, y, { color: M.brassHi, count: 2, speed: 110 });
  });
  game.onRelease(function(x, y) {
    if (!pressing) return;
    pressing = false; lastAng = null;
    if (canPlay()) game.audio.tone('A4', 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function shop(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.4, STYLE.bg[1]], [0.78, STYLE.bg[2]], [1, '#1c140e']]);
    // 窓と港(動かない1枚絵 + 波のきらめきだけ)
    game.draw.rect(150, 236, 780, 250, M.woodDk);
    game.draw.gradient(250, 476, [[0, '#4a6470'], [0.55, '#6a8a90'], [0.56, M.sea], [1, '#1e3644']]);
    game.draw.rect(0, 236, 150, 250, STYLE.bg[1]);
    game.draw.rect(930, 236, 150, 250, STYLE.bg[1]);
    game.draw.rect(150, 236, 780, 14, M.woodDk);
    game.draw.rect(150, 476, 780, 14, M.woodDk);
    game.draw.rect(534, 236, 12, 250, M.woodDk);
    for (var m = 0; m < 3; m++) game.draw.line(260 + m * 230, 380, 260 + m * 230 + Math.sin(t * 0.8 + m) * 4, 290, '#2a3a44', 5);
    for (var s = 0; s < 10; s++) game.draw.rect(170 + ((s * 83 + t * 30) % 740), 410 + (s % 4) * 16, 26, 3, M.seaHi, 0.5 + Math.sin(t * 3 + s) * 0.3);
    var gf = Math.floor(t * 3) % 2 ? GULL_A : GULL_B;
    game.draw.sprite(gf, GULL_PAL, 820 + Math.sin(t * 0.6) * 40, 300 + Math.sin(t * 2) * 8, 7, { anchor: 'center' });
    // 棚のロープと錨の影
    for (var r = 0; r < 4; r++) { game.draw.circle(80, 620 + r * 60, 34, '#6a5a40', 0.5); game.draw.circle(80, 620 + r * 60, 18, STYLE.bg[1], 0.9); }
    game.draw.rect(990, 560, 14, 320, '#3a3a3a', 0.5);
    game.draw.circle(997, 900, 50, '#3a3a3a', 0.35);
    // 作業台
    game.draw.rect(0, Math.round(H * 0.73), W, 26, M.woodHi);
    game.draw.rect(0, Math.round(H * 0.73) + 26, W, H, M.wood);
    for (var p = 0; p < 6; p++) game.draw.rect(0, Math.round(H * 0.76) + p * 80, W, 3, M.woodDk, 0.6);
    // 窓からの光
    game.draw.rect(330, 490, 140, 900, M.brassHi, 0.025);
    game.draw.rect(610, 490, 140, 900, M.brassHi, 0.025);
    for (var g = 0; g < GRAIN.length; g++) game.draw.rect(GRAIN[g].x, GRAIN[g].y, GRAIN[g].w, 1, '#ffffff', 0.05);
  }

  function drawWheel(t) {
    game.draw.circle(CX + 26, CY + 34, R_GRIP + 10, M.ink, 0.3);
    for (var k = 0; k < 8; k++) {
      var a = k * Math.PI / 4 + rot, ca = Math.cos(a), sa = Math.sin(a);
      game.draw.line(CX + ca * 60, CY + sa * 60, CX + ca * (R_GRIP - 20), CY + sa * (R_GRIP - 20), M.woodDk, 30);
      game.draw.line(CX + ca * 60, CY + sa * 60, CX + ca * (R_GRIP - 20), CY + sa * (R_GRIP - 20), M.wood, 20);
      game.draw.circle(CX + ca * R_GRIP, CY + sa * R_GRIP, 32, M.woodDk);
      game.draw.circle(CX + ca * R_GRIP, CY + sa * R_GRIP, 24, M.woodHi);
      game.draw.circle(CX + ca * R_GRIP - 8, CY + sa * R_GRIP - 8, 8, '#a07a52', 0.8);
    }
    var seg = 40;
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2 + 0.02;
      game.draw.line(CX + Math.cos(a0) * R_RIM, CY + Math.sin(a0) * R_RIM, CX + Math.cos(a1) * R_RIM, CY + Math.sin(a1) * R_RIM, M.woodDk, 62);
      game.draw.line(CX + Math.cos(a0) * R_RIM, CY + Math.sin(a0) * R_RIM, CX + Math.cos(a1) * R_RIM, CY + Math.sin(a1) * R_RIM, M.wood, 48);
      var lit = Math.cos(a0 + 2.4) > 0.3;
      if (lit) game.draw.line(CX + Math.cos(a0) * (R_RIM - 14), CY + Math.sin(a0) * (R_RIM - 14), CX + Math.cos(a1) * (R_RIM - 14), CY + Math.sin(a1) * (R_RIM - 14), M.woodHi, 8);
    }
    game.draw.circle(CX, CY, 92, M.ink, 0.6);
    game.draw.circle(CX, CY, 84, M.brassDk);
    game.draw.circle(CX, CY, 68, M.brass);
    game.draw.circle(CX - 22, CY - 24, 22, M.brassHi, 0.8);
    game.draw.circle(CX, CY, 20, M.brassDk);
    for (var n = 0; n < studs.length; n++) drawStud(studs[n], t);
  }

  function drawStud(s, t) {
    var p = studPos(s), pr = s.dirty ? progOf(s) : 1;
    var big = stopObj && stopT > 0 && stopObj.s === s ? 1.35 + (0.45 - stopT) : 1;
    var r = STUD_R * big;
    var whiteFlash = (s.flash > 0 && Math.floor(s.flash * 20) % 2 === 0) || (big > 1 && Math.floor(t * 16) % 2 === 0);
    if (s.dirty && !s.done) {
      var pa = 0.35 + Math.sin(t * 8) * 0.3;
      game.draw.circle(p.x, p.y, r + 16 + Math.sin(t * 8) * 3, M.white, pa * 0.5);
    }
    game.draw.circle(p.x + 6, p.y + 8, r + 4, M.ink, 0.6);
    game.draw.circle(p.x, p.y, r + 4, M.brassDk);
    game.draw.circle(p.x, p.y, r - 4, whiteFlash ? M.white : M.brass);
    if (pr < 1) {
      game.draw.circle(p.x, p.y, r - 2, M.verd, 0.95 * (1 - pr));
      for (var d = 0; d < 5; d++) game.draw.circle(p.x + Math.cos(d * 1.9 + s.ang) * r * 0.45, p.y + Math.sin(d * 1.9 + s.ang) * r * 0.45, 7, '#2e5a4a', 0.9 * (1 - pr));
    }
    game.draw.circle(p.x - r * 0.32, p.y - r * 0.34, r * 0.28, M.brassHi, 0.25 + 0.75 * pr);
    game.draw.circle(p.x - r * 0.4, p.y - r * 0.42, r * 0.1, M.white, pr);
    if (s.done && s.dirty) {
      var tw = 18 + Math.sin(t * 6 + s.ang * 3) * 10;
      game.draw.line(p.x + 18 - tw, p.y - 22, p.x + 18 + tw, p.y - 22, M.white, 3);
      game.draw.line(p.x + 18, p.y - 22 - tw, p.x + 18, p.y - 22 + tw, M.white, 3);
    }
    if (s === active && !s.done) {
      var lit = Math.floor(pr * 16);
      for (var k = 0; k < 16; k++) {
        var a = k / 16 * Math.PI * 2 - Math.PI / 2;
        game.draw.circle(p.x + Math.cos(a) * (r + 30), p.y + Math.sin(a) * (r + 30), k < lit ? 9 : 5, k < lit ? M.brassHi : M.ink, k < lit ? 1 : 0.6);
      }
    }
    if (spray && spray.stud === s) {
      var blink = Math.floor(t * 12) % 2 === 0;
      var k2 = 1 - spray.t / 0.7;
      for (var q = 0; q < 12; q++) {
        var qa = q / 12 * Math.PI * 2 + t * 2;
        game.draw.line(p.x + Math.cos(qa) * (r + 22), p.y + Math.sin(qa) * (r + 22), p.x + Math.cos(qa) * (r + 48 + k2 * 10), p.y + Math.sin(qa) * (r + 48 + k2 * 10), blink ? M.ng : '#ff9a7a', 8);
      }
      game.draw.circle(p.x, p.y - 140 + k2 * 120, 14 + k2 * 10, M.spray, 0.9);
    }
  }

  function drawKeeper(t) {
    var fr;
    if (wetT > 0) fr = KEEP_WET;
    else if (cheerT > 0 || (fin && cleared)) fr = KEEP_JOY;
    else if (pressing && active) fr = Math.floor(t * 10) % 2 ? KEEP_P1 : KEEP_P2;
    else fr = Math.floor(t * 2.5) % 2 ? KEEP_A : KEEP_B;
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 22 : Math.sin(t * 2) * 4;
    game.draw.circle(200, H * 0.885, 110, M.ink, 0.3);
    game.draw.sprite(fr, KEEP_PAL, 200, H * 0.84 + hop, 18, { anchor: 'center' });
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 36, W - 140, 30, M.ink, 0.85);
    game.draw.rect(76, 42, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? M.ng : M.brass);
    out(polished + ' / ' + NEEDED, W / 2, 116, 50, M.white);
    for (var w = 0; w < WHEELS.length; w++) {
      var done = w < wheel || (w === wheel && wheelT > 0) || (fin && cleared);
      game.draw.circle(110 + w * 70, 176, 24, M.ink, 0.8);
      game.draw.circle(110 + w * 70, 176, 18, done ? M.brassHi : (w === wheel ? M.brass : M.brassDk));
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 176, 18, m < misses ? M.spray : M.ink, m < misses ? 1 : 0.7);
    out('' + score, W - 230, 116, 34, M.brassHi);
    // 手元のメーター(親指ゾーン): いまの舵輪の残り鋲
    var left = dirtyLeft();
    for (var i = 0; i < WHEELS[wheel].n; i++) game.draw.circle(W / 2 + 120 + i * 80, H * 0.86, 26, i < WHEELS[wheel].n - left ? M.brassHi : M.verd);
  }

  function drawScene(t) {
    shop(t);
    drawWheel(t);
    drawKeeper(t);
    if (pressing && mode === S.PLAYING) {
      game.draw.rect(fingerX - 34, fingerY - 22, 68, 44, '#d8d0b8', 0.85);
      game.draw.rect(fingerX - 34, fingerY + 10, 68, 8, '#a89c80', 0.85);
    }
  }

  // ---- ATTRACT: 本物の rubAt() で 鋲Aを回し磨く → 鋲Bの途中で潮しぶきを浴びる → 鋲Cを磨く ----
  var demo = { t: 0, gx: CX, gy: CY, press: false, phi: 0, A: null, B: null, C: null, sprayed: false };
  function demoCircle(s, dt) {
    var p = studPos(s);
    demo.phi += dt * 8.2;
    demo.gx = p.x + Math.cos(demo.phi) * 72; demo.gy = p.y + Math.sin(demo.phi) * 72;
    pressing = true; demo.press = true;
    rubAt(demo.gx, demo.gy);
  }
  function demoGo(s, dt) {
    var p = studPos(s);
    demo.gx += (p.x + 72 - demo.gx) * Math.min(1, dt * 10);
    demo.gy += (p.y - demo.gy) * Math.min(1, dt * 10);
    demo.phi = 0; pressing = false; demo.press = false; lastAng = null; active = null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; setupWheel(3, 0.25, false);
      var ds = [];
      for (var i = 0; i < studs.length; i++) if (studs[i].dirty) ds.push(studs[i]);
      demo.A = ds[0]; demo.B = ds[1]; demo.C = ds[2]; demo.sprayed = false;
    }
    stepAnim(dt);
    stepSpray(dt);
    if (cyc < 0.35) demoGo(demo.A, dt);
    else if (cyc < 1.45) demoCircle(demo.A, dt);
    else if (cyc < 1.75) demoGo(demo.B, dt);
    else if (cyc < 2.6) {
      demoCircle(demo.B, dt);
      if (!demo.sprayed && cyc > 1.8) { demo.sprayed = true; spray = { stud: demo.B, t: 0.7 }; game.audio.tone('E6', 0.07, { wave: 'square', volume: 0.06 }); }
    } else if (cyc < 2.9) { pressing = false; demo.press = false; lastAng = null; demo.gy -= dt * 260; }
    else if (cyc < 3.2) demoGo(demo.C, dt);
    else if (cyc < 4.3) demoCircle(demo.C, dt);
    else { pressing = false; demo.press = false; demo.gx += (CX - demo.gx) * dt * 2; demo.gy += (H * 0.66 - demo.gy) * dt * 2; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.055 + Math.sin(t * 2) * 5, 88, M.brassHi);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, M.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, M.brassHi);
      else out('TAP TO START', W / 2, H * 0.955, 40, M.white);
      for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.08);
      return;
    }

    if (mode === S.RESULT) {
      stepAnim(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, M.ink, 0.8);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? M.ok : M.ng);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, M.white);
      out(polished + ' / ' + NEEDED + '   x' + maxCombo, W / 2, H * 0.45, 44, M.brassHi);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, M.brassHi);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, M.white);
      if (!cleared) out('あと' + (NEEDED - polished) + '個!', W / 2, H * 0.27, 60, M.brassHi);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, M.white);
      for (var s2 = 0; s2 < H; s2 += 8) game.draw.rect(0, s2, W, 2, '#000000', 0.08);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepAnim(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { polished: polished, splashes: misses, maxCombo: maxCombo, wheels: wheel + (cleared ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (wheelT > 0) {
      wheelT -= dt;
      stepAnim(dt);
      if (wheelT <= 0) {
        if (wheel >= WHEELS.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win', x: CX, y: CY };
          game.audio.play('se_powerup', 0.4);
        } else {
          wheel++;
          setupWheel(WHEELS[wheel].n, WHEELS[wheel].spin, WHEELS[wheel].spray);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepAnim(dt);
      stepSpray(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.08 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) {
        timeLeft = 0; pressing = false;
        var rem = firstDirty(), rp = rem ? studPos(rem) : { x: CX, y: CY };
        stopT = 0.45; stopObj = { kind: 'time', s: rem, x: rp.x, y: rp.y };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(CX, CY, R_GRIP + (0.4 - stopT) * 400, M.white, 0.25);
    if (!fin && readyT <= 0 && wheel === 0 && polished === 0 && playT < 1.4 && !pressing) {
      var f = firstDirty();
      if (f) {
        var fp = studPos(f), ga = t * 8;
        game.draw.hand(fp.x + Math.cos(ga) * 70, fp.y + Math.sin(ga) * 70, { press: true, scale: 12, alpha: 0.5 });
      }
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, CY, 120, M.brassHi);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.08);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 0.5], ['F4', 0.5], ['A4', 1], ['G4', 0.5], ['F4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['F4', 0.5], ['A4', 0.5], ['D5', 1.5], ['R', 0.5],
      ['C5', 0.5], ['A4', 0.5], ['F4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 2],
    ], { tempo: 116, wave: 'triangle', volume: 0.06, loop: true, bass: [['D2', 1.5], ['A2', 0.5], ['D2', 1.5], ['A2', 0.5], ['F2', 1.5], ['C3', 0.5], ['D2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
