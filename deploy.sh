#!/bin/bash

# #새 컨테이너를 구동
# 헬스 체크를 수행
# 헬스 체크가 성공하면 Nginx 설정을 변경하고 재시작.
# 이전 컨테이너를 중지.
CURRENT=$(docker ps --format '{{.Names}}' | grep -oE 'finalcicd_(blue|green)_1' | head -n 1 | cut -d'_' -f2)

echo "Current container: $CURRENT"

if [ "$CURRENT" == "blue" ]; then
    docker-compose up -d --build green

    echo "Green Container 헬스 체크"
    HEALTH_CHECK() {
        local retries=0
        until [ $retries -ge 3 ]; do
            if curl --connect-timeout 3 --max-time 3 -f https://astrania.shop/health; then
                echo "Green Container 헬스 체크 성공 / 트래픽 전환"
                return 0
            else
                retries=$((retries+1))
                echo "헬스 체크 실패 5초뒤 다시 시도"
                sleep 5
            fi
        done
        echo "헬스 체크 실패 기존 컨테이너로 롤백"
        docker-compose stop green
        exit 1
    }

    HEALTH_CHECK

    sed -i 's/blue:3000/green:3000/' ./nginx.conf
    docker-compose restart nginx


    docker-compose stop blue

elif [ "$CURRENT" == "green" ]; then
    docker-compose up -d --build blue

    echo "Blue Container 헬스 체크"
    HEALTH_CHECK() {
        local retries=0
        until [ $retries -ge 3 ]; do
            if curl --connect-timeout 3 --max-time 3 -f https://astrania.shop/health; then
                echo "Blue Container 헬스 체크 성공 / 트래픽 전환"
                return 0
            else
                retries=$((retries+1))
                echo "헬스 체크 실패 5초뒤 다시 시도"
                sleep 5
            fi
        done
        echo "헬스 체크 실패 기존 컨테이너로 롤백"
        docker-compose stop blue
        exit 1
    }

    HEALTH_CHECK

    sed -i 's/green:3000/blue:3000/' ./nginx.conf
    docker-compose restart nginx

    docker-compose stop green
fi