// J-GC4-0049-carousel-tag-pairs.js
// ベルトの荷札合わせ — 回り続ける2本のベルトに伏せて流れる荷札をめくり、同じ模様の2枚を組にする。組むほどベルトは速く、見せてくれる時間は短くなる
// 操作: 流れている荷札をタップしてめくる。2枚めくって同じ模様なら組になって持ち上がる。違えば少しのあいだ見えてから伏せ直る
// 終わり: 5組すべてそろえればCLEAR。時間切れでGAME OVER
// @mechanic: pair_match
// @theme: carousel_tag_pairs
// 世界観: 夜の空港の手荷物場で、見習いの荷物係が上下逆向きに回る2本のベルトを流れる伏せ荷札を目で追い、同じ模様の荷札を組にして持ち主ごとの台車に乗せていく
// 残るもの: 正誤(CLEAR/GAME OVER) + そろえた組数とめくった回数
// スタイル: MODERN AD-GAME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = {
    bg: ['#2b0f5c', '#4a1fa0', '#7b3ff2'],
    main: ['#ffffff', '#ffe34d', '#1c1030'],
    accent: ['#00e5ff', '#ff3d7f'],
  };
  var YEL = STYLE.main[1];
  var INK = STYLE.main[2];
  var CYAN = STYLE.accent[0];
  var PINK = STYLE.accent[1];
  var GREEN = '#3dff8a';

  var GAME_TITLE = 'TAG CAROUSEL';
  var TIME_LIMIT = 20;
  var NEEDED = 5;
  var PER_ROW = 5;
  var SLOT = W / PER_ROW;
  var CW = 168, CH = 236;
  var ROW_Y = [700, 1080];
  var ROW_DIR = [1, -1];
  var SECOND_WAIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ICONS = [
    { art: ['..aa..', '.a..a.', '..aa..', '...a..', 'a..a.a', '.aaaa.'], col: '#1f7bff' },
    { art: ['..s...', '..ss..', 'ssssss', '.ssss.', '.s..s.', 's....s'], col: '#ffb000' },
    { art: ['...ll.', '..llll', '.llll.', 'llll..', '.l....', 'l.....'], col: '#1fc15a' },
    { art: ['......', '.fff.f', 'ff.fff', 'ffffff', '.fff.f', '......'], col: '#ff4d4d' },
    { art: ['.kk...', 'k..k..', '.kk...', '..kkkk', '..k.k.', '......'], col: '#b04dff' },
  ];
  var HANDLER = [
    ['..cc..', '.cccc.', '..ss..', '.bbbb.', 'b.bb.b', '..bb..', '.b..b.'],
    ['..cc..', '.cccc.', '..ss..', 'bbbbbb', '..bb..', '..bb..', '.b..b.'],
  ];
  var CART = ['y......', 'y......', 'yyyyyyy', '.k...k.'];

  var cards, open, pairs, flips, timeLeft, ready, hitStop, hitPair, ended, endWait, won, score;
  var beltPos, speed, revealT, closeT, firstT, combo, lift;

  function txt(s, x, y, size, color, align) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: align || 'center' });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 0.999));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function initGame() {
    var faces = shuffle([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    cards = [];
    for (var i = 0; i < faces.length; i++) {
      cards.push({ face: faces[i], row: i < PER_ROW ? 0 : 1, slot: i % PER_ROW, up: false, gone: false, flip: 0, ph: Math.random() * 6 });
    }
    open = [];
    pairs = 0;
    flips = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    hitStop = 0;
    hitPair = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    beltPos = [0, 0];
    speed = 70;
    revealT = 0.9;
    closeT = 0;
    firstT = 0;
    combo = 0;
    lift = [];
  }

  function cardX(c) {
    var raw = c.slot * SLOT + SLOT / 2 + beltPos[c.row] * ROW_DIR[c.row];
    var span = W + SLOT * 0;
    var x = ((raw % span) + span) % span;
    return x;
  }

  function cardAt(x, y) {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.gone) continue;
      var cx = cardX(c);
      var cy = ROW_Y[c.row];
      // 画面端で折り返すので両側を判定
      for (var k = -1; k <= 1; k++) {
        var xx = cx + k * W;
        if (x > xx - CW / 2 - 8 && x < xx + CW / 2 + 8 && y > cy - CH / 2 - 8 && y < cy + CH / 2 + 8) return i;
      }
    }
    return -1;
  }

  function endGame(ok, demo) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.4;
    if (!demo) {
      game.audio.stopBgm();
      game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
    }
  }

  function flipCard(i, demo) {
    if (ended || i < 0 || closeT > 0 || hitStop > 0) return false;
    var c = cards[i];
    if (c.up || c.gone) return false;
    c.up = true;
    c.flip = 1;
    flips++;
    open.push(i);
    if (!demo) game.audio.play('se_tap', 0.35);
    if (open.length === 1) { firstT = 0; return true; }
    var a = cards[open[0]], b = cards[open[1]];
    if (a.face === b.face) {
      hitStop = 0.3;
      hitPair = [open[0], open[1]];
    } else {
      combo = 0;
      closeT = revealT;
      var bx = cardX(b);
      game.feedback.bad(bx, ROW_Y[b.row] - CH / 2 - 20, { text: 'MISS', volume: demo ? 0 : undefined, shake: false });
    }
    return true;
  }

  function resolvePair(demo) {
    var a = cards[hitPair[0]], b = cards[hitPair[1]];
    a.gone = true; b.gone = true;
    var ax = cardX(a), bx = cardX(b);
    lift.push({ x: ax, y: ROW_Y[a.row], face: a.face, t: 0 });
    lift.push({ x: bx, y: ROW_Y[b.row], face: b.face, t: 0 });
    hitPair = null;
    open = [];
    pairs++;
    combo++;
    var pts = 100 * combo + Math.round(timeLeft * 4);
    score += pts;
    game.feedback.good((ax + bx) / 2, (ROW_Y[a.row] + ROW_Y[b.row]) / 2, { text: combo > 1 ? 'x' + combo : 'NICE', color: GREEN, count: 22, volume: demo ? 0 : undefined });
    game.fx.popup('+' + pts, (ax + bx) / 2, Math.min(ROW_Y[a.row], ROW_Y[b.row]) - 150, { color: YEL, size: 54 });
    // 組むほど速く・短く
    speed += 26;
    revealT = Math.max(0.42, revealT - 0.12);
    if (!demo) game.audio.play('se_coin', 0.4);
    if (!demo && pairs === 3) {
      game.fx.popup(pairs + ' / ' + NEEDED, W / 2, H * 0.25, { color: CYAN, size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
    if (pairs >= NEEDED && !demo) endGame(true, demo);
  }

  function stepWorld(dt, demo) {
    beltPos[0] += speed * dt;
    beltPos[1] += speed * 1.15 * dt;
    for (var i = 0; i < cards.length; i++) if (cards[i].flip > 0) cards[i].flip = Math.max(0, cards[i].flip - dt * 5);
    if (closeT > 0) {
      closeT -= dt;
      if (closeT <= 0) {
        for (var k = 0; k < open.length; k++) { cards[open[k]].up = false; cards[open[k]].flip = 1; }
        open = [];
        if (!demo) game.audio.tone('E4', 0.06, { wave: 'triangle', volume: 0.05 });
      }
    }
    if (open.length === 1) {
      firstT += dt;
      if (firstT > SECOND_WAIT) {
        // 2枚目を待ちすぎ: 伏せ直る
        var c = cards[open[0]];
        c.up = false; c.flip = 1;
        open = [];
        combo = 0;
        game.feedback.bad(cardX(c), ROW_Y[c.row] - CH / 2 - 20, { text: 'MISS', volume: demo ? 0 : undefined });
      }
    }
    for (var l = lift.length - 1; l >= 0; l--) {
      lift[l].t += dt;
      if (lift[l].t > 0.9) lift.splice(l, 1);
    }
  }

  // ── 描画 ──
  function drawCard(c, x, y, hl) {
    var sq = c.flip > 0 ? Math.abs(Math.cos(c.flip * Math.PI)) : 1;
    var w = CW * Math.max(0.1, sq);
    var showFace = c.flip > 0.5 ? !c.up : c.up;
    var bob = Math.sin(game.time.elapsed * 3 + c.ph) * 3;
    game.draw.rect(x - w / 2 - 6, y - CH / 2 - 6 + bob, w + 12, CH + 12, INK);
    if (showFace) {
      game.draw.rect(x - w / 2, y - CH / 2 + bob, w, CH, '#ffffff');
      game.draw.rect(x - w / 2, y - CH / 2 + bob, w, 26, ICONS[c.face].col);
      if (sq > 0.45) game.draw.sprite(ICONS[c.face].art, { a: ICONS[c.face].col, s: ICONS[c.face].col, l: ICONS[c.face].col, f: ICONS[c.face].col, k: ICONS[c.face].col }, x, y + 16 + bob, 20, { anchor: 'center' });
    } else {
      game.draw.rect(x - w / 2, y - CH / 2 + bob, w, CH, c.row === 0 ? PINK : CYAN);
      for (var s = 0; s < 5; s++) game.draw.rect(x - w / 2, y - CH / 2 + 30 + s * 42 + bob, w, 14, '#ffffff', 0.25);
      game.draw.circle(x, y - CH / 2 + 26 + bob, 12, INK);
    }
    if (hl) {
      game.draw.rect(x - CW / 2 - 16, y - CH / 2 - 16, CW + 32, CH + 32, '#ffffff', 0.45);
    }
  }

  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 光の放射(広告ゲームらしい後光)
    for (var r = 0; r < 8; r++) {
      var a = t * 0.3 + r * 0.785;
      game.draw.line(W / 2, 360, W / 2 + Math.cos(a) * 900, 360 + Math.sin(a) * 900, '#ffffff', 40);
    }
    game.draw.rect(0, 0, W, H, STYLE.bg[0], 0.82);
    game.draw.rect(0, 0, W, H, CYAN, 0.03 + 0.025 * Math.sin(t * 1.6));
    // ベルト
    for (var row = 0; row < 2; row++) {
      var y = ROW_Y[row];
      game.draw.rect(0, y - CH / 2 - 30, W, CH + 60, '#140a26');
      game.draw.rect(0, y + CH / 2 + 18, W, 12, '#5a4a7a');
      var off = (beltPos[row] * ROW_DIR[row]) % 60;
      for (var k = -1; k < 20; k++) game.draw.rect(k * 60 + off, y + CH / 2 + 18, 8, 12, '#ffffff', 0.5);
      // 矢印の流れ(方向の手がかり)
      for (var m = 0; m < 6; m++) {
        var ax = ((m * 190 + beltPos[row] * ROW_DIR[row]) % W + W) % W;
        game.draw.rect(ax, y - CH / 2 - 22, 36, 8, row === 0 ? PINK : CYAN, 0.6);
      }
    }
  }

  function drawCards() {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.gone) continue;
      var x = cardX(c);
      var hl = hitPair && (hitPair[0] === i || hitPair[1] === i);
      drawCard(c, x, ROW_Y[c.row], hl);
      if (x < CW / 2 + 6) drawCard(c, x + W, ROW_Y[c.row], hl);
      if (x > W - CW / 2 - 6) drawCard(c, x - W, ROW_Y[c.row], hl);
    }
    for (var l = 0; l < lift.length; l++) {
      var L = lift[l];
      var ty = L.y - L.t * 900;
      var tx = L.x + (W / 2 - L.x) * Math.min(1, L.t * 1.3);
      game.draw.sprite(ICONS[L.face].art, { a: ICONS[L.face].col, s: ICONS[L.face].col, l: ICONS[L.face].col, f: ICONS[L.face].col, k: ICONS[L.face].col }, tx, ty, 16, { anchor: 'center', alpha: Math.max(0, 1 - L.t) });
    }
  }

  function drawFloor() {
    var t = game.time.elapsed;
    // 親指ゾーン: 荷物係と、組になった荷札が乗る台車
    game.draw.rect(0, 1360, W, H - 1360, '#1c1030');
    game.draw.rect(0, 1360, W, 10, YEL);
    game.draw.sprite(HANDLER[Math.floor(t * 3) % 2], { c: YEL, s: '#ffcf9e', b: CYAN }, 140 + Math.sin(t * 1.2) * 10, 1560 + Math.sin(t * 3) * 5, 16, { anchor: 'center' });
    for (var p = 0; p < NEEDED; p++) {
      var cx = 300 + p * 150;
      var filled = p < pairs;
      game.draw.sprite(CART, { y: filled ? YEL : '#5a4a7a', k: '#ffffff' }, cx, 1640, 14, { anchor: 'center' });
      if (filled) game.draw.sprite(ICONS[0].art, { a: GREEN, s: GREEN, l: GREEN, f: GREEN, k: GREEN }, cx, 1590 + Math.sin(t * 4 + p) * 4, 9, { anchor: 'center' });
    }
  }

  function drawHud() {
    txt(pairs + ' / ' + NEEDED, 60, 110, 58, YEL, 'left');
    txt('SCORE ' + score, W - 60, 110, 38, '#ffffff', 'right');
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 22, INK);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? PINK : GREEN);
    // めくり1枚目の待ち時間
    if (open.length === 1 && closeT <= 0) {
      var f = Math.max(0, 1 - firstT / SECOND_WAIT);
      game.draw.rect(W / 2 - 150, 206, 300 * f, 10, f < 0.3 ? PINK : YEL);
    }
  }

  function drawScene() {
    drawBackground();
    drawCards();
    drawFloor();
  }

  // ── ATTRACT ゴースト実演: 実ロジックで「はずれ1回→当たり1組」 ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, plan: [], idx: 0 };
  function demoPlan() {
    var a = 0, miss = -1, match = -1;
    for (var i = 1; i < cards.length; i++) if (cards[i].face !== cards[a].face && miss < 0) miss = i;
    for (var j = 0; j < cards.length; j++) if (cards[j].face === cards[2].face && j !== 2) match = j;
    return [{ t: 0.5, i: a }, { t: 1.0, i: miss }, { t: 2.1, i: 2 }, { t: 2.6, i: match }];
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      initGame();
      ready = 0;
      demo.plan = demoPlan();
      demo.idx = 0;
    }
    var nx = demo.plan[Math.min(demo.idx, demo.plan.length - 1)];
    var tc = cards[nx.i];
    var tx = cardX(tc), ty = ROW_Y[tc.row];
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 9);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 9);
    demo.press = false;
    if (demo.idx < demo.plan.length && cyc >= nx.t) {
      flipCard(nx.i, true);
      demo.idx++;
      demo.press = true;
    }
    if (cyc - (demo.plan[Math.max(0, demo.idx - 1)] || { t: 0 }).t < 0.15) demo.press = true;
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolvePair(true);
    }
    stepWorld(dt, true);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      initGame();
      demo.t = 0;
      return;
    }
    if (ready > 0 || ended) return;
    var i = cardAt(x, y);
    if (!flipCard(i, false)) {
      game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.04 });
      game.fx.burst(x, y, { color: '#ffffff', count: 4, speed: 120 });
    }
  });

  game.onUpdate(function (dt) {
    if (!cards) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.1, 76, YEL);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.15, 36, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 46, YEL);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, 240, W, 330, INK, 0.75);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, 340, 90, won ? GREEN : PINK);
      txt('SCORE ' + score, W / 2, 420, 48, '#ffffff');
      txt(pairs + ' / ' + NEEDED, W / 2, 480, 40, YEL);
      if (won && score >= (game.best || 0)) txt('NEW RECORD', W / 2, 545, 42, YEL);
      else txt('BEST ' + (game.best || 0), W / 2, 545, 36, '#ffffff');
      if (!won) txt('あと' + (NEEDED - pairs) + '組!', W / 2, 1450, 50, YEL);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 38, '#ffffff');
      return;
    }

    // PLAYING
    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { pairs: pairs, flips: flips };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolvePair(false);
    } else {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.47, { text: 'TIME UP' });
        endGame(false, false);
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 100, YEL);
  });

  game.onStart(function () {
    game.audio.melody(
      [['C5', 0.25], ['E5', 0.25], ['G5', 0.5], ['E5', 0.25], ['C5', 0.25], ['D5', 0.5], ['G4', 0.5], ['A4', 0.25], ['B4', 0.25], ['C5', 1]],
      { tempo: 138, wave: 'square', volume: 0.045, loop: true, bass: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
