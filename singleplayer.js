var playerRed = "R";
var playerYellow = "Y";
var currPlayer = playerYellow;

var gameOver = false;
var board;

var rows = 6;
var columns = 7;
var currColumns = []; // Tracks next available row per column
var AI_DEPTH = 4;

window.onload = function() {
    setGame();
};

function setGame() {
    board = [];
    currColumns = Array(columns).fill(rows - 1);

    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < columns; c++) {
            row.push(' ');
            let tile = document.createElement("div");
            tile.id = `${r}-${c}`;
            tile.classList.add("tile");
            tile.addEventListener("click", setPiece);
            document.getElementById("board").append(tile);
        }
        board.push(row);
    }
    resetGame();
}

function setPiece() {
    if (gameOver || currPlayer !== playerYellow) return;

    let c = parseInt(this.id.split("-")[1]);
    let r = currColumns[c];
    if (r < 0) return;

    board[r][c] = currPlayer;
    updateTile(r, c, "yellow-piece");
    currColumns[c]--;
    checkWinner();

    if (!gameOver) {
        currPlayer = playerRed;
        setTimeout(() => aiMove(), 300); // small delay to simulate thinking
    }
}

function aiMove() {
    const [bestCol] = minimax(cloneBoard(board), [...currColumns], AI_DEPTH, -Infinity, Infinity, true);
    if (bestCol === null || currColumns[bestCol] < 0) return;

    let r = currColumns[bestCol];
    board[r][bestCol] = playerRed;
    updateTile(r, bestCol, "red-piece");
    currColumns[bestCol]--;
    checkWinner();

    if (!gameOver) {
        currPlayer = playerYellow;
    }
}

function updateTile(r, c, className) {
    document.getElementById(`${r}-${c}`).classList.add(className);
}

function checkWinner() {
    const directions = [
        [[0, 1], [0, 2], [0, 3]],
        [[1, 0], [2, 0], [3, 0]],
        [[1, 1], [2, 2], [3, 3]],
        [[-1, 1], [-2, 2], [-3, 3]]
    ];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (board[r][c] === ' ') continue;
            let curr = board[r][c];
            for (let dir of directions) {
                if (dir.every(([dr, dc]) => {
                    let nr = r + dr, nc = c + dc;
                    return nr >= 0 && nr < rows && nc >= 0 && nc < columns && board[nr][nc] === curr;
                })) {
                    setWinner(r, c);
                    return;
                }
            }
        }
    }

    if (currColumns.every(h => h < 0)) {
        document.getElementById("winner").innerText = "It's a draw!";
        gameOver = true;
        document.getElementById("resetText").innerText = "Click space to reset game";
        resetGame();
    }
}

function setWinner(r, c) {
    let winner = board[r][c] === playerRed ? "Red (AI)" : "Yellow (You)";


    
    document.getElementById("winner").innerText = `${winner} Wins!`;
    gameOver = true;
    document.getElementById("resetText").innerText = "Click space to reset game";
    resetGame();
}

function resetGame() {
    document.addEventListener("keydown", function(event) {
        if (event.key === " ") {
            window.location.reload();
        }
    });
}

// ----- AI Code -----

function cloneBoard(board) {
    return board.map(row => [...row]);
}

function getValidMoves(columns) {
    return columns.map((val, idx) => (val >= 0 ? idx : null)).filter(v => v !== null);
}

function drop(board, columns, col, piece) {
    let row = columns[col];
    if (row < 0) return [board, columns];

    let newBoard = cloneBoard(board);
    let newCols = [...columns];
    newBoard[row][col] = piece;
    newCols[col]--;
    return [newBoard, newCols];
}

function evaluate(board, piece) {
    let score = 0;
    const opponent = piece === playerRed ? playerYellow : playerRed;

    // Score center column
    const centerArray = board.map(row => row[Math.floor(columns / 2)]);
    const centerCount = centerArray.filter(cell => cell === piece).length;
    score += centerCount * 6;

    // Horizontal
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns - 3; c++) {
            const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
            score += evaluateWindow(window, piece, opponent);
        }
    }

    // Vertical
    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows - 3; r++) {
            const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
            score += evaluateWindow(window, piece, opponent);
        }
    }

    // Positive diagonals
    for (let r = 0; r < rows - 3; r++) {
        for (let c = 0; c < columns - 3; c++) {
            const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
            score += evaluateWindow(window, piece, opponent);
        }
    }

    // Negative diagonals
    for (let r = 3; r < rows; r++) {
        for (let c = 0; c < columns - 3; c++) {
            const window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
            score += evaluateWindow(window, piece, opponent);
        }
    }

    return score;
}

function evaluateWindow(window, piece, opponent) {
    const count = val => window.filter(x => x === val).length;
    let score = 0;

    if (count(piece) === 4) score += 1000;
    else if (count(piece) === 3 && count(' ') === 1) score += 50;
    else if (count(piece) === 2 && count(' ') === 2) score += 10;

    if (count(opponent) === 3 && count(' ') === 1) score -= 80;
    if (count(opponent) === 4) score -= 1000;

    return score;
}

function minimax(board, columns, depth, alpha, beta, maximizing) {
    const validMoves = getValidMoves(columns);
    if (depth === 0 || validMoves.length === 0) {
        return [null, evaluate(board, playerRed)];
    }

    if (maximizing) {
        let maxEval = -Infinity;
        let bestCol = null;
        for (let col of validMoves) {
            const [newBoard, newCols] = drop(board, columns, col, playerRed);
            const [_, evalScore] = minimax(newBoard, newCols, depth - 1, alpha, beta, false);
            if (evalScore > maxEval) {
                maxEval = evalScore;
                bestCol = col;
            }
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return [bestCol, maxEval];
    } else {
        let minEval = Infinity;
        let bestCol = null;
        for (let col of validMoves) {
            const [newBoard, newCols] = drop(board, columns, col, playerYellow);
            const [_, evalScore] = minimax(newBoard, newCols, depth - 1, alpha, beta, true);
            if (evalScore < minEval) {
                minEval = evalScore;
                bestCol = col;
            }
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return [bestCol, minEval];
    }
}
