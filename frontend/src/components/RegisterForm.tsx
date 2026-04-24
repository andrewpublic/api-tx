import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function RegisterForm() {
  const [form, setForm] = useState({ email: "", apiKey: "", mobileNumber: "" });
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("You're connected! Your first sync will run within the hour.");
        setForm({ email: "", apiKey: "", mobileNumber: "" });
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5 shadow-xl"
    >
      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={handleChange}
        required
      />

      <Field
        label="Up Bank personal access token"
        name="apiKey"
        type="password"
        placeholder="up:yeah:••••••••"
        value={form.apiKey}
        onChange={handleChange}
        required
        hint={
          <>
            Get yours at{" "}
            <a
              href="https://developer.up.com.au/#getting-started"
              target="_blank"
              rel="noreferrer"
              className="text-brand-500 underline"
            >
              developer.up.com.au
            </a>
            . Stored encrypted — never shared.
          </>
        }
      />

      <Field
        label="Mobile number"
        name="mobileNumber"
        type="tel"
        placeholder="+61 4xx xxx xxx"
        value={form.mobileNumber}
        onChange={handleChange}
        required
        hint="Used only for budget alerts via SMS."
      />

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white
                   hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {status === "loading" ? "Connecting…" : "Connect account"}
      </button>

      {status === "success" && (
        <p className="rounded-lg bg-green-900/40 border border-green-700 px-4 py-3 text-sm text-green-300">
          {message}
        </p>
      )}
      {status === "error" && (
        <p className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {message}
        </p>
      )}
    </form>
  );
}

function Field({ label, name, type, placeholder, value, onChange, required, hint }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm
                   placeholder-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-1
                   focus:ring-brand-500 transition-colors"
      />
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
