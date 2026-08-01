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
  const productsRows = data.products.map(p => {
    let imgVal = p.image || '';
    // Prevent Google Sheets API 400 error due to >50,000 char cell limits on base64 images
    if (imgVal.length > 40000 && imgVal.startsWith('data:')) {
      imgVal = '[Base64 Image]';
    }
    return [
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
      imgVal,
      p.createdAt || '',
      p.updatedAt || ''
    ];
  });

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
  const employeesHeader = ['id', 'empCode', 'name', 'nickname', 'email', 'department', 'role', 'orgLevel', 'phone', 'createdAt'];
  const employeesRows = data.employees.map(e => [
    e.id || '',
    e.empCode || '',
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
  const activitiesHeader = ['id', 'productId', 'productName', 'type', 'quantityChange', 'oldQuantity', 'newQuantity', 'reason', 'timestamp', 'userName', 'userEmail', 'userPhotoUrl', 'imageUrl', 'productImage'];
  const activitiesRows = data.activities.map(a => [
    a.id || '',
    a.productId || '',
    a.productName || '',
    a.type || 'adjust',
    a.quantityChange ?? 0,
    a.oldQuantity ?? 0,
    a.newQuantity ?? 0,
    a.reason || '',
    a.timestamp || '',
    a.userName || '',
    a.userEmail || a.creatorEmail || '',
    a.userPhotoUrl || '',
    a.imageUrl || '',
    a.productImage || ''
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
  existingSpreadsheetId?: string,
  selectedTabs?: string[]
): Promise<{ spreadsheetId: string; url: string }> => {
  let spreadsheetId = existingSpreadsheetId;
  const targetTabs = (selectedTabs && selectedTabs.length > 0) ? selectedTabs : SHEET_TITLES;

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

  // Clear target tabs first to remove deleted rows
  for (const title of targetTabs) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}!A1:Z5000:clear`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    } catch (e) {
      console.warn(`Could not clear sheet ${title}:`, e);
    }
  }

  // Write updated data to target tabs
  const valueRanges = targetTabs.map(title => ({
    range: `${title}!A1:Z5000`,
    values: sheetsDataMap[title as keyof typeof sheetsDataMap] || []
  }));

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

  // Helper to get header row and data rows
  const getHeaderAndRows = (tabName: string) => {
    const matrix = valueRangesMap[tabName] || [];
    if (matrix.length === 0) return { header: [], rows: [] };
    const header = (matrix[0] || []).map(h => String(h).trim().toLowerCase());
    return { header, rows: matrix.slice(1) };
  };

  const getRows = (tabName: string) => getHeaderAndRows(tabName).rows;

  // Build lookups for existing products to preserve images when sheet cell is empty or placeholder
  const existingProdMap = new Map<string, Product>();
  const existingProdSkuMap = new Map<string, Product>();
  const existingProdNameMap = new Map<string, Product>();
  if (currentAppData?.products) {
    currentAppData.products.forEach(p => {
      if (p.id) existingProdMap.set(String(p.id).trim(), p);
      if (p.sku) existingProdSkuMap.set(String(p.sku).trim().toLowerCase(), p);
      if (p.name) existingProdNameMap.set(String(p.name).trim().toLowerCase(), p);
    });
  }

  // 1. Parse Products
  const { header: prodHeader, rows: productsRows } = getHeaderAndRows('Products');
  const getCol = (hName: string, defaultIdx: number) => {
    const idx = prodHeader.indexOf(hName.toLowerCase());
    return idx !== -1 ? idx : defaultIdx;
  };

  const pIdIdx = getCol('id', 0);
  const pSkuIdx = getCol('sku', 1);
  const pNameIdx = getCol('name', 2);
  const pCatIdx = getCol('category', 3);
  const pSeriesIdx = getCol('series', 4);
  const pBrandIdx = getCol('brand', 5);
  const pUnitIdx = getCol('unit', 6);
  const pQtyIdx = getCol('quantity', 7);
  const pCostIdx = getCol('costprice', 8);
  const pPriceIdx = getCol('price', 9);
  const pMinIdx = getCol('minalert', 10);
  const pWhIdx = getCol('warehouse', 11);
  const pSupIdx = getCol('supplier', 12);
  const pDescIdx = getCol('description', 13);
  const pModelNumIdx = getCol('modelnumber', 14);
  const pModelUnitIdx = getCol('modelunit', 15);
  const pImgIdx = prodHeader.indexOf('image'); // -1 if column is missing
  const pCreatedIdx = getCol('createdat', pImgIdx !== -1 ? 17 : 16);
  const pUpdatedIdx = getCol('updatedat', pImgIdx !== -1 ? 18 : 17);

  const parsedProducts: Product[] = productsRows.map((r, i) => {
    const rawId = r[pIdIdx] !== undefined && r[pIdIdx] !== null ? String(r[pIdIdx]).trim() : '';
    const rawSku = r[pSkuIdx] !== undefined && r[pSkuIdx] !== null ? String(r[pSkuIdx]).trim() : '';
    const rawName = r[pNameIdx] !== undefined && r[pNameIdx] !== null ? String(r[pNameIdx]).trim() : '';

    const existingProd = (rawId ? existingProdMap.get(rawId) : undefined)
      || (rawSku ? existingProdSkuMap.get(rawSku.toLowerCase()) : undefined)
      || (rawName ? existingProdNameMap.get(rawName.toLowerCase()) : undefined);

    const id = rawId || existingProd?.id || `prod_${Date.now()}_${i}`;
    const sku = rawSku || existingProd?.sku || '';

    let sheetImage = '';
    if (pImgIdx !== -1 && r[pImgIdx] !== undefined && r[pImgIdx] !== null) {
      let rawImg = String(r[pImgIdx]).trim();

      // Extract URL if formatted as =IMAGE("url") or =IMAGE('url')
      const formulaMatch = rawImg.match(/=IMAGE\(["']?([^"']+)["']?\)/i);
      if (formulaMatch && formulaMatch[1]) {
        rawImg = formulaMatch[1].trim();
      }

      // Check if rawImg looks like an image URL, base64 data string, blob, or file path
      const isDateOrNumber = !isNaN(Date.parse(rawImg)) && /^\d{4}-\d{2}-\d{2}/.test(rawImg);
      const isPlaceholder = rawImg.startsWith('[') || rawImg.startsWith('#') || rawImg.toLowerCase() === 'n/a' || rawImg === '-';
      const isImageLike = !isPlaceholder && !isDateOrNumber && (
        rawImg.startsWith('http://') || 
        rawImg.startsWith('https://') || 
        rawImg.startsWith('data:image/') || 
        rawImg.startsWith('blob:') || 
        rawImg.startsWith('/') || 
        /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(rawImg)
      );

      if (isImageLike) {
        sheetImage = rawImg;
      }
    }

    // Preserve existing product image if sheet cell is empty, invalid, placeholder, or unparseable
    const finalImage = sheetImage || existingProd?.image || '';

    return {
      id,
      sku,
      name: rawName || existingProd?.name || 'สินค้าไม่ระบุชื่อ',
      category: r[pCatIdx] || existingProd?.category || 'ทั่วไป',
      series: r[pSeriesIdx] || existingProd?.series || '',
      brand: r[pBrandIdx] || existingProd?.brand || '',
      unit: r[pUnitIdx] || existingProd?.unit || 'PCS',
      quantity: parseFloat(r[pQtyIdx]) || 0,
      costPrice: parseFloat(r[pCostIdx]) || 0,
      price: parseFloat(r[pPriceIdx]) || 0,
      minAlert: parseFloat(r[pMinIdx]) || 0,
      warehouse: r[pWhIdx] || existingProd?.warehouse || '',
      supplier: r[pSupIdx] || existingProd?.supplier || '',
      description: r[pDescIdx] || existingProd?.description || '',
      modelNumber: r[pModelNumIdx] || existingProd?.modelNumber || '',
      modelUnit: r[pModelUnitIdx] || existingProd?.modelUnit || '',
      image: finalImage,
      createdAt: r[pCreatedIdx] || existingProd?.createdAt || new Date().toISOString(),
      updatedAt: r[pUpdatedIdx] || new Date().toISOString()
    };
  });

  const hasTab = (tabName: string) => valueRangesMap[tabName] !== undefined;

  const products = hasTab('Products') ? parsedProducts : (currentAppData?.products || []);

  // 2. Parse Categories
  const categoriesRows = getRows('Categories');
  const parsedCategories: Category[] = categoriesRows.map((r, i) => ({
    id: r[0] || `cat_${Date.now()}_${i}`,
    name: r[1] || 'หมวดหมู่ทั่วไป',
    description: r[2] || '',
    color: r[3] || 'bg-slate-500',
    series: r[4] ? r[4].split(',').map((s: string) => s.trim()).filter(Boolean) : []
  }));
  const categories = hasTab('Categories') ? parsedCategories : (currentAppData?.categories || []);

  // 3. Parse BOMs
  const bomsRows = getRows('BOMs');
  const parsedBoms: Bom[] = bomsRows.map((r, i) => {
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
  const boms = hasTab('BOMs') ? parsedBoms : (currentAppData?.boms || []);

  // 4. Parse Projects
  const projectsRows = getRows('Projects');
  const parsedProjects: Project[] = projectsRows.map((r, i) => ({
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
  const projects = hasTab('Projects') ? parsedProjects : (currentAppData?.projects || []);

  // 5. Parse Jobs
  const jobsRows = getRows('Jobs');
  const parsedJobs: Job[] = jobsRows.map((r, i) => ({
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
  const jobs = hasTab('Jobs') ? parsedJobs : (currentAppData?.jobs || []);

  // 6. Parse Employees
  const employeesRows = getRows('Employees');
  const parsedEmployees: Employee[] = employeesRows.map((r, i) => ({
    id: r[0] || `emp_${Date.now()}_${i}`,
    empCode: r[1] && r[1] !== 'name' ? r[1] : '',
    name: r[1] === 'name' ? (r[2] || 'พนักงาน') : (r[1] || 'พนักงาน'),
    nickname: r[3] || '',
    email: r[4] || '',
    department: r[5] || '',
    role: r[6] || '',
    orgLevel: r[7] || 'team',
    phone: r[8] || '',
    createdAt: r[9] || new Date().toISOString()
  }));
  const employees = hasTab('Employees') ? parsedEmployees : (currentAppData?.employees || []);

  // 7. Parse Brands
  const brandsRows = getRows('Brands');
  const parsedBrands: Brand[] = brandsRows.map((r, i) => ({
    id: r[0] || `brand_${Date.now()}_${i}`,
    name: r[1] || 'แบรนด์',
    createdAt: r[2] || new Date().toISOString()
  }));
  const brands = hasTab('Brands') ? parsedBrands : (currentAppData?.brands || []);

  // 8. Parse Daily Reports
  const dailyReportsRows = getRows('DailyReports');
  const parsedDailyReports: DailyReport[] = dailyReportsRows.map((r, i) => ({
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
  const dailyReports = hasTab('DailyReports') ? parsedDailyReports : (currentAppData?.dailyReports || []);

  // 9. Parse Activities
  const activitiesRows = getRows('Activities');
  const parsedActivities: StockActivity[] = activitiesRows.map((r, i) => ({
    id: r[0] || `act_${Date.now()}_${i}`,
    productId: r[1] || '',
    productName: r[2] || '',
    type: (['in', 'out', 'adjust'].includes(r[3]) ? r[3] : 'adjust') as any,
    quantityChange: parseFloat(r[4]) || 0,
    oldQuantity: parseFloat(r[5]) || 0,
    newQuantity: parseFloat(r[6]) || 0,
    reason: r[7] || '',
    timestamp: r[8] || new Date().toISOString(),
    userName: r[9] || '',
    userEmail: r[10] || '',
    creatorEmail: r[10] || '',
    userPhotoUrl: r[11] || '',
    imageUrl: r[12] || '',
    productImage: r[13] || ''
  }));
  const activities = hasTab('Activities') ? parsedActivities : (currentAppData?.activities || []);

  // 10. Parse User Roles
  const userRolesRows = getRows('UserRoles');
  const parsedUserRoles: UserRole[] = userRolesRows.map((r, i) => ({
    uid: r[0] || `user_${Date.now()}_${i}`,
    email: r[1] || '',
    displayName: r[2] || '',
    role: (['admin', 'editor', 'user'].includes(r[3]) ? r[3] : 'user') as any,
    createdAt: r[4] || new Date().toISOString()
  }));
  const userRoles = hasTab('UserRoles') ? parsedUserRoles : (currentAppData?.userRoles || []);

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
