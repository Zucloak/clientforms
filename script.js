// script.js
// Import necessary Firestore modules for direct use in this script.
// db, userId, appId, and Timestamp will be retrieved from the window object.
import { collection, query, where, getDocs, addDoc, Timestamp, endAt, startAt } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Declare variables to hold Firebase objects.
// These will be populated from the window object once firebase-init-client.js has run.
let db;
let userId;
let appId;
// Timestamp is directly imported now, so no need to get it from window
// For this setup, we'll rely on the imported Timestamp from firestore.

/**
 * Updates the Firebase status message on the UI.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'connecting'.
 */
const updateFirebaseStatusUI = (message, type) => {
    const statusElement = document.getElementById('firebaseStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500'); // Reset colors

        if (type === 'success') {
            statusElement.classList.add('text-green-500');
            statusElement.classList.remove('hidden'); // Show on success
        } else if (type === 'error') {
            statusElement.classList.add('text-red-500');
            statusElement.classList.remove('hidden'); // Show on error
        } else if (type === 'connecting') {
            statusElement.classList.add('text-yellow-500');
            statusElement.classList.remove('hidden'); // Show on connecting
        } else {
            statusElement.classList.add('hidden'); // Hide for other or unknown states
        }
    }
};


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
            // Check if window properties set by firebase-init-client.js are available
            if (window.db && window.userId && window.appId) {
                db = window.db; // Assign to local module variables
                userId = window.userId;
                appId = window.appId;
                clearInterval(interval);
                console.log("script.js: Firebase globals are ready in main script.");
                updateFirebaseStatusUI("Forms are updated in real time.", "success");
                resolve();
            } else if (checkCount >= maxChecks) {
                clearInterval(interval);
                const errorMessage = `Firebase initialization timed out. Globals status: db=${!!window.db}, userId=${!!window.userId}, appId=${!!window.appId}`;
                console.error("script.js:", errorMessage);
                updateFirebaseStatusUI("Forms are offline: Initialization error.", "error"); // Specific error
                reject(new Error(errorMessage)); // Reject the promise on timeout
            }
            checkCount++;
        }, 100);
    });
};

// Initial status update when the main script loads
updateFirebaseStatusUI("Connecting to Forms...", "connecting");


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

// New Duration Option elements
const fixedDurationRadio = document.querySelector('input[name="meetingDurationOption"][value="fixed"]');
const customDurationRadio = document.querySelector('input[name="meetingDurationOption"][value="custom"]');
const meetingEndTimeGroup = document.getElementById('meetingEndTimeGroup'); // Div that holds the end time input

const meetingDate = document.getElementById('meetingDate');
const meetingStartTime = document.getElementById('meetingStartTime'); // Renamed from meetingTime
const meetingEndTime = document.getElementById('meetingEndTime'); // New element

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
// FIX: Changed to reference the new 'typeOfOrderInput' (text input)
const typeOfOrderInput = document.getElementById('typeOfOrderInput');


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

