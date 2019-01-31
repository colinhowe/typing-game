const words = [
    'bed',
    'car',
    'cat',
    'cow',
    'cup',
    'dog',
    'fan',
    'fish',
    'jam',
    'lips',
    'log',
    'mat',
    'mud',
    'pan',
    'pig',
    'ship',
    'sock',
    'sun',
    'web',
];

const colors = [
    '#3fb0ac', // Light green
    '#173e43', // Dark blue
    '#334431', // Dark green
    '#f7882f', // Orange
    '#fc4a1a', // Scarlet
    '#f7c331', // Yellow
    '#8fc33a', // Bright green
    '#fccdd3', // Pink
    '#bbc4ef', // Fuscia
    '#6e3667', // Purple
    '#6534ff', // Dark blue
    '#62bcfa', // Light blue
];

function getColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}


function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

shuffle(words);

let wordIndex = 0;
let currentWord = null;
let attemptSoFar = '';
function getNextWord() {
    const word = words[wordIndex];
    wordIndex += 1;
    if (wordIndex == words.length) {
        wordIndex = 0;
    }
    return word;
}

function updateDisplay() {
    currentWord = getNextWord();

    let el = document.getElementById('imageHolder');
    el.style.backgroundImage = `url('assets/img/${currentWord}.jpg')`;

    el = document.getElementById('hint');
    el.innerHTML = currentWord;

    el = document.getElementById('typeInto');
    el.innerHTML = '';

    attemptSoFar = '';
}

updateDisplay();

window.onkeydown = function(e) {
    let key = e.key;

    // Ignore holding down the key
    if (e.repeat) {
        return;
    }

    if (e.keyCode == 13) {
        let el = document.getElementById('typeInto');
        el.style.animationName = '';
        updateDisplay();
        return;
    }

    // Ignore additional letters if we have already won
    if (attemptSoFar == currentWord) {
        return;
    }

    let expectedKey = currentWord[attemptSoFar.length];
    if (key != expectedKey) {
        // Do an alert
        let el = document.getElementById('typeInto');

        el.style.animationName = '';
        window.setTimeout(function() {
            el.style.animationName = 'error';
            el.style.animationDuration = '1s';
            el.style.animationFillMode = 'none';
        }, 10);

    } else {
        attemptSoFar += key;
        let el = document.getElementById('typeInto');

        const color = getColor();
        el.innerHTML += `<span style="color: ${color};">${key}</span>`;

        if (attemptSoFar == currentWord) {
            el.style.animationName = '';
            window.setTimeout(function() {
                el.style.animationName = 'winner';
                el.style.animationDuration = '0.5s';
                el.style.animationFillMode = 'forwards';
            }, 10);
        }
    }
}
