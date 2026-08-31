import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function PrivacyPage() {
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
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Privacy Policy
              </h1>
              <p className="mt-2 text-slate-500">Last updated: August 31, 2026</p>
            </div>
          </div>

          <div className="space-y-8 leading-7">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p>
                Office Letter Register ("Application", "we", "us", or "our") is an
                office correspondence management application for maintaining records of
                incoming and outgoing official letters and related information.
              </p>
              <p className="mt-3">
                This Privacy Policy explains how the Application collects, accesses,
                uses, stores, protects, and deletes information when you use the
                Application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                2. Information We Access
              </h2>

              <h3 className="font-semibold text-slate-900 mb-2">2.1 Google Account Information</h3>
              <p>
                When you sign in with Google, the Application may receive basic Google
                account information needed to authenticate you and associate your
                account with an Office Letter Register user profile, such as your email
                address, name where provided, Google account identifier, and
                authentication information.
              </p>

              <h3 className="font-semibold text-slate-900 mt-5 mb-2">2.2 Gmail Information</h3>
              <p>
                The Application may request read-only access to the connected Gmail
                account through the Gmail API using the following scope:
              </p>
              <div className="my-3 rounded-lg bg-slate-50 border p-4 font-mono text-sm break-all">
                https://www.googleapis.com/auth/gmail.readonly
              </div>
              <p>
                This access is used for the Gmail synchronization feature. Depending on
                the messages synchronized, the Application may access sender and
                recipient addresses, subject, date and time, message content, message
                identifiers, labels or other message metadata, and attachment
                information associated with correspondence.
              </p>

              <h3 className="font-semibold text-slate-900 mt-5 mb-2">
                2.3 Office Letter Register Information
              </h3>
              <p>
                Users may enter and manage incoming and outgoing letter details,
                including letter or dispatch numbers, dates, sender/addressee,
                subjects, file numbers, references, remarks, status, and links or
                references to supporting documents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                3. How We Use Google User Data
              </h2>
              <p>
                Google user data obtained through Google APIs is used only to provide
                the Application's correspondence-management functionality. Gmail data
                may be used to synchronize official correspondence, display it for
                review, prefill register fields, allow authorized users to register
                appropriate correspondence, maintain office records, and generate
                requested register reports.
              </p>
              <p className="mt-3">
                We do not sell Google user data. We do not use Google user data for
                advertising or advertising profiling, and we do not use it for
                unrelated purposes.
              </p>
              <p className="mt-3">
                Our use of information received from Google APIs will comply with the
                Google API Services User Data Policy, including its Limited Use
                requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                4. Gmail Synchronization
              </h2>
              <p>
                Gmail synchronization is intended to help authorized users identify
                official correspondence received or sent through the connected Gmail
                account. Where filtering is configured, the synchronization process is
                intended to restrict imported correspondence to the configured
                official sender or domain criteria and the Primary inbox or other
                configured source.
              </p>
              <p className="mt-3">
                Synchronization does not automatically make an email an official
                Incoming Dak or Outgoing Letter Register record. Where applicable, an
                authorized user reviews and approves correspondence before it becomes
                an official register entry.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                5. Read-Only Gmail Access
              </h2>
              <p>
                The Application requests Gmail read-only access. It does not use that
                Gmail permission to send, delete, or modify Gmail messages, change
                Gmail settings, or delete or modify the user's Google Account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                6. Storage of Information
              </h2>
              <p>
                Information retrieved from Gmail may be stored in the Application's
                database when necessary to provide correspondence-management
                functionality. Stored correspondence may be used for review, letter
                registration, search, linking correspondence to office records, and
                report generation.
              </p>
              <p className="mt-3">
                We seek to limit stored information to information reasonably necessary
                for these functions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                7. Information Sharing
              </h2>
              <p>
                We do not sell or rent personal information or Google user data. We do
                not share Google user data with third parties except where necessary to
                operate the Application, provide required infrastructure or services,
                comply with applicable law or valid legal process, or protect the
                security, rights, or property of the Application, its users, or others.
              </p>
              <p className="mt-3">
                Service providers that process information on our behalf are expected
                to process it only for purposes necessary to provide their services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                8. Data Security
              </h2>
              <p>
                We use reasonable technical and organizational measures to protect
                information handled by the Application. These measures may include
                authentication and authorization controls, role-based access controls,
                encrypted HTTPS/TLS connections, secure OAuth credential handling,
                restricted administrative access, and security maintenance.
              </p>
              <p className="mt-3">
                No internet-based service can guarantee absolute security. We cannot
                guarantee that information will never be accessed, disclosed, altered,
                or destroyed as a result of circumstances beyond our reasonable control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                9. Access Control
              </h2>
              <p>
                Office Letter Register uses authentication and authorization controls
                to restrict access to office records. Administrative functions may be
                limited to authorized administrators, and users may access information
                according to their assigned role and the Application's access-control
                rules.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                10. Data Retention
              </h2>
              <p>
                We retain information for as long as reasonably necessary to provide
                the Application's functionality and maintain office correspondence
                records. Official office records may need to be retained for
                administrative, legal, archival, or record-management purposes.
              </p>
              <p className="mt-3">
                Gmail synchronization data that is no longer required for the
                Application's functionality may be removed according to the
                Application's data-retention procedures.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                11. Revoking Gmail Access
              </h2>
              <p>
                You can revoke the Application's access to your Google Account through
                your Google Account security settings. You may also use the disconnect
                option in Office Letter Register where available.
              </p>
              <p className="mt-3">
                Revoking authorization prevents the Application from obtaining new
                Gmail data through that authorization. Information already stored in
                the Office Letter Register may remain where it constitutes an office
                record or is otherwise required for legitimate record-management
                purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                12. Requesting Data Deletion
              </h2>
              <p>
                You may request deletion of personal information associated with your
                use of Office Letter Register, subject to legitimate legal,
                administrative, security, or record-retention requirements.
              </p>
              <p className="mt-3">
                To request deletion or ask questions about information associated with
                your account, contact:
              </p>
              <p className="mt-2 font-semibold text-blue-800">rokodinga@gmail.com</p>
              <p className="mt-3">
                Where information must be retained because it constitutes an official
                office record or is required by law, we may retain it for the
                applicable retention period.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                13. Children's Privacy
              </h2>
              <p>
                Office Letter Register is intended for authorized office personnel and
                is not directed toward children. We do not knowingly collect personal
                information from children for purposes unrelated to operating the
                Application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                14. Third-Party Services
              </h2>
              <p>
                The Application may use third-party services necessary to operate its
                features, including Google APIs and Gmail API for authentication and
                Gmail synchronization, Google Cloud/Firebase for application and data
                services, and Vercel for hosting and deployment.
              </p>
              <p className="mt-3">
                Those services may process information according to their own terms and
                privacy policies. Our use of Google APIs is subject to the Google API
                Services User Data Policy and applicable Limited Use requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">
                15. Changes to This Privacy Policy
              </h2>
              <p>
                We may update this Privacy Policy when the Application's functionality,
                data practices, legal requirements, or security practices change. When
                significant changes are made, we will update the "Last updated" date at
                the top of this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">16. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, Google data access,
                Gmail synchronization, data deletion, or your information, contact:
              </p>
              <div className="mt-3 rounded-xl bg-slate-50 border p-4">
                <p className="font-semibold">Office Letter Register</p>
                <p>Email: rokodinga@gmail.com</p>
                <p>Application: Office Letter Register</p>
              </div>
            </section>

            <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h2 className="text-lg font-bold text-blue-950 mb-2">
                Google API Limited Use Disclosure
              </h2>
              <p className="text-blue-900">
                Office Letter Register's use and transfer of information received from
                Google APIs will adhere to the Google API Services User Data Policy,
                including the Limited Use requirements.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
