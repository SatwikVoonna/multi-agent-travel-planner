import jsPDF from 'jspdf';
import { TravelPlan } from '@/types/agent';

export function generateTravelPDF(plan: TravelPlan) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const addSection = (title: string) => {
    checkPage(16);
    y += 6;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  const addText = (text: string, fontSize = 10, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPage(lines.length * (fontSize * 0.5) + 4);
    doc.text(lines, margin, y);
    y += lines.length * (fontSize * 0.45) + 3;
  };

  const addKeyValue = (key: string, value: string) => {
    checkPage(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(`${key}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(value, margin + doc.getTextWidth(`${key}: `) + 2, y);
    y += 6;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`Travel Plan: ${plan.destination}`, margin, y);
  y += 10;

  // Summary
  addKeyValue('Duration', `${plan.duration} days`);
  addKeyValue('Total Budget', `₹${plan.totalBudget.toLocaleString()}`);
  addKeyValue('Estimated Cost', `₹${plan.totalCost.toLocaleString()}`);
  addKeyValue('Budget Status', plan.budgetStatus.toUpperCase());
  addKeyValue('Weather', plan.weatherStatus.replace('-', ' '));
  addKeyValue('Generated', plan.generatedAt.toLocaleString());

  // Budget Breakdown
  if (plan.budgetBreakdown) {
    addSection('Cost Breakdown');
    const items = [
      ['Accommodation', plan.budgetBreakdown.accommodation],
      ['Transport', plan.budgetBreakdown.transport],
      ['Activities', plan.budgetBreakdown.activities],
      ['Food', plan.budgetBreakdown.food],
      ['Local Transport', plan.budgetBreakdown.localTransport || 0],
      ['Miscellaneous', plan.budgetBreakdown.miscellaneous],
    ] as const;
    for (const [label, val] of items) {
      addKeyValue(label, `₹${val.toLocaleString()}`);
    }
  }

  // Accommodation
  if (plan.hotel) {
    addSection('Accommodation');
    addKeyValue('Name', plan.hotel.name);
    addKeyValue('Location', plan.hotel.location);
    addKeyValue('Rating', `${plan.hotel.rating}/5`);
    addKeyValue('Price', `₹${plan.hotel.pricePerNight.toLocaleString()}/night`);
    if (plan.hotel.totalCost) addKeyValue('Total', `₹${plan.hotel.totalCost.toLocaleString()}`);
    if (plan.hotel.amenities.length) addText(`Amenities: ${plan.hotel.amenities.join(', ')}`);
  }

  // Transport
  if (plan.transport) {
    addSection('Transport');
    addKeyValue('Type', plan.transport.type);
    addKeyValue('Route', `${plan.transport.from} → ${plan.transport.to}`);
    addKeyValue('Duration', plan.transport.duration);
    addKeyValue('Price', `₹${plan.transport.price.toLocaleString()} (one way)`);
    if (plan.transport.roundTripCost) addKeyValue('Round Trip', `₹${plan.transport.roundTripCost.toLocaleString()}`);
  }

  // Itinerary
  addSection('Day-wise Itinerary');
  for (const day of plan.itinerary) {
    checkPage(20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    const dayTitle = `Day ${day.day}${day.theme ? ` — ${day.theme}` : ''} (${day.date})`;
    doc.text(dayTitle, margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Weather: ${day.weather.temperature}°C, ${day.weather.condition} | Day Total: ₹${day.totalCost.toLocaleString()}`, margin + 2, y);
    y += 6;

    for (const act of day.activities) {
      checkPage(14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      const costStr = act.cost === 0 ? 'Free' : `₹${act.cost.toLocaleString()}`;
      doc.text(`• ${act.name} — ${costStr}`, margin + 4, y);
      y += 5;
      if (act.description) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const descLines = doc.splitTextToSize(act.description, contentWidth - 8);
        checkPage(descLines.length * 4 + 2);
        doc.text(descLines, margin + 6, y);
        y += descLines.length * 4 + 2;
      }
    }

    if (day.meals?.lunch || day.meals?.dinner) {
      checkPage(12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      if (day.meals.lunch) {
        doc.text(`Lunch: ${day.meals.lunch.name} (${day.meals.lunch.cuisine}) — ₹${day.meals.lunch.costPerPerson}/person`, margin + 4, y);
        y += 5;
      }
      if (day.meals.dinner) {
        checkPage(6);
        doc.text(`Dinner: ${day.meals.dinner.name} (${day.meals.dinner.cuisine}) — ₹${day.meals.dinner.costPerPerson}/person`, margin + 4, y);
        y += 5;
      }
    }
    y += 4;
  }

  // Tips
  if (plan.tips && plan.tips.length > 0) {
    addSection('Travel Tips');
    for (const tip of plan.tips) {
      addText(`• ${tip}`, 9);
    }
  }

  // Footer on last page
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by TravelAI Planner • Powered by Multi-Agent AI System', margin, footerY);

  doc.save(`TravelPlan-${plan.destination.replace(/\s+/g, '-')}.pdf`);
}