// Initial display when the page loads
showStep(0); // Start at step 0

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

    // Determine which time inputs are required based on duration option
    const requiredTimeFields = [detailedDescription, meetingDate, meetingStartTime];
    if (customDurationRadio.checked) {
        requiredTimeFields.push(meetingEndTime);
    }

    // Check HTML5 validation for required fields in Step 1
    for (const field of requiredTimeFields) {
        if (!field.checkValidity()) {
            field.reportValidity(); // Show native browser error
            formMessage.textContent = `Please fill out the "${field.previousElementSibling.textContent.trim()}" field.`;
            formMessage.classList.add('text-red-300');
            return false;
        }
    }

    // Custom validation for the custom dropdown
    // FIX: Referencing the new 'typeOfOrderInput' for validation
    if (!typeOfOrderInput.value) { // Use the input's value for validation
        formMessage.textContent = 'Please select a "Type of Order".';
        formMessage.classList.add('text-red-300');
        customDropdownButton.focus(); // Set focus to the dropdown button
        return false;
    }

    // If custom duration, validate start time is before end time
    if (customDurationRadio.checked) {
        const startTimeValue = meetingStartTime.value;
        const endTimeValue = meetingEndTime.value;

        if (startTimeValue && endTimeValue) {
            if (startTimeValue >= endTimeValue) {
                formMessage.textContent = 'End time must be after start time.';
                formMessage.classList.add('text-red-300');
                meetingEndTime.focus();
                return false;
            }
        }
    }


    // Check if meeting availability has been checked and is positive
    if (!availabilityMessage.classList.contains('text-green-500')) {
        formMessage.textContent = 'Please check meeting availability and ensure the selected slot is available.';
        availabilityMessage.classList.add('text-red-300');
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

// Function to determine availability based on overlaps
// This function assumes `start` and `end` are Date objects
function isOverlap(bookedStart, bookedEnd, requestedStart, requestedEnd) {
    return (requestedStart < bookedEnd && requestedEnd > bookedStart);
}

// Firebase Meeting Availability Check
checkAvailabilityBtn.addEventListener('click', async () => {
    try {
        // Ensure Firebase is ready before attempting database operations
        await checkFirebaseReady();

        const date = meetingDate.value;
        const startTimeValue = meetingStartTime.value;
        let endTimeValue = meetingEndTime.value; // Potentially empty if fixed duration

        // Validate if date and start time are selected
        if (!date || !startTimeValue) {
            availabilityMessage.textContent = 'Please select a date and start time.';
            availabilityMessage.classList.remove('text-green-500', 'text-yellow-500');
            availabilityMessage.classList.add('text-red-500');
            return;
        }

        // Calculate requested start and end Date objects
        const requestedStartDateTime = new Date(`${date}T${startTimeValue}:00`);
        let requestedEndDateTime;

        if (customDurationRadio.checked) {
            // Custom duration, end time is required
            if (!endTimeValue) {
                availabilityMessage.textContent = 'Please select an end time for custom duration.';
                availabilityMessage.classList.remove('text-green-500', 'text-yellow-500');
                availabilityMessage.classList.add('text-red-500');
                return;
            }
            requestedEndDateTime = new Date(`${date}T${endTimeValue}:00`);
            if (requestedStartDateTime >= requestedEndDateTime) {
                availabilityMessage.textContent = 'End time must be after start time.';
                availabilityMessage.classList.remove('text-green-500', 'text-yellow-500');
                availabilityMessage.classList.add('text-red-500');
                return;
            }
        } else {
            // Fixed 1-hour duration
            requestedEndDateTime = new Date(requestedStartDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour
        }


        availabilityMessage.textContent = 'Checking availability...';
        availabilityMessage.classList.remove('text-green-500', 'text-red-500');
        availabilityMessage.classList.add('text-yellow-500');

        // Query all meetings for the selected day from 'bookingDateTimes'
        // This is the key change to align with your security rules.
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Changed collection from 'bookedMeetings' to 'bookingDateTimes' for read access
        const meetingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookingDateTimes');

        const q = query(meetingsRef, 
            where('startTime', '>=', Timestamp.fromDate(startOfDay)),
            where('startTime', '<=', Timestamp.fromDate(endOfDay))
        );
        const querySnapshot = await getDocs(q);

        let isSlotAvailable = true;
        querySnapshot.forEach(doc => {
            const bookedMeeting = doc.data();
            const bookedStart = bookedMeeting.startTime.toDate();
            const bookedEnd = bookedMeeting.endTime.toDate();

            if (isOverlap(bookedStart, bookedEnd, requestedStartDateTime, requestedEndDateTime)) {
                isSlotAvailable = false;
                return; // Exit forEach early if an overlap is found
            }
        });

        if (isSlotAvailable) {
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

/**
 * Function to convert 24-hour time to 12-hour AM/PM format.
 * @param {string} time24h - Time string in HH:MM format (24-hour).
 * @returns {string} Formatted time string for sheets (e.g., "'04:15 PM").
 */
function formatTimeForDisplay(time24h) {
    if (!time24h) return '';
    const [hours, minutes] = time24h.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert 0 (midnight) to 12 AM, and hours > 12 to 12-hour format
    // FIX: Prepend a single quote to force Google Sheets to treat this as literal text
    return `'${formattedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Function to convert YYYY-MM-DD date string to a more readable format.
 * @param {string} dateString - Date string in YYYY-MM-DD format.
 * @returns {string} Formatted date string (e.g., "June 28, 2025").
 */
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
        // FIX: Now setting the value of the 'typeOfOrderInput' (text input)
        typeOfOrderInput.value = value; // Update the actual form input
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

// Event listeners for meeting duration radio buttons
fixedDurationRadio.addEventListener('change', () => {
    if (fixedDurationRadio.checked) {
        meetingEndTimeGroup.classList.add('hidden');
        meetingEndTime.removeAttribute('required'); // Remove required for fixed duration
        meetingEndTime.value = ''; // Clear end time when switching to fixed
        availabilityMessage.textContent = ''; // Clear availability message
        availabilityMessage.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500');
    }
});

customDurationRadio.addEventListener('change', () => {
    if (customDurationRadio.checked) {
        meetingEndTimeGroup.classList.remove('hidden');
        meetingEndTime.setAttribute('required', 'required'); // Add required for custom duration
        availabilityMessage.textContent = ''; // Clear availability message
        availabilityMessage.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500');
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
    // FIX: Get value from the now-visible (but sr-only) input
    data.typeOfOrder = sanitizeInput(typeOfOrderInput.value);
    data.detailedDescription = sanitizeInput(detailedDescription.value);
    // Send raw date value to Google Apps Script
    data.meetingDate = sanitizeInput(meetingDate.value); // Send YYYY-MM-DD

    const selectedDate = meetingDate.value;
    const startTimeValue = meetingStartTime.value;
    let endTimeValue = meetingEndTime.value;

    // Calculate actual start and end Date objects for storage and display
    const meetingStartDateTime = new Date(`${selectedDate}T${startTimeValue}:00`);
    let meetingEndDateTime;

    if (fixedDurationRadio.checked) {
        // Fixed 1-hour duration
        meetingEndDateTime = new Date(meetingStartDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour
    } else {
        // Custom duration
        meetingEndDateTime = new Date(`${selectedDate}T${endTimeValue}:00`);
    }

    // Convert to 12-hour format with AM/PM before sending to Google Sheets
    data.meetingStartTime = sanitizeInput(formatTimeForDisplay(startTimeValue));
    data.meetingEndTime = sanitizeInput(formatTimeForDisplay(meetingEndDateTime.toTimeString().substring(0, 5)));

    data.fullName = sanitizeInput(fullName.value);
    data.emailAddress = sanitizeInput(emailAddress.value); // Emails should be validated with regex, but sanitizing still applies
    data.phoneNumber = sanitizeInput(phoneNumber.value); // Phone numbers should be validated for format, sanitizing applied
    data.facebookProfile = sanitizeInput(facebookProfile.value); // URLs should also be validated later
    // FIX: Changed to .value, assuming instagramHandle is a standard text input
    data.instagramHandle = sanitizeInput(instagramHandle.value);
    data.twitterHandle = sanitizeInput(twitterHandle.value);
    data.meetingDurationType = fixedDurationRadio.checked ? '1 Hour Meeting' : 'Custom Duration';


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
            // Write to 'bookedMeetings' (private from client reads)
            const bookedMeetingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookedMeetings');
            await addDoc(bookedMeetingsRef, {
                startTime: Timestamp.fromDate(meetingStartDateTime),
                endTime: Timestamp.fromDate(meetingEndDateTime),
                bookedBy: userId,
                clientEmail: data.emailAddress,
                clientName: data.fullName,
                orderType: data.typeOfOrder,
                createdAt: Timestamp.now(),
                durationType: data.meetingDurationType
            });
            console.log("Meeting successfully booked (written) to bookedMeetings in Firestore.");

            // Additionally, write a simplified entry to 'bookingDateTimes' for public availability checks
            const bookingDateTimesRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookingDateTimes');
            await addDoc(bookingDateTimesRef, {
                startTime: Timestamp.fromDate(meetingStartDateTime),
                endTime: Timestamp.fromDate(meetingEndDateTime),
                createdAt: Timestamp.now(),
                // Keep minimal info here as it's publicly readable
            });
            console.log("Meeting availability slot successfully added to bookingDateTimes in Firestore.");

        } else {
            console.warn("Firebase not initialized or userId/appId missing, meeting not fully processed in Firestore.");
        }

        // Populate submitted details on the success page with FORMATTED values
        let detailsHtml = '';
        // Mapping of form field names to more readable labels
        const fieldLabels = {
            typeOfOrder: 'Type of Order',
            detailedDescription: 'Detailed Description',
            meetingDate: 'Meeting Date',
            meetingStartTime: 'Meeting Start Time',
            meetingEndTime: 'Meeting End Time',
            meetingDurationType: 'Meeting Duration Type',
            fullName: 'Full Name',
            emailAddress: 'Email Address',
            phoneNumber: 'Phone Number',
            facebookProfile: 'Facebook Profile/Page URL',
            instagramHandle: 'Instagram Handle',
            twitterHandle: 'Twitter/X Handle'
        };

        // Create a temporary object for display purposes. The `data` object already contains
        // the correctly formatted time strings (e.g., "'04:30 PM'"). The issue was calling
        // `formatTimeForDisplay` again on these already-formatted strings, which corrupted them.
        // The fix is to simply use the values from `data` and remove the leading single quote,
        // which is only needed for Google Sheets.
        const displayData = { ...data };
        displayData.meetingDate = formatDateForDisplay(data.meetingDate); // Format the date for display

        // For time, remove the sheet-specific quote character for clean display. Do not re-format.
        displayData.meetingStartTime = data.meetingStartTime ? data.meetingStartTime.replace(/'/g, '') : '';
        
        if (customDurationRadio.checked) {
             displayData.meetingEndTime = data.meetingEndTime ? data.meetingEndTime.replace(/'/g, '') : '';
        } else {
             displayData.meetingEndTime = "N/A (1 Hour Meeting)";
        }

        for (const key in displayData) { // Loop through the displayData
            if (displayData.hasOwnProperty(key) && displayData[key] && displayData[key] !== "N/A (1 Hour Meeting)") {
                const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                detailsHtml += `<p class="mb-2"><span class="font-bold text-amber-200">${label}:</span> ${displayData[key]}</p>`;
            }
        }
        
        // Add a creative and professional marketing message
        detailsHtml += `<hr class="my-6 border-purple-400 opacity-30">`; // A subtle separator
        detailsHtml += `<div class="mt-4 text-center">
            <p class="text-amber-100 text-sm">
                <span class="font-bold">A Pro Tip:</span> Punctuality pays off! Arrive a few minutes early to our scheduled meeting, and you might unlock an exclusive deal. We look forward to connecting with you.
            </p>
        </div>`;
        
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
        formMessage.classList.add('text-red-500'); // Changed to red for visibility
    }
});

// Event listener for "Fill Another Request" button
fillAgainBtn.addEventListener('click', () => {
    successMessageContainer.classList.add('hidden'); // Hide success message
    formContainer.classList.remove('hidden'); // Show form container
    form.reset(); // Reset the form fields

    // Reset custom dropdown state
    selectedOptionText.textContent = 'Select Order Type';
    // FIX: Clear the value of the new 'typeOfOrderInput' (text input)
    typeOfOrderInput.value = ''; // Clear the actual form input

    customDropdownButton.setAttribute('aria-expanded', 'false');
    dropdownOptions.classList.add('hidden');
    dropdownArrow.classList.remove('rotate-180');


    // Reset duration options to default (1 hour)
    fixedDurationRadio.checked = true;
    meetingEndTimeGroup.classList.add('hidden');
    meetingEndTime.removeAttribute('required');
    meetingEndTime.value = '';

    showStep(0); // Go back to the first step (Step 0)
    availabilityMessage.textContent = ''; // Clear availability message
    availabilityMessage.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500');
});


// Ensure Firebase is ready before allowing any interactions that depend on it.
// This is crucial because the Firebase SDK script loads asynchronously.
window.onload = async () => {
    try {
        // checkFirebaseReady() will resolve once auth is complete and userId is available
        await checkFirebaseReady();
        console.log("All scripts loaded and Firebase ready for interactions.");
    } catch (error) {
        console.error("Firebase readiness check failed on onload:", error);
    }
};
