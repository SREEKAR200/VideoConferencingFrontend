export function displayTranscript(data, targetElement) {
    if (data.segments) {
        // Customize to display speaker, transcript, translation, etc.
        targetElement.textContent = JSON.stringify(data.segments, null, 2);
    } else if (data.error) {
        targetElement.textContent = "Error: " + data.error;
    } else {
        targetElement.textContent = "No transcript found";
    }
}
