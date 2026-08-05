import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is GradOS?",
        a: "GradOS is a graduate application management platform that helps you track, organise, and manage all your university applications in one place. Instead of juggling spreadsheets, emails, and browser tabs, GradOS gives you a dedicated workspace for every school you apply to."
      },
      {
        q: "Is GradOS free to use?",
        a: "Yes. GradOS is currently free during our beta period. We will announce pricing plans before the beta ends and give existing users advance notice."
      },
      {
        q: "How do I add a school to my dashboard?",
        a: "Click the '+ Add New School' button on your Dashboard or Applications page. Fill in the school name (use the autocomplete to find your school), program name, degree type, deadline, and application round. Click 'Create Application Workspace' and your school will appear on your dashboard immediately."
      },
      {
        q: "Can I use GradOS on my phone?",
        a: "Yes. GradOS is fully responsive and works on mobile phones and tablets. On mobile, use the bottom navigation bar to move between sections. Tap the + button to add a new school."
      },
      {
        q: "Can I install GradOS on my phone like an app?",
        a: "Yes. On Android, open GradOS in Chrome, tap the menu (three dots) in the top right, and choose 'Add to Home screen' or 'Install app'. On iPhone, open GradOS in Safari, tap the Share icon, then 'Add to Home Screen'. This adds a GradOS icon to your home screen that opens like a regular app, without needing to open a browser first."
      }
    ]
  },
  {
    category: "Applications & Workspace",
    questions: [
      {
        q: "What is an application workspace?",
        a: "Each school you add gets its own workspace — a dedicated space with six tabs: Overview (deadline and next steps), Requirements Checklist, Recommendations, Documents, Notes, and Portal Access. Everything related to that application lives in one place."
      },
      {
        q: "How do I track my application requirements?",
        a: "Open any school workspace and go to the Requirements Checklist tab. Click 'Generate default checklist' to automatically create a standard list of items including SOP, CV, transcripts, recommendation letters, and test scores. You can also add custom items. Check off items as you complete them."
      },
      {
        q: "How do I update my application status?",
        a: "In the school workspace, click the status badge in the header (e.g. 'In Progress'). A modal will appear with all status options: Not Started, In Progress, Ready to Submit, Submitted, Interview, Accepted, Rejected, and Waitlisted. Select the correct status and click Confirm."
      },
      {
        q: "Can I delete an application I added by mistake?",
        a: "Yes. Go to the Applications page, find the school card, and click the red trash icon next to the Edit button. You will be asked to confirm before the application and all its data is permanently deleted."
      },
      {
        q: "How do I add my portal link for each school?",
        a: "Open the school workspace and go to the Portal Access tab. Click Edit next to the portal URL field and paste the link to the school's application portal. Click Save. You can also add additional saved links like the department page, funding page, and faculty directory."
      }
    ]
  },
  {
    category: "Documents",
    questions: [
      {
        q: "How does the Document Hub work?",
        a: "The Document Hub is a centralised library for all your application documents. Upload your SOP, CV, transcripts, and other files once — then link them to individual school applications from the Documents tab in each workspace. This means you never have to re-upload the same document for multiple schools."
      },
      {
        q: "What file types can I upload?",
        a: "GradOS supports PDF, DOCX, and TXT files. The maximum file size is 25 MB per document and 50 MB total storage across all your documents on the free plan."
      },
      {
        q: "How do I attach a document to a specific school application?",
        a: "Go to the school workspace, click the Documents tab, then click 'Browse Document Library'. This opens your Document Hub and lets you link any existing document to that application. You can also upload a new document directly from the workspace Documents tab."
      },
      {
        q: "Can I keep multiple versions of the same document?",
        a: "Yes. Each document in the Document Hub tracks its version number. When you upload an updated version of a document, it is saved alongside the previous version with the version number incremented automatically."
      }
    ]
  },
  {
    category: "Deadlines & Reminders",
    questions: [
      {
        q: "How does the Deadline Tracker work?",
        a: "The Deadlines page shows all your application deadlines in one view, grouped by urgency: Urgent (within 7 days), Soon (8-30 days), Upcoming (31-60 days), and Future (more than 60 days). Deadlines are colour-coded so you can see at a glance what needs attention. You can also export all your deadlines as a calendar file (.ics) to import into Google Calendar, Apple Calendar, or Outlook."
      },
      {
        q: "Can I get email reminders for upcoming deadlines?",
        a: "Yes. Go to Settings and turn on Email deadline reminders. You can choose exactly which days you want to be reminded — for example 1 month, 2 weeks, 1 week, 3 days, and 1 day before a deadline, or any custom number of months, weeks, or days you prefer. Reminders are sent once daily by email for any deadline matching your chosen schedule."
      },
      {
        q: "Why can't I set an email reminder in hours or minutes?",
        a: "Email reminders are checked once per day, so they work at the level of days rather than hours or minutes. If you need a reminder at a specific time of day, use Sync to Google Calendar or Export .ics instead — those support hour and minute-level reminders through your calendar app."
      },
      {
        q: "What does the deadline colour coding mean?",
        a: "Red means the deadline is within 7 days and needs immediate attention. Amber means 8 to 30 days away. Blue means 31 to 60 days away. Green means more than 60 days away. Deadlines with no date set show as grey."
      },
      {
        q: "What is the difference between Export .ics and Sync to Google Calendar?",
        a: "Export .ics downloads a calendar file you can import into Apple Calendar, Outlook, or most other calendar apps. Sync to Google Calendar is a separate option built specifically for Google Calendar users, since Google Calendar discards custom reminders from imported files. If you use Google Calendar on Android or the web, use Sync to Google Calendar. If you use Apple Calendar, Outlook, or another app, use Export .ics."
      },
      {
        q: "Why did Sync to Google Calendar ask for permission to my calendar?",
        a: "GradOS needs permission to create and update deadline events directly in your Google Calendar. This is a one-time authorisation each time you sync. GradOS only creates and updates events for your application deadlines — it cannot see or modify anything else already in your calendar."
      },
      {
        q: "I synced twice and now have duplicate events. How do I fix this?",
        a: "Open the Export calendar modal on the Deadlines page and click 'Having duplicate events? Clear all synced events'. This removes every deadline event GradOS has created in your Google Calendar. Afterwards, click Sync to Google Calendar again to recreate them cleanly."
      },
      {
        q: "Can I set a custom reminder time, like 2 months before a deadline?",
        a: "Yes. In the Export calendar modal, below the preset reminder options, there is a custom reminder section where you can enter any number of months, weeks, days, hours, or minutes before the deadline. Click Add to include it alongside your other selected reminders."
      }
    ]
  },
  {
    category: "Profile & Account",
    questions: [
      {
        q: "What is the Universal Profile?",
        a: "Your Universal Profile is a single place to store all your academic and personal information — your name, nationality, current institution, GPA, test scores, research interests, work experience, and education history. Fill it in once and it will be referenced across your applications."
      },
      {
        q: "How do I change my password?",
        a: "Go to Settings, find the Security section, and click 'Change password'. Enter your current password and your new password, then click Update. You will receive a confirmation that your password has been changed."
      },
      {
        q: "Can I use Google to sign in?",
        a: "Yes. On the sign in and sign up pages, click 'Continue with Google' to sign in or create an account using your Google credentials. No separate password is needed."
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings, scroll to the Security section, and click 'Delete account'. You will be asked to confirm. Note that deleting your account permanently removes all your applications, documents, profile data, and notes. This action cannot be undone."
      },
      {
        q: "Is my data secure?",
        a: "Yes. GradOS uses Supabase for data storage, which provides enterprise-grade security with row-level security policies. Your data is only accessible to you — other users cannot see your applications, documents, or profile. All connections are encrypted with HTTPS."
      }
    ]
  },
  {
    category: "Technical",
    questions: [
      {
        q: "Why is my data not loading?",
        a: "If you see a 'No internet connection' message or your data is not loading, check your internet connection. GradOS requires an active internet connection to load your data from the cloud. Your data is stored safely and will appear as soon as your connection is restored."
      },
      {
        q: "I added a school but it is not appearing. What should I do?",
        a: "Try refreshing the page. If the school still does not appear, sign out and sign back in. If the problem persists, use the Report a bug option in Settings to let us know."
      },
      {
        q: "Does GradOS work offline?",
        a: "GradOS requires an internet connection to load and save your data. If you go offline, you will see a message explaining that your data is safe and will reload when your connection is restored. Offline editing is not currently supported."
      }
    ]
  }
];

export function FAQModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  // If modal closes, reset open question state
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => setOpenQuestion(null), 200); // Wait for modal close transition
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[85vh] overflow-y-auto sm:rounded-xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl">Frequently Asked Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pb-6">
          {FAQS.map((category) => (
            <div key={category.category}>
              <h3 className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 px-1">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.questions.map((faq) => {
                  const isOpen = openQuestion === faq.q;
                  return (
                    <div
                      key={faq.q}
                      className="border border-border rounded-lg overflow-hidden bg-card transition-colors duration-200"
                    >
                      <button
                        className="w-full flex items-center justify-between p-4 text-left text-sm font-medium hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:bg-muted/50"
                        onClick={() => setOpenQuestion(isOpen ? null : faq.q)}
                      >
                        <span className="pr-4">{faq.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="p-4 pt-0 text-[13px] text-muted-foreground leading-relaxed">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
