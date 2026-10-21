# UniX Frontend

UniX is a campus resource-sharing platform designed for university students to exchange essential academic equipment, including scientific calculators, engineering drafting kits, lab tools, and textbooks. The platform facilitates peer-to-peer sharing through direct sales, equipment rentals, and item swaps within a verified campus community.

- Production Web Application: [unix-9o9.pages.dev](https://unix-9o9.pages.dev)
- Source Repository: [github.com/ziyad-hyder/unix](https://github.com/ziyad-hyder/unix)

---

## User Features

- **Resource Listings**: Browse, search, and filter available campus items across categories such as Calculators, Drafting Tools, Electronics, and Academic Resources.
- **Flexible Exchange Types**:
  - **Rent**: Borrow items for daily, weekly, monthly, or semester durations.
  - **Buy / Sell**: Purchase equipment directly from peers at student-friendly prices.
  - **Swap**: Trade specialized tools and course materials directly.
- **Verified Exchanges**:
  - Time-bound physical handoff and return workflows with verification codes to ensure transparent exchange confirmation between parties.
  - Clear item lifecycle tracking from request submission to completion.
- **Due Date Reminders**:
  - Live rental countdown badges and timely return notices to help students return borrowed equipment on schedule.
- **Privacy-Preserving Contact Sharing**:
  - Direct communication channels are made available exclusively between active transaction participants once a request is accepted.

---

## Evolution of Exchange Workflows

UniX has evolved its exchange experience across major versions to better protect student belongings and simplify campus borrowing:

- **Initial Release (Simple Request and Accept)**:
  - Users submitted exchange requests, which owners accepted or declined. Once accepted, items were marked complete without active lifecycle tracking.
  - While simple, this provided no visibility for rentals into active loan periods, return deadlines, or overdue status.

- **Intermediate Update (Rental Lifecycles and Due Dates)**:
  - Introduced dedicated rental stages (Active Lease, Return Pending, Overdue), giving students a real-time countdown badge on their dashboard indicating when an item was due.
  - Added automated reminders prior to return deadlines to help borrowers return items on schedule.

- **Current Version (Two-Party Verified Handover and Return)**:
  - Replaced unilateral "marked handed over" and "marked returned" buttons with mutual 6-digit verification codes.
  - When borrowing an item, the student receives a handoff code to show the owner at physical pickup.
  - When returning an item, the owner receives a return code to show the student at physical dropoff.
  - Entering the matching code instantly confirms the exchange between both parties, ensuring both students agree on the exchange.
  - A fallback option ("Can't use a code?") remains accessible for situations where a phone battery is depleted, ensuring students are never stuck.

---

## Tech Stack

- **Framework**: React 18 (Single Page Application)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom Inception palette tokens
- **Icons**: Lucide React
- **HTTP Client**: Axios with credentialed session management
- **Deployment**: Cloudflare Pages

---

## Getting Started Locally

### Prerequisites

- Node.js (version 18 or higher)
- npm (version 9 or higher)

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

3. Create a local environment configuration file:
   Create a file named `.env.local` in the `frontend` root:
   ```env
   VITE_API_URL=http://localhost:8080
   ```

4. Start the local development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`.

### Production Build

To validate or build the static production bundle:
```bash
npm run build
```
The compiled assets will be output to the `dist/` directory.

---

## Environment Variables

The frontend application requires only the following client-side environment variable:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the UniX REST API backend service | `http://localhost:8080` |

The application communicates with the backend REST API for all data persistence and authentication.

---

## Design System

The UniX interface uses the custom Inception color scheme and clean geometric design tokens:
- Primary Dark: `#173541` (Headers, navigation, primary actions)
- Secondary Slate: `#557C86` (Supporting text, icons, borders)
- Warm Canvas: `#FAFAF8` (Clean, distraction-free reading background)
- Typography: Inter typeface family with monospace numeric displays for verification codes.

---

## License

All rights reserved. Proprietary software developed for campus resource sharing.
