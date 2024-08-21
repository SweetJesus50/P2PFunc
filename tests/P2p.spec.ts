import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { P2p } from '../wrappers/P2p';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { buildOnchainMetadata } from '../wrappers/onChain';
import { Arbitrator } from '../wrappers/Arbitrator';

describe('P2p', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('P2p');
    });

    let blockchain: Blockchain;
    let arbitrator: SandboxContract<TreasuryContract>;
    let lessor: SandboxContract<TreasuryContract>
    let renter: SandboxContract<TreasuryContract>
    let p2p: SandboxContract<P2p>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 2000000000;

        arbitrator = await blockchain.treasury('arbitrator');
        lessor = await blockchain.treasury('lessor')
        renter = await blockchain.treasury('renter')

        p2p = blockchain.openContract(P2p.createFromConfig({
            arbitratorAddress: arbitrator.address,
            lessorAddress: lessor.address,
            renterAddress: renter.address,
            content: buildOnchainMetadata({item_name: "Snowboard", image: "image_link"}),
            cost: toNano(1),
            arbitratorFeePercent: 3,
            rentTime: 300
        }, code));

        let deployResult = await p2p.sendDeploy(arbitrator.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: arbitrator.address,
            to: p2p.address,
            deploy: true,
            success: true,
        });
        
        deployResult = await p2p.sendDeposit(renter.getSender(), toNano('0.55'))

        expect(deployResult.transactions).toHaveTransaction({
            from: renter.address,
            to: p2p.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("Deposit").endCell()
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            success: true,
            body: beginCell().storeUint(0,32).storeStringTail("Deposit successful").endCell()
        })
        
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and p2p are ready to use
    });
});
