"use client";
import { useEffect, useState } from "react";

export function AdminClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      const t = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false, timeZone: "Asia/Singapore",
      }).format(new Date());
      setTime(t + " SGT");
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="mono" style={{ fontSize: 13, color: "var(--text-dim)" }}>
      {time}
    </span>
  );
}
