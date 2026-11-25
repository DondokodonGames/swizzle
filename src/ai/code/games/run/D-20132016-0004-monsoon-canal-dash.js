// D-20132016-0004-monsoon-canal-dash.js
// モンスーン運河ダッシュ — 増水した夜市の路地を、荷物を抱えた配達員が渡っていく
// 操作: 交差点の水路が空いた瞬間にタップして一歩前進。連打はクールダウン中は無効
// 終わり: 5区画すべて渡り切れば成功。水路が来ている瞬間にタップすれば失敗
// @mechanic: cooldown_tap
// @theme: monsoon_canal_dash
// 世界観: 嵐の夜、増水した夜市の路地を配達員が渡っていく。区画ごとに濁流が周期的に押し寄せ、引いた瞬間だけ渡れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡り切った区画数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 彩度高めの4〜6色、輪郭くっきり、ディザなしのフラット塗り
  var C = {
    bg: '#0e2436', bg2: '#0a1a28', wall: '#274a5e', water: '#1c6fa8', waterDeep: '#0e3f60',
    lamp: '#ffcf5a', good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#eaf6ff', ink: '#06121c',
  };

  var GAME_TITLE = 'CANAL DASH';
  var LANES = 5;
  var MAX_TIME = 13;
  var SAFE_MIN = 0.65, SAFE_RANGE = 0.35, TELE_DUR = 0.5, DANGER_DUR = 0.4, LOCKOUT_DUR = 0.3;
  var CX = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var lane, phase, phaseT, done, endWait, finished, playElapsed, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COURIER = ['.##.', '####', '.##.', '#.#.'];
  var BARREL = ['###', '###', '###'];

  function bg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(80 + i * 180, H * 0.14, 10, H * 0.5, C.wall, 0.5);
    // ambient luminance pulse (安全ネット: ATTRACT中央ブラインドスポット対策)
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(el * 1.3));
    var lampBlink = 0.5 + 0.5 * Math.sin(el * 2.2);
    game.draw.circle(W * 0.14, H * 0.2, 16, C.lamp, 0.4 + 0.3 * lampBlink);
    game.draw.circle(W * 0.86, H * 0.2, 16, C.lamp, 0.4 + 0.3 * lampBlink);
  }

  function newLanePhase(p) {
    phase = p;
    if (p === 'lockout') phaseT = LOCKOUT_DUR;
    else if (p === 'safe') phaseT = SAFE_MIN + Math.random() * SAFE_RANGE;
    else if (p === 'telegraph') phaseT = TELE_DUR;
    else phaseT = DANGER_DUR;
  }

  function initGame() {
    lane = 0; done = false; endWait = 0; finished = false; playElapsed = 0; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newLanePhase('safe');
  }

  function laneY(i) { return H * 0.68 - i * (H * 0.44 / LANES); }

  function tapAdvance(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    if (phase === 'lockout') {
      game.feedback.bad(x, y, { text: 'あと1歩!', size: 24 });
      return;
    }
    if (phase === 'danger') {
      hitStop = 0.35; ok = false; finished = true;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    // safe または telegraph 中の前進
    lane++;
    game.audio.play('se_jump', 0.4);
    game.feedback.good(CX, laneY(lane), { text: 'DASH', color: C.good, size: 26 });
    game.fx.burst(CX, laneY(lane), { color: C.gold, count: 12, speed: 300 });
    if (!milestoneShown && lane === Math.ceil(LANES / 2)) {
      milestoneShown = true;
      game.fx.popup('HALFWAY!', CX, H * 0.2, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.4);
    }
    if (lane >= LANES) { ok = true; finished = true; finish(); return; }
    newLanePhase('lockout');
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapAdvance(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(curLane, curPhase, curPhaseT, bobT) {
    // 進行済み区画(足場)
    for (var i = 0; i <= LANES; i++) {
      var y = laneY(i);
      game.draw.rect(W * 0.2, y - 10, W * 0.6, 20, i <= curLane ? C.wall : C.waterDeep);
    }
    // 現在区画の水路ハザード
    if (curLane < LANES) {
      var y2 = laneY(curLane + 1) - (laneY(curLane + 1) - laneY(curLane)) * 0.5;
      var warn = curPhase === 'telegraph' && Math.floor(game.time.elapsed * 10) % 2 === 0;
      var active = curPhase === 'danger';
      var col = active ? C.bad : (warn ? C.bad : C.water);
      var alpha = active ? 0.9 : (warn ? 0.55 : 0.7);
      game.draw.rect(W * 0.22, y2 - 26, W * 0.56, 52, col, alpha);
      if (active) game.draw.sprite(BARREL, { '#': C.ink }, CX, y2, 22, { anchor: 'center' });
    }
    // 配達員(常時わずかな上下スウェイでブラインドスポット対策)
    var by = laneY(curLane) - 46 + Math.sin(bobT * 3.1) * 5;
    var bx = CX + Math.cos(bobT * 2.3) * 3;
    game.draw.sprite(COURIER, { '#': C.lamp }, bx, by, 22, { anchor: 'center' });
  }

  // ATTRACT実演: 時刻ベースで決定的にレーン進行を再現(状態機械の再現バグを避けるため
  // maze-trace と同じ「demo.t からの直接算出」方式を採用)
  var DEMO_CYC = 3.0;
  var DEMO_ACT = [0.4, 0.9, 1.4, 1.9, 2.4]; // LANES 個ぶんのタップ時刻
  var demo = { t: 0, gx: CX, gy: H * 0.92, press: false };
  var demoLane = 0, demoPhase = 'safe';
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { demoLane = 0; }
    var l = 0;
    for (var i = 0; i < DEMO_ACT.length; i++) { if (cyc >= DEMO_ACT[i]) l = i + 1; }
    demoLane = l;
    var justActed = false;
    for (var j = 0; j < DEMO_ACT.length; j++) { if (Math.abs(cyc - DEMO_ACT[j]) < 0.09) justActed = true; }
    demo.press = justActed;
    demoPhase = justActed || demoLane >= LANES ? 'safe' : 'lockout';
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(demoLane, demoPhase, 1, game.time.elapsed);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(lane, 'safe', 1, game.time.elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(lane + ' / ' + LANES, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (LANES - lane) + '区画!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(lane, { lane: lane, total: LANES });
        else game.end.failure({ lane: lane, total: LANES });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playElapsed += dt;
      if (playElapsed > MAX_TIME) {
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(CX, laneY(lane), { text: 'TIME UP' });
        shake = 0.2;
        game.audio.play('se_bad', 0.4);
        finish();
      } else {
        phaseT -= dt;
        if (phaseT <= 0) {
          if (phase === 'lockout') newLanePhase('safe');
          else if (phase === 'safe') newLanePhase('telegraph');
          else if (phase === 'telegraph') newLanePhase('danger');
          else newLanePhase('safe');
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(lane, phase, phaseT, game.time.elapsed);

    txt(lane + ' / ' + LANES, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (lane / LANES), 16, C.gold);
    // 親指ゾーン: ダッシュパッド(状態を色で示す)
    var padCol = phase === 'danger' ? C.bad : (phase === 'lockout' ? C.wall : C.good);
    game.draw.circle(CX, H * 0.9, 90 + Math.sin(game.time.elapsed * 5) * 4, padCol, 0.35);
    game.draw.circle(CX, H * 0.9, 60, padCol, 0.6);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['D#3', 0.5], ['G3', 0.5], ['C4', 1]], { tempo: 120, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
