let speakers = []; 
let currentDocket = 1;
let currentSpeech = 1;
let currentMode = 'speech';
let gridRows = 0;
let gridCols = 0;

function getSpeechPriorityList() {
    return [...speakers].sort((a, b) => {
        if (a.speechCount !== b.speechCount) {
            return a.speechCount - b.speechCount;
        }
        if (a.speechCount === 0) {
            return a.initialSpeechPrecedence - b.initialSpeechPrecedence;
        }
        const timeA = a.lastSpeechTime === "N/A" ? "00:00:00" : a.lastSpeechTime;
        const timeB = b.lastSpeechTime === "N/A" ? "00:00:00" : b.lastSpeechTime;
        return timeA.localeCompare(timeB);
    });
}

function getQuestionPriorityList() {
    return [...speakers].sort((a, b) => {
        const aNotAsked = a.lastQuestionTime === "N/A";
        const bNotAsked = b.lastQuestionTime === "N/A";

        if (aNotAsked && !bNotAsked) return -1;
        if (!aNotAsked && bNotAsked) return 1;

        if (aNotAsked && bNotAsked) {
            return a.initialQuestionPrecedence - b.initialQuestionPrecedence;
        }
        return a.lastQuestionTime.localeCompare(b.lastQuestionTime);
    });
}

function recordSpeech(seatId, durationStr) {
    const speaker = speakers.find(s => s.seatId === seatId);
    if (!speaker) return;

    speaker.speechCount++;
    speaker.lastSpeechTime = new Date().toTimeString().split(' ')[0]; 
    
    speaker.speechHistory.push({
        docketId: `${currentDocket}.${currentSpeech}`,
        duration: durationStr
    });
    
    currentSpeech++;
    saveState();
    renderGrid();
}

function recordQuestion(seatId) {
    const speaker = speakers.find(s => s.seatId === seatId);
    if (!speaker) return;
    speaker.lastQuestionTime = new Date().toTimeString().split(' ')[0];
    saveState();
    renderGrid();
}

