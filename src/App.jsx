import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabase";

const EVENTS = ["Senior Formal", "Senior Brunch", "Champagne Reception", "Commencement"];
const CUSTOM_EVENT_FILTER = "custom";
const WRITE_IN_EVENT = "write-in";
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function getDisplayName(user) {
  return user?.user_metadata?.name || user?.email?.split("@")[0] || "Student";
}

function formatPrice(price) {
  const value = Number(price);
  if (Number.isNaN(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatPostedTime(createdAt) {
  if (!createdAt) return "Posted recently";

  const postedDate = new Date(createdAt);
  if (Number.isNaN(postedDate.getTime())) return "Posted recently";

  const secondsAgo = Math.max(0, Math.floor((Date.now() - postedDate.getTime()) / 1000));
  if (secondsAgo < 60) return "Posted just now";

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `Posted ${minutesAgo}m ago`;

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `Posted ${hoursAgo}h ago`;

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `Posted ${daysAgo}d ago`;

  return `Posted ${postedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function getQuantityLabel(quantity) {
  const count = Number(quantity) || 1;
  return `${count} ticket${count === 1 ? "" : "s"}`;
}

function withTimeout(promise, message = "That took too long. Check your connection and try again.") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), 12000);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export default function App() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("newest");
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
  const [lmCustomEvent, setLmCustomEvent] = useState("");
  const [lmDate, setLmDate] = useState("");
  const [lmPrice, setLmPrice] = useState("");
  const [lmQuantity, setLmQuantity] = useState("1");
  const [lmNotes, setLmNotes] = useState("");
  const [lmErr, setLmErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser({
          email: session.user.email,
          name: getDisplayName(session.user),
        });
        setScreen("app");
        fetchTickets();
      }
    });
  }, []);

  async function fetchTickets() {
    setTicketLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.from("listings").select("*").order("created_at", { ascending: false }),
        "Listings are taking too long to load. Try refreshing the page.",
      );

      if (!error) {
        setTickets(data || []);
      }
    } finally {
      setTicketLoading(false);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  async function doLogin(event) {
    event?.preventDefault();
    const email = loginEmail.trim().toLowerCase();

    if (!email.endsWith("@vassar.edu")) {
      setLoginErr("Use your @vassar.edu email to sign in.");
      return;
    }

    setLoginErr("");
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password: loginPw,
        }),
      );

      if (error) {
        setLoginErr(error.message);
        return;
      }

      setCurrentUser({
        email: data.user.email,
        name: getDisplayName(data.user),
      });
      setScreen("app");
      fetchTickets();
    } catch (error) {
      setLoginErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function doSignup(event) {
    event?.preventDefault();
    const name = suName.trim();
    const email = suEmail.trim().toLowerCase();

    if (!name) {
      setSuErr("Add your name so classmates know who they are buying from.");
      return;
    }

    if (!email.endsWith("@vassar.edu")) {
      setSuErr("Use your @vassar.edu email to create an account.");
      return;
    }

    setSuErr("");
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password: suPw,
          options: { data: { name } },
        }),
      );

      if (error) {
        setSuErr(error.message);
        return;
      }

      setCurrentUser({ email: data.user?.email || email, name });
      setScreen("app");
      fetchTickets();
      showToast(`Welcome, ${name.split(" ")[0]}! Check your email to verify your account.`);
    } catch (error) {
      setSuErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function doLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setTickets([]);
    setScreen("login");
  }

  async function submitListing(event) {
    event?.preventDefault();
    const price = Number.parseFloat(lmPrice);
    const quantity = Number.parseInt(lmQuantity, 10);
    const listingEvent = lmEvent === WRITE_IN_EVENT ? lmCustomEvent.trim() : lmEvent;

    if (!listingEvent || !lmDate.trim() || Number.isNaN(price) || price < 0 || Number.isNaN(quantity) || quantity < 1) {
      setLmErr("Add an event, date, quantity, and valid asking price.");
      return;
    }

    setLmErr("");
    const listing = {
      event: listingEvent,
      date: lmDate.trim(),
      price,
      quantity,
      status: "available",
      notes: lmNotes.trim(),
      seller: currentUser.name,
      email: currentUser.email,
    };

    try {
      let { error } = await withTimeout(supabase.from("listings").insert([listing]));

      if (error && /quantity|status|schema cache/i.test(error.message)) {
        const fallbackListing = { ...listing };
        delete fallbackListing.quantity;
        delete fallbackListing.status;
        ({ error } = await withTimeout(supabase.from("listings").insert([fallbackListing])));
      }

      if (error) {
        setLmErr(error.message);
        return;
      }

      setShowListModal(false);
      setLmEvent("Senior Formal");
      setLmCustomEvent("");
      setLmDate("");
      setLmPrice("");
      setLmQuantity("1");
      setLmNotes("");
      fetchTickets();
      showToast("Listing posted.");
    } catch (error) {
      setLmErr(error.message);
    }
  }

  async function removeListing(ticket) {
    const confirmed = window.confirm("Are you sure you'd like to delete this listing?");
    if (!confirmed) return;

    await supabase.from("listings").delete().eq("id", ticket.id);
    fetchTickets();
    showToast("Listing removed.");
  }

  async function toggleSoldStatus(ticket) {
    const nextStatus = ticket.status === "sold" ? "available" : "sold";
    const { error } = await supabase.from("listings").update({ status: nextStatus }).eq("id", ticket.id);

    if (error) {
      showToast("Sold status needs the Supabase update.");
      return;
    }

    fetchTickets();
    showToast(nextStatus === "sold" ? "Listing marked sold." : "Listing marked available.");
  }

  async function reportListing(ticket) {
    const reason = window.prompt("What should we know about this listing?");
    if (reason === null) return;

    const { error } = await supabase.from("reports").insert([
      {
        listing_id: String(ticket.id),
        reporter_email: currentUser.email,
        listing_event: ticket.event,
        listing_seller: ticket.email,
        reason: reason.trim() || "No reason provided.",
      },
    ]);

    if (error) {
      showToast("Reporting needs the Supabase update.");
      return;
    }

    showToast("Report sent.");
  }

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const visibleTickets = tickets.filter((ticket) => {
      const isCustomEvent = !EVENTS.includes(ticket.event);
      const matchesEvent =
        activeFilter === "all" ||
        ticket.event === activeFilter ||
        (activeFilter === CUSTOM_EVENT_FILTER && isCustomEvent);
      const matchesSearch =
        !query ||
        [ticket.event, ticket.date, ticket.seller, ticket.notes]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));

      return matchesEvent && matchesSearch;
    });

    return [...visibleTickets].sort((a, b) => {
      if (sortMode === "price-low") return Number(a.price) - Number(b.price);
      if (sortMode === "price-high") return Number(b.price) - Number(a.price);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [activeFilter, searchTerm, sortMode, tickets]);

  const myListings = currentUser
    ? tickets.filter((ticket) => ticket.email === currentUser.email)
    : [];
  const isAdmin = currentUser ? ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) : false;
  const reportCount = tickets.filter((ticket) => ticket.status === "reported").length;

  if (screen === "login") {
    return (
      <main className="auth-page">
        <section className="auth-panel" aria-labelledby="login-title">
          <p className="eyebrow">Vassar College Class of 2026</p>
          <h1 id="login-title">Senior tickets</h1>
          <p className="auth-copy">A private marketplace for buying and selling senior week tickets.</p>

          <form className="form-card" onSubmit={doLogin}>
            <label>
              <span>Vassar email</span>
              <input
                type="email"
                placeholder="yourname@vassar.edu"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                placeholder="Password"
                value={loginPw}
                onChange={(event) => setLoginPw(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {loginErr && <p className="error-text">{loginErr}</p>}
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <p className="switch-text">
              New here?{" "}
              <button type="button" onClick={() => setScreen("signup")}>
                Create account
              </button>
            </p>
          </form>
          <section className="how-it-works" aria-label="How it works">
            <h2>How it works</h2>
            <ol>
              <li>Sign in with your Vassar email.</li>
              <li>Browse listings by event, price, or seller.</li>
              <li>Contact the seller to coordinate payment and pickup.</li>
            </ol>
          </section>
          <p className="auth-note">Restricted to Vassar email addresses.</p>
        </section>
      </main>
    );
  }

  if (screen === "signup") {
    return (
      <main className="auth-page">
        <section className="auth-panel" aria-labelledby="signup-title">
          <p className="eyebrow">Vassar College Class of 2026</p>
          <h1 id="signup-title">Create account</h1>
          <p className="auth-copy">Join with your Vassar email so classmates can trade safely.</p>

          <form className="form-card" onSubmit={doSignup}>
            <label>
              <span>Full name</span>
              <input
                placeholder="Jordan Kim"
                value={suName}
                onChange={(event) => setSuName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label>
              <span>Vassar email</span>
              <input
                type="email"
                placeholder="jordankim@vassar.edu"
                value={suEmail}
                onChange={(event) => setSuEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                placeholder="Password"
                value={suPw}
                onChange={(event) => setSuPw(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            {suErr && <p className="error-text">{suErr}</p>}
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
            <p className="switch-text">
              <button type="button" onClick={() => setScreen("login")}>
                Back to sign in
              </button>
            </p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {toast && <div className="toast">{toast}</div>}

      <header className="topbar">
        <div>
          <p className="eyebrow">Vassar College Class of 2026</p>
          <h1>Senior tickets</h1>
        </div>
        <div className="account-actions">
          <span>{currentUser?.name}</span>
          <button className="button button-ghost" onClick={doLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="market-hero">
        <div>
          <p className="eyebrow">Student-only exchange</p>
          <h2>Find a ticket without the hassle.</h2>
          <p>
            Browse current listings, contact sellers directly, and post your own tickets in minutes.
          </p>
        </div>
        <button className="button button-primary" onClick={() => setShowListModal(true)}>
          List a ticket
        </button>
      </section>

      <nav className="filter-row" aria-label="Filter listings by event">
        {["all", ...EVENTS, CUSTOM_EVENT_FILTER].map((filter) => (
          <button
            key={filter}
            className={activeFilter === filter ? "filter-pill is-active" : "filter-pill"}
            onClick={() => setActiveFilter(filter)}
          >
            {filter === "all" ? "All events" : filter === CUSTOM_EVENT_FILTER ? "Other" : filter}
          </button>
        ))}
      </nav>

      <section className="listing-tools" aria-label="Search and sort listings">
        <label className="search-field">
          <span>Search listings</span>
          <input
            type="search"
            placeholder="Search event, seller, date, or notes"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <label className="sort-field">
          <span>Sort by</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="price-low">Lowest price</option>
            <option value="price-high">Highest price</option>
          </select>
        </label>
      </section>

      <div className="market-layout">
        <section className="listing-column" aria-label="Ticket listings">
          {ticketLoading ? (
            <div className="empty-state">Loading listings...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state">
              <h3>No matching tickets</h3>
              <p>Try another event filter, search term, or check back soon.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <button
                className={ticket.status === "sold" ? "ticket-card is-sold" : "ticket-card"}
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
              >
                <span className="ticket-event">
                  {ticket.event}
                  {ticket.status === "sold" && <span className="status-badge">Sold</span>}
                </span>
                <span className="ticket-main">
                  <span>
                    <strong>{ticket.event}</strong>
                    <small>{ticket.date}</small>
                  </span>
                  <span className="ticket-price">{formatPrice(ticket.price)}</span>
                </span>
                <span className="ticket-meta">
                  <span>{ticket.seller} · {getQuantityLabel(ticket.quantity)}</span>
                  <span>{formatPostedTime(ticket.created_at)}</span>
                </span>
              </button>
            ))
          )}
        </section>

        <aside className="sidebar">
          <section className="side-card">
            <h2>Selling a ticket?</h2>
            <p>Post your ticket with the event, date, price, and the best way for classmates to pay you.</p>
            <button className="button button-primary" onClick={() => setShowListModal(true)}>
              List a ticket
            </button>
          </section>

          <section className="side-card">
            <h2>My listings</h2>
            {myListings.length === 0 ? (
              <p className="muted">Nothing posted yet.</p>
            ) : (
              <ul className="my-listings">
                {myListings.map((ticket) => (
                  <li key={ticket.id}>
                    <span>
                      <strong>{ticket.event}</strong>
                      <small>{formatPrice(ticket.price)} · {ticket.status === "sold" ? "Sold" : "Available"}</small>
                    </span>
                    <span className="listing-actions">
                      <button className="mini-button" onClick={() => toggleSoldStatus(ticket)}>
                        {ticket.status === "sold" ? "Mark available" : "Mark sold"}
                      </button>
                      <button
                        className="remove-button"
                        aria-label={`Remove ${ticket.event} listing`}
                        onClick={() => removeListing(ticket)}
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isAdmin && (
            <section className="side-card">
              <h2>Admin</h2>
              <p>{tickets.length} listings live. {reportCount} reports need review.</p>
              <p className="muted">Open a listing to remove it or change its status.</p>
            </section>
          )}
        </aside>
      </div>

      {showListModal && (
        <div className="modal-backdrop" onMouseDown={() => setShowListModal(false)}>
          <form className="modal-card" onSubmit={submitListing} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">New listing</p>
                <h2>List a ticket</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setShowListModal(false)} aria-label="Close modal">
                x
              </button>
            </div>
            <label>
              <span>Event</span>
              <select value={lmEvent} onChange={(event) => setLmEvent(event.target.value)}>
                {EVENTS.map((eventName) => (
                  <option key={eventName}>{eventName}</option>
                ))}
                <option value={WRITE_IN_EVENT}>Other</option>
              </select>
            </label>
            {lmEvent === WRITE_IN_EVENT && (
              <label>
                <span>Event name</span>
                <input
                  placeholder="e.g. Scavenger hunt"
                  value={lmCustomEvent}
                  onChange={(event) => setLmCustomEvent(event.target.value)}
                  required
                />
              </label>
            )}
            <label>
              <span>Date and time</span>
              <input
                placeholder="Sun, May 24 at 7pm"
                value={lmDate}
                onChange={(event) => setLmDate(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Asking price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="40"
                value={lmPrice}
                onChange={(event) => setLmPrice(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={lmQuantity}
                onChange={(event) => setLmQuantity(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Payment/contact notes</span>
              <textarea
                placeholder="@yourvenmo, Zelle, phone number, or pickup details"
                value={lmNotes}
                onChange={(event) => setLmNotes(event.target.value)}
              />
            </label>
            {lmErr && <p className="error-text">{lmErr}</p>}
            <div className="modal-actions">
              <button className="button button-ghost" type="button" onClick={() => setShowListModal(false)}>
                Cancel
              </button>
              <button className="button button-primary" type="submit">
                Post listing
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTicket && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedTicket(null)}>
          <section className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">{selectedTicket.event}</p>
                <h2>{selectedTicket.event}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedTicket(null)} aria-label="Close modal">
                x
              </button>
            </div>
            <div className="detail-grid">
              <div>
                <span>Date</span>
                <strong>{selectedTicket.date}</strong>
              </div>
              <div>
                <span>Price</span>
                <strong>{formatPrice(selectedTicket.price)}</strong>
              </div>
              <div>
                <span>Quantity</span>
                <strong>{getQuantityLabel(selectedTicket.quantity)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedTicket.status === "sold" ? "Sold" : "Available"}</strong>
              </div>
            </div>
            <p className="posted-text">{formatPostedTime(selectedTicket.created_at)}</p>
            <div className="seller-block">
              <span>Seller</span>
              <strong>{selectedTicket.seller}</strong>
              <a href={`mailto:${selectedTicket.email}?subject=Re: ${selectedTicket.event} ticket`}>
                {selectedTicket.email}
              </a>
            </div>
            <p className="notes-block">{selectedTicket.notes || "No additional notes."}</p>
            <div className="modal-actions">
              <button className="button button-ghost" onClick={() => setSelectedTicket(null)}>
                Close
              </button>
              {selectedTicket.email !== currentUser?.email && (
                <a
                  className="button button-primary"
                  href={`mailto:${selectedTicket.email}?subject=Re: ${selectedTicket.event} ticket`}
                >
                  Email seller
                </a>
              )}
              {selectedTicket.email !== currentUser?.email && (
                <button className="button button-ghost" onClick={() => reportListing(selectedTicket)}>
                  Report listing
                </button>
              )}
              {(selectedTicket.email === currentUser?.email || isAdmin) && (
                <button className="button button-ghost" onClick={() => toggleSoldStatus(selectedTicket)}>
                  {selectedTicket.status === "sold" ? "Mark available" : "Mark sold"}
                </button>
              )}
              {isAdmin && selectedTicket.email !== currentUser?.email && (
                <button className="remove-button" onClick={() => removeListing(selectedTicket)}>
                  Remove
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      <footer className="site-footer">
        <p>Not affiliated with Vassar College. Exchange details are arranged directly between students.</p>
      </footer>
    </main>
  );
}
