"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Plus, Trash2 } from "lucide-react";

type Step = "phone" | "otp" | "details" | "documents" | "success";

const DOC_TYPES = [
  { value: "license", label: "Driver License" },
  { value: "insurance", label: "Insurance" },
  { value: "background_check", label: "Background Check" },
  { value: "registration", label: "Vehicle Registration" },
  { value: "inspection", label: "Inspection Certificate" },
];

interface DocEntry {
  docType: string;
  expiryDate: string;
}

export default function OnboardPage() {
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phone step
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [testCode, setTestCode] = useState<string | null>(null);

  // OTP step
  const [otp, setOtp] = useState("");

  // Details step
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [nationalId, setNationalId] = useState("");

  // Documents step
  const [docs, setDocs] = useState<DocEntry[]>([{ docType: "license", expiryDate: "" }]);

  // Success
  const [isResubmission, setIsResubmission] = useState(false);

  function err(msg: string) {
    setError(msg);
    setLoading(false);
  }

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

    if (!res.ok) return err(data.error ?? "Failed to send code");

    setVerificationId(data.verificationId);
    setTestCode(data.testCode ?? null);
    setStep("otp");
  }

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

    if (!res.ok) return err(data.error ?? "Verification failed");

    setStep("details");
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !licenseNumber.trim() || !nationalId.trim()) {
      return err("All fields are required");
    }
    setError(null);
    setStep("documents");
  }

  async function submitFinal(e: React.FormEvent) {
    e.preventDefault();

    const incomplete = docs.some((d) => !d.docType || !d.expiryDate);
    if (incomplete) return err("Complete all document entries before submitting");

    setLoading(true);
    setError(null);

    const res = await fetch("/api/onboarding/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationId, firstName, lastName, licenseNumber, nationalId, documents: docs }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return err(data.error ?? "Submission failed");

    setIsResubmission(data.isResubmission ?? false);
    setStep("success");
  }

  function addDoc() {
    setDocs([...docs, { docType: "", expiryDate: "" }]);
  }

  function removeDoc(i: number) {
    setDocs(docs.filter((_, idx) => idx !== i));
  }

  function updateDoc(i: number, field: keyof DocEntry, value: string) {
    setDocs(docs.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  }

  return (
    <div className="w-full max-w-md">
      {/* Step indicator */}
      {step !== "success" && (
        <div className="flex items-center gap-2 mb-6">
          {(["phone", "otp", "details", "documents"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step === s
                    ? "bg-white text-gray-950"
                    : ["phone", "otp", "details", "documents"].indexOf(step) > i
                    ? "bg-green-700 text-white"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && <div className="w-8 h-px bg-gray-800" />}
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950">
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Phone */}
      {step === "phone" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Enter your phone number</CardTitle>
            <p className="text-sm text-gray-500">We'll send a verification code to your WhatsApp.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300">WhatsApp number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+6591234567"
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-600">Include country code, e.g. +65 for Singapore</p>
              </div>
              <Button type="submit" disabled={loading || !phone} className="w-full">
                {loading ? "Sending..." : "Send Code"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: OTP */}
      {step === "otp" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Enter verification code</CardTitle>
            <p className="text-sm text-gray-500">Sent to {phone} via WhatsApp.</p>
          </CardHeader>
          <CardContent>
            {testCode && (
              <div className="mb-4 px-3 py-2 bg-yellow-950 border border-yellow-800 rounded-md">
                <p className="text-xs text-yellow-400 font-medium">Testing mode</p>
                <p className="text-sm text-yellow-300 font-mono mt-0.5">Code: {testCode}</p>
                <p className="text-xs text-yellow-600 mt-1">This code display is removed when a real OTP template is approved.</p>
              </div>
            )}
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300">6-digit code</Label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  required
                  className="bg-gray-800 border-gray-700 text-white text-center text-lg tracking-widest font-mono"
                />
              </div>
              <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("phone"); setOtp(""); setTestCode(null); }}
                className="text-xs text-gray-500 hover:text-gray-300 w-full text-center"
              >
                Use a different number
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Personal details */}
      {step === "details" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Personal details</CardTitle>
            <p className="text-sm text-gray-500">Used to identify you in the driver registry.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitDetails} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-300">First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300">Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">License number</Label>
                <Input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                  placeholder="S1234567A"
                  required
                  className="bg-gray-800 border-gray-700 text-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">National ID / NRIC / Passport</Label>
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.toUpperCase())}
                  placeholder="S1234567A"
                  required
                  className="bg-gray-800 border-gray-700 text-white font-mono"
                />
                <p className="text-xs text-gray-600">Used with your license number to uniquely identify you. Never shared.</p>
              </div>
              <Button type="submit" className="w-full">Continue</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Documents */}
      {step === "documents" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Upload documents</CardTitle>
            <p className="text-sm text-gray-500">Add the document type and expiry date. Our team will verify in person.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitFinal} className="space-y-4">
              <div className="space-y-3">
                {docs.map((doc, i) => (
                  <div key={i} className="p-3 rounded-md border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Document {i + 1}</span>
                      {docs.length > 1 && (
                        <button type="button" onClick={() => removeDoc(i)} className="text-gray-600 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Type</Label>
                      <Select value={doc.docType} onValueChange={(v) => updateDoc(i, "docType", v ?? "")}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {DOC_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Expiry date</Label>
                      <Input
                        type="date"
                        value={doc.expiryDate}
                        onChange={(e) => updateDoc(i, "expiryDate", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addDoc}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
              >
                <Plus size={14} /> Add another document
              </button>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Success */}
      {step === "success" && (
        <Card className="bg-gray-900 border-gray-800 text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center">
              <CheckCircle className="text-green-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {isResubmission ? "Documents resubmitted" : "Application submitted"}
              </h2>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                {isResubmission
                  ? "Your updated documents are under review. We'll notify you on WhatsApp once reviewed."
                  : "Your application is under review. We'll notify you on WhatsApp within 2 business days."}
              </p>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Questions? Contact us via WhatsApp at your registered number.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
