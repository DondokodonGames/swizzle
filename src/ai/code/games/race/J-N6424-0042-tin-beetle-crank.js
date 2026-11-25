// J-N6424-0042-tin-beetle-crank.js
// ティンビートル・クランク — 背中のゼンマイを指で円を描いて巻き、ブリキの甲虫を作業台の旗ぴったりまで走らせる
// 操作: 下のゼンマイ鍵のまわりを指でぐるぐる時計回りになぞって巻く(反時計回りで戻る)。指を離すと走り出す
// 終わり: 4本中3本を旗の帯に止めれば成功。2本外す(2.8秒巻き始めない回も外れ)、または15秒の時間切れで失敗
// @mechanic: rotate_gesture
// @theme: tin_toy_workbench_run
// 世界観: 閉店後のおもちゃ修理工房で、職人見習いが直したブリキの甲虫の走りを検品する。巻きすぎれば作業台の端から粉袋へ落ち、足りなければ旗に届かない
// 残るもの: 正誤(CLEAR/GAME OVER) + 旗に止めた本数とPERFECT数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢ボタン。gradient で厚みを作る
  var STYLE = { bg: ['#3b2616', '#6b4428', '#a8743f'], main: ['#c9cfd6', '#8a939c', '#2d6b3f'], accent: ['#f5c542', '#d8453b'] };

  var TITLE = 'TIN BEETLE';
  var TIME_LIMIT = 15;
  var HEATS = 4;
  var NEEDED = 3;
  var MAX_MISS = 2;
  var KX = W / 2, KY = H * 0.83;
  var START_Y = H * 0.66;
  var EDGE_Y = H * 0.17;
  var TRACK_X = W / 2;
  var PX_PER_TURN = 320;
  var MAX_TURNS = 3.2;
  var TARGETS = [1.25, 2.05, 1.6, 2.5];
  var TOLS = [0.22, 0.18, 0.15, 0.13];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BEETLE_A = ['..a....a..', '...a..a...', '..ssssss..', '.sSSSSSSs.', 'lsSSkkSSsl', '.sSSkkSSs.', 'lsSSSSSSsl', '.sSSSSSSs.', 'lssSSSSssl', '..ssssss..'];
  var BEETLE_B = ['..a....a..', '...a..a...', '..ssssss..', 'lsSSSSSSsl', '.sSSkkSSs.', 'lsSSkkSSsl', '.sSSSSSSs.', 'lsSSSSSSsl', '.ssSSSSss.', '..ssssss..'];
  var BEETLE_PAL = { a: '#5b6168', s: '#8a939c', S: '#c9cfd6', k: '#f5c542', l: '#4a4f55' };
  var FLAG = ['p.....', 'prrrr.', 'prrrrr', 'prrrr.', 'p.....', 'p.....', 'p.....'];
  var SACK = ['..tttt..', '.tt..tt.', 'tffffff.', 'tfffffft', 'tffffff.', '.tttttt.'];
  var GEAR = ['..gg..', 'gggggg', 'gg..gg', 'gg..gg', 'gggggg', '..gg..'];

  var h = null;
  var demo = { t: 0, gx: KX, gy: KY, press: false, ang: 0, heatDone: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 2, y + 3, { size: size, color: '#1c120a', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function newSession(isDemo) {
    var s = {
      demo: isDemo, heat: 0, good: 0, miss: 0, perfect: 0, score: 0,
      phase: 'wind', turns: 0, lastAng: null, winding: false, windT: 0, ticks: 0,
      runT: 0, runDur: 0, runDist: 0, pos: 0, result: null, pause: 0,
      hitStop: 0, over: false, win: false, endWait: -1, ready: isDemo ? 0 : 0.8,
      timeLeft: TIME_LIMIT, target: 0, tol: 0, milestone: false
    };
    setupHeat(s);
    return s;
  }

  function setupHeat(s) {
    var i = s.heat % HEATS;
    s.target = TARGETS[i] + (s.demo ? 0 : game.random(-0.12, 0.12));
    s.tol = TOLS[i];
    s.phase = 'wind'; s.turns = 0; s.lastAng = null; s.winding = false; s.windT = 0; s.ticks = 0;
    s.pos = 0; s.runT = 0; s.result = null;
  }

  function windTo(x, y) {
    var a = Math.atan2(y - KY, x - KX);
    if (h.lastAng !== null) {
      var d = a - h.lastAng;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 1.3) {
        h.turns = Math.max(0, Math.min(MAX_TURNS, h.turns + d / (Math.PI * 2)));
        var q = Math.floor(h.turns * 4);
        if (q !== h.ticks) {
          h.ticks = q;
          game.audio.tone(q % 2 ? 'E5' : 'B4', 0.03, { wave: 'square', volume: 0.05 });
          if (h.turns >= MAX_TURNS - 0.01) game.audio.play('se_powerup', 0.25);
        }
      }
    }
    h.lastAng = a;
  }

  function release() {
    if (h.phase !== 'wind') return;
    h.winding = false; h.lastAng = null;
    if (h.turns < 0.2) { game.audio.play('se_tap', 0.12); return; }
    h.phase = 'run';
    h.runDist = h.turns * PX_PER_TURN;
    h.runDur = 0.45 + h.runDist / 1500;
    h.runT = 0;
    game.audio.play('se_jump', 0.3);
  }

  function judge() {
    var reach = h.runDist / PX_PER_TURN;
    var off = Math.abs(reach - h.target);
    var fell = START_Y - h.runDist < EDGE_Y;
    h.phase = 'done'; h.pause = 0.7;
    var bx = TRACK_X, by = START_Y - h.pos;
    if (!fell && off <= h.tol) {
      var perfect = off <= 0.06;
      h.good++;
      if (perfect) h.perfect++;
      h.score += perfect ? 300 : 150;
      h.result = perfect ? 'perfect' : 'good';
      if (!h.demo) {
        game.feedback.good(bx, by - 100, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : '#8fe39a' });
        if (!h.milestone && h.good === 2) { h.milestone = true; game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.3, { color: STYLE.accent[0], size: 60 }); game.audio.play('se_milestone', 0.4); }
      } else {
        game.audio.tone('G5', 0.1, { wave: 'triangle', volume: 0.06 });
      }
      h.hitStop = 0.3;
    } else {
      h.miss++;
      h.result = fell ? 'fell' : (reach < h.target ? 'short' : 'long');
      if (fell) game.audio.play('se_break', 0.3);
      if (!h.demo) game.feedback.bad(bx, Math.max(EDGE_Y, by) - 60, { text: 'MISS' });
      else game.audio.tone('C3', 0.15, { wave: 'sawtooth', volume: 0.06 });
      h.hitStop = 0.45;
    }
    if (!h.demo) {
      if (h.good >= NEEDED) { h.over = true; h.win = true; h.hitStop = 0.5; }
      else if (h.miss >= MAX_MISS) { h.over = true; h.win = false; h.hitStop = 0.6; }
    }
  }

  function step(dt) {
    if (h.hitStop > 0) {
      h.hitStop -= dt;
      if (h.hitStop <= 0 && h.over) h.endWait = 0.6;
      return;
    }
    if (h.over) return;
    if (h.phase === 'wind') {
      h.windT += dt;
      // no touch for 2.8s -> miss; once winding, the key auto-releases at 4.5s
      if ((h.turns < 0.2 && h.windT > 2.8) || h.windT > 4.5) {
        if (h.turns >= 0.2) release();
        else {
          h.miss++; h.phase = 'done'; h.pause = 0.6; h.result = 'short'; h.hitStop = 0.4;
          if (!h.demo) {
            game.feedback.bad(KX, KY - 160, { text: 'MISS' });
            if (h.miss >= MAX_MISS) { h.over = true; h.win = false; h.hitStop = 0.6; }
          }
        }
      }
    } else if (h.phase === 'run') {
      h.runT += dt;
      var u = Math.min(1, h.runT / h.runDur);
      h.pos = h.runDist * (1 - (1 - u) * (1 - u));
      if (Math.floor(h.runT * 14) !== Math.floor((h.runT - dt) * 14)) game.audio.tone('A5', 0.02, { wave: 'square', volume: 0.025 });
      if (u >= 1) judge();
    } else if (h.phase === 'done') {
      h.pause -= dt;
      if (h.pause <= 0) {
        h.heat++;
        if (h.heat >= HEATS && !h.demo) {
          h.over = true; h.win = h.good >= NEEDED; h.endWait = 0.4;
        } else {
          setupHeat(h);
        }
      }
    }
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { h = newSession(true); demo.ang = -Math.PI / 2; demo.heatDone = 0; }
    var wantTurns = h.heat % 2 === 0 ? h.target : 3.0;
    if (h.phase === 'wind' && h.hitStop <= 0 && h.windT > 0.3) {
      demo.press = true;
      demo.ang += dt * 13;
      demo.gx = KX + Math.cos(demo.ang) * 150;
      demo.gy = KY + Math.sin(demo.ang) * 150;
      windTo(demo.gx, demo.gy);
      if (h.turns >= wantTurns) { demo.press = false; release(); }
    } else {
      demo.press = false;
    }
  }

  function drawBench() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.12, STYLE.bg[1]], [0.7, STYLE.bg[2]], [1, STYLE.bg[1]]]);
    for (var gr = 0; gr < 26; gr++) {
      var gy = 250 + gr * 62 + Math.sin(gr * 1.7) * 10;
      game.draw.line(0, gy, W, gy + Math.sin(gr) * 18, '#5a3a1f', 3);
    }
    // lamp glow
    game.draw.circle(W * 0.18, H * 0.3, 260 + Math.sin(t * 1.3) * 12, '#ffe7a8', 0.08);
    // felt runway
    game.draw.rect(TRACK_X - 150, EDGE_Y, 300, START_Y - EDGE_Y + 90, '#23512f');
    game.draw.rect(TRACK_X - 150, EDGE_Y, 12, START_Y - EDGE_Y + 90, '#17371f');
    game.draw.rect(TRACK_X + 138, EDGE_Y, 12, START_Y - EDGE_Y + 90, '#3b7a4c');
    for (var m = 0; m <= 9; m++) {
      var my = START_Y - m * PX_PER_TURN / 4 * 1.25;
      if (my > EDGE_Y) game.draw.line(TRACK_X - 150, my, TRACK_X - 110, my, '#e9dcc0', 3);
    }
    // bench edge + flour sack beyond
    game.draw.rect(0, EDGE_Y - 26, W, 26, '#2a1a0e');
    game.draw.gradient(0, EDGE_Y - 26, [[0, '#cfc4b0'], [1, '#8f846f']]);
    game.draw.sprite(SACK, { t: '#a88b5c', f: '#f3ecdc' }, TRACK_X, EDGE_Y - 120, 22, { anchor: 'center' });
    game.draw.sprite(GEAR, { g: '#b08d57' }, W * 0.12, H * 0.5 + Math.sin(t) * 6, 14, { anchor: 'center' });
    game.draw.sprite(GEAR, { g: '#8a939c' }, W * 0.88, H * 0.42 + Math.cos(t) * 6, 12, { anchor: 'center' });
    game.draw.rect(0, 0, W, H, '#ffe7a8', 0.02 + 0.03 * Math.sin(t * 1.4));
  }

  function drawRun() {
    var t = game.time.elapsed;
    var ty = START_Y - h.target * PX_PER_TURN;
    var band = h.tol * PX_PER_TURN;
    game.draw.rect(TRACK_X - 140, ty - band, 280, band * 2, STYLE.accent[0], 0.22 + 0.08 * Math.sin(t * 5));
    game.draw.sprite(FLAG, { p: '#e9dcc0', r: STYLE.accent[1] }, TRACK_X + 170, ty - 40, 14, { anchor: 'center' });
    // preview ghost: where the beetle will stop with the current winding
    if (h.phase === 'wind' && h.turns > 0 && h.heat < 2) {
      var py = Math.max(EDGE_Y - 60, START_Y - h.turns * PX_PER_TURN);
      game.draw.sprite(BEETLE_A, BEETLE_PAL, TRACK_X, py, 8, { anchor: 'center', alpha: 0.35 });
    }
    var by = START_Y - h.pos;
    var art = h.phase === 'run' && Math.floor(t * 16) % 2 ? BEETLE_B : BEETLE_A;
    var sc = 12;
    if (h.result === 'fell' && h.phase === 'done') { by = EDGE_Y - 90; sc = 9; }
    if (h.hitStop > 0 && h.result) {
      game.draw.circle(TRACK_X, by, 110, '#ffffff', 0.55);
      sc = 15;
    }
    game.draw.circle(TRACK_X, by + 20, 50, '#000000', 0.25);
    game.draw.sprite(art, BEETLE_PAL, TRACK_X + (h.phase === 'wind' ? Math.sin(t * 20) * h.turns * 2 : 0), by + Math.sin(t * 3) * 2, sc, { anchor: 'center' });
  }

  function drawKey() {
    var t = game.time.elapsed;
    var ang = h.turns * Math.PI * 2 - Math.PI / 2;
    var active = h.phase === 'wind';
    game.draw.circle(KX, KY, 190, '#1c120a', 0.35);
    game.draw.circle(KX, KY, 175, active ? '#d9dee4' : '#8a939c');
    game.draw.circle(KX, KY, 160, '#aeb6be');
    for (var q = 0; q < 12; q++) {
      var qa = q / 12 * Math.PI * 2;
      game.draw.line(KX + Math.cos(qa) * 140, KY + Math.sin(qa) * 140, KX + Math.cos(qa) * 158, KY + Math.sin(qa) * 158, '#5b6168', 5);
    }
    // wound-turns arc (dots) — how much spring is stored
    var dots = Math.floor(h.turns * 12);
    for (var d = 0; d < dots && d < 40; d++) {
      var da = d / 12 * Math.PI * 2 - Math.PI / 2;
      var ring = 205 + Math.floor(d / 12) * 22;
      var v = (d + 1) / 12;
      var dc = v > h.target + h.tol ? STYLE.accent[1] : (v >= h.target - h.tol ? '#8fe39a' : STYLE.accent[0]);
      game.draw.circle(KX + Math.cos(da) * ring, KY + Math.sin(da) * ring, 8, dc);
    }
    // target notch on the dial (where the flag sits in turns)
    var ta = h.target * Math.PI * 2 - Math.PI / 2;
    var tr = 205 + Math.floor(h.target) * 22;
    game.draw.line(KX + Math.cos(ta) * (tr - 16), KY + Math.sin(ta) * (tr - 16), KX + Math.cos(ta) * (tr + 16), KY + Math.sin(ta) * (tr + 16), '#8fe39a', 8);
    game.draw.line(KX - Math.cos(ang) * 110, KY - Math.sin(ang) * 110, KX + Math.cos(ang) * 110, KY + Math.sin(ang) * 110, '#5b6168', 42);
    game.draw.circle(KX + Math.cos(ang) * 110, KY + Math.sin(ang) * 110, 42, '#c9cfd6');
    game.draw.circle(KX - Math.cos(ang) * 110, KY - Math.sin(ang) * 110, 42, '#c9cfd6');
    game.draw.circle(KX, KY, 34, STYLE.accent[0]);
    if (active && !h.winding) game.draw.circle(KX, KY, 200 + Math.sin(t * 6) * 10, '#ffffff', 0.12);
  }

  function drawHud() {
    txt(h.good + ' / ' + NEEDED, W / 2, 96, 64, STYLE.accent[0]);
    for (var i = 0; i < HEATS; i++) {
      game.draw.sprite(BEETLE_A, i < h.heat + (h.phase === 'done' ? 1 : 0) ? { a: '#5b6168', s: '#5b6168', S: '#8a939c', k: '#8a939c', l: '#4a4f55' } : BEETLE_PAL, 90 + i * 70, 70, 5, { anchor: 'center' });
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W - 80 - m * 60, 70, 20, m < h.miss ? STYLE.accent[1] : '#6b4428');
    var frac = Math.max(0, h.timeLeft / TIME_LIMIT);
    game.draw.rect(60, 205, W - 120, 14, '#2a1a0e');
    game.draw.rect(60, 205, (W - 120) * frac, 14, h.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? STYLE.accent[1] : STYLE.accent[0]);
    if (h.phase === 'wind' && h.turns < 0.2 && h.windT > 2.0) game.draw.circle(KX, KY, 230, STYLE.accent[1], 0.15 + 0.1 * Math.sin(game.time.elapsed * 20));
  }

  function initGame() {
    h = newSession(false);
  }

  function closeOut() {
    state = S.RESULT;
    game.audio.stopBgm();
    var stats = { flagged: h.good, perfect: h.perfect, misses: h.miss };
    if (h.win) {
      h.score += Math.round(h.timeLeft * 20);
      game.audio.play('se_success', 0.5);
      game.end.success(h.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1]], { tempo: 132, wave: 'triangle', volume: 0.04, loop: true, bass: [['G2', 2], ['D2', 2]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || h.ready > 0 || h.over) return;
    if (h.phase !== 'wind') { game.audio.play('se_tap', 0.08); return; }
    h.winding = true; h.lastAng = null;
    game.audio.play('se_tap', 0.2);
    windTo(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || h.phase !== 'wind' || h.ready > 0 || h.over) return;
    if (!h.winding) { h.winding = true; h.lastAng = null; }
    var before = h.ticks;
    windTo(x, y);
    if (h.ticks !== before) game.fx.burst(x, y, { color: h.turns > h.target + h.tol ? STYLE.accent[1] : '#ffffff', count: 2, speed: 90 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !h.winding) return;
    if (h.turns < 0.2) game.fx.burst(KX, KY, { color: '#ffffff', count: 4, speed: 120 });
    release();
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!h || !h.demo) h = newSession(true);
      stepDemo(dt);
      step(dt);
      if (h.heat >= HEATS) h = newSession(true);
      drawBench();
      drawRun();
      drawKey();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      txt(TITLE, W / 2 + Math.sin(t * 1.4) * 6, H * 0.06, 80, STYLE.accent[0]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.1, 34, '#f3ecdc');
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 42, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.96, 34, '#f3ecdc');
      return;
    }
    if (state === S.RESULT) {
      drawBench();
      drawRun();
      game.draw.rect(0, 0, W, H, '#1c120a', 0.5);
      if (h.win) {
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: STYLE.accent[0], count: 5, speed: 280 });
        txt('CLEAR', W / 2, H * 0.3, 120, STYLE.accent[0]);
      } else {
        txt(h.timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.3, 100, STYLE.accent[1]);
        txt('あと' + Math.max(1, NEEDED - h.good) + '本!', W / 2, H * 0.37, 60, '#f3ecdc');
      }
      txt(h.good + ' / ' + NEEDED, W / 2, H * 0.45, 64, '#f3ecdc');
      txt('PERFECT ' + h.perfect, W / 2, H * 0.5, 44, STYLE.main[0]);
      txt('SCORE ' + h.score, W / 2, H * 0.55, 48, '#f3ecdc');
      if (h.win && h.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.6, 52, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.6, 40, STYLE.main[0]);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, '#f3ecdc');
      return;
    }
    // PLAYING
    if (h.ready > 0) {
      h.ready -= dt;
      if (h.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!h.over) {
        h.timeLeft -= dt;
        if (h.timeLeft <= 0) {
          h.timeLeft = 0; h.over = true; h.win = false; h.hitStop = 0.45; h.result = h.result || 'short';
          game.feedback.bad(TRACK_X, START_Y - h.pos - 60, { text: 'TIME UP' });
        }
      }
      step(dt);
      if (h.over && h.endWait > 0) {
        h.endWait -= dt;
        if (h.endWait <= 0) { closeOut(); return; }
      }
    }
    drawBench();
    drawRun();
    drawKey();
    drawHud();
    if (h.ready > 0) {
      txt(h.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, STYLE.accent[0]);
      var ra = t * 8;
      game.draw.hand(KX + Math.cos(ra) * 150, KY + Math.sin(ra) * 150, { press: true, scale: 11 });
    }
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 1], ['D5', 1]], { tempo: 104, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    h = newSession(true);
    demo.t = 0;
  });
})(game);
