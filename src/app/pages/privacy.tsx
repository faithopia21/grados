import { useNavigate } from 'react-router'
import { ChevronLeft, X } from 'lucide-react'
import gradosLogo from '../../assets/logo.svg'

export function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F8F8F8] dark:bg-background">

      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <img
            src={gradosLogo}
            alt="GradOS"
            className="h-8 w-auto object-contain"
          />
          {window.opener ? (
            <button
              onClick={() => window.close()}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
              Close
            </button>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">

        <h1 className="text-3xl font-semibold text-foreground mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: June 2026
        </p>

        <div className="space-y-8 text-sm text-foreground leading-relaxed">

          <section>
            <p>
              GradOS is a tool for managing graduate school applications. This
              policy explains what information we collect, why we collect it, and
              how it is handled. We have tried to write this plainly, without
              legal jargon, because we think you deserve to understand it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              What we collect
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <span className="text-foreground font-medium">
                  Account information.
                </span>{' '}
                When you sign up, we collect your name and email address. If you
                sign in with Google, we receive your name, email, and profile
                picture from Google.
              </p>
              <p>
                <span className="text-foreground font-medium">
                  Profile information.
                </span>{' '}
                Information you choose to add to your profile — your
                nationality, current institution, field of study, intended
                degree, test scores, research interests, work experience, and
                education history. All of this is optional and you can update or
                remove it at any time.
              </p>
              <p>
                <span className="text-foreground font-medium">
                  Application data.
                </span>{' '}
                The graduate schools and programmes you add, along with
                deadlines, statuses, checklists, notes, and any links you save.
                This is the core data GradOS exists to store on your behalf.
              </p>
              <p>
                <span className="text-foreground font-medium">
                  Documents.
                </span>{' '}
                Files you upload such as statements of purpose, CVs,
                transcripts, and writing samples. These are stored in a private
                storage bucket that only you can access.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              How we use it
            </h2>
            <p className="text-muted-foreground">
              We use the information you provide only to run GradOS for you.
              Your application data is used to display your dashboard, generate
              deadline reminders, and populate your profile. We do not use your
              data to train AI models, serve advertisements, or build profiles
              for third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Who can see your data
            </h2>
            <p className="text-muted-foreground">
              Only you. Your data is protected by row-level security policies in
              our database, which means no other user can access your
              applications, documents, or profile even if they knew your
              account existed. The GradOS team can access anonymised usage
              patterns for the purpose of improving the product, but not your
              personal application data or uploaded files.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Where your data is stored
            </h2>
            <p className="text-muted-foreground">
              GradOS uses Supabase for data storage and authentication, and
              Vercel for hosting. Both are reputable infrastructure providers
              with strong security practices. Data is stored on servers in the
              United States. If you are outside the United States, your data is
              transferred there when you use GradOS.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Data retention
            </h2>
            <p className="text-muted-foreground">
              Your data is kept for as long as your account is active. If you
              delete your account, all your application data, profile
              information, notes, and uploaded documents are permanently deleted
              from our database immediately. Your authentication record is
              removed from our system within 48 hours.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Your rights
            </h2>
            <div className="space-y-2 text-muted-foreground">
              <p>You can at any time:</p>
              <ul className="list-none space-y-1 pl-4">
                <li>— Update or delete your profile information</li>
                <li>— Delete individual applications or documents</li>
                <li>— Export all your application data as a PDF or CSV from Settings</li>
                <li>— Delete your entire account and all associated data from Settings</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Cookies and local storage
            </h2>
            <p className="text-muted-foreground">
              GradOS stores a small amount of information in your browser's
              local storage your session token (to keep you signed in), your
              theme preference (light or dark), and your last-used filter and
              sort settings. We do not use third-party tracking cookies or
              advertising cookies of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Beta period
            </h2>
            <p className="text-muted-foreground">
              GradOS is currently in beta. This means the product is still being
              developed and some features may change. We will update this policy
              if anything material changes about how we handle data, and we will
              notify active users by email if we do.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3">
              Contact
            </h2>
            <p className="text-muted-foreground">
              If you have questions about this policy or how your data is
              handled, you can reach us at{' '}
              <a
                href="mailto:mygrados.support@gmail.com"
                className="text-indigo-600 hover:underline"
              >
                mygrados.support@gmail.com
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
