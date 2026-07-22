import { Product, Category, Bom, Project, Job, Employee, Brand, DailyReport, StockActivity, UserRole } from '../types';
import { GoogleAuthProvider, signInWithPopup, auth } from '../firebase';

// In-memory token cache according to Workspace integration skill guidelines
let cachedAccessToken: string | null = null;

export const setGoogleSheetsAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getGoogleSheetsAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Sign in with Google to get OAuth Access Token for Google Sheets & Drive
export const authenticateGoogleSheets = async (): Promise<string> => {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('ไม่สามารถรับ Access Token สำหรับ Google Sheets ได้');
  }

  cachedAccessToken = credential.accessToken;
  return cachedAccessToken;
};

const SHEET_TITLES = [
  'Products',
  'Categories',
  'BOMs',
  'Projects',
  'Jobs',
  'Employees',
  'Brands',
  'DailyReports',
  'Activities',
  'UserRoles'
];

export interface AllAppData {
  products: Product[];
  categories: Category[];
  boms: Bom[];
  projects: Project[];
  jobs: Job[];
  employees: Employee[];
  brands: Brand[];
  dailyReports: DailyReport[];
  activities: StockActivity[];
  userRoles: UserRole[];
}

// Convert all 10 collections to sheet rows
export function prepareAllSheetsData(data: AllAppData) {
  // 1. Products
  const productsHeader = [
    'id', 'sku', 'name', 'category', 'series', 'brand', 'unit',
    'quantity', 'costPrice', 'price', 'minAlert', 'warehouse',
    'supplier', 'description', 'modelNumber', 'modelUnit', 'image', 'createdAt', 'updatedAt'
  ];
  const productsRows = data.products.map(p => [
    p.id || '',
    p.sku || '',
    p.name || '',
    p.category || '',
    p.series || '',
    p.brand || '',
    p.unit || 'PCS',
    p.quantity ?? 0,
    p.costPrice ?? 0,
    p.price ?? 0,
    p.minAlert ?? 0,
    p.warehouse || '',
    p.supplier || '',
    p.description || '',
    p.modelNumber ?? '',
    p.modelUnit || '',
    p.image || '',
    p.createdAt || '',
    p.updatedAt || ''
  ]);

  // 2. Categories
  const categoriesHeader = ['id', 'name', 'description', 'color', 'series'];
  const categoriesRows = data.categories.map(c => [
    c.id || '',
    c.name || '',
    c.description || '',
    c.color || '',
    Array.isArray(c.series) ? c.series.join(', ') : ''
  ]);

  // 3. BOMs
  const bomsHeader = ['id', 'name', 'description', 'jobNo', 'status', 'requiredQuantity', 'stockDeducted', 'itemsCount', 'itemsJson', 'createdAt', 'updatedAt'];
  const bomsRows = data.boms.map(b => [
    b.id || '',
    b.name || '',
    b.description || '',
    b.jobNo || '',
    b.status || 'pending',
    b.requiredQuantity ?? 1,
    b.stockDeducted ? 'true' : 'false',
    Array.isArray(b.items) ? b.items.length : 0,
    JSON.stringify(b.items || []),
    b.createdAt || '',
    b.updatedAt || ''
  ]);

  // 4. Projects
  const projectsHeader = ['id', 'jobNo', 'name', 'description', 'status', 'bomId', 'requiredQuantity', 'stockDeducted', 'createdAt', 'updatedAt'];
  const projectsRows = data.projects.map(pj => [
    pj.id || '',
    pj.jobNo || '',
    pj.name || '',
    pj.description || '',
    pj.status || 'pending',
    pj.bomId || '',
    pj.requiredQuantity ?? 1,
    pj.stockDeducted ? 'true' : 'false',
    pj.createdAt || '',
    pj.updatedAt || ''
  ]);

  // 5. Jobs
  const jobsHeader = ['id', 'jobNo', 'module', 'assignee', 'description', 'status', 'priority', 'targetDate', 'createdAt', 'updatedAt'];
  const jobsRows = data.jobs.map(j => [
    j.id || '',
    j.jobNo || '',
    j.module || '',
    j.assignee || '',
    j.description || '',
    j.status || 'pending',
    j.priority || 'medium',
    j.targetDate || '',
    j.createdAt || '',
    j.updatedAt || ''
  ]);

  // 6. Employees
  const employeesHeader = ['id', 'name', 'nickname', 'email', 'department', 'role', 'orgLevel', 'phone', 'createdAt'];
  const employeesRows = data.employees.map(e => [
    e.id || '',
    e.name || '',
    e.nickname || '',
    e.email || '',
    e.department || '',
    e.role || '',
    e.orgLevel || '',
    e.phone || '',
    e.createdAt || ''
  ]);

  // 7. Brands
  const brandsHeader = ['id', 'name', 'createdAt'];
  const brandsRows = data.brands.map(b => [
    b.id || '',
    b.name || '',
    b.createdAt || ''
  ]);

  // 8. Daily Reports
  const dailyReportsHeader = ['id', 'employeeName', 'date', 'reportTitle', 'jobsDetail', 'problems', 'remark', 'hoursWorked', 'status', 'reviewedBy', 'createdAt', 'updatedAt'];
  const dailyReportsRows = data.dailyReports.map(dr => [
    dr.id || '',
    dr.employeeName || '',
    dr.date || '',
    dr.reportTitle || '',
    dr.jobsDetail || '',
    dr.problems || '',
    dr.remark || '',
    dr.hoursWorked ?? 8,
    dr.status || 'pending_review',
    dr.reviewedBy || '',
    dr.createdAt || '',
    dr.updatedAt || ''
  ]);

  // 9. Activities
  const activitiesHeader = ['id', 'productId', 'productName', 'type', 'quantityChange', 'oldQuantity', 'newQuantity', 'reason', 'timestamp'];
  const activitiesRows = data.activities.map(a => [
    a.id || '',
    a.productId || '',
    a.productName || '',
    a.type || 'adjust',
    a.quantityChange ?? 0,
    a.oldQuantity ?? 0,
    a.newQuantity ?? 0,
    a.reason || '',
    a.timestamp || ''
  ]);

  // 10. User Roles
  const userRolesHeader = ['uid', 'email', 'displayName', 'role', 'createdAt'];
  const userRolesRows = data.userRoles.map(ur => [
    ur.uid || '',
    ur.email || '',
    ur.displayName || '',
    ur.role || 'user',
    ur.createdAt || ''
  ]);

  return {
    Products: [productsHeader, ...productsRows],
    Categories: [categoriesHeader, ...categoriesRows],
    BOMs: [bomsHeader, ...bomsRows],
    Projects: [projectsHeader, ...projectsRows],
    Jobs: [jobsHeader, ...jobsRows],
    Employees: [employeesHeader, ...employeesRows],
    Brands: [brandsHeader, ...brandsRows],
    DailyReports: [dailyReportsHeader, ...dailyReportsRows],
    Activities: [activitiesHeader, ...activitiesRows],
    UserRoles: [userRolesHeader, ...userRolesRows]
  };
}

