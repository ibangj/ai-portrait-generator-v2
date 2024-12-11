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
        
        // Clear any existing frame data from formData
        if (formData.has('selectedFrame')) {
            formData.delete('selectedFrame');
        }
        
        // Add new frame selection
        formData.append('selectedFrame', frame);
        
        // Update radio button state
        document.querySelectorAll('input[name="frame"]').forEach(radio => {
            if (radio.value === frame) {
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });
    }

    function openCamera() {
        cameraPrompt.classList.add('hidden');
        cameraInterface.classList.remove('hidden');
        // Make sure any existing stream is stopped
        stopCamera();
        // Clear any existing video source
        if (video.srcObject) {
            video.srcObject = null;
        }
        // Start camera with a slight delay to ensure proper initialization
        setTimeout(() => {
            startCamera();
        }, 100);
    }

    function startCamera() {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1152 },
                height: { ideal: 768 }
            } 
        })
        .then(stream => {
            video.srcObject = stream;
            // Ensure video plays when ready
            video.onloadedmetadata = () => {
                video.play().catch(err => {
                    console.error('Error playing video:', err);
                });
            };
        })
        .catch(err => {
            console.error('Error accessing camera:', err);
            alert('Unable to access camera. Please make sure you have granted camera permissions.');
        });
    }

    function stopCamera() {
        if (video.srcObject) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
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
            // Extract image ID from URL if possible
            const urlParams = new URLSearchParams(new URL(imageUrl).search);
            const filename = urlParams.get('filename');
            const imageId = filename ? filename.split('.')[0] : Date.now().toString(36);
            
            // Store the image
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
                    // Create share URL
                    const shareUrl = `${window.location.origin}/share/${imageId}`;
                    
                    // Clear and generate new QR code
                    qrCodeElement.innerHTML = '';
                    new QRCode(qrCodeElement, {
                        text: shareUrl,
                        width: 128,
                        height: 128,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });

                    // Update image source only if not reused
                    if (!data.reused) {
                        generatedImage.src = data.localUrl;
                    }
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
                    // Handle potential proxied URL
                    const imageUrl = data.imageUrl.startsWith('http') ? 
                        `/proxy-image?url=${encodeURIComponent(data.imageUrl)}` : 
                        data.imageUrl;
                    
                    generatedImage.src = imageUrl;
                    document.getElementById('resultMessage').textContent = data.message;
                    
                    // Wait for image to load before showing
                    generatedImage.onload = () => {
                        stopProgressBar(true);
                        
                        setTimeout(() => {
                            document.querySelector('.loading-animation').style.display = 'none';
                            resultContainer.classList.remove('hidden');
                            
                            // Generate QR code after showing the result
                            try {
                                generateQRCode(imageUrl);
                            } catch (error) {
                                console.error('Error in QR code generation:', error);
                                document.getElementById('qrContainer').style.display = 'none';
                            }
                        }, 500);
                    };

                    // Handle image load error
                    generatedImage.onerror = () => {
                        console.error('Error loading generated image');
                        stopProgressBar(false);
                        alert('Error loading the generated image. Please try again.');
                        startOver();
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
        
        // Stop camera if it's running
        stopCamera();
        
        // Reset UI elements
        document.querySelector('.loading-animation').style.display = 'block';
        resultContainer.classList.add('hidden');
        generatedImage.src = '';
        document.getElementById('resultMessage').textContent = '';
        if (qrCodeElement) {
            qrCodeElement.innerHTML = '';
        }
        
        // Reset camera interface
        cameraInterface.classList.add('hidden');
        cameraPrompt.classList.remove('hidden');
        
        // Clear progress
        clearInterval(progressInterval);
        progressBar.style.width = '0%';
        progressText.textContent = 'Starting generation...';
        
        // Reset all selection buttons
        document.querySelectorAll('.outline-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Reset frame selection radio buttons
        document.querySelectorAll('input[name="frame"]').forEach(radio => {
            radio.checked = false;
        });
        
        // Show first step
        showStep(1);
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