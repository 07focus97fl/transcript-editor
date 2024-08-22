document.addEventListener('DOMContentLoaded', (event) => {
    const editor = document.getElementById('editor');
    const timestampButtons = document.getElementById('timestamp-buttons');
    const decrementButton = document.getElementById('decrement-timestamp');
    const incrementButton = document.getElementById('increment-timestamp');
    const formatButton = document.getElementById('format');
    const loadFileButton = document.getElementById('load-file');
    const saveFileButton = document.getElementById('save-file');
    const speaker0HButton = document.getElementById('speaker-0-h');
    const speaker0WButton = document.getElementById('speaker-0-w');
    const addInterruptionButton = document.getElementById('add-interruption');
    const moveButton = document.getElementById('move');

    let currentTimestamp = null;
    let interruptionPopup = null;
    let moveState = 'inactive';
    let textToMove = '';
    let moveStartPosition = null;

    editor.addEventListener('mouseup', handleSelectionChange);
    editor.addEventListener('keyup', handleSelectionChange);

    decrementButton.addEventListener('click', () => adjustTimestamp(-1));
    incrementButton.addEventListener('click', () => adjustTimestamp(1));
    formatButton.addEventListener('click', formatText);
    loadFileButton.addEventListener('click', loadFile);
    saveFileButton.addEventListener('click', saveFile);
    speaker0HButton.addEventListener('click', () => replaceSpeakers('H'));
    speaker0WButton.addEventListener('click', () => replaceSpeakers('W'));
    addInterruptionButton.addEventListener('click', showInterruptionPopup);
    moveButton.addEventListener('click', handleMoveClick);

    function handleSelectionChange() {
        const cursorPosition = editor.selectionStart;
        const text = editor.value;

        const timestamp = findTimestampAtPosition(text, cursorPosition);

        if (timestamp) {
            currentTimestamp = timestamp;
            showTimestampButtons(editor);
        } else {
            hideTimestampButtons();
        }
    }

    function findTimestampAtPosition(text, position) {
        const timestampRegex = /\b\d{1,2}:[0-5]\d\b/g;
        let match;

        while ((match = timestampRegex.exec(text)) !== null) {
            if (position >= match.index && position <= match.index + match[0].length) {
                return {
                    value: match[0],
                    index: match.index
                };
            }
        }

        return null;
    }

    function showTimestampButtons(target) {
        const rect = target.getBoundingClientRect();
    
        timestampButtons.style.display = 'flex';
        timestampButtons.style.flexDirection = 'row';
        timestampButtons.style.position = 'fixed';
        timestampButtons.style.left = `${rect.left - 70}px`;
        timestampButtons.style.top = '50%';
        timestampButtons.style.transform = 'translateY(-50%)';

        timestampButtons.innerHTML = '';
        timestampButtons.appendChild(decrementButton);
        timestampButtons.appendChild(incrementButton);
    }

    function hideTimestampButtons() {
        timestampButtons.style.display = 'none';
        currentTimestamp = null;
    }

    function adjustTimestamp(direction) {
        if (!currentTimestamp) return;

        let [minutes, seconds] = currentTimestamp.value.split(':').map(Number);
        let totalSeconds = minutes * 60 + seconds + direction;

        if (totalSeconds < 0) totalSeconds = 0;
        if (totalSeconds > 600) totalSeconds = 600;

        minutes = Math.floor(totalSeconds / 60);
        seconds = totalSeconds % 60;

        const newTimestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        editor.value = editor.value.substring(0, currentTimestamp.index) +
                       newTimestamp +
                       editor.value.substring(currentTimestamp.index + currentTimestamp.value.length);

        currentTimestamp.value = newTimestamp;
    }

    function formatText() {
        fetch('/format', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: editor.value }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.processed_text) {
                editor.value = data.processed_text;
            } else {
                console.error('Failed to format text');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function loadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = readerEvent => {
                editor.value = readerEvent.target.result;
            }
        }
        input.click();
    }

    function saveFile() {
        const blob = new Blob([editor.value], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'transcript.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function replaceSpeakers(speaker0) {
        fetch('/replace_speakers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: editor.value, speaker_0: speaker0 }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.processed_text) {
                editor.value = data.processed_text;
            } else {
                console.error('Failed to replace speakers');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function showInterruptionPopup() {
        const cursorPosition = editor.selectionStart;
        const text = editor.value;
        const lastTimestamp = findLastTimestamp(text, cursorPosition);

        if (!lastTimestamp) {
            alert('No valid timestamp found before the cursor.');
            return;
        }

        const startTime = incrementTimestamp(lastTimestamp, 0);
        const endTime = incrementTimestamp(startTime, 1);

        if (interruptionPopup) {
            document.body.removeChild(interruptionPopup);
        }

        interruptionPopup = createPopup(startTime, endTime);
        document.body.appendChild(interruptionPopup);

        positionPopup(interruptionPopup, editor);
    }

    function createPopup(startTime, endTime) {
        const popup = document.createElement('div');
        popup.style.position = 'absolute';
        popup.style.padding = '10px';
        popup.style.background = 'white';
        popup.style.border = '1px solid black';
        popup.style.zIndex = '1000';

        popup.innerHTML = `
            <div>
                Start time: <input type="text" id="start-time" value="${startTime}">
                <button id="start-decrement">▼</button>
                <button id="start-increment">▲</button>
            </div>
            <div>
                End time: <input type="text" id="end-time" value="${endTime}">
                <button id="end-decrement">▼</button>
                <button id="end-increment">▲</button>
            </div>
            <div>
                Speaker: 
                <button id="speaker-h">H</button>
                <button id="speaker-w">W</button>
            </div>
            <button id="add-interruption-confirm">Add</button>
        `;

        popup.querySelector('#start-decrement').addEventListener('click', () => adjustTime('start', -1));
        popup.querySelector('#start-increment').addEventListener('click', () => adjustTime('start', 1));
        popup.querySelector('#end-decrement').addEventListener('click', () => adjustTime('end', -1));
        popup.querySelector('#end-increment').addEventListener('click', () => adjustTime('end', 1));
        popup.querySelector('#speaker-h').addEventListener('click', () => setSpeaker('H'));
        popup.querySelector('#speaker-w').addEventListener('click', () => setSpeaker('W'));
        popup.querySelector('#add-interruption-confirm').addEventListener('click', addInterruption);

        return popup;
    }

    function positionPopup(popup, target) {
        const rect = target.getBoundingClientRect();
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 5}px`;
    }

    function findLastTimestamp(text, position) {
        const timestampRegex = /\b\d{1,2}:[0-5]\d\b/g;
        let lastMatch = null;
        let match;

        while ((match = timestampRegex.exec(text)) !== null) {
            if (match.index < position) {
                lastMatch = match[0];
            } else {
                break;
            }
        }

        return lastMatch;
    }

    function incrementTimestamp(timestamp, seconds) {
        let [minutes, secs] = timestamp.split(':').map(Number);
        let totalSeconds = minutes * 60 + secs + seconds;
        minutes = Math.floor(totalSeconds / 60);
        secs = totalSeconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    function adjustTime(type, direction) {
        const input = document.getElementById(`${type}-time`);
        input.value = incrementTimestamp(input.value, direction);
        if (type === 'start') {
            document.getElementById('end-time').value = incrementTimestamp(input.value, 1);
        }
    }

    function setSpeaker(speaker) {
        window.currentSpeaker = speaker;
    }

    function addInterruption() {
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const speaker = window.currentSpeaker || 'H';

        const interruptionString = `\n${startTime} - ${endTime} ${speaker}: `;
        const cursorPosition = editor.selectionStart;

        editor.value = editor.value.slice(0, cursorPosition) + interruptionString + editor.value.slice(cursorPosition);
        editor.selectionStart = editor.selectionEnd = cursorPosition + interruptionString.length;

        document.body.removeChild(interruptionPopup);
        interruptionPopup = null;
        editor.focus();
    }

    function handleMoveClick() {
        if (moveState === 'inactive') {
            startMove();
        } else if (moveState === 'selecting-destination') {
            endMove();
        }
    }

    function startMove() {
        const selection = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        if (selection) {
            textToMove = selection;
            moveStartPosition = editor.selectionStart;
            moveState = 'selecting-destination';
            moveButton.textContent = 'End Move';
            editor.setSelectionRange(editor.selectionEnd, editor.selectionEnd);
        } else {
            alert('Please select the text you want to move before clicking the Move button.');
        }
    }

    function endMove() {
        const destinationPosition = editor.selectionStart;
        const beforeMove = editor.value.substring(0, moveStartPosition);
        const afterMoveStart = editor.value.substring(moveStartPosition + textToMove.length);
        
        let newText;
        if (destinationPosition > moveStartPosition) {
            // Moving forward
            const betweenMove = editor.value.substring(moveStartPosition + textToMove.length, destinationPosition);
            newText = beforeMove + betweenMove + textToMove + ' ' + afterMoveStart.substring(destinationPosition - moveStartPosition - textToMove.length);
        } else {
            // Moving backward
            const betweenMove = editor.value.substring(destinationPosition, moveStartPosition);
            newText = editor.value.substring(0, destinationPosition) + textToMove + ' ' + betweenMove + afterMoveStart;
        }

        editor.value = newText;
        moveState = 'inactive';
        moveButton.textContent = 'Move';
        textToMove = '';
        moveStartPosition = null;
    }
});