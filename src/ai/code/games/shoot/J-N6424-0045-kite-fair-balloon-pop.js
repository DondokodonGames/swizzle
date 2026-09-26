// J-N6424-0045-kite-fair-balloon-pop.js
// カイトフェア・バルーンポップ — 風に流れるいたずらカラスの風船を吹き矢で狙い撃ち、自分のゴンドラの風船は最後まで守り切る
// 操作: 狙いたい場所をタップすると下のゴンドラから吹き矢が飛ぶ(飛ぶ間に風船が動くので先を狙う)。赤く光ったカラスが投げる針も撃ち落とせる
// 終わり: カラスの風船を10個割れば成功。自分の風船3個を全部割られる、または15秒の時間切れで失敗
// @mechanic: aim_shoot
// @theme: kite_fair_balloon_duel
// 世界観: 丘の凧まつりの空で、カエルの気球乗りが、風船にぶら下がって荒らしに来たカラスの一団を吹き矢で追い払い、自分のゴンドラを吊る3つの風船を守り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った風船の数・撃ち落とした針・命中率
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色 + 白縁、明るい背景、光の柱と祝祭演出
  var STYLE = { bg: ['#5ec8ff', '#b9ecff', '#fff6c9'], main: ['#ff3d6e', '#2ec27e', '#ffffff'], accent: ['#ffd400', '#7a2cff'] };

  var TITLE = 'BALLOON RAID';
  var TIME_LIMIT = 15;
  var NEEDED = 10;
  var GUN_X = W / 2, GUN_Y = H * 0.75;
  var SHOT_SPEED = 2400;
  var OWN_Y = H * 0.6;
  var OWN_XS = [W * 0.34, W * 0.5, W * 0.66];
  var OWN_COLS = ['#ff3d6e', '#2ec27e', '#3d7dff'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CROW_A = ['..kkk...', '.kkwkk..', 'kkkkkyy.', '.kkkkk..', 'kk.kk.kk', 'k..kk..k', '...y.y..'];
  var CROW_B = ['..kkk...', '.kkwkk..', 'kkkkkyy.', 'kkkkkkkk', '..kkkk..', '...kk...', '...y.y..'];
  var CROW_PAL = { k: '#26203a', w: '#ffffff', y: '#ffb000' };
  var FROG_A = ['.gg..gg.', 'gwkggwkg', 'gggggggg', 'gppppppg', '.gggggg.', 'gg.gg.gg'];
  var FROG_B = ['.gg..gg.', 'gkwggkwg', 'gggggggg', 'gpppppgg', '.gggggg.', '.gg..gg.'];
  var FROG_PAL = { g: '#2ec27e', w: '#ffffff', k: '#1a1a1a', p: '#ff9cb8' };
  var BASKET = ['bbbbbbbbbb', 'bBbBbBbBbB', 'bbbbbbbbbb', '.bBbBbBbB.', '..bbbbbb..'];
  var KITE = ['...r...', '..rry..', '.rrryy.', 'rrrryyy', '.bbbyy.', '..bby..', '...b...'];

  var R = null;
  var demo = { t: 0, gx: W / 2, gy: H * 0.4, press: false, pressT: 0, shots: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x - 3, y, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(s, x + 3, y, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(s, x, y + 3, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function newRaid(isDemo) {
    return {
      demo: isDemo, rivals: [], shots: [], darts: [], pops: [], own: [true, true, true],
      popped: 0, fired: 0, hits: 0, blocked: 0, spawnT: 0.2, throwT: 2.0, cool: 0,
      hitStop: 0, hitWhat: null, over: false, win: false, endWait: -1,
      ready: isDemo ? 0 : 0.8, timeLeft: TIME_LIMIT, milestone: false, score: 0, n: 0
    };
  }

  function spawnRival() {
    var fromLeft = game.random(0, 1) < 0.5;
    R.n++;
    R.rivals.push({
      x: fromLeft ? -80 : W + 80, y: game.random(H * 0.2, H * 0.44), baseY: 0,
      vx: (fromLeft ? 1 : -1) * game.random(170, 250 + R.n * 8), ph: game.random(0, 6),
      gold: R.n % 6 === 5, windup: 0, target: -1, dead: false
    });
    R.rivals[R.rivals.length - 1].baseY = R.rivals[R.rivals.length - 1].y;
  }

  function fire(tx, ty) {
    if (R.cool > 0) { game.audio.play('se_tap', 0.08); return; }
    var dx = tx - GUN_X, dy = ty - GUN_Y;
    var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    R.shots.push({ x: GUN_X, y: GUN_Y - 40, vx: dx / len * SHOT_SPEED, vy: dy / len * SHOT_SPEED, life: 0.7 });
    R.fired++;
    R.cool = 0.16;
    game.audio.play('se_jump', 0.2);
    game.fx.burst(GUN_X, GUN_Y - 40, { color: '#ffffff', count: 3, speed: 120 });
  }

  function popRival(rv) {
    rv.dead = true;
    R.hits++;
    var gain = rv.gold ? 2 : 1;
    R.popped += gain;
    R.pops.push({ x: rv.x, y: rv.y + 90, vy: -200, t: 0 });
    game.audio.play('se_break', 0.3);
    if (!R.demo) {
      game.feedback.good(rv.x, rv.y - 60, { text: rv.gold ? 'x2' : 'GOOD', color: rv.gold ? STYLE.accent[0] : STYLE.main[1] });
      if (!R.milestone && R.popped >= NEEDED / 2) { R.milestone = true; game.fx.popup(R.popped + ' / ' + NEEDED, W / 2, H * 0.52, { color: STYLE.accent[1], size: 60 }); game.audio.play('se_milestone', 0.4); }
      if (R.popped >= NEEDED) { R.over = true; R.win = true; R.hitStop = 0.5; R.hitWhat = { x: rv.x, y: rv.y }; game.fx.burst(rv.x, rv.y, { color: STYLE.accent[0], count: 36, speed: 560 }); }
    } else {
      game.audio.tone('E6', 0.06, { wave: 'square', volume: 0.05 });
    }
  }

  function aliveOwn() {
    var list = [];
    for (var i = 0; i < 3; i++) if (R.own[i]) list.push(i);
    return list;
  }

  function step(dt) {
    var i, j;
    for (i = R.pops.length - 1; i >= 0; i--) { var p = R.pops[i]; p.t += dt; p.vy += 1400 * dt; p.y += p.vy * dt; if (p.y > H) R.pops.splice(i, 1); }
    if (R.hitStop > 0) {
      R.hitStop -= dt;
      if (R.hitStop <= 0) { R.hitWhat = null; if (R.over) R.endWait = 0.6; }
      return;
    }
    if (R.over) return;
    if (R.cool > 0) R.cool -= dt;
    R.spawnT -= dt;
    var live = 0;
    for (i = 0; i < R.rivals.length; i++) if (!R.rivals[i].dead) live++;
    if (R.spawnT <= 0 && live < 3) { spawnRival(); R.spawnT = game.random(0.5, 0.9); }
    for (i = R.rivals.length - 1; i >= 0; i--) {
      var rv = R.rivals[i];
      if (rv.dead) { R.rivals.splice(i, 1); continue; }
      if (rv.windup > 0) {
        rv.windup -= dt;
        rv.x += rv.vx * dt * 0.2;
        if (rv.windup <= 0 && R.own[rv.target]) {
          var tx = OWN_XS[rv.target], ty = OWN_Y - 140;
          var d = Math.sqrt((tx - rv.x) * (tx - rv.x) + (ty - rv.y) * (ty - rv.y));
          R.darts.push({ x: rv.x, y: rv.y + 60, vx: (tx - rv.x) / d * 620, vy: (ty - rv.y - 60) / d * 620, target: rv.target });
          game.audio.tone('B3', 0.06, { wave: 'sawtooth', volume: 0.05 });
        }
      } else {
        rv.x += rv.vx * dt;
      }
      rv.ph += dt * 3;
      rv.y = rv.baseY + Math.sin(rv.ph) * 36;
      if (rv.x < -140 || rv.x > W + 140) R.rivals.splice(i, 1);
    }
    // crow throw: telegraph 0.7s (red flash + aim line) before the dart leaves
    R.throwT -= dt;
    if (R.throwT <= 0) {
      R.throwT = game.random(1.8, 2.6);
      var own = aliveOwn();
      var cands = [];
      for (i = 0; i < R.rivals.length; i++) if (R.rivals[i].windup <= 0 && R.rivals[i].x > 80 && R.rivals[i].x < W - 80) cands.push(R.rivals[i]);
      if (cands.length && own.length) {
        var c = cands[Math.floor(game.random(0, cands.length))];
        c.windup = 0.7; c.target = own[Math.floor(game.random(0, own.length))];
        game.audio.tone('F4', 0.1, { wave: 'square', volume: 0.05 });
      }
    }
    // shots
    for (i = R.shots.length - 1; i >= 0; i--) {
      var s = R.shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      var hit = false;
      for (j = 0; j < R.rivals.length && !hit; j++) {
        var r2 = R.rivals[j];
        if (!r2.dead && game.hit.circle(s.x, s.y, 14, r2.x, r2.y, 62)) { popRival(r2); hit = true; }
      }
      for (j = R.darts.length - 1; j >= 0 && !hit; j--) {
        var dt2 = R.darts[j];
        if (game.hit.circle(s.x, s.y, 14, dt2.x, dt2.y, 40)) {
          R.darts.splice(j, 1); hit = true; R.blocked++; R.hits++;
          if (!R.demo) game.feedback.good(dt2.x, dt2.y, { text: 'NICE', color: STYLE.accent[0], size: 44 });
        }
      }
      if (hit || s.life <= 0 || s.y < -40 || s.x < -40 || s.x > W + 40) R.shots.splice(i, 1);
    }
    // darts
    for (i = R.darts.length - 1; i >= 0; i--) {
      var dd = R.darts[i];
      dd.x += dd.vx * dt; dd.y += dd.vy * dt;
      var ox = OWN_XS[dd.target], oy = OWN_Y - 140;
      if (R.own[dd.target] && game.hit.circle(dd.x, dd.y, 10, ox, oy, 60)) {
        R.darts.splice(i, 1);
        R.hitStop = 0.4; R.hitWhat = { x: ox, y: oy };
        if (!R.demo) {
          R.own[dd.target] = false;
          game.feedback.bad(ox, oy, { text: 'MISS' });
          game.audio.play('se_break', 0.3);
          if (!aliveOwn().length) { R.over = true; R.win = false; R.hitStop = 0.6; }
        } else {
          R.own[dd.target] = false;
          game.audio.tone('C3', 0.15, { wave: 'sawtooth', volume: 0.05 });
        }
      } else if (dd.y > H) R.darts.splice(i, 1);
    }
  }

  function demoAim(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { R = newRaid(true); demo.shots = 0; }
    if (demo.pressT > 0) { demo.pressT -= dt; if (demo.pressT <= 0) demo.press = false; }
    if (R.hitStop > 0 || R.cool > 0 || demo.pressT > 0.05) return;
    var lazy = cyc > 3.2 && cyc < 4.6;
    var best = null;
    for (var i = 0; i < R.rivals.length; i++) {
      var rv = R.rivals[i];
      if (rv.x > 120 && rv.x < W - 120 && (!best || rv.windup > best.windup)) best = rv;
    }
    if (best && !lazy && demo.t % 0.55 < dt) {
      var travel = Math.sqrt((best.x - GUN_X) * (best.x - GUN_X) + (best.y - GUN_Y) * (best.y - GUN_Y)) / SHOT_SPEED;
      var lead = best.windup > 0 ? best.vx * 0.2 : best.vx;
      var ax = best.x + lead * travel, ay = best.y + Math.cos(best.ph) * 36 * 3 * travel;
      demo.gx = ax; demo.gy = ay; demo.press = true; demo.pressT = 0.2;
      fire(ax, ay);
    }
  }

  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [0.8, STYLE.bg[2]], [1, '#9be07a']]);
    // light pillars
    for (var p = 0; p < 4; p++) game.draw.rect(p * 300 + 40 + Math.sin(t * 0.7 + p) * 30, 0, 90, H * 0.8, '#ffffff', 0.08);
    for (var k = 0; k < 4; k++) {
      var kx = (k * 290 + t * (20 + k * 6)) % (W + 200) - 100;
      game.draw.sprite(KITE, { r: k % 2 ? STYLE.main[0] : STYLE.accent[1], y: STYLE.accent[0], b: '#3d7dff' }, kx, H * 0.12 + k * 40 + Math.sin(t * 2 + k) * 14, 8, { anchor: 'center' });
    }
    // hills
    for (var h = 0; h < 5; h++) game.draw.circle(h * 260 + 40, H * 0.86, 260, h % 2 ? '#7ccf5c' : '#8fdc6a');
    game.draw.rect(0, H * 0.86, W, H * 0.14, '#7ccf5c');
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(t * 1.8));
  }

  function drawBalloon(x, y, col, r, hi) {
    if (hi) game.draw.circle(x, y, r + 34, '#ffffff', 0.7);
    game.draw.circle(x, y, r + 6, '#ffffff');
    game.draw.circle(x, y, r, col);
    game.draw.circle(x - r * 0.35, y - r * 0.35, r * 0.22, '#ffffff', 0.7);
    game.draw.line(x, y + r, x, y + r + 60, '#ffffff', 3);
  }

  function drawPlay() {
    var t = game.time.elapsed;
    var i;
    for (i = 0; i < R.rivals.length; i++) {
      var rv = R.rivals[i];
      var warn = rv.windup > 0;
      if (warn) {
        var ox = OWN_XS[rv.target], oy = OWN_Y - 140;
        for (var s = 0; s < 8; s++) {
          var u = s / 8, u2 = (s + 0.5) / 8;
          game.draw.line(rv.x + (ox - rv.x) * u, rv.y + (oy - rv.y) * u, rv.x + (ox - rv.x) * u2, rv.y + (oy - rv.y) * u2, STYLE.main[0], 5);
        }
      }
      drawBalloon(rv.x, rv.y, rv.gold ? STYLE.accent[0] : STYLE.accent[1], 56, false);
      var crowCol = warn && Math.floor(t * 12) % 2 ? { k: '#ff2d2d', w: '#ffffff', y: '#ffb000' } : CROW_PAL;
      game.draw.sprite(Math.floor(t * 6 + i) % 2 ? CROW_A : CROW_B, crowCol, rv.x, rv.y + 130, 12, { anchor: 'center', flipX: rv.vx < 0 });
    }
    for (i = 0; i < R.pops.length; i++) game.draw.sprite(CROW_B, CROW_PAL, R.pops[i].x, R.pops[i].y, 10, { anchor: 'center', flipY: true });
    for (i = 0; i < R.darts.length; i++) {
      var d = R.darts[i];
      game.draw.line(d.x, d.y, d.x - d.vx * 0.05, d.y - d.vy * 0.05, '#ff2d2d', 8);
      game.draw.circle(d.x, d.y, 10, '#ffffff');
    }
    for (i = 0; i < R.shots.length; i++) {
      var sh = R.shots[i];
      game.draw.line(sh.x, sh.y, sh.x - sh.vx * 0.03, sh.y - sh.vy * 0.03, '#ffffff', 10);
      game.draw.circle(sh.x, sh.y, 9, STYLE.accent[0]);
    }
    // own gondola
    for (var o = 0; o < 3; o++) {
      if (!R.own[o]) continue;
      var hi = R.hitWhat && Math.abs(R.hitWhat.x - OWN_XS[o]) < 2;
      drawBalloon(OWN_XS[o], OWN_Y - 140 + Math.sin(t * 2 + o) * 8, OWN_COLS[o], 52, hi);
      game.draw.line(OWN_XS[o], OWN_Y - 30, GUN_X, GUN_Y - 60, '#ffffff', 3);
    }
    if (R.hitWhat && R.hitStop > 0) game.draw.circle(R.hitWhat.x, R.hitWhat.y, 90, '#ffffff', 0.6);
    game.draw.sprite(BASKET, { b: '#b5651d', B: '#8a4a12' }, GUN_X, GUN_Y + 30, 18, { anchor: 'center' });
    game.draw.sprite(Math.floor(t * 3) % 2 ? FROG_A : FROG_B, FROG_PAL, GUN_X, GUN_Y - 40 + Math.sin(t * 4) * 4, 13, { anchor: 'center' });
  }

  function drawHud() {
    txt(R.popped + ' / ' + NEEDED, W / 2, 100, 64, STYLE.accent[1]);
    for (var i = 0; i < NEEDED; i++) game.draw.circle(W / 2 - (NEEDED - 1) * 32 + i * 64, 160, 20, i < R.popped ? STYLE.accent[1] : '#ffffff');
    for (var o = 0; o < 3; o++) game.draw.circle(70 + o * 56, 70, 20, R.own[o] ? OWN_COLS[o] : '#c9d6df');
    var frac = Math.max(0, R.timeLeft / TIME_LIMIT);
    game.draw.rect(60, 205, W - 120, 16, '#ffffff');
    game.draw.rect(60, 205, (W - 120) * frac, 16, R.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? STYLE.main[0] : STYLE.accent[0]);
    // aim pad hint area in the thumb zone
    game.draw.rect(W * 0.1, H * 0.9, W * 0.8, 10, '#ffffff', 0.6);
  }

  function initGame() {
    R = newRaid(false);
  }

  function wrap() {
    state = S.RESULT;
    game.audio.stopBgm();
    var acc = R.fired ? Math.round(R.hits / R.fired * 100) : 0;
    R.acc = acc;
    var stats = { popped: R.popped, blocked: R.blocked, accuracy: acc, balloonsLeft: aliveOwn().length };
    if (R.win) {
      R.score = R.popped * 100 + R.blocked * 80 + aliveOwn().length * 150 + acc * 3 + Math.round(R.timeLeft * 20);
      game.audio.play('se_success', 0.5);
      game.end.success(R.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['C5', 0.5], ['G5', 0.5], ['E5', 0.5], ['G5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1]], { tempo: 168, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 1], ['E3', 1], ['F3', 1], ['G3', 1]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (R.ready > 0 || R.over || R.hitStop > 0) { game.audio.play('se_tap', 0.08); return; }
    fire(x, Math.min(y, GUN_Y - 80));
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!R || !R.demo) R = newRaid(true);
      demoAim(dt);
      step(dt);
      drawSky();
      drawPlay();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      txt(TITLE, W / 2 + Math.sin(t * 1.5) * 6, H * 0.075, 84, STYLE.main[0]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 36, STYLE.accent[1]);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, STYLE.main[0]);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, STYLE.accent[1]);
      return;
    }
    if (state === S.RESULT) {
      drawSky();
      drawPlay();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.45);
      if (R.win) {
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: Math.random() < 0.5 ? STYLE.accent[0] : STYLE.main[0], count: 5, speed: 300 });
        txt('CLEAR', W / 2, H * 0.28, 120, STYLE.main[0]);
      } else {
        txt(aliveOwn().length ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.28, 100, STYLE.accent[1]);
        txt('あと' + (NEEDED - R.popped) + '個!', W / 2, H * 0.35, 60, STYLE.main[0]);
      }
      txt(R.popped + ' / ' + NEEDED, W / 2, H * 0.43, 64, STYLE.accent[1]);
      txt((R.acc || 0) + '%  x' + R.blocked, W / 2, H * 0.48, 44, '#3d7dff');
      txt('SCORE ' + R.score, W / 2, H * 0.53, 48, STYLE.accent[1]);
      if (R.win && R.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.58, 52, STYLE.main[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 40, '#3d7dff');
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, STYLE.accent[1]);
      return;
    }
    // PLAYING
    if (R.ready > 0) {
      R.ready -= dt;
      if (R.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!R.over) {
        R.timeLeft -= dt;
        if (R.timeLeft <= 0) {
          R.timeLeft = 0; R.over = true; R.win = false; R.hitStop = 0.45;
          game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
        }
      }
      step(dt);
      if (R.over && R.endWait > 0) {
        R.endWait -= dt;
        if (R.endWait <= 0) { wrap(); return; }
      }
    }
    drawSky();
    drawPlay();
    drawHud();
    if (R.ready > 0) txt(R.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, STYLE.main[0]);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1]], { tempo: 120, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    R = newRaid(true);
    demo.t = 0;
  });
})(game);
