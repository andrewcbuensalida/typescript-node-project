# Use the official PostgreSQL image as the base
FROM postgres:latest

# Copy the SQL initialization script into the container
COPY schema.sql /docker-entrypoint-initdb.d/

# The official PostgreSQL image automatically runs scripts in /docker-entrypoint-initdb.d/
# during the initialization phase.
