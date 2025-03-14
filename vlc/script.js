
// Load playlists dynamically
async function loadPlaylists() {
    const res = await fetch('http://127.0.0.1:5000/playlists');
    const playlists = await res.json();
    const container = document.getElementById('playlists');
    container.innerHTML = '';
    playlists.forEach(playlist => {
        const div = document.createElement('div');
        div.textContent = playlist;
        div.className = 'playlist';
        div.onclick = () => loadSongs(playlist);
        container.appendChild(div);
    });
}

// Load songs of selected playlist
async function loadSongs(playlist) {
    document.getElementById('current-playlist').textContent = 'Playlist: ' + playlist;
    const res = await fetch(`http://127.0.0.1:5000/playlist/${playlist}`);
    const songs = await res.json();
    const container = document.getElementById('songs');
    container.innerHTML = '';
    songs.forEach(song => {
        const div = document.createElement('div');
        div.textContent = song;
        div.className = 'song';
        div.onclick = () => playSong(playlist, song);
        container.appendChild(div);
    });
}

// Play selected song
function playSong(playlist, song) {
    const audio = document.getElementById('audio-player');
    const encodedSong = encodeURIComponent(song);
    const url = ` http://127.0.0.1:5000/music/${playlist}/${encodedSong}`;
    console.log('Playing:', url);
    audio.src = url;
    audio.play().catch(err => console.error('Error playing:', err));
}

loadPlaylists();

// Load playlists dynamically (already present)
async function loadPlaylists() {
    const res = await fetch('http://127.0.0.1:5000/playlists');
    const playlists = await res.json();
    const container = document.getElementById('playlists');
    container.innerHTML = '';
    playlists.forEach(playlist => {
        const div = document.createElement('div');
        div.textContent = playlist;
        div.className = 'playlist';
        div.onclick = () => loadSongs(playlist);
        container.appendChild(div);
    });
}

// Load songs dynamically (already present)
async function loadSongs(playlist) {
    document.getElementById('current-playlist').textContent = 'Playlist: ' + playlist;
    const res = await fetch(`http://127.0.0.1:5000/playlist/${playlist}`);
    const songs = await res.json();
    const container = document.getElementById('songs');
    container.innerHTML = '';
    songs.forEach(song => {
        const div = document.createElement('div');
        div.textContent = song;
        div.className = 'song';
        div.onclick = () => playSong(playlist, song);
        container.appendChild(div);
    });
}

// Play selected song (already present)
function playSong(playlist, song) {
    const audio = document.getElementById('audio-player');
    const encodedSong = encodeURIComponent(song);
    const url = `http://127.0.0.1:5000/music/${playlist}/${encodedSong}`;
    audio.src = url;
    audio.play().catch(err => console.error('Error playing:', err));
}

// ✅ Search YouTube
document.getElementById('search-bar').addEventListener('input', async function () {
    const query = this.value;
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    if (query.length < 3) return;  // Wait until at least 3 chars

    const res = await fetch(`http://127.0.0.1:5000/search?query=${encodeURIComponent(query)}`);
    const results = await res.json();

    // results.forEach(result => {
    //     const div = document.createElement('div');
    //     div.className = 'song';  // reuse song styling
    //     div.innerHTML = 
    //     <img src="${result.thumbnail}" alt="Thumbnail" style="width: 100%; border-radius: 12px;">
    //     <p>${result.title}</p>
    //     <button onclick="downloadSong('${result.url.replace(/'/g, "\\'")}')">Download</button>
    // ;
    //     resultsContainer.appendChild(div);
    // });
});

// ✅ Download selected song
async function downloadSong(url) {
    const res = await fetch('http://127.0.0.1:5000/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ` ${url} ` })
    });

    const result = await res.json();
    alert(result.message + ': ' + result.filename);
    loadPlaylists();  // refresh playlists to show new downloaded song if needed
}

loadPlaylists();

const searchBar = document.getElementById('search-bar');
const searchModal = document.getElementById('search-modal');
const searchResults = document.getElementById('search-results');
const closeModal = document.getElementById('close-modal');

// Open Modal
function openModal() {
    searchModal.style.display = 'block';
}

// Close Modal
closeModal.onclick = () => {
    searchModal.style.display = 'none';
};

