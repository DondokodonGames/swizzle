// J-Switch-0051-coconut-bank-kick.js
// 椰子の実かべ当て — 決まった角度でしか蹴れない椰子の実を、竹壁で跳ね返る道筋を読んで奥の籠へ入れる
// 操作: 下を行き来する子どもが「ここから蹴れば壁で跳ね返って籠に入る」位置に来た瞬間にタップ(社内メモ。画面には出さない)
// 終わり: 5球のうち3球入ればCLEAR。入らないまま球が尽きる/時間切れでGAME OVER
// @mechanic: trajectory
// @theme: island_hall_coconut_bank
// 世界観: 椰子の葉で屋根を葺いた南の島の集会所の土間で、漁師の子が、斜めにしか蹴れない重たい椰子の実を竹の壁に一度跳ね返し、反対側の梁に吊るされた編み籠へ入れる、島の子どもたちの壁当て遊び
// 残るもの: 正誤(CLEAR/GAME OVER) + 入った球数・真ん中に入った数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なし・丸角・余白、ベタ塗り数色
  var STYLE = { bg: ['#fdf1dc', '#f6d7a8', '#e8b878'], main: ['#2f8f6f', '#f2994a', '#3b3b58'], accent: ['#eb5757', '#56ccf2'] };
  var F = {
    bg: '#fdf1dc', bg2: '#f6d7a8', floor: '#e8b878', wall: '#2f8f6f', wallLo: '#236b53', nut: '#8a5a2b', nutHi: '#c08040',
    basket: '#f2994a', ink: '#3b3b58', red: '#eb5757', sky: '#56ccf2', white: '#ffffff', leaf: '#6fcf97'
  };

  var GAME_TITLE = 'COCONUT BANK';
  var TIME_LIMIT = 18;
  var SHOTS = 5;
  var NEED_IN = 3;
  var LEFT = 130, RIGHT = 950, KICK_Y = 1330;
  var ANG = 50 * Math.PI / 180;
  var BALL_V = 1900;
  var WAIT_MAX = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var turn, lead, clock, shot, made, swish, kid, dir, basket, ball, waitT, pause, endT, won, flashAt, halfMark;

  var KID = [
    ['..kkk..', '.kkkkk.', '.kfffk.', '..fff..', '.ooooo.', 'o.ooo.o', '..o.o..', '.f...f.'],
    ['..kkk..', '.kkkkk.', '.kfffk.', '..fff..', '.ooooo.', '.ooooo.', '..o.o..', '..f.f..']
  ];
  var NUT = ['.nnn.', 'nnhnn', 'nhnnn', 'nnnnn', '.nnn.'];
  var PALM = ['l.l.l', '.lll.', 'lltll', '..t..', '..t..', '..t..'];

  function write(s, x, y, sz, col, al) {
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: al || 'center' });
  }

  function placeBasket() {
    dir = shot % 2 === 0 ? 1 : -1;
    // 蹴る向きと反対側の奥に籠 → 壁で一度跳ね返さないと届かない。必ず届く位置から逆算して吊るす
    basket = { x: dir > 0 ? LEFT + 200 : RIGHT - 200, y: game.random(400, 560), wob: 0 };
    for (var i = 0; i < 40; i++) {
      var tr = trace(game.random(LEFT + 110, RIGHT - 110));
      var far = dir > 0 ? tr.endX < W / 2 - 40 : tr.endX > W / 2 + 40;
      if (tr.bounces >= 1 && far && tr.endX > LEFT + 90 && tr.endX < RIGHT - 90) { basket.x = tr.endX; return; }
    }
  }

  function prep() {
    turn = 'ready'; lead = 0.8; clock = TIME_LIMIT; shot = 0; made = 0; swish = 0;
    kid = { x: W / 2, ph: 0, v: 1.6 }; ball = null; waitT = 0; pause = 0; endT = 0; won = false; flashAt = null; halfMark = false;
    placeBasket();
  }

  // 道筋を作る(実プレイ・デモ・予告線で共用)
  function trace(x0) {
    var pts = [{ x: x0, y: KICK_Y }];
    var x = x0, y = KICK_Y, vx = Math.cos(ANG) * dir, vy = -Math.sin(ANG);
    var bounces = 0;
    for (var i = 0; i < 400; i++) {
      x += vx * 8; y += vy * 8;
      if (x < LEFT) { x = LEFT + (LEFT - x); vx = -vx; bounces++; pts.push({ x: LEFT, y: y }); }
      if (x > RIGHT) { x = RIGHT - (x - RIGHT); vx = -vx; bounces++; pts.push({ x: RIGHT, y: y }); }
      if (y <= basket.y) { pts.push({ x: x, y: basket.y }); break; }
    }
    return { pts: pts, endX: pts[pts.length - 1].x, bounces: bounces };
  }

  function kidX() { return W / 2 + Math.sin(kid.ph) * (RIGHT - LEFT - 80) / 2; }

  // 蹴る(実プレイ・デモ共用)
  function kick() {
    if (ball) return;
    var tr = trace(kidX());
    ball = { path: tr.pts, endX: tr.endX, bounces: tr.bounces, seg: 0, x: tr.pts[0].x, y: KICK_Y, spin: 0 };
    waitT = 0;
    game.audio.play('se_jump', 0.35);
  }

  function flyBall(dt, ghost) {
    if (!ball) return;
    var step = BALL_V * dt;
    ball.spin += dt * 10;
    while (step > 0 && ball.seg < ball.path.length - 1) {
      var a = { x: ball.x, y: ball.y }, b = ball.path[ball.seg + 1];
      var d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= step) {
        ball.x = b.x; ball.y = b.y; ball.seg++; step -= d;
        if (b.x === LEFT || b.x === RIGHT) { game.audio.tone('G4', 0.05, { wave: 'triangle', volume: 0.05 }); game.fx.burst(b.x, b.y, { color: F.leaf, count: 5, speed: 150 }); }
      } else { ball.x += (b.x - a.x) / d * step; ball.y += (b.y - a.y) / d * step; step = 0; }
    }
    if (ball.seg >= ball.path.length - 1) settle(ghost);
  }

  function settle(ghost) {
    var off = Math.abs(ball.endX - basket.x);
    var hit = off < 75;
    var bx = ball.x, by = ball.y;
    ball = null;
    if (ghost) {
      game.fx.burst(bx, by, { color: hit ? F.basket : F.red, count: 10, speed: 220 });
      shot++; placeBasket();
      return;
    }
    shot++;
    if (hit) {
      made++;
      var perfect = off < 28;
      if (perfect) swish++;
      game.feedback.good(basket.x, basket.y - 110, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? F.sky : F.wall, count: 14 });
      basket.wob = 0.4;
      if (!halfMark && made >= 2) { halfMark = true; game.audio.play('se_milestone', 0.5); game.fx.popup(made + ' / ' + NEED_IN, W / 2, 330, { color: F.basket, size: 70 }); }
    } else {
      flashAt = { x: bx, y: by, t: 0.4 };
      game.feedback.bad(bx, by - 100, { text: 'MISS', color: F.red });
      game.audio.tone('C3', 0.1, { wave: 'square', volume: 0.04 });
    }
    if (made >= NEED_IN) { closeGame(true); return; }
    if (made + (SHOTS - shot) < NEED_IN || shot >= SHOTS) { closeGame(false); return; }
    pause = 0.5;
    kid.v = 1.6 + shot * 0.25;
    placeBasket();
  }

  function closeGame(win) {
    if (turn === 'stop' || turn === 'fin') return;
    won = win; turn = 'stop'; pause = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(F.white, 0.25); game.audio.play('se_success', 0.6); }
    else {
      if (clock <= 0) game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: F.red });
      game.audio.play('se_failure', 0.6);
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; prep(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; prep(); demo.t = 0; return; }
    if (turn !== 'aim' || pause > 0 || ball) { game.audio.tone('D4', 0.03, { wave: 'triangle', volume: 0.02 }); return; }
    game.audio.play('se_tap', 0.25);
    kick();
  });

  // ── demo: 跳ね返りの先が籠に重なる位置で蹴る。3球目は早蹴りして外す ──
  var demo = { t: 0, gx: W / 2, gy: 1650, press: 0, early: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || shot >= SHOTS) { shot = 0; placeBasket(); ball = null; }
    kid.ph += dt * 1.4;
    demo.press -= dt;
    if (ball) { flyBall(dt, true); return; }
    var tr = trace(kidX());
    var off = Math.abs(tr.endX - basket.x);
    var sloppy = shot === 2;
    if ((sloppy && off < 260 && off > 140) || (!sloppy && off < 20)) { demo.press = 0.18; kick(); }
    demo.gx = W / 2 + Math.sin(demo.t * 1.2) * 40;
  }

  // ── drawing ──
  function drawHall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, F.bg], [0.5, F.bg2], [1, F.floor]]);
    // 屋根の椰子の葉
    for (var r = 0; r < 9; r++) game.draw.rect(r * 130 - 20, 240 + (r % 2) * 18, 150, 36, F.leaf, 0.8);
    game.draw.sprite(PALM, { l: F.leaf, t: F.nut }, 70, 330 + Math.sin(t * 1.5) * 5, 18, { anchor: 'center' });
    // 土間と竹の壁
    game.draw.rect(LEFT, 330, RIGHT - LEFT, KICK_Y - 330 + 60, F.bg);
    game.draw.rect(LEFT - 50, 300, 50, KICK_Y - 240, F.wall);
    game.draw.rect(RIGHT, 300, 50, KICK_Y - 240, F.wall);
    for (var j = 0; j < 12; j++) {
      game.draw.rect(LEFT - 50, 340 + j * 90, 50, 8, F.wallLo);
      game.draw.rect(RIGHT, 340 + j * 90, 50, 8, F.wallLo);
    }
    game.draw.rect(LEFT, KICK_Y + 40, RIGHT - LEFT, 20, F.floor);
    game.draw.rect(0, 0, W, H, F.sky, 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawBasket() {
    var t = game.time.elapsed;
    var w = basket.wob > 0 ? Math.sin(t * 40) * 10 : 0;
    game.draw.line(basket.x, 300, basket.x + w, basket.y - 40, F.ink, 4);
    game.draw.rect(basket.x - 80 + w, basket.y - 40, 160, 80, F.basket);
    for (var k = 0; k < 4; k++) game.draw.rect(basket.x - 80 + w, basket.y - 30 + k * 20, 160, 6, F.nut, 0.5);
    game.draw.circle(basket.x + w, basket.y - 40, 16, F.ink, 0.6 + 0.3 * Math.sin(t * 5));
  }

  function drawKid() {
    var t = game.time.elapsed;
    var x = kidX();
    // 最初の壁までだけ道筋を見せる(その先は読む)
    if (!ball && (turn === 'aim' || state === S.ATTRACT)) {
      var tr = trace(x);
      var p0 = tr.pts[0], p1 = tr.pts[1] || tr.pts[0];
      for (var s = 0; s < 10; s++) {
        var k = s / 10;
        game.draw.circle(p0.x + (p1.x - p0.x) * k, p0.y + (p1.y - p0.y) * k, 7, F.ink, 0.35);
      }
    }
    game.draw.sprite(KID[Math.floor(t * 6) % 2], { k: F.ink, f: '#e0a070', o: F.red }, x, KICK_Y + 90 + Math.sin(t * 8) * 3, 14, { anchor: 'center', flipX: dir < 0 });
    if (!ball) game.draw.sprite(NUT, { n: F.nut, h: F.nutHi }, x + dir * 40, KICK_Y, 14, { anchor: 'center' });
    if (ball) game.draw.sprite(NUT, { n: F.nut, h: F.nutHi }, ball.x, ball.y, 14, { anchor: 'center', flipX: Math.floor(ball.spin) % 2 === 0 });
  }

  function drawTray() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, F.ink);
    for (var i = 0; i < SHOTS; i++) {
      var used = i < shot;
      game.draw.circle(160 + i * 190, 1620 + (i === shot ? Math.sin(t * 5) * 8 : 0), 54, used ? F.wallLo : F.bg2);
      if (!used) game.draw.sprite(NUT, { n: F.nut, h: F.nutHi }, 160 + i * 190, 1620 + (i === shot ? Math.sin(t * 5) * 8 : 0), 14, { anchor: 'center' });
    }
    game.draw.rect(160, 1740, (W - 320) * (waitT / WAIT_MAX), 12, F.basket);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, F.white);
    write(made + ' / ' + NEED_IN, W / 2, 110, 70, F.ink);
    write(String(Math.ceil(clock)), 60, 110, 52, F.basket, 'left');
    game.draw.rect(60, 170, W - 120, 18, F.bg2);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, clock / TIME_LIMIT), 18, clock < 4 ? F.red : F.wall);
  }

  function score() { return made * 300 + swish * 150 + (SHOTS - shot) * 100 + Math.ceil(clock) * 10; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (basket && basket.wob > 0) basket.wob -= dt;
    if (state === S.ATTRACT) {
      if (turn === undefined) prep();
      stepDemo(dt);
      drawHall(); drawBasket(); drawKid(); drawTray();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 228, F.white);
      write(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 6, 76, F.wall);
      write('HI-SCORE ' + game.best, W / 2, 190, 36, F.basket);
      if (Math.floor(t * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.97, 40, F.basket);
      else write('INSERT COIN', W / 2, H * 0.97, 34, F.white);
      return;
    }
    if (state === S.RESULT) {
      drawHall(); drawBasket(); drawTray();
      write(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, won ? F.wall : F.red);
      write('SCORE ' + (won ? score() : 0), W / 2, H * 0.48, 44, F.ink);
      if (Math.floor(t * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.97, 38, F.white);
      return;
    }

    if (turn === 'ready') {
      lead -= dt;
      if (lead <= 0) { turn = 'aim'; game.audio.play('se_tap', 0.5); }
    } else if (turn === 'aim') {
      if (pause > 0) pause -= dt;
      else {
        clock -= dt;
        kid.ph += dt * kid.v;
        if (ball) flyBall(dt, false);
        else {
          waitT += dt;
          if (waitT >= WAIT_MAX) { game.audio.tone('E3', 0.1, { wave: 'square', volume: 0.04 }); kick(); }
        }
        if (clock <= 0 && turn === 'aim') { clock = 0; closeGame(false); }
      }
    } else if (turn === 'stop') {
      pause -= dt;
      if (pause <= 0) { turn = 'fin'; endT = 1.4; }
    } else if (turn === 'fin') {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { made: made, shots: shot, swish: swish };
        if (won) game.end.success(score(), stats); else game.end.failure(stats);
        return;
      }
    }

    drawHall(); drawBasket(); drawKid(); drawTray(); drawHud();
    if (flashAt) {
      flashAt.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) game.draw.circle(flashAt.x, flashAt.y, 110, F.white, 0.55);
      if (flashAt.t <= 0 && turn !== 'stop') flashAt = null;
    }
    if (turn === 'ready') write(lead > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, F.basket);
    if (turn === 'fin') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, F.white, 0.94);
      write(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.41, 92, won ? F.wall : F.red);
      if (won && score() > game.best) write('NEW RECORD', W / 2, H * 0.47, 46, F.basket);
      else if (won) write('BEST ' + game.best, W / 2, H * 0.47, 40, F.ink);
      else write('あと' + Math.max(1, NEED_IN - made) + '球!', W / 2, H * 0.47, 48, F.ink);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['C5', 0.5], ['E5', 0.25], ['D5', 0.25], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5],
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.25], ['C5', 0.25], ['D5', 0.5], ['C5', 1]
    ], { tempo: 124, wave: 'sine', volume: 0.055, loop: true, bass: [['C3', 1], ['A2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    prep();
  });
})(game);
