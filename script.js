// script.js
// This script contains the main application logic for the SYNAPPSE Order Request form.
// It interacts with Firebase (initialized by firebase-init.js) for meeting availability
// and form submission, and handles UI updates and form validation.

// Import necessary Firestore modules for direct use in this script.
// db, userId, appId, and Timestamp will be retrieved from the window object.
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Declare variables to hold Firebase objects.
// These will be populated from the window object once firebase-init.js has run.
let db;
let userId;
let appId;
let Timestamp; // Declare Timestamp as a local variable to be assigned from window


/**
 * Checks if Firebase is initialized and its global variables are available on the window object.
 * Resolves when ready, or rejects if it times out.
 * @returns {Promise<void>}
 */
const checkFirebaseReady = () => {
    return new Promise((resolve, reject) => {
        let checkCount = 0;
        const maxChecks = 50; // Try for 5 seconds (50 checks * 100ms)
        const interval = setInterval(() => {
            // Check if window properties set by firebase-init.js are available
            if (window.db && window.userId && window.appId && window.Timestamp && typeof window.updateFirebaseStatusUI === 'function') {
                db = window.db; // Assign to local module variables
                userId = window.userId;
                appId = window.appId;
                Timestamp = window.Timestamp; // Assign Timestamp from window
                clearInterval(interval);
                console.log("script.js: Firebase globals are ready in main script.");
                // Use the exposed status update function from firebase-init.js
                window.updateFirebaseStatusUI("Forms are updated in real time.", "success");
                resolve();
            } else if (checkCount >= maxChecks) {
                clearInterval(interval);
                const errorMessage = `Firebase initialization timed out in script.js. Globals status: db=${!!window.db}, userId=${!!window.userId}, appId=${!!window.appId}, Timestamp=${!!window.Timestamp}, updateStatusUI=${typeof window.updateFirebaseStatusUI}`;
                console.error("script.js:", errorMessage);
                // Use the exposed status update function if available, otherwise log.
                if (typeof window.updateFirebaseStatusUI === 'function') {
                    window.updateFirebaseStatusUI("Forms are offline: Initialization error.", "error"); // Specific error
                } else {
                    console.error("script.js: Could not update Firebase status UI, function not available.");
                }
                reject(new Error(errorMessage)); // Reject the promise on timeout
            }
            checkCount++;
        }, 100);
    });
};

// Get form and message elements
const formContainer = document.getElementById('formContainer'); // Main container for the form
const successMessageContainer = document.getElementById('successMessageContainer'); // New success message container
const submittedDetailsDiv = document.getElementById('submittedDetails'); // Div to display submitted details
const form = document.getElementById('orderForm');
const formMessage = document.getElementById('formMessage');

// Get form step elements and step indicator elements
const step0 = document.getElementById('step0'); // New step 0
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const stepIndicators = [
    document.getElementById('step-indicator-0'), // New indicator for step 0
    document.getElementById('step-indicator-1'),
    document.getElementById('step-indicator-2'),
    document.getElementById('step-indicator-3')
];

let currentStep = 0; // Track the current active step, starting from 0

// Form Elements for Validation - references to input fields
const agreeToTermsCheckbox = document.getElementById('agreeToTerms'); // New checkbox for step 0
const detailedDescription = document.getElementById('detailedDescription');
const meetingDate = document.getElementById('meetingDate');
const meetingTime = document.getElementById('meetingTime');
const fullName = document.getElementById('fullName');
const emailAddress = document.getElementById('emailAddress');
const phoneNumber = document.getElementById('phoneNumber');
const facebookProfile = document.getElementById('facebookProfile');
const instagramHandle = document.getElementById('instagramHandle');
const twitterHandle = document.getElementById('twitterHandle');


// Meeting Availability Elements
const checkAvailabilityBtn = document.getElementById('checkAvailabilityBtn');
const availabilityMessage = document.getElementById('availabilityMessage');
const fillAgainBtn = document.getElementById('fillAgainBtn'); // New button

// Custom Dropdown Logic
const customDropdownButton = document.getElementById('customDropdownButton');
const selectedOptionText = document.getElementById('selectedOptionText');
const dropdownOptions = document.getElementById('dropdownOptions');
const dropdownArrow = document.getElementById('dropdownArrow');
const typeOfOrderHiddenInput = document.getElementById('typeOfOrder');


