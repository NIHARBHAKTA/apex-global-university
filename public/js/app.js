document.addEventListener('DOMContentLoaded', () => {

    // Helper utility to show short custom message notifications seamlessly inline
    const showNotice = (msg, isSuccess = false) => {
        const noticeBox = document.getElementById('error-msg');
        if (noticeBox) {
            noticeBox.style.color = isSuccess ? "var(--success)" : "var(--danger)";
            noticeBox.innerText = msg;
            // Clear message notice window automatically after 3 seconds
            setTimeout(() => { noticeBox.innerText = ""; }, 3000);
        }
    };

    // ==========================================
    // 1A. ADMIN REGISTRATION HANDLER
    // =========================================
    const adminRegisterForm = document.getElementById('adminRegisterForm');
    if (adminRegisterForm) {
        adminRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                username: document.getElementById('regUser').value,
                email: document.getElementById('regEmail').value,
                phone: document.getElementById('regPhone').value
            };

            const response = await fetch('/api/admin/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (data.success) {
                showNotice("Admin registered successfully!", true);
                adminRegisterForm.reset();
                // Delay redirect slightly so the user can read the success text notice
                setTimeout(() => { window.location.href = '/admin-login'; }, 1500);
            } else {
                showNotice(data.message);
            }
        });
    }

    // ==========================================
    // 1B. ADMIN LOGIN EVENT LISTENER
    // =========================================
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                adminUniqueName: document.getElementById('loginUniqueName').value,
                adminAccessNumber: document.getElementById('loginAccessNumber').value
            };

            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (data.success) {
                window.location.href = '/admin';
            } else {
                showNotice("Invalid unique credentials.");
            }
        });
    }

    // ==========================================
    // 2. STUDENT SECURE HUB ENTRY LOGIC
    // =========================================
    const studentLoginForm = document.getElementById('studentLoginForm');
    if (studentLoginForm) {
        studentLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                studentUniqueName: document.getElementById('studUniqueName').value,
                studentAccessNumber: document.getElementById('studAccessNumber').value
            };

            const response = await fetch('/api/student/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (data.success) {
                window.location.href = '/student';
            } else {
                showNotice("Credentials verification failed.");
            }
        });
    }

    // ==========================================
    // 3. ADMIN LIVE DASHBOARD MANAGEMENT PIPELINE
    // =========================================
    const tableBody = document.getElementById('apps-table-body');
    if (tableBody) {
        const renderDataRows = () => {
            fetch('/api/applications')
                .then(res => res.json())
                .then(data => {
                    tableBody.innerHTML = '';
                    if (data.length === 0) {
                        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No registered applications received yet.</td></tr>`;
                        return;
                    }
                    data.forEach(app => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td data-label="Applicant Student"><strong>${app.name}</strong></td>
                            <td data-label="Email Contact">${app.email}</td>
                            <td data-label="Selected Track">${app.course}</td>
                            <td data-label="12th Grade %">${app.marks12th}%</td>
                            <td data-label="Status"><span class="status-badge" style="background:${app.status === 'Approved' ? '#2ecc71' : '#f1c40f'}">${app.status}</span></td>
                            <td data-label="Evaluation Decision Handlers">
                                ${app.status === 'Pending' ? `
                                    <button class="action-btn btn-approve" onclick="evaluateApp('${app._id}', 'approve')">Approve</button>
                                    <button class="action-btn btn-reject" onclick="evaluateApp('${app._id}', 'reject')">Reject</button>
                                ` : `<span style="color:#94a3b8; font-size:13px; font-weight:500;">Closed</span>`}
                            </td>
                        `;
                        tableBody.appendChild(tr);
                    });
                });
        };
        renderDataRows();

        window.evaluateApp = async (id, action) => {
            if (!confirm(`Confirm file ${action}?`)) return;
            const res = await fetch(`/api/applications/${id}/${action}`, { method: 'POST' });
            const result = await res.json();
            
            // Replaces the native browser evaluation alert boxes with clean inline cards
            const statusBox = document.getElementById('error-msg');
            if (statusBox) {
                statusBox.style.color = action === 'approve' ? "var(--success)" : "var(--danger)";
                statusBox.innerText = action === 'approve' ? "Student approved & credentials dispatched!" : "Application denied.";
                setTimeout(() => { statusBox.innerText = ""; }, 3000);
            }
            renderDataRows();
        };
    }
});