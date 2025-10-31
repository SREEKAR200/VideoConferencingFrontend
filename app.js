// ------------------- PeerJS Video Call Logic -------------------

let localStream = null;
let currentCall = null;
const peer = new Peer();

peer.on('open', id => {
    document.getElementById('yourId').textContent = id;
});

// Setup local video/audio stream
function setupLocalVideo(callback) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        localStream = stream;
        document.getElementById('localVideo').srcObject = stream;
        if (callback) callback(stream);
    }).catch(() => alert('Could not get local media stream!'));
}

// Start a call when user clicks start button
document.getElementById('callBtn').onclick = function() {
    const peerId = document.getElementById('peerIdInput').value;
    setupLocalVideo(stream => {
        const call = peer.call(peerId, stream);
        currentCall = call;
        call.on('stream', remoteStream => {
            document.getElementById('peerVideo').srcObject = remoteStream;
        });

        // ------- Real-time Speech API logic during call -------
        startRealtimeAudioStreaming(stream);
    });
};

// Answer incoming calls
peer.on('call', call => {
    setupLocalVideo(stream => {
        call.answer(stream);
        currentCall = call;
        call.on('stream', remoteStream => {
            document.getElementById('peerVideo').srcObject = remoteStream;
        });

        // ------- Real-time Speech API logic during call -------
        startRealtimeAudioStreaming(stream);
    });
});

// ------------ Real-Time Audio Capture and Streaming ------------
let audioProcessor = null;
function startRealtimeAudioStreaming(stream) {
    if (audioProcessor) {
        audioProcessor.disconnect();
        audioProcessor = null;
    }
    const srcLang = document.getElementById('srcLang').value;
    const tgtLang = document.getElementById('tgtLang').value;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);

    // --- State for appending transcript live ---
    let liveTranscript = "";

    audioProcessor.onaudioprocess = function(e) {
        const inputData = e.inputBuffer.getChannelData(0);
        const wavBlob = float32ToWav(inputData, audioContext.sampleRate);

        let formData = new FormData();
        formData.append("file", wavBlob, "chunk.wav");
        formData.append("src_lang", srcLang);
        formData.append("tgt_lang", tgtLang);

        fetch("https://SreekarK-VideoConferencing.hf.space/rtc_full_pipeline", { method: "POST", body: formData })
            .then(resp => resp.json())
            .then(data => {
                if (data.segments) {
                    // Extract readable transcript from segments and APPEND
                    let newText = "";
                    if (Array.isArray(data.segments)) {
                        newText = data.segments.map(seg => seg.text || JSON.stringify(seg)).join(" ");
                    } else if (typeof data.segments === "string") {
                        newText = data.segments;
                    } else {
                        newText = JSON.stringify(data.segments);
                    }
                    liveTranscript += " " + newText;
                    document.getElementById('transcript').textContent = liveTranscript;
                    // Optionally: show last spoken segment as "subtitle"
                    document.getElementById('subtitle').textContent = newText;
                }
            });
        // To prevent API overload, consider throttling: send every 1-2 seconds
    };
}

// ------ Minimal float32 to WAV conversion ------
function float32ToWav(float32Array, sampleRate) {
    // Converts Float32Array to a Blob containing a WAV file (PCM, mono)
    const buffer = new ArrayBuffer(44 + float32Array.length * 2);
    const view = new DataView(buffer);

    // WAV header (PCM, mono)
    view.setUint32(0, 0x52494646, false); // 'RIFF'
    view.setUint32(4, 36 + float32Array.length * 2, true);
    view.setUint32(8, 0x57415645, false); // 'WAVE'
    view.setUint32(12, 0x666d7420, false); // 'fmt '
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, 1, true); // number of channels
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); // bytes per sample
    view.setUint16(34, 16, true); // bits per sample
    view.setUint32(36, 0x64617461, false); // 'data'
    view.setUint32(40, float32Array.length * 2, true);

    // PCM samples
    for (let i = 0; i < float32Array.length; i++) {
        let sample = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

// --------------- Speech API Logic (Audio Upload/File) ---------------
document.getElementById('uploadBtn').onclick = async function() {
    const fileInput = document.getElementById('audioFile');
    const srcLang = document.getElementById('srcLang').value;
    const tgtLang = document.getElementById('tgtLang').value;

    let formData = new FormData();
    if (fileInput.files.length > 0) {
        formData.append("file", fileInput.files[0]);
    } else {
        alert("Select an audio file!"); return;
    }
    formData.append("src_lang", srcLang);
    formData.append("tgt_lang", tgtLang);

    document.getElementById('transcript').textContent = "Processing audio...";

    try {
        const resp = await fetch("https://SreekarK-VideoConferencing.hf.space/rtc_full_pipeline", { method: "POST", body: formData });
        const data = await resp.json();
        if (data.segments) {
            document.getElementById('transcript').textContent = JSON.stringify(data.segments, null, 2);
        } else if (data.error) {
            document.getElementById('transcript').textContent = "Error: " + data.error;
        } else {
            document.getElementById('transcript').textContent = "Unexpected API response";
        }
    } catch (err) {
        document.getElementById('transcript').textContent = "API request error!";
    }
};

// --------------- Style Tweaks for Demo ---------------
window.onload = () => {
    document.getElementById('localVideo').style.border = "2px solid #2196f3";
    document.getElementById('peerVideo').style.border = "2px solid #e91e63";
};

// --------------- Optional: Example for /translate endpoint ---------------
async function translateTextExample(text, srcLang, tgtLang) {
    const resp = await fetch("https://SreekarK-VideoConferencing.hf.space/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            text: text,
            src_lang: srcLang,
            tgt_lang: tgtLang
        })
    });
    const data = await resp.json();
    return data.translation || data.error;
}
