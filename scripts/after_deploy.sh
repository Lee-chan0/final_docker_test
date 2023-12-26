REPOSITORY=/home/ubuntu/finalCICD

cd $REPOSITORY

sudo npm ci

chmod +x ./deploy.sh

bash -x ./deploy.sh