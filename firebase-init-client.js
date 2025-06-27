// firebase-init-client.js
// This script runs on the client-side to fetch Firebase config and initialize Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("firebase-init-client.js: Script started. Attempting to fetch Firebase config...");

/**
 * Fetches Firebase configuration from the Vercel API endpoint.
 * @returns {Promise<Object>} The Firebase config object.
 */
async function fetchFirebaseConfig() {
    try {
        const response = await fetch('/api/firebase-config.js'); // Adjust this path if your Vercel route is different
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // The response is a JavaScript file that sets window.firebaseConfig
        // We'll execute it directly to populate window.firebaseConfig
        const configScript = await response.text();
        eval(configScript); // Execute the script to set window.firebaseConfig
        console.log("firebase-init-client.js: Firebase config fetched and evaluated.");
        return window.firebaseConfig;
    } catch (error) {
        console.error("firebase-init-client.js: Error fetching Firebase config from API:", error);
        // Fallback to hardcoded config if fetching fails (useful for local development without Vercel API)
        console.warn("firebase-init-client.js: Falling back to hardcoded Firebase config.");
        return {
            apiKey: "AIzaSyAIBcfTKrasIj3X3LnJXRfj2oTSu_YKtJ8", // REPLACE WITH YOUR ACTUAL FALLBACK VALUES IF NEEDED
            authDomain: "synappse-client-meetings.firebaseapp.com",
            projectId: "synappse-client-meetings",
            storageBucket: "synappse-client-meetings.firebasestorage.app",
            messagingSenderId: "336007243846",
            appId: "1:336007243846:web:baba5edc6b5d07f50fc247",
            measurementId: "G-EZ79B24S00"
        };
    }
}

async function initializeFirebaseClient() {
    let firebaseConfigFromApi = {};
    let localAppId = 'default-synappse-app-id'; // Default if not provided by Vercel API

    // First, try to fetch the config from your Vercel endpoint
    firebaseConfigFromApi = await fetchFirebaseConfig();

    // Use the appId from the fetched config, or fallback
    localAppId = firebaseConfigFromApi.appId || localAppId;


    let app;
    let db;
    let auth;
    let userId = 'anonymous_initializing';

    // Update status UI
    const updateStatus = (message, type) => {
        const statusElement = document.getElementById('firebaseStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500', 'hidden');
            if (type === 'success') statusElement.classList.add('text-green-500');
            else if (type === 'error') statusElement.classList.add('text-red-500');
            else if (type === 'connecting') statusElement.classList.add('text-yellow-500');
            else statusElement.classList.add('hidden');
        }
    };

    updateStatus("Connecting to Forms...", "connecting");

    // Check if firebaseConfig has necessary details to proceed
    if (!firebaseConfigFromApi.apiKey || !firebaseConfigFromApi.projectId) {
        console.error("firebase-init-client.js: Firebase config (fetched or fallback) is incomplete or invalid. Cannot initialize Firebase.");
        updateStatus('Firebase Config Missing or Invalid.', 'error');
        return; // Exit if config is bad
    }

    try {
        app = initializeApp(firebaseConfigFromApi);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("firebase-init-client.js: Firebase app, auth, db initialized with fetched config.");

        // Attempt to sign in with custom token if available (from Canvas environment)
        // Otherwise, sign in anonymously.
        // NOTE: In a deployed Vercel app, __initial_auth_token will likely not be present.
        // You would typically handle user authentication (e.g., email/password, Google Auth) directly here.
        // For Canvas compatibility, we keep this structure.
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("firebase-init-client.js: onAuthStateChanged - User IS signed in. UID:", userId);
            } else {
                console.log("firebase-init-client.js: onAuthStateChanged - User NOT signed in. Attempting sign-in.");
                try {
                    if (initialAuthToken) {
                        const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                        userId = userCredential.user.uid;
                        console.log("firebase-init-client.js: Successfully signed in with custom token. UID:", userId);
                    } else {
                        const userCredential = await signInAnonymously(auth);
                        userId = userCredential.user.uid;
                        console.log("firebase-init-client.js: Successfully signed in anonymously. UID:", userId);
                    }
                } catch (error) {
                    console.error("firebase-init-client.js: Firebase sign-in failed!", error);
                    userId = 'authentication_failed'; // Indicate sign-in failed
                }
            }

            // Expose Firebase objects globally for the main script (script.js) to use
            window.db = db;
            window.auth = auth;
            window.userId = userId;
            window.appId = localAppId; // Use the appId determined from config
            window.Timestamp = Timestamp; // EXPLICITLY expose Timestamp
            console.log("firebase-init-client.js: Global window variables set.");

            // Update the Firebase status indicator on the HTML page
            if (userId && userId !== 'anonymous_initializing' && userId !== 'authentication_failed') {
                updateStatus(`Firebase Connected: User ID ${userId}`, 'success');
            } else if (userId === 'authentication_failed') {
                updateStatus('Firebase Auth Failed. Check Console.', 'error');
            } else {
                updateStatus('Firebase Connected: Anonymous User', 'success'); // Fallback for anonymous success/initializing
            }
        });
    } catch (initError) {
        console.error("firebase-init-client.js: Error during Firebase initialization:", initError);
        updateStatus('Firebase Initialization Error.', 'error');
    }
}

// Call the initialization function when this script loads
initializeFirebaseClient();
