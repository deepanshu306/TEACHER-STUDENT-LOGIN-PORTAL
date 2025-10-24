
const STORAGE_KEYS = {
    students: 'students',
    attendance: 'attendance',
    grades: 'grades',
    fees: 'fees',
    notes: 'notes',
    pyqs: 'pyqs',
    subjects: 'subjects',
    currentUser: 'currentUser'
};

let students = JSON.parse(localStorage.getItem(STORAGE_KEYS.students)) || [];
let attendance = JSON.parse(localStorage.getItem(STORAGE_KEYS.attendance)) || [];
let grades = JSON.parse(localStorage.getItem(STORAGE_KEYS.grades)) || [];
let fees = JSON.parse(localStorage.getItem(STORAGE_KEYS.fees)) || [];
let notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes)) || [];
let pyqs = JSON.parse(localStorage.getItem(STORAGE_KEYS.pyqs)) || [];
let subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects)) || ['Mathematics', 'Science', 'English', 'History'];

let editingId = null;
let currentUser = null;
let userRole = null;
let currentPhotoData = null;
let teacherListenersAttached = false;
let latestMetrics = { teacher: null, student: null };

const variantIcons = {
    info: 'fa-circle-info',
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-xmark'
};

const toastDefaults = {
    variant: 'info',
    title: 'Notification',
    timeout: 4000
};

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    const pageType = document.body?.dataset?.page || 'login';
    if (pageType === 'login') {
        initLoginPage();
    } else if (pageType === 'dashboard') {
        initDashboardPage(document.body.dataset.role);
    }
}

function initLoginPage() {
    selectLoginOption('teacher');
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser));
    if (saved) {
        redirectToDashboard(saved.role);
    }
}

function initDashboardPage(expectedRole) {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser));
    if (!saved || (expectedRole && saved.role !== expectedRole)) {
        redirectToLogin();
        return;
    }
    currentUser = saved.user;
    userRole = saved.role;
    teacherListenersAttached = false;
    showApp();
}

function redirectToDashboard(role) {
    if (role === 'teacher') {
        window.location.href = 'teacher-dashboard.html';
    } else {
        window.location.href = 'student-dashboard.html';
    }
}

function redirectToLogin() {
    window.location.href = 'index.html';
}

function selectLoginOption(option) {
    const teacherOption = document.getElementById('teacherOption');
    const studentOption = document.getElementById('studentOption');
    const teacherLogin = document.getElementById('teacherLogin');
    const studentLogin = document.getElementById('studentLogin');

    if (teacherOption && studentOption) {
        teacherOption.classList.toggle('active', option === 'teacher');
        studentOption.classList.toggle('active', option === 'student');
    }
    if (teacherLogin) {
        teacherLogin.classList.toggle('hidden', option !== 'teacher');
    }
    if (studentLogin) {
        studentLogin.classList.toggle('hidden', option !== 'student');
    }
}

function login(role) {
    if (role === 'teacher') {
        const username = document.getElementById('teacherUsername')?.value || '';
        const password = document.getElementById('teacherPassword')?.value || '';
        if (username === 'teacher' && password === 'password') {
            currentUser = { name: 'Teacher' };
            userRole = 'teacher';
            localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify({ user: currentUser, role: userRole }));
            redirectToDashboard('teacher');
        } else {
            showToast('Invalid teacher credentials. Use username: teacher, password: password.', {
                variant: 'error',
                title: 'Login failed'
            });
        }
    } else {
        const studentId = document.getElementById('studentID')?.value || '';
        const password = document.getElementById('studentPassword')?.value || '';
        const student = students.find(s => s.id === studentId);
        if (student && password === 'password') {
            currentUser = student;
            userRole = 'student';
            localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify({ user: currentUser, role: userRole }));
            redirectToDashboard('student');
        } else {
            showToast('Invalid student ID or password. Use your student ID and password: password.', {
                variant: 'error',
                title: 'Login failed'
            });
        }
    }
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    currentUser = null;
    userRole = null;
    teacherListenersAttached = false;
    redirectToLogin();
}

