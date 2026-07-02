-- Priority 2: OTP verify rate limiting. Tracks wrong-code attempts per
-- verification session so /otp/verify can cap them, instead of allowing
-- unlimited guesses against a 6-digit code within its validity window.
ALTER TABLE "PhoneVerification" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
