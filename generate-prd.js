const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, TableOfContents,
  PageBreak, ExternalHyperlink
} = require('docx');
const fs = require('fs');

// ─── helpers ────────────────────────────────────────────────────────────────

const CONTENT_WIDTH = 9360; // US Letter, 1" margins

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const thickBorder = { style: BorderStyle.SINGLE, size: 4, color: "2C5F8A" };
const thickBorders = { top: thickBorder, bottom: thickBorder, left: thickBorder, right: thickBorder };

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: "1B3A5C" })],
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "2C5F8A", space: 4 } },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: "2C5F8A" })],
    spacing: { before: 280, after: 100 },
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 22, font: "Arial", color: "3A7CBF" })],
    spacing: { before: 200, after: 80 },
  });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: "Arial", color: "2D2D2D" })],
    spacing: { after: 120 },
  });
}

function bold(text) {
  return new TextRun({ text, bold: true, size: 22, font: "Arial", color: "2D2D2D" });
}

function normal(text) {
  return new TextRun({ text, size: 22, font: "Arial", color: "2D2D2D" });
}

function code(text) {
  return new TextRun({ text, size: 20, font: "Courier New", color: "1A1A1A" });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "2D2D2D" })],
    spacing: { after: 80 },
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "2D2D2D" })],
    spacing: { after: 80 },
  });
}

function spacer(size = 160) {
  return new Paragraph({ children: [new TextRun("")], spacing: { after: size } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function infoBox(label, content, color = "EBF4FF", borderColor = "2C5F8A") {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              left: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
              right: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
            },
            shading: { fill: color, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label + "  ", bold: true, size: 20, font: "Arial", color: borderColor }),
                           new TextRun({ text: content, size: 20, font: "Arial", color: "2D2D2D" })],
              })
            ]
          })
        ]
      })
    ]
  });
}

function sectionDivider(text) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            shading: { fill: "1B3A5C", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: "FFFFFF" })],
                alignment: AlignmentType.CENTER,
              })
            ]
          })
        ]
      })
    ]
  });
}

function twoColRow(col1, col2, bg1 = "FFFFFF", bg2 = "FFFFFF") {
  const half = Math.floor(CONTENT_WIDTH / 2);
  return new TableRow({
    children: [
      new TableCell({
        borders,
        shading: { fill: bg1, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: half, type: WidthType.DXA },
        children: col1,
      }),
      new TableCell({
        borders,
        shading: { fill: bg2, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: half, type: WidthType.DXA },
        children: col2,
      }),
    ]
  });
}

function threeColRow(texts, bgs = ["FFFFFF","FFFFFF","FFFFFF"]) {
  const third = Math.floor(CONTENT_WIDTH / 3);
  return new TableRow({
    children: texts.map((t, i) => new TableCell({
      borders,
      shading: { fill: bgs[i] || "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      width: { size: third, type: WidthType.DXA },
      children: Array.isArray(t) ? t : [new Paragraph({ children: [new TextRun({ text: t, size: 22, font: "Arial", color: "2D2D2D" })] })],
    }))
  });
}

function headerRow(texts, bg = "1B3A5C") {
  const w = Math.floor(CONTENT_WIDTH / texts.length);
  return new TableRow({
    tableHeader: true,
    children: texts.map(t => new TableCell({
      borders: { top: thickBorder, bottom: thickBorder, left: thickBorder, right: thickBorder },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      width: { size: w, type: WidthType.DXA },
      children: [new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 20, font: "Arial", color: "FFFFFF" })],
        alignment: AlignmentType.CENTER,
      })]
    }))
  });
}

function simpleTable(headers, rows, colWidths) {
  const cols = colWidths || headers.map(() => Math.floor(CONTENT_WIDTH / headers.length));
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          borders: { top: thickBorder, bottom: thickBorder, left: border, right: border },
          shading: { fill: "1B3A5C", type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          width: { size: cols[i], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })]
        }))
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, i) => new TableCell({
          borders,
          shading: { fill: ri % 2 === 0 ? "F5F9FF" : "FFFFFF", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          width: { size: cols[i], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial", color: "2D2D2D" })] })]
        }))
      }))
    ]
  });
}

function statusBadgePara(text, bg, textColor = "FFFFFF") {
  return new Table({
    width: { size: 1800, type: WidthType.DXA },
    columnWidths: [1800],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorders,
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      width: { size: 1800, type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: "Arial", color: textColor })], alignment: AlignmentType.CENTER })]
    })]})],
  });
}

