"use client";

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button
        type="submit"
        style={{ fontSize: 11, color: "var(--text-faint)", cursor: "pointer", background: "none", border: "none", padding: "4px 8px", borderRadius: 4 }}
        onMouseOver={e => (e.currentTarget.style.color = "var(--text)")}
        onMouseOut={e => (e.currentTarget.style.color = "var(--text-faint)")}
      >
        Sign out
      </button>
    </form>
  );
}