// IMPORTANT: Replace with your deployed FormEasy Apps Script Web App URL
// This endpoint is used to submit form data to a Google Sheet via Google Apps Script.
const FORM_EASY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwk493phL80NU5ErryswrRgOmrN6fyzpUsSOGyhdXOhrEzPHtnxWq2feJOYa_a6SJG0/exec';

/**
 * Safely sanitizes input by escaping HTML characters and removing null bytes.
 * This helps prevent XSS attacks.
 * @param {string} value The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeInput(value) {
    if (typeof value !== 'string') {
        return value; // Return non-string values as is (e.g., numbers, dates which are often handled by input types)
    }
    // Remove null bytes
    let sanitized = value.replace(/\0/g, '');

    // Escape HTML entities to prevent script injection
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(sanitized));
    return div.innerHTML;
}

/**
 * Updates the visual appearance of the step indicators based on the current step.
 */
function updateStepIndicators() {
    stepIndicators.forEach((indicator, index) => {
        if (index === currentStep) {
            // Current step: white background, purple text
            indicator.classList.add('bg-white', 'text-purple-700');
            indicator.classList.remove('bg-gray-300', 'text-gray-700', 'bg-purple-400', 'text-white');
        } else if (index < currentStep) {
            // Completed step: purple background, white text
            indicator.classList.add('bg-purple-400', 'text-white');
            indicator.classList.remove('bg-white', 'text-purple-700', 'bg-gray-300', 'text-gray-700');
        } else {
            // Future step: gray background, gray text
            indicator.classList.add('bg-gray-300', 'text-gray-700');
            indicator.classList.remove('bg-white', 'text-purple-700', 'bg-purple-400', 'text-white');
        }
    });
}

/**
 * Shows a specific form step and hides others.
 * @param {number} stepNum - The step number to show (0, 1, 2, or 3).
 */
function showStep(stepNum) {
    // Hide all steps first
    step0.classList.add('hidden'); // Hide new step 0
    step1.classList.add('hidden');
    step2.classList.add('hidden');
    step3.classList.add('hidden');

    // Show the requested step
    switch(stepNum) {
        case 0: step0.classList.remove('hidden'); break;
        case 1: step1.classList.remove('hidden'); break;
        case 2: step2.classList.remove('hidden'); break;
        case 3: step3.classList.remove('hidden'); break;
    }
    currentStep = stepNum; // Update current step tracker
    updateStepIndicators(); // Update visual indicators
}

/**
 * Validates fields in Step 0.
 * @returns {boolean} True if terms are agreed, false otherwise.
 */
