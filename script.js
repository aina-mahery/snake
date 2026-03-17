const playBoard = document.querySelector(".play-board");
const scoreElement = document.querySelector(".score");
const highscoreElement = document.querySelector(".highscore");
const pauseHintElement = document.querySelector(".pause-hint");

const gameOverModal = document.getElementById("gameOverModal");
const difficultyModal = document.getElementById("difficultyModal");
const pauseModal = document.getElementById("pauseModal");
const finalScoreElement = document.getElementById("finalScore");

const BOARD_SIZE = 30;

let foodX, foodY;
let snakeX = 5;
let snakeY = 10;
let snakeBody = [];
let velocityX = 0;
let velocityY = 0;

let score = 0;
let highScore = Number(localStorage.getItem("highScore")) || 0;
let gamesPlayed = Number(localStorage.getItem("gamesPlayed")) || 0;

let gameInterval = null;
let gameOverState = false;
let gameSpeed = 125;
let isPaused = false;
let foodType = "normal"; // normal, golden, icy
let isGameStarted = false;

// Audio
let audioCtx = null;

/* =========================
   OUTILS / HELPERS
========================= */

const updateScoreDisplay = () => {
  scoreElement.textContent = `Score : ${score}`;
  highscoreElement.textContent = `Meilleur score : ${highScore}`;
};

const resetGameState = () => {
  snakeX = 5;
  snakeY = 10;
  snakeBody = [];
  velocityX = 0;
  velocityY = 0;
  score = 0;
  gameOverState = false;
  isPaused = false;
  isGameStarted = false;

  clearInterval(gameInterval);
  gameInterval = null;

  updateScoreDisplay();
  scoreElement.classList.remove("score-pop");
};

const animateScore = () => {
  scoreElement.classList.remove("score-pop");
  void scoreElement.offsetWidth; // relance l'animation
  scoreElement.classList.add("score-pop");
};

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
};

const playSound = (type) => {
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  switch (type) {
    case "eat":
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.1);
      break;

    case "golden":
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
      break;

    case "icy":
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case "gameover":
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
      break;
  }
};

const getRandomFoodType = () => {
  const rand = Math.random();
  if (rand < 0.2) return "golden";
  if (rand < 0.3) return "icy";
  return "normal";
};

const changeFoodPosition = () => {
  let validPosition = false;

  while (!validPosition) {
    foodX = Math.floor(Math.random() * BOARD_SIZE) + 1;
    foodY = Math.floor(Math.random() * BOARD_SIZE) + 1;
    foodType = getRandomFoodType();

    const onSnakeHead = foodX === snakeX && foodY === snakeY;
    const onSnakeBody = snakeBody.some(segment => foodX === segment[0] && foodY === segment[1]);

    if (!onSnakeHead && !onSnakeBody) {
      validPosition = true;
    }
  }
};

const renderGame = () => {
  let foodClass = "food";
  if (foodType === "golden") foodClass += " golden";
  else if (foodType === "icy") foodClass += " icy";

  let htmlMarkup = `<div class="${foodClass}" style="grid-area: ${foodY} / ${foodX}"></div>`;
  htmlMarkup += `<div class="head" style="grid-area: ${snakeY} / ${snakeX}"></div>`;

  for (let i = 0; i < snakeBody.length; i++) {
    htmlMarkup += `<div class="body" style="grid-area: ${snakeBody[i][1]} / ${snakeBody[i][0]}"></div>`;
  }

  playBoard.innerHTML = htmlMarkup;
};

/* =========================
   GESTION DU JEU
========================= */

const gameOver = () => {
  if (gameOverState) return;

  clearInterval(gameInterval);
  gameInterval = null;
  gameOverState = true;
  isGameStarted = false;

  playSound("gameover");

  gamesPlayed++;
  localStorage.setItem("gamesPlayed", gamesPlayed);

  finalScoreElement.textContent = score;
  gameOverModal.style.display = "flex";
};

