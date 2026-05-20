Add three authentication screens to this app. These are the entry point 
before any other screen is accessible. Style them consistently with the 
existing GradOS design system — white background in light mode, dark 
background in dark mode, indigo (#4F46E5) as the primary accent colour, 
same font, same border radius, same card style.

--- SCREEN 1: SIGN IN ---

Page layout: Centred card on a light grey (#F8F8F8) background in light mode, 
dark background in dark mode. Card width 420px, padding 40px, white background, 
border-radius 16px, 0.5px border.

Header inside card:
- GradOS logo mark (small square with rounded corners, indigo background, 
  white "G") at the top centre, 44px
- Heading: "Welcome back" — 22px, weight 500
- Subtext: "Sign in to your GradOS account" — 14px, grey

Fields:
- Email address — full width text input, label above, placeholder 
  "you@email.com"
- Password — full width password input, label above, placeholder "••••••••", 
  show/hide toggle on the right side of the field

Below the password field, right-aligned: "Forgot password?" link in indigo 
(#4F46E5), 13px.

Buttons:
- Primary: "Sign in" — full width, indigo (#4F46E5) background, white text, 
  44px height
- Divider: a horizontal line with "or" centred in grey text between the two 
  buttons
- Secondary: "Continue with Google" — full width, white background, 0.5px 
  border, Google logo icon on the left, dark text, 44px height

Footer inside card:
"Don't have an account? Sign up" — 13px, grey. "Sign up" is an indigo link 
that navigates to the Sign Up screen.

Clicking "Sign in" navigates to the Dashboard.
Clicking "Continue with Google" navigates to the Dashboard.
Clicking "Sign up" navigates to the Sign Up screen.
Clicking "Forgot password?" navigates to the Password Reset screen.

--- SCREEN 2: SIGN UP ---

Same card layout as Sign In.

Header:
- GradOS logo mark, same as Sign In
- Heading: "Create your account" — 22px, weight 500
- Subtext: "Free to start. No credit card needed." — 14px, grey

Fields in this order:
- First name and Last name — two inputs side by side, 50/50 split
- Email address — full width
- Password — full width with show/hide toggle
- Confirm password — full width with show/hide toggle

Below confirm password: a small checkbox with label text: 
"I agree to the Terms of Service and Privacy Policy" — 13px. 
"Terms of Service" and "Privacy Policy" are indigo links.

Buttons:
- Primary: "Create account" — full width, indigo, white text, 44px height
- Divider with "or"
- "Continue with Google" — same as Sign In screen

Footer: "Already have an account? Sign in" — "Sign in" is an indigo link to 
the Sign In screen.

Clicking "Create account" navigates to an Onboarding screen (screen 3 below).
Clicking "Continue with Google" also navigates to Onboarding.

--- SCREEN 3: ONBOARDING — PROFILE SETUP ---

This screen appears only on first sign up, never again after that.

Layout: Same centred card, wider at 560px.

Progress indicator at the top of the card: 3 steps in a horizontal stepper.
Step 1: "Account" — completed (green checkmark)
Step 2: "Your profile" — active (indigo filled circle with "2")
Step 3: "Done" — inactive (grey circle with "3")

Heading: "Tell us about yourself" — 20px, weight 500
Subtext: "This information helps personalise your experience. You can update 
it anytime." — 14px, grey

Fields in a 2-column grid:
- Intended degree type (select): MSc / PhD / MBA / Other
- Intended start term (select): Fall 2025 / Spring 2026 / Fall 2026 / Other
- Current institution (text input): placeholder "University of Lagos"
- Field of study (text input): placeholder "Computer Science"
- Nationality (text input): placeholder "Nigerian"
- GRE taken? (select): Yes / No / Not required for my programs

Conditional — show only if GRE = Yes:
Three inputs in a row: GRE Verbal / GRE Quant / GRE AWA — each 1/3 width.

Two buttons at the bottom, right-aligned:
- "Skip for now" — outlined, grey text
- "Save and continue →" — indigo filled

Clicking either button navigates to the Dashboard with a welcome toast 
notification at the top right: "Welcome to GradOS, [First name] 👋 — 
Add your first school to get started." Auto-dismisses after 4 seconds.

--- SCREEN 4: FORGOT PASSWORD ---

Same small centred card as Sign In, 420px.

Header:
- Heading: "Reset your password" — 20px, weight 500
- Subtext: "Enter your email and we'll send you a reset link." — 14px, grey

Fields:
- Email address — full width input

Button: "Send reset link" — full width, indigo, white text, 44px height

Below button: "Back to sign in" — indigo link, centred, 13px

Clicking "Send reset link" shows a success state inside the same card:
- Green checkmark icon (24px)
- Heading: "Check your inbox"
- Subtext: "We've sent a reset link to your email address. It expires in 
  30 minutes."
- Link: "Resend email" in indigo
- Link: "Back to sign in" in indigo

Make sure the Sign In screen is the first screen that appears when the app 
loads — it is the entry point. The Dashboard and all other screens should 
only be accessible after signing in.