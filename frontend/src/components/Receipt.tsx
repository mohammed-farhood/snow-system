"use client";

import React, { useRef } from "react";
import { formatCurrency, formatDate, paymentTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Printer } from "lucide-react";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ReceiptProps {
  receiptNumber: string;
  date: string;
  customerName: string;
  items: ReceiptItem[];
  totalAmount: number;
  paymentType: "CASH" | "DEBT" | "PARTIAL";
  amountPaid: number;
  amountDue: number;
  notes?: string;
}

export function Receipt({
  receiptNumber,
  date,
  customerName,
  items,
  totalAmount,
  paymentType,
  amountPaid,
  amountDue,
  notes,
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;

    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>إيصال رقم ${receiptNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            background: white;
            color: black;
            padding: 20px;
            font-size: 13px;
          }
          .receipt-header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #333; padding-bottom: 12px; }
          .receipt-header h1 { font-size: 22px; font-weight: 700; }
          .receipt-header p { font-size: 12px; color: #555; margin-top: 2px; }
          .receipt-meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; }
          .receipt-customer { margin-bottom: 12px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .receipt-customer span { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th { background: #f5f5f5; padding: 6px 8px; text-align: right; font-size: 11px; font-weight: 700; border: 1px solid #ddd; }
          td { padding: 6px 8px; text-align: right; border: 1px solid #ddd; font-size: 12px; }
          .totals { border-top: 2px solid #333; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
          .total-row.grand { font-weight: 700; font-size: 15px; border-top: 1px solid #333; padding-top: 6px; margin-top: 4px; }
          .payment-status { margin-top: 10px; padding: 8px; background: #f9f9f9; border-radius: 4px; }
          .signature { margin-top: 24px; display: flex; justify-content: space-between; }
          .signature-line { border-bottom: 1px solid #333; width: 120px; padding-bottom: 4px; font-size: 11px; }
          .notes { margin-top: 10px; font-size: 11px; color: #555; }
          @media print { @page { size: A5; margin: 1cm; } }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        icon={<Printer size={14} />}
        onClick={handlePrint}
        className="mb-4 no-print"
      >
        طباعة الإيصال
      </Button>

      <div ref={receiptRef} className="receipt-print">
        <div className="receipt-header" style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #333", paddingBottom: "12px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700 }}>مصنع الثلج</h1>
          <p style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>Snow Factory</p>
        </div>

        <div className="receipt-meta" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
          <span>{formatDate(date)}</span>
          <span style={{ fontWeight: 600 }}>رقم الإيصال: {receiptNumber}</span>
        </div>

        <div style={{ marginBottom: "12px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}>
          <strong>العميل:</strong> {customerName}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
          <thead>
            <tr>
              <th style={{ background: "#f5f5f5", padding: "6px 8px", textAlign: "right", fontWeight: 700, border: "1px solid #ddd", fontSize: "11px" }}>المجموع</th>
              <th style={{ background: "#f5f5f5", padding: "6px 8px", textAlign: "right", fontWeight: 700, border: "1px solid #ddd", fontSize: "11px" }}>السعر</th>
              <th style={{ background: "#f5f5f5", padding: "6px 8px", textAlign: "right", fontWeight: 700, border: "1px solid #ddd", fontSize: "11px" }}>الكمية</th>
              <th style={{ background: "#f5f5f5", padding: "6px 8px", textAlign: "right", fontWeight: 700, border: "1px solid #ddd", fontSize: "11px" }}>الصنف</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #ddd" }}>{formatCurrency(item.total)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #ddd" }}>{formatCurrency(item.unitPrice)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #ddd" }}>{item.quantity}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #ddd" }}>{item.name}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "2px solid #333", paddingTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "14px", fontWeight: 700 }}>
            <span>{formatCurrency(totalAmount)}</span>
            <span>المجموع الكلي</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px" }}>
            <span>{paymentTypeLabel(paymentType)}</span>
            <span>طريقة الدفع</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px" }}>
            <span>{formatCurrency(amountPaid)}</span>
            <span>المبلغ المدفوع</span>
          </div>
          {amountDue > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "13px", fontWeight: 700, color: "#c00", borderTop: "1px solid #ddd", marginTop: "4px", paddingTop: "6px" }}>
              <span>{formatCurrency(amountDue)}</span>
              <span>المبلغ المتبقي (دين)</span>
            </div>
          )}
        </div>

        {notes && (
          <div style={{ marginTop: "10px", fontSize: "11px", color: "#555" }}>
            <strong>ملاحظات:</strong> {notes}
          </div>
        )}

        <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ borderBottom: "1px solid #333", width: "120px", paddingBottom: "4px", fontSize: "11px" }}>
              توقيع العميل
            </div>
          </div>
          <div>
            <div style={{ borderBottom: "1px solid #333", width: "120px", paddingBottom: "4px", fontSize: "11px" }}>
              توقيع البائع
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