function showApp() {
    const appContainer = document.getElementById('appContainer');
    if (!appContainer) {
        return;
    }

    const welcomeTarget = document.getElementById('userWelcome');
    if (welcomeTarget && currentUser) {
        welcomeTarget.textContent = `Welcome, ${currentUser.name || currentUser.id}!`;
    }

    const subtitleTarget = document.getElementById('roleSubtitle');
    if (subtitleTarget) {
        subtitleTarget.textContent = userRole === 'teacher'
            ? 'Manage student records, attendance, grades, and fees'
            : 'Track your academic activity, deadlines, and shared resources';
    }

    const subjectsTab = document.getElementById('subjectsTab');
    if (subjectsTab) {
        subjectsTab.style.display = userRole === 'teacher' ? 'flex' : 'none';
    }

    const studentResourcesSection = document.getElementById('studentResources');
    if (studentResourcesSection) {
        studentResourcesSection.classList.toggle('hidden', userRole !== 'student');
    }

    if (userRole === 'student') {
        hydrateStudentProfile();
        populateStudentResourceFilters();
    } else {
        attachTeacherListeners();
    }

    renderStudents();
    populateStudentDropdowns();
    populateSubjectDropdowns();
    renderAttendance();
    renderGrades();
    renderFees();
    renderResources();
    renderSubjects();
    renderStudentResources();
    updateDashboard();

    if (userRole === 'teacher') {
        updateTeacherInsights();
    } else {
        updateStudentInsights();
    }

    refreshStudentAnnouncements();
}
function setTextContent(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function ensureToastStack() {
    let stack = document.getElementById('toastStack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toastStack';
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
    }
    return stack;
}

function showToast(message, options = {}) {
    const config = { ...toastDefaults, ...options };
    const stack = ensureToastStack();
    const toast = document.createElement('div');
    toast.className = `toast ${config.variant}`;
    toast.innerHTML = `
        <i class="fas ${variantIcons[config.variant] || variantIcons.info}"></i>
        <div class="toast-body">
            <span class="toast-title">${config.title}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    stack.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade');
        setTimeout(() => toast.remove(), 250);
    }, config.timeout);
}

function formatCurrency(value) {
    const amount = Number(value || 0);
    return `Rs ${Number.isFinite(amount) ? amount.toFixed(0) : '0'}`;
}

function attachTeacherListeners() {
    if (teacherListenersAttached) {
        return;
    }
    teacherListenersAttached = true;

    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', event => {
            event.preventDefault();
            const student = {
                id: document.getElementById('studentId').value.trim(),
                name: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                course: document.getElementById('course').value,
                semester: document.getElementById('semester').value,
                photo: currentPhotoData
            };

            if (!student.id || !student.name) {
                showToast('Student ID and name are required.', { variant: 'warning', title: 'Missing information' });
                return;
            }

            if (editingId) {
                const index = students.findIndex(s => s.id === editingId);
                if (index !== -1) {
                    students[index] = student;
                }
                editingId = null;
            } else {
                if (students.some(s => s.id === student.id)) {
                    showToast('A student with this ID already exists.', { variant: 'warning', title: 'Duplicate ID' });
                    return;
                }
                students.push(student);
            }

            localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
            studentForm.reset();
            currentPhotoData = null;
            resetPhotoPreview();
            renderStudents();
            populateStudentDropdowns();
            updateDashboard();
            updateTeacherInsights();
            showToast('Student record saved successfully.', { variant: 'success', title: 'Student updated' });
        });
    }

    const studentPhotoInput = document.getElementById('studentPhoto');
    if (studentPhotoInput) {
        studentPhotoInput.addEventListener('change', event => {
            const file = event.target.files[0];
            if (!file) {
                currentPhotoData = null;
                resetPhotoPreview();
                return;
            }
            const reader = new FileReader();
            reader.onload = e => {
                currentPhotoData = e.target.result;
                updatePhotoPreview(currentPhotoData);
            };
            reader.readAsDataURL(file);
        });
    }

    const resourceType = document.getElementById('resourceType');
    if (resourceType) {
        resourceType.addEventListener('change', toggleResourceForm);
        toggleResourceForm();
    }

    const notesAddButton = document.querySelector('#notesForm button');
    if (notesAddButton) {
        notesAddButton.addEventListener('click', addNotes);
    }

    const pyqAddButton = document.querySelector('#pyqForm button');
    if (pyqAddButton) {
        pyqAddButton.addEventListener('click', addPYQ);
    }

    const attendanceButton = document.querySelector('#teacherAttendanceForm button[type="button"]');
    if (attendanceButton) {
        attendanceButton.addEventListener('click', markAttendance);
    }

    const gradeButton = document.querySelector('#teacherGradeForm button[type="button"]');
    if (gradeButton) {
        gradeButton.addEventListener('click', addGrade);
    }

    const feeButton = document.querySelector('#teacherFeeForm button[type="button"]');
    if (feeButton) {
        feeButton.addEventListener('click', addFee);
    }

    const subjectButton = document.querySelector('#teacherSubjectForm button[type="button"]');
    if (subjectButton) {
        subjectButton.addEventListener('click', addSubject);
    }
}

function resetPhotoPreview() {
    const preview = document.getElementById('photoPreview');
    if (preview) {
        preview.innerHTML = '<div class="photo-placeholder"><i class="fas fa-user"></i></div>';
    }
}

function updatePhotoPreview(photoData) {
    const preview = document.getElementById('photoPreview');
    if (preview) {
        preview.innerHTML = `<img src="${photoData}" alt="Student Photo">`;
    }
}

function hydrateStudentProfile() {
    if (userRole !== 'student' || !currentUser) {
        return;
    }
    setTextContent('studentCourse', currentUser.course || 'N/A');
    setTextContent('studentSemester', currentUser.semester ? `Semester ${currentUser.semester}` : 'Semester N/A');
    setTextContent('studentProfileName', currentUser.name || 'Your Name');
    setTextContent('studentProfileEmail', currentUser.email || 'Add your email via admissions team');
    setTextContent('studentProfilePhone', currentUser.phone || 'Add your phone via admissions team');
    setTextContent('studentProfileId', currentUser.id || 'N/A');
    setTextContent('studentProfileCourse', currentUser.course || 'N/A');
    setTextContent('studentProfileSemester', currentUser.semester || 'N/A');

    const photoPreview = document.getElementById('studentProfilePhoto');
    if (photoPreview) {
        if (currentUser.photo) {
            photoPreview.innerHTML = `<img src="${currentUser.photo}" alt="${currentUser.name || 'Profile'}">`;
        } else {
            photoPreview.innerHTML = '<div class="photo-placeholder"><i class="fas fa-user"></i></div>';
        }
    }
}

function populateStudentResourceFilters() {
    if (userRole !== 'student') {
        return;
    }
    const subjectFilter = document.getElementById('studentResourceSubjectFilter');
    const semesterFilter = document.getElementById('studentResourceSemesterFilter');
    if (!subjectFilter || !semesterFilter) {
        return;
    }

    const subjectSet = new Set(subjects);
    notes.forEach(note => subjectSet.add(note.subject));
    pyqs.forEach(pyq => subjectSet.add(pyq.subject));

    subjectFilter.innerHTML = '<option value="all">All subjects</option>';
    Array.from(subjectSet)
        .filter(Boolean)
        .sort()
        .forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectFilter.appendChild(option);
        });

    subjectFilter.onchange = renderStudentResources;
    semesterFilter.onchange = renderStudentResources;
}
function calculateTeacherMetrics() {
    const totalStudents = students.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;

    let totalScore = 0;
    grades.forEach(g => { totalScore += Number(g.score) || 0; });
    const averageGrade = grades.length ? Math.round(totalScore / grades.length) : 0;

    const feeSummary = fees.reduce((acc, fee) => {
        const amount = Number(fee.amount) || 0;
        if (fee.status === 'paid') acc.paid += amount;
        else if (fee.status === 'pending') acc.pending += amount;
        else if (fee.status === 'overdue') acc.overdue += amount;
        return acc;
    }, { paid: 0, pending: 0, overdue: 0 });

    return { totalStudents, attendanceRate, averageGrade, ...feeSummary };
}

function calculateStudentMetrics() {
    if (!currentUser) {
        return { attendanceRate: 0, averageGrade: 0, paid: 0, pending: 0, overdue: 0, grades: [], attendanceRecords: [], feeRecords: [] };
    }
    const userAttendance = attendance.filter(a => a.studentId === currentUser.id);
    const presentCount = userAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = userAttendance.length ? Math.round((presentCount / userAttendance.length) * 100) : 0;

    const userGrades = grades.filter(g => g.studentId === currentUser.id);
    let totalScore = 0;
    userGrades.forEach(g => { totalScore += Number(g.score) || 0; });
    const averageGrade = userGrades.length ? Math.round(totalScore / userGrades.length) : 0;

    const userFees = fees.filter(f => f.studentId === currentUser.id);
    const feeSummary = userFees.reduce((acc, fee) => {
        const amount = Number(fee.amount) || 0;
        if (fee.status === 'paid') acc.paid += amount;
        else if (fee.status === 'pending') acc.pending += amount;
        else if (fee.status === 'overdue') acc.overdue += amount;
        return acc;
    }, { paid: 0, pending: 0, overdue: 0 });

    return {
        attendanceRate,
        averageGrade,
        ...feeSummary,
        grades: userGrades,
        attendanceRecords: userAttendance,
        feeRecords: userFees
    };
}

function updateTeacherInsights() {
    const metrics = calculateTeacherMetrics();
    latestMetrics.teacher = metrics;

    setTextContent('totalStudentsSummary', metrics.totalStudents);
    setTextContent('overallAttendance', metrics.attendanceRate + '%');
    setTextContent('overallAverageGrade', metrics.averageGrade + '%');
    setTextContent('totalFeesCollected', formatCurrency(metrics.paid));

    const alertsHost = document.getElementById('teacherAlerts');
    if (alertsHost) {
        const alerts = buildTeacherAlerts(metrics);
        alertsHost.innerHTML = '';
        if (!alerts.length) {
            alertsHost.innerHTML = '<li class="timeline-item"><div><strong>You\'re all caught up.</strong><div class="meta">No pending actions detected.</div></div><span class="status-pill positive"><i class="fas fa-check"></i> Clear</span></li>';
        } else {
            alerts.forEach(alert => {
                const item = document.createElement('li');
                item.className = 'timeline-item';
                item.innerHTML = `
                    <div>
                        <strong>${alert.title}</strong>
                        <div class="meta">${alert.meta}</div>
                    </div>
                    <span class="status-pill ${alert.variant}"><i class="fas ${alert.icon}"></i> ${alert.badge}</span>
                `;
                alertsHost.appendChild(item);
            });
        }
    }

    const trendNarrative = document.getElementById('trendNarrative');
    if (trendNarrative) {
        trendNarrative.textContent = 'Attendance ' + metrics.attendanceRate + '% | Average grade ' + metrics.averageGrade + '% | Collected ' + formatCurrency(metrics.paid);
    }
}

function buildTeacherAlerts(metrics) {
    const alerts = [];
    const pendingFees = fees.filter(fee => fee.status === 'pending');
    const overdueFees = fees.filter(fee => fee.status === 'overdue');
    const incompleteProfiles = students.filter(student => !student.email || !student.phone);

    if (overdueFees.length) {
        alerts.push({
            title: `${overdueFees.length} fee records are overdue`,
            meta: 'Follow up with students to regularise payments.',
            variant: 'danger',
            badge: 'Overdue',
            icon: 'fa-triangle-exclamation'
        });
    }
    if (pendingFees.length) {
        alerts.push({
            title: `${pendingFees.length} fee records pending approval`,
            meta: 'Review payments received and update their status.',
            variant: 'warning',
            badge: 'Pending',
            icon: 'fa-clock'
        });
    }
    if (incompleteProfiles.length) {
        alerts.push({
            title: `${incompleteProfiles.length} student profiles missing details`,
            meta: 'Collect email and phone information for better communication.',
            variant: 'warning',
            badge: 'Profile',
            icon: 'fa-address-card'
        });
    }
    if (!alerts.length && metrics.totalStudents === 0) {
        alerts.push({
            title: 'Invite students to join the workspace',
            meta: 'Add students from the Students tab to begin managing their records.',
            variant: 'info',
            badge: 'Action',
            icon: 'fa-plus-circle'
        });
    }
    return alerts;
}

function updateStudentInsights() {
    const metrics = calculateStudentMetrics();
    latestMetrics.student = metrics;

    setTextContent('attendanceRate', metrics.attendanceRate + '%');
    setTextContent('averageGrade', metrics.averageGrade + '%');
    setTextContent('feeCollection', formatCurrency(metrics.paid));
    setTextContent('feePaidSummary', formatCurrency(metrics.paid));
    setTextContent('feePendingSummary', formatCurrency(metrics.pending));
    setTextContent('feeOverdueSummary', formatCurrency(metrics.overdue));

    const attendanceBadge = document.getElementById('attendanceBadge');
    if (attendanceBadge) {
        attendanceBadge.textContent = metrics.attendanceRate >= 75
            ? 'Great job staying consistent!'
            : metrics.attendanceRate > 0
                ? 'Aim for 75% to stay compliant.'
                : 'Attendance updates after your first class.';
    }

    const gradeBadge = document.getElementById('gradeBadge');
    if (gradeBadge) {
        gradeBadge.textContent = metrics.averageGrade > 0
            ? `Current standing is ${metrics.averageGrade}%. Keep pushing!`
            : 'Grades appear here once assessments are recorded.';
    }

    const feeBadge = document.getElementById('feeBadge');
    if (feeBadge) {
        if (metrics.overdue > 0) {
            feeBadge.textContent = `You have ${formatCurrency(metrics.overdue)} overdue. Please clear soon.`;
        } else if (metrics.pending > 0) {
            feeBadge.textContent = `${formatCurrency(metrics.pending)} pending approval.`;
        } else if (metrics.paid > 0) {
            feeBadge.textContent = 'All caught up on payments.';
        } else {
            feeBadge.textContent = 'Payment history will appear here.';
        }
    }

    refreshStudentUpcoming(metrics);
}

function refreshStudentUpcoming(metrics) {
    const upcomingHost = document.getElementById('studentUpcoming');
    if (!upcomingHost) {
        return;
    }
    upcomingHost.innerHTML = '';

    const cards = [];
    (metrics.feeRecords || [])
        .filter(fee => fee.status === 'pending')
        .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
        .slice(0, 3)
        .forEach(fee => {
            cards.push({
                title: `Fee payment of ${formatCurrency(fee.amount)} pending`,
                meta: `Due ${fee.dueDate || 'soon'}`,
                variant: 'warning',
                badge: 'Pending',
                icon: 'fa-wallet'
            });
        });

    (metrics.grades || []).slice(-3).reverse().forEach(grade => {
        cards.push({
            title: `${grade.subject} - scored ${grade.score}%`,
            meta: `Semester ${grade.semester || 'N/A'} | Grade ${grade.grade || 'NA'}`,
            variant: 'positive',
            badge: 'Recent',
            icon: 'fa-award'
        });
    });

    if (!cards.length) {
        upcomingHost.innerHTML = '<li class="timeline-item" data-empty="true"><div><strong>No reminders yet</strong><div class="meta">Once your teacher schedules tasks, they will appear here.</div></div><span class="status-pill"><i class="fas fa-hourglass-half"></i> Waiting</span></li>';
        return;
    }

    cards.slice(0, 4).forEach(item => {
        const li = document.createElement('li');
        li.className = 'timeline-item';
        li.innerHTML = `
            <div>
                <strong>${item.title}</strong>
                <div class="meta">${item.meta}</div>
            </div>
            <span class="status-pill ${item.variant}"><i class="fas ${item.icon}"></i> ${item.badge}</span>
        `;
        upcomingHost.appendChild(li);
    });
}

function refreshStudentAnnouncements() {
    if (userRole !== 'student') {
        return;
    }
    const announcementsHost = document.getElementById('studentAnnouncements');
    if (!announcementsHost) {
        return;
    }
    announcementsHost.innerHTML = '';

    const announcements = [];
    notes.slice(-3).reverse().forEach(note => {
        announcements.push({
            title: `${note.title} uploaded`,
            meta: `${note.subject} | Semester ${note.semester} | ${note.uploadDate}`,
            badge: 'Notes',
            icon: 'fa-book'
        });
    });
    pyqs.slice(-3).reverse().forEach(pyq => {
        announcements.push({
            title: `${pyq.subject} PYQ ${pyq.year}`,
            meta: `Semester ${pyq.semester} | Uploaded ${pyq.uploadDate}`,
            badge: 'PYQ',
            icon: 'fa-file-alt'
        });
    });

    if (!announcements.length) {
        announcementsHost.innerHTML = '<li class="timeline-item" data-empty="true"><div><strong>Stay tuned for updates</strong><div class="meta">Ask your teacher to upload learning resources to see them here.</div></div><span class="status-pill positive"><i class="fas fa-check"></i> Active</span></li>';
        return;
    }

    announcements.slice(0, 4).forEach(item => {
        const li = document.createElement('li');
        li.className = 'timeline-item';
        li.innerHTML = `
            <div>
                <strong>${item.title}</strong>
                <div class="meta">${item.meta}</div>
            </div>
            <span class="status-pill positive"><i class="fas ${item.icon}"></i> ${item.badge}</span>
        `;
        announcementsHost.appendChild(li);
    });
}
function renderStudents() {
    const table = document.getElementById('studentTable');
    if (!table) {
        return;
    }
    const tbody = table.getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';

    const isTeacherView = table.dataset.view !== 'student';
    const list = isTeacherView ? students : students;

    list.forEach(student => {
        const row = tbody.insertRow();
        const photoCell = student.photo
            ? `<img src="${student.photo}" alt="${student.name || 'Student'}">`
            : '<div class="photo-placeholder"><i class="fas fa-user"></i></div>';

        row.innerHTML = `
            <td><div class="student-photo-cell">${photoCell}</div></td>
            <td>${student.id || 'N/A'}</td>
            <td>${student.name || 'N/A'}</td>
            <td>${student.email || 'N/A'}</td>
            <td>${student.course || 'N/A'}</td>
            <td>${student.semester || 'N/A'}</td>
            ${isTeacherView ? `
                <td class="action-cell">
                    <button class="btn-edit" onclick="editStudent('${student.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-delete" onclick="deleteStudent('${student.id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>
            ` : ''}
        `;
    });

    if (userRole === 'student') {
        hydrateStudentProfile();
    }
}

function populateStudentDropdowns() {
    if (userRole !== 'teacher') {
        return;
    }
    ['attendanceStudent', 'gradeStudent', 'feeStudent'].forEach(id => {
        const dropdown = document.getElementById(id);
        if (!dropdown) {
            return;
        }
        const selected = dropdown.value;
        dropdown.innerHTML = '<option value="">Select Student</option>';
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.name} (${student.id})`;
            dropdown.appendChild(option);
        });
        dropdown.value = selected;
    });
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) {
        return;
    }
    editingId = id;
    currentPhotoData = student.photo || null;

    document.getElementById('studentId').value = student.id;
    document.getElementById('fullName').value = student.name;
    document.getElementById('email').value = student.email;
    document.getElementById('phone').value = student.phone;
    document.getElementById('course').value = student.course;
    document.getElementById('semester').value = student.semester;

    if (student.photo) {
        updatePhotoPreview(student.photo);
    } else {
        resetPhotoPreview();
    }

    showTab('students');
    const form = document.getElementById('studentForm');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) {
        return;
    }
    students = students.filter(s => s.id !== id);
    attendance = attendance.filter(a => a.studentId !== id);
    grades = grades.filter(g => g.studentId !== id);
    fees = fees.filter(f => f.studentId !== id);

    localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(attendance));
    localStorage.setItem(STORAGE_KEYS.grades, JSON.stringify(grades));
    localStorage.setItem(STORAGE_KEYS.fees, JSON.stringify(fees));

    renderStudents();
    renderAttendance();
    renderGrades();
    renderFees();
    updateDashboard();
    updateTeacherInsights();
    showToast('Student removed successfully.', { variant: 'success', title: 'Student deleted' });
}

