import { Database } from "bun:sqlite";
const db = new Database("site2.sqlite", { create: true });

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

// Function to import junior CS students (year <= 2)
async function importJuniorCSStudents() {
    try {
        //const studentsData = await Bun.file("data/students.json").json();
        
        // Prepare the insert statement
        const stmt = db.prepare(`INSERT OR IGNORE INTO students (s_id, name, department, year) VALUES (?, ?, ?, ?)`);
        
        // Filter and insert CS students with year <= 2
        const juniorCSStudents = studentsData.filter(student => 
            student.department === "CS" && student.year <= 2
        );
        
        // Begin transaction
        db.query('BEGIN TRANSACTION');
        
        for (const student of juniorCSStudents) {
            stmt.run([student.s_id, student.name, student.department, student.year]);
        }
        
        // Commit transaction
        db.query('COMMIT');
        
        console.log(`Successfully imported ${juniorCSStudents.length} junior CS students to site2`);
    } catch (error) {
        // Rollback on error
        db.query('ROLLBACK');
        console.error('Error importing students:', error);
    }
}


// Function to import enrollments for CS students with NOT DONE status
async function importCSIncompleteEnrollments() {
    try {
        // Filter enrollments where:
        // 1. Student is in CS department
        // 2. Status is NOT DONE
        const csIncompleteEnrollments = enrollmentsData.filter(enrollment => {
            const student = studentsData.find(s => s.s_id === enrollment.s_id);
            return student && 
                   student.department === "CS" && 
                   enrollment.status === "NOT DONE";
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
        for (const enrollment of csIncompleteEnrollments) {
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

        console.log(`Successfully imported ${csIncompleteEnrollments.length} incomplete enrollments for CS students to site2`);
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
        
        console.log(`Successfully imported ${csFaculty.length} CS faculty members to site2`);
    } catch (error) {
        // Rollback on error
        db.query('ROLLBACK');
        console.error('Error importing faculty:', error);
    }
}

// Function to import CS courses with credits <= 2
async function importBasicCSCourses() {
    try {
        // Filter courses where:
        // 1. Faculty is in CS department
        // 2. Credits <= 2
        const basicCSCourses = coursesData.filter(course => {
            const faculty = facultyData.find(f => f.f_id === course.f_id);
            return faculty && 
                   faculty.department === "CS" && 
                   course.credits <= 2;
        });

        // Prepare the insert statement
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO courses 
            (c_id, f_id, name, credits) 
            VALUES (?, ?, ?, ?)`
        );

        // Begin transaction
        db.query('BEGIN TRANSACTION');

        for (const course of basicCSCourses) {
            stmt.run([
                course.c_id,
                course.f_id,
                course.name,
                course.credits
            ]);
        }

        // Commit transaction
        db.query('COMMIT');

        console.log(`Successfully imported ${basicCSCourses.length} basic CS courses to site2`);
    } catch (error) {
        // Rollback on error
        db.query('ROLLBACK');
        console.error('Error importing courses:', error);
    }
}

// Run all imports
importJuniorCSStudents();
importCSIncompleteEnrollments();
importCSFaculty();
importBasicCSCourses(); 
server2Start();

// Start HTTP server for Site 2
export function server2Start() {

    Bun.serve({
        port: 3002,
        async fetch(req) {
          const url = new URL(req.url);
          const path = url.pathname;
          const courseId = url.searchParams.get("courseId");
          const facultyId = url.searchParams.get("facultyId");
      
          try {
            switch (path) {
              case "/course_enrollments": {
                // Get number of students enrolled in a basic CS course
                const query = `
                  SELECT COUNT(DISTINCT e.s_id) as enrollment_count
                  FROM enrollments e
                  JOIN courses c ON e.c_id = c.c_id
                  JOIN faculty f ON c.f_id = f.f_id
                  WHERE c.c_id = ? 
                  AND f.department = 'CS'
                  AND c.credits <= 2`;
      
                const result = db.query(query).get(courseId);
                return Response.json(result);
              }
      
              case "/course_enrollment_details": {
                // Get detailed enrollment info for incomplete enrollments
                const query = `
                  SELECT s.s_id, s.name as student_name, e.date, c.name as course_name
                  FROM enrollments e
                  JOIN students s ON e.s_id = s.s_id
                  JOIN courses c ON e.c_id = c.c_id
                  WHERE c.c_id = ? 
                  AND e.status = 'NOT DONE'`;
      
                const results = db.query(query).all(courseId);
                return Response.json(results);
              }
      
              case "/cs_faculty": {
                // Get all CS faculty members (replicated data)
                const query = `
                  SELECT * 
                  FROM faculty 
                  WHERE department = 'CS'`;
      
                const results = db.query(query).all();
                return Response.json(results);
              }
      
              case "/faculty_students": {
                // Get junior students (year <= 2) under a CS faculty member
                const query = `
                  SELECT DISTINCT s.* 
                  FROM students s
                  JOIN enrollments e ON s.s_id = e.s_id
                  JOIN courses c ON e.c_id = c.c_id
                  JOIN faculty f ON c.f_id = f.f_id
                  WHERE f.f_id = ?
                  AND s.department = 'CS'
                  AND s.year <= 2`;
      
                const results = db.query(query).all(facultyId);
                return Response.json(results);
              }
      
              default:
                return new Response("Not Found", { status: 404 });
            }
          } catch (error) {
            console.error("Error processing request:", error);
            return new Response("Internal Server Error", { status: 500 });
          }
        }
      });
      
}
console.log("Site 2 running on port 3002"); 

