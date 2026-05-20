Make the entire GradOS app fully responsive across three breakpoints: 
desktop (1024px and above), tablet (768px to 1023px), and mobile 
(below 768px). Apply these layout changes at each breakpoint across 
every screen in the app.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESKTOP (1024px and above)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keep everything exactly as currently designed. No changes to desktop 
layout. This is the baseline.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLET (768px to 1023px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SIDEBAR — collapse to icon-only rail:
- Reduce sidebar width from 240px to 64px
- Hide all text labels from nav items — show only the icon, centred
- Hide the "GradOS" wordmark and "Graduate Application OS" subtitle
- Show only the GradOS logo mark (small indigo square, white G) 
  centred at the top of the rail, 36px
- Keep all icons visible and clickable — clicking navigates to that 
  page as normal
- Add a tooltip on hover for each icon showing the page name, 
  appearing to the right of the icon
- Keep the Theme toggle icon at the bottom of the rail
- Keep the Settings icon at the bottom of the rail
- The icon rail has the same background colour as the full sidebar

MAIN CONTENT AREA — adapts to the extra space:
- Dashboard summary strip: stays 4 cards in a row but reduce card 
  padding to 12px
- Dashboard two-column layout (Upcoming Deadlines + Recent 
  Applications): stays side by side but at 55/45 split, reduced 
  padding
- All Applications cards: stay full width, no changes needed
- School Workspace tabs: tabs may wrap to two rows if they overflow — 
  allow wrapping, do not hide tabs
- Documents Hub table: reduce column padding, keep all columns visible
- Profile tabs: stay horizontal, allow horizontal scroll if they 
  overflow

ADD a hamburger menu button (☰) at the top left of the main content 
area header on tablet. Tapping it expands the sidebar from 64px back 
to 240px as a full overlay panel on top of the content, with a 
semi-transparent dark backdrop behind it. Tapping the backdrop or 
pressing × closes it back to icon-only rail.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MOBILE (below 768px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REMOVE THE SIDEBAR ENTIRELY on mobile. Replace it with two 
navigation elements:

1. TOP BAR — fixed at the top of every screen:
Height: 52px
Left side: GradOS logo mark (indigo square, white G, 32px)
Centre: Current page name — 15px, weight 500, dark text
Right side: a circular avatar/initials button (32px) showing the 
user's initials. Tapping it opens a slide-up drawer with:
- User name and email at the top
- Links: Edit Profile, Settings, Sign Out
- Close handle at the top of the drawer

2. BOTTOM NAVIGATION BAR — fixed at the bottom of every screen:
Height: 60px + safe area inset (for iPhone notch)
Background: white in light mode, dark in dark mode
Top border: 0.5px border
Shows exactly 5 items evenly spaced:

  Dashboard    Applications    Deadlines    Documents    Profile
  (grid icon)  (list icon)     (calendar)   (file icon)  (person)

Each item:
- Icon centred, 22px, grey when inactive
- Label below icon, 10px, grey when inactive
- When active: icon and label both indigo (#4F46E5), small indigo 
  dot (4px circle) above the icon
- Tap navigates to that screen
- No Settings in the bottom bar — Settings is accessible from the 
  avatar drawer in the top bar

MOBILE LAYOUT CHANGES — apply to every screen:

GENERAL:
- All page content has 16px horizontal padding (left and right)
- All cards stack to full width (100%), single column
- All multi-column grids collapse to single column
- Font sizes stay the same — do not reduce font sizes on mobile
- All buttons are minimum 44px tall (tap target size)
- All input fields are minimum 44px tall
- Top bar + bottom nav are always fixed — page content scrolls 
  between them

DASHBOARD — mobile layout:
- Summary strip: 2×2 grid (2 cards per row, 2 rows), full width, 
  gap 10px
- Upcoming Deadlines section: full width, stacked list, no side 
  by side
- Recent Applications section: full width, below Upcoming Deadlines
- Quick Actions bar: horizontal scroll — buttons in a single row 
  that scrolls horizontally if they overflow
- Floating Action Button (FAB): a 52px circle, indigo fill, white 
  + icon, fixed at bottom right of screen, 16px from right edge, 
  72px from bottom (above the bottom nav). Tapping opens the Add 
  New School modal. This replaces the "+ Add New School" header 
  button on mobile.

ADD NEW SCHOOL MODAL — mobile:
- Full screen bottom sheet instead of a centred modal
- Slides up from the bottom of the screen covering 90% of the 
  screen height
- Has a drag handle at the top (short grey bar, 4px tall, 40px 
  wide, centred)
- Scrollable internally if content overflows
- "Create Application Workspace" button is sticky at the bottom 
  of the sheet, always visible

ALL APPLICATIONS — mobile layout:
- Search bar: full width
- Status filter chips: horizontal scroll row, do not wrap
- Filter and Sort buttons: side by side below the chips, each 
  50% width
- Application cards: full width, stacked. Simplify each card 
  slightly on mobile:
  Show: school name, program, deadline, days left badge, status 
  badge, progress bar
  Move "View →" button to full width below the progress bar
  Hide the Edit button — access edit via a long press or a ⋯ 
  menu button at the top right of each card

SCHOOL WORKSPACE — mobile layout:
- Header: school name and program stack vertically, status badge 
  and Mark as Submitted button stack below on separate row
- Tabs: horizontal scrollable tab bar, do not wrap or hide tabs. 
  Active tab has indigo underline. User swipes to see all tabs.
- Overview tab: all stat cards stack to full width, single column. 
  Quick Info and Application Status sections stack vertically.
- Requirements Checklist tab: each checklist item is full width. 
  Upload and Notes buttons shrink to icon-only on mobile (upload 
  icon and notes icon) with tooltips on long press.
- Documents tab: each document row is full width. Action buttons 
  (Download, Replace, Delete) collapse into a ⋯ menu button on 
  the right of each row.
- Notes tab: full width editor, same functionality.
- Recommendations tab: recommender detail fields stack vertically 
  within each card. Each field is full width.
- Portal Access tab: portal link button is full width.

DEADLINES — mobile layout:
- The 4 urgency summary cards (Urgent, Soon, Upcoming, Future): 
  2×2 grid, same as dashboard summary strip
- Filter dropdowns: stack vertically, each full width
- Deadline cards: full width, stacked. Show school, program, 
  deadline date, days left badge, and status. Tapping the card 
  navigates to the workspace.
- Export .ics button: full width, at the bottom of the page

DOCUMENTS HUB — mobile layout:
- Search bar: full width
- Category filter tabs: horizontal scrollable row
- Document rows: full width. Each row shows file icon, name, and 
  type badge. Action icons (copy, download, delete) stay on the 
  right. If too crowded, collapse into a ⋯ menu.
- Upload button: full width at the top, below the search bar

PROFILE — mobile layout:
- Profile completion bar: full width
- Section tabs (Personal, Education, Test Scores, Research, 
  Experience): horizontal scrollable row
- All form fields: full width, stacked vertically
- Research interest tags: wrap naturally
- Save changes button: full width, sticky at the bottom of 
  the screen while editing

SETTINGS — mobile layout:
- All section cards: full width, stacked
- Toggle rows: label on left, toggle on right, full width
- All buttons (Change password, Export CSV, Delete account): 
  full width

AUTH SCREENS — mobile layout:
- Sign In, Sign Up, Forgot Password cards: no card border on 
  mobile — full screen layout with 24px padding on all sides
- Logo mark centred at top with 40px margin
- All inputs and buttons full width
- Onboarding screen: fields stack to single column, full width

DARK MODE — all mobile layouts must work correctly in both 
light and dark mode. The bottom navigation bar and top bar 
must use the correct background colour for each mode.