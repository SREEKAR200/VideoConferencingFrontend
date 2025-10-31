let mediaRecorder, recordedChunks = [];

export async function startAudioCapture() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
    mediaRecorder.start();
}

export async function stopAudioCapture() {
    mediaRecorder.stop();
}

export function getRecordedBlob() {
    return new Blob(recordedChunks, { type: 'audio/wav' }); // or 'audio/webm' as supported
}