function markAttendance() {
    if (userRole !== 'teacher') {
        return;
    }
    const studentId = document.getElementById('attendanceStudent').value;
    const date = document.getElementById('attendanceDate').value;
    const status = document.getElementById('attendanceStatus').value;

    if (!studentId || !date) {
        showToast('Please choose a student and date before marking attendance.', {
            variant: 'warning',
            title: 'Incomplete information'
        });
        return;
    }

    const student = students.find(s => s.id === studentId);
    attendance.push({
        id: Date.now().toString(),
        studentId,
        studentName: student ? student.name : 'Unknown',
        date,
        status
    });

    localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(attendance));
    renderAttendance();
    updateDashboard();
    updateTeacherInsights();
    document.getElementById('attendanceDate').value = '';
    document.getElementById('attendanceStatus').value = 'present';
    showToast('Attendance recorded.', { variant: 'success', title: 'Attendance saved' });
}

function renderAttendance() {
    const table = document.getElementById('attendanceTable');
    if (!table) {
        return;
    }
    const tbody = table.getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';

    const isTeacherView = table.dataset.view !== 'student';
    const list = isTeacherView ? attendance : attendance.filter(a => a.studentId === (currentUser?.id));

    list.forEach(record => {
        const statusLabel = record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'N/A';
        const row = tbody.insertRow();
        if (isTeacherView) {
            row.innerHTML = `
                <td>${record.date || 'N/A'}</td>
                <td>${record.studentName || 'N/A'}</td>
                <td>${statusLabel}</td>
                <td class="action-cell">
                    <button class="btn-delete" onclick="deleteAttendance('${record.id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${record.date || 'N/A'}</td>
                <td>${record.studentName || 'N/A'}</td>
                <td>${statusLabel}</td>
            `;
        }
    });
}

