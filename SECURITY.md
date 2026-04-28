# Security Policy

## Supported Versions

Only the latest version of `package-pulse` on the `main` branch receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest (`main`) | Yes |
| older   | No                 |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, please report them privately via GitHub's built-in private vulnerability reporting:

1. Go to the repository's [Security tab](https://github.com/doryski/package-pulse/security).
2. Click **"Report a vulnerability"** to open a private security advisory.
3. Provide as much information as possible, including:
   - A description of the issue and its potential impact.
   - Steps to reproduce or a proof-of-concept.
   - Affected versions or commits.
   - Any suggested mitigations or fixes.

If for some reason you cannot use GitHub Security Advisories, you may open a minimal public issue requesting a private contact channel — **without disclosing the vulnerability details**.

## Response Process

- You should receive an acknowledgement within **7 days** of your report.
- The maintainer will investigate and respond with an assessment within **14 days**.
- Fixes for confirmed vulnerabilities are prioritized and released as soon as practical.
- Once a fix is released, the advisory will be published with appropriate credit (unless you prefer to remain anonymous).

## Scope

In scope:

- The application source code in this repository.
- Build, deployment, and CI configuration committed to this repository.

Out of scope:

- Vulnerabilities in third-party dependencies (please report those upstream; we will update once a patched version is available).
- Issues requiring physical access, social engineering, or compromised developer machines.
- Denial-of-service attacks via excessive request volume against public deployments.

## Safe Harbor

We support responsible disclosure. We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and service disruption.
- Report vulnerabilities promptly and privately.
- Do not exploit a vulnerability beyond what is necessary to demonstrate it.

Thank you for helping keep `package-pulse` and its users safe.
