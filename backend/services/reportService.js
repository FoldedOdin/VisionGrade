const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs').promises;
const path = require('path');
const db = require('../models');
const { Student, Mark, Attendance, Subject, User, Faculty, StudentSubject } = db;

class ReportService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../uploads/reports');
    this.ensureReportsDirectory();
  }

  async ensureReportsDirectory() {
    try {
      await fs.access(this.reportsDir);
    } catch (error) {
      await fs.mkdir(this.reportsDir, { recursive: true });
    }
  }

  // Generate student report card in PDF format
  async generateStudentReportCardPDF(studentId, academicYear = null) {
    const currentYear = academicYear || new Date().getFullYear();
    
    // Fetch student data with all related information
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: User,
          as: 'user'
        },
        {
          model: Mark,
          as: 'marks',
          include: [{
            model: Subject,
            as: 'subject'
          }]
        },
        {
          model: Attendance,
          as: 'attendanceRecords',
          include: [{
            model: Subject,
            as: 'subject'
          }]
        }
      ]
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Organize data by subject
    const subjectData = await this.organizeStudentDataBySubject(student, currentYear);
    
    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const filename = `report_card_${student.user.unique_id}_${currentYear}.pdf`;
    const filepath = path.join(this.reportsDir, filename);

    // Pipe PDF to file
    const stream = require('fs').createWriteStream(filepath);
    doc.pipe(stream);

    // Add header
    this.addPDFHeader(doc, student, currentYear);
    
    // Add student information
    this.addStudentInfoToPDF(doc, student);
    
    // Add academic performance table
    this.addAcademicPerformanceToPDF(doc, subjectData);
    
    // Add attendance summary
    this.addAttendanceSummaryToPDF(doc, student, subjectData);
    
    // Add performance summary
    this.addPerformanceSummaryToPDF(doc, subjectData);
    
    // Add footer
    this.addPDFFooter(doc);

    doc.end();

    // Wait for PDF generation to complete
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return {
      filename,
      filepath,
      url: `/api/reports/download/${filename}`
    };
  }

  // Generate student report card in DOC format
  async generateStudentReportCardDOC(studentId, academicYear = null) {
    const currentYear = academicYear || new Date().getFullYear();
    
    // Fetch student data
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: User,
          as: 'user'
        },
        {
          model: Mark,
          as: 'marks',
          include: [{
            model: Subject,
            as: 'subject'
          }]
        },
        {
          model: Attendance,
          as: 'attendanceRecords',
          include: [{
            model: Subject,
            as: 'subject'
          }]
        }
      ]
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Organize data by subject
    const subjectData = await this.organizeStudentDataBySubject(student, currentYear);
    
    // Create DOC document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({
                text: "STUDENT REPORT CARD",
                bold: true,
                size: 32
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          // Student Information
          new Paragraph({
            children: [
              new TextRun({
                text: "Student Information",
                bold: true,
                size: 24
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          
          new Paragraph({
            children: [
              new TextRun(`Student ID: ${student.user.unique_id}`)
            ]
          }),
          
          new Paragraph({
            children: [
              new TextRun(`Name: ${student.student_name}`)
            ]
          }),
          
          new Paragraph({
            children: [
              new TextRun(`Semester: ${student.semester}`)
            ]
          }),
          
          new Paragraph({
            children: [
              new TextRun(`Batch Year: ${student.batch_year}`)
            ]
          }),
          
          new Paragraph({
            children: [
              new TextRun(`Academic Year: ${currentYear}`)
            ],
            spacing: { after: 400 }
          }),

          // Academic Performance Table
          this.createDOCPerformanceTable(subjectData),
          
          // Performance Summary
          new Paragraph({
            children: [
              new TextRun({
                text: "Performance Summary",
                bold: true,
                size: 24
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          ...this.createDOCPerformanceSummary(subjectData)
        ]
      }]
    });

    const filename = `report_card_${student.user.unique_id}_${currentYear}.docx`;
    const filepath = path.join(this.reportsDir, filename);
    
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(filepath, buffer);

    return {
      filename,
      filepath,
      url: `/api/reports/download/${filename}`
    };
  }

  // Generate faculty report with filtering options
  async generateFacultyReport(facultyId, filters = {}, format = 'pdf') {
    const faculty = await Faculty.findByPk(facultyId, {
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!faculty) {
      throw new Error('Faculty not found');
    }

    // Get faculty's assigned subjects
    const subjects = await faculty.getSubjects({
      through: {
        where: {
          academic_year: filters.academicYear || new Date().getFullYear()
        }
      }
    });

    const reportData = {
      faculty,
      subjects: [],
      summary: {
        totalSubjects: subjects.length,
        totalStudents: 0,
        averagePerformance: 0,
        averageAttendance: 0
      }
    };

    // Collect data for each subject
    for (const subject of subjects) {
      const subjectStats = await subject.getSubjectStatistics(filters.academicYear);
      const students = await subject.getEnrolledStudents(filters.academicYear);
      
      // Apply filters
      let filteredStudents = students;
      if (filters.semester) {
        filteredStudents = students.filter(s => s.semester === filters.semester);
      }
      if (filters.minAttendance) {
        const attendanceRecords = await Attendance.findAll({
          where: { subject_id: subject.id },
          include: [{ model: Student, as: 'student' }]
        });
        const studentIds = attendanceRecords
          .filter(a => (a.attended_classes * 100.0 / a.total_classes) >= filters.minAttendance)
          .map(a => a.student_id);
        filteredStudents = filteredStudents.filter(s => studentIds.includes(s.id));
      }

      reportData.subjects.push({
        subject,
        statistics: subjectStats,
        students: filteredStudents,
        passFailData: await this.getPassFailData(subject.id, filters.academicYear)
      });

      reportData.summary.totalStudents += filteredStudents.length;
    }

    // Calculate summary averages
    if (reportData.subjects.length > 0) {
      reportData.summary.averagePerformance = reportData.subjects
        .reduce((sum, s) => sum + s.statistics.averageMarks, 0) / reportData.subjects.length;
      reportData.summary.averageAttendance = reportData.subjects
        .reduce((sum, s) => sum + s.statistics.averageAttendance, 0) / reportData.subjects.length;
    }

    if (format === 'pdf') {
      return await this.generateFacultyReportPDF(reportData, filters);
    } else {
      return await this.generateFacultyReportDOC(reportData, filters);
    }
  }

  // Generate graphical insights data for pie charts
  async generateGraphicalInsights(subjectId, academicYear = null) {
    const currentYear = academicYear || new Date().getFullYear();
    
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      throw new Error('Subject not found');
    }

    const passFailData = await this.getPassFailData(subjectId, currentYear);
    const attendanceData = await this.getAttendanceInsights(subjectId, currentYear);
    const performanceDistribution = await this.getPerformanceDistribution(subjectId, currentYear);

    return {
      subject,
      academicYear: currentYear,
      passFailChart: {
        type: 'pie',
        title: 'Pass/Fail Distribution',
        data: [
          { label: 'Passed', value: passFailData.passed, color: '#4CAF50' },
          { label: 'Failed', value: passFailData.failed, color: '#F44336' }
        ]
      },
      attendanceChart: {
        type: 'pie',
        title: 'Attendance Distribution',
        data: [
          { label: 'Above 75%', value: attendanceData.above75, color: '#2196F3' },
          { label: 'Below 75%', value: attendanceData.below75, color: '#FF9800' }
        ]
      },
      gradeDistribution: {
        type: 'pie',
        title: 'Grade Distribution',
        data: performanceDistribution
      }
    };
  }

  // Helper method to organize student data by subject
  async organizeStudentDataBySubject(student, academicYear) {
    const subjectData = {};
    
    // Group marks by subject
    student.marks.forEach(mark => {
      const subjectId = mark.subject_id;
      if (!subjectData[subjectId]) {
        subjectData[subjectId] = {
          subject: mark.subject,
          marks: {},
          attendance: null,
          totalMarks: 0,
          percentage: 0,
          grade: 'N/A',
          status: 'N/A'
        };
      }
      
      subjectData[subjectId].marks[mark.exam_type] = {
        obtained: mark.marks_obtained,
        maximum: mark.max_marks,
        percentage: (mark.marks_obtained / mark.max_marks) * 100
      };
    });

    // Add attendance data
    student.attendanceRecords.forEach(attendance => {
      const subjectId = attendance.subject_id;
      if (subjectData[subjectId]) {
        subjectData[subjectId].attendance = {
          percentage: attendance.attendance_percentage,
          attended: attendance.attended_classes,
          total: attendance.total_classes
        };
      }
    });

    // Calculate totals and grades
    Object.keys(subjectData).forEach(subjectId => {
      const data = subjectData[subjectId];
      const universityMark = data.marks.university;
      
      if (universityMark) {
        data.percentage = universityMark.percentage;
        data.grade = this.calculateGrade(universityMark.percentage);
        data.status = universityMark.percentage >= 40 ? 'PASS' : 'FAIL';
      }
    });

    return subjectData;
  }

  // Helper method to add PDF header
  addPDFHeader(doc, student, academicYear) {
    doc.fontSize(20).font('Helvetica-Bold')
       .text('STUDENT REPORT CARD', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica')
       .text(`Academic Year: ${academicYear}`, { align: 'center' });
    
    doc.moveDown(2);
  }

  // Helper method to add student info to PDF
  addStudentInfoToPDF(doc, student) {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Student Information:', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
       .text(`Student ID: ${student.user.unique_id}`)
       .text(`Name: ${student.student_name}`)
       .text(`Email: ${student.user.email}`)
       .text(`Semester: ${student.semester}`)
       .text(`Batch Year: ${student.batch_year}`);
    
    doc.moveDown(2);
  }

  // Helper method to add academic performance table to PDF
  addAcademicPerformanceToPDF(doc, subjectData) {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Academic Performance:', { underline: true });
    
    doc.moveDown(1);
    
    // Table headers
    const startX = 50;
    const startY = doc.y;
    const rowHeight = 25;
    const colWidths = [150, 80, 80, 80, 60, 60];
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Subject', startX, startY);
    doc.text('Series 1', startX + colWidths[0], startY);
    doc.text('Series 2', startX + colWidths[0] + colWidths[1], startY);
    doc.text('University', startX + colWidths[0] + colWidths[1] + colWidths[2], startY);
    doc.text('Grade', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], startY);
    doc.text('Status', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], startY);
    
    let currentY = startY + rowHeight;
    
    // Table data
    doc.font('Helvetica');
    Object.values(subjectData).forEach(data => {
      const series1 = data.marks.series_test_1 || { obtained: '-', maximum: '-' };
      const series2 = data.marks.series_test_2 || { obtained: '-', maximum: '-' };
      const university = data.marks.university || { obtained: '-', maximum: '-' };
      
      doc.text(data.subject.subject_name.substring(0, 20), startX, currentY);
      doc.text(`${series1.obtained}/${series1.maximum}`, startX + colWidths[0], currentY);
      doc.text(`${series2.obtained}/${series2.maximum}`, startX + colWidths[0] + colWidths[1], currentY);
      doc.text(`${university.obtained}/${university.maximum}`, startX + colWidths[0] + colWidths[1] + colWidths[2], currentY);
      doc.text(data.grade, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY);
      doc.text(data.status, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], currentY);
      
      currentY += rowHeight;
    });
    
    doc.y = currentY + 20;
  }

  // Helper method to add attendance summary to PDF
  addAttendanceSummaryToPDF(doc, student, subjectData) {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Attendance Summary:', { underline: true });
    
    doc.moveDown(1);
    
    const startX = 50;
    const startY = doc.y;
    const rowHeight = 25;
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Subject', startX, startY);
    doc.text('Attended/Total', startX + 200, startY);
    doc.text('Percentage', startX + 350, startY);
    doc.text('Status', startX + 450, startY);
    
    let currentY = startY + rowHeight;
    
    doc.font('Helvetica');
    Object.values(subjectData).forEach(data => {
      if (data.attendance) {
        const status = data.attendance.percentage >= 75 ? 'Good' : 'Low';
        
        doc.text(data.subject.subject_name.substring(0, 25), startX, currentY);
        doc.text(`${data.attendance.attended}/${data.attendance.total}`, startX + 200, currentY);
        doc.text(`${data.attendance.percentage.toFixed(1)}%`, startX + 350, currentY);
        doc.text(status, startX + 450, currentY);
        
        currentY += rowHeight;
      }
    });
    
    doc.y = currentY + 20;
  }

  // Helper method to add performance summary to PDF
  addPerformanceSummaryToPDF(doc, subjectData) {
    const subjects = Object.values(subjectData);
    const totalSubjects = subjects.length;
    const passedSubjects = subjects.filter(s => s.status === 'PASS').length;
    const failedSubjects = totalSubjects - passedSubjects;
    
    const validPercentages = subjects
      .filter(s => s.percentage > 0)
      .map(s => s.percentage);
    const averagePercentage = validPercentages.length > 0 
      ? validPercentages.reduce((sum, p) => sum + p, 0) / validPercentages.length 
      : 0;

    doc.fontSize(14).font('Helvetica-Bold')
       .text('Performance Summary:', { underline: true });
    
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica')
       .text(`Total Subjects: ${totalSubjects}`)
       .text(`Passed Subjects: ${passedSubjects}`)
       .text(`Failed Subjects: ${failedSubjects}`)
       .text(`Overall Average: ${averagePercentage.toFixed(2)}%`)
       .text(`Pass Percentage: ${totalSubjects > 0 ? ((passedSubjects / totalSubjects) * 100).toFixed(1) : 0}%`);
  }

  // Helper method to add PDF footer
  addPDFFooter(doc) {
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica')
       .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' })
       .text('VisionGrade - Student Performance Analysis System', { align: 'center' });
  }

  // Helper method to calculate grade
  calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
  }

  // Helper method to create DOC performance table
  createDOCPerformanceTable(subjectData) {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Subject")] }),
          new TableCell({ children: [new Paragraph("Series 1")] }),
          new TableCell({ children: [new Paragraph("Series 2")] }),
          new TableCell({ children: [new Paragraph("University")] }),
          new TableCell({ children: [new Paragraph("Grade")] }),
          new TableCell({ children: [new Paragraph("Status")] })
        ]
      })
    ];

    Object.values(subjectData).forEach(data => {
      const series1 = data.marks.series_test_1 || { obtained: '-', maximum: '-' };
      const series2 = data.marks.series_test_2 || { obtained: '-', maximum: '-' };
      const university = data.marks.university || { obtained: '-', maximum: '-' };

      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(data.subject.subject_name)] }),
          new TableCell({ children: [new Paragraph(`${series1.obtained}/${series1.maximum}`)] }),
          new TableCell({ children: [new Paragraph(`${series2.obtained}/${series2.maximum}`)] }),
          new TableCell({ children: [new Paragraph(`${university.obtained}/${university.maximum}`)] }),
          new TableCell({ children: [new Paragraph(data.grade)] }),
          new TableCell({ children: [new Paragraph(data.status)] })
        ]
      }));
    });

    return new Table({
      rows,
      width: {
        size: 100,
        type: 'pct'
      }
    });
  }

  // Helper method to create DOC performance summary
  createDOCPerformanceSummary(subjectData) {
    const subjects = Object.values(subjectData);
    const totalSubjects = subjects.length;
    const passedSubjects = subjects.filter(s => s.status === 'PASS').length;
    const failedSubjects = totalSubjects - passedSubjects;
    
    const validPercentages = subjects
      .filter(s => s.percentage > 0)
      .map(s => s.percentage);
    const averagePercentage = validPercentages.length > 0 
      ? validPercentages.reduce((sum, p) => sum + p, 0) / validPercentages.length 
      : 0;

    return [
      new Paragraph({ children: [new TextRun(`Total Subjects: ${totalSubjects}`)] }),
      new Paragraph({ children: [new TextRun(`Passed Subjects: ${passedSubjects}`)] }),
      new Paragraph({ children: [new TextRun(`Failed Subjects: ${failedSubjects}`)] }),
      new Paragraph({ children: [new TextRun(`Overall Average: ${averagePercentage.toFixed(2)}%`)] }),
      new Paragraph({ children: [new TextRun(`Pass Percentage: ${totalSubjects > 0 ? ((passedSubjects / totalSubjects) * 100).toFixed(1) : 0}%`)] })
    ];
  }

  // Helper method to generate faculty report PDF
  async generateFacultyReportPDF(reportData, filters) {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `faculty_report_${reportData.faculty.user.unique_id}_${Date.now()}.pdf`;
    const filepath = path.join(this.reportsDir, filename);

    const stream = require('fs').createWriteStream(filepath);
    doc.pipe(stream);

    // Add header
    doc.fontSize(18).font('Helvetica-Bold')
       .text('FACULTY REPORT', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica')
       .text(`Faculty: ${reportData.faculty.faculty_name}`, { align: 'center' })
       .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    
    doc.moveDown(2);

    // Add summary
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Summary:', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
       .text(`Total Subjects: ${reportData.summary.totalSubjects}`)
       .text(`Total Students: ${reportData.summary.totalStudents}`)
       .text(`Average Performance: ${reportData.summary.averagePerformance.toFixed(2)}%`)
       .text(`Average Attendance: ${reportData.summary.averageAttendance.toFixed(2)}%`);
    
    doc.moveDown(2);

    // Add subject-wise details
    reportData.subjects.forEach(subjectInfo => {
      doc.fontSize(14).font('Helvetica-Bold')
         .text(`Subject: ${subjectInfo.subject.subject_name}`, { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica')
         .text(`Students Enrolled: ${subjectInfo.students.length}`)
         .text(`Average Marks: ${subjectInfo.statistics.averageMarks.toFixed(2)}%`)
         .text(`Pass Rate: ${subjectInfo.statistics.passPercentage.toFixed(1)}%`)
         .text(`Average Attendance: ${subjectInfo.statistics.averageAttendance.toFixed(2)}%`);
      
      doc.moveDown(1.5);
    });

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return {
      filename,
      filepath,
      url: `/api/reports/download/${filename}`
    };
  }

  // Helper method to generate faculty report DOC
  async generateFacultyReportDOC(reportData, filters) {
    // Similar implementation for DOC format
    const filename = `faculty_report_${reportData.faculty.user.unique_id}_${Date.now()}.docx`;
    const filepath = path.join(this.reportsDir, filename);
    
    // Create a simple DOC with basic content
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: "FACULTY REPORT", bold: true, size: 32 })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun(`Faculty: ${reportData.faculty.faculty_name}`)]
          }),
          new Paragraph({
            children: [new TextRun(`Total Subjects: ${reportData.summary.totalSubjects}`)]
          }),
          new Paragraph({
            children: [new TextRun(`Total Students: ${reportData.summary.totalStudents}`)]
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(filepath, buffer);

    return {
      filename,
      filepath,
      url: `/api/reports/download/${filename}`
    };
  }

  // Helper method to get pass/fail data
  async getPassFailData(subjectId, academicYear) {
    const marks = await Mark.findAll({
      where: {
        subject_id: subjectId,
        exam_type: 'university'
      },
      include: [{
        model: Student,
        as: 'student',
        include: [{
          model: StudentSubject,
          as: 'enrollments',
          where: {
            subject_id: subjectId,
            academic_year: academicYear
          }
        }]
      }]
    });

    const passed = marks.filter(mark => (mark.marks_obtained / mark.max_marks) * 100 >= 40).length;
    const failed = marks.length - passed;

    return { passed, failed, total: marks.length };
  }

  // Helper method to get attendance insights
  async getAttendanceInsights(subjectId, academicYear) {
    const attendanceRecords = await Attendance.findAll({
      where: {
        subject_id: subjectId
      },
      include: [{
        model: Student,
        as: 'student',
        include: [{
          model: StudentSubject,
          as: 'enrollments',
          where: {
            subject_id: subjectId,
            academic_year: academicYear
          }
        }]
      }]
    });

    const above75 = attendanceRecords.filter(record => (record.attended_classes * 100.0 / record.total_classes) >= 75).length;
    const below75 = attendanceRecords.length - above75;

    return { above75, below75, total: attendanceRecords.length };
  }

  // Helper method to get performance distribution
  async getPerformanceDistribution(subjectId, academicYear) {
    const marks = await Mark.findAll({
      where: {
        subject_id: subjectId,
        exam_type: 'university'
      },
      include: [{
        model: Student,
        as: 'student',
        include: [{
          model: StudentSubject,
          as: 'enrollments',
          where: {
            subject_id: subjectId,
            academic_year: academicYear
          }
        }]
      }]
    });

    const distribution = {
      'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'F': 0
    };

    marks.forEach(mark => {
      const percentage = (mark.marks_obtained / mark.max_marks) * 100;
      const grade = this.calculateGrade(percentage);
      distribution[grade]++;
    });

    return Object.entries(distribution).map(([grade, count]) => ({
      label: grade,
      value: count,
      color: this.getGradeColor(grade)
    }));
  }

  // Helper method to get grade colors
  getGradeColor(grade) {
    const colors = {
      'A+': '#4CAF50',
      'A': '#8BC34A',
      'B+': '#CDDC39',
      'B': '#FFEB3B',
      'C+': '#FF9800',
      'C': '#FF5722',
      'F': '#F44336'
    };
    return colors[grade] || '#9E9E9E';
  }

  // Method to clean up old report files
  async cleanupOldReports(daysOld = 30) {
    try {
      const files = await fs.readdir(this.reportsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      for (const file of files) {
        const filepath = path.join(this.reportsDir, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old reports:', error);
    }
  }
}

module.exports = new ReportService();