import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [toast, setToast] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPw, setSuPw] = useState("");
  const [suErr, setSuErr] = useState("");
  const [lmEvent, setLmEvent] = useState("Senior Formal");
  const [lmDate, setLmDate] = useState("");
  const [lmPrice, setLmPrice] = useState("");
  const [lmNotes, setLmNotes] = useState("");
  const [lmErr, setLmErr] = useState("");
  const [loading, setLoading] = useState(false);

  const EVENTS = ["Senior Formal", "Senior Brunch", "Champagne Reception", "Other"];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser({ email: session.user.email, name: session.user.user_metadata?.name || session.user.email.split("@")[0] });
        setScreen("app");
        fetchTickets();
      }
    });
  }, []);

  async function fetchTickets() {
    const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
    if (!error) setTickets(data);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  async function doLogin() {
    if (!loginEmail.endsWith("@vassar.edu")) { setLoginErr("Only @vassar.edu addresses are allowed."); return; }
    setLoginErr("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw });
    setLoading(false);
    if (error) { setLoginErr(error.message); return; }
    setCurrentUser({ email: data.user.email, name: data.user.user_metadata?.name || data.user.email.split("@")[0] });
    setScreen("app");
    fetchTickets();
  }

  async function doSignup() {
    if (!suEmail.endsWith("@vassar.edu")) { setSuErr("Only @vassar.edu addresses allowed."); return; }
    if (!suName) { setSuErr("Please enter your name."); return; }
    setSuErr("");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: suEmail, password: suPw, options: { data: { name: suName } } });
    setLoading(false);
    if (error) { setSuErr(error.message); return; }
    setCurrentUser({ email: suEmail, name: suName });
    setScreen("app");
    fetchTickets();
    showToast("Welcome, " + suName.split(" ")[0] + "! Check your email to verify your account.");
  }

  async function doLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setTickets([]);
    setScreen("login");
  }

  async function submitListing() {
    if (!lmDate || !lmPrice) { setLmErr("Please fill in all fields."); return; }
    setLmErr("");
    const { error } = await supabase.from("listings").insert([{
      event: lmEvent, date: lmDate, price: parseFloat(lmPrice),
      notes: lmNotes, seller: currentUser.name, email: currentUser.email
    }]);
    if (error) { setLmErr(error.message); return; }
    setShowListModal(false);
    setLmDate(""); setLmPrice(""); setLmNotes("");
    fetchTickets();
    showToast("Listing posted!");
  }

  async function removeListing(id) {
    await supabase.from("listings").delete().eq("id", id);
    fetchTickets();
    showToast("Listing removed.");
  }

  const filtered = activeFilter === "all" ? tickets : tickets.filter(t => t.event === activeFilter);
  const myListings = currentUser ? tickets.filter(t => t.email === currentUser.email) : [];

  const s = {
    btn: { cursor: "pointer", padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, border: "0.5px solid #ccc", background: "#fff", color: "#111" },
    btnDark: { cursor: "pointer", padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, border: "none", background: "#111", color: "#fff" },
    btnSm: { cursor: "pointer", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "0.5px solid #ccc", background: "#fff", color: "#111" },
    card: { background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: "20px 24px" },
    input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
    label: { display: "block", fontSize: 12, color: "#888", marginBottom: 5 },
    pill: (active) => ({ cursor: "pointer", fontSize: 13, padding: "6px 14px", borderRadius: 20, border: active ? "none" : "0.5px solid #ccc", background: active ? "#111" : "transparent", color: active ? "#fff" : "#888" }),
  };

  if (screen === "login") return (
    <div style={{ maxWidth: 360, margin: "64px auto", padding: "0 20px" }}>
      <p style={{ fontSize: 11, letterSpacing: "0.08em", color: "#aaa", marginBottom: 6 }}>VASSAR COLLEGE · CLASS OF 2026</p>
      <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>Senior tickets</h1>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 28 }}>Buy and sell tickets to senior week events.</p>
      <div style={s.card}>
        <div style={{ marginBottom: 14 }}><label style={s.label}>Vassar email</label><input style={s.input} type="email" placeholder="yourname@vassar.edu" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><label style={s.label}>Password</label><input style={s.input} type="password" placeholder="••••••••" value={loginPw} onChange={e => setLoginPw(e.target.value)} /></div>
        {loginErr && <p style={{ fontSize: 13, color: "red", marginBottom: 10 }}>{loginErr}</p>}
        <button style={{ ...s.btnDark, width: "100%", opacity: loading ? 0.6 : 1 }} onClick={doLogin}>{loading ? "Signing in..." : "Sign in"}</button>
        <p style={{ textAlign: "center", fontSize: 13, color: "#888", marginTop: 14 }}>New here? <span style={{ color: "#111", cursor: "pointer", textDecoration: "underline" }} onClick={() => setScreen("signup")}>Create account</span></p>
      </div>
      <p style={{ textAlign: "center", fontSize: 12, color: "#bbb", marginTop: 14 }}>Restricted to @vassar.edu</p>
    </div>
  );

  if (screen === "signup") return (
    <div style={{ maxWidth: 360, margin: "64px auto", padding: "0 20px" }}>
      <p style={{ fontSize: 11, letterSpacing: "0.08em", color: "#aaa", marginBottom: 6 }}>VASSAR COLLEGE · CLASS OF 2026</p>
      <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 28 }}>Create account</h1>
      <div style={s.card}>
        <div style={{ marginBottom: 14 }}><label style={s.label}>Full name</label><input style={s.input} placeholder="Jordan Kim" value={suName} onChange={e => setSuName(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><label style={s.label}>Vassar email</label><input style={s.input} type="email" placeholder="jordankim@vassar.edu" value={suEmail} onChange={e => setSuEmail(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><label style={s.label}>Password</label><input style={s.input} type="password" placeholder="••••••••" value={suPw} onChange={e => setSuPw(e.target.value)} /></div>
        {suErr && <p style={{ fontSize: 13, color: "red", marginBottom: 10 }}>{suErr}</p>}
        <button style={{ ...s.btnDark, width: "100%", opacity: loading ? 0.6 : 1 }} onClick={doSignup}>{loading ? "Creating account..." : "Create account"}</button>
        <p style={{ textAlign: "center", fontSize: 13, color: "#888", marginTop: 14 }}><span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setScreen("login")}>Back to sign in</span></p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", width: "100%", maxWidth: "100%", background: "#fafafa" }}>
      {toast && <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", fontSize: 13, padding: "9px 18px", borderRadius: 8, zIndex: 300 }}>{toast}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "0.5px solid #e0e0e0", background: "#fff", marginBottom: 32 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: "0.08em", color: "#aaa" }}>VASSAR COLLEGE · CLASS OF 2026</p>
          <p style={{ fontSize: 17, fontWeight: 500, marginTop: 1 }}>Senior tickets</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#888" }}>{currentUser?.name}</span>
          <button style={s.btnSm} onClick={doLogout}>Sign out</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 24px 20px" }}>
        {["all", ...EVENTS].map(f => (
          <button key={f} style={s.pill(activeFilter === f)} onClick={() => setActiveFilter(f)}>{f === "all" ? "All events" : f}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24, padding: "0 24px 40px", alignItems: "start" }}>
        <div>
          {filtered.length === 0
            ? <p style={{ fontSize: 14, color: "#888", padding: "24px 0" }}>No tickets listed for this event yet.</p>
            : filtered.map(t => (
              <div key={t.id} onClick={() => setSelectedTicket(t)} style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: "18px 20px", marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, letterSpacing: "0.06em", color: "#aaa", marginBottom: 4 }}>{t.event.toUpperCase()}</p>
                    <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{t.event}</p>
                    <p style={{ fontSize: 13, color: "#888" }}>{t.date}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>${t.price}</p>
                    <p style={{ fontSize: 12, color: "#aaa" }}>{t.seller}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div>
          <div style={{ ...s.card, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Selling a ticket?</p>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 14, lineHeight: 1.5 }}>Post your listing in under a minute. Only verified Vassar students can see it.</p>
            <button style={{ ...s.btnDark, width: "100%", fontSize: 13 }} onClick={() => setShowListModal(true)}>+ List a ticket</button>
          </div>
          <div style={{ ...s.card, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 10, fontWeight: 500 }}>My listings</p>
            {myListings.length === 0
              ? <p style={{ fontSize: 13, color: "#bbb" }}>None yet.</p>
              : myListings.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #f0f0f0" }}>
                  <div><p style={{ fontSize: 13, fontWeight: 500 }}>{t.event}</p><p style={{ fontSize: 12, color: "#888" }}>${t.price}</p></div>
                  <button style={{ ...s.btnSm, border: "none", background: "transparent", color: "#bbb" }} onClick={() => removeListing(t.id)}>✕</button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {showListModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ ...s.card, width: 420, padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 18 }}>List a ticket</h3>
            <div style={{ marginBottom: 14 }}><label style={s.label}>Event</label><select style={s.input} value={lmEvent} onChange={e => setLmEvent(e.target.value)}>{EVENTS.map(ev => <option key={ev}>{ev}</option>)}</select></div>
            <div style={{ marginBottom: 14 }}><label style={s.label}>Date & time</label><input style={s.input} placeholder="e.g. Sat, May 24 · 7pm" value={lmDate} onChange={e => setLmDate(e.target.value)} /></div>
            <div style={{ marginBottom: 14 }}><label style={s.label}>Asking price ($)</label><input style={s.input} type="number" placeholder="40" value={lmPrice} onChange={e => setLmPrice(e.target.value)} /></div>
            <div style={{ marginBottom: 14 }}><label style={s.label}>Venmo handle + notes</label><textarea style={{ ...s.input, height: 72, resize: "none" }} placeholder="@yourvenmo, seat info, etc." value={lmNotes} onChange={e => setLmNotes(e.target.value)} /></div>
            {lmErr && <p style={{ fontSize: 13, color: "red", marginBottom: 10 }}>{lmErr}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={s.btn} onClick={() => setShowListModal(false)}>Cancel</button>
              <button style={s.btnDark} onClick={submitListing}>Post listing</button>
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ ...s.card, width: 420, padding: 28 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.07em", color: "#aaa", marginBottom: 6 }}>{selectedTicket.event.toUpperCase()}</p>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 18 }}>{selectedTicket.event}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
              <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 12 }}><p style={{ fontSize: 11, color: "#aaa", marginBottom: 3 }}>Date</p><p style={{ fontSize: 14, fontWeight: 500 }}>{selectedTicket.date}</p></div>
              <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 12 }}><p style={{ fontSize: 11, color: "#aaa", marginBottom: 3 }}>Price</p><p style={{ fontSize: 20, fontWeight: 500 }}>${selectedTicket.price}</p></div>
            </div>
            <div style={{ borderTop: "0.5px solid #eee", paddingTop: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Seller</p>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{selectedTicket.seller}</p>
              <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{selectedTicket.email}</p>
            </div>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.6 }}>{selectedTicket.notes || "No additional notes."}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={s.btn} onClick={() => setSelectedTicket(null)}>Close</button>
              {selectedTicket.email !== currentUser?.email && (
                <button style={s.btnDark} onClick={() => window.location.href = `mailto:${selectedTicket.email}?subject=Re: ${selectedTicket.event} ticket`}>Email seller</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}