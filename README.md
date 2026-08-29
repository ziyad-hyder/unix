# UniX

**A verified campus resource-sharing marketplace for KITSW.**

UniX enables students at Kakatiya Institute of Technology and Science, Warangal (KITSW) to buy, sell, rent, and swap calculators, drafting kits, lab equipment, and other essential academic resources with each other, restricted to verified `@kitsw.ac.in` student accounts.

- Live Application: [unix-9o9.pages.dev](https://unix-9o9.pages.dev)
- Backend Base URL: `https://129-159-228-83.sslip.io`
- GitHub Repository: [github.com/ziyad-hyder/unix](https://github.com/ziyad-hyder/unix)

---

## Table of Contents

- [Why UniX Exists](#why-unix-exists)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Architectural Decisions](#architectural-decisions)
- [Backend Specifications](#backend-specifications)
- [Security and Authentication](#security-and-authentication)
- [Monitoring and Observability](#monitoring-and-observability)
- [Database Schema and Models](#database-schema-and-models)
- [API Reference](#api-reference)
- [Design System](#design-system)
- [Brand Identity](#brand-identity)
- [Project Status](#project-status)
- [Version Control and Repository Structure](#version-control-and-repository-structure)
- [Local Development](#local-development)
- [Deployment Specifications](#deployment-specifications)
- [Lessons Learned](#lessons-learned)
- [License and Contact](#license-and-contact)

---

## Why UniX Exists

Engineering students routinely purchase specialized tools, engineering drawing instruments, calculators, and microcontroller lab components that get used for one or two semesters and then sit unused. UniX keeps these resources circulating within a single trusted, verified campus community instead of requiring each cohort of students to buy expensive equipment brand new.

Access is restricted exclusively to students holding an official institution email address (`@kitsw.ac.in`).

---

## Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| Frontend | React 18.3.1 + Vite 5.4.9 | Single-Page Application using React Router 6 and Axios |
| Styling | Tailwind CSS 3.4.14 | Custom Inception design tokens, Inter typography, Lucide React icons |
| Frontend Hosting | Cloudflare Pages | Global edge distribution with automated Git deployment |
| Backend | Spring Boot 3.3.4 (Java 21) | RESTful API built on Spring Data JPA and Spring Security 6 |
| Backend Hosting | Oracle Cloud Infrastructure (OCI) | Ubuntu 24.04 LTS VM on Always-Free tier |
| Database | Oracle Autonomous Database (ATP 19c) | Managed relational DB connected via mTLS Oracle Wallet |
| Development DB | H2 Database | In-memory relational database with Oracle compatibility mode |
| Migration Engine | Flyway | Version-controlled SQL migration scripts |
| Process Manager | systemd (`unix-backend.service`) | Native Linux service with auto-recovery and JVM boundaries |
| Reverse Proxy | Nginx | Reverse proxy handling HTTPS termination and upstream proxying |
| TLS Certificate | Let's Encrypt via Certbot | Automated SSL/TLS certificates via dynamic `sslip.io` hostname |
| Email Delivery | Gmail SMTP (`JavaMailSender`) | Automated one-time passwords for student registration |
| Object Storage | Cloudflare R2 (AWS S3 SDK compatible) | Listing image uploads, accessed via `software.amazon.awssdk:s3` with a custom endpoint override |
| Observability | Custom Python Watchdog (`vertex-monitor`) | Systemd-managed daemon polling RAM/CPU/swap/OOM signals, pushes alerts and on-demand logs via Telegram Bot API |

---

## System Architecture

```
Student Browser (Desktop / Mobile)
      |
      v
Cloudflare Pages (React + Vite, HTTPS) [https://unix-9o9.pages.dev]
      |
      | HTTPS (CORS-restricted, credentialed requests with HttpOnly cookies)
      v
Nginx Reverse Proxy (OCI VM, Port 443 / 80, Let's Encrypt TLS)
      |
      | Internal Reverse Proxy (HTTP on localhost:8080)
      v
Spring Boot Backend (Java 21, systemd daemon: unix-backend.service)
      |
      +---> Oracle Autonomous Database (ATP 19c) via mTLS Wallet
      |
      +---> Gmail SMTP Server (Port 587 STARTTLS for OTP delivery)
```

No custom apex domain is currently in use. The backend is addressed through an `sslip.io` hostname (`https://129-159-228-83.sslip.io`), which resolves directly to the OCI VM public IP address without manual DNS configuration. This setup allows Certbot to provision valid Let's Encrypt SSL/TLS certificates directly on the VM.

---

## Architectural Decisions

### 1. Hosting: Cloudflare Pages
Vercel was excluded on an explicit ethical basis. Between Netlify and Cloudflare Pages, Cloudflare was selected for its unlimited free-tier bandwidth, rapid edge builds, zero cold starts, and seamless potential integration with Cloudflare Workers.

### 2. Backend Hosting: Self-Managed OCI Virtual Machine
An always-free Oracle Cloud Infrastructure AMD compute instance (Ubuntu 24.04 LTS, 1 GB RAM) was chosen over container-based PaaS providers (such as Render or Railway). This gives full control over the JVM runtime environment, systemd daemon policies, Nginx reverse proxy directives, and local file storage for Oracle Wallet credentials at zero operating cost.

### 3. Process Management: Native systemd Daemon
The Spring Boot backend runs as a native systemd unit (`unix-backend.service`) rather than inside a heavy container runtime. Configuration parameters `Restart=always` and `RestartSec=10` guarantee recovery after crashes or machine reboots. `SuccessExitStatus=143` prevents clean SIGTERM terminations from being marked as service failures.

### 4. Database: Oracle Autonomous Database (ATP 19c)
Leverages Oracle's Always-Free Autonomous Transaction Processing instance. Connection is established through Mutual TLS (mTLS) using an Oracle Wallet rather than standard unencrypted TCP connections.

### 5. TLS Configuration: sslip.io with Certbot
To achieve trusted HTTPS without purchasing a custom domain during the initial testing phase, `sslip.io` maps the public IP (`129.159.228.83`) to `129-159-228-83.sslip.io`. Certbot uses this hostname to issue valid Let's Encrypt certificates, avoiding browser mixed-content blocks and insecure certificate warnings.

### 6. Authentication: Dual-Scheme (Authorization Bearer Header and HttpOnly JWT Cookies)
- User registration requires proof of institutional ownership via a 6-digit one-time password delivered to the student's campus email.
- A dual authentication strategy is employed to guarantee complete cross-platform mobile compatibility. While session tokens are set as `HttpOnly`, `Secure`, `SameSite=None` cookies for standard browser flows, Apple WebKit Intelligent Tracking Prevention (ITP) and third-party cookie restrictions on iOS Safari silently block cross-site cookies between Cloudflare Pages (`unix-9o9.pages.dev`) and the OCI backend (`129-159-228-83.sslip.io`).
- To resolve this without introducing security compromises, the backend returns the signed JWT in the authentication response body, and the client Axios interceptor transmits it via the standard `Authorization: Bearer <token>` header on all subsequent API requests. The backend filter evaluates the `Authorization` header first, falling back to cookie extraction.
- Password hashes are stored using standard BCrypt with cost factor 10.

### 7. CORS Security: Pattern-Based Origin Matching
Rather than a single hardcoded URL, the backend permits specified origin patterns (`https://*.pages.dev`, `https://*.sslip.io`, `https://unix.kitsw.ac.in`, and `http://localhost:*`), accommodating preview deployments alongside production and development environments.

### 8. JVM Memory Boundaries
Because the host OCI VM operates under a 1 GB physical memory limit, the backend process is constrained to `-Xms96m -Xmx256m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=32m -XX:+UseSerialGC -Xss256k` with HikariCP connection pool caps to prevent Out-Of-Memory kernel terminations.

### 9. Observability: Self-Built Telegram Watchdog
Since the backend runs on a bare, unmanaged OCI VM with no PaaS-provided crash notifications (unlike Railway/Render), a custom lightweight monitoring daemon (`vertex-monitor`) was built and deployed as a persistent systemd service. It polls RAM, CPU, swap, and kernel OOM-kill events at a fixed interval, pushes threshold-breach alerts to a dedicated Telegram bot with the last N lines of `journalctl` attached automatically, and exposes `/status` and `/logs` commands for on-demand diagnostics — eliminating the need to SSH in reactively to check what happened. The process itself is hard-capped at 30MB RSS via `MemoryMax` in its systemd unit, ensuring the watchdog can never itself contribute to the memory pressure it's meant to catch.

### 10. Media Storage: Cloudflare R2 over local disk or database BLOBs
Listing images are stored in Cloudflare R2 rather than on the OCI VM's disk or as database BLOBs. R2 exposes an S3-compatible API, so the backend uses the official AWS S3 SDK with `Region.of("auto")` and an endpoint override, avoiding a Cloudflare-specific client dependency. This keeps the 1GB VM's limited disk free of user-uploaded media and avoids bloating Oracle ATP storage with binary data it isn't suited for. Images are compressed client-side (HTML5 Canvas, resized to ~800px width, 0.7 JPEG quality) before upload, reducing both R2 storage cost and upload time on typical campus wifi.

### 11. Contact Reveal: Privacy-preserving, transaction-gated phone disclosure
A student's WhatsApp number is never exposed on a public listing or to a party whose transaction request is still `PENDING`. Phone numbers are resolved dynamically at response-serialization time (not stored redundantly on the transaction) and only populated on the DTO when a transaction's status is `ACCEPTED`. This means a listing owner can freely browse interest without leaking their number to every requester, and a requester's number stays private until the owner actually commits to the exchange — the access control lives in the serialization layer, not just the endpoint, so there is no route that can leak a number ahead of acceptance.

---

## Backend Specifications

The UniX Backend is a high-performance, enterprise-grade server application built to power the UniX platform, running on Java 21, Spring Boot, and connected securely to an Oracle Autonomous Database via mTLS.

### Runtime Environment
- **JDK**: Java 21 OpenJDK (LTS)
- **Framework**: Spring Boot 3.3.4
- **Persistence**: Spring Data JPA / Hibernate 6 with HikariCP pooling
- **Active Profile**: `oracle` (Production) / `dev` (Local H2)

### Oracle Database Connectivity
- Database: Oracle Autonomous Database (19c Enterprise Edition)
- Driver: Official Oracle JDBC Driver (`ojdbc11`) with security packages (`oraclepki`, `osdt_core`, `osdt_cert`)
- Security: Mutual TLS (mTLS) authentication via Oracle Wallet located at `oracle_wallet/` (containing `cwallet.sso`, `ewallet.p12`, `tnsnames.ora`, and `sqlnet.ora`)

### Reverse Proxy Configuration
Nginx acts as the front-facing web server on the OCI VM:
- Listens on standard port 80 (redirects to HTTPS) and port 443 (SSL/TLS terminated via Let's Encrypt).
- Proxies API traffic to the internal Spring Boot application running on `http://127.0.0.1:8080`.
- Configured with proxy headers (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) to preserve original client metadata.

### Process Management with systemd
The service is registered on the VM as `unix-backend.service`:
- Unit location: `/etc/systemd/system/unix-backend.service`
- Target artifact: `/home/ubuntu/unix-backend-0.0.1-SNAPSHOT.jar`
- Automatic restart policies: `Restart=always`, `RestartSec=10`
- JVM constraints: `-Xms96m -Xmx256m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=32m -XX:+UseSerialGC -Xss256k`

Remote service management commands:
```bash
# Check service status and runtime logs
sudo systemctl status unix-backend

# Start the backend service
sudo systemctl start unix-backend

# Restart the backend service
sudo systemctl restart unix-backend

# Stop the backend service
sudo systemctl stop unix-backend

# View real-time journal logs
sudo journalctl -u unix-backend -f
```

---

## Monitoring and Observability

The OCI VM has no built-in crash notification system, so a custom watchdog (`vertex-monitor`) runs alongside the backend as an independent systemd service.

### Capabilities
- Polls RAM, CPU, and swap usage every 30 seconds against configurable thresholds
- Tails `journalctl -k` for kernel OOM-kill events
- Performs backend health checks against `/health` (or equivalent) and alerts on non-200 responses or unreachability
- Attaches the last 30-50 lines of backend logs directly to failure alerts — no manual SSH required to see what broke
- Telegram bot commands: `/status` (live RAM/CPU/disk), `/logs [n]` (last n backend log lines), `/help`

### Resource Footprint
- ~3.5MB RSS at runtime, hard-capped at 30MB via systemd `MemoryMax`
- Runs as a dedicated non-root system user (`vertexmon`) with `systemd-journal` group access, restricted via `ProtectSystem=strict`, `NoNewPrivileges=true`

### Deployment
- Unit file: `/etc/systemd/system/vertex-monitor.service`
- Auto-restarts on crash (`Restart=always`) and on VM reboot (`enable`d)
- Secrets (bot token, chat ID) isolated in a `.env` file with `600` permissions, loaded via `EnvironmentFile`

---

## Security and Authentication

1. **Dual-Scheme Token Handling**: Authentication supports both `Authorization: Bearer <token>` request headers and `HttpOnly`, `Secure`, `SameSite=None` session cookies. This eliminates authentication drops caused by third-party cookie blocking on iOS WebKit / mobile browsers while preserving secure server-side session controls.
2. **Domain Boundary Check**: Registration and login check constraints enforce `@kitsw.ac.in` email structure on both the API validation layer and the database table level (`chk_users_domain`).
3. **OTP Security Measures**:
   - 10-minute time-to-live validity period.
   - 60-second cooldown period between successive OTP requests.
   - Maximum attempt threshold (5 failed tries) triggers token invalidation.
4. **Network and Ingress Hardening**:
   - Host OCI Virtual Cloud Network (VCN) security lists restrict ingress strictly to ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).
   - Internal port 8080 is inaccessible from the public internet.

---

## Database Schema and Models

The relational schema is managed through Flyway migration scripts (`src/main/resources/db/migration/`), currently at `V3__add_image_url_and_phone.sql`.

```
+---------------------------------------+
|               APP_USERS               |
+---------------------------------------+
| id            NUMBER(19,0) [PK]       |
| email         VARCHAR2(150) [UNIQUE]  |
| roll_number   VARCHAR2(50) [UNIQUE]   |
| password_hash VARCHAR2(255)           |
| full_name     VARCHAR2(100)           |
| phone         VARCHAR2(30)            |
| is_verified   NUMBER(1,0)             |
| is_active     NUMBER(1,0)             |
| created_at    TIMESTAMP WITH TIMEZONE |
| updated_at    TIMESTAMP WITH TIMEZONE |
+---------------------------------------+
          | 1                     | 1
          |                       |
          | *                     | *
+--------------------+   +---------------------------------------+
|    AUTH_TOKENS     |   |               LISTINGS                |
+--------------------+   +---------------------------------------+
| id            (PK) |   | id               NUMBER(19,0) [PK]    |
| user_id       (FK) |   | owner_id         NUMBER(19,0) [FK]    |
| email              |   | title            VARCHAR2(150)        |
| token_hash         |   | description      VARCHAR2(2000)       |
| expires_at         |   | type             (SELL | RENT | SWAP) |
| is_used            |   | category         (CALCULATOR |        |
| attempt_count      |   |                   DRAFTING |          |
| created_at         |   |                   ELECTRONICS | OTHER)|
+--------------------+   | status           (ACTIVE | RESERVED | |
                         |                   COMPLETED | CLOSED) |
                         | price            NUMBER(10,2)         |
                         | rental_rate      NUMBER(10,2)         |
                         | rental_period    (DAILY | WEEKLY |    |
                         |                   MONTHLY | SEMESTER) |
                         | deposit_amount   NUMBER(10,2)         |
                         | swap_preferences VARCHAR2(500)        |
                         | image_url        VARCHAR2(500)        |
                         | version          NUMBER(19,0)         |
                         | created_at, updated_at                |
                         +---------------------------------------+
                                             | 1
                                             |
                                             | *
                         +---------------------------------------+
                         |             TRANSACTIONS              |
                         +---------------------------------------+
                         | id           NUMBER(19,0) [PK]        |
                         | listing_id   NUMBER(19,0) [FK]        |
                         | requester_id NUMBER(19,0) [FK]        |
                         | status       (PENDING | ACCEPTED |    |
                         |               REJECTED | COMPLETED)   |
                         | created_at, updated_at                |
                         +---------------------------------------+
```

### Table Specifications
- **APP_USERS**: Stores student identities, verified campus emails, roll numbers, password hashes, and an optional WhatsApp `phone` number, disclosed only under the conditions described in [Architectural Decision 11](#11-contact-reveal-privacy-preserving-transaction-gated-phone-disclosure).
- **AUTH_TOKENS**: Stores hashed one-time passwords for verification workflows.
- **LISTINGS**: Polymorphic resource listings with table check constraints ensuring field integrity:
  - `SELL` listings require `price` and reject rental fields.
  - `RENT` listings require `rental_rate` and `rental_period`.
  - `SWAP` listings require price and rental fields to be null.
  - `image_url` is optional, populated after creation via a separate image upload endpoint, and points to a public Cloudflare R2 object URL.
- **TRANSACTIONS**: Tracks exchange requests, rental bookings, and status transitions between buyers and listing owners.

---

## API Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/request-otp` | Sends a 6-digit OTP code to student email | No |
| `POST` | `/api/auth/register/verify-otp` | Validates registration OTP code | No |
| `POST` | `/api/auth/register/confirm` | Sets password, creates account, sets JWT cookie | No |
| `POST` | `/api/auth/login` | Validates roll number & password, sets JWT cookie | No |
| `POST` | `/api/auth/logout` | Clears authentication cookie | No |
| `GET` | `/api/auth/me` | Retrieves profile of currently authenticated user | Yes |

### Listings (`/api/listings`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/listings` | Paginated search (`category`, `type`, `status`, `page`, `size`) | No |
| `GET` | `/api/listings/{id}` | Retrieves detailed listing information by ID | No |
| `POST` | `/api/listings` | Creates a new resource listing | Yes |
| `PUT` | `/api/listings/{id}` | Updates existing listing attributes (owner only) | Yes |
| `DELETE`| `/api/listings/{id}` | Closes/deactivates a listing (owner only) | Yes |
| `POST` | `/api/listings/{id}/image` | Uploads a listing image to Cloudflare R2 (owner only, multipart, max 5MB, jpeg/png/webp) | Yes (Owner) |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `PUT` | `/api/users/me/phone` | Sets or updates the authenticated user's WhatsApp contact number | Yes |

### Transactions (`/api/transactions`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/transactions` | Submits a request/offer on an active listing | Yes |
| `PATCH`| `/api/transactions/{id}/status` | Updates request status (`ACCEPTED` or `REJECTED`); phone numbers only appear in the response once status is `ACCEPTED` | Yes (Owner) |
| `GET` | `/api/transactions/me` | Fetches user's sent and received transaction requests | Yes |

---

## Design System

UniX uses a custom color scheme internally designated as **"Inception"**:

### Color Tokens

| Token | Value | Role |
| :--- | :--- | :--- |
| `brand-primary` | `#173541` | Primary identity, dark surfaces, headers, primary buttons |
| `brand-secondary` | `#557C86` | Secondary body text, icons, card borders |
| `brand-tertiary` | `#7299A8` | Subtle accents, hover state borders |
| `brand-light` | `#85ADBB` | Focus indicators, soft background tints |
| `brand-accent` | `#B49796` | Dusty rose highlight, swap badge, secondary CTA |
| `brand-bg` | `#FAFAF8` | Warm light canvas background |

### Typography and Radii
- **Typography**: Inter (Google Fonts), applied across wordmarks, headings, and data tables.
- **Border Radius Scale**:
  - `0px`: Structural layout dividers
  - `4px` (`tight`): Dense chips and status badges
  - `8px` (`control`): Form inputs, select menus, interactive buttons
  - `12px` (`surface`): Resource listing cards and filter bars
  - `16px` (`container`): Modals, dialog boxes, and major containers
  - `full`: Circular avatar badges and counter pills

No emojis or em dashes are utilized anywhere in the UI copy or system notifications.

---

## Brand Identity

The UniX brand mark, titled "The Instrument", is a stylized representation of an engineering drafting compass simplified to its two legs and central pivot point.

Rather than using generic e-commerce icons or fintech exchange arrows, the mark references physical equipment familiar to engineering students. The central pivot reflects a dual meaning:
1. One single origin diverging into two pathways (the point of exchange).
2. A single campus community supplying diverse tools to its members.

Static brand assets (SVG marks, transparent logo lockups, apple touch icons, and multi-size favicons) are stored under `frontend/public/` and `frontend/src/assets/`.

---

## Project Status

### Completed and Verified
- Cloud infrastructure setup: OCI VM, systemd daemon, Nginx reverse proxy, Let's Encrypt TLS certificate via `sslip.io`.
- Backend connectivity to Oracle Autonomous Database (ATP 19c) using Oracle Wallet mTLS.
- Complete authentication lifecycle: OTP dispatch via Gmail SMTP, token validation, BCrypt password hashing, and HttpOnly JWT cookies.
- Cross-origin session and CORS policy integration with Cloudflare Pages.
- Inception design system and responsive frontend layout.
- Listings browsing, filtering, modal inspections, and request transaction flow.
- Listing image uploads via Cloudflare R2, with client-side compression before upload.
- WhatsApp contact reveal, gated to fire only once a transaction reaches `ACCEPTED` status.

### Planned Enhancements
1. Community moderation tools: user reporting, flag review, and administrative suspension.
2. Before/after handoff photos on transactions, for equipment condition verification at exchange time (distinct from the listing's own display image, already shipped).
3. Interactive campus map pickup locations for equipment handoffs.

---

## Version Control and Repository Structure

UniX utilizes a clean, modular side-by-side repository architecture inside the root `UniX/` workspace. Both `frontend/` and `backend/` are independently version-controlled Git repositories:

```
UniX/
├── backend/                              # Spring Boot Backend (Git initialized here)
│   ├── pom.xml                           # Backend Maven project descriptor
│   ├── .gitignore                        # Strict ignore rules for keys, wallet & build targets
│   ├── oracle_wallet/                    # Oracle ATP Wallet files (ignored by Git)
│   ├── .ssh/                             # Production VM SSH keys (ignored by Git)
│   ├── .env                              # Local environment secrets (ignored by Git)
│   ├── unix-backend.service              # Systemd unit service configuration
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/unix/
│   │   │   │   ├── config/              # Security, CORS, CSRF, and App properties
│   │   │   │   ├── controller/          # Auth, Listing, User, and Transaction controllers
│   │   │   │   ├── domain/              # Entities and Enums (User, Listing, Transaction)
│   │   │   │   ├── dto/                 # Request and Response DTOs
│   │   │   │   ├── exception/           # Global exception handlers and error codes
│   │   │   │   ├── repository/          # Spring Data JPA repositories
│   │   │   │   ├── security/            # JwtAuthenticationFilter, JwtService, UserPrincipal
│   │   │   │   ├── service/             # Business logic, R2 storage, OTP, and Mail services
│   │   │   │   └── UniXApplication.java # Main application entry point
│   │   │   └── resources/
│   │   │       ├── application.yml      # Base configuration & H2 dev profile
│   │   │       ├── application-oracle.yml # Oracle production profile
│   │   │       └── db/migration/        # Flyway versioned migration scripts (V1, V2, V3)
│   │   └── test/                        # Unit and integration test suite
│   └── target/                          # Packaged artifacts (ignored by Git)
│
└── frontend/                             # React application (Git initialized here)
    ├── package.json                     # Frontend dependencies and scripts
    ├── vite.config.js                   # Vite configuration and dev proxy
    ├── tailwind.config.js               # Theme definitions and color tokens
    ├── index.html                       # HTML template with SEO and Open Graph metadata
    ├── public/                          # Static branding files, SVGs, and favicons
    └── src/
        ├── api/                         # Axios client configuration and interceptors
        ├── assets/                      # Vector marks and logo lockups
        ├── components/                  # Modals, Cards, Navbar, ProtectedRoute, ProfileModal
        ├── context/                     # AuthContext state provider
        ├── pages/                       # DashboardPage, LoginPage
        └── utils/                       # Cookie utilities, imageUtils (client-side compression)
```

### Frontend Git Commit History

1. `79338a8` - Initial frontend commit
   - Base React SPA structure, Vite integration, initial page layouts, authentication context, and listing components.
2. `5d1dfde` - Fix axios baseURL to use VITE_API_URL and log URL for debugging
   - Configured dynamic API routing through environment variables for production flexibility.
3. `c124ed2` - UniX revamp to inception theme
   - Complete visual redesign using the Inception color palette, structured border radius scale, and refined typography.
4. `d30f325` - feat(brand): added brand identity, favicons, svg etc
   - Introduced "The Instrument" brand assets, responsive SVG lockups, multi-platform favicons, and Open Graph previews.
5. `23b4761` - fix(api): improve error handling and remove cross-origin xsrf interceptor
   - Standardized API error payloads and resolved cross-origin cookie authentication requirements.
6. `acaeb6f` - feat: add listing image uploads via Cloudflare R2 and WhatsApp contact reveal on accepted transactions
   - Integrated multipart image uploads with client-side canvas compression, R2 object storage, and conditional WhatsApp phone revelation for accepted transactions.
7. `cbec34f` - fix(auth): add Bearer token authorization header alongside cookies for cross-origin mobile browser support
   - Implemented dual-scheme authentication using Authorization Bearer headers to eliminate 401 Unauthorized errors caused by iOS Safari third-party cookie partitioning.

---

## Local Development

### Prerequisites
- Java Development Kit (JDK) 21 or higher
- Node.js 18+ and npm
- Apache Maven 3.9+

### Running the Backend Locally
The backend provides an in-memory H2 database profile (`dev`) for local testing without needing Oracle Cloud credentials:

```bash
# Navigate to backend directory
cd backend

# Run with development profile using H2 in-memory database
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

- Backend API: `http://localhost:8080`
- H2 Database Web Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:unixdb`, Username: `sa`, Password: empty)

To run the backend locally with the Oracle Autonomous Database profile:
```bash
cd backend
mvn clean package -DskipTests
java -Dspring.profiles.active=oracle -jar target/unix-backend-0.0.1-SNAPSHOT.jar
```

### Running the Frontend Locally

```bash
cd frontend
npm install
```

Create a `.env.local` file inside `frontend/`:
```env
VITE_API_URL=http://localhost:8080
```

Start the Vite development server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Deployment Specifications

### Production Backend Environment
- **Host**: Oracle Cloud Infrastructure (OCI) Always-Free Compute Instance
- **OS**: Ubuntu 24.04 LTS
- **IP Address**: `129.159.228.83`
- **SSH User**: `ubuntu`
- **SSH Key**: `backend\.ssh\ssh-key-2026-08-26.key`
- **Application Path**: `/home/ubuntu/unix-backend-0.0.1-SNAPSHOT.jar`
- **Systemd Service**: `unix-backend.service`
- **Active Profile**: `oracle`
- **JVM Flags**: `-Xms96m -Xmx256m -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=32m -XX:+UseSerialGC -Xss256k`

### SSH Access
Connect to the production OCI instance via SSH:
```bash
ssh -i "backend\.ssh\ssh-key-2026-08-26.key" ubuntu@129.159.228.83
```

### Manual Backend Deployment Workflow
```bash
# 1. Build release artifact locally
cd backend
mvn clean package -DskipTests

# 2. Transfer binary to the OCI VM
scp -i ".\.ssh\ssh-key-2026-08-26.key" target/unix-backend-0.0.1-SNAPSHOT.jar ubuntu@129.159.228.83:/home/ubuntu/

# 3. Restart the background systemd service
ssh -i ".\.ssh\ssh-key-2026-08-26.key" ubuntu@129.159.228.83 "sudo systemctl restart unix-backend"
```

### Frontend Deployment
- **Platform**: Cloudflare Pages
- **Production URL**: `https://unix-9o9.pages.dev`
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Trigger**: Automatic continuous deployment on push to `main` branch.

---

## Lessons Learned

1. **Explicit API Base URLs on Static Hosts**: When hosting SPAs on static edge platforms (such as Cloudflare Pages), Axios instances without an explicit `baseURL` default to calling the static host domain, resulting in unexpected `405 Method Not Allowed` errors. Injecting `VITE_API_URL` into client configuration resolves this.
2. **Cross-Site Cookie Flags**: Cross-origin requests between Cloudflare Pages and the OCI backend require `SameSite=None; Secure=true` on JWT cookies. Standard `Lax` or `Strict` settings cause browsers to silently withhold authentication cookies on cross-origin requests.
3. **Mixed Content Blocking**: Modern web browsers strictly block unencrypted HTTP requests initiated from HTTPS-hosted frontends. Provisioning Let's Encrypt certificates via Certbot on the Nginx reverse proxy using an `sslip.io` hostname resolved mixed-content failures without requiring a paid domain name.
4. **Oracle Autonomous DB SQL Worksheet Commit Behavior**: Oracle Cloud browser SQL worksheets may report "Commit complete" on table modification queries without persisting row deletions due to session locking. Using `TRUNCATE TABLE` reliably resets testing tables during development.
5. **JVM Heap Ceiling ≠ Actual RSS**: Setting `-Xmx` only bounds heap — metaspace, thread stacks, and JIT code cache are separate, uncapped allocations that can push real RSS well past the heap limit on a 1GB VM. Adding `-XX:MaxMetaspaceSize`, `-XX:ReservedCodeCacheSize`, `-Xss`, and switching to `-XX:+UseSerialGC` (leaner than G1 on single-core boxes) brought idle memory usage down meaningfully. A 1GB swapfile with `vm.swappiness=10` was also added as a last-resort buffer against kernel OOM-kills without relying on it for routine memory pressure.
6. **Metaspace Undersizing Causes Startup Crashes, Not Just Slowness**: An initial `-XX:MaxMetaspaceSize=80m` cap caused the JVM to crash with an OutOfMemoryError during startup — Spring Boot 3, Hibernate, Tomcat, and Spring Data JPA collectively load far more classes at boot than at steady-state idle. Unlike heap pressure (which degrades gracefully via GC), metaspace exhaustion is a hard failure. Raised to `-XX:MaxMetaspaceSize=128m` to give class loading sufficient room.
7. **Third-Party Cookie Partitioning and ITP on Mobile WebKit**: Hosting the frontend on a static edge domain (`unix-9o9.pages.dev`) while routing API traffic to a separate VM domain (`129-159-228-83.sslip.io`) introduces a cross-site context. Even when cookies are configured with `SameSite=None; Secure=true`, Apple WebKit's Intelligent Tracking Prevention (ITP) on iOS Safari and modern mobile browsers blocks third-party cookie storage entirely, causing subsequent credentialed requests to fail with `401 Unauthorized`. Implementing a dual-scheme authentication architecture where tokens are transmitted via the `Authorization: Bearer <token>` header completely bypasses cookie partitioning restrictions across all mobile platforms.

---

## License and Contact

All rights reserved. This project is proprietary software developed specifically for the students of Kakatiya Institute of Technology & Science, Warangal (KITSW).

- Repository: [github.com/ziyad-hyder/unix](https://github.com/ziyad-hyder/unix)
