import express, { type Express } from "express";
import helmet from "helmet";
import { fileURLToPath } from "url";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUiExpress from "swagger-ui-express";
import { DatabaseManager } from "../Common/DatabaseManager";
import { Task } from "../Common/model/Task";
import { OperatorHelper } from "../Common/OperatorHelper";
import { TaskManager } from "../Common/TaskManager";
import { logger } from "../Common/Logger";

const app: Express = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get server status
 *     responses:
 *       200:
 *         description: Successful response
 */
app.get("/status", (req, res) => {
  res.status(200).send({ status: "Server is running" });
});

/**
 * @swagger
 * /operator/{operatorId}/task/next:
 *   get:
 *     summary: Get the next unresolved task for an operator
 *     parameters:
 *       - in: query
 *         name: operatorId
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of the operator
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The task ID
 *                 description:
 *                   type: string
 *                   description: The task description
 *       400:
 *         description: Invalid input
 *       500:
 *         description: An error occurred while fetching the next task
 */
app.get("/operator/:operatorId/task/next", (req, res) => {
  const operatorId = req.params.operatorId;

  DatabaseManager.fetchNextUnresolvedTask(operatorId)
    .then((task: Task | undefined) => {
      if (task != null) {
        res.send({
          id: task.id,
          createdAt: task.createdAt,
          input: task.input,
        });
      } else {
        res.send(undefined);
      }
    })
    .catch((error) => {
      res
        .status(500)
        .send({ error: "An error occurred while fetching the next task" });
    });
});

/**
 * @swagger
 * /task/{id}/response:
 *   post:
 *     summary: Submit a response for a task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: string
 *                 description: The response to the task
 *               operatorId:
 *                 type: string
 *                 description: The ID of the operator submitting the response
 *               signature:
 *                 type: string
 *                 description: The signature of the operator
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Task not found
 */
app.post("/task/:id/response", async (req, res) => {
  const taskId = req.params.id;
  const { response, operatorId, signature } = req.body;

  if (!response) {
    return res.status(400).send({ error: "request.response is required" });
  }

  if (!operatorId) {
    return res.status(400).send({ error: "request.operatorId is required" });
  }

  if (!signature) {
    return res.status(400).send({ error: "request.signature is required" });
  }

  logger.info(
    `[Task ${taskId}] Received response from Operator #${operatorId}`,
  );

  try {
    // get Task
    const task: Task = await DatabaseManager.getTask(taskId);

    // verify Operator
    await OperatorHelper.verifyOperator(operatorId);
    logger.info(`[Task ${taskId}] Operator #${operatorId} is verified`);

    // verify signature
    await OperatorHelper.verifySignature(task, operatorId, response, signature);
    logger.info(`[Task ${taskId}] Signature is verified`);

    // register response
    await DatabaseManager.registerOperatorTaskResponse(
      task,
      operatorId,
      response,
      signature,
    );
    logger.info(
      `[Task ${taskId}] Response from Operator #${operatorId} stored in database`,
    );

    // validate received responses
    try {
      await TaskManager.validateTaskResponses(task);
      logger.info(
        `[Task ${taskId}] Task Aggregator reached consensus: output is ${task.response}`,
      );
    } catch (error) {
      // logger.error(`Error validating task responses: ${err}`);
    }

    res.status(200).send();
  } catch (error) {
    res.status(400).send(error);
  }
});

/**
 * api docs
 */
const specs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hello World DVN API",
      version: "1.0.0",
      description: "Hello World DVN API documentation",
    },
  },
  apis: [fileURLToPath(import.meta.url)],
});
app.use("/docs", swaggerUiExpress.serve, swaggerUiExpress.setup(specs));

export { app };
