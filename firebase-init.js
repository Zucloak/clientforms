// firebase-init.js
// This script initializes Firebase services (App, Auth, Firestore).
// It now retrieves the Firebase configuration from the global 'window.firebaseConfig' object,
// which is expected to be set by a Vercel serverless function (e.g., api/firebase-config.js).

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Check if window.firebaseConfig is available.
// If it's not, it means the firebase-config.js proxy script wasn't loaded
// or the environment variables are missing.
const firebaseConfig = typeof window.firebaseConfig !== 'undefined' ? window.firebaseConfig : null;

// The global __app_id and __initial_auth_token are provided by the Canvas environment.
// Ensure they are accessed safely.
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig?.appId || 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let userId = 'anonymous_initializing'; // Initial state for debugging

console.log("firebase-init.js: Script started.");

// Get the Firebase status element from the HTML page.
const firebaseStatusElement = document.getElementById('firebaseStatus');

/**
 * Function to update the UI status based on Firebase connection state.
 * This function is now exposed globally for other scripts to use.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'warning' (or 'connecting').
 */
function updateFirebaseStatusUI(statusMessage, statusType) {
    if (firebaseStatusElement) {
        firebaseStatusElement.textContent = statusMessage;
        firebaseStatusElement.classList.remove('text-green-500', 'text-yellow-500', 'text-red-500');
        if (statusType === 'success') {
            firebaseStatusElement.classList.add('text-green-500');
        } else if (statusType === 'warning' || statusType === 'connecting') { // Added 'connecting' type
            firebaseStatusElement.classList.add('text-yellow-500');
        } else if (statusType === 'error') {
            firebaseStatusElement.classList.add('text-red-500');
        }
    }
}
// Expose the updateFirebaseStatusUI function globally
window.updateFirebaseStatusUI = updateFirebaseStatusUI;


// Check if firebaseConfig is valid and complete before initialization.
if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("firebase-init.js: Firebase config is incomplete or invalid. Cannot initialize Firebase.");
    updateFirebaseStatusUI('Firebase Config Missing or Invalid.', 'error');
} else {
    try {
        // Initialize Firebase app.
        app = initializeApp(firebaseConfig);
        auth = getAuth(app); // Get Auth instance.
        db = getFirestore(app); // Get Firestore instance.
        console.log("firebase-init.js: Firebase app, auth, db initialized.");
        updateFirebaseStatusUI('Firebase Initializing...', 'warning');

        // Listen for authentication state changes.
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in (either anonymously or via custom token).
                userId = user.uid;
                console.log("firebase-init.js: onAuthStateChanged - User IS signed in. UID:", userId);
            } else {
                // No user signed in. Attempt to sign in anonymously or with custom token.
                console.log("firebase-init.js: onAuthStateChanged - User NOT signed in. Attempting sign-in.");
                try {
                    if (initialAuthToken) {
                        // If a custom auth token is provided (e.g., from Canvas environment), use it.
                        const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                        userId = userCredential.user.uid;
                        console.log("firebase-init.js: Successfully signed in with custom token. UID:", userId);
                    } else {
                        // Fallback to anonymous sign-in if no custom token is available.
                        const userCredential = await signInAnonymously(auth);
                        userId = userCredential.user.uid;
                        console.log("firebase-init.js: Successfully signed in anonymously. UID:", userId);
                    }
                } catch (error) {
                    console.error("firebase-init.js: Sign-in failed (anonymous or custom token)!", error);
                    userId = 'anonymous_failed'; // Indicate sign-in failed.
                    updateFirebaseStatusUI('Firebase Auth Failed. Check Console.', 'error');
                }
            }

            // Expose Firebase objects and user ID globally for other scripts to use.
            window.db = db;
            window.auth = auth;
            window.userId = userId; // The actual user ID from Firebase Auth.
            window.appId = appId;     // The Canvas app ID or fallback.
            window.Timestamp = Timestamp; // Firebase Timestamp utility.
            console.log("firebase-init.js: Global window variables set.");

            // Update UI status after authentication state is resolved.
            if (userId && userId !== 'anonymous_initializing' && userId !== 'anonymous_failed') {
                updateFirebaseStatusUI(`Firebase Connected: User ID ${userId}`, 'success');
            } else if (userId === 'anonymous_failed') {
                // Status already set to 'error' inside catch block.
            } else {
                // This case should ideally be covered by the specific success/error messages above.
                // Fallback for unexpected states or successful anonymous sign-in (if not already detailed).
                updateFirebaseStatusUI('Firebase Connected: Anonymous User', 'success');
            }
        });
    } catch (initError) {
        // Catch any errors during the initial `initializeApp` or `getAuth`/`getFirestore` calls.
        console.error("firebase-init.js: Error during Firebase initialization outside onAuthStateChanged!", initError);
        updateFirebaseStatusUI('Firebase Initialization Error.', 'error');
    }
}
