import { WalletHelper } from "../Common/WalletHelper";
import { ConfigHelper } from "../Common/ConfigHelper";
import { logger } from "../Common/Logger";
import { app } from "./server";
import { ProcessHelper } from "../Common/ProcessHelper";
import { Contract } from "ethers";

/**
 * 
 * @returns 
 */
const registerDVN = async (): Promise<string> => {
    return new Promise<string>(async (resolve, reject) => {
        logger.info('Registering demo DVN...');

        WalletHelper.registerDemoDVN()
            .then(({dvnCoordinator, dvnOwner}) => {
                logger.info(
                    {
                        'DVN Coordinator': dvnCoordinator,
                        'owner': WalletHelper.derivePublicKeyFromWallet(dvnOwner),
                    },
                    'DVN successfully registered to Kernel'
                );

                //
                const dvnCoordinatorContract = WalletHelper.getDemoDVNCoordinatorContract(WalletHelper.getDVNOwnerWallet());

                // listen for OperatorRegistrationRequestAccepted event
                dvnCoordinatorContract.on("OperatorRegistrationRequestAccepted", (operatorId) => {
                    logger.info(`Operator #${operatorId.toString()} is now registered to the DVN`);

                    printDVNInfo(dvnCoordinatorContract);
                });

                // resolve
                resolve(dvnCoordinator);
            })
            .catch((error) => {
                logger.error(error)
                reject(error);
            })
    });
};

const printDVNInfo = async (dvnCoordinatorContract: Contract): Promise<void> => {
    logger.info('DVN Info:');
    logger.info(`  Operators: ${(await dvnCoordinatorContract.getOperatorCount()).toString()}`);
}

/**
 * 
 */
const startTaskAggregatorServer = async (): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
        const port = ConfigHelper.getTaskAggregatorServerPort();

        const server = app.listen(port, () => {
            logger.info(`Task Aggregator server up and running on port http://localhost:${port}`);
        });
        
        const onCloseSignal = () => {
            // logger.info("sigint received, shutting down");
            server.close(() => {
                // logger.info("server closed");
                process.exit();
            });
            
            setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
        };
        
        process.on("SIGINT", onCloseSignal);
        process.on("SIGTERM", onCloseSignal);

        resolve();
    })
};

/**
 * 
 */
const main = async () => {
    ProcessHelper.waitUntilAnvilIsAvailable()
        .then(async () => {
            // register DVN
            await registerDVN();

            // start TaskAggregation server
            startTaskAggregatorServer()
        })
};

main().catch((error) => {
    logger.error("Error in main function:", error);
});