// ─── document content ───────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.DECIMAL, text: "%1.%2.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
      {
        reference: "steps",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "Step %1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 900, hanging: 540 } } }
        }]
      },
    ]
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1B3A5C" },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2C5F8A" },
        paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: "3A7CBF" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [
    // ═══════════════════════════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        spacer(1200),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders: noBorders,
            shading: { fill: "1B3A5C", type: ShadingType.CLEAR },
            margins: { top: 480, bottom: 480, left: 480, right: 480 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [new TextRun({ text: "PRODUCT REQUIREMENTS DOCUMENT", bold: true, size: 24, font: "Arial", color: "7EC8E3" })], alignment: AlignmentType.CENTER }),
              spacer(80),
              new Paragraph({ children: [new TextRun({ text: "Team Task Manager", bold: true, size: 56, font: "Arial", color: "FFFFFF" })], alignment: AlignmentType.CENTER }),
              spacer(60),
              new Paragraph({ children: [new TextRun({ text: "Full-Stack Web Application", size: 28, font: "Arial", color: "A8D4E8" })], alignment: AlignmentType.CENTER }),
            ]
          })]})],
        }),
        spacer(320),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [Math.floor(CONTENT_WIDTH/3), Math.floor(CONTENT_WIDTH/3), Math.floor(CONTENT_WIDTH/3)],
          rows: [threeColRow(
            [
              [new Paragraph({ children: [new TextRun({ text: "Version", bold: true, size: 18, font: "Arial", color: "2C5F8A" })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: "1.0.0", size: 22, font: "Arial", color: "1B3A5C" })], alignment: AlignmentType.CENTER })],
              [new Paragraph({ children: [new TextRun({ text: "Date", bold: true, size: 18, font: "Arial", color: "2C5F8A" })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: "May 2026", size: 22, font: "Arial", color: "1B3A5C" })], alignment: AlignmentType.CENTER })],
              [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, size: 18, font: "Arial", color: "2C5F8A" })], alignment: AlignmentType.CENTER }), new Paragraph({ children: [new TextRun({ text: "Ready to Build", size: 22, font: "Arial", color: "1B7A44" })], alignment: AlignmentType.CENTER })],
            ],
            ["EBF4FF", "EBF4FF", "EBF4FF"]
          )]
        }),
        spacer(200),
        new Paragraph({ children: [new TextRun({ text: "Assignment Submission — Full-Stack Developer Role", size: 20, font: "Arial", color: "888888" })], alignment: AlignmentType.CENTER }),
        pageBreak(),

        // ─── TABLE OF CONTENTS ─────────────────────────────────────
        new TableOfContents("Table of Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
          stylesWithLevels: [
            { styleId: "Heading1", level: 1 },
            { styleId: "Heading2", level: 2 },
            { styleId: "Heading3", level: 3 },
          ]
        }),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 1 — OVERVIEW
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 1 — PROJECT OVERVIEW"),
        spacer(160),
        h1("1. Project Overview"),
        h2("1.1 Purpose"),
        body("This document is the single source of truth for building the Team Task Manager — a full-stack web application for assignment submission. It defines every technical and product decision so that any developer can pick it up, follow the steps, and produce a live, fully-functional deployment without ambiguity."),
        spacer(80),
        infoBox("Goal:", "A project and task management platform where Admins create projects, invite members, assign tasks, and track progress — with role-based access, real-time activity logs, email notifications, and an Odoo-inspired readable UI.", "EBF4FF"),
        spacer(160),

        h2("1.2 Scope"),
        simpleTable(
          ["In Scope", "Out of Scope"],
          [
            ["Authentication (Signup / Login / Logout)", "Real-time WebSocket updates (polling used instead)"],
            ["Role-based access: Admin / Member", "File attachments on tasks"],
            ["Project CRUD (Admin only)", "Calendar integration"],
            ["Task CRUD, status tracking, assignment", "Mobile native app"],
            ["Odoo-style dashboard with filters", "Billing or subscription system"],
            ["Activity log for all entities", "Third-party OAuth (Google, GitHub)"],
            ["Email notifications via Resend", ""],
            ["Due date reminders via cron job", ""],
            ["Dark mode toggle", ""],
            ["Full deployment on Railway + Vercel", ""],
          ],
          [4680, 4680]
        ),
        spacer(160),

        h2("1.3 Definitions"),
        simpleTable(
          ["Term", "Definition"],
          [
            ["Global Admin", "User who signed up with Admin role — can create projects across the platform"],
            ["Global Member", "User who signed up with Member role — can only be invited into projects"],
            ["Project Admin", "A member elevated to Admin inside a specific project via ProjectMember.role"],
            ["Project Member", "A user with MEMBER role inside a specific project"],
            ["Task", "A unit of work inside a project with a title, status, priority, and assignee"],
            ["Activity Log", "Auto-generated history record whenever any entity is created, updated, or deleted"],
            ["Overdue Task", "Any task whose dueDate has passed and status is not DONE"],
            ["PRD", "This document — Product Requirements Document"],
          ],
          [3120, 6240]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 2 — TECH STACK
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 2 — TECHNOLOGY STACK"),
        spacer(160),
        h1("2. Technology Stack"),
        body("All choices below are final. Do not substitute without updating this document and testing the full integration. Every tool listed has a free tier that covers this project with zero cost."),
        spacer(120),

        h2("2.1 Frontend"),
        simpleTable(
          ["Library / Tool", "Version", "Why This Choice", "Free?"],
          [
            ["React", "18.x", "Component model, huge ecosystem, required for Vite + shadcn", "Yes"],
            ["Vite", "5.x", "Fastest dev server, instant HMR, simple prod builds", "Yes"],
            ["TailwindCSS", "3.x", "Utility-first CSS, dark mode via class strategy, no runtime overhead", "Yes"],
            ["shadcn/ui", "Latest", "Accessible, unstyled components built on Radix UI, copy-paste model", "Yes"],
            ["React Router v6", "6.x", "Declarative routing, nested routes for sidebar layout", "Yes"],
            ["TanStack Query (React Query)", "5.x", "Server state management, caching, background refetch, stale-while-revalidate", "Yes"],
            ["Zustand", "4.x", "Lightweight global state for auth, theme, notifications", "Yes"],
            ["React Hook Form + Zod", "Latest", "Form validation matching backend schema — single source of truth", "Yes"],
            ["Axios", "1.x", "HTTP client with interceptors for JWT injection and 401 redirect", "Yes"],
            ["date-fns", "3.x", "Date formatting, overdue calculation, relative timestamps", "Yes"],
            ["Lucide React", "Latest", "Icon library consistent with shadcn/ui", "Yes"],
          ],
          [2400, 900, 4500, 760]
        ),
        spacer(120),

        h2("2.2 Backend"),
        simpleTable(
          ["Library / Tool", "Version", "Why This Choice", "Free?"],
          [
            ["Node.js", "20 LTS", "Long-term support, compatible with Railway, async/await native", "Yes"],
            ["Express", "4.x", "Minimal, battle-tested REST framework, middleware ecosystem", "Yes"],
            ["Prisma ORM", "5.x", "Type-safe DB client, migrations, schema-first design for PostgreSQL", "Yes"],
            ["Zod", "3.x", "Runtime schema validation for all request bodies — matches frontend schemas", "Yes"],
            ["JWT (jsonwebtoken)", "9.x", "Stateless auth tokens, stored in HttpOnly cookies", "Yes"],
            ["bcryptjs", "2.x", "Password hashing — pure JS, no native dependencies needed on Railway", "Yes"],
            ["cookie-parser", "1.x", "Parse HttpOnly cookies for JWT extraction", "Yes"],
            ["cors", "2.x", "CORS headers for Vercel frontend domain", "Yes"],
            ["helmet", "7.x", "Security headers out of the box", "Yes"],
            ["node-cron", "3.x", "Cron scheduler for daily due-date reminder emails", "Yes"],
            ["Resend SDK", "3.x", "Transactional email — 3,000 emails/month free, simple Node API", "Yes"],
            ["morgan", "1.x", "HTTP request logging for debugging on Railway", "Yes"],
          ],
          [2400, 900, 4500, 760]
        ),
        spacer(120),

        h2("2.3 Database"),
        simpleTable(
          ["Service", "Plan", "Limits", "Why This Choice"],
          [
            ["Neon.tech", "Free", "500MB storage, 0.5 CPU, scale-to-zero", "Serverless PostgreSQL — no credit card, instant setup, connection pooling included, works with Prisma"],
          ],
          [1800, 1200, 2880, 3480]
        ),
        spacer(80),
        infoBox("How to sign up:", "Go to neon.tech → Create account (GitHub login works) → New Project → copy the DATABASE_URL connection string → paste into your .env file. That is all. No card needed.", "FFF8E1", "D4860A"),
        spacer(120),

        h2("2.4 Deployment"),
        simpleTable(
          ["Service", "What it hosts", "Free tier", "Setup time"],
          [
            ["Railway", "Node.js backend API", "$5 credit/month (plenty for this), auto-deploy from GitHub", "~5 min"],
            ["Vercel", "React frontend (SPA)", "Unlimited hobby projects, auto-deploy on push", "~3 min"],
            ["Neon.tech", "PostgreSQL database", "Already covered above", "~2 min"],
          ],
          [1560, 2520, 3600, 1680]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 3 — ARCHITECTURE
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 3 — SYSTEM ARCHITECTURE"),
        spacer(160),
        h1("3. System Architecture"),

        h2("3.1 Folder Structure"),
        infoBox("Rule:", "The repo is a monorepo with two top-level folders: /frontend and /backend. No shared packages. Each has its own package.json and deploys independently.", "EBF4FF"),
        spacer(120),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders: { top: border, bottom: border, left: { style: BorderStyle.SINGLE, size: 8, color: "3A7CBF" }, right: border },
            shading: { fill: "F5F9FF", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [code("/ (repo root)")], spacing: { after: 60 } }),
              new Paragraph({ children: [code("├── backend/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   ├── prisma/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── schema.prisma          # All DB models")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   └── migrations/            # Auto-generated by Prisma")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   ├── src/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── routes/                # One file per resource")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── auth.routes.js")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── projects.routes.js")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── tasks.routes.js")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   └── dashboard.routes.js")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── controllers/           # Business logic")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── middleware/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── auth.middleware.js  # JWT verify")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── role.middleware.js  # Admin gate")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   └── validate.middleware.js # Zod parse")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── lib/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── prisma.js           # Prisma client singleton")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── resend.js           # Email helpers")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   └── cron.js             # node-cron jobs")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   └── index.js               # Express app entry")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   ├── .env.example")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   └── package.json")], spacing: { after: 60 } }),
              new Paragraph({ children: [code("├── frontend/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   ├── src/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── pages/                 # Route-level components")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── auth/              # Login, Register")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── dashboard/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── projects/          # List + Detail")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── tasks/             # List + Detail")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   └── members/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── components/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── layout/            # AppShell, Sidebar, Topbar")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── tasks/             # TaskRow, TaskBadge, TaskForm")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   └── ui/                # shadcn/ui components")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── hooks/                 # useAuth, useTasks, useProjects")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── store/                 # Zustand slices")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   ├── lib/")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   ├── api.js             # Axios instance + interceptors")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   │   └── utils.js           # cn(), date helpers")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   │   └── main.jsx")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   ├── .env.example")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("│   └── package.json")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("└── README.md")], spacing: { after: 40 } }),
            ]
          })]})],
        }),
        spacer(160),

        h2("3.2 Database Schema"),
        body("Below are all five Prisma models. Every field name, type, and relation is final. Do not rename fields after the first migration without creating a new migration."),
        spacer(80),
        h3("User"),
        simpleTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "String @id @default(uuid())", "Primary key"],
            ["name", "String", "Display name"],
            ["email", "String @unique", "Used for login, must be unique"],
            ["passwordHash", "String", "bcrypt hash — never store plain text"],
            ["globalRole", "GlobalRole (enum)", "ADMIN | MEMBER — set at registration"],
            ["createdAt", "DateTime @default(now())", ""],
            ["projects", "Project[]", "Relation: projects this user owns"],
            ["memberships", "ProjectMember[]", "Relation: projects this user is a member of"],
            ["assignedTasks", "Task[]", "Relation: tasks assigned to this user"],
            ["activityLogs", "ActivityLog[]", "Relation: actions this user performed"],
          ],
          [2200, 3000, 4160]
        ),
        spacer(120),
        h3("Project"),
        simpleTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "String @id @default(uuid())", "Primary key"],
            ["name", "String", "Project title"],
            ["description", "String?", "Optional"],
            ["status", "ProjectStatus (enum)", "ACTIVE | ARCHIVED — default ACTIVE"],
            ["ownerId", "String", "FK → User.id — the Admin who created it"],
            ["owner", "User", "Relation"],
            ["members", "ProjectMember[]", "Relation"],
            ["tasks", "Task[]", "Relation"],
            ["activityLogs", "ActivityLog[]", "Relation"],
            ["createdAt", "DateTime @default(now())", ""],
            ["updatedAt", "DateTime @updatedAt", ""],
          ],
          [2200, 3000, 4160]
        ),
        spacer(120),
        h3("Task"),
        simpleTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "String @id @default(uuid())", "Primary key"],
            ["title", "String", "Required, max 200 chars"],
            ["description", "String?", "Optional markdown-friendly text"],
            ["status", "TaskStatus (enum)", "TODO | IN_PROGRESS | IN_REVIEW | DONE"],
            ["priority", "Priority (enum)", "LOW | MEDIUM | HIGH | URGENT"],
            ["dueDate", "DateTime?", "Optional — triggers overdue logic and reminders"],
            ["projectId", "String", "FK → Project.id"],
            ["assigneeId", "String?", "FK → User.id — nullable (unassigned tasks allowed)"],
            ["createdById", "String", "FK → User.id — who created the task"],
            ["project", "Project", "Relation"],
            ["assignee", "User?", "Relation"],
            ["createdBy", "User", "Relation"],
            ["activityLogs", "ActivityLog[]", "Relation"],
            ["createdAt", "DateTime @default(now())", ""],
            ["updatedAt", "DateTime @updatedAt", ""],
          ],
          [2200, 3000, 4160]
        ),
        spacer(120),
        h3("ProjectMember"),
        simpleTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "String @id @default(uuid())", "Primary key"],
            ["userId", "String", "FK → User.id"],
            ["projectId", "String", "FK → Project.id"],
            ["role", "ProjectRole (enum)", "ADMIN | MEMBER — within project scope"],
            ["joinedAt", "DateTime @default(now())", ""],
            ["@@unique([userId, projectId])", "", "Prevents duplicate membership"],
          ],
          [2800, 2800, 3760]
        ),
        spacer(120),
        h3("ActivityLog"),
        simpleTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "String @id @default(uuid())", "Primary key"],
            ["action", "String", "e.g. 'created task', 'changed status to DONE'"],
            ["entityType", "String", "e.g. 'Task', 'Project', 'ProjectMember'"],
            ["entityId", "String", "ID of the affected entity"],
            ["userId", "String", "FK → User who performed the action"],
            ["projectId", "String?", "FK → Project for scoped filtering"],
            ["meta", "Json?", "Extra data (e.g. previous status value)"],
            ["createdAt", "DateTime @default(now())", ""],
          ],
          [2200, 3000, 4160]
        ),
        spacer(120),
        h3("Enums"),
        simpleTable(
          ["Enum", "Values"],
          [
            ["GlobalRole", "ADMIN, MEMBER"],
            ["ProjectRole", "ADMIN, MEMBER"],
            ["ProjectStatus", "ACTIVE, ARCHIVED"],
            ["TaskStatus", "TODO, IN_PROGRESS, IN_REVIEW, DONE"],
            ["Priority", "LOW, MEDIUM, HIGH, URGENT"],
          ],
          [2400, 6960]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 4 — API SPEC
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 4 — REST API SPECIFICATION"),
        spacer(160),
        h1("4. REST API Specification"),
        infoBox("Base URL:", "https://your-app.railway.app/api — All routes prefixed with /api. JWT stored in HttpOnly cookie named 'token'. Every protected route must pass through authMiddleware.", "EBF4FF"),
        spacer(120),

        h2("4.1 Authentication Routes"),
        simpleTable(
          ["Method", "Route", "Auth", "Body", "Response"],
          [
            ["POST", "/auth/register", "Public", "name, email, password, globalRole", "201 { user, token }"],
            ["POST", "/auth/login", "Public", "email, password", "200 { user } + Set-Cookie"],
            ["POST", "/auth/logout", "Auth", "—", "200 { message }"],
            ["GET", "/auth/me", "Auth", "—", "200 { user }"],
          ],
          [800, 1800, 900, 3060, 2800]
        ),
        spacer(120),

        h2("4.2 Project Routes"),
        simpleTable(
          ["Method", "Route", "Auth", "Notes"],
          [
            ["GET", "/projects", "Auth", "Returns projects the user owns or is a member of"],
            ["POST", "/projects", "Global Admin", "Creates project — sets caller as owner and adds them as ProjectMember with role ADMIN"],
            ["GET", "/projects/:id", "Member+", "Full project with members list and task summary"],
            ["PATCH", "/projects/:id", "Project Admin", "Update name, description, status"],
            ["DELETE", "/projects/:id", "Global Admin", "Deletes project + all tasks + all members (cascade)"],
            ["POST", "/projects/:id/members", "Project Admin", "Body: { email, role } — invite user by email"],
            ["PATCH", "/projects/:id/members/:userId", "Project Admin", "Change member role within project"],
            ["DELETE", "/projects/:id/members/:userId", "Project Admin", "Remove member from project"],
          ],
          [760, 2200, 1600, 4800]
        ),
        spacer(120),

        h2("4.3 Task Routes"),
        simpleTable(
          ["Method", "Route", "Auth", "Notes"],
          [
            ["GET", "/projects/:id/tasks", "Member+", "All tasks in project — supports ?status=&assignee=&priority=&sort=&search="],
            ["POST", "/projects/:id/tasks", "Member+", "Create task — body: title, description?, status, priority, dueDate?, assigneeId?"],
            ["GET", "/tasks/:id", "Member+", "Single task with assignee, createdBy, and activityLog"],
            ["PATCH", "/tasks/:id", "Assignee or Project Admin", "Update any field — logs the change automatically"],
            ["PATCH", "/tasks/:id/status", "Assignee or Project Admin", "Shortcut endpoint for status-only update (used by status dropdown)"],
            ["DELETE", "/tasks/:id", "Project Admin", "Soft approach: set status to archived, or hard delete"],
            ["GET", "/tasks/overdue", "Auth", "All tasks where dueDate < now AND status != DONE, scoped to user's projects"],
          ],
          [760, 2400, 1600, 4600]
        ),
        spacer(120),

        h2("4.4 Dashboard & Utility Routes"),
        simpleTable(
          ["Method", "Route", "Auth", "Returns"],
          [
            ["GET", "/dashboard", "Auth", "{ totalProjects, totalTasks, myTasks, overdueTasks, tasksByStatus, recentActivity }"],
            ["GET", "/activity-log", "Auth", "Paginated log — supports ?projectId=&page=&limit="],
            ["GET", "/notifications", "Auth", "Unread notification count + recent items"],
            ["PATCH", "/notifications/read", "Auth", "Mark all notifications as read"],
          ],
          [760, 2200, 900, 5500]
        ),
        spacer(120),

        h2("4.5 Error Response Format"),
        body("All errors must return this exact shape so the frontend can handle them uniformly:"),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders: { top: border, bottom: border, left: { style: BorderStyle.SINGLE, size: 8, color: "E53E3E" }, right: border },
            shading: { fill: "FFF5F5", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [code('{ "success": false, "error": "Human readable message", "code": "MACHINE_CODE" }')], spacing: { after: 60 } }),
              new Paragraph({ children: [new TextRun({ text: "Status codes: 400 Bad Request · 401 Unauthorized · 403 Forbidden · 404 Not Found · 409 Conflict · 422 Validation Error · 500 Server Error", size: 19, font: "Arial", color: "888888" })] }),
            ]
          })]})],
        }),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 5 — FEATURES
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 5 — FEATURE SPECIFICATIONS"),
        spacer(160),
        h1("5. Feature Specifications"),

        h2("5.1 Authentication"),
        simpleTable(
          ["Rule", "Detail"],
          [
            ["Password hashing", "bcrypt with saltRounds = 12"],
            ["JWT secret", "Stored in env var JWT_SECRET — minimum 32 chars random string"],
            ["JWT expiry", "7 days — stored in HttpOnly, SameSite=Strict, Secure cookie"],
            ["Role selection at signup", "Dropdown on register form: Admin or Member — stored as globalRole"],
            ["Protected routes", "All non-auth routes wrapped by authMiddleware — extracts and verifies JWT from cookie"],
            ["Frontend guard", "React Router loader checks Zustand auth store — redirects to /login if no user"],
            ["Validation rules", "Email: valid format. Password: min 8 chars, 1 uppercase, 1 number"],
          ],
          [2400, 6960]
        ),
        spacer(120),

        h2("5.2 Dashboard (Odoo-Style)"),
        body("The dashboard is the first page after login. It replicates the Odoo task list aesthetic: structured, filterable, high information density without clutter."),
        spacer(80),
        h3("Layout"),
        simpleTable(
          ["Zone", "Content"],
          [
            ["Left sidebar (240px)", "Logo, nav links (Dashboard, Projects, My Tasks, Members, Notifications), user avatar + name at bottom, dark mode toggle"],
            ["Top bar", "Page title, search input, filter bar (status, priority, project, assignee dropdowns), New Task button"],
            ["Stats row (4 cards)", "Total Projects, Total Tasks, My Open Tasks, Overdue Tasks — each card is a colored number with icon"],
            ["Main content", "Grouped task list (grouped by status by default) — each row shows: task title, project badge, priority badge, assignee avatar, due date, status dropdown"],
            ["Right panel (slide-in)", "Task detail — opens on row click without navigation — shows full description, activity log, edit form"],
          ],
          [2400, 6960]
        ),
        spacer(80),
        h3("Task row columns"),
        simpleTable(
          ["Column", "Type", "Interactive?"],
          [
            ["Title", "Text (truncated at 60 chars)", "Click opens right panel"],
            ["Project", "Colored badge", "Click filters to project"],
            ["Priority", "Colored dot + label: Low/Medium/High/Urgent", "Click filters to priority"],
            ["Assignee", "Avatar + name (or 'Unassigned')", "Click filters to assignee"],
            ["Due date", "Relative date ('in 3 days', 'Yesterday') — red if overdue", "None"],
            ["Status", "Inline select dropdown", "Directly updates status via API"],
          ],
          [1800, 4200, 3360]
        ),
        spacer(120),

        h2("5.3 Role-Based Access — Rules Matrix"),
        simpleTable(
          ["Action", "Global Admin", "Project Admin", "Project Member"],
          [
            ["Create a new project", "Yes", "No", "No"],
            ["Delete a project", "Yes (owner only)", "No", "No"],
            ["Invite members to project", "Yes", "Yes", "No"],
            ["Remove members from project", "Yes", "Yes (not owner)", "No"],
            ["Change member role in project", "Yes", "Yes", "No"],
            ["Create tasks in project", "Yes", "Yes", "Yes"],
            ["Assign task to any user", "Yes", "Yes", "No (can only self-assign)"],
            ["Edit any task", "Yes", "Yes", "Only own assigned tasks"],
            ["Delete a task", "Yes", "Yes", "No"],
            ["Change task status", "Yes", "Yes", "Only own assigned tasks"],
            ["View project + tasks", "Yes (if member)", "Yes", "Yes"],
            ["View activity log", "Yes", "Yes", "Yes (read only)"],
          ],
          [3600, 1440, 2160, 2160]
        ),
        spacer(120),

        h2("5.4 Activity Log"),
        simpleTable(
          ["Trigger", "Log message format"],
          [
            ["Create project", "{user.name} created project \"{project.name}\""],
            ["Archive project", "{user.name} archived project \"{project.name}\""],
            ["Add member", "{user.name} added {member.name} as {role} to project \"{project.name}\""],
            ["Remove member", "{user.name} removed {member.name} from project \"{project.name}\""],
            ["Create task", "{user.name} created task \"{task.title}\""],
            ["Change task status", "{user.name} changed status from {old} to {new} on \"{task.title}\""],
            ["Change task assignee", "{user.name} assigned \"{task.title}\" to {assignee.name}"],
            ["Change task priority", "{user.name} changed priority to {new} on \"{task.title}\""],
            ["Update task due date", "{user.name} set due date to {date} on \"{task.title}\""],
            ["Delete task", "{user.name} deleted task \"{task.title}\""],
          ],
          [3600, 5760]
        ),
        spacer(80),
        body("The activity log is displayed inside the Task Detail panel (right slide-in) and on a dedicated full-page /activity route. Both views support infinite scroll pagination (20 items per page)."),
        spacer(120),

        h2("5.5 Email Notifications (Resend)"),
        simpleTable(
          ["Trigger", "Recipient", "Subject"],
          [
            ["Task assigned to user", "Assignee", "You have been assigned: {task.title}"],
            ["Task status changed to DONE", "Task creator", "{task.title} has been completed"],
            ["Added to a project", "New member", "You have been added to {project.name}"],
            ["Daily reminder (cron)", "Assignee of overdue tasks", "Reminder: {N} tasks are overdue"],
          ],
          [3000, 2160, 4200]
        ),
        spacer(80),
        infoBox("Resend setup:", "Sign up at resend.com → Add your domain (or use their sandbox for dev) → copy API_KEY to .env as RESEND_API_KEY → free tier allows 3,000 emails/month and 100/day. Use react-email for templates (optional but recommended).", "FFF8E1", "D4860A"),
        spacer(120),

        h2("5.6 Due Date Reminders (node-cron)"),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders: { top: border, bottom: border, left: { style: BorderStyle.SINGLE, size: 8, color: "3A7CBF" }, right: border },
            shading: { fill: "F5F9FF", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [code("// cron.js — runs every day at 8:00 AM UTC")], spacing: { after: 60 } }),
              new Paragraph({ children: [code("cron.schedule('0 8 * * *', async () => {")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  // 1. Query all tasks where dueDate is within next 24h AND status != DONE")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  // 2. Group by assignee")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  // 3. Send one digest email per assignee listing all their due tasks")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  // 4. Also query overdue tasks (dueDate < now, status != DONE)")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  // 5. Send overdue digest email to assignee if not yet sent today")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  // 6. Log all sends to ActivityLog with entityType = 'EmailReminder'")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("});")], spacing: { after: 0 } }),
            ]
          })]})],
        }),
        spacer(120),

        h2("5.7 Dark Mode"),
        simpleTable(
          ["Detail", "Implementation"],
          [
            ["Strategy", "Tailwind CSS class strategy — add/remove class 'dark' on <html> element"],
            ["Toggle", "Moon/Sun icon button in sidebar bottom — click toggles dark class"],
            ["Persistence", "Saved to localStorage key 'theme' — read on app init in main.jsx"],
            ["Default", "Follows system preference via window.matchMedia('(prefers-color-scheme: dark)')"],
            ["Colors", "All UI components use Tailwind dark: variants — no custom CSS needed"],
          ],
          [2400, 6960]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 6 — BUILD ORDER
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 6 — BUILD ORDER & STEP-BY-STEP GUIDE"),
        spacer(160),
        h1("6. Build Order — Step by Step"),
        infoBox("Why this order matters:", "Each phase produces a working, testable state. Never jump ahead. Complete and test each phase before moving to the next. The app should be deployable at the end of Phase 3 (backend only) and fully live at the end of Phase 7.", "EBF4FF"),
        spacer(120),

        h2("Phase 1 — Repository & Environment Setup"),
        body("Estimated time: 30 minutes"),
        spacer(80),
        numbered("Create a new GitHub repo (public) named team-task-manager", 0),
        numbered("Clone it locally. Create two top-level folders: mkdir backend frontend", 0),
        numbered("In /backend: run npm init -y, then install all backend packages listed in Section 2.2", 0),
        numbered("In /backend: create src/index.js with a minimal Express server on port 3000 returning {\"status\":\"ok\"} at GET /api/health", 0),
        numbered("In /backend: create prisma/schema.prisma with all 5 models from Section 3.2. Run npx prisma init to set up.", 0),
        numbered("Sign up at neon.tech. Create a project. Copy the DATABASE_URL and paste it into backend/.env as DATABASE_URL=...", 0),
        numbered("Run npx prisma migrate dev --name init — this creates all tables. Verify in Neon dashboard.", 0),
        numbered("Create backend/.env.example with all variable names but no values (see Section 6.1)", 0),
        numbered("Commit and push.", 0),
        spacer(80),
        infoBox("Checkpoint:", "GET /api/health returns 200. Neon dashboard shows all 5 tables. .env is in .gitignore.", "E8F5E9", "1B7A44"),
        spacer(120),

        h2("Phase 2 — Backend Auth Routes"),
        body("Estimated time: 2 hours"),
        spacer(80),
        numbered("Create src/lib/prisma.js — Prisma client singleton (export a single instance)", 0),
        numbered("Create src/middleware/auth.middleware.js — verify JWT from cookie, attach req.user", 0),
        numbered("Create src/middleware/validate.middleware.js — takes a Zod schema, parses req.body, returns 422 on failure", 0),
        numbered("Create Zod schemas: registerSchema, loginSchema in src/lib/schemas.js", 0),
        numbered("Create src/controllers/auth.controller.js with register, login, logout, getMe functions", 0),
        numbered("Create src/routes/auth.routes.js wiring the 4 endpoints from Section 4.1", 0),
        numbered("Test with Postman or curl: register a user, login, call /api/auth/me with cookie", 0),
        spacer(80),
        infoBox("Checkpoint:", "Can register Admin and Member users. Login returns HttpOnly cookie. /api/auth/me returns user. Invalid credentials return 401.", "E8F5E9", "1B7A44"),
        spacer(120),

        h2("Phase 3 — Backend Project & Task Routes"),
        body("Estimated time: 3-4 hours"),
        spacer(80),
        numbered("Create src/middleware/role.middleware.js — requireGlobalAdmin, requireProjectAccess, requireProjectAdmin", 0),
        numbered("Create src/lib/activityLog.js — helper function logActivity(action, entityType, entityId, userId, projectId?, meta?) that creates an ActivityLog record", 0),
        numbered("Build projects controller + routes (all 8 endpoints from Section 4.2). Call logActivity at every mutation.", 0),
        numbered("Build tasks controller + routes (all 7 endpoints from Section 4.3). Call logActivity at every mutation.", 0),
        numbered("Build dashboard controller + route — aggregate query returning all stats in one response", 0),
        numbered("Build activity-log + notifications routes", 0),
        numbered("Test all routes with Postman — verify role gates work (403 for non-admins on admin routes)", 0),
        numbered("Deploy to Railway: connect GitHub repo → set all env vars → Railway auto-detects Node.js → get live URL", 0),
        spacer(80),
        infoBox("Checkpoint:", "All API routes tested. Railway deployment live. Full Postman collection working against production URL.", "E8F5E9", "1B7A44"),
        spacer(120),

        h2("Phase 4 — Email & Cron Jobs"),
        body("Estimated time: 1 hour"),
        spacer(80),
        numbered("Sign up at resend.com, copy API key to .env and Railway env vars", 0),
        numbered("Create src/lib/resend.js with sendTaskAssigned, sendTaskDone, sendProjectInvite, sendDailyReminder functions", 0),
        numbered("Wire email calls into controllers (task creation, status change to DONE, add member)", 0),
        numbered("Create src/lib/cron.js — implement the daily 8 AM reminder job (logic in Section 5.6)", 0),
        numbered("Import cron.js at the bottom of index.js so it starts with the server", 0),
        numbered("Test by temporarily changing cron schedule to every minute, verify email arrives in inbox", 0),
        numbered("Revert cron to '0 8 * * *' and redeploy", 0),
        spacer(80),
        infoBox("Checkpoint:", "Task assignment email received. Cron job fires and sends reminder. Railway logs show cron output.", "E8F5E9", "1B7A44"),
        spacer(120),

        h2("Phase 5 — Frontend Foundation"),
        body("Estimated time: 2-3 hours"),
        spacer(80),
        numbered("cd frontend && npm create vite@latest . -- --template react → install dependencies", 0),
        numbered("Install: tailwindcss, postcss, autoprefixer → npx tailwindcss init -p → configure tailwind.config.js with content paths and darkMode: 'class'", 0),
        numbered("Install shadcn/ui: npx shadcn-ui@latest init → choose Zinc color scheme, CSS variables: yes", 0),
        numbered("Install remaining packages: react-router-dom, @tanstack/react-query, zustand, axios, react-hook-form, @hookform/resolvers, zod, date-fns, lucide-react", 0),
        numbered("Create src/lib/api.js — Axios instance with baseURL from env var VITE_API_URL, withCredentials: true, response interceptor that redirects to /login on 401", 0),
        numbered("Create Zustand store: src/store/authStore.js — { user, setUser, clearUser } and src/store/themeStore.js — { dark, toggle } with localStorage sync", 0),
        numbered("Create the app shell: AppLayout.jsx with sidebar + topbar. Wire React Router with routes for all pages (render placeholder divs for now)", 0),
        numbered("Add dark mode: read themeStore on mount, add/remove 'dark' class on document.html", 0),
        spacer(80),
        infoBox("Checkpoint:", "App loads at localhost:5173. Sidebar visible. Dark mode toggle works. Login page renders.", "E8F5E9", "1B7A44"),
        spacer(120),

        h2("Phase 6 — Frontend Pages"),
        body("Estimated time: 4-6 hours — build in this exact order"),
        spacer(80),
        numbered("Auth pages (Login + Register) — forms with React Hook Form + Zod validation, connect to /api/auth routes, save user to Zustand on success", 0),
        numbered("Protected route wrapper — checks authStore, redirects to /login if unauthenticated", 0),
        numbered("Dashboard page — fetch /api/dashboard, render 4 stat cards, render grouped task list (grouped by status), each row as TaskRow component", 0),
        numbered("TaskRow component — title, project badge, priority dot, assignee avatar, due date, inline status Select from shadcn. On status change call PATCH /tasks/:id/status", 0),
        numbered("Task Detail slide-in panel — shadcn Sheet component, opens on TaskRow click, fetches full task, shows description + edit form + ActivityLog list", 0),
        numbered("Projects list page — cards grid, Admin sees New Project button, click opens modal form", 0),
        numbered("Project detail page — member list + task table scoped to project, same TaskRow component", 0),
        numbered("My Tasks page — same list filtered to req.user as assignee", 0),
        numbered("Members page (Admin only) — table of all members across user's projects, invite by email", 0),
        numbered("Notifications panel — slide-in from topbar bell icon, list of recent activity", 0),
        spacer(80),
        infoBox("Checkpoint:", "Full app functional locally. Can create project, add member, create task, assign, change status. Activity log populates. Emails fire.", "E8F5E9", "1B7A44"),
        spacer(120),

        h2("Phase 7 — Deployment"),
        body("Estimated time: 45 minutes"),
        spacer(80),
        numbered("Backend is already live on Railway from Phase 3 — just push latest code, Railway auto-redeploys", 0),
        numbered("In Vercel: New Project → import frontend folder from GitHub → set VITE_API_URL env var to Railway URL → Deploy", 0),
        numbered("In Railway: add FRONTEND_URL env var to the Vercel URL → update CORS config in index.js to allow that origin", 0),
        numbered("Test full flow on production: register, login, create project, invite member (use two browsers), create task, assign, change status — verify email arrives", 0),
        numbered("Fix any CORS or cookie SameSite issues (see Section 6.2 for common fixes)", 0),
        numbered("Copy the live URL. Done.", 0),
        spacer(80),
        infoBox("Final checkpoint:", "Live URL works. Full CRUD operational. Emails send in production. Dark mode persists on refresh. Activity log populated.", "E8F5E9", "1B7A44"),
        spacer(120),

        h2("Phase 8 — README & Demo"),
        body("Estimated time: 1 hour"),
        spacer(80),
        numbered("Write README.md (see Section 8 for required sections)", 0),
        numbered("Record 2–5 min demo video: show login, create project, invite member, create task, assign, change status, show activity log, show email, toggle dark mode, show mobile responsive layout", 0),
        numbered("Upload video to YouTube (unlisted) or Loom", 0),
        numbered("Submit: live URL + GitHub repo link + README + video link", 0),
        pageBreak(),

        h2("6.1 Environment Variables Reference"),
        simpleTable(
          ["Variable", "Where used", "Example / Notes"],
          [
            ["DATABASE_URL", "Backend", "postgresql://user:pass@host/dbname?sslmode=require (from Neon)"],
            ["JWT_SECRET", "Backend", "Any 32+ char random string — use: openssl rand -base64 32"],
            ["JWT_EXPIRES_IN", "Backend", "7d"],
            ["RESEND_API_KEY", "Backend", "re_xxxxxxxxxxxxxxxxxxxxxxxxxx (from resend.com dashboard)"],
            ["RESEND_FROM_EMAIL", "Backend", "no-reply@yourdomain.com (must be verified in Resend)"],
            ["FRONTEND_URL", "Backend", "https://your-app.vercel.app (for CORS allow-list)"],
            ["NODE_ENV", "Backend", "production (Railway sets this automatically)"],
            ["PORT", "Backend", "3000 (Railway injects this automatically — do not hardcode)"],
            ["VITE_API_URL", "Frontend", "https://your-app.railway.app/api"],
          ],
          [2800, 1600, 4960]
        ),
        spacer(120),

        h2("6.2 Common Issues & Fixes"),
        simpleTable(
          ["Issue", "Cause", "Fix"],
          [
            ["Cookie not sent in production", "SameSite=Strict blocks cross-origin cookies", "Change cookie option to sameSite: 'none', secure: true. Requires HTTPS (Railway provides it)."],
            ["CORS error on login", "Origin not in CORS allow-list", "Set cors({ origin: process.env.FRONTEND_URL, credentials: true }) — credentials: true is required for cookies"],
            ["Prisma P1001 — can't reach DB", "Neon auto-pauses on free tier after inactivity", "Add ?connect_timeout=10 to DATABASE_URL or use Prisma Accelerate connection pooler"],
            ["Railway build fails", "package.json missing start script", "Add \"start\": \"node src/index.js\" to backend/package.json scripts"],
            ["Vercel 404 on page refresh", "SPA routes not handled by Vercel", "Add vercel.json: { \"rewrites\": [{ \"source\": \"/(.*)\", \"destination\": \"/\" }] }"],
            ["Email not delivered", "Resend sandbox only allows verified email", "In dev, send to the email you registered with. In prod, verify your domain in Resend dashboard."],
          ],
          [2400, 2400, 4560]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 7 — UI SPEC
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 7 — UI/UX SPECIFICATION"),
        spacer(160),
        h1("7. UI/UX Specification"),

        h2("7.1 Design Tokens"),
        simpleTable(
          ["Token", "Light", "Dark", "Usage"],
          [
            ["Brand primary", "#2C5F8A", "#5BA3D9", "Buttons, links, active nav item"],
            ["Brand accent", "#3A7CBF", "#7EC8E3", "Hover states, borders, badges"],
            ["Background", "#FFFFFF", "#0F172A", "Page background"],
            ["Surface", "#F8FAFC", "#1E293B", "Cards, sidebar, panels"],
            ["Border", "#E2E8F0", "#334155", "Dividers, input borders"],
            ["Text primary", "#0F172A", "#F1F5F9", "Body text, headings"],
            ["Text muted", "#64748B", "#94A3B8", "Subtitles, timestamps"],
            ["Success", "#1B7A44", "#4ADE80", "DONE status, success toasts"],
            ["Warning", "#D4860A", "#FBBF24", "HIGH priority, due soon"],
            ["Danger", "#C53030", "#F87171", "URGENT priority, overdue"],
          ],
          [1800, 1600, 1600, 4360]
        ),
        spacer(120),

        h2("7.2 Status & Priority Color Mapping"),
        simpleTable(
          ["Value", "Badge color", "Text"],
          [
            ["TODO", "Gray (bg-slate-100 / dark:bg-slate-700)", "Slate-600"],
            ["IN_PROGRESS", "Blue (bg-blue-100 / dark:bg-blue-900)", "Blue-700"],
            ["IN_REVIEW", "Purple (bg-purple-100 / dark:bg-purple-900)", "Purple-700"],
            ["DONE", "Green (bg-green-100 / dark:bg-green-900)", "Green-700"],
            ["LOW", "Gray", "Slate-500"],
            ["MEDIUM", "Blue", "Blue-600"],
            ["HIGH", "Amber (bg-amber-100)", "Amber-700"],
            ["URGENT", "Red (bg-red-100)", "Red-700"],
          ],
          [2400, 4080, 2880]
        ),
        spacer(120),

        h2("7.3 Responsive Breakpoints"),
        simpleTable(
          ["Breakpoint", "Sidebar", "Task list columns shown"],
          [
            ["< 768px (mobile)", "Hidden — opens as drawer on hamburger tap", "Title + Status only"],
            ["768px–1024px (tablet)", "Icon-only sidebar (60px)", "Title, Status, Due date"],
            ["1024px+ (desktop)", "Full sidebar (240px)", "All columns"],
          ],
          [2400, 3600, 3360]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 8 — README TEMPLATE
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 8 — README TEMPLATE"),
        spacer(160),
        h1("8. README.md Template"),
        body("Copy this structure directly into your README.md. Fill in the bracketed placeholders."),
        spacer(80),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders: { top: border, bottom: border, left: { style: BorderStyle.SINGLE, size: 8, color: "3A7CBF" }, right: border },
            shading: { fill: "F5F9FF", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [code("# Team Task Manager"), new TextRun({ text: "  — README sections required:", size: 18, font: "Arial", color: "888888" })], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## Live Demo")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  [Live URL] | [Demo Video]")], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## Features")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  (bullet list matching key features)")], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## Tech Stack")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  Frontend / Backend / Database / Email / Deployment")], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## Getting Started (Local Setup)")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  Prerequisites, clone, env setup, prisma migrate, npm run dev")], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## Environment Variables")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  Table listing all env vars with descriptions (no real values)")], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## API Documentation")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  Link to Postman collection or inline table of key routes")], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## Deployment")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  Steps to deploy backend to Railway, frontend to Vercel")], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## Test Credentials")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  Admin: admin@test.com / Test1234!")], spacing: { after: 40 } }),
              new Paragraph({ children: [code("  Member: member@test.com / Test1234!")], spacing: { after: 80 } }),
              new Paragraph({ children: [code("## License: MIT")], spacing: { after: 0 } }),
            ]
          })]})],
        }),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════
        // SECTION 9 — SUBMISSION CHECKLIST
        // ═══════════════════════════════════════════════════════════
        sectionDivider("SECTION 9 — FINAL SUBMISSION CHECKLIST"),
        spacer(160),
        h1("9. Final Submission Checklist"),
        body("Go through every item below before submitting. A single unchecked item can disqualify the submission."),
        spacer(120),

        h2("9.1 Functionality"),
        simpleTable(
          ["Item", "Test method"],
          [
            ["Register as Admin and as Member", "Use incognito for second user"],
            ["Admin can create a project", "Log in as Admin → New Project"],
            ["Admin can invite Member to project by email", "Invite second user's email"],
            ["Member sees project after being invited", "Log in as Member"],
            ["Admin can create and assign a task", "Create task → assign to Member"],
            ["Member can view and update their task status", "Log in as Member → change status"],
            ["Non-member cannot access project", "Try URL directly — should get 403"],
            ["Activity log shows all changes", "Check task detail panel"],
            ["Email sent when task is assigned", "Check inbox of assignee"],
            ["Dashboard shows correct stats", "Create several tasks, check counts"],
            ["Overdue tasks appear in dashboard", "Set a task's due date to yesterday"],
            ["Dark mode works and persists on refresh", "Toggle → refresh page"],
          ],
          [4680, 4680]
        ),
        spacer(120),

        h2("9.2 Code Quality"),
        simpleTable(
          ["Item", "Check"],
          [
            ["No .env file committed to GitHub", "Run: git log --all --full-history -- '.env'"],
            ["All routes have Zod validation", "Review every POST/PATCH route handler"],
            ["JWT auth middleware applied to all protected routes", "Review routes/index.js"],
            ["Passwords never returned in API responses", "Check User select in Prisma queries"],
            ["Error handling middleware at bottom of index.js", "Test an invalid route returns 404 JSON"],
            ["CORS only allows specific frontend origin in production", "Check cors() config"],
          ],
          [4680, 4680]
        ),
        spacer(120),

        h2("9.3 Deployment"),
        simpleTable(
          ["Item", "Check"],
          [
            ["Backend live on Railway — /api/health returns 200", "Visit URL in browser"],
            ["Frontend live on Vercel — loads without blank screen", "Open URL in fresh incognito window"],
            ["All env vars set in Railway and Vercel dashboards", "Check each service's env settings"],
            ["No hardcoded localhost URLs in production code", "Search codebase for 'localhost'"],
            ["Vercel rewrite rule added for SPA routing", "Navigate to a page, refresh — no 404"],
          ],
          [4680, 4680]
        ),
        spacer(120),

        h2("9.4 Submission Package"),
        simpleTable(
          ["Deliverable", "Status"],
          [
            ["Live URL (Vercel frontend)", ""],
            ["GitHub repo URL (public)", ""],
            ["README.md (all sections from Section 8)", ""],
            ["Demo video URL (2–5 min, covers all features)", ""],
          ],
          [4680, 4680]
        ),
        spacer(160),

        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders: noBorders,
            shading: { fill: "1B3A5C", type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 300, right: 300 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [new TextRun({ text: "End of PRD — Team Task Manager v1.0.0", bold: true, size: 22, font: "Arial", color: "FFFFFF" })], alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: "Build it. Deploy it. Ship it.", size: 20, font: "Arial", color: "A8D4E8" })], alignment: AlignmentType.CENTER }),
            ]
          })]})],
        }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/Team_Task_Manager_PRD.docx', buffer);
  console.log('Done!');
}).catch(e => { console.error(e); process.exit(1); });
