// Demo data used until the MedGuard AI backend/database is connected.
// Replace these arrays with API responses once PostgreSQL + backend are ready.

export const DEMO_MEDICINES = [
  {
    id: 1,
    name: "Paracetamol",
    strength: "500 mg",
    manufacturer: "ABC Pharmaceuticals",
    batchNumber: "BTH-23981",
    expiryDate: "12/2027",
    lastVerified: "Today",
    confidence: 96,
    result: "genuine",
  },
  {
    id: 2,
    name: "Amoxicillin",
    strength: "500 mg",
    manufacturer: "XYZ Pharma",
    batchNumber: "AMX-58210",
    expiryDate: "08/2027",
    lastVerified: "Yesterday",
    confidence: 93,
    result: "genuine",
  },
  {
    id: 3,
    name: "XYZ Tablet",
    strength: "250 mg",
    manufacturer: "Unknown",
    batchNumber: "XYZ-00421",
    expiryDate: "03/2027",
    lastVerified: "Aug 28",
    confidence: 72,
    result: "flagged",
  },
];

export const DEMO_HISTORY = [
  { id: 1, medicine: "Paracetamol", result: "genuine", confidence: 96, date: "Today" },
  { id: 2, medicine: "Amoxicillin", result: "genuine", confidence: 93, date: "Yesterday" },
  { id: 3, medicine: "XYZ Tablet", result: "flagged", confidence: 72, date: "Aug 28" },
  { id: 4, medicine: "Crocin", result: "genuine", confidence: 95, date: "Aug 20" },
];

export const DEMO_NOTIFICATIONS = [
  {
    id: 1,
    type: "warning",
    title: "Medicine flagged",
    text: "XYZ Tablet requires further verification.",
    time: "Today",
  },
  {
    id: 2,
    type: "success",
    title: "Verification completed",
    text: "Paracetamol was successfully screened.",
    time: "Today",
  },
  {
    id: 3,
    type: "info",
    title: "Expiry reminder",
    text: "Vitamin D expires in 30 days.",
    time: "Yesterday",
  },
];