function deleteAttendance(id) {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
        return;
    }
    attendance = attendance.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(attendance));
    renderAttendance();
    updateDashboard();
    updateTeacherInsights();
    showToast('Attendance record removed.', { variant: 'success', title: 'Attendance deleted' });
}

function addGrade() {
    if (userRole !== 'teacher') {
        return;
    }
    const studentId = document.getElementById('gradeStudent').value;
    const subject = document.getElementById('gradeSubject').value;
    const semester = document.getElementById('gradeSem').value;
    const score = parseInt(document.getElementById('gradeScore').value, 10);

    if (!studentId || !subject || !semester || Number.isNaN(score)) {
        showToast('Please complete all grade fields before submitting.', {
            variant: 'warning',
            title: 'Incomplete grade entry'
        });
        return;
    }

    const student = students.find(s => s.id === studentId);
    let letter = 'F';
    if (score >= 90) letter = 'A';
    else if (score >= 80) letter = 'B';
    else if (score >= 70) letter = 'C';
    else if (score >= 60) letter = 'D';

    grades.push({
        id: Date.now().toString(),
        studentId,
        studentName: student ? student.name : 'Unknown',
        subject,
        semester,
        score,
        grade: letter
    });

    localStorage.setItem(STORAGE_KEYS.grades, JSON.stringify(grades));
    renderGrades();
    updateDashboard();
    updateTeacherInsights();
    document.getElementById('gradeStudent').value = '';
    document.getElementById('gradeSubject').value = '';
    document.getElementById('gradeSem').value = '';
    document.getElementById('gradeScore').value = '';
    showToast('Grade recorded successfully.', { variant: 'success', title: 'Grade saved' });
}

