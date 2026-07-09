import React, { useState } from 'react';
import { DailyReport, Employee, Job } from '../types';
import { 
  FileText, Plus, Search, Download, Trash2, Edit3, 
  CheckCircle, Clock, User, Calendar, AlertCircle, 
  ThumbsUp, Check, Printer, X, ChevronRight, MessageSquare
} from 'lucide-react';
import jsPDF from 'jspdf';

interface DailyReportViewProps {
  dailyReports: DailyReport[];
  onAddDailyReport: (newReport: Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditDailyReport: (id: string, updatedFields: Partial<DailyReport>) => void;
  onDeleteDailyReport: (id: string) => void;
  employees: Employee[];
  jobs: Job[];
}

export default function DailyReportView({
  dailyReports,
  onAddDailyReport,
  onEditDailyReport,
  onDeleteDailyReport,
  employees,
  jobs
}: DailyReportViewProps) {
  // Filter States
  const [searchEmployee, setSearchEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'reviewed'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<DailyReport | null>(null);

  // Form States (New Report)
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newJobsDetail, setNewJobsDetail] = useState('');
  const [newProblems, setNewProblems] = useState('');
  const [newRemark, setNewRemark] = useState('');
  const [newHours, setNewHours] = useState<number>(8);

  // Review Comment States
  const [reviewCommentInput, setReviewCommentInput] = useState('');
  const [reviewerNameInput, setReviewerNameInput] = useState('');

  // Filter Logic
  const filteredReports = dailyReports.filter(rep => {
    const matchEmp = rep.employeeName.toLowerCase().includes(searchEmployee.toLowerCase());
    const matchStatus = filterStatus === 'all' ? true : rep.status === filterStatus;
    
    let matchDate = true;
    if (filterStartDate) {
      matchDate = matchDate && rep.date >= filterStartDate;
    }
    if (filterEndDate) {
      matchDate = matchDate && rep.date <= filterEndDate;
    }
    
    return matchEmp && matchStatus && matchDate;
  });

  // Calculate stats
  const totalReportsCount = filteredReports.length;
  const pendingCount = filteredReports.filter(r => r.status === 'pending_review').length;
  const reviewedCount = filteredReports.filter(r => r.status === 'reviewed').length;
  const totalHoursWorked = filteredReports.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

  // Fetch jobs done by this employee on this specific date
  const getAssociatedJobsForDate = (empName: string, dateStr: string) => {
    return jobs.filter(j => {
      // Normalize name comparisons
      const isSameAssignee = j.assignee.trim().toLowerCase() === empName.trim().toLowerCase() ||
                             j.assignee.includes(empName) || empName.includes(j.assignee);
      
      const isSameDate = j.targetDate === dateStr || (j.updatedAt && j.updatedAt.startsWith(dateStr));
      return isSameAssignee && isSameDate;
    });
  };

  // Submit Handler (New Report)
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName) {
      alert('กรุณาเลือกชื่อพนักงาน');
      return;
    }
    if (!newTitle.trim()) {
      alert('กรุณากรอกหัวข้อรายงานประจำวัน');
      return;
    }
    if (!newJobsDetail.trim()) {
      alert('กรุณากรอกรายละเอียดผลการปฏิบัติงาน');
      return;
    }

    onAddDailyReport({
      employeeName: newEmployeeName,
      date: newDate,
      reportTitle: newTitle.trim(),
      jobsDetail: newJobsDetail.trim(),
      problems: newProblems.trim() || undefined,
      remark: newRemark.trim() || undefined,
      hoursWorked: Number(newHours) || 8,
      status: 'pending_review'
    });

