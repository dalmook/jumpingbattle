// Firebase 설정 - 본인의 Firebase 프로젝트 설정으로 대체하세요.
const firebaseConfig = {
  apiKey: "AIzaSyDvaIrvq4mRygP2eN6KxOxl0vsnzUMSIns",
  authDomain: "fingderbattle.firebaseapp.com",
  projectId: "fingderbattle",
  storageBucket: "fingderbattle.firebasestorage.app",
  messagingSenderId: "621739176543",
  appId: "1:621739176543:web:ec7ce1ab4908933b0ae1ea"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM 요소 가져오기
const startScreen = document.getElementById('startScreen');
const startGameButton = document.getElementById('startGameButton');
const initialHighScoresList = document.getElementById('initialHighScoresList');
const modeLabel = document.getElementById('modeLabel');
const modeButtons = document.querySelectorAll('.mode-button');
const scoreModeButtons = document.querySelectorAll('.score-mode-button');

const gameScreen = document.getElementById('gameScreen');
const gameGrid = document.getElementById('gameGrid');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');

const warningSound = document.getElementById('warningSound');
const successSound = document.getElementById('successSound');
const skullSound = document.getElementById('skullSound'); // 해골 등장 사운드
const angelSound = document.getElementById('angelSound'); // 천사 등장 사운드

const nameModal = document.getElementById('nameModal');
const finalScoreSpan = document.getElementById('finalScore');
const usernameInput = document.getElementById('username');
const submitNameButton = document.getElementById('submitName');
const closeModalButton = document.getElementById('closeModal');

const highScoresModal = document.getElementById('highScoresModal');
const highScoresList = document.getElementById('highScoresList');
const homeButton = document.getElementById('homeButton');

let score = 0;
let timeLeft = 60; // 60초로 변경
let gameIntervalId;
let flickerIntervalId;
let patternIntervalId;
let skullTimeoutIds = []; // 해골 등장 타이머 배열
let removeSkullTimeoutIds = []; // 해골 제거 타이머 배열
let angelTimeoutIds = []; // 천사 등장 타이머 배열
let removeAngelTimeoutIds = []; // 천사 제거 타이머 배열
let skullCount = 0; // 해골 등장 횟수
let angelCount = 0; // 천사 등장 횟수
let isGameOver = false;
let selectedMode = 'speed';
let currentScoreMode = 'speed';
let activePattern = null;
let patternStep = 0;
let patternSeed = 0;

// baseInterval을 startFlicker 호출 전에 선언
let baseInterval = 1000; // 기본 속도 (1초)

// 각 칸을 생성해서 grid에 추가 (5x5 격자)
for (let i = 0; i < 25; i++) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.addEventListener('click', () => handleCellClick(cell));
  gameGrid.appendChild(cell);
}

// 셀들을 배열로 가져오기
const cells = document.querySelectorAll('.cell');
const gridSize = 5;

// 게임 시작 화면에서 높은 점수 로드
loadInitialHighScores(selectedMode);
updateModeButtons();
updateScoreModeButtons();

modeButtons.forEach(button => {
  button.addEventListener('click', () => {
    const mode = button.getAttribute('data-mode');
    setSelectedMode(mode);
  });
});

scoreModeButtons.forEach(button => {
  button.addEventListener('click', () => {
    const mode = button.getAttribute('data-mode');
    setScoreMode(mode);
  });
});

// "게임 시작" 버튼 클릭 시 게임 화면으로 전환
startGameButton.addEventListener('click', () => {
  startScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  startGame();
});

