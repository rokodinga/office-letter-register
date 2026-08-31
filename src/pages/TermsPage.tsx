import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/login" className="text-2xl font-bold text-blue-900">
            Office Letter Register
          </Link>
          <Link
            to="/login"
            className="text-blue-700 hover:text-blue-900 inline-flex items-center gap-2 font-semibold"
          >
            <ArrowLeft size={18} />
            Back to Login
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <article className="bg-white rounded-2xl shadow-sm border p-7 md:p-10">
          <div className="flex items-start gap-4 mb-8">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Terms of Service
              </h1>
              <p className="mt-2 text-slate-500">Last updated: August 31, 2026</p>
            </div>
          </div>

          <div className="space-y-8 leading-7">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of These Terms</h2>
              <p>
                These Terms of Service ("Terms") govern your access to and use of Office
                Letter Register ("Application", "we", "us", or "our"). By accessing or
                using the Application, you agree to these Terms. If you do not agree,
                please do not use the Application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Purpose of the Application</h2>
              <p>
                Office Letter Register is an office correspondence management system
                designed to help authorized personnel maintain records of incoming and
                outgoing official letters, review correspondence, link supporting
                documents, search records, and generate reports.
              </p>
              <p className="mt-3">
                The Application may provide Gmail synchronization to help authorized
                users identify relevant official correspondence. Synchronization does
                not by itself make an email an official office record; authorized users
                remain responsible for reviewing and registering correspondence as
                appropriate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Eligibility and Authorized Use</h2>
              <p>
                You may use the Application only if you are authorized to access it and
                have the right to use the Google Account, Gmail account, or other
                credentials connected to the Application.
              </p>
              <p className="mt-3">
                You are responsible for maintaining the confidentiality of your
                credentials and for activity performed through your account. You must
                promptly report suspected unauthorized access or security incidents to
                the Application administrator.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Acceptable Use</h2>
              <p>You agree to use the Application only for lawful and authorized purposes. You must not:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>access records or accounts without authorization;</li>
                <li>attempt to bypass authentication, authorization, or security controls;</li>
                <li>knowingly upload malicious code or harmful content;</li>
                <li>use the Application to violate applicable law, regulations, or official policies;</li>
                <li>interfere with the availability, integrity, or security of the Application; or</li>
                <li>use another person's credentials or Google Account without authorization.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Gmail and Google Services</h2>
              <p>
                If you connect Gmail, you authorize the Application to access the
                Google data and Gmail scopes presented to you during the Google OAuth
                consent process. Gmail access is used to provide the Application's
                correspondence-management features and is subject to Google's
                applicable policies.
              </p>
              <p className="mt-3">
                The Application's current Gmail synchronization feature is intended to
                use read-only Gmail access. You may revoke the authorization at any
                time through your Google Account security settings or through an
                available disconnect function in the Application.
              </p>
              <p className="mt-3">
                For information about how Google information is handled, please read
                our <Link to="/privacy" className="text-blue-700 font-semibold hover:underline">Privacy Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Office Records and User Content</h2>
              <p>
                Users may enter letter numbers, dates, sender or addressee information,
                subjects, file numbers, references, remarks, attachments, and other
                office correspondence information. Users and the relevant office remain
                responsible for the accuracy, completeness, classification, retention,
                and lawful handling of records entered into the Application.
              </p>
              <p className="mt-3">
                You should not enter information that you are not authorized to store or
                process through the Application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Data Protection and Privacy</h2>
              <p>
                Our collection and handling of personal information and Google user
                data are described in the Privacy Policy. By using the Application,
                you acknowledge that information may be processed as necessary to
                provide authentication, correspondence management, Gmail
                synchronization, record storage, search, and reporting features.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Official Records and Retention</h2>
              <p>
                The Application is a record-management tool and does not determine
                whether a particular communication is legally or administratively an
                official record. Authorized office personnel are responsible for
                applying the applicable office procedures, record-retention schedules,
                approvals, and archival requirements.
              </p>
              <p className="mt-3">
                Deleting or disconnecting a Google account or Gmail authorization does
                not necessarily delete official office records that have already been
                registered or retained for legitimate administrative, legal, or
                archival purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Security</h2>
              <p>
                We use reasonable technical and organizational measures intended to
                protect the Application and information handled through it. However,
                no internet service or electronic storage system can be guaranteed to
                be completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Third-Party Services</h2>
              <p>
                The Application may depend on third-party services, including Google,
                Firebase/Google Cloud, Gmail API, and Vercel. Those services may have
                separate terms, policies, availability limitations, and security
                practices. Your use of those services may also be subject to their
                respective terms and policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Availability and Changes</h2>
              <p>
                We may modify, suspend, or discontinue features of the Application when
                necessary for maintenance, security, legal compliance, upgrades, or
                operational reasons. We may also update these Terms when the
                Application or its requirements change.
              </p>
              <p className="mt-3">
                The "Last updated" date at the top of this page indicates when these
                Terms were most recently revised.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">12. Disclaimer</h2>
              <p>
                The Application is provided as an office management tool. To the extent
                permitted by applicable law, we do not guarantee that the Application
                will be uninterrupted, error-free, or suitable for every particular
                administrative or record-management purpose.
              </p>
              <p className="mt-3">
                Users should verify important correspondence and register information
                before relying on it for official action.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">13. Limitation of Liability</h2>
              <p>
                To the extent permitted by applicable law, we are not responsible for
                losses arising from unauthorized use of an account, inaccurate user
                entries, third-party service outages, network failures, or circumstances
                outside our reasonable control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">14. Termination or Suspension</h2>
              <p>
                Access may be suspended or terminated where an account is used without
                authorization, these Terms are violated, security is at risk, or
                continued access is otherwise inappropriate or required to be
                restricted by the relevant administrator.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">15. Contact</h2>
              <p>
                For questions about these Terms, the Application, Gmail integration,
                account access, or data handling, contact:
              </p>
              <div className="mt-3 rounded-xl bg-slate-50 border p-4">
                <p className="font-semibold">Office Letter Register</p>
                <p>Email: rokodinga@gmail.com</p>
              </div>
            </section>

            <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h2 className="text-lg font-bold text-blue-950 mb-2">Related Policy</h2>
              <p className="text-blue-900">
                Please also review our{' '}
                <Link to="/privacy" className="font-semibold underline hover:no-underline">
                  Privacy Policy
                </Link>{' '}
                for information about Google account data, Gmail access, storage,
                sharing, retention, and deletion.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
