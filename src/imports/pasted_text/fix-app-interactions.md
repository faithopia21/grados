Fix all broken navigation, buttons, dropdowns, and interactions across the 
entire app. Go through every screen and make sure the following all work 
correctly:

NAVIGATION — SIDEBAR
Clicking Dashboard navigates to the Dashboard screen.
Clicking Applications navigates to the All Applications screen.
Clicking Deadlines navigates to the Deadlines/Timeline screen.
Clicking Documents navigates to the Documents Hub screen.
Clicking Profile navigates to the Universal Profile screen.
Clicking Settings navigates to the Settings screen.
The currently active page should always be highlighted in the sidebar.

DASHBOARD
Clicking "Add New School" button opens the Add New School modal.
Clicking "View" on any Recent Applications card navigates to that school's 
workspace Overview tab.
Clicking "View Timeline" in Quick Actions navigates to the Deadlines screen.
Clicking "Update Profile" in Quick Actions navigates to the Profile screen.
Clicking "Manage Documents" in Quick Actions navigates to the Documents Hub.
Clicking any item in the Upcoming Deadlines list navigates to that school's 
workspace.

ADD NEW SCHOOL MODAL
Clicking "Cancel" closes the modal and returns to Dashboard.
Clicking "Create Application Workspace" closes the modal and navigates to the 
new school's workspace Overview tab.
The modal scrolls internally if content overflows — do not let it break the 
page layout.
Clicking outside the modal (on the dimmed backdrop) closes it.

ALL APPLICATIONS PAGE
Clicking "View →" on any application card navigates to that school's workspace 
Overview tab.
Clicking "Edit" on any application card opens the Add New School modal 
pre-filled with that school's data.
Clicking "Mark Submitted" changes that application's status to Submitted.
The status filter chips (All, Not Started, In Progress, Ready to Submit, 
Submitted, Accepted, Rejected) filter the visible cards when clicked. Only one 
chip is active at a time.
The "Filter ▾" button opens a dropdown with filter options.
The "Sort ▾" button opens a dropdown with sort options.
The search bar filters cards as the user types.

SCHOOL WORKSPACE
Clicking each tab (Overview, Requirements Checklist, Documents, Notes, Portal 
Access) switches to that tab's content. Only one tab is active at a time. The 
active tab is visually highlighted.
Clicking "← Back" or the back arrow navigates back to the All Applications page.
Clicking "Mark as Submitted" opens the Update Application Status modal.
Clicking "Ready to Submit" text link opens the Update Application Status modal.
Clicking "Open Application Portal" button opens the portal URL in a new tab.

UPDATE APPLICATION STATUS MODAL
Clicking any status option (Not Started, In Progress, Ready to Submit, 
Submitted, Interview, Accepted, Rejected, Waitlisted) selects it and highlights 
it visually.
Clicking "Cancel" closes the modal without saving.
Clicking outside the modal closes it.
After selecting a status, the modal should have a "Confirm" button that saves 
the selection, closes the modal, and updates the status badge in the workspace 
header.

REQUIREMENTS CHECKLIST TAB
Clicking the checkbox on any checklist item toggles it between checked and 
unchecked.
Clicking the status dropdown on any item opens a dropdown with options: Not 
Started, In Progress, Ready, Done.
Clicking "Upload" on any checklist item opens a file picker or the Documents 
modal.
Clicking "Notes" on any item opens a small inline notes input for that item.

DOCUMENTS TAB (inside workspace)
Clicking "Upload New" opens a file upload dialog.
Clicking "Download" on any document triggers a download.
Clicking "Replace" on any document opens a file picker to replace it.
Clicking "Delete" on any document removes it from the list after a confirmation.
Clicking "Browse Document Library" opens the global Documents Hub.

PORTAL ACCESS TAB
Clicking "Application Portal" button opens the URL in a new tab.
Clicking "Edit" on any saved link opens an inline edit field for that link.
Clicking the external link icon on any saved link opens that URL in a new tab.

NOTES TAB
The text area should be editable — clicking it should allow typing.
The formatting toolbar buttons (Bold, Italic, Underline, headings, lists) should 
apply formatting to selected text.

DOCUMENTS HUB PAGE
Clicking "Upload New Document" opens a file upload dialog.
Clicking the category filter tabs (All Documents, SOP Library, CV Library, 
Recommendations, Other) filters the document list.
The search bar filters documents as the user types.
Clicking the copy icon on any document duplicates it.
Clicking the download icon downloads it.
Clicking the delete icon removes it after a confirmation prompt.

DEADLINES PAGE
Clicking any deadline card navigates to that school's workspace.
The urgency filter cards at the top (Urgent, Soon, Upcoming, Future) filter the 
list when clicked.
The school, deadline type, and status dropdown filters work when changed.
Clicking "Export .ics" triggers a calendar file download.

PROFILE PAGE
Clicking each tab (Personal, Education, Test Scores, Research, Experience) 
switches to that section.
All input fields are editable — clicking them allows typing.
Research interest tags can be added by clicking "+ Add" and removed by clicking 
the × on each tag.
Changes are saved when the user clicks a "Save changes" button at the bottom of 
each section.

SETTINGS PAGE
All toggles, dropdowns, and input fields on the Settings page are interactive.
The Theme toggle switches between light and dark mode across the entire app.

GENERAL RULES FOR ALL SCREENS
Every primary button must have a visible hover state (slightly darker background).
Every clickable card must have a hover state (subtle border highlight or 
background change).
Every dropdown must open and close correctly.
Every modal must be closable by clicking outside it or pressing the × button.
No screen should be a dead end — every screen must have at least one way to 
navigate away.
Scroll behaviour: pages with long content should scroll vertically. No content 
should be hidden or cut off.