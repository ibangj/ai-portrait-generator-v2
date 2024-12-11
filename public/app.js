document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const timerDisplay = document.getElementById('timerDisplay');
    const timerDuration = document.getElementById('timerDuration');
    const generatedImage = document.getElementById('generatedImage');
    const resultContainer = document.getElementById('resultContainer');
    const cameraInterface = document.getElementById('cameraInterface');
    const cameraPrompt = document.getElementById('cameraPrompt');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progressText');
    const qrCodeElement = document.getElementById('qrCode');

    // State
    let currentStep = 1;
    let selectedGender = '';
    let selectedPosition = '';
    let selectedVenue = '';
    let selectedExpression = '';
    let selectedFrame = '';
    let countdownInterval;
    let formData = new FormData();
    let progressInterval;
    let currentProgress = 0;

    // Initialize
    showStep(1);

    function showStep(step) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.add('hidden');
        });
        // Show current step
        document.getElementById(`step${step}`).classList.remove('hidden');
        currentStep = step;
    }

    function nextStep(step) {
        showStep(step);
    }

    function selectGender(gender) {
        selectedGender = gender;
        formData.append('gender', gender);
        // Update UI to show selection
        document.querySelectorAll('#step2 .outline-button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === gender || 
                (gender === 'Female Hijabi' && btn.textContent === 'Female Wearing Hijab')) {
                btn.classList.add('selected');
            }
        });
        setTimeout(() => nextStep(3), 300);
    }

    function selectPosition(position) {
        selectedPosition = position;
        formData.append('position', position);
        // Update UI to show selection
        document.querySelectorAll('#step3 .outline-button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === position) {
                btn.classList.add('selected');
            }
        });
        setTimeout(() => nextStep(4), 300);
    }

    function selectVenue(venue) {
        selectedVenue = venue;
        formData.append('setPanggung', venue);
        // Update UI to show selection
        document.querySelectorAll('#step4 .outline-button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === venue) {
                btn.classList.add('selected');
            }
        });
        setTimeout(() => nextStep(5), 300);
    }

    function selectExpression(expression) {
        selectedExpression = expression;
        formData.append('expression', expression);
        // Update UI to show selection
        document.querySelectorAll('#step5 .outline-button').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === expression) {
                btn.classList.add('selected');
            }
        });
        setTimeout(() => nextStep(6), 300);
    }

    function selectFrame(frame) {
        selectedFrame = frame;
        formData.append('selectedFrame', frame);
    }

    function openCamera() {
        cameraPrompt.classList.add('hidden');
        cameraInterface.classList.remove('hidden');
        startCamera();
    }

    function startCamera() {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
            })
            .catch(err => {
                console.error('Error accessing camera:', err);
                alert('Unable to access camera. Please make sure you have granted camera permissions.');
            });
    }

    function stopCamera() {
        const stream = video.srcObject;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
    }

    function retakePhoto() {
        cameraInterface.classList.add('hidden');
        cameraPrompt.classList.remove('hidden');
        stopCamera();
    }

    function capturePhoto() {
        const duration = parseInt(timerDuration.value);
        if (duration === 0) {
            takePicture();
        } else {
            startCountdown(duration);
        }
    }

    function startCountdown(duration) {
        let timeLeft = duration;
        timerDisplay.style.display = 'block';
        timerDisplay.textContent = timeLeft;
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            
            if (timeLeft === 0) {
                clearInterval(countdownInterval);
                timerDisplay.style.display = 'none';
                takePicture();
            }
        }, 1000);
    }

    function takePicture() {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        stopCamera();
        showStep(8);
        submitPhoto();
    }

    function startProgressBar() {
        currentProgress = 0;
        progressBar.style.width = '0%';
        progressText.textContent = 'Starting generation...';
        
        // Simulate progress in 4 stages
        const stages = [
            { progress: 25, text: 'Analyzing photo...' },
            { progress: 50, text: 'Applying AI transformation...' },
            { progress: 75, text: 'Adding artistic effects...' },
            { progress: 90, text: 'Finalizing portrait...' }
        ];
        
        let currentStage = 0;
        
        progressInterval = setInterval(() => {
            if (currentStage < stages.length) {
                const { progress, text } = stages[currentStage];
                if (currentProgress < progress) {
                    currentProgress++;
                    progressBar.style.width = `${currentProgress}%`;
                } else {
                    progressText.textContent = text;
                    currentStage++;
                }
            }
        }, 100);
    }

    function stopProgressBar(success = true) {
        clearInterval(progressInterval);
        currentProgress = 100;
        progressBar.style.width = '100%';
        progressText.textContent = success ? 'Portrait generated successfully!' : 'Generation failed';
    }

    function generateQRCode(imageUrl) {
        try {
            // Generate a unique ID for this image
            const imageId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Store the image first
            fetch('/store-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageId,
                    imageUrl
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Create the public URL for sharing
                    const shareUrl = `${window.location.origin}/share/${imageId}`;
                    
                    // Clear previous QR code if any
                    qrCodeElement.innerHTML = '';
                    
                    // Generate QR code with the share URL
                    new QRCode(qrCodeElement, {
                        text: shareUrl,
                        width: 128,
                        height: 128,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });

                    // Update the image source to use the local URL
                    generatedImage.src = data.localUrl;
                } else {
                    throw new Error('Failed to store image');
                }
            })
            .catch(error => {
                console.error('Error storing image:', error);
                document.getElementById('qrContainer').style.display = 'none';
            });
        } catch (error) {
            console.error('Error generating QR code:', error);
            document.getElementById('qrContainer').style.display = 'none';
        }
    }

    function downloadImage() {
        const imageUrl = document.getElementById('generatedImage').src;
        const fileName = `ai-portrait-${Date.now()}.png`;

        fetch(imageUrl)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error downloading image:', error);
                alert('Failed to download image. Please try again.');
            });
    }

    function submitPhoto() {
        canvas.toBlob(blob => {
            formData.append('image', blob, 'captured-image.jpg');
            if (!formData.has('bandGenre')) {
                formData.append('bandGenre', 'rock');
            }

            // Start progress bar
            startProgressBar();

            fetch('/submit', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    generatedImage.src = data.imageUrl;
                    document.getElementById('resultMessage').textContent = data.message;
                    
                    // Wait for image to load before showing
                    generatedImage.onload = () => {
                        stopProgressBar(true);
                        
                        setTimeout(() => {
                            document.querySelector('.loading-animation').style.display = 'none';
                            resultContainer.classList.remove('hidden');
                            
                            // Generate QR code after showing the result
                            try {
                                generateQRCode(data.imageUrl);
                            } catch (error) {
                                console.error('Error in QR code generation:', error);
                                // Hide QR container if generation fails
                                document.getElementById('qrContainer').style.display = 'none';
                            }
                        }, 500);
                    };
                } else {
                    stopProgressBar(false);
                    alert('An error occurred: ' + data.message);
                    startOver();
                }
            })
            .catch(error => {
                stopProgressBar(false);
                console.error('Error:', error);
                alert('An unexpected error occurred. Please try again.');
                startOver();
            });
        });
    }

    function startOver() {
        formData = new FormData();
        selectedGender = '';
        selectedPosition = '';
        selectedVenue = '';
        selectedExpression = '';
        selectedFrame = '';
        stopCamera();
        // Reset loading/result containers
        document.querySelector('.loading-animation').style.display = 'block';
        resultContainer.classList.add('hidden');
        // Clear the generated image
        generatedImage.src = '';
        document.getElementById('resultMessage').textContent = '';
        showStep(1);
        clearInterval(progressInterval);
        progressBar.style.width = '0%';
        progressText.textContent = 'Starting generation...';
        if (qrCodeElement) {
            qrCodeElement.innerHTML = '';
        }
    }

    // Expose functions to window for onclick handlers
    window.nextStep = nextStep;
    window.selectGender = selectGender;
    window.selectPosition = selectPosition;
    window.selectVenue = selectVenue;
    window.selectExpression = selectExpression;
    window.selectFrame = selectFrame;
    window.openCamera = openCamera;
    window.retakePhoto = retakePhoto;
    window.capturePhoto = capturePhoto;
    window.startOver = startOver;
    window.downloadImage = downloadImage;
}); 