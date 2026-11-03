#!/usr/bin/env bash
# SessionStart hook: 키트 공통 규칙(doo_kbo_harness_kit/KIT_RULES.md)이 있는지 확인한다.
#
# CLAUDE.md 맨 위의 `@doo_kbo_harness_kit/KIT_RULES.md` import는 파일이 없으면 아무 경고 없이
# 건너뛰어진다. 키트는 프로젝트 저장소에 커밋되지 않으므로(.gitignore) 새로 clone한 환경에서는
# 키트 규칙 없이 세션이 시작될 수 있다. 정상일 때는 아무것도 출력하지 않아 토큰 비용이 0이다.

kit="${CLAUDE_PROJECT_DIR:-.}/doo_kbo_harness_kit/KIT_RULES.md"

if [ ! -f "$kit" ]; then
  echo "경고: doo_kbo_harness_kit/KIT_RULES.md가 없어 키트 공통 규칙(이 저장소의 첫 단계 규칙)이 로드되지 않았습니다. 다른 작업을 하기 전에 사용자에게 이 사실을 알리고, 저장소 루트에서 'git clone https://github.com/shot013/doo_kbo_harness_kit.git'으로 키트를 받도록 안내하세요."
fi

exit 0
