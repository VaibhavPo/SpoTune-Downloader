from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import os
import yt_dlp

app = Flask(__name__)
CORS(app)

BASE_MUSIC_DIR = "E:/MIRROR/songs"

@app.route('/playlists', methods=['GET'])
def get_playlists():
    playlists = [folder for folder in os.listdir(BASE_MUSIC_DIR) if os.path.isdir(os.path.join(BASE_MUSIC_DIR, folder))]
    return jsonify(playlists)

@app.route('/playlist/<playlist_name>', methods=['GET'])
def get_songs(playlist_name):
    playlist_path = os.path.join(BASE_MUSIC_DIR, playlist_name)
    if not os.path.exists(playlist_path):
        return jsonify({"error": "Playlist not found"}), 404
    songs = [file for file in os.listdir(playlist_path) if file.endswith(('.mp3', '.wav'))]
    return jsonify(songs)

@app.route('/music/<playlist_name>/<song_name>', methods=['GET'])
def stream_song(playlist_name, song_name):
    playlist_path = os.path.join(BASE_MUSIC_DIR, playlist_name)
    if not os.path.exists(os.path.join(playlist_path, song_name)):
        return jsonify({"error": "Song not found"}), 404
    return send_from_directory(playlist_path, song_name)

# ✅ New: YouTube Search
@app.route('/search', methods=['GET'])
def search_youtube():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "No search query provided"}), 400

    ydl_opts = {
        'quiet': True,
        'extract_flat': 'in_playlist',
        'format': 'bestaudio/best'
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        search_results = ydl.extract_info(f"ytsearch5:{query}", download=False)['entries']

    results = [{
        'title': entry['title'],
        'url': entry['url'],
    } for entry in search_results]

    return jsonify(results)

# ✅ New: YouTube Download
@app.route('/download', methods=['POST'])
def download_youtube():
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    output_dir = os.path.join(BASE_MUSIC_DIR, "Downloads")
    os.makedirs(output_dir, exist_ok=True)

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        'quiet': True,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info).replace('.webm', '.mp3').replace('.m4a', '.mp3')

    return jsonify({"message": "Downloaded successfully", "filename": os.path.basename(filename)})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
