// script.js (fully revised for Firestore split, robust form checks, all original features preserved)

import { collection, query, where, getDocs, addDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let db;
let userId;
let appId;
let Timestamp;

const checkFirebaseReady = () => {
    return new Promise((resolve, reject) => {
        let checkCount = 0;
        const maxChecks = 50;
        const interval = setInterval(() => {
            if (window.db && window.userId && window.appId && window.Timestamp && typeof window.updateFirebaseStatusUI === 'function') {
                db = window.db;
                userId = window.userId;
                appId = window.appId;
                Timestamp = window.Timestamp;
                clearInterval(interval);
                window.updateFirebaseStatusUI("Forms are updated in real time.", "success");
                resolve();
            } else if (checkCount >= maxChecks) {
                clearInterval(interval);
                const errorMessage = `Firebase initialization timed out in script.js. Globals status: db=${!!window.db}, userId=${!!window.userId}, appId=${!!window.appId}, Timestamp=${!!window.Timestamp}`;
                if (typeof window.updateFirebaseStatusUI === 'function') {
                    window.updateFirebaseStatusUI("Forms are offline: Initialization error.", "error");
                }
                reject(new Error(errorMessage));
            }
            checkCount++;
        }, 100);
    });
};

// Wait for DOMContentLoaded to ensure all elements exist before attaching listeners
document.addEventListener("DOMContentLoaded", () => {
    // --- Element refs ---
    const formContainer = document.getElementById('formContainer');
    const successMessageContainer = document.getElementById('successMessageContainer');
    const submittedDetailsDiv = document.getElementById('submittedDetails');
    const form = document.getElementById('orderForm');
    const formMessage = document.getElementById('formMessage');

    if (!form) {
        console.error('orderForm element not found in HTML!');
        return;
    }

    const step0 = document.getElementById('step0');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const stepIndicators = [
        document.getElementById('step-indicator-0'),
        document.getElementById('step-indicator-1'),
        document.getElementById('step-indicator-2'),
        document.getElementById('step-indicator-3')
    ];

    let currentStep = 0;

    const agreeToTermsCheckbox = document.getElementById('agreeToTerms');
    const detailedDescription = document.getElementById('detailedDescription');
    const meetingDate = document.getElementById('meetingDate');
    const meetingTime = document.getElementById('meetingTime');
    const fullName = document.getElementById('fullName');
    const emailAddress = document.getElementById('emailAddress');
    const phoneNumber = document.getElementById('phoneNumber');
    const facebookProfile = document.getElementById('facebookProfile');
    const instagramHandle = document.getElementById('instagramHandle');
    const twitterHandle = document.getElementById('twitterHandle');
    const checkAvailabilityBtn = document.getElementById('checkAvailabilityBtn');
    const availabilityMessage = document.getElementById('availabilityMessage');
    const fillAgainBtn = document.getElementById('fillAgainBtn');
    const customDropdownButton = document.getElementById('customDropdownButton');
    const selectedOptionText = document.getElementById('selectedOptionText');
    const dropdownOptions = document.getElementById('dropdownOptions');
    const dropdownArrow = document.getElementById('dropdownArrow');
    const typeOfOrderHiddenInput = document.getElementById('typeOfOrder');

    // --- Helper Functions ---
    function sanitizeInput(value) {
        if (typeof value !== 'string') return value;
        let sanitized = value.replace(/\0/g, '');
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(sanitized));
        return div.innerHTML;
    }
    function updateStepIndicators() {
        stepIndicators.forEach((indicator, index) => {
            if (index === currentStep) {
                indicator.classList.add('bg-white', 'text-purple-700');
                indicator.classList.remove('bg-gray-300', 'text-gray-700', 'bg-purple-400', 'text-white');
            } else if (index < currentStep) {
                indicator.classList.add('bg-purple-400', 'text-white');
                indicator.classList.remove('bg-white', 'text-purple-700', 'bg-gray-300', 'text-gray-700');
            } else {
                indicator.classList.add('bg-gray-300', 'text-gray-700');
                indicator.classList.remove('bg-white', 'text-purple-700', 'bg-purple-400', 'text-white');
            }
        });
    }
    function showStep(stepNum) {
        step0.classList.add('hidden');
        step1.classList.add('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
        switch(stepNum) {
            case 0: step0.classList.remove('hidden'); break;
            case 1: step1.classList.remove('hidden'); break;
            case 2: step2.classList.remove('hidden'); break;
            case 3: step3.classList.remove('hidden'); break;
        }
        currentStep = stepNum;
        updateStepIndicators();
    }
    function formatTimeForDisplay(time24h) {
        if (!time24h) return '';
        const [hours, minutes] = time24h.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    function validateStep0() {
        formMessage.textContent = '';
        formMessage.classList.remove('text-red-300', 'text-green-300', 'text-yellow-300');
        if (!agreeToTermsCheckbox.checked) {
            formMessage.textContent = 'You must agree to the Data Privacy Act Law and Terms of Service to proceed.';
            formMessage.classList.add('text-red-300');
            formMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        return true;
    }
    function validateStep1() {
        formMessage.textContent = '';
        formMessage.classList.remove('text-red-300', 'text-green-300', 'text-yellow-300');
        const requiredFields1 = [detailedDescription, meetingDate, meetingTime];
        for (const field of requiredFields1) {
            if (!field.checkValidity()) {
                field.reportValidity();
                formMessage.textContent = `Please fill out the "${field.previousElementSibling.textContent.trim()}" field.`;
                formMessage.classList.add('text-red-300');
                return false;
            }
        }
        if (!typeOfOrderHiddenInput.value) {
            formMessage.textContent = 'Please select a "Type of Order".';
            formMessage.classList.add('text-red-300');
            customDropdownButton.focus();
            return false;
        }
        if (!availabilityMessage.classList.contains('text-green-500')) {
            formMessage.textContent = 'Please check meeting availability and ensure the selected slot is available.';
            formMessage.classList.add('text-red-300');
            return false;
        }
        return true;
    }
    function validateStep2() {
        formMessage.textContent = '';
        formMessage.classList.remove('text-red-300', 'text-green-300', 'text-yellow-300');
        const requiredFields2 = [fullName, emailAddress, phoneNumber];
        for (const field of requiredFields2) {
            if (!field.checkValidity()) {
                field.reportValidity();
                formMessage.textContent = `Please fill out the "${field.previousElementSibling.textContent.trim()}" field.`;
                formMessage.classList.add('text-red-300');
                return false;
            }
        }
        return true;
    }

    // --- Navigation Buttons ---
    document.getElementById('next0').addEventListener('click', () => { if (validateStep0()) showStep(1); });
    document.getElementById('prev1').addEventListener('click', () => { showStep(0); });
    document.getElementById('next1').addEventListener('click', () => { if (validateStep1()) showStep(2); });
    document.getElementById('prev2').addEventListener('click', () => { showStep(1); });
    document.getElementById('next2').addEventListener('click', () => { if (validateStep2()) showStep(3); });
    document.getElementById('prev3').addEventListener('click', () => { showStep(2); });

    // --- Dropdown Logic ---
    customDropdownButton.addEventListener('click', () => {
        const isExpanded = customDropdownButton.getAttribute('aria-expanded') === 'true';
        customDropdownButton.setAttribute('aria-expanded', !isExpanded);
        dropdownOptions.classList.toggle('hidden', isExpanded);
        dropdownArrow.classList.toggle('rotate-180', !isExpanded);
    });
    dropdownOptions.addEventListener('click', (event) => {
        const selectedLi = event.target.closest('li');
        if (selectedLi) {
            const value = selectedLi.dataset.value;
            const text = selectedLi.textContent;
            selectedOptionText.textContent = text;
            typeOfOrderHiddenInput.value = value;
            customDropdownButton.setAttribute('aria-expanded', 'false');
            dropdownOptions.classList.add('hidden');
            dropdownArrow.classList.remove('rotate-180');
        }
    });
    document.addEventListener('click', (event) => {
        if (!customDropdownButton.contains(event.target) && !dropdownOptions.contains(event.target)) {
            customDropdownButton.setAttribute('aria-expanded', 'false');
            dropdownOptions.classList.add('hidden');
            dropdownArrow.classList.remove('rotate-180');
        }
    });

    // --- Firebase Meeting Availability Check (split collection) ---
    checkAvailabilityBtn.addEventListener('click', async () => {
        try {
            await checkFirebaseReady();
            const date = meetingDate.value;
            const time = meetingTime.value;
            if (!date || !time) {
                availabilityMessage.textContent = 'Please select both date and time.';
                availabilityMessage.classList.remove('text-green-500', 'text-yellow-500');
                availabilityMessage.classList.add('text-red-500');
                return;
            }
            const selectedDateTime = new Date(`${date}T${time}:00`);
            availabilityMessage.textContent = 'Checking availability...';
            availabilityMessage.classList.remove('text-green-500', 'text-red-500');
            availabilityMessage.classList.add('text-yellow-500');
            // Query bookingDateTimes collection!
            const dateTimesRef = collection(db, 'artifacts', appId, 'public', 'data', 'bookingDateTimes');
            const q = query(dateTimesRef, where('dateTime', '==', Timestamp.fromDate(selectedDateTime)));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                availabilityMessage.textContent = '✅ This slot is available!';
                availabilityMessage.classList.remove('text-red-500', 'text-yellow-500');
                availabilityMessage.classList.add('text-green-500');
            } else {
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

    // --- Form Submission Handler (split booking data) ---
    const FORM_EASY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwk493phL80NU5ErryswrRgOmrN6fyzpUsSOGyhdXOhrEzPHtnxWq2feJOYa_a6SJG0/exec';
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateStep2()) {
            showStep(2);
            return;
        }
        if (!availabilityMessage.classList.contains('text-green-500')) {
            formMessage.textContent = 'Please re-check meeting availability and ensure it is available before submitting.';
            formMessage.classList.remove('text-green-300');
            formMessage.classList.add('text-red-300');
            showStep(1);
            return;
        }
        formMessage.textContent = '';
        formMessage.className = 'mt-4 text-center text-sm font-medium text-white';
        const data = {};
        data.typeOfOrder = sanitizeInput(typeOfOrderHiddenInput.value);
        data.detailedDescription = sanitizeInput(detailedDescription.value);
        data.meetingDate = sanitizeInput(meetingDate.value);
        const originalMeetingTime24h = meetingTime.value;
        data.meetingTime = sanitizeInput(formatTimeForDisplay(originalMeetingTime24h));
        data.fullName = sanitizeInput(fullName.value);
        data.emailAddress = sanitizeInput(emailAddress.value);
        data.phoneNumber = sanitizeInput(phoneNumber.value);
        data.facebookProfile = sanitizeInput(facebookProfile.value);
        data.instagramHandle = sanitizeInput(instagramHandle.value);
        data.twitterHandle = sanitizeInput(twitterHandle.value);

        formMessage.textContent = 'Submitting order request...';
        formMessage.classList.add('text-yellow-300');

        try {
            // Submit to FormEasy
            await fetch(FORM_EASY_ENDPOINT, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain;charset=utf-8'},
                body: JSON.stringify(data),
            });

            if (db && userId && appId) {
                const selectedDate = meetingDate.value;
                const dateTimeForBooking = new Date(`${selectedDate}T${originalMeetingTime24h}:00`);
                // unique ID: use date, time, user, and ms timestamp
                const bookingId = `${selectedDate.replace(/-/g, '')}_${originalMeetingTime24h.replace(/:/g, '')}_${userId}_${Date.now()}`;

                // 1. Write public dateTime only
                const dateTimesRef = doc(db, 'artifacts', appId, 'public', 'data', 'bookingDateTimes', bookingId);
                await setDoc(dateTimesRef, {
                    dateTime: Timestamp.fromDate(dateTimeForBooking)
                });

                // 2. Write private booking info (NO dateTime here)
                const meetingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'bookedMeetings', bookingId);
                await setDoc(meetingsRef, {
                    bookedBy: userId,
                    clientEmail: data.emailAddress,
                    clientName: data.fullName,
                    orderType: data.typeOfOrder,
                    createdAt: Timestamp.now(),
                    detailedDescription: data.detailedDescription,
                    meetingDate: data.meetingDate,
                    meetingTime: data.meetingTime,
                    phoneNumber: data.phoneNumber,
                    facebookProfile: data.facebookProfile,
                    instagramHandle: data.instagramHandle,
                    twitterHandle: data.twitterHandle
                });

                console.log("Meeting successfully booked in Firestore:", dateTimeForBooking);
            } else {
                console.warn("Firebase not initialized or userId/appId missing, meeting not booked in Firestore.");
            }

            // Populate submitted details on the success page
            let detailsHtml = '';
            const fieldLabels = {
                typeOfOrder: 'Type of Order',
                detailedDescription: 'Detailed Description',
                meetingDate: 'Meeting Date',
                meetingTime: 'Meeting Time',
                fullName: 'Full Name',
                emailAddress: 'Email Address',
                phoneNumber: 'Phone Number',
                facebookProfile: 'Facebook Profile/Page URL',
                instagramHandle: 'Instagram Handle',
                twitterHandle: 'Twitter/X Handle'
            };
            for (const key in data) {
                if (data.hasOwnProperty(key) && data[key]) {
                    const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    detailsHtml += `<p class="mb-2"><span class="font-bold text-amber-200">${label}:</span> ${data[key]}</p>`;
                }
            }
            submittedDetailsDiv.innerHTML = detailsHtml;

            formContainer.classList.add('hidden');
            successMessageContainer.classList.remove('hidden');
            formMessage.textContent = '';
            formMessage.classList.remove('text-yellow-300', 'text-red-300', 'text-green-300');
            stepIndicators.forEach(indicator => {
                indicator.classList.remove('bg-purple-400', 'text-white', 'bg-white', 'text-purple-700');
                indicator.classList.add('bg-gray-300', 'text-gray-700');
            });
            stepIndicators[0].classList.add('bg-white', 'text-purple-700');

        } catch (error) {
            console.error('Error submitting form or booking meeting:', error);
            formMessage.textContent = `There was an error submitting your request: ${error.message}. Please try again.`;
            formMessage.classList.remove('text-yellow-300', 'text-green-300');
            formMessage.classList.add('text-red-300');
        }
    });

    // Fill Again Button
    fillAgainBtn.addEventListener('click', () => {
        successMessageContainer.classList.add('hidden');
        formContainer.classList.remove('hidden');
        form.reset();
        selectedOptionText.textContent = 'Select Order Type';
        typeOfOrderHiddenInput.value = '';
        customDropdownButton.setAttribute('aria-expanded', 'false');
        dropdownOptions.classList.add('hidden');
        dropdownArrow.classList.remove('rotate-180');
        showStep(0);
        availabilityMessage.textContent = '';
        availabilityMessage.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500');
    });

    // On page load, show first step and check Firebase
    showStep(0);
    window.onload = async () => {
        showStep(0);
        try {
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
