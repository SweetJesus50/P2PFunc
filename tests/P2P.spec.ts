import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { P2P } from '../wrappers/P2P';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('P2P', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('P2P');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let p2P: SandboxContract<P2P>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        p2P = blockchain.openContract(P2P.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await p2P.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: p2P.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and p2P are ready to use
    });
});
