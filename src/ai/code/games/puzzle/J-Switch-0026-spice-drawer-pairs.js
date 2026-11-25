// J-Switch-0026-spice-drawer-pairs.js
// 香辛料問屋の引き出し探し — 壁一面の引き出しには同じ香辛料が2つずつ。注文札の香辛料が入った2つの引き出しを開け当て、帳場へ持ち帰る
// 操作: 引き出しをタップで開ける。注文札と同じ香辛料なら開いたまま、違えば閉じる。同じ香辛料を2つ開ければ納品(社内メモ。画面には出さない)
// 終わり: 注文を4件こなせばCLEAR。違う引き出しを6回開ける/時間切れでGAME OVER
// @mechanic: pair_match
// @theme: spice_wholesaler_drawer_pairs
// 世界観: 港町の香辛料問屋の奥の間で、新入りの丁稚が壁一面の百味引き出しを相手に、帳場から次々に回ってくる注文札の香辛料を探し出す。開け損じた引き出しの中身を覚えておくほど、次の注文が速くなる
// 残るもの: 正誤(CLEAR/GAME OVER) + 納品数・開け損じ数・最速の納品秒
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗めで金属質、粒状ノイズ、背景は一枚絵
  var STYLE = { bg: ['#140e0a', '#2a1d14', '#3d2b1d'], main: ['#6e4a2e', '#8a6242', '#b8a58a'], accent: ['#d9a441', '#c9412b'] };
  var C = {
    bg1: '#110b08', bg2: '#2e2016', wood: '#5a3b24', woodL: '#7a5334', woodD: '#2a1a10', brass: '#d9a441', brassD: '#8a6424',
    paper: '#e8dcc0', ink: '#1a120c', good: '#9ed36a', bad: '#c9412b', white: '#f4ecdc', steel: '#7a8288'
  };

  var GAME_TITLE = 'SPICE DRAWERS';
  var TIME_LIMIT = 18;
  var NEEDED = 4;
  var MAX_WRONG = 6;
  var COLS = 4, ROWS = 3;
  var DW = 210, DH = 150, GX = 30, GY = 34;
  var OX = (W - (COLS * DW + (COLS - 1) * GX)) / 2, OY = H * 0.3;
  var PEEK_T = 1.8;

  var SPICES = [
    { a: ['...gg.', '..rr..', '.rrr..', '.rrr..', '..rr..', '...r..'], p: { g: '#4a8a2a', r: '#d0302a' } },
    { a: ['..b...', 'b.b.b.', '.bbb..', 'bbBbb.', '.bbb..', 'b.b.b.'], p: { b: '#7a4a24', B: '#c08a4a' } },
    { a: ['.cc...', '.cCc..', '..cCc.', '..cCc.', '...cCc', '....cc'], p: { c: '#a0602a', C: '#d8a060' } },
    { a: ['k.k.k.', '.k.k.k', 'k.k.k.', '.k.k.k', 'k.k.k.', '......'], p: { k: '#2a2622' } },
    { a: ['o...o.', '.o.o..', '..o...', '.o.o..', 'o...o.', '.o..o.'], p: { o: '#ff8a1a' } },
    { a: ['..gg..', '.gGgg.', 'gGggg.', '.gggg.', '..gg..', '......'], p: { g: '#7aa84a', G: '#b8d88a' } }
  ];
  var BOY = [
    ['..hhh..', '.hhhhh.', '..sss..', '..sks..', '.aaaaa.', 'a.aaa.a', '..a.a..', '.k...k.'],
    ['..hhh..', '.hhhhh.', '..sss..', '..sks..', 'aaaaaaa', '..aaa..', '..a.a..', '..k.k..']
  ];
  var SACK = ['.kkkk.', 'kbbbbk', 'kbbbbk', 'kbbbbk', '.kkkk.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, done, wrongs, drawers, order, openX, peekT, hitStop, outro, ok, orderT, fastest, halfShown, carry;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)) % (i + 1); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  function dPos(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: OX + c * (DW + GX), y: OY + r * (DH + GY) };
  }

  function newOrder() {
    var left = [];
    for (var i = 0; i < drawers.length; i++) if (!drawers[i].gone && left.indexOf(drawers[i].s) < 0) left.push(drawers[i].s);
    order = left[Math.floor(game.random(0, left.length)) % left.length];
    openX = []; orderT = 0;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; done = 0; wrongs = 0;
    hitStop = 0; outro = 0; ok = false; fastest = 99; halfShown = false; carry = null;
    var ids = shuffle([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    drawers = [];
    for (var i = 0; i < ids.length; i++) drawers.push({ s: ids[i], open: 0, gone: false, shut: 0, flash: 0 });
    peekT = PEEK_T;
    newOrder();
  }

  // 引き出しを開ける(実プレイ・デモ共用)
  function openDrawer(i, isDemo) {
    var d = drawers[i];
    if (!d || d.gone || d.open > 0 || peekT > 0) return false;
    d.open = 1;
    if (d.s === order) {
      openX.push(i);
      if (!isDemo) game.audio.tone('E5', 0.08, { wave: 'triangle', volume: 0.05 });
      if (openX.length >= 2) deliver(isDemo);
      else if (!isDemo) game.fx.burst(dPos(i).x + DW / 2, dPos(i).y + DH / 2, { color: C.brass, count: 6, speed: 140 });
      return true;
    }
    d.shut = 0.6; d.flash = 0.6;
    if (isDemo) return true;
    wrongs++;
    if (wrongs >= MAX_WRONG) { finish(false, dPos(i)); return true; }
    hitStop = 0.3;
    game.feedback.bad(dPos(i).x + DW / 2, dPos(i).y - 20, { text: 'MISS', color: C.bad, shake: 6 });
    return true;
  }

  function deliver(isDemo) {
    var a = dPos(openX[0]), b = dPos(openX[1]);
    for (var k = 0; k < 2; k++) { drawers[openX[k]].flash = 0.5; }
    carry = { s: order, x: (a.x + b.x) / 2 + DW / 2, y: (a.y + b.y) / 2 + DH / 2, t: 0.6, from: openX.slice() };
    if (isDemo) { game.fx.burst(carry.x, carry.y, { color: C.brass, count: 12, speed: 240 }); return; }
    done++;
    if (orderT < fastest) fastest = orderT;
    game.feedback.good(carry.x, carry.y - 100, { text: orderT < 2 ? 'PERFECT' : 'GOOD', color: C.good, count: 18 });
    game.audio.play('se_coin', 0.4);
    if (!halfShown && done >= NEEDED / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(done + ' / ' + NEEDED, W / 2, H * 0.26, { color: C.brass, size: 72 });
    }
    if (done >= NEEDED) finish(true, null);
  }

  function stepShop(dt, isDemo) {
    if (peekT > 0) { peekT -= dt; if (peekT <= 0 && !isDemo) game.audio.play('se_tap', 0.4); return; }
    orderT += dt;
    for (var i = 0; i < drawers.length; i++) {
      var d = drawers[i];
      if (d.flash > 0) d.flash -= dt;
      if (d.shut > 0) { d.shut -= dt; if (d.shut <= 0) d.open = 0; }
    }
    if (carry) {
      carry.t -= dt;
      if (carry.t <= 0) {
        drawers[carry.from[0]].gone = true; drawers[carry.from[1]].gone = true;
        carry = null;
        var remain = 0;
        for (var r = 0; r < drawers.length; r++) if (!drawers[r].gone) remain++;
        if (remain > 0 && (isDemo || phase === 'play')) newOrder();
      }
    }
  }

  function finish(win, at) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.brass, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(at ? at.x + DW / 2 : W / 2, at ? at.y : H * 0.45, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  function drawerAt(x, y) {
    for (var i = 0; i < drawers.length; i++) {
      var p = dPos(i);
      if (x >= p.x - 10 && x <= p.x + DW + 10 && y >= p.y - 10 && y <= p.y + DH + 10) return i;
    }
    return -1;
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0 || carry) return;
    var i = drawerAt(x, y);
    if (i >= 0 && !drawers[i].gone && drawers[i].open === 0 && peekT <= 0) { game.audio.play('se_tap', 0.3); openDrawer(i, false); }
    else { game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.03 }); game.fx.burst(x, y, { color: C.steel, count: 3, speed: 80 }); }
  });

  // ── demo(覚えた引き出しを2つ開けて納品。3件目は1つ開け損じる)──────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: 0, next: 0, n: 0, lastOrder: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 12;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.n = 0; demo.next = PEEK_T + 0.5; demo.lastOrder = -1; }
    stepShop(dt, true);
    if (demo.press > 0) demo.press -= dt;
    if (peekT > 0 || carry) return;
    var aim = -1;
    var slip = demo.n % 3 === 2 && openX.length === 0;
    for (var i = 0; i < drawers.length; i++) {
      var d = drawers[i];
      if (d.gone || d.open > 0) continue;
      if (slip ? d.s !== order : d.s === order) { aim = i; break; }
    }
    if (aim < 0) return;
    var p = dPos(aim);
    var k = Math.min(1, dt * 6);
    demo.gx += (p.x + DW / 2 - demo.gx) * k; demo.gy += (p.y + DH / 2 + 20 - demo.gy) * k;
    if (cyc > demo.next) {
      openDrawer(aim, true);
      demo.press = 0.25; demo.next = cyc + 0.7;
      if (slip || openX.length >= 2) demo.n++;
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.45, C.bg2], [1, C.bg1]]);
    // 棚の大枠(一枚絵の奥行き)
    game.draw.rect(OX - 40, OY - 50, W - 2 * OX + 80, ROWS * (DH + GY) + 70, C.woodD);
    game.draw.rect(OX - 30, OY - 40, W - 2 * OX + 60, 14, C.woodL, 0.5);
    // 粒状ノイズ
    for (var n = 0; n < 60; n++) {
      var nx = (n * 397 + Math.floor(t * 12) * 131) % W, ny = (n * 211 + Math.floor(t * 12) * 71) % H;
      game.draw.rect(nx, ny, 3, 3, C.white, 0.06);
    }
    // 天井のランプの光
    for (var b = 0; b < 4; b++) game.draw.circle(W / 2, H * 0.24, 140 + b * 120, C.brass, 0.05 + 0.01 * Math.sin(t * 2));
    game.draw.rect(0, 0, W, H, C.brass, 0.015 + 0.015 * Math.sin(t * 1.3));
  }

  function spice(s, x, y, px, alpha) {
    var sp = SPICES[s];
    game.draw.sprite(sp.a, sp.p, x, y, px, { anchor: 'center', alpha: alpha });
  }

  function drawDrawers() {
    var t = game.time.elapsed;
    for (var i = 0; i < drawers.length; i++) {
      var d = drawers[i];
      var p = dPos(i);
      if (d.gone) { game.draw.rect(p.x, p.y, DW, DH, '#0a0604'); continue; }
      var isOpen = d.open > 0 || peekT > 0;
      // 引き出しの箱(上下で明暗を変えて金属質の縁)
      game.draw.rect(p.x, p.y, DW, DH, C.wood);
      game.draw.rect(p.x, p.y, DW, 12, C.woodL);
      game.draw.rect(p.x, p.y + DH - 12, DW, 12, C.woodD);
      if (isOpen) {
        game.draw.rect(p.x + 14, p.y + 16, DW - 28, DH - 32, '#1a100a');
        var bad = d.flash > 0 && d.s !== order && peekT <= 0;
        var good = d.flash > 0 && d.s === order;
        if (good && Math.floor(t * 12) % 2 === 0) game.draw.rect(p.x + 8, p.y + 8, DW - 16, DH - 16, C.good, 0.35);
        if (bad) game.draw.rect(p.x + 8, p.y + 8, DW - 16, DH - 16, C.bad, 0.3);
        spice(d.s, p.x + DW / 2, p.y + DH / 2, 14, 1);
      } else {
        game.draw.rect(p.x + DW / 2 - 34, p.y + DH / 2 - 8, 68, 16, C.brassD);
        game.draw.rect(p.x + DW / 2 - 30, p.y + DH / 2 - 6, 60, 6, C.brass);
      }
    }
    if (carry) spice(carry.s, carry.x + (W / 2 - carry.x) * (1 - carry.t / 0.6), carry.y + (H * 0.88 - carry.y) * (1 - carry.t / 0.6), 12, 1);
  }

  function drawOrder() {
    var t = game.time.elapsed;
    // 注文札(紙)を吊るした糸
    game.draw.line(W / 2, 230, W / 2, 262, C.steel, 3);
    game.draw.rect(W / 2 - 110, 262, 220, 170, C.paper);
    game.draw.rect(W / 2 - 110, 262, 220, 14, C.bad);
    spice(order, W / 2 - 40, 350 + Math.sin(t * 2) * 3, 12, 1);
    spice(order, W / 2 + 40, 350 + Math.sin(t * 2 + 1) * 3, 12, 1);
    for (var k = 0; k < 2; k++) game.draw.circle(W / 2 - 40 + k * 80, 412, 10, k < openX.length ? C.good : C.steel);
    if (peekT > 0) {
      game.draw.rect(OX - 40, OY + ROWS * (DH + GY) + 30, (W - 2 * OX + 80) * (peekT / PEEK_T), 12, C.brass);
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.82, W, H * 0.18, C.woodD);
    game.draw.rect(0, H * 0.82, W, 16, C.woodL);
    game.draw.sprite(BOY[Math.floor(t * 2) % 2], { h: '#2a1a10', s: '#e0b890', k: C.ink, a: '#3a4a6a' }, W * 0.15, H * 0.9 + Math.sin(t * 2.4) * 5, 14, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(SACK, { k: C.ink, b: i < done ? C.brass : C.wood }, W * 0.36 + i * 100, H * 0.9, 12, { anchor: 'center' });
    for (var m = 0; m < MAX_WRONG; m++) game.draw.rect(W * 0.36 + m * 70, H * 0.955, 46, 14, m < wrongs ? C.bad : C.wood);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.85);
    txt(done + ' / ' + NEEDED, W / 2, 90, 66, C.brass);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.woodD);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.brass);
  }

  function score() { return done * 300 + Math.max(0, MAX_WRONG - wrongs) * 60 + Math.round(timeLeft * 12); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawRoom(); drawDrawers(); drawOrder(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 74, C.brass);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.78, 42, C.brass);
      else txt('INSERT COIN', W / 2, H * 0.78, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawRoom(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 90, ok ? C.good : C.bad);
      txt('BEST ' + game.best, W / 2, H * 0.51, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.78, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        // 最初の見せ(全部の引き出しが開いている間)は持ち時間に数えない
        if (peekT <= 0) timeLeft -= dt;
        stepShop(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false, null); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { delivered: done, wrongs: wrongs, fastest: fastest < 99 ? Math.round(fastest * 10) / 10 : 0 };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawRoom(); drawDrawers(); drawOrder(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.75, 96, C.brass);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.ink, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.brass);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - done) + '件!', W / 2, H * 0.49, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G#4', 0.5], ['A4', 1], ['F4', 0.5], ['E4', 0.5],
      ['D4', 0.5], ['E4', 0.5], ['F4', 0.5], ['E4', 0.5], ['D4', 2]
    ], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true, bass: [['D2', 2], ['A1', 2], ['D2', 2], ['A1', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
