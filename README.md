## 서버 구동 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사해 `.env`를 만들고 필요 시 값을 수정합니다.

```bash
cp .env.example .env
```

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `PORT` | 앱이 리스닝할 포트 | `3651` |
| `DB_HOST` | Postgres 호스트 | `localhost` |
| `DB_PORT` | Postgres 포트 | `5432` |
| `DB_USERNAME` | Postgres 사용자 | `postgres` |
| `DB_PASSWORD` | Postgres 비밀번호 | `postgres` |
| `DB_DATABASE` | Postgres 데이터베이스명 | `doo_kbo` |
| `DB_SYNCHRONIZE` | TypeORM synchronize 여부 (운영에서는 `false` 유지) | `false` |
| `DB_LOGGING` | TypeORM 쿼리 로깅 여부 | `false` |

### 3. 로컬 Postgres 실행 (Docker)

```bash
docker compose up -d
```

`docker-compose.yml`은 `.env`의 `DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE`/`DB_PORT` 값을 사용해 `postgres:16-alpine` 컨테이너를 띄웁니다.

### 4. 마이그레이션 실행

```bash
npm run migration:run
```

스키마 변경 후 마이그레이션 파일을 새로 생성하려면 `npm run migration:generate -- src/database/migrations/<이름>`, 되돌리려면 `npm run migration:revert`를 사용합니다.

### 5. 앱 실행

```bash
npm run start:dev   # watch 모드 (개발용, 권장)
npm run start       # 1회 실행
npm run start:prod  # 빌드 산출물(dist) 실행 (사전에 npm run build 필요)
```

정상 기동되면 `http://localhost:<PORT>`에서 서버가 응답합니다 (`PORT` 미설정 시 `3000`).

### 참고: 테스트/린트

```bash
npm run format:check   # 포맷 체크
npm run lint           # 정적 분석
npm run test           # 전체 테스트
```

## 배포

프로덕션용 `Dockerfile`/`docker-compose.prod.yml`이 준비되어 있습니다. AWS EC2 프리티어 기준 배포 절차는 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) 참고.

## API 목록

응답 형식은 컨트롤러 참고 (별도 global prefix 없음). 목록 API는 페이지네이션 공통 응답 `{ data, total, page, limit, totalPages }`을 사용하며, `page`/`limit` 기본값은 각각 `1`/`20` (`limit` 최대 `100`), `sortOrder` 기본값은 `ASC`.

### Games (`src/modules/game`)

| Method | Path | Query/Body | 설명 |
| --- | --- | --- | --- |
| GET | `/games` | `seasonYear`, `gameDate`, `status`(`SCHEDULED`\|`IN_PROGRESS`\|`FINISHED`\|`CANCELLED`\|`POSTPONED`), `teamCode`, `page`, `limit`, `sortBy`(`scheduledAt`\|`gameDate`\|`seasonYear`\|`homeScore`\|`awayScore`), `sortOrder`(`ASC`\|`DESC`) | 경기 목록 조회 |
| GET | `/games/:id` | - | 경기 단건 조회 |

### Game Stats (`src/modules/game-stats`)

| Method | Path | Query/Body | 설명 |
| --- | --- | --- | --- |
| GET | `/game-stats` | `gameId`, `teamCode`, `statType`(`BATTING`\|`PITCHING`), `page`, `limit`, `sortBy`(`id`\|`teamCode`\|`playerName`\|`homeRuns`\|`rbi`\|`battingAverage`\|`era`), `sortOrder` | 경기별 선수 기록 목록 조회 |
| GET | `/game-stats/:id` | - | 선수 기록 단건 조회 |

### Standings (`src/modules/standings`)

| Method | Path | Query/Body | 설명 |
| --- | --- | --- | --- |
| GET | `/standings` | `seasonYear`(미지정 시 현재 연도), `page`, `limit`, `sortBy`(`rank`\|`winRate`\|`gamesBehind`\|`wins`\|`losses`\|`gamesPlayed`), `sortOrder` | 시즌 순위 목록 조회 |

### Scrape (`src/modules/scrape`)

| Method | Path | Query/Body | 설명 | 스케줄러 등록 |
| --- | --- | --- | --- | --- |
| POST | `/scrape/games` | body: `seasonYear`(미지정 시 현재 연도) | 경기 일정/결과 스크래핑 실행 | O (17시~다음날 1시, 매 정시) |
| POST | `/scrape/standings` | body: `seasonYear`(미지정 시 현재 연도) | 순위표 스크래핑 실행 | O (17시~다음날 1시, 매 정시) |
| POST | `/scrape/game-stats` | body: `gameId`(필수) | 특정 경기의 선수 기록 스크래핑 실행 | O (17시~다음날 1시, 매 정시 — 당일 경기 중 `IN_PROGRESS`/`FINISHED` 상태만 자동 대상) |