function renderGrades() {
    const table = document.getElementById('gradesTable');
    if (!table) {
        return;
    }
    const tbody = table.getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';

    const isTeacherView = table.dataset.view !== 'student';
    const list = isTeacherView ? grades : grades.filter(g => g.studentId === (currentUser?.id));

    list.forEach(grade => {
        const row = tbody.insertRow();
        if (isTeacherView) {
            row.innerHTML = `
                <td>${grade.studentName || 'N/A'}</td>
                <td>${grade.subject || 'N/A'}</td>
                <td>${grade.semester || 'N/A'}</td>
                <td>${Number.isFinite(Number(grade.score)) ? grade.score : 'N/A'}</td>
                <td>${grade.grade || 'N/A'}</td>
                <td class="action-cell">
                    <button class="btn-delete" onclick="deleteGrade('${grade.id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${grade.subject || 'N/A'}</td>
                <td>${grade.semester || 'N/A'}</td>
                <td>${Number.isFinite(Number(grade.score)) ? grade.score : 'N/A'}%</td>
                <td>${grade.grade || 'N/A'}</td>
            `;
        }
    });
}

function deleteGrade(id) {
    if (!confirm('Are you sure you want to delete this grade record?')) {
        return;
    }
    grades = grades.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.grades, JSON.stringify(grades));
    renderGrades();
    updateDashboard();
    updateTeacherInsights();
    showToast('Grade record removed.', { variant: 'success', title: 'Grade deleted' });
}

function addFee() {
    if (userRole !== 'teacher') {
        return;
    }
    const studentId = document.getElementById('feeStudent').value;
    const amount = parseFloat(document.getElementById('feeAmount').value);
    const dueDate = document.getElementById('feeDueDate').value;
    const status = document.getElementById('feeStatus').value;

    if (!studentId || Number.isNaN(amount) || !dueDate) {
        showToast('Please provide student, amount, and due date information.', {
            variant: 'warning',
            title: 'Incomplete fee record'
        });
        return;
    }

    const student = students.find(s => s.id === studentId);

    fees.push({
        id: Date.now().toString(),
        studentId,
        studentName: student ? student.name : 'Unknown',
        amount,
        dueDate,
        status
    });

    localStorage.setItem(STORAGE_KEYS.fees, JSON.stringify(fees));
    renderFees();
    updateDashboard();
    updateTeacherInsights();
    document.getElementById('feeStudent').value = '';
    document.getElementById('feeAmount').value = '';
    document.getElementById('feeDueDate').value = '';
    document.getElementById('feeStatus').value = 'paid';
    showToast('Fee record saved successfully.', { variant: 'success', title: 'Fee saved' });
}

