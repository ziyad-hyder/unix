# UniX

**A verified campus marketplace where students rent, buy, and swap academic gear, with a rental lifecycle that enforces itself.**

[**Live app**](https://unix-9o9.pages.dev) · Built for Kakatiya Institute of Technology and Science, Warangal (KITSW)

<!-- Add a hero screenshot or 20-second GIF here. Example:
![UniX demo](docs/demo.gif)
-->

Engineering students buy calculators, drafting kits, and lab components that sit unused after a semester or two. UniX keeps them circulating inside a trusted campus community: access is limited to verified `@kitsw.ac.in` accounts, and rentals are tracked from request to return so nobody has to rely on trust alone.

---

## What makes it more than a listings board

### Rentals with a real state machine
Rent transactions move through nine states (`PENDING`, `ACCEPTED`, `ACTIVE_LEASE`, `OVERDUE`, `RETURN_PENDING`, `COMPLETED`, `REJECTED`, `CANCELLED`, `EXPIRED`). Illegal transitions are rejected server-side, and a background scheduler handles overdue marking, reminders, and expiry without anyone clicking anything.

```
PENDING -> ACCEPTED -(handoff code)-> ACTIVE_LEASE -(return code)-> COMPLETED
                                          |
                                          v
                                       OVERDUE -(return code)-> COMPLETED
```

### Handover and return proven by codes, not claims
"Owner marked it handed over" and "borrower marked it returned" are the classic sources of campus disputes. UniX replaces both with mutual 6-digit codes:

- The borrower shows a **handoff code** to the owner at pickup.
- The owner shows a **return code** to the borrower at drop-off.
- Codes are derived server-side with HMAC-SHA256, never stored, shown only to the correct party, compared in constant time, and rate-limited with a temporary lockout.
- A "Can't use a code?" fallback exists for dead phone batteries, and the system records which method was used.

### Fairness built into enforcement
Late returns lead to an account freeze, but only when the lease was actually confirmed by both sides. If an owner's unilateral action started the clock automatically, the borrower is never penalized. Freezes block new requests only; login, returns, and owner actions keep working.

### Privacy-gated contact reveal
A student's WhatsApp number is never on a public listing. It is revealed to both parties only while a transaction is in a contact-active state, and hidden again the moment it reaches a terminal state.

---

## Engineering highlights

| Problem | Approach |
| :--- | :--- |
| **iOS Safari silently drops cross-site cookies** (frontend and API live on different domains) | Dual-scheme auth: HttpOnly cookies for normal browsers plus an `Authorization: Bearer` header from an Axios interceptor, so sessions survive WebKit's tracking prevention. |
| **Running a Spring Boot API on a 1 GB free-tier VM** | Capped heap, metaspace, code cache, and thread stacks, switched to the serial GC, and added a swapfile as a last-resort buffer. Lowering metaspace too far caused startup crashes, which became a documented lesson. |
| **No crash alerts on an unmanaged VM** | Built a small Python watchdog (hard-capped at 30 MB) that watches RAM, CPU, swap, and OOM kills and sends Telegram alerts with recent logs attached. |
| **Two students accepting the same item** | Optimistic locking on the listing, so only one request can win. |
| **Image uploads without bloating the database** | Client-side canvas compression, then upload to Cloudflare R2 through the S3-compatible API. |
| **Safe schema changes on a live database** | Flyway versioned migrations, applied automatically at startup. |

---

## Architecture

```
Student browser
      |
      v
Cloudflare Pages  (React + Vite, global edge)
      |  HTTPS, CORS-restricted
      v
Spring Boot REST API  (Java 21, Spring Security 6, Spring Data JPA)
      |-- Oracle Autonomous Database  (mTLS, Flyway migrations)
      |-- Cloudflare R2               (listing images)
      '-- Gmail SMTP                  (OTP and due-date reminders)
```

The backend lives in a separate private repository. This repo contains the full frontend, and I'm happy to walk through the backend design in an interview or call.

---

## Tech stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 18, Vite, React Router 6, Axios |
| Styling | Tailwind CSS with custom design tokens, Inter, Lucide icons |
| Hosting | Cloudflare Pages (frontend), Oracle Cloud always-free VM (API) |
| Backend | Spring Boot 3, Java 21, Spring Security, JPA/Hibernate |
| Data | Oracle Autonomous Database 19c, Flyway |
| Storage and mail | Cloudflare R2, Gmail SMTP |
| Ops | systemd, Nginx, Let's Encrypt, custom Telegram watchdog |

---

## Frontend notes

- **Live rental countdowns**: badges show time left on each lease and flip to overdue styling automatically.
- **Role-aware views**: the same transaction renders different actions and codes depending on whether you are the owner or the borrower.
- **Mobile first**: tested on iOS Safari and Android Chrome, where the cookie problem above originally showed up.
- **Design system**: a restrained palette (`#173541` primary, `#557C86` slate, `#FAFAF8` canvas), Inter for text, and monospace numerals for verification codes.

---

## Run it locally

Requires Node.js 18+ and npm 9+.

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8080" > .env.local
npm run dev
```

Open `http://localhost:5173`. The only client-side variable is `VITE_API_URL`, the base URL of the API. Production build: `npm run build` (output in `dist/`).

---

## Lessons learned

1. **Static hosts need explicit API URLs.** An Axios instance without a `baseURL` calls the Pages domain and returns confusing `405` errors.
2. **`SameSite=None; Secure` is necessary but not sufficient.** Mobile WebKit can still block third-party cookies, so don't rely on cookies alone for cross-site sessions.
3. **`-Xmx` is not your memory limit.** Metaspace, thread stacks, and the JIT cache all sit outside the heap and can push a small VM into OOM.
4. **Unilateral actions create disputes.** Two-party proof, with a graceful fallback, turned out to be a better design than more buttons.

---

## Status

Live and in use at KITSW. Recently shipped: the time-bound rental lifecycle, code-verified handover and return, and overdue enforcement.

## License

All rights reserved. Proprietary software developed for campus resource sharing.