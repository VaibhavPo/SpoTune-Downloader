import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from "fs";
import youtubedl from 'yt-dlp-exec';
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOWNLOAD_DIR = join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

const client_id = 'YOUR_ID';
const client_secret = 'YOUR_SECRET';

// Get Spotify Access Token
async function getAccessToken() {
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Authorization": "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });
    const data = await res.json();
    return data.access_token;
}

// Fetch Spotify Playlist Songs
async function getPlaylistTracks(playlistId, accessToken) {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return data.items;
}

// Search YouTube
async function searchYouTube(query) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl);
    const body = await res.text();
    const $ = cheerio.load(body);
    const scripts = $('script').map((_, el) => $(el).html()).get().join('');
    const regex = /"videoId":"(.*?)"/g;
    const matches = [...scripts.matchAll(regex)];
    const videoId = matches[0]?.[1];
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

// Download YouTube MP3
async function downloadYouTubeMP3(youtubeUrl) {
    const fileName = `song-${Date.now()}.mp3`;
    const outputPath = join(DOWNLOAD_DIR, fileName);
    await youtubedl(youtubeUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: outputPath,
        audioQuality: 0
    });
    return `/downloads/${fileName}`;
}

// API: Get Playlist & YouTube Links
app.get("/api/playlist", async (req, res) => {
    const { url } = req.query;
    try {
        const playlistId = url.split('/playlist/')[1].split('?')[0];
        const accessToken = await getAccessToken();
        const tracks = await getPlaylistTracks(playlistId, accessToken);
        const limitedTracks = tracks.slice(0, 10); // Limit to first 10

        const formattedTracks = await Promise.all(
            limitedTracks.map(async (item) => {
                const name = item.track.name;
                const artists = item.track.artists.map(a => a.name).join(", ");
                const query = `${name} ${artists}`;
                const youtubeLink = await searchYouTube(query);
                return { name, artists, youtubeLink: youtubeLink || 'Not found' };
            })
        );

        res.json({ tracks: formattedTracks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.toString() });
    }
});

// API: Download MP3
app.get('/api/download', async (req, res) => {
    const { youtubeUrl } = req.query;
    if (!youtubeUrl) return res.status(400).json({ error: 'YouTube URL is required' });

    try {
        const fileUrl = await downloadYouTubeMP3(youtubeUrl);
        res.json({ message: 'Download completed', fileUrl });
    } catch (error) {
        res.status(500).json({ error: 'Download failed', details: error });
    }
});

// Serve MP3 files
app.use('/downloads', express.static(DOWNLOAD_DIR));

// Auto-delete old files (1hr+)
setInterval(() => {
    const now = Date.now();
    fs.readdirSync(DOWNLOAD_DIR).forEach(file => {
        const filePath = join(DOWNLOAD_DIR, file);
        const age = now - fs.statSync(filePath).mtimeMs;
        if (age > 3600000) fs.unlinkSync(filePath);
    });
}, 3600000);

app.listen(port, () => console.log(`✅ Server running on http://localhost:${port}`));
