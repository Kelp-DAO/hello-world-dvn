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

4. Create .env

    Create a .env file in the root directory and populate it with the following content:
    
        ######### Kernel configuration
        KERNEL_CONFIG_ADDRESS=0x479C4f372654AaE38e9fa3D57c211674e6c96f34
        
        # 1° anvil account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        KERNEL_MANAGER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
        
        ######### Local configuration
        TASK_AGGREGATOR_SERVER_HOST=localhost
        TASK_AGGREGATOR_SERVER_PORT=3000
        RPC_PROVIDER=http://127.0.0.1:8545


5. Bootstrap the HelloWorld DVn demo by running:

        npm run init-context \
        && (pm2 delete all --force > /dev/null 2>&1 || true) \
        && pm2 start pm2.config.cjs \
        && pm2 monit


## Tweaks

1. Number of Operators

    By default, 5 Operators are started. You can run more Operators by specifying the number in the cli command.
        
    Eg. to run 15 Operators, run:
        
            npm run init-context \
            && (pm2 delete all --force > /dev/null 2>&1 || true) \
            && INSTANCES=15 pm2 start pm2.config.cjs \
            && pm2 monit
