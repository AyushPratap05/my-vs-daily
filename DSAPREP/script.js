// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables for Firebase instances and user data
let firebaseApp = null;
let db = null;
let auth = null;
let currentUserId = null;
let isAuthReady = false; // Flag to indicate if auth state is resolved

// Your Firebase configuration (PASTE YOUR CONFIG HERE FOR LOCAL TESTING)
// IMPORTANT: When deploying to Canvas, the Canvas environment will inject its own config.
// This localConfig is only used if __firebase_config is not provided by the environment.
const localFirebaseConfig = {
  apiKey: "AIzaSyC_5FdrYFIzZ9ntxnw4HVVO-8y3tb3wf4o",
  authDomain: "dsa-study-guide-app.firebaseapp.com",
  projectId: "dsa-study-guide-app",
  storageBucket: "dsa-study-guide-app.firebasestorage.app",
  messagingSenderId: "284384165477",
  appId: "1:284384165477:web:8c1992809ed1c56d0d108c",
  measurementId: "G-HKJHGRVZX4"
};

// Initialize Firebase and set up auth listener
async function initializeFirebaseAndAuth() {
    try {
        // Determine which Firebase config to use
        // Use Canvas-provided config if available, otherwise use local config
        const configToUse = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : localFirebaseConfig;
        
        // Determine which App ID to use
        const appId = typeof __app_id !== 'undefined' ? __app_id : configToUse.projectId; // Use projectId from config as fallback for APP_ID

        // Set APP_ID globally for other functions to use
        window.APP_ID = appId; 

        if (Object.keys(configToUse).length === 0) {
            console.error("Firebase configuration is missing. Please ensure __firebase_config is provided or localFirebaseConfig is set.");
            const errorMessageDiv = document.getElementById('error-message');
            if (errorMessageDiv) {
                errorMessageDiv.textContent = `Error: Firebase configuration is missing. Check console.`;
                errorMessageDiv.classList.remove('hidden');
            }
            return;
        }

        firebaseApp = initializeApp(configToUse);
        db = getFirestore(firebaseApp);
        auth = getAuth(firebaseApp);

        // Determine which initial auth token to use
        // Use Canvas-provided token if available, otherwise try anonymous sign-in
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }

        // Listen for authentication state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserId = user.uid;
                console.log("User authenticated:", currentUserId);
            } else {
                currentUserId = null;
                console.log("No user is signed in.");
            }
            isAuthReady = true; // Mark auth as ready
            document.dispatchEvent(new CustomEvent('authReady')); // Dispatch custom event
        });

    } catch (error) {
        console.error("Error initializing Firebase or signing in:", error);
        const errorMessageDiv = document.getElementById('error-message');
        if (errorMessageDiv) {
            errorMessageDiv.textContent = `Error: Could not initialize application. Please try again. (${error.message})`;
            errorMessageDiv.classList.remove('hidden');
        }
    }
}

// Call Firebase initialization immediately
initializeFirebaseAndAuth();

