(() => {
  'use strict';

  const VERSION = '2.1.0';
  const GRID_SIZE = 25;
  const STORAGE = {
    profile: 'jumping-battle-profile-v2',
    scores: 'jumping-battle-scores-v2'
  };

  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDvaIrvq4mRygP2eN6KxOxl0vsnzUMSIns',
    authDomain: 'fingderbattle.firebaseapp.com',
    projectId: 'fingderbattle',
    storageBucket: 'fingderbattle.firebasestorage.app',
    messagingSenderId: '621739176543',
    appId: '1:621739176543:web:ec7ce1ab4908933b0ae1ea'
  };

  const MODES = {
    rush: {
      name: '번개전', icon: '⚡', duration: 30, tag: 'SPEED',
      instruction: '파란 타깃을 터치!', subtext: '빨간 함정은 피하세요',
      hint: '빛나는 파란 칸 +10 · 황금 칸 +30 · 빨간 칸 -15',
      grade: [650, 470, 300, 150]
    },
    memory: {
      name: '기억전', icon: '◈', duration: 40, tag: 'MEMORY',
      instruction: '빛나는 순서를 기억하세요', subtext: '표시가 끝나면 같은 순서로 터치',
      hint: '순서를 정확히 입력하면 라운드 보너스 · 실수하면 -10',
      grade: [720, 520, 340, 180]
    },
    chaos: {
      name: '카오스', icon: '↯', duration: 35, tag: 'FOCUS',
      instruction: '파란 타깃을 터치!', subtext: '규칙이 뒤집히면 빨간 칸이 정답',
      hint: '상단 규칙을 확인하세요 · 5초마다 정답이 뒤집힙니다',
      grade: [760, 560, 360, 190]
    }
  };

  const DAILY_MISSIONS = [
    { mode: 'rush', type: 'combo', goal: 12, title: '콤보 사냥꾼', description: '한 판에서 12콤보를 달성하세요.' },
    { mode: 'rush', type: 'score', goal: 420, title: '번개의 손', description: '번개전에서 420점을 돌파하세요.' },
    { mode: 'memory', type: 'rounds', goal: 4, title: '기억의 미로', description: '기억전 4라운드를 완주하세요.' },
    { mode: 'memory', type: 'accuracy', goal: 90, title: '완벽한 기억', description: '기억전 정확도 90%를 달성하세요.' },
    { mode: 'chaos', type: 'score', goal: 440, title: '혼돈의 지배자', description: '카오스에서 440점을 돌파하세요.' },
    { mode: 'chaos', type: 'combo', goal: 10, title: '규칙 파괴자', description: '카오스에서 10콤보를 달성하세요.' }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const sleep = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const formatNumber = value => Math.round(Number(value) || 0).toLocaleString('ko-KR');

  const els = {
    startScreen: $('#startScreen'), gameScreen: $('#gameScreen'),
    homeButton: $('#homeButton'), soundButton: $('#soundButton'), helpButton: $('#helpButton'),
    helpDialog: $('#helpDialog'), helpStartButton: $('#helpStartButton'),
    levelChip: $('#levelChip'), bestScore: $('#bestScore'), bestCombo: $('#bestCombo'), playCount: $('#playCount'),
    modeCards: $$('.mode-card'), modeDuration: $('#modeDuration'), startGameButton: $('#startGameButton'),
    dailyCard: $('#dailyCard'), dailyTitle: $('#dailyTitle'), dailyDescription: $('#dailyDescription'),
    dailyProgressText: $('#dailyProgressText'), dailyProgressBar: $('#dailyProgressBar'), dailyStartButton: $('#dailyStartButton'),
    rankingTabs: $$('.ranking-tab'), leaderboardList: $('#leaderboardList'), syncBadge: $('#syncBadge'),
    gameModeIcon: $('#gameModeIcon'), gameModeName: $('#gameModeName'), pauseButton: $('#pauseButton'), quitButton: $('#quitButton'),
    scoreValue: $('#scoreValue'), scoreDelta: $('#scoreDelta'), comboValue: $('#comboValue'), multiplierValue: $('#multiplierValue'),
    accuracyLabel: $('#accuracyLabel'), timeValue: $('#timeValue'), timeTrackBar: $('#timeTrackBar'),
    battleMessage: $('#battleMessage'), battleEyebrow: $('#battleEyebrow'), battleInstruction: $('#battleInstruction'),
    battleSubtext: $('#battleSubtext'), gameGrid: $('#gameGrid'), gameBoardWrap: $('#gameBoardWrap'), boardFlash: $('#boardFlash'),
    countdown: $('#countdown'), comboBurst: $('#comboBurst'), feverLabel: $('#feverLabel'), feverBar: $('#feverBar'),
    feverPercent: $('#feverPercent'), gameHint: $('#gameHint'), pausePanel: $('#pausePanel'), resumeButton: $('#resumeButton'),
    pauseQuitButton: $('#pauseQuitButton'), resultDialog: $('#resultDialog'), resultKicker: $('#resultKicker'),
    resultGrade: $('#resultGrade'), resultTitle: $('#resultTitle'), resultSubtitle: $('#resultSubtitle'), resultScore: $('#resultScore'),
    newRecordBadge: $('#newRecordBadge'), resultCombo: $('#resultCombo'), resultAccuracy: $('#resultAccuracy'),
    resultExtraLabel: $('#resultExtraLabel'), resultExtraValue: $('#resultExtraValue'), missionResult: $('#missionResult'),
    scoreForm: $('#scoreForm'), usernameInput: $('#usernameInput'), saveScoreButton: $('#saveScoreButton'), saveStatus: $('#saveStatus'),
    retryButton: $('#retryButton'), shareButton: $('#shareButton'), changeModeButton: $('#changeModeButton'),
    toastRegion: $('#toastRegion'), confettiCanvas: $('#confettiCanvas'), currentYear: $('#currentYear')
  };

  const defaultProfile = () => ({
    version: VERSION,
    plays: 0,
    xp: 0,
    level: 1,
    bestScore: 0,
    bestCombo: 0,
    bestByMode: { rush: 0, memory: 0, chaos: 0 },
    streak: 0,
    lastPlayed: '',
    name: '',
    lastMode: 'rush',
    muted: false,
    mission: { date: '', progress: 0, completed: false }
  });

  const state = {
    selectedMode: 'rush',
    rankingMode: 'rush',
    profile: loadProfile(),
    session: null,
    rafId: 0,
    memoryToken: 0,
    firebasePromise: null,
    db: null,
    localScores: loadScores(),
    onlineScores: {},
    scoreSavedForSession: ''
  };

  class SoundEngine {
    constructor() { this.context = null; }
    ensure() {
      if (state.profile.muted) return null;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!this.context) this.context = new AudioContextClass();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }
    tone(frequency, duration = .08, type = 'sine', gain = .035, slide = 0) {
      const context = this.ensure();
      if (!context) return;
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const now = context.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), now + duration);
      volume.gain.setValueAtTime(.0001, now);
      volume.gain.exponentialRampToValueAtTime(gain, now + .01);
      volume.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(volume).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + .02);
    }
    tap() { this.tone(520, .07, 'triangle', .035, 180); }
    bad() { this.tone(170, .14, 'sawtooth', .04, -60); }
    count() { this.tone(380, .08, 'square', .025, 80); }
    go() { this.tone(520, .12, 'triangle', .04, 420); }
    bonus() { [660, 880, 1120].forEach((f, i) => window.setTimeout(() => this.tone(f, .09, 'sine', .035), i * 55)); }
    fever() { [420, 560, 740, 980].forEach((f, i) => window.setTimeout(() => this.tone(f, .13, 'triangle', .04), i * 65)); }
  }
  const sound = new SoundEngine();

  function safeParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  }

  function loadProfile() {
    const stored = safeParse(localStorage.getItem(STORAGE.profile), {});
    const profile = { ...defaultProfile(), ...stored };
    profile.bestByMode = { rush: 0, memory: 0, chaos: 0, ...(stored.bestByMode || {}) };
    profile.mission = { date: '', progress: 0, completed: false, ...(stored.mission || {}) };
    return profile;
  }

  function saveProfile() {
    try { localStorage.setItem(STORAGE.profile, JSON.stringify(state.profile)); } catch {}
  }

  function loadScores() {
    const scores = safeParse(localStorage.getItem(STORAGE.scores), []);
    return Array.isArray(scores) ? scores.filter(item => item && MODES[item.mode]).slice(0, 100) : [];
  }

  function saveLocalScores() {
    try { localStorage.setItem(STORAGE.scores, JSON.stringify(state.localScores.slice(0, 100))); } catch {}
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function yesterdayKey() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return localDateKey(date);
  }

  function getDailyMission() {
    const date = localDateKey();
    let hash = 0;
    for (const char of date) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return DAILY_MISSIONS[Math.abs(hash) % DAILY_MISSIONS.length];
  }

  function normalizeMission() {
    const today = localDateKey();
    if (state.profile.mission.date !== today) {
      state.profile.mission = { date: today, progress: 0, completed: false };
      saveProfile();
    }
  }

  function missionValueFromSession(session, mission) {
    if (session.mode !== mission.mode) return 0;
    if (mission.type === 'score') return session.score;
    if (mission.type === 'combo') return session.maxCombo;
    if (mission.type === 'rounds') return session.roundsCleared;
    if (mission.type === 'accuracy') return getAccuracy(session);
    return 0;
  }

  function renderProfile() {
    els.levelChip.textContent = `LV.${state.profile.level}`;
    els.bestScore.textContent = formatNumber(state.profile.bestScore);
    els.bestCombo.textContent = formatNumber(state.profile.bestCombo);
    els.playCount.textContent = formatNumber(state.profile.plays);
    els.soundButton.textContent = state.profile.muted ? '🔇' : '🔊';
    els.soundButton.setAttribute('aria-label', state.profile.muted ? '소리 켜기' : '소리 끄기');
  }

  function renderDailyMission() {
    normalizeMission();
    const mission = getDailyMission();
    const progress = clamp(state.profile.mission.progress, 0, mission.goal);
    els.dailyTitle.textContent = mission.title;
    els.dailyDescription.textContent = mission.description;
    els.dailyProgressText.textContent = state.profile.mission.completed ? 'COMPLETE' : `${formatNumber(progress)} / ${formatNumber(mission.goal)}`;
    els.dailyProgressBar.style.width = `${clamp(progress / mission.goal * 100, 0, 100)}%`;
    els.dailyCard.classList.toggle('is-complete', state.profile.mission.completed);
    els.dailyStartButton.textContent = state.profile.mission.completed ? '완료' : '도전';
  }

  function setSelectedMode(mode, scroll = false) {
    if (!MODES[mode]) return;
    state.selectedMode = mode;
    state.profile.lastMode = mode;
    saveProfile();
    els.modeCards.forEach(card => {
      const active = card.dataset.mode === mode;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-checked', String(active));
    });
    els.modeDuration.textContent = `${MODES[mode].duration} SEC`;
    if (scroll) els.startGameButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setRankingMode(mode) {
    if (!MODES[mode]) return;
    state.rankingMode = mode;
    els.rankingTabs.forEach(tab => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    renderLeaderboard(mode);
    loadOnlineLeaderboard(mode);
  }

  function combinedScores(mode) {
    const local = state.localScores.filter(score => score.mode === mode);
    const online = state.onlineScores[mode] || [];
    const seen = new Set();
    return [...online, ...local]
      .filter(item => {
        const key = `${item.name}|${item.score}|${item.mode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score || (b.combo || 0) - (a.combo || 0))
      .slice(0, 10);
  }

  function renderLeaderboard(mode) {
    const scores = combinedScores(mode);
    els.leaderboardList.replaceChildren();
    if (!scores.length) {
      const item = document.createElement('li');
      item.className = 'leaderboard-empty';
      item.textContent = '아직 기록이 없어요. 첫 번째 레전드가 되어보세요.';
      els.leaderboardList.append(item);
      return;
    }
    scores.forEach((entry, index) => {
      const item = document.createElement('li');
      const rank = document.createElement('span');
      const player = document.createElement('span');
      const score = document.createElement('strong');
      rank.className = 'rank'; player.className = 'player'; score.className = 'score';
      rank.textContent = String(index + 1).padStart(2, '0');
      player.textContent = entry.name || 'PLAYER';
      score.textContent = formatNumber(entry.score);
      item.append(rank, player, score);
      els.leaderboardList.append(item);
    });
  }

  async function initFirebase() {
    if (state.db) return state.db;
    if (state.firebasePromise) return state.firebasePromise;
    state.firebasePromise = (async () => {
      const deadline = Date.now() + 4200;
      while (!window.firebase && Date.now() < deadline) await sleep(100);
      if (!window.firebase) throw new Error('Firebase SDK unavailable');
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      state.db = firebase.firestore();
      return state.db;
    })().catch(error => {
      console.info('[Jumping Battle] Online ranking unavailable:', error.message);
      state.firebasePromise = null;
      throw error;
    });
    return state.firebasePromise;
  }

  async function loadOnlineLeaderboard(mode) {
    const token = `${mode}-${Date.now()}`;
    els.leaderboardList.dataset.token = token;
    try {
      const db = await initFirebase();
      const snapshot = await db.collection('highScoresV2').orderBy('score', 'desc').limit(60).get();
      if (els.leaderboardList.dataset.token !== token) return;
      state.onlineScores[mode] = snapshot.docs
        .map(doc => doc.data())
        .filter(item => item && item.mode === mode && Number.isFinite(Number(item.score)))
        .map(item => ({ name: String(item.name || 'PLAYER').slice(0, 12), score: Number(item.score), combo: Number(item.combo) || 0, mode }))
        .slice(0, 10);
      els.syncBadge.className = 'sync-badge is-online';
      els.syncBadge.innerHTML = '<i></i> ONLINE';
      renderLeaderboard(mode);
    } catch {
      els.syncBadge.className = 'sync-badge';
      els.syncBadge.innerHTML = '<i></i> LOCAL';
    }
  }

  function buildGrid() {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < GRID_SIZE; index += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'game-cell';
      cell.dataset.index = String(index);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${Math.floor(index / 5) + 1}행 ${index % 5 + 1}열`);
      fragment.append(cell);
    }
    els.gameGrid.replaceChildren(fragment);
  }

  function showScreen(name) {
    const game = name === 'game';
    els.startScreen.hidden = game;
    els.gameScreen.hidden = !game;
    if (!game) {
      document.body.classList.remove('is-chaos', 'is-inverted', 'is-fever');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function createSession(mode, daily = false) {
    const config = MODES[mode];
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode, daily, status: 'countdown', durationMs: config.duration * 1000,
      startedAt: 0, pausedAt: 0, pauseAccum: 0, remainingMs: config.duration * 1000,
      score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0, attempts: 0,
      reactionTimes: [], fever: 0, feverUntil: 0, nextSpawnAt: 0, targetBornAt: 0,
      activeCorrect: new Set(), roundHit: true, inverted: false, nextRuleAt: 5000,
      round: 0, roundsCleared: 0, sequence: [], inputIndex: 0, accepting: false,
      saved: false, previousBest: state.profile.bestByMode[mode] || 0
    };
  }

  async function startGame(mode = state.selectedMode, options = {}) {
    if (!MODES[mode]) mode = 'rush';
    closeDialog(els.helpDialog);
    closeDialog(els.resultDialog);
    abortCurrentSession(false);
    state.selectedMode = mode;
    state.session = createSession(mode, Boolean(options.daily));
    state.scoreSavedForSession = '';
    setSelectedMode(mode);
    showScreen('game');
    configureGameScreen(mode);
    resetBoard();
    updateHud();
    await runCountdown();
    if (!state.session || state.session.status !== 'countdown') return;
    beginSession();
  }

  function configureGameScreen(mode) {
    const config = MODES[mode];
    els.gameModeIcon.textContent = config.icon;
    els.gameModeName.textContent = config.name;
    els.battleEyebrow.textContent = mode === 'chaos' ? 'RULE: NORMAL' : 'GET READY';
    els.battleInstruction.textContent = config.instruction;
    els.battleSubtext.textContent = config.subtext;
    els.gameHint.textContent = config.hint;
    document.body.classList.toggle('is-chaos', mode === 'chaos');
  }

  async function runCountdown() {
    for (const value of ['3', '2', '1', 'GO!']) {
      if (!state.session || state.session.status !== 'countdown') return;
      els.countdown.textContent = value;
      els.countdown.classList.remove('is-pop');
      void els.countdown.offsetWidth;
      els.countdown.classList.add('is-pop');
      value === 'GO!' ? sound.go() : sound.count();
      await sleep(value === 'GO!' ? 520 : 670);
    }
    els.countdown.textContent = '';
  }

  function beginSession() {
    const session = state.session;
    if (!session) return;
    session.status = 'playing';
    session.startedAt = performance.now();
    session.nextSpawnAt = 0;
    session.nextRuleAt = 5000;
    els.battleEyebrow.textContent = session.mode === 'chaos' ? 'RULE: NORMAL' : 'BATTLE START';
    if (session.mode === 'memory') beginMemoryRound(false);
    state.rafId = requestAnimationFrame(gameLoop);
  }

  function gameElapsed(now = performance.now()) {
    const session = state.session;
    if (!session || !session.startedAt) return 0;
    return Math.max(0, now - session.startedAt - session.pauseAccum);
  }

  function gameLoop(now) {
    const session = state.session;
    if (!session || session.status === 'ended') return;
    if (session.status !== 'playing') {
      state.rafId = requestAnimationFrame(gameLoop);
      return;
    }
    const elapsed = gameElapsed(now);
    session.remainingMs = Math.max(0, session.durationMs - elapsed);
    updateTimer();

    if (session.feverUntil && elapsed >= session.feverUntil) stopFever();
    if ((session.mode === 'rush' || session.mode === 'chaos') && elapsed >= session.nextSpawnAt) spawnArcadeRound(elapsed);
    if (session.mode === 'chaos' && elapsed >= session.nextRuleAt) toggleChaosRule(elapsed);

    if (session.remainingMs <= 0) {
      endGame();
      return;
    }
    state.rafId = requestAnimationFrame(gameLoop);
  }

  function resetBoard() {
    $$('.game-cell', els.gameGrid).forEach(cell => {
      cell.className = 'game-cell';
      cell.dataset.role = '';
      cell.disabled = false;
    });
    els.gameBoardWrap.classList.remove('is-fever');
    els.pausePanel.hidden = true;
  }

  function clearArcadeCells() {
    $$('.game-cell', els.gameGrid).forEach(cell => {
      cell.className = 'game-cell';
      cell.dataset.role = '';
    });
    if (state.session) state.session.activeCorrect.clear();
  }

  function randomUnique(count, excluded = new Set()) {
    const pool = Array.from({ length: GRID_SIZE }, (_, index) => index).filter(index => !excluded.has(index));
    const result = [];
    while (result.length < count && pool.length) {
      const pick = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(pick, 1)[0]);
    }
    return result;
  }

  function spawnArcadeRound(elapsed) {
    const session = state.session;
    if (!session || session.status !== 'playing') return;
    if (!session.roundHit && session.activeCorrect.size) {
      session.misses += 1;
      session.combo = 0;
    }
    clearArcadeCells();
    const progress = clamp(elapsed / session.durationMs, 0, 1);
    const fever = session.feverUntil > elapsed;
    const targetCount = fever ? 3 : progress > .72 ? 2 : 1;
    const dangerCount = session.mode === 'chaos' ? (progress > .55 ? 5 : 4) : (progress > .65 ? 4 : 3);
    const used = new Set();
    const targets = randomUnique(targetCount, used);
    targets.forEach(index => used.add(index));
    const dangers = randomUnique(dangerCount, used);
    dangers.forEach(index => used.add(index));
    const bonus = Math.random() < (fever ? .28 : .12) ? randomUnique(1, used)[0] : undefined;

    targets.forEach(index => setCellRole(index, 'target'));
    dangers.forEach(index => setCellRole(index, 'danger'));
    if (Number.isInteger(bonus)) setCellRole(bonus, 'bonus');

    session.activeCorrect = new Set(session.inverted && session.mode === 'chaos' ? dangers : [...targets, ...(Number.isInteger(bonus) ? [bonus] : [])]);
    session.roundHit = false;
    session.targetBornAt = performance.now();
    const interval = fever ? 380 : clamp(920 - progress * 360, 510, 920);
    session.nextSpawnAt = elapsed + interval;
  }

  function setCellRole(index, role) {
    const cell = els.gameGrid.children[index];
    if (!cell) return;
    cell.dataset.role = role;
    cell.classList.add(`is-${role}`);
    cell.setAttribute('aria-label', role === 'target' ? '파란 타깃' : role === 'danger' ? '빨간 함정' : '황금 보너스');
  }

  function toggleChaosRule(elapsed) {
    const session = state.session;
    if (!session || session.mode !== 'chaos') return;
    session.inverted = !session.inverted;
    session.nextRuleAt = elapsed + 5000;
    document.body.classList.toggle('is-inverted', session.inverted);
    els.battleEyebrow.textContent = session.inverted ? 'RULE: REVERSED' : 'RULE: NORMAL';
    els.battleInstruction.textContent = session.inverted ? '빨간 함정이 정답!' : '파란 타깃을 터치!';
    els.battleSubtext.textContent = session.inverted ? '파란 타깃은 지금 함정입니다' : '빨간 함정은 피하세요';
    flashBoard(session.inverted ? 'bad' : 'good');
    sound.count();
    if (navigator.vibrate) navigator.vibrate([35, 25, 35]);
    session.nextSpawnAt = elapsed;
  }

  function handleCellInput(index) {
    const session = state.session;
    if (!session || session.status !== 'playing') return;
    if (session.mode === 'memory') handleMemoryInput(index);
    else handleArcadeInput(index);
  }

  function handleArcadeInput(index) {
    const session = state.session;
    const cell = els.gameGrid.children[index];
    if (!session || !cell) return;
    const role = cell.dataset.role;
    const reversed = session.mode === 'chaos' && session.inverted;
    const correct = reversed ? role === 'danger' : role === 'target' || role === 'bonus';
    session.attempts += 1;

    if (correct) {
      const reaction = Math.max(60, performance.now() - session.targetBornAt);
      session.reactionTimes.push(reaction);
      session.hits += 1;
      session.combo += 1;
      session.maxCombo = Math.max(session.maxCombo, session.combo);
      session.roundHit = true;
      session.activeCorrect.delete(index);
      const multiplier = getMultiplier(session);
      const base = role === 'bonus' ? 30 : reversed ? 14 : 10;
      const reactionBonus = clamp(Math.round((780 - reaction) / 90), 0, 7);
      const feverBonus = session.feverUntil > gameElapsed() ? 2 : 1;
      const points = (base + reactionBonus) * multiplier * feverBonus;
      addScore(points, role === 'bonus');
      chargeFever(role === 'bonus' ? 18 : 9);
      animateCell(cell, 'is-hit');
      cell.classList.remove('is-target', 'is-danger', 'is-bonus');
      cell.dataset.role = '';
      role === 'bonus' ? sound.bonus() : sound.tap();
      if (navigator.vibrate) navigator.vibrate(role === 'bonus' ? [22, 20, 35] : 12);
      if (session.combo > 0 && session.combo % 5 === 0) showComboBurst(`${session.combo} COMBO!`);
      if (!session.activeCorrect.size) session.nextSpawnAt = gameElapsed() + 140;
    } else {
      session.misses += 1;
      session.combo = 0;
      session.fever = Math.max(0, session.fever - 18);
      addScore(role ? -15 : -4, false, true);
      animateCell(cell, 'is-wrong');
      flashBoard('bad');
      sound.bad();
      if (navigator.vibrate) navigator.vibrate(55);
    }
    updateHud();
  }

  function getMultiplier(session = state.session) {
    if (!session) return 1;
    return clamp(1 + Math.floor(session.combo / 5), 1, 5);
  }

  function addScore(points, bonus = false, negative = false) {
    const session = state.session;
    if (!session) return;
    session.score = Math.max(0, session.score + points);
    els.scoreDelta.textContent = `${points > 0 ? '+' : ''}${points}`;
    els.scoreDelta.className = `is-visible${negative || points < 0 ? ' is-negative' : ''}`;
    void els.scoreDelta.offsetWidth;
    els.scoreDelta.className = `is-visible${negative || points < 0 ? ' is-negative' : ''}`;
    if (bonus) flashBoard('good');
  }

  function chargeFever(amount) {
    const session = state.session;
    if (!session || session.feverUntil > gameElapsed()) return;
    session.fever = clamp(session.fever + amount, 0, 100);
    if (session.fever >= 100) activateFever();
  }

  function activateFever() {
    const session = state.session;
    if (!session) return;
    session.fever = 100;
    session.feverUntil = gameElapsed() + 5200;
    document.body.classList.add('is-fever');
    els.gameBoardWrap.classList.add('is-fever');
    els.feverLabel.textContent = 'FEVER ×2';
    showComboBurst('FEVER!');
    sound.fever();
    if (navigator.vibrate) navigator.vibrate([30, 30, 30, 30, 60]);
  }

  function stopFever() {
    const session = state.session;
    if (!session) return;
    session.fever = 0;
    session.feverUntil = 0;
    document.body.classList.remove('is-fever');
    els.gameBoardWrap.classList.remove('is-fever');
    els.feverLabel.textContent = 'FEVER';
  }

  async function beginMemoryRound(replay = false) {
    const session = state.session;
    if (!session || session.mode !== 'memory' || session.status !== 'playing') return;
    const token = ++state.memoryToken;
    session.accepting = false;
    if (!replay) {
      session.round += 1;
      const length = clamp(2 + session.round, 3, 10);
      session.sequence = [];
      while (session.sequence.length < length) {
        const index = Math.floor(Math.random() * GRID_SIZE);
        if (index !== session.sequence.at(-1)) session.sequence.push(index);
      }
    }
    session.inputIndex = 0;
    clearArcadeCells();
    els.battleEyebrow.textContent = `ROUND ${session.round}`;
    els.battleInstruction.textContent = '순서를 기억하세요';
    els.battleSubtext.textContent = `${session.sequence.length}개의 빛이 지나갑니다`;
    updateHud();
    await sleep(420);

    for (const index of session.sequence) {
      if (!memoryTokenValid(token)) return;
      const cell = els.gameGrid.children[index];
      cell.classList.add('is-sequence');
      sound.count();
      await sleep(clamp(510 - session.round * 20, 285, 480));
      cell.classList.remove('is-sequence');
      await sleep(115);
    }
    if (!memoryTokenValid(token)) return;
    session.accepting = true;
    els.battleInstruction.textContent = '이제 순서대로 터치!';
    els.battleSubtext.textContent = `0 / ${session.sequence.length}`;
  }

  function memoryTokenValid(token) {
    return state.session && state.session.status === 'playing' && state.memoryToken === token;
  }

  function handleMemoryInput(index) {
    const session = state.session;
    if (!session || !session.accepting) return;
    const cell = els.gameGrid.children[index];
    const expected = session.sequence[session.inputIndex];
    session.attempts += 1;
    if (index === expected) {
      session.hits += 1;
      session.combo += 1;
      session.maxCombo = Math.max(session.maxCombo, session.combo);
      session.inputIndex += 1;
      const points = (9 + session.round * 3) * getMultiplier(session) * (session.feverUntil > gameElapsed() ? 2 : 1);
      addScore(points);
      chargeFever(11);
      animateCell(cell, 'is-correct');
      sound.tap();
      els.battleSubtext.textContent = `${session.inputIndex} / ${session.sequence.length}`;
      if (session.inputIndex >= session.sequence.length) {
        session.accepting = false;
        session.roundsCleared += 1;
        session.score += session.round * 20;
        showComboBurst(`ROUND ${session.round} CLEAR`);
        flashBoard('good');
        sound.bonus();
        updateHud();
        window.setTimeout(() => beginMemoryRound(false), 650);
      }
    } else {
      session.misses += 1;
      session.combo = 0;
      session.accepting = false;
      session.fever = Math.max(0, session.fever - 20);
      addScore(-10, false, true);
      animateCell(cell, 'is-wrong');
      flashBoard('bad');
      sound.bad();
      els.battleInstruction.textContent = '앗, 순서가 달라요';
      els.battleSubtext.textContent = '같은 라운드를 한 번 더 보여드릴게요';
      updateHud();
      window.setTimeout(() => beginMemoryRound(true), 800);
    }
    updateHud();
  }

  function animateCell(cell, className) {
    cell.classList.remove(className);
    void cell.offsetWidth;
    cell.classList.add(className);
    window.setTimeout(() => cell.classList.remove(className), 330);
  }

  function flashBoard(type) {
    const className = type === 'bad' ? 'is-bad' : 'is-good';
    els.boardFlash.className = `board-flash ${className}`;
    window.setTimeout(() => { els.boardFlash.className = 'board-flash'; }, 380);
  }

  function showComboBurst(text) {
    els.comboBurst.textContent = text;
    els.comboBurst.classList.remove('is-visible');
    void els.comboBurst.offsetWidth;
    els.comboBurst.classList.add('is-visible');
  }

  function getAccuracy(session = state.session) {
    if (!session || !session.attempts) return 100;
    return Math.round(session.hits / session.attempts * 100);
  }

  function updateHud() {
    const session = state.session;
    if (!session) return;
    els.scoreValue.textContent = formatNumber(session.score);
    els.comboValue.textContent = formatNumber(session.combo);
    els.multiplierValue.textContent = `×${getMultiplier(session)}`;
    els.accuracyLabel.textContent = `ACC ${getAccuracy(session)}%`;
    els.feverBar.style.width = `${session.fever}%`;
    els.feverPercent.textContent = `${Math.round(session.fever)}%`;
  }

  function updateTimer() {
    const session = state.session;
    if (!session) return;
    const seconds = session.remainingMs / 1000;
    els.timeValue.textContent = seconds.toFixed(1);
    els.timeTrackBar.style.transform = `scaleX(${clamp(session.remainingMs / session.durationMs, 0, 1)})`;
    if (seconds <= 5) els.timeValue.style.color = 'var(--danger)';
    else els.timeValue.style.color = '';
  }

  function pauseGame(automatic = false) {
    const session = state.session;
    if (!session || session.status !== 'playing') return;
    session.status = 'paused';
    session.pausedAt = performance.now();
    state.memoryToken += 1;
    els.pausePanel.hidden = false;
    els.pausePanel.dataset.automatic = automatic ? 'true' : 'false';
    sound.count();
  }

  function resumeGame() {
    const session = state.session;
    if (!session || session.status !== 'paused') return;
    session.pauseAccum += performance.now() - session.pausedAt;
    session.pausedAt = 0;
    session.status = 'playing';
    els.pausePanel.hidden = true;
    if (session.mode === 'memory') beginMemoryRound(true);
    sound.go();
  }

  function abortCurrentSession(goHome = true) {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    state.memoryToken += 1;
    if (state.session) state.session.status = 'ended';
    state.session = null;
    els.pausePanel.hidden = true;
    resetBoard();
    if (goHome) {
      showScreen('start');
      renderProfile();
      renderDailyMission();
      renderLeaderboard(state.rankingMode);
    }
  }

  function updateStreak() {
    const today = localDateKey();
    if (state.profile.lastPlayed === today) return;
    state.profile.streak = state.profile.lastPlayed === yesterdayKey() ? state.profile.streak + 1 : 1;
    state.profile.lastPlayed = today;
  }

  function gradeFor(session) {
    const thresholds = MODES[session.mode].grade;
    if (session.score >= thresholds[0]) return 'S';
    if (session.score >= thresholds[1]) return 'A';
    if (session.score >= thresholds[2]) return 'B';
    if (session.score >= thresholds[3]) return 'C';
    return 'D';
  }

  function endGame() {
    const session = state.session;
    if (!session || session.status === 'ended') return;
    session.status = 'ended';
    session.remainingMs = 0;
    state.memoryToken += 1;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    document.body.classList.remove('is-chaos', 'is-inverted', 'is-fever');
    els.gameBoardWrap.classList.remove('is-fever');
    clearArcadeCells();

    const newRecord = session.score > session.previousBest;
    state.profile.plays += 1;
    state.profile.bestScore = Math.max(state.profile.bestScore, session.score);
    state.profile.bestCombo = Math.max(state.profile.bestCombo, session.maxCombo);
    state.profile.bestByMode[session.mode] = Math.max(session.previousBest, session.score);
    updateStreak();

    const mission = getDailyMission();
    normalizeMission();
    const missionValue = missionValueFromSession(session, mission);
    state.profile.mission.progress = Math.max(state.profile.mission.progress, missionValue);
    const missionJustCompleted = !state.profile.mission.completed && state.profile.mission.progress >= mission.goal;
    if (missionJustCompleted) state.profile.mission.completed = true;

    const accuracy = getAccuracy(session);
    const xpEarned = Math.max(20, Math.floor(session.score / 7) + session.maxCombo * 2 + (missionJustCompleted ? 100 : 0));
    state.profile.xp += xpEarned;
    state.profile.level = 1 + Math.floor(Math.sqrt(state.profile.xp / 110));
    saveProfile();
    renderProfile();
    renderDailyMission();
    renderResult(session, { newRecord, accuracy, xpEarned, missionJustCompleted });
    openDialog(els.resultDialog);
    if (newRecord || ['S', 'A'].includes(gradeFor(session))) launchConfetti();
  }

  function renderResult(session, result) {
    const grade = gradeFor(session);
    const titles = {
      S: '손끝에 번개가 흐르네요!', A: '거의 프로 게이머급이에요!',
      B: '감각이 제대로 올라왔어요!', C: '좋아요, 다음 판은 더 빨라요.', D: '첫 판은 워밍업이죠!'
    };
    els.resultGrade.textContent = grade;
    els.resultTitle.textContent = titles[grade];
    els.resultSubtitle.textContent = result.newRecord ? '개인 최고 기록을 새로 썼습니다.' : `${MODES[session.mode].name} 배틀을 완주했습니다.`;
    els.resultScore.textContent = formatNumber(session.score);
    els.newRecordBadge.hidden = !result.newRecord;
    els.resultCombo.textContent = formatNumber(session.maxCombo);
    els.resultAccuracy.textContent = `${result.accuracy}%`;
    if (session.mode === 'memory') {
      els.resultExtraLabel.textContent = 'ROUNDS';
      els.resultExtraValue.textContent = `${session.roundsCleared}`;
    } else {
      const average = session.reactionTimes.length ? Math.round(session.reactionTimes.reduce((sum, value) => sum + value, 0) / session.reactionTimes.length) : 0;
      els.resultExtraLabel.textContent = 'AVG REACTION';
      els.resultExtraValue.textContent = average ? `${average}ms` : '—';
    }
    const mission = getDailyMission();
    const progress = clamp(state.profile.mission.progress, 0, mission.goal);
    els.missionResult.innerHTML = `<span>✦</span><div><small>DAILY MISSION</small><b>${state.profile.mission.completed ? '미션 완료!' : `${formatNumber(progress)} / ${formatNumber(mission.goal)}`}</b></div><strong>+${result.xpEarned} XP</strong>`;
    els.usernameInput.value = state.profile.name || '';
    els.saveScoreButton.disabled = false;
    els.saveScoreButton.textContent = '기록 저장';
    els.saveStatus.textContent = '기록은 이 기기에 먼저 안전하게 저장됩니다.';
  }

  function sanitizeName(value) {
    return String(value || '').replace(/[<>\n\r]/g, '').trim().slice(0, 12);
  }

  async function submitScore(event) {
    event.preventDefault();
    const session = state.session;
    if (!session || session.status !== 'ended') return;
    const name = sanitizeName(els.usernameInput.value) || 'PLAYER';
    state.profile.name = name;
    saveProfile();
    els.usernameInput.value = name;

    if (state.scoreSavedForSession !== session.id) {
      const entry = { id: session.id, name, score: session.score, combo: session.maxCombo, accuracy: getAccuracy(session), mode: session.mode, createdAt: Date.now() };
      state.localScores.unshift(entry);
      state.localScores.sort((a, b) => b.score - a.score);
      state.localScores = state.localScores.slice(0, 100);
      saveLocalScores();
      state.scoreSavedForSession = session.id;
      renderLeaderboard(session.mode);
      els.saveScoreButton.disabled = true;
      els.saveScoreButton.textContent = '저장 완료';
      els.saveStatus.textContent = '로컬 기록 저장 완료 · 온라인 랭킹 동기화 중…';
      try {
        const db = await initFirebase();
        await db.collection('highScoresV2').add({
          name, score: session.score, combo: session.maxCombo, accuracy: getAccuracy(session),
          mode: session.mode, version: VERSION, timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        els.saveStatus.textContent = '온라인 랭킹까지 안전하게 등록했습니다.';
        state.onlineScores[session.mode] = undefined;
        loadOnlineLeaderboard(session.mode);
      } catch {
        els.saveStatus.textContent = '기기에는 저장됐어요. 온라인 연결 시 다시 도전할 수 있습니다.';
      }
    }
  }

  async function shareResult() {
    const session = state.session;
    if (!session) return;
    const text = `Jumping Battle ${MODES[session.mode].name}에서 ${formatNumber(session.score)}점 · ${session.maxCombo}콤보! 당신도 도전해보세요.`;
    try {
      if (navigator.share) await navigator.share({ title: 'Jumping Battle', text, url: location.href });
      else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        showToast('결과가 클립보드에 복사됐어요.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') showToast('공유할 수 없었어요. 다시 시도해주세요.');
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    els.toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), 3100);
  }

  function launchConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = els.confettiCanvas;
    const context = canvas.getContext('2d');
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    context.scale(ratio, ratio);
    const colors = ['#4df6ff', '#ff4fd8', '#ffd43b', '#48f0a8', '#9e8cff'];
    const pieces = Array.from({ length: 110 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 140,
      y: innerHeight * .33,
      vx: (Math.random() - .5) * 12,
      vy: -Math.random() * 10 - 4,
      size: Math.random() * 7 + 3,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - .5) * .35,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1
    }));
    const start = performance.now();
    function frame(now) {
      context.clearRect(0, 0, innerWidth, innerHeight);
      const dt = Math.min(32, now - (frame.last || now)) / 16.67;
      frame.last = now;
      pieces.forEach(piece => {
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.vy += .34 * dt;
        piece.vx *= .995;
        piece.rotation += piece.spin * dt;
        piece.life = clamp(1 - (now - start - 900) / 1500, 0, 1);
        context.save();
        context.globalAlpha = piece.life;
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * .65);
        context.restore();
      });
      if (now - start < 2400) requestAnimationFrame(frame);
      else context.clearRect(0, 0, innerWidth, innerHeight);
    }
    requestAnimationFrame(frame);
  }

  function bindEvents() {
    els.modeCards.forEach(card => card.addEventListener('click', () => setSelectedMode(card.dataset.mode)));
    els.rankingTabs.forEach(tab => tab.addEventListener('click', () => setRankingMode(tab.dataset.mode)));
    els.startGameButton.addEventListener('click', () => startGame(state.selectedMode));
    els.dailyStartButton.addEventListener('click', () => {
      const mission = getDailyMission();
      if (state.profile.mission.completed) { showToast('오늘 미션은 이미 완료했어요!'); return; }
      setSelectedMode(mission.mode);
      startGame(mission.mode, { daily: true });
    });
    els.helpButton.addEventListener('click', () => openDialog(els.helpDialog));
    els.helpStartButton.addEventListener('click', () => startGame(state.selectedMode));
    $$('[data-close]').forEach(button => button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.close);
      closeDialog(dialog);
      if (dialog === els.resultDialog) abortCurrentSession(true);
    }));
    els.helpDialog.addEventListener('click', event => { if (event.target === els.helpDialog) closeDialog(els.helpDialog); });
    els.resultDialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(els.resultDialog); abortCurrentSession(true); });

    els.soundButton.addEventListener('click', () => {
      state.profile.muted = !state.profile.muted;
      saveProfile();
      renderProfile();
      if (!state.profile.muted) sound.bonus();
    });
    els.homeButton.addEventListener('click', () => {
      if (state.session && ['playing', 'paused'].includes(state.session.status)) { pauseGame(); return; }
      if (state.session?.status === 'countdown') { abortCurrentSession(true); return; }
      closeDialog(els.resultDialog); abortCurrentSession(true);
    });
    els.pauseButton.addEventListener('click', () => pauseGame());
    els.quitButton.addEventListener('click', () => {
      if (state.session?.status === 'countdown') abortCurrentSession(true);
      else pauseGame();
    });
    els.resumeButton.addEventListener('click', resumeGame);
    els.pauseQuitButton.addEventListener('click', () => abortCurrentSession(true));
    els.gameGrid.addEventListener('pointerdown', event => {
      const cell = event.target.closest('.game-cell');
      if (!cell) return;
      event.preventDefault();
      handleCellInput(Number(cell.dataset.index));
    });
    els.scoreForm.addEventListener('submit', submitScore);
    els.retryButton.addEventListener('click', () => {
      const mode = state.session?.mode || state.selectedMode;
      const daily = Boolean(state.session?.daily);
      closeDialog(els.resultDialog);
      startGame(mode, { daily });
    });
    els.shareButton.addEventListener('click', shareResult);
    els.changeModeButton.addEventListener('click', () => { closeDialog(els.resultDialog); abortCurrentSession(true); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.session?.status === 'playing') pauseGame(true);
    });
    document.addEventListener('keydown', event => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (typing) return;
      if (event.code === 'Space' && !els.startScreen.hidden && !els.helpDialog.open && !els.resultDialog.open) {
        event.preventDefault(); startGame(state.selectedMode);
      }
      if (event.key.toLowerCase() === 'p' && state.session) {
        event.preventDefault();
        state.session.status === 'playing' ? pauseGame() : state.session.status === 'paused' && resumeGame();
      }
      if (event.key === 'Escape' && state.session?.status === 'playing') { event.preventDefault(); pauseGame(); }
    });
  }

  function initialize() {
    normalizeMission();
    buildGrid();
    bindEvents();
    renderProfile();
    renderDailyMission();
    setSelectedMode(state.profile.lastMode && MODES[state.profile.lastMode] ? state.profile.lastMode : 'rush');
    setRankingMode('rush');
    showScreen('start');
    els.currentYear.textContent = String(new Date().getFullYear());
    window.JumpingBattle = Object.freeze({ version: VERSION, start: mode => startGame(MODES[mode] ? mode : state.selectedMode), modes: Object.keys(MODES) });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