function renderFees() {
    const table = document.getElementById('feesTable');
    if (!table) {
        return;
    }
    const tbody = table.getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';

    const isTeacherView = table.dataset.view !== 'student';
    const list = isTeacherView ? fees : fees.filter(f => f.studentId === (currentUser?.id));

    list.forEach(fee => {
        const statusLabel = fee.status ? fee.status.charAt(0).toUpperCase() + fee.status.slice(1) : 'N/A';
        const row = tbody.insertRow();
        const cells = [];

        if (isTeacherView) {
            cells.push(`<td>${fee.studentName || 'N/A'}</td>`);
        }

        cells.push(`<td>${formatCurrency(fee.amount)}</td>`);
        cells.push(`<td>${statusLabel}</td>`);
        cells.push(`<td>${fee.dueDate || 'N/A'}</td>`);

        if (isTeacherView) {
            cells.push(`
                <td class="action-cell">
                    <button class="btn-delete" onclick="deleteFee('${fee.id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `);
        }

        row.innerHTML = cells.join('');
    });
}

function deleteFee(id) {
    if (!confirm('Are you sure you want to delete this fee record?')) {
        return;
    }
    fees = fees.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.fees, JSON.stringify(fees));
    renderFees();
    updateDashboard();
    updateTeacherInsights();
    showToast('Fee record removed.', { variant: 'success', title: 'Fee deleted' });
}
function addSubject() {
    if (userRole !== 'teacher') {
        return;
    }
    const subjectName = document.getElementById('newSubject').value.trim();
    if (!subjectName) {
        showToast('Please enter a subject name before adding.', {
            variant: 'warning',
            title: 'Missing subject name'
        });
        return;
    }
    if (subjects.includes(subjectName)) {
        showToast('This subject already exists. Try a different name.', {
            variant: 'warning',
            title: 'Duplicate subject'
        });
        return;
    }
    subjects.push(subjectName);
    localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
    renderSubjects();
    populateSubjectDropdowns();
    showToast('Subject added successfully.', { variant: 'success', title: 'Subject saved' });
    document.getElementById('newSubject').value = '';
}

function deleteSubject(subjectName) {
    if (userRole !== 'teacher') {
        return;
    }
    if (!confirm(`Are you sure you want to delete the subject "${subjectName}"?`)) {
        return;
    }
    subjects = subjects.filter(subject => subject !== subjectName);
    localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
    renderSubjects();
    populateSubjectDropdowns();
    showToast('Subject removed.', { variant: 'success', title: 'Subject deleted' });
}

function renderSubjects() {
    const subjectList = document.getElementById('subjectList');
    const subjectTable = document.getElementById('subjectTable')?.getElementsByTagName('tbody')[0];
    if (!subjectList || !subjectTable) {
        return;
    }
    subjectList.innerHTML = '';
    subjectTable.innerHTML = '';

    if (!subjects.length) {
        subjectList.innerHTML = '<p>No subjects added yet</p>';
        subjectTable.innerHTML = '<tr><td colspan="2">No subjects added yet</td></tr>';
        return;
    }

    subjects.forEach(subject => {
        const item = document.createElement('div');
        item.className = 'subject-item';
        item.innerHTML = `
            <span>${subject}</span>
            <button class="delete-subject" onclick="deleteSubject('${subject}')"><i class="fas fa-times"></i></button>
        `;
        subjectList.appendChild(item);

        const row = subjectTable.insertRow();
        row.innerHTML = `
            <td>${subject}</td>
            <td class="action-cell">
                <button class="btn-delete" onclick="deleteSubject('${subject}')"><i class="fas fa-trash"></i> Delete</button>
            </td>
        `;
    });
}

function toggleResourceForm() {
    const resourceType = document.getElementById('resourceType');
    if (!resourceType) {
        return;
    }
    const notesForm = document.getElementById('notesForm');
    const pyqForm = document.getElementById('pyqForm');
    if (notesForm) {
        notesForm.classList.toggle('hidden', resourceType.value !== 'notes');
    }
    if (pyqForm) {
        pyqForm.classList.toggle('hidden', resourceType.value !== 'pyq');
    }
}

function addNotes() {
    if (userRole !== 'teacher') {
        return;
    }
    const subject = document.getElementById('notesSubject').value;
    const semester = document.getElementById('notesSemester').value;
    const title = document.getElementById('notesTitle').value.trim();
    const fileInput = document.getElementById('notesFile');

    if (!subject || !semester || !title) {
        showToast('Please complete subject, semester, and title for the note.', {
            variant: 'warning',
            title: 'Incomplete note details'
        });
        return;
    }

    const note = {
        id: Date.now().toString(),
        subject,
        semester,
        title,
        fileName: 'No file uploaded',
        fileType: 'txt',
        fileData: null,
        uploadDate: new Date().toLocaleDateString()
    };

    if (fileInput && fileInput.files.length) {
        const file = fileInput.files[0];
        note.fileName = file.name;
        note.fileType = (file.name.split('.').pop() || 'txt').toLowerCase();
        const reader = new FileReader();
        reader.onload = e => {
            note.fileData = e.target.result;
            notes.push(note);
            localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
            renderResources();
            renderStudentResources();
            updateTeacherInsights();
            showToast('Notes added successfully.', { variant: 'success', title: 'Notes uploaded' });
        };
        reader.readAsDataURL(file);
    } else {
        notes.push(note);
        localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
        renderResources();
        renderStudentResources();
        updateTeacherInsights();
        showToast('Notes added successfully.', { variant: 'success', title: 'Notes uploaded' });
    }

    if (fileInput) {
        fileInput.value = '';
    }
    document.getElementById('notesTitle').value = '';
    document.getElementById('notesSubject').value = '';
    document.getElementById('notesSemester').value = '';
}

