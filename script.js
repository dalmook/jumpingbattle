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

const gameScreen = document.getElementById('gameScreen');
const gameGrid = document.getElementById('gameGrid');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');

const warningSound = document.getElementById('warningSound');
const successSound = document.getElementById('successSound');

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
let isGameOver = false;

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

// 게임 시작 화면에서 높은 점수 로드
loadInitialHighScores();

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
  timeLeft = 60; // 60초로 변경
  scoreDisplay.textContent = `점수: ${score}`;
  timerDisplay.textContent = `남은 시간: ${timeLeft}초`;

  // 모든 셀 초기화
  cells.forEach(cell => {
    cell.classList.remove('red', 'blue', 'green', 'clicked', 'clicked-effect');
    const colors = ['red', 'blue', 'green'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    cell.classList.add(randomColor);
  });

  // 깜빡임 시작
  startFlicker();

  // 타이머 시작
  gameIntervalId = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `남은 시간: ${timeLeft}초`;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  isGameOver = true;
  clearInterval(flickerIntervalId);
  clearInterval(gameIntervalId);

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

function handleCellClick(cell) {
  if (isGameOver) return; // 게임 종료 후 클릭 무시

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
  nameModal.style.display = 'none';
  highScoresModal.style.display = 'block';
  displayHighScores();
});

// 닫기 버튼 클릭 시
closeModalButton.addEventListener('click', () => {
  nameModal.style.display = 'none';
  highScoresModal.style.display = 'block';
  displayHighScores();
});

// 홈 버튼 클릭 시
homeButton.addEventListener('click', () => {
  highScoresModal.style.display = 'none';
  window.location.reload(); // 페이지 새로고침하여 초기화
});

// 기존의 window.onclick 이벤트 리스너를 제거했습니다.
// 이로 인해 모달 외부를 클릭해도 모달이 닫히지 않습니다.

// Firebase에 점수 저장
function saveScore(username, score) {
  db.collection("highScores").add({
    name: username,
    score: score,
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
function displayHighScores() {
  highScoresList.innerHTML = ""; // 기존 리스트 초기화
  db.collection("highScores")
    .orderBy("score", "desc")
    .limit(10) // 상위 10개만 표시
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const listItem = document.createElement('li');
        listItem.textContent = `${data.name}: ${data.score}점`;
        highScoresList.appendChild(listItem);
      });
    })
    .catch((error) => {
      console.error("점수 불러오기 오류: ", error);
    });
}

// 시작 화면에서 초기 높은 점수 로드
function loadInitialHighScores() {
  initialHighScoresList.innerHTML = ""; // 기존 리스트 초기화
  db.collection("highScores")
    .orderBy("score", "desc")
    .limit(5) // 상위 5개만 표시
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const listItem = document.createElement('li');
        listItem.textContent = `${data.name}: ${data.score}점`;
        initialHighScoresList.appendChild(listItem);
      });
    })
    .catch((error) => {
      console.error("초기 점수 불러오기 오류: ", error);
    });
}

// 게임 상태 초기화 함수
function resetGame() {
  // 게임 화면 숨기기
  gameScreen.style.display = 'none';
  
  // 모든 셀 초기화
  cells.forEach(cell => {
    cell.classList.remove('red', 'blue', 'green', 'clicked', 'clicked-effect');
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

  // 인터벌 클리어
  clearInterval(flickerIntervalId);
  clearInterval(gameIntervalId);

  // baseInterval 초기화
  baseInterval = 1000;

  // 타이머 및 깜빡임 상태 초기화
  isGameOver = false;
}
