// 410-voltage-surge.js
// 電圧サージ — 電気の流れを制御し過電圧を防ぐ
// 操作: 左右スワイプで電圧調整バーを動かす、危険ゾーンに入れない
// 成功: 90秒電圧を正常範囲に保つ  失敗: 電圧が5回危険ゾーンに入る

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020a04',
    panel:  '#0a1a0c',
    normal: '#22c55e',
    normalHi:'#86efac',
    warning:'#f97316',
    danger: '#ef4444',
    safe:   '#15803d',
    meter:  '#1a2f1c',
    needle: '#fbbf24',
    spark:  '#a3e635',
    grid:   '#0f2010',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var voltage = 0.5;  // 0-1, 0.5 = normal
  var voltageVel = 0;
  var SURGE_FORCE = 0.0;  // random surges

  var SAFE_MIN = 0.25;
  var SAFE_MAX = 0.75;
  var WARN_MIN = 0.1;
  var WARN_MAX = 0.9;

  var controlPower = 0.0;  // player's adjustment, -1 to 1
  var CONTROL_DRAG = 3.0;

  var danger = 0;
  var MAX_DANGER = 5;
  var inDanger = false;
  var dangerTimer = 0;

  var survived = 0;
  var NEEDED_TIME = 90;
  var done = false;
  var elapsed = 0;
  var timeLeft = NEEDED_TIME;
  var particles = [];
  var sparks = [];
  var surgeTimer = 0;
  var surgeInterval = 2.5;
  var wavePhase = 0;
  var history = [];  // voltage history for display

  function addSurge() {
    var surgeDir = Math.random() < 0.5 ? 1 : -1;
    voltageVel += surgeDir * (0.3 + Math.random()*0.4);
    surgeInterval = 1.5 + Math.random()*2;
    surgeTimer = 0;
    // Spark
    for (var pi = 0; pi < 6; pi++) {
      var ang = Math.random()*Math.PI*2;
      sparks.push({ x:W/2+(Math.random()-0.5)*200, y:H*0.5, vx:Math.cos(ang)*150, vy:Math.sin(ang)*150, life:0.4, col:C.spark });
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') controlPower = -0.6;
    else if (dir === 'right') controlPower = 0.6;
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap left/right half to adjust
    if (tx < W/2) controlPower = -0.4;
    else controlPower = 0.4;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_success', 0.8); game.end.success(Math.ceil(elapsed)*100+danger*(-200)); return; }
    }

    wavePhase += dt * 2;

    // Surges
    surgeTimer += dt;
    if (surgeTimer > surgeInterval) addSurge();

    // Natural drift toward center
    voltageVel += (0.5 - voltage) * 0.5 * dt;
    // Player control
    voltageVel += controlPower * 2.0 * dt;
    controlPower *= (1 - CONTROL_DRAG*dt);
    // Damping
    voltageVel *= (1 - 2.5*dt);
    voltage += voltageVel;
    voltage = Math.max(0, Math.min(1, voltage));

    // History
    history.push(voltage);
    if (history.length > 100) history.shift();

    // Danger check
    var nowDanger = voltage < WARN_MIN || voltage > WARN_MAX;
    if (nowDanger) {
      dangerTimer += dt;
      if (!inDanger) {
        inDanger = true;
        danger++;
        game.audio.play('se_failure', 0.5);
        if (danger >= MAX_DANGER && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); }
      }
    } else {
      inDanger = false;
      dangerTimer = 0;
    }

    for (var sp = sparks.length-1; sp >= 0; sp--) {
      sparks[sp].x += sparks[sp].vx*dt;
      sparks[sp].y += sparks[sp].vy*dt;
      sparks[sp].life -= dt;
      if (sparks[sp].life <= 0) sparks.splice(sp,1);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.panel, 0.7);

    // Grid background
    for (var gx = 0; gx < W; gx += 80) game.draw.line(gx, 0, gx, H, C.grid, 2);
    for (var gy = 0; gy < H; gy += 80) game.draw.line(0, gy, W, gy, C.grid, 2);

    // Voltage history waveform
    var histX = 60;
    var histW = W - 120;
    var histY = H*0.45;
    var histH = H*0.22;
    game.draw.rect(histX, histY, histW, histH, C.meter, 0.8);
    // Zone colors
    game.draw.rect(histX, histY+histH*WARN_MAX, histW, histH*(1-WARN_MAX), C.danger, 0.1);
    game.draw.rect(histX, histY, histW, histH*WARN_MIN, C.danger, 0.1);
    game.draw.rect(histX, histY+histH*SAFE_MAX, histW, histH*(WARN_MAX-SAFE_MAX), C.warning, 0.1);
    game.draw.rect(histX, histY+histH*WARN_MIN, histW, histH*(SAFE_MIN-WARN_MIN), C.warning, 0.1);
    game.draw.rect(histX, histY+histH*SAFE_MAX, histW, histH*(SAFE_MAX-SAFE_MIN), C.normal, 0.08);

    // Waveform
    for (var hi = 1; hi < history.length; hi++) {
      var hx1 = histX + (hi-1)/100*histW;
      var hx2 = histX + hi/100*histW;
      var hy1 = histY + (1-history[hi-1])*histH;
      var hy2 = histY + (1-history[hi])*histH;
      var hcol = (history[hi] < WARN_MIN || history[hi] > WARN_MAX) ? C.danger :
                 (history[hi] < SAFE_MIN || history[hi] > SAFE_MAX) ? C.warning : C.normal;
      game.draw.line(hx1, hy1, hx2, hy2, hcol, 3);
    }

    // Voltage gauge (vertical bar on right)
    var gaugeX = W - 80;
    var gaugeY = H*0.2;
    var gaugeH2 = H*0.6;
    game.draw.rect(gaugeX-20, gaugeY, 40, gaugeH2, C.meter, 0.9);
    // Safe zone
    game.draw.rect(gaugeX-20, gaugeY+gaugeH2*SAFE_MAX, 40, gaugeH2*(SAFE_MAX-SAFE_MIN), C.safe, 0.3);
    // Needle
    var needleY = gaugeY + (1-voltage)*gaugeH2;
    var needleCol = voltage < WARN_MIN || voltage > WARN_MAX ? C.danger :
                    voltage < SAFE_MIN || voltage > SAFE_MAX ? C.warning : C.needle;
    game.draw.rect(gaugeX-24, needleY-6, 48, 12, needleCol, 0.95);
    game.draw.text(Math.round(voltage*100)+'V', gaugeX, needleY-28, { size: 36, color: needleCol, bold: true });

    // Sparks
    for (var sp2 = 0; sp2 < sparks.length; sp2++) {
      var s = sparks[sp2];
      game.draw.line(s.x, s.y, s.x+s.vx*0.05, s.y+s.vy*0.05, s.col, 3);
    }

    // Danger flash
    if (inDanger) {
      game.draw.rect(0, 0, W, H, C.danger, 0.08+Math.sin(elapsed*12)*0.05);
    }

    // Controls hint
    game.draw.text('← 電圧下げる   上げる →', W/2, H*0.84, { size: 36, color: C.ui });

    // Danger dots
    for (var di = 0; di < MAX_DANGER; di++) {
      game.draw.circle(W/2-(MAX_DANGER-1)*34+di*68, H*0.935, 14, di < danger ? C.danger : C.safe, 0.9);
    }

    var remaining = Math.max(0, NEEDED_TIME - elapsed);
    game.draw.text(Math.ceil(remaining)+'秒', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/NEEDED_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*(1-ratio), 72, ratio > 0.3 ? C.normal : C.danger);
    game.draw.text(Math.ceil(remaining)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    addSurge();
  });
})(game);
