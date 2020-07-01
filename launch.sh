# !/bin/bash
unclutter -idle 2 &

sleep 5

xdotool windowminimize $(xdotool getactivewindow)

cd /home/pi/oscplayer
node .
