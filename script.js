let currentYear, currentMonth;
let events = [];
let editingEventId = null;

// ---- Utility ----
// Pads single-digit numbers with a leading zero (e.g., 3 → "03")
function pad2(n) { return n < 10 ? "0" + n : n; }
// Generates a unique ID using timestamp + random string
function newId() { return Date.now() + Math.random().toString(36).slice(2); }

// ---- Local Storage ----
// Save events array to browser's localStorage
function saveEvents() {
  localStorage.setItem("haruCalendarEvents", JSON.stringify(events));
}

// Load events from localStorage (if available)
function loadEvents() {
  const saved = localStorage.getItem("haruCalendarEvents");
  if (saved) {
    try {
      events = JSON.parse(saved);
    } catch (e) {
      console.error("EventLoadedError:", e);
      events = [];
    }
  }
}

// ---- Init ----
// Initialize calendar with current month and year
function initCalendar() {
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();
  renderCalendar();
}

// ---- Calendar Render ----
// Render the calendar grid and update month title
function renderCalendar() {
  const monthYear = document.getElementById("monthYear");
  const tbody = document.querySelector("#calendarTable tbody");
  if (!monthYear || !tbody) return;
  tbody.innerHTML = "";

  // Month names for display
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  // Determine the starting day and number of days in the month
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Create initial empty cells before the first day
  let row = document.createElement("tr");
  for (let i = 0; i < firstDay; i++) row.appendChild(document.createElement("td"));

  const today = new Date();
  // Generate each day cell
  for (let day = 1; day <= lastDate; day++) {
    if (row.children.length === 7) {
      tbody.appendChild(row);
      row = document.createElement("tr");
    }

    const td = document.createElement("td");
    td.dataset.day = day;

    // Add day number
    const num = document.createElement("div");
    num.textContent = day;
    num.style.fontWeight = "600";
    td.appendChild(num);

    // Highlight today's date
    if (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    ) td.classList.add("today");

    // When clicking on a day cell, open the event form
    td.addEventListener("click", (e) => {
      if (e.target === td || e.target === num) openForm(currentYear, currentMonth, day);
    });

    row.appendChild(td);
  }

  // Fill remaining empty cells at the end
  while (row.children.length < 7) row.appendChild(document.createElement("td"));
  tbody.appendChild(row);

  renderEvents();
}

// ---- Render Events ----
// Display all events on the calendar
function renderEvents() {
  const tbody = document.querySelector("#calendarTable tbody");
  if (!tbody) return;

  // Remove all previous event elements
  tbody.querySelectorAll(".event, .event-more").forEach(e => e.remove());

  const dayMap = new Map();

  // Group events by day
  events.forEach(ev => {
    const start = new Date(ev.date);
    const end = new Date(ev.endDate);

    // Handle multi-day events
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const key = d.getDate();
        if (!dayMap.has(key)) dayMap.set(key, []);
        dayMap.get(key).push(ev);
      }
    }
  });

  // Render events in each day's cell
  dayMap.forEach((list, day) => {
    const cell = tbody.querySelector(`td[data-day="${day}"]`);
    if (!cell) return;

    // Show up to 3 events per day
    const show = list.slice(0, 3);
    show.forEach(ev => {
      const div = document.createElement("div");
      div.className = "event";
      div.textContent = ev.title;
      div.dataset.id = ev.id;

      // Open detail view when clicking the event
      div.addEventListener("click", (e) => {
        e.stopPropagation();
        openEventDetail(ev.id);
      });

      // Adjust border radius for multi-day visual
      const start = new Date(ev.date);
      const end = new Date(ev.endDate);
      const current = new Date(currentYear, currentMonth, day);

      if (current.getTime() === start.getTime() && current.getTime() === end.getTime()) {
        div.style.borderRadius = "4px";
      } else if (current.getTime() === start.getTime()) {
        div.style.borderRadius = "4px 0 0 4px";
      } else if (current.getTime() === end.getTime()) {
        div.style.borderRadius = "0 4px 4px 0";
      } else {
        div.style.borderRadius = "0";
      }

      div.style.backgroundColor = "#4a90e2";
      div.style.opacity = "0.9";

      cell.appendChild(div);
    });

    // Show "+ n more" if more than 3 events
    if (list.length > 3) {
      const more = document.createElement("div");
      more.className = "event-more";
      more.textContent = `+ ${list.length - 3} more`;
      cell.appendChild(more);
    }
  });
}

// ---- Navigation ----
// Navigate to the previous month
function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
}
// Navigate to the next month
function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
}

// ---- All Day Handling ----
// Toggles time input visibility when "All Day" is checked
function setAllDayState(isAllDay) {
  const container = document.getElementById("formContainer");
  const timeInputs = document.querySelectorAll(".timeInput");
  if (container) {
    container.classList.toggle("allday-on", !!isAllDay);
  }
  timeInputs.forEach((el) => {
    if (!el) return;
    el.style.display = isAllDay ? "none" : "inline-block";
    el.disabled = !!isAllDay;
    if (isAllDay) {
      el.setAttribute("hidden", "");
      el.removeAttribute("required");
    } else {
      el.removeAttribute("hidden");
      el.setAttribute("required", "");
    }
  });
}