### Scrape Source Health (`src/modules/scrape-source-health`)

| Method | Path | Query/Body | 설명 |
| --- | --- | --- | --- |
| GET | `/scrape-source-health` | `sourceName`, `status`(`SUCCESS`\|`FAILURE`), `limit` | 스크래핑 소스별 최근 실행 상태 조회 |

### Example (`src/modules/example`, 템플릿 전용)

새 모듈 작성 시 복사하는 더미 템플릿으로, 실제 서비스 API는 아닙니다.

| Method | Path | Query/Body | 설명 |
| --- | --- | --- | --- |
| GET | `/examples` | - | 예시 목록 조회 (인메모리) |
| GET | `/examples/:id` | - | 예시 단건 조회 |
| POST | `/examples` | body: `name`(필수), `description` | 예시 생성 |

## API 호출 플로우

모든 API는 `Controller → Service → Repository(TypeORM) → DB` 계층을 통과합니다. `domain`은 Nest/TypeORM을 모르는 순수 인터페이스·엔티티만 가지고, `infrastructure`가 이를 구현합니다 (자세한 규칙은 `.claude/rules/architecture.md` 참고).

### 조회 API — Games / Game Stats / Standings / Scrape Source Health

```
Controller (application/*.controller.ts)
  → Service (application/*.service.ts)
    → Repository 인터페이스 (domain/repositories/*.repository.ts, DI 토큰)
      → Repository 구현체 (infrastructure/repositories/*.repository.impl.ts)
        → TypeORM Entity (infrastructure/orm/*.orm-entity.ts) → Postgres
```

예: `GET /games` → `GameController.findAll` → `GameService.findAll` → `GAME_REPOSITORY` 토큰으로 주입된 구현체가 쿼리 실행 → ORM 결과를 domain `Game` 엔티티로 변환해 페이지네이션 응답으로 반환. `Game Stats`/`Standings`/`Scrape Source Health` 조회도 동일한 구조입니다.

### 스크래핑 API — `POST /scrape/*`

```
ScrapeController (application/scrape.controller.ts)
  → ScrapeService (application/scrape.service.ts)
    → Scraper (infrastructure/scrapers/*.scraper.ts)
        Playwright로 KBO 사이트에 직접 접속해 내부 API 응답을 가로채 파싱
      → 파싱 결과를 Game/Standing/GameStat 도메인 엔티티로 변환
        → 각 모듈의 Service.upsert()로 건별 저장 (개별 실패는 warn 로그 후 계속 진행)
    → ScrapeSourceHealthService.log()로 성공/실패·소요시간·저장 건수 기록
```

- `POST /scrape/games`: `GameScraper`가 KBO 스케줄 페이지(`Schedule.aspx`)를 열어 `GetScheduleList` 응답을 파싱 → 경기별로 `GameService.upsert()`
- `POST /scrape/standings`: `StandingsScraper`가 KBO 팀순위 페이지를 파싱 → `StandingService.upsert()`
- `POST /scrape/game-stats`: `GameStatsScraper`가 `body.gameId`로 박스스코어(`GetBoxScoreScroll`) 응답을 타자/투수로 나눠 파싱 → `GameStatService.upsert()`. 대상 경기가 아직 시작 전이면 응답 자체가 없어 실패로 끝남

세 API 모두 스크래핑이 실패하면(빈 결과 포함) `scrape-source-health`에 `FAILURE`로 기록되고 예외가 컨트롤러까지 그대로 전파됩니다(500 응답).

## Project structure

```
src/
  main.ts               # 애플리케이션 진입점 (부트스트랩, 서버 시작)
  app.module.ts          # 루트 모듈 (컨트롤러/프로바이더 조합)
  app.controller.ts      # 라우팅 및 요청 처리
  app.service.ts         # 비즈니스 로직
  app.controller.spec.ts # 컨트롤러 유닛 테스트
test/
  app.e2e-spec.ts         # e2e 테스트
```

- **main.ts**: `NestFactory.create(AppModule)`로 앱 인스턴스를 생성하고 `PORT` 환경변수(없으면 3000)로 서버를 기동합니다.
- **app.module.ts**: 애플리케이션의 루트 모듈입니다. 새 기능을 추가할 때는 별도 모듈(예: `ScrapeModule`)을 만들어 이곳 `imports`에 등록합니다.
- **app.controller.ts**: HTTP 요청을 받아 서비스에 위임하는 계층입니다. 생성자 주입으로 `AppService`를 받습니다.
- **app.service.ts**: 실제 로직이 들어가는 프로바이더(`@Injectable()`)입니다.
