// I-GBA-0026v3-truckbed-wardrobe-hold.js
// 荷台の箪笥ささえ — 左手で傾く箪笥を反対側から押し返し、右手で滑り出す段ボールを押し戻す
// 操作: 左半分=箪笥の左右どちらかの押し当てパッドを押さえて傾きを戻す(押しすぎると逆へ倒れる)。右半分=滑り出した段ボールをタップして奥へ戻す
// 終わり: 24秒の走行を耐えきれば成功。箪笥が倒れる、または段ボールを3個落とすと失敗
// @mechanic: coop_2zone
// @theme: moving_truck_cargo_hold
// 世界観: 引っ越しトラックの荷台で運送屋の新人が、カーブのたびに傾く箪笥を片手で押さえ、もう片手で後ろへ滑る段ボールを押し戻して目的地まで荷を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し戻した箱の数と落とした数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒輪郭を先に描き、内側は明暗2色だけ
  var STYLE = { bg: ['#7fc7ff', '#ffe7b0', '#5b5f6b'], main: ['#c8874a', '#8f5a2c', '#e0b27a'], accent: ['#ff6a3d', '#3ddc84'] };
  var K = {
    sky: STYLE.bg[0], dusk: STYLE.bg[1], road: STYLE.bg[2],
    wood: STYLE.main[0], woodDark: STYLE.main[1], box: STYLE.main[2], boxDark: '#b88a52',
    hot: STYLE.accent[0], ok: STYLE.accent[1], line: '#141414', white: '#fffaf0', bed: '#6e737e', bedDark: '#4a4e57',
  };

  var GAME_TITLE = 'CARGO HOLD';
  var TIME_LIMIT = 24;
  var DROP_LIMIT = 3;
  var BED_Y = Math.round(H * 0.66);
  var WARD = { x: 270, w: 210, h: 440 };
  var PAD_L = { x: 120, y: Math.round(H * 0.82) };
  var PAD_R = { x: 420, y: Math.round(H * 0.82) };
  var BOX_HOME = 640;
  var TAIL_X = 1010;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var phase = S.ATTRACT;
  var won = false;

  var lean, leanV, curve, curveT, nextCurve, signT, boxes, saved, dropped, clock, readyT, stopT, over, outroT;
  var focus, halfShown, pushNow, rideT, cause;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x, y + 4, { size: sz, color: K.line, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var MOVER_A = ['..ccc..', '.ccccc.', '..sss..', 'aa.u.aa', '.uuuuu.', '..uuu..', '..p.p..', '.pp.pp.'];
  var MOVER_B = ['..ccc..', '.ccccc.', '..sss..', '.a.u.a.', 'auuuuua', '..uuu..', '.p...p.', 'pp...pp'];
  var MOVER_PAL = { c: '#2f6fd1', s: '#f2c79a', a: '#f2c79a', u: '#2f6fd1', p: '#23242a' };
  var SIGN_L = ['...##...', '..###...', '.#######', '########', '.#######', '..###...', '...##...'];
  var SIGN_R = ['...##...', '...###..', '#######.', '########', '#######.', '...###..', '...##...'];
  var PALM = ['.#.#.#..', '.#.#.#.#', '.######.', '.######.', '..####..'];

  function makeBoxes() {
    return [
      { h: 150, w: 230, x: BOX_HOME, st: 0, t: 0, vx: 0, wait: 1.2 },
      { h: 120, w: 200, x: BOX_HOME + 10, st: 0, t: 0, vx: 0, wait: 2.4 },
      { h: 100, w: 170, x: BOX_HOME + 20, st: 0, t: 0, vx: 0, wait: 3.3 },
    ];
  }

  function initGame() {
    lean = 0; leanV = 0; curve = 0; curveT = 2.2; nextCurve = 1; signT = 0;
    boxes = makeBoxes();
    saved = 0; dropped = 0; clock = TIME_LIMIT; readyT = 0.8; stopT = 0; over = false; outroT = 0;
    focus = null; halfShown = false; pushNow = 0; rideT = 0; cause = ''; won = false;
  }

  function boxY(i) {
    var y = BED_Y;
    for (var k = 0; k < i; k++) y -= boxes[k].h;
    return y - boxes[i].h;
  }

  function intensity() { return Math.min(1, rideT / 18); }

  // ---- 共通シミュレーション(本番もデモも同じ) ----
  function stepCurve(dt) {
    curveT -= dt;
    if (curveT < 0.7 && signT <= 0) { signT = 0.7; game.audio.tone('A5', 0.06, { wave: 'square', volume: 0.05 }); }
    if (signT > 0) signT -= dt;
    if (curveT <= 0) {
      curve = nextCurve;
      nextCurve = -nextCurve;
      curveT = 2.8 - intensity() * 0.9 + game.random(0, 0.6);
    }
  }

  function stepWardrobe(dt, push) {
    var force = curve * (0.34 + intensity() * 0.3);
    leanV += (force + lean * 0.9 + push * 1.5) * dt;
    leanV *= Math.pow(0.25, dt);
    lean += leanV * dt * 2.2;
    return Math.abs(lean) >= 1;
  }

  // 戻り値: 落ちた箱のindex(無ければ -1)
  function stepBoxes(dt) {
    var fell = -1;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (b.st === 0) {
        b.wait -= dt;
        if (b.wait <= 0) { b.st = 1; b.t = 0.65; game.audio.tone('E3', 0.1, { wave: 'sawtooth', volume: 0.05 }); }
      } else if (b.st === 1) {
        b.t -= dt;
        if (b.t <= 0) { b.st = 2; b.vx = 110 + i * 40 + intensity() * 120; }
      } else if (b.st === 2) {
        b.vx += (60 + intensity() * 90) * dt;
        b.x += b.vx * dt;
        if (b.x + b.w / 2 > TAIL_X + 40) { b.st = 3; b.t = 0; fell = i; }
      } else if (b.st === 3) {
        b.t += dt;
        if (b.t > 1.1) { b.st = 0; b.x = BOX_HOME + i * 10; b.wait = 0.8; }
      }
    }
    return fell;
  }

  function shoveBox(i) {
    var b = boxes[i];
    b.st = 0; b.x = BOX_HOME + i * 10; b.vx = 0;
    b.wait = Math.max(0.7, 2.0 - intensity() * 1.2) + game.random(0, 0.8);
  }

  function padPush(x) {
    if (x >= W / 2) return 0;
    return x < WARD.x ? 1 : -1;
  }

  function endRun(ok, why) {
    if (over) return;
    over = true; won = ok; cause = why; outroT = 1.4;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    if (phase !== S.PLAYING || over || readyT > 0) return;
    if (x < W / 2) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: K.white, count: 4, speed: 120 });
      return;
    }
    var hit = -1;
    for (var pass = 0; pass < 2 && hit < 0; pass++) {
      for (var i = boxes.length - 1; i >= 0; i--) {
        var b = boxes[i], by = boxY(i);
        if (pass === 0 && b.st !== 1 && b.st !== 2) continue;
        if (b.st !== 3 && x > b.x - b.w / 2 - 50 && x < b.x + b.w / 2 + 50 && y > by - 40 && y < by + b.h + 40) { hit = i; break; }
      }
    }
    if (hit < 0) {
      game.feedback.bad(x, y, { text: 'MISS', color: K.hot, size: 34, count: 4 });
      return;
    }
    var bx = boxes[hit];
    if (bx.st === 0) {
      game.audio.play('se_tap', 0.2);
      game.fx.popup('…', bx.x, boxY(hit) - 20, { color: K.white, size: 30 });
      return;
    }
    var late = bx.x - BOX_HOME > 200;
    saved++;
    game.feedback.good(bx.x, boxY(hit) + bx.h / 2, { text: late ? 'NICE' : 'GOOD', color: K.ok, size: 40 });
    shoveBox(hit);
  });

  game.onTap(function(x, y) {
    if (phase === S.ATTRACT) { game.audio.play('se_coin'); phase = S.PLAYING; initGame(); return; }
    if (phase === S.RESULT) { phase = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function outlineRect(x, y, w, h, light, dark) {
    game.draw.rect(x - 6, y - 6, w + 12, h + 12, K.line);
    game.draw.rect(x, y, w, h, light);
    game.draw.rect(x + w * 0.62, y, w * 0.38, h, dark);
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, BED_Y, [[0, K.sky], [0.8, K.dusk], [1, '#f6c27a']]);
    var scroll = (t * 260) % 360;
    for (var i = -1; i < 5; i++) {
      var hx = W - (i * 360 + scroll) - 200;
      var hh = 150 + ((i + 7) % 3) * 60;
      game.draw.rect(hx - 4, BED_Y - 190 - hh, 188, hh + 4, K.line);
      game.draw.rect(hx, BED_Y - 186 - hh, 180, hh, i % 2 ? '#f5f0e6' : '#e6d6c2');
      game.draw.rect(hx + 40, BED_Y - 150 - hh, 40, 40, '#7fb8e6');
    }
    game.draw.rect(0, BED_Y - 190, W, 190, '#9ccf6e');
    game.draw.gradient(BED_Y, H, [[0, K.road], [1, '#34373f']]);
    for (var r = 0; r < 6; r++) {
      var lx = W - ((r * 240 + t * 700) % (W + 240));
      game.draw.rect(lx, H * 0.93, 120, 14, '#f4e27a');
    }
    // 荷台
    game.draw.rect(0, BED_Y - 6, TAIL_X + 6, 46, K.line);
    game.draw.rect(0, BED_Y, TAIL_X, 30, K.bed);
    game.draw.rect(0, BED_Y + 22, TAIL_X, 12, K.bedDark);
    game.draw.rect(TAIL_X - 8, BED_Y - 60, 18, 66, K.line);
    // 次のカーブを知らせる道路標識(0.7秒前に点滅)
    var dir = signT > 0 ? nextCurve : curve;
    var blink = signT > 0 ? Math.floor(t * 12) % 2 === 0 : true;
    game.draw.rect(W - 170, 300, 12, 220, K.line);
    game.draw.rect(W - 240, 250, 150, 110, K.line);
    game.draw.rect(W - 232, 258, 134, 94, blink && signT > 0 ? K.hot : '#ffd23f');
    if (dir !== 0) game.draw.sprite(dir < 0 ? SIGN_L : SIGN_R, { '#': K.line }, W - 165, 305, 12, { anchor: 'center' });
  }

  function drawWardrobe(hl) {
    var step = 8;
    var baseX = WARD.x - WARD.w / 2;
    for (var r = 0; r < WARD.h; r += step) {
      var off = lean * 150 * (r / WARD.h);
      var y = BED_Y - r - step;
      game.draw.rect(baseX + off - 7, y - 1, WARD.w + 14, step + 2, K.line);
    }
    for (var r2 = 0; r2 < WARD.h; r2 += step) {
      var off2 = lean * 150 * (r2 / WARD.h);
      var y2 = BED_Y - r2 - step;
      var edge = r2 < 10 || r2 > WARD.h - 18;
      game.draw.rect(baseX + off2, y2, WARD.w * 0.55, step, edge ? K.woodDark : K.wood);
      game.draw.rect(baseX + off2 + WARD.w * 0.55, y2, WARD.w * 0.45, step, K.woodDark);
      if (r2 % 120 < step) game.draw.rect(baseX + off2, y2, WARD.w, 4, K.line);
      if (r2 > 200 && r2 < 240) game.draw.rect(baseX + off2 + WARD.w * 0.5 - 6, y2, 12, step, '#ffd23f');
    }
    if (hl) {
      game.draw.rect(baseX + lean * 75 - 30, BED_Y - WARD.h - 30, WARD.w + 60, WARD.h + 30, '#ffffff', 0.5);
    }
    // 危険予告: 傾きが大きいと上端に赤い点滅
    if (Math.abs(lean) > 0.6 && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.circle(WARD.x + lean * 150, BED_Y - WARD.h - 30, 22, K.hot);
    }
  }

  function drawBoxes() {
    var t = game.time.elapsed;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var by = boxY(i);
      var jitter = b.st === 1 ? Math.sin(t * 60) * 6 : 0;
      if (b.st === 3) { by += b.t * b.t * 900; jitter = b.t * 200; }
      outlineRect(b.x - b.w / 2 + jitter, by, b.w, b.h, K.box, K.boxDark);
      game.draw.rect(b.x - 20 + jitter, by, 40, b.h, '#d8c9a6');
      if (b.st === 1 || b.st === 2) {
        var on = Math.floor(t * 10) % 2 === 0;
        if (on) game.draw.rect(b.x + b.w / 2 + jitter, by, 10, b.h, K.hot);
      }
    }
  }

  function drawPads(push) {
    var t = game.time.elapsed;
    var pads = [PAD_L, PAD_R];
    for (var i = 0; i < 2; i++) {
      var p = pads[i];
      var active = (i === 0 && push > 0) || (i === 1 && push < 0);
      game.draw.circle(p.x, p.y, 92, K.line);
      game.draw.circle(p.x, p.y, 84, active ? K.ok : '#d9dde6');
      game.draw.circle(p.x - 20, p.y - 24, 30, '#ffffff', 0.35);
      game.draw.sprite(PALM, { '#': K.line }, p.x, p.y + Math.sin(t * 3 + i) * 4, 12, { anchor: 'center', flipX: i === 1 });
    }
    game.draw.line(W / 2, H * 0.74, W / 2, H * 0.98, '#ffffff', 4);
  }

  function drawCrew(push) {
    var fr = Math.floor(game.time.elapsed * 4) % 2 === 0 ? MOVER_A : MOVER_B;
    game.draw.sprite(fr, MOVER_PAL, 470, BED_Y - 90 + Math.sin(game.time.elapsed * 5) * 4, 16, { anchor: 'center', flipX: push > 0 });
  }

  function drawHud() {
    outlineRect(W * 0.3 - 110, 46, 60, 48, K.box, K.boxDark);
    label('x' + saved, W * 0.3 + 10, 70, 44, K.white);
    label('MISS ' + dropped + '/' + DROP_LIMIT, W * 0.72, 70, 40, dropped > 0 ? K.hot : K.white);
    var barY = Math.round(H * 0.078);
    game.draw.rect(74, barY - 6, W - 148, 30, K.line);
    game.draw.rect(80, barY, (W - 160) * Math.max(0, clock / TIME_LIMIT), 18, clock < 5 && Math.floor(game.time.elapsed * 6) % 2 ? K.hot : '#ffd23f');
    var truckX = 80 + (W - 160) * (1 - Math.max(0, clock / TIME_LIMIT));
    game.draw.rect(truckX - 20, 186, 40, 22, K.line);
  }

  // ---- ATTRACT: 本物のシミュレーションをAIの両手で動かす(箱を1個わざと落とす) ----
  var demo = { t: 0, lx: PAD_L.x, ly: PAD_L.y, rx: 800, ry: 1100, lp: false, rp: false, skip: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.skip = false; curveT = 0.9; }
    rideT += dt;
    stepCurve(dt);
    var push = 0;
    if (lean < -0.12 || (lean < 0.05 && leanV < -0.15)) push = 1;
    else if (lean > 0.12 || (lean > -0.05 && leanV > 0.15)) push = -1;
    pushNow = push;
    if (stepWardrobe(dt, push)) lean = lean > 0 ? 0.95 : -0.95;
    var fell = stepBoxes(dt);
    if (fell >= 0) { game.audio.play('se_break', 0.25); game.fx.shake(6, 0.2); }
    demo.lp = push !== 0;
    demo.lx = push > 0 ? PAD_L.x : PAD_R.x; demo.ly = PAD_L.y - 30;
    demo.rp = false;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (b.st === 2) {
        demo.rx = b.x; demo.ry = boxY(i) + b.h / 2;
        var giveUp = cyc > 4.2 && !demo.skip && i === 2;
        if (giveUp) { demo.skip = true; }
        if (!demo.skip || i !== 2) {
          if (b.x - BOX_HOME > 120) {
            demo.rp = true;
            game.fx.burst(b.x, boxY(i) + b.h / 2, { color: K.ok, count: 6, speed: 180 });
            game.audio.play('se_good', 0.18);
            shoveBox(i);
          }
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (phase === S.ATTRACT) {
      stepDemo(dt);
      drawWorld();
      drawWardrobe(false);
      drawBoxes();
      drawCrew(pushNow);
      drawPads(pushNow);
      game.draw.hand(demo.lx, demo.ly, { press: demo.lp, scale: 13 });
      game.draw.hand(demo.rx, demo.ry, { press: demo.rp, scale: 13 });
      label(GAME_TITLE, W / 2, 110, 72, '#ffd23f');
      label('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 196, 34, K.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 42, '#ffd23f');
      else label('INSERT COIN', W / 2, H * 0.965, 34, K.white);
      return;
    }

    if (phase === S.RESULT) {
      drawWorld();
      drawWardrobe(false);
      drawBoxes();
      drawCrew(0);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 120, 84, won ? K.ok : K.hot);
      label('SCORE ' + (saved * 10), W / 2, 220, 42, K.white);
      label('MISS ' + dropped, W / 2, 285, 34, K.white);
      if (won && saved * 10 >= game.best) label('NEW RECORD', W / 2, 350, 44, '#ffd23f');
      else label('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 350, 32, K.white);
      if (!won) label('あと' + Math.ceil(Math.max(1, clock)) + '秒!', W / 2, 420, 44, '#ffd23f');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 34, K.white);
      return;
    }

    // PLAYING: 左ゾーンに置いた指の位置から押す向きを毎フレーム読む
    var push = 0;
    var tl = game.touches || [];
    for (var i = 0; i < tl.length; i++) { var p = padPush(tl[i].x); if (p !== 0 && tl[i].y > H * 0.5) push = p; }
    pushNow = push;

    if (over) {
      if (stopT > 0) stopT -= dt;
      else {
        outroT -= dt;
        if (outroT <= 0) {
          phase = S.RESULT;
          if (won) game.end.success(saved * 10, { saved: saved, dropped: dropped });
          else game.end.failure({ saved: saved, dropped: dropped });
        }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.3);
    } else {
      clock -= dt; rideT += dt;
      stepCurve(dt);
      if (push !== 0 && Math.floor(rideT * 8) !== Math.floor((rideT - dt) * 8)) game.audio.tone(push > 0 ? 'C4' : 'G3', 0.04, { wave: 'triangle', volume: 0.04 });
      if (stepWardrobe(dt, push)) {
        lean = lean > 0 ? 1 : -1;
        focus = 'ward'; stopT = 0.5;
        game.feedback.bad(WARD.x + lean * 150, BED_Y - WARD.h, { text: 'MISS', color: K.hot });
        game.audio.play('se_break', 0.5);
        endRun(false, 'ward');
      }
      var fell = over ? -1 : stepBoxes(dt);
      if (fell >= 0) {
        dropped++;
        game.feedback.bad(TAIL_X, BED_Y - 100, { text: 'MISS', color: K.hot, size: 40 });
        game.audio.play('se_break', 0.35);
        if (dropped >= DROP_LIMIT) { focus = 'box'; stopT = 0.45; endRun(false, 'box'); }
      }
      if (!halfShown && clock <= TIME_LIMIT / 2) {
        halfShown = true;
        game.fx.popup('NICE', W / 2, H * 0.3, { color: '#ffd23f', size: 60 });
        game.audio.play('se_milestone', 0.45);
      }
      if (!over && clock <= 0) {
        clock = 0;
        stopT = 0.35;
        game.fx.burst(WARD.x, BED_Y - WARD.h / 2, { color: '#ffd23f', count: 26, speed: 420 });
        game.feedback.good(W / 2, H * 0.35, { text: 'CLEAR', color: K.ok });
        endRun(true, 'arrive');
      }
    }

    drawWorld();
    drawWardrobe(focus === 'ward' && stopT > 0);
    drawBoxes();
    if (focus === 'box' && stopT > 0) game.draw.rect(TAIL_X - 140, BED_Y - 320, 200, 320, '#ffffff', 0.45);
    drawCrew(push);
    drawPads(push);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 90, '#ffd23f');
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['A4', 0.5], ['F#4', 1],
      ['G4', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 1], ['G4', 1],
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['G2', 2], ['D2', 2], ['C2', 2], ['D2', 2]] });
    phase = S.ATTRACT;
    initGame();
  });
})(game);
