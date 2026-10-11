# 🎓 ExamPortal — Full-Stack Proctored Examination & Assessment System

A modern, full-stack examination and testing portal built with **Next.js (App Router, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL)**.

---

## 🌟 Key Features

- **Authentication & RBAC**: Edge-ready JWT session management with HTTP-only cookies and role-based access control (`ADMIN` and `STUDENT`).
- **Admin Dashboard**: Comprehensive platform metrics (total exams, active candidates, test submissions, overall pass rates), active test monitors, and recent submission logs.
- **Student Management**: Candidate CRUD operations, real-time search/filtering by name, department, or student roll ID, and bulk CSV/batch imports.
- **Interactive Exam Builder**: Create single/multi-choice MCQs, True/False, and short-answer questions with custom points, negative marking deductions, explanation notes, and question reordering.
- **Scheduling & Batch Assignment**: Assign exams to individual students or entire departments, set time windows (`validFrom`, `validTo`), and control attempt limits.
- **Proctored Student Exam Room**: Distraction-free testing UI, live countdown timer with auto-submit, real-time tab switch & window blur detection, background answer auto-saving, and an interactive question palette.
- **Automated Scoring Engine**: Instant evaluation supporting positive and negative marking, zero-floor protection, and instant pass/fail determination.
- **Attempt Review & Analytics**: Comprehensive question-by-question breakdown displaying candidate selections, correct answers, and instructor solution notes.
- **Verifiable Digital Certificates**: Printable, high-resolution certificates with unique serial numbers (`CERT-2026-XXXXX`), instructor signatures, and a public verification link (`/verify/[code]`).
- **Docker Ready**: Production multi-stage `Dockerfile` and `docker-compose.yml` with a PostgreSQL 16 container.

---

## 🚀 Getting Started

### 1. Configure Database Connection

Create or update your `.env` file with your PostgreSQL connection URL (e.g. from Supabase, Neon, Railway, Render, or a local instance):

```env
DATABASE_URL="postgresql://username:password@host:5432/exam_portal?schema=public"
JWT_SECRET="exam-portal-secret-token-key-change-in-production-2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Push Schema to Database & Seed Sample Data

```bash
# Push Prisma schema to your database
npm run db:push

# Populate sample Admin, Students, Exams, Questions, Assignments, and Certificates
npm run db:seed
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-Seeded Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@examportal.com` | `admin123` | Exam Builder, Candidate Enrollment, Analytics, Grading |
| **Student 1** | `john.doe@student.com` | `student123` | Proctored Exam Room, Attempt History, Certificates |
| **Student 2** | `jane.smith@student.com` | `student123` | Assigned Exams, Candidate Portal |
| **Student 3** | `alex.jones@student.com` | `student123` | Candidate Portal |

*(Quick demo login buttons are also available directly on the login page!)*

---

## 🧪 Running Automated Tests

Run the automated unit and integration test suite:

```bash
npm test
```

This verifies password hashing, JWT authentication tokens, the evaluation scoring engine, negative marking formulas, and utility formatting.

---

## 🐳 Docker Deployment

To launch the full system (Application + PostgreSQL database) with a single command:

```bash
docker-compose up --build -d
```

The portal will be accessible at [http://localhost:3000](http://localhost:3000).
