# Extends the pinned LimeSurvey image with one configuration default.
#
# LimeSurvey ships with the JSON-RPC RemoteControl endpoint disabled
# (application/config/config-defaults.php: "RPCInterface" = "off").
# scripts/sync-survey-text.py and the one-time survey import need it, so the
# endpoint is enabled here. This is configuration, not a code change: the
# runtime-generated config.php still wins for every key it sets.
#
# Rebuild with: docker compose build limesurvey   (deploy.sh does this)
FROM martialblog/limesurvey:6-apache

RUN sed -i "s/\$config\['RPCInterface'\] = 'off';/\$config['RPCInterface'] = 'json';/" \
    /var/www/html/application/config/config-defaults.php \
 && grep -q "RPCInterface'\] = 'json'" /var/www/html/application/config/config-defaults.php
