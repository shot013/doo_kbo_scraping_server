# 배포 가이드 (AWS EC2 프리티어)

`Dockerfile` + `docker-compose.prod.yml`로 단일 EC2 인스턴스에 앱과 Postgres를 함께 띄우는 것을 기준으로 합니다. 매니지드 DB(RDS)는 쓰지 않습니다 — 프리티어 비용을 0에 가깝게 유지하기 위함입니다.

## 1. EC2 인스턴스 생성

- **AMI**: Ubuntu 22.04 LTS
- **인스턴스 유형**: `t2.micro` 또는 `t3.micro` (프리티어 대상, vCPU 1~2 / RAM 1GB)
- **스토리지**: gp3 20GB (프리티어 한도 30GB 이내)
- **보안 그룹**:
  | 포트 | 소스 | 용도 |
  | --- | --- | --- |
  | 22 | 내 IP만 | SSH |
  | 3651 | 필요한 범위만 (앱을 직접 노출할 경우) | 앱 HTTP |

  가능하면 3651을 직접 열지 말고 Nginx 등으로 80/443만 열어 리버스 프록시하는 걸 권장합니다 (이 가이드에서는 3651 직접 노출 기준으로 설명).

### Elastic IP (권장)

인스턴스에 기본 할당되는 퍼블릭 IP는 동적이라 `stop` → `start`를 거치면 바뀝니다(`reboot`은 안 바뀜). 실서비스로 계속 켜둘 거라면 Elastic IP를 할당해 고정하는 걸 권장합니다. 인스턴스에 연결되어 있는 동안은 추가 비용이 없고, 연결 안 된 채로 유휴 상태면 과금됩니다.

```bash
ALLOC_ID=$(aws ec2 allocate-address --domain vpc \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=doo-kbo-server}]' \
  --query "AllocationId" --output text)
aws ec2 associate-address --instance-id <INSTANCE_ID> --allocation-id "$ALLOC_ID"
```

## 2. 인스턴스 초기 설정

SSH 접속 후:

```bash
sudo apt update && sudo apt upgrade -y

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

### 스왑 설정 (중요)

`t2.micro`/`t3.micro`는 RAM이 1GB뿐입니다. 네이버 스포츠 API를 호출할 때 앱 컨테이너가 헤드리스 Chromium을 띄우는데(요청이 있을 때만 띄우고 마지막 요청 30초 뒤 종료), 이때 수백 MB를 쓰므로 스왑이 없으면 OOM 위험이 있습니다. Postgres + Node + Chromium을 함께 운영하는 만큼 최소 2GB 스왑을 반드시 만들어 둡니다.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # 스왑 2.0G 확인
```

## 3. 저장소 배치 및 환경변수

```bash
git clone <repo-url> doo_kbo_scraping_server
cd doo_kbo_scraping_server
cp .env.example .env
```

`.env`에서 프로덕션용으로 반드시 바꿔야 하는 값:

| 변수 | 비고 |
| --- | --- |
| `DB_PASSWORD` | `.env.example` 기본값(`postgres`) 그대로 두지 말 것 |
| `DB_SYNCHRONIZE` | `false` 유지 (마이그레이션으로만 스키마 변경) |
| `SENTRY_DSN` | Sentry 프로젝트의 DSN. `src/instrument.ts`가 `dotenv/config`로 직접 읽으므로 비어 있으면 Sentry가 이벤트를 전송하지 않음 |

`DB_HOST`는 `docker-compose.prod.yml`이 `postgres`(compose 서비스명)로 덮어쓰므로 `.env`에서 신경 쓰지 않아도 됩니다.

