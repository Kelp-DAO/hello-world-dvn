import pino from "pino";
import { DatabaseManager } from "../DatabaseManager";

const logger = pino();
await DatabaseManager.resetDatabase(logger);