// 게임 시작
function startGame() {
  isGameOver = false;
  score = 0;
  timeLeft = 60; // 60 seconds
  selectedMode = getSelectedMode();
  currentScoreMode = selectedMode;
  updateModeLabel();
  updateScoreModeButtons();
  scoreDisplay.textContent = `점수: ${score}`;
  timerDisplay.textContent = `남은 시간: ${timeLeft}초`;

  skullCount = 0; // 해골 등장 횟수 초기화
  angelCount = 0; // 천사 등장 횟수 초기화

  // 모든 셀 초기화
  cells.forEach(cell => {
    cell.classList.remove('red', 'blue', 'green', 'skull', 'angel', 'clicked', 'clicked-effect');
    const colors = ['red', 'blue', 'green'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    cell.classList.add(randomColor);
  });

  // 깜빡임 시작
  if (selectedMode === 'speed') {
    startFlicker();
  } else if (selectedMode === 'pattern') {
    startPatternMode();
  } else if (selectedMode === 'mix') {
    startFlicker();
    startPatternMode();
  }

  // 타이머 시작
  gameIntervalId = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `남은 시간: ${timeLeft}초`;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  // 해골과 천사 등장 스케줄링 (총 3번씩)
  scheduleEntities('skull', 3, 5000, 55000); // 해골: 5초 ~ 55초
  scheduleEntities('angel', 3, 5000, 55000); // 천사: 5초 ~ 55초
}

function endGame() {
  isGameOver = true;
  clearInterval(flickerIntervalId);
  clearInterval(gameIntervalId);
  clearInterval(patternIntervalId);
  activePattern = null;
  patternStep = 0;

  // 모든 해골 및 천사 타이머 정리
  skullTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  removeSkullTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  angelTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  removeAngelTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  skullTimeoutIds = [];
  removeSkullTimeoutIds = [];
  angelTimeoutIds = [];
  removeAngelTimeoutIds = [];

  // 모든 셀에서 해골 및 천사 클래스 제거
  cells.forEach(cell => {
    cell.classList.remove('skull', 'angel');
  });

  // 최종 점수 표시
  finalScoreSpan.textContent = score;

  // 이름 입력 모달 표시
  nameModal.style.display = 'block';
}

// 셀이 일정 간격으로 색이 바뀌도록 하는 함수
function startFlicker() {
  flickerIntervalId = setInterval(() => {
    if (isGameOver) return;

    // 3~6개 정도 랜덤으로 동시에 깜빡이도록
    const numberOfFlashes = Math.floor(Math.random() * 4) + 3;
    for (let i = 0; i < numberOfFlashes; i++) {
      const randomIndex = Math.floor(Math.random() * cells.length);
      const randomCell = cells[randomIndex];

      // 이미 해골이나 천사인 경우 제외
      if (randomCell.classList.contains('skull') || randomCell.classList.contains('angel') || randomCell.classList.contains('clicked')) continue;

      // 이전 색상 제거
      randomCell.classList.remove('red', 'blue', 'green');

      // 새 색상 랜덤 지정 (빨강, 파랑, 초록)
      const colors = ['red', 'blue', 'green'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      randomCell.classList.add(randomColor);
    }
  }, baseInterval);
}

// 점수가 높아질수록 interval을 점점 빠르게
function adjustSpeed() {
  if (selectedMode !== 'speed' && selectedMode !== 'mix') return;
  // 최저한의 인터벌(200ms)까지만 줄어들도록 제한
  let newInterval = 1000 - (score * 10);
  if (newInterval < 200) {
    newInterval = 200;
  }
  // interval이 바뀌었다면, clear 후 다시 start
  if (newInterval !== baseInterval) {
    baseInterval = newInterval;
    clearInterval(flickerIntervalId);
    startFlicker();
  }
}

// 해골과 천사 등장 스케줄링 함수
function startPatternMode() {
  patternIntervalId = setInterval(() => {
    if (isGameOver) return;
    runPatternTick();
  }, 800);
}

function runPatternTick() {
  if (!activePattern || patternStep >= activePattern.duration) {
    activePattern = pickRandomPattern();
    patternStep = 0;
  }
  activePattern.apply(patternStep);
  patternStep++;
}

function pickRandomPattern() {
  const patterns = [rowSweepPattern, columnSweepPattern, crossPulsePattern, checkerPattern, ringPulsePattern];
  patternSeed++;
  const index = patternSeed % patterns.length;
  return patterns[index];
}

function setCellColor(cell, color) {
  if (!cell) return;
  if (cell.classList.contains('skull') || cell.classList.contains('angel') || cell.classList.contains('clicked')) return;
  cell.classList.remove('red', 'blue', 'green');
  cell.classList.add(color);
}

function getCell(row, col) {
  if (row < 0 || col < 0 || row >= gridSize || col >= gridSize) return null;
  return cells[row * gridSize + col];
}

const rowSweepPattern = {
  name: 'rowSweep',
  duration: gridSize,
  apply(step) {
    const row = step % gridSize;
    for (let col = 0; col < gridSize; col++) {
      setCellColor(getCell(row, col), 'blue');
      setCellColor(getCell(row - 1, col), 'green');
    }
  }
};

const columnSweepPattern = {
  name: 'columnSweep',
  duration: gridSize,
  apply(step) {
    const col = step % gridSize;
    for (let row = 0; row < gridSize; row++) {
      setCellColor(getCell(row, col), 'red');
      setCellColor(getCell(row, col - 1), 'green');
    }
  }
};

const crossPulsePattern = {
  name: 'crossPulse',
  duration: 2,
  apply(step) {
    const mid = Math.floor(gridSize / 2);
    const color = step % 2 === 0 ? 'blue' : 'red';
    for (let i = 0; i < gridSize; i++) {
      setCellColor(getCell(mid, i), color);
      setCellColor(getCell(i, mid), color);
    }
  }
};

const checkerPattern = {
  name: 'checker',
  duration: 2,
  apply(step) {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const isEven = (row + col + step) % 2 === 0;
        setCellColor(getCell(row, col), isEven ? 'blue' : 'red');
      }
    }
  }
};

