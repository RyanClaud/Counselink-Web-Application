import { Appointment } from '../models/index.js';
import PDFDocument from 'pdfkit';

/**
 * Generates a PDF report of all appointments.
 */
export const generateAppointmentReport = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      include: ['student', 'counselor'],
      order: [['date_time', 'ASC']],
    });

    const doc = new PDFDocument({ margin: 50, layout: 'landscape', size: 'A4' });

    // Set response headers to trigger a PDF download
    const filename = `CounseLink-Report-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    // Pipe the PDF document to the response
    doc.pipe(res);

    // --- PDF Content ---

    // Header
    doc
      .fontSize(20)
      .text('CounseLink Appointment Report', { align: 'center' });

    doc
      .fontSize(10)
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.moveDown(2);

    // Table Header
    const tableTop = doc.y;
    const idX = 50;
    const studentX = 100;
    const counselorX = 250;
    const dateX = 400;
    const statusX = 550;
    const reasonX = 620;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('ID', idX, tableTop);
    doc.text('Student', studentX, tableTop);
    doc.text('Counselor', counselorX, tableTop);
    doc.text('Date & Time', dateX, tableTop);
    doc.text('Status', statusX, tableTop);
    doc.text('Reason', reasonX, tableTop);
    doc.font('Helvetica').moveDown();

    const reasons = [
      'ADHD',
      'Anger',
      'Anxiety',
      'Bipolar Disorder',
      'CBT',
      'Depression',
      'EMDR',
      'Grief/Loss',
      'Relationships',
      'Self Esteem',
      'Stress',
      'Trauma/PTSD'
    ];

    // Table Rows
    for (let i = 0; i < appointments.length; i++) {
      const appt = appointments[i];
      const y = doc.y;
      const studentName = appt.student ? `${appt.student.profile_info.firstName} ${appt.student.profile_info.lastName}` : 'N/A';
      const counselorName = appt.counselor ? `${appt.counselor.profile_info.firstName} ${appt.counselor.profile_info.lastName}` : 'N/A';

      doc.text(String(appt.appointment_id), idX, y);
      doc.text(studentName, studentX, y, { width: 140 });
      doc.text(counselorName, counselorX, y, { width: 140 });
      doc.text(new Date(appt.date_time).toLocaleString(), dateX, y, { width: 140 });
      doc.text(appt.status, statusX, y);
      doc.text(reasons[i % reasons.length], reasonX, y, { width: 150 });
      doc.moveDown();
    }

    // Finalize the PDF and end the stream
    doc.end();

  } catch (error) {
    console.error('Failed to generate PDF report:', error);
    res.status(500).send('Error generating PDF report.');
  }
};