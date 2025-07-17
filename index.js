const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // For serving downloaded files

// Check if FFmpeg is installed
async function checkFFmpeg() {
    try {
        await execPromise('ffmpeg -version');
        console.log('FFmpeg is installed and accessible.');
        return true;
    } catch (error) {
        console.error('FFmpeg not found:', error.message);
        return false;
    }
}

// Serve the frontend
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Audio Downloader</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Poppins', sans-serif;
        }
        body {
            background-color: #121212;
            color: white;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background-color: #1e1e1e;
            padding: 2rem;
            border-radius: 15px;
            width: 100%;
            max-width: 500px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        }
        h1 {
            text-align: center;
            margin-bottom: 1.5rem;
            font-size: 1.8rem;
            color: #e0e0e0;
        }
        .input-group {
            margin-bottom: 1rem;
        }
        input, select {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background-color: #2a2a2a;
            color: white;
            font-size: 1rem;
            margin-bottom: 1rem;
        }
        select {
            appearance: none;
            background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
            background-repeat: no-repeat;
            background-position-x: 98%;
            background-position-y: 50%;
        }
        button {
            width: 100%;
            padding: 12px;
            background-color: #6200ea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #7c4dff;
        }
        #status {
            margin-top: 1rem;
            text-align: center;
            min-height: 24px;
        }
        #video-info {
            margin: 1rem 0;
            text-align: center;
        }
        #video-info img {
            max-width: 100%;
            border-radius: 8px;
            margin-bottom: 0.5rem;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #6200ea;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
            display: none;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @media (max-width: 600px) {
            .container {
                padding: 1rem;
            }
            h1 {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>YouTube Audio Downloader</h1>
        <div class="input-group">
            <input type="text" id="url" placeholder="Paste YouTube URL here" required>
            <select id="bitrate">
                <option value="64">64kbps</option>
                <option value="128" selected>128kbps</option>
                <option value="192">192kbps</option>
                <option value="320">320kbps</option>
            </select>
            <button onclick="downloadAudio()">Download MP3</button>
        </div>
        <div id="status"></div>
        <div class="spinner" id="spinner"></div>
        <div id="video-info"></div>
    </div>

    <script>
        async function downloadAudio() {
            const url = document.getElementById('url').value;
            const bitrate = document.getElementById('bitrate').value;
            const status = document.getElementById('status');
            const spinner = document.getElementById('spinner');
            const videoInfo = document.getElementById('video-info');

            if (!url) {
                status.innerHTML = 'Please enter a YouTube URL';
                return;
            }

            status.innerHTML = 'Checking FFmpeg availability...';
            spinner.style.display = 'block';

            try {
                // Check FFmpeg
                const ffmpegCheck = await fetch('/check-ffmpeg');
                const ffmpegResult = await ffmpegCheck.json();
                if (!ffmpegResult.installed) {
                    status.innerHTML = 'FFmpeg is not installed. Please install FFmpeg in your environment (e.g., via apt-get in Docker).';
                    spinner.style.display = 'none';
                    return;
                }

                // Fetch video info
                status.innerHTML = 'Fetching video info...';
                const infoResponse = await fetch('/info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                const info = await infoResponse.json();
                if (info.error) {
                    status.innerHTML = info.error;
                    spinner.style.display = 'none';
                    return;
                }
                videoInfo.innerHTML = \`<img src="\${info.thumbnail}" alt="Thumbnail"><p>\${info.title}</p>\`;

                // Start download
                status.innerHTML = 'Converting audio...';
                const downloadResponse = await fetch('/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, bitrate })
                });
                const downloadResult = await downloadResponse.json();
                
                if (downloadResult.error) {
                    status.innerHTML = downloadResult.error;
                } else {
                    status.innerHTML = 'Download ready';
                    const link = document.createElement('a');
                    link.href = downloadResult.downloadUrl;
                    link.download = downloadResult.filename;
                    link.click();
                }
            } catch (error) {
                status.innerHTML = 'An error occurred. Please try again or check server logs.';
                console.error(error);
            } finally {
                spinner.style.display = 'none';
            }
        }
    </script>
</body>
</html>
    `);
});

// Check FFmpeg endpoint
app.get('/check-ffmpeg', async (req, res) => {
    const installed = await checkFFmpeg();
    res.json({ installed });
});

// Get video info (title and thumbnail)
app.post('/info', async (req, res) => {
    const { url } = req.body;
    console.log('Fetching video info for URL:', url);

    try {
        const { stdout } = await execPromise(`yt-dlp --get-title --get-thumbnail "${url}"`);
        const [title, thumbnail] = stdout.trim().split('\n');
        console.log('Video info fetched:', { title, thumbnail });
        res.json({ title, thumbnail });
    } catch (error) {
        console.error('Error fetching video info:', error.message);
        res.json({ error: 'Invalid YouTube URL or failed to fetch info' });
    }
});

// Download and convert audio
app.post('/download', async (req, res) => {
    const { url, bitrate } = req.body;
    console.log('Starting download for URL:', url, 'Bitrate:', bitrate);

    // Verify FFmpeg before proceeding
    const ffmpegInstalled = await checkFFmpeg();
    if (!ffmpegInstalled) {
        res.json({ error: 'FFmpeg is not installed. Please install FFmpeg in your environment (e.g., via apt-get in Docker).' });
        return;
    }

    const outputDir = path.join(__dirname, 'public', 'downloads');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log('Created downloads directory:', outputDir);
    }

    const filename = `audio_${Date.now()}.mp3`;
    const outputPath = path.join(outputDir, filename);

    try {
        console.log('Executing yt-dlp to download audio...');
        await execPromise(`yt-dlp -x --audio-format mp3 --audio-quality ${bitrate}k -o "${outputPath}" "${url}"`);
        console.log('Audio downloaded and converted successfully');

        const downloadUrl = `/downloads/${filename}`;
        res.json({ downloadUrl, filename });

        // Clean up after 5 minutes
        setTimeout(() => {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
                console.log('Cleaned up file:', outputPath);
            }
        }, 5 * 60 * 1000);
    } catch (error) {
        console.error('Error downloading/converting audio:', error.message);
        res.json({ error: 'Failed to download or convert audio. Ensure the URL is valid and try again.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