## 4. 빌드 및 마이그레이션

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm migrate
```

`migrate`는 `build` 스테이지(devDependencies 포함)를 재사용해 `npm run migration:run`을 1회 실행하는 one-off 서비스입니다.

## 5. 앱 기동

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

헬스체크:

```bash
curl http://localhost:3651/games
```

인스턴스 재부팅 시 Docker 데몬은 자동 기동되고(`get.docker.com` 설치 시 systemd enable됨), 컨테이너는 `restart: unless-stopped` 정책으로 함께 살아납니다.

## 6. 운영

- **로그**: `docker compose -f docker-compose.prod.yml logs -f app`
- **업데이트 배포**: `main`에 병합되면 GitHub Actions가 자동으로 배포합니다(아래 "8. 자동 배포"). 수동으로 할 때는 같은 스크립트를 로컬에서 SSH로 흘려보냅니다:
  ```bash
  ssh -i <pem경로> ubuntu@<EIP> 'bash -s' < scripts/deploy.sh
  ```
  스크립트가 하는 일은 서버에서 직접 실행하는 아래 명령과 같습니다(백업과 헬스체크 포함):
  ```bash
  git pull
  docker compose -f docker-compose.prod.yml build app migrate
  docker compose -f docker-compose.prod.yml run --rm migrate
  docker compose -f docker-compose.prod.yml up -d app
  ```
  `migrate`도 반드시 함께 빌드합니다. `app`만 빌드하면 `migrate` 이미지가 이전 배포의 것으로 남아 새 마이그레이션을 찾지 못하고 "No migrations are pending"으로 끝납니다. 대기 중인 마이그레이션이 없으면 `run --rm migrate`는 아무것도 하지 않으므로 매번 실행해도 됩니다.
- **DB 데이터**: `postgres_data` named volume에 저장되므로 `docker compose down`으로 컨테이너를 내려도 유지됩니다. 볼륨까지 지우려면 `docker compose down -v` (주의).
- **`.env` 값만 바꿀 때** (예: `SENTRY_DSN` 교체): 코드 변경이 없으므로 재빌드 없이 `.env`만 수정 후 `docker compose -f docker-compose.prod.yml up -d app`로 `app`만 재기동하면 됩니다. 로컬에서 SSH 한 줄로 원격 `.env`를 갱신할 수도 있습니다:
  ```bash
  ssh -i <pem경로> ubuntu@<EIP> \
    "grep -q '^SENTRY_DSN=' ~/doo_kbo_scraping_server/.env \
     && sed -i 's|^SENTRY_DSN=.*|SENTRY_DSN=<새 DSN>|' ~/doo_kbo_scraping_server/.env \
     || echo 'SENTRY_DSN=<새 DSN>' >> ~/doo_kbo_scraping_server/.env"
  ```

## 7. 정리 (teardown)

배포를 완전히 걷어낼 때는 아래 순서로 진행합니다. 순서를 지키지 않으면(특히 Elastic IP를 먼저 릴리스하지 않고 인스턴스부터 지우면) 유휴 IP로 과금되는 상태가 남을 수 있습니다.

```bash
# 1. Elastic IP 연결 해제 + 릴리스 (할당했었다면)
aws ec2 disassociate-address --association-id <ASSOCIATION_ID>
aws ec2 release-address --allocation-id <ALLOCATION_ID>

# 2. 인스턴스 종료
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
aws ec2 wait instance-terminated --instance-ids <INSTANCE_ID>

# 3. 보안 그룹 삭제 (인스턴스가 완전히 terminated 상태여야 삭제 가능)
aws ec2 delete-security-group --group-id <SECURITY_GROUP_ID>

