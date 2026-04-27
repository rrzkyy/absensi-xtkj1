const express = require('express');
const initSqlJs = require('sql.js');
const QRCode = require('qrcode');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

let db;

// Initialize database
async function initDB() {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    const dbPath = path.join(__dirname, 'absensi.db');
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        lat REAL,
        lng REAL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        nis TEXT UNIQUE,
        class TEXT,
        photo TEXT,
        face_data TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT,
        time TEXT,
        subject TEXT,
        uniform TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        date TEXT,
        time_in TEXT,
        status TEXT,
        verification_method TEXT,
        lat REAL,
        lng REAL,
        FOREIGN KEY(student_id) REFERENCES students(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        created_at TEXT,
        expires_at TEXT,
        active INTEGER DEFAULT 1
      )
    `);

    // Seed default admin
    const adminCheck = db.exec("SELECT * FROM admin WHERE username = 'admin'");
    if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
        db.run("INSERT INTO admin (username, password, name, lat, lng) VALUES (?, ?, ?, ?, ?)",
            ['admin', 'rizkyadmin', 'Administrator', -6.200000, 106.816666]);
    }

    // Seed schedules
    const scheduleCheck = db.exec("SELECT COUNT(*) as count FROM schedules");
    if (scheduleCheck.length === 0 || scheduleCheck[0].values[0][0] === 0) {
        const schedules = [
            ['Senin', '07:00-07:45', 'Matematika', 'Baju Putih - Celana Hitam'],
            ['Senin', '07:45-08:30', 'Bahasa Indonesia', 'Baju Putih - Celana Hitam'],
            ['Senin', '08:30-09:15', 'Bahasa Inggris', 'Baju Putih - Celana Hitam'],
            ['Senin', '09:15-10:00', 'IPA', 'Baju Putih - Celana Hitam'],
            ['Senin', '10:30-11:15', 'IPS', 'Baju Putih - Celana Hitam'],
            ['Senin', '11:15-12:00', 'PKN', 'Baju Putih - Celana Hitam'],
            ['Selasa', '07:00-07:45', 'Matematika', 'Baju Pramuka - Celana Hitam'],
            ['Selasa', '07:45-08:30', 'Bahasa Indonesia', 'Baju Pramuka - Celana Hitam'],
            ['Selasa', '08:30-09:15', 'Seni Budaya', 'Baju Pramuka - Celana Hitam'],
            ['Selasa', '09:15-10:00', 'PJOK', 'Baju Olahraga - Celana Olahraga'],
            ['Selasa', '10:30-11:15', 'IPA', 'Baju Pramuka - Celana Hitam'],
            ['Rabu', '07:00-07:45', 'Matematika', 'Baju Putih - Celana Hitam'],
            ['Rabu', '07:45-08:30', 'Bahasa Inggris', 'Baju Putih - Celana Hitam'],
            ['Rabu', '08:30-09:15', 'IPA', 'Baju Putih - Celana Hitam'],
            ['Rabu', '09:15-10:00', 'IPS', 'Baju Putih - Celana Hitam'],
            ['Rabu', '10:30-11:15', 'Bahasa Indonesia', 'Baju Putih - Celana Hitam'],
            ['Kamis', '07:00-07:45', 'IPS', 'Baju Batik - Celana Hitam'],
            ['Kamis', '07:45-08:30', 'PKN', 'Baju Batik - Celana Hitam'],
            ['Kamis', '08:30-09:15', 'Matematika', 'Baju Batik - Celana Hitam'],
            ['Kamis', '09:15-10:00', 'Bahasa Indonesia', 'Baju Batik - Celana Hitam'],
            ['Kamis', '10:30-11:15', 'IPA', 'Baju Batik - Celana Hitam'],
            ['Jumat', '07:00-07:45', 'Bahasa Inggris', 'Baju Putih - Celana Hitam'],
            ['Jumat', '07:45-08:30', 'Matematika', 'Baju Putih - Celana Hitam'],
            ['Jumat', '08:30-09:15', 'IPS', 'Baju Putih - Celana Hitam'],
            ['Jumat', '09:15-10:00', 'PJOK', 'Baju Olahraga - Celana Olahraga'],
            ['Jumat', '10:30-11:15', 'Agama', 'Baju Putih - Celana Hitam'],
        ];
        for (const s of schedules) {
            db.run("INSERT INTO schedules (day, time, subject, uniform) VALUES (?, ?, ?, ?)", s);
        }
    }

    // Seed sample students
    const studentCheck = db.exec("SELECT COUNT(*) as count FROM students");
    if (studentCheck.length === 0 || studentCheck[0].values[0][0] === 0) {
        const students = [
            ['Ahmad Fauzi', '12345', 'X IPA 1', 'student1.jpg'],
            ['Siti Nurhaliza', '12346', 'X IPA 1', 'student2.jpg'],
            ['Budi Santoso', '12347', 'X IPA 1', 'student3.jpg'],
            ['Dewi Lestari', '12348', 'X IPA 1', 'student4.jpg'],
            ['Rizky Pratama', '12349', 'X IPA 1', 'student5.jpg'],
        ];
        for (const s of students) {
            db.run("INSERT INTO students (name, nis, class, photo) VALUES (?, ?, ?, ?)", s);
        }
    }

    saveDB();
    console.log('Database initialized');
}

function saveDB() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(path.join(__dirname, 'absensi.db'), buffer);
}

// Helper function to get single row
function getOne(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return null;
}

// Helper function to get all rows
function getAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// API Routes

// Login
app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;

    if (role === 'admin') {
        const admin = getOne("SELECT * FROM admin WHERE username = ? AND password = ?", [username, password]);
        if (admin) {
            res.json({ success: true, role: 'admin', name: admin.name, lat: admin.lat, lng: admin.lng });
        } else {
            res.json({ success: false, message: 'Username atau password salah' });
        }
    } else {
        const student = getOne("SELECT * FROM students WHERE nis = ?", [username]);
        if (student && student.name === password) {
            res.json({ success: true, role: 'student', student });
        } else {
            res.json({ success: false, message: 'NIS atau nama salah' });
        }
    }
});

// Get student by ID
app.get('/api/students/:id', (req, res) => {
    const student = getOne("SELECT * FROM students WHERE id = ?", [req.params.id]);
    if (student) {
        res.json(student);
    } else {
        res.status(404).json({ error: 'Siswa tidak ditemukan' });
    }
});

// Get all students
app.get('/api/students', (req, res) => {
    const students = getAll("SELECT * FROM students");
    res.json(students);
});
// Add new student
app.post('/api/students', (req, res) => {
    const { name, nis, class: studentClass } = req.body;

    if (!name || !nis || !studentClass) {
        return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }

    try {
        db.run("INSERT INTO students (name, nis, class) VALUES (?, ?, ?)",
            [name, nis, studentClass]);
        saveDB();
        res.json({ success: true, message: 'Siswa berhasil ditambahkan' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ success: false, message: 'NIS sudah terdaftar' });
        } else {
            res.status(500).json({ success: false, message: err.message });
        }
    }
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
    db.run("DELETE FROM students WHERE id = ?", [req.params.id]);
    saveDB();
    res.json({ success: true });
});

// Get schedules
app.get('/api/schedule', (req, res) => {
    const schedules = getAll("SELECT * FROM schedules ORDER BY day, time");
    res.json(schedules);
});

// Get schedules by day
app.get('/api/schedule/:day', (req, res) => {
    const schedules = getAll("SELECT * FROM schedules WHERE day = ? ORDER BY time", [req.params.day]);
    res.json(schedules);
});

// Update schedule
app.put('/api/schedule/:id', (req, res) => {
    const { day, time, subject, uniform } = req.body;
    db.run("UPDATE schedules SET day = ?, time = ?, subject = ?, uniform = ? WHERE id = ?",
        [day, time, subject, uniform, req.params.id]);
    saveDB();
    res.json({ success: true });
});

// Get today's attendance
app.get('/api/attendance/today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const attendance = getAll(`
        SELECT a.*, s.name, s.class 
        FROM attendance a 
        JOIN students s ON a.student_id = s.id 
        WHERE a.date = ?
        ORDER BY a.time_in DESC
    `, [today]);
    res.json(attendance);
});

// Check if student already attended today
app.get('/api/attendance/check/:studentId', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const attendance = getOne("SELECT * FROM attendance WHERE student_id = ? AND date = ?",
        [req.params.studentId, today]);
    res.json({ attended: !!attendance, attendance });
});

// Generate QR Code
app.post('/api/qr/generate', async (req, res) => {
    const code = 'ABSENSI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Deactivate old QR codes
    db.run("UPDATE qr_codes SET active = 0");

    // Insert new QR code
    db.run("INSERT INTO qr_codes (code, created_at, expires_at, active) VALUES (?, ?, ?, 1)",
        [code, new Date().toISOString(), expiresAt]);
    saveDB();

    // Generate QR image
    const qr = await QRCode.toDataURL(code);

    res.json({ success: true, code, qr, expiresAt });
});

// Verify QR Code
app.post('/api/qr/verify', (req, res) => {
    const { code } = req.body;
    const qr = getOne("SELECT * FROM qr_codes WHERE code = ? AND active = 1", [code]);

    if (!qr) {
        return res.json({ valid: false, message: 'QR Code tidak valid' });
    }

    const expiresAt = new Date(qr.expires_at).getTime();
    if (Date.now() > expiresAt) {
        return res.json({ valid: false, message: 'QR Code sudah expired' });
    }

    res.json({ valid: true });
});

// Submit attendance
app.post('/api/attendance', (req, res) => {
    const { studentId, verificationMethod, lat, lng } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const timeIn = new Date().toTimeString().split(' ')[0];

    // Check if already attended
    const existing = getOne("SELECT * FROM attendance WHERE student_id = ? AND date = ?", [studentId, today]);
    if (existing) {
        return res.json({ success: false, message: 'Anda sudah absen hari ini' });
    }

    db.run("INSERT INTO attendance (student_id, date, time_in, status, verification_method, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [studentId, today, timeIn, 'Hadir', verificationMethod, lat, lng]);
    saveDB();

    res.json({ success: true, message: 'Absensi berhasil!' });
});

// Get admin location
app.get('/api/admin/location', (req, res) => {
    const admin = getOne("SELECT lat, lng FROM admin WHERE username = 'admin'");
    res.json(admin || { lat: -6.200000, lng: 106.816666 });
});

// Update admin location
app.put('/api/admin/location', (req, res) => {
    const { lat, lng } = req.body;
    db.run("UPDATE admin SET lat = ?, lng = ? WHERE username = 'admin'", [lat, lng]);
    saveDB();
    res.json({ success: true });
});

// Start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});