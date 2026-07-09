import React, { useState } from 'react';
import { DailyReport, Employee, Job } from '../types';
import { 
  FileText, Search, CheckCircle, Clock, User, Calendar, 
  AlertCircle, ThumbsUp, Check, Printer, X, ChevronRight, 
  MessageSquare, Sparkles, ImageIcon
} from 'lucide-react';

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
  // 1. Selected Date & Filtering States
  const [selectedReportDate, setSelectedReportDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchEmployee, setSearchEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'reviewed'>('all');

  // 2. Modals & Detail Review states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<(DailyReport & { isReal: boolean }) | null>(null);

  // 3. Review Comment Inputs
  const [reviewCommentInput, setReviewCommentInput] = useState('');
  const [reviewerNameInput, setReviewerNameInput] = useState('');

  // Helper to fetch jobs done by employee on a specific date
  const getAssociatedJobsForDate = (empName: string, dateStr: string) => {
    return jobs.filter(j => {
      const isSameAssignee = j.assignee.trim().toLowerCase() === empName.trim().toLowerCase() ||
                             j.assignee.includes(empName) || empName.includes(j.assignee);
      
      const isSameDate = j.targetDate === dateStr || (j.updatedAt && j.updatedAt.startsWith(dateStr));
      return isSameAssignee && isSameDate;
    });
  };

  // 4. Auto-Compile Logic for each Employee under the selected date
  const compiledReports = employees.map(emp => {
    const dbReport = dailyReports.find(
      r => r.employeeName === emp.name && r.date === selectedReportDate
    );

    const empJobs = getAssociatedJobsForDate(emp.name, selectedReportDate);

    // Build default dynamic texts from actual tasks
    const compiledTitle = `รายงานความคืบหน้าประจำวัน - ${emp.name}`;
    let compiledJobsDetail = '';
    let compiledProblems = '';

    if (empJobs.length > 0) {
      compiledJobsDetail = empJobs.map((j, i) => {
        const stat = j.status === 'completed' ? 'เสร็จสิ้น' : j.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ';
        return `${i + 1}. [มอดูล: ${j.module}] ${j.description} (สถานะ: ${stat})`;
      }).join('\n');

      const failedJobs = empJobs.filter(j => j.status !== 'completed');
      if (failedJobs.length > 0) {
        compiledProblems = failedJobs.map(j => `มอดูล: ${j.module} ค้างดำเนินการหรือพบปัญหาหน้างาน`).join('\n');
      } else {
        compiledProblems = 'ประกอบติดตั้งเสร็จสมบูรณ์เรียบร้อยดีทุกรายการ';
      }
    } else {
      compiledJobsDetail = 'ไม่มีรายการงานที่อัปเดตหรือกำหนดส่งในระบบวันนี้';
      compiledProblems = 'ไม่มี';
    }

    return {
      id: dbReport?.id || `temp_${emp.id}_${selectedReportDate}`,
      employeeName: emp.name,
      date: selectedReportDate,
      reportTitle: dbReport?.reportTitle || compiledTitle,
      jobsDetail: dbReport?.jobsDetail || compiledJobsDetail,
      problems: dbReport?.problems || compiledProblems,
      remark: dbReport?.remark || 'รายงานรวบรวมอัตโนมัติโดยระบบ',
      hoursWorked: dbReport?.hoursWorked || 8,
      status: dbReport?.status || 'pending_review',
      reviewComment: dbReport?.reviewComment || '',
      reviewedBy: dbReport?.reviewedBy || '',
      createdAt: dbReport?.createdAt || new Date().toISOString(),
      updatedAt: dbReport?.updatedAt || new Date().toISOString(),
      isReal: !!dbReport,
      jobsCount: empJobs.length,
      completedCount: empJobs.filter(j => j.status === 'completed').length,
      inProgressCount: empJobs.filter(j => j.status === 'in_progress').length,
      pendingCount: empJobs.filter(j => j.status === 'pending').length,
      hasImages: empJobs.some(j => !!j.imageUrl)
    };
  });

  // Apply filters on the compiled list
  const filteredReports = compiledReports.filter(rep => {
    const matchEmp = rep.employeeName.toLowerCase().includes(searchEmployee.toLowerCase());
    const matchStatus = filterStatus === 'all' ? true : rep.status === filterStatus;
    return matchEmp && matchStatus;
  });

  // Stats calculation
  const totalEmployeesWithJobs = compiledReports.filter(r => r.jobsCount > 0).length;
  const reviewedCount = compiledReports.filter(r => r.status === 'reviewed' && r.isReal).length;
  const pendingCount = compiledReports.filter(r => r.jobsCount > 0 && r.status === 'pending_review').length;
  const totalHoursWorked = compiledReports.reduce((sum, r) => sum + (r.hoursWorked || 8), 0);

  // Open review panel
  const handleOpenReview = (report: any) => {
    setActiveReport(report);
    setReviewCommentInput(report.reviewComment || '');
    setReviewerNameInput(report.reviewedBy || localStorage.getItem('admin_email') || 'ผู้ดูแลระบบ (Admin)');
    setIsReviewModalOpen(true);
  };

  // Save review comments & status
  const handleSaveReview = (status: 'pending_review' | 'reviewed') => {
    if (!activeReport) return;

    if (activeReport.isReal) {
      // Edit existing database entry
      onEditDailyReport(activeReport.id, {
        status,
        reviewedBy: reviewerNameInput.trim() || undefined,
        reviewComment: reviewCommentInput.trim() || undefined
      });
    } else {
      // Add new persistent database entry
      onAddDailyReport({
        employeeName: activeReport.employeeName,
        date: activeReport.date,
        reportTitle: activeReport.reportTitle,
        jobsDetail: activeReport.jobsDetail,
        problems: activeReport.problems || undefined,
        remark: activeReport.remark || undefined,
        hoursWorked: activeReport.hoursWorked || 8,
        status,
        reviewedBy: reviewerNameInput.trim() || undefined,
        reviewComment: reviewCommentInput.trim() || undefined
      });
    }

    setIsReviewModalOpen(false);
    setActiveReport(null);
  };

  // PDF Export and Elegant print layout (HTML page preview style)
  const handlePrintOrDownloadPDF = (report: any) => {
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
                <div class="title">รายงานการปฏิบัติงานประจำวันอัตโนมัติ (Daily Work Report)</div>
                <div class="subtitle">GTT EE STORE • AUTO REPORT SYSTEM</div>
              </td>
              <td style="text-align: right; font-size: 11px; font-family: monospace; color: #64748b;">
                รหัสรายงาน: DWR-AUTO-${report.id.toUpperCase()}<br />
                สืบค้นข้อมูลประจำวันที่: ${report.date}
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
                <td style="padding: 4px 0;"><strong>ประเภทรายงาน:</strong> ระบบอัตโนมัติดึงตามใบงานคลังรายวัน</td>
                <td style="padding: 4px 0;"><strong>เวลาชั่วโมงทำงาน:</strong> ${report.hoursWorked || 8} ชั่วโมง</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>สถานะการประเมิน:</strong> 
                  <span style="color: ${report.status === 'reviewed' ? '#16a34a' : '#d97706'}; font-weight: bold;">
                    ${report.status === 'reviewed' ? 'ตรวจสอบและประเมินเรียบร้อยแล้ว' : 'รอกรรมการตรวจสอบรีวิว'}
                  </span>
                </td>
                <td style="padding: 4px 0;"><strong>ผู้รีวิวตรวจสอบ:</strong> ${report.reviewedBy || '-'}</td>
              </tr>
            </table>
          </div>

          <div class="section-title">1. สรุปรายละเอียดรายการงานที่ปฏิบัติ (Compiled Daily Work Details)</div>
          <div class="content-text">${report.jobsDetail}</div>

          <div class="section-title">2. ปัญหาหน้าไซต์ / มอดูลค้างดำเนินงาน (Outstanding Items & Roadblocks)</div>
          <div class="content-text" style="border-left-color: #f87171; color: #991b1b; background-color: #fef2f2;">${report.problems}</div>

          ${report.reviewComment ? `
            <div class="section-title">3. ความคิดเห็นหรือคำแนะนำประเมินของผู้ดูแลระบบ (Supervisor Review Comments)</div>
            <div class="content-text" style="border-left-color: #10b981; background-color: #f0fdf4; color: #065f46;">${report.reviewComment}</div>
          ` : ''}

          ${associatedJobs.length > 0 ? `
            <div class="section-title">4. รายละเอียดใบสั่งงานที่เชื่อมโยงในระบบ (Linked Active Jobs)</div>
            <table class="job-table">
              <thead>
                <tr>
                  <th style="width: 15%">Job No</th>
                  <th style="width: 35%">มอดูลระบบงาน</th>
                  <th style="width: 35%">รายละเอียดชิ้นงาน</th>
                  <th style="width: 15%; text-align: center;">สถานะ</th>
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
                <p>ลงชื่อพนักงานผู้รับผิดชอบ</p>
                <div class="sign-line"></div>
                <p style="font-weight: bold;">( ${report.employeeName} )</p>
                <p style="font-size: 11px; color: #64748b;">พนักงานฝ่ายปฏิบัติการไซต์</p>
              </td>
              <td>
                <p>ลงชื่อกรรมการผู้ตรวจทานรีวิว</p>
                <div class="sign-line"></div>
                <p style="font-weight: bold;">( ${report.reviewedBy || '................................................'} )</p>
                <p style="font-size: 11px; color: #64748b;">หัวหน้าฝ่าย / ผู้ควบคุมการจัดซื้อคลัง</p>
              </td>
            </tr>
          </table>

          <div style="margin-top: 50px; text-align: center;" class="no-print">
            <button onclick="window.print()" style="padding: 10px 24px; font-family: sans-serif; font-weight: bold; background-color: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
              กดพิมพ์เอกสาร หรือเซฟเป็นไฟล์ PDF
            </button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* -------------------- TITLE & INFO ROW -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 block shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </span>
            รายงานความคืบหน้าอัตโนมัติประจำวัน (Daily Automatic Work Reports)
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-1">
            ระบบประมวลผลสรุปความคืบหน้าของพนักงานรายบุคคลอัตโนมัติ โดยสืบค้นจากสถานะใบสั่งงานจริง ณ วันที่เลือก
          </p>
        </div>
      </div>

      {/* -------------------- STATS BENTO TILES -------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-2xs">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <User className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">พนักงานไซต์ทั้งหมด</span>
            <span className="text-lg font-black font-mono text-slate-800">{employees.length} คน</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-2xs">
          <div className="h-9 w-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">พนักงานที่ได้รับงานวันนี้</span>
            <span className="text-lg font-black font-mono text-sky-600">{totalEmployeesWithJobs} คน</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-2xs">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">ตรวจผ่านรีวิวแล้ว</span>
            <span className="text-lg font-black font-mono text-emerald-600">{reviewedCount} คน</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-2xs">
          <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">รอกลั่นกรองตรวจสอบ</span>
            <span className="text-lg font-black font-mono text-amber-600">{pendingCount} คน</span>
          </div>
        </div>
      </div>

      {/* -------------------- DATE FILTER & EMPLOYEE SEARCH -------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-3xs flex flex-col md:flex-row items-center gap-3">
        
        {/* Date Selector */}
        <div className="w-full md:w-1/3 relative">
          <span className="absolute left-3 top-3 text-[9px] text-indigo-600 font-black uppercase pointer-events-none">
            เลือกดูวันที่ (Date)
          </span>
          <input
            type="date"
            value={selectedReportDate}
            onChange={(e) => setSelectedReportDate(e.target.value)}
            className="w-full pl-3 pr-2 pt-5 pb-2 text-xs bg-indigo-50/40 hover:bg-indigo-50 focus:bg-white border border-indigo-100 focus:border-indigo-500 rounded-xl focus:outline-hidden transition-all font-mono font-bold text-indigo-950"
            id="report-date-selector"
          />
        </div>

        {/* Employee Search */}
        <div className="relative w-full md:w-1/3">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            placeholder="ค้นหาชื่อพนักงาน..."
            className="w-full pl-9 pr-4 py-3.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-1/3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-3 py-3.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans font-medium"
          >
            <option value="all">กรองความเห็นรีวิว: ทั้งหมด (All)</option>
            <option value="pending_review">เฉพาะยังไม่ได้รับการรีวิว (Pending Review)</option>
            <option value="reviewed">เฉพาะที่อนุมัติรีวิวแล้ว (Reviewed)</option>
          </select>
        </div>
      </div>

      {/* -------------------- AUTO GENERATED LIST FOR EACH EMPLOYEE -------------------- */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-2xs">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-sm font-black text-slate-700 font-sans">ไม่พบประวัติพนักงานที่ตรงกับตัวกรอง</h4>
          <p className="text-xs text-slate-400 font-sans mt-1.5 max-w-sm mx-auto">
            กรุณาขึ้นทะเบียนพนักงานก่อนตรวจสอบ หรือเปลี่ยนวันที่มีการทำใบสั่งงาน
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredReports.map(rep => {
            const hasJobs = rep.jobsCount > 0;

            return (
              <div 
                key={rep.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs p-3.5 transition-all flex flex-col xl:flex-row xl:items-stretch gap-4 shadow-sm"
              >
                {/* 1. Employee Info / Stack Column */}
                <div className="xl:w-60 xl:border-r border-slate-100 xl:pr-4 flex flex-col justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-black text-xs text-indigo-700 uppercase shadow-2xs">
                      {rep.employeeName.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 truncate flex items-center gap-1.5">
                        {rep.employeeName}
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-50 border border-slate-200 rounded text-slate-500 font-normal shrink-0">
                          ช่างไซต์
                        </span>
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          {rep.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap xl:flex-col gap-2 items-start xl:items-stretch mt-1 xl:mt-0">
                    {/* Status Badge */}
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1 w-fit xl:w-full justify-center ${
                      rep.status === 'reviewed' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${rep.status === 'reviewed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span>{rep.status === 'reviewed' ? 'ตรวจทานเรียบร้อย' : 'รอกรรมการตรวจสอบ'}</span>
                    </span>

                    {/* Jobs count badge */}
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border text-center w-fit xl:w-full ${
                      hasJobs ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200/80'
                    }`}>
                      {rep.jobsCount} ใบสั่งงานในวันนี้
                    </span>
                  </div>
                </div>

                {/* 2. Middle Column: Associated Jobs with Horizontal Step Progress (ขั้นตอน 1 2 3) */}
                <div className="flex-grow min-w-0 py-1 flex flex-col justify-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    📋 ความคืบหน้าขั้นตอนงาน (ขั้นตอน 1-2-3)
                  </span>

                  {!hasJobs ? (
                    <div className="bg-slate-50/60 rounded-xl py-3.5 px-4 text-center border border-dashed border-slate-200 flex-grow flex items-center justify-center">
                      <p className="text-xs text-slate-400 italic font-medium">
                        ไม่มีการมอบหมายงานหรืออัปเดตงานสำหรับพนักงานท่านนี้ ณ วันที่ดังกล่าว
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {jobs.filter(j => {
                        const isSameAssignee = j.assignee.trim().toLowerCase() === rep.employeeName.trim().toLowerCase() ||
                                               j.assignee.includes(rep.employeeName) || rep.employeeName.includes(j.assignee);
                        const isSameDate = j.targetDate === rep.date || (j.updatedAt && j.updatedAt.startsWith(rep.date));
                        return isSameAssignee && isSameDate;
                      }).map(job => {
                        // Steps representation
                        const isStep1 = true; // Job assigned is Step 1 (always completed)
                        const isStep2 = job.status === 'in_progress' || job.status === 'completed'; // Step 2 (in progress or completed)
                        const isStep3 = job.status === 'completed'; // Step 3 (completed)

                        return (
                          <div 
                            key={job.id} 
                            className="bg-slate-50/70 hover:bg-indigo-50/10 border border-slate-200/60 rounded-xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-grow">
                              {job.imageUrl ? (
                                <img 
                                  src={job.imageUrl} 
                                  alt="หลักฐาน" 
                                  className="h-9 w-9 rounded-lg object-cover bg-black shrink-0 border border-slate-200/80 cursor-pointer shadow-3xs hover:scale-105 transition-transform"
                                  onClick={() => window.open(job.imageUrl, '_blank')}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                                  <ImageIcon className="h-4.5 w-4.5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-grow">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[9px] font-black text-indigo-700 font-mono tracking-tight bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                                    {job.jobNo}
                                  </span>
                                  <span className="text-xs font-black text-slate-800 truncate">
                                    มอดูล: {job.module}
                                  </span>
                                  <span className={`text-[8px] font-black font-sans uppercase px-1 rounded-sm ${
                                    job.priority === 'high' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {job.priority} Priority
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-sm md:max-w-md">
                                  {job.description}
                                </p>
                              </div>
                            </div>

                            {/* Horizontal 3-Step Flow */}
                            <div className="shrink-0 flex items-center gap-2 bg-white border border-slate-150 rounded-lg px-2.5 py-1.5 shadow-3xs w-fit">
                              <span className="text-[9px] font-bold text-slate-400 mr-1.5">ขั้นตอนงาน:</span>
                              
                              {/* Step 1: Assign */}
                              <div className="flex items-center gap-1">
                                <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[9px] font-black transition-colors ${
                                  isStep1 ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-400'
                                }`} title="ขั้นตอนที่ 1: ได้รับมอบหมาย">
                                  <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                                </div>
                                <span className={`text-[9px] font-black ${isStep1 ? 'text-indigo-700' : 'text-slate-400'}`}>1.มอบงาน</span>
                              </div>

                              <div className={`w-3.5 h-[2px] transition-colors ${isStep2 ? 'bg-amber-500' : 'bg-slate-200'}`} />

                              {/* Step 2: In progress */}
                              <div className="flex items-center gap-1">
                                <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[9px] font-black transition-colors ${
                                  isStep2 ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-400'
                                }`} title="ขั้นตอนที่ 2: กำลังทำ">
                                  {isStep2 ? <Check className="h-2.5 w-2.5 stroke-[3.5]" /> : '2'}
                                </div>
                                <span className={`text-[9px] font-black ${isStep2 ? 'text-amber-600' : 'text-slate-400'}`}>2.กำลังทำ</span>
                              </div>

                              <div className={`w-3.5 h-[2px] transition-colors ${isStep3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

                              {/* Step 3: Complete */}
                              <div className="flex items-center gap-1">
                                <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[9px] font-black transition-colors ${
                                  isStep3 ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-400'
                                }`} title="ขั้นตอนที่ 3: เสร็จสมบูรณ์">
                                  {isStep3 ? <Check className="h-2.5 w-2.5 stroke-[3.5]" /> : '3'}
                                </div>
                                <span className={`text-[9px] font-black ${isStep3 ? 'text-emerald-700' : 'text-slate-400'}`}>3.สำเร็จ</span>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Right Column: Summary text, Supervisor comments, Actions */}
                <div className="xl:w-76 xl:border-l border-slate-100 xl:pl-4 flex flex-col justify-between gap-3 shrink-0">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      📝 บันทึกสรุปความคืบหน้าประจำวัน
                    </span>
                    <p 
                      className="text-[11px] font-mono leading-relaxed text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-150 p-2 rounded-lg cursor-help line-clamp-2 hover:line-clamp-none transition-all duration-300"
                      title="ชี้/คลิกเพื่อขยายข้อความทั้งหมด"
                    >
                      {rep.jobsDetail}
                    </p>

                    {rep.reviewComment && (
                      <div className="bg-indigo-50/40 border border-indigo-100/70 p-2 rounded-lg text-[11px] leading-normal space-y-0.5">
                        <span className="font-extrabold text-indigo-800 block">คอมเมนต์ผู้ควบคุม:</span>
                        <p className="text-indigo-950 italic line-clamp-2">"{rep.reviewComment}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenReview(rep)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                        id={`btn-review-${rep.id}`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>รีวิว & ประเมิน</span>
                      </button>

                      <button
                        onClick={() => handlePrintOrDownloadPDF(rep)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                        title="สั่งพิมพ์รายงาน PDF"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      {rep.isReal && (
                        <button
                          onClick={() => {
                            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตผลรีวิวของวันดังกล่าวกลับไปเป็นแบบร่างเริ่มต้น?')) {
                              onDeleteDailyReport(rep.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-150 hover:border-rose-100 transition-colors cursor-pointer"
                          title="รีเซ็ตรายงาน"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* -------------------- MODAL: DETAILED REVIEW & EVALUATE REPORT -------------------- */}
      {isReviewModalOpen && activeReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div>
                <h3 className="text-xs font-black text-slate-800 font-sans uppercase tracking-wider flex items-center gap-1.5">
                  <ThumbsUp className="h-4.5 w-4.5 text-indigo-600" />
                  ลงประเมินรายงานปฏิบัติงาน (Auto Compile Report)
                </h3>
                <span className="text-[10px] text-slate-400 font-mono font-bold block mt-1">DWR-ID: {activeReport.id.toUpperCase()}</span>
              </div>
              <button 
                onClick={() => { setIsReviewModalOpen(false); setActiveReport(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-5">
              
              {/* Report Information summary meta */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">พนักงานปฏิบัติหน้าที่</span>
                  <span className="font-extrabold text-slate-700 font-sans block mt-0.5">{activeReport.employeeName}</span>
                </div>
                
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">วันที่ระบุตามใบงาน</span>
                  <span className="font-bold text-slate-700 font-mono block mt-0.5">{activeReport.date}</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">หัวข้อรายงานสรุป</span>
                  <span className="font-semibold text-slate-800 font-sans block mt-0.5">{activeReport.reportTitle}</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">ชั่วโมงการทำงาน (มาตรฐาน)</span>
                  <span className="font-extrabold text-indigo-600 font-mono block mt-0.5">{activeReport.hoursWorked || 8} ชั่วโมง</span>
                </div>
              </div>

              {/* Work progress text body */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase font-sans block">1. รายการสรุปมอดูลความคืบหน้าที่ระบบประมวลงดึงมา</span>
                <div className="text-xs text-slate-700 font-mono bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                  {activeReport.jobsDetail}
                </div>
              </div>

              {/* Problems (If exists) */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-rose-500 uppercase font-sans block flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  2. ข้อบกพร่อง / มอดูลค้างหน้าไซต์งาน
                </span>
                <div className="text-xs text-rose-800 font-sans bg-rose-50/30 p-3 rounded-xl border border-rose-100 leading-relaxed">
                  {activeReport.problems || 'ไม่มีข้อขัดข้องประกอบ'}
                </div>
              </div>

              {/* Smart reference jobs completion proofs */}
              {(() => {
                const associatedJobs = getAssociatedJobsForDate(activeReport.employeeName, activeReport.date);
                if (associatedJobs.length === 0) return null;

                return (
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase font-sans block">
                      📷 ภาพถ่ายความคืบหน้าและหลักฐานผลงานที่ส่งเข้ามาในระบบวันนี้
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
                              <ImageIcon className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-[9px] font-black text-indigo-700 font-mono block">{job.jobNo}</span>
                            <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">มอดูล: {job.module}</span>
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
                  ⚙️ เขียนประเมินคอมเมนต์และเซ็นผ่านงาน (Supervisor Verification)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase font-sans block">ชื่อผู้ออกใบรับรองรีวิว / Reviewer Name</label>
                    <input
                      type="text"
                      value={reviewerNameInput}
                      onChange={(e) => setReviewerNameInput(e.target.value)}
                      placeholder="ป้อนชื่อผู้ตรวจสอบ..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase font-sans block">สถานะการกลั่นกรอง / Current Audit Status</label>
                    <div className="text-xs font-black py-2.5 px-3 rounded-xl flex items-center gap-1.5 border border-dashed border-slate-200 bg-slate-50/50">
                      <span className={`h-2.5 w-2.5 rounded-full ${activeReport.status === 'reviewed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {activeReport.status === 'reviewed' ? 'ผ่านการประเมินแล้ว' : 'รอกรรมการกลั่นกรอง/แบบร่าง'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase font-sans block">ความคิดเห็น ความประสงค์สั่งการ หรือคอมเมนต์ผู้ควบคุมงานไซต์</label>
                  <textarea
                    value={reviewCommentInput}
                    onChange={(e) => setReviewCommentInput(e.target.value)}
                    placeholder="เขียนข้อสังเกต อนุมัติวัสดุเพิ่มเติม หรือแนะนำพนักงาน..."
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
                พิมพ์เอกสารนี้
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveReview('pending_review')}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  คงสถานะแบบร่าง
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReview('reviewed')}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                  id="btn-approve-review"
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
