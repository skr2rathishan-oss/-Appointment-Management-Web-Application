FROM mysql:8.4

# Scripts in this folder run in alphabetical order the first time the
# data volume is created. To re-run them: docker compose down -v
COPY init/ /docker-entrypoint-initdb.d/

EXPOSE 3306
