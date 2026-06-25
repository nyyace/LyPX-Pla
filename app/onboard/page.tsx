"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Upload, X, FileText, ChevronDown, ChevronUp } from "lucide-react";

type Step = "phone" | "otp" | "form" | "success";
const STEPS: Step[] = ["phone", "otp", "form"];
const STEP_LABELS = ["Phone", "Verify", "Details"];

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;
const TODAY = new Date().toISOString().split("T")[0];

function FileField({
  label,
  hint,
  file,
  onChange,
  required = true,
}: {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return onChange(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      alert("Only images (JPG, PNG, WEBP, HEIC) and PDF are accepted.");
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
      <Label className="text-gray-300 text-sm">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
      <input ref={ref} type="file" accept="image/*,application/pdf" onChange={handleChange} className="hidden" />
      {file ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-green-800 bg-green-950">
          <FileText size={14} className="text-green-400 flex-shrink-0" />
          <span className="text-xs text-green-300 truncate flex-1">{file.name}</span>
          <button type="button" onClick={() => { onChange(null); if (ref.current) ref.current.value = ""; }}
            className="text-gray-500 hover:text-red-400 flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-md border border-dashed border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 transition-colors text-xs">
          <Upload size={14} />
          Click to upload image or PDF
        </button>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium border-b border-gray-800 pb-2 mb-4">
      {children}
    </p>
  );
}

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone / OTP
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [testCode, setTestCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  // Section 1 — Personal
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nricNumber, setNricNumber] = useState("");

  // Section 2 — Driving credentials
  const [drivingLicenceNumber, setDrivingLicenceNumber] = useState("");
  const [drivingLicenceIssuedDate, setDrivingLicenceIssuedDate] = useState("");
  const [vocationalLicenceNumber, setVocationalLicenceNumber] = useState("");
  const [vocationalLicenceExpiryDate, setVocationalLicenceExpiryDate] = useState("");

  // Section 3 — Document uploads (all required)
  const [nricFile, setNricFile] = useState<File | null>(null);
  const [drivingLicenceFile, setDrivingLicenceFile] = useState<File | null>(null);
  const [vocationalLicenceFile, setVocationalLicenceFile] = useState<File | null>(null);
  const [vocationalLicenceExpiryFile, setVocationalLicenceExpiryFile] = useState<File | null>(null);

  // Section 4 — Vehicle (optional)
  const [vehicleExpanded, setVehicleExpanded] = useState(false);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleRelationship, setVehicleRelationship] = useState<"owned" | "rented">("owned");
  const [vehicleLogCardFile, setVehicleLogCardFile] = useState<File | null>(null);
  const [rentalAgreementFile, setRentalAgreementFile] = useState<File | null>(null);

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
    setStep("form");
  }

  // ── Step 3: Submit full form ───────────────────────────────────────────────
  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Section 1 validation
    if (!firstName.trim() || !lastName.trim()) return setErr("First and last name are required");
    if (!nricNumber.trim()) return setErr("NRIC / Passport number is required");

    // Section 2 validation
    if (!drivingLicenceNumber.trim()) return setErr("Driving licence number is required");
    if (!drivingLicenceIssuedDate) return setErr("Driving licence issued date is required");
    if (drivingLicenceIssuedDate >= TODAY) return setErr("Driving licence issued date must be in the past");
    if (!vocationalLicenceNumber.trim()) return setErr("Vocational licence number is required");
    if (!vocationalLicenceExpiryDate) return setErr("Vocational licence expiry date is required");
    if (vocationalLicenceExpiryDate <= TODAY) return setErr("Vocational licence must not be expired — please contact admin");

    // Section 3 validation
    if (!nricFile) return setErr("NRIC / Passport document upload is required");
    if (!drivingLicenceFile) return setErr("Driving licence document upload is required");
    if (!vocationalLicenceFile) return setErr("Vocational licence document upload is required");
    if (!vocationalLicenceExpiryFile) return setErr("Vocational licence expiry page upload is required");

    // Section 4 validation (vehicle is optional, but if expanded, validate)
    if (vehicleExpanded) {
      if (!vehiclePlate.trim()) return setErr("Vehicle plate number is required");
      if (!vehicleLogCardFile) return setErr("Vehicle log card upload is required");
      if (vehicleRelationship === "rented" && !rentalAgreementFile) {
        return setErr("Rental agreement upload is required for rented vehicles");
      }
    }

    setLoading(true);

    const form = new FormData();
    form.append("verificationId", verificationId);
    form.append("firstName", firstName.trim());
    form.append("lastName", lastName.trim());
    form.append("nricNumber", nricNumber.trim().toUpperCase());
    form.append("drivingLicenceNumber", drivingLicenceNumber.trim().toUpperCase());
    form.append("drivingLicenceIssuedDate", drivingLicenceIssuedDate);
    form.append("vocationalLicenceNumber", vocationalLicenceNumber.trim().toUpperCase());
    form.append("vocationalLicenceExpiryDate", vocationalLicenceExpiryDate);
    form.append("nricFile", nricFile!);
    form.append("drivingLicenceFile", drivingLicenceFile!);
    form.append("vocationalLicenceFile", vocationalLicenceFile!);
    form.append("vocationalLicenceExpiryFile", vocationalLicenceExpiryFile!);

    if (vehicleExpanded && vehiclePlate.trim()) {
      form.append("vehicleMake", vehicleMake.trim());
      form.append("vehicleModel", vehicleModel.trim());
      form.append("vehiclePlate", vehiclePlate.trim().toUpperCase());
      form.append("vehicleRelationship", vehicleRelationship);
      form.append("vehicleLogCardFile", vehicleLogCardFile!);
      if (vehicleRelationship === "rented" && rentalAgreementFile) {
        form.append("rentalAgreementFile", rentalAgreementFile);
      }
    }

    const res = await fetch("/api/onboarding/submit", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setErr(data.error ?? "Submission failed");
    const driverId: string = data.driverId ?? "";
    router.push(
      `/onboard/status?driverId=${encodeURIComponent(driverId)}&name=${encodeURIComponent(firstName.trim())}`
    );
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

      {/* ── Step 3: Full form ───────────────────────────────────────────── */}
      {step === "form" && (
        <form onSubmit={submitForm} className="space-y-6">

          {/* Section 1 — Personal Information */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5">
              <SectionHeader>Personal Information</SectionHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">First name <span className="text-red-400">*</span></Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      required className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Last name <span className="text-red-400">*</span></Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)}
                      required className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">NRIC / Passport No. <span className="text-red-400">*</span></Label>
                  <Input value={nricNumber} onChange={(e) => setNricNumber(e.target.value.toUpperCase())}
                    placeholder="S1234567A" required
                    className="bg-gray-800 border-gray-700 text-white font-mono" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 — Driving Credentials */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5">
              <SectionHeader>Driving Credentials</SectionHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Driving Licence No. <span className="text-red-400">*</span></Label>
                  <Input value={drivingLicenceNumber} onChange={(e) => setDrivingLicenceNumber(e.target.value.toUpperCase())}
                    placeholder="SXXXXXXXX" required
                    className="bg-gray-800 border-gray-700 text-white font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Driving Licence Issued Date <span className="text-red-400">*</span></Label>
                  <Input type="date" value={drivingLicenceIssuedDate}
                    onChange={(e) => setDrivingLicenceIssuedDate(e.target.value)}
                    max={TODAY} required
                    className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Vocational Licence No. (PDVL / TDVL) <span className="text-red-400">*</span></Label>
                  <Input value={vocationalLicenceNumber} onChange={(e) => setVocationalLicenceNumber(e.target.value.toUpperCase())}
                    placeholder="PDVL/TDVL number" required
                    className="bg-gray-800 border-gray-700 text-white font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Vocational Licence Expiry Date <span className="text-red-400">*</span></Label>
                  <Input type="date" value={vocationalLicenceExpiryDate}
                    onChange={(e) => setVocationalLicenceExpiryDate(e.target.value)}
                    min={TODAY} required
                    className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3 — Document Uploads */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5">
              <SectionHeader>Document Uploads</SectionHeader>
              <div className="space-y-5">
                <FileField label="NRIC / Passport"
                  hint="Upload a clear photo or scan of your NRIC / Passport"
                  file={nricFile} onChange={setNricFile} />
                <FileField label="Driving Licence"
                  hint="Upload a clear photo or scan of your driving licence (front)"
                  file={drivingLicenceFile} onChange={setDrivingLicenceFile} />
                <FileField label="Vocational Licence"
                  hint="Upload your PDVL or TDVL document"
                  file={vocationalLicenceFile} onChange={setVocationalLicenceFile} />
                <FileField label="Vocational Licence — Expiry Page"
                  hint="Upload the page clearly showing your vocational licence expiry date"
                  file={vocationalLicenceExpiryFile} onChange={setVocationalLicenceExpiryFile} />
              </div>
            </CardContent>
          </Card>

          {/* Section 4 — Vehicle (optional, expandable) */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5">
              <button
                type="button"
                onClick={() => setVehicleExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-left"
              >
                <SectionHeader>Vehicle Information (Optional)</SectionHeader>
                {vehicleExpanded ? <ChevronUp size={16} className="text-gray-500 flex-shrink-0 -mt-3" /> : <ChevronDown size={16} className="text-gray-500 flex-shrink-0 -mt-3" />}
              </button>

              {!vehicleExpanded && (
                <p className="text-xs text-gray-600 -mt-2">Tap to add your vehicle details and log card</p>
              )}

              {vehicleExpanded && (
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Vehicle Make</Label>
                      <Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)}
                        placeholder="e.g. Toyota" className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-sm">Vehicle Model</Label>
                      <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="e.g. Camry" className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Vehicle Plate No. <span className="text-red-400">*</span></Label>
                    <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      placeholder="SBA1234A"
                      className="bg-gray-800 border-gray-700 text-white font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Vehicle Ownership <span className="text-red-400">*</span></Label>
                    <div className="flex gap-3">
                      {(["owned", "rented"] as const).map((rel) => (
                        <button key={rel} type="button"
                          onClick={() => { setVehicleRelationship(rel); if (rel === "owned") setRentalAgreementFile(null); }}
                          className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                            vehicleRelationship === rel
                              ? "border-white bg-white text-gray-950"
                              : "border-gray-700 text-gray-400 hover:border-gray-500"
                          }`}>
                          {rel.charAt(0).toUpperCase() + rel.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <FileField label="Vehicle Log Card"
                    hint="Upload your vehicle log card"
                    file={vehicleLogCardFile} onChange={setVehicleLogCardFile}
                    required={vehicleExpanded} />
                  {vehicleRelationship === "rented" && (
                    <FileField label="Rental Agreement"
                      hint="Upload a copy of your vehicle rental / hire agreement"
                      file={rentalAgreementFile} onChange={setRentalAgreementFile}
                      required={vehicleRelationship === "rented"} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
        </form>
      )}

    </div>
  );
}
