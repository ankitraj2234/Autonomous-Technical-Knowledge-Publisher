# Autonomous Technical Knowledge Publisher (ATKP)

An AI-orchestrated publishing engine that continuously generates and publishes structured technical documentation across cybersecurity, cloud, and DevOps domains using the **Kimi K2.5** model via NVIDIA NIM.

## What It Does

- **Selects** a technical topic from 195+ curated engineering topics across 9 categories
- **Generates** structured, engineering-grade documentation using AI
- **Publishes** it to this repository as a properly formatted markdown file
- **Repeats** daily with a random 1–10 article schedule
- **Avoids** duplication via topic tracking

## Architecture

```
┌─────────────────────────────────────────┐
│            Vercel (Next.js)              │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  │
│  │ Scheduler │→ │ AI Gen   │→ │GitHub │  │
│  │ (Cron)    │  │ Kimi K2.5│  │Publish│  │
│  └──────────┘  └──────────┘  └───────┘  │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │     Dashboard UI (React)         │   │
│  │  Stats · Schedule · Notes · Hist │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Categories

| Category | Topics |
|----------|--------|
| Cybersecurity | IAM, Zero Trust, TLS, JWT, SSRF, Container Escape... |
| Cloud Architecture | VPC, Multi-Region, Serverless, Data Lake... |
| DevOps | GitOps, CI/CD Security, Feature Flags, Chaos Eng... |
| Networking | BGP, SDN, QUIC, eBPF, mTLS... |
| System Design | CQRS, Consistent Hashing, Saga Pattern... |
| Auth & AuthZ | OAuth 2.0, OIDC, RBAC, WebAuthn... |
| Observability | OpenTelemetry, SLI/SLO, Distributed Tracing... |
| Containerization | K8s RBAC, Operators, Network Policy, CSI... |
| Infrastructure as Code | Terraform, Pulumi, CDK, Policy as Code... |

## Tech Stack

- **Runtime**: Next.js 14 (App Router)
- **AI**: Kimi K2.5 via NVIDIA NIM (OpenAI-compatible)
- **Publishing**: GitHub Contents API via Octokit
- **Scheduling**: Vercel Cron Jobs
- **UI**: React with premium dark-mode design
- **Data**: JSON file store (no database needed)

## Dashboard

The web UI provides:
- **Real-time stats**: total articles, daily plan, streak, topic pool
- **Schedule timeline**: today's planned commits with status
- **Notes editor**: create/edit/delete TXT files (each action = GitHub commit)
- **Topic history**: browse all published articles with search/filter
- **Settings**: API configuration and system architecture overview

## Deployment

This project is designed to deploy on **Vercel**:

1. Import this repo into Vercel
2. Set environment variables:
   - `NVIDIA_API_KEY` — from [build.nvidia.com](https://build.nvidia.com)
   - `GITHUB_TOKEN` — Personal Access Token with `repo` scope
   - `GITHUB_OWNER` — `ankitraj2234`
   - `GITHUB_REPO` — `Autonomous-Technical-Knowledge-Publisher`
   - `CRON_SECRET` — any random secret string
3. Deploy — cron jobs auto-configure via `vercel.json`

## How Scheduling Works

1. At **midnight IST**, the `daily-plan` cron generates a random number N (1–10)
2. N unique topics are selected from the pool (with dedup against published history)
3. Commit times are spread across waking hours (6 AM – 11 PM IST) with randomized jitter
4. Every **30 minutes**, the `execute-commit` cron checks for due entries and processes them
5. Each entry: AI generates article → commits to GitHub → marks complete

## License

MIT
