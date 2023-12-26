#!/bin/bash

# 대상 서비스 이름 설정
SERVICE_NAME="finalcicd_blue_1"  # 예: finalcicd_blue_1 또는 finalcicd_green_1

# 주기적으로 상태 확인
while true; do
    # Docker Compose를 사용하여 서비스 상태 확인
    SERVICE_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $(docker-compose ps -q $SERVICE_NAME))

    # 상태에 따른 조치
    if [ "$SERVICE_STATUS" == "unhealthy" ]; then
        echo "SERVICE $SERVICE_NAME is unhealthy. 재시작 합니다."
        docker-compose restart $SERVICE_NAME
    elif [ "$SERVICE_STATUS" == "healthy" ]; then
        echo "SERVICE $SERVICE_NAME is healthy"
    else
        echo "Service $SERVICE_NAME status: $SERVICE_STATUS"
    fi

    # 30초마다 반복
    sleep 30
done
