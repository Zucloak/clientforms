// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your actual Firebase project configuration (replace with your values)
const firebaseConfig = {
  apiKey: "AIzaSyAIBcfTKrasIj3X3LnJXRfj2oTSu_YKtJ8",
  authDomain: "synappse-client-meetings.firebaseapp.com",
  projectId: "synappse-client-meetings",
  storageBucket: "synappse-client-meetings.firebasestorage.app",
  messagingSenderId: "336007243846",
  appId: "1:336007243846:web:baba5edc6b5d07f50fc247",
  measurementId: "G-EZ79B24S00"
};

// Use the appId directly from your firebaseConfig
const appId = firebaseConfig.appId;

let app;
let db;
let auth;
let userId = 'anonymous'; // Default to anonymous

// Initialize Firebase if config is available
if (firebaseConfig.projectId) { // Check for a key that indicates valid config
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in, update userId
            userId = user.uid;
            console.log("Firebase Authenticated. User ID:", userId);
        } else {
            console.log("Firebase not authenticated, signing in anonymously.");
            try {
                // Sign in anonymously if not authenticated.
                // This part ensures that even without __initial_auth_token, an anonymous user is signed in.
                await signInAnonymously(auth);
                userId = auth.currentUser.uid;
                console.log("Signed in anonymously. User ID:", userId);
            } catch (error) {
                console.error("Firebase Auth Error in firebase-init.js:", error);
            }
        }
        // Expose Firebase objects globally for the main script to use
        // It's important to do this inside onAuthStateChanged to ensure they are available after auth status is determined.
        window.db = db;
        window.auth = auth;
        window.userId = userId;
        window.appId = appId;
        window.Timestamp = Timestamp;
        
        // Update the Firebase status indicator on the HTML page
        const firebaseStatusElement = document.getElementById('firebaseStatus');
        if (firebaseStatusElement) {
            if (userId && userId !== 'anonymous') {
                firebaseStatusElement.textContent = `Firebase Connected: User ID ${userId}`;
                firebaseStatusElement.classList.remove('text-red-500', 'text-yellow-500');
                firebaseStatusElement.classList.add('text-green-500');
            } else {
                firebaseStatusElement.textContent = 'Firebase Connected: Anonymous User';
                firebaseStatusElement.classList.remove('text-red-500', 'text-yellow-500');
                firebaseStatusElement.classList.add('text-green-500');
            }
        }
    });
} else {
    console.error("Firebase config is invalid in firebase-init.js. Cannot initialize Firebase.");
    const firebaseStatusElement = document.getElementById('firebaseStatus');
    if (firebaseStatusElement) {
        firebaseStatusElement.textContent = 'Firebase Config Missing.';
        firebaseStatusElement.classList.remove('text-green-500', 'text-yellow-500');
        firebaseStatusElement.classList.add('text-red-500');
    }
}
