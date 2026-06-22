const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const outputDir = path.resolve(__dirname, "../../output/pdf");
fs.mkdirSync(outputDir, { recursive: true });
const output = path.join(outputDir, "phase-7-commercial-sample.pdf");
const pdf = new PDFDocument({ size: "A4", margin: 48 });
pdf.pipe(fs.createWriteStream(output));
pdf.rect(0, 0, 595, 118).fill("#0f3d36");
pdf.fillColor("white").fontSize(11).text("ADSCALE ONE ERP", 48, 42).fontSize(26).text("PROPOSAL", 48, 62);
pdf.fillColor("#0f172a").fontSize(18).text("Digital Growth Engagement", 48, 145);
pdf.fontSize(10).fillColor("#64748b").text("PROP-2026-SAMPLE | Issued 22/06/2026", 48, 174);
pdf.fillColor("#0f172a").fontSize(11).text("Prepared for: Example Client", 48, 205).text("Status: DRAFT", 350, 205);
let y = 245;
pdf.fillColor("#e2e8f0").rect(48, y, 499, 28).fill();
pdf.fillColor("#0f172a").fontSize(9).text("DESCRIPTION", 58, y + 10).text("QTY", 350, y + 10).text("RATE", 405, y + 10).text("AMOUNT", 475, y + 10);
for (const item of [{ d: "Strategy and setup", q: 1, r: 25000 }, { d: "Monthly execution", q: 3, r: 30000 }]) { y += 36; pdf.text(item.d, 58, y).text(String(item.q), 350, y).text(item.r.toLocaleString("en-IN"), 405, y).text((item.q * item.r).toLocaleString("en-IN"), 475, y); }
y += 50;
pdf.fontSize(13).text("Total INR", 350, y).text("135,700", 475, y);
pdf.fontSize(12).text("Scope / Deliverables", 48, y + 55);
pdf.fontSize(9).fillColor("#475569").text("Strategy, campaign setup, creative production, optimization and monthly reporting.", 48, y + 78, { width: 499 });
pdf.fontSize(8).fillColor("#64748b").text("Generated securely by AdScale One ERP", 48, 790, { align: "center", width: 499 });
pdf.end();
console.log(output);
