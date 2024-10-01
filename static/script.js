// Wait for the DOM to be fully loaded before executing the script
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    console.log("Initializing app...");
    // DOM element references
    const elements = {
        answerInput: document.getElementById('answer'),
        submitButton: document.getElementById('submit'),
        flashOutput: document.getElementById('flash'),
        proOutput: document.getElementById('pro'),
        progressBarFill: document.getElementById('progressBarFill'),
        progressBar: document.getElementById('progressBar'), // Add this line
        previousButton: document.getElementById('previous'),
        nextButton: document.getElementById('next'),
        summaryHeading: document.getElementById('summary-heading'),
        detailHeading: document.getElementById('detail-heading'), // Add this line
        buttonOverlay: document.querySelector('.button-overlay'),
        tryAgainButton: document.getElementById('tryAgain')
    };

    // Progress bar animation variables
    let currentProgress = 0;
    let targetProgress = 0;
    let animationInterval;
    let waitingForPro = false;

    // Initialize the app
    setFocus();
    setupEventListeners();

    // Helper functions
    function setFocus() {
        elements.answerInput.focus();
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault(); // Prevent default behavior
            fetchFeedback();
        }
    }

    // Progress bar functions
    function updateProgressBar(progress) {
        elements.progressBarFill.style.width = `${progress}%`;
        elements.progressBarFill.textContent = `${Math.round(progress)}%`;
        elements.progressBarFill.classList.toggle('loading', progress > 0 && progress < 100);
    }

    function animateProgress() {
        if (currentProgress < targetProgress) {
            const increment = calculateIncrement();
            currentProgress = Math.min(currentProgress + increment, targetProgress);
            const easedProgress = easeOutCubic(currentProgress / 100) * 100;
            updateProgressBar(easedProgress);

            if (currentProgress >= targetProgress) {
                clearInterval(animationInterval);
                if (targetProgress === 100) updateProgressBar(100);
            }
        }
    }

    function calculateIncrement() {
        if (waitingForPro && currentProgress >= 90) {
            return 0.1 * (1 - (currentProgress - 90) / 10);
        } else if (currentProgress >= 40 && currentProgress < 90) {
            return 0.5;
        } else {
            return 0.3;
        }
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function setProgress(progress) {
        targetProgress = progress;
        clearInterval(animationInterval);
        animationInterval = setInterval(animateProgress, 50);
    }

    // UI update functions
    function markdownToHtmlBold(text) {
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    function showNavigationButtons() {
        elements.buttonOverlay.classList.add('show-buttons');
        elements.tryAgainButton.classList.add('show-buttons');
    }

    function hideNavigationButtons() {
        elements.buttonOverlay.classList.remove('show-buttons');
        elements.tryAgainButton.classList.remove('show-buttons');
    }

    function handleScroll() {
        const scrollPosition = window.innerHeight + window.scrollY;
        const bodyHeight = document.body.offsetHeight;
        const offset = 100; // Adjust this value to trigger the display earlier or later

        if (scrollPosition > bodyHeight - offset) {
            showNavigationButtons();
        } else {
            hideNavigationButtons();
        }
    }

    // Main functionalities
    async function fetchFeedback() {
        console.log("fetchFeedback called");
        const answer = encodeURIComponent(elements.answerInput.value);
        console.log("Answer:", answer);
        resetUI();
        showProgressBar(); // Add this line

        try {
            console.log("Fetching flash response...");
            await fetchFlashResponse(answer);
            console.log("Fetching pro response...");
            await fetchProResponse(answer);
        } catch (error) {
            console.error('Error fetching feedback:', error);
            setProgress(0);
        } finally {
            showNavigationButtons();
        }
    }

    async function fetchFlashResponse(answer) {
        setProgress(20);
        console.log("Sending request to /ai_response/flash");
        const response = await fetch(`/ai_response/flash?answer=${answer}`).then(res => res.json());
        console.log("Received flash response:", response);
        setProgress(40);
        if (response.error) {
            console.error("Flash response error:", response.error);
            elements.flashOutput.innerHTML = `<p class="error">${response.error}</p>`;
        } else {
            elements.flashOutput.innerHTML = response.response;
        }
        await scrollToElement(elements.summaryHeading);
    }

    async function fetchProResponse(answer) {
        setProgress(80);
        waitingForPro = true;
        setProgress(95);
        console.log("Sending request to /ai_response/pro");
        const response = await fetch(`/ai_response/pro?answer=${answer}`).then(res => res.json());
        console.log("Received pro response:", response);
        waitingForPro = false;
        setProgress(100);
        if (response.error) {
            console.error("Pro response error:", response.error);
            elements.proOutput.innerHTML = `<p class="error">${response.error}</p>`;
        } else {
            elements.proOutput.innerHTML = markdownToHtmlBold(response.response);
        }
        await scrollToElement(elements.detailHeading);
    }

    function resetUI() {
        currentProgress = 0;
        waitingForPro = false;
        setProgress(0);
        hideNavigationButtons(); // Use this instead of removing classes individually
        elements.flashOutput.innerHTML = '';
        elements.proOutput.innerHTML = '';
        hideProgressBar(); // Add this line
    }

    function hideProgressBar() {
        elements.progressBar.style.display = 'none';
    }

    function showProgressBar() {
        elements.progressBar.style.display = 'block';
    }

    function navigate(direction) {
        fetch(`/${direction}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateQuestion(data.question);
                    resetUI();
                    resetProgressBar(); // Add this line
                    updateNavigationButtons(); // Add this line
                } else {
                    console.error(data.message);
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    function resetProgressBar() {
        currentProgress = 0;
        targetProgress = 0;
        clearInterval(animationInterval);
        updateProgressBar(0);
        hideProgressBar(); // Add this line
    }

    function updateQuestion(data) {
        const insertTextElement = document.getElementById('insert-text');
        const questionTextElement = document.getElementById('question-text');
        const marksElement = document.getElementById('marks');
        const insertContainer = document.getElementById('question-container').querySelector('h2');

        if (data.insert_text) {
            insertTextElement.innerHTML = data.insert_text;
            insertContainer.style.display = 'block';
            insertTextElement.style.display = 'block';
        } else {
            insertContainer.style.display = 'none';
            insertTextElement.style.display = 'none';
        }

        questionTextElement.innerHTML = data.question_text;
        marksElement.innerHTML = `<strong>[${data.marks} marks]</strong>`;

        elements.answerInput.value = '';
        elements.flashOutput.textContent = '';
        elements.proOutput.textContent = '';
        setFocus();
        resetProgressBar();
        updateNavigationButtons();
    }

    function tryAgain() {
        elements.flashOutput.textContent = '';
        elements.proOutput.textContent = '';
        elements.answerInput.value = '';
        resetUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(setFocus, 500);
    }

    function loadQuestion(direction) {
        fetch(`/${direction}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('question').innerHTML = data.question;
                    updateQuestionNumber();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error:', error));
    }

    // Modify the updateNavigationButtons function
    function updateNavigationButtons() {
        fetch('/get_navigation_info')
            .then(response => response.json())
            .then(data => {
                const currentNumber = data.number;
                const totalQuestions = data.total;

                elements.previousButton.style.display = currentNumber === 0 ? 'none' : 'inline-block';
                elements.nextButton.style.display = currentNumber === totalQuestions - 1 ? 'none' : 'inline-block';
            })
            .catch(error => console.error('Error updating navigation buttons:', error));
    }

    // Modify the navigate function
    function navigate(direction) {
        fetch(`/${direction}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateQuestion(data);
                    resetUI();
                } else {
                    console.error(data.message);
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    // Add the missing setupEventListeners function
    function setupEventListeners() {
        console.log("Setting up event listeners...");
        elements.submitButton.addEventListener('click', fetchFeedback);
        elements.answerInput.addEventListener('keydown', handleKeyPress); // Changed from 'keypress' to 'keydown'
        elements.previousButton.addEventListener('click', () => {
            navigate('previous');
        });
        elements.nextButton.addEventListener('click', () => {
            navigate('next');
        });
        elements.tryAgainButton.addEventListener('click', tryAgain);
        
        // Add this line to listen for scroll events
        window.addEventListener('scroll', handleScroll);
        
        // Add this line to update navigation buttons on initial load
        updateNavigationButtons();
    }

    // Make fetchFeedback globally accessible
    window.fetchFeedback = fetchFeedback;

    // Initialize the app
    setFocus();
    setupEventListeners();

    // Add this new function
    async function scrollToElement(element) {
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return new Promise(resolve => setTimeout(resolve, 500)); // Wait for scroll to complete
        }
    }

    // Add this new function
    function updateNavigationButtons() {
        fetch('/get_navigation_info')
            .then(response => response.json())
            .then(data => {
                const currentNumber = data.number;
                const totalQuestions = data.total;

                elements.previousButton.style.display = currentNumber === 0 ? 'none' : 'inline-block';
                elements.nextButton.style.display = currentNumber === totalQuestions - 1 ? 'none' : 'inline-block';
            })
            .catch(error => console.error('Error updating navigation buttons:', error));
    }
}

// Remove the global handleScroll function