//SITE 1 IS PRIMARILY CS

import { Database } from "bun:sqlite";
const db = new Database("site1.sqlite", { create: true });

// Create faculty table if it doesn't exist
db.query(`CREATE TABLE IF NOT EXISTS faculty (
    f_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL
)`).all();

// Create courses table if it doesn't exist
db.query(`CREATE TABLE IF NOT EXISTS courses (
    c_id INTEGER PRIMARY KEY,
    f_id INTEGER,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    FOREIGN KEY (f_id) REFERENCES faculty(f_id)
)`).all();

// Create students table if it doesn't exist
db.query(`CREATE TABLE IF NOT EXISTS students (
    s_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    year INTEGER
)`).all();

// Create enrollment table if it doesn't exist (junction table between students and courses)
db.query(`CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id INTEGER PRIMARY KEY,
    s_id INTEGER,
    c_id INTEGER,
    date DATE DEFAULT CURRENT_TIMESTAMP,
    status TEXT,
    FOREIGN KEY (s_id) REFERENCES students(s_id),
    FOREIGN KEY (c_id) REFERENCES courses(c_id),
    UNIQUE(s_id, c_id)
)`).all();

console.log("Database tables created successfully!");


import studentsData from "./data/students.json" with { type: "json" };
import enrollmentsData from "./data/enrollments.json" with { type: "json" };
import coursesData from "./data/courses.json" with { type: "json" };
import facultyData from "./data/faculty.json" with { type: "json" };

// Function to import CS students with year > 2       
async function importSeniorCSStudents() {
    try {

        // Prepare the insert statement
        const stmt = db.prepare(`INSERT OR IGNORE INTO students (s_id, name, department, year) VALUES (?, ?, ?, ?)`);
        
        // Filter and insert CS students with year > 2
        const seniorCSStudents = studentsData.filter(student => 
            student.department === "CS" && student.year > 2
        );
        //console.log(seniorCSStudents)
        
        // Begin transaction
        db.query('BEGIN TRANSACTION');
        
        for (const student of seniorCSStudents) {
            stmt.run([student.s_id, student.name, student.department, student.year]);
        }
        
        // Commit transaction
        db.query('COMMIT');
        
        console.log(`Successfully imported ${seniorCSStudents.length} senior CS students to site1`);
    } catch (error) {
        // Rollback on error
        db.query('ROLLBACK');
        console.error('Error importing students:', error);
    }
}

// Function to import enrollments for CS students with DONE status
async function importCSCompletedEnrollments() {
    try {
        // Filter enrollments where:
        // 1. Student is in CS department
        // 2. Status is DONE
        const csCompletedEnrollments = enrollmentsData.filter(enrollment => {
            const student = studentsData.find(s => s.s_id === enrollment.s_id);
            return student && 
                   student.department === "CS" && 
                   enrollment.status === "DONE";
        });

        // Prepare the insert statement
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO enrollments 
            (enrollment_id, s_id, c_id, date, status) 
            VALUES (?, ?, ?, ?, ?)`
        );

        // Begin transaction
        db.query('BEGIN TRANSACTION');

        let enrollmentId = 1; // Auto-increment ID
        for (const enrollment of csCompletedEnrollments) {
            stmt.run([
                enrollmentId++,
                enrollment.s_id,
                enrollment.c_id,
                enrollment.date,
                enrollment.status
            ]);
        }

        // Commit transaction
        db.query('COMMIT');

        console.log(`Successfully imported ${csCompletedEnrollments.length} completed enrollments for CS students to site1`);
    } catch (error) {
        // Rollback on error
        db.query('ROLLBACK');
        console.error('Error importing enrollments:', error);
    }
}

// Function to import CS faculty
async function importCSFaculty() {
    try {
        // Filter faculty in CS department
        const csFaculty = facultyData.filter(faculty => faculty.department === "CS");

        // Prepare the insert statement
        const stmt = db.prepare(`INSERT OR IGNORE INTO faculty (f_id, name, department) VALUES (?, ?, ?)`);
        
        // Begin transaction
        db.query('BEGIN TRANSACTION');
        
        for (const faculty of csFaculty) {
            stmt.run([faculty.f_id, faculty.name, faculty.department]);
        }
        
        // Commit transaction
        db.query('COMMIT');
        
        console.log(`Successfully imported ${csFaculty.length} CS faculty members to site1`);
    } catch (error) {
        // Rollback on error
        db.query('ROLLBACK');
        console.error('Error importing faculty:', error);
    }
}

// Function to import CS courses with credits > 2
async function importAdvancedCSCourses() {
    try {
        // Filter courses where:
        // 1. Faculty is in CS department
        // 2. Credits > 2
        const advancedCSCourses = coursesData.filter(course => {
            const faculty = facultyData.find(f => f.f_id === course.f_id);
            return faculty && 
                   faculty.department === "CS" && 
                   course.credits > 2;
        });

        // Prepare the insert statement
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO courses 
            (c_id, f_id, name, credits) 
            VALUES (?, ?, ?, ?)`
        );

        // Begin transaction
        db.query('BEGIN TRANSACTION');

        for (const course of advancedCSCourses) {
            stmt.run([
                course.c_id,
                course.f_id,
                course.name,
                course.credits
            ]);
        }

        // Commit transaction
        db.query('COMMIT');

        console.log(`Successfully imported ${advancedCSCourses.length} advanced CS courses to site1`);
    } catch (error) {
        // Rollback on error
        db.query('ROLLBACK');
        console.error('Error importing courses:', error);
    }
}

// Run all imports
importSeniorCSStudents();
importCSCompletedEnrollments();
importCSFaculty();
importAdvancedCSCourses(); 
