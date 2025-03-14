from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import requests
import base64
from yt_dlp import YoutubeDL
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


# ---------- Configuration ----------
CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
BASE_DOWNLOAD_DIR = os.getenv('BASE_DOWNLOAD_DIR', 'songs')  # Default to 'songs' if not provided

os.makedirs(BASE_DOWNLOAD_DIR, exist_ok=True)

# ---------- Flask Setup ----------
app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for frontend

# ---------- Spotify Functions ----------
def get_spotify_access_token():
    url = 'https://accounts.spotify.com/api/token'
    headers = {
        'Authorization': 'Basic ' + base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode(),
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    data = {'grant_type': 'client_credentials'}
    response = requests.post(url, headers=headers, data=data)
    response.raise_for_status()
    return response.json()['access_token']

def get_playlist_tracks(playlist_id, access_token):
    url = f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    items = response.json()['items']
    tracks = []
    for item in items:
        track = item['track']
        name = track['name']
        artists = ', '.join([artist['name'] for artist in track['artists']])
        tracks.append({"name": name, "artists": artists})
    return tracks

def get_playlist_metadata(playlist_id, access_token):
    url = f'https://api.spotify.com/v1/playlists/{playlist_id}'
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    playlist = response.json()
    return {
        "name": playlist['name'],
        "description": playlist.get('description', ''),
        "owner": playlist['owner']['display_name'],
        "total_tracks": playlist['tracks']['total']
    }

# ---------- YouTube Download Function ----------
def download_song_from_youtube(song_name, artist_name, playlist_folder):
    query = f"{song_name} {artist_name} audio"
    search_url = f"ytsearch1:{query}"  # Search YouTube and get first result

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(playlist_folder, '%(title)s.%(ext)s'),  # Save in specific folder
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'noplaylist': True,
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(search_url, download=True)
        title = info['entries'][0]['title']
        filename = f"{title}.mp3"
    return filename

# ---------- Routes ----------

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# Fetch playlist metadata (basic details)
@app.route('/api/playlist', methods=['GET'])
def fetch_playlist_metadata():
    spotify_url = request.args.get('url')
    if not spotify_url or '/playlist/' not in spotify_url:
        return jsonify({"status": "error", "message": "Invalid Spotify playlist URL."})

    playlist_id = spotify_url.split('/playlist/')[1].split('?')[0]

    try:
        access_token = get_spotify_access_token()
        metadata = get_playlist_metadata(playlist_id, access_token)

        # Save playlist name for folder creation
        folder_name = metadata['name'].replace('/', '_').replace('\\', '_').strip()
        playlist_folder = os.path.join(BASE_DOWNLOAD_DIR, folder_name)
        os.makedirs(playlist_folder, exist_ok=True)  # Create folder if not exists

        return jsonify({"status": "success", "metadata": metadata, "folder": folder_name})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# Fetch playlist track details (List of songs)
@app.route('/api/playlist/details', methods=['GET'])
def fetch_playlist_details():
    spotify_url = request.args.get('url')
    if not spotify_url or '/playlist/' not in spotify_url:
        return jsonify({"status": "error", "message": "Invalid Spotify playlist URL."})

    playlist_id = spotify_url.split('/playlist/')[1].split('?')[0]

    try:
        access_token = get_spotify_access_token()
        tracks = get_playlist_tracks(playlist_id, access_token)
        return jsonify({"status": "success", "tracks": tracks})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# Download selected song inside playlist folder
@app.route('/api/download', methods=['POST'])
def download_song():
    data = request.json
    song_name = data.get('name')
    artist_name = data.get('artist')
    folder_name = data.get('folder')  # Pass playlist folder name from frontend

    if not song_name or not artist_name or not folder_name:
        return jsonify({"status": "error", "message": "Song name, artist, and folder are required."})

    playlist_folder = os.path.join(BASE_DOWNLOAD_DIR, folder_name)

    if not os.path.exists(playlist_folder):
        os.makedirs(playlist_folder, exist_ok=True)  # Create folder if not exists

    try:
        filename = download_song_from_youtube(song_name, artist_name, playlist_folder)
        return jsonify({
            "status": "success",
            "filename": filename,
            "message": f"Downloaded {filename}",
            "url": f"/api/downloaded/{folder_name}/{filename}"  # Provide download URL
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# Serve downloaded songs inside specific playlist folder
@app.route('/api/downloaded/<folder>/<path:filename>', methods=['GET'])
def serve_downloaded_file(folder, filename):
    folder_path = os.path.join(BASE_DOWNLOAD_DIR, folder)
    try:
        return send_from_directory(folder_path, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"status": "error", "message": "File not found."})

# ---------- Run ----------
if __name__ == '__main__':
    app.run(debug=True,port=8080)
