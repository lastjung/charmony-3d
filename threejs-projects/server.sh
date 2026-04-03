#!/bin/bash

# 1. 경로 설정 (범용 표준)
PID_DIR=".server_cache"
PID_FILE="$PID_DIR/dev-server.pid"

# 2. 실행 중인 서버 종료 함수
stop_server() {
    PID=$(cat "$PID_FILE")
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping Server (PID: $PID)..."
        kill $PID
        rm "$PID_FILE"
        echo "Server stopped."
        exit 0
    fi
}

# 3. 메인 로직: 이미 실행 중이면 종료(Toggle)
if [ -f "$PID_FILE" ]; then
    stop_server
fi

# 4. 서버 시작 및 클린업 설정
mkdir -p "$PID_DIR"
echo "Starting Server (Press Ctrl+C to stop)..."
echo $$ > "$PID_FILE"

# 종료 시 PID 파일 삭제 트리거
trap 'rm -f "$PID_FILE"; exit' INT TERM EXIT

# [예시] Simple Python Server의 경우
python3 -m http.server 8001