    // Reset Form
    setNewTitle('');
    setNewJobsDetail('');
    setNewProblems('');
    setNewRemark('');
    setNewHours(8);
    setIsCreateModalOpen(false);
  };

  // Open Review Details Modal
  const handleOpenReview = (report: DailyReport) => {
    setActiveReport(report);
    setReviewCommentInput(report.reviewComment || '');
    setReviewerNameInput(report.reviewedBy || localStorage.getItem('admin_email') || 'ผู้ดูแลระบบ (Admin)');
    setIsReviewModalOpen(true);
  };

  // Submit Review Comments & Status
  const handleSaveReview = (status: 'pending_review' | 'reviewed') => {
    if (!activeReport) return;

    onEditDailyReport(activeReport.id, {
      status,
      reviewedBy: reviewerNameInput.trim() || undefined,
      reviewComment: reviewCommentInput.trim() || undefined
    });

    setIsReviewModalOpen(false);
    setActiveReport(null);
  };

  // PDF Export and Elegant print layout (Uses standard layout with clean layout design fallback)
  const handlePrintOrDownloadPDF = (report: DailyReport) => {
    // We will generate a dedicated, beautifully styled print window for perfect Unicode rendering
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาปิดตัวบล็อกป็อปอัปของเบราว์เซอร์เพื่อทำการพิมพ์หรือเซฟ PDF');
      return;
    }

    const associatedJobs = getAssociatedJobsForDate(report.employeeName, report.date);
    const completedJobsListHtml = associatedJobs.map(job => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-size: 11px; font-family: monospace; font-weight: bold; color: #4f46e5;">${job.jobNo}</td>
        <td style="padding: 10px; font-size: 12px; font-weight: bold; color: #1e293b;">${job.module}</td>
        <td style="padding: 10px; font-size: 11px; color: #475569;">${job.description}</td>
        <td style="padding: 10px; font-size: 11px; text-align: center;">
          <span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background-color: ${
            job.status === 'completed' ? '#dcfce7; color: #15803d;' :
            job.status === 'in_progress' ? '#fef9c3; color: #a16207;' :
            '#f1f5f9; color: #475569;'
          }">
            ${job.status === 'completed' ? 'เสร็จสิ้น' : job.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
          </span>
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Daily_Report_${report.employeeName}_${report.date}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: 'Sarabun', sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.6;
              background-color: #ffffff;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              border-bottom: 2px solid #1e293b;
              padding-bottom: 20px;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
            }
            .subtitle {
              font-size: 11px;
              font-weight: 700;
              color: #4f46e5;
              letter-spacing: 1px;
              margin: 3px 0 0 0;
              text-transform: uppercase;
            }
            .meta-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
              font-size: 13px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              border-left: 3px solid #4f46e5;
              padding-left: 10px;
              margin-top: 25px;
              margin-bottom: 12px;
            }
            .content-text {
              font-size: 13px;
              background-color: #fafafa;
              border-left: 3px solid #cbd5e1;
              padding: 12px 15px;
              margin-bottom: 20px;
              white-space: pre-wrap;
              color: #334155;
            }
            .job-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 12px;
            }
            .job-table th {
              background-color: #f1f5f9;
              color: #475569;
              padding: 10px;
              text-align: left;
              font-weight: 700;
              border-bottom: 2px solid #cbd5e1;
            }
            .footer-sign {
              margin-top: 60px;
              width: 100%;
              border-collapse: collapse;
            }
            .footer-sign td {
              width: 50%;
              text-align: center;
              font-size: 12px;
            }
            .sign-line {
              width: 200px;
              border-bottom: 1px dashed #94a3b8;
              margin: 30px auto 10px auto;
            }
            @media print {
              body { margin: 20px; }
              button { display: none !important; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="title">รายงานการปฏิบัติงานประจำวัน (Daily Work Report)</div>
                <div class="subtitle">GTT EE STORE • INVENTORY & WORKFLOW SYSTEM</div>
              </td>
              <td style="text-align: right; font-size: 11px; font-family: monospace; color: #64748b;">
                วันที่สร้างรายงาน: ${new Date(report.createdAt).toLocaleString('th-TH')}<br />
                รหัสเอกสาร: DWR-${report.id.toUpperCase()}
              </td>
            </tr>
          </table>

          <div class="meta-box">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; padding: 4px 0;"><strong>ชื่อพนักงานผู้ปฏิบัติงาน:</strong> ${report.employeeName}</td>
                <td style="width: 50%; padding: 4px 0;"><strong>วันที่ปฏิบัติงาน:</strong> ${report.date}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>หัวข้อรายงานประจำวัน:</strong> ${report.reportTitle}</td>
                <td style="padding: 4px 0;"><strong>จำนวนชั่วโมงปฏิบัติงาน:</strong> ${report.hoursWorked || 8} ชั่วโมง</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>สถานะรีวิวตรวจสอบ:</strong> 
                  <span style="color: ${report.status === 'reviewed' ? '#16a34a' : '#d97706'}; font-weight: bold;">
                    ${report.status === 'reviewed' ? 'ตรวจสอบเสร็จสิ้นแล้ว' : 'รอการตรวจสอบรีวิว'}
                  </span>
                </td>
                <td style="padding: 4px 0;"><strong>ผู้ตรวจทานรีวิว:</strong> ${report.reviewedBy || '-'}</td>
              </tr>
            </table>
          </div>

          <div class="section-title">1. รายละเอียดชิ้นงานความคืบหน้าที่ปฏิบัติ (Completed / In-Progress Tasks)</div>
          <div class="content-text">${report.jobsDetail}</div>

          ${report.problems ? `
            <div class="section-title">2. ปัญหาและอุปสรรคที่ตรวจพบ (Problems / Obstacles Encountered)</div>
            <div class="content-text" style="border-left-color: #f87171; color: #991b1b; background-color: #fef2f2;">${report.problems}</div>
          ` : ''}

          ${report.remark ? `
            <div class="section-title">3. ข้อคิดเห็นหรือความเห็นร้องขอเพิ่มเติม (Additional Notes / Requests)</div>
            <div class="content-text" style="border-left-color: #a78bfa;">${report.remark}</div>
          ` : ''}

          ${report.reviewComment ? `
            <div class="section-title">4. ความคิดเห็นหลังตรวจประเมินของผู้ดูแลคลัง (Supervisor Review & Evaluation Comments)</div>
            <div class="content-text" style="border-left-color: #10b981; background-color: #f0fdf4; color: #065f46;">${report.reviewComment}</div>
          ` : ''}

          ${associatedJobs.length > 0 ? `
            <div class="section-title">5. ชิ้นงานย่อยในระบบสั่งการที่ผูกพัน (Linked Order Modules)</div>
            <table class="job-table">
              <thead>
                <tr>
                  <th style="width: 15%">Job No</th>
                  <th style="width: 35%">มอดูลย่อย / ระบบงาน</th>
                  <th style="width: 35%">รายละเอียดชิ้นงาน</th>
                  <th style="width: 15%; text-align: center;">สถานะใบงาน</th>
                </tr>
              </thead>
              <tbody>
                ${completedJobsListHtml}
              </tbody>
            </table>
          ` : ''}

          <table class="footer-sign">
            <tr>
              <td>
                <p>ลงชื่อพนักงานผู้ส่งรายงาน</p>
                <div class="sign-line"></div>
                <p style="font-weight: bold;">( ${report.employeeName} )</p>
                <p style="font-size: 11px; color: #64748b;">พนักงานประจำไซต์งาน</p>
              </td>
              <td>
                <p>ลงชื่อผู้ตรวจสอบ / ผู้ตรวจรีวิวรายงาน</p>
                <div class="sign-line"></div>
                <p style="font-weight: bold;">( ${report.reviewedBy || '................................................'} )</p>
                <p style="font-size: 11px; color: #64748b;">หัวหน้างาน / ผู้ดูแลระบบคลังสินค้า</p>
              </td>
            </tr>
          </table>

          <div style="margin-top: 50px; text-align: center;" class="no-print">
            <button onclick="window.print()" style="padding: 10px 24px; font-family: sans-serif; font-weight: bold; background-color: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
              กดพิมพ์เอกสาร หรือบันทึกเป็นไฟล์ PDF
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* -------------------- HEADER TITLE & BUTTONS -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 block shrink-0">
              <FileText className="h-5 w-5" />
            </span>
            รายงานความคืบหน้าประจำวันของพนักงาน (Daily Work Reports)
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-1">
            บันทึกความคืบหน้า ปัญหา และสรุปผลรายวันของทีมช่าง พร้อมฟังก์ชันดาวน์โหลด PDF และตรวจสอบรีวิวงาน
          </p>
        </div>

        <button
          onClick={() => {
            if (employees.length === 0) {
              alert('กรุณาขึ้นทะเบียนรายชื่อพนักงานก่อนสร้างรายงานประจำวัน');
              return;
            }
            setNewEmployeeName(employees[0]?.name || '');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          เขียนรายงานใหม่ประจำวัน
        </button>
      </div>

      {/* -------------------- BENTO STATS BAR -------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-2xs">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">รายงานทั้งหมด</span>
            <span className="text-lg font-black font-mono text-slate-800">{totalReportsCount} ฉบับ</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-2xs">
          <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">รอกรรมการรีวิว</span>
            <span className="text-lg font-black font-mono text-amber-600">{pendingCount} ฉบับ</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-2xs">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">รีวิว/ตรวจแล้ว</span>
            <span className="text-lg font-black font-mono text-emerald-600">{reviewedCount} ฉบับ</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-2xs">
          <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <User className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">เวลาทำงานรวม</span>
            <span className="text-lg font-black font-mono text-slate-800">{totalHoursWorked} ชม.</span>
          </div>
        </div>
      </div>

      {/* -------------------- SEARCH & FILTER MODULE -------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-3xs flex flex-col md:flex-row items-center gap-3">
        
        {/* Employee Search */}
        <div className="relative w-full md:w-1/3">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            placeholder="ค้นหาด้วยชื่อพนักงาน..."
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-1/4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans font-medium"
          >
            <option value="all">กรองสถานะ: ทั้งหมด (All Statuses)</option>
            <option value="pending_review">รอการรีวิวตรวจสอบ (Pending Review)</option>
            <option value="reviewed">รีวิวเสร็จสิ้นแล้ว (Reviewed)</option>
          </select>
        </div>

        {/* Date Filters */}
        <div className="w-full md:flex-grow flex items-center gap-2">
          <div className="w-1/2 relative">
            <span className="absolute left-2.5 top-2.5 text-[9px] text-slate-400 font-bold uppercase pointer-events-none">เริ่ม</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full pl-9 pr-2 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono"
            />
          </div>
          
          <div className="w-1/2 relative">
            <span className="absolute left-2.5 top-2.5 text-[9px] text-slate-400 font-bold uppercase pointer-events-none">สิ้นสุด</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full pl-11 pr-2 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono"
            />
          </div>
        </div>

        {/* Clear filter shortcut button */}
        {(searchEmployee || filterStatus !== 'all' || filterStartDate || filterEndDate) && (
          <button
            onClick={() => {
              setSearchEmployee('');
              setFilterStatus('all');
              setFilterStartDate('');
              setFilterEndDate('');
            }}
            className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2.5 rounded-xl transition-colors font-sans font-bold cursor-pointer w-full md:w-auto text-center"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* -------------------- DAILY REPORTS VERTICAL LIST -------------------- */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-2xs">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-sm font-black text-slate-700 font-sans">ไม่พบรายการรายงานประจำวัน</h4>
          <p className="text-xs text-slate-400 font-sans mt-1.5 max-w-sm mx-auto">
            ยังไม่มีช่างปฏิบัติงานส่งรายงานประจำวันตามตัวกรองที่เลือก คุณสามารถคลิกปุ่มเพื่อบันทึกเขียนรายงานใหม่ได้ทันที
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredReports.map(rep => {
            const hasProblems = !!rep.problems;
            const associatedJobs = getAssociatedJobsForDate(rep.employeeName, rep.date);

            return (
              <div 
                key={rep.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-indigo-200 p-4 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative pl-5"
              >
                {/* Visual Status Colored Decor Border Left */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-xl ${
                  rep.status === 'reviewed' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />

                {/* Left block information */}
                <div className="flex-grow min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Date badge */}
                    <span className="text-[10px] font-black text-indigo-700 font-mono tracking-wide px-2.5 py-1 bg-indigo-50 border border-indigo-100/80 rounded-lg flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {rep.date}
                    </span>

                    {/* Employee Name */}
                    <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-500" />
                      ช่าง: {rep.employeeName}
                    </span>

                    {/* Hours Worked badge */}
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {rep.hoursWorked || 8} ชม.
                    </span>

                    {/* Review Status badge */}
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                      rep.status === 'reviewed' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {rep.status === 'reviewed' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3 animate-pulse" />}
                      {rep.status === 'reviewed' ? 'ตรวจสอบแล้ว' : 'รอกรรมการรีวิว'}
                    </span>

                    {/* Problem Alert Badge */}
                    {hasProblems && (
                      <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-rose-500" />
                        มีปัญหาหน้าไซต์
                      </span>
                    )}

                    {/* Associated jobs counter */}
                    {associatedJobs.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 bg-indigo-50/20 text-indigo-700 border border-indigo-100/30 px-2 py-0.5 rounded-md font-mono">
                        ผูกพัน {associatedJobs.length} ชิ้นงาน
                      </span>
                    )}
                  </div>

                  {/* Title and Short details description excerpt */}
                  <h3 className="text-xs font-black text-slate-800 font-sans truncate mb-1">
                    {rep.reportTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans line-clamp-1 max-w-4xl">
                    {rep.jobsDetail}
                  </p>

                  {/* Comments indication panel if supervisor left comment */}
                  {rep.reviewComment && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] bg-slate-50/50 text-emerald-700 border border-slate-100 py-1.5 px-2.5 rounded-lg font-sans">
                      <MessageSquare className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="font-extrabold shrink-0">คอมเมนต์ตรวจทาน:</span>
                      <span className="truncate text-slate-500 italic">"{rep.reviewComment}"</span>
                    </div>
                  )}
                </div>

                {/* Right block Actions Controls */}
                <div className="shrink-0 flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-2 lg:pt-0 lg:pl-4 justify-end">
                  
                  {/* REVIEW DETAILS BUTTON */}
                  <button
                    onClick={() => handleOpenReview(rep)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 rounded-lg text-[11px] font-extrabold text-slate-600 transition-colors cursor-pointer"
                    title="กดดูรีวิวและรายละเอียดการประเมิน"
                  >
                    ดูรีวิว & ตรวจทาน
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  {/* DOWNLOAD / PRINT PDF BUTTON */}
                  <button
                    onClick={() => handlePrintOrDownloadPDF(rep)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="ดาวน์โหลดหรือพิมพ์รายงาน PDF"
                  >
                    <Printer className="h-4 w-4" />
                  </button>

                  {/* DELETE BUTTON */}
                  <button
                    onClick={() => {
                      if (confirm(`คุณต้องการลบรายงานประจำวันฉบับนี้ของ "${rep.employeeName}" หรือไม่?`)) {
                        onDeleteDailyReport(rep.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="ลบรายงานฉบับนี้ออกจากระบบ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -------------------- MODAL: CREATE NEW REPORT -------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  เขียนรายงานปฏิบัติงานประจำวันใหม่
                </h3>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">ระบุผลการปฏิบัติงานความคืบหน้ารายวันของช่างในระบบคลัง</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Scroll Container */}
            <form onSubmit={handleCreateSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase font-sans block">พนักงานผู้รายงาน / Assignee</label>
                  <select
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans font-semibold"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.role || 'ช่างเทคนิค'})</option>
                    ))}
                  </select>
                </div>

                {/* Work Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase font-sans block">วันที่ปฏิบัติงาน / Work Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Title & Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase font-sans block">หัวข้อสรุปการปฏิบัติงานหลัก / Report Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="เช่น ประกอบตู้สายไฟ MDB เสร็จสิ้น หรือ เช็คระบบนิวเมติกส์บวมน้ำ"
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase font-sans block">ชั่วโมงทำงานจริง</label>
                  <input
                    type="number"
                    value={newHours}
                    onChange={(e) => setNewHours(Number(e.target.value))}
                    min="1"
                    max="24"
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono text-center font-bold"
                  />
                </div>
              </div>

              {/* Work detail */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase font-sans block">รายละเอียดความคืบหน้างานรายวัน / Work Details</label>
                <textarea
                  value={newJobsDetail}
                  onChange={(e) => setNewJobsDetail(e.target.value)}
                  placeholder="กรอกรายละเอียดชิ้นงานที่ประกอบหรือทดสอบเสร็จสิ้นอย่างเจาะจง..."
                  required
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans leading-relaxed"
                />
              </div>

              {/* Problems & Obstacles */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-rose-500 uppercase font-sans block flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  ปัญหาและอุปสรรคหน้าไซต์งาน (ถ้ามี) / Problems & Obstacles
                </label>
                <textarea
                  value={newProblems}
                  onChange={(e) => setNewProblems(e.target.value)}
                  placeholder="ระบุปัญหา อะไหล่ขาดแคลน หรือชิ้นสต็อกชำรุดเสียหาย..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase font-sans block">หมายเหตุเพิ่มเติมหรือข้อเรียกร้อง / Remarks</label>
                <input
                  type="text"
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="เช่น ต้องการเบิกเครื่องบัดกรีเพิ่ม หรือ ขอนุมัติวัสดุสิ้นเปลือง"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                />
              </div>

              {/* Modal footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  บันทึกส่งรายงาน
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: REVIEW & EVALUATE REPORT -------------------- */}
      {isReviewModalOpen && activeReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div>
                <h3 className="text-xs font-black text-slate-800 font-sans uppercase tracking-wider flex items-center gap-1.5">
                  <ThumbsUp className="h-4.5 w-4.5 text-indigo-600" />
                  รีวิวและประเมินรายงานการปฏิบัติงาน
                </h3>
                <span className="text-[10px] text-slate-400 font-mono font-bold block mt-1">DWR-ID: {activeReport.id.toUpperCase()}</span>
              </div>
              <button 
                onClick={() => { setIsReviewModalOpen(false); setActiveReport(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-5">
              
              {/* Report Information summary meta */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">ชื่อผู้รายงาน</span>
                  <span className="font-extrabold text-slate-700 font-sans block mt-0.5">{activeReport.employeeName}</span>
                </div>
                
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">วันที่ปฏิบัติหน้าที่</span>
                  <span className="font-bold text-slate-700 font-mono block mt-0.5">{activeReport.date}</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">หัวข้อสรุปงาน</span>
                  <span className="font-semibold text-slate-800 font-sans block mt-0.5">{activeReport.reportTitle}</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">เวลาชั่วโมงทำงาน</span>
                  <span className="font-extrabold text-indigo-600 font-mono block mt-0.5">{activeReport.hoursWorked || 8} ชั่วโมง</span>
                </div>
              </div>

              {/* Work progress text body */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase font-sans block">1. รายละเอียดชิ้นงานความคืบหน้าที่ระบุ</span>
                <div className="text-xs text-slate-700 font-sans bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                  {activeReport.jobsDetail}
                </div>
              </div>

              {/* Problems (If exists) */}
              {activeReport.problems && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-rose-500 uppercase font-sans block flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    2. ปัญหาและอุปสรรคที่ระบุ
                  </span>
                  <div className="text-xs text-rose-800 font-sans bg-rose-50/50 p-3 rounded-xl border border-rose-100 leading-relaxed">
                    {activeReport.problems}
                  </div>
                </div>
              )}

              {/* Remarks (If exists) */}
              {activeReport.remark && (
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-indigo-500 uppercase font-sans block">3. หมายเหตุ/คำร้องขอบันทึกเพิ่มเติม</span>
                  <div className="text-xs text-slate-600 font-sans bg-slate-50 p-3 rounded-xl border border-indigo-50/30">
                    {activeReport.remark}
                  </div>
                </div>
              )}

              {/* Smart reference jobs completion proofs */}
              {(() => {
                const associatedJobs = getAssociatedJobsForDate(activeReport.employeeName, activeReport.date);
                if (associatedJobs.length === 0) return null;

                return (
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase font-sans block">
                      📌 อ้างอิงชิ้นงานย่อยและหลักฐานภาพประกอบที่ส่งเข้าระบบในวันนี้
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {associatedJobs.map(job => (
                        <div key={job.id} className="bg-indigo-50/20 border border-indigo-100/50 rounded-xl p-3 flex gap-3">
                          {job.imageUrl ? (
                            <img 
                              src={job.imageUrl} 
                              alt="หลักฐานประกอบ" 
                              className="h-14 w-14 rounded-lg object-cover bg-black shrink-0 border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-[9px] font-black text-indigo-700 font-mono block">{job.jobNo}</span>
                            <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">{job.module}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block mt-1 ${
                              job.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {job.status === 'completed' ? 'เสร็จสิ้น' : 'กำลังทำ'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* -------------------- SUPERVISOR REVIEW SECTION -------------------- */}
              <div className="pt-4 border-t border-slate-100 space-y-3.5">
                <span className="text-[10px] font-black text-indigo-600 uppercase font-sans block">
                  ⚙️ ตรวจสอบ & ลงบันทึกประเมิน (Supervisor Verification)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase font-sans block">ผู้ตรวจสอบรีวิว / Evaluator Name</label>
                    <input
                      type="text"
                      value={reviewerNameInput}
                      onChange={(e) => setReviewerNameInput(e.target.value)}
                      placeholder="เช่น สมชาย หรือ แอดมินคลัง"
                      className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase font-sans block">สถานะปัจจุบัน / Action Status</label>
                    <div className="text-xs font-black py-2.5 px-3 rounded-xl flex items-center gap-1.5 border border-dashed border-slate-200 bg-slate-50/50">
                      <span className={`h-2.5 w-2.5 rounded-full ${activeReport.status === 'reviewed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {activeReport.status === 'reviewed' ? 'ประเมิน/ตรวจผ่านแล้ว' : 'อยู่ระหว่างรอกรรมการตรวจสอบ'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase font-sans block">ความคิดเห็น ความเห็นประเมิน หรือคอมเมนต์ผู้ควบคุมงาน</label>
                  <textarea
                    value={reviewCommentInput}
                    onChange={(e) => setReviewCommentInput(e.target.value)}
                    placeholder="ป้อนคำสั่ง สั่งการ อนุมัติ หรือคอมเมนต์แนะนำพนักงาน..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              
              {/* PRINT BUTTON */}
              <button
                onClick={() => handlePrintOrDownloadPDF(activeReport)}
                className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                ดาวน์โหลด / พิมพ์รายงาน
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveReview('pending_review')}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  คงสถานะรอตรวจ
                </button>
                <button
                  onClick={() => handleSaveReview('reviewed')}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  อนุมัติผ่านรีวิว
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
