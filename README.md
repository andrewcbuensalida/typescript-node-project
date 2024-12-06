## About

This ChatGPT clone allows you to ask a chatbot anything about Pokemon, from current Pokemon events, to abilities. You can even ask it to show you images of the Pokemon.

## Architecture
https://lucid.app/lucidchart/89b779a0-97cc-48c0-b3dd-dd03d01d1958/edit?viewport_loc=-380%2C85%2C1812%2C792%2C0_0&invitationId=inv_b6a9836b-e893-4a47-8279-f55a722fce5f

### Conversation workflow

- User goes to React website that's hosted on AWS Amplify. Asks a question about Pokemon.
- Question goes to NodeJs server that's hosted in Heroku.
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

## The live site is at https://master.d25jr6vo3627gh.amplifyapp.com/

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
      - `docker run -d --name pokemon-postgres-container -e POSTGRES_USER=yourusername -e POSTGRES_PASSWORD=yourpassword -p 5433:5432 andrewcbuensalida/pokemon-postgres-image:latest`
  - Alternatively, to use a Postgres container that you have to manually initialize the tables

    - Have a generic PostreSQL container running:
      - `docker run --name pokemon-postgres-container -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_USER=yourusername -p 5433:5432 -d postgres`
      - --name is container name. -p is port mapping. --rm will delete container when done.
    - Install ts-node
      - `npm i ts-node --global`
    - Create tables in the postgres container. cd to init-db.ts. Make sure CREATE DATABASE is commented out, then run
      - `ts-node init-db.ts`
      - You can do this too if you want to quickly reset the database

  - To check if tables are successfully created
    - In postgres container, connect to database with
      - `psql -U yourusername -d pokemon_chatbot_db -p 5432`
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
  `docker run -d --name pokemon-postgres-container -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_USER=yourusername -p 5433:5432 pokemon-postgres-image`

## To push postgres image to dockerhub so others can run it

- Create a dockerhub account
- In command prompt
  - `docker login`
- Tag the image
  - `docker tag pokemon-postgres-image andrewcbuensalida/pokemon-postgres-image:latest`
- `docker push andrewcbuensalida/pokemon-postgres-image:latest`
- OR you can use the docker desktop interface to push

## To deploy backend to AWS ECS

- Build the image. Go to root of this folder, run
  - `docker build -t pokemon-node-image .`
  - This uses the Dockerfile, copies package-lock.json, installs node_modules in container, converts ts to js.
- Test the container by running it. Make sure IS_IN_CONTAINER is true if hitting a local db
  - `docker run --rm --name pokemon-node-container --env-file .env -p 8080:8080 pokemon-node-image`
- Create an empty ECR repo in aws console. Name the repo the same as the image name. Look at push commands:
  - Login, In powershell (must have AWS Tools for Powershell installed),
    `(Get-ECRLoginCommand).Password | docker login --username AWS --password-stdin 597043972440.dkr.ecr.us-west-1.amazonaws.com`
  - Tag the image. This duplicates the image with name 5970....
    `docker tag pokemon-node-image:latest 597043972440.dkr.ecr.us-west-1.amazonaws.com/pokemon-node-image:latest`
  - Push
    `docker push 597043972440.dkr.ecr.us-west-1.amazonaws.com/pokemon-node-image:latest`
- In ECS
  - Create cluster
  - Create target group in ec2
  - Create a task definition.
    - Task Role and Task Execution Role should be ecsTaskExecutionRole.
    - There was no ecsTaskExecutionRole option in the dropdown the first time, but the second time there was.
    - Need port 8080 mapping, and maybe 80 for safe measure.
    - Individually add environment variables, safer than pointing to an s3. Copy prod.env s3 arn to here.
    - command for health check should be
      - `CMD-SHELL, curl -f http://localhost/healthCheck || exit 1`
  - Create a service (in cluster section) with application load balancer. Select task family from previous step. This will run a cloudformation stack.


## Create a Postgres RDS database
  - Choose Standards create so you can set Public access to yes. Easy create sets it to no but says you could change it afterwards. This is not true.
  - Choose Aurora Postgres compatible
  - Choose a username.
  - Choose a password.
  - Choose Serverless in Instance configuration
  - Choose Public Access Yes
  - In additional options, choose an initial database name
  - After creation, it takes a few minutes. Copy the URL for the writer instance.
  - Go to pdadmin and use these credentials to connect


## TODO
- get rid of 'not secure' next to url. 
- backend in elastic beanstalk
- backend in ecs
- better instructions
- front-end should send chat_id
- auth
- Deploy be elastic Beanstalk
- have a tool call limit