// Main application logic, runs after Firebase auth is ready
document.addEventListener('authReady', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const mainContent = document.getElementById('main-content');
    const userIdDisplay = document.getElementById('user-id-display');
    const errorMessageDiv = document.getElementById('error-message');

    // Ensure Firebase is initialized and user ID is available
    if (!isAuthReady || !db || !auth || !currentUserId) {
        errorMessageDiv.textContent = "Firebase not initialized or user not authenticated. Please refresh or check console for errors.";
        errorMessageDiv.classList.remove('hidden');
        loadingOverlay.classList.add('hidden');
        return;
    }

    userIdDisplay.textContent = `User ID: ${currentUserId}`;
    
    const topicsContainer = document.getElementById('topics-container');
    const detailsContent = document.getElementById('details-content');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    let allDsaTopics = []; // Will store topics fetched from Firestore
    let userCompletedTopics = new Set(); // Stores IDs of completed topics for the current user
    let selectedTopicId = null;

    // --- Firestore Paths ---
    // Use the globally set APP_ID
    const PUBLIC_DSA_TOPICS_COLLECTION = `artifacts/${window.APP_ID}/public/data/dsaTopics`;
    const USER_PROGRESS_DOC_PATH = `artifacts/${window.APP_ID}/users/${currentUserId}/progress/completedTopics`;

    // --- Gemini API Configuration ---
    const GEMINI_API_KEY = ""; // Leave as-is, Canvas will provide it at runtime
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

    // --- Utility for Exponential Backoff ---
    async function fetchWithExponentialBackoff(url, options, retries = 3, delay = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    if (response.status === 429 && i < retries - 1) { // Too Many Requests
                        await new Promise(res => setTimeout(res, delay));
                        delay *= 2; // Exponential backoff
                        continue;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error(`Fetch attempt ${i + 1} failed:`, error);
                if (i === retries - 1) throw error; // Re-throw after last retry
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
            }
        }
    }

    // --- Gemini API Call Functions ---
    async function askGeminiForConceptExplanation(question, topicTitle) {
        const prompt = `Explain the DSA concept "${question}" in the context of "${topicTitle}" in a concise and easy-to-understand manner. Provide a brief overview and its relevance.`;
        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };

        try {
            const result = await fetchWithExponentialBackoff(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                return result.candidates[0].content.parts[0].text;
            } else {
                throw new Error("Invalid response structure from Gemini API for concept explanation.");
            }
        } catch (error) {
            console.error("Error asking Gemini for concept explanation:", error);
            return "Sorry, I couldn't get an explanation right now. Please try again later.";
        }
    }

    async function getGeminiProblemHint(problemTitle, topicTitle) {
        const prompt = `Give a small, conceptual hint for the DSA problem "${problemTitle}" which is related to the topic "${topicTitle}". Do NOT provide the full solution or code. Focus on the core idea or a small step to get started.`;
        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };

        try {
            const result = await fetchWithExponentialBackoff(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                return result.candidates[0].content.parts[0].text;
            } else {
                throw new Error("Invalid response structure from Gemini API for problem hint.");
            }
        } catch (error) {
            console.error("Error getting Gemini problem hint:", error);
            return "Sorry, I couldn't generate a hint right now. Please try again later.";
        }
    }

    // --- Fetch DSA Topics from Firestore ---
    async function fetchDsaTopics() {
        try {
            const querySnapshot = await getDocs(collection(db, PUBLIC_DSA_TOPICS_COLLECTION));
            allDsaTopics = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort topics by a 'order' field if it exists, otherwise by title or a custom order
            allDsaTopics.sort((a, b) => (a.order || 0) - (b.order || 0)); 
            console.log("Fetched DSA Topics:", allDsaTopics);
        } catch (error) {
            console.error("Error fetching DSA topics:", error);
            errorMessageDiv.textContent = `Error loading topics: ${error.message}`;
            errorMessageDiv.classList.remove('hidden');
            return [];
        }
    }

    // --- Load User Progress from Firestore ---
    async function loadUserProgress() {
        try {
            const docRef = doc(db, USER_PROGRESS_DOC_PATH);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                userCompletedTopics = new Set(docSnap.data().completed || []);
                console.log("Loaded user progress:", userCompletedTopics);
            } else {
                console.log("No existing user progress found, creating new.");
                // Initialize document if it doesn't exist
                await setDoc(docRef, { completed: [] });
            }
        } catch (error) {
            console.error("Error loading user progress:", error);
            errorMessageDiv.textContent = `Error loading your progress: ${error.message}`;
            errorMessageDiv.classList.remove('hidden');
        }
    }

    // --- Save User Progress to Firestore ---
    async function saveUserProgress() {
        try {
            const docRef = doc(db, USER_PROGRESS_DOC_PATH);
            await setDoc(docRef, { completed: Array.from(userCompletedTopics) });
            console.log("User progress saved:", userCompletedTopics);
        } catch (error) {
            console.error("Error saving user progress:", error);
            errorMessageDiv.textContent = `Error saving your progress: ${error.message}`;
            errorMessageDiv.classList.remove('hidden');
        }
    }

    // --- Update Progress Bar and Text ---
    function updateProgress() {
        const totalTopics = allDsaTopics.length;
        const completedCount = userCompletedTopics.size;
        const percentage = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${completedCount} / ${totalTopics} Topics Completed`;
    }

    // --- Display Topic Details in Panel ---
    function displayTopicDetails(topic) {
        let problemsHtml = '';
        if (topic.problems && topic.problems.length > 0) {
            problemsHtml = `
                <div>
                    <h3 class="font-semibold text-lg text-gray-700">Example Problems & LeetCode Links</h3>
                    <ul class="list-disc pl-5 text-gray-600 space-y-2">
                        ${topic.problems.map((p, index) => `
                            <li class="flex flex-col mb-2">
                                <span>${p.title} 
                                ${p.link ? `<a href="${p.link}" target="_blank" class="text-blue-500 hover:underline">(LeetCode)</a>` : ''}
                                </span>
                                <button class="mt-1 px-3 py-1 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 self-start gemini-hint-btn" data-problem-title="${p.title}" data-topic-title="${topic.title}" data-problem-index="${index}">✨ Get Hint</button>
                                <div id="hint-response-${index}" class="gemini-response hidden"></div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        // Add HTML for companies
        let companiesHtml = '';
        if (topic.companies && topic.companies.length > 0) {
            companiesHtml = `
                <div>
                    <h3 class="font-semibold text-lg text-gray-700">Relevant Companies</h3>
                    <p class="text-gray-600">${topic.companies.join(', ')}</p>
                </div>
            `;
        }

        detailsContent.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-2">${topic.title}</h2>
            <div class="space-y-4">
                <div>
                    <h3 class="font-semibold text-lg text-gray-700">Why Learn This Next?</h3>
                    <p class="text-gray-600">${topic.why}</p>
                </div>
                <div>
                    <h3 class="font-semibold text-lg text-gray-700">Key Focus Areas</h3>
                    <p class="text-gray-600">${topic.focus}</p>
                </div>
                ${companiesHtml} <!-- INSERT NEW COMPANIES HTML HERE -->
                ${problemsHtml}
                <div class="mt-6 pt-4 border-t border-gray-200">
                    <h3 class="font-semibold text-lg text-gray-700 mb-2">✨ Ask Gemini about ${topic.title}</h3>
                    <textarea id="gemini-concept-query" class="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" rows="3" placeholder="e.g., What is dynamic programming?"></textarea>
                    <button id="ask-gemini-btn" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">Ask Gemini!</button>
                    <div id="gemini-concept-response" class="gemini-response hidden"></div>
                    <div id="gemini-concept-loading" class="gemini-loading hidden">Generating explanation...</div>
                </div>
            </div>
        `;

        // Add event listener for Concept Clarifier button
        const askGeminiBtn = document.getElementById('ask-gemini-btn');
        if (askGeminiBtn) {
            askGeminiBtn.addEventListener('click', async () => {
                const queryInput = document.getElementById('gemini-concept-query');
                const responseDiv = document.getElementById('gemini-concept-response');
                const loadingDiv = document.getElementById('gemini-concept-loading');
                const question = queryInput.value.trim();

                if (!question) {
                    responseDiv.textContent = "Please enter a question.";
                    responseDiv.classList.remove('hidden');
                    return;
                }

                responseDiv.classList.add('hidden');
                loadingDiv.classList.remove('hidden');
                responseDiv.textContent = '';

                const response = await askGeminiForConceptExplanation(question, topic.title);
                responseDiv.textContent = response;
                responseDiv.classList.remove('hidden');
                loadingDiv.classList.add('hidden');
            });
        }

        // Add event listeners for Problem Hint buttons
        document.querySelectorAll('.gemini-hint-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const problemTitle = e.target.dataset.problemTitle;
                const topicTitle = e.target.dataset.topicTitle;
                const problemIndex = e.target.dataset.problemIndex;
                const hintResponseDiv = document.getElementById(`hint-response-${problemIndex}`);
                
                e.target.disabled = true; // Disable button during loading
                e.target.textContent = 'Generating...';
                hintResponseDiv.classList.add('gemini-loading'); // Use loading style
                hintResponseDiv.classList.remove('hidden');
                hintResponseDiv.textContent = ''; // Clear previous hint

                const hint = await getGeminiProblemHint(problemTitle, topicTitle);
                hintResponseDiv.textContent = hint;
                hintResponseDiv.classList.remove('gemini-loading'); // Remove loading style
                e.target.textContent = '✨ Get Hint';
                e.target.disabled = false; // Re-enable button
            });
        });
    }

    // --- Render Topic Cards ---
    function renderTopicCards() {
        topicsContainer.innerHTML = ''; // Clear existing cards
        const groupedTopics = allDsaTopics.reduce((acc, topic) => {
            const phase = topic.phase || 'Uncategorized'; // Group by phase
            if (!acc[phase]) {
                acc[phase] = [];
            }
            acc[phase].push(topic);
            return acc;
        }, {});

        // Define a custom order for phases if needed, otherwise iterate keys
        const phaseOrder = [
            'Phase 1: Core Building Blocks & Techniques',
            'Phase 2: Advanced Data Structures',
            'Phase 3: Complex Algorithms & Specialized Structures',
            'Phase 4: The Grand Finale'
        ];

        phaseOrder.forEach(phaseKey => {
            if (groupedTopics[phaseKey]) {
                const phaseTitle = document.createElement('h2');
                phaseTitle.className = 'text-2xl font-bold text-gray-700 mt-8 mb-4';
                phaseTitle.textContent = phaseKey;
                topicsContainer.appendChild(phaseTitle);

                const phaseGrid = document.createElement('div');
                phaseGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

                groupedTopics[phaseKey].forEach(topic => {
                    const card = document.createElement('div');
                    card.id = `card-${topic.id}`;
                    card.className = `topic-card bg-white p-4 rounded-lg border-2 border-transparent cursor-pointer flex justify-between items-center ${userCompletedTopics.has(topic.id) ? 'completed' : ''}`;
                    card.innerHTML = `
                        <span class="font-semibold text-gray-800">${topic.title}</span>
                        <input type="checkbox" class="topic-checkbox form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500" data-id="${topic.id}" ${userCompletedTopics.has(topic.id) ? 'checked' : ''}>
                    `;
                    
                    card.addEventListener('click', (e) => {
                        if (e.target.type !== 'checkbox') {
                            if (selectedTopicId) {
                                document.getElementById(`card-${selectedTopicId}`).classList.remove('selected');
                            }
                            selectedTopicId = topic.id;
                            card.classList.add('selected');
                            displayTopicDetails(topic);
                        }
                    });

                    const checkbox = card.querySelector('.topic-checkbox');
                    checkbox.addEventListener('change', (e) => {
                        e.stopPropagation(); // Prevent card click event from firing
                        const cardElement = document.getElementById(`card-${topic.id}`);
                        if (e.target.checked) {
                            userCompletedTopics.add(topic.id);
                            cardElement.classList.add('completed');
                        } else {
                            userCompletedTopics.delete(topic.id);
                            cardElement.classList.remove('completed');
                        }
                        updateProgress();
                        saveUserProgress(); // Save progress to Firestore on change
                    });
                    phaseGrid.appendChild(card);
                });
                topicsContainer.appendChild(phaseGrid);
            }
        });
        updateProgress(); // Initial progress update after rendering
    }

    // --- Initialize Chart.js ---
    const ctx = document.getElementById('dailyPlanChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Concept Review', 'Problem Solving', 'Journaling'],
            datasets: [{
                label: 'Time Allocation (in mins)',
                data: [20, 70, 15],
                backgroundColor: [
                    'rgba(192, 132, 252, 0.6)',
                    'rgba(99, 102, 241, 0.6)',
                    'rgba(20, 184, 166, 0.6)',
                ],
                borderColor: [
                    'rgba(192, 132, 252, 1)',
                    'rgba(99, 102, 241, 1)',
                    'rgba(20, 184, 166, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Minutes'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw} mins`;
                        }
                    }
                }
            }
        }
    });

    // --- Main Initialization Flow ---
    try {
        await fetchDsaTopics();
        await loadUserProgress();
        renderTopicCards();
        updateProgress();
        loadingOverlay.classList.add('hidden');
        mainContent.classList.remove('hidden');

        // Display details for the first topic by default if any topics exist
        if (allDsaTopics.length > 0) {
            selectedTopicId = allDsaTopics[0].id;
            document.getElementById(`card-${selectedTopicId}`).classList.add('selected');
            displayTopicDetails(allDsaTopics[0]);
        }

    } catch (error) {
        console.error("Initialization failed:", error);
        errorMessageDiv.textContent = `Failed to load application data: ${error.message}. Please try again.`;
        errorMessageDiv.classList.remove('hidden');
        loadingOverlay.classList.add('hidden');
    }
});
