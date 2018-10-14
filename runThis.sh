#!/bin/bash

# get sudo permissions
echo "I'll be needing sudo permissions to copy some files"
sudo echo "Got the permissions!"

# source the config
source config.sh
echo "Creating $SITE_NAME at $SITE_ROOT..."

# create SITE_ROOT and the log folder
if [ -d "$SITE_ROOT" ]; then
  echo "Looks like the folder exists, I'll abort to be on the safer side."
  exit
fi
mkdir $SITE_ROOT
mkdir $SITE_ROOT/logs

# create venv and install flask and wsgi
virtualenv $SITE_ROOT/venv
source $SITE_ROOT/venv/bin/activate
pip install uwsgi flask
deactivate

# copy all the templates using the template copier
supercopy () {
  sed -e "s~\${SITE_NAME}~$SITE_NAME~g" -e "s~\${SITE_ROOT}~$SITE_ROOT~g" -e "s~\${USER}~$USER~g" -e "s~\${SITE_URLS}~$SITE_URLS~g" $1 > $2
}

echo -e '\n\nCopying templates..'
# FlaskApp
supercopy templates/SITE_NAME.py $SITE_ROOT/$SITE_NAME.py
## WSGI Entry Point
supercopy templates/wsgi.py $SITE_ROOT/wsgi.py
## WSGI Config File (.ini)
supercopy templates/wsgi.ini $SITE_ROOT/wsgi.ini
## Systemd Unit File
supercopy templates/SITE_NAME.service $SITE_ROOT/$SITE_NAME.service
## nginX config
supercopy templates/SITE_NAME $SITE_ROOT/$SITE_NAME

echo -e '\n\nCopying service template... (symlinks are disabled because disabling the service involves deleting symlinks and cannot determinte how far it should be followed)'
# copy service file
sudo cp $SITE_ROOT/$SITE_NAME.service /etc/systemd/system/$SITE_NAME.service

echo -e '\n\nStarting the UWSGI service...'
# start and enable the serverlet
sudo systemctl daemon-reload
sudo systemctl start $SITE_NAME
sudo systemctl enable $SITE_NAME

echo -e '\n\nLinking nginX configs, testing and restarting nginX...'
# test nginx config and restart
sudo ln -s $SITE_ROOT/$SITE_NAME /etc/nginx/sites-available/$SITE_NAME
sudo ln -s /etc/nginx/sites-available/$SITE_NAME /etc/nginx/sites-enabled
sudo nginx -t && sudo systemctl restart nginx
