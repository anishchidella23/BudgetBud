# BudgetBud

A budgeting app for tracking spending, bills, and savings goals — built as a
mobile-style single-screen app in vanilla JavaScript, with hand-drawn SVG charts
and no charting or UI framework anywhere in the stack.

![Home screen](docs/home.jpg)

## Features

**Home** — running balance, monthly budget with a progress bar, and upcoming
bills you can mark paid or delete. A donut chart breaks spending down by
category with leader-line labels, and the day/month toggle pages back through
previous periods (forward navigation stops at today).

**Transactions** — full history with live search across names and categories, a
category filter, a date/amount sort toggle, per-row delete, and CSV export.

**Savings** — savings goals with progress toward each target, plus a line chart
of total savings over time.

| Transactions | Savings |
| --- | --- |
| ![Transactions screen](docs/transactions.jpg) | ![Savings screen](docs/savings.jpg) |

Everything is stored in `localStorage`, so the app is fully client-side — no
account, no server, no data leaving the browser.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm test         # unit tests
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## How it's put together

```
index.html            markup for all three screens and the modal sheets
src/
  main.js             entry point: loads state, wires the shell, renders
  state.js            state shape and the pure selectors derived from it
  storage.js          localStorage persistence
  forms.js            modal form submissions
  render/             one module per screen (home, transactions, savings)
  charts/             donut.js, line.js, and shared SVG helpers
  ui/                 DOM lookup and modal open/close
  utils/              date and formatting helpers
tests/                unit tests for the pure logic
```

The design keeps rendering separate from state. Everything in `state.js` is a
plain function of a state object — `computeTotals`, `spendingByCategory`,
`filterTransactions`, `transactionsToCsv` — so the numbers can be tested without
a DOM. Each screen module exposes a `bind` (event listeners, attached once at
startup) and a `render` (paint from current state), and mutations go through
`save()` so the browser copy never drifts from what's on screen.

Both charts are drawn by hand with the SVG DOM API. The donut computes annular
arc paths from polar coordinates and clamps each leader line inside the viewBox
so labels stay on canvas; a single-category month is drawn as a stroked circle,
since an arc from an angle back to itself has nothing to render.

Dates are stored as `YYYY-MM-DD` and always parsed as local dates —
`new Date("2025-11-07")` parses as UTC midnight, which lands on the previous day
in western timezones, so `parseLocalDate` splits the string by hand instead.

## Project history

This started as a 1,300-line single-file prototype for a UI design course:
markup, styles, and logic in one `index.html`, with state held in memory. The
rewrite split it into modules and fixed the bugs that structure was hiding:

- **State is persisted.** The prototype kept everything in memory, so a refresh
  silently wiped every transaction, bill, and goal.
- **Budget usage follows the month being viewed.** It previously measured the
  *monthly* budget against *all-time* spending, so the progress bar disagreed
  with the correctly month-filtered chart directly beneath it.
- **User text is escaped before it reaches `innerHTML`.** A transaction named
  `Coffee <b>oat</b>` used to render as markup.
- **Sort mode survives a re-render.** It lived in a local variable that every
  re-render reset, so adding or deleting a row reverted the user's sort.
- **Savings history is keyed `YYYY-MM` instead of a bare month name,** so the
  series stays in order across a year boundary.

## License

MIT
