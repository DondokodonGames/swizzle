// I-GBA-0034v3-snowday-boot-lineup.js
// 雪の日の長靴ならべ — 足の小さい順に並んだ園児たちの前へ、山積みの長靴を大きさを見比べてドラッグで置いていく
// 操作: 下の長靴の山から1足を指でつまみ、並んだ園児の足もとの枠へ運んで離す。園児は左ほど足が小さい。靴下の足と長靴の長さが合えば履いて跳ねる。合わないと長靴が山へ跳ね返り園児が首を振る
// 終わり: 3クラス(3人→4人→5人)の長靴を24秒以内に全部履かせればCLEAR。置き間違い3回/時間切れでGAME OVER。後のクラスほど足の大きさの差が小さい
// @mechanic: drag_sort
// @theme: snowday_kindergarten_boots
// 世界観: 雪の日の保育園の玄関で、保育士が足の小さい順に並んで待つ園児たちの前へ、山積みの長靴を大きさを見比べながら一足ずつ並べて履かせ、園庭へ送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 履かせた足数・置き間違い・最大連続・スコア
// スタイル: MODERN AD-GAME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、大きいアイコン、飛ぶ数字
  var STYLE = { bg: ['#4ab8ff', '#dff4ff'], main: ['#ff3b5c', '#ffd02a', '#2ad07a'], accent: ['#1a1a3a', '#ffffff'] };
  var OUT = STYLE.accent[0], WHITE = STYLE.accent[1];
  var BOOT_COLS = ['#ff3b5c', '#ffd02a', '#2ad07a', '#3a7aff', '#ff7ad0'];

  var LOGO = 'BOOT LINEUP';
  var CLASSES = [[80, 110, 140], [78, 96, 114, 132], [76, 90, 104, 118, 132]];
  var NEEDED = 12;
  var MISS_MAX = 3;
  var TIME_LIMIT = 24;
  var KID_Y = H * 0.5, SLOT_Y = H * 0.62;
  var PILE_Y0 = H * 0.75, PILE_Y1 = H * 0.9;

  var ST = { ATTRACT: 'attract', PLAYING: 'playing', RESULT: 'result' };
  var st = ST.ATTRACT;

  // ── スプライト: 黄色い帽子の園児(待機 / 喜ぶ / ふるえ) ──
  var KID = [
    ['..YYYYYY..', '.YYYYYYYY.', 'YYYYYYYYYY', '..SSSSSS..', '..SKSSKS..', '..SSSSSS..', '...SMMS...', '.CCCCCCCC.', 'SCCCCCCCCS', '.CCCCCCCC.', '..PP..PP..'],
    ['..YYYYYY..', '.YYYYYYYY.', 'YYYYYYYYYY', '..SSSSSS..', '..SKSSKS..', '..SMMMMS..', 'S..SMMS..S', 'SCCCCCCCCS', '.CCCCCCCC.', '.CCCCCCCC.', '..PP..PP..'],
    ['..YYYYYY..', '.YYYYYYYY.', 'YYYYYYYYYY', '..SSSSSS..', '..SKSSKS..', '..SSSSSS..', '...SBBS...', '.CCCCCCCC.', 'SCCCCCCCCS', '.CCCCCCCC.', '..PP..PP..'],
  ];
  var SMOCKS = ['#6ad0ff', '#ff9ad0', '#9ae86a', '#ffb86a', '#c8a0ff'];

  // ── 玄関モデル(本番・デモ共通) ──
  function makeHall(ci) {
    var sizes = CLASSES[ci];
    var n = sizes.length;
    var kids = [], boots = [];
    for (var i = 0; i < n; i++) kids.push({ x: W * (0.5 + (i - (n - 1) / 2) * (0.84 / n)), size: sizes[i], done: false, joy: 0, no: 0, smock: SMOCKS[(i + ci) % 5] });
    var order = [];
    for (var j = 0; j < n; j++) order.push(j);
    for (var k = n - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)); var t = order[k]; order[k] = order[r]; order[r] = t; }
    for (var b = 0; b < n; b++) {
      var col = b % 3, row = Math.floor(b / 3);
      var hx = W * (0.2 + col * 0.3) + (row ? W * 0.15 : 0) + game.random(-20, 20);
      var hy = (row ? PILE_Y1 : PILE_Y0) + game.random(-14, 14);
      boots.push({ size: sizes[order[b]], col: BOOT_COLS[(order[b] * 2 + ci) % 5], hx: hx, hy: hy, x: hx, y: hy, placed: -1, held: false, bounce: 0 });
    }
    return { kids: kids, boots: boots, held: -1 };
  }
  function bootAt(Hl, x, y) {
    for (var i = Hl.boots.length - 1; i >= 0; i--) {
      var b = Hl.boots[i];
      if (b.placed >= 0) continue;
      if (Math.abs(x - b.x) < b.size * 0.6 + 30 && y > b.y - (80 + b.size * 0.55) && y < b.y + 50) return i;
    }
    return -1;
  }
  function slotNear(Hl, x, y) {
    var best = -1, bd = 150;
    for (var i = 0; i < Hl.kids.length; i++) {
      var d = Math.abs(x - Hl.kids[i].x) + Math.abs(y - SLOT_Y) * 0.6;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  // 離した時の判定: 'ok' / 'bad' / 'none'
  function dropBoot(Hl, bi, x, y) {
    var b = Hl.boots[bi];
    b.held = false;
    var s = slotNear(Hl, x, y);
    if (s < 0 || Hl.kids[s].done) return { kind: 'none' };
    var kid = Hl.kids[s];
    if (kid.size === b.size) {
      kid.done = true; kid.joy = 0.8; b.placed = s; b.x = kid.x; b.y = SLOT_Y;
      return { kind: 'ok', x: kid.x, y: SLOT_Y };
    }
    kid.no = 0.6; b.bounce = 0.35;
    return { kind: 'bad', x: kid.x, y: SLOT_Y, kid: kid, boot: b };
  }
  function stepHall(Hl, dt) {
    for (var i = 0; i < Hl.boots.length; i++) {
      var b = Hl.boots[i];
      if (b.held || b.placed >= 0) continue;
      b.x += (b.hx - b.x) * Math.min(1, dt * 10);
      b.y += (b.hy - b.y) * Math.min(1, dt * 10);
      if (b.bounce > 0) b.bounce -= dt;
    }
    for (var k = 0; k < Hl.kids.length; k++) {
      if (Hl.kids[k].joy > 0) Hl.kids[k].joy -= dt;
      if (Hl.kids[k].no > 0) Hl.kids[k].no -= dt;
    }
  }
  function allDone(Hl) { for (var i = 0; i < Hl.kids.length; i++) if (!Hl.kids[i].done) return false; return true; }

  // ── 描画(太い縁取り) ──
  function box(x, y, w, h, col) { game.draw.rect(x - 6, y - 6, w + 12, h + 12, OUT); game.draw.rect(x, y, w, h, col); }
  function ball(x, y, r, col) { game.draw.circle(x, y, r + 6, OUT); game.draw.circle(x, y, r, col); }

  function drawBoot(b, x, y, scale, hl) {
    var L = b.size * scale, sh = (60 + b.size * 0.55) * scale;
    var lift = b.held ? -16 : 0;
    var jig = b.bounce > 0 ? Math.sin(b.bounce * 60) * 10 : 0;
    var bx = x - L / 2 + jig, by = y + lift;
    if (!b.held) game.draw.rect(bx + 4, by + 30 * scale, L, 14, OUT, 0.25);
    // 筒 + 足 (左右2本)
    for (var s = 0; s < 2; s++) {
      var ox = s === 0 ? -L * 0.16 : L * 0.16;
      box(bx + ox + L * 0.12, by - sh, L * 0.42, sh, b.col);
      box(bx + ox, by - 26 * scale, L * 0.92, 30 * scale, b.col);
      game.draw.rect(bx + ox + L * 0.16, by - sh + 8, L * 0.1, sh - 20, WHITE, 0.5);
      game.draw.rect(bx + ox, by + 4 * scale, L * 0.92, 6 * scale, OUT);
    }
    if (hl) { game.draw.circle(x, y - sh / 2, L * 0.9 + hl * 60, WHITE, 0.6 * (1 - hl) + 0.2); }
  }

  function drawHall(Hl) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, STYLE.bg[1]], [0.46, '#ffe8c8'], [1, '#ffd6a0']]);
    // 窓の外の雪の園庭
    box(W * 0.06, 250, W * 0.88, 230, '#bfe6ff');
    game.draw.rect(W * 0.06, 420, W * 0.88, 60, WHITE);
    for (var f = 0; f < 18; f++) {
      var fx = W * 0.08 + ((f * 151 + game.time.elapsed * 30 * (1 + f % 3)) % (W * 0.84));
      var fy = 260 + ((f * 97 + game.time.elapsed * 80 * (1 + f % 2)) % 200);
      game.draw.circle(fx, fy, 6 + (f % 3) * 2, WHITE);
    }
    game.draw.rect(W * 0.5 - 4, 250, 8, 230, OUT);
    // すのこ(園児が立つ段)
    box(0, KID_Y + 60, W, 40, '#c88a4a');
    // 足もとの枠
    for (var i = 0; i < Hl.kids.length; i++) {
      var k = Hl.kids[i];
      if (k.done) continue;
      var a = 0.45 + 0.35 * Math.sin(game.time.elapsed * 6 + i);
      game.draw.rect(k.x - 70, SLOT_Y - 30, 140, 8, WHITE, a);
      game.draw.rect(k.x - 70, SLOT_Y + 30, 140, 8, WHITE, a);
      game.draw.rect(k.x - 70, SLOT_Y - 30, 8, 68, WHITE, a);
      game.draw.rect(k.x + 62, SLOT_Y - 30, 8, 68, WHITE, a);
    }
    // 長靴の山の敷物
    box(W * 0.04, PILE_Y0 - 120, W * 0.92, PILE_Y1 - PILE_Y0 + 190, '#3a7aff');
    game.draw.rect(W * 0.04, PILE_Y0 - 120, W * 0.92, 20, WHITE, 0.3);
  }

  function drawKids(Hl, wrongKid) {
    for (var i = 0; i < Hl.kids.length; i++) {
      var k = Hl.kids[i];
      var px = 11 + (k.size - 76) * 0.08;
      var fr = k.joy > 0 ? 1 : (k.done ? 0 : 2);
      var shake = k.no > 0 ? Math.sin(k.no * 50) * 14 : (k.done ? 0 : Math.sin(game.time.elapsed * 30 + i) * 2);
      var hop = k.joy > 0 ? -Math.abs(Math.sin(k.joy * 12)) * 40 : 0;
      var h = 11 * px;
      game.draw.sprite(KID[fr], { Y: '#ffd02a', S: '#ffd2a8', K: OUT, M: '#ff3b5c', B: '#3a7aff', C: k.smock, P: '#ff9ad0' }, k.x + shake, KID_Y - h / 2 + 40 + hop, px, { anchor: 'center' });
      // 靴下の足(この長さに合う長靴を置く)
      if (!k.done) {
        box(k.x - k.size / 2, KID_Y + 44, k.size, 20, WHITE);
        game.draw.rect(k.x - k.size / 2, KID_Y + 44, k.size * 0.25, 20, '#ff9ad0');
      }
      if (wrongKid === k) game.draw.circle(k.x, KID_Y, 120, '#ff3b5c', 0.25);
    }
  }

  function drawBoots(Hl, hlBoot, hk) {
    var held = null;
    for (var i = 0; i < Hl.boots.length; i++) {
      var b = Hl.boots[i];
      if (b.held) { held = b; continue; }
      drawBoot(b, b.x, b.y, 1, b === hlBoot ? hk : 0);
    }
    if (held) drawBoot(held, held.x, held.y, 1.08, 0);
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x - 4, y, { size: sz, color: OUT, bold: true, align: 'center' });
    game.draw.text(s, x + 4, y, { size: sz, color: OUT, bold: true, align: 'center' });
    game.draw.text(s, x, y - 4, { size: sz, color: OUT, bold: true, align: 'center' });
    game.draw.text(s, x, y + 5, { size: sz, color: OUT, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col || WHITE, bold: true, align: 'center' });
  }

  // ── 状態 ──
  var hall, cls, shod, misses, combo, maxCombo, timeLeft, countIn, stop, over, won, endT, score, prevBest, nextT, celebT;

  function initGame() {
    cls = 0; hall = makeHall(0); shod = 0; misses = 0; combo = 0; maxCombo = 0;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; nextT = 0; celebT = 0;
  }

  function haltThen(info, after) { stop = { t: 0.4, max: 0.4, info: info, after: after }; }

  function onDrop(r) {
    if (r.kind === 'ok') {
      shod++; combo++; maxCombo = Math.max(maxCombo, combo);
      var pts = 100 + combo * 25;
      score += pts;
      game.feedback.good(r.x, r.y - 80, { text: '+' + pts, color: '#ffd02a', count: 18 });
      if (combo >= 3) { game.fx.popup('COMBO x' + combo, W / 2, H * 0.36, { color: '#ff3b5c', size: 70 }); game.audio.play('se_milestone', 0.35); }
      if (allDone(hall)) {
        if (cls >= CLASSES.length - 1) { won = true; wrapUp(); return; }
        game.fx.popup(shod + ' / ' + NEEDED, W / 2, H * 0.28, { color: WHITE, size: 72 });
        game.audio.play('se_powerup', 0.4);
        nextT = 0.8;
      }
    } else if (r.kind === 'bad') {
      combo = 0;
      game.audio.play('se_tap', 0.3);
      haltThen(r, function () {
        misses++;
        game.feedback.bad(r.x, r.y - 80, { text: 'MISS', shake: 12 });
        if (misses >= MISS_MAX) { won = false; wrapUp(); }
      });
    } else {
      game.audio.tone('E4', 0.05, { wave: 'triangle', volume: 0.06 });
    }
  }

  // ── 入力 ──
  game.onPress(function (x, y) {
    if (st === ST.ATTRACT) { game.audio.play('se_coin', 0.45); st = ST.PLAYING; initGame(); return; }
    if (st === ST.RESULT) { game.audio.play('se_tap', 0.2); st = ST.ATTRACT; initGame(); demo.t = 0; return; }
    if (countIn > 0 || stop || over || nextT > 0) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.04 }); return; }
    var i = bootAt(hall, x, y);
    if (i >= 0) {
      hall.held = i; hall.boots[i].held = true; hall.boots[i].x = x; hall.boots[i].y = y;
      game.audio.play('se_jump', 0.2);
    } else game.fx.burst(x, y, { color: WHITE, count: 3, speed: 80 });
  });
  game.onMove(function (x, y) {
    if (st !== ST.PLAYING || hall.held < 0) return;
    var b = hall.boots[hall.held];
    b.x = x; b.y = y;
    var s = slotNear(hall, x, y);
    if (s >= 0 && s !== b.hover) { b.hover = s; game.audio.tone(440 + s * 80, 0.03, { wave: 'square', volume: 0.04 }); }
  });
  game.onRelease(function (x, y) {
    if (st !== ST.PLAYING || hall.held < 0) return;
    var i = hall.held; hall.held = -1;
    if (over || stop) { hall.boots[i].held = false; return; }
    var r = dropBoot(hall, i, x, y);
    onDrop(r);
    if (r.kind === 'ok') game.audio.play('se_coin', 0.25);
  });

  function wrapUp() {
    if (over) return;
    over = true; endT = 1.4;
    if (hall.held >= 0) { hall.boots[hall.held].held = false; hall.held = -1; }
    if (won) score += Math.floor(timeLeft * 20) + (MISS_MAX - misses) * 60;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash('#ffd02a', 0.3);
  }

  function enterResult() {
    st = ST.RESULT;
    var stats = { shod: shod, misses: misses, maxCombo: maxCombo, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT: いちばん小さい長靴を左端の子へ運んで履かせ、次は大きい長靴を2番目の子へ置いて跳ね返される ──
  var demo = { t: 0, Hl: null, hx: W / 2, hy: H * 0.85, press: false, stage: 0, bi: -1, from: null, hl: null, k: 0 };
  var DEMO_CYCLE = 4.6;
  function demoBoot(Hl, size) { for (var i = 0; i < Hl.boots.length; i++) if (Hl.boots[i].size === size && Hl.boots[i].placed < 0) return i; return -1; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.Hl) { demo.Hl = makeHall(1); demo.stage = 0; demo.bi = -1; demo.hl = null; }
    var Hl = demo.Hl;
    demo.press = false;
    var plan = demo.stage < 2 ? { size: Hl.kids[0].size, kid: 0, t0: 0.4 } : { size: Hl.kids[3].size, kid: 1, t0: 2.2 };
    if (demo.stage === 0 || demo.stage === 2) {
      var bi = demoBoot(Hl, plan.size), b = Hl.boots[bi];
      demo.hx += (b.x - demo.hx) * Math.min(1, dt * 7);
      demo.hy += (b.y - 30 - demo.hy) * Math.min(1, dt * 7);
      if (cyc > plan.t0) { demo.bi = bi; b.held = true; demo.stage++; demo.from = { x: b.x, y: b.y, t: cyc }; }
    } else if (demo.stage === 1 || demo.stage === 3) {
      var bb = Hl.boots[demo.bi], kid = Hl.kids[plan.kid];
      var u = Math.min(1, (cyc - demo.from.t) / 0.8);
      var e = u * u * (3 - 2 * u);
      bb.x = demo.from.x + (kid.x - demo.from.x) * e;
      bb.y = demo.from.y + (SLOT_Y - demo.from.y) * e - Math.sin(u * Math.PI) * 80;
      demo.hx = bb.x; demo.hy = bb.y - 30; demo.press = true;
      if (u >= 1) {
        var r = dropBoot(Hl, demo.bi, bb.x, bb.y);
        if (r.kind === 'ok') game.feedback.good(r.x, r.y - 80, { text: '+100', color: '#ffd02a', count: 10, volume: 0.2 });
        else { game.feedback.bad(r.x, r.y - 80, { text: 'MISS', volume: 0.15, shake: 3 }); demo.hl = bb; demo.k = 0; }
        demo.stage++;
      }
    }
    if (demo.hl) demo.k = Math.min(1, demo.k + dt * 2);
    stepHall(Hl, dt);
  }

  function drawHud() {
    ink(shod + ' / ' + NEEDED, W * 0.2, 96, 58);
    ink(String(score), W * 0.5, 96, 48, '#ffd02a');
    for (var i = 0; i < MISS_MAX; i++) ball(W * 0.74 + i * 74, 96, 22, i < misses ? '#ff3b5c' : WHITE);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    box(70, 168, W - 140, 26, '#dff4ff');
    game.draw.rect(70, 168, (W - 140) * fr, 26, low ? '#ff3b5c' : '#2ad07a');
  }

  game.onUpdate(function (dt) {
    if (st === ST.ATTRACT) {
      stepDemo(dt);
      drawHall(demo.Hl);
      drawKids(demo.Hl, null);
      drawBoots(demo.Hl, demo.hl, demo.k);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      ink(LOGO, W / 2, 100, 84, '#ffd02a');
      ink('HI-SCORE ' + (game.best > 0 ? game.best : '-'), W / 2, 180, 38);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', W / 2, H * 0.965, 46, '#ffd02a');
      else ink('TAP TO START', W / 2, H * 0.965, 42);
      return;
    }

    if (st === ST.RESULT) {
      drawHall(hall);
      drawKids(hall, null);
      ink(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 104, won ? '#ffd02a' : '#ff3b5c');
      ink(shod + ' / ' + NEEDED, W / 2, H * 0.34, 62);
      ink('SCORE ' + score, W / 2, H * 0.8, 54);
      if (won && score > prevBest) ink('NEW RECORD', W / 2, H * 0.86, 56, '#ffd02a');
      else ink('BEST ' + Math.max(prevBest, score), W / 2, H * 0.86, 42);
      if (!won) ink('あと' + (NEEDED - shod) + '足!', W / 2, H * 0.74, 58, '#ffd02a');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', W / 2, H * 0.965, 40);
      return;
    }

    // ── PLAYING ──
    var hk = 0;
    if (over) {
      endT -= dt;
      stepHall(hall, dt);
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.13; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.25, H * 0.6), { color: BOOT_COLS[Math.floor(game.random(0, 5))], count: 16, speed: 460 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      hk = 1 - stop.t / stop.max;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('C6', 0.12, { wave: 'square', volume: 0.1 });
    } else {
      timeLeft -= dt;
      stepHall(hall, dt);
      if (nextT > 0) {
        nextT -= dt;
        if (nextT <= 0) { cls++; hall = makeHall(cls); game.audio.play('se_jump', 0.25); }
      }
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0;
        if (hall.held >= 0) { hall.boots[hall.held].held = false; hall.held = -1; }
        var rest = null;
        for (var i = 0; i < hall.boots.length; i++) if (hall.boots[i].placed < 0) { rest = hall.boots[i]; break; }
        haltThen({ boot: rest }, function () { game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' }); won = false; wrapUp(); });
      }
    }

    drawHall(hall);
    drawKids(hall, stop && stop.info.kid ? stop.info.kid : null);
    drawBoots(hall, stop ? stop.info.boot : null, hk);
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.38, 120, '#ffd02a');
  });

  game.onStart(function () {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 1], ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 2],
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['B5', 1], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 2]],
      { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1], ['F2', 1], ['G2', 1], ['C3', 2], ['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1], ['F2', 1], ['G2', 1], ['C3', 2]] });
    st = ST.ATTRACT;
    initGame();
  });
})(game);