// Export / Update Google Sheet
export const exportToGoogleSheets = async (
  accessToken: string,
  appData: AllAppData,
  existingSpreadsheetId?: string
): Promise<{ spreadsheetId: string; url: string }> => {
  let spreadsheetId = existingSpreadsheetId;

  // Prepare data tables
  const sheetsDataMap = prepareAllSheetsData(appData);

  // If no existing sheet, create a new one with all 10 tabs
  if (!spreadsheetId) {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: 'คลังสินค้าและระบบจัดการโรงงาน - Master Spreadsheet'
        },
        sheets: SHEET_TITLES.map(title => ({
          properties: { title }
        }))
      })
    });

    if (!createRes.ok) {
      const errJson = await createRes.json();
      throw new Error(errJson?.error?.message || 'ไม่สามารถสร้าง Google Sheet ได้');
    }

    const createdData = await createRes.json();
    spreadsheetId = createdData.spreadsheetId;
  } else {
    // Check existing sheets & add missing tabs if needed
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (getRes.ok) {
      const existingMeta = await getRes.json();
      const existingTitles = new Set(
        (existingMeta.sheets || []).map((s: any) => s.properties?.title)
      );

      const addRequests: any[] = [];
      SHEET_TITLES.forEach(title => {
        if (!existingTitles.has(title)) {
          addRequests.push({
            addSheet: { properties: { title } }
          });
        }
      });

      if (addRequests.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests: addRequests })
        });
      }
    }
  }

  // Clear existing cells & write updated data to all tabs
  const valueRanges = SHEET_TITLES.map(title => ({
    range: `${title}!A1:Z5000`,
    values: sheetsDataMap[title as keyof typeof sheetsDataMap] || []
  }));

  // Clear tabs first to remove deleted rows
  for (const title of SHEET_TITLES) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}!A1:Z5000:clear`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    } catch (e) {
      console.warn(`Could not clear sheet ${title}:`, e);
    }
  }

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges
    })
  });

  if (!updateRes.ok) {
    const errJson = await updateRes.json();
    throw new Error(errJson?.error?.message || 'ไม่สามารถเขียนข้อมูลลงใน Google Sheet ได้');
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId: spreadsheetId!, url };
};

// Import / Sync back from Google Sheet to App State
export const importFromGoogleSheets = async (
  accessToken: string,
  spreadsheetId: string,
  currentAppData?: Partial<AllAppData>
): Promise<AllAppData> => {
  const ranges = SHEET_TITLES.map(t => `${t}!A1:Z5000`);
  const rangesQuery = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errJson = await res.json();
    throw new Error(errJson?.error?.message || 'ไม่สามารถอ่านข้อมูลจาก Google Sheet ได้');
  }

  const data = await res.json();
  const valueRangesMap: Record<string, any[][]> = {};

  (data.valueRanges || []).forEach((vr: any) => {
    // Extract tab name from range like "Products!A1:Z5000"
    const rangeStr = vr.range || '';
    const tabName = rangeStr.split('!')[0].replace(/'/g, '');
    valueRangesMap[tabName] = vr.values || [];
  });

  // Helper to get rows excluding header
  const getRows = (tabName: string) => {
    const matrix = valueRangesMap[tabName] || [];
    if (matrix.length <= 1) return [];
    return matrix.slice(1);
  };

  // Build lookups for existing products to preserve images when sheet cell is empty
  const existingProdMap = new Map<string, Product>();
  const existingProdSkuMap = new Map<string, Product>();
  if (currentAppData?.products) {
    currentAppData.products.forEach(p => {
      if (p.id) existingProdMap.set(p.id, p);
      if (p.sku) existingProdSkuMap.set(p.sku, p);
    });
  }

  // 1. Parse Products
  const productsRows = getRows('Products');
  const products: Product[] = productsRows.map((r, i) => {
    const id = r[0] || `prod_${Date.now()}_${i}`;
    const sku = r[1] || '';
    const existingProd = existingProdMap.get(id) || (sku ? existingProdSkuMap.get(sku) : undefined);

    const sheetImage = r[16] ? r[16].toString().trim() : '';
    // If sheetImage is provided, use it; otherwise preserve existing product image if available
    const finalImage = sheetImage || existingProd?.image || '';

    return {
      id,
      sku,
      name: r[2] || 'สินค้าไม่ระบุชื่อ',
      category: r[3] || 'ทั่วไป',
      series: r[4] || '',
      brand: r[5] || '',
      unit: r[6] || 'PCS',
      quantity: parseFloat(r[7]) || 0,
      costPrice: parseFloat(r[8]) || 0,
      price: parseFloat(r[9]) || 0,
      minAlert: parseFloat(r[10]) || 0,
      warehouse: r[11] || '',
      supplier: r[12] || '',
      description: r[13] || '',
      modelNumber: r[14] || '',
      modelUnit: r[15] || '',
      image: finalImage,
      createdAt: r[17] || existingProd?.createdAt || new Date().toISOString(),
      updatedAt: r[18] || new Date().toISOString()
    };
  });

  // 2. Parse Categories
  const categoriesRows = getRows('Categories');
  const categories: Category[] = categoriesRows.map((r, i) => ({
    id: r[0] || `cat_${Date.now()}_${i}`,
    name: r[1] || 'หมวดหมู่ทั่วไป',
    description: r[2] || '',
    color: r[3] || 'bg-slate-500',
    series: r[4] ? r[4].split(',').map((s: string) => s.trim()).filter(Boolean) : []
  }));

  // 3. Parse BOMs
  const bomsRows = getRows('BOMs');
  const boms: Bom[] = bomsRows.map((r, i) => {
    let items = [];
    try {
      if (r[8]) items = JSON.parse(r[8]);
    } catch (e) {
      console.warn("Failed to parse BOM items JSON from sheet", e);
    }
    return {
      id: r[0] || `bom_${Date.now()}_${i}`,
      name: r[1] || 'สูตรประกอบ BOM',
      description: r[2] || '',
      jobNo: r[3] || '',
      status: (['pending', 'in_progress', 'completed', 'cancelled'].includes(r[4]) ? r[4] : 'pending') as any,
      requiredQuantity: parseFloat(r[5]) || 1,
      stockDeducted: r[6] === 'true' || r[6] === 'TRUE',
      items: Array.isArray(items) ? items : [],
      createdAt: r[9] || new Date().toISOString(),
      updatedAt: r[10] || new Date().toISOString()
    };
  });

  // 4. Parse Projects
  const projectsRows = getRows('Projects');
  const projects: Project[] = projectsRows.map((r, i) => ({
    id: r[0] || `proj_${Date.now()}_${i}`,
    jobNo: r[1] || '',
    name: r[2] || 'โครงการใหม่',
    description: r[3] || '',
    status: (['pending', 'in_progress', 'completed', 'cancelled'].includes(r[4]) ? r[4] : 'pending') as any,
    bomId: r[5] || '',
    requiredQuantity: parseFloat(r[6]) || 1,
    stockDeducted: r[7] === 'true' || r[7] === 'TRUE',
    createdAt: r[8] || new Date().toISOString(),
    updatedAt: r[9] || new Date().toISOString()
  }));

  // 5. Parse Jobs
  const jobsRows = getRows('Jobs');
  const jobs: Job[] = jobsRows.map((r, i) => ({
    id: r[0] || `job_${Date.now()}_${i}`,
    jobNo: r[1] || `JOB-${i + 1}`,
    module: r[2] || '',
    assignee: r[3] || '',
    description: r[4] || '',
    status: (['pending', 'in_progress', 'completed', 'cancelled'].includes(r[5]) ? r[5] : 'pending') as any,
    priority: (['low', 'medium', 'high'].includes(r[6]) ? r[6] : 'medium') as any,
    targetDate: r[7] || '',
    createdAt: r[8] || new Date().toISOString(),
    updatedAt: r[9] || new Date().toISOString()
  }));

  // 6. Parse Employees
  const employeesRows = getRows('Employees');
  const employees: Employee[] = employeesRows.map((r, i) => ({
    id: r[0] || `emp_${Date.now()}_${i}`,
    name: r[1] || 'พนักงาน',
    nickname: r[2] || '',
    email: r[3] || '',
    department: r[4] || '',
    role: r[5] || '',
    orgLevel: r[6] || 'team',
    phone: r[7] || '',
    createdAt: r[8] || new Date().toISOString()
  }));

  // 7. Parse Brands
  const brandsRows = getRows('Brands');
  const brands: Brand[] = brandsRows.map((r, i) => ({
    id: r[0] || `brand_${Date.now()}_${i}`,
    name: r[1] || 'แบรนด์',
    createdAt: r[2] || new Date().toISOString()
  }));

  // 8. Parse Daily Reports
  const dailyReportsRows = getRows('DailyReports');
  const dailyReports: DailyReport[] = dailyReportsRows.map((r, i) => ({
    id: r[0] || `report_${Date.now()}_${i}`,
    employeeName: r[1] || 'พนักงาน',
    date: r[2] || new Date().toISOString().split('T')[0],
    reportTitle: r[3] || 'รายงานประจำวัน',
    jobsDetail: r[4] || '',
    problems: r[5] || '',
    remark: r[6] || '',
    hoursWorked: parseFloat(r[7]) || 8,
    status: (r[8] === 'reviewed' ? 'reviewed' : 'pending_review') as any,
    reviewedBy: r[9] || '',
    createdAt: r[10] || new Date().toISOString(),
    updatedAt: r[11] || new Date().toISOString()
  }));

  // 9. Parse Activities
  const activitiesRows = getRows('Activities');
  const activities: StockActivity[] = activitiesRows.map((r, i) => ({
    id: r[0] || `act_${Date.now()}_${i}`,
    productId: r[1] || '',
    productName: r[2] || '',
    type: (['in', 'out', 'adjust'].includes(r[3]) ? r[3] : 'adjust') as any,
    quantityChange: parseFloat(r[4]) || 0,
    oldQuantity: parseFloat(r[5]) || 0,
    newQuantity: parseFloat(r[6]) || 0,
    reason: r[7] || '',
    timestamp: r[8] || new Date().toISOString()
  }));

  // 10. Parse User Roles
  const userRolesRows = getRows('UserRoles');
  const userRoles: UserRole[] = userRolesRows.map((r, i) => ({
    uid: r[0] || `user_${Date.now()}_${i}`,
    email: r[1] || '',
    displayName: r[2] || '',
    role: (['admin', 'editor', 'user'].includes(r[3]) ? r[3] : 'user') as any,
    createdAt: r[4] || new Date().toISOString()
  }));

  return {
    products,
    categories,
    boms,
    projects,
    jobs,
    employees,
    brands,
    dailyReports,
    activities,
    userRoles
  };
};