# 4. 필요 시 키 페어도 삭제 (재사용할 계획이 없다면)
aws ec2 delete-key-pair --key-name <KEY_NAME>
```

`describe-addresses`/`describe-instances`로 각 ID를 다시 확인할 수 있습니다. DB 데이터는 인스턴스와 함께 사라지므로(EBS 볼륨은 인스턴스 종료 시 기본적으로 같이 삭제됨), 필요한 데이터가 있다면 종료 전에 백업하세요.

## 8. 자동 배포 (GitHub Actions)

`.github/workflows/deploy.yaml`이 `main`에 push(= `develop` → `main` PR 병합)될 때마다 CI(포맷·린트·테스트)를 다시 돌리고, 통과하면 SSH로 `scripts/deploy.sh`를 서버에서 실행합니다. Actions 탭의 **Deploy → Run workflow**로 `main`을 수동 배포할 수도 있습니다.

`scripts/deploy.sh`의 순서:

1. 사전 점검: 서버 저장소에 커밋 안 된 변경이 있거나 백필 요청(`/scrape/*/backfill`)이 실행 중이면 중단합니다. 백필은 수 시간 걸리는 단일 HTTP 요청이라 app을 재기동하면 끊기기 때문입니다. 그래도 배포하려면 수동 실행에서 `force`를 켭니다.
2. `git fetch` + `main` fast-forward (배포 대상 커밋이 포함됐는지 확인)
3. DB 백업: `~/backups/db_<시각>_<이전 커밋>.sql.gz`, 최근 5개만 보관
4. `build app migrate` → `run --rm migrate` → `up -d app`
5. 헬스체크: `GET /games?limit=1`이 200이 될 때까지 최대 90초. 실패하면 app 로그를 남기고 워크플로를 실패시킵니다
6. dangling 이미지 정리

자동 롤백은 하지 않습니다. 실패하면 Actions 로그를 보고, 필요하면 서버에서 이전 커밋으로 `git checkout <커밋>` 후 `build app` → `up -d app`, 마이그레이션까지 되돌려야 하면 `docker compose -f docker-compose.prod.yml run --rm migrate npm run migration:revert`, 데이터 복구가 필요하면 백업을 `gunzip -c <백업> | docker compose -f docker-compose.prod.yml exec -T postgres psql -U <DB_USERNAME> <DB_DATABASE>`로 되돌립니다.

### 서버 상태 확인 (GitHub Actions)

Actions 탭의 **Server Status → Run workflow**로 PC 없이 서버 상태를 읽기 전용으로 조회할 수 있습니다(`scripts/server-status.sh`). 배포 커밋, 컨테이너 상태, `/games` 헬스체크, 실행 중인 백필과 그 응답(`~/backfill_*.json`), 경기 요약이 저장된 경기 수, 최근 3시간 경고·에러 로그, 메모리·디스크를 보여 줍니다. 시크릿은 자동 배포와 같습니다.

### 필요한 GitHub 시크릿

저장소 **Settings → Secrets and variables → Actions**에 등록합니다.

| 시크릿 | 필수 | 값 |
| --- | --- | --- |
| `EC2_HOST` | O | 서버 주소 (Elastic IP) |
| `EC2_SSH_KEY` | O | 접속용 `.pem` 파일 내용 전체 (`-----BEGIN ...`부터 `-----END ...`까지) |
| `EC2_USER` | | SSH 사용자. 없으면 `ubuntu` |
| `EC2_KNOWN_HOSTS` | | `ssh-keyscan <EC2_HOST>` 출력. 없으면 배포 때마다 keyscan으로 받습니다(중간자 공격에 취약하므로 등록 권장) |

보안 그룹이 22번 포트를 특정 IP로만 열어 두었다면 GitHub Actions 러너(매번 IP가 바뀜)가 접속할 수 없습니다. 아래 시크릿을 추가하면 배포하는 동안만 러너 IP를 보안 그룹에 추가했다가 끝나면 지웁니다. 22번을 전체에 열어 두는 것보다 안전합니다.

| 시크릿 | 값 |
| --- | --- |
| `EC2_SECURITY_GROUP_ID` | 인스턴스 보안 그룹 ID (`sg-...`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | 배포 전용 IAM 사용자의 액세스 키 |
| `AWS_REGION` | 없으면 `ap-northeast-2` |

배포 전용 IAM 사용자에는 그 보안 그룹의 인바운드 규칙 추가·삭제 권한만 줍니다:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ec2:AuthorizeSecurityGroupIngress", "ec2:RevokeSecurityGroupIngress"],
      "Resource": "arn:aws:ec2:ap-northeast-2:<계정ID>:security-group/<sg-ID>"
    }
  ]
}
```