function validateStep0() {
    formMessage.textContent = ''; // Clear any previous messages
    formMessage.classList.remove('text-red-300', 'text-green-300', 'text-yellow-300');

    if (!agreeToTermsCheckbox.checked) {
        formMessage.textContent = 'You must agree to the Data Privacy Act Law and Terms of Service to proceed.';
        formMessage.classList.add('text-red-300');
        // Scroll to the top of the form message to make it visible
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    return true;
}

/**
 * Validates fields in Step 1.
 * @returns {boolean} True if all required fields in Step 1 are valid and availability is confirmed, false otherwise.
 */
function validateStep1() {
    // Clear any previous messages
    formMessage.textContent = '';
    formMessage.classList.remove('text-red-300', 'text-green-300', 'text-yellow-300');

    // Check HTML5 validation for required fields in Step 1
    const requiredFields1 = [detailedDescription, meetingDate, meetingTime];
    for (const field of requiredFields1) {
        if (!field.checkValidity()) {
            field.reportValidity(); // Show native browser error
            formMessage.textContent = `Please fill out the "${field.previousElementSibling.textContent.trim()}" field.`;
            formMessage.classList.add('text-red-300');
            return false;
        }
    }

    // Custom validation for the custom dropdown
    if (!typeOfOrderHiddenInput.value) { // Use the hidden input's value for validation
        formMessage.textContent = 'Please select a "Type of Order".';
        formMessage.classList.add('text-red-300');
        customDropdownButton.focus(); // Set focus to the dropdown button
        return false;
    }

    // Check if meeting availability has been checked and is positive
    if (!availabilityMessage.classList.contains('text-green-500')) {
        formMessage.textContent = 'Please check meeting availability and ensure the selected slot is available.';
        formMessage.classList.add('text-red-300');
        return false;
    }
    return true;
}

/**
 * Validates fields in Step 2.
 * @returns {boolean} True if all required fields in Step 2 are valid, false otherwise.
 */
function validateStep2() {
    // Clear any previous messages
    formMessage.textContent = '';
    formMessage.classList.remove('text-red-300', 'text-green-300', 'text-yellow-300');

    const requiredFields2 = [fullName, emailAddress, phoneNumber];
    for (const field of requiredFields2) {
        if (!field.checkValidity()) {
            field.reportValidity(); // Show native browser error
            formMessage.textContent = `Please fill out the "${field.previousElementSibling.textContent.trim()}" field.`;
            formMessage.classList.add('text-red-300');
            return false;
        }
    }
    return true;
}

// Event Listeners for Navigation Buttons
document.getElementById('next0').addEventListener('click', () => {
    if (validateStep0()) {
        showStep(1); // Move to Step 1 if Step 0 is valid
    }
});

document.getElementById('prev1').addEventListener('click', () => {
    showStep(0); // Go back to Step 0
});

document.getElementById('next1').addEventListener('click', () => {
    if (validateStep1()) {
        showStep(2); // Move to Step 2 if Step 1 is valid
    }
});

document.getElementById('prev2').addEventListener('click', () => {
    showStep(1); // Go back to Step 1
});

document.getElementById('next2').addEventListener('click', () => {
    if (validateStep2()) {
        showStep(3); // Move to Step 3 if Step 2 is valid
    }
});

document.getElementById('prev3').addEventListener('click', () => {
    showStep(2); // Go back to Step 2
});

// Firebase Meeting Availability Check
checkAvailabilityBtn.addEventListener('click', async () => {
    try {
        // Ensure Firebase is ready before attempting database operations
        await checkFirebaseReady();

        const date = meetingDate.value;
        const time = meetingTime.value;

        // Validate if date and time are selected
        if (!date || !time) {
            availabilityMessage.textContent = 'Please select both date and time.';
            availabilityMessage.classList.remove('text-green-500', 'text-yellow-500');
            availabilityMessage.classList.add('text-red-500');
            return;
        }

        // Combine date and time into a single Date object for Firestore comparison
        const selectedDateTime = new Date(`${date}T${time}:00`);

        availabilityMessage.textContent = 'Checking availability...';
        availabilityMessage.classList.remove('text-green-500', 'text-red-500');
        availabilityMessage.classList.add('text-yellow-500');

        // db, userId, appId, Timestamp are now globally available from window
        const meetingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookedMeetings');
        const q = query(meetingsRef, where('dateTime', '==', Timestamp.fromDate(selectedDateTime)));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // Slot is available
            availabilityMessage.textContent = '✅ This slot is available!';
            availabilityMessage.classList.remove('text-red-500', 'text-yellow-500');
            availabilityMessage.classList.add('text-green-500');
        } else {
            // Slot is already booked
            availabilityMessage.textContent = '❌ This slot is already booked. Please choose another time.';
            availabilityMessage.classList.remove('text-green-500', 'text-yellow-500');
            availabilityMessage.classList.add('text-red-500');
        }
    } catch (error) {
        console.error("Error checking meeting availability:", error);
        availabilityMessage.textContent = `Error checking availability: ${error.message}. Please check console for details.`;
        availabilityMessage.classList.remove('text-green-500', 'text-yellow-500');
        availabilityMessage.classList.add('text-red-500');
    }
});