const initGame = () => {
  if (isPaused || gameOverState) return;

  const tailX = snakeBody.length ? snakeBody[snakeBody.length - 1][0] : snakeX;
  const tailY = snakeBody.length ? snakeBody[snakeBody.length - 1][1] : snakeY;

  snakeX += velocityX;
  snakeY += velocityY;

  // Collision avec les bords
  if (snakeX < 1 || snakeX > BOARD_SIZE || snakeY < 1 || snakeY > BOARD_SIZE) {
    gameOver();
    return;
  }

  // Collision avec soi-même
  for (let i = 0; i < snakeBody.length; i++) {
    if (snakeX === snakeBody[i][0] && snakeY === snakeBody[i][1]) {
      gameOver();
      return;
    }
  }

  // Manger la nourriture
  if (snakeX === foodX && snakeY === foodY) {
    switch (foodType) {
      case "golden":
        score += 5;
        playSound("golden");
        break;
      case "icy":
        score += 3;
        playSound("icy");
        break;
      default:
        score += 1;
        playSound("eat");
    }

    snakeBody.push([tailX, tailY]);
    changeFoodPosition();

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
    }

    updateScoreDisplay();
    animateScore();
  }

  // Déplacement du corps
  for (let i = snakeBody.length - 1; i > 0; i--) {
    snakeBody[i] = snakeBody[i - 1];
  }

  if (snakeBody.length > 0) {
    snakeBody[0] = [snakeX - velocityX, snakeY - velocityY];
  }

  renderGame();
};

const startGame = (difficulty) => {
  initAudio();
  resetGameState();

  switch (difficulty) {
    case "easy":
      gameSpeed = 200;
      break;
    case "medium":
      gameSpeed = 125;
      break;
    case "hard":
      gameSpeed = 75;
      break;
    default:
      gameSpeed = 125;
  }

  changeFoodPosition();
  renderGame();

  difficultyModal.style.display = "none";
  gameOverModal.style.display = "none";
  pauseModal.style.display = "none";

  gameInterval = setInterval(initGame, gameSpeed);
};

const restartGame = () => {
  resetGameState();
  gameOverModal.style.display = "none";
  difficultyModal.style.display = "flex";
  playBoard.innerHTML = "";
};

const togglePause = () => {
  if (gameOverState || !isGameStarted) return;

  if (isPaused) {
    resumeGame();
  } else {
    isPaused = true;
    clearInterval(gameInterval);
    gameInterval = null;
    pauseModal.style.display = "flex";
  }
};

const resumeGame = () => {
  if (gameOverState) return;

  isPaused = false;
  pauseModal.style.display = "none";

  clearInterval(gameInterval);
  gameInterval = setInterval(initGame, gameSpeed);
};

const quitToMenu = () => {
  clearInterval(gameInterval);
  gameInterval = null;

  isPaused = false;
  gameOverState = false;
  isGameStarted = false;

  pauseModal.style.display = "none";
  gameOverModal.style.display = "none";
  difficultyModal.style.display = "flex";

  playBoard.innerHTML = "";
};

/* =========================
   CONTRÔLES CLAVIER
========================= */

const changeDirection = (e) => {
  // Gestion de la pause même si le jeu est en cours
  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    togglePause();
    return;
  }

  if (gameOverState || isPaused) return;

  initAudio();

  if (e.key === "ArrowUp" && velocityY !== 1) {
    velocityX = 0;
    velocityY = -1;
    isGameStarted = true;
  } else if (e.key === "ArrowDown" && velocityY !== -1) {
    velocityX = 0;
    velocityY = 1;
    isGameStarted = true;
  } else if (e.key === "ArrowLeft" && velocityX !== 1) {
    velocityX = -1;
    velocityY = 0;
    isGameStarted = true;
  } else if (e.key === "ArrowRight" && velocityX !== -1) {
    velocityX = 1;
    velocityY = 0;
    isGameStarted = true;
  }
};

/* =========================
   CONTRÔLES TACTILES
========================= */

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    initAudio();
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  (e) => {
    if (gameOverState || isPaused) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const minSwipe = 30;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Swipe horizontal
      if (Math.abs(diffX) > minSwipe) {
        if (diffX > 0 && velocityX !== -1) {
          velocityX = 1;
          velocityY = 0;
          isGameStarted = true;
        } else if (diffX < 0 && velocityX !== 1) {
          velocityX = -1;
          velocityY = 0;
          isGameStarted = true;
        }
      }
    } else {
      // Swipe vertical
      if (Math.abs(diffY) > minSwipe) {
        if (diffY > 0 && velocityY !== -1) {
          velocityX = 0;
          velocityY = 1;
          isGameStarted = true;
        } else if (diffY < 0 && velocityY !== 1) {
          velocityX = 0;
          velocityY = -1;
          isGameStarted = true;
        }
      }
    }
  },
  { passive: true }
);

/* =========================
   INITIALISATION
========================= */

// On cache complètement l'indication de pause pour qu'elle
// ne s'affiche pas dans le cadre du jeu
if (pauseHintElement) {
  pauseHintElement.style.display = "none";
}

updateScoreDisplay();
difficultyModal.style.display = "flex";

document.addEventListener("keydown", changeDirection);

// Rend les fonctions accessibles aux boutons HTML onclick
window.startGame = startGame;
window.restartGame = restartGame;
window.resumeGame = resumeGame;
window.quitToMenu = quitToMenu;
