"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_COUNTRY_CODE = "65"; // SG — move to platform settings for multi-country

interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

function e164ToLocal(e164: string): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  return d.startsWith(DEFAULT_COUNTRY_CODE) && d.length > DEFAULT_COUNTRY_CODE.length
    ? d.slice(DEFAULT_COUNTRY_CODE.length)
    : d;
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder = "9123 4567",
  hint,
  required,
  disabled,
}: PhoneInputProps) {
  const [display, setDisplay] = useState(() => e164ToLocal(value));
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setDisplay(e164ToLocal(value));
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let digits = e.target.value.replace(/\D/g, "");
    // Strip country code if user pasted the full number (e.g. +6591234567 → 91234567)
    if (
      digits.startsWith(DEFAULT_COUNTRY_CODE) &&
      digits.length > DEFAULT_COUNTRY_CODE.length
    ) {
      digits = digits.slice(DEFAULT_COUNTRY_CODE.length);
    }
    setDisplay(digits);
    onChange(digits ? `+${DEFAULT_COUNTRY_CODE}${digits}` : "");
  }

  function handleBlur() {
    const digits = display.replace(/\D/g, "");
    if (digits.length > 0 && digits.length < 7) {
      setDisplay("");
      onChange("");
    }
  }

  return (
    <div>
      {label && (
        <label
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            fontWeight: 500,
            display: "block",
            marginBottom: 4,
          }}
        >
          {label}
          {required && (
            <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
          )}
        </label>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            borderRight: "1px solid var(--border)",
            color: "var(--text-dim)",
            fontSize: 13,
            userSelect: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          🇸🇬 +{DEFAULT_COUNTRY_CODE}
        </div>
        <input
          type="tel"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: 13,
            padding: "8px 10px",
            minWidth: 0,
          }}
        />
      </div>
      {hint && (
        <p
          style={{
            fontSize: 11,
            color: "var(--text-faint)",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