function deleteNotes(id) {
    if (!confirm('Delete this note?')) {
        return;
    }
    notes = notes.filter(note => note.id !== id);
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
    renderResources();
    renderStudentResources();
    updateTeacherInsights();
    showToast('Note removed.', { variant: 'success', title: 'Note deleted' });
}

function addPYQ() {
    if (userRole !== 'teacher') {
        return;
    }
    const subject = document.getElementById('pyqSubject').value;
    const semester = document.getElementById('pyqSemester').value;
    const year = document.getElementById('pyqYear').value;
    const fileInput = document.getElementById('pyqFile');

    if (!subject || !semester || !year) {
        showToast('Please complete subject, semester, and year for the PYQ.', {
            variant: 'warning',
            title: 'Incomplete PYQ details'
        });
        return;
    }

    const pyq = {
        id: Date.now().toString(),
        subject,
        semester,
        year,
        fileName: 'No file uploaded',
        fileType: 'txt',
        fileData: null,
        uploadDate: new Date().toLocaleDateString()
    };

    if (fileInput && fileInput.files.length) {
        const file = fileInput.files[0];
        pyq.fileName = file.name;
        pyq.fileType = (file.name.split('.').pop() || 'txt').toLowerCase();
        const reader = new FileReader();
        reader.onload = e => {
            pyq.fileData = e.target.result;
            pyqs.push(pyq);
            localStorage.setItem(STORAGE_KEYS.pyqs, JSON.stringify(pyqs));
            renderResources();
            renderStudentResources();
            updateTeacherInsights();
            showToast('PYQ added successfully.', { variant: 'success', title: 'PYQ uploaded' });
        };
        reader.readAsDataURL(file);
    } else {
        pyqs.push(pyq);
        localStorage.setItem(STORAGE_KEYS.pyqs, JSON.stringify(pyqs));
        renderResources();
        renderStudentResources();
        updateTeacherInsights();
        showToast('PYQ added successfully.', { variant: 'success', title: 'PYQ uploaded' });
    }

    if (fileInput) {
        fileInput.value = '';
    }
    document.getElementById('pyqSubject').value = '';
    document.getElementById('pyqSemester').value = '';
    document.getElementById('pyqYear').value = '';
}

function deletePYQ(id) {
    if (!confirm('Delete this PYQ?')) {
        return;
    }
    pyqs = pyqs.filter(pyq => pyq.id !== id);
    localStorage.setItem(STORAGE_KEYS.pyqs, JSON.stringify(pyqs));
    renderResources();
    renderStudentResources();
    updateTeacherInsights();
    showToast('PYQ removed.', { variant: 'success', title: 'PYQ deleted' });
}

function renderResources() {
    const notesList = document.getElementById('notesList');
    const pyqList = document.getElementById('pyqList');
    if (!notesList || !pyqList) {
        return;
    }
    notesList.innerHTML = '';
    pyqList.innerHTML = '';

    if (!notes.length) {
        notesList.innerHTML = '<p>No notes available</p>';
    } else {
        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'resource-card';
            card.innerHTML = `
                <div class="resource-header">
                    <div class="resource-title">${note.title} ${note.fileType === 'pdf' ? '<span class="file-type-badge">PDF</span>' : ''}</div>
                    <div class="resource-actions">
                        <button class="download-btn" onclick="downloadResource('notes', '${note.id}')"><i class="fas fa-download"></i> Download</button>
                        <button class="download-btn" onclick="deleteNotes('${note.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                <div class="resource-meta">
                    <span><i class="fas fa-book"></i> ${note.subject}</span>
                    <span><i class="fas fa-layer-group"></i> Semester ${note.semester}</span>
                    <span><i class="fas fa-calendar"></i> ${note.uploadDate}</span>
                </div>
                <p>File: ${note.fileName}</p>
            `;
            notesList.appendChild(card);
        });
    }

    if (!pyqs.length) {
        pyqList.innerHTML = '<p>No PYQs available</p>';
    } else {
        pyqs.forEach(pyq => {
            const card = document.createElement('div');
            card.className = 'resource-card';
            card.innerHTML = `
                <div class="resource-header">
                    <div class="resource-title">${pyq.subject} PYQ ${pyq.year} ${pyq.fileType === 'pdf' ? '<span class="file-type-badge">PDF</span>' : ''}</div>
                    <div class="resource-actions">
                        <button class="download-btn" onclick="downloadResource('pyq', '${pyq.id}')"><i class="fas fa-download"></i> Download</button>
                        <button class="download-btn" onclick="deletePYQ('${pyq.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                <div class="resource-meta">
                    <span><i class="fas fa-book"></i> ${pyq.subject}</span>
                    <span><i class="fas fa-layer-group"></i> Semester ${pyq.semester}</span>
                    <span><i class="fas fa-calendar"></i> ${pyq.uploadDate}</span>
                </div>
                <p>File: ${pyq.fileName}</p>
            `;
            pyqList.appendChild(card);
        });
    }
}

