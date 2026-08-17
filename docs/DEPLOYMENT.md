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

`t2.micro`/`t3.micro`는 RAM이 1GB뿐입니다. (과거엔 스크래핑 시 Playwright가 Chromium을 띄워 OOM 위험이 있었으나, 스크래퍼를 fetch 기반으로 전환하면서 더 이상 브라우저를 띄우지 않습니다.) 그래도 Postgres + Node를 함께 운영하는 만큼 여유 있게 최소 2GB 스왑을 만들어 둡니다.

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
- **업데이트 배포**:
  ```bash
  git pull
  docker compose -f docker-compose.prod.yml build app
  docker compose -f docker-compose.prod.yml run --rm migrate   # 마이그레이션 있을 때만
  docker compose -f docker-compose.prod.yml up -d app
  ```
- **DB 데이터**: `postgres_data` named volume에 저장되므로 `docker compose down`으로 컨테이너를 내려도 유지됩니다. 볼륨까지 지우려면 `docker compose down -v` (주의).

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
