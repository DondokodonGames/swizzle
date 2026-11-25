// I-GBA-0022v2-snowmelt-bud-string.js
// スノーメルトバドストリング — 雪解けの野に顔を出したふきのとうを、指の一筆でつないで一度に摘み集める
// 操作: ふきのとうに触れたまま指を動かし、近くのふきのとうを次々になぞってつなぐ。離すとつないだ分をまとめて摘む。つなぎ先が遠すぎたり残雪に線が触れると線が切れる
// 終わり: 制限時間終了時に18本以上摘めていればCLEAR、足りなければGAME OVER
// @mechanic: connect
// @theme: snowmelt_bud_forager
// 世界観: 雪解けの野原で、山菜採りの老人が残雪のあいだに点々と顔を出すふきのとうを一筆書きでつなぎ、雪を踏まずにまとめて籠へ摘み集めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 摘んだ本数・最長の一筆
// スタイル: 90s LOW POLY
var STYLE = { bg: ['#a9b8c8', '#dfe6ea', '#8a9a6a'], main: ['#6e8a3e', '#4a5e2a'], accent: ['#f2e27a', '#e8f0f8'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TIME_LIMIT = 20;
  var NEEDED = 18;
  var LINK = 360;
  var GRAB = 70;
  var FIELD_TOP = H * 0.2, FIELD_BOT = H * 0.7;

  var BUD = [
    '...gg...',
    '..gyyg..',
    '.gyyyyg.',
    '.gyYyyg.',
    'gGyyyyGg',
    '.gGggGg.',
    '..gggg..',
    '...dd...',
  ];
  var BUD_PAL = { g: '#7ea04a', G: '#5a7a32', y: '#e8e08a', Y: '#fff6c0', d: '#5a4a30' };
  var ELDER = [
    '...hhhh...',
    '..hhhhhh..',
    '.hhhhhhhh.',
    '...ssss...',
    '...sesw...',
    '...swww...',
    '..cccccc..',
    '.cccccccc.',
    '.c.cccc.c.',
    '...cccc...',
    '...p..p...',
    '..pp..pp..',
  ];
  var ELDER_B = [
    '...hhhh...',
    '..hhhhhh..',
    '.hhhhhhhh.',
    '...ssss...',
    '...sesw...',
    '...swww...',
    '..cccccc..',
    '.cccccccc.',
    'c..cccc..c',
    '...cccc...',
    '...p..p...',
    '...p..p...',
  ];
  var ELDER_PAL = { h: '#b08a4a', s: '#e0b890', e: '#2a2a2a', w: '#f4f4f0', c: '#4a6a8a', p: '#3a3a44' };
  var BASKET = ['b.b.b.b.b', 'bbbbbbbbb', '.bBbBbBb.', '.bbbbbbb.', '..bbbbb..'];

  var screen = 'ATTRACT';
  var buds = [], patches = [], chain = [], flyers = [];
  var fx0, fy0, clock, picked, longest, wave, snapCue, patchClock, finished, endDelay, success, pts, rec, readyT, active;

  function jitter(i, k) { return Math.sin(i * 12.9898 + k * 78.233 + wave * 3.1) * 43758.5453 % 1; }

  function spawnWave() {
    buds = []; patches = [];
    var cols = 4, rows = 4;
    var sx = (W - 300) / (cols - 1), sy = (FIELD_BOT - FIELD_TOP - 140) / (rows - 1);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = r * cols + c;
        if ((i + wave) % 7 === 3) continue;
        buds.push({
          x: 150 + c * sx + jitter(i, 1) * 30,
          y: FIELD_TOP + 90 + r * sy + jitter(i, 2) * 30,
          taken: false, pop: 0,
        });
      }
    }
    var cells = [[0, 0], [2, 1], [1, 2], [0, 1], [2, 2], [1, 0]];
    for (var p = 0; p < 2; p++) {
      var cell = cells[(wave * 2 + p) % cells.length];
      addPatch(150 + (cell[0] + 0.5) * sx, FIELD_TOP + 90 + (cell[1] + 0.5) * sy, 0.2 + p * 0.3);
    }
    wave++;
  }

  function addPatch(x, y, delay) {
    patches.push({ x: x, y: y, r: 78, warn: 0.6 + delay, solid: false });
  }

  function resetField() {
    wave = 0; spawnWave();
    chain = []; flyers = []; active = false;
    fx0 = 0; fy0 = 0; clock = TIME_LIMIT; picked = 0; longest = 0;
    snapCue = null; patchClock = 3; finished = false; endDelay = 0; success = false; pts = 0; rec = false; readyT = 0.8;
  }

  function write(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#2a3440', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  // 低ポリ面を横ストリップで塗る(三角形: 頂点(ax,ay) 底辺 y=by, 幅 bw)
  function stripTri(ax, ay, by, bw, color, alpha) {
    for (var y = ay; y < by; y += 6) {
      var k = (y - ay) / (by - ay);
      game.draw.rect(ax - bw * 0.5 * k, y, bw * k, 6, color, alpha);
    }
  }

  function drawMeadow() {
    var t = game.time.elapsed;
    game.draw.gradient(0, FIELD_TOP + 60, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    stripTri(W * 0.2, FIELD_TOP - 160, FIELD_TOP + 60, 620, '#7a8a9e', 1);
    stripTri(W * 0.7, FIELD_TOP - 220, FIELD_TOP + 60, 760, '#6a7a90', 1);
    stripTri(W * 0.7, FIELD_TOP - 220, FIELD_TOP - 120, 350, '#f0f4f8', 1);
    stripTri(W * 0.2, FIELD_TOP - 160, FIELD_TOP - 80, 230, '#f0f4f8', 1);
    game.draw.gradient(FIELD_TOP + 60, H, [[0, '#9aa878'], [0.5, STYLE.bg[2]], [1, '#6a7a4a']]);
    for (var i = 0; i < 14; i++) {
      var gx = (i * 97) % W, gy = FIELD_TOP + 120 + ((i * 211) % 1000);
      game.draw.line(gx, gy, gx + 40, gy - 18 + Math.sin(t + i) * 3, '#b0bc88', 3);
      game.draw.line(gx + 40, gy - 18 + Math.sin(t + i) * 3, gx + 80, gy, '#b0bc88', 3);
    }
    game.draw.rect(0, FIELD_TOP + 40, W, 90, '#ffffff', 0.18 + 0.05 * Math.sin(t * 0.7));
  }

  function drawPatch(p) {
    var t = game.time.elapsed;
    if (!p.solid) {
      if (Math.floor(t * 12) % 2 === 0) {
        for (var a = 0; a < 6; a++) {
          var a0 = a * Math.PI / 3, a1 = (a + 1) * Math.PI / 3;
          game.draw.line(p.x + Math.cos(a0) * p.r, p.y + Math.sin(a0) * p.r * 0.7, p.x + Math.cos(a1) * p.r, p.y + Math.sin(a1) * p.r * 0.7, '#ffffff', 5);
        }
      }
      return;
    }
    for (var y = -p.r * 0.7; y < p.r * 0.7; y += 5) {
      var k = 1 - Math.abs(y) / (p.r * 0.7);
      var hw = p.r * (0.5 + 0.5 * k);
      game.draw.rect(p.x - hw, p.y + y, hw * 2, 5, y < 0 ? '#f4f8fc' : '#d0dcea');
    }
    game.draw.line(p.x - p.r, p.y, p.x + p.r, p.y, '#b8c8da', 3);
  }

  function drawBud(b) {
    if (b.taken) return;
    var bob = Math.sin(game.time.elapsed * 2.5 + b.x) * 3;
    var inChain = chain.indexOf(b) >= 0;
    if (inChain) game.draw.circle(b.x, b.y, 48, STYLE.accent[0], 0.45);
    game.draw.circle(b.x, b.y + 30, 36, '#3a4a2a', 0.3);
    game.draw.sprite(BUD, BUD_PAL, b.x, b.y + bob, 9 + (inChain ? 2 : 0), { anchor: 'center' });
  }

  function drawChain() {
    for (var i = 1; i < chain.length; i++) {
      game.draw.line(chain[i - 1].x, chain[i - 1].y, chain[i].x, chain[i].y, '#5a4a30', 16);
      game.draw.line(chain[i - 1].x, chain[i - 1].y, chain[i].x, chain[i].y, STYLE.accent[0], 8);
    }
    if (active && chain.length) {
      var last = chain[chain.length - 1];
      var d = Math.hypot(fx0 - last.x, fy0 - last.y);
      var strain = d / LINK;
      var col = strain > 0.8 ? (Math.floor(game.time.elapsed * 14) % 2 ? '#e04a3a' : '#ffffff') : STYLE.accent[0];
      game.draw.line(last.x, last.y, fx0, fy0, col, 6);
      game.draw.circle(last.x, last.y, LINK, '#ffffff', 0.05);
    }
  }

  function drawElder() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 2.5) % 2 ? ELDER : ELDER_B;
    game.draw.sprite(fr, ELDER_PAL, W * 0.18, H * 0.82 + Math.sin(t * 2.5) * 4, 14, { anchor: 'center' });
    game.draw.sprite(BASKET, { b: '#8a6a3a', B: '#c89a5a' }, W * 0.36, H * 0.86, 14, { anchor: 'center' });
    var n = Math.min(12, picked);
    for (var i = 0; i < n; i++) game.draw.circle(W * 0.36 - 48 + (i % 6) * 19, H * 0.84 - Math.floor(i / 6) * 16, 10, '#8ab04a');
  }

  function segHitsPatch(ax, ay, bx, by) {
    for (var i = 0; i < patches.length; i++) {
      var p = patches[i];
      if (!p.solid) continue;
      var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
      var u = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - ax) * vx + (p.y - ay) * vy) / l2)) : 0;
      var cx = ax + vx * u, cy = ay + vy * u;
      if (Math.hypot(p.x - cx, (p.y - cy) / 0.7) < p.r * 0.85) return p;
    }
    return null;
  }

  // ── 一筆の入力処理(実プレイとデモで共通) ───────────────────────────────────
  function strokeBegin(x, y) {
    fx0 = x; fy0 = y;
    for (var i = 0; i < buds.length; i++) {
      var b = buds[i];
      if (!b.taken && Math.hypot(b.x - x, b.y - y) < GRAB) {
        chain = [b]; active = true;
        game.audio.play('se_tap', 0.3);
        game.fx.burst(b.x, b.y, { color: STYLE.accent[0], count: 5, speed: 120 });
        return true;
      }
    }
    game.audio.tone('E3', 0.05, { wave: 'triangle', volume: 0.06 });
    game.fx.burst(x, y, { color: '#ffffff', count: 3, speed: 80 });
    return false;
  }

  function strokeMove(x, y) {
    if (!active || snapCue) return;
    fx0 = x; fy0 = y;
    var last = chain[chain.length - 1];
    if (segHitsPatch(last.x, last.y, x, y) || Math.hypot(x - last.x, y - last.y) > LINK) {
      snapCue = { t: 0.38, x: x, y: y };
      active = false;
      game.audio.play('se_break', 0.35);
      return;
    }
    for (var i = 0; i < buds.length; i++) {
      var b = buds[i];
      if (b.taken || chain.indexOf(b) >= 0) continue;
      if (Math.hypot(b.x - x, b.y - y) < GRAB) {
        chain.push(b);
        game.audio.tone(330 + chain.length * 60, 0.07, { wave: 'square', volume: 0.07 });
        game.fx.burst(b.x, b.y, { color: STYLE.accent[0], count: 6, speed: 150 });
        break;
      }
    }
  }

  function strokeEnd(real) {
    if (!active) return;
    active = false;
    if (chain.length < 2) {
      chain = [];
      game.audio.tone('C4', 0.05, { wave: 'triangle', volume: 0.05 });
      return;
    }
    var n = chain.length;
    var tail = chain[n - 1];
    for (var i = 0; i < n; i++) {
      chain[i].taken = true;
      flyers.push({ x: chain[i].x, y: chain[i].y, t: 0.5 + i * 0.05 });
    }
    game.feedback.good(tail.x, tail.y - 40, { text: n >= 5 ? 'PERFECT' : n >= 3 ? 'GOOD' : '+' + n, color: STYLE.accent[0], count: 8 + n * 2 });
    game.audio.play('se_coin', 0.4);
    if (real) {
      var before = picked;
      picked += n;
      pts += n * n * 10;
      longest = Math.max(longest, n);
      if (before < NEEDED / 2 && picked >= NEEDED / 2) {
        game.fx.popup('NICE', W * 0.5, H * 0.26, { color: STYLE.accent[1], size: 66 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    chain = [];
    var left = 0;
    for (var k = 0; k < buds.length; k++) if (!buds[k].taken) left++;
    if (left < 3) spawnWave();
  }

  function stepField(dt) {
    for (var i = 0; i < patches.length; i++) {
      var p = patches[i];
      if (!p.solid) {
        p.warn -= dt;
        if (p.warn <= 0) { p.solid = true; game.audio.tone('A2', 0.12, { wave: 'triangle', volume: 0.08 }); }
      }
    }
    for (var f = flyers.length - 1; f >= 0; f--) {
      var fl = flyers[f];
      fl.t -= dt;
      fl.x += (W * 0.36 - fl.x) * Math.min(1, dt * 7);
      fl.y += (H * 0.84 - fl.y) * Math.min(1, dt * 7);
      if (fl.t <= 0) flyers.splice(f, 1);
    }
  }

  function resolveSnap(real) {
    game.feedback.bad(snapCue.x, snapCue.y, { text: 'MISS', shake: 14, flashColor: '#e8f0f8' });
    snapCue = null;
    chain = [];
    if (real) pts = Math.max(0, pts - 20);
  }

  function endRound() {
    if (finished) return;
    finished = true; endDelay = 1.2;
    success = picked >= NEEDED;
    rec = success && pts > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(success ? 'se_success' : 'se_failure', 0.5);
  }

  // ── ATTRACT: 4つつないで摘む成功 + 残雪に触れて切れる失敗 ─────────────────────
  var demo = { t: 0, gx: 0, gy: 0, press: false, path: [], mode: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) {
      resetField(); readyT = 0;
      for (var q = 0; q < patches.length; q++) { patches[q].warn = 0; patches[q].solid = true; }
      demo.path = [buds[0], buds[1], buds[2], buds[5]];
      demo.mode = 0;
    }
    stepField(dt);
    if (snapCue) { snapCue.t -= dt; if (snapCue.t <= 0) resolveSnap(false); }
    var p = demo.path;
    if (cyc < 0.4) {
      demo.gx = p[0].x; demo.gy = p[0].y; demo.press = false;
    } else if (cyc < 2.2) {
      if (demo.mode === 0) { strokeBegin(p[0].x, p[0].y); demo.mode = 1; }
      var k = (cyc - 0.4) / 1.8 * (p.length - 1);
      var s = Math.min(p.length - 2, Math.floor(k)), u = Math.min(1, k - s);
      demo.gx = p[s].x + (p[s + 1].x - p[s].x) * u;
      demo.gy = p[s].y + (p[s + 1].y - p[s].y) * u;
      demo.press = true;
      strokeMove(demo.gx, demo.gy);
    } else if (cyc < 2.8) {
      if (demo.mode === 1) { strokeEnd(false); demo.mode = 2; }
      demo.press = false;
    } else if (cyc < 4.4) {
      var from = null;
      for (var i = 0; i < buds.length; i++) if (!buds[i].taken) { from = buds[i]; break; }
      var pt = patches[0];
      if (demo.mode === 2 && from) { strokeBegin(from.x, from.y); demo.mode = 3; demo.sx = from.x; demo.sy = from.y; }
      var v = Math.min(1, (cyc - 2.8) / 1.2);
      demo.gx = demo.sx + (pt.x - demo.sx) * v;
      demo.gy = demo.sy + (pt.y - demo.sy) * v;
      demo.press = active;
      strokeMove(demo.gx, demo.gy);
    } else {
      demo.press = false;
    }
  }

  game.onPress(function (x, y) {
    if (screen !== 'PLAYING' || finished) return;
    if (readyT > 0 || snapCue) { game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.04 }); return; }
    strokeBegin(x, y);
  });
  game.onMove(function (x, y) {
    if (screen !== 'PLAYING' || finished) return;
    if (active) strokeMove(x, y);
    else if (Math.random() < 0.04) game.audio.tone('G2', 0.02, { wave: 'triangle', volume: 0.02 });
  });
  game.onRelease(function (x, y) {
    if (screen !== 'PLAYING') return;
    if (active) strokeEnd(true);
    else game.audio.play('se_tap', 0.05);
  });
  game.onTap(function (x, y) {
    if (screen === 'ATTRACT') {
      game.audio.play('se_coin', 0.5);
      screen = 'PLAYING'; resetField();
    } else if (screen === 'RESULT') {
      game.audio.play('se_tap', 0.3);
      screen = 'ATTRACT'; resetField(); demo.t = 0;
    }
  });

  function drawAll() {
    drawMeadow();
    for (var i = 0; i < patches.length; i++) drawPatch(patches[i]);
    drawChain();
    for (var b = 0; b < buds.length; b++) drawBud(buds[b]);
    for (var f = 0; f < flyers.length; f++) game.draw.sprite(BUD, BUD_PAL, flyers[f].x, flyers[f].y, 6, { anchor: 'center' });
    drawElder();
    if (snapCue) {
      var k = 0.38 - snapCue.t;
      game.draw.circle(snapCue.x, snapCue.y, 30 + k * 180, '#ffffff', 0.55);
      game.draw.circle(snapCue.x, snapCue.y, 22, '#ffffff');
    }
  }

  function drawHud() {
    write(picked + ' / ' + NEEDED, W * 0.5, 80, 60, '#ffffff');
    game.draw.sprite(BUD, BUD_PAL, W * 0.5 - 200, 80, 6, { anchor: 'center' });
    var fr = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(80, 150, W - 160, 20, '#2a3440', 0.5);
    game.draw.rect(80, 150, (W - 160) * fr, 20, clock < 5 ? '#e04a3a' : STYLE.main[0]);
    write('SCORE ' + pts, W * 0.78, H * 0.8, 38, '#ffffff');
  }

  game.onUpdate(function (dt) {
    if (screen === 'ATTRACT') {
      if (!buds.length) resetField();
      stepDemo(dt);
      drawAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      write('BUD STRING', W * 0.5, H * 0.07, 80, STYLE.accent[0]);
      write('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.115, 36, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W * 0.5, H * 0.95, 46, STYLE.accent[0]);
      else write('INSERT COIN', W * 0.5, H * 0.95, 38, '#ffffff');
      return;
    }
    if (screen === 'RESULT') {
      drawAll();
      game.draw.rect(90, H * 0.2, W - 180, 520, '#2a3440', 0.8);
      write(success ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.26, 100, success ? STYLE.accent[0] : '#e04a3a');
      write(picked + ' / ' + NEEDED, W * 0.5, H * 0.33, 64, '#ffffff');
      write('SCORE ' + pts, W * 0.5, H * 0.38, 46, '#ffffff');
      write('COMBO ' + longest, W * 0.5, H * 0.42, 38, STYLE.accent[0]);
      if (rec) write('NEW RECORD', W * 0.5, H * 0.46, 52, STYLE.accent[0]);
      else write('BEST ' + (game.best || 0), W * 0.5, H * 0.46, 40, '#ffffff');
      if (!success) write('あと' + (NEEDED - picked) + '本!', W * 0.5, H * 0.5, 46, '#e04a3a');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, '#ffffff');
      return;
    }

    if (finished) {
      endDelay -= dt;
      if (endDelay <= 0) {
        screen = 'RESULT';
        var st = { picked: picked, longest: longest };
        if (success) game.end.success(pts, st); else game.end.failure(st);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.3);
    } else if (snapCue) {
      snapCue.t -= dt;
      if (snapCue.t <= 0) resolveSnap(true);
    } else {
      stepField(dt);
      patchClock -= dt;
      if (patchClock <= 0) {
        patchClock = 3.2;
        var free = null;
        for (var i = 0; i < buds.length; i++) if (!buds[i].taken && chain.indexOf(buds[i]) < 0) { free = buds[i]; }
        if (free) addPatch(Math.min(W - 120, free.x + 120), free.y + 60, 0);
      }
      clock -= dt;
      if (clock <= 0) {
        clock = 0; active = false; chain = [];
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: '#e04a3a', size: 80 });
        endRound();
      }
    }

    drawAll();
    drawHud();
    if (readyT > 0) write(readyT > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.45, 100, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['E4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 1],
      ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['E4', 2],
    ], { tempo: 100, wave: 'triangle', volume: 0.07, loop: true, bass: true });
    screen = 'ATTRACT';
    resetField();
  });
})(game);
