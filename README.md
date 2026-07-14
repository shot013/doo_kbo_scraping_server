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

| Method | Path | Query/Body | 설명 |
| --- | --- | --- | --- |
| POST | `/scrape/games` | body: `seasonYear`(미지정 시 현재 연도) | 경기 일정/결과 스크래핑 실행 |
| POST | `/scrape/standings` | body: `seasonYear`(미지정 시 현재 연도) | 순위표 스크래핑 실행 |
| POST | `/scrape/game-stats` | body: `gameId`(필수) | 특정 경기의 선수 기록 스크래핑 실행 |

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
