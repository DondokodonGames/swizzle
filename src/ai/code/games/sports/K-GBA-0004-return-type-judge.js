// K-GBA-0004-return-type-judge.js
// リターンタイプジャッジ — 飛んでくる物の硬さを見極め、正しい打ち返し方をタイミングよく選ぶ
// 操作: 迫る物が硬い塊か柔らかい塊かを見て、対応するゾーン(左=強打/右=軽打)を接近中にタップ
// 終わり: 8個すべて正しいゾーン・正しいタイミングで打ち返せば成功。誤れば失敗
// @mechanic: judge
// @theme: street_stall_return
// 世界観: 商店街の何でも打ち返し屋台。飛来物の硬さを瞬時に見極め、強打か軽打かを選んで打ち返す腕比べ
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく打ち返せた数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい原色、太いアウトライン、丸ゴシック風の視認性
  var C = {
    bg: '#0a2a3a', bg2: '#052030', hard: '#8a6a3a', hardDark: '#4a3818',
    soft: '#ff9ad0', softDark: '#a3428a', zonePow: '#ff5a3c', zonePuf: '#42c8ff',
    good: '#3dff8a', bad: '#ff3d5a', gold: '#ffe600', white: '#f4faff', ink: '#041018',
  };

  var GAME_TITLE = 'RETURN JUDGE';
  var TOTAL = 8;
  var CX = W * 0.5, TY = H * 0.42;
  var ZONE_Y = H * 0.80, ZONE_L_X = W * 0.28, ZONE_R_X = W * 0.72, ZONE_R = 130;
  var WIN_LO = 0.55, WIN_HI = 0.92;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var got, done, endWait, finished, ready, hitStop, shake, round, obj;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STALL = ['####', '#..#', '#..#', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.sprite(STALL, { '#': C.gold }, W * 0.5, H * 0.12, 20, { anchor: 'center' });
    game.draw.rect(ZONE_L_X - ZONE_R, ZONE_Y - 70, ZONE_R * 2, 140, C.zonePow, 0.22);
    game.draw.rect(ZONE_R_X - ZONE_R, ZONE_Y - 70, ZONE_R * 2, 140, C.zonePuf, 0.22);
  }

  function newObj(rnd) {
    var hard = Math.random() < 0.5;
    var dur = Math.max(0.85, 1.30 - rnd * 0.06);
    return { t: 0, dur: dur, hard: hard, resolved: false, telegraphed: false };
  }

  function objPos(o) {
    var p = Math.min(1, o.t / o.dur);
    var y = TY + (ZONE_Y - 140 - TY) * p;
    return { x: CX, y: y, p: p, r: 34 + p * 30 };
  }

  function initGame() {
    got = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0;
    obj = newObj(0);
  }

  function failObj(x, y) {
    hitStop = 0.32;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function successObj(x, y) {
    got++;
    hitStop = 0.1;
    game.feedback.good(x, y, { text: 'NICE', color: C.good });
    game.fx.burst(x, y, { color: C.gold, count: 14, speed: 300 });
    game.audio.play('se_good', 0.4);
    if (got === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, TY - 100, { color: C.gold, size: 40 });
    if (got >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    obj = newObj(round);
  }

  function resolveZone(zone) {
    if (!obj || obj.resolved || ready > 0 || done || finished) return;
    obj.resolved = true;
    var pos = objPos(obj);
    var inWindow = pos.p >= WIN_LO && pos.p <= WIN_HI;
    var correctZone = (obj.hard && zone === 'L') || (!obj.hard && zone === 'R');
    if (inWindow && correctZone) successObj(pos.x, pos.y);
    else failObj(pos.x, pos.y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (Math.hypot(x - ZONE_L_X, y - ZONE_Y) <= ZONE_R) resolveZone('L');
      else if (Math.hypot(x - ZONE_R_X, y - ZONE_Y) <= ZONE_R) resolveZone('R');
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawObj(o) {
    if (!o) return;
    var pos = objPos(o);
    if (pos.p > 0.45) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(pos.x, pos.y, pos.r + 12, o.hard ? C.zonePow : C.zonePuf, 0.35);
    }
    if (o.hard) {
      game.draw.rect(pos.x - pos.r * 0.8, pos.y - pos.r * 0.8, pos.r * 1.6, pos.r * 1.6, C.hardDark);
      game.draw.rect(pos.x - pos.r * 0.55, pos.y - pos.r * 0.55, pos.r * 1.1, pos.r * 1.1, C.hard);
    } else {
      game.draw.circle(pos.x, pos.y, pos.r, C.softDark);
      game.draw.circle(pos.x, pos.y, pos.r * 0.72, C.soft);
    }
    return pos;
  }

  function drawZones() {
    game.draw.circle(ZONE_L_X, ZONE_Y, ZONE_R, C.zonePow, 0.5);
    game.draw.circle(ZONE_R_X, ZONE_Y, ZONE_R, C.zonePuf, 0.5);
    game.draw.rect(ZONE_L_X - 40, ZONE_Y - 40, 80, 80, C.hardDark);
    game.draw.circle(ZONE_R_X, ZONE_Y, 40, C.softDark);
  }

  var demo = { t: 0, gx: ZONE_L_X, gy: ZONE_Y, press: false, o: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.o) { demo.o = newObj(0); demo.o.dur = 1.05; demo.o.hard = Math.random() < 0.5; round = 0; }
    demo.o.t += dt;
    obj = demo.o;
    var pos = objPos(demo.o);
    demo.press = false;
    var tx = demo.o.hard ? ZONE_L_X : ZONE_R_X;
    if (pos.p >= 0.65 && pos.p <= 0.75 && !demo.o.telegraphed) {
      demo.o.telegraphed = true;
      demo.gx = tx; demo.gy = ZONE_Y; demo.press = true;
      game.feedback.good(tx, ZONE_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.25);
    } else if (pos.p < 0.65) {
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 3);
    }
    if (pos.p >= 1) { demo.o = null; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawZones();
      drawObj(obj);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(got + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - got) + '個!', W / 2, H * 0.16, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(got, { got: got, total: TOTAL });
        else game.end.failure({ got: got, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      obj.t += dt;
      var pos = objPos(obj);
      if (pos.p >= 1 && !obj.resolved) { obj.resolved = true; failObj(pos.x, pos.y); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones();
    if (!finished) drawObj(obj);

    txt(got + ' / ' + TOTAL, W / 2, H * 0.30, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (got / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['C5', 0.25], ['E5', 0.25], ['G5', 0.5]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