// Add event listener for "All Day" checkbox
function wireAllDayToggle() {
  const checkbox = document.getElementById("allDay");
  if (!checkbox) return;
  checkbox.addEventListener("change", () => setAllDayState(checkbox.checked));
  setAllDayState(checkbox.checked);
}

// Sync the checkbox state with form UI
function reflectAllDayInForm() {
  const checkbox = document.getElementById("allDay");
  if (checkbox) setAllDayState(checkbox.checked);
}

// ---- Form ----
// Open form for creating a new event
function openForm(year, month, day) {
  const calendarDiv = document.getElementById("calendar");
  const formContainer = document.getElementById("formContainer");
  if (!calendarDiv || !formContainer) return;

  editingEventId = null; // Reset edit mode

  // Set default date fields
  const base = new Date(year, month, day);
  const y = base.getFullYear(), m = pad2(base.getMonth() + 1), d = pad2(base.getDate());
  document.getElementById("startDate").value = `${y}-${m}-${d}`;
  document.getElementById("endDate").value = `${y}-${m}-${d}`;
  document.getElementById("apptTitle").value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
  document.getElementById("allDay").checked = false;

  // Show form and hide event detail
  calendarDiv.classList.add("shrink");
  formContainer.classList.add("active");
  const eventDetail = document.getElementById("eventDetail");
  if (eventDetail) eventDetail.classList.remove("active");

  reflectAllDayInForm();
}

// Open form for editing an existing event
function openFormForEdit(id) {
  const ev = events.find(e => e.id === id);
  if (!ev) return;

  editingEventId = id;
  document.getElementById("apptTitle").value = ev.title;
  document.getElementById("startDate").value = ev.date;
  document.getElementById("endDate").value = ev.endDate;
  document.getElementById("startTime").value = ev.startTime;
  document.getElementById("endTime").value = ev.endTime;
  document.getElementById("allDay").checked = ev.allDay;
  document.getElementById("calendar").classList.add("shrink");
  document.getElementById("formContainer").classList.add("active");
  document.getElementById("eventDetail").classList.remove("active");

  reflectAllDayInForm();
}

// Close the event form
function closeForm() {
  const calendarDiv = document.getElementById("calendar");
  const formContainer = document.getElementById("formContainer");
  
  if (!calendarDiv || !formContainer) return;
  calendarDiv.classList.remove("shrink");
  formContainer.classList.remove("active");
  editingEventId = null;
}

// ---- Event Detail ----
// Open event detail panel
function openEventDetail(id) {
  const ev = events.find(e => e.id === id);
  if (!ev) return;

  document.getElementById("formContainer").classList.remove("active");

  // Display event info
  document.getElementById("detailEventTitle").textContent = ev.title;
  document.getElementById("detailEventDate").textContent = `${ev.date} → ${ev.endDate}`;
  document.getElementById("detailEventTime").textContent = ev.allDay ? "All Day" : `${ev.startTime || "—"} 〜 ${ev.endTime || "—"}`;

  document.getElementById("eventDetail").classList.add("active");

  // Edit and Delete button actions
  document.getElementById("detailEditBtn").onclick = () => {
    closeEventDetail();
    openFormForEdit(id);
  };
  document.getElementById("detailDeleteBtn").onclick = () => {
    if (confirm("Confirm delete?")) {
      // Remove event and re-render
      events = events.filter(e => e.id !== id);
      renderCalendar();
      saveEvents();
      closeEventDetail();
    }
  };
}

// Close event detail view
function closeEventDetail() {
  const calendarDiv = document.getElementById("calendar");
  const detailDiv = document.getElementById("eventDetail");

  if (detailDiv) detailDiv.classList.remove("active");
  if (calendarDiv) calendarDiv.classList.remove("shrink");
}

// ---- Main ----
// Main entry point after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  try {
    wireAllDayToggle(); // Initialize "All Day" toggle
    loadEvents();       // Load events from storage
    initCalendar();     // Render calendar

    // Form submit handler (add or edit event)
    const form = document.getElementById("appointmentForm");
    form.addEventListener("submit", function(e) {
      e.preventDefault();

      const title = document.getElementById("apptTitle").value.trim();
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
      const allDay = document.getElementById("allDay").checked;
      const startTime = allDay ? "" : document.getElementById("startTime").value;
      const endTime = allDay ? "" : document.getElementById("endTime").value;
      if (!title || !startDate) return;

      if (editingEventId) {
        // Update existing event
        const ev = events.find(e => e.id === editingEventId);
        if (ev) {
          ev.title = title;
          ev.date = startDate;
          ev.endDate = endDate;
          ev.allDay = allDay;
          ev.startTime = startTime;
          ev.endTime = endTime;
        }
      } else {
        // Add new event
        events.push({
          id: newId(),
          title,
          date: startDate,
          endDate,
          allDay,
          startTime,
          endTime
        });
      }

      renderCalendar();
      saveEvents();  
      closeForm();
      this.reset();
      reflectAllDayInForm();
    });

    // Close detail panel when clicking "close"
    document.getElementById("detailCloseBtn").addEventListener("click", closeEventDetail);
  } catch (err) {
    console.error("DOMContentLoadedError:", err);
  }
});
