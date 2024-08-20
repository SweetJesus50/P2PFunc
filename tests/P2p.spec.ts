import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { P2p } from '../wrappers/P2p';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('P2p', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('P2p');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let p2p: SandboxContract<P2p>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        p2p = blockchain.openContract(P2p.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await p2p.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: p2p.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and p2p are ready to use
    });
});
