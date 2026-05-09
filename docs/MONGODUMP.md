brew install mongodb-database-tools)

# 1) Exportar desde el servidor remoto (ajusta URI y nombre de base)
mongodump --uri="mongodb+srv://USER:PASS@cluster.mongodb.net/NOMBRE_BD" --out=./mongo-backup
# 2) Restaurar en local (apunta al contenedor/puerto local)
mongorestore --uri="mongodb://localhost:27017" ./mongo-backup/NOMBRE_BD