function saveState() {
    const state = { speakers, currentDocket, currentSpeech, gridRows, gridCols };
    localStorage.setItem('uil_debate_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('uil_debate_state');
    if (saved) {
        const state = JSON.parse(saved);
        speakers = state.speakers || [];
        currentDocket = state.currentDocket || 1;
        currentSpeech = state.currentSpeech || 1;
        gridRows = state.gridRows || 0;
        gridCols = state.gridCols || 0;
    }
}

// --- DOM RENDERING ---
function renderGrid() {
    const grid = document.getElementById('seating-grid');
    if (!grid) return;
    grid.innerHTML = ''; 

    let drawCols = gridCols;
    let drawRows = gridRows;
    if (drawCols === 0 && speakers.length > 0) {
        drawCols = Math.ceil(Math.sqrt(speakers.length));
        drawRows = Math.ceil(speakers.length / drawCols);
    }
    
    grid.style.gridTemplateColumns = `repeat(${drawCols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${drawRows}, 1fr)`;

    const speechRankings = getSpeechPriorityList();
    const questionRankings = getQuestionPriorityList();

    speakers.forEach(speaker => {
        const sRank = speechRankings.findIndex(s => s.seatId === speaker.seatId) + 1;
        const qRank = questionRankings.findIndex(s => s.seatId === speaker.seatId) + 1;
        const displayRank = currentMode === 'speech' ? sRank : qRank;
        const badgeClass = displayRank <= 5 ? 'priority-high' : 'priority-low';

        const card = document.createElement('div');
        card.className = 'seat-card';
        
        card.innerHTML = `
            <div class="seat-id">${speaker.seatId}</div>
            <div class="student-name">${speaker.studentName}</div>
            <div class="priority-badge ${badgeClass}">${displayRank}</div>
            
            <div class="seat-stats">
                <span>#S: ${speaker.speechCount}</span>
                <span>LQT: ${speaker.lastQuestionTime === "N/A" ? "--:--" : speaker.lastQuestionTime}</span>
            </div>
            
            <div class="seat-actions">
                <button class="action-btn" onclick="openRecordModal('${speaker.seatId}')">
                    ${currentMode === 'speech' ? 'Log Speech' : 'Log Q.'}
                </button>
                <button class="history-btn" onclick="openHistoryModal('${speaker.seatId}')">History</button>
            </div>
        `;
        grid.appendChild(card);
    });

    const display = document.getElementById('docket-display');
    if (display) display.innerText = `Docket: ${currentDocket}.${currentSpeech}`;
}

// --- MODAL LOGIC ---
let activeSeatId = null;

function openRecordModal(seatId) {
    activeSeatId = seatId;
    const speaker = speakers.find(s => s.seatId === seatId);
    document.getElementById('record-student-name').innerText = speaker.studentName || speaker.seatId;
    
    const timeInput = document.getElementById('record-time-input');
    
    if (currentMode === 'speech') {
        document.getElementById('record-action-title').innerText = 'Log Speech Duration';
        timeInput.style.display = 'block';
        timeInput.value = '';
    } else {
        document.getElementById('record-action-title').innerText = 'Confirm Question Log';
        timeInput.style.display = 'none'; 
    }
    document.getElementById('record-modal').classList.remove('hidden');
    if (currentMode === 'speech') timeInput.focus();
}

function openHistoryModal(seatId) {
    const speaker = speakers.find(s => s.seatId === seatId);
    document.getElementById('history-student-name').innerText = speaker.studentName || speaker.seatId;
    
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = speaker.speechHistory.length === 0 ? '<li>No speeches yet</li>' : '';
    
    speaker.speechHistory.forEach(record => {
        const li = document.createElement('li');
        li.innerText = `D#${record.docketId} - Time: ${record.duration}`;
        historyList.appendChild(li);
    });
    
    document.getElementById('history-modal').classList.remove('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.add('hidden'));
    activeSeatId = null;
}

// --- LIST MODALS ---
document.getElementById('speech-list-btn').addEventListener('click', () => {
    const list = getSpeechPriorityList();
    document.getElementById('precedence-list-title').innerText = 'Speech Precedence Order';
    const content = document.getElementById('precedence-list-content');
    content.innerHTML = '';
    list.forEach((speaker, index) => {
        const li = document.createElement('li');
        li.innerText = `${speaker.seatId} - ${speaker.studentName}`;
        content.appendChild(li);
    });
    document.getElementById('precedence-list-modal').classList.remove('hidden');
});

document.getElementById('question-list-btn').addEventListener('click', () => {
    const list = getQuestionPriorityList();
    document.getElementById('precedence-list-title').innerText = 'Question Precedence Order';
    const content = document.getElementById('precedence-list-content');
    content.innerHTML = '';
    list.forEach((speaker, index) => {
        const li = document.createElement('li');
        li.innerText = `${speaker.seatId} - ${speaker.studentName}`;
        content.appendChild(li);
    });
    document.getElementById('precedence-list-modal').classList.remove('hidden');
});

// --- EDIT DOCKET & SPEAKERS ---
document.getElementById('bill-plus-btn').addEventListener('click', () => {
    currentDocket++;
    currentSpeech = 1;
    saveState();
    renderGrid();
});

document.getElementById('universal-edit-btn').addEventListener('click', () => {
    // Populate current docket/speech fields
    document.getElementById('edit-docket-num').value = currentDocket;
    document.getElementById('edit-speech-num').value = currentSpeech;

    const container = document.getElementById('universal-edit-container');
    container.innerHTML = '';
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.gap = '10px';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '10px';
    header.innerHTML = `<div style="flex:2">Name</div><div style="flex:1; text-align:center">Spch Pr.</div><div style="flex:1; text-align:center">Quest Pr.</div>`;
    container.appendChild(header);

    speakers.forEach(speaker => {
        const row = document.createElement('div');
        row.className = 'edit-row';
        row.innerHTML = `
            <input type="text" class="edit-name-input" data-id="${speaker.seatId}" value="${speaker.studentName}" placeholder="${speaker.seatId}">
            <input type="number" class="edit-prec-input speech-prec" data-id="${speaker.seatId}" value="${speaker.initialSpeechPrecedence}">
            <input type="number" class="edit-prec-input quest-prec" data-id="${speaker.seatId}" value="${speaker.initialQuestionPrecedence}">
        `;
        container.appendChild(row);
    });
    
    document.getElementById('universal-edit-modal').classList.remove('hidden');
});

document.getElementById('submit-universal-edit-btn').addEventListener('click', () => {
    // Save updated docket and speech numbers
    const updatedDocket = parseInt(document.getElementById('edit-docket-num').value);
    const updatedSpeech = parseInt(document.getElementById('edit-speech-num').value);
    if (updatedDocket >= 1) currentDocket = updatedDocket;
    if (updatedSpeech >= 1) currentSpeech = updatedSpeech;

    // Save updated speaker data
    const rows = document.querySelectorAll('.edit-row');
    rows.forEach(row => {
        const nameInput = row.querySelector('.edit-name-input');
        const speechPrecInput = row.querySelector('.speech-prec');
        const questPrecInput = row.querySelector('.quest-prec');
        
        const seatId = nameInput.getAttribute('data-id');
        const speaker = speakers.find(s => s.seatId === seatId);
        
        if (speaker) {
            speaker.studentName = nameInput.value.trim();
            speaker.initialSpeechPrecedence = parseInt(speechPrecInput.value) || 0;
            speaker.initialQuestionPrecedence = parseInt(questPrecInput.value) || 0;
        }
    });
    
    saveState();
    renderGrid();
    closeAllModals();
});

// --- NEW GRID & RESET ACTIONS ---
document.getElementById('new-grid-btn').addEventListener('click', () => {
    const pwd = prompt("WARNING: This will erase all current chamber data.\nEnter password (1234) to confirm:");
    if (pwd === "1234") {
        const rowsStr = prompt("Enter number of rows:");
        const colsStr = prompt("Enter number of columns:");
        
        const rows = parseInt(rowsStr);
        const cols = parseInt(colsStr);
        
        if (rows > 0 && cols > 0) {
            gridRows = rows; 
            gridCols = cols; 
            const totalSeats = rows * cols;
            speakers = []; 
            
            for (let i = 1; i <= totalSeats; i++) {
                speakers.push({
                    seatId: "Seat " + String(i).padStart(2, '0'),
                    studentName: "",
                    initialSpeechPrecedence: i, 
                    initialQuestionPrecedence: totalSeats - i + 1, 
                    speechCount: 0,
                    lastSpeechTime: "N/A",
                    speechHistory: [],
                    lastQuestionTime: "N/A"
                });
            }
            
            currentDocket = 1;
            currentSpeech = 1;
            saveState();
            renderGrid();
        } else {
            alert("Grid creation cancelled: Invalid numbers provided.");
        }
    } else if (pwd !== null) {
        alert("Incorrect password.");
    }
});

document.getElementById('reset-btn').addEventListener('click', () => {
    const pwd = prompt("WARNING: This will wipe everything and load the demo state.\nEnter password (1234) to confirm:");
    if (pwd === "1234") {
        localStorage.removeItem('uil_debate_state');
        location.reload(); 
    } else if (pwd !== null) {
        alert("Incorrect password.");
    }
});

// --- STANDARD LISTENERS ---
document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        renderGrid();
    });
});

