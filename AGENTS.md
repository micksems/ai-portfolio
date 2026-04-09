# AGENTS.md — AI Agent Rules for ai-portfolio

## Purpose
This file defines how AI agents must behave when working in this repository.
Agents must follow these rules strictly. If a rule is unclear, ask before acting.

---

## Project Overview
- This is a **personal portfolio website**.
- Built with **Next.js App Router** and **Tailwind CSS**.
- Goal: demonstrate **AI‑augmented development**, not manual coding volume.
- Code should be simple, readable, and explainable.

---

## Framework & Architecture Rules
- ✅ Use **Next.js App Router only** (`src/app/**`)
- ❌ Do NOT use Pages Router (`pages/`)
- ✅ Prefer **Server Components** by default
- ✅ Use **Client Components only when necessary**
- ❌ Do NOT introduce unnecessary libraries or frameworks

---

## File & Folder Conventions
- UI routes live in `src/app/`
- Backend logic lives in `src/app/api/`
- Shared utilities go in clearly named folders
- Keep file structure flat and understandable

---

## AI & API Usage Rules (CRITICAL)
- ❌ **NEVER** place API keys in frontend code
- ✅ AI API calls must happen **server‑side only**
- ✅ Use environment variables for secrets
- ✅ Minimize token usage and API calls
- ❌ Do NOT log secrets or sensitive data

---

## Coding Style & Behavior
- Prefer clarity over cleverness
- Write code that a beginner can read
- Add comments only when they add real value
- Avoid premature optimization

---

## Agent Behavior Rules
- If unsure, **explain the uncertainty before generating code**
- If multiple approaches exist, **list options and tradeoffs**
- Do NOT assume outdated Next.js or React patterns
- Do NOT silently change architecture decisions

---

## Learning Priority
The human is learning **AI‑orchestrated development**.
Agents should:
- Explain *why* choices are made
- Avoid over‑engineering
- Favor incremental, reviewable changes

---

## Success Criteria
A change is successful if:
- It works
- It is understandable
- It follows these rules
## First Agent Task
The first task for any AI agent is:

1. Explain, in plain language, what this project is.
2. Explain how it should behave when asked to add a feature.
3. Explain what it must never do.

No code should be written for this task.