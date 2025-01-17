// Decision site that routes traffic between distributed database sites
import { Database } from "bun:sqlite";

const SITE1_URL = "http://localhost:3001";
const SITE2_URL = "http://localhost:3002";

// Start HTTP server to handle incoming requests
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Extract query parameters
    const department = url.searchParams.get("department");
    const queryType = url.searchParams.get("queryType");
    const year = parseInt(url.searchParams.get("year") || "0");
    const courseId = url.searchParams.get("courseId");
    const facultyId = url.searchParams.get("facultyId");
    const credits = parseInt(url.searchParams.get("credits") || "0");
    
    // Only handle CS department queries for now
    // if (department !== "CS") {
    //   return new Response("Only CS department queries are supported", { status: 400 });
    // }

    try {
      // Route request based on query type and parameters
      switch (queryType) {
        case "course_enrollments": {
          if (department !== "CS") {
            //NON CS course enrollment request(Get number of students enrolled for a course given courseId?)
                    return new Response("Only CS department queries are supported", { status: 400 });
          } else {
            // CS Get number of students enrolled in a CS course
            // Route based on course credits
            const targetUrl = credits > 2 ? SITE1_URL : SITE2_URL;
            const response = await fetch(`${targetUrl}/course_enrollments?courseId=${courseId}`);
            return response;
          }
        }

        case "course_enrollment_details": {
          if (department !== "CS") {
                //NON CS detailed enrollment info for a course (student, date) a course given courseId?)
                        return new Response("Only CS department queries are supported", { status: 400 });
          } else {
            // Get detailed enrollment info for a course
            // Need to check both sites since enrollments are split by status
            const [site1Response, site2Response] = await Promise.all([
                fetch(`${SITE1_URL}/course_enrollment_details?courseId=${courseId}`),
                fetch(`${SITE2_URL}/course_enrollment_details?courseId=${courseId}`)
            ]);

            // Combine results from both sites
            const site1Data = await site1Response.json();
            const site2Data = await site2Response.json();
            return Response.json([...site1Data, ...site2Data]);
          }
        }

        case "faculty_members": {
          if (department !== "CS") {
                //NON CS get all faculty members of a course given courseId?
                        return new Response("Only CS department queries are supported", { status: 400 });
          } else {
            // Get all CS faculty members
            // Faculty data is replicated on both sites, so we can query either
            const response = await fetch(`${SITE1_URL}/cs_faculty`);
            return response;
          }
        }

        case "faculty_students": {
          if (department !== "CS") {
                //NON CS get students under a faculty member
                        return new Response("Only CS department queries are supported", { status: 400 });
          } else {
            // Get students under a CS faculty member
            // Need to check both sites since students are split by year
            const [site1Response, site2Response] = await Promise.all([
                fetch(`${SITE1_URL}/faculty_students?facultyId=${facultyId}`),
                fetch(`${SITE2_URL}/faculty_students?facultyId=${facultyId}`)
            ]);

            // Combine results from both sites
            const site1Data = await site1Response.json();
            const site2Data = await site2Response.json();
            return Response.json([...site1Data, ...site2Data]);
          }
        }

        default:
          return new Response("Invalid query type", { status: 400 });
      }
    } catch (error) {
      console.error("Error processing request:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }
});

console.log("Decision site running on port 3000");
