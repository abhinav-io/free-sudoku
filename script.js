document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const boardEl = document.getElementById('sudoku-board');
    const modeSelect = document.getElementById('mode-select');
    const difficultySelect = document.getElementById('difficulty-select');
    const difficultyGroup = document.getElementById('difficulty-group');
    const inputPanel = document.getElementById('input-panel');
    const newGameBtn = document.getElementById('new-game-btn');
    const clearBtn = document.getElementById('clear-btn');

    // State Variables
    let mode = '9x9'; // '9x9' or '4x4'
    let size = 9;
    let boxSize = 3;
    let selectedCell = null;
    let solutionMatrix = [];
    let initialMatrix = [];
    let currentMatrix = [];

    // Initialize Game
    initGame();

    // Event Listeners
    modeSelect.addEventListener('change', (e) => {
        mode = e.target.value;
        if (mode === '4x4') {
            size = 4;
            boxSize = 2;
            difficultyGroup.style.visibility = 'hidden';
        } else {
            size = 9;
            boxSize = 3;
            difficultyGroup.style.visibility = 'visible';
        }
        setupBoardClass();
        generateNewPuzzle();
    });

    difficultySelect.addEventListener('change', generateNewPuzzle);
    newGameBtn.addEventListener('click', generateNewPuzzle);
    clearBtn.addEventListener('click', clearUserEntries);

    // Keyboard navigation/input setup
    document.addEventListener('keydown', handleKeyDown);

    function initGame() {
        setupBoardClass();
        generateNewPuzzle();
    }

    function setupBoardClass() {
        boardEl.className = mode === '9x9' ? 'mode-9x9' : 'mode-4x4';
    }

    // --- Core Puzzle Logic (Generation & Solving) ---
    function generateNewPuzzle() {
        selectedCell = null;
        
        // 1. Generate fully filled valid board
        solutionMatrix = Array.from({ length: size }, () => Array(size).fill(0));
        fillBoard(solutionMatrix);

        // 2. Clone to make initial board template
        initialMatrix = solutionMatrix.map(row => [...row]);

        // 3. Remove cells based on target counts
        let cluesToRemove = 0;
        if (mode === '4x4') {
            cluesToRemove = 7; // Leave ~9 clues out of 16
        } else {
            const diff = difficultySelect.value;
            if (diff === 'easy') cluesToRemove = 35;       // ~46 left
            else if (diff === 'medium') cluesToRemove = 46; // ~35 left
            else cluesToRemove = 53;                       // ~28 left
        }

        removeClues(initialMatrix, cluesToRemove);

        // 4. Set current matrix state
        currentMatrix = initialMatrix.map(row => [...row]);

        // Render UI
        renderBoardUI();
        renderInputPanel();
    }

    function fillBoard(matrix) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (matrix[row][col] === 0) {
                    const numbers = shuffleArray(Array.from({ length: size }, (_, i) => i + 1));
                    for (let num of numbers) {
                        if (isValidMove(matrix, row, col, num)) {
                            matrix[row][col] = num;
                            if (fillBoard(matrix)) return true;
                            matrix[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function isValidMove(matrix, row, col, num) {
        // Check row and column
        for (let i = 0; i < size; i++) {
            if (matrix[row][i] === num || matrix[i][col] === num) return false;
        }
        // Check sub-grid box
        const startRow = Math.floor(row / boxSize) * boxSize;
        const startCol = Math.floor(col / boxSize) * boxSize;
        for (let r = 0; r < boxSize; r++) {
            for (let c = 0; c < boxSize; c++) {
                if (matrix[startRow + r][startCol + c] === num) return false;
            }
        }
        return true;
    }

    function removeClues(matrix, count) {
        let attempts = count;
        while (attempts > 0) {
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);
            if (matrix[row][col] !== 0) {
                matrix[row][col] = 0;
                attempts--;
            }
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- UI Rendering Engine ---
    function renderBoardUI() {
        boardEl.innerHTML = '';
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cellVal = currentMatrix[r][c];
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (initialMatrix[r][c] !== 0) {
                    cell.textContent = cellVal;
                    cell.classList.add('initial');
                } else if (cellVal !== 0) {
                    cell.textContent = cellVal;
                    cell.classList.add('user-entered');
                }

                cell.addEventListener('click', () => handleCellSelection(cell, r, c));
                boardEl.appendChild(cell);
            }
        }
        runErrorChecker();
    }

    function renderInputPanel() {
        inputPanel.innerHTML = '';
        // Create number layout options
        for (let i = 1; i <= size; i++) {
            const btn = document.createElement('button');
            btn.classList.add('input-btn');
            btn.textContent = i;
            btn.addEventListener('click', () => handleInput(i));
            inputPanel.appendChild(btn);
        }
        // Add single Erase button that wraps gracefully
        const eraseBtn = document.createElement('button');
        eraseBtn.classList.add('input-btn', 'erase');
        eraseBtn.textContent = '⌫';
        eraseBtn.style.gridColumn = `span ${5 - (size % 5 === 0 ? 5 : size % 5)}`;
        eraseBtn.addEventListener('click', () => handleInput(0));
        inputPanel.appendChild(eraseBtn);
    }

    // --- Gameplay Interaction Rules ---
    function handleCellSelection(cell, row, col) {
        // Remove current crosshair highlight rules
        document.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('selected', 'highlighted');
        });

        selectedCell = { cell, row, col };
        cell.classList.add('selected');

        // Dynamic crosshair highlighting metrics
        const targetBoxRow = Math.floor(row / boxSize);
        const targetBoxCol = Math.floor(col / boxSize);

        document.querySelectorAll('.cell').forEach(c => {
            const r = parseInt(c.dataset.row);
            const _c = parseInt(c.dataset.col);
            const bRow = Math.floor(r / boxSize);
            const bCol = Math.floor(_c / boxSize);

            if (r === row || _c === col || (bRow === targetBoxRow && bCol === targetBoxCol)) {
                if (c !== cell) c.classList.add('highlighted');
            }
        });
    }

    function handleInput(num) {
        if (!selectedCell) return;
        const { cell, row, col } = selectedCell;

        // Block changing system defaults
        if (initialMatrix[row][col] !== 0) return;

        if (num === 0) {
            currentMatrix[row][col] = 0;
            cell.textContent = '';
            cell.classList.remove('user-entered');
        } else {
            currentMatrix[row][col] = num;
            cell.textContent = num;
            cell.classList.add('user-entered');
        }

        runErrorChecker();
        checkWinCondition();
    }

    function runErrorChecker() {
        // Clear previous error state structures
        const cells = document.querySelectorAll('.cell');
        cells.forEach(c => c.classList.remove('error'));

        // Validate conflicts matching constraints
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const val = currentMatrix[r][c];
                if (val === 0) continue;

                let hasConflict = false;

                // Validate Row/Col duplicates
                for (let i = 0; i < size; i++) {
                    if (i !== c && currentMatrix[r][i] === val) hasConflict = true;
                    if (i !== r && currentMatrix[i][c] === val) hasConflict = true;
                }

                // Validate Sub-grid duplicates
                const startRow = Math.floor(r / boxSize) * boxSize;
                const startCol = Math.floor(c / boxSize) * boxSize;
                for (let br = 0; br < boxSize; br++) {
                    for (let bc = 0; bc < boxSize; bc++) {
                        const curR = startRow + br;
                        const curC = startCol + bc;
                        if ((curR !== r || curC !== c) && currentMatrix[curR][curC] === val) {
                            hasConflict = true;
                        }
                    }
                }

                if (hasConflict) {
                    const errorCell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                    if (errorCell) errorCell.classList.add('error');
                }
            }
        }
    }

    function handleKeyDown(e) {
        if (!selectedCell) return;
        
        if (e.key >= '1' && parseInt(e.key) <= size) {
            handleInput(parseInt(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
            handleInput(0);
        } else {
            // Direction Arrow Key Navigation
            let r = selectedCell.row;
            let c = selectedCell.col;
            if (e.key === 'ArrowUp' && r > 0) r--;
            else if (e.key === 'ArrowDown' && r < size - 1) r++;
            else if (e.key === 'ArrowLeft' && c > 0) c--;
            else if (e.key === 'ArrowRight' && c < size - 1) c++;

            const nextCell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            if (nextCell) nextCell.click();
        }
    }

    function clearUserEntries() {
        currentMatrix = initialMatrix.map(row => [...row]);
        renderBoardUI();
        if (selectedCell) {
            const resetCell = document.querySelector(`.cell[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`);
            if (resetCell) resetCell.click();
        }
    }

    function checkWinCondition() {
        // Must match structural limits without faults
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (currentMatrix[r][c] === 0 || currentMatrix[r][c] !== solutionMatrix[r][c]) {
                    return; // Fail validation safely
                }
            }
        }
        setTimeout(() => {
            alert('🎉 Congratulations! You solved the puzzle perfectly!');
        }, 200);
    }
});
