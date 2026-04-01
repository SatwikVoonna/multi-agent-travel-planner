import jsPDF from 'jspdf';
import { TravelPlan } from '@/types/agent';

export function generateTravelPDF(plan: TravelPlan) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const colors = {
    cream: [245, 240, 230] as [number, number, number],
    lightBlue: [200, 215, 230] as [number, number, number],
    lightTan: [230, 220, 200] as [number, number, number],
    dark: [40, 40, 40] as [number, number, number],
    muted: [100, 100, 100] as [number, number, number],
    accent: [80, 60, 40] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    divider: [180, 170, 155] as [number, number, number],
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      // Background for new page
      doc.setFillColor(...colors.cream);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = 20;
    }
  };

  // ===== PAGE BACKGROUND =====
  doc.setFillColor(...colors.cream);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ===== HEADER SECTION =====
  // Light blue header band
  doc.setFillColor(...colors.lightBlue);
  doc.rect(0, 0, pageWidth, 55, 'F');

  y = 22;
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(...colors.dark);
  doc.text('Travel Itinerary', pageWidth / 2, y, { align: 'center' });

  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.muted);
  const subtitle = `(${plan.destination} — ${plan.duration} Day Trip)`;
  doc.text(subtitle, pageWidth / 2, y, { align: 'center' });

  // ===== TRIP INFO ROW =====
  y = 62;
  doc.setFillColor(...colors.lightTan);
  doc.rect(0, 55, pageWidth, 28, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.accent);

  const col1 = margin;
  const col2 = pageWidth / 2 + 10;

  // Left column info
  if (plan.transport) {
    doc.text(`TRANSPORT: ${plan.transport.type.toUpperCase()}`, col1, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    doc.setFontSize(7);
    doc.text(`FROM: ${plan.transport.from}`, col1, y);
    y += 5;
    doc.text(`TO: ${plan.transport.to}`, col1, y);
  }

  // Right column info
  let ry = 62;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.accent);
  doc.setFontSize(7);
  if (plan.hotel) {
    doc.text(`HOTEL: ${plan.hotel.name}`, col2, ry);
    ry += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.dark);
    doc.text(`LOCATION: ${plan.hotel.location}`, col2, ry);
    ry += 5;
    doc.text(`PRICE: ₹${plan.hotel.pricePerNight.toLocaleString()}/night`, col2, ry);
  }

  // ===== BUDGET SUMMARY BAR =====
  y = 88;
  doc.setFillColor(...colors.lightBlue);
  doc.rect(0, 83, pageWidth, 12, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text(`TOTAL BUDGET: ₹${plan.totalBudget.toLocaleString()}`, col1, y);
  doc.text(`ESTIMATED COST: ₹${plan.totalCost.toLocaleString()}`, pageWidth / 2 - 15, y);
  const statusText = plan.budgetStatus === 'approved' ? '✓ WITHIN BUDGET' : plan.budgetStatus === 'warning' ? '⚠ TIGHT BUDGET' : '✗ OVER BUDGET';
  doc.text(statusText, pageWidth - margin - 30, y);

  // ===== DAY-WISE ITINERARY =====
  y = 102;

  const dayColors = [
    colors.lightBlue,
    colors.lightTan,
  ];

  for (const day of plan.itinerary) {
    const dayLabel = `DAY ${day.day}`;
    const activitiesCount = day.activities.length + (day.meals?.lunch ? 1 : 0) + (day.meals?.dinner ? 1 : 0);
    const neededHeight = 12 + activitiesCount * 7 + 8;

    checkPage(neededHeight);

    const bandColor = dayColors[(day.day - 1) % 2];
    const bandY = y - 5;

    // Day label band on the left
    doc.setFillColor(...bandColor);
    doc.rect(margin - 2, bandY, 22, neededHeight, 'F');

    // Day label (rotated text simulation - just vertical)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.accent);
    doc.text(dayLabel, margin + 8, bandY + neededHeight / 2, { align: 'center', angle: 90 });

    // Divider line at top
    doc.setDrawColor(...colors.divider);
    doc.setLineWidth(0.3);
    doc.line(margin + 22, bandY, pageWidth - margin, bandY);

    // Date & weather on the right
    const infoX = margin + 26;
    let ay = y;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text(`${day.date}  •  ${day.weather.temperature}°C, ${day.weather.condition}  •  Day Total: ₹${day.totalCost.toLocaleString()}`, infoX, ay);
    ay += 7;

    // Activities
    for (const act of day.activities) {
      checkPage(8);
      const costStr = act.cost === 0 ? 'Free' : `₹${act.cost.toLocaleString()}`;

      // Time slot
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.accent);
      const timeLabel = act.timeSlot ? act.timeSlot.toUpperCase() + ':' : '•';
      doc.text(timeLabel, infoX, ay);

      // Activity name + cost
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.dark);
      const timeWidth = doc.getTextWidth(timeLabel) + 3;
      const actText = `${act.name} — ${costStr}`;
      const lines = doc.splitTextToSize(actText, contentWidth - 30 - timeWidth);
      doc.text(lines, infoX + timeWidth, ay);
      ay += lines.length * 5 + 2;
    }

    // Meals
    if (day.meals?.lunch) {
      checkPage(6);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...colors.muted);
      doc.text(`LUNCH: ${day.meals.lunch.name} (${day.meals.lunch.cuisine}) — ₹${day.meals.lunch.costPerPerson}/person`, infoX, ay);
      ay += 5;
    }
    if (day.meals?.dinner) {
      checkPage(6);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...colors.muted);
      doc.text(`DINNER: ${day.meals.dinner.name} (${day.meals.dinner.cuisine}) — ₹${day.meals.dinner.costPerPerson}/person`, infoX, ay);
      ay += 5;
    }

    y = ay + 4;
  }

  // ===== COST BREAKDOWN =====
  if (plan.budgetBreakdown) {
    checkPage(50);
    y += 4;
    doc.setFillColor(...colors.lightBlue);
    doc.rect(margin - 2, y - 5, contentWidth + 4, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('Cost Breakdown', margin, y);
    y += 8;

    const items = [
      ['Accommodation', plan.budgetBreakdown.accommodation],
      ['Transport', plan.budgetBreakdown.transport],
      ['Activities', plan.budgetBreakdown.activities],
      ['Food', plan.budgetBreakdown.food],
      ['Local Transport', plan.budgetBreakdown.localTransport || 0],
      ['Miscellaneous', plan.budgetBreakdown.miscellaneous],
    ] as const;

    for (const [label, val] of items) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.muted);
      doc.text(label, margin + 4, y);
      doc.setTextColor(...colors.dark);
      doc.setFont('helvetica', 'bold');
      doc.text(`₹${val.toLocaleString()}`, margin + 60, y);
      y += 6;
    }

    // Total line
    doc.setDrawColor(...colors.divider);
    doc.line(margin, y - 2, margin + 80, y - 2);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('TOTAL', margin + 4, y + 3);
    doc.text(`₹${plan.totalCost.toLocaleString()}`, margin + 60, y + 3);
    y += 10;
  }

  // ===== TIPS =====
  if (plan.tips && plan.tips.length > 0) {
    checkPage(20);
    doc.setFillColor(...colors.lightTan);
    doc.rect(margin - 2, y - 5, contentWidth + 4, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('Travel Tips', margin, y);
    y += 8;

    for (const tip of plan.tips) {
      checkPage(8);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.muted);
      const lines = doc.splitTextToSize(`• ${tip}`, contentWidth - 8);
      doc.text(lines, margin + 4, y);
      y += lines.length * 4 + 2;
    }
  }

  // ===== FOOTER =====
  const footerY = pageHeight - 10;
  doc.setFontSize(6);
  doc.setTextColor(170, 170, 170);
  doc.text('Generated by TravelAI Planner • Powered by Multi-Agent AI System', pageWidth / 2, footerY, { align: 'center' });

  doc.save(`TravelPlan-${plan.destination.replace(/\s+/g, '-')}.pdf`);
}
