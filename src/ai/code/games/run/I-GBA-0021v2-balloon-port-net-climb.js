// I-GBA-0021v2-balloon-port-net-climb.js
// バルーンポートネットクライム — 弾む係留ネットが一番沈んだ瞬間に踏み切り、上のネットへ次々と跳ね登る
// 操作: 足元のネットが上下に弾む。一番深く沈んだ瞬間にタップすると大ジャンプで一段上へ。浅い時に跳ぶと届かず同じネットに戻る。突風の最中に跳ぶと一段落ちる
// 終わり: 最上段の気球のゴンドラまで登ればCLEAR。制限時間切れでGAME OVER
// @mechanic: camera_climb
// @theme: balloon_port_net_climb
// 世界観: 雲の上の気球港で、見習い整備士が係留ネットの反動を読み、一番沈んだ瞬間に踏み切って最上段の気球のゴンドラまで跳ね登っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達段数・PERFECT踏み切り数・残り時間
// スタイル: 2000s BILLBOARD 3D
var STYLE = { bg: ['#6ea8ff', '#b9dcff', '#fff4e0'], main: ['#e2553e', '#3a4c8a'], accent: ['#ffd23c', '#ffffff'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TIME_LIMIT = 20;
  var NETS = 10;
  var GAP = 330;
  var SWEET = 0.8;
  var GUST_GAPS = [3.4, 3.0, 3.8, 2.8, 3.2, 2.6];

  var MECH_UP = [
    '...rrrr...',
    '..rrrrrr..',
    '..yssssy..',
    '...sese...',
    '...ssss...',
    '..bbbbbb..',
    '.sbbwbbbs.',
    '.sbbbbbbs.',
    '...bbbb...',
    '...b..b...',
    '...b..b...',
    '..kk..kk..',
  ];
  var MECH_CROUCH = [
    '..........',
    '..........',
    '...rrrr...',
    '..rrrrrr..',
    '..yssssy..',
    '...sese...',
    '.sbbbbbbs.',
    '.sbbwbbbs.',
    '..bbbbbb..',
    '..bb..bb..',
    '.bb....bb.',
    '.kk....kk.',
  ];
  var MECH_PAL = { r: '#e2553e', y: '#ffd23c', s: '#f4c9a0', e: '#2a2a3a', b: '#3a4c8a', w: '#c0c8d8', k: '#2a2a2a' };
  var BALLOON = [
    '..oooo..',
    '.oyyooo.',
    'oyyoooyo',
    'oooooyyo',
    'ooyyoooo',
    '.oooooo.',
    '..oooo..',
    '...ll...',
    '...ll...',
    '..gggg..',
    '..gggg..',
  ];
  var CLOUD = ['..ww....', '.wwww.w.', 'wwwwwwww', '.wwwwww.'];

  var phase = 'ATTRACT';
  var nets = [];
  var me, camY, clock, lvl, perfects, weak, drops, gust, gustIx, gustWait, freeze, done, endT, cleared, score, newBest, ready, peakSeen;

  function buildNets() {
    nets = [];
    var xs = [0.5, 0.28, 0.7, 0.36, 0.64, 0.26, 0.72, 0.42, 0.62, 0.34, 0.5];
    for (var i = 0; i <= NETS; i++) {
      nets.push({ wy: -i * GAP, x: W * xs[i], half: 170 - i * 4, amp: 88, period: 1.35 - i * 0.055, t: i * 0.37 });
    }
  }

  function sagOf(n) {
    return n.amp * (0.5 - 0.5 * Math.cos((n.t / n.period) * Math.PI * 2));
  }

  function freshRun() {
    buildNets();
    lvl = 0; perfects = 0; weak = 0; drops = 0;
    me = { air: 0, from: null, to: null, dur: 0.45, x: nets[0].x, y: nets[0].wy, lean: 0, fall: false };
    camY = nets[0].wy; clock = TIME_LIMIT;
    gust = { st: 'calm', t: 0, dir: 1 }; gustIx = 0; gustWait = GUST_GAPS[0];
    freeze = null; done = false; endT = 0; cleared = false; score = 0; newBest = false;
    ready = 0.8; peakSeen = false;
  }

  function toScreen(wy) { return wy - camY + H * 0.62; }

  function shadowText(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: '#1c2a55', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  // ── 背景: 空のグラデ + 奥行き(px スケール)の違う雲と気球のビルボード ──────────────
  function sky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    var par = [
      { px: 6, sp: 0.1, a: 0.55 }, { px: 10, sp: 0.25, a: 0.7 }, { px: 16, sp: 0.5, a: 0.9 },
    ];
    for (var L = 0; L < par.length; L++) {
      for (var c = 0; c < 4; c++) {
        var cx = ((c * 330 + L * 140 + t * 14 * (L + 1)) % (W + 300)) - 150;
        var cy = ((c * 520 + L * 260 - camY * par[L].sp) % (H + 200) + H + 200) % (H + 200) - 100;
        game.draw.sprite(CLOUD, { w: '#ffffff' }, cx, cy, par[L].px, { anchor: 'center', alpha: par[L].a });
      }
    }
    for (var b = 0; b < 3; b++) {
      var bx = W * (0.15 + b * 0.35) + Math.sin(t * 0.6 + b) * 20;
      var by = ((b * 610 - camY * 0.18) % (H + 300) + H + 300) % (H + 300) - 150;
      game.draw.sprite(BALLOON, { o: ['#e2553e', '#3aa37a', '#8a5ad0'][b], y: '#ffffff', l: '#6a5030', g: '#8a6a3a' }, bx, by, 5, { anchor: 'center', alpha: 0.75 });
    }
  }

  function drawNet(n, i) {
    var y0 = toScreen(n.wy);
    if (y0 < -200 || y0 > H + 200) return;
    var sag = sagOf(n);
    var gx = gust.st === 'blow' ? gust.dir * 14 : 0;
    game.draw.line(n.x - n.half, y0 - 10, n.x - n.half, y0 + 240, '#6a5030', 14);
    game.draw.line(n.x + n.half, y0 - 10, n.x + n.half, y0 + 240, '#6a5030', 14);
    game.draw.circle(n.x - n.half, y0 - 14, 12, STYLE.accent[0]);
    game.draw.circle(n.x + n.half, y0 - 14, 12, STYLE.accent[0]);
    var prevX = n.x - n.half, prevY = y0;
    for (var k = 1; k <= 10; k++) {
      var u = -1 + k * 0.2;
      var px = n.x + u * n.half + gx * (1 - u * u);
      var py = y0 + sag * (1 - u * u);
      game.draw.line(prevX, prevY, px, py, '#f5efe0', 7);
      game.draw.line(prevX, prevY + 16, px, py + 16, '#c8b89a', 3);
      if (k % 2 === 0) game.draw.line(px, py, px, py + 16, '#c8b89a', 3);
      prevX = px; prevY = py;
    }
    var deep = sag / n.amp;
    if (i === lvl && !me.air && deep > SWEET) game.draw.circle(n.x, y0 + sag + 6, 40 * deep, STYLE.accent[0], 0.35);
    if (i === NETS) {
      game.draw.sprite(BALLOON, { o: STYLE.main[0], y: '#ffffff', l: '#6a5030', g: '#8a6a3a' }, n.x, y0 - 260, 26, { anchor: 'center' });
    }
  }

  function myPos() {
    if (me.air > 0 && me.from && me.to) {
      var k = 1 - me.air / me.dur;
      var fy = me.from.wy + sagOf(me.from), ty = me.to.wy + sagOf(me.to);
      var arc = me.fall ? 0 : Math.sin(k * Math.PI) * 180;
      return { x: me.from.x + (me.to.x - me.from.x) * k, y: fy + (ty - fy) * k - arc, k: k };
    }
    var n = nets[lvl];
    return { x: n.x, y: n.wy + sagOf(n), k: 0 };
  }

  function drawMechanic() {
    var p = myPos();
    var sy = toScreen(p.y);
    var crouch = !me.air && sagOf(nets[lvl]) / nets[lvl].amp > 0.55;
    var scale = 13 + (me.air > 0 ? Math.sin(p.k * Math.PI) * 3 : 0);
    game.draw.circle(p.x, toScreen(nets[lvl].wy + sagOf(nets[lvl])) + 10, 34, '#1c2a55', 0.25);
    var bob = Math.sin(game.time.elapsed * 5) * 3;
    game.draw.sprite(crouch ? MECH_CROUCH : MECH_UP, MECH_PAL, p.x + me.lean, sy - 78 + bob, scale, { anchor: 'center', flipX: gust.dir < 0 && gust.st === 'blow' });
    return { x: p.x, y: sy - 78 };
  }

  function drawGust() {
    var t = game.time.elapsed;
    if (gust.st === 'warn') {
      if (Math.floor(t * 10) % 2 === 0) {
        for (var i = 0; i < 4; i++) {
          var ay = H * 0.3 + i * 150;
          var ax = gust.dir > 0 ? 70 : W - 70;
          game.draw.line(ax, ay, ax + gust.dir * 90, ay, '#ffffff', 10);
          game.draw.line(ax + gust.dir * 90, ay, ax + gust.dir * 60, ay - 26, '#ffffff', 10);
          game.draw.line(ax + gust.dir * 90, ay, ax + gust.dir * 60, ay + 26, '#ffffff', 10);
        }
      }
    } else if (gust.st === 'blow') {
      for (var s = 0; s < 14; s++) {
        var sx = ((s * 173 + t * 1400 * gust.dir) % W + W) % W;
        var sy = H * 0.18 + s * 95;
        game.draw.line(sx, sy, sx - gust.dir * 140, sy, '#ffffff', 4);
      }
      game.draw.rect(0, 0, W, H, '#ffffff', 0.08);
    }
  }

  function stepGust(dt) {
    if (lvl < 2 && gust.st === 'calm') return;
    gust.t -= dt;
    if (gust.st === 'calm') {
      gustWait -= dt;
      if (gustWait <= 0) {
        gust.st = 'warn'; gust.t = 0.7; gust.dir = gustIx % 2 === 0 ? 1 : -1;
        game.audio.tone('A5', 0.12, { wave: 'sawtooth', volume: 0.05, slide: -300 });
      }
    } else if (gust.st === 'warn' && gust.t <= 0) {
      gust.st = 'blow'; gust.t = 0.9;
      game.audio.tone('C3', 0.5, { wave: 'sawtooth', volume: 0.08 });
    } else if (gust.st === 'blow' && gust.t <= 0) {
      gust.st = 'calm'; gustIx++; gustWait = GUST_GAPS[gustIx % GUST_GAPS.length];
    }
  }

  // 踏み切り(実プレイとデモ共通)
  function kick(real) {
    if (me.air > 0 || freeze || done) return;
    var n = nets[lvl];
    var q = sagOf(n) / n.amp;
    var p = myPos();
    if (gust.st === 'blow') {
      freeze = { t: 0.45, x: p.x, y: toScreen(p.y) - 78, kind: 'blown' };
      game.audio.play('se_jump', 0.3);
      return;
    }
    if (q >= SWEET && lvl < NETS) {
      var perfect = q >= 0.94;
      me.from = n; me.to = nets[lvl + 1]; me.air = me.dur; me.fall = false;
      game.audio.play('se_jump', 0.45);
      game.feedback.good(p.x, toScreen(p.y) - 150, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : '#ffffff', count: perfect ? 18 : 10 });
      if (real && perfect) perfects++;
    } else {
      me.from = n; me.to = n; me.air = 0.3; me.fall = false;
      game.audio.play('se_tap', 0.4);
      game.fx.popup('MISS', p.x, toScreen(p.y) - 170, { color: '#1c2a55', size: 44 });
      game.fx.burst(p.x, toScreen(p.y), { color: '#ffffff', count: 5, speed: 150 });
      if (real) weak++;
    }
  }

  function land(real) {
    if (me.to && me.to !== me.from) {
      lvl = nets.indexOf(me.to);
      if (!me.fall) {
        game.audio.tone('E5', 0.06, { wave: 'square', volume: 0.06 });
        if (real && lvl === Math.floor(NETS / 2)) {
          game.fx.popup('NICE', W * 0.5, H * 0.3, { color: STYLE.accent[0], size: 70 });
          game.audio.play('se_milestone', 0.45);
        }
        if (real && lvl === NETS) finishRun(true);
      }
    }
    me.from = null; me.to = null; me.fall = false;
  }

  function finishRun(ok) {
    if (done) return;
    done = true; cleared = ok; endT = 1.2;
    score = lvl * 100 + perfects * 40 + (ok ? Math.round(clock * 20) : 0);
    newBest = score > (game.best || 0);
    game.audio.stopBgm();
    if (ok) {
      game.feedback.good(nets[NETS].x, toScreen(nets[NETS].wy) - 260, { text: 'CLEAR', color: STYLE.accent[0], count: 30 });
      game.audio.play('se_success', 0.5);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tick(dt, real) {
    for (var i = 0; i < nets.length; i++) nets[i].t += dt;
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) {
        game.feedback.bad(freeze.x, freeze.y, { text: 'MISS', shake: 16 });
        if (real) drops++;
        if (lvl > 0) { me.from = nets[lvl]; me.to = nets[lvl - 1]; me.air = 0.4; me.fall = true; }
        freeze = null;
      }
      return;
    }
    stepGust(dt);
    me.lean += ((gust.st === 'blow' ? gust.dir * 22 : 0) - me.lean) * Math.min(1, dt * 8);
    if (me.air > 0) {
      me.air -= dt;
      if (me.air <= 0) { me.air = 0; land(real); }
    }
    camY += (myPos().y - camY) * Math.min(1, dt * 5);
  }

  // ── ATTRACT: 深い沈みで踏み切る成功と、浅い踏み切りの失敗を実ロジックで実演 ─────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, jumps: 0, pt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { freshRun(); ready = 0; demo.jumps = 0; }
    demo.pt -= dt;
    var n = nets[lvl];
    var q = sagOf(n) / n.amp;
    if (!me.air && !freeze && lvl < 4) {
      var wantShallow = demo.jumps === 1;
      if ((wantShallow && q < 0.25 && q > 0.1) || (!wantShallow && q > 0.95)) {
        kick(false); demo.jumps++; demo.pt = 0.18;
      }
    }
    demo.press = demo.pt > 0;
    demo.gx = W * 0.5; demo.gy = H * 0.86;
    tick(dt, false);
  }

  game.onTap(function (x, y) {
    if (phase === 'ATTRACT') {
      game.audio.play('se_coin', 0.5);
      phase = 'PLAYING'; freshRun();
      return;
    }
    if (phase === 'RESULT') {
      game.audio.play('se_tap', 0.3);
      phase = 'ATTRACT'; freshRun(); demo.t = 0;
      return;
    }
    if (ready > 0 || done) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.04 }); return; }
    kick(true);
  });

  function drawDepthGauge() {
    var n = nets[lvl];
    var q = me.air ? 0 : sagOf(n) / n.amp;
    var gx = W * 0.5, gy = H * 0.86;
    game.draw.rect(gx - 300, gy - 22, 600, 44, '#1c2a55', 0.55);
    game.draw.rect(gx + 300 - 600 * (1 - SWEET), gy - 22, 600 * (1 - SWEET), 44, STYLE.accent[0], 0.45);
    game.draw.rect(gx - 300, gy - 14, 600 * q, 28, q >= SWEET ? STYLE.accent[0] : '#ffffff');
    game.draw.sprite(MECH_CROUCH, MECH_PAL, gx - 300 + 600 * q, gy - 70, 4, { anchor: 'center' });
  }

  function drawHud() {
    shadowText(lvl + ' / ' + NETS, W * 0.5, 80, 60, '#ffffff');
    var frac = Math.max(0, clock / TIME_LIMIT);
    var low = clock < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 150, W - 160, 20, '#1c2a55', 0.5);
    game.draw.rect(80, 150, (W - 160) * frac, 20, low ? STYLE.main[0] : STYLE.accent[0]);
    game.draw.rect(W - 60, 260, 20, H * 0.5, '#1c2a55', 0.4);
    game.draw.rect(W - 60, 260 + H * 0.5 * (1 - lvl / NETS), 20, H * 0.5 * (lvl / NETS), STYLE.main[0]);
    game.draw.sprite(BALLOON, { o: STYLE.main[0], y: '#ffffff', l: '#6a5030', g: '#8a6a3a' }, W - 50, 225, 4, { anchor: 'center' });
  }

  function drawWorld() {
    sky();
    for (var i = nets.length - 1; i >= 0; i--) drawNet(nets[i], i);
    var head = drawMechanic();
    if (freeze) {
      var k = 0.45 - freeze.t;
      game.draw.circle(head.x, head.y, 60 + k * 160, '#ffffff', 0.55);
    }
    drawGust();
  }

  game.onUpdate(function (dt) {
    if (phase === 'ATTRACT') {
      if (!nets.length) freshRun();
      stepDemo(dt);
      drawWorld();
      drawDepthGauge();
      game.draw.hand(demo.gx, demo.gy - 20, { press: demo.press, scale: 15 });
      shadowText('NET HOPPER', W * 0.5, H * 0.075, 78, STYLE.accent[0]);
      shadowText('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.12, 36, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) shadowText('► 100円 投入 ◄', W * 0.5, H * 0.95, 46, STYLE.accent[0]);
      else shadowText('INSERT COIN', W * 0.5, H * 0.95, 38, '#ffffff');
      return;
    }

    if (phase === 'RESULT') {
      for (var i = 0; i < nets.length; i++) nets[i].t += dt;
      drawWorld();
      game.draw.rect(80, H * 0.2, W - 160, 540, '#1c2a55', 0.75);
      shadowText(cleared ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.26, 100, cleared ? STYLE.accent[0] : STYLE.main[0]);
      shadowText(lvl + ' / ' + NETS, W * 0.5, H * 0.33, 64, '#ffffff');
      shadowText('SCORE ' + score, W * 0.5, H * 0.385, 48, '#ffffff');
      shadowText('PERFECT ' + perfects, W * 0.5, H * 0.425, 38, STYLE.accent[0]);
      if (newBest && score > 0) shadowText('NEW RECORD', W * 0.5, H * 0.465, 50, STYLE.accent[0]);
      else shadowText('BEST ' + (game.best || 0), W * 0.5, H * 0.465, 40, '#ffffff');
      if (!cleared) shadowText('あと' + (NETS - lvl) + '段!', W * 0.5, H * 0.505, 46, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) shadowText('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, '#ffffff');
      return;
    }

    // PLAYING
    if (done) {
      endT -= dt;
      for (var j = 0; j < nets.length; j++) nets[j].t += dt;
      if (endT <= 0) {
        phase = 'RESULT';
        var stats = { level: lvl, perfects: perfects, shallow: weak, blown: drops };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      for (var r = 0; r < nets.length; r++) nets[r].t += dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      tick(dt, true);
      if (!freeze && !done) {
        clock -= dt;
        if (clock <= 0) {
          clock = 0;
          game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: STYLE.main[0], size: 80 });
          finishRun(false);
        }
      }
    }

    drawWorld();
    drawDepthGauge();
    drawHud();
    if (ready > 0) shadowText(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.45, 100, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['C5', 0.5], ['D5', 1],
      ['F5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: true });
    phase = 'ATTRACT';
    freshRun();
  });
})(game);