function renderStudentResources() {
    if (userRole !== 'student') {
        return;
    }
    const notesContainer = document.getElementById('studentNotesList');
    const pyqContainer = document.getElementById('studentPYQList');
    if (!notesContainer || !pyqContainer) {
        return;
    }

    const subjectFilter = document.getElementById('studentResourceSubjectFilter');
    const semesterFilter = document.getElementById('studentResourceSemesterFilter');
    const selectedSubject = subjectFilter ? subjectFilter.value : 'all';
    const selectedSemester = semesterFilter ? semesterFilter.value : 'all';
    const homeSemester = currentUser?.semester;

    notesContainer.innerHTML = '';
    pyqContainer.innerHTML = '';

    const noteMatches = notes.filter(note => {
        const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
        const matchesSemester = selectedSemester === 'all'
            ? (!homeSemester || note.semester === homeSemester)
            : note.semester === selectedSemester;
        return matchesSubject && matchesSemester;
    });

    const pyqMatches = pyqs.filter(pyq => {
        const matchesSubject = selectedSubject === 'all' || pyq.subject === selectedSubject;
        const matchesSemester = selectedSemester === 'all'
            ? (!homeSemester || pyq.semester === homeSemester)
            : pyq.semester === selectedSemester;
        return matchesSubject && matchesSemester;
    });

    if (!noteMatches.length) {
        notesContainer.innerHTML = '<p>No notes available for the selected filters.</p>';
    } else {
        noteMatches.forEach(note => {
            const card = document.createElement('div');
            card.className = 'resource-card';
            card.innerHTML = `
                <div class="resource-header">
                    <div class="resource-title">${note.title} ${note.fileType === 'pdf' ? '<span class="file-type-badge">PDF</span>' : ''}</div>
                    <button class="download-btn" onclick="downloadResource('notes', '${note.id}')"><i class="fas fa-download"></i> Download</button>
                </div>
                <div class="resource-meta">
                    <span><i class="fas fa-book"></i> ${note.subject}</span>
                    <span><i class="fas fa-layer-group"></i> Semester ${note.semester}</span>
                    <span><i class="fas fa-calendar"></i> Uploaded: ${note.uploadDate}</span>
                </div>
                <p>File: ${note.fileName}</p>
            `;
            notesContainer.appendChild(card);
        });
    }

    if (!pyqMatches.length) {
        pyqContainer.innerHTML = '<p>No PYQs available for the selected filters.</p>';
    } else {
        pyqMatches.forEach(pyq => {
            const card = document.createElement('div');
            card.className = 'resource-card';
            card.innerHTML = `
                <div class="resource-header">
                    <div class="resource-title">${pyq.subject} PYQ ${pyq.year} ${pyq.fileType === 'pdf' ? '<span class="file-type-badge">PDF</span>' : ''}</div>
                    <button class="download-btn" onclick="downloadResource('pyq', '${pyq.id}')"><i class="fas fa-download"></i> Download</button>
                </div>
                <div class="resource-meta">
                    <span><i class="fas fa-book"></i> ${pyq.subject}</span>
                    <span><i class="fas fa-layer-group"></i> Semester ${pyq.semester}</span>
                    <span><i class="fas fa-calendar"></i> Uploaded: ${pyq.uploadDate}</span>
                </div>
                <p>File: ${pyq.fileName}</p>
            `;
            pyqContainer.appendChild(card);
        });
    }
}

function downloadResource(type, id) {
    let resource;
    if (type === 'notes') {
        resource = notes.find(n => n.id === id);
    } else {
        resource = pyqs.find(p => p.id === id);
    }

    if (!resource) {
        showToast('Resource not found.', { variant: 'error', title: 'Download failed' });
        return;
    }

    if (resource.fileData && resource.fileType === 'pdf') {
        const link = document.createElement('a');
        link.href = resource.fileData;
        link.download = resource.fileName || `${resource.title || resource.subject}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        const blob = new Blob([
            `${type === 'notes' ? 'Notes' : 'PYQ'}\nSubject: ${resource.subject}\nSemester: ${resource.semester}\n${type === 'notes' ? 'Title: ' + resource.title : 'Year: ' + resource.year}\nUploaded: ${resource.uploadDate}`
        ], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type === 'notes' ? (resource.title || 'note') : `${resource.subject || 'pyq'}_${resource.year || ''}`}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
function populateSubjectDropdowns() {
    const dropdownIds = ['gradeSubject', 'notesSubject', 'pyqSubject'];
    dropdownIds.forEach(id => {
        const dropdown = document.getElementById(id);
        if (!dropdown) {
            return;
        }
        const selected = dropdown.value;
        dropdown.innerHTML = '<option value="">Select Subject</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            dropdown.appendChild(option);
        });
        dropdown.value = selected;
    });
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

    const target = document.getElementById(`${tabName}-tab`);
    if (target) {
        target.classList.add('active');
    }
    const trigger = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (trigger) {
        trigger.classList.add('active');
    }
}

function updateDashboard() {
    setTextContent('totalStudents', students.length);
    setTextContent('totalStudentsSummary', students.length);

    if (userRole === 'teacher') {
        const metrics = calculateTeacherMetrics();
        latestMetrics.teacher = metrics;
        setTextContent('attendanceRate', metrics.attendanceRate + '%');
        setTextContent('overallAttendance', metrics.attendanceRate + '%');
        setTextContent('averageGrade', metrics.averageGrade + '%');
        setTextContent('overallAverageGrade', metrics.averageGrade + '%');
        setTextContent('feeCollection', formatCurrency(metrics.paid));
        setTextContent('totalFeesCollected', formatCurrency(metrics.paid));

        const paidEl = document.querySelector('.fee-item.paid');
        const pendingEl = document.querySelector('.fee-item.pending');
        const overdueEl = document.querySelector('.fee-item.overdue');
        if (paidEl) paidEl.textContent = 'Paid: ' + formatCurrency(metrics.paid);
        if (pendingEl) pendingEl.textContent = 'Pending: ' + formatCurrency(metrics.pending);
        if (overdueEl) overdueEl.textContent = 'Overdue: ' + formatCurrency(metrics.overdue);
    } else {
        const metrics = calculateStudentMetrics();
        latestMetrics.student = metrics;
        setTextContent('attendanceRate', metrics.attendanceRate + '%');
        setTextContent('overallAttendance', metrics.attendanceRate + '%');
        setTextContent('averageGrade', metrics.averageGrade + '%');
        setTextContent('overallAverageGrade', metrics.averageGrade + '%');
        setTextContent('feeCollection', formatCurrency(metrics.paid));
        setTextContent('totalFeesCollected', formatCurrency(metrics.paid));
        setTextContent('feePaidSummary', formatCurrency(metrics.paid));
        setTextContent('feePendingSummary', formatCurrency(metrics.pending));
        setTextContent('feeOverdueSummary', formatCurrency(metrics.overdue));
    }
}
