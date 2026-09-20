// I-3DS-0014-quickfire-booth-judge.js
// クイックブース — 縁日の早押しブース係が、次々出る形の的を正しいゾーンに瞬時に振り分ける
// 操作: 中央に出た形と同じ形のゾーン(下段3つ)を素早くタップする。制限時間は徐々に短くなる
// 終わり: 規定回数(6回)正しく振り分ければ成功。誤答・時間切れが1回でもあれば失敗
// @mechanic: judge
// @theme: carnival_quickfire_booth
// 世界観: 縁日の的当てブース、案内係が次々飛んでくる的の形を見極め、同じ形のゾーンへ瞬時に投げ分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 振り分けた回数
// スタイル: TOON SHADE
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: くっきり輪郭+平坦な2階調シェード
  var C = {
    bg: '#2a3a2a', bg2: '#1a2818', stall: '#e8622c', stallDark: '#a8421a',
    zoneA: '#2fb6e0', zoneB: '#e0c02f', zoneC: '#e0466a',
    good: '#5cff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4f4ea', ink: '#101810',
  };

  var GAME_TITLE = 'QUICK BOOTH';
  var TOTAL = 6;
  var SHAPES = ['circle', 'tri', 'rect'];
  var ZONE_COLOR = { circle: C.zoneA, tri: C.zoneB, rect: C.zoneC };
  var ZONES = [
    { shape: 'circle', x: W * 0.22, y: H * 0.82 },
    { shape: 'tri', x: W * 0.5, y: H * 0.82 },
    { shape: 'rect', x: W * 0.78, y: H * 0.82 },
  ];
  var ZONE_R = 110;
  var TARGET_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var correct, roundIdx, curShape, roundT, roundDur, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ATTENDANT = ['.###.', '#####', '.###.', '#.#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.10, W, 40, C.stallDark);
    game.draw.rect(0, H * 0.14, W, 16, C.stall);
  }

  function drawShape(shape, x, y, r, color) {
    if (shape === 'circle') {
      game.draw.circle(x, y, r, color);
    } else if (shape === 'rect') {
      game.draw.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7, color);
    } else {
      // 三角: 横ストライプで塗る簡易ポリゴン
      for (var i = 0; i < 14; i++) {
        var t = i / 14;
        var yy = y - r + t * (r * 2);
        var w = r * (1 - Math.abs(t - 0.5) * 2) * 1.1;
        game.draw.rect(x - w / 2, yy, w, r * 2 / 14 + 2, color);
      }
    }
  }

  function drawZones() {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      game.draw.circle(z.x, z.y, ZONE_R, '#00000030');
      drawShape(z.shape, z.x, z.y, ZONE_R * 0.6, ZONE_COLOR[z.shape]);
    }
  }

  function drawAttendant() {
    game.draw.sprite(ATTENDANT, { '#': C.gold }, W * 0.5, H * 0.62, 24, { anchor: 'center' });
  }

  function newRound(idx) {
    var shape = SHAPES[Math.floor(game.random(0, SHAPES.length))];
    var dur = Math.max(0.95, 1.7 - idx * 0.11);
    return { shape: shape, dur: dur };
  }

  function initGame() {
    correct = 0; roundIdx = 0; milestoneShown = false;
    var r = newRound(0); curShape = r.shape; roundDur = r.dur; roundT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function judge(x, y) {
    if (done || ready > 0 || finished) return;
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      if (game.hit.circle(x, y, 1, z.x, z.y, ZONE_R)) {
        if (z.shape === curShape) {
          correct++;
          hitStop = 0.10;
          game.feedback.good(z.x, z.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.35);
          if (!milestoneShown && correct >= Math.ceil(TOTAL / 2)) {
            milestoneShown = true;
            game.fx.popup('HALFWAY!', W / 2, TARGET_Y - 160, { color: C.gold, size: 38 });
            game.audio.play('se_milestone', 0.4);
          }
          if (correct >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); return; }
          roundIdx++;
          var r = newRound(roundIdx); curShape = r.shape; roundDur = r.dur; roundT = 0;
        } else {
          hitStop = 0.35;
          game.feedback.bad(z.x, z.y, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
        return;
      }
    }
    game.audio.play('se_tap', 0.05);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) judge(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.94, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) {
      var r = newRound(0); curShape = r.shape; roundDur = 1.6; roundT = 0;
      demo.resolved = false;
    }
    roundT += dt;
    if (roundT > roundDur * 0.55 && !demo.resolved) {
      demo.resolved = true;
      var target = null;
      for (var i = 0; i < ZONES.length; i++) if (ZONES[i].shape === curShape) target = ZONES[i];
      demo.gx = target.x; demo.gy = target.y; demo.press = true;
      game.feedback.good(target.x, target.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.22);
    }
    if (roundT > roundDur * 0.55 + 0.25) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (correct === undefined) initGame();
      bg();
      stepDemo(dt);
      drawAttendant();
      drawShape(curShape, W / 2, TARGET_Y, 76, ZONE_COLOR[curShape]);
      drawZones();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawAttendant();
      drawZones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(correct + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - correct) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correct, { correct: correct, total: TOTAL });
        else game.end.failure({ correct: correct, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= roundDur) {
        hitStop = 0.3;
        game.feedback.bad(W / 2, TARGET_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawAttendant();
    if (!finished) drawShape(curShape, W / 2, TARGET_Y, 76, ZONE_COLOR[curShape]);
    drawZones();
    if (!finished) {
      var p = 1 - roundT / roundDur;
      var warn = p < 0.3;
      var blink = warn && Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.rect(W / 2 - 90, TARGET_Y + 100, 180, 14, C.ink, 0.5);
      game.draw.rect(W / 2 - 90, TARGET_Y + 100, 180 * Math.max(0, p), 14, blink ? C.bad : C.gold);
    }

    txt(correct + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E5', 0.2], ['C5', 0.2], ['G4', 0.4]], { tempo: 170, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
