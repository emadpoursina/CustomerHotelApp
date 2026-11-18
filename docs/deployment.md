# Deployment (production VPS)

Live demo deployment of the hotel survey. For requirements see `hotelSurveyDemoPRD.md`; for open product decisions see `docs/decisions.md`.

## Host

| Item | Value |
|---|---|
| Provider / region | ArvanCloud, Iran |
| Public IPv4 | `85.198.52.136` |
| OS | Ubuntu 26.04 LTS, 1 vCPU, 1 GB RAM, 2 GB swap |
| SSH | `ssh hotelArvan` (alias in `~/.ssh/config`), root with key `~/.ssh/hotelArvan`, password login disabled |
| Public URL | `https://server-86b945f7-6e9e-4bf1-a25a-16786fbb6e62.ir-southwest1-a.arvancompute.ir` |
| Project path | `/opt/hotel-survey` |

The hostname is the provider-assigned ArvanCloud name; it resolves directly to the VPS (no CDN/proxy in front). Caddy obtains and renews a Let's Encrypt certificate automatically.

## Runtime layout

```
Caddy (systemd, :80/:443, auto-TLS)  ->  127.0.0.1:8090
                                          |
                                          +-- Docker: limesurvey  (hotel-survey/limesurvey:6-apache,
                                          |             built from docker/limesurvey/Dockerfile)
                                          +-- Docker: db          (mariadb:11, internal network only)
```

- `docker-compose.yml` publishes LimeSurvey on **127.0.0.1 only**, so Docker's DNAT cannot bypass UFW.
- The LimeSurvey image is built locally to enable the JSON-RPC endpoint (`RPCInterface`), which `scripts/sync-survey-text.py` and the one-time survey import need. See `docker/limesurvey/Dockerfile`.
- The child theme is mounted from `limesurvey/themes/hotel-classic`; the demo app from `app/`.

## Deploying

```bash
make deploy          # or ./scripts/deploy.sh
```

`scripts/deploy.sh` validates the scaffold, rsyncs the project (never `.env`, `backups/`, `scratch/`, or the generated `app/data/dashboard.json`), rebuilds and restarts the stack, pushes survey titles/texts, and verifies the guest survey renders the `hotel-classic` theme.

`.env` on the operator machine needs:

```
DEPLOY_HOST=root@85.198.52.136
DEPLOY_PATH=/opt/hotel-survey
DEPLOY_PORT=22
```

In a non-interactive shell use `--yes` (piping into the script is unreliable because the validation step reads stdin):

```bash
./scripts/deploy.sh --yes
```

## Services (systemd on the host)

| Unit | Purpose |
|---|---|
| `caddy` | TLS termination and reverse proxy to `127.0.0.1:8090` |
| `docker` | Container runtime |
| `fail2ban` | SSH brute-force bans (`sshd` jail) |
| `hotel-dashboard.service` | Rebuilds `app/data/dashboard.json` every 30 s (aggregates only) |
| `hotel-backup.timer` | Nightly database backup at 02:15 UTC, 14-day retention |

Check them with `systemctl status hotel-dashboard`, `systemctl list-timers hotel-backup.timer`.

## Secrets

All production secrets live in `/opt/hotel-survey/.env` (mode `600`, generated on the server, never committed):

```bash
ssh hotelArvan 'grep -E "^(LS_ADMIN_USER|LS_ADMIN_PASSWORD|PUBLIC_URL)=" /opt/hotel-survey/.env'
```

LimeSurvey admin: `https://<public-url>/index.php/admin` (kept publicly reachable by operator decision; strong generated password).

## Backups and restore

Backups: `/opt/hotel-survey/backups/<db>-<timestamp>.sql.gz`, written nightly by `scripts/backup-db.sh` and pruned after 14 days. Manual run: `systemctl start hotel-backup.service`.

Restore was verified on 2026-11-08 into a scratch database (1 survey, 40 responses) and the scratch database dropped:

```bash
cd /opt/hotel-survey && set -a && . ./.env && set +a
docker compose exec -T db mariadb -uroot -p"$DB_ROOT_PASSWORD" -e \
  "DROP DATABASE IF EXISTS hotel_survey_restore; CREATE DATABASE hotel_survey_restore CHARACTER SET utf8mb4;"
gunzip -c backups/<file>.sql.gz | docker compose exec -T db mariadb -uroot -p"$DB_ROOT_PASSWORD" hotel_survey_restore
# verify, then: DROP DATABASE hotel_survey_restore;
```

To restore in place, stop the stack, load the dump into the real database, and start it again.

## Rebuilding the survey on an empty database

The database volume starts empty; LimeSurvey has no survey. Demo data on this host may be wiped. After a wipe, put survey **420001** back from the repo `.lss` (this is what adds **QDEPT** and the four department cards):

```bash
cd /opt/hotel-survey && set -a && . ./.env && set +a
python3 scripts/reimport-survey.py --yes
python3 scripts/sync-survey-text.py
# optional demo responses: python3 scripts/seed-demo.py --base-url http://localhost:8090 --survey-id 420001 --count 40
python3 scripts/seed-stories.py --base-url http://127.0.0.1:8090
```

`reimport-survey.py` deletes 420001, imports `limesurvey/survey/hotel-guest-survey.lss` as 420001, activates it, applies `hotel-classic`, widens `lime_answers.code` (LimeSurvey's default is VARCHAR(5)), and inserts the four QDEPT answers (import still drops those long codes). If the cards are missing but the survey exists, `python3 scripts/reimport-survey.py --answers-only` is enough. Then:

1. If the child theme is missing from LimeSurvey's theme registry, register it:
   ```bash
   # inside the limesurvey container, one-off Yii command
   php application/commands/console.php installtheme hotel-classic
   ```
   (The theme directory is already mounted; the registry row is what makes it selectable.)
2. Confirm Rate shows the four department cards after Start survey.

## Host baseline

Applied 2026-11-08: full package upgrade + reboot, 2 GB swap, UFW (inbound 22/80/443 only), fail2ban, unattended-upgrades, Docker log rotation, conservative sysctl values, key-only SSH (root login via key only, `MaxAuthTries 3`).

Known deviations from the generic baseline: root SSH login stays enabled (key-only) because `deploy.sh` and the operator connect as `root`; no separate sudo user was created.
