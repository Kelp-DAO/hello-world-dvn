# Hello World DVN

This projects shows the architecture of a basic DVN.

## Project structure

```mdx
├─ Common/script/taskGenerator.ts   # Generator of dummy tasks
├─ Operator/lre.ts                  # Long-Running Execution run by an Operator
├─ TaskAggregator/index.ts          # Task Aggregator run by the DVN
└── README.md                       # Project documentation
```

## Architecture

This demo architecture contains:

- **Kernel Protocol** deployed to BSC testnet and provided locally by `anvil` to:
    - register the demo HelloWorld DVN
    - register Operators to the HelloWorld DVN
- **Task Aggregator**: ExpressJs server esposing API to distribute tasks to Operators, and collect responses
- **Operators**: Determine if the number sent by the **Task Aggregator** is a prime number, generate a signature, and send it back
- **Task Generator**: a script that creates a dummy task every x seconds

### Task

A Task specifies as input an array of points (x, y) for which the opted-in operators must solve the Traveling Salesman Problem and determine the shortest possible route that visits each point exactly once and returns to the origin point.

### Task Aggregator

1. Implemented as ExpressJS server
2. Exposes the GET endpoint `/operator/{operatorId}/task/next` callable by an Operator to retrieve the next Task to execute.
3. Exposes the POST endpoint `/task/{id}/response` callable by an Operator to send the response computed for a Task.
4. Aggregates the responses for a Task and:
    - if a sufficient amount of responses were received (defined by `responsesCountQuorum`)
    - AND the responses contains the same value which passes a quorum (defined by `responsesContentQuorum`)
    - THEN the consensus on the "right" response was reached and the Task is considered fully executed

### Operator

The operators who are currently opted-in with the DVN:
- retrieve the Tasks from the Task Aggregator by polling a GET endpoint
- compute the TSP solution
- sign the result
- send the response and signature to the Task Aggregator through a POST call

## Quick start

1. Requirements

        Node.js >= 22
        Bun|Yarn|Npm

2. Clone this repository and enter the created directory

3. Install dependencies:

    `bun i` or `yarn install` or `npm i`
    `npm install -g pm2`
    `npm install -g pino-pretty`

4. Bootstrap the HelloWorld DVn demo by running:

        chmod +x bin/start.sh
        
        sh bin/start.sh


## Tweaks

1. Number of Operators

    By default, 5 Operators are started. You can run more Operators by specifying the number in the cli command.
        
    Eg. to run 15 Operators, run:
        
            npm run init-context \
            && (pm2 delete all --force > /dev/null 2>&1 || true) \
            && INSTANCES=15 pm2 start pm2.config.cjs \
            && pm2 monit
            
2. Overwrite default config values

    You can optionally overwrite one or more configuration values by specifying them in a `.env` file.
    
    1. Create a `.env` file by copying the `.env.example` file with `cp .env.example .env`
    2. Define only the values you want to overwrite, all parameters are optional
