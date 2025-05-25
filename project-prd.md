# Product Requirements Document (PRD)


## We are using MongoDB Cluster connected with VS Code so make use of that
## 1. Product Name
**LoadForge GUI** – A load and stress testing application with a GUI built using React, a backend in Node.js, and MongoDB for persistence.

## 2. Purpose & Goals
Build a developer-friendly GUI tool for designing, executing, and analyzing load tests. The tool should support uploading large files, real-time monitoring, and downloading reports after test completion.

## 3. Background & User Personas
QA engineers and developers need a customizable, intuitive load testing tool that fits into their Node.js and React-based workflow. Existing tools are either too complex or lack GUI-first usability and file-attachment capabilities.

## 4. Functional Requirements

### FR-1: Test Specification Management
- Create, edit, delete, and store test specifications ("specs") in MongoDB.
- Each spec includes:
  - HTTP method, URL, headers, parameters, body (raw or file)
  - Load profile: ramp-up, steady-state, ramp-down
  - Request timing: total duration, delay between requests, iterations

### FR-2: File Attachments
- Attach files (e.g., XML, X12) up to 25 MB to a request.
- Files stored using GridFS or disk reference.

### FR-3: Load Profiles
- Define custom and predefined load profiles (e.g. spike, step, soak).
- Visual preview (graph) of how the profile behaves over time.

### FR-4: Parallel Test Execution
- Run multiple spec files in parallel.
- Control each test: start, stop, cancel independently.

### FR-5: Real-Time Monitoring
- Unified console showing outgoing request logs.
- Live metrics dashboard: active users, requests/sec, errors, response times.

### FR-6: Reports
- Summary reports of test runs.
- Download formats: PDF and CSV.
- Charts included for response times, request rate, etc.

### FR-7: CLI Interface
- CLI interface to execute specs headlessly using the same engine as the GUI.
- Commands: list specs, run spec by name or ID.

### FR-8: Scheduling
- Schedule test runs to execute once or on a recurring basis.
- Cron-based job handling.

## 5. Non-Functional Requirements

- High concurrency support (thousands of RPS).
- Efficient memory use with streaming for file attachments.
- Real-time, non-blocking UI via WebSockets.
- Cross-platform: must work on Windows, Linux, Docker.
- Simple deployment (Docker Compose + optional Helm chart).

## 6. Technical Approach

- **Frontend**: React (Vite), Material-UI, Recharts, Socket.io
- **Backend**: Node.js (Fastify), Worker Threads, Autocannon
- **Database**: MongoDB with GridFS
- **Reporting**: Puppeteer (PDF), Fast-csv (CSV)
- **CLI**: Node-based command-line interface using Commander.js
- **Scheduling**: node-cron for recurring and delayed test runs
- **Deployment**: Docker Compose; k8s optional via Helm

## 7. Milestones

| Milestone            | Description                                 |
|----------------------|---------------------------------------------|
| M1 – Repo Setup       | Initialize monorepo, CI pipeline, lint/test |
| M2 – Spec Editor      | CRUD APIs + GUI forms for spec creation     |
| M3 – Load Engine      | Worker-based engine with parallel run logic |
| M4 – Realtime UI      | WebSocket updates to dashboard and charts   |
| M5 – Reporting        | Summary report generation with export       |
| M6 – Scheduling       | Cron-based scheduled test execution         |
| M7 – Packaging        | Dockerize, document, stabilize              |

## 8. Risks & Considerations

- GridFS read bottlenecks – mitigate by caching file locally on run start
- UI overrun from too many socket messages – aggregate updates
- Windows worker performance limits – test and tune threading model
