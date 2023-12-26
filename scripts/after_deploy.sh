REPOSITORY=/home/ubuntu/finalCICD

cd $REPOSITORY

sudo npm ci

chmod +x ./deploy.sh

bash -x ./deploy.sh

# chmod +x healthcheck_restart.sh

# ./healthcheck_restart.sh &
