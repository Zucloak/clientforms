// ... [other code unchanged] ...

import { collection, query, where, getDocs, addDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ... [other code unchanged] ...

// Firebase Meeting Availability Check
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

        // QUERY bookingDateTimes, not bookedMeetings!
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

// ... [other code unchanged] ...

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
            const bookingId = `${selectedDate.replace(/-/g, '')}_${originalMeetingTime24h.replace(/:/g, '')}_${userId}_${Date.now()}`; // unique id

            // --- 1. Write public dateTime ---
            const dateTimesRef = doc(db, 'artifacts', appId, 'public', 'data', 'bookingDateTimes', bookingId);
            await setDoc(dateTimesRef, {
                dateTime: Timestamp.fromDate(dateTimeForBooking)
            });

            // --- 2. Write private booking info ---
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
                // DO NOT include dateTime here, it's only in bookingDateTimes
            });

            console.log("Meeting successfully booked in Firestore:", dateTimeForBooking);
        } else {
            console.warn("Firebase not initialized or userId/appId missing, meeting not booked in Firestore.");
        }

        // ... [rest of success UI code unchanged] ...
        // [Populate submittedDetailsDiv, hide/show containers, reset indicators, etc.]

    } catch (error) {
        console.error('Error submitting form or booking meeting:', error);
        formMessage.textContent = `There was an error submitting your request: ${error.message}. Please try again.`;
        formMessage.classList.remove('text-yellow-300', 'text-green-300');
        formMessage.classList.add('text-red-300');
    }
});

// ... [rest of the file unchanged] ...
