// Prints a sale on a small receipt (fits 80mm thermal printers and phones' "save as PDF").
import type { Sale, Settings } from "./api";
import { api } from "./api";
import { dateOf, n, time } from "./format";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Opens the print window right away (so phones don't block it), then fills it. */
export async function printReceipt(load: Sale | (() => Promise<Sale>)) {
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.write('<p style="font-family:sans-serif;text-align:center;margin-top:40px">...</p>');
  const [sale, s] = await Promise.all([
    typeof load === "function" ? load() : Promise.resolve(load),
    api<Settings>("/settings").catch(() => null),
  ]);
  const owed = sale.total - sale.paid;
  const rows = sale.items
    .map((i) => `<tr><td>${esc(i.product.name)}</td><td class="c">${n(i.quantity)}</td><td class="l">${n(i.quantity * i.price)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>وصل ${sale.receiptNo}</title>
<style>
@page{size:80mm auto;margin:4mm}
body{font-family:Tahoma,Arial,sans-serif;width:72mm;margin:0 auto;color:#000;font-size:13px}
h1{font-size:20px;text-align:center;margin:0}
.m{text-align:center;color:#333;margin:2px 0 8px}
table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px dashed #999}
.c{text-align:center}.l{text-align:left;direction:ltr}
.t{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;margin-top:8px}
.d{display:flex;justify-content:space-between;margin-top:2px}
.f{text-align:center;margin-top:12px;color:#333}
.ltr{direction:ltr;unicode-bidi:embed}
</style></head><body>
<h1>${esc(s?.factoryName ?? "مصنع الثلج")}</h1>
${s?.factoryPhone ? `<p class="m ltr">${esc(s.factoryPhone)}</p>` : ""}
<p class="m">وصل رقم <span class="ltr">${sale.receiptNo}</span><br><span class="ltr">${dateOf(sale.date)} ${time(sale.date)}</span></p>
<p>الزبون: <b>${esc(sale.customer?.name ?? "نقدي")}</b></p>
<table><tr><td><b>المادة</b></td><td class="c"><b>العدد</b></td><td class="l"><b>المبلغ</b></td></tr>${rows}</table>
<div class="t"><span>المجموع</span><span class="ltr">${n(sale.total)} د.ع</span></div>
<div class="d"><span>المدفوع</span><span class="ltr">${n(sale.paid)} د.ع</span></div>
${owed > 0 ? `<div class="d"><b>الباقي (دين)</b><b class="ltr">${n(owed)} د.ع</b></div>` : ""}
<p class="f">البائع: ${esc(sale.createdBy.name)} — شكراً لكم</p>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