const ringPulsePattern = {
  name: 'ringPulse',
  duration: 3,
  apply(step) {
    const outer = step % 2 === 0 ? 'red' : 'blue';
    const inner = step % 2 === 0 ? 'green' : 'blue';
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const isEdge = row === 0 || col === 0 || row === gridSize - 1 || col === gridSize - 1;
        setCellColor(getCell(row, col), isEdge ? outer : inner);
      }
    }
  }
};

function getSelectedMode() {
  return selectedMode || 'speed';
}

function setSelectedMode(mode) {
  selectedMode = mode;
  currentScoreMode = mode;
  updateModeLabel();
  updateModeButtons();
  updateScoreModeButtons();
  loadInitialHighScores(selectedMode);
}

function setScoreMode(mode) {
  currentScoreMode = mode;
  updateScoreModeButtons();
  displayHighScores(currentScoreMode);
}

function updateModeButtons() {
  modeButtons.forEach(button => {
    const mode = button.getAttribute('data-mode');
    button.classList.toggle('active', mode === selectedMode);
  });
}

function updateScoreModeButtons() {
  scoreModeButtons.forEach(button => {
    const mode = button.getAttribute('data-mode');
    button.classList.toggle('active', mode === currentScoreMode);
  });
}

function updateModeLabel() {
  if (!modeLabel) return;
  let label = 'Mode: Speed';
  if (selectedMode === 'pattern') label = 'Mode: Pattern';
  if (selectedMode === 'mix') label = 'Mode: Speed + Pattern';
  modeLabel.textContent = label;
}

function scheduleEntities(entityType, totalEntities, minTime, maxTime) {
  for (let i = 0; i < totalEntities; i++) {
    const randomTime = Math.floor(Math.random() * (maxTime - minTime)) + minTime;
    const timeoutId = setTimeout(() => showEntity(entityType), randomTime);
    if (entityType === 'skull') {
      skullTimeoutIds.push(timeoutId);
    } else if (entityType === 'angel') {
      angelTimeoutIds.push(timeoutId);
    }
  }
}

