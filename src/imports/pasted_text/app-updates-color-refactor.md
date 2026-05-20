Change RECENT APPLICATIONS SECTION (right column) to 50% width and UPCOMING DEADLINES SECTION (left column), to 55% width

Update the All Applications page by adding a search and filter toolbar above the application cards.

Add this toolbar between the page header ("All Applications") and the first application card:

ROW 1 — Search bar, full width: A single search input field with a search icon on the left. Placeholder text: "Search by university, program, or country..." Rounded corners, 0.5px border, same style as other inputs in the app.

ROW 2 — Filter chips and action buttons, on the same horizontal line: Left side: Status filter chips — All · Not Started · In Progress · Ready to Submit · Submitted · Accepted · Rejected Right side: Two small outlined buttons — "Filter ▾" and "Sort ▾"

The Filter dropdown (when clicked) shows checkboxes for:

Country
Degree type (MSc / PhD / MBA / Other)
Funding available (Yes / No)
Deadline range (This month / Next 3 months / All)
The Sort dropdown shows radio options:

Nearest deadline (default)
Recently added
Progress high to low
Progress low to high
University name A–Z
Keep all existing application cards exactly as they are. Do not change card layout, content, or spacing. Only add the toolbar above them.

Add a small results count below the toolbar: "Showing 5 applications" in 13px grey text.

COLOUR UPDATE — apply these changes across the entire app, every screen:

Replace all existing black filled buttons and primary action buttons with indigo: #4F46E5 (background) with white text.

Replace all existing dark navy / black accent colours used for active states, selected nav items, and primary highlights with indigo #4F46E5.

Introduce these indigo tokens for the full system:

Primary: #4F46E5 (buttons, active nav, links, focus rings) Primary hover: #4338CA (button hover state) Primary light: #EEF2FF (badge backgrounds, pill backgrounds, subtle fills) Primary dark: #3730A3 (badge text, pill text on light fills) Primary border: #C7D2FE (borders on indigo-tinted elements)

Update these specific components across all screens:

All filled primary buttons → #4F46E5 background, white text
All outlined secondary buttons → #4F46E5 border and text, transparent background
Active sidebar navigation item → #EEF2FF background, #4F46E5 text, #4F46E5 left border (2px)
Status badges for "In Progress" and "Ready to Submit" → #EEF2FF background, #3730A3 text
All progress bars → #4F46E5 fill on light grey (#F1F5F9) track
Checklist checkboxes when checked → #4F46E5 fill, white checkmark
All hyperlinks and text links → #4F46E5
Focus rings on inputs → #4F46E5 at 30% opacity
Keep these colours exactly as they are — do not change them:

Submitted status badge → keep existing green
Accepted status badge → keep existing green
Rejected status badge → keep existing red
Urgent deadline indicators → keep existing red
Warning / soon deadline indicators → keep existing amber
Dark mode background → keep existing black
Light mode background → keep existing white
All body text colours → keep existing
Do not change any layouts, spacing, typography sizes, or component structures. Only update the accent colour instances listed above.

Apply the same indigo colour update from the previous prompt to all remaining pages in this file that still show black filled buttons or dark accent colours.

Update the School Application Workspace with these targeted changes:

WORKSPACE HEADER — keep exactly as is (school name, program, location, status badge, Mark as Submitted button). One change only: make the "Ready To_submit" status label read "Ready to Submit" (fix the underscore, proper capitalisation).

TABS — keep the existing 5 tabs in this exact order: Overview · Requirements Checklist · Documents · Notes · Portal Access. No tab changes.

OVERVIEW TAB — add one new section at the bottom of the existing content, below Quick Access: A "Checklist Snapshot" section showing the next 3 incomplete checklist items. Each item shows a checkbox (unchecked), the requirement name, and a small "Due [date]" label on the right. Below the 3 items, a link: "View full checklist →". This section is in a card with a subtle border, same style as the other overview cards.

REQUIREMENTS CHECKLIST TAB — add a progress bar at the very top of the tab content, before the first checklist item: A full-width progress bar: "X of Y requirements complete" label left-aligned, percentage right-aligned, green (#1D9E75) fill on a light grey (#F1EFE8) track, 8px height, fully rounded. Keep all existing checklist items, status dropdowns, Upload buttons, and Notes buttons exactly as they are.

DOCUMENTS TAB — keep "Reuse from Other Schools" section exactly as designed. Add a "Used in" counter to each document row showing how many applications reference that document, displayed as a small grey badge: "Used in 3 apps". Position it between the version info and the Download/Replace/Delete actions.

PORTAL ACCESS TAB — keep exactly as designed. No changes.

NOTES TAB — keep exactly as designed. No changes.

STATUS UPDATE MODAL — keep all 8 status options exactly as designed. No changes.

Do not change any colours, typography, spacing, or existing component styles.