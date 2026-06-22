"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Upload, X, FileText } from "lucide-react";

type Step = "phone" | "otp" | "driver" | "vehicle" | "success";

const STEPS: Step[] = ["phone", "otp", "driver", "vehicle"];
const STEP_LABELS = ["Phone", "Verify", "Driver", "Vehicle"];

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

function FileField({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return onChange(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      alert("Only images (JPG, PNG, WEBP) and PDF are accepted.");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_SIZE) {
      alert("File must be under 5 MB.");
      e.target.value = "";
      return;
    }
    onChange(f);
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-gray-300 text-sm">{label}</Label>
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleChange}
        className="hidden"
      />
      {file ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-green-800 bg-green-950">
          <FileText size={14} className="text-green-400 flex-shrink-0" />
          <span className="text-xs text-green-300 truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={() => { onChange(null); if (ref.current) ref.current.value = ""; }}
            className="text-gray-500 hover:text-red-400 flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-md border border-dashed border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 transition-colors text-xs"
        >
          <Upload size={14} />
          Click to upload image or PDF
        </button>
      )}
    </div>
  );
}

export default function OnboardPage() {
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [testCode, setTestCode] = useState<string | null>(null);

  // OTP
  const [otp, setOtp] = useState("");

  // Driver details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nric, setNric] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseIssuedDate, setLicenseIssuedDate] = useState("");
  const [nricFile, setNricFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  // Vehicle details
  const [plateNumber, setPlateNumber] = useState("");
  const [isOwned, setIsOwned] = useState(false);
  const [rentalEndDate, setRentalEndDate] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [vehicleRegFile, setVehicleRegFile] = useState<File | null>(null);
  const [rentalAgreementFile, setRentalAgreementFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

  // Result
  const [isResubmission, setIsResubmission] = useState(false);

  function setErr(msg: string) { setError(msg); setLoading(false); }

  // ── Step 1: Send OTP ───────────────────────────────────────────────────────
  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error ?? "Failed to send code");
    setVerificationId(data.verificationId);
    setTestCode(data.testCode ?? null);
    setStep("otp");
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationId, code: otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error ?? "Verification failed");
    setStep("driver");
  }

  // ── Step 3: Driver details validation ────────────────────────────────────
  function submitDriver(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) return setErr("Name is required");
    if (!nric.trim()) return setErr("NRIC / ID number is required");
    if (!licenseNumber.trim()) return setErr("Driver license number is required");
    if (!licenseIssuedDate) return setErr("License issued date is required");
    if (!nricFile) return setErr("NRIC / ID document upload is required");
    if (!licenseFile) return setErr("Driver license document upload is required");
    setStep("vehicle");
  }

  // ── Step 4: Vehicle details + final submit ────────────────────────────────
  async function submitVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!plateNumber.trim()) return setErr("Vehicle plate number is required");
    if (!isOwned && !rentalEndDate) return setErr("Rental agreement end date is required");
    if (!insuranceCompany.trim()) return setErr("Insurance company is required");
    if (!insuranceExpiry) return setErr("Insurance expiry date is required");
    if (!vehicleRegFile) return setErr("Vehicle registration document upload is required");
    if (!isOwned && !rentalAgreementFile) return setErr("Rental agreement document upload is required");
    if (!insuranceFile) return setErr("Insurance document upload is required");

    setLoading(true);

    const form = new FormData();
    form.append("verificationId", verificationId);
    form.append("firstName", firstName.trim());
    form.append("lastName", lastName.trim());
    form.append("nric", nric.trim());
    form.append("licenseNumber", licenseNumber.trim());
    form.append("licenseIssuedDate", licenseIssuedDate);
    form.append("nricFile", nricFile!);
    form.append("licenseFile", licenseFile!);
    form.append("plateNumber", plateNumber.trim());
    form.append("isOwned", String(isOwned));
    if (!isOwned) form.append("rentalEndDate", rentalEndDate);
    form.append("insuranceCompany", insuranceCompany.trim());
    form.append("insuranceExpiry", insuranceExpiry);
    form.append("vehicleRegFile", vehicleRegFile!);
    if (!isOwned && rentalAgreementFile) form.append("rentalAgreementFile", rentalAgreementFile);
    form.append("insuranceFile", insuranceFile!);

    const res = await fetch("/api/onboarding/submit", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setErr(data.error ?? "Submission failed");
    setIsResubmission(data.isResubmission ?? false);
    setStep("success");
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="w-full max-w-lg">
      {/* Step indicator */}
      {step !== "success" && (
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                stepIndex > i ? "bg-green-700 text-white" :
                stepIndex === i ? "bg-white text-gray-950" :
                "bg-gray-800 text-gray-500"
              }`}>
                {stepIndex > i ? <CheckCircle size={12} /> : i + 1}
              </div>
              <span className={`text-xs ${stepIndex === i ? "text-white" : "text-gray-600"}`}>
                {STEP_LABELS[i]}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-800 w-4" />}
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Step 1: Phone ───────────────────────────────────────────────── */}
      {step === "phone" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Driver Registration</CardTitle>
            <p className="text-sm text-gray-500">Enter your WhatsApp number to begin.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300">WhatsApp number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+6591234567" required
                  className="bg-gray-800 border-gray-700 text-white" />
                <p className="text-xs text-gray-600">Include country code · Singapore: +65</p>
              </div>
              <Button type="submit" disabled={loading || !phone} className="w-full">
                {loading ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: OTP ─────────────────────────────────────────────────── */}
      {step === "otp" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Verify your number</CardTitle>
            <p className="text-sm text-gray-500">Code sent to {phone} via WhatsApp.</p>
          </CardHeader>
          <CardContent>
            {testCode && (
              <div className="mb-4 px-3 py-2 bg-yellow-950 border border-yellow-800 rounded-md">
                <p className="text-xs text-yellow-400 font-medium">Testing mode — OTP: <span className="font-mono text-sm">{testCode}</span></p>
              </div>
            )}
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300">6-digit code</Label>
                <Input value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" maxLength={6} inputMode="numeric" required
                  className="bg-gray-800 border-gray-700 text-white text-center text-lg tracking-widest font-mono" />
              </div>
              <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <button type="button"
                onClick={() => { setStep("phone"); setOtp(""); setTestCode(null); }}
                className="text-xs text-gray-500 hover:text-gray-300 w-full text-center">
                Use a different number
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Driver details ──────────────────────────────────────── */}
      {step === "driver" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Driver Information</CardTitle>
            <p className="text-sm text-gray-500">All fields and documents are required.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitDriver} className="space-y-5">
              {/* Personal details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-300">First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    required className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)}
                    required className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">NRIC / FIN No.</Label>
                <Input value={nric}
                  onChange={(e) => setNric(e.target.value.toUpperCase())}
                  placeholder="S1234567A" required
                  className="bg-gray-800 border-gray-700 text-white font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">Driver License No.</Label>
                <Input value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                  placeholder="SG12345678" required
                  className="bg-gray-800 border-gray-700 text-white font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">License Issued Date</Label>
                <Input type="date" value={licenseIssuedDate}
                  onChange={(e) => setLicenseIssuedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  required className="bg-gray-800 border-gray-700 text-white" />
              </div>

              {/* Document uploads */}
              <div className="border-t border-gray-800 pt-4 space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Documents</p>
                <FileField
                  label="NRIC / Identity Document"
                  hint="Upload a clear photo or scan of your NRIC / FIN card"
                  file={nricFile}
                  onChange={setNricFile}
                />
                <FileField
                  label="Driver License"
                  hint="Upload a clear photo or scan of your driving licence (front)"
                  file={licenseFile}
                  onChange={setLicenseFile}
                />
              </div>

              <Button type="submit" className="w-full">Continue to Vehicle Details</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Vehicle details ─────────────────────────────────────── */}
      {step === "vehicle" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Vehicle Information</CardTitle>
            <p className="text-sm text-gray-500">All fields and documents are required.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitVehicle} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-gray-300">Vehicle Registration Plate</Label>
                <Input value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="SBA1234A" required
                  className="bg-gray-800 border-gray-700 text-white font-mono" />
              </div>

              {/* Ownership toggle */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-gray-800 border border-gray-700">
                <input
                  type="checkbox"
                  id="isOwned"
                  checked={isOwned}
                  onChange={(e) => {
                    setIsOwned(e.target.checked);
                    if (e.target.checked) {
                      setRentalEndDate("");
                      setRentalAgreementFile(null);
                    }
                  }}
                  className="w-4 h-4 accent-white"
                />
                <label htmlFor="isOwned" className="text-sm text-gray-300 cursor-pointer">
                  I own this vehicle (skip rental agreement)
                </label>
              </div>

              {!isOwned && (
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Rental Agreement End Date</Label>
                  <Input type="date" value={rentalEndDate}
                    onChange={(e) => setRentalEndDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required={!isOwned}
                    className="bg-gray-800 border-gray-700 text-white" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-gray-300">Insurance Company</Label>
                <Input value={insuranceCompany}
                  onChange={(e) => setInsuranceCompany(e.target.value)}
                  placeholder="e.g. NTUC Income, FWD, Tokio Marine"
                  required className="bg-gray-800 border-gray-700 text-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">Insurance Expiry Date</Label>
                <Input type="date" value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required className="bg-gray-800 border-gray-700 text-white" />
              </div>

              {/* Vehicle document uploads */}
              <div className="border-t border-gray-800 pt-4 space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Documents</p>
                <FileField
                  label="Vehicle Registration Document"
                  hint="Upload your vehicle log card or registration certificate"
                  file={vehicleRegFile}
                  onChange={setVehicleRegFile}
                />
                {!isOwned && (
                  <FileField
                    label="Rental Agreement"
                    hint="Upload a copy of your vehicle rental / hire agreement"
                    file={rentalAgreementFile}
                    onChange={setRentalAgreementFile}
                  />
                )}
                <FileField
                  label="Insurance Certificate"
                  hint="Upload your vehicle insurance certificate or cover note"
                  file={insuranceFile}
                  onChange={setInsuranceFile}
                />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => { setStep("driver"); setError(null); }}>
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Success ─────────────────────────────────────────────────────── */}
      {step === "success" && (
        <Card className="bg-gray-900 border-gray-800 text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-900 border border-green-700 flex items-center justify-center">
              <CheckCircle className="text-green-400" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {isResubmission ? "Resubmission received" : "Application submitted"}
              </h2>
              <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                Your application is <span className="text-yellow-400 font-medium">pending review</span>. Our
                team will check your documents and notify you via WhatsApp within 2 business days.
              </p>
              {isResubmission && (
                <p className="text-xs text-gray-600 mt-3">
                  Your previous record has been updated with the new documents.
                </p>
              )}
            </div>
            <div className="mt-2 px-4 py-3 bg-gray-800 rounded-md text-left w-full">
              <p className="text-xs text-gray-400 font-medium mb-1">What happens next</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Admin reviews your driver and vehicle documents</li>
                <li>• You will receive a WhatsApp message when approved</li>
                <li>• If anything is unclear, we will message you with details</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
