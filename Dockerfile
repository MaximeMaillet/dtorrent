FROM debian:jessie

ARG UUID=1000
ARG GGID=1000
ARG USER=toto

RUN apt-get update && \
    apt-get install -y rtorrent \
    supervisor

RUN if [ ! -z $(getent group $GGID) ] ; then groupmod -o -g 2019292 $(getent group $GGID | cut -d: -f1) ; fi && \
    addgroup --system --gid $GGID $USER && \
    if [ ! -z $(getent passwd $UUID) ] ; then usermod -o -u 2019292 $(getent passwd $UUID | cut -d: -f1) ; fi && \
    useradd -l --system --home-dir /home/$USER  --shell /sbin/nologin --uid $UUID --gid $GGID $USER

RUN mkdir -p /var/rtorrent/session /var/rtorrent/torrents /var/rtorrent/downloaded /var/rtorrent/logs && \
    chown -R $USER. /var/rtorrent

ADD clients/supervisor /etc/supervisor

RUN mkdir -p /var/log/supervisor

USER $USER
CMD ["/usr/bin/supervisord"]