// 해골과 천사 등장 함수
function showEntity(entityType) {
  if (isGameOver) return;

  if (entityType === 'skull') {
    if (skullCount >= 3) return;
  } else if (entityType === 'angel') {
    if (angelCount >= 3) return;
  }

  let targetCells;
  if (entityType === 'skull') {
    // 현재 빨간색 칸만 필터링
    targetCells = Array.from(cells).filter(cell => cell.classList.contains('red') && !cell.classList.contains('skull') && !cell.classList.contains('angel'));
  } else if (entityType === 'angel') {
    // 현재 파란색 칸만 필터링
    targetCells = Array.from(cells).filter(cell => cell.classList.contains('blue') && !cell.classList.contains('skull') && !cell.classList.contains('angel'));
  }

  if (targetCells.length === 0) return; // 해당 색상 칸이 없으면 종료

  const randomIndex = Math.floor(Math.random() * targetCells.length);
  const targetCell = targetCells[randomIndex];

  // 해당 칸에 해골 또는 천사 클래스 추가
  targetCell.classList.add(entityType);

  // 등장 사운드 재생
  if (entityType === 'skull') {
    if (skullSound) {
      skullSound.currentTime = 0;
      skullSound.play();
    }
    skullCount++;
  } else if (entityType === 'angel') {
    if (angelSound) {
      angelSound.currentTime = 0;
      angelSound.play();
    }
    angelCount++;
  }

  // 해당 칸이 5초 후에 자동으로 제거되도록 타이머 설정
  const removeTimeoutId = setTimeout(() => {
    targetCell.classList.remove(entityType);
    const colors = ['red', 'blue', 'green'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    targetCell.classList.add(randomColor);
    targetCell.removeAttribute('data-remove-timer');
  }, 5000); // 5초 후 제거

  if (entityType === 'skull') {
    removeSkullTimeoutIds.push(removeTimeoutId);
    targetCell.setAttribute('data-remove-timer', removeTimeoutId);
  } else if (entityType === 'angel') {
    removeAngelTimeoutIds.push(removeTimeoutId);
    targetCell.setAttribute('data-remove-timer', removeTimeoutId);
  }
}

function handleCellClick(cell) {
  if (isGameOver) return; // 게임 종료 후 클릭 무시

  // 해골 칸 클릭 시 -100점 처리
  if (cell.classList.contains('skull')) {
    score -= 100;
    scoreDisplay.textContent = `점수: ${score}`;
    warningSound.currentTime = 0;
    warningSound.play();

    // 해골 칸을 다시 원래 색상으로 되돌림
    cell.classList.remove('skull');
    const colors = ['red', 'blue', 'green'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    cell.classList.add(randomColor);

    // 해당 셀의 제거 타이머 정리
    const removeTimeoutId = cell.getAttribute('data-remove-timer');
    if (removeTimeoutId) {
      clearTimeout(removeTimeoutId);
      cell.removeAttribute('data-remove-timer');
      // removeSkullTimeoutIds 배열에서 해당 타이머 제거
      removeSkullTimeoutIds = removeSkullTimeoutIds.filter(id => id !== parseInt(removeTimeoutId));
    }

    return;
  }

  // 천사 칸 클릭 시 +100점 처리
  if (cell.classList.contains('angel')) {
    score += 100;
    scoreDisplay.textContent = `점수: ${score}`;
    successSound.currentTime = 0;
    successSound.play();

    // 천사 칸을 다시 원래 색상으로 되돌림
    cell.classList.remove('angel');
    const colors = ['red', 'blue', 'green'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    cell.classList.add(randomColor);

    // 해당 셀의 제거 타이머 정리
    const removeTimeoutId = cell.getAttribute('data-remove-timer');
    if (removeTimeoutId) {
      clearTimeout(removeTimeoutId);
      cell.removeAttribute('data-remove-timer');
      // removeAngelTimeoutIds 배열에서 해당 타이머 제거
      removeAngelTimeoutIds = removeAngelTimeoutIds.filter(id => id !== parseInt(removeTimeoutId));
    }

    return;
  }

  // 현재 색상 확인 후 점수 업데이트
  if (cell.classList.contains('red')) {
    score -= 5;
    warningSound.currentTime = 0;
    warningSound.play();
  } else if (cell.classList.contains('blue')) {
    score += 5;
    successSound.currentTime = 0;
    successSound.play();
  }
  // green은 점수 변화 없음

  scoreDisplay.textContent = `점수: ${score}`;

  // 속도 조절
  adjustSpeed();

  // 방금 클릭한 셀이 회색으로 변경되고, 일정 시간 후 다시 랜덤 색상으로 변경
  cell.classList.remove('red', 'blue', 'green');
  cell.classList.add('clicked', 'clicked-effect');

  // 클릭 시 시각적 효과 (애니메이션 재생)
  setTimeout(() => {
    cell.classList.remove('clicked-effect');
  }, 300); // 애니메이션 지속 시간과 일치

  // 버튼이 회색으로 변경된 후 랜덤 색상으로 돌아감
  setTimeout(() => {
    cell.classList.remove('clicked');
    const colors = ['red', 'blue', 'green'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    cell.classList.add(randomColor);
  }, 300); // 300ms 동안 회색 유지
}

// 더블클릭 방지
gameGrid.addEventListener('dblclick', (e) => {
  e.preventDefault();
});

// 터치 이벤트에서 더블 탭 방지 (모바일)
let lastTap = 0;
document.addEventListener('touchstart', function(event) {
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTap;
  if (tapLength < 300 && tapLength > 0) {
    event.preventDefault();
  }
  lastTap = currentTime;
}, false);

// 이름 입력 모달 닫기 기능
const closeButtons = document.querySelectorAll('.close');
closeButtons.forEach(btn => {
  btn.onclick = function() {
    if (btn.closest('#nameModal')) {
      nameModal.style.display = 'none';
    }
    if (btn.closest('#highScoresModal')) {
      highScoresModal.style.display = 'none';
    }
  };
});

// 제출 버튼 클릭 시
submitNameButton.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (username === "") {
    alert("이름을 입력해주세요.");
    return;
  }
  saveScore(username, score);
  currentScoreMode = selectedMode;
  updateScoreModeButtons();
  currentScoreMode = selectedMode;
  updateScoreModeButtons();
  nameModal.style.display = 'none';
  highScoresModal.style.display = 'block';
  displayHighScores(currentScoreMode);
});

// 닫기 버튼 클릭 시
closeModalButton.addEventListener('click', () => {
  currentScoreMode = selectedMode;
  updateScoreModeButtons();
  nameModal.style.display = 'none';
  highScoresModal.style.display = 'block';
  displayHighScores(currentScoreMode);
});

// 홈 버튼 클릭 시
homeButton.addEventListener('click', () => {
  highScoresModal.style.display = 'none';
  window.location.reload(); // 페이지 새로고침하여 초기화
});

// Firebase에 점수 저장
function saveScore(username, score) {
  db.collection("highScores").add({
    name: username,
    score: score,
    mode: selectedMode,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    console.log("점수가 저장되었습니다.");
  })
  .catch((error) => {
    console.error("점수 저장 오류: ", error);
  });
}

// Firebase에서 높은 점수 순으로 불러오기
function displayHighScores(mode) {
  highScoresList.innerHTML = ""; // ?? ??? ???
  db.collection("highScores")
    .where("mode", "==", mode)
    .orderBy("score", "desc")
    .limit(10)
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        const listItem = document.createElement('li');
        listItem.textContent = 'No scores yet.';
        highScoresList.appendChild(listItem);
        return;
      }
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const listItem = document.createElement('li');
        listItem.textContent = `${data.name}: ${data.score} pts`;

        highScoresList.appendChild(listItem);
      });
    })
    .catch((error) => {
      console.error('?? ???? ??: ', error);
    });
}

