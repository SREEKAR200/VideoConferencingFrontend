// ------------ PeerJS Video Call Logic ------------

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
    });
});

// --------------- Speech API Logic (Audio Upload/File) ---------------

document.getElementById('uploadBtn').onclick = async function() {
    const fileInput = document.getElementById('audioFile');
    const srcLang = document.getElementById('srcLang').value;
    const tgtLang = document.getElementById('tgtLang').value;

    let formData = new FormData();
    // If no file: call getRecordedBlob() from audioCapture.js if you want recording; else alert
    if (fileInput.files.length > 0) {
        formData.append("file", fileInput.files[0]);
    } else {
        alert("Select an audio file!"); return;
        // Uncomment below if you support recording:
        // let audioBlob = await getRecordedBlob();
        // formData.append("file", audioBlob);
    }
    formData.append("src_lang", srcLang);
    formData.append("tgt_lang", tgtLang);

    document.getElementById('transcript').textContent = "Processing audio...";

    try {
        const resp = await fetch("http://localhost:8000/rtc_full_pipeline", { method: "POST", body: formData });
        const data = await resp.json();
        // Modular transcript display
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
