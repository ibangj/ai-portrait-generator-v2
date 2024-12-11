document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('userInfoForm');
    const cameraContainer = document.getElementById('cameraContainer');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureButton = document.getElementById('captureButton');
    const resultContainer = document.getElementById('resultContainer');
    const generatedImage = document.getElementById('generatedImage');
    const loadingContainer = document.getElementById('loadingContainer');
    const timerDisplay = document.getElementById('timerDisplay');
    const timerDuration = document.getElementById('timerDuration');

    let countdownInterval;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        form.style.display = 'none';
        cameraContainer.style.display = 'block';
        startCamera();
    });

    captureButton.addEventListener('click', () => {
        const duration = parseInt(timerDuration.value);
        if (duration === 0) {
            takePicture();
        } else {
            startCountdown(duration);
        }
    });

    function startCountdown(duration) {
        let timeLeft = duration;
        captureButton.disabled = true;
        timerDisplay.style.display = 'block';
        
        timerDisplay.textContent = timeLeft;
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            
            if (timeLeft === 0) {
                clearInterval(countdownInterval);
                timerDisplay.style.display = 'none';
                captureButton.disabled = false;
                takePicture();
            }
        }, 1000);
    }

    function takePicture() {
        captureImage();
        stopCamera();
        cameraContainer.style.display = 'none';
        loadingContainer.style.display = 'block';
        submitData();
    }

    function startCamera() {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
            })
            .catch(err => console.error('Error accessing camera:', err));
    }

    function stopCamera() {
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }

    function captureImage() {
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    function submitData() {
        const formData = new FormData(form);
        canvas.toBlob(blob => {
            formData.append('image', blob, 'captured-image.jpg');

            // Append selected frame
            const selectedFrame = document.querySelector('input[name="frame"]:checked');
            if (selectedFrame) {
                formData.append('selectedFrame', selectedFrame.value);
                console.log('Selected frame:', selectedFrame.value);
            } else {
                console.log('No frame selected');
            }

            fetch('/submit', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    loadingContainer.style.display = 'none';
                    if (data.success) {
                        resultContainer.style.display = 'block';
                        generatedImage.src = data.imageUrl;
                        document.getElementById('resultMessage').textContent = data.message;
                    } else {
                        alert('An error occurred: ' + data.message);
                    }
                })
                .catch(error => {
                    loadingContainer.style.display = 'none';
                    console.error('Error:', error);
                    alert('An unexpected error occurred. Please try again.');
                });
        });
    }
}); 