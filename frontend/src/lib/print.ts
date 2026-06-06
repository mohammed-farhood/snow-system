// Professional print utility — opens a clean A4 window and triggers print

const FONT = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap";

const BASE_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Cairo', sans-serif;
  direction: rtl;
  background: white;
  color: #0f172a;
  padding: 36px 40px;
  font-size: 13px;
  line-height: 1.7;
}

/* ── Letterhead ── */
.letterhead {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 18px;
  border-bottom: 3px solid #0ea5e9;
  margin-bottom: 28px;
}
.company h1 { font-size: 30px; font-weight: 800; color: #0ea5e9; letter-spacing: -0.5px; }
.company p  { font-size: 11px; color: #94a3b8; margin-top: 1px; }
.doc-info   { text-align: left; }
.doc-info h2 { font-size: 20px; font-weight: 700; color: #1e293b; }
.doc-info p  { font-size: 12px; color: #64748b; margin-top: 4px; }

/* ── Meta grid ── */
.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}
.meta-grid.cols3 { grid-template-columns: repeat(3, 1fr); }
.meta-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
}
.meta-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
.meta-value { font-size: 14px; font-weight: 700; color: #0f172a; }

/* ── Stats grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}
.stat-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  text-align: center;
}
.stat-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
.stat-value { font-size: 22px; font-weight: 800; color: #0f172a; }
.stat-value.blue   { color: #0ea5e9; }
.stat-value.red    { color: #ef4444; }
.stat-value.green  { color: #22c55e; }

/* ── Table ── */
table { width: 100%; border-collapse: collapse; margin: 4px 0 20px; }
thead th {
  background: #0ea5e9;
  color: white;
  padding: 11px 14px;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
thead th:first-child { border-radius: 0 6px 0 0; }
thead th:last-child  { border-radius: 6px 0 0 0; }
tbody td {
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  color: #1e293b;
}
tbody tr:nth-child(even) td { background: #f8fafc; }
tbody tr:last-child td { border-bottom: none; }

/* ── Totals ── */
.totals {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 20px;
}
.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 13px;
  color: #475569;
}
.total-row + .total-row { border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 2px; }
.total-row.grand {
  font-size: 18px;
  font-weight: 800;
  color: #0ea5e9;
  padding-bottom: 10px;
  margin-bottom: 4px;
  border-bottom: 2px solid #e2e8f0;
}
.total-row.debt { color: #ef4444; font-weight: 700; }
.total-row.paid { color: #22c55e; font-weight: 600; }

/* ── Notes ── */
.notes {
  background: #fffbeb;
  border-right: 4px solid #f59e0b;
  border-radius: 0 8px 8px 0;
  padding: 10px 14px;
  margin-bottom: 20px;
  font-size: 12px;
  color: #78350f;
}
.notes strong { display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; }

/* ── Signatures ── */
.signatures {
  display: flex;
  justify-content: space-around;
  margin-top: 52px;
  padding-top: 20px;
}
.sig-box { text-align: center; }
.sig-line { border-top: 1px solid #94a3b8; width: 150px; margin: 0 auto 8px; }
.sig-label { font-size: 11px; color: #64748b; }

/* ── Footer ── */
.print-footer {
  margin-top: 36px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 10px;
  color: #94a3b8;
  letter-spacing: 0.3px;
}

/* ── Expense badge ── */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.badge-blue   { background: #eff6ff; color: #1d4ed8; }
.badge-green  { background: #f0fdf4; color: #15803d; }
.badge-yellow { background: #fefce8; color: #a16207; }
.badge-red    { background: #fef2f2; color: #b91c1c; }
.badge-purple { background: #faf5ff; color: #7e22ce; }

@media print {
  @page { size: A4 portrait; margin: 1.5cm; }
  body { padding: 0; }
}
`;

function openPrint(title: string, body: string) {
  const win = window.open("", "_blank", "width=860,height=960");
  if (!win) { alert("الرجاء السماح بفتح نوافذ منبثقة لطباعة المستند"); return; }
  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="${FONT}" rel="stylesheet">
  <style>${BASE_STYLES}</style>
</head>
<body>${body}<script>
  document.fonts.ready.then(()=>{ setTimeout(()=>{ window.print(); }, 400); });
<\/script></body></html>`);
  win.document.close();
  win.focus();
}

// ── Formatters (inline so they work in the isolated print window) ──────────

function fd(s: string): string {
  try { return new Date(s).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return s; }
}
function fn(n: number): string { return n.toLocaleString("ar-IQ"); }
function fc(n: number): string { return `${n.toLocaleString("ar-IQ")} د.ع`; }
function payLabel(p: string): string { return p === "CASH" ? "نقدي كامل" : p === "DEBT" ? "دين" : "دفع جزئي"; }
function payBadge(p: string): string {
  if (p === "CASH") return `<span class="badge badge-green">نقدي</span>`;
  if (p === "DEBT") return `<span class="badge badge-red">دين</span>`;
  return `<span class="badge badge-yellow">جزئي</span>`;
}

function letterhead(docTitle: string, sub: string): string {
  return `<div class="letterhead">
    <div class="company">
      <h1>مصنع الثلج</h1>
      <p>Snow Factory · نظام الإدارة المتكاملة</p>
    </div>
    <div class="doc-info">
      <h2>${docTitle}</h2>
      <p>${sub}</p>
    </div>
  </div>`;
}

function printFooter(): string {
  const now = new Date().toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return `<div class="print-footer">طُبع في: ${now} · مصنع الثلج · Snow Factory ERP</div>`;
}

// ── Purchase Order ────────────────────────────────────────────────────────────

export function printPurchase(p: {
  id: number;
  date: string;
  supplierName: string;
  items: { itemName: string; quantity: number; unitPrice: number; totalPrice?: number }[];
  totalAmount: number;
  paymentType: string;
  amountPaid: number;
  amountDue: number;
  notes?: string;
}) {
  const rows = p.items.map((item, i) => {
    const total = item.totalPrice ?? item.quantity * item.unitPrice;
    return `<tr>
      <td style="text-align:center;color:#64748b">${i + 1}</td>
      <td><strong>${item.itemName}</strong></td>
      <td style="text-align:center">${fn(item.quantity)}</td>
      <td style="text-align:center">${fc(item.unitPrice)}</td>
      <td style="text-align:center;font-weight:700">${fc(total)}</td>
    </tr>`;
  }).join("");

  const body = `
  ${letterhead("أمر شراء", `رقم #${p.id} · ${fd(p.date)}`)}

  <div class="meta-grid cols3">
    <div class="meta-box">
      <div class="meta-label">المورد</div>
      <div class="meta-value">${p.supplierName || "—"}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">التاريخ</div>
      <div class="meta-value">${fd(p.date)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">طريقة الدفع</div>
      <div class="meta-value">${payBadge(p.paymentType)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center">#</th>
        <th>اسم الصنف</th>
        <th style="text-align:center">الكمية</th>
        <th style="text-align:center">سعر الوحدة</th>
        <th style="text-align:center">المجموع</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="total-row grand">
      <span>المجموع الكلي</span>
      <span>${fc(p.totalAmount)}</span>
    </div>
    <div class="total-row paid">
      <span>المبلغ المدفوع</span>
      <span>${fc(p.amountPaid)}</span>
    </div>
    ${p.amountDue > 0 ? `<div class="total-row debt">
      <span>المبلغ المتبقي (دين)</span>
      <span>${fc(p.amountDue)}</span>
    </div>` : `<div class="total-row paid"><span>الحالة</span><span>✓ مدفوع بالكامل</span></div>`}
  </div>

  ${p.notes ? `<div class="notes"><strong>ملاحظات</strong>${p.notes}</div>` : ""}

  <div class="signatures">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع المورد</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع المسؤول</div></div>
  </div>
  ${printFooter()}`;

  openPrint(`أمر شراء #${p.id}`, body);
}

// ── Production Daily Record ───────────────────────────────────────────────────

export function printProduction(r: {
  id: number;
  date: string;
  totalBlocks: number;
  wastedBlocks: number;
  blocksSoldWhole: number;
  blocksSoldCrushed: number;
  pricePerBlock: number;
  pricePerCrushed: number;
  notes?: string;
  createdBy?: { name: string } | null;
}) {
  const revenueWhole   = r.blocksSoldWhole   * r.pricePerBlock;
  const revenueCrushed = r.blocksSoldCrushed * r.pricePerCrushed;
  const totalRevenue   = revenueWhole + revenueCrushed;
  const remaining      = Math.max(0, r.totalBlocks - r.wastedBlocks - r.blocksSoldWhole - r.blocksSoldCrushed);

  const body = `
  ${letterhead("سجل الإنتاج اليومي", fd(r.date))}

  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-label">إجمالي الكتل المنتجة</div>
      <div class="stat-value">${fn(r.totalBlocks)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">الكتل التالفة</div>
      <div class="stat-value red">${fn(r.wastedBlocks)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">الكتل المتبقية</div>
      <div class="stat-value">${fn(remaining)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">قوالب مباعة</div>
      <div class="stat-value green">${fn(r.blocksSoldWhole)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">مجروش مباع</div>
      <div class="stat-value green">${fn(r.blocksSoldCrushed)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">إجمالي إيراد اليوم</div>
      <div class="stat-value blue">${fc(totalRevenue)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>البيان</th>
        <th style="text-align:center">الكمية</th>
        <th style="text-align:center">سعر الوحدة</th>
        <th style="text-align:center">الإيراد</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>قوالب ثلج مباعة</td>
        <td style="text-align:center">${fn(r.blocksSoldWhole)}</td>
        <td style="text-align:center">${fc(r.pricePerBlock)}</td>
        <td style="text-align:center;font-weight:700;color:#22c55e">${fc(revenueWhole)}</td>
      </tr>
      <tr>
        <td>ثلج مجروش مباع</td>
        <td style="text-align:center">${fn(r.blocksSoldCrushed)}</td>
        <td style="text-align:center">${fc(r.pricePerCrushed)}</td>
        <td style="text-align:center;font-weight:700;color:#22c55e">${fc(revenueCrushed)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row grand">
      <span>إجمالي إيراد اليوم</span>
      <span>${fc(totalRevenue)}</span>
    </div>
  </div>

  ${r.notes ? `<div class="notes"><strong>ملاحظات</strong>${r.notes}</div>` : ""}

  <div class="meta-grid" style="margin-top:16px">
    ${r.createdBy ? `<div class="meta-box"><div class="meta-label">سجّله</div><div class="meta-value">${r.createdBy.name}</div></div>` : ""}
    <div class="meta-box"><div class="meta-label">رقم السجل</div><div class="meta-value">#${r.id}</div></div>
  </div>

  <div class="signatures">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع المشرف</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع المدير</div></div>
  </div>
  ${printFooter()}`;

  openPrint(`سجل الإنتاج - ${fd(r.date)}`, body);
}

// ── Expense Receipt ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  GAS: "وقود",
  ELECTRICITY: "كهرباء",
  WATER: "ماء",
  SALARY: "رواتب",
  OTHER: "أخرى",
};
const CATEGORY_BADGES: Record<string, string> = {
  GAS:         `<span class="badge badge-yellow">وقود</span>`,
  ELECTRICITY: `<span class="badge badge-blue">كهرباء</span>`,
  WATER:       `<span class="badge badge-blue">ماء</span>`,
  SALARY:      `<span class="badge badge-purple">رواتب</span>`,
  OTHER:       `<span class="badge badge-green">أخرى</span>`,
};

export function printExpense(e: {
  id: number;
  date: string;
  category: string;
  description?: string;
  amount: number;
  notes?: string;
  recordedBy?: { name: string } | null;
  createdBy?: { name: string } | null;
}) {
  const recorder = e.recordedBy ?? e.createdBy;
  const catLabel = CATEGORY_LABELS[e.category] ?? e.category;
  const catBadge = CATEGORY_BADGES[e.category] ?? `<span class="badge badge-green">${catLabel}</span>`;

  const body = `
  ${letterhead("إيصال مصروف", `رقم #${e.id} · ${fd(e.date)}`)}

  <div class="meta-grid cols3">
    <div class="meta-box">
      <div class="meta-label">التاريخ</div>
      <div class="meta-value">${fd(e.date)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">الفئة</div>
      <div class="meta-value">${catBadge}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">الوصف</div>
      <div class="meta-value">${e.description || "—"}</div>
    </div>
  </div>

  <div class="totals">
    <div class="total-row grand">
      <span>المبلغ المصروف</span>
      <span>${fc(e.amount)}</span>
    </div>
  </div>

  ${e.notes ? `<div class="notes"><strong>ملاحظات</strong>${e.notes}</div>` : ""}

  ${recorder ? `<div class="meta-grid" style="margin-top:4px"><div class="meta-box"><div class="meta-label">سجّله</div><div class="meta-value">${recorder.name}</div></div></div>` : ""}

  <div class="signatures">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع المستلم</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع المسؤول</div></div>
  </div>
  ${printFooter()}`;

  openPrint(`إيصال مصروف #${e.id}`, body);
}

// ── Sales Receipt (improved — used by snow sales & goods sales) ───────────────

export function printReceipt(r: {
  receiptNumber: string;
  date: string;
  customerName: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  totalAmount: number;
  paymentType: string;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  type?: "snow" | "goods";
}) {
  const rows = r.items.map((item, i) => `<tr>
    <td style="text-align:center;color:#64748b">${i + 1}</td>
    <td><strong>${item.name}</strong></td>
    <td style="text-align:center">${fn(item.quantity)}</td>
    <td style="text-align:center">${fc(item.unitPrice)}</td>
    <td style="text-align:center;font-weight:700">${fc(item.total)}</td>
  </tr>`).join("");

  const title = r.type === "snow" ? "إيصال بيع ثلج" : "إيصال بيع بضاعة";

  const body = `
  ${letterhead(title, `رقم ${r.receiptNumber} · ${fd(r.date)}`)}

  <div class="meta-grid cols3">
    <div class="meta-box">
      <div class="meta-label">العميل</div>
      <div class="meta-value">${r.customerName}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">التاريخ</div>
      <div class="meta-value">${fd(r.date)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">طريقة الدفع</div>
      <div class="meta-value">${payBadge(r.paymentType)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center">#</th>
        <th>الصنف</th>
        <th style="text-align:center">الكمية</th>
        <th style="text-align:center">سعر الوحدة</th>
        <th style="text-align:center">المجموع</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="total-row grand">
      <span>المجموع الكلي</span>
      <span>${fc(r.totalAmount)}</span>
    </div>
    <div class="total-row paid">
      <span>المبلغ المدفوع</span>
      <span>${fc(r.amountPaid)}</span>
    </div>
    ${r.amountDue > 0 ? `<div class="total-row debt"><span>المبلغ المتبقي (دين)</span><span>${fc(r.amountDue)}</span></div>`
      : `<div class="total-row paid"><span>الحالة</span><span>✓ مدفوع بالكامل</span></div>`}
  </div>

  ${r.notes ? `<div class="notes"><strong>ملاحظات</strong>${r.notes}</div>` : ""}

  <div class="signatures">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع العميل</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع البائع</div></div>
  </div>
  ${printFooter()}`;

  openPrint(`${title} ${r.receiptNumber}`, body);
}
