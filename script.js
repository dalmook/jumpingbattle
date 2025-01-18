const gridSize = 5;
const gameGrid = document.getElementById('gameGrid');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const warningSound = document.getElementById('warningSound');
const successSound = document.getElementById('successSound');

let score = 0;
let timeLeft = 30; // 30초
let gameIntervalId;
let flickerIntervalId;
let isGameOver = false;

// baseInterval을 startFlicker 호출 전에 선언
let baseInterval = 1000; // 기본 속도 (1초)

// 각 칸을 생성해서 grid에 추가
for (let i = 0; i < gridSize * gridSize; i++) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.addEventListener('click', () => handleCellClick(cell));
  gameGrid.appendChild(cell);
}

// 셀들을 배열로 가져오기
const cells = document.querySelectorAll('.cell');

// 게임 시작 시 타이머와 깜빡임 시작
startGame();

function startGame() {
  isGameOver = false;
  score = 0;
  timeLeft = 30;
  scoreDisplay.textContent = `점수: ${score}`;
  timerDisplay.textContent = `남은 시간: ${timeLeft}초`;

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
  alert(`게임 종료! 최종 점수: ${score}`);
  // 게임을 재시작할지 여부를 묻는 옵션 추가 가능
}

// 셀이 일정 간격으로 색이 바뀌도록 하는 함수
function startFlicker() {
  flickerIntervalId = setInterval(() => {
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
