#!/bin/bash

# 대상 서비스 이름 설정
SERVICE_NAME="blue"  # 'blue' 또는 'green'으로 설정

# 주기적으로 상태 확인
while true; do
    # Docker Compose를 사용하여 컨테이너 ID를 가져옴
    CONTAINER_ID=$(docker-compose ps -q $SERVICE_NAME)

    # 컨테이너 상태 확인
    if [ ! -z "$CONTAINER_ID" ]; then
        SERVICE_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_ID)

        # 상태에 따른 조치
        if [ "$SERVICE_STATUS" == "unhealthy" ]; then
            echo "Service $SERVICE_NAME is unhealthy. Restarting..."
            docker-compose restart $SERVICE_NAME
        elif [ "$SERVICE_STATUS" == "healthy" ]; then
            echo "Service $SERVICE_NAME is healthy"
        else
            echo "Service $SERVICE_NAME status: $SERVICE_STATUS"
        fi
    else
        echo "Service $SERVICE_NAME is not running."
    fi

    # 30초마다 반복
    sleep 30
done