// Close Modal on Outside Click
window.onclick = (e) => {
    if (e.target === searchModal) {
        searchModal.style.display = 'none';
    }
};

// Search YouTube
let debounceTimeout;
searchBar.addEventListener('input', function () {
    const query = this.value.trim();

    if (debounceTimeout) clearTimeout(debounceTimeout);

    if (query.length < 3) {
        searchResults.innerHTML = ''; // Clear results if query too short
        return;
    }

    debounceTimeout = setTimeout(async () => {
        openModal(); // Show modal on search
        const res = await fetch(`http://127.0.0.1:5000/search?query=${encodeURIComponent(query)}`);
        const results = await res.json();

        searchResults.innerHTML = ''; // Clear previous

        results.forEach(result => {
            const videoUrl = result.url; // Assuming backend returns only video ID
            const videoId = videoUrl.split('v=')[1].split('&')[0]; // Extract video ID safely
            const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            console.log(thumbnail)

            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML =
                `<img src="${thumbnail}" alt="Thumbnail">
            <p>${result.title}</p>
            <button onclick="downloadSong('${videoId}')">Download</button>`
                ;
            searchResults.appendChild(card);
        });
    }, 500); // Debounce time 500ms
});

// Download YouTube Song
async function downloadSong(url) {
    const res = await fetch('http://127.0.0.1:5000/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${url}` })
    });

    const result = await res.json();
    alert(result.message + ': ' + result.filename);
    // Optionally reload playlists to show new song
}


const audio = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const backwardBtn = document.getElementById('backward-btn');
const forwardBtn = document.getElementById('forward-btn');
const volumeSlider = document.getElementById('volume-slider');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const timeline = document.getElementById('timeline');
const currentSongName = document.getElementById('current-song-name');

let isShuffling = false;
let currentIndex = 0;

// Sample songs array (Replace this with your dynamic song list)
const songs = [
    { name: "Song One", src: "song1.mp3" },
    { name: "Song Two", src: "song2.mp3" },
    { name: "Song Three", src: "song3.mp3" },
];

// Set initial song
loadSong(currentIndex);

// --------------------- Core Functions ---------------------

function loadSong(index) {
    const song = songs[index];
    audio.src = song.src;
    currentSongName.innerText = song.name;
    audio.load();
    playAudio();
}

function playAudio() {
    audio.play();
    playBtn.innerHTML = '⏸️';
}

function pauseAudio() {
    audio.pause();
    playBtn.innerHTML = '▶️';
}

function nextSong() {
    if (isShuffling) {
        currentIndex = Math.floor(Math.random() * songs.length);
    } else {
        currentIndex = (currentIndex + 1) % songs.length;
    }
    loadSong(currentIndex);
}

function prevSong() {
    if (isShuffling) {
        currentIndex = Math.floor(Math.random() * songs.length);
    } else {
        currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    }
    loadSong(currentIndex);
}

// --------------------- Event Listeners ---------------------

playBtn.addEventListener('click', () => {
    if (audio.paused) {
        playAudio();
    } else {
        pauseAudio();
    }
});

nextBtn.addEventListener('click', nextSong);
prevBtn.addEventListener('click', prevSong);

shuffleBtn.addEventListener('click', () => {
    isShuffling = !isShuffling;
    shuffleBtn.style.background = isShuffling ? '#1db954' : '#282828'; // Green highlight when active
});

backwardBtn.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
});

forwardBtn.addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
});

volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

// Auto play next song when ended
audio.addEventListener('ended', nextSong);

// --------------------- Timeline ---------------------

audio.addEventListener('timeupdate', () => {
    timeline.value = audio.currentTime;
    currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    timeline.max = audio.duration;
    durationEl.textContent = formatTime(audio.duration);
});

timeline.addEventListener('input', () => {
    audio.currentTime = timeline.value;
});

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
}

// --------------------- Optional: Keyboard Shortcuts ---------------------

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        playBtn.click();
    } else if (e.key === 'ArrowRight') {
        nextBtn.click();
    } else if (e.key === 'ArrowLeft') {
        prevBtn.click();
    } else if (e.key === 'ArrowUp') {
        forwardBtn.click();
    } else if (e.key === 'ArrowDown') {
        backwardBtn.click();
    }
});

