import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { P2PJetton } from '../wrappers/P2PJetton';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('P2PJetton', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('P2PJetton');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let p2PJetton: SandboxContract<P2PJetton>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        p2PJetton = blockchain.openContract(P2PJetton.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await p2PJetton.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: p2PJetton.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and p2PJetton are ready to use
    });
});
