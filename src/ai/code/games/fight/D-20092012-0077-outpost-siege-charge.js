// D-20092012-0077-outpost-siege-charge.js
// アウトポスト・シージチャージ — 投石機の腕を溜めて、最適な張力で放って砦の門を打ち破る
// 操作: 画面下のレバーを長押しして力を溜め、緑のゾーンに入ったら指を離して発射する
// 終わり: 規定回数以内に門の耐久を0にすれば成功。溜めすぎて自陣が壊れる/回数切れで失敗
// @mechanic: hold_charge
// @theme: border_outpost_siege_crew
// 世界観: 国境の小さな砦を守る投石機部隊。限られた矢弾で敵砦の門を打ち破りつつ、溜めすぎた暴発から自陣を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 門に与えた損傷%
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 彩度高めの中間色、太めの縁取り
  var STYLE = { bg: ['#2a3a5a', '#1a2440'], main: ['#8a6a4a', '#c49a5a'], accent: ['#ff7a3a', '#5ad1ff'] };
  var C = {
    sky1: '#3a5a8a', sky2: '#1a2440', ground: '#3a2e24', groundDk: '#241c16',
    gate: '#6a5030', gateDk: '#3a2c1a', crew: '#c49a5a', crewDk: '#8a6a4a',
    lever: '#5ad1ff', good: '#3adf7a', bad: '#ff4d5e', warn: '#ff7a3a',
    gold: '#ffd400', white: '#fff6e6', ink: '#160f08',
  };

  var GAME_TITLE = 'OUTPOST SIEGE';
  var MAX_ATTEMPTS = 5;
  var SWEET_MIN = 0.62, SWEET_MAX = 0.92, OVER_MAX = 1.35;
  var CX = W * 0.5;
  var LEVER_X = W * 0.5, LEVER_Y = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREW_IDLE = ['.##.', '####', '.##.', '#..#'];
  var CREW_PULL = ['.##.', '####', '###.', '##..'];

  var gateHP, attempts, charging, chargeT, projectiles, ownHP, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, flyBall;

  function initGame() {
    gateHP = 100; attempts = 0; charging = false; chargeT = 0;
    ownHP = 100; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; flyBall = null;
  }

  function startCharge() {
    if (state !== S.PLAYING || ready > 0 || done || finished || flyBall) return;
    charging = true; chargeT = 0;
    game.audio.play('se_tap', 0.15);
  }

  function releaseCharge() {
    if (state !== S.PLAYING || !charging) return;
    charging = false;
    game.audio.play('se_powerup', 0.3);
    game.fx.burst(LEVER_X, LEVER_Y, { color: C.gold, count: 8, speed: 220 });
    resolveShot(chargeT);
  }

  function resolveShot(dur) {
    attempts++;
    var dmg, backfire = false, grade;
    if (dur >= SWEET_MIN && dur <= SWEET_MAX) {
      dmg = 32; grade = 'PERFECT';
    } else if (dur >= SWEET_MIN - 0.22 && dur <= SWEET_MAX + 0.22) {
      dmg = 16; grade = 'GOOD';
    } else if (dur > OVER_MAX) {
      dmg = 0; backfire = true; grade = 'MISS';
    } else {
      dmg = 6; grade = 'MISS';
    }
    flyBall = { t: 0, dur: 0.45, backfire: backfire, dmg: dmg, grade: grade };
  }

  function landShot() {
    var f = flyBall;
    if (f.backfire) {
      ownHP -= 25;
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, H * 0.86, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    } else {
      gateHP = Math.max(0, gateHP - f.dmg);
      hitStop = f.grade === 'PERFECT' ? 0.15 : 0.1;
      if (f.grade === 'PERFECT') {
        game.feedback.good(CX, H * 0.32, { text: 'PERFECT', color: C.gold });
        game.fx.burst(CX, H * 0.32, { color: C.gold, count: 18, speed: 360 });
        game.audio.play('se_break', 0.5);
      } else if (f.grade === 'GOOD') {
        game.feedback.good(CX, H * 0.32, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.4);
      } else {
        game.feedback.bad(CX, H * 0.32, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
      }
      if (!milestoneShown && gateHP <= 50) {
        milestoneShown = true;
        game.fx.popup('50%', CX, H * 0.32 - 120, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    flyBall = null;
    if (ownHP <= 0) { ok = false; finished = true; finish(); return; }
    if (gateHP <= 0) { ok = true; finished = true; finish(); return; }
    if (attempts >= MAX_ATTEMPTS) { ok = false; finished = true; finish(); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING && Math.hypot(x - LEVER_X, y - LEVER_Y) < 140) {
      game.audio.play('se_tap', 0.1);
      startCharge();
    }
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING && charging) {
      game.audio.play('se_powerup', 0.1);
      releaseCharge();
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg(elapsed) {
    game.draw.gradient(0, H * 0.6, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(elapsed * 1.2));
    game.draw.rect(0, H * 0.6, W, H * 0.42, C.ground);
    for (var i = 0; i < 6; i++) game.draw.rect(i * (W / 6), H * 0.6, W / 6 - 6, 10, C.groundDk, 0.6);
  }

  function drawGate(bob) {
    var gx = CX, gy = H * 0.32;
    var shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 40 : 0;
    game.draw.rect(gx - 140 + shakeX, gy - 140, 280, 280, C.gateDk);
    game.draw.rect(gx - 120 + shakeX, gy - 120, 240, 240 * (gateHP / 100), C.gate);
    for (var i = 0; i < 4; i++) game.draw.rect(gx - 120 + shakeX, gy - 120 + i * 60, 240, 6, C.gateDk, 0.5);
    game.draw.rect(gx - 130 + shakeX, gy + 150, 260, 18, C.ink, 0.4);
    game.draw.rect(gx - 130 + shakeX, gy + 150, 260 * (gateHP / 100), 18, C.bad);
  }

  function drawCrew(elapsed, chargeP) {
    var frame = charging ? CREW_PULL : CREW_IDLE;
    var by = H * 0.78 + Math.sin(elapsed * 2.4) * 6;
    game.draw.sprite(frame, { '#': charging ? C.crewDk : C.crew }, LEVER_X, by, 22, { anchor: 'center' });
    game.draw.circle(LEVER_X, LEVER_Y + 20, 130, C.ink, 0.35);
    game.draw.rect(LEVER_X - 120, LEVER_Y + 60, 240, 22, C.ink, 0.5);
    var sweetX0 = LEVER_X - 120 + 240 * (SWEET_MIN / OVER_MAX);
    var sweetW = 240 * ((SWEET_MAX - SWEET_MIN) / OVER_MAX);
    game.draw.rect(sweetX0, LEVER_Y + 60, sweetW, 22, C.good, 0.7);
    var overX0 = LEVER_X - 120 + 240 * (OVER_MAX / OVER_MAX) - 14;
    var warnBlink = Math.floor(elapsed * 10) % 2 === 0;
    if (warnBlink) game.draw.rect(overX0, LEVER_Y + 60, 14, 22, C.warn, 0.8);
    var fillP = Math.min(1, chargeP / OVER_MAX);
    game.draw.rect(LEVER_X - 120, LEVER_Y + 60, 240 * fillP, 22, fillP > SWEET_MAX / OVER_MAX ? C.warn : C.lever);
  }

  function drawFly() {
    if (!flyBall) return;
    var p = Math.min(1, flyBall.t / flyBall.dur);
    if (flyBall.backfire) {
      var bx = LEVER_X + Math.sin(p * 8) * 40, by = LEVER_Y - p * 60;
      game.draw.circle(bx, by, 18, C.warn);
    } else {
      var x = LEVER_X + (CX - LEVER_X) * p;
      var y = LEVER_Y - p * (H * 0.46) - Math.sin(p * Math.PI) * 120;
      game.draw.circle(x, y, 16, C.gold);
    }
  }

  var demo = { t: 0, gx: LEVER_X, gy: LEVER_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { gateHP = 100; ownHP = 100; attempts = 0; flyBall = null; }
    demo.gx = LEVER_X; demo.gy = LEVER_Y;
    if (cyc < 1.9) {
      charging = true; chargeT = cyc; demo.press = true;
    } else if (cyc < 2.35) {
      if (charging) { charging = false; resolveShot(1.75); }
      demo.press = false;
    } else if (flyBall) {
      flyBall.t += dt;
      if (flyBall.t >= flyBall.dur) landShot();
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(elapsed);
      stepDemo(dt);
      drawGate(elapsed);
      drawCrew(elapsed, charging ? chargeT : 0);
      drawFly();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(elapsed);
      drawGate(elapsed);
      drawCrew(elapsed, 0);
      var dmgPct = 100 - gateHP;
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(dmgPct + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + gateHP + '!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var dmgPctF = 100 - gateHP;
        if (ok) game.end.success(dmgPctF, { damage: dmgPctF, attempts: attempts }); else game.end.failure({ damage: dmgPctF, attempts: attempts });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (flyBall) {
        flyBall.t += dt;
        if (flyBall.t >= flyBall.dur) landShot();
      } else if (charging) {
        chargeT += dt;
        if (chargeT >= OVER_MAX + 0.35) { charging = false; resolveShot(chargeT); }
      }
    }
    if (shake > 0) shake -= dt;

    bg(elapsed);
    drawGate(elapsed);
    drawCrew(elapsed, charging ? chargeT : 0);
    drawFly();

    txt((100 - gateHP) + ' / 100', W / 2, H * 0.06, 30, C.white);
    txt(attempts + ' / ' + MAX_ATTEMPTS, W * 0.85, H * 0.06, 24, C.gold);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (ownHP / 100), 16, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 126, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
