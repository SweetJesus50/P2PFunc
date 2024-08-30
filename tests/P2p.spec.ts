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
        blockchain.now = 2000000000

        arbitrator = await blockchain.treasury('arbitrator');
        lessor = await blockchain.treasury('lessor')
        renter = await blockchain.treasury('renter')

        p2p = blockchain.openContract(P2p.createFromConfig({
            arbitratorAddress: arbitrator.address,
            lessorAddress: lessor.address,
            renterAddress: renter.address,
            content: buildOnchainMetadata({item_name: "Snowboard", image: "image_link"}),
            cost: toNano(1),
            arbitratorFeePercent: toNano("0.03"), // 3%
            rentTime: 3600
        }, code));

        let deployResult = await p2p.sendDeploy(arbitrator.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: arbitrator.address,
            to: p2p.address,
            deploy: true,
            success: true,
        });

        expect((await p2p.getStorage()).init).toBeFalsy()
        
        deployResult = await p2p.sendDeposit(renter.getSender(), toNano('0.55'))

        expect(deployResult.transactions).toHaveTransaction({
            from: renter.address,
            to: p2p.address,
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Deposit").endCell()
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Deposit successful").endCell()
        })

        expect((await p2p.getStorage()).init).toBeTruthy()
        expect((await p2p.getStorage()).deposit).toEqual(toNano('0.5'))
        
    });

    it('should deploy & send deposit', async () => {
        // the check is done inside beforeEach
        // blockchain and p2p are ready to use
    });

    it('should finish rent & send request to renter', async () => {
        let transactionRes = await p2p.sendFinish(lessor.getSender(), toNano("0.05"))
        expect(transactionRes.transactions).toHaveTransaction({
            from: lessor.address,
            to: p2p.address,
            success: false,
            exitCode: 54 // err::not_finished
        })
        expect((await p2p.getStorage()).request).toBeFalsy()

        blockchain.now!! += 3600

        transactionRes = await p2p.sendFinish(lessor.getSender(), toNano("0.05"))
        expect(transactionRes.transactions).toHaveTransaction({
            from: lessor.address,
            to: p2p.address,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            success: true,
        })
        expect((await p2p.getStorage()).request).toBeTruthy()
    })

    it('should receive payment from renter & end rent (no delay)', async () => {
        blockchain.now!! += 3600
        let transactionRes = await p2p.sendFinish(lessor.getSender(), toNano("0.05"))
        
        expect((await p2p.getStorage()).request).toBeTruthy()

        const cost = (await p2p.getStorage()).cost

        transactionRes = await p2p.sendPayment(renter.getSender(), cost)

        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: arbitrator.address,
            value: toNano("0.03"), // 3% from cost (1 TON in tests)
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Arbitrator fee").endCell()
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: lessor.address,
            value: toNano("0.97"), // 1 - 0.03 (arbitrator fee)
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Money for rent").endCell()
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            value: toNano("0.5"), // 1 - 0.03 (arbitrator fee)
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Deposit return").endCell()
        })
        expect((await p2p.getStorage()).ended).toBeTruthy()
    })

    it('should receive payment from renter & end rent (with delay)', async () => {
        blockchain.now!! += 3600
        let transactionRes = await p2p.sendFinish(lessor.getSender(), toNano("0.05"))
        
        expect((await p2p.getStorage()).delayTime).toEqual(blockchain.now!! + 3600) // `delayTime` = `rentTime` + 3600 (1 hour)
        expect((await p2p.getStorage()).request).toBeTruthy()

        blockchain.now!! += 3601 // 1 hour since rentTime passed -> payment delayed -> take deposit from renter and send it to lessor

        const cost = (await p2p.getStorage()).cost

        transactionRes = await p2p.sendPayment(renter.getSender(), cost)

        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: arbitrator.address,
            value: toNano("0.03"), // 3% from cost (1 TON in tests)
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Arbitrator fee").endCell()
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: lessor.address,
            value: toNano("1.47"), // 1 - 0.03 (arbitrator fee) + 0.5 (deposit as fine) = 1.47
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Money for rent + deposit as fine").endCell()
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            value: toNano("0.001"), // gas_info
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Payment was delayed").endCell()
        })
        expect((await p2p.getStorage()).ended).toBeTruthy()
    })

    it('should let lessor cancel rent before finish message', async () => { // (e.g. if something went wrong between renter & lessor)
        expect((await p2p.getStorage()).request).toBeFalsy()
        let transactionRes = await p2p.sendCancelRent(lessor.getSender(), toNano("0.05"))
        
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            value: toNano("0.5"), // renter gets deposit back
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Lessor canceled rent").endCell()
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: lessor.address,
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Lessor canceled rent").endCell()
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: arbitrator.address,
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Lessor canceled rent").endCell()
        })
        expect((await p2p.getStorage()).ended).toBeTruthy()
    })

    it('should abort rent after finish message', async () => { // (e.g. if renter did not send the payment)  
        blockchain.now!! += 3600                               // (!) renter has time to send the payment until `rentTime` + 3600 (1 hour)
        let transactionRes = await p2p.sendFinish(lessor.getSender(), toNano("0.05"))
        
        expect((await p2p.getStorage()).request).toBeTruthy()

        blockchain.now!! += 21600 // let's assume that renter did not send the payment even after 6 hours

        transactionRes = await p2p.sendAbortRent(arbitrator.getSender(), toNano("0.05"))

        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: renter.address,
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Renter did not send payment. Rent aborted").endCell()
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: lessor.address,
            success: true,
            value: toNano("0.5"), // deposit as fine
            body: beginCell().storeUint(0, 32).storeStringTail("Renter did not send payment. Rent aborted").endCell()
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: p2p.address,
            to: arbitrator.address,
            success: true,
            body: beginCell().storeUint(0, 32).storeStringTail("Renter did not send payment. Rent aborted").endCell()
        })
        expect((await p2p.getStorage()).ended).toBeTruthy()
    })
});
