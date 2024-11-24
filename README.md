## About

This ChatGPT clone allows you to ask a chatbot anything about Pokemon, from current Pokemon events, to abilities. You can even ask it to show you images of the Pokemon.

## Architecture

### Conversation workflow

- User goes to React website that's hosted on AWS Amplify. Asks a question about Pokemon.
- Question goes to NodeJs server that's hosted in AWS Elastic Beanstalk.
- NodeJs saves messages to a Postgres AWS RDS database.
- NodeJs also sends question to OpenAI API.
- OpenAI API does inference and either sends back the answer, or suggests what tools and arguments to use to NodeJs,
- NodeJs always saves the messages to Postgres.
- If OpenAI answered directly (finish_reason:stop), it is sent to React.
- If it's a tool suggestion, NodeJs calls the tool with the given arguments, either the Tavily web search tool, or the PokeAPI tool,
- Again NodeJs saves to Postgres the results of the tool call,
- NodeJs either sends the tool call result to OpenAI to get a response to the search results for Tavily, OR a placeholder response is created for PokeAPI,
- NodeJs again saves the response to Postgres,
- Response is sent to React.

## Instructions to run app locally

- Have git installed. https://gitforwindows.org/
- Have NodeJs installed. https://nodejs.org/
- For backend:

  - In a command prompt, run
    - `git clone https://github.com/andrewcbuensalida/typescript-node-project.git`
  - `cd typescript-node-project`
  - Install node_modules
    - `npm ci`
  - Get an OPENAI api key, Tavily API key, then fill in .env file with it
  - `npm run local`

- For the database,

  - Install Docker desktop. https://www.docker.com/products/docker-desktop and make sure it's running
  - to use my Postgres container that has empty tables initialized:
    - Pull then run in one step with
      - `docker run -d --name pokemon-postgres-container -e POSTGRES_USER=your_username -e POSTGRES_PASSWORD=your_password -p 5433:5432 andrewcbuensalida/pokemon-postgres-image:latest`
  - Alternatively, to use a Postgres container that you have to manually initialize the tables

    - Have a generic PostreSQL container running:
      - `docker run --name pokemon-postgres-container -e POSTGRES_PASSWORD=your_password -e POSTGRES_USER=your_username -p 5433:5432 -d postgres`
      - --name is container name. -p is port mapping. --rm will delete container when done.
    - Install ts-node
      - `npm i ts-node --global`
    - Create tables in the postgres container. cd to init-db.ts. Make sure CREATE DATABASE is commented out, then run
      - `ts-node init-db.ts`
      - You can do this too if you want to quickly reset the database

  - To check if tables are successfully created
    - In postgres container, connect to database with
      - `psql -U your_username -d pokemon_chatbot_db -p 5432`
    - List databases
      - `\l`
    - to list tables
      - `\dt`
    - If you weren't connected to a database
      - `\c <databaseName>`
    - Check inside the table
      - `SELECT * FROM messages;`
    - disconnect from psql
      - `\q`

- For the front-end:
  - In command prompt
    - `git clone https://github.com/andrewcbuensalida/react-chatgpt-clone-meta`
    - `cd react-chatgpt-clone-meta`
    - `npm ci`
    - `npm run start`
    - Go to http://localhost:3000/

## To create a postgres docker image that has empty tables already initialized
- create schema.sql. Make sure it has CREATE DATABASE uncomented
- create a Dockerfile in the same folder.
- Build the image
  - `docker build -t pokemon-postgres-image .`
  - This will copy schema.sql into the container folder that postgres runs automatically on run
- Run the container
  `docker run -d --name pokemon-postgres-container -e POSTGRES_PASSWORD=your_password -e POSTGRES_USER=your_username -p 5433:5432 pokemon-postgres-image`

## To push image to dockerhub so others can run it

- Create a dockerhub account
- In command prompt
  - `docker login`
- Tag the image
  - `docker tag pokemon-postgres-image andrewcbuensalida/pokemon-postgres-image:latest`
- `docker push andrewcbuensalida/pokemon-postgres-image:latest`
- OR you can use the docker desktop interface to push

## TODO

- better instructions
- front-end should send chat_id
- auth
- Deploy be elastic Beanstalk
- Fe Amplify
- design diagram
- add to portfolio
- dry
