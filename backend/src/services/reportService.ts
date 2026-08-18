import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { ITask } from '../models/Task';
import { IAttendance } from '../models/Attendance';

export class ReportService {
  // Generate Tasks PDF
  public static async generateTasksPdf(tasks: ITask[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // PDF Title
      doc.fontSize(20).text('Trackora - Task Reports', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);

      // Table Header
      let y = doc.y;
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Title', 50, y, { width: 150 });
      doc.text('Status', 200, y, { width: 80 });
      doc.text('Priority', 290, y, { width: 70 });
      doc.text('Due Date', 370, y, { width: 100 });
      doc.text('Category', 480, y, { width: 80 });
      
      // Draw Line
      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
      doc.moveDown();

      // Table Rows
      doc.font('Helvetica').fontSize(9);
      tasks.forEach((task) => {
        y = doc.y + 10;
        // Page break if near bottom
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = doc.y;
          // Re-draw headers
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text('Title', 50, y, { width: 150 });
          doc.text('Status', 200, y, { width: 80 });
          doc.text('Priority', 290, y, { width: 70 });
          doc.text('Due Date', 370, y, { width: 100 });
          doc.text('Category', 480, y, { width: 80 });
          doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
          doc.font('Helvetica').fontSize(9);
          y = doc.y + 20;
        }

        doc.text(task.title, 50, y, { width: 140, lineBreak: false });
        doc.text(task.status.toUpperCase(), 200, y, { width: 80 });
        doc.text(task.priority.toUpperCase(), 290, y, { width: 70 });
        doc.text(new Date(task.dueDate).toLocaleDateString(), 370, y, { width: 100 });
        doc.text(task.category, 480, y, { width: 80 });
      });

      doc.end();
    });
  }

  // Generate Tasks Excel
  public static generateTasksExcel(tasks: ITask[]): Buffer {
    const data = tasks.map((task) => ({
      ID: task._id.toString(),
      Title: task.title,
      Description: task.description,
      Status: task.status,
      Priority: task.priority,
      Category: task.category,
      DueDate: new Date(task.dueDate).toLocaleDateString(),
      EstimatedTimeMin: task.estimatedTime,
      ActualTimeMin: task.actualTime || '',
      ApprovalRequired: task.approvalRequired ? 'Yes' : 'No',
      ApprovalStatus: task.approvalStatus || '',
      CreatedAt: new Date(task.createdAt).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // Generate Attendance PDF
  public static async generateAttendancePdf(records: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      doc.fontSize(20).text('Trackora - Attendance Reports', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);

      let y = doc.y;
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Employee/Student ID', 50, y, { width: 120 });
      doc.text('Name', 180, y, { width: 120 });
      doc.text('Date', 310, y, { width: 80 });
      doc.text('Clock In', 400, y, { width: 60 });
      doc.text('Clock Out', 470, y, { width: 60 });
      doc.text('Status', 540, y, { width: 60 });

      doc.moveTo(50, y + 15).lineTo(600, y + 15).stroke();
      doc.moveDown();

      doc.font('Helvetica').fontSize(9);
      records.forEach((record) => {
        y = doc.y + 10;
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = doc.y;
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text('Employee/Student ID', 50, y, { width: 120 });
          doc.text('Name', 180, y, { width: 120 });
          doc.text('Date', 310, y, { width: 80 });
          doc.text('Clock In', 400, y, { width: 60 });
          doc.text('Clock Out', 470, y, { width: 60 });
          doc.text('Status', 540, y, { width: 60 });
          doc.moveTo(50, y + 15).lineTo(600, y + 15).stroke();
          doc.font('Helvetica').fontSize(9);
          y = doc.y + 20;
        }

        const user = record.userId || {};
        doc.text(user.employeeId || 'N/A', 50, y, { width: 120 });
        doc.text(user.username || 'N/A', 180, y, { width: 120 });
        doc.text(record.date, 310, y, { width: 80 });
        doc.text(new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 400, y, { width: 60 });
        doc.text(
          record.clockOut
            ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '-',
          470, y, { width: 60 }
        );
        doc.text(record.status.toUpperCase(), 540, y, { width: 60 });
      });

      doc.end();
    });
  }

  // Generate Attendance Excel
  public static generateAttendanceExcel(records: any[]): Buffer {
    const data = records.map((record) => {
      const user = record.userId || {};
      return {
        EmployeeStudentId: user.employeeId || 'N/A',
        Username: user.username || 'N/A',
        Role: user.role || 'N/A',
        Department: user.department || 'N/A',
        Date: record.date,
        ClockIn: new Date(record.clockIn).toLocaleString(),
        ClockOut: record.clockOut ? new Date(record.clockOut).toLocaleString() : '',
        ClockInGps: record.gpsClockIn ? `${record.gpsClockIn.latitude}, ${record.gpsClockIn.longitude}` : '',
        ClockOutGps: record.gpsClockOut ? `${record.gpsClockOut.latitude}, ${record.gpsClockOut.longitude}` : '',
        Status: record.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
export default ReportService;
