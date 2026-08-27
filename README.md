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

- 응답에 `homeStarterPitcher`/`awayStarterPitcher`(선발투수, 네이버 스포츠 일정 API로 보정) 포함. 선발 예고 전이면 `null`

### Game Stats (`src/modules/game-stats`)

| Method | Path | Query/Body | 설명 |
| --- | --- | --- | --- |
| GET | `/game-stats` | `gameId`, `teamCode`, `statType`(`BATTING`\|`PITCHING`), `page`, `limit`, `sortBy`(`id`\|`teamCode`\|`playerName`\|`homeRuns`\|`rbi`\|`battingAverage`\|`era`), `sortOrder` | 경기별 선수 기록 목록 조회 |
| GET | `/game-stats/:id` | - | 선수 기록 단건 조회 |

### Game Results (`src/modules/game-results`)

| Method | Path | Query | 설명 |
| --- | --- | --- | --- |
| GET | `/game-results/recent` | `date`(`YYYY-MM-DD`, 미지정 시 가장 최근에 종료 경기가 있는 날짜) | 특정 날짜의 종료 경기 결과 목록 조회 |

- 경기별로 베스트 활약 타자(`bestPerformer`: 타점 → 안타 → 득점 순으로 비교해 선정, 홈런 데이터 미보유로 비교 기준에서 제외)와 승/패/세이브/홀드 투수 기록(`pitchers`)을 함께 반환
- 해당 날짜에 `game-stats`가 아직 스크래핑되지 않은 경기는 `bestPerformer: null`, `pitchers: []`

### Standings (`src/modules/standings`)

| Method | Path | Query/Body | 설명 |
| --- | --- | --- | --- |
| GET | `/standings` | `seasonYear`(미지정 시 현재 연도), `page`, `limit`, `sortBy`(`rank`\|`winRate`\|`gamesBehind`\|`wins`\|`losses`\|`gamesPlayed`), `sortOrder` | 시즌 순위 목록 조회 |

- 각 행에는 순위/승패/승률/게임차 외에 팀 타율(`battingAverage`), 팀 평균자책(`era`), 팀 득점(`runsScored`), 팀 실점(`runsAllowed`)이 포함됨. 이 값들은 `game-stats`/`game`을 집계해 순위 스크랩 시점에 함께 계산·저장됨(요청마다 재계산하지 않음)

### Teams (`src/modules/teams`)

| Method | Path | Query | 설명 |
| --- | --- | --- | --- |
| GET | `/teams` | `seasonYear` | 시즌 팀 요약 목록 조회 |
| GET | `/teams/:code` | `seasonYear` | 팀 상세 조회 (요약 + 로스터) |

- `seasonYear` 미지정 시 현재 연도. `:code`는 대문자로 정규화되어 조회됨
- 요약에는 팀 코드(`teamCode`)/팀명(`teamName`)/순위/승패/승률/게임차/팀 타율(`battingAverage`)/팀 평균자책(`era`)/팀 득점(`runsScored`)/팀 실점(`runsAllowed`)/최근 5경기 폼(`recentForm`)이 포함되며 `standings`(타율/평균자책/득점/실점 포함) + `game`(최근 폼)을 조합해 만듦

### Players (`src/modules/players`)

| Method | Path | Query | 설명 |
| --- | --- | --- | --- |
| GET | `/players` | `search`, `teamCode`, `position`, `seasonYear`, `page`, `limit`, `sortOrder` | 선수 목록 조회 |
| GET | `/players/:id` | `seasonYear` | 선수 상세 조회 |

