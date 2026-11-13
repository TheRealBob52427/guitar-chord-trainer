FROM nginx:alpine

LABEL org.opencontainers.image.title="Gitarren-Akkord-Trainer" \
      org.opencontainers.image.description="PWA zum Lernen, Stimmen, Üben und Nachspielen von E-Gitarren-Akkorden, Pentatoniken und Songs" \
      org.opencontainers.image.version="1.3.1"

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY app/ /usr/share/nginx/html/

EXPOSE 80
STOPSIGNAL SIGQUIT

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
