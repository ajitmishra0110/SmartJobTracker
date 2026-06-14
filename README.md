# SmartJobTracker AI

An AI-powered job application tracker built as a Spring Cloud microservices project with a React dashboard.

## What it does

- Track job applications on a Kanban board
- Authenticate users with JWT
- Use AI to:
  - Parse pasted job descriptions into structured application fields
  - Recommend the best next action for any application
  - Generate interview prep questions and answer frameworks
  - Draft tailored cover letters
  - Analyze your entire pipeline and coach your weekly plan
  - Chat with an AI career coach using your live pipeline as context

## Architecture

```text
React UI (3000)
    -> API Gateway (8080)
        -> Auth Service (8081)
        -> Job Service (8082)
        -> AI Service (8083)
    -> Eureka Server (8761)
    -> PostgreSQL (5432)
```

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 18+
- PostgreSQL
- Gemini, OpenAI, Groq, or another OpenAI-compatible API key

## Environment variables

Create a local env setup before starting the AI service:

```powershell
$env:OPENAI_API_KEY="your-provider-key"
$env:JWT_SECRET="mysecretkeymysecretkeymysecretkey123"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="postgres"
```

Optional:

```powershell
$env:OPENAI_MODEL="gemini-3.5-flash"
$env:OPENAI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai"
$env:OPENAI_TIMEOUT_SECONDS="30"
$env:OPENAI_RESPONSE_FORMAT_ENABLED="true"
$env:REACT_APP_API_URL="http://localhost:8080"
```

For OpenAI, use `OPENAI_BASE_URL=https://api.openai.com/v1` and an OpenAI model.
For Groq, use `OPENAI_BASE_URL=https://api.groq.com/openai/v1` and a Groq model such as `llama-3.1-8b-instant`.

## Database setup

```sql
CREATE DATABASE smartjobtracker;
```

Or start Postgres with Docker:

```powershell
docker compose up -d postgres
```

## Deploy live (free hosting)

See **[DEPLOY.md](DEPLOY.md)** for step-by-step instructions to deploy on **Render** (backend + database) and **Vercel** (React UI).

Quick start:
1. [Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint) → connect `SmartJobTracker` repo
2. [Vercel](https://vercel.com/new) → import repo, root dir `job-tracker-ui`, set `REACT_APP_API_URL` to your gateway URL

## Run locally

Start services in this order:

```powershell
cd eureka-server
mvn spring-boot:run
```

```powershell
cd smartJobTracker
mvn spring-boot:run
```

```powershell
cd job-service
mvn spring-boot:run
```

```powershell
cd ai-service
mvn spring-boot:run
```

If Maven is installed through another module wrapper:

```powershell
cd job-service
./mvnw -f ../ai-service/pom.xml spring-boot:run
```

```powershell
cd api-gateway
mvn spring-boot:run
```

```powershell
cd job-tracker-ui
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## AI endpoints

All AI routes are exposed through the gateway at `/ai/**`:

- `POST /ai/parse-job`
- `POST /ai/interview-prep`
- `POST /ai/next-action`
- `POST /ai/cover-letter`
- `POST /ai/fit-plan`
- `POST /ai/outreach-draft`
- `POST /ai/pipeline-insights`
- `POST /ai/coach`

## Demo flow

1. Sign up and log in
2. Paste a job posting and click **AI parse and fill**
3. Save the application to your pipeline
4. Use the focus queue to work overdue and high-priority opportunities
5. Drag cards across statuses
6. Use **Next**, **Fit plan**, **Outreach**, **Prep**, or **Letter** on any card
7. Click **Analyze pipeline** or ask the AI coach for weekly priorities

## Notes

- AI features require `OPENAI_API_KEY`
- JWT secret must match across auth, job, and ai services
- Jobs are scoped to the authenticated user in job-service
- Keep API keys in environment variables or IntelliJ run configuration, not in `application.properties`
