// J-N6434-0020-frost-span-courier.js
// フロストスパン・クーリエ — 横風に煽られる凍った吊り橋を、左右タップで重心を戻しながら渡り切る
// 操作: 画面の左半分/右半分をタップすると、その側へ重心を寄せる(横風の反対側を叩いて傾きを戻す)
// 終わり: 橋の向こう岸(90m)まで歩き切れば成功。傾きが限界を超えて落ちる/時間切れで失敗
// @mechanic: balance
// @theme: frozen_rope_bridge_courier
// 世界観: 氷河の谷に架かる凍った吊り橋を、薬箱を背負った山小屋の配達人が、予告される横風と氷の張った板に耐えて向こう岸の診療所まで渡り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った距離(m)と横風を完璧にいなした回数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きは板のスケールで表し、接地影で位置を示す
  var STYLE = { bg: ['#1b2f5c', '#5f86c4', '#d6e8f7'], main: ['#8a6a4a', '#5a4230'], accent: ['#ff5a3c', '#ffd54a'] };
  var C = {
    sky0: '#1b2f5c', sky1: '#5f86c4', sky2: '#d6e8f7', plank: '#8a6a4a', plankDark: '#5a4230',
    ice: '#bfe6ff', rope: '#e8dccb', red: '#ff5a3c', gold: '#ffd54a', ink: '#0f1a33', white: '#ffffff', green: '#4fe08a',
  };

  var GAME_TITLE = 'FROST SPAN';
  var TIME_LIMIT = 20;
  var DIST = 90;
  var HORIZON = H * 0.30;
  var NEAR_Y = H * 0.80;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var COURIER = [
    ['...hh...', '..hhhh..', '..hhhh..', '.bbbbbb.', 'bbppppbb', 'bbpggpbb', 'bbppppbb', '.bbbbbb.', '..ll.ll.', '..ll.ll.', '..kk.kk.'],
    ['...hh...', '..hhhh..', '..hhhh..', '.bbbbbb.', 'bbppppbb', 'bbpggpbb', 'bbppppbb', '.bbbbbb.', '..ll..l.', '..ll..l.', '..kk..k.'],
  ];
  var COURIER_PAL = { h: '#e9e2d4', b: '#2d5aa0', p: '#c43d2c', g: '#ffffff', l: '#3b3b4f', k: '#1b1b24' };
  var SOCK = ['rr....', 'rrww..', 'rrwwrr', 'rrww..', 'rr....'];
  var SOCK_PAL = { r: C.red, w: C.white };
  var ARROW_L = ['...aa', '..aaa', '.aaaa', 'aaaaa', '.aaaa', '..aaa', '...aa'];
  var ARROW_PAL = { a: C.white };
  var HUT = ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.wwwwww.', '.wwddww.', '.wwddww.'];
  var HUT_PAL = { r: '#b0402c', w: '#efe6d8', d: '#4a3020' };

  var walked, lean, spin, timeLeft, ready, hitStop, endWait, done, ok;
  var gust, nextGust, gustPeak, perfects, gusts, iceSpots, walkAnim, snow, milestoneShown, fallT;

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function initGame() {
    walked = 0; lean = 0; spin = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; endWait = 0;
    done = false; ok = false; gust = null; nextGust = 1.6; gustPeak = 0; perfects = 0; gusts = 0;
    walkAnim = 0; milestoneShown = false; fallT = 0;
    iceSpots = [];
    for (var m = 18; m < DIST - 6; m += 14 + Math.floor(game.random(0, 8))) iceSpots.push({ at: m, len: 4 });
    snow = [];
    for (var i = 0; i < 40; i++) snow.push({ x: game.random(0, W), y: game.random(0, H * 0.8), s: game.random(2, 6) });
  }

  function onIce() {
    for (var i = 0; i < iceSpots.length; i++) {
      if (walked >= iceSpots[i].at && walked <= iceSpots[i].at + iceSpots[i].len) return true;
    }
    return false;
  }

  function depthY(d) { return HORIZON + (NEAR_Y - HORIZON) * (6 / (6 + d)); }
  function depthScale(d) { return 6 / (6 + d); }
  function sway(d) { return Math.sin(game.time.elapsed * 1.3 + d * 0.12) * 18 * (1 - depthScale(d)) + (gust && gust.on ? gust.dir * 30 * (1 - depthScale(d)) : 0); }

  function pushLean(dir) {
    spin += dir * 0.95;
  }

  // 1ステップの世界更新(PLAYING とデモの両方で使う)
  function stepWorld(dt) {
    nextGust -= dt;
    if (!gust && nextGust <= 0.7) {
      gust = { dir: Math.random() < 0.5 ? -1 : 1, warn: 0.7, t: 0, dur: game.random(1.0, 1.5), on: false, peak: 0 };
      game.audio.tone(gust.dir < 0 ? 'A3' : 'C4', 0.18, { wave: 'triangle', volume: 0.05, slide: 1.4 });
    }
    var force = 0;
    if (gust) {
      if (!gust.on) {
        gust.warn -= dt;
        if (gust.warn <= 0) { gust.on = true; gusts++; }
      } else {
        gust.t += dt;
        force = gust.dir * (1.25 + walked / DIST * 1.0);
        gust.peak = Math.max(gust.peak, Math.abs(lean));
        if (gust.t >= gust.dur) {
          if (gust.peak < 0.4) {
            perfects++;
            if (state === S.PLAYING) game.feedback.good(W / 2, H * 0.52, { text: 'PERFECT', color: C.gold, size: 50 });
          } else if (state === S.PLAYING) {
            game.fx.popup('NICE', W / 2, H * 0.52, { color: C.white, size: 40 });
            game.audio.play('se_tap', 0.2);
          }
          gust = null;
          nextGust = game.random(1.3, 2.1) - walked / DIST * 0.5;
        }
      }
    }
    var instab = onIce() ? 2.6 : 1.3;
    spin += (lean * instab + force) * dt;
    spin *= Math.pow(0.5, dt);
    lean += spin * dt;
    var v = 7.2 * (1 - 0.5 * Math.min(1, Math.abs(lean)));
    walked = Math.min(DIST, walked + v * dt);
    walkAnim += v * dt;
    for (var i = 0; i < snow.length; i++) {
      var sp = snow[i];
      sp.y += (120 + sp.s * 30) * dt;
      sp.x += ((gust && gust.on) ? gust.dir * 900 : 40) * dt;
      if (sp.y > H * 0.82) sp.y = -10;
      if (sp.x > W + 10) sp.x = -10;
      if (sp.x < -10) sp.x = W + 10;
    }
  }

  function drawScene(flashCourier) {
    var pulse = 0.04 + 0.03 * Math.sin(game.time.elapsed * 1.7);
    game.draw.gradient(0, H, [[0, C.sky0], [0.35, C.sky1], [0.6, C.sky2], [1, '#a9c6e0']]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    // 遠景の雪山(ビルボード: 横ストリップで山型)
    for (var k = 0; k < 60; k++) {
      var yy = HORIZON - 160 + k * 3;
      var half = 60 + k * 9;
      game.draw.rect(W * 0.2 - half, yy, half * 2, 3, k < 14 ? '#f4f8ff' : '#7f9cc7', 0.9);
      game.draw.rect(W * 0.82 - half * 0.8, yy + 40, half * 1.6, 3, k < 12 ? '#f4f8ff' : '#6d8bb9', 0.85);
    }
    // 谷底の霧
    game.draw.gradient(HORIZON, H, [[0, 'rgba(214,232,247,0)'], [1, 'rgba(160,190,220,0.8)']]);
    // 向こう岸の小屋
    var remain = DIST - walked;
    if (remain < 44) {
      var hs = depthScale(remain);
      game.draw.rect(W / 2 - 400 * hs - 200, depthY(remain) - 20 * hs, 800 * hs + 400, 40, '#e7eef7');
      game.draw.sprite(HUT, HUT_PAL, W / 2 + sway(remain), depthY(remain) - 70 * hs, Math.max(2, 22 * hs), { anchor: 'center' });
    }
    // 板(奥から手前へ)
    var off = walked % 2;
    for (var d = Math.min(42, remain); d >= -1; d -= 2) {
      var dd = d - off + 2;
      if (dd < 0 || dd > remain) continue;
      var sc = depthScale(dd);
      var y = depthY(dd);
      var hw = 420 * sc;
      var sx = W / 2 + sway(dd);
      var wAt = walked + dd;
      var iced = false;
      for (var i = 0; i < iceSpots.length; i++) if (wAt >= iceSpots[i].at && wAt <= iceSpots[i].at + iceSpots[i].len) iced = true;
      game.draw.rect(sx - hw, y, hw * 2, Math.max(3, 34 * sc), iced ? C.ice : C.plank);
      game.draw.rect(sx - hw, y + Math.max(2, 26 * sc), hw * 2, Math.max(1, 8 * sc), iced ? '#8cc8f0' : C.plankDark);
      if (iced && Math.floor(game.time.elapsed * 6 + dd) % 3 === 0) game.draw.rect(sx - hw * 0.4, y + 4 * sc, hw * 0.3, Math.max(1, 6 * sc), C.white, 0.8);
    }
    // 手すりロープ
    var farD = Math.min(42, remain);
    game.draw.line(W / 2 + sway(0) - 470, depthY(0) - 170, W / 2 + sway(farD) - 470 * depthScale(farD), depthY(farD) - 170 * depthScale(farD), C.rope, 6);
    game.draw.line(W / 2 + sway(0) + 470, depthY(0) - 170, W / 2 + sway(farD) + 470 * depthScale(farD), depthY(farD) - 170 * depthScale(farD), C.rope, 6);
    // 雪(横風で流れる)
    for (var j = 0; j < snow.length; j++) game.draw.rect(snow[j].x, snow[j].y, snow[j].s, snow[j].s, C.white, 0.8);

    // 風の予告(吹く側の吹き流しが点滅)
    if (gust) {
      var fromX = gust.dir > 0 ? W * 0.08 : W * 0.92;
      var blink = gust.on || Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.sprite(SOCK, SOCK_PAL, fromX, H * 0.40, 14, { anchor: 'center', flipX: gust.dir < 0 });
      if (!gust.on) game.draw.circle(fromX, H * 0.34, 18 + 8 * Math.sin(game.time.elapsed * 20), C.red, 0.8);
    }

    // 配達人 + バランス棒(傾きは棒の角度と体の横ずれで示す)
    var fall = fallT > 0 ? fallT : 0;
    var cx = W / 2 + sway(1) + lean * 90 + (lean > 0 ? 1 : -1) * fall * 400;
    var cy = H * 0.64 + fall * fall * 900;
    var ang = lean * 0.75;
    game.draw.circle(cx, H * 0.715, 60, '#000000', 0.18);
    var bob = Math.abs(Math.sin(walkAnim * 1.6)) * 8;
    var hx = cx, hy = cy - 10 - bob;
    game.draw.line(hx - Math.cos(ang) * 260, hy - Math.sin(ang) * 260, hx + Math.cos(ang) * 260, hy + Math.sin(ang) * 260, '#6b4a2a', 12);
    game.draw.circle(hx - Math.cos(ang) * 260, hy - Math.sin(ang) * 260, 14, C.gold);
    game.draw.circle(hx + Math.cos(ang) * 260, hy + Math.sin(ang) * 260, 14, C.gold);
    var fr = COURIER[Math.floor(walkAnim * 1.6) % 2];
    var pxs = flashCourier ? 14 : 12;
    game.draw.sprite(fr, flashCourier ? { h: '#fff', b: '#fff', p: '#fff', g: '#fff', l: '#fff', k: '#fff' } : COURIER_PAL, cx, cy - bob, pxs, { anchor: 'center' });
  }

  function drawGauge() {
    // 親指ゾーン: 傾きメーター + 左右パッド
    var gy = H * 0.84;
    for (var i = -10; i <= 10; i++) {
      var a = i / 10;
      var col = Math.abs(a) > 0.75 ? C.red : (Math.abs(a) < 0.3 ? C.green : C.gold);
      game.draw.rect(W / 2 + a * 380 - 14, gy - 10, 28, 20, col, 0.85);
    }
    var mx = W / 2 + Math.max(-1, Math.min(1, lean)) * 380;
    game.draw.rect(mx - 8, gy - 34, 16, 68, C.white);
    game.draw.sprite(ARROW_L, ARROW_PAL, W * 0.18, H * 0.92, 14, { anchor: 'center', alpha: 0.9 });
    game.draw.sprite(ARROW_L, ARROW_PAL, W * 0.82, H * 0.92, 14, { anchor: 'center', flipX: true, alpha: 0.9 });
  }

  function drawHud() {
    txt(Math.floor(walked) + 'm / ' + DIST + 'm', W / 2, H * 0.05, 46, C.white);
    game.draw.rect(80, H * 0.08, W - 160, 18, '#0f1a33', 0.5);
    game.draw.rect(80, H * 0.08, (W - 160) * (walked / DIST), 18, C.gold);
    var lowT = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, H * 0.10, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 10, lowT ? C.red : C.white, 0.85);
    txt('★' + perfects, W * 0.88, H * 0.05, 34, C.gold);
  }

  function fail() {
    if (done) return;
    done = true; ok = false; hitStop = 0.5; fallT = 0.001;
    game.feedback.bad(W / 2 + lean * 90, H * 0.6, { text: 'MISS', shake: 18 });
    game.audio.play('se_break', 0.5);
    game.audio.stopBgm();
    endWait = 1.4;
  }

  function win() {
    if (done) return;
    done = true; ok = true; hitStop = 0.4;
    game.feedback.good(W / 2, H * 0.55, { text: 'CLEAR', color: C.gold, size: 70 });
    game.fx.burst(W / 2, H * 0.4, { color: C.gold, count: 40, speed: 600 });
    game.fx.flash('#ffffff', 0.25);
    game.audio.play('se_success', 0.6);
    game.audio.stopBgm();
    endWait = 1.6;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !done && ready <= 0) {
      var dir = x < W / 2 ? -1 : 1;
      pushLean(dir);
      game.audio.tone(dir < 0 ? 'E5' : 'G5', 0.06, { wave: 'square', volume: 0.05 });
      game.fx.burst(dir < 0 ? W * 0.18 : W * 0.82, H * 0.92, { color: C.white, count: 6, speed: 220 });
    }
  });

  // ATTRACT: 実ロジックでAIが渡ってみせる(9秒ごとに最初から)
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.92, press: false, cd: 0, pt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    stepWorld(dt);
    demo.cd -= dt; demo.pt -= dt;
    var predict = lean + spin * 0.35;
    if (demo.cd <= 0 && Math.abs(predict) > 0.2) {
      var dir = predict > 0 ? -1 : 1;
      pushLean(dir);
      demo.cd = 0.24; demo.pt = 0.14;
      demo.gx = dir < 0 ? W * 0.18 : W * 0.82;
    }
    demo.press = demo.pt > 0;
    if (Math.abs(lean) > 0.95 || walked >= DIST) { initGame(); ready = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (walked === undefined) initGame();
      stepDemo(dt);
      drawScene(false);
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.10, 84, C.white);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.16, 36, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.975, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2, 96, ok ? C.gold : C.red);
      txt(Math.floor(walked) + 'm', W / 2, H * 0.28, 64, C.white);
      txt('PERFECT ×' + perfects, W / 2, H * 0.34, 40, C.gold);
      var sc = Math.floor(walked) * 10 + perfects * 50;
      txt('SCORE ' + sc, W / 2, H * 0.40, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.46, 48, C.gold);
      else txt('BEST ' + game.best, W / 2, H * 0.46, 36, C.white);
      if (!ok) txt('あと' + Math.ceil(DIST - walked) + 'm!', W / 2, H * 0.52, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 36, C.white);
      return;
    }

    // PLAYING
    if (done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else {
        if (fallT > 0) fallT += dt;
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var score = Math.floor(walked) * 10 + perfects * 50;
          if (ok) game.end.success(score, { meters: Math.floor(walked), perfects: perfects, gusts: gusts });
          else game.end.failure({ meters: Math.floor(walked), perfects: perfects, gusts: gusts });
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      timeLeft -= dt;
      stepWorld(dt);
      if (!milestoneShown && walked >= DIST / 2) {
        milestoneShown = true;
        game.fx.popup('45m', W / 2, H * 0.45, { color: C.gold, size: 60 });
        game.audio.play('se_milestone', 0.4);
      }
      if (Math.abs(lean) >= 1) fail();
      else if (walked >= DIST) win();
      else if (timeLeft <= 0) {
        timeLeft = 0; fail();
        game.fx.popup('TIME UP', W / 2, H * 0.4, { color: C.red, size: 64 });
      }
    }

    drawScene(done && !ok && hitStop > 0 && Math.floor(game.time.elapsed * 14) % 2 === 0);
    drawGauge();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['B4', 0.5], ['A4', 0.5], ['E4', 0.5], ['G4', 1], ['F#4', 1], ['D4', 0.5], ['E4', 1.5]], { tempo: 112, wave: 'triangle', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