- `position`: `PITCHER`\|`CATCHER`\|`INFIELDER`\|`OUTFIELDER` (대소문자 무관). `seasonYear` 미지정 시 현재 연도
- 목록 응답의 각 선수에는 시즌 대표 기록(`primaryStat`, 없으면 `"기록 없음"`)이, 상세 응답에는 시즌 타/투 기록 라인(`statLines`)과 상대팀별 타율(타자)/피안타율(투수) 목록(`vsTeamStats`, 팀별 `teamCode`/`teamName`/`games`/`avg`)이 포함됨
- 상세 응답에는 추가로 타자 전용 `vsPitcherStats`(상대 투수별 안타율: `pitcherId`/`pitcherName`/`pitcherTeamCode`/`atBats`/`hits`/`avg`)와 투수 전용 `vsBatterStats`(상대 타자별 삼진율: `batterId`/`batterName`/`batterTeamCode`/`atBats`/`strikeouts`/`strikeoutRate`)가 포함됨(포지션에 맞지 않는 쪽은 빈 배열). `plate-appearances`(타석 단위 문자중계 스크랩)를 시즌 단위로 집계해 만듦

### Records (`src/modules/records`)

| Method | Path | Query | 설명 |
| --- | --- | --- | --- |
| GET | `/records/batters` | `seasonYear`, `limit` | 타자 시즌 리더보드 |
| GET | `/records/pitchers` | `seasonYear`, `limit` | 투수 시즌 리더보드 |

- `seasonYear` 미지정 시 현재 연도. `game-stats`를 시즌 단위로 집계해 만듦
- 각 리더보드 항목에는 `playerId`가 포함됨(`players` 테이블에서 팀코드+이름으로 매칭; 매칭 실패 시 `null`)

### Scrape (`src/modules/scrape`)

| Method | Path | Query/Body | 설명 | 스케줄러 등록 |
| --- | --- | --- | --- | --- |
| POST | `/scrape/games` | body: `seasonYear`(미지정 시 현재 연도) | 경기 일정/결과 스크래핑 실행 | O (17시~다음날 1시, 매 정시) |
| POST | `/scrape/standings` | body: `seasonYear`(미지정 시 현재 연도) | 순위표 스크래핑 실행 | O (17시~다음날 1시, 매 정시) |
| POST | `/scrape/game-stats` | body: `gameId`(필수) | 특정 경기의 선수 기록 스크래핑 실행 | O (17시~다음날 1시, 매 정시 — 당일 경기 중 `IN_PROGRESS`/`FINISHED` 상태만 자동 대상) |
| POST | `/scrape/game-stats/backfill` | body: `seasonYear`(미지정 시 현재 연도) | 시즌 전체 `FINISHED` 경기의 박스스코어를 재스크랩(upsert)해 백필 | X (일회성/수동 트리거) |
| POST | `/scrape/roster` | body: `teamCode`(미지정 시 전체 팀) | 팀 로스터(포지션/등번호/출신교) 스크래핑 실행 | O (매일 18:00 KST) |
| POST | `/scrape/play-by-play` | body: `gameId`(필수) | 특정 경기의 타석 단위 문자중계(타자-투수 매치업/결과) 스크래핑 실행 | O (17시~다음날 1시, 매 정시 — 당일 경기 중 `FINISHED` 상태만 자동 대상) |
| POST | `/scrape/play-by-play/backfill` | body: `seasonYear`(미지정 시 현재 연도) | 시즌 전체 `FINISHED` 경기의 타석 데이터를 재스크랩(upsert)해 백필 | X (일회성/수동 트리거) |

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

### 조합 API — Teams / Players / Records / Game Results

`Teams`/`Records`/`Game Results`는 자체 domain/infrastructure 레이어 없이 다른 모듈의 Service를 조합해 응답을 만듭니다. `Players`만 자체 `PLAYER_REPOSITORY`를 가진 일반적인 조회 모듈입니다.

