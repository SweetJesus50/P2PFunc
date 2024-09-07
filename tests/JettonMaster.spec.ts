import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { JettonMaster } from '../wrappers/JettonMaster';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('JettonMaster', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('JettonMaster');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jettonMaster: SandboxContract<JettonMaster>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        jettonMaster = blockchain.openContract(JettonMaster.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await jettonMaster.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMaster.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and jettonMaster are ready to use
    });
});
