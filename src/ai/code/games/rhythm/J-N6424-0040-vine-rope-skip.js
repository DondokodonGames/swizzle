// J-N6424-0040-vine-rope-skip.js
// ヴァイン・ロープ・スキップ — 回る蔓の縄が地面を打つ拍に合わせて跳び、テンポが上がっても引っかからずに跳び切る
// 操作: 縄が地面を打つ拍(チッという音)に合わせてタップするとハリネズミが跳ぶ。空中では跳べない
// 終わり: 16回跳び越せば成功。3回引っかかる、または14秒の時間切れで失敗
// @mechanic: rhythm
// @theme: forest_vine_jumprope
// 世界観: 夏至の森の広場で、2匹のリスが回す蔓の大縄を、祭りの鐘が鳴るまでハリネズミの子が拍に乗って跳び続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳んだ回数とPERFECT数・最大連続
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下に情報を分ける
  var STYLE = { bg: ['#ffd9e8', '#fff1d6', '#c9f2e0'], main: ['#8d6e63', '#b39ddb', '#ffffff'], accent: ['#ff7fae', '#ffc94a'] };

  var TITLE = 'VINE SKIP';
  var TIME_LIMIT = 14;
  var NEEDED = 16;
  var LIVES = 3;
  var LEAD = 0.1;
  var JUMP_T = 0.36;
  var JUMP_H = 190;
  var HAND_Y = H * 0.46;
  var FEET_Y = H * 0.64;
  var HAND_LX = W * 0.17, HAND_RX = W * 0.83;
  var BASS = ['C3', 'C3', 'G2', 'A2', 'F2', 'F2', 'G2', 'G2'];
  var CHIME = ['E5', 'G5', 'A5', 'C6', 'D6', 'E6'];

  var S = { ATTRACT: 'A', PLAYING: 'P', RESULT: 'R' };
  var state = S.ATTRACT;

  var HOG_A = ['...s.s.s....', '..sssssss...', '.sssssssss..', 'sssssfffff..', 'ssssfkfffkn.', 'sssffffffff.', '.ssffpfff...', '..ffffff....', '...ff..ff...', '...bb..bb...'];
  var HOG_B = ['....s.s.s...', '..sssssss...', '.sssssssss..', 'sssssfffff..', 'ssssfkfffkn.', 'sssffffffff.', '.ssffpfff...', '..ffffff....', '..ff....ff..', '..bb....bb..'];
  var HOG_AIR = ['..s.s.s.s...', '.sssssssss..', 'ssssssssss..', 'sssssfffff..', 'ssssfkfffkn.', 'sssffffffff.', '.sffffff....', 'ff......ff..', 'bb......bb..', '............'];
  var HOG_TRIP = ['............', '............', '..s.s.s.s...', '.sssssssss..', 'sssssfxffx..', 'ssssffffffn.', 'sssfffoofff.', '.ffffffffff.', 'bb.......bb.', '............'];
  var HOG_PAL = { s: '#8d6e63', f: '#ffe0c2', k: '#3b2a2a', n: '#ff7fae', p: '#ffb3c7', b: '#6d4c41', x: '#d23c6b', o: '#b0305a' };
  var SQ_UP = ['.tt.....', 'tttt.ee.', 'tt..eeee', 'tt.ekeew', '.t.eeee.', '..eeeeh.', '..eeee..', '..e..e..'];
  var SQ_DN = ['.tt.....', 'tttt.ee.', 'tt..eeee', 'tt.ekeew', '.t.eeee.', '..eeee..', '..eeeeh.', '..e..e..'];
  var SQ_PAL = { t: '#c98a5b', e: '#e0a877', k: '#3b2a2a', w: '#ffffff', h: '#fff1d6' };
  var FLAG = ['ffff', '.ff.', '.f..'];
  var HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
  var BELL = ['..y..', '.yyy.', '.yyy.', 'yyyyy', '..c..'];

  var r = null;
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, pressT: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x, y + 4, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function buildBeats() {
    var T = [];
    var t = 1.1;
    for (var k = 0; k < 44; k++) {
      T.push(t);
      t += Math.max(0.46, 0.64 - k * 0.012);
    }
    return T;
  }

  function makeRound(isDemo) {
    return {
      demo: isDemo, T: buildBeats(), songT: 0, tickIdx: 0, passIdx: 0, offIdx: 0,
      air: -1, jumpStart: -9, jumpedFor: -1, count: 0, perfect: 0, combo: 0, maxCombo: 0,
      lives: LIVES, trip: 0, hitStop: 0, ropeFlash: 0, over: false, win: false, endWait: -1,
      ready: isDemo ? 0 : 0.8, timeLeft: TIME_LIMIT, score: 0, milestone: false, fever: false
    };
  }

  function passTime(k) { return r.T[k] + LEAD; }

  function ropePhase() {
    var p0 = passTime(0);
    if (r.songT < p0) {
      var int0 = r.T[1] - r.T[0];
      var ph = 1 - ((p0 - r.songT) / int0) % 1;
      return ph >= 1 ? 0 : ph;
    }
    var k = Math.max(1, r.passIdx);
    while (k < r.T.length - 1 && r.songT >= passTime(k)) k++;
    var a = passTime(k - 1), b = passTime(k);
    return Math.max(0, Math.min(0.999, (r.songT - a) / (b - a)));
  }

  function heroLift() {
    if (r.air < 0) return 0;
    var u = r.air / JUMP_T;
    return 4 * JUMP_H * u * (1 - u);
  }

  function jump() {
    if (r.trip > 0) { game.audio.play('se_tap', 0.1); return; }
    if (r.air >= 0) {
      game.audio.play('se_tap', 0.08);
      game.fx.burst(W / 2, FEET_Y - heroLift(), { color: STYLE.main[1], count: 3, speed: 120 });
      return;
    }
    r.air = 0;
    r.jumpStart = r.songT;
    game.audio.play('se_jump', 0.25);
    game.fx.burst(W / 2, FEET_Y, { color: '#ffffff', count: 6, speed: 180 });
  }

  function judgePass(k) {
    var lifted = r.air >= 0 && heroLift() > 40;
    if (lifted) {
      var off = Math.abs(r.jumpStart - r.T[k]);
      var perfect = off < 0.06;
      r.count++;
      r.combo++;
      if (r.combo > r.maxCombo) r.maxCombo = r.combo;
      if (perfect) r.perfect++;
      if (r.combo >= 6) r.fever = true;
      var pts = (perfect ? 100 : 50) * (r.fever ? 2 : 1);
      r.score += pts;
      var note = CHIME[Math.min(CHIME.length - 1, Math.floor(r.combo / 3))];
      game.audio.tone(note, 0.1, { wave: 'triangle', volume: 0.07 });
      if (!r.demo) {
        game.feedback.good(W / 2, FEET_Y - 260, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[1] : '#7fd1b9', size: perfect ? 60 : 48 });
        if (r.combo === 6) { game.fx.popup('x2', W / 2, H * 0.34, { color: STYLE.accent[0], size: 64 }); game.audio.play('se_powerup', 0.35); }
        if (!r.milestone && r.count >= NEEDED / 2) { r.milestone = true; game.fx.popup(r.count + ' / ' + NEEDED, W / 2, H * 0.3, { color: '#b39ddb', size: 60 }); game.audio.play('se_milestone', 0.4); }
        if (r.count >= NEEDED) {
          r.over = true; r.win = true; r.hitStop = 0.5;
          game.fx.burst(W / 2, FEET_Y - 120, { color: STYLE.accent[1], count: 36, speed: 560 });
        }
      }
    } else {
      r.combo = 0; r.fever = false;
      r.trip = 0.5; r.ropeFlash = 0.45; r.hitStop = 0.4; r.air = -1;
      game.audio.tone('C2', 0.18, { wave: 'sawtooth', volume: 0.08 });
      if (!r.demo) {
        r.lives--;
        game.feedback.bad(W / 2, FEET_Y - 180, { text: 'MISS' });
        if (r.lives <= 0) { r.over = true; r.win = false; r.hitStop = 0.6; }
      }
    }
  }

  function step(dt) {
    if (r.ropeFlash > 0) r.ropeFlash -= dt;
    if (r.hitStop > 0) {
      r.hitStop -= dt;
      if (r.hitStop <= 0 && r.over) r.endWait = 0.6;
      return;
    }
    if (r.over) return;
    r.songT += dt;
    if (r.trip > 0) r.trip -= dt;
    // count-in ticks + beat ticks: the sound is the teacher
    if (r.songT >= 0.35 && r.offIdx === 0) { r.offIdx = 1; game.audio.tone('G5', 0.05, { wave: 'square', volume: 0.04 }); }
    if (r.songT >= 0.72 && r.offIdx === 1) { r.offIdx = 2; game.audio.tone('G5', 0.05, { wave: 'square', volume: 0.04 }); }
    while (r.tickIdx < r.T.length && r.songT >= r.T[r.tickIdx]) {
      game.audio.tone('C6', 0.04, { wave: 'square', volume: 0.05 });
      game.audio.tone(BASS[r.tickIdx % BASS.length], 0.2, { wave: 'triangle', volume: 0.08 });
      r.tickIdx++;
    }
    if (r.air >= 0) { r.air += dt; if (r.air >= JUMP_T) r.air = -1; }
    if (r.demo && r.air < 0 && r.trip <= 0 && r.jumpedFor < r.passIdx && r.songT >= r.T[r.passIdx] - 0.02) {
      r.jumpedFor = r.passIdx;
      if (r.passIdx % 5 !== 3) {
        jump();
        demo.press = true; demo.pressT = 0.2;
      }
    }
    if (r.passIdx < r.T.length && r.songT >= passTime(r.passIdx)) {
      judgePass(r.passIdx);
      r.passIdx++;
    }
  }

  function drawRope(front) {
    var ph = ropePhase();
    var isFront = ph < 0.25 || ph > 0.75;
    if (isFront !== front) return;
    var amp = FEET_Y - HAND_Y + 14;
    var mid = Math.cos(ph * Math.PI * 2) * amp;
    var col = r.ropeFlash > 0 ? '#ffffff' : (r.fever ? STYLE.accent[1] : '#6bbf59');
    var wdt = r.ropeFlash > 0 ? 22 : 12;
    var px = HAND_LX, py = HAND_Y;
    for (var i = 1; i <= 16; i++) {
      var u = i / 16;
      var x = HAND_LX + (HAND_RX - HAND_LX) * u;
      var y = HAND_Y + mid * Math.sin(Math.PI * u);
      game.draw.line(px, py, x, y, col, wdt);
      if (i % 4 === 0) game.draw.circle(x, y, 9, r.fever ? '#fff4c2' : '#a5e08f');
      px = x; py = y;
    }
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [0.66, STYLE.bg[2]], [1, '#a8e6cf']]);
    for (var c = 0; c < 4; c++) {
      var cx = ((t * 18 + c * 300) % (W + 300)) - 150;
      var cy = H * 0.2 + (c % 2) * 90 + Math.sin(t + c) * 8;
      game.draw.circle(cx, cy, 60, '#ffffff', 0.8);
      game.draw.circle(cx + 60, cy + 10, 48, '#ffffff', 0.8);
      game.draw.circle(cx - 55, cy + 14, 40, '#ffffff', 0.8);
    }
    for (var f = 0; f < 10; f++) {
      var fx = 60 + f * 108;
      var fy = H * 0.3 + Math.sin(f * 0.6) * 30 + Math.sin(t * 2 + f) * 5;
      game.draw.sprite(FLAG, { f: f % 2 ? STYLE.accent[0] : '#b39ddb' }, fx, fy, 12, { anchor: 'center' });
    }
    game.draw.line(0, H * 0.29, W, H * 0.29, '#c98a5b', 3);
    game.draw.sprite(BELL, { y: STYLE.accent[1], c: '#8d6e63' }, W / 2, H * 0.37 + Math.sin(t * 3) * 6, 14, { anchor: 'center' });
    game.draw.rect(0, FEET_Y + 40, W, 12, '#8fd6b4');
    for (var g = 0; g < 14; g++) game.draw.circle(g * 84 + 30, FEET_Y + 60 + (g % 3) * 30, 14, '#ffffff', 0.5);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(t * 1.6));
  }

  function drawActors() {
    var t = game.time.elapsed;
    var ph = ropePhase();
    var armUp = ph > 0.25 && ph < 0.75;
    game.draw.sprite(armUp ? SQ_UP : SQ_DN, SQ_PAL, HAND_LX - 70, HAND_Y + 60 + Math.sin(t * 4) * 4, 20, { anchor: 'center' });
    game.draw.sprite(armUp ? SQ_UP : SQ_DN, SQ_PAL, HAND_RX + 70, HAND_Y + 60 + Math.sin(t * 4 + 1) * 4, 20, { anchor: 'center', flipX: true });
    drawRope(false);
    var lift = heroLift();
    var art = r.trip > 0 ? HOG_TRIP : (r.air >= 0 ? HOG_AIR : (Math.floor(t * 4) % 2 ? HOG_A : HOG_B));
    game.draw.circle(W / 2, FEET_Y + 30, Math.max(30, 80 - lift * 0.2), '#7fb89c', 0.5);
    if (r.trip > 0 && r.hitStop > 0) game.draw.circle(W / 2, FEET_Y - 70, 130, '#ffffff', 0.6);
    game.draw.sprite(art, HOG_PAL, W / 2 + Math.sin(t * 1.8) * 3, FEET_Y - 70 - lift, r.hitStop > 0 && r.trip > 0 ? 20 : 17, { anchor: 'center' });
    drawRope(true);
  }

  function drawHud() {
    txt(r.count + ' / ' + NEEDED, W / 2, 100, 64, '#8d6e63');
    for (var i = 0; i < NEEDED; i++) {
      var bx = W / 2 - (NEEDED - 1) * 28 + i * 56;
      game.draw.circle(bx, 160, 17, '#ffffff');
      game.draw.circle(bx, 160, 12, i < r.count ? (r.fever ? STYLE.accent[1] : STYLE.accent[0]) : '#f3e3ea');
    }
    for (var l = 0; l < LIVES; l++) game.draw.sprite(HEART, { r: l < r.lives ? STYLE.accent[0] : '#e0d2d8' }, 70 + l * 70, 70, 10, { anchor: 'center' });
    if (r.combo >= 2) txt('x' + r.combo, W - 110, 90, 52, r.fever ? STYLE.accent[1] : '#b39ddb');
    var frac = Math.max(0, r.timeLeft / TIME_LIMIT);
    game.draw.rect(60, 208, W - 120, 14, '#ffffff');
    game.draw.rect(60, 208, (W - 120) * frac, 14, r.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? '#ff5577' : '#7fd1b9');
  }

  function drawPad() {
    var t = game.time.elapsed;
    var ph = ropePhase();
    var near = Math.min(ph, 1 - ph);
    var glow = Math.max(0, 1 - near * 6);
    game.draw.circle(W / 2, H * 0.82, 150 + glow * 20, '#ffffff', 0.35 + glow * 0.35);
    game.draw.circle(W / 2, H * 0.82, 120, '#b39ddb', 0.8);
    game.draw.sprite(HOG_AIR, HOG_PAL, W / 2, H * 0.82 + Math.sin(t * 5) * 4, 8, { anchor: 'center' });
  }

  function initGame() {
    r = makeRound(false);
  }

  function endRound() {
    state = S.RESULT;
    var stats = { jumps: r.count, perfect: r.perfect, maxCombo: r.maxCombo, misses: LIVES - r.lives };
    if (r.win) {
      r.score += Math.round(r.timeLeft * 20) + r.lives * 80;
      game.audio.play('se_success', 0.5);
      game.end.success(r.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      game.audio.stopBgm();
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT; initGame(); demo.t = 0;
      game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['C5', 0.5], ['D5', 1]], { tempo: 120, wave: 'triangle', volume: 0.04, loop: true });
      return;
    }
    if (r.ready > 0 || r.over || r.hitStop > 0) { game.audio.play('se_tap', 0.08); return; }
    jump();
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!r || !r.demo) r = makeRound(true);
      demo.t += dt;
      var cyc = demo.t % 7;
      if (cyc < dt || demo.t <= dt) r = makeRound(true);
      if (demo.pressT > 0) { demo.pressT -= dt; if (demo.pressT <= 0) demo.press = false; }
      step(dt);
      drawWorld();
      drawActors();
      drawPad();
      game.draw.hand(W / 2 + 40, H * 0.82 + (demo.press ? 0 : 30), { press: demo.press, scale: 14 });
      txt(TITLE, W / 2 + Math.sin(t * 1.3) * 8, H * 0.08, 84, STYLE.accent[0]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.13, 36, '#8d6e63');
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, '#8d6e63');
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawActors();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.4);
      if (r.win) {
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(80, W - 80), game.random(H * 0.15, H * 0.45), { color: Math.random() < 0.5 ? STYLE.accent[0] : STYLE.accent[1], count: 5, speed: 260 });
        txt('CLEAR', W / 2, H * 0.24, 120, STYLE.accent[0]);
      } else {
        txt(r.lives <= 0 ? 'GAME OVER' : 'TIME UP', W / 2, H * 0.24, 100, '#9575cd');
        txt('あと' + (NEEDED - r.count) + '回!', W / 2, H * 0.3, 60, '#8d6e63');
      }
      txt(r.count + ' / ' + NEEDED, W / 2, H * 0.72, 60, '#8d6e63');
      txt('PERFECT ' + r.perfect + '   x' + r.maxCombo, W / 2, H * 0.77, 44, '#b39ddb');
      txt('SCORE ' + r.score, W / 2, H * 0.82, 48, '#8d6e63');
      if (r.win && r.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.87, 52, STYLE.accent[1]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.87, 40, '#8d6e63');
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, STYLE.accent[0]);
      return;
    }
    // PLAYING
    if (r.ready > 0) {
      r.ready -= dt;
      if (r.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!r.over) {
        r.timeLeft -= dt;
        if (r.timeLeft <= 0) {
          r.timeLeft = 0; r.over = true; r.win = false; r.hitStop = 0.45; r.ropeFlash = 0.45;
          game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP' });
        }
      }
      step(dt);
      if (r.over && r.endWait > 0) {
        r.endWait -= dt;
        if (r.endWait <= 0) { endRound(); return; }
      }
    }
    drawWorld();
    drawActors();
    drawPad();
    drawHud();
    if (r.ready > 0) txt(r.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['C5', 0.5], ['D5', 1]], { tempo: 120, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    r = makeRound(true);
    demo.t = 0;
  });
})(game);
