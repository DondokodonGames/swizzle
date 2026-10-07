// I-GBA-0024v2-postcard-stamp-sort.js
// ポストカードスタンプソート — くるくる回って流れてくるはがきの切手の向きが、お手本と同じか違うかを瞬時に見分けて判を押す
// 操作: はがきが回りながら流れてきて窓で止まる。切手の向きが上のお手本と同じなら左の丸い判、違えば右のバツの判をタップ
// 終わり: 10枚のうち8枚正しく押せばCLEAR。押し間違い・見送りが3回、または時間切れでGAME OVER
// @mechanic: judge
// @theme: post_office_stamp_check
// 世界観: 郵便局の仕分け室で、局員がベルトで回りながら流れてくるはがきの切手の向きがお手本どおりかを見分け、次々と判を押して仕分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく押した枚数・最速の判定時間
// スタイル: 70s MONO
var STYLE = { bg: ['#050505', '#101010', '#1a1a1a'], main: ['#f2f2f2', '#9a9a9a'], accent: ['#ffd23c', '#3cff8a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var MISS_MAX = 3;
  var DECK = [0, 1, 0, 3, 2, 0, 1, 0, 3, 1];
  var FEINT = [false, false, false, true, false, true, false, true, true, false];
  var WIN_X = W * 0.5, WIN_Y = H * 0.5;
  var CARD_W = 520, CARD_H = 340;

  var BIRD = [
    '..ww....',
    '.wwww...',
    'wwKwwww.',
    '.wwwwwwh',
    '..wwwwhh',
    '...ww.h.',
    '...w....',
    '..ww....',
  ];
  var OK_MARK = ['..wwww..', '.w....w.', 'w......w', 'w......w', 'w......w', 'w......w', '.w....w.', '..wwww..'];
  var NG_MARK = ['w......w', '.w....w.', '..w..w..', '...ww...', '...ww...', '..w..w..', '.w....w.', 'w......w'];
  var CLERK = [
    '...cccc...',
    '..cccccc..',
    '..wwwwww..',
    '..wKwwKw..',
    '..wwwwww..',
    '.aaaaaaaa.',
    'aaaaaaaaaa',
    'w.aaaaaa.w',
    '..aaaaaa..',
  ];
  var CLERK_B = [
    '...cccc...',
    '..cccccc..',
    '..wwwwww..',
    '..wKwwKw..',
    '..wwwwww..',
    '.aaaaaaaa.',
    'aaaaaaaaaa',
    '.waaaaaaw.',
    '..aaaaaa..',
  ];

  var mode = 'ATTRACT';
  var belt = {};

  function freshBelt() {
    belt.i = 0; belt.sample = 0; belt.card = null; belt.right = 0; belt.wrong = 0;
    belt.clock = TIME_LIMIT; belt.fast = 9; belt.cue = null; belt.over = false; belt.hold = 0;
    belt.cleared = false; belt.pts = 0; belt.rec = false; belt.intro = 0.8; belt.swap = 0; belt.inked = [];
    feedCard();
  }

  function feedCard() {
    if (belt.i >= DECK.length) { belt.card = null; return; }
    var o = DECK[belt.i];
    var dwell = 1.7 - belt.i * 0.09;
    belt.card = { o: o, show: FEINT[belt.i] ? (o + 1) % 4 : o, x: W + 360, y: WIN_Y, st: 'in', t: 0, dwell: dwell, age: 0, spin: 0, mark: 0, feint: FEINT[belt.i] };
  }

  function mono(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#000000', bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  // 切手の向き: 0=お手本 1=左右反転 2=上下反転 3=逆さ(180°)
  function drawPostcard(cx, cy, o, squash, glow) {
    var w = CARD_W * squash, h = CARD_H;
    var fx = o === 1 || o === 3, fy = o === 2 || o === 3;
    game.draw.rect(cx - w / 2, cy - h / 2, w, h, '#101010');
    game.draw.line(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2, glow || STYLE.main[0], 6);
    game.draw.line(cx - w / 2, cy + h / 2, cx + w / 2, cy + h / 2, glow || STYLE.main[0], 6);
    game.draw.line(cx - w / 2, cy - h / 2, cx - w / 2, cy + h / 2, glow || STYLE.main[0], 6);
    game.draw.line(cx + w / 2, cy - h / 2, cx + w / 2, cy + h / 2, glow || STYLE.main[0], 6);
    if (squash < 0.25) return;
    for (var l = 0; l < 3; l++) {
      var ly = fy ? cy - h * 0.3 + l * 60 : cy + h * 0.3 - l * 60;
      var lx0 = fx ? cx + w * 0.4 : cx - w * 0.4, lx1 = fx ? cx + w * 0.02 : cx - w * 0.02;
      game.draw.line(lx0, ly, lx1, ly, STYLE.main[1], 4);
    }
    var sx = fx ? cx - w * 0.3 : cx + w * 0.3;
    var sy = fy ? cy + h * 0.24 : cy - h * 0.24;
    game.draw.rect(sx - 60 * squash, sy - 64, 120 * squash, 128, STYLE.main[0]);
    game.draw.rect(sx - 52 * squash, sy - 56, 104 * squash, 112, '#101010');
    game.draw.sprite(BIRD, { w: STYLE.main[0], K: '#000000', h: STYLE.accent[0] }, sx, sy, Math.max(2, 11 * squash), { anchor: 'center', flipX: fx, flipY: fy });
  }

  function paintRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[2]], [1, STYLE.bg[1]]]);
    for (var d = 0; d < 30; d++) game.draw.rect((d * 131) % W, 260 + (d * 97) % 400, 4, 4, STYLE.main[1], 0.4);
    game.draw.rect(0, WIN_Y + CARD_H / 2 + 20, W, 60, '#2a2a2a');
    var off = (t * 220) % 80;
    for (var s = -1; s < 15; s++) game.draw.rect(s * 80 + off, WIN_Y + CARD_H / 2 + 36, 40, 28, '#555555');
    game.draw.line(WIN_X - CARD_W / 2 - 30, WIN_Y - CARD_H / 2 - 30, WIN_X - CARD_W / 2 - 30, WIN_Y + CARD_H / 2 + 20, STYLE.main[0], 6);
    game.draw.line(WIN_X + CARD_W / 2 + 30, WIN_Y - CARD_H / 2 - 30, WIN_X + CARD_W / 2 + 30, WIN_Y + CARD_H / 2 + 20, STYLE.main[0], 6);
    var fr = Math.floor(t * 2) % 2 ? CLERK : CLERK_B;
    game.draw.sprite(fr, { c: '#9a9a9a', w: STYLE.main[0], K: '#000000', a: '#6a6a6a' }, W * 0.5, H * 0.73 + Math.sin(t * 2.5) * 4, 12, { anchor: 'center' });
  }

  function paintSample() {
    var blink = belt.swap > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    drawPostcard(W * 0.5, H * 0.22, belt.sample, 0.55, blink ? STYLE.accent[0] : null);
    game.draw.rect(0, H * 0.14, W, H * 0.16, STYLE.accent[0], 0.12);
  }

  function paintPads() {
    var t = game.time.elapsed;
    var py = H * 0.86;
    var pulse = 1 + 0.04 * Math.sin(t * 5);
    game.draw.circle(W * 0.27, py, 150 * pulse, '#1e1e1e');
    game.draw.circle(W * 0.73, py, 150 * pulse, '#1e1e1e');
    game.draw.sprite(OK_MARK, { w: STYLE.accent[1] }, W * 0.27, py, 22, { anchor: 'center' });
    game.draw.sprite(NG_MARK, { w: STYLE.main[0] }, W * 0.73, py, 22, { anchor: 'center' });
    game.draw.rect(0, H * 0.78, W, H * 0.16, STYLE.accent[1], 0.08);
  }

  function paintCard() {
    var c = belt.card;
    if (!c) return;
    var squash = 1, o = c.o;
    if (c.st === 'in') {
      c.spin = c.t * 18;
      squash = Math.abs(Math.cos(c.spin));
      o = Math.cos(c.spin) < 0 ? (c.show + 1) % 4 : c.show;
    } else if (c.st === 'sit' && c.feint && c.age < 0.4) {
      o = c.age < 0.22 ? c.show : c.o;
      squash = Math.abs(Math.cos(c.age / 0.4 * Math.PI));
    }
    var glow = null;
    if (c.st === 'sit' && c.dwell - c.age < 0.5 && Math.floor(game.time.elapsed * 12) % 2 === 0) glow = STYLE.accent[0];
    drawPostcard(c.x, c.y, o, Math.max(0.05, squash), glow);
    if (c.mark) game.draw.sprite(c.mark > 0 ? OK_MARK : NG_MARK, { w: c.mark > 0 ? STYLE.accent[1] : STYLE.main[0] }, c.x - 120, c.y, 14, { anchor: 'center', alpha: 0.85 });
    if (c.st === 'sit') {
      var left = Math.max(0, 1 - c.age / c.dwell);
      game.draw.rect(c.x - CARD_W / 2, c.y + CARD_H / 2 + 90, CARD_W * left, 12, STYLE.main[0]);
    }
  }

  function settled(c) { return c && c.st === 'sit' && (!c.feint || c.age >= 0.4); }

  // ── 判定(実プレイとデモで共通): pick=+1 同じ / -1 違う / 0 見送り ─────────────
  function stamp(pick, real) {
    var c = belt.card;
    if (!settled(c) || belt.cue) return false;
    var same = c.o === belt.sample;
    var ok = pick !== 0 && (pick > 0) === same;
    c.mark = pick;
    if (ok) {
      game.feedback.good(c.x, c.y - 120, { text: c.age < 0.6 ? 'PERFECT' : 'GOOD', color: STYLE.accent[1] });
      game.audio.play('se_coin', 0.3);
      if (real) {
        belt.right++;
        belt.fast = Math.min(belt.fast, c.age);
        belt.pts += 100 + Math.round(Math.max(0, c.dwell - c.age) * 100);
      }
      c.st = 'out'; c.t = 0;
    } else {
      belt.cue = { t: 0.42, real: real };
      c.st = 'hold';
      game.audio.play('se_tap', 0.3);
    }
    return true;
  }

  function beltTick(dt, real) {
    var c = belt.card;
    if (belt.swap > 0) belt.swap -= dt;
    if (belt.cue) {
      belt.cue.t -= dt;
      if (belt.cue.t <= 0) {
        game.feedback.bad(c.x, c.y - 120, { text: 'MISS', shake: 12, flashColor: '#ffffff' });
        if (belt.cue.real) {
          belt.wrong++;
          if (belt.wrong >= MISS_MAX) { belt.cue = null; return finishBelt(false); }
        }
        belt.cue = null;
        c.st = 'out'; c.t = 0;
      }
      return;
    }
    if (!c) return;
    c.t += dt;
    if (c.st === 'in') {
      c.x = W + 360 - (W + 360 - WIN_X) * Math.min(1, c.t / 0.45);
      if (c.t >= 0.45) { c.st = 'sit'; c.age = 0; c.x = WIN_X; game.audio.tone('A4', 0.05, { wave: 'square', volume: 0.05 }); }
    } else if (c.st === 'sit') {
      c.age += dt;
      if (c.age >= c.dwell) { c.mark = 0; belt.cue = { t: 0.42, real: real }; c.st = 'hold'; }
    } else if (c.st === 'out') {
      c.x -= dt * 2600;
      if (c.x < -400) {
        belt.i++;
        if (real && belt.i === 5) {
          belt.sample = 1; belt.swap = 0.9;
          game.fx.popup('NICE', W * 0.5, H * 0.34, { color: STYLE.accent[0], size: 64 });
          game.audio.play('se_milestone', 0.45);
        }
        if (real && belt.right >= NEEDED) return finishBelt(true);
        if (belt.i >= DECK.length) return finishBelt(belt.right >= NEEDED);
        feedCard();
      }
    }
  }

  function finishBelt(ok) {
    if (belt.over) return;
    belt.over = true; belt.cleared = ok; belt.hold = 1.2;
    if (ok) belt.pts += Math.round(belt.clock * 20);
    belt.rec = ok && belt.pts > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  // ── ATTRACT: 同じ向きを丸で押す成功 + 違う向きを丸で押してしまう失敗 ─────────────
  var demo = { t: 0, gx: W * 0.27, gy: H * 0.86, press: 0, did: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { freshBelt(); belt.intro = 0; demo.did = -1; }
    demo.press = Math.max(0, demo.press - dt);
    var c = belt.card;
    if (settled(c) && demo.did !== belt.i && c.age > 0.5) {
      demo.did = belt.i;
      demo.gx = W * 0.27;
      stamp(1, false);
      demo.press = 0.2;
    }
    beltTick(dt, false);
  }

  game.onTap(function (x, y) {
    if (mode === 'ATTRACT') {
      game.audio.play('se_coin', 0.5);
      mode = 'PLAYING'; freshBelt();
      return;
    }
    if (mode === 'RESULT') {
      game.audio.play('se_tap', 0.3);
      mode = 'ATTRACT'; freshBelt(); demo.t = 0;
      return;
    }
    if (belt.over) return;
    if (belt.intro > 0 || !settled(belt.card) || y < H * 0.6) {
      game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.04 });
      game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 80 });
      return;
    }
    stamp(x < W * 0.5 ? 1 : -1, true);
    game.fx.burst(x, y, { color: x < W * 0.5 ? STYLE.accent[1] : STYLE.main[0], count: 6, speed: 160 });
  });

  function paintHud() {
    mono(belt.right + ' / ' + NEEDED, W * 0.5, 70, 56, STYLE.main[0]);
    for (var m = 0; m < MISS_MAX; m++) game.draw.sprite(NG_MARK, { w: m < belt.wrong ? STYLE.main[1] : STYLE.accent[0] }, 90 + m * 70, 70, 5, { anchor: 'center', alpha: m < belt.wrong ? 0.3 : 1 });
    for (var k = 0; k < DECK.length; k++) game.draw.rect(W - 380 + k * 34, 60, 24, 24, k < belt.i ? STYLE.main[1] : STYLE.main[0], k < belt.i ? 0.4 : 1);
    var fr = Math.max(0, belt.clock / TIME_LIMIT);
    game.draw.rect(80, 124, W - 160, 14, '#2a2a2a');
    game.draw.rect(80, 124, (W - 160) * fr, 14, belt.clock < 4 ? STYLE.accent[0] : STYLE.main[0]);
  }

  function paintAll() {
    paintRoom();
    paintSample();
    paintCard();
    paintPads();
    if (belt.cue && belt.card) {
      var k = 0.42 - belt.cue.t;
      game.draw.circle(belt.card.x, belt.card.y, 80 + k * 300, '#ffffff', 0.35);
      drawPostcard(belt.card.x, belt.card.y, belt.card.o, 1 + k * 0.3, '#ffffff');
    }
  }

  game.onUpdate(function (dt) {
    if (mode === 'ATTRACT') {
      if (belt.i === undefined) freshBelt();
      stepDemo(dt);
      paintAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      mono('STAMP CHECK', W * 0.5, H * 0.06, 78, STYLE.accent[0]);
      mono('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 34, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) mono('► 100円 投入 ◄', W * 0.5, H * 0.96, 46, STYLE.accent[0]);
      else mono('INSERT COIN', W * 0.5, H * 0.96, 38, STYLE.main[0]);
      return;
    }
    if (mode === 'RESULT') {
      paintRoom();
      game.draw.rect(90, H * 0.2, W - 180, 500, '#000000', 0.85);
      mono(belt.cleared ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.26, 96, belt.cleared ? STYLE.accent[1] : STYLE.accent[0]);
      mono(belt.right + ' / ' + NEEDED, W * 0.5, H * 0.33, 64, STYLE.main[0]);
      mono('SCORE ' + belt.pts, W * 0.5, H * 0.38, 46, STYLE.main[0]);
      if (belt.rec) mono('NEW RECORD', W * 0.5, H * 0.43, 52, STYLE.accent[0]);
      else mono('BEST ' + (game.best || 0), W * 0.5, H * 0.43, 40, STYLE.main[0]);
      if (!belt.cleared) mono('あと' + Math.max(1, NEEDED - belt.right) + '枚!', W * 0.5, H * 0.48, 46, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) mono('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, STYLE.main[0]);
      return;
    }

    if (belt.over) {
      belt.hold -= dt;
      if (belt.hold <= 0) {
        mode = 'RESULT';
        var st = { correct: belt.right, wrong: belt.wrong, fastestSec: Math.round(belt.fast * 100) / 100 };
        if (belt.cleared) game.end.success(belt.pts, st); else game.end.failure(st);
      }
    } else if (belt.intro > 0) {
      belt.intro -= dt;
      if (belt.intro <= 0) game.audio.play('se_tap', 0.3);
    } else {
      beltTick(dt, true);
      if (!belt.cue && !belt.over) {
        belt.clock -= dt;
        if (belt.clock <= 0) {
          belt.clock = 0;
          game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: STYLE.accent[0], size: 80 });
          finishBelt(false);
        }
      }
    }

    paintAll();
    paintHud();
    if (belt.intro > 0) mono(belt.intro > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.5, 100, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['A4', 1], ['G4', 1],
      ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 2],
    ], { tempo: 138, wave: 'square', volume: 0.05, loop: true, bass: true });
    mode = 'ATTRACT';
    freshBelt();
  });
})(game);
