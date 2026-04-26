// =========================================================================
// Keana & Bien — single edit point
// Update these values, then redeploy. No build step required.
// =========================================================================

window.EVITE_CONFIG = {
  // ----- Couple + event -----
  groomFirstName: "Bien",
  brideFirstName: "Keana",
  // ISO 8601 with Manila offset (PHT = UTC+8)
  weddingDate: "2026-06-13T10:00:00+08:00",
  rsvpDeadline: "2026-05-15T23:59:59+08:00",

  // ----- Venues -----
  ceremony: {
    name: "Santisimo Rosario Parish – UST",
    address: "España Blvd., Sampaloc, Manila, Philippines",
    // Used by the embedded map iframe + "Open in Maps" deep link
    mapsQuery: "Santisimo Rosario Parish UST Espana Manila",
    time: "10:00 AM",
  },
  reception: {
    name: "UST Central Seminary Gym",
    address: "España Blvd., Sampaloc, Manila, Philippines",
    mapsQuery: "UST Central Seminary Gym Espana Manila",
    time: "Immediately following the ceremony",
  },

  // ----- RSVP backend -----
  // Paste your Apps Script Web App URL here after deploying apps-script/Code.gs
  // (See README.md → "RSVP setup")
  // Leave as null to use the built-in DEMO list (works fully offline for previews).
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxOjjaFUnOLD86ozjBhRpzMS2l26ScR_riSFlH4aHQZSsssMOdTA_P0geBZECugLF_jqA/exec",

  // Demo guest list used only when appsScriptUrl is null.
  // Mirrors the columns in the real Google Sheet.
  demoGuests: [
    { id: "1", name: "Coleen Reyes",       aliases: "Coleen", side: "Bride",  plusOneAllowed: true,  maxGuests: 2, hasResponded: false },
    { id: "2", name: "Keith Anthony Cruz", aliases: "Keith",  side: "Groom",  plusOneAllowed: true,  maxGuests: 2, hasResponded: false },
    { id: "3", name: "Maria Santos",       aliases: "Maris",  side: "Bride",  plusOneAllowed: false, maxGuests: 1, hasResponded: false },
    { id: "4", name: "Juan Dela Cruz",     aliases: "JDC",    side: "Groom",  plusOneAllowed: false, maxGuests: 1, hasResponded: true,  attending: "Yes", guestCount: 1 },
    { id: "5", name: "The Rivera Family",  aliases: "Rivera", side: "Bride",  plusOneAllowed: true,  maxGuests: 4, hasResponded: false },
  ],

  // ----- Copy -----
  verse: [
    "To everything there's a reason,",
    "a time and a purpose.",
    "On this day, I will marry my",
    "best friend the one I will laugh with.",
    "Live for. Love.",
  ],

  parents: {
    groom:  { primary: "Bonifacio H. Lagmay †", secondary: "Maria Luisa H. Lagmay" },
    bride:  { primary: "Marvin M. Rivera",      secondary: "Imee M. Rivera" },
  },

  principalSponsors: [
    "Dr. Leovino Ma. Garcia",
    "Mrs. Irene M. Makalintal",
    "Mrs. Janet C. Mendoza",
    "Mrs. Lilia A. Hernandez",
    "Mr. Steve Paul Anthony T. Baltao",
    "Mrs. Winnie Marianne L. Hernandez",
  ],

  // Attire palette (from the print invite)
  palette: [
    { hex: "#D85B2A", name: "Burnt Orange" },
    { hex: "#B83264", name: "Magenta" },
    { hex: "#F1B7B6", name: "Blush" },
    { hex: "#6F7CB7", name: "Periwinkle" },
    { hex: "#A9C9A4", name: "Sage" },
    { hex: "#BBD7E8", name: "Powder Blue" },
    { hex: "#C8B6E0", name: "Lavender" },
    { hex: "#9DA85B", name: "Olive" },
    { hex: "#9A4DBA", name: "Purple" },
    { hex: "#E94493", name: "Hot Pink" },
    { hex: "#E2A434", name: "Mustard" },
    { hex: "#F0D24A", name: "Yellow" },
    { hex: "#3DA39E", name: "Teal" },
  ],
};
