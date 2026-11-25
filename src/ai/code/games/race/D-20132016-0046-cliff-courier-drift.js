// D-20132016-0046-cliff-courier-drift.js
// クリフ便ドリフト — 夜の崖道をカーブに合わせて弾丸配送バンをドリフトさせる
// 操作: 指を左右にドラッグしてバンを操作し、曲がりくねる道の車線からはみ出さないようにする
// 終わり: 規定時間、道から外れず落下物にも当たらず走りきれば成功。道を外れる/落下物に当たると失敗
// @mechanic: guide_path
// @theme: cliffside_night_courier
// 世界観: 締切間際の夜間配送。崖沿いのヘアピン路を弾丸バンで駆け下り、荷物を時間内に届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走破率%とかわした落石数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色+地平グラデ、横1pxストリップで奥ほど圧縮した床
  var C = {
    sky1: '#150a2e', sky2: '#3a1a4a', sky3: '#7a3a5a',
    roadA: '#2a2438', roadB: '#332c44', line: '#ffd94a',
    off: '#120e1e', van: '#ff6a3d', vanGlass: '#bfe8ff',
    good: '#4dffa0', bad: '#ff4d5e', gold: '#ffd400', white: '#f4ecff', ink: '#0a0710',
    rock: '#8a7a6a',
  };

  var GAME_TITLE = 'CLIFF DRIFT';
  var DUR = 19; // 秒(帯域C 15-25s)
  var ROAD_HALF_BASE = 190;
  var HORIZON = H * 0.30;
  var VAN_Y = H * 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var t, vanX, done, endWait, finished, ready, hitStop, shake, dodged, offTimer;
  var hazards;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var VAN_SPRITE = ['.####.', '######', '#.##.#'];

  function roadCenter(prog) {
    // 曲率が時間とともに増していく(プレッシャー: 加速するカーブ)
    var amp1 = 210 + prog * 90;
    var amp2 = 90 + prog * 60;
    return Math.sin(prog * 3.1) * amp1 + Math.sin(prog * 6.6 + 1.4) * amp2 * 0.4;
  }

  function roadWidth(prog) {
    return ROAD_HALF_BASE - prog * 40;
  }

  function bg(prog, elapsed) {
    game.draw.gradient(0, HORIZON, [[0, C.sky1], [0.6, C.sky2], [1, C.sky3]]);
    // 遠景の山シルエット
    for (var i = 0; i < 6; i++) {
      var mx = (i * 220 - (prog * 400) % 220 + W) % (W + 220) - 110;
      game.draw.circle(mx, HORIZON, 90 + (i % 3) * 20, '#1a0f2e', 0.5);
    }
    // ambient luminance pulse(全画面のうっすらした明滅)
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
    // MODE7疑似床: 横ストリップを奥ほど圧縮して描く
    var strips = 46;
    for (var s = 0; s < strips; s++) {
      var f = s / strips; // 0=手前,1=奥
      var y0 = H - (H - HORIZON) * Math.pow(f, 1.6);
      var y1 = H - (H - HORIZON) * Math.pow((s + 1) / strips, 1.6);
      var rowH = Math.max(2, y0 - y1);
      var depthProg = prog - (1 - f) * 0.10;
      var cx = W * 0.5 + roadCenter(depthProg) * (1 - f * 0.55);
      var half = roadWidth(depthProg) * (1 - f * 0.5) + 40 * f;
      var shade = s % 2 === 0 ? C.roadA : C.roadB;
      game.draw.rect(0, y1, W, rowH + 1, C.off);
      game.draw.rect(cx - half, y1, half * 2, rowH + 1, shade);
      if (s % 3 === 0) {
        game.draw.rect(cx - half * 0.06, y1, half * 0.045, rowH + 1, C.line, 0.85);
      }
    }
  }

  function drawHazard(hz, prog) {
    if (hz.hit || hz.pass) return;
    var f = (hz.prog - prog) / 0.22; // 0=眼前,1=奥
    if (f < -0.05 || f > 1) return;
    var y = H - (H - HORIZON) * Math.pow(Math.max(0, Math.min(1, f)), 1.6);
    var cx = W * 0.5 + roadCenter(hz.prog) * (1 - f * 0.55) + hz.offset * (1 - f * 0.5);
    var r = 34 * (1 - f * 0.55) + 6;
    var warn = hz.prog - prog < 0.13 && hz.prog - prog > -0.02;
    if (warn) {
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (blink) game.draw.circle(cx, y, r + 14, C.bad, 0.35);
    }
    game.draw.circle(cx, y, r, C.rock);
    game.draw.circle(cx - r * 0.3, y - r * 0.3, r * 0.35, '#5a4c40');
    hz._cx = cx; hz._y = y; hz._r = r;
  }

  function initGame() {
    t = 0; vanX = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; dodged = 0; offTimer = 0;
    hazards = [];
    for (var i = 0; i < 5; i++) {
      var p = 0.16 + i * 0.16 + game.random(-0.02, 0.02);
      hazards.push({ prog: p, offset: game.random(-140, 140), hit: false, pass: false });
    }
  }

  function progress() { return Math.min(1, t / DUR); }

  game.onPress(function(x, y) { if (state === S.PLAYING && !finished) { vanX = x - W * 0.5; game.audio.play('se_tap', 0.05); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && !finished) vanX = x - W * 0.5; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function crash(x, y) {
    ok = false; finished = true; hitStop = 0.4; shake = 0.35;
    game.feedback.bad(x, y, { text: 'CRASH' });
    finish();
  }

  function stepPlay(dt) {
    var prog = progress();
    var half = roadWidth(prog);
    var center = roadCenter(prog);
    var localX = vanX - center;
    if (Math.abs(localX) > half) {
      offTimer += dt;
      if (offTimer > 0.35) { crash(W * 0.5 + vanX, VAN_Y); return; }
    } else {
      offTimer = Math.max(0, offTimer - dt * 2);
    }
    for (var i = 0; i < hazards.length; i++) {
      var hz = hazards[i];
      if (hz.hit || hz.pass) continue;
      if (prog >= hz.prog) {
        var hzX = center + hz.offset;
        if (Math.abs(vanX - hzX) < 66) {
          hz.hit = true;
          crash(W * 0.5 + vanX, VAN_Y);
          return;
        } else {
          hz.pass = true; dodged++;
          game.feedback.good(W * 0.5 + vanX, VAN_Y - 90, { text: 'NICE', color: C.good, sound: 'se_jump', volume: 0.3 });
        }
      }
    }
    if (prog >= 0.5 && !hazards._halfDone) { hazards._halfDone = true; game.fx.popup('50', W * 0.5, H * 0.2, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
    if (prog >= 1) { ok = true; finished = true; game.feedback.good(W * 0.5 + vanX, VAN_Y, { text: 'CLEAR' }); finish(); }
  }

  var demo = { t: 0, dx: 0, k: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { demo._reset = true; }
    var p = Math.min(1, cyc / 4.0);
    var center = roadCenter(p);
    var wob = Math.sin(demo.t * 5) * 14;
    demo.dx = center * 0.72 + wob;
    t = p * DUR;
    vanX = demo.dx;
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (t === undefined) initGame();
      stepDemo(dt);
      bg(progress(), el);
      for (var i = 0; i < hazards.length; i++) drawHazard(hazards[i], progress());
      var bob = Math.sin(el * 2.2) * 4;
      game.draw.sprite(VAN_SPRITE, { '#': C.van, '.': null }, W * 0.5 + vanX, VAN_Y + bob, 22, { anchor: 'center' });
      game.draw.hand(W * 0.5 + demo.dx, VAN_Y + 180 + bob, { press: true, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(1, el);
      var bob2 = Math.sin(el * 2.2) * 4;
      game.draw.sprite(VAN_SPRITE, { '#': ok ? C.good : C.bad, '.': null }, W * 0.5, VAN_Y + bob2, 22, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(progress() * 100) + ' / 100', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(progress() * 100);
        if (ok) game.end.success(pct, { pct: pct, dodged: dodged });
        else game.end.failure({ pct: pct, dodged: dodged });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      t += dt;
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg(progress(), el);
    for (var j = 0; j < hazards.length; j++) drawHazard(hazards[j], progress());
    if (!finished || hitStop > 0) {
      var flash = hitStop > 0 && Math.floor(hitStop * 30) % 2 === 0;
      var bob3 = Math.sin(el * 2.6) * 5;
      game.draw.sprite(VAN_SPRITE, { '#': flash ? C.white : C.van, '.': null }, W * 0.5 + vanX, VAN_Y + bob3, flash ? 26 : 22, { anchor: 'center' });
    }

    txt(Math.round(progress() * 100) + ' / 100', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * progress(), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