document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

document.getElementById('submit-record-btn').addEventListener('click', () => {
    if (!activeSeatId) return;
    
    if (currentMode === 'speech') {
        const duration = document.getElementById('record-time-input').value || "Manual";
        recordSpeech(activeSeatId, duration);
    } else {
        recordQuestion(activeSeatId);
    }
    closeAllModals();
});

// --- INITIALIZATION ---
if (!localStorage.getItem('uil_debate_state')) {
    speakers = [
        { seatId: "Seat 01", studentName: "Addison", initialSpeechPrecedence: 1, initialQuestionPrecedence: 3, speechCount: 0, lastSpeechTime: "N/A", speechHistory: [], lastQuestionTime: "N/A" },
        { seatId: "Seat 02", studentName: "Emma", initialSpeechPrecedence: 2, initialQuestionPrecedence: 2, speechCount: 0, lastSpeechTime: "N/A", speechHistory: [], lastQuestionTime: "N/A" },
        { seatId: "Seat 03", studentName: "Lore", initialSpeechPrecedence: 3, initialQuestionPrecedence: 1, speechCount: 0, lastSpeechTime: "N/A", speechHistory: [], lastQuestionTime: "N/A" }
    ];
    saveState();
}

loadState();
renderGrid();

// --- QR CODE SCANNER LOGIC ---
let html5QrCode = null;

document.getElementById('import-btn').addEventListener('click', () => {
    // Show the modal
    document.getElementById('scanner-modal').classList.remove('hidden');
    
    // Initialize the camera scanner
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
    .catch(err => {
        alert("Camera access denied or unavailable. Make sure you are on HTTPS or localhost.");
        closeScanner();
    });
});

function onScanSuccess(decodedText, decodedResult) {
    try {
        const payload = JSON.parse(decodedText);
        
        // Validate payload structure
        if (!payload.r || !payload.c || !payload.d) throw new Error("Invalid format");

        gridRows = payload.r;
        gridCols = payload.c;
        const totalSpeakers = payload.s; 
        speakers = [];

        // Build the new seating chart
        payload.d.forEach((seat, index) => {
            const seatNumber = index + 1;
            const name = seat[0];
            const spPrec = seat[1];

            if (name !== "") {
                speakers.push({
                    seatId: "Seat " + String(seatNumber).padStart(2, '0'),
                    studentName: name,
                    initialSpeechPrecedence: spPrec,
                    initialQuestionPrecedence: totalSpeakers - spPrec + 1, // Automatic UIL inversion
                    speechCount: 0,
                    lastSpeechTime: "N/A",
                    speechHistory: [],
                    lastQuestionTime: "N/A"
                });
            } else {
                // Empty Seat placeholder
                speakers.push({
                    seatId: "Seat " + String(seatNumber).padStart(2, '0'),
                    studentName: "",
                    initialSpeechPrecedence: 0,
                    initialQuestionPrecedence: 0,
                    speechCount: 0,
                    lastSpeechTime: "N/A",
                    speechHistory: [],
                    lastQuestionTime: "N/A"
                });
            }
        });

        currentDocket = 1;
        currentSpeech = 1;
        saveState();
        renderGrid();
        
        alert("Roster imported successfully!");
        closeScanner();

    } catch (e) {
        console.error(e);
        alert("Failed to read QR code data. Please try scanning again.");
    }
}

function onScanFailure(error) {
    // Continuously fires while scanning; ignore until a code is caught
}

function closeScanner() {
    document.getElementById('scanner-modal').classList.add('hidden');
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
        }).catch(err => console.log(err));
    }
}

document.getElementById('close-scanner-btn').addEventListener('click', closeScanner);