- `GET /teams`, `GET /teams/:code`: `TeamsService`가 `StandingService`(순위/승패) + `GameService.getRecentForm()`(최근 5경기 폼) + `PlayerService`(로스터, 상세 조회 시)를 조합
- `GET /players`, `GET /players/:id`: `PlayerService` → `PLAYER_REPOSITORY` 구현체가 조회, 시즌 대표 기록은 `SeasonBattingStatService`/`SeasonPitchingStatService`(팀코드+이름 매칭)로 붙임. `GET /players/:id`의 `vsTeamStats`는 `GameStatService.findOpponentBattingSplits()`/`findOpponentPitchingSplits()`가 `game_stats.player_id`로 필터링해 `games` 테이블과 조인, 상대팀(`CASE WHEN gs.team_code = g.home_team_code THEN away ELSE home`)별로 GROUP BY 집계
- `GET /records/batters`, `GET /records/pitchers`: `RecordsService`가 `SeasonBattingStatService`/`SeasonPitchingStatService`로 시즌 집계 리더보드를 만들고, `PlayerService.findAllPlayers()`(팀코드+이름 매칭)로 각 항목에 `playerId`를 붙임
- `GET /game-results/recent`: `GameResultService`가 `GameService`(해당 날짜 종료 경기 목록) + `GameStatService.findByGameIds()`(경기별 박스스코어)를 조합해 베스트 활약 타자·투수 기록을 계산

### 스크래핑 API — `POST /scrape/*`

```
ScrapeController (application/scrape.controller.ts)
  → ScrapeService (application/scrape.service.ts)
    → Scraper (infrastructure/scrapers/*.scraper.ts)
        KBO/네이버 스포츠의 내부 API·페이지에 직접 fetch로 요청해 응답을 파싱
      → 파싱 결과를 Game/Standing/GameStat/Player 도메인 엔티티로 변환
        → 각 모듈의 Service.upsert()로 건별 저장 (개별 실패는 warn 로그 후 계속 진행)
    → ScrapeSourceHealthService.log()로 성공/실패·소요시간·저장 건수 기록
```

- `POST /scrape/games`: `GameScraper`가 KBO 스케줄 페이지(`Schedule.aspx`)가 내부적으로 호출하는 `GetScheduleList` 엔드포인트를 fetch로 직접 호출해 응답을 파싱 → 경기별로 `GameService.upsert()` (진행 중 경기는 네이버 스포츠 API로 실시간 스코어 보정)
- `POST /scrape/standings`: `StandingsScraper`가 KBO 팀순위 페이지를 파싱 → `StandingService.upsert()`
- `POST /scrape/game-stats`: `GameStatsScraper`가 `body.gameId`로 박스스코어(`GetBoxScoreScroll`) 응답을 타자/투수로 나눠 파싱 → `GameStatService.upsert()`. 대상 경기가 아직 시작 전이면 응답 자체가 없어 실패로 끝남
- `POST /scrape/game-stats/backfill`: `body.seasonYear`의 `FINISHED` 경기 전체를 조회해 경기당 2초 텀을 두고 순회하며 `/scrape/game-stats`와 동일한 스크랩·저장 로직(`ScrapeService.scrapeAndSaveGameStats()`)을 재사용 — 이미 저장된 경기도 다시 스크랩해 `player_id`/`at_bats_against` 등 이후 추가된 필드를 보강한다. 경기 단위 실패는 warn 로그만 남기고 계속 진행(전체가 실패로 끝나지 않음)
- `POST /scrape/roster`: `RosterScraper`가 `Player/Search.aspx` 폼 postback으로 팀별 선수 목록(포지션/등번호/출신교)을 요청·파싱 → `PlayerService.upsert()`. `body.teamCode` 미지정 시 전체 팀 순회

`/scrape/game-stats/backfill`을 제외한 나머지 스크래핑 API는 실패하면(빈 결과 포함) `scrape-source-health`에 `FAILURE`로 기록되고 예외가 컨트롤러까지 그대로 전파됩니다(500 응답). `/scrape/game-stats/backfill`은 대상 시즌에 `FINISHED` 경기가 하나도 없을 때만 이렇게 실패하고, 개별 경기 실패는 삼켜서 계속 진행합니다.

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
