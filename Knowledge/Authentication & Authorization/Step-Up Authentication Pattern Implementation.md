sudo apt update && sudo apt upgrade -y

sudo apt install -y \
openssh-server \
net-tools \
curl \
wget \
vim \
git


sudo systemctl enable ssh
sudo systemctl start ssh

sudo systemctl status ssh