// Function to convert 24-hour time to 12-hour AM/PM format
function formatTimeForDisplay(time24h) {
    if (!time24h) return '';
    const [hours, minutes] = time24h.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert 0 (midnight) to 12 AM, and hours > 12 to 12-hour format
    return `${formattedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Custom Dropdown Logic
customDropdownButton.addEventListener('click', () => {
    const isExpanded = customDropdownButton.getAttribute('aria-expanded') === 'true';
    customDropdownButton.setAttribute('aria-expanded', !isExpanded);
    dropdownOptions.classList.toggle('hidden', isExpanded);
    dropdownArrow.classList.toggle('rotate-180', !isExpanded);
});

// Event listener for selecting an option in the custom dropdown
dropdownOptions.addEventListener('click', (event) => {
    const selectedLi = event.target.closest('li');
    if (selectedLi) {
        const value = selectedLi.dataset.value;
        const text = selectedLi.textContent;
        selectedOptionText.textContent = text;
        typeOfOrderHiddenInput.value = value; // Update the hidden input's value
        customDropdownButton.setAttribute('aria-expanded', 'false');
        dropdownOptions.classList.add('hidden');
        dropdownArrow.classList.remove('rotate-180');
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    if (!customDropdownButton.contains(event.target) && !dropdownOptions.contains(event.target)) {
        customDropdownButton.setAttribute('aria-expanded', 'false');
        dropdownOptions.classList.add('hidden');
        dropdownArrow.classList.remove('rotate-180');
    }
});

// Form Submission Handler
form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission to handle it via JavaScript

    // Final validation for step 2 before submission (Step 3 fields are optional)
    if (!validateStep2()) {
        showStep(2); // Go back to step 2 if invalid
        return;
    }
    // Ensure meeting slot is confirmed available before final submission
    if (!availabilityMessage.classList.contains('text-green-500')) {
        formMessage.textContent = 'Please re-check meeting availability and ensure it is available before submitting.';
        formMessage.classList.remove('text-green-300');
        formMessage.classList.add('text-red-300');
        showStep(1); // Go back to step 1 to re-check
        return;
    }

    formMessage.textContent = ''; // Clear previous messages
    formMessage.className = 'mt-4 text-center text-sm font-medium text-white'; // Reset classes

    const data = {};
    // Sanitize and collect data from form fields
    data.typeOfOrder = sanitizeInput(typeOfOrderHiddenInput.value);
    data.detailedDescription = sanitizeInput(detailedDescription.value);
    data.meetingDate = sanitizeInput(meetingDate.value); // Dates are generally safer, but sanitizing doesn't hurt.

    // Store original 24-hour time for Firestore Timestamp, but send formatted for FormEasy
    const originalMeetingTime24h = meetingTime.value;
    data.meetingTime = sanitizeInput(formatTimeForDisplay(originalMeetingTime24h)); // Sanitize formatted time

    data.fullName = sanitizeInput(fullName.value);
    data.emailAddress = sanitizeInput(emailAddress.value); // Emails should be validated with regex, but sanitizing still applies
    data.phoneNumber = sanitizeInput(phoneNumber.value); // Phone numbers should be validated for format, sanitizing applied
    data.facebookProfile = sanitizeInput(facebookProfile.value); // URLs should also be validated later
    data.instagramHandle = sanitizeInput(instagramHandle.value);
    data.twitterHandle = sanitizeInput(twitterHandle.value);

    // Show a loading message during submission
    formMessage.textContent = 'Submitting order request...';
    formMessage.classList.add('text-yellow-300');

    try {
        // First, attempt to submit data to the FormEasy Apps Script endpoint
        const response = await fetch(FORM_EASY_ENDPOINT, {
            method: 'POST',
            mode: 'no-cors', // 'no-cors' is often required for Google Apps Script deployments
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // FormEasy expects this content type
            },
            body: JSON.stringify(data), // Send data as a JSON string
        });

        // Since 'no-cors' mode is used, we cannot inspect the response directly.
        // We assume success here and proceed to book the meeting in Firebase.
        if (db && userId && appId) {
            const selectedDate = meetingDate.value;
            // Use original 24-hour time for creating the Date object for Firestore Timestamp
            const dateTimeForBooking = new Date(`${selectedDate}T${originalMeetingTime24h}:00`);

            const meetingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookedMeetings');

            // Add the meeting booking to Firestore
            await addDoc(meetingsRef, {
                dateTime: Timestamp.fromDate(dateTimeForBooking), // Store meeting date/time as Firestore Timestamp
                bookedBy: userId, // Record the user who booked it
                clientEmail: data.emailAddress, // Store client email for reference
                clientName: data.fullName, // Store client name
                orderType: data.typeOfOrder, // Store order type from the form
                createdAt: Timestamp.now() // Record when the booking was created
            });
            console.log("Meeting successfully booked in Firestore:", dateTimeForBooking);
        } else {
            console.warn("Firebase not initialized or userId/appId missing, meeting not booked in Firestore.");
        }

        // Populate submitted details on the success page
        let detailsHtml = '';
        // Mapping of form field names to more readable labels
        const fieldLabels = {
            typeOfOrder: 'Type of Order',
            detailedDescription: 'Detailed Description',
            meetingDate: 'Meeting Date',
            meetingTime: 'Meeting Time', // This will now be the formatted time (AM/PM)
            fullName: 'Full Name',
            emailAddress: 'Email Address',
            phoneNumber: 'Phone Number',
            facebookProfile: 'Facebook Profile/Page URL',
            instagramHandle: 'Instagram Handle',
            twitterHandle: 'Twitter/X Handle'
        };
        for (const key in data) {
            if (data.hasOwnProperty(key) && data[key]) { // Only display fields that have a value
                const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Convert camelCase to readable
                detailsHtml += `<p class="mb-2"><span class="font-bold text-amber-200">${label}:</span> ${data[key]}</p>`;
            }
        }
        submittedDetailsDiv.innerHTML = detailsHtml;


        // Hide the form container and show the success message container
        formContainer.classList.add('hidden');
        successMessageContainer.classList.remove('hidden');

        // Clear form message as we are now on a new page
        formMessage.textContent = '';
        formMessage.classList.remove('text-yellow-300', 'text-red-300', 'text-green-300');

        // Reset step indicators visually for potential next fill
        stepIndicators.forEach(indicator => {
            indicator.classList.remove('bg-purple-400', 'text-white', 'bg-white', 'text-purple-700');
            indicator.classList.add('bg-gray-300', 'text-gray-700');
        });
        stepIndicators[0].classList.add('bg-white', 'text-purple-700'); // Set first indicator active for next fill

    } catch (error) {
        // This catch block now handles errors from checkFirebaseReady() as well.
        console.error('Error submitting form or booking meeting:', error);
        formMessage.textContent = `There was an error submitting your request: ${error.message}. Please try again.`;
        formMessage.classList.remove('text-yellow-300', 'text-green-300');
        formMessage.classList.add('text-red-300');
    }
});

// Event listener for "Fill Another Request" button
fillAgainBtn.addEventListener('click', () => {
    successMessageContainer.classList.add('hidden'); // Hide success message
    formContainer.classList.remove('hidden'); // Show form container
    form.reset(); // Reset the form fields

    // Reset custom dropdown state
    selectedOptionText.textContent = 'Select Order Type';
    typeOfOrderHiddenInput.value = ''; // Clear the hidden input's value
    customDropdownButton.setAttribute('aria-expanded', 'false');
    dropdownOptions.classList.add('hidden');
    dropdownArrow.classList.remove('rotate-180');


    showStep(0); // Go back to the first step (Step 0)
    availabilityMessage.textContent = ''; // Clear availability message
    availabilityMessage.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500');
});


// Ensure Firebase is ready before allowing any interactions that depend on it.
// This is crucial because the Firebase SDK script loads asynchronously.
window.onload = async () => {
    // Show the first step (Step 0) immediately upon page load.
    // This ensures the form content is visible while Firebase connects in the background.
    showStep(0); 

    try {
        // checkFirebaseReady() will resolve once auth is complete and userId is available
        await checkFirebaseReady();
        console.log("script.js: All scripts loaded and Firebase ready for interactions.");
    } catch (error) {
        console.error("script.js: Firebase readiness check failed on onload:", error);
    }
};

// --- Copy Protection Code ---
// Disable right-click (context menu)
document.addEventListener('contextmenu', e => e.preventDefault());

// Disable specific keyboard shortcuts for saving, inspecting, copying, printing, etc.
document.addEventListener('keydown', e => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey; // Checks for Ctrl on Windows/Linux, Cmd on Mac
    const isShift = e.shiftKey;

    if (
        // Developer Tools / Inspect Element
        e.key === 'F12' ||
        (isCtrlOrCmd && isShift && (e.key === 'I' || e.key === 'i')) || // Ctrl/Cmd + Shift + I
        (isCtrlOrCmd && isShift && (e.key === 'J' || e.key === 'j')) || // Ctrl/Cmd + Shift + J (Chrome/Edge Dev Tools)
        (isCtrlOrCmd && isShift && (e.key === 'C' || e.key === 'c')) || // Ctrl/Cmd + Shift + C (Inspect Element)

        // View Page Source
        (isCtrlOrCmd && (e.key === 'U' || e.key === 'u')) ||

        // Save Page As
        (isCtrlOrCmd && (e.key === 'S' || e.key === 's')) ||

        // Print
        (isCtrlOrCmd && (e.key === 'P' || e.key === 'p')) ||

        // Open file
        (isCtrlOrCmd && (e.key === 'O' || e.key === 'o')) ||

        // New window
        (isCtrlOrCmd && (e.key === 'N' || e.key === 'n')) ||

        // Copy (redundant but harmless layer)
        (isCtrlOrCmd && (e.key === 'C' || e.key === 'c')) ||

        // Select All
        (isCtrlOrCmd && (e.key === 'A' || e.key === 'a'))
    ) {
        e.preventDefault();
        // Optionally, for extremely stubborn cases, stop propagation immediately:
        // e.stopImmediatePropagation();
    }
});
// --- End Copy Protection Code ---
