'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Sample subjects for different semesters
    const subjects = [
      // Semester 1 - Theory Subjects
      { subject_code: 'CS101', subject_name: 'Programming Fundamentals', subject_type: 'theory', semester: 1, credits: 4 },
      { subject_code: 'MA101', subject_name: 'Engineering Mathematics I', subject_type: 'theory', semester: 1, credits: 4 },
      { subject_code: 'PH101', subject_name: 'Engineering Physics', subject_type: 'theory', semester: 1, credits: 3 },
      { subject_code: 'CH101', subject_name: 'Engineering Chemistry', subject_type: 'theory', semester: 1, credits: 3 },
      { subject_code: 'EG101', subject_name: 'Engineering Graphics', subject_type: 'theory', semester: 1, credits: 2 },
      { subject_code: 'EN101', subject_name: 'Technical English', subject_type: 'theory', semester: 1, credits: 2 },
      
      // Semester 1 - Lab Subjects
      { subject_code: 'CS101L', subject_name: 'Programming Fundamentals Lab', subject_type: 'lab', semester: 1, credits: 2 },
      { subject_code: 'PH101L', subject_name: 'Physics Lab', subject_type: 'lab', semester: 1, credits: 1 },

      // Semester 2 - Theory Subjects
      { subject_code: 'CS201', subject_name: 'Data Structures', subject_type: 'theory', semester: 2, credits: 4 },
      { subject_code: 'MA201', subject_name: 'Engineering Mathematics II', subject_type: 'theory', semester: 2, credits: 4 },
      { subject_code: 'EC201', subject_name: 'Digital Electronics', subject_type: 'theory', semester: 2, credits: 3 },
      { subject_code: 'CS202', subject_name: 'Computer Organization', subject_type: 'theory', semester: 2, credits: 3 },
      { subject_code: 'EN201', subject_name: 'Professional Communication', subject_type: 'theory', semester: 2, credits: 2 },
      { subject_code: 'EV201', subject_name: 'Environmental Studies', subject_type: 'theory', semester: 2, credits: 2 },
      
      // Semester 2 - Lab Subjects
      { subject_code: 'CS201L', subject_name: 'Data Structures Lab', subject_type: 'lab', semester: 2, credits: 2 },
      { subject_code: 'EC201L', subject_name: 'Digital Electronics Lab', subject_type: 'lab', semester: 2, credits: 1 },

      // Semester 3 - Theory Subjects
      { subject_code: 'CS301', subject_name: 'Object Oriented Programming', subject_type: 'theory', semester: 3, credits: 4 },
      { subject_code: 'CS302', subject_name: 'Database Management Systems', subject_type: 'theory', semester: 3, credits: 4 },
      { subject_code: 'CS303', subject_name: 'Computer Networks', subject_type: 'theory', semester: 3, credits: 3 },
      { subject_code: 'MA301', subject_name: 'Discrete Mathematics', subject_type: 'theory', semester: 3, credits: 3 },
      { subject_code: 'CS304', subject_name: 'Operating Systems', subject_type: 'theory', semester: 3, credits: 3 },
      { subject_code: 'CS305', subject_name: 'Software Engineering', subject_type: 'theory', semester: 3, credits: 3 },
      
      // Semester 3 - Lab Subjects
      { subject_code: 'CS301L', subject_name: 'OOP Lab', subject_type: 'lab', semester: 3, credits: 2 },
      { subject_code: 'CS302L', subject_name: 'DBMS Lab', subject_type: 'lab', semester: 3, credits: 2 },

      // Semester 4 - Theory Subjects
      { subject_code: 'CS401', subject_name: 'Design and Analysis of Algorithms', subject_type: 'theory', semester: 4, credits: 4 },
      { subject_code: 'CS402', subject_name: 'Web Technologies', subject_type: 'theory', semester: 4, credits: 4 },
      { subject_code: 'CS403', subject_name: 'Computer Graphics', subject_type: 'theory', semester: 4, credits: 3 },
      { subject_code: 'CS404', subject_name: 'Theory of Computation', subject_type: 'theory', semester: 4, credits: 3 },
      { subject_code: 'CS405', subject_name: 'Microprocessors', subject_type: 'theory', semester: 4, credits: 3 },
      { subject_code: 'MA401', subject_name: 'Probability and Statistics', subject_type: 'theory', semester: 4, credits: 3 },
      
      // Semester 4 - Lab Subjects
      { subject_code: 'CS402L', subject_name: 'Web Technologies Lab', subject_type: 'lab', semester: 4, credits: 2 },
      { subject_code: 'CS403L', subject_name: 'Computer Graphics Lab', subject_type: 'lab', semester: 4, credits: 2 },

      // Semester 5 - Theory Subjects
      { subject_code: 'CS501', subject_name: 'Machine Learning', subject_type: 'theory', semester: 5, credits: 4 },
      { subject_code: 'CS502', subject_name: 'Compiler Design', subject_type: 'theory', semester: 5, credits: 4 },
      { subject_code: 'CS503', subject_name: 'Information Security', subject_type: 'theory', semester: 5, credits: 3 },
      { subject_code: 'CS504', subject_name: 'Mobile Application Development', subject_type: 'theory', semester: 5, credits: 3 },
      { subject_code: 'CS505', subject_name: 'Artificial Intelligence', subject_type: 'theory', semester: 5, credits: 3 },
      { subject_code: 'MG501', subject_name: 'Engineering Economics', subject_type: 'theory', semester: 5, credits: 2 },
      
      // Semester 5 - Lab Subjects
      { subject_code: 'CS501L', subject_name: 'Machine Learning Lab', subject_type: 'lab', semester: 5, credits: 2 },
      { subject_code: 'CS504L', subject_name: 'Mobile App Development Lab', subject_type: 'lab', semester: 5, credits: 2 },

      // Semester 6 - Theory Subjects
      { subject_code: 'CS601', subject_name: 'Cloud Computing', subject_type: 'theory', semester: 6, credits: 4 },
      { subject_code: 'CS602', subject_name: 'Big Data Analytics', subject_type: 'theory', semester: 6, credits: 4 },
      { subject_code: 'CS603', subject_name: 'Internet of Things', subject_type: 'theory', semester: 6, credits: 3 },
      { subject_code: 'CS604', subject_name: 'Blockchain Technology', subject_type: 'theory', semester: 6, credits: 3 },
      { subject_code: 'CS605', subject_name: 'DevOps and Automation', subject_type: 'theory', semester: 6, credits: 3 },
      { subject_code: 'MG601', subject_name: 'Project Management', subject_type: 'theory', semester: 6, credits: 2 },
      
      // Semester 6 - Lab Subjects
      { subject_code: 'CS601L', subject_name: 'Cloud Computing Lab', subject_type: 'lab', semester: 6, credits: 2 },
      { subject_code: 'CS602L', subject_name: 'Big Data Analytics Lab', subject_type: 'lab', semester: 6, credits: 2 },

      // Semester 7 - Theory Subjects
      { subject_code: 'CS701', subject_name: 'Advanced Database Systems', subject_type: 'theory', semester: 7, credits: 4 },
      { subject_code: 'CS702', subject_name: 'Distributed Systems', subject_type: 'theory', semester: 7, credits: 4 },
      { subject_code: 'CS703', subject_name: 'Computer Vision', subject_type: 'theory', semester: 7, credits: 3 },
      { subject_code: 'CS704', subject_name: 'Natural Language Processing', subject_type: 'theory', semester: 7, credits: 3 },
      { subject_code: 'CS705', subject_name: 'Elective I', subject_type: 'theory', semester: 7, credits: 3 },
      { subject_code: 'CS706', subject_name: 'Elective II', subject_type: 'theory', semester: 7, credits: 3 },
      
      // Semester 7 - Lab Subjects
      { subject_code: 'CS701L', subject_name: 'Advanced Database Lab', subject_type: 'lab', semester: 7, credits: 2 },
      { subject_code: 'CS707L', subject_name: 'Project Work I', subject_type: 'lab', semester: 7, credits: 4 },

      // Semester 8 - Theory Subjects
      { subject_code: 'CS801', subject_name: 'Advanced Software Engineering', subject_type: 'theory', semester: 8, credits: 4 },
      { subject_code: 'CS802', subject_name: 'Research Methodology', subject_type: 'theory', semester: 8, credits: 3 },
      { subject_code: 'CS803', subject_name: 'Elective III', subject_type: 'theory', semester: 8, credits: 3 },
      { subject_code: 'CS804', subject_name: 'Elective IV', subject_type: 'theory', semester: 8, credits: 3 },
      { subject_code: 'IN801', subject_name: 'Industrial Training', subject_type: 'theory', semester: 8, credits: 2 },
      { subject_code: 'SE801', subject_name: 'Seminar', subject_type: 'theory', semester: 8, credits: 1 },
      
      // Semester 8 - Lab Subjects
      { subject_code: 'CS801L', subject_name: 'Project Work II', subject_type: 'lab', semester: 8, credits: 6 },
      { subject_code: 'CS802L', subject_name: 'Comprehensive Viva', subject_type: 'lab', semester: 8, credits: 2 }
    ];

    await queryInterface.bulkInsert('subjects', subjects, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('subjects', null, {});
  }
};