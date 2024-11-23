## To setup database

`npm i ts-node --global`
`ts-node init-db.ts`

-   Have a PostreSQL container running. Make sure docker desktop is running. --name is container name. -p is port mapping. --rm will delete container when done.
    `docker run --name postgres-dev -e POSTGRES_PASSWORD=admin -p 5001:5432 -d postgres`

in postgres container, connect to database with
`psql -U your_username -d react-chatgpt-clone -p 5432`

to list tables
`\dt`

TODO
- better instructions
- front-end should send chat_id
- auth
- pokeapi
- openai function calling

To start,
`npm run local`
cross-env in package.json is so it'll be compatible with windows
