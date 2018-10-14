source config.sh

echo disabling $SITE_NAME systemd
sudo systemctl disable $SITE_NAME

echo 'removing nginx available symlink'
sudo rm /etc/nginx/sites-available/$SITE_NAME
echo 'removing nginx enabled symlink'
sudo rm /etc/nginx/sites-enabled/$SITE_NAME
echo 'removing service from systemd'
sudo rm /etc/systemd/system/$SITE_NAME.service
echo 'removing site-root folder'
rm -rf $SITE_ROOT

echo 'restarting nginx'
sudo service nginx restart
