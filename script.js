// ===================================================================
// 1. FIREBASE SETUP (MODULAR SDK v9+)
// ===================================================================
// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, getDocs, getDoc, query, where, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDXOBrYnnnOzb6ulp2RQ71aqFD2-V3qIMo",
    authDomain: "ai-timetable-genrator.firebaseapp.com",
    projectId: "ai-timetable-genrator",
    storageBucket: "ai-timetable-genrator.appspot.com",
    messagingSenderId: "1047358546635",
    appId: "1:1047358546635:web:a0436d749161b9ef02714e",
    measurementId: "G-161YB2XGED"
};

// Initialize Firebase
try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const API_BASE_URL = "http://127.0.0.1:5000";

    // This will hold the generated timetable data after a successful API call
    let masterTimetable = [];
    let mockStudentMarks = {};

    // ===================================================================
    // 2. PAGE-SPECIFIC LOGIC ROUTER
    // ===================================================================
    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('.landing-body')) initLandingPage();
        if (document.querySelector('.login-body')) {
            if (document.querySelector('a[href="register.html"]')) initLoginPage();
            else initRegisterPage();
        }
        if (document.querySelector('.main-content')) initMainApp(auth, db);
    });

    // ===================================================================
    // 3. LANDING, LOGIN & REGISTER PAGE LOGIC
    // ===================================================================
    function initLandingPage() {
        if (typeof anime === 'function') {
            anime({ targets: '.anim-title', opacity: [0, 1], translateY: [20, 0], duration: 800, easing: 'easeOutExpo', delay: 300 });
            anime({ targets: '.anim-fade-in', opacity: [0, 1], translateY: [20, 0], duration: 800, easing: 'easeOutExpo', delay: 500 });
        }
    }

    function initLoginPage() {
        if (typeof anime === 'function') {
            anime({ targets: '.anim-scale-in', opacity: [0, 1], scale: [0.95, 1], duration: 600, easing: 'easeOutCubic' });
            anime({ targets: '.anim-stagger', opacity: [0, 1], translateY: [15, 0], delay: anime.stagger(100, { start: 200 }), duration: 500, easing: 'easeOutCubic' });
        }
        const loginForm = document.querySelector('.login-form');
        if (!loginForm) return;
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            const loginButton = document.querySelector('.btn-login-submit');
            loginButton.textContent = 'Logging In...';
            loginButton.disabled = true;
            signInWithEmailAndPassword(auth, email, password)
                .then(() => {
                    loginButton.textContent = 'Success!';
                    loginButton.style.backgroundColor = '#2ecc71';
                    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                })
                .catch((error) => {
                    alert(`Login Failed: ${error.message}`);
                    loginButton.textContent = 'Login';
                    loginButton.disabled = false;
                });
        });
    }

    function initRegisterPage() {
        if (typeof anime === 'function') {
            anime({ targets: '.anim-scale-in', opacity: [0, 1], scale: [0.95, 1], duration: 600, easing: 'easeOutCubic' });
            anime({ targets: '.anim-stagger', opacity: [0, 1], translateY: [15, 0], delay: anime.stagger(100, { start: 200 }), duration: 500, easing: 'easeOutCubic' });
        }
        const registerForm = document.querySelector('.login-form');
        if (!registerForm) return;
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = registerForm.email.value;
            const password = registerForm.password.value;
            const confirmPassword = registerForm.confirmPassword.value;
            const name = email.split('@')[0];
            const registerButton = document.querySelector('.btn-login-submit');
            if (password !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }
            registerButton.textContent = 'Registering...';
            registerButton.disabled = true;
            createUserWithEmailAndPassword(auth, email, password)
                .then(async (userCredential) => {
                    const user = userCredential.user;
                    await addDoc(collection(db, "faculty"), {
                        name: name,
                        expertise: "Not specified",
                        email: user.email
                    });
                    registerButton.textContent = 'Account Created!';
                    registerButton.style.backgroundColor = '#2ecc71';
                    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                })
                .catch(err => {
                    alert(`Error: ${err.message}`);
                    registerButton.textContent = 'Register';
                    registerButton.disabled = false;
                });
        });
    }

    // ===================================================================
    // 4. MAIN APP LOGIC (`index.html`)
    // ===================================================================
    function initMainApp(auth, db) {
        onAuthStateChanged(auth, async user => {
            try {
                if (user) {
                    const facultyMember = await getLoggedInFaculty(user, db);
                    if (facultyMember) {
                        initializeAppLogic(facultyMember, auth, db);
                    } else {
                        console.error("Could not find a faculty profile for the logged-in user:", user.email);
                        alert("Could not find your faculty profile. Logging out.");
                        await signOut(auth);
                        window.location.href = 'login.html';
                    }
                } else {
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error("A critical error occurred during the authentication check:", error);
                alert("An error occurred while loading your profile. Please try logging in again.");
                window.location.href = 'login.html';
            }
        });
    }

    async function getLoggedInFaculty(user, db) {
        const q = query(collection(db, "faculty"), where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    }

    function initializeAppLogic(facultyMember, auth, db) {
        try {
            // For the hackathon, every user will have admin privileges.
            const isAdmin = true;

            initThemeToggle();
            initSidebarNavigation();
            initMobileNav();
            initDataManagement(facultyMember, auth, db, isAdmin);
            initFileUpload(db);
            initTimetableGeneration(auth, db);
            initStudentRecordsPage(facultyMember, auth, db, isAdmin);
            initManualAddToggles();
            initEditModal(); // Corrected: No longer passing `db`
            seedDatabase(db);
            
            if (typeof anime === 'function') {
                anime({ targets: '.anim-sidebar', translateX: [-260, 0], opacity: [0, 1], duration: 800, easing: 'easeOutExpo' });
                anime({ targets: '.main-content header', translateY: [-20, 0], opacity: [0, 1], duration: 800, easing: 'easeOutExpo', delay: 200 });
                anime({ targets: '.page.active', translateY: [20, 0], opacity: [0, 1], duration: 800, easing: 'easeOutExpo', delay: 400 });
            }

            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome, ${facultyMember.name}`;
            }

            renderDashboardWidgets(facultyMember);
            renderPersonalTimetable(facultyMember);
            
            const logoutButton = document.querySelector('.btn-logout');
            if (logoutButton) {
                logoutButton.addEventListener('click', () => {
                    signOut(auth).then(() => { window.location.href = 'landing.html'; });
                });
            }
        } catch (error) {
            console.error("Error initializing the main application:", error);
            alert("A critical error occurred while loading the application. Please try again.");
        }
    }

    // ===================================================================
    // 5. STUDENT RECORDS PAGE & PERSONALIZATION
    // ===================================================================
    function initStudentRecordsPage(facultyMember, auth, db, isAdmin) {
        const page = document.getElementById('students-page');
        if (!page) return;

        const actionSelector = document.getElementById('student-action-selector');
        const addStudentPanel = document.getElementById('add-student-container');
        const enterMarksPanel = document.getElementById('enter-marks-container');
        const testSelector = document.getElementById('test-selector');
        const studentTableBody = page.querySelector('.data-table tbody');
        const modal = document.getElementById('marks-modal');
        const marksForm = enterMarksPanel ? enterMarksPanel.querySelector('form') : null;

        if (actionSelector) {
            actionSelector.addEventListener('change', () => {
                document.querySelectorAll('.student-action-panel').forEach(panel => panel.classList.remove('active'));
                if (actionSelector.value === 'add_student' && addStudentPanel) {
                    addStudentPanel.classList.add('active');
                } else if (actionSelector.value === 'enter_marks' && enterMarksPanel) {
                    enterMarksPanel.classList.add('active');
                    populateMarksEntryDropdowns(facultyMember, db);
                }
            });
        }

        if (marksForm) {
            marksForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const studentRoll = marksForm.student_roll.value;
                const courseCode = marksForm.course_code.value;
                const testName = marksForm.test_name.value;
                const marks = parseInt(marksForm.marks.value, 10);

                if (!studentRoll || !courseCode || !testName || isNaN(marks)) {
                    showToast("Please fill all fields correctly.", "error");
                    return;
                }
                const q = query(collection(db, "students"), where("rollNumber", "==", studentRoll));
                const studentSnapshot = await getDocs(q);
                if (studentSnapshot.empty) {
                    showToast("Error: Student not found.", "error");
                    return;
                }
                const studentDocRef = studentSnapshot.docs[0].ref;
                try {
                    await setDoc(studentDocRef, { marks: { [courseCode]: { [testName]: marks, credits: 4 } } }, { merge: true });
                    showToast('Marks updated successfully!', 'success');
                    marksForm.reset();
                } catch (error) {
                    showToast(`Error: ${error.message}`, 'error');
                }
            });
        }

        if (testSelector) {
            testSelector.addEventListener('change', () => {
                loadAndDisplayData('students', facultyMember, auth, db, isAdmin);
            });
        }
        
        if (studentTableBody) {
            studentTableBody.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-view-marks')) {
                    const docId = e.target.closest('tr').dataset.id;
                    const studentDoc = await getDoc(doc(db, 'students', docId));
                    if (studentDoc.exists()) {
                        openMarksModal(studentDoc.data());
                    } else {
                        alert('No detailed marks available for this student.');
                    }
                }
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close-btn')) {
                    closeMarksModal();
                }
            });
        }
    }

    async function populateMarksEntryDropdowns(facultyMember, db) {
        const studentSelect = document.getElementById('marks-student-select');
        const courseSelect = document.getElementById('marks-course-select');
        if (!studentSelect || !courseSelect) return;
        
        const studentSnapshot = await getDocs(collection(db, 'students'));
        studentSelect.innerHTML = '<option value="" disabled selected>Select a student</option>';
        studentSnapshot.forEach(doc => {
            const student = doc.data();
            studentSelect.innerHTML += `<option value="${student.rollNumber}">${student.name} (${student.rollNumber})</option>`;
        });
        const teacherCourses = masterTimetable.filter(c => c.teacher === facultyMember.name).map(c => c.subject);
        courseSelect.innerHTML = '<option value="" disabled selected>Select a course</option>';
        [...new Set(teacherCourses)].forEach(courseCode => {
            courseSelect.innerHTML += `<option value="${courseCode}">${courseCode}</option>`;
        });
    }

    function getMarkForDisplay(studentData, selectedTest, facultyMember) {
        const studentMarks = studentData.marks || {};
        const teacherCourses = masterTimetable.filter(c => c.teacher === facultyMember.name).map(c => c.subject);
        if (selectedTest === 'overall') {
            const { totalPercentage } = calculateOverallMarks(studentMarks, teacherCourses);
            return `${totalPercentage.toFixed(0)}%`;
        } else {
            for (const course of teacherCourses) {
                if (studentMarks[course] && studentMarks[course][selectedTest]) {
                    return studentMarks[course][selectedTest];
                }
            }
            return 'N/A';
        }
    }

    function openMarksModal(studentData) {
        const modal = document.getElementById('marks-modal');
        const modalStudentName = document.getElementById('modal-student-name');
        const modalMarksContent = document.getElementById('modal-marks-content');
        if (!modal || !modalStudentName || !modalMarksContent) return;

        modalStudentName.textContent = `Detailed Marks for: ${studentData.name}`;
        let contentHTML = '<table class="marks-table"><thead><tr><th>Subject</th><th>Midterm 1</th><th>Final Project</th><th>End Sem Exam</th></tr></thead><tbody>';
        const marksData = studentData.marks || {};
        if (Object.keys(marksData).length === 0) {
            contentHTML += '<tr><td colspan="4">No marks entered for this student.</td></tr>';
        } else {
            for (const subject in marksData) {
                const marks = marksData[subject];
                contentHTML += `<tr><td>${subject}</td><td>${marks.midterm1 || 'N/A'}</td><td>${marks.final_project || 'N/A'}</td><td>${marks.end_sem_exam || 'N/A'}</td></tr>`;
            }
        }
        contentHTML += '</tbody></table>';
        const { totalPercentage, totalCredits } = calculateOverallMarks(marksData);
        contentHTML += `<div class="overall-summary"><span>Total Credits: ${totalCredits}</span> | <span>Overall Performance: ${totalPercentage.toFixed(1)}%</span></div>`;
        modalMarksContent.innerHTML = contentHTML;
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    function closeMarksModal() {
        const modal = document.getElementById('marks-modal');
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    function calculateOverallMarks(marksData, courseFilter = null) {
        let totalMarks = 0, totalMaxMarks = 0, totalCredits = 0;
        const coursesToConsider = courseFilter || Object.keys(marksData);
        for (const subject of coursesToConsider) {
            if (marksData[subject]) {
                const marks = marksData[subject];
                totalMarks += (marks.midterm1 || 0) + (marks.final_project || 0) + (marks.end_sem_exam || 0);
                totalMaxMarks += 300;
                totalCredits += parseInt(marksData[subject].credits) || 0;
            }
        }
        return {
            totalPercentage: totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0,
            totalCredits: totalCredits
        };
    }


    // ===================================================================
    // 6. CORE APP FUNCTIONS (UPDATED FOR EDITING)
    // ===================================================================
    function initDataManagement(facultyMember, auth, db, isAdmin) {
        const containers = document.querySelectorAll('.data-table-container');
        if (containers.length === 0) {
            console.warn("No '.data-table-container' elements found. Edit/Delete functionality will not be available.");
            return;
        }

        containers.forEach(container => {
            container.addEventListener('click', async (e) => {
                // Handle Edit Button Click
                const editButton = e.target.closest('.btn-edit');
                if (editButton) {
                    e.preventDefault();
                    const row = editButton.closest('tr');
                    const page = editButton.closest('.page');
                    if (!row || !page) {
                        console.error("Could not find parent 'tr' or '.page' for the clicked edit button.");
                        return;
                    }
                    const docId = row.dataset.id;
                    const collectionName = page.dataset.collection;
                    if (!docId || !collectionName) {
                        console.error("Missing 'data-id' on table row or 'data-collection' on page container.");
                        alert("Error: Could not identify the record to edit.");
                        return;
                    }
                    openEditModal(collectionName, docId, db);
                }

                // Handle Delete Button Click
                const deleteButton = e.target.closest('.btn-delete');
                if (deleteButton) {
                    e.preventDefault();
                    const row = deleteButton.closest('tr');
                    const page = deleteButton.closest('.page');
                    if (!row || !page) {
                        console.error("Could not find parent 'tr' or '.page' for the clicked delete button.");
                        return;
                    }
                    const docId = row.dataset.id;
                    const collectionName = page.dataset.collection;
                    if (!docId || !collectionName) {
                        console.error("Missing 'data-id' on table row or 'data-collection' on page container.");
                        alert("Error: Could not identify the record to delete.");
                        return;
                    }
                    if (confirm('Are you sure you want to delete this item?')) {
                        try {
                            await deleteDoc(doc(db, collectionName, docId));
                            showToast('Item deleted successfully.', 'success');
                        } catch (error) {
                            showToast(`Error deleting item: ${error.message}`, 'error');
                            console.error("Error deleting document:", error);
                        }
                    }
                }
            });
        });

        document.querySelectorAll('.add-form-container .input-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (form.closest('#enter-marks-container')) return;

                const collectionName = form.closest('.page').dataset.collection;
                const inputs = form.querySelectorAll('input, select');
                let dataObject = {};
                inputs.forEach(input => { if (input.name) dataObject[input.name] = input.value; });
                try {
                    await addDoc(collection(db, collectionName), dataObject);
                    showToast('New item added successfully.', 'success');
                    form.reset();
                } catch (err) {
                    showToast(`Error: ${err.message}`, 'error');
                }
            });
        });
        
        ['courses', 'faculty', 'rooms', 'students'].forEach(name => loadAndDisplayData(name, facultyMember, auth, db, isAdmin));
    }

    async function openEditModal(collectionName, docId, db) {
        const modal = document.getElementById('edit-modal');
        const title = document.getElementById('edit-modal-title');
        const fieldsContainer = document.getElementById('edit-modal-fields');
        const form = document.getElementById('edit-modal-form');
        
        if (!modal) {
            alert("CRITICAL ERROR: The modal element with ID 'edit-modal' was not found in your HTML file. The edit functionality cannot work without it.");
            console.error("Edit modal structure error: Missing #edit-modal");
            return;
        }
        if (!title || !fieldsContainer || !form) {
            alert("CRITICAL ERROR: The edit modal is missing required child elements. It needs elements with IDs: 'edit-modal-title', 'edit-modal-fields', and 'edit-modal-form'.");
            console.error("Edit modal structure error: Missing one or more of #edit-modal-title, #edit-modal-fields, #edit-modal-form");
            return;
        }
        
        fieldsContainer.innerHTML = '';

        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            showToast("Error: Document not found.", "error");
            return;
        }
        const data = docSnap.data();
        
        let formHTML = '';
        title.textContent = `Edit ${collectionName.slice(0, -1)}`;

        const fieldDefinitions = {
            courses: { code: 'text', name: 'text', credits: 'number', type: ['Theory', 'Practical/Lab'] },
            faculty: { name: 'text', expertise: 'text', email: 'email' },
            rooms: { id: 'text', capacity: 'number', type: ['Lecture Hall', 'Computer Lab'] },
            students: { name: 'text', rollNumber: 'text', program: 'text' }
        };
        
        const fields = fieldDefinitions[collectionName] || {};
        
        for (const key in fields) {
            if (Object.hasOwnProperty.call(fields, key)) {
                const fieldType = fields[key];
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const value = data[key] || '';
                
                if (Array.isArray(fieldType)) {
                    let optionsHTML = '';
                    fieldType.forEach(opt => {
                        optionsHTML += `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`;
                    });
                    formHTML += `<div class="form-group"><label for="edit-${key}">${label}</label><select id="edit-${key}" name="${key}">${optionsHTML}</select></div>`;
                } else {
                    formHTML += `<div class="form-group"><label for="edit-${key}">${label}</label><input type="${fieldType}" id="edit-${key}" name="${key}" value="${value}" required></div>`;
                }
            }
        }
        fieldsContainer.innerHTML = formHTML;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const updatedData = {};
            for (const [key, value] of formData.entries()) {
                updatedData[key] = value;
            }
            
            try {
                await updateDoc(docRef, updatedData);
                showToast("Record updated successfully.", "success");
                closeEditModal();
            } catch (error) {
                showToast(`Error: ${error.message}`, "error");
            }
        };

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    function closeEditModal() {
        const modal = document.getElementById('edit-modal');
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    function initEditModal() { // Corrected: No arguments needed
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close-btn')) {
                    closeEditModal();
                }
            });
        }
    }

    function loadAndDisplayData(collectionName, facultyMember, auth, db, isAdmin) {
        const tableBody = document.querySelector(`#${collectionName}-page .data-table tbody`);
        if (!tableBody) return;

        const teacherCourses = masterTimetable.filter(c => c.teacher === facultyMember.name).map(c => c.subject);

        onSnapshot(collection(db, collectionName), snapshot => {
            let rowsHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                let rowContent = '';
                let rowClass = '';

                switch (collectionName) {
                    case 'courses':
                        const isAssigned = teacherCourses.includes(data.code);
                        rowContent = `<td>${isAssigned ? '<i class="fa-solid fa-star assigned-icon"></i>' : ''}</td><td>${data.code || ''}</td><td>${data.name || ''}</td><td>${data.credits || ''}</td><td>${data.type || ''}</td>`;
                        break;
                    case 'faculty':
                        rowClass = data.email === facultyMember.email ? 'is-current-user' : '';
                        rowContent = `<td>${data.name || ''}</td><td>${data.expertise || ''}</td><td>${data.email || ''}</td>`;
                        break;
                    case 'rooms':
                        rowContent = `<td>${data.id || ''}</td><td>${data.capacity || ''}</td><td>${data.type || ''}</td>`;
                        break;
                    case 'students':
                        const testSelector = document.getElementById('test-selector');
                        const selectedTest = testSelector ? testSelector.value : 'overall';
                        const mark = getMarkForDisplay(data, selectedTest, facultyMember);
                        rowContent = `<td>${data.name || ''}</td><td>${data.rollNumber || ''}</td><td>${data.program || ''}</td><td>${mark}</td>`;
                        break;
                }
                
                const actions = `
                    <td>
                        ${collectionName === 'students' ? `<button class="btn-view-marks" data-id="${doc.id}">Details</button>` : ''}
                        <button class="btn-edit admin-only"><i class="fa-solid fa-pencil"></i></button>
                        <button class="btn-delete admin-only"><i class="fa-solid fa-trash-can"></i></button>
                    </td>`;

                rowsHTML += `<tr data-id="${doc.id}" data-roll="${data.rollNumber || ''}" class="${rowClass}">${rowContent}${actions}</tr>`;
            });
            
            const table = tableBody.closest('table');
            if (!table) return;
            const theadRow = table.querySelector('thead tr');
            const colspan = theadRow ? theadRow.children.length : 5; // Default colspan
            
            tableBody.innerHTML = rowsHTML || `<tr class="empty-row"><td colspan="${colspan}">No data found.</td></tr>`;
            updateAllEmptyStates();
            
            tableBody.querySelectorAll('.admin-only').forEach(elem => {
                elem.style.display = isAdmin ? 'inline-block' : 'none';
            });
        });
    }

    // ===================================================================
    // 7. HELPER & SIMULATION FUNCTIONS (COMPLETE)
    // ===================================================================
    function initThemeToggle() {
        const themeToggle = document.getElementById('checkbox');
        if (!themeToggle) return;
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.checked = currentTheme === 'dark';
        themeToggle.addEventListener('change', () => {
            const theme = themeToggle.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    function initSidebarNavigation() {
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        const pages = document.querySelectorAll('.page');
        const pageTitle = document.getElementById('page-title');

        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPageId = link.dataset.page + '-page';
                const targetPage = document.getElementById(targetPageId);
                const targetTitle = link.querySelector('span').textContent;
                
                sidebarLinks.forEach(l => l.classList.remove('active'));
                pages.forEach(p => p.classList.remove('active'));
                
                link.classList.add('active');
                if (targetPage) {
                    targetPage.classList.add('active');
                    if (typeof anime === 'function') {
                       anime({ targets: `#${targetPageId}`, translateY: [20, 0], opacity: [0, 1], duration: 600, easing: 'easeOutExpo' });
                    }
                }
                if (pageTitle) pageTitle.textContent = targetTitle;
                document.title = `AI Generator | ${targetTitle}`;
                document.body.classList.remove('sidebar-open');
            });
        });
    }

    function initMobileNav() {
        const mobileToggle = document.querySelector('.mobile-nav-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-open');
            });
        }
    }

    function initManualAddToggles() {
        document.querySelectorAll('.btn-show-form').forEach(button => {
            button.addEventListener('click', () => {
                const formContainer = button.closest('.page-header').nextElementSibling;
                if (formContainer && formContainer.classList.contains('add-form-container')) {
                    const isVisible = formContainer.style.display === 'block';
                    formContainer.style.display = isVisible ? 'none' : 'block';
                    button.textContent = isVisible ? `+ Add New` : '− Cancel';
                }
            });
        });
    }

    function updateEmptyState(table) {
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        const emptyRow = tbody.querySelector('.empty-row');
        const dataRows = tbody.querySelectorAll('tr:not(.empty-row)');
        if (emptyRow) emptyRow.style.display = dataRows.length === 0 ? 'table-row' : 'none';
    }

    function updateAllEmptyStates() {
        document.querySelectorAll('.data-table').forEach(table => updateEmptyState(table));
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.log(`Toast: ${message}`);
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3000);
    }
        
    function initTimetableGeneration(auth, db) {
        const generateBtn = document.getElementById('generate-btn');
        if (!generateBtn) return;

        generateBtn.addEventListener('click', async () => {
            generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Collecting Data...';
            generateBtn.disabled = true;

            try {
                const coursesSnapshot = await getDocs(collection(db, 'courses'));
                const facultySnapshot = await getDocs(collection(db, 'faculty'));
                const roomsSnapshot = await getDocs(collection(db, 'rooms'));

                const apiPayload = {
                    courses: coursesSnapshot.docs.map(doc => ({ ...doc.data(), subject: doc.data().expertise || 'General' })),
                    faculty: facultySnapshot.docs.map(doc => doc.data()),
                    rooms: roomsSnapshot.docs.map(doc => doc.data())
                };
                
                generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

                const response = await fetch(`${API_BASE_URL}/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                masterTimetable = result.timetable; 
                
                displayTimetable(masterTimetable);
                showToast(`Timetable generated with score: ${result.fitness_score}`, 'success');
                
                const user = auth.currentUser;
                if(user) {
                    const facultyMember = await getLoggedInFaculty(user, db);
                    if (facultyMember) {
                        renderDashboardWidgets(facultyMember);
                        renderPersonalTimetable(facultyMember);
                    }
                }

            } catch (error) {
                console.error("Timetable generation failed:", error);
                showToast('Error: Could not generate timetable.', 'error');
            } finally {
                generateBtn.innerHTML = '✨ Generate Master Timetable';
                generateBtn.disabled = false;
            }
        });

        function displayTimetable(data) {
            const timetableOutput = document.getElementById('timetable-output');
            if (!timetableOutput) return;
            let timetableHTML = `<h4>Generated Master Timetable</h4><div class="timetable-grid">
                <div class="timeslot-header">Time</div>
                <div class="day-header">Monday</div><div class="day-header">Tuesday</div>
                <div class="day-header">Wednesday</div><div class="day-header">Thursday</div>
                <div class="day-header">Friday</div>`;

            const timeSlots = [...new Set(data.map(item => item.time))].sort();
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

            timeSlots.forEach(time => {
                timetableHTML += `<div class="time">${time}</div>`;
                days.forEach(day => {
                    const classInfo = data.find(c => c.time === time && c.day === day);
                    if (classInfo) {
                        timetableHTML += `<div class="class-cell"><div class="class-item ${classInfo.color || 'default'}"><strong>${classInfo.subject}</strong><span>${classInfo.teacher}</span><span>${classInfo.room}</span></div></div>`;
                    } else {
                        timetableHTML += `<div class="class-cell"></div>`;
                    }
                });
            });
            timetableHTML += '</div>';
            timetableOutput.innerHTML = timetableHTML;
            timetableOutput.style.display = 'block';
        }
    }

    function initFileUpload(db) { 
        const fileUploadInput = document.getElementById('file-upload');
        if (!fileUploadInput) return;

        const btnAnalyze = document.getElementById('btn-analyze');
        const analysisTypeSelector = document.getElementById('analysis-type');
        const fileInfoDisplay = document.getElementById('file-info');
        const fileNameDisplay = document.getElementById('file-name-display');
        const resultsCard = document.getElementById('analysis-results-card');

        fileUploadInput.addEventListener('change', () => {
            if (fileUploadInput.files.length > 0) {
                if (fileNameDisplay) fileNameDisplay.textContent = `Selected: ${fileUploadInput.files[0].name}`;
                if (fileInfoDisplay) fileInfoDisplay.style.display = 'flex';
                if (btnAnalyze) {
                    btnAnalyze.textContent = 'Analyze File';
                    btnAnalyze.disabled = false;
                }
                if (resultsCard) resultsCard.style.display = 'none';
                if (typeof anime === 'function' && fileInfoDisplay) {
                    anime({ targets: fileInfoDisplay, opacity: [0, 1], translateY: [-10, 0], duration: 500 });
                }
            }
        });

        if (btnAnalyze) {
            btnAnalyze.addEventListener('click', async (e) => {
                e.preventDefault();
                if (fileUploadInput.files.length === 0) {
                    showToast("Please select a file first.", "error");
                    return;
                }
                btnAnalyze.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
                btnAnalyze.disabled = true;
                const formData = new FormData();
                formData.append('file', fileUploadInput.files[0]);
                if (analysisTypeSelector) formData.append('analysis_type', analysisTypeSelector.value);
                try {
                    const response = await fetch(`${API_BASE_URL}/analyze`, {
                        method: 'POST',
                        body: formData
                    });
                    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
                    const result = await response.json();
                    await handleAnalysisResponse(result, db);
                } catch (error) {
                    console.error("File analysis failed:", error);
                    showToast('Error: Could not analyze file.', 'error');
                } finally {
                    btnAnalyze.innerHTML = 'Analyze File';
                    btnAnalyze.disabled = false;
                }
            });
        }

        async function handleAnalysisResponse(result, db) { 
            if (!resultsCard) return;
            resultsCard.style.display = 'block';
            let resultsHTML = `<h4>Analysis Complete!</h4>`;
            let toastMessage = '';

            if (result.type === 'course_list') {
                for (const course of result.data.courses) { await addDoc(collection(db, 'courses'), course); }
                for (const faculty of result.data.faculty) { await addDoc(collection(db, 'faculty'), faculty); }
                resultsHTML += `<p>The following data has been automatically added to the database:</p>`;
                resultsHTML += `<p><b>Added:</b> ${result.data.courses.length} courses and ${result.data.faculty.length} faculty members.</p>`;
                toastMessage = `Data added to Course Catalog & Faculty Directory.`;
            } else if (result.type === 'student_marks') {
                resultsHTML += `<p>The following marks were successfully extracted. You can now enter them using the 'Enter/Update Student Marks' tool.</p>`;
                resultsHTML += `<h5>Extracted Marks for ${result.data.test_name}:</h5>`;
                result.data.marks.forEach(mark => {
                    resultsHTML += `<p>${mark.rollNumber} (${mark.subject}): ${mark.mark}</p>`;
                });
                toastMessage = 'Student marks extracted successfully!';
            }
            
            resultsCard.innerHTML = resultsHTML;
            showToast(toastMessage, 'success');
        }
    }

    function renderDashboardWidgets(facultyMember) {
        const scheduleWidget = document.getElementById('teacher-schedule-widget');
        const coursesWidget = document.getElementById('teacher-courses-widget');
        const teacherClasses = masterTimetable.filter(c => c.teacher === facultyMember.name);

        if (scheduleWidget) {
             if (teacherClasses.length > 0) {
                let scheduleHTML = '';
                teacherClasses.forEach(item => {
                    scheduleHTML += `<div class="schedule-item"><span class="schedule-time">${item.time}</span><div class="schedule-details"><strong>${item.subject}</strong><span>${item.day} - ${item.room}</span></div></div>`;
                });
                scheduleWidget.innerHTML = scheduleHTML;
            } else {
                scheduleWidget.innerHTML = `<div class="placeholder-widget"><p>No classes scheduled. Generate a timetable to see your schedule.</p></div>`;
            }
        }
       
        if (coursesWidget) {
             if (teacherClasses.length > 0) {
                const uniqueCourses = [...new Set(teacherClasses.map(item => item.subject))];
                let coursesHTML = '<ul class="course-list">';
                uniqueCourses.forEach(course => { coursesHTML += `<li class="course-list-item">${course}</li>`; });
                coursesHTML += '</ul>';
                coursesWidget.innerHTML = coursesHTML;
            } else {
                coursesWidget.innerHTML = `<div class="placeholder-widget"><p>No courses assigned.</p></div>`;
            }
        }
    }

    function renderPersonalTimetable(facultyMember) {
        const gridContainer = document.getElementById('personal-timetable-grid');
        if (!gridContainer) return;
        const teacherClasses = masterTimetable.filter(c => c.teacher === facultyMember.name);
        
        if(teacherClasses.length === 0){
            gridContainer.innerHTML = `<div class="placeholder-widget"><p>No personal timetable to display. Generate a master timetable first.</p></div>`;
            return;
        }

        let timetableHTML = `<div class="timetable-grid">
            <div class="timeslot-header">Time</div>
            <div class="day-header">Monday</div><div class="day-header">Tuesday</div>
            <div class="day-header">Wednesday</div><div class="day-header">Thursday</div>
            <div class="day-header">Friday</div>`;

        const timeSlots = [...new Set(masterTimetable.map(item => item.time))].sort();
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        timeSlots.forEach(time => {
            timetableHTML += `<div class="time">${time}</div>`;
            days.forEach(day => {
                const classInfo = teacherClasses.find(c => c.time === time && c.day === day);
                if (classInfo) {
                    timetableHTML += `<div class="class-cell"><div class="class-item ${classInfo.color || 'default'}"><strong>${classInfo.subject}</strong><span>${classInfo.room}</span></div></div>`;
                } else {
                    timetableHTML += `<div class="class-cell"></div>`;
                }
            });
        });
        timetableHTML += '</div>';
        gridContainer.innerHTML = timetableHTML;
    }

    function seedDatabase(db) {
        const seedCollection = async (collectionName, data) => {
            const collectionRef = collection(db, collectionName);
            try {
                const snapshot = await getDocs(collectionRef);
                if (snapshot.empty) {
                    console.log(`Seeding ${collectionName}...`);
                    for (const item of data) { await addDoc(collectionRef, item); }
                    showToast(`Mock ${collectionName} data loaded for demo.`, 'success');
                }
            } catch (error) {
                console.error("Error seeding database:", error);
            }
        };

        const demoTeacherData = [ { name: 'Dr. Evelyn Reed', expertise: 'Physics', email: 'evelyn@example.com' }, { name: 'Prof. Samuel Chen', expertise: 'Computer Science', email: 'samuel@example.com' }, { name: 'Dr. Maria Garcia', expertise: 'Mathematics', email: 'maria@example.com' } ];
        mockStudentMarks = {
            "CB.SC.U4AYS23001": { name: "John Doe", marks: { "PHY-101": { midterm1: 88, final_project: 92, end_sem_exam: 85, credits: 4 }, "CS-101": { midterm1: 75, final_project: 80, end_sem_exam: 78, credits: 4 } } },
            "CB.SC.U4AYS23002": { name: "Jane Smith", marks: { "MATH-203": { midterm1: 95, final_project: 90, end_sem_exam: 88, credits: 3 } } }
        };
        seedCollection('courses', [ { code: 'PHY-101', name: 'Modern Physics', credits: '4', type: 'Theory', expertise: 'Physics' }, { code: 'CS-101', name: 'Intro to Programming', credits: '4', type: 'Theory', expertise: 'Computer Science' }, { code: 'MATH-203', name: 'Linear Algebra', credits: '3', type: 'Theory', expertise: 'Mathematics' } ]);
        seedCollection('faculty', demoTeacherData);
        seedCollection('rooms', [ { id: 'R-301', capacity: '60', type: 'Lecture Hall' }, { id: 'R-205', capacity: '45', type: 'Lecture Hall' } ]);
        seedCollection('students', [ { name: 'John Doe', rollNumber: 'CB.SC.U4AYS23001', program: 'FYUP B.Sc' }, { name: 'Jane Smith', rollNumber: 'CB.SC.U4AYS23002', program: 'FYUP B.Sc' }]);
    }
} catch (error) {
    console.error("A fatal error occurred during Firebase initialization:", error);
    document.body.innerHTML = `<div style="padding: 2rem; text-align: center; color: red;"><h1>Application Error</h1><p>Could not initialize the application. Please check the console for more details.</p></div>`;
}