// 시작 화면에서 초기 높은 점수 로드
function loadInitialHighScores(mode) {
  initialHighScoresList.innerHTML = ""; // ?? ??? ???
  db.collection("highScores")
    .where("mode", "==", mode)
    .orderBy("score", "desc")
    .limit(5)
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        const listItem = document.createElement('li');
        listItem.textContent = 'No scores yet.';
        initialHighScoresList.appendChild(listItem);
        return;
      }
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const listItem = document.createElement('li');
        listItem.textContent = `${data.name}: ${data.score} pts`;

        initialHighScoresList.appendChild(listItem);
      });
    })
    .catch((error) => {
      console.error('?? ?? ???? ??: ', error);
    });
}

// 게임 상태 초기화 함수
function resetGame() {
  // 게임 화면 숨기기
  gameScreen.style.display = 'none';

  // 모든 셀 초기화
  cells.forEach(cell => {
    cell.classList.remove('red', 'blue', 'green', 'skull', 'angel', 'clicked', 'clicked-effect');
    const colors = ['red', 'blue', 'green'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    cell.classList.add(randomColor);
  });

  // 타이머 및 점수 초기화
  score = 0;
  timeLeft = 60;

  // 타이머 및 점수 표시 업데이트
  scoreDisplay.textContent = `점수: ${score}`;
  timerDisplay.textContent = `남은 시간: ${timeLeft}초`;

  // 인터벌 및 타이머 정리
  clearInterval(flickerIntervalId);
  clearInterval(gameIntervalId);
  clearInterval(patternIntervalId);
  activePattern = null;
  patternStep = 0;
  skullTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  removeSkullTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  angelTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  removeAngelTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
  skullTimeoutIds = [];
  removeSkullTimeoutIds = [];
  angelTimeoutIds = [];
  removeAngelTimeoutIds = [];

  // baseInterval 초기화
  baseInterval = 1000;

  // 타이머 및 깜빡임 상태 초기화
  isGameOver = false;
}
